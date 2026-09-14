# 검증 기록 — 2026-09-14

## 1. 명령 결과

| 명령 | 결과 |
| --- | --- |
| `npm run lint` | 통과 (eslint, 경고 0) |
| `npm run typecheck` | 통과 (`tsc --noEmit`) |
| `npm test` | 61 tests / 5 files 통과 |
| `npm run build` | 통과, 10 route 생성 (analysis/catalog/checkout은 동적) |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| `npm run seed` (자격증명 없음) | Demo 안내만 출력하는 정상 동작 |

테스트 범위: Trait 경계와 기여도, 복합 Rule 연산자, 3개 시나리오와 나이 순서, 25개 섹션과 중복 제거, 재현성, 카탈로그 참조/버전, 입력 검증, 모의 결제, 실제 PostgreSQL(PGlite) migration/seed/RLS/소유권, 커리어 정규화와 말투.

## 2. 실행 검증 — 세로 슬라이스

`docs/`의 요구 사례(김피티 / 피티 / DIRECT / IT·개발 → 소프트웨어 개발 → 백엔드 개발자 / 2018.03 시작 / 선임매니저 / 핵심 실무자 / 리딩 경험 없음 / 고민 승진)를 실행 중인 `/api/analysis`에 그대로 넣어 확인했다.

| 항목 | 계산 결과 |
| --- | --- |
| 경력 | 102개월 → `8년 6개월`, band `8–12` |
| 역할 | `currentRole KEY_CONTRIBUTOR`, `rawTitle 선임매니저`를 분리 보관 |
| 경로 | 전문가 준비도 68 / 관리 준비도 37 → `preferredTrack EXPERT` |
| 관리 blocker | `managementExperience NONE`, `managementSignal -0.5` |
| 상한 | 현재 3 → 개선 4 → 적극 개선 5 (내부 코드, 화면 비노출) |
| 문서 | 25개 섹션, Rule Engine이 선택한 권고 행동 |

## 3. 브라우저 검증

Landing → Onboarding → Career Select → Palm → Analysis Ritual → Verdict → Paywall → Full Report → Timeline을 실행 중인 dev 서버에서 확인했다.

1. Landing: 어두운 작업대 배경, 기울어진 기록지, 붉은 잉크 밑줄 렌더링.
2. Onboarding 6단계: 이름과 별도의 호칭 입력(성을 자동으로 떼지 않는다는 안내 포함), 말투 선택, 직업 검색 Combobox(20개 직업군), 커리어 시작 월과 자동 총경력 표시, 회사 직급과 실제 역할 분리, 리딩 경험 선택.
3. Analysis Ritual 6장: 접수 → 사주(실제 명식 壬申·甲辰·丙寅·甲午와 오행 비율) → 손금 출처 → 커리어 → 성향 → 1차 소견. 가짜 로딩 애니메이션 없음. 손금은 입력 출처를 그대로 밝힌다.
4. Verdict: 역할 기반 상한(`선임·핵심 전문 실무`), 여백 메모(`실력 문제 아님 · 리딩 기록 없음 · 리더십 약함`), 전문가/관리 경로 비교, 2차 소견의 Rule Engine 행동 3건.
5. Paywall: `전체 판정 기록 열기 · ₩9,900` 모의 결제 후 25개 섹션과 6단계 타임라인 해제.
6. Timeline 3경로: 현재 경로는 `선임·핵심 전문 실무`에서 정체, 개선 경로는 39세에 `고급 전문 ~ 조직 대표 전문 역할`, 적극 개선은 43세에 `최상위 전문 영향력 역할`로 확장. 전문가 Track 사용자이므로 전문가 사다리 명칭을 사용한다.
7. Admin: 카탈로그 검증과 탐색 동작. Trait 30 / Mapping 60 / Rule 20 / 해석 20 / 섹션 25 / Action 30에 더해 Occupation taxonomy 23, Role mapping 8, Track weight 2, Speech template 2를 표시한다.

숫자 레벨 노출: 해제된 전체 문서를 포함해 화면 전체에서 `L1~L5` / `LEVEL 1~5` 일치 0건. 소스 검사 테스트로도 고정한다.

## 4. 반응형

| 뷰포트 | 결과 |
| --- | --- |
| 390×844 (모바일 기준) | 가로 스크롤 없음(scrollWidth = clientWidth = 390 측정), 기록 항목 세로 정렬 |
| 1440×900 (데스크톱) | 900px 기록지 + 285px 측면 검토 메모 2열, 가로 스크롤 없음. 모바일 카드를 가운데 띄우지 않는다 |

## 5. 디자인 토큰 대조

`docs/design-reference/LIMIT U V2.html`의 실제 사용 색상과 구현 토큰이 일치한다. V2는 CSS 변수 없이 인라인 hex를 쓰므로 토큰으로 추출해 사용한다.

| 토큰 | 값 | V2 근거 |
| --- | --- | --- |
| `--color-red-ink` | `#8b3f37` | V2 최다 사용(35회) 교정 적색 |
| `--color-ink` | `#27211c` | V2 본문 먹색(27회) |
| `--color-paper` | `#f1e8d7` | V2 기록지 |
| `--color-desk` | `#141210` | V2 작업대 |
| `--color-muted-ink` | `#756552` | V2 여백 메모 계열 |

서체는 Noto Serif KR(자체 제공, OFL 포함)과 Libre Baskerville 워드마크. 모션은 `draw-ink` / `paper-enter` / `reveal-ink` / `stamp-ink` 4종이며 `prefers-reduced-motion: reduce`를 지원한다.

## 6. 이번 회차에 고친 것

- 직업 Combobox에 `OTHER` 항목이 seed와 하드코딩으로 두 번 나타나고 라벨이 `기타 / 기타 / 직접 입력 / 기타 / 직접 입력`으로 겹쳐 보이던 문제. 중복 분류명을 접고 직접 입력을 항상 마지막 한 번만 제공한다.
- 해석 20건 중 3건에만 있던 DIRECT 변형을 20건 전체로 채웠다. 기존에는 `피티야.` 뒤에 존댓말 문장이 이어졌다.
- 판정 화면에서 같은 판정 문장이 도입부·여백 메모·병목 문단에 세 번 반복되던 문제. 병목은 실제 최저 Trait 축에서 뽑고, 여백 메모는 짧은 메모만 남긴다.
- 판정서에 하드코딩돼 있던 서술 문장을 말투별 템플릿으로 옮겼다. POLITE 모드에서 `여기서 끝은 아니다.`가 나오지 않는다.
- 분석 기록의 사주 오행과 손금 항목이 `wood` / `heart_line_length` 같은 계산 키로 보이던 문제. 기록지 이름표로 바꿨다.

## 7. 한계 — 검증하지 않았거나 지원하지 않는 것

- Supabase 실서버 Auth/이메일/원격 저장과 Vercel 배포는 프로젝트 자격증명이 없어 시행하지 않았다. SQL·RLS·소유권 격리는 PGlite(PostgreSQL WASM)에서 명시적 auth role로 실행 검증한다.
- 손금 사진의 자동 손 검출과 특징 추출은 구현되어 있지 않다. 직접 표시한 폴리라인 길이 또는 Demo/None 입력만 사용하며, UI도 자동 인식이 된 것처럼 표현하지 않는다. 사진은 브라우저 메모리에만 있고 서버로 전송하지 않는다. `tests/fixtures/palm-test.png`는 단색 합성 이미지이며 손 검출 정확도 시험이 아니다.
- 결제는 MockPaymentProvider의 simulated 응답이다. 실제 청구도, 서버 유료 권한도 발생하지 않는다. 잠금 해제는 모의 결제 UX다.
- 사주는 양력 현지시 근사다. 한국 진태양시, 역사적 서머타임, 절기 경계 보정은 지원하지 않으며 경계 출생은 별도 확인이 필요하다. 계산에 없는 십성이나 패턴을 지어내 표시하지 않는다.
- 직업·역할·말투의 관리 화면은 탐색 기능이다. 편집은 소스 JSON과 새 버전 seed로 관리하며 별도 CMS는 제공하지 않는다.
- 세 경로와 Critical Age는 가정 기반 계획 모형이다. 통계적 성공 확률이나 확정된 미래 예측이 아니다.
