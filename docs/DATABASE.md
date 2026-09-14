# Database

모든 public 테이블은 RLS를 활성화합니다. user_id 인덱스와 session_id/user_id 복합 FK로 다른 사용자의 세션에 데이터를 붙이는 공격도 방어합니다.

- profiles: full_name, display_name, speech_mode(DIRECT/POLITE). 자신의 행만 CRUD. 새 migration과 save_analysis 원자 저장에 연결.
- analysis_sessions: 검증된 원본 입력. owner/created_at 인덱스.
- palm_analyses, palm_features, saju_profiles, saju_features, career_profiles, name_features, life_context_features: source 레이어.
- trait_scores: 점수와 근거. career/money/relationship/business_scores: 도메인 확장 저장소.
- career_scenarios, critical_points, recommended_actions, report_sections, reports: 불변 결과 스냅샷.
- trait_definitions, trait_source_weights, rule_definitions, interpretation_definitions, report_templates, occupation_categories, action_definitions, career_levels, products: 공개 버전별 정의.
- catalog_versions: 완전한 카탈로그 발행 단위. 관리자는 새 버전 insert만 허용. 기존 버전 UPDATE 불허.
- admin_users: 자신의 관리자 여부 SELECT만 가능. 역할 부여는 운영 SQL 경로 전용.
- payments: 소유자 SELECT만. 상태 변경은 후속 PG 서비스의 서버 경로 전용.

save_analysis는 SECURITY INVOKER 함수입니다. 사용자 토큰과 RLS 하에서 세션·주요 feature·trait·scenario·report를 한 트랜잭션에 저장합니다. 원본 사진은 저장하지 않습니다. 향후 도메인 테이블들은 현재 빈 구조이며 전체 도메인 점수는 reports.data에 포함됩니다.

authenticated 사용자는 자신의 데이터만 INSERT/SELECT/DELETE할 수 있습니다. 사용자 소유 스냅샷은 본인이 직접 API를 호출하면 추가 가능하므로 공식 결제·인증 증명으로 사용하지 않습니다. 서비스 화면에서 생성하는 결과는 Next API가 재계산합니다. 신뢰할 수 있는 유료 서명 결과가 필요할 때는 저장 RPC를 서버 전용 권한으로 변경하세요.

삭제는 analysis_sessions의 소유자 삭제로 하위 데이터 cascade가 가능합니다. 계정 삭제는 auth.users cascade입니다. MVP UI에 계정 삭제 버튼은 제공하지 않으며 운영 절차로 처리합니다.

검증: PGlite에 auth.uid 및 anon/authenticated 역할을 재현해 실제 migration/seed 적용, RLS, 권한 상승 차단, cross-owner FK, append-only 버전을 테스트합니다. Supabase 실제 Auth/네트워크/메일은 별도 통합 검증이 필요합니다.

통합 migration은 기존 career_profiles JSONB에 `{input, normalized}`를 저장한다. reports.data와 analysis_sessions의 기존 행을 다시 쓰지 않는다. old records의 누락 값은 읽기 시 정규화한다. 최신 seed는 taxonomy/말투/커리어 모델과 새 catalog 2.0.0을 기존 버전에 추가한다. SQL seed 재생성은 `node scripts/seed-sql.mjs`; 초기 bootstrap용 schema/catalog 생성기는 기존 DB migration 대신 재실행하지 않는다.
