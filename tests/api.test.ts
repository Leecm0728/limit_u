import { describe, it, expect } from "vitest";
import {
  POST as analysis,
  GET as history,
} from "../src/app/api/analysis/route";
import { POST as checkout } from "../src/app/api/checkout/route";
import { POST as publish } from "../src/app/api/catalog/route";
import demos from "../rules/demos.json";
const request = (body: unknown) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
describe("demo HTTP boundary", () => {
  it("computes reports on server and disregards forged scores", async () => {
    const r = await analysis(
      request({
        ...demos[0],
        traits: { leadership: 100 },
        ruleVersion: "forged",
      }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.result.ruleVersion).toBe("2.0.0");
    expect(body.result.traits.leadership).toBeLessThan(100);
  });
  it("rejects invalid data and arbitrary palm feature injection", async () => {
    expect(
      (await analysis(request({ ...demos[0], birthDate: "bad" }))).status,
    ).toBe(400);
    expect(
      (
        await analysis(
          request({
            ...demos[0],
            palm: { source: "manual", features: { self_leadership: 1 } },
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("does not trust client price, paid status or product availability", async () => {
    const r = await checkout(
      request({ productId: "career-full", amount: 1, status: "paid" }),
    );
    expect((await r.json()).receipt).toMatchObject({
      amount: 9900,
      status: "simulated",
    });
    expect(
      (await checkout(request({ productId: "relationship" }))).status,
    ).toBe(400);
  });
  it("denies history and publication without authentication", async () => {
    expect(
      (await history(new Request("http://localhost/api/analysis"))).status,
    ).toBe(401);
    expect((await publish(request({}))).status).toBe(401);
  });
});
