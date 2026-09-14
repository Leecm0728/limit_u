import { readFileSync, writeFileSync } from "node:fs";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const c = read("rules/catalog.json"),
  t = read("templates/reports.json"),
  career = read("rules/career-model.json"),
  speech = read("templates/speech.json");
const tables = {
  trait_definitions: c.traits,
  trait_source_weights: c.mappings,
  rule_definitions: c.rules,
  interpretation_definitions: t.interpretations,
  report_templates: [
    ...t.sections,
    ...Object.entries(speech).map(([id, data]) => ({
      id: "SPEECH_" + id,
      ...data,
    })),
  ],
  occupation_categories: [
    ...c.occupations,
    ...career.occupations.map((o) => ({ id: o.specialtyCode, ...o })),
  ],
  action_definitions: c.actions,
  career_levels: c.levels,
  products: c.products,
  catalog_versions: [
    { id: "active", catalog: c, templates: t },
    { id: "career-model", ...career },
  ],
};
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
writeFileSync(
  "supabase/seed.sql",
  Object.entries(tables)
    .flatMap(([table, rows]) =>
      rows.map(
        (row) =>
          `insert into public.${table}(id,version,data) values(${quote(row.id)},${quote(c.version)},${quote(JSON.stringify(row))}::jsonb) on conflict do nothing;`,
      ),
    )
    .join("\n") + "\n",
);
