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
/** Polyline length over the straight chord. 0 is a straight line, higher is more bowed. */
function curvature(ps: Point[], length: number) {
  const chord = Math.hypot(
    ps[ps.length - 1].x - ps[0].x,
    ps[ps.length - 1].y - ps[0].y,
  );
  if (chord <= 0 || length <= 0) return 0;
  return Math.min(1, Math.max(0, (length * Math.SQRT2) / chord - 1));
}
/** Normalized image-coordinate polyline shape. A geometric proxy, not anatomical detection. */
export function measureLines(points: Record<string, Point[]>) {
  const lengths: Record<string, number[]> = {},
    curves: Record<string, number[]> = {};
  for (const [key, ps] of Object.entries(points)) {
    if (ps.length < 2) continue;
    const line = key.substring(key.indexOf("_") + 1);
    const length =
      ps
        .slice(1)
        .reduce((s, p, i) => s + Math.hypot(p.x - ps[i].x, p.y - ps[i].y), 0) /
      Math.SQRT2;
    (lengths[line] ??= []).push(Math.min(1, length));
    (curves[line] ??= []).push(curvature(ps, length));
  }
  const mean = (values: number[]) =>
    values.reduce((s, n) => s + n, 0) / values.length;
  return Object.fromEntries([
    ...Object.entries(lengths).map(([line, v]) => [
      line + "_line_length",
      mean(v),
    ]),
    ...Object.entries(curves).map(([line, v]) => [
      line + "_line_curve",
      mean(v),
    ]),
  ]) as Record<string, number>;
}
