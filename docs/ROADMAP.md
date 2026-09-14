# Roadmap and production gates

## 구현된 MVP

- 순수 Trait/Rule/Saju/Trajectory/Report 엔진과 카탈로그 버전 발행.
- 3개 Demo, 단계별 입력, 수동 양손 선 표시, 계정/Auth 어댑터, RLS DB 저장.
- Dashboard, 근거 열람, 25개 관점, JSON/인쇄, 관리자 탐색/편집/검증, 모의 결제.
- PostgreSQL migration/seed/RLS 및 도메인 자동 테스트.

## 실제 운영 연결

- 제공된 Supabase 프로젝트에서 migration, seed, 이메일 가입 및 두 사용자 격리 통합 검증.
- Vercel 배포, 환경변수, Auth URL, 실제 도메인 연결. 부하/관측/백업 복원/레이트 리밋 정책 설정.
- 개인정보 처리방침, 보존/삭제 정책, 계정 삭제 UX, 오류 모니터링. 제품 운영자 정책으로 확정.

## 정확도

- 한국 만세력 경계 fixture, 절기/시간대/진태양시 보정. 현재 계산은 MVP 근사.
- 사용자 데이터 기반 가중치 보정. 현재 점수/나이/상한은 검증된 예측 모형이 아님.
- 손 landmark/ROI/edge 후보, 사용자 보정 정확도와 confidence. 지금은 수동 길이만 지원.

## 확장

- Toss 서버 주문/확인/webhook/idempotency/refund. 현재 mock은 실결제 아님.
- Google OAuth, 관계/성명 도메인, 게스트 결과 계정 전환, 사진 명시 동의 보관 정책.
- 대량 카탈로그 승인/감사 기록, 버전 비교, 사용자 재분석 비교.
