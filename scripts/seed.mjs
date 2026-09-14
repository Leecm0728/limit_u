import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(
    "Demo catalog is bundled. For remote seed supply NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or apply supabase/seed.sql.",
  );
  process.exit(0);
}
const db = createClient(url, key),
  c = JSON.parse(readFileSync("rules/catalog.json", "utf8")),
  t = JSON.parse(readFileSync("templates/reports.json", "utf8")),
  career = JSON.parse(readFileSync("rules/career-model.json", "utf8")),
  speech = JSON.parse(readFileSync("templates/speech.json", "utf8"));
for (const [table, rows] of Object.entries({
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
})) {
  const { error } = await db.from(table).upsert(
    rows.map((data) => ({ id: String(data.id), version: c.version, data })),
    { onConflict: "id,version", ignoreDuplicates: true },
  );
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length}`);
}
