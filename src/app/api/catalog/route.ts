import { loadBundle } from "@/lib/catalog-store";
import { authenticatedDb } from "@/lib/supabase";
import { bundleSchema } from "@/domain/catalog";
import { analyze } from "@/domain/engine";
import { profileSchema } from "@/domain/model";
import demos from "../../../../rules/demos.json";
export async function GET() {
  try {
    return Response.json(await loadBundle());
  } catch {
    return Response.json(
      { error: "카탈로그를 읽지 못했습니다." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const auth = await authenticatedDb(request);
    if (!auth)
      return Response.json(
        { error: "관리자 로그인이 필요합니다." },
        { status: 401 },
      );
    const { data: admin } = await auth.db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!admin)
      return Response.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      );
    const raw = await request.text();
    if (raw.length > 500000)
      return Response.json(
        { error: "카탈로그 크기를 줄여주세요." },
        { status: 413 },
      );
    const parsed = bundleSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    for (const demo of demos) analyze(profileSchema.parse(demo), parsed.data);
    const { error } = await auth.db.from("catalog_versions").insert({
      id: "active",
      version: parsed.data.catalog.version,
      data: parsed.data,
    });
    if (error)
      return Response.json(
        {
          error:
            "이미 존재하는 버전이거나 저장할 수 없습니다. 새 버전을 지정하세요.",
        },
        { status: 409 },
      );
    return Response.json({ version: parsed.data.catalog.version });
  } catch {
    return Response.json(
      { error: "카탈로그 형식 또는 규칙을 확인하세요." },
      { status: 400 },
    );
  }
}
