import { createClient } from "@supabase/supabase-js";
import { bundled, bundleSchema } from "@/domain/catalog";
import { configured } from "./supabase";
export async function loadBundle() {
  if (!configured) return bundled;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db
    .from("catalog_versions")
    .select("data")
    .eq("id", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    throw new Error(
      "카탈로그를 읽지 못했습니다. migration과 seed를 확인하세요.",
    );
  return data ? bundleSchema.parse(data.data) : bundled;
}
