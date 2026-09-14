"use client";
import { useState } from "react";
import { CatalogEditor } from "@/features/catalog-editor";
import catalog from "../../../rules/catalog.json";
import templates from "../../../templates/reports.json";
import career from "../../../rules/career-model.json";
import speech from "../../../templates/speech.json";
const collections: Record<string, unknown[]> = {
  Traits: catalog.traits,
  Mappings: catalog.mappings,
  Rules: catalog.rules,
  Interpretations: templates.interpretations,
  Templates: templates.sections,
  Occupations: catalog.occupations,
  Actions: catalog.actions,
  Levels: catalog.levels,
  Products: catalog.products,
  "Occupation taxonomy": career.occupations,
  "Role mappings": Object.entries(career.roleLabels).map(([id, label]) => ({
    id,
    label,
    stage: career.roleStages[id as keyof typeof career.roleStages],
  })),
  "Track weights": Object.entries(career.trackWeights).map(([id, data]) => ({
    id,
    data,
  })),
  "Speech templates": Object.entries(speech).map(([id, data]) => ({
    id,
    data,
  })),
};
export default function Admin() {
  const [tab, setTab] = useState("Traits"),
    [search, setSearch] = useState("");
  const rows = collections[tab].filter((r) =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="workspace admin">
      <p className="eyebrow">ENGINE EXPLORER / VERSIONED CATALOG</p>
      <h1>문구 뒤의 구조.</h1>
      <p className="muted">
        운영 데이터 탐색 · Rule v{catalog.version} / Template v
        {templates.version}
        <br />
        배포된 리포트는 생성 당시 버전을 보존합니다. 수정은 버전 검증 후 새
        카탈로그로 배포합니다.
      </p>
      <CatalogEditor />
      <div className="catalog-tabs">
        {Object.entries(collections).map(([name, items]) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
            <span>{items.length}</span>
          </button>
        ))}
      </div>
      <label>
        데이터 검색
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="키, 조건, 문구 검색"
        />
      </label>
      <p className="eyebrow">{rows.length} RECORDS</p>
      <div className="catalog-list">
        {rows.map((row, i) => (
          <details key={i}>
            <summary>
              {String((row as Record<string, unknown>).id)}{" "}
              <span>
                {String(
                  (row as Record<string, unknown>).label ??
                    (row as Record<string, unknown>).title ??
                    "정의 보기",
                )}
              </span>
            </summary>
            <pre>{JSON.stringify(row, null, 2)}</pre>
          </details>
        ))}
      </div>
    </main>
  );
}
