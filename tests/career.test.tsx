import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { analyze } from "../src/domain/engine";
import { profileSchema } from "../src/domain/model";
import {
  normalizeCareer,
  experienceMonths,
  experienceBand,
  careerModel,
  roleLabel,
  stageLabel,
} from "../src/domain/career";
import {
  identity,
  recordView,
  recordLabel,
} from "../src/domain/presentation";
import { AnalysisRitual } from "../src/features/analysis-ritual";
import { VerdictDocument } from "../src/features/verdict-document";
import demos from "../rules/demos.json";
import templates from "../templates/reports.json";
import catalog from "../rules/catalog.json";
const p = () =>
  profileSchema.parse({
    ...demos[1],
    asOf: "2026-09-14",
    fullName: "김피티",
    displayName: "피티",
    speechMode: "DIRECT",
    occupationCategory: "IT_DEVELOPMENT",
    occupationCode: "SOFTWARE_ENGINEER",
    specialtyCode: "BACKEND_ENGINEER",
    careerStartDate: "2018-03-01",
    rawTitle: "선임매니저",
    normalizedRole: "KEY_CONTRIBUTOR",
    managementExperience: "NONE",
  });
describe("structured career and report integration", () => {
  it("normalizes category, job and specialty with a legacy occupation bridge", () => {
    const c = normalizeCareer(p());
    expect(c.occupationCategory).toBe("IT_DEVELOPMENT");
    expect(c.occupationCode).toBe("SOFTWARE_ENGINEER");
    expect(c.specialtyCode).toBe("BACKEND_ENGINEER");
    expect(c.legacyOccupation).toBe("it");
  });
  it("covers twenty occupation categories and explicit custom occupations", () => {
    expect(
      new Set(careerModel.occupations.map((o) => o.categoryCode)).size,
    ).toBe(20);
    expect(
      normalizeCareer({
        ...p(),
        specialtyCode: "OTHER",
        customOccupation: "새로운 직업",
      }).occupationLabel,
    ).toBe("새로운 직업");
  });
  it("calculates calendar months from explicit asOf across years", () => {
    expect(experienceMonths("2018-03-01", "2026-09-14")).toBe(102);
    expect(experienceMonths("2025-12-01", "2026-01-01")).toBe(1);
    expect(experienceBand(102)).toBe("8–12");
  });
  it("rejects future starts and invalid dates", () => {
    expect(
      profileSchema.safeParse({ ...p(), careerStartDate: "2027-01-01" })
        .success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...p(), careerStartDate: "2018-02-31" })
        .success,
    ).toBe(false);
  });
  it("uses actual responsibilities independently of company title", () => {
    expect(normalizeCareer({ ...p(), rawTitle: "CEO" }).currentRole).toBe(
      "KEY_CONTRIBUTOR",
    );
    expect(analyze({ ...p(), level: 5 }).scenarios[0].ceiling).toBe(
      analyze(p()).scenarios[0].ceiling,
    );
  });
  it("maps all management experience bands monotonically", () => {
    const signals = Object.keys(careerModel.managementLabels).map(
      (m) =>
        normalizeCareer({
          ...p(),
          managementExperience: m as NonNullable<
            ReturnType<typeof p>["managementExperience"]
          >,
        }).managementSignal,
    );
    expect(signals).toEqual([...signals].sort((a, b) => a - b));
  });
  it("calculates expert and management paths from traits and leadership records", () => {
    const r = analyze(p());
    expect(r.normalizedCareer.expertReadiness).toBeGreaterThan(
      r.normalizedCareer.managementReadiness,
    );
    expect(r.normalizedCareer.preferredTrack).toBe("EXPERT");
    const led = analyze({ ...p(), managementExperience: "MULTI_TEAM" });
    expect(led.normalizedCareer.managementReadiness).toBeGreaterThan(
      r.normalizedCareer.managementReadiness,
    );
    expect(r.actions.some((a) => a.id === "BUILD_LEADERSHIP_EXPERIENCE")).toBe(
      true,
    );
    expect(r.scenarios[1].ceiling).toBeGreaterThan(r.scenarios[0].ceiling);
  });
  it("does not strip surnames or foreign names and uses editable displayName", () => {
    expect(identity(p()).displayName).toBe("피티");
    expect(
      identity({ ...p(), fullName: "남궁민", displayName: "남궁민" })
        .displayName,
    ).toBe("남궁민");
    expect(identity({ ...p(), displayName: "Alex" }).salutation).toBe("Alex.");
  });
  it("renders DIRECT and POLITE speech templates without unresolved tokens", () => {
    expect(recordView(analyze(p())).opening).toContain("피티야.");
    expect(
      recordView(analyze({ ...p(), speechMode: "POLITE" })).opening,
    ).toContain("피티님.");
    expect(recordView(analyze(p())).action).not.toContain("{{");
  });
  it("translates every internal stage into responsibility language", () => {
    for (const track of ["EXPERT", "MANAGEMENT", "HYBRID"] as const)
      for (let n = 1; n <= 5; n++)
        expect(stageLabel(n, track)).not.toMatch(/L[1-5]|LEVEL/i);
    expect(roleLabel("KEY_CONTRIBUTOR")).toBe("핵심 실무자");
  });
  it("renders unlocked verdict, all 25 reports and timelines without level codes", () => {
    const r = analyze(p());
    const html = renderToStaticMarkup(
      <VerdictDocument
        report={r}
        scenario={1}
        setScenario={() => {}}
        opened={true}
        checkout={() => {}}
      />,
    );
    expect(html).not.toMatch(/\bL[1-5]\b|LEVEL\s*[1-5]/i);
    expect((html.match(/<details/g) || []).length).toBe(26);
    expect(html).toContain("PART VI");
  });
  it("preserves old demo inputs and translates historical report text at read boundary", () => {
    for (const d of demos) {
      const r = analyze(profileSchema.parse(d));
      expect(r.sections).toHaveLength(25);
      expect(r.scenarios.map((s) => s.ceiling)).toEqual([3, 4, 5]);
      expect(r.input.displayName).toBe("상담자");
    }
    const r = analyze(p());
    delete (r as Partial<typeof r>).normalizedCareer;
    r.sections[0].body = "현재 L3 개선 LEVEL 4";
    expect(recordView(r).translate(r.sections[0].body)).not.toMatch(/L3|LEVEL/);
  });
  it("supplies a DIRECT variant for every interpretation with identical tokens", () => {
    const tokens = (text: string) =>
      [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    for (const t of templates.interpretations) {
      expect(t.direct, `${t.id} DIRECT 변형 누락`).toBeTruthy();
      for (const key of [
        "judgement",
        "explanation",
        "criticism",
        "risk",
        "action",
        "scenario",
        "closing",
      ] as const)
        expect(tokens(t.direct![key]), `${t.id}.${key}`).toEqual(
          tokens(t[key as keyof typeof t] as string),
        );
      // 행동 문장은 판정 화면에서 그대로 인용하므로 미치환 토큰이 남으면 안 된다.
      expect(t.direct!.action).not.toContain("{{");
    }
  });
  it("writes DIRECT verdict copy in one register without repeating the judgement", () => {
    const v = recordView(analyze(p()));
    expect(v.opening).toMatch(/^피티야\./);
    for (const line of [v.opening, v.blocker, v.action, v.closing])
      expect(line, line).not.toMatch(/(습니다|입니다|하세요|하십시오)/);
    const judgement = v.opening.split("\n").slice(1).join(" ");
    expect(judgement.length).toBeGreaterThan(0);
    expect(v.blocker).not.toContain(judgement);
    expect(v.marginNotes.join(" ")).not.toContain(judgement);
    expect(v.marginNotes.length).toBeGreaterThan(0);
  });
  it("keeps POLITE verdict copy in the deferential register", () => {
    const v = recordView(
      analyze(profileSchema.parse({ ...p(), speechMode: "POLITE" })),
    );
    expect(v.opening).toMatch(/^피티님\./);
    for (const line of [v.opening, v.blocker, v.closing])
      expect(line, line).toMatch(/(습니다|입니다|세요)/);
  });
  it("names the weakest career axis as the blocker with the right particle", () => {
    const v = recordView(analyze(p()));
    const bottleneck = v.blocker.split("\n")[1];
    expect(bottleneck).toMatch(/^지금 가장 낮은 축은 .+(이야|야)\.$/);
    const worst = Object.entries(analyze(p()).traits)
      .filter(([id]) =>
        new Set([
          ...Object.keys(careerModel.trackWeights.MANAGEMENT),
          ...Object.keys(careerModel.trackWeights.EXPERT),
        ]).has(id),
      )
      .sort((a, b) => a[1] - b[1])[0][0];
    expect(bottleneck).toContain(
      catalog.traits.find((t) => t.id === worst)!.label,
    );
  });
  it("renders the annotation as short margin notes, not the full judgement", () => {
    const r = analyze(p());
    const html = renderToStaticMarkup(
      <VerdictDocument
        report={r}
        scenario={1}
        setScenario={() => {}}
        opened={false}
        checkout={() => {}}
      />,
    );
    const judgement = r.insights[0].headline;
    expect(html.split(judgement).length - 1).toBeLessThanOrEqual(1);
    for (const note of recordView(r).marginNotes) {
      expect(html).toContain(note);
      expect(note.length).toBeLessThanOrEqual(12);
    }
  });
  it("switches hardcoded narration with the speech mode", () => {
    const direct = recordView(analyze(p()));
    const polite = recordView(
      analyze(profileSchema.parse({ ...p(), speechMode: "POLITE" })),
    );
    const render = (mode: "DIRECT" | "POLITE") =>
      renderToStaticMarkup(
        <VerdictDocument
          report={analyze(profileSchema.parse({ ...p(), speechMode: mode }))}
          scenario={1}
          setScenario={() => {}}
          opened={false}
          checkout={() => {}}
        />,
      );
    expect(direct.narration.breakLimit).not.toBe(polite.narration.breakLimit);
    expect(render("DIRECT")).toContain(direct.narration.breakLimit);
    expect(render("POLITE")).toContain(polite.narration.breakLimit);
    expect(render("POLITE")).not.toContain("여기서 끝은 아니다.");
    for (const line of [
      ...direct.narration.remaining,
      direct.narration.expansionSuffix,
    ])
      expect(line).not.toMatch(/(습니다|입니다)/);
    for (const line of [
      ...polite.narration.remaining,
      polite.narration.expansionSuffix,
    ])
      expect(line).toMatch(/(습니다|입니다)/);
  });
  it("labels saju and palm record keys instead of raw calculation keys", () => {
    const r = analyze(p());
    const html = renderToStaticMarkup(
      <AnalysisRitual report={r} onComplete={() => {}} />,
    );
    expect(recordLabel("wood")).toBe("목 木");
    expect(recordLabel("heart_line_length")).toBe("감정선 길이");
    expect(recordLabel("unmapped_key")).toBe("unmapped_key");
    expect(html).not.toMatch(/L[1-5]|LEVEL\s*[1-5]/i);
    expect(html).toContain(r.input.fullName);
  });
  it("landing and onboarding source contain no user facing numeric levels", () => {
    for (const f of [
      "src/features/landing.tsx",
      "src/features/onboarding.tsx",
      "src/features/analysis-ritual.tsx",
      "src/features/verdict-document.tsx",
    ])
      expect(readFileSync(f, "utf8")).not.toMatch(/\bL[1-5]\b|LEVEL\s*[1-5]/i);
  });
});
