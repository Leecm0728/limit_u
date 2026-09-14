"use client";
import { useState } from "react";
import { careerModel, occupationFor } from "@/domain/career";
import type { Profile } from "@/domain/model";
type Occupation = (typeof careerModel.occupations)[number];
const OTHER_CODE = "OTHER";
/** 같은 문구가 반복되는 분류(예: 기타)는 한 번만 표기한다. */
function pathSegments(o?: Occupation) {
  return o
    ? [...new Set([o.categoryLabel, o.jobLabel, o.specialtyLabel])]
    : ["미선택"];
}
function optionLabel(o: Occupation) {
  return pathSegments(o).join(" / ");
}
export function SearchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (fields: Partial<Profile>) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = occupationFor(value);
  const matched = careerModel.occupations.filter((o) =>
    `${o.categoryLabel} ${o.jobLabel} ${o.specialtyLabel} ${o.specialtyCode}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  /** 직접 입력은 검색 결과와 무관하게 항상 마지막 한 번만 제공한다. */
  const rows = [
    ...matched.filter((o) => o.specialtyCode !== OTHER_CODE),
    ...careerModel.occupations.filter((o) => o.specialtyCode === OTHER_CODE),
  ];
  return (
    <fieldset className="occupation-select">
      <legend>직업군 → 직업 → 세부 직무</legend>
      <label>
        직업을 검색해주세요
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 백엔드 개발자"
        />
      </label>
      <label>
        직업 선택
        <select
          value={rows.some((o) => o.specialtyCode === value) ? value : ""}
          onChange={(e) => {
            const o = occupationFor(e.target.value);
            if (o)
              onChange({
                occupation: o.legacyCode,
                occupationCategory: o.categoryCode,
                occupationCode: o.jobCode,
                specialtyCode: o.specialtyCode,
                jobTitle: o.specialtyLabel,
                customOccupation: "",
              });
          }}
        >
          <option value="" disabled>
            검색 결과에서 선택하세요
          </option>
          {rows.map((o) => (
            <option key={o.specialtyCode} value={o.specialtyCode}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      </label>
      <p className="selected-occupation" aria-live="polite">
        기록된 직무: {pathSegments(selected).join(" → ")}
      </p>
    </fieldset>
  );
}
