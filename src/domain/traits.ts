import catalog from "../../rules/catalog.json";
import type { Profile, Scores } from "./model";
import { normalizeCareer } from "./career";
export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export function extractFeatures(p: Profile, saju: Scores) {
  const career = normalizeCareer(p);
  return {
    ...saju,
    ...(p.palm.source === "none" ? {} : p.palm.features),
    experience: Math.min(career.experienceMonths / 120, 1),
    management: p.managementExperience
      ? career.managementSignal
      : Math.min(p.managementYears / 5, 1) - 0.5,
    visibility: p.visibility / 10 - 0.5,
    network: p.network / 10 - 0.5,
    learning: p.learningHours / 10 - 0.5,
    runway: Math.min(p.runwayMonths / 12, 1) - 0.5,
    business: p.businessInterest / 10 - 0.5,
    mobility: p.concern === "이직" ? 0.7 : 0,
    education: ["university", "graduate"].includes(p.education) ? 0.7 : 0.2,
    level: (career.careerStageScore - 1) / 4,
    ...Object.fromEntries(
      Object.entries(p.selfRatings).map(([k, v]) => [
        "self_" + k,
        (v - 50) / 50,
      ]),
    ),
  };
}
export function calculateTraits(
  features: Scores,
  mappings = catalog.mappings,
  definitions = catalog.traits,
) {
  const scores: Scores = Object.fromEntries(
    definitions.map((t) => [t.id, t.base]),
  );
  const evidence: { trait: string; feature: string; delta: number }[] = [];
  for (const m of mappings) {
    if (features[m.feature] === undefined) continue;
    const delta = features[m.feature] * m.weight;
    scores[m.trait] = (scores[m.trait] ?? 50) + delta;
    evidence.push({
      trait: m.trait,
      feature: m.feature,
      delta: Math.round(delta * 100) / 100,
    });
  }
  return {
    scores: Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, clamp(v)]),
    ),
    evidence,
  };
}
