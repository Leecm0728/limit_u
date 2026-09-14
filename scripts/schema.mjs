import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const file =
  "supabase/migrations/" +
  readdirSync("supabase/migrations").find((f) =>
    f.endsWith("_initial_schema.sql"),
  );
let sql = `-- LIMIT U ownership-first schema. All report details share a session-owner composite FK.
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;
create policy admin_self on public.admin_users for select to authenticated using (user_id=(select auth.uid()));
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.profiles enable row level security;
grant select,insert,update,delete on public.profiles to authenticated;
create policy own_profile on public.profiles for all to authenticated using (id=(select auth.uid())) with check(id=(select auth.uid()));
create table public.analysis_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, input jsonb not null, created_at timestamptz not null default now(), unique(id,user_id));
alter table public.analysis_sessions enable row level security;
grant select,insert,delete on public.analysis_sessions to authenticated;
create policy own_session on public.analysis_sessions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index sessions_owner_created on public.analysis_sessions(user_id,created_at desc);
`;
for (const table of [
  "palm_analyses",
  "palm_features",
  "saju_profiles",
  "saju_features",
  "career_profiles",
  "name_features",
  "life_context_features",
  "trait_scores",
  "career_scores",
  "money_scores",
  "relationship_scores",
  "business_scores",
  "career_scenarios",
  "critical_points",
  "recommended_actions",
  "report_sections",
  "reports",
]) {
  sql += `create table public.${table} (id uuid primary key default gen_random_uuid(), session_id uuid not null, user_id uuid not null, data jsonb not null, rule_version text not null, template_version text not null, created_at timestamptz not null default now(), foreign key(session_id,user_id) references public.analysis_sessions(id,user_id) on delete cascade);
alter table public.${table} enable row level security;
grant select,insert,delete on public.${table} to authenticated;
create policy own_${table} on public.${table} for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index ${table}_owner_session on public.${table}(user_id,session_id);
`;
}
for (const table of [
  "trait_definitions",
  "trait_source_weights",
  "rule_definitions",
  "interpretation_definitions",
  "report_templates",
  "occupation_categories",
  "action_definitions",
  "career_levels",
  "products",
  "catalog_versions",
]) {
  sql += `create table public.${table} (id text not null, version text not null, data jsonb not null, created_at timestamptz not null default now(), primary key(id,version));
alter table public.${table} enable row level security;
grant select on public.${table} to anon,authenticated;
grant insert on public.${table} to authenticated;
create policy read_${table} on public.${table} for select to anon,authenticated using(true);
create policy admin_insert_${table} on public.${table} for insert to authenticated with check(exists(select 1 from public.admin_users where user_id=(select auth.uid())));
`;
}
sql += `create table public.payments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, product_id text not null, product_version text not null, amount integer not null check(amount>=0), provider text not null check(provider in ('mock','toss')), status text not null check(status in ('pending','simulated','paid','failed','refunded')), idempotency_key uuid not null unique, provider_reference text unique, created_at timestamptz not null default now(), foreign key(product_id,product_version) references public.products(id,version));
alter table public.payments enable row level security;
grant select on public.payments to authenticated;
create policy own_payments on public.payments for select to authenticated using(user_id=(select auth.uid()));
create index payments_owner on public.payments(user_id,created_at desc);
create index payments_product on public.payments(product_id,product_version);
-- SECURITY INVOKER: ownership is enforced by every target table, including composite FKs.
create function public.save_analysis(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid; uid uuid := auth.uid(); item text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 insert into public.analysis_sessions(user_id,input) values(uid,payload->'input') returning id into sid;
 insert into public.reports(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload,payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.career_profiles(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'input',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.palm_analyses(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'input'->'palm',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.palm_features(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'input'->'palm'->'features',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.saju_profiles(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'saju',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.saju_features(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'saju'->'features',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.trait_scores(session_id,user_id,data,rule_version,template_version) values(sid,uid,jsonb_build_object('scores',payload->'traits','evidence',payload->'evidence'),payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.career_scenarios(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'scenarios',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.critical_points(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'criticalPoints',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.recommended_actions(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'actions',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.report_sections(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'sections',payload->>'ruleVersion',payload->>'templateVersion');
 return sid;
end $$;
revoke all on function public.save_analysis(jsonb) from public,anon;
grant execute on function public.save_analysis(jsonb) to authenticated;
`;
writeFileSync(file, sql);
const c = JSON.parse(readFileSync("rules/catalog.json", "utf8")),
  t = JSON.parse(readFileSync("templates/reports.json", "utf8"));
const tables = {
  trait_definitions: c.traits,
  trait_source_weights: c.mappings,
  rule_definitions: c.rules,
  interpretation_definitions: t.interpretations,
  report_templates: t.sections,
  occupation_categories: c.occupations,
  action_definitions: c.actions,
  career_levels: c.levels,
  products: c.products,
  catalog_versions: [{ id: "active", catalog: c, templates: t }],
};
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
writeFileSync(
  "supabase/seed.sql",
  Object.entries(tables)
    .flatMap(([table, rows]) =>
      rows.map(
        (row) =>
          `insert into public.${table}(id,version,data) values(${quote(row.id)},'1.0.0',${quote(JSON.stringify(row))}::jsonb) on conflict do nothing;`,
      ),
    )
    .join("\n"),
);
