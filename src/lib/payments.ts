import catalog from "../../rules/catalog.json";
export interface PaymentProvider {
  checkout(productId: string): Promise<{
    provider: string;
    status: string;
    amount: number;
    productId: string;
    reference: string;
  }>;
}
export class MockPaymentProvider implements PaymentProvider {
  constructor(private products = catalog.products) {}
  async checkout(productId: string) {
    const product = this.products.find((p) => p.id === productId && p.enabled);
    if (!product) throw new Error("구매할 수 없는 상품입니다.");
    return {
      provider: "mock",
      status: "simulated",
      amount: product.price,
      productId,
      reference: crypto.randomUUID(),
    };
  }
}
