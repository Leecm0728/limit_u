# LIMIT U

개인 판정 기록 MVP. 기존 손금·사주·현재 경력 → 30개 Trait → 규칙 → 세 가지 경로 → 25개 리포트를 유지하고, V2 기록지 디자인과 정형 커리어 모델을 통합했습니다. 생성형 AI 호출/비용은 없습니다.

통합 설계: [감사 기록](docs/AUDIT.md), [디자인 시스템](docs/DESIGN_SYSTEM.md), [커리어 모델](docs/CAREER_MODEL.md). 직업 검색/실제 역할/리딩 경험/시작 월을 입력하고 호칭과 DIRECT/POLITE 말투를 선택합니다. 결과는 회사 직급이 아닌 책임 범위로 표시합니다. 실제 계산 완료 후 여섯 장의 분석 기록을 검토하며, 모의 결제로 전체 기록과 타임라인을 펼칩니다.

## 1. 설치

Node.js 22 이상 권장. 최초 환경은 Windows / Node 20.19였으므로 개발 의존성에 Node 22.23.2를 고정했습니다. `npm run`은 프로젝트 Node 실행 파일을 사용합니다. npm과 package-lock.json을 사용합니다(pnpm 미설치 환경).

```powershell
npm ci
```

## 2. 환경변수

자격증명 없이 `npm run dev`를 실행하면 Demo Mode입니다. `.env.example`을 `.env.local`로 복사하고 실제 계정 모드에서는 아래 두 값을 설정합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`는 선택적 원격 seed에만 사용하며 서버 전용입니다. 브라우저 코드에 넣지 마세요. `PAYMENT_PROVIDER=mock`만 MVP에서 구현되어 있습니다.

## 3. Supabase 설정

Supabase 프로젝트 생성 → Email/Password Auth 활성화 → Site URL과 허용 redirect URL에 로컬/배포 주소 등록 → URL/publishable key 설정. 이메일 확인을 활성화했다면 가입 후 확인 메일을 거쳐 로그인합니다. Google OAuth는 향후 어댑터 확장 대상입니다.

Auth는 브라우저 SDK 세션을 이용하며 API에 Bearer 토큰을 전달합니다. 서버에서 `getUser(token)`으로 매번 검증합니다. SSR 인증 페이지를 사용하지 않으므로 쿠키 Proxy를 사용하지 않습니다. API 결과는 사용자 RLS에 종속됩니다.

## 4. DB migration

Supabase SQL Editor에서는 `supabase/migrations/`의 모든 SQL을 파일명 순서로 실행한 뒤 최신 `supabase/seed.sql`을 실행하세요. 기존 DB에는 아직 적용하지 않은 migration만 추가합니다. 또는 CLI 프로젝트 연결 후 `supabase db push`를 실행합니다. 최신 2.0.0 seed를 적용하면 이전 카탈로그를 덮어쓰지 않고 새 버전을 추가합니다.

로컬 Docker 사용 시 `npx supabase start`, `npx supabase db reset`으로 migration/seed를 적용할 수 있습니다. 이 작업 환경에서는 Docker/Supabase 실서버 대신 PGlite(PostgreSQL WASM)로 migration, seed, RLS를 실행 검증합니다.

관리자 권한은 SQL Editor 등 신뢰할 수 있는 운영 경로에서만 부여합니다.

```sql
insert into public.admin_users(user_id) values ('관리자-auth-user-uuid');
```

## 5. Seed

기본 데이터: Trait 30, 직업군 20, Feature 매핑 60, Rule 20, Action 30, 해석 20, 리포트 섹션 25, Demo 3건.

Demo 데이터는 `rules/*.json`, `templates/reports.json`에 포함됩니다. `npm run seed`는 자격증명이 없으면 Demo 안내만 출력합니다. 원격 seed는 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 주입하고 실행합니다. 자동 `.env.local` 로딩은 하지 않습니다. SQL seed를 사용하는 것이 가장 간단합니다.

`/admin`에서 카탈로그 전체 JSON을 검증/내보낼 수 있습니다. 인증된 관리자는 새로운 catalog version을 DB에 발행할 수 있고 다음 분석부터 적용됩니다. 이전 보고서는 변경되지 않습니다. 정적 카탈로그 탐색 표는 번들 버전이며 편집기의 ‘현재 버전 불러오기’가 운영 DB 버전을 불러옵니다.

## 6. Development

```powershell
npm run dev
```

http://localhost:3000 → 분석 시작 → 단계별 입력 → Demo 손금 또는 수동 선 표시 → 계산 → Dashboard. CASE A/B/C 버튼으로 각각 29세 무직, 35세 개발자, 41세 기획자의 고정 fixture를 사용할 수 있습니다.

Demo 결과는 현재 탭 sessionStorage에 저장됩니다. 사진은 컴포넌트 메모리에서만 처리되며 업로드되지 않습니다. 계정 모드는 서버 계산 후 트랜잭션으로 Supabase에 저장합니다. 로그아웃 시 현재 탭 캐시를 지웁니다.

## 7. Test

```powershell
npm test
npm run typecheck
npm run lint
```

61개 테스트가 Trait 경계/기여도, 복합 Rule 연산자, 3개 시나리오, 나이/직업 조건, 25개 섹션, 중복 제거, 재현성, 카탈로그 참조, 입력 검증, 모의 결제, PostgreSQL RLS/관리자 권한/복합 외래키, 커리어 정규화, 말투 일관성과 숫자 레벨 비노출을 검증합니다. 결과는 [VERIFICATION](docs/VERIFICATION.md)에 있습니다.

## 8. Build

```powershell
npm run build
npm start
```

Next.js 16.3.5 App Router, React 19, TypeScript, Tailwind 4, React Hook Form, Zod. 결과는 문서형 타임라인과 재사용 SVG 잉크 표시로 구현했습니다. 기본 폼/버튼은 네이티브 접근성 요소를 사용하며 별도 상태 라이브러리는 추가하지 않았습니다. Noto Serif KR은 자체 제공하며 OFL 라이선스를 포함합니다.

## 9. Deploy

Vercel에 저장소 연결 → Node 22 → install `npm ci`, build `npm run build` → Supabase 환경변수 설정 → DB migration/seed → Auth URL 갱신 → 회원가입/저장/다른 계정 격리 검증. 실제 프로젝트, Vercel 계정, 도메인이 제공되지 않아 원격 배포는 수행하지 않았습니다.

Mock checkout은 서버 상품 가격으로 simulated 영수증을 반환하며 실제 청구/유료 권한을 만들지 않습니다. Toss 연동 시 서버 주문 생성, 서명 검증, 금액/통화 일치, idempotency, webhook 재처리를 추가해야 합니다.

## 정확도와 라이선스

`lunar-typescript@1.8.6`: MIT ([원본 저장소](https://github.com/6tail/lunar-typescript)). 양력 현지시 기반 간지/오행을 계산합니다. 한국 진태양시, 역사적 DST, 중국 기준 절기와 한국 시간대 경계 차이는 보정하지 않는 MVP 근사치입니다. 출생시간 미상은 시주를 제외합니다. 성별은 커리어 평가에 사용하지 않습니다.

손금은 수동 폴리라인의 정규화 길이만 측정합니다. 자동 손 검출/생명선 의미 판독/의학적 판단을 제공하지 않습니다. 원본 저장 정책은 MVP에서 `never`입니다. 개인 입력의 업무 증거에 높은 가중치를 두고 상징 데이터 가중치는 작게 유지합니다.

현재/개선/적극 개선 경로와 Critical Age는 제품의 가정 기반 계획 모형입니다. 통계적 성공 확률, 과학적 미래 예측, 실제 퇴직 나이로 해석해서는 안 됩니다.

설계 문서: [Architecture](docs/ARCHITECTURE.md), [DB](docs/DATABASE.md), [Rules](docs/RULE_ENGINE.md), [Palm](docs/PALM_ENGINE.md), [Reports](docs/REPORT_ENGINE.md), [Product](docs/PRODUCT.md), [Roadmap](docs/ROADMAP.md).
