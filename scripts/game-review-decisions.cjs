// Decisions against production commit 97f95df, before the three pilot changes.
// These are source/flow judgements, not claims of student usability testing.
const groups = [
  ['삭제', null, ['coin_flip','fate_card'], '무작위 선택과 배율이 결과를 좌우하며 신체활동이나 전술 선택이 성공 조건에 없음.', '독립 체육 게임 목록에서 제외할 대상. 기존 기록·수업 링크의 안내 화면을 마련한 후 비노출 처리.'],
  ['삭제', null, ['volcano','multi_touch','balloon','scream'], '연타·동시 터치·수금 타이밍·큰 소리 채우기가 중심이며 목표와 연결된 신체활동이 없음.', '반복 입력 중심 게임은 정리하고 신체활동 시간을 확보. 관련 학급 미니게임 호출 경로도 함께 이관.'],
  ['유지', null, ['stretch'], '동작별 스트레칭 안내와 시간이 있어 준비·정리 활동이라는 독립 목적이 분명함.', '준비·정리 도구로 유지. 시간 경과 점수를 실제 수행·유연성 평가로 해석하지 않도록 표시 정리.'],
  ['유지', null, ['rolling-curling'], '실제 공을 표적으로 굴리는 시도와 힘 조절의 비교가 활동의 중심임.', '핵심 규칙 유지. 직접 입력 기록을 바탕으로 다음 시도의 힘 조절을 말해 보기.'],
  ['유지', null, ['body-rhythm-orchestrator','emotion-thermometer','partner-robot-lab'], '동작 요소·감정·신체 부위를 선택하고 몸으로 표현·감상하는 활동 구조가 있음.', '창작·감상 활동으로 유지. 평가 문항 수와 교사 안내 난도는 수업에서 확인.'],
  ['개편', null, ['space-occupier','relay-mission-runner','open-space-tactician'], '실제 이동·공간 전략의 소재는 있으나 긴 안내·조작 또는 대기·참여 구조의 재정비가 필요함.', '시범 라운드, 분리된 걷기 통로, 동시 참여 역할을 도입. 릴레이의 기기 운반을 없애고 전략 결과를 활동 후 확인.'],
  ['개편', null, ['jump','squat','run','plank','one_leg'], '기기 센서와 터치 대체 입력이 운동 횟수·유지 점수로 이어져 실제 동작과 화면 성공의 구별이 약함.', '기기 거치형 동작 미션으로 재설계. 횟수·정확도 자동 판정 대신 수행자가 확인한 기록과 개인 단계 선택 적용.'],
  ['개편', null, ['fitness'], '운동 미션 선택은 있으나 룰렛 결과를 수행하는 단순 반복에 머물기 쉬움.', '움직임 종류를 고르게 경험하는 선택형 코스와 자기 수준에 맞는 도전으로 재구성.'],
  ['개편', null, ['stopwatch'], '목표 시간을 맞추는 화면 입력 중심이며 실제 움직임 없이도 결과가 생김.', '제자리걸음으로 시간 감각을 탐색하고 자기 페이스를 비교하는 활동으로 재구성.'],
  ['개편', null, ['zigzag'], '바닥 이동 대신 화면 표적 20개를 순서대로 터치하면 완주·500점이 주어짐.', '대표 개편: 막힌 칸을 피해 실제 표식을 왕복하는 갈림길 보급 작전.'],
  ['개편', null, ['dribble-rhythm'], '실제 공 박자 안내는 있으나 20초 타이머와 실수 수 입력 중심으로 진행됨.', '대표 개편: 8박자 연결→손 선택→옆걸음의 세 작전과 무점수 연습.'],
  ['개편', null, ['pass-gate-rescue'], '패스 성공 때마다 버튼을 누르고 인원별 참여를 체크하는 기록 조작이 많음.', '대표 개편: 패스 후 빈자리 이동, 출발 역할 교대, 라운드 뒤 한 번의 달성 확인.'],
  ['개편', null, ['pulse-detective'], '운동 전후 맥박 탐색은 의미 있으나 입력 범위와 안내가 신체 평가처럼 받아들여질 여지가 있음.', '건강 진단 대신 개인의 변화 관찰 자료로 정리하고 측정·입력·활동 역할과 선택적 기록을 간소화.'],
  ['개편', null, ['posture-guardian'], '생활 자세를 실제로 시도하는 내용이 있으나 타이머와 유지 확인에 게임의 변화가 적음.', '상황별 자세 선택과 가벼운 물건 옮기기 등 생활 미션을 연결하고 시도 후 비교 제공.'],
  ['개편', null, ['memory'], '화면의 색 순서를 기억해 다시 누르는 방식으로 신체활동이 성공 조건이 아님.', '바닥 표식 이동으로 순서를 재현하고 짧은 순서부터 확장하는 기억 원정으로 개편.'],
  ['개편', null, ['red_green'], '실제 이동 대신 초록일 때 터치하는 반응 게임으로 구현되어 있음.', '걷기·멈춤·속도 조절을 안내하고 탈락 없이 다음 신호에 다시 참여하는 활동으로 개편.'],
  ['개편', null, ['target'], '조준 시점과 센서·터치 판정이 중심이며 실제 표적 조작 활동과 분리되어 있음.', '부드러운 공·콩주머니로 거리와 힘을 선택하는 실제 표적 미션으로 개편.'],
  ['개편', null, ['sound-goalball'], '소리 방향 판별 후 버튼을 누르는 화면 반응이며 실제 굴림·받기와 연결되지 않음.', '소리 방향을 확인하고 부드러운 공 굴림·받기를 수행하는 짝 활동으로 개편. 실내 동선과 접근성 별도 확인.'],
  ['개편', null, ['slingshot-archery','basketball-free-throw','tabletennis-spin-read','badminton-drop-clear','base-running-decide'], '종목 상황 선택은 있으나 드래그·슬라이더·버튼 결과를 실제 스포츠 수행과 연결할 필요가 있음.', '한 가지 핵심 판단을 짧게 연습한 뒤 실제 도구 조작·이동으로 선택을 실행하고 결과를 비교.'],
  ['개편', null, ['breath-pacer-478','campfire-breath'], '호흡 안내 기능은 있으나 전문 용어·고정된 숨 참기 및 건강 효과 표현의 검토가 필요함.', '편안한 호흡을 고르는 정리 활동 도구로 단순화. 건강 효과 단정과 의무적 호흡 유지 요소는 전문가 검토 후 정리.'],
  ['개편', null, ['shuttle-run-beep'], '실제 왕복 안내는 있지만 단계·랩·시간과 자기 입력을 동시에 이해해야 함.', '걷기 입문과 개인 페이스 선택, 큰 출발·도착 신호, 활동 후 묶음 기록 적용.'],
  ['개편', null, ['cpr-compression-110','aed-defibrillator-pad','water-rescue-throw','heatwave-pm25-shield','rice-treatment-firstaid'], '체육 게임과 안전 지식 학습이 혼재하고 화면 정답을 실제 응급처치 역량으로 오해할 수 있음.', '안전 학습 자료로 구분하고 쉬운 상황·선택·설명 구조로 정리. 실제 처치·훈련 내용은 공식 자료와 지도 전문가 확인 후 변경.'],
];
function merge(ids, target, reason, action) { groups.push(['통합',target,ids,reason,action]); }
merge(['zone_touch','trail-maze-run','agility-dot-drill','number_grid'], 'zigzag', '서로 다른 화면 이동·순서 퍼즐이지만 실제 바닥 표식 이동이라는 공통 목표로 묶을 수 있음.', '갈림길 보급 작전의 사방 이동·미로·순서 코스로 보존. 독립 터치 게임은 이관 이후 정리.');
merge(['left_right','direction','reaction','whack_a_mole','peripheral-vision-360'], 'red_green', '방향·신호를 읽고 터치하는 반응 구조가 반복됨.', '걷기·방향 전환·정지 신호의 변형으로 통합하고 화면 반응속도를 운동능력으로 평가하지 않음.');
merge(['color_word','math'], 'exp-phone-06', '인지 문제와 바깥의 신체활동이 분리되어 있음.', '색 규칙·숫자 조건을 맞는 실제 표식 선택으로 연결. 인지 난도와 이동 난도는 따로 조절.');
merge(['card_match'], 'memory', '기억 후 화면 선택이라는 독립 규칙이 기억 게임과 중복됨.', '실제 카드·표식 위치를 기억해 이동하는 짝 찾기 변형으로 보존.');
merge(['tilt_balance','tilt_race','seesaw-balance-tap','wind-surf-balance','foot-center-balance'], 'one_leg', '기기 기울기나 버튼으로 화면 물체를 유지·이동하는 조작이 반복되며 몸의 균형과 구별이 필요함.', '한 발·두 발·앉은 자세의 균형 활동 변형으로 재구성. 기기 기울기를 신체 균형 측정값으로 사용하지 않음.');
merge(['shake','arm_raise','wave','eccentric-isom-push'], 'fitness', '흔들기·올리기·누르기 같은 단일 입력을 반복해 게이지를 채우는 구조임.', '안전한 맨손 동작을 선택하는 체력 코스의 변형으로 흡수. 기기 운반·연타와 운동 점수 연결 제거.');
merge(['tug_of_war'], 'exp-tablet-31', '연타 대결이 실제 줄다리기나 협력을 표현하지 못함.', '천 위 화물 공동배송의 함께 힘 조절하기 활동으로 전환하고 연타 승패 구조 정리.');
merge(['speed_circle','circle_draw','trace_shape','mobility-joint-circle','bicycle-pedal-crank'], 'magic_scarf', '손가락으로 화면 궤적을 그리거나 회전시키는 구현이 큰 신체 표현·관절 활동과 혼재함.', '팔과 도구로 직선·곡선·원을 그리는 변형으로 통합. 회전 수를 관절 능력으로 해석하지 않음.');
merge(['dance_pose','animal','animal-hop-step','shadow-pose-sculpture'], 'seed_sprout', '자세·동물 버튼이나 슬라이더 조작을 실제 몸 모양 표현과 연결할 필요가 있음.', '자연·동물 표현의 시범과 학생 창작 변형으로 통합. 동물의 움직임 소재는 유지.');
merge(['body_twist','punch','taekwondo-counter-kick','kayak-paddle','cross-lateral-brain','head-shoulders-knees'], 'rhythm_clapping', '센서·터치로 신체 부위와 교차 동작을 표현하지만 실제 전신 조합과 입력 판정이 섞임.', '몸 부위·좌우 교차·허공 동작을 4~8박자 움직임 조합으로 보존. 자세 자동 판정 문구 제거.');
merge(['freeze'], 'red_green', '멈춤 신호라는 목적이 같은데 기기 흔들림으로 탈락을 판정하는 별도 게임으로 중복됨.', '움직임·정지 코스의 난이도 변형으로 통합하고 흔들림에 따른 자동 탈락 제거.');
merge(['compass-azimuth'], 'exp-tablet-09', '나침반 다이얼 맞추기와 기준 방향 이동 학습을 한 활동에서 연결할 수 있음.', '기준 방향을 정하고 실제 방향 표식으로 이동하는 입문 코스에 통합.');
merge(['tent-peg-hammer','crevasse-jump','wind-archery-pro','strike-zone-vision','baseball-bunt-defense'], 'target', '누르기 시간·게이지·조준 타이밍이 실제 종목 기술을 대신하는 화면 게임임.', '힘 조절·판단이라는 목표만 남겨 실제 표적 활동으로 통합. 종목별 소재는 별도 설명 카드로 유지.');
merge(['alpine-glider'], 'zigzag', '누름·해제로 높이를 조절하는 화면 회피 게임으로 신체 이동이 없음.', '높낮이 팔 표현과 막힌 길 선택을 결합하는 보급 코스 변형으로 보존.');
merge(['spike-block-wall','tactical-grid-slide','offside-breaker-pass'], 'open-space-tactician', '화면 전술판·위치 선택은 있지만 실제 이동·공간 만들기와 별도 구현임.', '빈 공간 찾기·수비 위치 바꾸기 변형으로 통합하고 실제 코스 시연을 연결.');
merge(['badminton-smash-rhythm','double-under-rope','step-mania-4lane'], 'dribble-rhythm', '종목 이름은 다르지만 화면 타이밍 입력이 성공을 만드는 리듬 구조가 반복됨.', '박자 신호 모듈을 공유하되 공·줄·발 스텝의 도구별 동작은 구분하여 보존.');
merge(['juggling-bounce-paddle','volleyball-apex-set'], 'exp-phone-35', '버튼·패들로 낙하 물체를 유지하는 화면 과제를 실제 물체 다루기로 전환할 수 있음.', '풍선·가벼운 공의 띄우기와 자리 이동 변형으로 통합.');
merge(['curling-weight-control'], 'rolling-curling', '버튼 누름 시간을 힘으로 환산하는 가상 컬링과 실제 공 굴림 컬링이 중복됨.', '실제 공 굴림의 거리·표적 선택 단계로 통합.');
merge(['posture-spine-align'], 'posture-guardian', '화면 슬라이더 정렬이 실제 자세 확인과 혼동될 수 있고 생활 자세 활동이 별도로 있음.', '실제 자세 시도 전 관찰 카드로 옮기고 슬라이더 완료를 자세 성공으로 표시하지 않음.');
merge(['pulse-zone-target'], 'pulse-detective', '탭의 박자가 심박수처럼 보이는 별도 게임으로 실제 맥박 탐색과 중복됨.', '자기 몸 변화 관찰 자료에 통합하고 화면 탭을 실제 심박수로 표시하지 않음.');
merge(['ribbon-wave-stream'], 'ribbon_gymnast', '손가락 원 회전과 실제 리본 표현 활동이 이중으로 존재함.', '실제 리본으로 직선·물결·나선을 연결하는 입문 단계로 통합.');
merge(['emotion-freeze-mime'], 'emotion-thermometer', '감정 정지 포즈를 고르고 확인하는 내용이 기존 감정 표현 활동과 겹침.', '강도·속도·몸 모양을 바꾸는 감정 표현 변형으로 통합.');
merge(['partner-mirror-duet','mirror-motion-invert'], 'shadow_puppeteer', '거울 대칭 버튼·동기화 입력보다 실제 짝 동작 관찰이라는 공통 목표가 중요함.', '리더 교대·느린 시범·다른 팔 동작 변형으로 통합.');

const expressionKeep = ['seed_sprout','weather_dance','magic_scarf','shadow_puppeteer','sound_painter','space_traveler','element_forces','body_sculpture','rhythm_clapping','kpop_easy_challenge','musical_freeze','ribbon_gymnast','story_drama_relay','art_gallery_critic','talchum_korea','ganggangsullae','world_folk_dance','musical_scene_maker','cheerleading_team','music_jumprope','taebo_fitness','flashmob_creator','expressive_critique'];
groups.push(['유지',null,expressionKeep,'단계별 몸 표현·창작·감상과 활동별 평가 항목을 갖추어 안내형 활동으로 유지할 가치가 있음.','핵심 표현 소재를 유지하고 학년별 시범·동작 범위는 교사가 조절. 공통 평가 UI의 간소화는 별도 적용.']);
merge(['popcorn_bounce','balloon_float','gravity_rebel'], 'seed_sprout', '자연·물체의 크기·힘·높낮이 변화를 몸으로 표현하는 활동군임.', '씨앗·팝콘·풍선·중력 소재를 선택하는 표현 주제로 통합하되 동작의 차이는 보존.');
merge(['traffic_signal'], 'red_green', '신호에 따른 이동·정지·느리게 움직이기가 같은 핵심 규칙임.', '표현형 신호 코스로 남기고 별도 게임 탐색 부담 축소.');
merge(['tempo_chameleon'], 'rhythm_clapping', '박자 속도 바꾸기는 신체 타악·리듬 모듈의 난이도 변형으로 제공 가능함.', '느림·기본 속도를 선택하는 변형으로 통합하고 급격한 속도 변화는 완화.');
merge(['mirror_sync_duo'], 'shadow_puppeteer', '짝과 거울 동작을 주고받는 핵심 규칙이 중복됨.', '동시 따라 하기와 한 박자 뒤 따라 하기를 난이도 선택으로 보존.');
merge(['kpop_dance_cover'], 'kpop_easy_challenge', '따라 하기에서 대형 창작으로 확장되는 동일 학습 흐름의 단계임.', '기초·연결·대형 창작 단계로 통합하고 외부 영상 없이도 시작할 시범 제공.');

groups.push(['개편',null,['exp-phone-03','exp-phone-05','exp-phone-06','exp-phone-07','exp-phone-12','exp-phone-24','exp-phone-30','exp-phone-31','exp-phone-33','exp-phone-35','exp-phone-36','exp-phone-37','exp-phone-38','exp-phone-39','exp-tablet-01','exp-tablet-03','exp-tablet-06','exp-tablet-07','exp-tablet-09','exp-tablet-21','exp-tablet-24','exp-tablet-26','exp-tablet-32','exp-tablet-34','exp-tablet-35','exp-tablet-36','exp-tablet-37','exp-tablet-39','exp-tablet-42'],'실제 표식·도구·역할별 규칙은 있으나 지시문·횟수·번호·확인 항목 입력이 라운드마다 반복됨.','첫 시범, 한 화면 한 동작, 활동 뒤 간단 기록으로 개편. 활동별 기존 조건은 유지하고 학생이 선택할 수 있는 도전 수준 추가.']);
groups.push(['유지',null,['exp-phone-10','exp-phone-19','exp-phone-32','exp-tablet-02','exp-tablet-31'], '실제 보행·스카프·벽 반사·대형·공동 운반이라는 독립된 몸 활동의 목표가 분명함.', '핵심 규칙을 유지하고 공통 입력 부담만 점진적으로 줄임. 교실·체육관별 공간 배치를 확인.']);
merge(['exp-phone-01','exp-phone-02','exp-phone-04','exp-phone-08','exp-phone-09','exp-tablet-04','exp-tablet-08','exp-tablet-43'], 'zigzag', '왕복·연속 이동·막힌 길·수집·경로 선택을 별도 게임으로 늘린 상태임.', '보급 작전의 코스 변형으로 통합. 귀환·연속·수집·모둠 통로 조건은 선택 모드로 보존.');
merge(['exp-phone-11','exp-phone-13','exp-phone-15','exp-phone-16','exp-tablet-18'], 'exp-phone-12', '발 순서·팔 교차·동시 리듬을 안내하는 모듈과 박자 표시 구조가 유사함.', '네 칸 리듬발판의 발·팔·짝 조합 단계로 통합하고 동작 시범을 제공.');
merge(['exp-phone-14'], 'music_jumprope', '줄 돌리는 팔과 발 스텝을 연결하는 동작이 음악 줄넘기 입문 단계에 해당함.', '줄 없이 딛기·낮은 뛰기·줄 사용의 선택 단계로 통합.');
merge(['exp-phone-17','exp-tablet-25'], 'dribble-rhythm', '공 조작과 박자·손 교대를 연결하는 목표가 대표 개편과 같음.', '이동·손·여러 명 동시 공 조작을 배송 공장의 후속 변형으로 보존.');
merge(['exp-phone-18'], 'exp-phone-36', '발로 공을 다루고 표식으로 이동·정지하는 같은 공 조작 계열임.', '발바닥 터치·색문 이동·멈추기 단계를 하나의 축구 공 조작 활동에 통합.');
merge(['exp-phone-20'], 'taebo_fitness', '허공 동작·옆걸음·낮추기를 박자에 맞춰 연결하는 피트니스 표현 계열임.', '낮은 강도 입문 콤보로 통합하고 접촉 없는 개인 공간 활동을 유지.');
merge(['exp-phone-27','exp-phone-28'], 'fitness', '걷기·팔 뻗기·무릎 올리기 미션을 순서대로 수행하는 체력 코스 변형임.', '선택형 체력 코스의 상하체 교대·무작위 순서 모드로 통합.');
merge(['exp-phone-29'], 'stopwatch', '시간을 가리고 제자리걸음으로 목표 시간을 추정하는 시간 감각 활동임.', '몸으로 시간 느끼기 모드로 통합하고 오차를 신체 능력 평가로 표시하지 않음.');
merge(['exp-phone-34','exp-tablet-22','exp-tablet-40'], 'pass-gate-rescue', '패스 후 자리 이동·받기 위치 변경이라는 핵심 전술을 다른 인원과 규칙으로 반복함.', '빈자리 패스의 2인·통로 분리·같은 자리 금지 모드로 보존. 실제 협동 인원과 혼자 연습은 구별.');
merge(['exp-phone-40'], 'exp-phone-19', '스카프 띄우기·받기·이동의 개인/짝 변형임.', '스카프 활동의 개인→짝 교환 단계로 통합.');
merge(['exp-tablet-05','exp-tablet-46'], 'exp-phone-05', '가린 순서나 배치를 실제 표식으로 재현하는 기억·이동 구조가 겹침.', '개인 순서·모둠 배치·방문 순서 변형으로 통합하고 짧은 순서부터 제시.');
merge(['exp-tablet-10'], 'red_green', '색 신호의 걷기·옆걸음 규칙 전환은 신호 이동 활동의 확장임.', '기본 신호를 익힌 뒤 규칙 교환 도전으로 통합.');
merge(['exp-tablet-23'], 'exp-phone-32', '벽 반사 패스 후 다른 위치로 이동하는 공통 조작 활동임.', '개인 벽 반사와 짝 바운드 패스 코스로 통합.');
merge(['exp-tablet-27'], 'exp-phone-39', '실제 공 굴림과 회수로 빙고를 채우는 같은 목표의 모둠 변형임.', '개인·짝·모둠 공동 빙고 선택으로 통합.');
merge(['exp-tablet-28'], 'exp-phone-31', '표적별 던지기와 직접 회수라는 같은 목표의 거리·모둠 변형임.', '거리·색·전원 회수 조건을 같은 표적 운반 활동의 단계로 통합.');
merge(['exp-tablet-29'], 'exp-phone-35', '풍선 유지와 표식 이동을 개인/짝 구성으로 반복함.', '개인 유지→짝 연결의 단계로 통합하고 손·경로 선택을 보존.');
merge(['exp-tablet-30'], 'exp-phone-38', '라켓으로 가벼운 물체를 다루며 자리 이동하는 활동군임.', '개인 운반→짝 돌려주기 단계로 통합.');
merge(['exp-tablet-33','exp-tablet-38'], 'exp-tablet-36', '역할별 통로로 물품을 옮겨 공동 조건을 맞추는 운반 활동군임.', '구역별 보급·요청 물품·암호 조립을 모둠 운반의 선택 미션으로 보존.');
merge(['exp-tablet-41','exp-tablet-44','exp-tablet-50'], 'exp-tablet-42', '여러 활동 구역을 순환하는 구조가 빙고·보스·탈출 이야기로 반복됨.', '네 종목 순환 활동의 공동 목표 방식으로 통합. 활동 구역별 차이와 역할 교대는 보존.');

groups.push(['유지',null,['exp-phone-41','exp-phone-42','exp-phone-43','exp-phone-45','exp-phone-48','exp-phone-49','exp-phone-50','exp-tablet-12','exp-tablet-13','exp-tablet-14','exp-tablet-15','exp-tablet-16','exp-tablet-17','exp-tablet-20'], '힘·시간·높낮이·대칭·연결·역할이라는 구별되는 표현 목표와 단계별 안내가 있음.', '각 표현 목표와 창작 소재를 유지. 동작을 보여 주는 첫 시범과 짧은 감상은 공통 개선 대상으로 둠.']);
merge(['exp-phone-44','exp-tablet-11'], 'magic_scarf', '직선·곡선 경로와 팔 움직임을 이어 그림을 만드는 표현 목표가 같은 계열임.', '팔·발·도구의 궤적 선택 모드로 통합하여 이동 표현은 보존.');
merge(['exp-phone-46'], 'partner-robot-lab', '상체·하체 동작을 다르게 조합하는 로봇 표현이 기존 카드 조합 활동과 연결됨.', '상체 유지/하체 변경과 역할 교대 도전으로 통합.');
merge(['exp-phone-47'], 'emotion-thermometer', '같은 움직임의 감정·강도를 바꾸는 표현 목표가 중복됨.', '감정별 걷기·보폭·팔 세기 변형으로 통합.');
merge(['exp-tablet-19'], 'flashmob_creator', '장면·대형·전원 합류를 연결하는 군무 구성 목표가 같은 계열임.', '원정 퍼레이드 소재를 모둠 군무의 선택 이야기로 보존.');
merge(['exp-tablet-45'], 'story_drama_relay', '하나의 장면을 서로 다른 몸 움직임으로 표현하고 연결하는 공동 창작 구조임.', '장면별 표현 요소 선택을 릴레이 극장 단계로 통합.');

module.exports = { groups };
