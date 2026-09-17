"use client";
import { useRef, useState } from "react";
import type { Profile } from "@/domain/model";
import { measureLines, type Point } from "@/domain/palm";
import { detectPalmLines, type PalmDetection } from "@/domain/palm-vision";
const names = [
  ["head", "두뇌선"],
  ["heart", "감정선"],
  ["life", "생명선"],
] as const;
type Photo = { url: string; ratio: number };
const confidenceLabel = (c: number) =>
  c >= 0.45 ? "뚜렷함" : c >= 0.28 ? "보통" : "흐림";
export function PalmInput({
  value,
  onChange,
}: {
  value: Profile["palm"];
  onChange: (p: Profile["palm"]) => void;
}) {
  const [photos, setPhotos] = useState<Record<string, Photo>>({}),
    [side, setSide] = useState("left"),
    [active, setActive] = useState("head"),
    [points, setPoints] = useState<Record<string, Point[]>>({}),
    [detection, setDetection] = useState<Record<string, PalmDetection>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const photo = photos[side];
  function update(next: Record<string, Point[]>) {
    setPoints(next);
    onChange({ source: "manual", features: measureLines(next) });
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("10MB 이하 JPG, PNG, WebP 사진을 선택하세요.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const c = canvas.current!;
      c.width = 600;
      c.height = Math.round((bitmap.height * 600) / bitmap.width);
      if (c.height > 1600 || c.height < 150) {
        bitmap.close();
        setError("사진 비율을 확인하세요. 손바닥 부분을 잘라 주세요.");
        return;
      }
      const context = c.getContext("2d")!;
      context.drawImage(bitmap, 0, 0, c.width, c.height);
      bitmap.close();
      setPhotos((prev) => ({
        ...prev,
        [side]: {
          url: c.toDataURL("image/jpeg", 0.85),
          ratio: c.width / c.height,
        },
      }));
      const cleared = Object.fromEntries(
        Object.entries(points).filter(([key]) => !key.startsWith(side)),
      );
      // Propose the creases, then let the user correct them. Never final on its own.
      setBusy(true);
      const found = detectPalmLines(
        context.getImageData(0, 0, c.width, c.height),
        side as "left" | "right",
      );
      setBusy(false);
      setDetection((prev) => ({ ...prev, [side]: found }));
      update({
        ...cleared,
        ...Object.fromEntries(
          Object.entries(found.lines).map(([name, line]) => [
            side + "_" + name.replace("_line", ""),
            line.points,
          ]),
        ),
      });
    } catch {
      setError("이미지를 읽지 못했습니다. 다른 사진을 선택하세요.");
    }
  }
  function mark(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const point = {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
    const key = side + "_" + active;
    if ((points[key]?.length ?? 0) >= 12) {
      setError(
        "한 선에는 최대 12개 점을 지정할 수 있습니다. 마지막 점을 취소해 수정하세요.",
      );
      return;
    }
    update({ ...points, [key]: [...(points[key] ?? []), point] });
  }
  return (
    <div className="palm-input">
      <p>
        손바닥이 화면에 꽉 차도록 찍으면 주요 선을 자동으로 표시합니다. 결과가
        틀리면 직접 점을 찍어 고칠 수 있습니다. 양손을 각각 입력할 수 있으며,
        사진은 이 기기를 벗어나지 않습니다.
      </p>
      <div className="segmented">
        {["left", "right"].map((s) => (
          <button
            type="button"
            aria-pressed={side === s}
            key={s}
            onClick={() => setSide(s)}
          >
            {s === "left" ? "왼손" : "오른손"}
            {photos[s] ? " ✓" : ""}
          </button>
        ))}
      </div>
      <label className="upload">
        손바닥 사진 선택
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </label>
      <canvas ref={canvas} hidden />
      {busy && <p role="status">사진에서 손바닥과 선을 찾는 중…</p>}
      {photo && detection[side] && (
        <div className="detection-summary">
          {detection[side].ok ? (
            <>
              <p>자동으로 표시했습니다. 틀린 곳은 점을 다시 찍어 고쳐 주세요.</p>
              <ul>
                {names.map(([id, label]) => {
                  const line = detection[side].lines[id + "_line"];
                  return (
                    <li key={id}>
                      {label}{" "}
                      {line
                        ? "자동 인식 · " + confidenceLabel(line.confidence)
                        : "찾지 못함 · 직접 표시"}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p role="alert">
              {detection[side].reason} 직접 점을 찍어 표시할 수도 있습니다.
            </p>
          )}
        </div>
      )}
      {photo && (
        <>
          <div className="segmented">
            {names.map(([id, name]) => (
              <button
                type="button"
                key={id}
                aria-pressed={active === id}
                onClick={() => setActive(id)}
              >
                {name}
              </button>
            ))}
          </div>
          <div
            className="palm-photo"
            style={{
              backgroundImage: `url(${photo.url})`,
              aspectRatio: photo.ratio,
            }}
          >
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              onClick={mark}
              aria-label="손금 선을 따라 점 찍기"
            >
              {Object.entries(points)
                .filter(([k]) => k.startsWith(side))
                .map(([k, ps]) => (
                  <g key={k}>
                    <polyline
                      points={ps.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={k.endsWith(active) ? "#f6d59a" : "#8cae9b"}
                      strokeWidth=".005"
                    />
                    {ps.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r=".008"
                        fill="#f6d59a"
                      />
                    ))}
                  </g>
                ))}
            </svg>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="text-link"
              onClick={() => {
                const key = side + "_" + active;
                update({ ...points, [key]: (points[key] ?? []).slice(0, -1) });
                setError("");
              }}
            >
              마지막 점 취소
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setDetection((prev) => {
                  const next = { ...prev };
                  delete next[side];
                  return next;
                });
                update(
                  Object.fromEntries(
                    Object.entries(points).filter(([k]) => !k.startsWith(side)),
                  ),
                );
              }}
            >
              지우고 직접 표시
            </button>
          </div>
        </>
      )}
      <p className="muted">
        현재:{" "}
        {value.source === "demo"
          ? "Demo Palm Data (예시)"
          : value.source === "none"
            ? "손금 제외"
            : `${Object.keys(value.features).length}개 값 측정`}{" "}
        · 사진에서 손바닥 위치와 주요 선의 길이·곡률만 추정합니다. 깊이·분기·의학적
        판독은 지원하지 않습니다.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            onChange({
              source: "demo",
              features: {
                head_line_length: 0.65,
                heart_line_length: 0.55,
                life_line_length: 0.7,
              },
            })
          }
        >
          Demo 손금 사용
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => onChange({ source: "none", features: {} })}
        >
          손금 없이 진행
        </button>
      </div>
    </div>
  );
}
