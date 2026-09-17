import type { Point } from "./palm";

/** RGBA pixel buffer. Matches ImageData without depending on the DOM. */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface DetectedLine {
  /** Normalized image coordinates, same contract as manually marked points. */
  points: Point[];
  /** 0~1 ridge response strength. Low values must be presented as uncertain. */
  confidence: number;
}
export interface PalmDetection {
  ok: boolean;
  /** Only the lines that cleared the response floor. */
  lines: Record<string, DetectedLine>;
  /** Largest inscribed palm circle, normalized. Used to draw the review overlay. */
  palm?: { center: Point; radius: number };
  /** Plain-language reason shown to the user when detection is unusable. */
  reason?: string;
}

const ROI = 160;
/** Below this the trace is noise rather than a crease. */
const MIN_CONFIDENCE = 0.18;
/** Palm bands in normalized ROI coordinates, fingers at v = 0. */
const BANDS = {
  heart_line: { from: 0.2, to: 0.42 },
  head_line: { from: 0.4, to: 0.64 },
};
const LIFE_BAND = { from: 0.28, to: 0.86 };

/**
 * Locate the palm and trace its three principal creases.
 *
 * Classical computer vision only: chroma skin segmentation, a largest inscribed
 * circle for the palm, then a valley filter that responds to the darker lines.
 * There is no learned model, so the result is deterministic for a given image
 * and must be offered to the user as a proposal, never as a finished reading.
 *
 * `hand` selects which side of the image the thumb is expected on, since the
 * life line arcs around the thumb ball.
 */
export function detectPalmLines(
  image: RgbaImage,
  hand: "left" | "right",
): PalmDetection {
  const mask = skinMask(image);
  const hand_ = largestComponent(mask, image.width, image.height);
  if (!hand_)
    return { ok: false, lines: {}, reason: "손바닥을 찾지 못했습니다." };
  const distance = distanceTransform(hand_, image.width, image.height);
  const palm = inscribedCircle(distance, image.width);
  // A palm that occupies almost none of the frame is a miss, not a small hand.
  if (palm.radius < Math.min(image.width, image.height) * 0.08)
    return {
      ok: false,
      lines: {},
      reason: "손바닥이 너무 작게 잡혔습니다. 손바닥을 화면에 꽉 채워 주세요.",
    };
  const fingers = fingerDirection(hand_, image.width, palm);
  const size = palm.radius * 2.1;
  const roi = sampleRoi(image, palm.center, fingers, size);
  const response = valleyResponse(roi, ROI, ROI);

  const toImage = (u: number, v: number): Point => {
    const lx = (u - 0.5) * size,
      ly = (v - 0.5) * size;
    // ROI "up" points at the fingers; ROI "right" is that direction turned +90.
    const px = -fingers.y,
      py = fingers.x;
    return {
      x: (palm.center.x + lx * px - ly * fingers.x) / image.width,
      y: (palm.center.y + lx * py - ly * fingers.y) / image.height,
    };
  };

  const lines: Record<string, DetectedLine> = {};
  for (const [name, band] of Object.entries(BANDS)) {
    const traced = traceHorizontal(response, band.from, band.to);
    if (traced && traced.confidence >= MIN_CONFIDENCE)
      lines[name] = {
        confidence: traced.confidence,
        points: traced.path.map(([u, v]) => toImage(u, v)),
      };
  }
  const life = traceLife(response, LIFE_BAND, hand);
  if (life && life.confidence >= MIN_CONFIDENCE)
    lines.life_line = {
      confidence: life.confidence,
      points: life.path.map(([u, v]) => toImage(u, v)),
    };

  return {
    ok: Object.keys(lines).length > 0,
    lines,
    palm: {
      center: {
        x: palm.center.x / image.width,
        y: palm.center.y / image.height,
      },
      radius: palm.radius / image.width,
    },
    reason: Object.keys(lines).length
      ? undefined
      : "선을 충분히 읽지 못했습니다. 밝은 곳에서 손바닥을 펴고 다시 찍어 주세요.",
  };
}

/** Chroma-plane skin test. Chroma is used because it varies less across skin tones than luma. */
function skinMask(image: RgbaImage) {
  const { width, height, data } = image;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const r = data[p],
      g = data[p + 1],
      b = data[p + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;
    if (y > 50 && cb >= 75 && cb <= 133 && cr >= 130 && cr <= 180) mask[i] = 1;
  }
  return mask;
}

/** Keep only the biggest blob so a face or background wall cannot win. */
function largestComponent(mask: Uint8Array, width: number, height: number) {
  const seen = new Uint8Array(mask.length);
  const stack: number[] = [];
  let best: Uint8Array | null = null,
    bestSize = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const blob: number[] = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      blob.push(i);
      const x = i % width,
        y = (i / width) | 0;
      const push = (j: number) => {
        if (!mask[j] || seen[j]) return;
        seen[j] = 1;
        stack.push(j);
      };
      if (x > 0) push(i - 1);
      if (x < width - 1) push(i + 1);
      if (y > 0) push(i - width);
      if (y < height - 1) push(i + width);
    }
    if (blob.length > bestSize) {
      bestSize = blob.length;
      best = new Uint8Array(mask.length);
      for (const i of blob) best[i] = 1;
    }
  }
  // Ignore specks; they are never a hand filling the frame.
  return bestSize > mask.length * 0.03 ? best : null;
}

/** Two-pass chamfer distance to the nearest non-hand pixel. */
function distanceTransform(mask: Uint8Array, width: number, height: number) {
  const d = new Float32Array(mask.length);
  const big = width + height;
  for (let i = 0; i < mask.length; i++) d[i] = mask[i] ? big : 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) v = Math.min(v, d[i - width] + 1);
      if (x > 0 && y > 0) v = Math.min(v, d[i - width - 1] + 1.414);
      if (x < width - 1 && y > 0) v = Math.min(v, d[i - width + 1] + 1.414);
      d[i] = v;
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < width - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < height - 1) v = Math.min(v, d[i + width] + 1);
      if (x < width - 1 && y < height - 1)
        v = Math.min(v, d[i + width + 1] + 1.414);
      if (x > 0 && y < height - 1) v = Math.min(v, d[i + width - 1] + 1.414);
      d[i] = v;
    }
  return d;
}

/** The deepest point of the hand mask is the palm, not a finger. */
function inscribedCircle(d: Float32Array, width: number) {
  let best = 0,
    bi = 0;
  for (let i = 0; i < d.length; i++)
    if (d[i] > best) {
      best = d[i];
      bi = i;
    }
  return {
    center: { x: (bi % width) + 0.5, y: ((bi / width) | 0) + 0.5 },
    radius: best,
  };
}

/**
 * Unit vector from the palm centre toward the fingers.
 *
 * Mass is projected onto the hand's principal axis; the fingers are the side
 * that reaches further, since they are longer than the wrist stub in frame.
 */
function fingerDirection(
  mask: Uint8Array,
  width: number,
  palm: { center: Point; radius: number },
) {
  let sxx = 0,
    syy = 0,
    sxy = 0,
    n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const dx = (i % width) - palm.center.x,
      dy = ((i / width) | 0) - palm.center.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
    n++;
  }
  if (!n) return { x: 0, y: -1 };
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ax = Math.cos(theta),
    ay = Math.sin(theta);
  let farPos = 0,
    farNeg = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const dx = (i % width) - palm.center.x,
      dy = ((i / width) | 0) - palm.center.y;
    const t = dx * ax + dy * ay;
    if (t > farPos) farPos = t;
    if (t < farNeg) farNeg = t;
  }
  if (-farNeg > farPos) {
    ax = -ax;
    ay = -ay;
  }
  return { x: ax, y: ay };
}

/** Bilinear resample of a rotated square around the palm into a fixed grid. */
function sampleRoi(
  image: RgbaImage,
  center: Point,
  fingers: Point,
  size: number,
) {
  const out = new Float32Array(ROI * ROI);
  const px = -fingers.y,
    py = fingers.x;
  for (let j = 0; j < ROI; j++)
    for (let i = 0; i < ROI; i++) {
      const lx = ((i + 0.5) / ROI - 0.5) * size,
        ly = ((j + 0.5) / ROI - 0.5) * size;
      const sx = center.x + lx * px - ly * fingers.x,
        sy = center.y + lx * py - ly * fingers.y;
      out[j * ROI + i] = sampleGray(image, sx, sy);
    }
  return out;
}

function sampleGray(image: RgbaImage, x: number, y: number) {
  const { width, height, data } = image;
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x))),
    y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.min(width - 1, x0 + 1),
    y1 = Math.min(height - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0)),
    fy = Math.max(0, Math.min(1, y - y0));
  const g = (gx: number, gy: number) => {
    const p = (gy * width + gx) * 4;
    return 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  };
  return (
    g(x0, y0) * (1 - fx) * (1 - fy) +
    g(x1, y0) * fx * (1 - fy) +
    g(x0, y1) * (1 - fx) * fy +
    g(x1, y1) * fx * fy
  );
}

/** Creases are darker than their surroundings, so respond to local darkness. */
function valleyResponse(roi: Float32Array, width: number, height: number) {
  const blurred = boxBlur(roi, width, height, 5);
  const out = new Float32Array(roi.length);
  let max = 0;
  for (let i = 0; i < roi.length; i++) {
    const v = blurred[i] - roi[i];
    out[i] = v > 0 ? v : 0;
    if (out[i] > max) max = out[i];
  }
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

function boxBlur(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
) {
  const tmp = new Float32Array(src.length),
    out = new Float32Array(src.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let sum = 0,
        n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= width) continue;
        sum += src[y * width + xx];
        n++;
      }
      tmp[y * width + x] = sum / n;
    }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let sum = 0,
        n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= height) continue;
        sum += tmp[yy * width + x];
        n++;
      }
      out[y * width + x] = sum / n;
    }
  return out;
}

/** Heart and head lines run across the palm, so scan one column at a time. */
function traceHorizontal(
  response: Float32Array,
  from: number,
  to: number,
): { path: [number, number][]; confidence: number } | null {
  const y0 = Math.round(from * ROI),
    y1 = Math.round(to * ROI);
  const raw: { u: number; v: number; score: number }[] = [];
  for (let x = Math.round(ROI * 0.15); x < ROI * 0.85; x += 2) {
    let best = 0,
      bestY = -1;
    for (let y = y0; y < y1; y++) {
      const s = response[y * ROI + x];
      if (s > best) {
        best = s;
        bestY = y;
      }
    }
    if (bestY >= 0)
      raw.push({ u: (x + 0.5) / ROI, v: (bestY + 0.5) / ROI, score: best });
  }
  return finish(raw, "v");
}

/** The life line arcs around the thumb ball, so scan one row at a time. */
function traceLife(
  response: Float32Array,
  band: { from: number; to: number },
  hand: "left" | "right",
): { path: [number, number][]; confidence: number } | null {
  // A palm facing the camera puts the thumb opposite the hand it belongs to.
  const thumbRight = hand === "left";
  const x0 = Math.round(ROI * (thumbRight ? 0.5 : 0.12)),
    x1 = Math.round(ROI * (thumbRight ? 0.88 : 0.5));
  const raw: { u: number; v: number; score: number }[] = [];
  for (
    let y = Math.round(band.from * ROI);
    y < band.to * ROI;
    y += 2
  ) {
    let best = 0,
      bestX = -1;
    for (let x = x0; x < x1; x++) {
      const s = response[y * ROI + x];
      if (s > best) {
        best = s;
        bestX = x;
      }
    }
    if (bestX >= 0)
      raw.push({ u: (bestX + 0.5) / ROI, v: (y + 0.5) / ROI, score: best });
  }
  return finish(raw, "u");
}

/**
 * Smooth the argmax trail, drop it to a handful of points, and score it.
 *
 * `cross` names the axis the trace is free to wander along. Only that axis
 * counts as wobble; movement along the scan direction is the trace doing its
 * job and must not be penalised.
 */
function finish(
  raw: { u: number; v: number; score: number }[],
  cross: "u" | "v",
) {
  if (raw.length < 6) return null;
  const smooth = raw.map((_, i) => {
    const w = raw.slice(Math.max(0, i - 3), i + 4);
    return {
      u: w.reduce((s, p) => s + p.u, 0) / w.length,
      v: w.reduce((s, p) => s + p.v, 0) / w.length,
      score: raw[i].score,
    };
  });
  const step = (smooth.length - 1) / 7;
  const path: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const p = smooth[Math.round(i * step)];
    path.push([p.u, p.v]);
  }
  const mean = smooth.reduce((s, p) => s + p.score, 0) / smooth.length;
  // A real crease holds its line; a trail that jumps across the band is texture.
  let wobble = 0;
  for (let i = 1; i < smooth.length; i++)
    wobble += Math.abs(smooth[i][cross] - smooth[i - 1][cross]);
  const continuity = Math.max(0, 1 - (wobble / (smooth.length - 1)) * 20);
  return { path, confidence: Math.max(0, Math.min(1, mean * continuity)) };
}
