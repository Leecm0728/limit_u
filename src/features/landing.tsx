import Link from "next/link";
import {
  PaperSheet,
  DossierHeader,
  InkUnderline,
  ExpertAnnotation,
  VerdictSection,
} from "./records";
export function Landing() {
  return (
    <main className="landing-desk">
      <section className="landing-intro">
        <p className="eyebrow">LIMIT U · 개인 판정 기록실</p>
        <p className="landing-pre">
          좋은 말보다,
          <br />
          짚어야 할 기록이 있다.
        </p>
        <h1>
          당신의 한계는
          <br />
          <InkUnderline>아직</InkUnderline>
          <br />
          확정되지 않았다.
        </h1>
        <p className="lead">
          사주와 손금, 그리고 실제 커리어.
          <br />
          하나씩 펼쳐놓고 지금 막히는 지점과
          <br />
          바꿀 수 있는 경로를 살펴봅니다.
        </p>
        <Link className="button primary" href="/onboarding">
          내 상담 기록 작성하기 →
        </Link>
        <small className="under-cta">약 5분 · 카드 등록 없이 체험</small>
      </section>
      <PaperSheet className="landing-record">
        <DossierHeader
          name="당신의 기록"
          date="상담 접수 전"
          number="LU-____"
        />
        <VerdictSection label="기록을 읽는 순서">
          <h2>
            하나만 보고
            <br />
            판정하지 않는다.
          </h2>
          {[
            [
              "01",
              "사주 기록",
              "생년월일에서 계산한 전통적 상징. 확정된 미래 대신 해석의 단서.",
            ],
            [
              "02",
              "손금 기록",
              "직접 표시한 선의 특징. 사진을 자동 인식하지 않습니다.",
            ],
            [
              "03",
              "커리어 기록",
              "경력, 실제 역할, 이끈 경험. 지금까지 쌓아온 성과의 근거.",
            ],
          ].map(([n, title, text]) => (
            <div className="landing-record-row" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <ExpertAnnotation>직급보다 책임의 범위를 본다</ExpertAnnotation>
        </VerdictSection>
        <p className="record-label">현재 경로 → 개선 경로 → 적극 개선 경로</p>
        <p>행동 조건이 바뀌면 경로도 다시 검토합니다.</p>
        <span className="verdict-stamp">기록 우선</span>
      </PaperSheet>
      <section className="landing-bottom">
        <p className="eyebrow">다음 기록은 당신이 만든다.</p>
        <h2>
          경력은 쌓였는데,
          <br />왜 제자리일까?
        </h2>
        <p>
          일을 잘한다는 기록과
          <br />
          책임을 더 맡아도 된다는 기록은 다릅니다.
        </p>
        <Link className="text-link" href="/onboarding?case=B">
          기존 커리어 사례 체험 →
        </Link>
      </section>
    </main>
  );
}
