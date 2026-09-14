# Report engine

templates/reports.json: direct variant의 20개 해석과 25개 섹션. 구조는 headline, judgement, explanation, criticism, risk, recommendation, action, scenario, closing입니다. 단일/2개/3개 특징 조합 rule의 templateId로 선택합니다.

엔진은 rule 우선순위로 해석을 정렬하고 완전히 같은 문장은 순서 보존 Set으로 중복 제거합니다. 각 섹션 key에는 엔진의 계산값이 삽입됩니다. 단순 랜덤 문구나 LLM이 없습니다. DIRECT는 선택 가능한 direct 문구를, POLITE는 기존 존댓말 문구를 사용합니다. templates/speech.json 변수로 핵심 네 순간에 호칭을 연결합니다.

리포트에는 명시적인 input.asOf, ruleVersion, templateVersion, traits, evidence, matchedRules, 도메인 점수, 시나리오 조건, 행동, 원시 feature가 포함됩니다. 계산 함수에서 Date.now, random, 외부 API를 사용하지 않습니다. 결제 영수증 ID 등 업무 식별자는 계산 결과 밖에 존재합니다.

Dashboard는 상세 섹션, 타임라인 전환, JSON 내보내기, 브라우저 인쇄를 지원합니다. 손금 원본은 결과에 포함되지 않습니다. 카탈로그 변경 후에도 이전 reports.data는 불변입니다.

recordView는 정규화 프로필과 경로별 역할 이름으로 결과를 번역한다. old snapshot의 숫자 단계 문구도 UI에서 번역하며 저장 내용을 수정하지 않는다. 25개 기록은 6 PART의 문서 목차로 유지한다. 모의 결제 확인 후 전체 목차와 타임라인을 펼치는 것은 로컬 체험 상태이며 서버 paid 권한이 아니다.
