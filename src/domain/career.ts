import sourceData from "../../rules/career-model.json";
import { z } from "zod";
import catalogData from "../../rules/catalog.json";
import type { Profile, Scores } from "./model";
export type CareerRole = keyof typeof sourceData.roleLabels;
export type ManagementExperience = keyof typeof sourceData.managementLabels;
export type CareerTrack = "MANAGEMENT" | "EXPERT" | "HYBRID";
const roleKeys = Object.keys(sourceData.roleLabels) as [
  CareerRole,
  ...CareerRole[],
];
const managementKeys = Object.keys(sourceData.managementLabels) as [
  ManagementExperience,
  ...ManagementExperience[],
];
const text = z.string().min(1).max(100);
const weights = z
  .record(z.string(), z.number().min(0).max(1))
  .refine(
    (w) => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.001,
    "경로 가중치 합은 1이어야 합니다.",
  );
export const careerModelSchema = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    occupations: z
      .array(
        z.object({
          categoryCode: text,
          categoryLabel: text,
          legacyCode: text,
          jobCode: text,
          jobLabel: text,
          specialtyCode: text,
          specialtyLabel: text,
        }),
      )
      .min(20),
    roleLabels: z.record(z.enum(roleKeys), text),
    roleStages: z.record(z.enum(roleKeys), z.number().int().min(1).max(5)),
    managementLabels: z.record(z.enum(managementKeys), text),
    managementSignals: z.record(
      z.enum(managementKeys),
      z.number().min(-0.5).max(1),
    ),
    trackWeights: z.object({ MANAGEMENT: weights, EXPERT: weights }),
    hybridGap: z.number().min(0).max(100),
    stageLabels: z.record(
      z.enum(["MANAGEMENT", "EXPERT", "HYBRID"]),
      z.array(text).length(5),
    ),
  })
  .refine(
    (c) =>
      new Set(c.occupations.map((o) => o.specialtyCode)).size ===
      c.occupations.length,
    "직무 코드는 고유해야 합니다.",
  );
const data = careerModelSchema.parse(sourceData);
for (const o of data.occupations)
  if (!catalogData.occupations.some((legacy) => legacy.id === o.legacyCode))
    throw new Error(`Unknown occupation bridge: ${o.legacyCode}`);
for (const weights of Object.values(data.trackWeights))
  for (const trait of Object.keys(weights))
    if (!catalogData.traits.some((t) => t.id === trait))
      throw new Error(`Unknown career trait: ${trait}`);
export interface OccupationAdapter {
  list(): typeof data.occupations;
}
export class SeedOccupationAdapter implements OccupationAdapter {
  list() {
    return data.occupations;
  }
}
export function occupationFor(code: string) {
  return (
    data.occupations.find(
      (o) => o.specialtyCode === code || o.jobCode === code,
    ) || data.occupations.find((o) => o.legacyCode === code)
  );
}
export function experienceMonths(start: string, asOf: string) {
  if (!start) return 0;
  const [y, m] = start.split("-").map(Number),
    [ay, am] = asOf.split("-").map(Number);
  return Math.max(0, (ay - y) * 12 + am - m);
}
export function experienceLabel(months: number) {
  return months
    ? `${Math.floor(months / 12)}년${months % 12 ? ` ${months % 12}개월` : ""}`
    : "경력 없음";
}
export function experienceBand(months: number) {
  const years = months / 12;
  return ["0–1", "1–3", "3–5", "5–8", "8–12", "12–15", "15–20", "20+"][
    [1, 3, 5, 8, 12, 15, 20].findIndex((n) => years < n) < 0
      ? 7
      : [1, 3, 5, 8, 12, 15, 20].findIndex((n) => years < n)
  ];
}
export function roleLabel(role: CareerRole) {
  return data.roleLabels[role];
}
export function stageLabel(stage: number, track: CareerTrack = "HYBRID") {
  return data.stageLabels[track][Math.max(0, Math.min(4, stage - 1))];
}
export function normalizeCareer(p: Profile, traits?: Scores) {
  const occupation = occupationFor(
    p.specialtyCode || p.occupationCode || p.occupation,
  );
  const months = p.careerStartDate
    ? experienceMonths(p.careerStartDate, p.asOf)
    : Math.round(p.experienceYears * 12);
  const role =
    p.normalizedRole ||
    ([
      "ENTRY",
      "INDEPENDENT_CONTRIBUTOR",
      "KEY_CONTRIBUTOR",
      "LEAD",
      "ORG_LEADER",
    ][p.level - 1] as CareerRole);
  const management =
    p.managementExperience || (p.managementYears > 0 ? "PROJECT_LEAD" : "NONE");
  const readiness = (track: CareerTrack) =>
    traits
      ? Math.round(
          Object.entries(
            data.trackWeights[track === "HYBRID" ? "EXPERT" : track],
          ).reduce((s, [k, w]) => s + (traits[k] ?? 50) * w, 0),
        )
      : 50;
  const managementReadiness = readiness("MANAGEMENT"),
    expertReadiness = readiness("EXPERT");
  const preferredTrack: CareerTrack =
    p.preferredTrack ||
    (Math.abs(managementReadiness - expertReadiness) <= data.hybridGap
      ? "HYBRID"
      : managementReadiness > expertReadiness
        ? "MANAGEMENT"
        : "EXPERT");
  return {
    occupationCategory: occupation?.categoryCode || "OTHER",
    occupationCode: occupation?.jobCode || "OTHER",
    specialtyCode: p.specialtyCode
      ? occupation?.specialtyCode || "OTHER"
      : undefined,
    occupationLabel:
      (p.specialtyCode === "OTHER" ? p.customOccupation : "") ||
      (p.specialtyCode
        ? occupation?.specialtyLabel
        : p.jobTitle || occupation?.jobLabel) ||
      "기타",
    legacyOccupation: occupation?.legacyCode || "operations",
    experienceMonths: months,
    totalExperienceMonths: months,
    experienceBand: experienceBand(months),
    careerStartDate: p.careerStartDate || null,
    rawTitle: p.rawTitle || "",
    currentRole: role,
    managementExperience: management,
    managementSignal: data.managementSignals[management],
    managementReadiness,
    expertReadiness,
    preferredTrack,
    marketMobility: traits
      ? Math.round(
          ((traits.networking ?? 50) +
            (traits.external_visibility ?? 50) +
            (traits.execution ?? 50)) /
            3,
        )
      : 50,
    careerStageScore: data.roleStages[role],
    hiringExperience: p.hiringExperience || false,
    evaluationExperience: p.evaluationExperience || false,
    budgetResponsibility: p.budgetResponsibility || false,
    projectOwnership: p.projectOwnership || false,
  };
}
export type NormalizedCareerProfile = ReturnType<typeof normalizeCareer>;
export const careerModel = data;
