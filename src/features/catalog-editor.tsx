"use client";
import { useState } from "react";
import { bundled, bundleSchema } from "@/domain/catalog";
import { analyze } from "@/domain/engine";
import { profileSchema } from "@/domain/model";
import demos from "../../rules/demos.json";
import { browserDb, configured } from "@/lib/supabase";
export function CatalogEditor() {
  const [draft, setDraft] = useState(JSON.stringify(bundled, null, 2)),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  function validate() {
    const b = bundleSchema.parse(JSON.parse(draft));
    for (const demo of demos) analyze(profileSchema.parse(demo), b);
    return b;
  }
  return (
    <details className="catalog-editor">
      <summary>카탈로그 편집 · 검증 · 새 버전 발행</summary>
      <p>
        Trait, 매핑, 규칙, 해석, 템플릿, 직업군, 행동, 레벨, 상품을 함께
        편집합니다. 버전 번호를 올려 발행하세요. Demo에서는 검증과 JSON
        내보내기만 수행합니다.
      </p>
      <label>
        버전 카탈로그 JSON
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="button-row">
        <button
          className="button secondary"
          onClick={async () => {
            try {
              const r = await fetch("/api/catalog");
              if (!r.ok) throw new Error("카탈로그를 읽지 못했습니다.");
              setDraft(JSON.stringify(await r.json(), null, 2));
              setMessage("현재 운영 버전을 불러왔습니다.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "읽기 실패");
            }
          }}
        >
          현재 버전 불러오기
        </button>
        <button
          className="button secondary"
          onClick={() => {
            try {
              validate();
              setMessage(
                "스키마·참조 무결성·Demo 3건 계산 검증을 통과했습니다.",
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "검증 실패");
            }
          }}
        >
          변경 검증
        </button>
        <button
          className="button secondary"
          onClick={() => {
            try {
              const b = validate(),
                url = URL.createObjectURL(
                  new Blob([JSON.stringify(b, null, 2)], {
                    type: "application/json",
                  }),
                ),
                a = document.createElement("a");
              a.href = url;
              a.download = `limit-u-catalog-${b.catalog.version}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setMessage("검증된 카탈로그를 내보냈습니다.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "검증 실패");
            }
          }}
        >
          JSON 내보내기
        </button>
        {configured && (
          <button
            disabled={busy}
            className="button primary"
            onClick={async () => {
              setBusy(true);
              try {
                const b = validate(),
                  session = (await browserDb()!.auth.getSession()).data.session;
                if (!session)
                  throw new Error("관리자 계정으로 먼저 로그인하세요.");
                const r = await fetch("/api/catalog", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify(b),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error);
                setMessage(
                  `v${data.version} 발행 완료. 이후 분석에 적용됩니다.`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "발행 실패");
              } finally {
                setBusy(false);
              }
            }}
          >
            새 버전 발행
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </details>
  );
}
