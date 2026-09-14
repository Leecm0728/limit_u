import { loadBundle } from "@/lib/catalog-store";
import { analyze } from "@/domain/engine";
import { profileSchema } from "@/domain/model";
import { authenticatedDb, configured } from "@/lib/supabase";
export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 50000)
      return Response.json({ error: "입력이 너무 큽니다." }, { status: 413 });
    const parsed = profileSchema.safeParse(JSON.parse(body));
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    const auth = await authenticatedDb(request);
    if (configured && !auth)
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const result = analyze(parsed.data, await loadBundle());
    if (!auth) return Response.json({ result, mode: "demo" });
    const { data, error } = await auth.db.rpc("save_analysis", {
      payload: result,
    });
    if (error)
      return Response.json(
        { error: "저장에 실패했습니다. DB migration 설정을 확인하세요." },
        { status: 500 },
      );
    return Response.json({ result, id: data, mode: "account" });
  } catch {
    return Response.json({ error: "분석 입력을 확인하세요." }, { status: 400 });
  }
}
export async function GET(request: Request) {
  const auth = await authenticatedDb(request);
  if (!auth)
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data, error } = await auth.db
    .from("reports")
    .select("id,data,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return error
    ? Response.json({ error: "리포트를 불러오지 못했습니다." }, { status: 500 })
    : Response.json({ reports: data });
}
