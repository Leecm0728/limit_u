import type { Bundle } from "./catalog";
export interface ReportLanguageProvider {
  render(text: string, context: Record<string, unknown>): string;
}
/** Extension point for future providers. The MVP always uses deterministic templates. */
export class TemplateLanguageProvider implements ReportLanguageProvider {
  render(text: string, context: Record<string, unknown>) {
    return text.replace(/\{\{([a-zA-Z_]+)\}\}/g, (_, key: string) => {
      const value = context[key];
      if (typeof value !== "string" && typeof value !== "number")
        throw new Error(`Unknown template token: ${key}`);
      return String(value);
    });
  }
}
export function renderInsights(
  interpretations: Bundle["templates"]["interpretations"],
  templateIds: string[],
  context: Record<string, unknown>,
) {
  const provider = new TemplateLanguageProvider(),
    seen = new Set<string>();
  return templateIds
    .map((id) => interpretations.find((t) => t.id === id)!)
    .filter(Boolean)
    .map((original) => {
      const t =
        context.speechMode === "DIRECT" && original.direct
          ? {
              ...original,
              ...original.direct,
              headline: original.direct.judgement,
            }
          : original;
      return {
        ...t,
        headline: provider.render(t.headline, context),
        paragraphs: [
          t.explanation,
          t.criticism,
          t.risk,
          t.recommendation,
          t.action,
          t.scenario,
          t.closing,
        ]
          .map((s) => provider.render(s, context))
          .filter((s) => {
            if (seen.has(s)) return false;
            seen.add(s);
            return true;
          }),
      };
    });
}
