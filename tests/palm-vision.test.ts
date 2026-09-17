import { describe, it, expect } from "vitest";
import { detectPalmLines, type RgbaImage } from "../src/domain/palm-vision";
import { measureLines } from "../src/domain/palm";

const W = 300,
  H = 400;
const SKIN = [210, 160, 130],
  CREASE = [137, 104, 85],
  BACKGROUND = [20, 30, 70];

function blank(): RgbaImage {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = BACKGROUND[0];
    data[i * 4 + 1] = BACKGROUND[1];
    data[i * 4 + 2] = BACKGROUND[2];
    data[i * 4 + 3] = 255;
  }
  return { width: W, height: H, data };
}
function put(img: RgbaImage, x: number, y: number, rgb: number[]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = ((y | 0) * W + (x | 0)) * 4;
  img.data[p] = rgb[0];
  img.data[p + 1] = rgb[1];
  img.data[p + 2] = rgb[2];
}
/**
 * A stand-in palm: an oval with finger stubs on top so the principal axis has a
 * clear finger end, plus darker horizontal creases the valley filter can find.
 */
function syntheticPalm({ creases = true } = {}) {
  const img = blank();
  const cx = W / 2,
    cy = H * 0.55,
    rx = W * 0.32,
    ry = H * 0.22;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / rx,
        dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(img, x, y, SKIN);
    }
  // Four fingers reaching up, so the hand is longer toward the fingertips.
  for (let f = 0; f < 4; f++) {
    const fx = cx - rx * 0.7 + f * rx * 0.45;
    for (let y = cy - ry * 2.0; y < cy; y++)
      for (let x = fx - rx * 0.13; x < fx + rx * 0.13; x++) put(img, x, y, SKIN);
  }
  if (creases) {
    // Heart above the palm centre and head across it, as on a real hand.
    for (const offset of [-0.2, 0.02])
      for (let t = -0.72; t <= 0.72; t += 0.004) {
        const x = cx + t * rx;
        const y = cy + offset * ry * 2.0;
        for (let k = -1; k <= 1; k++) put(img, x, y + k, CREASE);
      }
    // Life line: an arc down the thumb side, which is image-right for a left palm.
    for (let t = -0.22; t <= 0.32; t += 0.002) {
      const x = cx + rx * (0.3 + 0.12 * Math.sin(t * 4));
      const y = cy + t * ry * 2.0;
      for (let k = -1; k <= 1; k++) put(img, x + k, y, CREASE);
    }
  }
  return img;
}

describe("automatic palm line detection", () => {
  it("finds palm creases and returns normalized image coordinates", () => {
    const result = detectPalmLines(syntheticPalm(), "left");
    expect(result.ok).toBe(true);
    expect(Object.keys(result.lines).length).toBeGreaterThanOrEqual(2);
    for (const line of Object.values(result.lines)) {
      expect(line.points.length).toBeGreaterThanOrEqual(3);
      expect(line.confidence).toBeGreaterThan(0);
      expect(line.confidence).toBeLessThanOrEqual(1);
      for (const p of line.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
    expect(result.palm!.radius).toBeGreaterThan(0);
  });
  it("is deterministic for the same image", () => {
    const a = detectPalmLines(syntheticPalm(), "left");
    const b = detectPalmLines(syntheticPalm(), "left");
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
  it("reports a reason instead of inventing lines when there is no hand", () => {
    const result = detectPalmLines(blank(), "left");
    expect(result.ok).toBe(false);
    expect(Object.keys(result.lines)).toHaveLength(0);
    expect(result.reason).toBeTruthy();
  });
  it("rejects a hand that is too small to read", () => {
    const img = blank();
    for (let y = 10; y < 34; y++)
      for (let x = 10; x < 34; x++) put(img, x, y, SKIN);
    const result = detectPalmLines(img, "right");
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });
  it("searches the thumb side that matches the selected hand", () => {
    const image = syntheticPalm();
    const left = detectPalmLines(image, "left").lines.life_line;
    const right = detectPalmLines(image, "right").lines.life_line;
    if (left && right) expect(left.points[0].x).not.toBe(right.points[0].x);
    else expect(Boolean(left) || Boolean(right)).toBe(true);
  });
  it("feeds detected points into the same feature measurement as manual marking", () => {
    const result = detectPalmLines(syntheticPalm(), "left");
    const features = measureLines(
      Object.fromEntries(
        Object.entries(result.lines).map(([name, line]) => [
          "left_" + name.replace("_line", ""),
          line.points,
        ]),
      ),
    );
    for (const [key, value] of Object.entries(features)) {
      expect(key).toMatch(
        /^(heart|head|life)_line_(length|curve)$/,
      );
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("line shape measurement", () => {
  it("scores a straight line as uncurved and a bowed line as curved", () => {
    const straight = measureLines({
      left_head: [
        { x: 0.1, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.5 },
      ],
    });
    const bowed = measureLines({
      left_head: [
        { x: 0.1, y: 0.5 },
        { x: 0.5, y: 0.9 },
        { x: 0.9, y: 0.5 },
      ],
    });
    expect(straight.head_line_curve).toBeCloseTo(0, 5);
    expect(bowed.head_line_curve).toBeGreaterThan(straight.head_line_curve);
  });
  it("moves the trait the curve maps to, so the mapping is no longer dead", async () => {
    const { analyze } = await import("../src/domain/engine");
    const { profileSchema } = await import("../src/domain/model");
    const demos = (await import("../rules/demos.json")).default;
    const run = (curve: number) =>
      analyze(
        profileSchema.parse({
          ...demos[1],
          palm: {
            source: "manual",
            features: { head_line_length: 0.6, head_line_curve: curve },
          },
        }),
      ).traits.adaptability;
    expect(run(0.9)).not.toBe(run(0));
  });
  it("produces head_line_curve, which the trait mappings consume", async () => {
    const catalog = (await import("../rules/catalog.json")).default;
    expect(
      catalog.mappings.some((m) => m.feature === "head_line_curve"),
    ).toBe(true);
    const features = measureLines({
      left_head: [
        { x: 0.2, y: 0.4 },
        { x: 0.5, y: 0.6 },
        { x: 0.8, y: 0.4 },
      ],
    });
    expect(features).toHaveProperty("head_line_curve");
    expect(features).toHaveProperty("head_line_length");
  });
});
