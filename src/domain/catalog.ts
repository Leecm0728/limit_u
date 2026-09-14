import { z } from "zod";
import catalog from "../../rules/catalog.json";
import templates from "../../templates/reports.json";
import type { Expression } from "./model";
const id = z.string().min(1).max(100),
  text = z.string().min(1).max(3000),
  score = z.number().min(0).max(100);
const expression: z.ZodType<Expression> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(expression).min(1).max(20) }),
    z.object({ any: z.array(expression).min(1).max(20) }),
    z.object({ not: expression }),
    z.object({
      field: id,
      op: z.enum(["eq", "lt", "lte", "gt", "gte", "between", "in"]),
      value: z.union([
        z.string(),
        z.number(),
        z.array(z.union([z.number(), z.string()])).max(30),
      ]),
    }),
  ]),
);
export const bundleSchema = z
  .object({
    catalog: z.object({
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      traits: z
        .array(z.object({ id, label: text, base: score }))
        .min(30)
        .max(100),
      occupations: z
        .array(z.object({ id, label: text, profile: z.record(id, score) }))
        .min(15)
        .max(200),
      mappings: z
        .array(
          z.object({
            id,
            feature: id,
            trait: id,
            weight: z.number().min(-100).max(100),
          }),
        )
        .min(50)
        .max(2000),
      rules: z
        .array(
          z.object({
            id,
            priority: z.number(),
            when: expression,
            actionIds: z.array(id),
            ceiling: z.number().int().min(1).max(5).nullable(),
            templateId: id,
          }),
        )
        .min(20)
        .max(500),
      actions: z
        .array(
          z.object({
            id,
            title: text,
            detail: text,
            trait: id,
            delta: z.number().min(0).max(100),
          }),
        )
        .min(30)
        .max(500),
      levels: z
        .array(z.object({ id: z.number().int().min(1).max(5), label: text }))
        .length(5),
      products: z.array(
        z.object({
          id,
          label: text,
          price: z.number().int().min(0),
          enabled: z.boolean(),
        }),
      ),
      scenarioConfig: z.object({
        levelGates: z
          .array(
            z.object({
              level: z.number().int().min(1).max(5),
              when: expression,
            }),
          )
          .max(10),
        baseCeiling: z.number().int().min(1).max(5),
        improvedDelta: z.number().int().min(0).max(2),
        aggressiveDelta: z.number().int().min(0).max(2),
        criticalOffset: z.number().int().min(1).max(10),
        retirementFloor: z.number().int().min(40).max(90),
        retirementOffset: z.number().int().min(10).max(30),
      }),
      domainWeights: z.record(id, z.record(id, z.number().min(0).max(1))),
    }),
    templates: z.object({
      version: z.string().regex(/^\d+\.\d+\.\d+$/),
      interpretations: z.array(
        z.object({
          id,
          variant: z.literal("direct"),
          headline: text,
          judgement: text,
          explanation: text,
          criticism: text,
          risk: text,
          recommendation: text,
          action: text,
          scenario: text,
          closing: text,
          direct: z
            .object({
              judgement: text,
              explanation: text,
              criticism: text,
              risk: text,
              action: text,
              scenario: text,
              closing: text,
            })
            .optional(),
        }),
      ),
      sections: z.array(z.object({ id, title: text, key: id })).length(25),
    }),
  })
  .superRefine((b, ctx) => {
    const traitIds = new Set(b.catalog.traits.map((t) => t.id)),
      actionIds = new Set(b.catalog.actions.map((a) => a.id)),
      templateIds = new Set(b.templates.interpretations.map((t) => t.id));
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const items of [
      b.catalog.traits,
      b.catalog.actions,
      b.catalog.rules,
      b.catalog.mappings,
      b.catalog.occupations,
      b.catalog.products,
      b.templates.interpretations,
    ])
      if (new Set(items.map((i) => i.id)).size !== items.length)
        fail("중복 ID가 있습니다.");
    for (const m of b.catalog.mappings)
      if (!traitIds.has(m.trait)) fail(`알 수 없는 Trait: ${m.trait}`);
    for (const a of b.catalog.actions)
      if (!traitIds.has(a.trait)) fail(`알 수 없는 Action Trait: ${a.trait}`);
    for (const occupation of b.catalog.occupations) {
      if (!Object.keys(occupation.profile).length)
        fail(`빈 직업 프로필: ${occupation.id}`);
      for (const key of Object.keys(occupation.profile))
        if (!traitIds.has(key)) fail(`알 수 없는 Occupation Trait: ${key}`);
    }
    if (new Set(b.templates.sections.map((s) => s.id)).size !== 25)
      fail("리포트 섹션 ID는 고유해야 합니다.");
    if (new Set(b.catalog.levels.map((l) => l.id)).size !== 5)
      fail("내부 단계 1~5를 각각 한 번 정의하세요.");
    for (const r of b.catalog.rules) {
      if (!templateIds.has(r.templateId))
        fail(`알 수 없는 Template: ${r.templateId}`);
      for (const a of r.actionIds)
        if (!actionIds.has(a)) fail(`알 수 없는 Action: ${a}`);
    }
    for (const weights of Object.values(b.catalog.domainWeights)) {
      if (
        Math.abs(Object.values(weights).reduce((a, v) => a + v, 0) - 1) > 0.001
      )
        fail("도메인 가중치 합계는 1이어야 합니다.");
      for (const key of Object.keys(weights))
        if (!traitIds.has(key)) fail(`알 수 없는 Domain Trait: ${key}`);
    }
    for (const required of catalog.traits)
      if (!traitIds.has(required.id)) fail(`필수 Trait 누락: ${required.id}`);
    for (const key of ["career", "money", "relationship", "business"])
      if (!b.catalog.domainWeights[key]) fail(`필수 Domain 누락: ${key}`);
    for (const s of b.templates.sections)
      if (!templates.sections.some((t) => t.key === s.key))
        fail(`지원하지 않는 Report key: ${s.key}`);
    if (
      b.catalog.scenarioConfig.improvedDelta >
      b.catalog.scenarioConfig.aggressiveDelta
    )
      fail("적극 개선 상한이 개선 상한보다 작습니다.");
  });
export type Bundle = z.infer<typeof bundleSchema>;
export const bundled: Bundle = bundleSchema.parse({ catalog, templates });
