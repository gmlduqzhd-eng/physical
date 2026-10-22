# 5차 개편: 안전 상황 학습 5개

기존 ID를 유지하며 가상 상황→안전한 선택→이유 확인→말·손짓 역할 표현 또는 읽고 확인으로 재구성했다. 실제 처치 동작·깊이·생존 능력을 화면 점수로 판정하지 않는다. 친구 몸 압박, 실제 AED 연습 작동, 물가 실습, 줄을 몸에 감기, 임의 붕대 압박은 요구하지 않는다. 실제 위급 상황은 119와 가까운 어른에게 연결한다.

- 심폐소생 안전교실: 현장 안전, 119·AED 요청, 전문 교육용 장비와 강사의 실습 구별.
- AED 안내 연결: 기기 안내 듣기, 분석·충격 중 접촉 금지, 이후 심폐소생술 안내 잇기.
- 물 밖 도움 연결: 물에 들어가지 않고 도움 요청, 교실의 빈 표적으로 종이 도구 전달, 구조 후 의료 도움 잇기.
- 체육 안전 설계: 가상의 더위·높은 미세먼지 상황에서 계획 조절, 중단 신호와 어른에게 도움 요청. 실시간 정보로 표시하지 않음.
- 다친 친구 도움: 중단·보호·어른에게 알리기, 수건을 감싼 냉찜질 그림 구별, 심한 통증·변형·감각 이상 시 의료 도움.

세 상황의 안전한 선택과 학습 확인당 100점이다. 역할 표현과 읽기는 동일한 학습 점수이며 실제 신체 수행 점수가 아니다. 이전 최고 점수는 safety_v1과 구분 보존한다. 교육과정 성취기준 번호는 별도 검증하지 않아 연계 확인 필요로 표시한다.

공식 자료 (2026-10-22 확인, 앱 안에서도 링크 제공):

- [질병관리청 심폐소생술](https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=6226)
- [AHA 2025 Adult Basic Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support)
- [행정안전부 AED 절차](https://www.mois.go.kr/chd/sub/a06/rescue_4/screen.do)
- [American Red Cross Water Safety](https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html)
- [에어코리아 높은 미세먼지 행동요령](https://m.airkorea.or.kr/air/forecast)
- [CDC Heat Health](https://www.cdc.gov/heat-health/hcp/clinical-overview/index.html)
- [NHS Sprains and strains](https://www.nhs.uk/conditions/sprains-and-strains/)

검증: 5개×2화면=10개 UI 흐름, 잘못 고른 선택의 재시도, 확인 전 완료 불가, 읽기 대체, 중복 저장 방지, 페이지 오류·운영 API 쓰기 없음. 단위 검사로 전체 61개 개편 후보와 구현 ID 집합 일치 및 원래 225개 ID 보존을 확인했다. 실제 학생 이해도 평가와 전문 응급처치 훈련 검증은 별도다.
