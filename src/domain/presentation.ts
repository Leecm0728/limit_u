import type { Analysis } from "./engine";
import { normalizeCareer, stageLabel, roleLabel, careerModel } from "./career";
import catalog from "../../rules/catalog.json";
import { profileSchema } from "./model";
import { TemplateLanguageProvider } from "./reports";
import speech from "../../templates/speech.json";

export function identity(input: unknown) {
  const p = profileSchema.parse(input);
  const name = p.displayName;
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const salutation =
    code >= 0 && code < 11172 ? name + (code % 28 ? "아." : "야.") : name + ".";
  return {
    fullName: p.fullName,
    displayName: name,
    speechMode: p.speechMode,
    salutation,
  };
}
/** Translate legacy snapshots at the read boundary; never rewrite a saved report. */
export function recordView(report: Analysis) {
  const p = profileSchema.parse(report.input),
    person = identity(p);
  const career = report.normalizedCareer || normalizeCareer(p, report.traits);
  const label = (n: number) => stageLabel(n, career.preferredTrack);
  const translate = (text: string) =>
    text.replace(/(?:LEVEL\s*|L)([1-5])\b/gi, (_, n) => label(Number(n)));
  const insight = report.insights[0];
  const weak = weakestAxes(report.traits);
  const provider = new TemplateLanguageProvider();
  const context = {
    ...person,
    judgement: insight?.headline || "지금까지의 기록을 먼저 확인하자.",
    blocker: copula(weak[0]?.label || "실무 증거", p.speechMode),
    explanation: insight?.paragraphs[0] || "역할과 성과를 함께 점검해야 한다.",
    // 말투별 해석문에 담긴 행동 문장을 우선 쓰고, 미치환 토큰이 있으면 카탈로그 행동으로 되돌린다.
    action:
      (insight && !insight.action.includes("{{") ? insight.action : "") ||
      report.actions[0]?.detail ||
      "목표 역할의 성과 기준부터 기록하세요.",
  };
  const tone = speech[person.speechMode];
  return {
    person,
    career,
    currentRole: roleLabel(career.currentRole),
    narration: tone.narration,
    marginNotes: marginNotes(weak, career),
    baseline: label(report.scenarios[0].ceiling),
    improved: label(report.scenarios[1].ceiling),
    aggressive: label(report.scenarios[2].ceiling),
    label,
    translate,
    opening: provider.render(tone.opening, context),
    blocker: provider.render(tone.blocker, context),
    action: provider.render(tone.action, context),
    closing: provider.render(tone.closing, context),
  };
}

/** 커리어 판정에 실제로 쓰이는 축만 대상으로 가장 낮은 순서로 정렬한다. */
function weakestAxes(traits: Analysis["traits"]) {
  const axes = new Set([
    ...Object.keys(careerModel.trackWeights.MANAGEMENT),
    ...Object.keys(careerModel.trackWeights.EXPERT),
  ]);
  return catalog.traits
    .filter((t) => axes.has(t.id) && typeof traits[t.id] === "number")
    .map((t) => ({ id: t.id, label: t.label, score: traits[t.id] }))
    .sort((a, b) => a.score - b.score);
}
/** 받침 유무에 따라 서술격 조사를 붙여 말투별로 자연스러운 문장을 만든다. */
function copula(label: string, mode: "DIRECT" | "POLITE") {
  if (mode === "POLITE") return `${label}입니다`;
  const code = label.charCodeAt(label.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code < 11172 && code % 28 !== 0;
  return label + (hasFinal ? "이야" : "야");
}
/** 판정 문장을 되풀이하지 않고, 여백에 적는 짧은 메모만 남긴다. */
function marginNotes(
  weak: ReturnType<typeof weakestAxes>,
  career: ReturnType<typeof normalizeCareer>,
) {
  const notes = weak.slice(0, 2).map((t) => `${t.label} 약함`);
  if (career.managementExperience === "NONE") notes.unshift("리딩 기록 없음");
  if (weak.length && weak[weak.length - 1].score >= 70)
    notes.unshift("실력 문제 아님");
  return notes.slice(0, 3);
}

/** 기록지에 남기는 이름표. 계산 키를 그대로 노출하지 않는다. */
const recordLabels: Record<string, string> = {
  wood: "목 木",
  fire: "화 火",
  earth: "토 土",
  metal: "금 金",
  water: "수 水",
  heart_line_length: "감정선 길이",
  head_line_length: "두뇌선 길이",
  life_line_length: "생명선 길이",
  fate_line_length: "운명선 길이",
};
export function recordLabel(key: string) {
  return recordLabels[key] ?? key;
}
