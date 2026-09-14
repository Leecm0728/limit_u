import { describe, it, expect } from "vitest";
import { analyze } from "../src/domain/engine";
import { matches } from "../src/domain/rules";
import { calculateTraits } from "../src/domain/traits";
import { ageAt, profileSchema } from "../src/domain/model";
import demos from "../rules/demos.json";
import catalog from "../rules/catalog.json";
import { MockPaymentProvider } from "../src/lib/payments";
describe("trait engine", () => {
  it("clamps weighted traits and retains source evidence", () => {
    const r = calculateTraits({ experience: 100, management: -100 });
    expect(r.scores.execution).toBe(100);
    expect(r.scores.leadership).toBe(0);
    expect(r.evidence.some((e) => e.feature === "experience")).toBe(true);
  });
  it("does not invent missing palm measurements", () => {
    const p = profileSchema.parse(demos[0]);
    p.palm = { source: "none", features: {} };
    expect(analyze(p).evidence.some((e) => e.feature.includes("line"))).toBe(
      false,
    );
  });
  it("responds to actual leadership and external evidence", () => {
    const p = profileSchema.parse(demos[1]),
      before = analyze(p),
      after = analyze({ ...p, managementYears: 5, visibility: 9 });
    expect(after.traits.leadership).toBeGreaterThan(before.traits.leadership);
    expect(after.scenarios[0].ceiling).toBeGreaterThan(
      before.scenarios[0].ceiling,
    );
  });
});
describe("rule language", () => {
  it.each([
    ["lt", 4, 5, true],
    ["lt", 5, 5, false],
    ["gte", 5, 5, true],
    ["between", 5, [4, 6], true],
    ["between", 7, [4, 6], false],
    ["eq", "it", "it", true],
    ["in", "it", ["it", "product"], true],
    ["unknown", 1, 2, false],
  ])("%s handles boundaries", (op, a, b, expected) =>
    expect(matches({ field: "x", op: op as string, value: b }, { x: a })).toBe(
      expected,
    ),
  );
  it("supports nested AND OR and NOT, age and occupation", () =>
    expect(
      matches(
        {
          all: [
            { field: "age", op: "gte", value: 40 },
            {
              any: [
                { field: "occupation", op: "eq", value: "product" },
                { field: "occupation", op: "eq", value: "it" },
              ],
            },
            { not: { field: "experience", op: "lt", value: 10 } },
          ],
        },
        { age: 41, occupation: "product", experience: 15 },
      ),
    ).toBe(true));
  it("fails closed on missing fields", () =>
    expect(matches({ field: "absent", op: "lt", value: 10 }, {})).toBe(false));
});
describe("career scenarios and reports", () => {
  for (const demo of demos)
    it(`case ${demo.id}: deterministic L3/L4/L5 with 25 populated sections`, () => {
      const p = profileSchema.parse(demo),
        a = analyze(p),
        b = analyze(p);
      expect(a).toEqual(b);
      expect(a.scenarios.map((s) => s.ceiling)).toEqual([3, 4, 5]);
      expect(a.sections).toHaveLength(25);
      expect(
        a.sections.every(
          (s) => typeof s.body === "string" && s.body.length > 0,
        ),
      ).toBe(true);
      expect(a.scenarios[1].score).toBeGreaterThan(a.scenarios[0].score);
      for (const s of a.scenarios) {
        expect(
          s.events.every((e, i) => !i || e.age > s.events[i - 1].age),
        ).toBe(true);
      }
      expect(a.criticalPoints[0].age).toBe(a.age + 2);
    });
  it("selects entry template for A, visibility rule for B, manager window for C", () => {
    expect(analyze(profileSchema.parse(demos[0])).insights[0].id).toBe("ENTRY");
    expect(analyze(profileSchema.parse(demos[1])).matchedRules).toContain(
      "INVISIBLE_EXPERT",
    );
    expect(analyze(profileSchema.parse(demos[2])).matchedRules).toContain(
      "MANAGER_WINDOW",
    );
  });
  it("does not downgrade an existing executive", () => {
    const p = profileSchema.parse(demos[2]);
    expect(
      analyze({ ...p, level: 5 }).scenarios.every((s) => s.ceiling === 5),
    ).toBe(true);
  });
  it("deduplicates report paragraphs and preserves version", () => {
    const r = analyze(profileSchema.parse(demos[1])),
      paragraphs = r.insights.flatMap((i) => i.paragraphs);
    expect(new Set(paragraphs).size).toBe(paragraphs.length);
    expect(r.ruleVersion).toBe(catalog.version);
  });
  it("keeps unknown birth time out of the pillars", () => {
    const p = profileSchema.parse(demos[0]);
    expect(analyze({ ...p, birthTime: "" }).saju.pillars).toHaveLength(3);
  });
  it("ignores gender in career assessment", () => {
    const p = profileSchema.parse(demos[1]);
    expect(analyze({ ...p, gender: "female" }).traits).toEqual(
      analyze({ ...p, gender: "male" }).traits,
    );
  });
});
describe("validation and catalog", () => {
  it("rejects impossible dates, ages, management history and nonfinite numbers", () => {
    for (const change of [
      { birthDate: "2000-02-31" },
      { birthDate: "2020-01-01" },
      { managementYears: 30 },
      { visibility: NaN },
      { experienceYears: 60 },
    ])
      expect(profileSchema.safeParse({ ...demos[0], ...change }).success).toBe(
        false,
      );
  });
  it("uses birthday-aware age without current clock", () => {
    expect(ageAt("1997-09-15", "2026-09-14")).toBe(28);
    expect(ageAt("1997-09-14", "2026-09-14")).toBe(29);
  });
  it("satisfies seed minimums and referential integrity", () => {
    expect(catalog.traits.length).toBeGreaterThanOrEqual(30);
    expect(catalog.mappings.length).toBeGreaterThanOrEqual(50);
    expect(catalog.rules.length).toBeGreaterThanOrEqual(20);
    expect(catalog.actions.length).toBeGreaterThanOrEqual(30);
    expect(catalog.occupations.length).toBeGreaterThanOrEqual(15);
    for (const r of catalog.rules)
      for (const id of r.actionIds)
        expect(catalog.actions.some((a) => a.id === id)).toBe(true);
  });
  it("mock payment uses trusted price and never issues paid status", async () => {
    const provider = new MockPaymentProvider();
    expect(await provider.checkout("career-full")).toMatchObject({
      status: "simulated",
      amount: 9900,
    });
    await expect(provider.checkout("relationship")).rejects.toThrow();
  });
});
