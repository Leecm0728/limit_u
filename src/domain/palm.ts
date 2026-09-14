export type Point = { x: number; y: number };
/** A future CV implementation must explicitly identify its source and evidence. */
export interface PalmFeatureExtractor {
  extract(input: {
    manualPoints: Record<string, Point[]>;
    image?: Uint8Array;
  }): Promise<{
    source: "manual" | "automatic";
    features: Record<string, number>;
    limitations: string[];
  }>;
}
/** Normalized image-coordinate polyline length. A manual proxy, not anatomical detection. */
export function measureLines(points: Record<string, Point[]>) {
  const byLine: Record<string, number[]> = {};
  for (const [key, ps] of Object.entries(points)) {
    if (ps.length < 2) continue;
    const line = key.substring(key.indexOf("_") + 1);
    const length =
      ps
        .slice(1)
        .reduce((s, p, i) => s + Math.hypot(p.x - ps[i].x, p.y - ps[i].y), 0) /
      Math.SQRT2;
    (byLine[line] ??= []).push(Math.min(1, length));
  }
  return Object.fromEntries(
    Object.entries(byLine).map(([line, values]) => [
      line + "_line_length",
      values.reduce((s, n) => s + n, 0) / values.length,
    ]),
  );
}
