import { bundled, type Bundle } from "./catalog";
import {
  ageAt,
  profileSchema,
  type Profile,
  type Rule,
  type Scores,
} from "./model";
import { matches } from "./rules";
import { calculateSaju } from "./saju";
import { calculateTraits, extractFeatures, clamp } from "./traits";
import { renderInsights } from "./reports";
import { normalizeCareer, stageLabel, roleLabel, careerModel } from "./career";
export function ceilingFor(
  scores: Scores,
  rules: Rule[],
  context: Record<string, unknown>,
  config: Bundle["catalog"]["scenarioConfig"] = bundled.catalog.scenarioConfig,
) {
  const unlocked = Math.max(
    config.baseCeiling,
    ...config.levelGates
      .filter((g) => matches(g.when, { ...context, ...scores }))
      .map((g) => g.level),
  );
  return Math.max(
    Number(context.level) || 1,
    Math.min(
      unlocked,
      ...rules
        .filter(
          (r) =>
            r.ceiling !== null && matches(r.when, { ...context, ...scores }),
        )
        .map((r) => r.ceiling!),
    ),
  );
}
export function analyze(input: Profile, bundle: Bundle = bundled) {
  const { catalog, templates } = bundle;
  const p = profileSchema.parse(input);
  const canonical = normalizeCareer(p);
  if (p.specialtyCode || p.occupationCode)
    p.occupation = canonical.legacyOccupation;
  if (p.normalizedRole) p.level = canonical.careerStageScore;
  if (p.careerStartDate) p.experienceYears = canonical.experienceMonths / 12;
  if (!catalog.occupations.some((o) => o.id === p.occupation))
    throw new Error("지원하지 않는 직업군입니다.");
  const age = ageAt(p.birthDate, p.asOf),
    saju = calculateSaju(p),
    features = extractFeatures(p, saju.features),
    { scores: traits, evidence } = calculateTraits(
      features,
      catalog.mappings,
      catalog.traits,
    );
  const normalizedCareer = normalizeCareer(p, traits);
  const context = {
      ...p,
      ...normalizedCareer,
      experienceYears: normalizedCareer.experienceMonths / 12,
      level: normalizedCareer.careerStageScore,
      ...traits,
      currentRoleLabel: roleLabel(normalizedCareer.currentRole),
      managementExperienceLabel:
        careerModel.managementLabels[normalizedCareer.managementExperience],
      age,
    },
    rules = (catalog.rules as Rule[])
      .filter((r) => matches(r.when, context))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const actions = [...new Set(rules.flatMap((r) => r.actionIds))]
    .map((id) => catalog.actions.find((a) => a.id === id)!)
    .filter(Boolean);
  const domains = Object.fromEntries(
    Object.entries(catalog.domainWeights).map(([k, weights]) => [
      k,
      clamp(
        Object.entries(weights).reduce(
          (sum, [trait, w]) => sum + traits[trait] * w,
          0,
        ),
      ),
    ]),
  );
  const occupations = catalog.occupations
    .map((o) => ({
      id: o.id,
      label: o.label,
      score: clamp(
        100 -
          Object.entries(o.profile).reduce(
            (s, [k, v]) => s + Math.abs(traits[k] - v!),
            0,
          ) /
            Object.keys(o.profile).length,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const ceiling = ceilingFor(
      traits,
      catalog.rules as Rule[],
      context,
      catalog.scenarioConfig,
    ),
    criticalAge = age + catalog.scenarioConfig.criticalOffset;
  const scenarios = (["baseline", "improved", "aggressive"] as const).map(
    (id, i) => {
      const adjusted = { ...traits };
      if (i)
        for (const a of actions)
          adjusted[a.trait] = clamp(
            adjusted[a.trait] + a.delta * (i === 2 ? 1.5 : 1),
          );
      const target = Math.min(
        5,
        ceiling +
          (i === 1
            ? catalog.scenarioConfig.improvedDelta
            : i === 2
              ? catalog.scenarioConfig.aggressiveDelta
              : 0),
      );
      const score = clamp(
        Object.entries(catalog.domainWeights.career).reduce(
          (s, [k, w]) => s + adjusted[k] * w,
          0,
        ),
      );
      return {
        id,
        ceiling: target,
        score,
        assumption:
          i === 0
            ? "현재 행동 패턴 유지"
            : i === 1
              ? "권고 행동을 12개월 동안 완료하고 실무에서 입증"
              : "권고 행동·지속 학습·역할 확대를 24개월 이상 유지; 기회와 자원 필요",
        events: [
          {
            age,
            level: normalizedCareer.careerStageScore,
            label: roleLabel(normalizedCareer.currentRole),
          },
          {
            age: age + (i ? 1 : 2),
            level: Math.min(
              target,
              Math.max(normalizedCareer.careerStageScore, 2),
            ),
            label:
              p.status === "unemployed" ? "직무 진입 목표" : "성과 증거 확보",
          },
          {
            age: age + 3,
            level: Math.min(
              target,
              Math.max(normalizedCareer.careerStageScore, 3),
            ),
            label: i ? "전략적 역할 확장" : "직무 안정화",
          },
          {
            age: age + 5,
            level: Math.min(
              target,
              Math.max(normalizedCareer.careerStageScore, i ? 4 : 3),
            ),
            label: i ? "리딩 / 전문 역할 확보" : "현재 역할의 성장 점검",
          },
          {
            age: age + 9,
            level: target,
            label: `${stageLabel(target, normalizedCareer.preferredTrack)} 가능 범위 점검`,
          },
          {
            age: Math.max(
              catalog.scenarioConfig.retirementFloor,
              age + catalog.scenarioConfig.retirementOffset,
            ),
            level: target,
            label: "제2커리어 준비 점검",
          },
        ],
      };
    },
  );
  const topTraits = [...catalog.traits]
    .sort((a, b) => traits[b.id] - traits[a.id])
    .slice(0, 3)
    .map((t) => `${t.label} ${traits[t.id]}`)
    .join(" · ");
  const orientation =
    traits.entrepreneurship > traits.specialist_orientation
      ? "사업형"
      : traits.specialist_orientation > traits.organization_fit
        ? "전문가형"
        : "조직형";
  const values: Record<string, string> = {
    topTraits,
    fit: `${occupations.find((o) => o.id === p.occupation)?.score} / 100 · ${p.status === "unemployed" ? "관심 직업군 기준" : "현재 직업군 기준"}`,
    occupations: occupations
      .slice(0, 3)
      .map((o) => `${o.label} ${o.score}`)
      .join(" · "),
    orientation,
    environment:
      traits.independence > 60
        ? "자율성과 책임 범위가 명확한 환경"
        : "협업 규칙과 피드백 주기가 명확한 환경",
    leadership: `${traits.leadership} / 100. 리딩 기록: ${p.managementExperience ? careerModel.managementLabels[normalizedCareer.managementExperience] : `${p.managementYears}년 (기존 입력)`}.`,
    income:
      traits.specialist_orientation > 60
        ? "전문 결과물의 가치를 증명하는 방식"
        : "실행 성과와 협업 기여를 축적하는 방식",
    organization: `조직 적합 ${traits.organization_fit} / 100`,
    mobility: `이동 성향 ${traits.career_mobility} / 100`,
    changeAge: `${age + 1}~${criticalAge}세: 이직 실행 전 성과·생활비·제안을 검토하세요.`,
    readiness: `${clamp((traits.external_visibility + traits.networking + traits.execution) / 3)} / 100`,
    year3: scenarios
      .map(
        (s, i) =>
          `${["현재", "개선", "적극 개선"][i]}: ${stageLabel(s.events[2].level, normalizedCareer.preferredTrack)}`,
      )
      .join(" · "),
    year5: scenarios
      .map(
        (s, i) =>
          `${["현재", "개선", "적극 개선"][i]}: ${stageLabel(s.events[3].level, normalizedCareer.preferredTrack)}`,
      )
      .join(" · "),
    avoid:
      occupations
        .slice(-3)
        .map((o) => `${o.label} ${o.score}`)
        .join(" · ") + " — 배제 권고가 아닌 현재 성향 격차입니다.",
    management: `${traits.management_orientation} / 100`,
    business: `${domains.business} / 100. 고객 검증과 자금은 별도 조건입니다.`,
    ceiling: scenarios
      .map(
        (s, i) =>
          `${["현재", "개선", "적극 개선"][i]}: ${stageLabel(s.ceiling, normalizedCareer.preferredTrack)} 가능 범위`,
      )
      .join(" · "),
    actions: actions
      .slice(0, 3)
      .map((a) => a.title)
      .join(" "),
    retirement: `${scenarios[0].events[5].age}~${scenarios[0].events[5].age + 3}세에 전환 준비를 재점검하는 계획 구간입니다. 실제 퇴직 나이 예측은 아닙니다.`,
    second:
      orientation === "전문가형"
        ? "자문·교육·프로젝트 기반 전문 업무를 소규모 검증하세요."
        : "운영·멘토링·소규모 서비스 역할을 검증하세요.",
    critical: `${criticalAge}세 · 역할 확대 여부를 검토할 계획상 체크포인트`,
    risk: rules[0]
      ? templates.interpretations.find((t) => t.id === rules[0].templateId)!
          .risk
      : "준비 없이 역할을 바꾸는 선택",
    firstAction:
      actions[0]?.detail ?? "이번 주 목표 직무와 성과 기준을 기록하세요.",
    comparison: `현재 ${scenarios[0].score} → 개선 ${scenarios[1].score} → 적극 개선 ${scenarios[2].score}`,
  };
  const insights = renderInsights(
    templates.interpretations,
    rules.map((r) => r.templateId),
    context,
  );
  return {
    ruleVersion: catalog.version,
    templateVersion: templates.version,
    input: p,
    normalizedCareer,
    careerModelVersion: "2.0.0",
    age,
    saju,
    features,
    traits,
    evidence,
    domains,
    occupations,
    matchedRules: rules.map((r) => r.id),
    actions,
    scenarios,
    criticalPoints: [
      {
        age: criticalAge,
        label: "역할 전환 검토",
        reason: rules[0]
          ? templates.interpretations.find((t) => t.id === rules[0].templateId)!
              .headline
          : "현재 역할의 성과를 점검하세요.",
      },
    ],
    riskScore: clamp(
      100 -
        (traits.leadership + traits.external_visibility + traits.stability) / 3,
    ),
    insights,
    sections: templates.sections.map((s) => ({ ...s, body: values[s.key] })),
  };
}
export type Analysis = ReturnType<typeof analyze>;
