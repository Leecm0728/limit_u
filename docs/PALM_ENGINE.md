# Palm MVP

브라우저에서 JPEG/PNG/WebP(최대 10MB)를 decode → 600px 너비 canvas → 사용자 지정 선 → 정규화 좌표 폴리라인 → 길이 feature. 원본 파일이나 canvas 이미지는 서버로 전송하지 않습니다.

양손 사진을 별도로 선택할 수 있으며 두뇌선/감정선/생명선에 점을 찍습니다. 마지막 점 취소, 현재 손 초기화로 수정합니다. 양손에서 같은 선을 측정하면 평균 길이를 사용합니다. 길이는 이미지 좌표 공간 기준이므로 손 크기와 촬영 구성에 영향을 받습니다. ROI 자동 정규화로 과장하지 않습니다.

source는 demo/manual/none. source=none은 특징을 제외합니다. manual의 측정 누락은 생성하지 않습니다. 자동 검출로 위장하지 않으며 대체 Demo와 건너뛰기를 제공합니다.

확장 schema: heart_line_length/curve/depth/branch_count, head_line_length/angle/curve/separation, life_line_length/curve/depth/break_count, fate_line_presence/strength/break_count, palm_ratio, finger_ratio, thumb_angle, finger_spacing. MVP 생성은 length 3개만. 향후 confidence, hand side, algorithm_version 및 consent를 특징별로 저장합니다.

향후 MediaPipe hand landmarks → ROI rotation/scale normalization → OpenCV contrast/edge candidates → 사용자 확인. 실제 검출 품질/재현성 데이터셋을 마련한 후 활성화해야 합니다. 장수·건강·질병 추론은 구현하지 않습니다.
