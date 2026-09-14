# 정형 커리어 모델

기존 엔진의 내부 숫자 단계를 유지하며, 사용자 결과를 책임 범위와 전문가/관리 경로로 번역한다. 조건·가중치·역할 이름·추천 행동·문구는 JSON 데이터로 관리한다.

## 직업

`rules/career-model.json`은 20개 직업군과 직업/세부 직무 코드를 제공한다. IT/개발, 기획/전략, 영업, 마케팅, 디자인, 물류/SCM, 생산, 품질, 연구개발, 재무/회계, 인사/조직, 교육, 의료, 금융, 공공/행정, 전문직, 서비스, 자영업, 사업/창업, 기타를 지원한다.

categoryCode → jobCode → specialtyCode. 예: IT_DEVELOPMENT → SOFTWARE_ENGINEER → BACKEND_ENGINEER. SearchSelect 검색은 한글 이름과 내부 영문 코드에 대응한다. OTHER/customOccupation은 목록 밖 직업을 기록한다. legacyCode는 기존 occupation fit과 Rule Engine 호환을 위한 연결이다. 외부 API 없이 SeedOccupationAdapter를 사용하며 OccupationAdapter로 향후 데이터 소스를 교체할 수 있다.

## 경력과 역할

careerStartDate는 월 입력을 YYYY-MM-01로 기록한다. experienceMonths는 **explicit asOf**와 시작일의 달력 월 차이다. 서버가 총 개월 수를 다시 계산하며 프론트에서 전달한 연차만 신뢰하지 않는다. UI는 년/개월, experienceBand는 8개 구간으로 파생한다. 시작일이 없는 old record는 experienceYears×12를 사용한다.

rawTitle은 회사 직급 참고 기록이다. 기존 jobTitle은 직무명이므로 rawTitle로 잘못 이전하지 않는다. 실제 normalizedRole은 다음과 같다.

| Code | 책임 수준 |
| --- | --- |
| ENTRY | 배우며 수행 |
| INDEPENDENT_CONTRIBUTOR | 혼자 끝까지 수행 |
| KEY_CONTRIBUTOR | 핵심 실무 |
| LEAD | 프로젝트 / 소규모 팀 리드 |
| TEAM_MANAGER | 정식 팀 관리 |
| ORG_LEADER | 여러 팀 / 조직 책임 |
| EXECUTIVE_BUSINESS | 임원 / 사업 책임 |
| NOT_APPLICABLE | 해당 없음 |

명시적 역할이 있으면 legacy level보다 우선한다. 없으면 기존 1~5 단계에서 보수적으로 역할을 보정한다.

## 리딩 경험과 경로

managementExperience: NONE, PEER_MENTORING, PROJECT_LEAD, TEAM_2_5, TEAM_6_15, ORG_16_PLUS, MULTI_TEAM. JSON managementSignals로 trait source에 연결한다. 기존 managementYears는 새 enum이 없을 때 기존 계산식을 유지한다. hiringExperience/evaluationExperience/budgetResponsibility/projectOwnership 확장 필드를 지원하며 MVP 필수 질문으로 늘리지 않는다.

managementReadiness는 leadership, management_orientation, persuasion, responsibility의 가중 합이다. expertReadiness는 specialist_orientation, execution, learning_speed, analytical의 가중 합이다. 가중치 및 hybridGap은 JSON에 있다. 선호 경로를 명시하지 않으면 준비도 차이에서 MANAGEMENT/EXPERT/HYBRID를 선택한다. marketMobility와 careerStageScore도 파생한다.

관리 경로는 핵심 실무 → 프로젝트/팀 리드 → 조직/사업 책임, 전문가 경로는 핵심 전문 실무 → 고급/조직 대표 전문 → 최상위 전문 영향력 역할이다. 동일한 내부 ceiling을 경로에 맞는 책임 수준으로 표시하며 특정 회사의 부장/Director를 확정하지 않는다. 3개 시나리오의 기존 gates/actions/가정은 유지한다.

## 호칭과 문구

fullName/displayName/speechMode를 사용자 입력으로 기록한다. 성을 자동으로 제거하지 않는다. DIRECT 기본값과 POLITE를 지원한다. `templates/speech.json`의 변수와 `templates/reports.json`의 direct 문구로 첫 판정/핵심 병목/첫 행동/마지막 결론을 개인화한다. 이름을 매 문장 반복하지 않는다.

### 말투 일관성

해석 20건 전체가 `direct` 변형을 가진다. 변형은 judgement/explanation/criticism/risk/action/scenario/closing 7개 필드를 모두 채우며, 존댓말 원문과 동일한 `{{token}}` 집합만 사용해야 한다. 테스트가 토큰 일치와 미치환 토큰 부재를 검증한다.

판정서의 서술 문장(`narration.breakLimit`, `expansionPrefix`, `expansionSuffix`, `remaining`)도 `templates/speech.json`에서 말투별로 제공한다. UI에 말투 문장을 하드코딩하지 않는다.

병목 문장은 판정 문장을 되풀이하지 않는다. `recordView`가 관리·전문가 경로 가중치에 실제로 쓰이는 Trait 축 중 최저 점수 축을 골라 받침에 맞는 서술격 조사를 붙인다(DIRECT `리더십이야`, POLITE `리더십입니다`). 여백 메모(`marginNotes`)는 12자 이하의 짧은 메모만 남기고 판정 문장을 반복하지 않는다.

구분: 판정·소견·행동 지시는 말투를 따르고, 모의 결제 안내와 확정 예측이 아님을 밝히는 고지 문구는 말투와 무관하게 존댓말을 유지한다. Rule Engine의 권고 행동 목록은 버전 관리되는 공용 문구를 그대로 인용한다.

판정 → 근거 → 문제 → 지속 위험 → 실행 → 경로 변화 순서를 유지한다. 사주·손금은 전통적 해석이며, 수치는 모델 점수이고 미래 사건의 과학적 확률이 아니다.

## 저장과 호환

새 migration은 기존 profiles에 full_name/speech_mode를 추가하고 display_name을 활용한다. career_profiles는 기존 JSONB 구조를 유지하며 `{input, normalized}`로 새 스냅샷을 저장한다. save_analysis는 기존 원자 저장/RLS/owner FK를 유지한다. reports.data는 수정하지 않는다. recordView가 old snapshot의 누락 필드와 레벨 문구를 읽기 시점에 보정한다.

규칙/문구 2.0.0과 careerModelVersion 2.0.0을 저장한다. Admin은 taxonomy/역할/경로 가중치/말투를 탐색할 수 있고 기존 규칙 버전 게시 기능은 유지한다. taxonomy/말투 편집은 현재 소스 JSON과 seed 배포로 관리하며 별도 대형 CMS는 제공하지 않는다.

## 운영 제한

Supabase 미설정: 데모 API와 sessionStorage. 설정: 서버 사용자 검증 및 소유자별 저장; migrations 전체와 최신 seed를 적용해야 한다. MockPaymentProvider만 작동하며 Toss 실결제/유료 권한은 구현하지 않는다.

손금은 수동 선 표시 또는 명시된 Demo/None 데이터다. capture="environment" 사진 선택은 브라우저/기기의 지원에 따른다. 자동 사진 검증·손 검출·특징 추출은 미지원이며 사진은 서버로 보내지 않는다.
