import type { Analysis } from "@/domain/engine";
import catalog from "../../rules/catalog.json";
import { recordView } from "@/domain/presentation";
import { experienceLabel, careerModel } from "@/domain/career";
import {
  PaperSheet,
  DossierHeader,
  VerdictSection,
  InkUnderline,
  InkCircle,
  ExpertAnnotation,
  ActionRecord,
} from "./records";
const parts = [
  ["PART I", "현재의 당신", 0, 5],
  ["PART II", "직업과 커리어", 5, 10],
  ["PART III", "막히는 지점", 10, 14],
  ["PART IV", "변곡점", 14, 18],
  ["PART V", "바꿔야 할 것", 18, 22],
  ["PART VI", "변경된 경로", 22, 25],
] as const;
export function VerdictDocument({
  report,
  scenario,
  setScenario,
  opened,
  checkout,
  paying = false,
}: {
  report: Analysis;
  scenario: number;
  setScenario: (n: number) => void;
  opened: boolean;
  checkout: () => void;
  paying?: boolean;
}) {
  const v = recordView(report),
    selected = report.scenarios[scenario];
  const traits = [...catalog.traits].sort(
    (a, b) => report.traits[b.id] - report.traits[a.id],
  );
  return (
    <div className="dossier-layout">
      <div className="dossier-book">
        <PaperSheet>
          <DossierHeader
            name={v.person.fullName}
            date={report.input.asOf}
            number={`LU-${report.input.asOf.replaceAll("-", "")}-${report.age}`}
          />
          <VerdictSection label="접수 기록">
            <dl className="record-facts">
              <dt>현재 커리어 위치</dt>
              <dd>{v.currentRole}</dd>
              <dt>직무</dt>
              <dd>{v.career.occupationLabel}</dd>
              <dt>경력</dt>
              <dd>{experienceLabel(v.career.experienceMonths)}</dd>
              <dt>회사 직급 · 참고</dt>
              <dd>{v.career.rawTitle || "기록 없음"}</dd>
            </dl>
          </VerdictSection>
          <VerdictSection label="1차 소견 / 현재 경로의 예상 상한">
            <h1 className="verdict-title">
              <InkUnderline>{v.baseline}</InkUnderline>
            </h1>
            <p className="verdict-text">{v.translate(v.opening)}</p>
            <ExpertAnnotation>
              {v.marginNotes.join(" · ") || "역할과 성과를 더 확인할 것"}
            </ExpertAnnotation>
          </VerdictSection>
          <VerdictSection label="왜 그렇게 보았는가">
            <div className="trait-records">
              {[...traits.slice(0, 2), ...traits.slice(-2)].map((t) => (
                <div className="trait-record" key={t.id}>
                  <span>{t.label}</span>
                  <strong>{report.traits[t.id]}</strong>
                  <small>/ 100</small>
                </div>
              ))}
            </div>
            <p className="verdict-text">{v.translate(v.blocker)}</p>
          </VerdictSection>
          <VerdictSection label="두 경로의 비교">
            <div className="track-comparison">
              <p>
                전문가 경로{" "}
                <InkCircle>{strength(v.career.expertReadiness)}</InkCircle>
              </p>
              <p>
                관리 경로 <span>{strength(v.career.managementReadiness)}</span>
              </p>
            </div>
            <ExpertAnnotation>
              {v.career.preferredTrack === "EXPERT"
                ? "전문가 경로 우세"
                : v.career.preferredTrack === "MANAGEMENT"
                  ? "관리 책임 경로 우세"
                  : "두 경로를 함께 검토"}
            </ExpertAnnotation>
            <p>
              리딩 경험:{" "}
              {careerModel.managementLabels[v.career.managementExperience]}
            </p>
          </VerdictSection>
          <span className="verdict-stamp">1차 검토 완료</span>
        </PaperSheet>
        <PaperSheet className="second-opinion">
          <p className="record-label">2차 소견 / BREAK YOUR LIMIT</p>
          <h2>{v.narration.breakLimit}</h2>
          <p className="verdict-text">{v.translate(v.action)}</p>
          <p>
            {v.narration.expansionPrefix}
            <InkUnderline>{v.improved}</InkUnderline>
            {v.narration.expansionSuffix}
          </p>
          {report.actions.slice(0, 3).map((a, i) => (
            <ActionRecord
              key={a.id}
              number={i + 1}
              title={a.title}
              detail={a.detail}
            />
          ))}
          <ExpertAnnotation>계획보다 완료한 기록</ExpertAnnotation>
        </PaperSheet>
        <PaperSheet>
          <p className="record-label">남은 기록 / 개인 판정서</p>
          <h2>
            {v.narration.remaining.map((line, i) => (
              <span key={line}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
          {!opened ? (
            <section className="locked-record">
              <ul>
                <li>이직 적기와 커리어 변곡점</li>
                <li>현재 경로의 끝과 개선 경로</li>
                <li>퇴직 준비와 제2 커리어</li>
              </ul>
              <div className="redacted-lines" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <button
                className="button primary"
                disabled={paying}
                onClick={checkout}
              >
                {paying ? "모의 결제 확인 중…" : "전체 판정 기록 열기"} · ₩
                {catalog.products
                  .find((p) => p.id === "career-full")
                  ?.price.toLocaleString()}
              </button>
              <p className="muted">
                모의 결제 체험입니다. 실제 청구 없이 남은 기록을 확인합니다.
                서버의 유료 권한을 부여하지 않습니다.
              </p>
            </section>
          ) : (
            <>
              <section className="career-path">
                <p className="record-label">변경된 경로 / 행동 조건별 기록</p>
                <div
                  className="segmented"
                  role="group"
                  aria-label="커리어 경로 선택"
                >
                  {report.scenarios.map((s, i) => (
                    <button
                      key={s.id}
                      aria-pressed={scenario === i}
                      onClick={() => setScenario(i)}
                    >
                      {["현재 경로", "개선 경로", "적극 개선"][i]}
                    </button>
                  ))}
                </div>
                <p>{selected.assumption}</p>
                <ol className="career-timeline">
                  {selected.events.map((e, i) => (
                    <li key={i}>
                      <span>{e.age}세</span>
                      <div>
                        <h3>{i === 0 ? v.currentRole : v.label(e.level)}</h3>
                        <p>{v.translate(e.label)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <small>
                  나이는 계획을 점검할 시점이며 역할이 바뀌는 나이의 확정 예측이
                  아닙니다.
                </small>
              </section>
              <section className="critical-record">
                <p className="record-label">변곡점 기록</p>
                {report.criticalPoints.map((p, i) => (
                  <div key={i}>
                    <h3>
                      {p.age}세 · {p.label}
                    </h3>
                    <ExpertAnnotation>{v.translate(p.reason)}</ExpertAnnotation>
                  </div>
                ))}
              </section>
              <div id="full-report">
                {parts.map(([part, title, start, end]) => (
                  <section className="report-part" key={part}>
                    <p className="record-label">{part}</p>
                    <h2>{title}</h2>
                    {report.sections.slice(start, end).map((s, i) => (
                      <details key={s.id}>
                        <summary>
                          <span>{String(start + i + 1).padStart(2, "0")}</span>
                          {s.title}
                        </summary>
                        <p>{v.translate(s.body)}</p>
                      </details>
                    ))}
                  </section>
                ))}
              </div>
              <section className="report-part">
                <p className="record-label">
                  판정 / 근거 / 문제 / 지속 위험 / 행동 / 변화
                </p>
                {report.insights.slice(0, 4).map((i) => (
                  <article className="insight" key={i.id}>
                    <h3>{v.translate(i.headline)}</h3>
                    {i.paragraphs.map((p) => (
                      <p key={p}>{v.translate(p)}</p>
                    ))}
                  </article>
                ))}
              </section>
              <p className="verdict-text">{v.closing}</p>
              <details className="evidence">
                <summary>계산 근거와 버전 확인</summary>
                <p>
                  규칙 {report.ruleVersion} · 문구 {report.templateVersion} ·
                  커리어 {report.careerModelVersion || "기존 기록"} · 손금{" "}
                  {report.input.palm.source}
                </p>
                <p>사주 {report.saju.pillars.join(" · ")}</p>
                <p>{report.saju.limitations}</p>
                <dl className="record-facts">
                  <dt>전문가 준비도</dt>
                  <dd>{v.career.expertReadiness}</dd>
                  <dt>관리 준비도</dt>
                  <dd>{v.career.managementReadiness}</dd>
                </dl>
                {catalog.traits.map((t) => (
                  <div className="trait-record" key={t.id}>
                    <span>{t.label}</span>
                    <strong>{report.traits[t.id]}</strong>
                  </div>
                ))}
                <pre>{JSON.stringify(report.evidence, null, 2)}</pre>
              </details>
            </>
          )}
        </PaperSheet>
      </div>
      <aside className="desk-notes">
        <p className="eyebrow">검토 메모</p>
        <p>
          실제 역할을 본다.
          <br />
          회사 직급은 참고.
        </p>
        <p>
          사주 · 손금은
          <br />
          전통 해석의 단서.
        </p>
        <p>
          판정을 바꾸는 건<br />
          다음 행동의 기록.
        </p>
        <span>
          LIMIT U<br />
          상담 기록실
        </span>
      </aside>
    </div>
  );
}
function strength(n: number) {
  return n >= 65 ? "강" : n >= 45 ? "보통" : "보완 필요";
}
