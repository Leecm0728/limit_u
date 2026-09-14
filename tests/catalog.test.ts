import { describe, it, expect } from "vitest";
import { bundled, bundleSchema } from "../src/domain/catalog";
import { analyze } from "../src/domain/engine";
import { profileSchema } from "../src/domain/model";
import { measureLines } from "../src/domain/palm";
import demos from "../rules/demos.json";
import { TemplateLanguageProvider } from "../src/domain/reports";
describe("catalog publication", () => {
  it("renders numeric evidence without unresolved placeholders", () => {
    const r = analyze(profileSchema.parse(demos[1]));
    expect(r.insights[0].paragraphs[0]).toContain("8년");
    expect(r.insights.flatMap((i) => i.paragraphs).join(" ")).not.toContain(
      "{{",
    );
    expect(() =>
      new TemplateLanguageProvider().render("{{unknown}}", {}),
    ).toThrow();
  });
  it("new weight version changes scores without changing historical snapshots", () => {
    const p = profileSchema.parse(demos[1]),
      before = analyze(p),
      next = structuredClone(bundled);
    next.catalog.version = "2.1.0";
    next.catalog.mappings.find(
      (m) => m.feature === "experience" && m.trait === "execution",
    )!.weight = 5;
    const after = analyze(p, bundleSchema.parse(next));
    expect(after.traits.execution).toBeLessThan(before.traits.execution);
    expect(before.ruleVersion).toBe("2.0.0");
    expect(after.ruleVersion).toBe("2.1.0");
  });
  it("rejects dangling rule references and invalid domain weights", () => {
    const b = structuredClone(bundled);
    b.catalog.rules[0].actionIds = ["missing"];
    expect(bundleSchema.safeParse(b).success).toBe(false);
    const c = structuredClone(bundled);
    c.catalog.domainWeights.career.execution = 0.9;
    expect(bundleSchema.safeParse(c).success).toBe(false);
  });
  it("rejects duplicate IDs and unsupported section keys", () => {
    const b = structuredClone(bundled);
    b.catalog.traits[1].id = b.catalog.traits[0].id;
    expect(bundleSchema.safeParse(b).success).toBe(false);
  });
});
describe("manual palm measurements", () => {
  it("uses normalized line length, averages both hands and omits unmeasured lines", () => {
    const f = measureLines({
      left_head: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      right_head: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
      ],
      left_life: [{ x: 0, y: 0 }],
    });
    expect(f.head_line_length).toBeCloseTo(0.75);
    expect(f.life_line_length).toBeUndefined();
  });
  it("caps long traces without inventing other features", () =>
    expect(
      measureLines({
        left_heart: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 0 },
        ],
      }),
    ).toEqual({ heart_line_length: 1 }));
});
