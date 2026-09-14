import { createClient } from "@supabase/supabase-js";
export const configured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
export function browserDb() {
  if (!configured) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
export async function authenticatedDb(request: Request) {
  if (!configured) return null;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { db, user: data.user };
}
