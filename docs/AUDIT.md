# 통합 전 구조 감사

기존 실행 가능한 MVP를 먼저 확인한 뒤 확장했다. 기존 엔진이나 라우트를 새로 구축하지 않았다.

| 항목 | 기존 계약과 통합 방법 |
| --- | --- |
| Route | `/`, `/onboarding`, `/dashboard`, `/auth`, `/admin`; `/api/analysis`, `/api/catalog`, `/api/checkout` 유지 |
| Analysis Session | 명시적 `asOf`와 검증된 `input`; 보고서 JSON과 규칙/문구 버전의 불변 스냅샷 |
| Trait | raw → features → 30 traits; base + JSON source weights, 0~100 clamp와 기여도 evidence |
| Rule | all/any/not 및 eq/in/lt/lte/gt/gte/between; 우선순위 정렬, Action ID 중복 제거 |
| Scenario | baseline/improved/aggressive; ceiling gates와 권고 행동의 조건부 변화; 6개 계획 이벤트 |
| Report | 25 sections, template interpolation, 중복 문장 제거; API와 JSON 내보내기 유지 |
| DB | profiles, analysis_sessions 및 career/palm/saju/trait/scenario/action/report snapshot 테이블; 모든 public 테이블 RLS |
| Ownership | session-owner composite FK, 소유자/참조 인덱스, SECURITY INVOKER save_analysis 원자 저장 |
| Auth/Admin | 서버 getUser로 Bearer 검증; DB admin_users로 역할 판정; append-only catalog version 관리 |
| Payment | 서버 상품 가격 기반 MockPaymentProvider; simulated 상태, 실청구/paid 권한 없음 |
| Demo | Supabase 미설정 시 로컬 번들/현재 탭 sessionStorage; 기존 A/B/C 사례 |
| Palm/Saju | 수동 표시 polyline 길이, 양손 평균; 사진 브라우저 메모리만. lunar-typescript 실제 명식/오행, 출생시간 모르면 시주 제외 |
| Tests | 기존 40개: engine 25, catalog 6, API 4, 실제 PostgreSQL WASM migration/seed/RLS 5 |

V2 HTML은 색상·서체·종이·메모·모션만 참조했다. mock 직업/직급/레벨 및 임의 한자는 가져오지 않았다. 사용자가 지정한 경로 표기 대신 실제 파일은 `docs/design-reference/LIMIT U V2.html`에서 확인했다.
