"use client";
import { useState } from "react";
import type { Analysis } from "@/domain/engine";
import { recordView, recordLabel } from "@/domain/presentation";
import { careerModel, experienceLabel } from "@/domain/career";
import catalog from "../../rules/catalog.json";
import {
  PaperSheet,
  DossierHeader,
  InkUnderline,
  ExpertAnnotation,
} from "./records";
const scenes = [
  "접수 기록",
  "사주 기록",
  "손금 기록",
  "커리어 기록",
  "성향 검토",
  "1차 소견",
];
export function AnalysisRitual({
  report,
  onComplete,
}: {
  report: Analysis;
  onComplete: () => void;
}) {
  const [scene, setScene] = useState(0);
  const v = recordView(report);
  const ranked = [...catalog.traits].sort(
    (a, b) => report.traits[b.id] - report.traits[a.id],
  );
  return (
    <main className="ritual workspace">
      <p className="eyebrow">계산 완료 · 기록 검토 {scene + 1} / 6</p>
      <PaperSheet>
        <DossierHeader
          name={v.person.fullName}
          date={report.input.asOf}
          number="LU-REVIEW"
        />
        <section
          key={scene}
          className="ritual-scene reveal-ink"
          aria-live="polite"
        >
          <p className="record-label">{scenes[scene]}</p>
          {scene === 0 && (
            <>
              <h1>{v.person.fullName}의 기록</h1>
              <dl className="record-facts">
                <dt>생년월일</dt>
                <dd>{report.input.birthDate}</dd>
                <dt>직무</dt>
                <dd>{v.career.occupationLabel}</dd>
                <dt>경력</dt>
                <dd>{experienceLabel(v.career.experienceMonths)}</dd>
                <dt>고민</dt>
                <dd>{report.input.concern}</dd>
              </dl>
            </>
          )}
          {scene === 1 && (
            <>
              <h2>입력한 생일에서 계산한 명식</h2>
              <div className="saju-pillars">
                {report.saju.pillars.map((p, i) => (
                  <span key={i}>{p}</span>
                ))}
              </div>
              <dl className="record-facts">
                {Object.entries(report.saju.features).map(([k, n]) => (
                  <div key={k}>
                    <dt>{recordLabel(k)}</dt>
                    <dd>{Math.round(n * 100)}%</dd>
                  </div>
                ))}
              </dl>
              <p>{report.saju.limitations}</p>
            </>
          )}
          {scene === 2 && (
            <>
              <h2>
                {report.input.palm.source === "manual"
                  ? "직접 표시한 선을 확인했다."
                  : report.input.palm.source === "demo"
                    ? "시연용 손금 특징 기록"
                    : "손금은 이번 판정에서 제외했다."}
              </h2>
              <p>
                사진을 자동으로 읽은 결과가 아닙니다.{" "}
                {report.input.palm.source === "manual"
                  ? "사용자가 표시한 선의 길이와 형태만 사용합니다."
                  : ""}
              </p>
              <dl className="record-facts">
                {Object.entries(report.input.palm.features).map(([k, n]) => (
                  <div key={k}>
                    <dt>{recordLabel(k)}</dt>
                    <dd>{n.toFixed(3)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {scene === 3 && (
            <>
              <h2>{v.career.occupationLabel}</h2>
              <p>
                {experienceLabel(v.career.experienceMonths)} · {v.currentRole}
              </p>
              <p>회사 직급: {v.career.rawTitle || "기록 없음"}</p>
              <InkUnderline>
                리딩 경험:{" "}
                {careerModel.managementLabels[v.career.managementExperience]}
              </InkUnderline>
              {v.career.managementExperience === "NONE" && (
                <ExpertAnnotation>
                  관리 경로 전환의 근거가 부족함
                </ExpertAnnotation>
              )}
              {report.insights.slice(0, 2).map((i) => (
                <ExpertAnnotation key={i.id}>
                  {v.translate(i.headline)}
                </ExpertAnnotation>
              ))}
            </>
          )}
          {scene === 4 && (
            <>
              <h2>강한 성향과 막히는 지점</h2>
              {[...ranked.slice(0, 2), ...ranked.slice(-2)].map((t) => (
                <div className="trait-record" key={t.id}>
                  <span>{t.label}</span>
                  <strong>{report.traits[t.id]}</strong>
                </div>
              ))}
              <ExpertAnnotation>
                {v.translate(
                  report.insights[0]?.headline || "성과 증거를 더 확인할 것",
                )}
              </ExpertAnnotation>
            </>
          )}
          {scene === 5 && (
            <>
              <p>현재 경로의 예상 상한</p>
              <h1>
                <InkUnderline>{v.baseline}</InkUnderline>
              </h1>
              <ExpertAnnotation>
                {v.career.preferredTrack === "EXPERT"
                  ? "관리 경로보다 전문가 경로 우세"
                  : v.career.preferredTrack === "MANAGEMENT"
                    ? "관리 책임 경로 우세"
                    : "두 경로를 함께 검토할 것"}
              </ExpertAnnotation>
              <p>
                행동 조건과 기회에 따른 가능 범위입니다. 확정된 미래가 아닙니다.
              </p>
              <span className="verdict-stamp">검토 완료</span>
            </>
          )}
        </section>
        <div className="form-controls">
          {scene > 0 && (
            <button
              className="button secondary"
              onClick={() => setScene(scene - 1)}
            >
              이전 기록
            </button>
          )}
          <button
            className="button primary"
            onClick={() => (scene === 5 ? onComplete() : setScene(scene + 1))}
          >
            {scene === 5 ? "판정서 펼치기" : "다음 기록 확인"} →
          </button>
        </div>
      </PaperSheet>
    </main>
  );
}
