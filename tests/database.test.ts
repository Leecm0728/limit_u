import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { analyze } from "../src/domain/engine";
import { profileSchema } from "../src/domain/model";
import demos from "../rules/demos.json";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values('${a}'),('${b}');`,
  );
  const path =
    "supabase/migrations/" +
    readdirSync("supabase/migrations").find((f) =>
      f.endsWith("_initial_schema.sql"),
    );
  await db.exec(readFileSync(path, "utf8"));
  for (const f of readdirSync("supabase/migrations")
    .sort()
    .filter((f) => !f.endsWith("_initial_schema.sql")))
    await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
}, 30000);
afterAll(async () => {
  await db.close();
});
describe("Postgres migration, RLS and transactions", () => {
  it("stores identity and normalized career while retaining owner isolation", async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${b}',false);`,
    );
    const report = analyze(
      profileSchema.parse({
        ...demos[1],
        fullName: "김피티",
        displayName: "피티",
        speechMode: "POLITE",
        careerStartDate: "2018-03-01",
        normalizedRole: "KEY_CONTRIBUTOR",
        managementExperience: "NONE",
        specialtyCode: "BACKEND_ENGINEER",
        rawTitle: "선임매니저",
      }),
    );
    await db.query("select public.save_analysis($1::jsonb)", [
      JSON.stringify(report),
    ]);
    const person = await db.query<{
      full_name: string;
      display_name: string;
      speech_mode: string;
    }>("select full_name,display_name,speech_mode from public.profiles");
    expect(person.rows).toEqual([
      { full_name: "김피티", display_name: "피티", speech_mode: "POLITE" },
    ]);
    const career = await db.query<{
      data: { normalized: { experienceMonths: number; currentRole: string } };
    }>("select data from public.career_profiles");
    expect(career.rows[0].data.normalized.experienceMonths).toBe(102);
    expect(career.rows[0].data.normalized.currentRole).toBe("KEY_CONTRIBUTOR");
    await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`);
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(
      0,
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','${b}',false); delete from public.analysis_sessions; delete from public.profiles; reset role;`,
    );
  });
  it("enables RLS on every public table", async () => {
    const r = await db.query<{ relname: string }>(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });
  it("atomically persists a complete analysis and isolates users", async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`,
    );
    const r = await db.query<{ save_analysis: string }>(
      "select public.save_analysis($1::jsonb)",
      [JSON.stringify(analyze(profileSchema.parse(demos[0])))],
    );
    expect(r.rows[0].save_analysis).toBeTruthy();
    expect((await db.query("select * from public.reports")).rows).toHaveLength(
      1,
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
    expect((await db.query("select * from public.reports")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select * from public.trait_scores")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.palm_features(session_id,user_id,data,rule_version,template_version) values($1,$2,'{}','1','1')",
        [r.rows[0].save_analysis, b],
      ),
    ).rejects.toThrow();
    await db.exec("reset role;");
  });
  it("prevents user role escalation, catalog writes and paid status forgery", async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${b}',false);`,
    );
    await expect(
      db.exec(`insert into public.admin_users(user_id) values('${b}')`),
    ).rejects.toThrow();
    await expect(
      db.exec(
        "insert into public.rule_definitions(id,version,data) values('forged','2','{}')",
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into public.payments(user_id,product_id,product_version,amount,provider,status,idempotency_key) values('${b}','career-full','1.0.0',0,'toss','paid',gen_random_uuid())`,
      ),
    ).rejects.toThrow();
    await db.exec("reset role;");
  });
  it("allows admin append-only catalog versions", async () => {
    await db.exec(
      `insert into public.admin_users values('${a}',now());set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`,
    );
    await db.exec(
      "insert into public.rule_definitions(id,version,data) values('NEW','2.0.0','{}')",
    );
    await expect(
      db.exec(
        "update public.rule_definitions set data='{}' where version='1.0.0'",
      ),
    ).rejects.toThrow();
    await db.exec("reset role;");
  });
  it("allows public catalog reads but denies personal data", async () => {
    await db.exec("set role anon;");
    expect(
      (await db.query("select * from public.trait_definitions")).rows,
    ).toHaveLength(30);
    await expect(db.exec("select * from public.reports")).rejects.toThrow();
    await expect(
      db.exec("select public.save_analysis('{}')"),
    ).rejects.toThrow();
    await db.exec("reset role;");
  });
});
