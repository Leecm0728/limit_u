# LIMIT U 기록 디자인 시스템

시각 기준은 `docs/design-reference/LIMIT U V2.html`이다. 실제 React 컴포넌트로 구성하며 iframe이나 HTML 복제 화면을 사용하지 않는다.

## 토큰

`src/app/records.css`의 CSS variables가 기준이다.

| Token | Value | 용도 |
| --- | --- | --- |
| color-desk | #141210 | 따뜻한 어두운 작업대 |
| color-paper | #F1E8D7 | 아이보리 기록지 |
| color-ink | #27211C | 검정 잉크 |
| color-red-ink | #8B3F37 | 교정·병목 메모 |
| color-muted-ink | #756552 | 보조 기록, 접근성을 위해 V2보다 진하게 조정 |
| font-verdict | Noto Serif KR | 제목·판정·메모 |
| motion-pen | 700ms | SVG 수기 선 |
| motion-paper | 450ms | 기록지 진입 |

Noto Serif KR은 레퍼런스에 포함된 woff2 subset을 자체 제공한다. `src/app/fonts.css`, `public/fonts/`; SIL Open Font License는 `public/fonts/OFL.txt`. 재추출은 `node scripts/reference-fonts.mjs`.

## 구성

Expert UI: PaperSheet, DossierHeader, VerdictSection, ExpertAnnotation, InkUnderline, InkCircle, ActionRecord. 정형 기록에 종이 질감·미세한 기울기·점선·붉은 체크·절제된 도장을 사용한다. 검정 잉크의 본문과 붉은 판정 표시를 구분한다.

Functional UI: 기존 검증된 form, native date/month/select, SearchSelect, navigation, buttons, receipt API를 유지한다. 검색 가능한 native select는 키보드 조작과 모바일 기본 선택 UI를 지원하며 선택된 taxonomy 경로를 별도로 보여준다.

390×844에서는 한 장씩 읽고 입력할 수 있다. Desktop은 큰 기록지와 작업대 옆 검토 메모 영역으로 확장한다. 25개 기록은 6개 PART에 묶인 문서 목차로 펼친다.

## 실제 기록 연출

AnalysisRitual은 API 계산 완료 후의 데이터만 보여준다. 자동 시간 지연이나 가짜 진행률을 사용하지 않는다. 사용자가 접수/사주/손금/커리어/성향/소견을 순서대로 확인한다. 실제 명식·오행과 manual/demo/none 출처를 표시한다. 실제 계산에 없는 십성이나 패턴을 만들지 않는다.

SVG stroke, ink reveal, paper enter, stamp motion은 `prefers-reduced-motion`에서 비활성화된다. 본문 읽기와 입력 기능은 모션에 의존하지 않는다.
