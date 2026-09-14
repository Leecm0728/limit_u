import { MockPaymentProvider } from "@/lib/payments";
import { loadBundle } from "@/lib/catalog-store";
import { authenticatedDb, configured } from "@/lib/supabase";
export async function POST(request: Request) {
  try {
    if (configured && !(await authenticatedDb(request)))
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const { productId } = await request.json();
    if (typeof productId !== "string")
      return Response.json({ error: "상품을 선택하세요." }, { status: 400 });
    const receipt = await new MockPaymentProvider(
      (await loadBundle()).catalog.products,
    ).checkout(productId);
    return Response.json({
      receipt,
      message: "모의 결제입니다. 청구 및 유료 이용권 발급은 없습니다.",
    });
  } catch {
    return Response.json(
      { error: "결제할 수 없는 상품입니다." },
      { status: 400 },
    );
  }
}
