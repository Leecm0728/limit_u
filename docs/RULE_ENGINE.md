# Rules and traits

`rules/catalog.json`은 가중치, Trait 정의, 조합 규칙, 행동, 직업 프로필, 시나리오 설정을 포함합니다. `src/domain/catalog.ts`는 런타임 스키마와 참조 무결성을 검증합니다. 코드를 실행하는 eval은 없습니다.

Trait = clamp(base + Σ(feature × weight), 0, 100). 없는 feature는 가중치 합산에서 제외하며 각 기여도를 evidence로 보관합니다. 직업 적합도는 지정된 Trait 목표와의 평균 절대 차이를 100에서 뺀 값입니다. 이는 경험적으로 보정된 성공확률이 아닙니다.

Rule: `when`에 all / any / not 재귀 조합, leaf에 field/op/value. eq, in, lt, lte, gt, gte, between 지원. age, occupation, experienceYears 및 Trait를 공통 context에서 참조합니다. 우선순위 내림차순, 동률 ID 정렬로 결정합니다. 누락 field/알 수 없는 연산자는 match하지 않습니다.

매칭된 rule은 ceiling 제약, templateId, actionIds를 제공합니다. 현재 직급을 낮추지는 않습니다. 개선 시나리오는 행동 가중치로 점수를 재계산하고, 설정된 상한 확대 가정을 적용합니다. 상한과 점수는 서로 다른 측정치이며 개선이 현실에서 보장되는 것은 아닙니다.

DB 카탈로그가 연결되면 최신 발행 스냅샷을 사용합니다. 버전별 전체 bundle을 검증하고 3개 fixture를 실행한 뒤 저장합니다. seed generator는 초기 데이터 재생성 도구이며 운영 편집은 JSON 또는 Admin을 통해 수행합니다.
