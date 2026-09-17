export interface ExpressionStep {
  stepNum: number;
  title: string;
  durationSeconds: number;
  guide: string;
  actionTip: string;
}

export interface ExpressionRubricItem {
  criterion: string;
  desc: string;
}

export interface ExpressionGameData {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  domain: '표현';
  subCategory: string;
  achievement: {
    code: string;
    title: string;
    desc: string;
  };
  grades: ('1~2학년' | '3~4학년군' | '5~6학년군')[];
  playMode: '개인' | '협동';
  devices: ('스마트폰' | '태블릿 PC' | '데스크톱 PC')[];
  videoInfo?: {
    videoId: string;
    title: string;
    defaultBpm?: number;
  };
  steps: ExpressionStep[];
  rubric: ExpressionRubricItem[];
  safetyTips: string[];
}

export const EXPRESSION_GAMES: ExpressionGameData[] = [
  // ==========================================
  // [1~2학년군] 기본 움직임 & 자연·사물 모방 표현 (8종)
  // ==========================================
  {
    id: 'seed_sprout',
    name: '씨앗의 성장',
    emoji: '🌱',
    desc: '땅속 작은 씨앗에서 떡잎, 줄기, 꽃으로 피어나는 신체 높낮이와 크기 변화 표현',
    domain: '표현',
    subCategory: '자연 모방 표현 (성장 과정)',
    achievement: {
      code: '[2체03-02]',
      title: '자연이나 주변 사물의 특징 신체 모방',
      desc: '자연이나 주변 사물의 형태와 움직임 특징을 탐색하여 신체 움직임으로 모방 표현한다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '땅속 씨앗 웅크리기', durationSeconds: 20, guide: '무릎을 꿇고 머리를 땅에 대며 세상에서 가장 작은 씨앗이 되어 웅크립니다.', actionTip: '숨을 천천히 쉬며 온몸의 힘을 뺍니다.' },
      { stepNum: 2, title: '봄비 맞고 떡잎 틔우기', durationSeconds: 25, guide: '따스한 봄비를 맞고 양손을 조심스럽게 머리 위로 올려 떡잎을 틔웁니다.', actionTip: '손가락을 오므렸다가 활짝 펴보세요.' },
      { stepNum: 3, title: '줄기 뻗고 꽃봉오리 열기', durationSeconds: 30, guide: '천천히 일어나 발끝으로 서며 온몸을 길게 늘이고 두 팔로 커다란 꽃을 피웁니다.', actionTip: '바람에 살랑이는 꽃잎처럼 좌우로 흔들어 봅니다.' },
    ],
    rubric: [
      { criterion: '신체 높낮이 표현', desc: '가장 낮은 곳에서 가장 높은 곳까지 단계별로 잘 표현했는가?' },
      { criterion: '집중도와 상상력', desc: '씨앗이 자라나는 생명력을 몰입하여 온몸으로 나타내었는가?' },
    ],
    safetyTips: ['일어날 때 어지럽지 않도록 천천히 호흡하며 일어납니다.', '주변 친구와 부딪치지 않도록 양팔을 벌릴 공간을 확보합니다.'],
  },
  {
    id: 'weather_dance',
    name: '날씨 탐험대',
    emoji: '🌦️',
    desc: '부슬부슬 이슬비, 휘몰아치는 돌풍, 쾅쾅 천둥 번개, 따스한 햇살을 온몸으로 묘사',
    domain: '표현',
    subCategory: '자연 현상 신체 모방',
    achievement: {
      code: '[2체03-02]',
      title: '자연 사물 모방 표현',
      desc: '날씨의 변화와 사물의 움직임을 상상하여 다채로운 신체 움직임으로 나타낸다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '가벼운 이슬비 발걸음', durationSeconds: 25, guide: '발끝으로 총총 소리 없이 걸으며 손가락으로 빗방울을 바닥에 톡톡 떨어뜨립니다.', actionTip: '몸을 가볍고 작게 만들어 움직입니다.' },
      { stepNum: 2, title: '거센 돌풍과 비바람', durationSeconds: 25, guide: '바람에 날리는 나뭇가지처럼 온몸을 좌우로 크게 회전하며 휘몰아칩니다.', actionTip: '방향을 불규칙하게 바꾸며 달려봅니다.' },
      { stepNum: 3, title: '천둥 번개 쾅! 스톱!', durationSeconds: 20, guide: '양팔을 번쩍 들며 번개처럼 번쩍인 뒤, 쾅! 소리와 함께 힘찬 정지 동작을 만듭니다.', actionTip: '정지 순간 온몸의 근육에 힘을 줍니다.' },
      { stepNum: 4, title: '구름 개고 무지개 햇살', durationSeconds: 20, guide: '평화로운 햇살처럼 미소를 지으며 양팔로 커다란 반원 무지개를 그립니다.', actionTip: '숨을 깊게 들이쉬며 편안하게 정지합니다.' },
    ],
    rubric: [
      { criterion: '속도와 세기 대비', desc: '약한 비와 거센 바람의 힘 차이를 뚜렷하게 표현했는가?' },
      { criterion: '동작의 전환', desc: '신호에 맞춰 빠르게 날씨 움직임을 바꾸었는가?' },
    ],
    safetyTips: ['돌풍 회전 시 어지러우면 즉시 멈추고 자리에 앉습니다.'],
  },
  {
    id: 'magic_scarf',
    name: '마법 스카프 요정',
    emoji: '🧣',
    desc: '스카프나 손수건을 허공에 날리며 부드러운 곡선과 거친 직선 움직임 궤적 그리기',
    domain: '표현',
    subCategory: '도구 활용 기본 움직임',
    achievement: {
      code: '[2체03-01]',
      title: '움직임 요소 활용 기본 움직임 표현',
      desc: '신체, 공간, 힘 등의 움직임 요소를 활용하여 기본 움직임을 다양하게 표현한다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '물결 치는 파도 곡선', durationSeconds: 30, guide: '스카프 끝을 잡고 천천히 8자 곡선을 그리며 허공에 파도를 만듭니다.', actionTip: '손목 스냅을 부드럽게 유영하듯 움직입니다.' },
      { stepNum: 2, title: '하늘 높이 던지고 잡기', durationSeconds: 25, guide: '스카프를 공중으로 가볍게 던진 뒤, 떨어지는 동안 한 바퀴 돌고 안전하게 낚아챕니다.', actionTip: '눈은 스카프를 끝까지 주시합니다.' },
      { stepNum: 3, title: '바람 요정 망토 질주', durationSeconds: 25, guide: '스카프를 목 뒤에 대고 바람의 저항을 느끼며 가볍게 교실을 유영합니다.', actionTip: '친구와 스카프가 엉키지 않게 거리를 유지합니다.' },
    ],
    rubric: [
      { criterion: '도구 궤적의 유려함', desc: '스카프의 움직임과 몸의 움직임이 일체감을 이루었는가?' },
      { criterion: '공간 활용', desc: '높은 공간과 낮은 공간을 골고루 활용했는가?' },
    ],
    safetyTips: ['스카프를 밟아 미끄러지지 않도록 발밑을 주의합니다.'],
  },
  {
    id: 'popcorn_bounce',
    name: '팝콘 팡팡',
    emoji: '🍿',
    desc: '프라이팬 속 작은 옥수수 알갱이에서 뜨거운 열기를 받아 팡! 튀어오르는 탄력 움직임',
    domain: '표현',
    subCategory: '탄력 및 순발적 움직임 표현',
    achievement: {
      code: '[2체03-01]',
      title: '움직임 요소 표현 (힘과 시간)',
      desc: '느리고 조용한 움직임과 빠르고 강한 움직임의 대비를 탐색하여 신체로 표현한다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '지글지글 알갱이 진동', durationSeconds: 20, guide: '바닥에 웅크리고 프라이팬의 열기가 전해지듯 잘게 몸을 떨며 진동합니다.', actionTip: '점점 떨림의 진폭을 키워갑니다.' },
      { stepNum: 2, title: '팡! 팝콘 폭발 점프', durationSeconds: 30, guide: '신호음이나 박자에 맞춰 허공으로 사지(양팔·양다리)를 별 모양으로 활짝 펴며 점프!', actionTip: '착지할 때는 무릎을 살짝 굽혀 충격을 흡수합니다.' },
      { stepNum: 3, title: '푹신한 버터 팝콘 정지', durationSeconds: 20, guide: '튀어 오른 후 가장 독창적이고 재미있는 팝콘 포즈로 3초간 얼음!', actionTip: '우스꽝스럽고 익살맞은 표정을 곁들입니다.' },
    ],
    rubric: [
      { criterion: '정지와 폭발의 대비', desc: '조용한 떨림에서 폭발적인 점프로 순간적인 힘을 잘 발휘했는가?' },
      { criterion: '착지 안전', desc: '점프 후 사뿐히 무릎을 굽히며 안전하게 착지했는가?' },
    ],
    safetyTips: ['착지 시 발뒤꿈치 충격을 방지하기 위해 발 앞꿈치부터 닿습니다.'],
  },
  {
    id: 'shadow_puppeteer',
    name: '그림자 인형사',
    emoji: '👥',
    desc: '짝꿍의 동작을 1초 뒤 똑같이 따라 하는 인간 그림자 미러링 협동 표현',
    domain: '표현',
    subCategory: '짝 협동 모방 표현',
    achievement: {
      code: '[2체03-02]',
      title: '신체 상호 모방 및 교감',
      desc: '친구의 신체 움직임을 주의 깊게 관찰하고 호흡을 맞추어 표현한다.',
    },
    grades: ['1~2학년'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '1인자: 인형사의 창작 모션', durationSeconds: 30, guide: 'A가 천천히 팔과 다리를 구부리고 펴며 독특한 관절 모션을 만듭니다.', actionTip: '따라 하기 쉽게 적당한 속도로 움직입니다.' },
      { stepNum: 2, title: '2인자: 그림자의 싱크로 복제', durationSeconds: 30, guide: 'B가 A의 등 뒤 1m에서 A의 실루엣을 똑같이 복사하여 움직입니다.', actionTip: 'A의 시선과 손가락 끝 각도까지 모방합니다.' },
      { stepNum: 3, title: '역할 교대 및 듀엣 피날레', durationSeconds: 30, guide: '역할을 바꾸어 진행한 뒤, 마지막에 서로 마주보고 악수하는 포즈로 마무리합니다.', actionTip: '서로의 창의적인 동작을 칭찬합니다.' },
    ],
    rubric: [
      { criterion: '관찰력과 반응 속도', desc: '친구의 미세한 움직임 변화를 놓치지 않고 따라 했는가?' },
      { criterion: '상호 존중', desc: '친구가 따라 하기 힘든 위험한 동작을 하지 않고 배려했는가?' },
    ],
    safetyTips: ['짝과의 간격을 1m 이상 유지하여 신체 충돌을 방지합니다.'],
  },
  {
    id: 'sound_painter',
    name: '소리 그리기',
    emoji: '🎨',
    desc: '높은 실로폰 소리, 무거운 북소리, 또르르 물방울 소리를 신체 형태와 움직임으로 시각화',
    domain: '표현',
    subCategory: '청각 자극 신체 형상화',
    achievement: {
      code: '[2체03-03]',
      title: '소리나 리듬에 맞춘 신체 자유 표현',
      desc: '다양한 소리의 높낮이, 크기, 리듬을 듣고 느낌을 신체 움직임으로 자유롭게 표현한다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '또르르 물방울 소리', durationSeconds: 25, guide: '맑고 통통 튀는 물방울 소리에 맞춰 손가락과 발끝으로 경쾌하게 튕겨냅니다.', actionTip: '몸 전체를 가볍게 통통 튕깁니다.' },
      { stepNum: 2, title: '쿵쾅쿵쾅 거인의 북소리', durationSeconds: 25, guide: '묵직한 저음 북소리에 맞춰 허리를 낮추고 온몸에 묵직한 무게감을 실어 걷습니다.', actionTip: '바닥을 딛는 발걸음에 강한 힘을 싣습니다.' },
      { stepNum: 3, title: '샤르르 은하수 바람 소리', durationSeconds: 25, guide: '높고 신비로운 소리에 맞춰 두 팔을 양옆으로 펼쳐 공기를 휘감으며 돕니다.', actionTip: '눈을 지그시 감고 소리의 결을 몸으로 탑니다.' },
    ],
    rubric: [
      { criterion: '청각-신체 감응력', desc: '소리의 성격(맑음/무거움/부드러움)을 신체로 잘 전달했는가?' },
      { criterion: '표현의 다양성', desc: '온몸의 다양한 관절을 활용했는가?' },
    ],
    safetyTips: ['회전 동작 시 주변 책상이나 벽과 거리를 둡니다.'],
  },
  {
    id: 'traffic_signal',
    name: '교통 신호등 요원',
    emoji: '🚦',
    desc: '빨강(급정지 조각상), 노랑(슬로모션), 초록(활기찬 이동) 신호에 맞춘 즉각적 신체 통제',
    domain: '표현',
    subCategory: '신호 통제 움직임 표현',
    achievement: {
      code: '[2체03-01]',
      title: '기본 움직임 및 신체 조절 표현',
      desc: '시각 신호에 반응하여 이동 움직임과 정지 움직임을 절도 있게 조절한다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '초록불: 힘찬 자동차 질주', durationSeconds: 25, guide: '핸들을 잡은 자세로 교실의 빈 공간을 자유롭게 가속하며 달립니다.', actionTip: '다른 차(친구)와 부딪치지 않는 방어 운전!' },
      { stepNum: 2, title: '노랑불: 초저속 슬로모션', durationSeconds: 25, guide: '시간이 멈춘 것처럼 달리는 동작 그대로 극단적으로 느리게 움직입니다.', actionTip: '한 발로 선 채 균형을 유지하며 서서히 착지합니다.' },
      { stepNum: 3, title: '빨간불: 0초 급정지 석상', durationSeconds: 20, guide: '소리와 함께 그 자리에 돌처럼 단 1mm도 흔들리지 않고 굳습니다.', actionTip: '숨만 쉬며 눈동자도 고정합니다.' },
    ],
    rubric: [
      { criterion: '신체 정지력', desc: '빨간불 신호에 흔들림 없이 정지 동작을 유지했는가?' },
      { criterion: '속도 조절력', desc: '슬로모션 단계에서 근육을 통제하여 부드럽게 감속했는가?' },
    ],
    safetyTips: ['급정지 시 발목이 삐지 않도록 발바닥 전체로 지탱합니다.'],
  },
  {
    id: 'balloon_float',
    name: '풍선 여행기',
    emoji: '🎈',
    desc: '가벼운 공기 저항으로 하늘 높이 떠오르다가 바람이 쉭 빠지며 서서히 착륙하는 몸짓',
    domain: '표현',
    subCategory: '무게감과 팽창·수축 표현',
    achievement: {
      code: '[2체03-02]',
      title: '사물 특징 신체 모방',
      desc: '풍선의 팽창과 수축, 공기 중 유영하는 모습을 관찰하고 신체로 묘사한다.',
    },
    grades: ['1~2학년'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '헬륨가스 주입 팽창', durationSeconds: 25, guide: '바람이 들어가듯 뺨을 부풀리고 양팔을 둥글게 만들어 점점 부피를 키웁니다.', actionTip: '몸 전체가 둥근 공이 된다고 상상합니다.' },
      { stepNum: 2, title: '구름 위 무중력 유영', durationSeconds: 25, guide: '바람을 타고 발끝으로 둥실둥실 허공을 유영하듯 발자국을 남깁니다.', actionTip: '상체를 유연하게 흔들며 공기 흐름을 탑니다.' },
      { stepNum: 3, title: '바람 빠지며 부드러운 착륙', durationSeconds: 25, guide: '바람이 쉭 빠지며 온몸의 힘이 풀려 바닥으로 스르륵 녹아내리듯 엎드립니다.', actionTip: '마지막엔 완전히 이완하여 휴식 자세를 취합니다.' },
    ],
    rubric: [
      { criterion: '이완과 긴장의 전환', desc: '팽창(긴장)과 바람 빠짐(이완)의 느낌을 실감나게 표현했는가?' },
      { criterion: '공간 부유감 연출', desc: '가벼운 공기 저항을 느끼듯 발걸음을 사뿐히 디뎠는가?' },
    ],
    safetyTips: ['바닥에 엎드릴 때 무릎이나 턱을 바닥에 세게 부딪치지 않도록 주의합니다.'],
  },

  // ==========================================
  // [3~4학년군] 움직임 표현 원리, 공간·시간·힘 요소 및 리듬·스토리 (12종)
  // ==========================================
  {
    id: 'space_traveler',
    name: '우주 유영가',
    emoji: '🚀',
    desc: '무중력 우주 정거장 밖을 유영하는 우주비행사의 느리고 유려한 공간 이동 탐구',
    domain: '표현',
    subCategory: '움직임 공간 요소 탐구',
    achievement: {
      code: '[4체03-01]',
      title: '움직임 표현의 기본 원리 및 요소 탐색',
      desc: '공간의 방향, 높낮이, 경로 요소를 탐색하여 창의적인 신체 움직임을 구성한다.',
    },
    grades: ['3~4학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '우주복 착용 및 에어로크 진출', durationSeconds: 25, guide: '단단한 헬멧과 장갑을 조이는 마임 후, 무중력 공간으로 첫발을 내딛습니다.', actionTip: '모든 관절이 물속에 잠긴 듯 저항을 느끼며 움직입니다.' },
      { stepNum: 2, title: '3차원 공간 궤적 유영', durationSeconds: 30, guide: '낮은 공간(포복형 유영), 중간 공간, 높은 공간(한 발 점프 유영)으로 곡선 이동합니다.', actionTip: '시선은 저 멀리 지구를 바라보며 평온함을 유지합니다.' },
      { stepNum: 3, title: '우주 미아 위기와 로프 회수', durationSeconds: 25, guide: '안전 로프를 잡고 끌어당기며 몸을 회전시켜 정거장 문으로 복귀합니다.', actionTip: '긴장감 있는 표정 연기를 함께합니다.' },
    ],
    rubric: [
      { criterion: '공간 레벨 활용', desc: '상·중·하 공간의 높낮이를 적극적으로 다채롭게 활용했는가?' },
      { criterion: '무중력 움직임 완결성', desc: '동작의 연결이 끊기지 않고 부드럽게 이어졌는가?' },
    ],
    safetyTips: ['슬로모션 동작 중 균형을 잃을 경우 양발을 넓게 벌려 안전을 확보합니다.'],
  },
  {
    id: 'element_forces',
    name: '4원소 소환사',
    emoji: '🔥',
    desc: '불(강한 힘·직선), 물(유연함·곡선), 바람(가벼움·회전), 흙(무거움·정지)의 힘과 흐름 표현',
    domain: '표현',
    subCategory: '움직임 요소 결합 (힘·시간·공간)',
    achievement: {
      code: '[4체03-02]',
      title: '신체 부위와 움직임 요소 조합 표현',
      desc: '신체 부위와 공간, 힘, 시간 등의 움직임 요소를 조합하여 상징적인 표현을 시연한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '타오르는 불꽃의 직선 공격', durationSeconds: 25, guide: '강하고 날카로운 손동작과 폭발적인 직선 스텝으로 화염의 에너지를 뿜어냅니다.', actionTip: '호흡을 강하게 내뱉으며 힘을 줍니다.' },
      { stepNum: 2, title: '흐르는 강의 곡선 파동', durationSeconds: 25, guide: '어깨에서 팔꿈치, 손가락 끝으로 이어지는 유려한 물결 웨이브를 만듭니다.', actionTip: '관절을 부드럽게 굴립니다.' },
      { stepNum: 3, title: '대지의 거대한 암석 기둥', durationSeconds: 20, guide: '발을 바닥에 깊숙이 박고 어떤 태풍에도 흔들리지 않는 바위의 무게감을 유지합니다.', actionTip: '하체 코어에 단단히 힘을 줍니다.' },
    ],
    rubric: [
      { criterion: '움직임 질감(Texture) 구분', desc: '불의 날카로움과 물의 부드러움이 명확히 구별되는가?' },
      { criterion: '전신 참여도', desc: '손뿐만 아니라 척추와 하체까지 원소의 에너지를 담았는가?' },
    ],
    safetyTips: ['강한 찌르기 동작 시 친구와 최소 1.5m 거리를 유지합니다.'],
  },
  {
    id: 'body_sculpture',
    name: '신체 조각 미술관',
    emoji: '🏛️',
    desc: '모둠원이 한 명씩 차례로 이어붙어 하나의 거대한 예술 테마 조각상을 완성하는 협동 설치 미술',
    domain: '표현',
    subCategory: '신체 조각 협동 표현',
    achievement: {
      code: '[4체03-02]',
      title: '움직임 요소 조합 및 협동 표현',
      desc: '신체 부위의 접촉과 균형 요소를 모둠원과 협력하여 하나의 조형물로 형상화한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '1번 조각: 기둥 베이스 설치', durationSeconds: 20, guide: '첫 번째 학생이 중심이 되는 기하학적 받침대 자세를 취하고 정지합니다.', actionTip: '오래 버틸 수 있는 안정적인 스쿼트나 지탱 자세를 선택합니다.' },
      { stepNum: 2, title: '2~3번 조각: 연결 가지 확장', durationSeconds: 25, guide: '다음 학생들이 1번 조각의 빈 공간 사이로 팔, 다리를 통과시키며 조각을 확장합니다.', actionTip: '직접 체중을 싣지 않고 시각적 접촉(터치)만 합니다.' },
      { stepNum: 3, title: '마지막 조각: 화룡점정 피날레', durationSeconds: 20, guide: '마지막 모둠원이 조각상의 상단에 날개나 왕관 포즈를 더해 5초간 완벽 정지합니다.', actionTip: '모둠 전체가 숨을 멈추고 하나의 예술 작품이 됩니다.' },
    ],
    rubric: [
      { criterion: '조형적 균형미', desc: '좌우 대칭 또는 비대칭의 균형이 아름다운 조각상인가?' },
      { criterion: '모둠 협동 배려', desc: '친구의 동작을 침범하지 않고 조화롭게 연결하였는가?' },
    ],
    safetyTips: ['친구의 몸 위에 올라타거나 체중을 싣지 않습니다. 손끝 접촉만 허용합니다.'],
  },
  {
    id: 'rhythm_clapping',
    name: '바디 퍼커션 오케스트라',
    emoji: '🥁',
    desc: '손뼉, 가슴, 허벅지, 발구르기를 조합한 신체 타악 앙상블 비트 메이킹',
    domain: '표현',
    subCategory: '리듬 신체 타악 표현',
    achievement: {
      code: '[4체03-03]',
      title: '리듬에 맞춘 리듬 움직임 구성 및 표현',
      desc: '리듬의 빠르기, 강약, 흐름에 맞추어 다양한 신체 타악 동작을 구성하고 시연한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '기본 4박자 비트 (쿵-짝-쿵-짝)', durationSeconds: 25, guide: '발구르기(쿵) - 손뼉(짝) - 발구르기(쿵) - 손뼉(짝) 기본 박자를 마스터합니다.', actionTip: '발목을 경쾌하게 튀기며 박자를 세어봅니다.' },
      { stepNum: 2, title: '8박자 콤보 (가슴-허벅지-손뼉)', durationSeconds: 30, guide: '오른가슴-왼가슴-오른허벅지-왼허벅지-더블클랩으로 이어지는 테크니컬 비트 연주!', actionTip: '손바닥을 오목하게 모아 찰진 소리를 냅니다.' },
      { stepNum: 3, title: '모둠 돌림노래 릴레이', durationSeconds: 30, guide: 'A조가 4박자를 치면 B조가 다음 4박자를 이어받아 멈추지 않는 리듬 순환을 만듭니다.', actionTip: '친구의 소리를 귀 기울여 들으며 템포를 맞춥니다.' },
    ],
    rubric: [
      { criterion: '박자의 정확성', desc: '일정한 템포를 유지하며 박자를 놓치지 않았는가?' },
      { criterion: '모둠 화음과 호흡', desc: '친구들과 박자가 어긋나지 않고 하나의 음악처럼 어우러졌는가?' },
    ],
    safetyTips: ['몸을 너무 세게 때려 피부가 붉어지지 않도록 손바닥 힘을 조절합니다.'],
  },
  {
    id: 'kpop_easy_challenge',
    name: 'K-POP 기초 챌린지',
    emoji: '🌟',
    desc: '유튜브 가이드 영상을 보며 따라하는 4박자 반복 포인트 안무 및 숏폼 댄스 챌린지',
    domain: '표현',
    subCategory: '영상 연계 K-POP 포인트 안무',
    achievement: {
      code: '[4체03-03]',
      title: '리듬 움직임 구성 및 표현',
      desc: '대중음악 리듬의 흐름을 이해하고 신나는 안무 동작을 모방하여 표현한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: 'eNRfklcMt1E',
      title: '[온라인 방송댄스] 모모랜드 - Ready Or Not 안무 거울모드 쉬운버전',
      defaultBpm: 115,
    },
    steps: [
      { stepNum: 1, title: '하체 스텝: 바운스 & 사이드 스텝', durationSeconds: 30, guide: '영상의 리듬에 맞춰 무릎을 굽히며 좌우로 통통 튀는 기본 바운스를 익힙니다.', actionTip: '거울 모드(좌우 반전)를 켜고 영상을 마주보며 따라합니다.' },
      { stepNum: 2, title: '상체 포인트: 하트 락 & 핑거 스냅', durationSeconds: 30, guide: '양손으로 가슴 앞 하트를 만들고 손가락을 튕기며 시선을 정면 카메라에 맞춥니다.', actionTip: '밝고 자신감 넘치는 미소를 유지하세요.' },
      { stepNum: 3, title: '원테이크 챌린지 댄스!', durationSeconds: 35, guide: '음악이 흐르는 동안 처음부터 끝까지 친구들과 대형을 맞추어 안무를 완주합니다.', actionTip: '틀려도 멈추지 않고 리듬을 타며 즐깁니다.' },
    ],
    rubric: [
      { criterion: '리듬감과 자신감', desc: '음악의 비트를 타며 즐겁고 적극적으로 표현했는가?' },
      { criterion: '동작의 정확도', desc: '영상의 핵심 포인트 안무를 정확하게 재현했는가?' },
    ],
    safetyTips: ['바닥에 물기가 없도록 확인하고, 실내 운동화를 착용합니다.'],
  },
  {
    id: 'musical_freeze',
    name: '뮤지컬 스톱 모션',
    emoji: '🎭',
    desc: '음악이 재생되는 동안 자유롭게 연기하다가 정지 신호에 극적인 감정 장면으로 얼어붙기',
    domain: '표현',
    subCategory: '극적 상황 감정 표현',
    achievement: {
      code: '[4체03-04]',
      title: '생각이나 감정, 느낌의 신체 표현',
      desc: '다양한 감정과 극적인 상황을 신체 움직임과 표정으로 과장하여 표현한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '배경 테마: 보물섬 해적단', durationSeconds: 25, guide: '음악이 흐르는 동안 해적선을 청소하거나 망원경을 보는 익살스러운 연기를 펼칩니다.', actionTip: '교실 전체를 무대라고 생각합니다.' },
      { stepNum: 2, title: '폭풍우 경보! 정지!', durationSeconds: 20, guide: '정지 신호음과 함께 거대한 파도를 보고 경악하는 표정으로 5초간 얼음!', actionTip: '눈을 크게 뜨고 입을 벌린 표정 연기를 함께합니다.' },
      { stepNum: 3, title: '승리의 황금 보물 발견', durationSeconds: 25, guide: '다시 음악이 나오면 보물 상자를 열고 환호하는 환희의 댄스를 펼친 뒤 피날레 포즈를 취합니다.', actionTip: '모둠원과 하이파이브를 나눕니다.' },
    ],
    rubric: [
      { criterion: '표정 및 제스처의 생동감', desc: '몸짓뿐만 아니라 표정으로 감정을 극대화했는가?' },
      { criterion: '정지 신호 반응성', desc: '음악이 멈출 때 망설임 없이 즉각적으로 정지했는가?' },
    ],
    safetyTips: ['정지할 때 몸의 중심을 잃지 않도록 양발을 안정적으로 디딥니다.'],
  },
  {
    id: 'ribbon_gymnast',
    name: '리듬 리본 체조',
    emoji: '🎀',
    desc: '리본이나 긴 끈을 들고 소용돌이, 나선, 물결 등 아름다운 기하학적 곡선 궤적 연출',
    domain: '표현',
    subCategory: '리듬 체조 도구 표현',
    achievement: {
      code: '[4체03-01]',
      title: '움직임 원리 및 궤적 탐색',
      desc: '도구를 활용하여 연속적이고 조화로운 움직임 궤적을 창의적으로 구성한다.',
    },
    grades: ['3~4학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '손목 스냅 뱀 모양 물결', durationSeconds: 25, guide: '바닥 위에 리본을 올려두고 손목을 좌우로 빠르게 털어 뱀이 기어가듯 물결을 만듭니다.', actionTip: '팔 전체가 아닌 손목의 미세한 스냅을 활용합니다.' },
      { stepNum: 2, title: '머리 위 거대한 도넛 나선', durationSeconds: 25, guide: '팔을 머리 위로 쭉 뻗고 리본을 빙글빙글 원형으로 돌리며 발레리나 턴을 돕니다.', actionTip: '발끝으로 서서 회전 반경을 넓힙니다.' },
      { stepNum: 3, title: '던지기 비행과 캐치 피날레', durationSeconds: 25, guide: '리본 손잡이를 위로 살짝 띄웠다가 공중제비 후 다시 잡고 우아하게 무릎을 꿇습니다.', actionTip: '마지막 순간까지 리본 끝이 바닥에 닿지 않게 유지합니다.' },
    ],
    rubric: [
      { criterion: '도구 제어 능력', desc: '리본이 엉키지 않고 끝까지 형태를 유지했는가?' },
      { criterion: '신체 선의 아름다움', desc: '팔다리를 길고 시원하게 뻗어 유연성을 돋보였는가?' },
    ],
    safetyTips: ['리본 손잡이 막대가 친구의 얼굴을 향하지 않도록 각도를 조절합니다.'],
  },
  {
    id: 'tempo_chameleon',
    name: '템포 카멜레온',
    emoji: '🦎',
    desc: '느린 안단테(60 BPM)부터 빠른 프레스토(140 BPM)까지 급변하는 템포에 즉시 적응하기',
    domain: '표현',
    subCategory: '음악 템포 적응 움직임',
    achievement: {
      code: '[4체03-03]',
      title: '리듬의 빠르기와 강약 표현',
      desc: '음악의 템포 변화를 감지하고 그에 어울리는 보폭과 속도로 움직임을 변환한다.',
    },
    grades: ['3~4학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '60 BPM 거북이 템포', durationSeconds: 25, guide: '아주 느린 박자에 맞춰 한 걸음을 딛는 데 2초씩 걸리며 공기를 가르듯 천천히 걷습니다.', actionTip: '느린 동작 속에서도 중심이 흔들리지 않게 집중합니다.' },
      { stepNum: 2, title: '100 BPM 보통 걸음 템포', durationSeconds: 25, guide: '경쾌한 팝 음악 템포에 맞춰 팔을 앞뒤로 흔들며 활기차게 워킹합니다.', actionTip: '리듬에 맞춰 고개를 가볍게 끄덕입니다.' },
      { stepNum: 3, title: '140 BPM 번개 스프린트 템포', durationSeconds: 25, guide: '숨 가쁜 빠른 비트에 맞춰 제자리에서 발을 마구 구르며 재즈 댄스 탭을 밟습니다.', actionTip: '발 앞꿈치로만 빠르게 탭합니다.' },
    ],
    rubric: [
      { criterion: '박자 감각과 즉각성', desc: '템포가 바뀔 때 지체 없이 걸음걸이 속도를 전환했는가?' },
      { criterion: '동작의 안정성', desc: '빠른 템포에서도 몸의 자세가 흐트러지지 않았는가?' },
    ],
    safetyTips: ['빠른 스텝 시 미끄러지지 않도록 발을 높이 들지 않고 가볍게 구릅니다.'],
  },
  {
    id: 'story_drama_relay',
    name: '한 장면 릴레이 극장',
    emoji: '📖',
    desc: '기-승-전-결 4개 모둠원이 각자 맡은 장면을 대사 없이 오직 신체 무언극으로 전달',
    domain: '표현',
    subCategory: '스토리텔링 무언극 표현',
    achievement: {
      code: '[4체03-04]',
      title: '생각과 스토리의 신체 표현',
      desc: '주제가 있는 짧은 이야기를 구성하고 신체 언어를 통해 인물의 성격과 사건을 연출한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '1번 주자 [기]: 평화로운 일상', durationSeconds: 20, guide: '소풍을 가거나 맛있는 도시락을 먹는 행복한 몸짓을 펼칩니다.', actionTip: '과장된 몸짓으로 무엇을 하는지 보여줍니다.' },
      { stepNum: 2, title: '2번 주자 [승]: 거대한 사건 발생', durationSeconds: 20, guide: '갑자기 나타난 괴물이나 소나기에 깜짝 놀라 도망치는 긴박한 액션!', actionTip: '속도감 있는 방향 전환을 시도합니다.' },
      { stepNum: 3, title: '3번 주자 [전]: 친구와의 위기 극복', durationSeconds: 20, guide: '쓰러진 친구를 부축하거나 함께 우산을 만들어 비를 피하는 협력 모션.', actionTip: '따뜻한 온기와 전우애를 담아냅니다.' },
      { stepNum: 4, title: '4번 주자 [결]: 해피엔딩 피날레', durationSeconds: 20, guide: '모둠원 전원이 무대 중앙에 모여 승리의 V포즈를 취하며 막을 내립니다.', actionTip: '관객(친구들)을 향해 정중히 인사합니다.' },
    ],
    rubric: [
      { criterion: '스토리 전달력', desc: '대사가 없어도 신체 동작만으로 이야기 흐름이 명확히 전달되었는가?' },
      { criterion: '모둠원 간의 연계성', desc: '앞 장면과 뒷 장면이 자연스럽게 이어졌는가?' },
    ],
    safetyTips: ['연기 도중 흥분하여 친구를 밀치거나 넘어뜨리지 않도록 유의합니다.'],
  },
  {
    id: 'mirror_sync_duo',
    name: '싱크로 미러 듀오',
    emoji: '🪞',
    desc: '짝과 1m 거리에서 마주보고 오직 눈빛 신호만으로 100% 동기화된 안무 연출하기',
    domain: '표현',
    subCategory: '짝 동기화 표현',
    achievement: {
      code: '[4체03-04]',
      title: '감정과 느낌 상호작용 표현',
      desc: '상대방의 호흡과 시선을 인지하고 신체 움직임을 완벽하게 일치시키는 교감을 나눈다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '아이 컨택과 호흡 일치', durationSeconds: 20, guide: '서로의 눈을 바라보며 동시에 숨을 들이쉬고 내쉬며 템포를 맞춥니다.', actionTip: '말을 하지 않고 눈빛과 고개 끄덕임만 사용합니다.' },
      { stepNum: 2, title: '유리창 닦기 듀엣 모션', durationSeconds: 30, guide: '손바닥을 마주대듯 허공 10cm 앞에 두고 원을 그리며 동일한 속도로 움직입니다.', actionTip: '누가 리드하는지 모를 정도로 자연스럽게 맞춥니다.' },
      { stepNum: 3, title: '좌우 사이드 스텝 싱크로', durationSeconds: 25, guide: '동시에 오른쪽으로 2걸음, 왼쪽으로 2걸음 점프하며 대칭 완벽성을 증명합니다.', actionTip: '발이 바닥에 닿는 타이밍까지 맞추어 봅니다.' },
    ],
    rubric: [
      { criterion: '동기화 일치도', desc: '두 사람의 팔 각도와 발걸음 타이밍이 하나처럼 일치했는가?' },
      { criterion: '비언어적 소통', desc: '말 대신 시선과 신체 신호로 긴밀하게 호흡을 맞추었는가?' },
    ],
    safetyTips: ['손바닥을 맞닿을 때 너무 세게 밀지 않도록 10cm 간격을 유지합니다.'],
  },
  {
    id: 'gravity_rebel',
    name: '중력 탈출 러너',
    emoji: '🪂',
    desc: '강한 중력(무거운 전신 수축)과 탈출(가벼운 전신 팽창)의 드라마틱한 힘의 대비 훈련',
    domain: '표현',
    subCategory: '힘의 강약 대비 움직임',
    achievement: {
      code: '[4체03-02]',
      title: '움직임 요소 결합 (힘과 에너지)',
      desc: '신체에 작용하는 무게감과 긴장·이완을 조절하여 힘의 대비를 표현한다.',
    },
    grades: ['3~4학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '지구 10배 중력의 짓눌림', durationSeconds: 25, guide: '머리 위에 바위가 얹힌 듯 어깨를 짓누르며 땀을 뻘뻘 흘리는 무거운 걸음을 걷습니다.', actionTip: '표정을 잔뜩 찌푸리며 전신 근육에 힘을 줍니다.' },
      { stepNum: 2, title: '중력 제어 장치 가동!', durationSeconds: 20, guide: '딸깍! 스위치를 켜듯 자세를 바로잡고 몸에서 서서히 무게를 털어냅니다.', actionTip: '어깨를 가볍게 털며 척추를 세웁니다.' },
      { stepNum: 3, title: '무중력 점핑 하이라이트', durationSeconds: 25, guide: '깃털처럼 가벼워진 몸으로 사뿐사뿐 허공을 도약하며 새처럼 날갯짓합니다.', actionTip: '체공 시간을 최대한 길게 느껴봅니다.' },
    ],
    rubric: [
      { criterion: '힘의 강약 대비', desc: '무거움과 가벼움의 신체 느낌 차이가 시각적으로 뚜렷한가?' },
      { criterion: '근육 제어력', desc: '무거운 동작 시 코어 근육에 적절한 긴장을 주었는가?' },
    ],
    safetyTips: ['무거운 표현 시 허리를 무리하게 꺾지 않도록 척추 정렬을 유지합니다.'],
  },
  {
    id: 'art_gallery_critic',
    name: '움직이는 갤러리 감상단',
    emoji: '🖼️',
    desc: '친구들의 창의적인 표현을 미술관 큐레이터처럼 감상하고 칭찬과 성찰 루브릭 나누기',
    domain: '표현',
    subCategory: '표현 작품 심미적 감상',
    achievement: {
      code: '[4체03-05]',
      title: '자신과 타인의 표현 활동 감상 및 존중',
      desc: '친구들의 신체 표현 작품을 긍정적인 시각으로 감상하고 장점을 찾아 격려한다.',
    },
    grades: ['3~4학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '미술관 오픈: 30초 라이브 시연', durationSeconds: 30, guide: '한 모둠이 무대에서 자신의 창작 포즈 3가지를 음악에 맞춰 선보입니다.', actionTip: '자신감 있게 동작을 크고 명확하게 보여줍니다.' },
      { stepNum: 2, title: '관객 감상: 명작 포인트 포착', durationSeconds: 20, guide: '감상단 학생들은 친구들의 동작 중 가장 인상 깊은 시각적 요소를 관찰합니다.', actionTip: '비난하지 않고 독창적인 장점에 집중합니다.' },
      { stepNum: 3, title: '따뜻한 한 줄 평 & 별점 부여', durationSeconds: 25, guide: '화면의 루브릭 평가표에서 친구들에게 별점을 부여하고 따뜻한 박수를 보냅니다.', actionTip: '“표정이 정말 생생했어!”, “부드러운 손동작이 멋졌어!”' },
    ],
    rubric: [
      { criterion: '감상의 태도', desc: '친구의 표현을 진지하고 존중하는 자세로 끝까지 집중하여 보았는가?' },
      { criterion: '구체적인 피드백', desc: '단순한 좋음이 아닌 구체적인 동작 요소를 들어 칭찬했는가?' },
    ],
    safetyTips: ['감상 중 야유나 놀리는 말을 절대 하지 않도록 교사가 사전에 지도합니다.'],
  },

  // ==========================================
  // [5~6학년군] 민속 표현, 현대 표현, 스포츠 표현, 종합 창작 (10종)
  // ==========================================
  {
    id: 'talchum_korea',
    name: '신명나는 전통 탈춤',
    emoji: '👺',
    desc: '한삼 뿌리기, 덩더쿵 굿거리장단, 까치걸음과 오금질로 풀어내는 우리나라 전통 민속 표현',
    domain: '표현',
    subCategory: '민속 표현 (전통 탈춤)',
    achievement: {
      code: '[6체03-01]',
      title: '민속 표현의 문화적 배경과 기본 동작',
      desc: '우리나라 전통 탈춤의 사위와 오금질을 익혀 신명나는 민속 움직임을 표현한다.',
    },
    grades: ['5~6학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: '1MxoZmT41tI',
      title: '표현(3차시) 탈춤 1탄 - 불림과 고개잡이 배우기 (광주초등체육교과연구회)',
      defaultBpm: 90,
    },
    steps: [
      { stepNum: 1, title: '오금질과 불림 사위', durationSeconds: 30, guide: '굿거리장단(덩 기덕 쿵 더러러러)에 맞춰 무릎을 굽혔다 펴는 오금질로 신명을 돋웁니다.', actionTip: '호흡을 아랫배로 들이쉬며 솟구쳐 오릅니다.' },
      { stepNum: 2, title: '한삼 뿌리기 & 휘두르기', durationSeconds: 30, guide: '양팔을 안에서 밖으로 시원하게 뿌리며 허공에 하얀 궤적을 날립니다.', actionTip: '어깨춤을 덩실덩실 추며 한삼을 채찍처럼 뿌립니다.' },
      { stepNum: 3, title: '익살맞은 양반 풍자 걸음', durationSeconds: 30, guide: '까치걸음(발뒤꿈치를 들고 사뿐사뿐 걷기)으로 원을 돌며 해학적인 웃음을 짓습니다.', actionTip: '“얼쑤! 좋다!” 구령을 힘차게 외쳐보세요.' },
    ],
    rubric: [
      { criterion: '오금질의 리듬감', desc: '장단에 맞추어 무릎의 탄력(오금질)을 잃지 않고 유지했는가?' },
      { criterion: '신명과 해학성', desc: '탈춤 특유의 신명과 당당한 어깨춤을 멋지게 살렸는가?' },
    ],
    safetyTips: ['오금질 시 무릎관절에 무리가 가지 않도록 발끝 방향과 무릎 방향을 일치시킵니다.'],
  },
  {
    id: 'ganggangsullae',
    name: '달맞이 강강술래',
    emoji: '🌕',
    desc: '원무 돌기, 남생아 놀아라, 개고리 개골청, 청어엮기와 풀기로 이어지는 대동 단결 놀이',
    domain: '표현',
    subCategory: '민속 표현 (집단 원무 대형)',
    achievement: {
      code: '[6체03-01]',
      title: '민속 표현의 협동 및 대형 구성',
      desc: '민속 무용의 다양한 대형 변화를 이해하고 모둠원 전체가 하나 되어 협력한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '진양조 느린 원무', durationSeconds: 25, guide: '손을 잡고 오른쪽으로 천천히 걸으며 보름달의 장엄함을 신체로 느낍니다.', actionTip: '앞 사람의 발걸음 속도와 보폭을 맞춥니다.' },
      { stepNum: 2, title: '중모리 남생아 놀아라', durationSeconds: 25, guide: '가운데로 한두 명이 뛰어나와 익살맞은 남생이 춤을 추고 들어갑니다.', actionTip: '나머지 친구들은 힘찬 박수와 후렴구로 호응합니다.' },
      { stepNum: 3, title: '자진모리 청어엮기 & 풀기', durationSeconds: 35, guide: '선두를 따라 팔 아래로 통과하며 촘촘히 엮였다가 시원하게 풀어냅니다.', actionTip: '손을 절대 놓치지 않고 끈끈하게 연결합니다.' },
    ],
    rubric: [
      { criterion: '대형 유지와 협동성', desc: '원형과 나선형 대형이 찌그러지지 않고 규칙적으로 유지되었는가?' },
      { criterion: '공동체 호흡', desc: '친구의 손을 따뜻하게 잡고 함께 호흡을 맞추었는가?' },
    ],
    safetyTips: ['손을 잡고 빠르게 달릴 때 친구를 세게 끌어당기지 않습니다.'],
  },
  {
    id: 'world_folk_dance',
    name: '세계 민속 춤 탐방',
    emoji: '🗺️',
    desc: '하와이 훌라 댄스(물결 손짓), 이스라엘 마임(발 구르기), 체코 폴카(경쾌한 홉스텝)',
    domain: '표현',
    subCategory: '세계 민속 무용 표현',
    achievement: {
      code: '[6체03-01]',
      title: '세계 민속 표현의 문화적 이해',
      desc: '세계 여러 나라 민속 춤의 고유한 스텝과 손동작을 문화적 맥락과 함께 시연한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: '-hF8AsjaVAQ',
      title: '세계민속춤 - 이스라엘 마임 & 스텝 튜토리얼',
      defaultBpm: 105,
    },
    steps: [
      { stepNum: 1, title: '하와이 훌라: 알로하 물결 사위', durationSeconds: 30, guide: '골반을 좌우로 부드럽게 8자 흔들며 양손으로 야자수와 바다 물결을 그립니다.', actionTip: '손끝에 감정을 싣고 시선은 손끝을 따라갑니다.' },
      { stepNum: 2, title: '이스라엘 마임: 생명의 물 탭', durationSeconds: 30, guide: '손을 잡고 원 안으로 4걸음 모였다가 박수를 치며 뒤로 4걸음 물러납니다.', actionTip: '발바닥 전체로 대지를 힘차게 딛습니다.' },
      { stepNum: 3, title: '체코 폴카: 경쾌한 힐앤토 홉스텝', durationSeconds: 30, guide: '발뒤꿈치-발끝 찍고 홉! 파트너와 팔짱을 끼고 3박자 회전 질주를 즐깁니다.', actionTip: '상체를 곧게 세우고 활짝 웃으며 뜁니다.' },
    ],
    rubric: [
      { criterion: '세계 문화 감수성', desc: '각 나라 춤의 독특한 리듬과 정서를 바르게 이해하고 표현했는가?' },
      { criterion: '스텝의 정확성', desc: '홉스텝과 사이드 스텝의 규칙을 준수했는가?' },
    ],
    safetyTips: ['파트너와 팔짱을 끼고 돌 때 속도를 과도하게 높이지 않습니다.'],
  },
  {
    id: 'kpop_dance_cover',
    name: 'K-POP 댄스 커버 프로젝트',
    emoji: '💃',
    desc: '최신 글로벌 K-POP 포인트 안무를 마스터하고 대형 이동 동선을 설계하는 현대 표현',
    domain: '표현',
    subCategory: '현대 표현 (K-POP 방송 안무)',
    achievement: {
      code: '[6체03-02]',
      title: '현대 표현의 특성 이해 및 작품 구성',
      desc: '현대 댄스의 대형 변화와 리듬 요소를 적용하여 모둠 댄스 커버를 완성한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: '9bZkp7q19f0',
      title: '싸이(PSY) - 강남스타일 포인트 안무 (K-POP 방송댄스)',
      defaultBpm: 130,
    },
    steps: [
      { stepNum: 1, title: '파트별 포지셔닝 & 오프닝 대형', durationSeconds: 25, guide: 'V자 대형으로 서서 곡의 인트로 비트에 맞춰 한 명씩 시차(카운트) 안무를 선보입니다.', actionTip: '자신의 등장 카운트를 머릿속으로 정확히 셉니다.' },
      { stepNum: 2, title: '킬링 파트 군무 (센터 체인지)', durationSeconds: 35, guide: '하이라이트 후렴구에 맞춰 전원이 칼군무를 선보이며 센터 멤버를 자연스럽게 교체합니다.', actionTip: '팔의 높이와 각도를 모둠원 전원이 일치시킵니다.' },
      { stepNum: 3, title: '엔딩 요정 시선 고정 피날레', durationSeconds: 20, guide: '마지막 비트에 맞춰 숨을 몰아쉬며 가장 매력적인 엔딩 포즈로 5초간 카메라 응시!', actionTip: '자신만의 개성 있는 손동작을 연출합니다.' },
    ],
    rubric: [
      { criterion: '칼군무 완성도', desc: '모둠원 전원의 팔다리 각도와 박자가 정밀하게 일치했는가?' },
      { criterion: '대형 전환의 매끄러움', desc: '부딪치지 않고 자연스럽게 앞뒤 자리를 바꾸었는가?' },
    ],
    safetyTips: ['대형을 바꿀 때 바닥을 보지 말고 앞을 보며 부딪치지 않게 이동합니다.'],
  },
  {
    id: 'musical_scene_maker',
    name: '뮤지컬 장면 연출가',
    emoji: '🎬',
    desc: '음악 큐사인에 맞추어 주인공의 고뇌, 갈등, 화해의 드라마틱한 군무를 창작 연출',
    domain: '표현',
    subCategory: '현대 표현 (뮤지컬 신체극)',
    achievement: {
      code: '[6체03-02]',
      title: '주제 중심 표현 작품 구성',
      desc: '스토리의 극적 반전을 음악과 신체 동작의 앙상블로 창의적으로 연출한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '군중의 분주한 발걸음', durationSeconds: 25, guide: '시계태엽처럼 바쁘게 오가는 현대 도시인의 걸음을 교차 동선으로 표현합니다.', actionTip: '무표정하고 기계적인 움직임을 연출합니다.' },
      { stepNum: 2, title: '주인공의 깨어남과 독무', durationSeconds: 30, guide: '모두가 멈춘 가운데 주인공이 날아오르는 듯한 자유로운 점프와 턴을 펼칩니다.', actionTip: '감정의 고조를 온몸의 크기로 확대합니다.' },
      { stepNum: 3, title: '전원 합창 앙상블 피날레', durationSeconds: 30, guide: '주인공의 에너지를 받아 모둠원 전원이 손을 뻗으며 희망찬 대형으로 집결합니다.', actionTip: '가슴을 활짝 펴고 턱을 들어 올립니다.' },
    ],
    rubric: [
      { criterion: '극적 연출력', desc: '단조로운 춤을 넘어 스토리가 느껴지는 연기력이 가미되었는가?' },
      { criterion: '독창적 대형 구성', desc: '모둠원 간의 역할 분담(주인공과 앙상블)이 조화로운가?' },
    ],
    safetyTips: ['점프 동작 후 착지 공간을 사전에 비워둡니다.'],
  },
  {
    id: 'cheerleading_team',
    name: '파워 치어리딩 루틴',
    emoji: '📣',
    desc: '절도 있는 팔 모션(T, High-V, L), 점프, 팀 구호로 활력을 불어넣는 스포츠 표현 루틴',
    domain: '표현',
    subCategory: '스포츠 표현 (스턴트 치어리딩 모션)',
    achievement: {
      code: '[6체03-03]',
      title: '스포츠 표현 동작 및 대형 협동',
      desc: '치어리딩의 기본 모션과 대열을 익히고 절도 있는 협동심으로 활력을 표현한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: 'xfgB0UEwIyc',
      title: '[YBM초등체육6] 음악에 맞추어 치어리딩 기본 동작 배우기',
      defaultBpm: 120,
    },
    steps: [
      { stepNum: 1, title: '기본 모션 콤보 (High V -> T -> Low V)', durationSeconds: 30, guide: '팔꿈치를 굽히지 않고 주먹을 꽉 쥔 채 칼로 자르듯 절도 있게 모션을 끊어칩니다.', actionTip: '어깨에 힘을 주고 주먹의 엄지 방향을 정확히 맞춥니다.' },
      { stepNum: 2, title: '토치 점프 & 클래핑 구호', durationSeconds: 25, guide: '“빅토리! 땀방울!” 구호를 외치며 박수를 치고 두 발을 모아 힘차게 점프합니다.', actionTip: '배에서 나오는 쩌렁쩌렁한 목소리로 구호를 외칩니다.' },
      { stepNum: 3, title: '모둠 인간 피라미드 포즈 (노 스턴트)', durationSeconds: 25, guide: '앞줄은 한쪽 무릎을 꿇고 뒷줄은 하이-V를 취하며 입체적인 2단 전광판 포즈를 만듭니다.', actionTip: '탑을 쌓지 않고 앞뒤 높낮이 배치만으로 웅장함을 연출합니다.' },
    ],
    rubric: [
      { criterion: '모션의 절도와 각도', desc: '팔이 흔들리지 않고 날카로운 각도로 멈추는가?' },
      { criterion: '팀 에너지와 일체감', desc: '구호의 목소리와 모션 타이밍이 한 목소리로 일치했는가?' },
    ],
    safetyTips: ['어깨 부상을 방지하기 위해 팔을 휘두르지 않고 통제하며 정지합니다.'],
  },
  {
    id: 'music_jumprope',
    name: '음악 줄넘기 비트',
    emoji: '🪢',
    desc: '신나는 비트에 맞춰 기본 8박자 스텝, 엇걸기, 되돌리기, 2단 뛰기를 결합한 리듬 유산소',
    domain: '표현',
    subCategory: '스포츠 표현 (음악 줄넘기)',
    achievement: {
      code: '[6체03-03]',
      title: '음악 줄넘기 동작 및 타이밍 구성',
      desc: '음악의 비트에 줄넘기 스텝 기술을 일치시켜 리드미컬하게 신체 기능을 뽐낸다.',
    },
    grades: ['5~6학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: '2xslrk_MexY',
      title: '[초등 전학년 체육] 음악줄넘기 기본 스텝 및 안무 배우기',
      defaultBpm: 125,
    },
    steps: [
      { stepNum: 1, title: '양발 모아 비트 점프 (1박 1도약)', durationSeconds: 30, guide: '줄넘기를 돌리지 않고 가상 줄넘기(맨손 스윙) 또는 실제 줄넘기로 비트에 점프합니다.', actionTip: '무릎 탄력만을 이용해 가볍게 1cm만 뜁니다.' },
      { stepNum: 2, title: '번갈아 뛰기 & 십자 크로스 스텝', durationSeconds: 30, guide: '조깅하듯 한 발씩 번갈아 뛴 뒤, 팔을 교차(X자 엇걸기)하여 줄을 넘습니다.', actionTip: '손목 스냅을 몸 중심 가까이 붙입니다.' },
      { stepNum: 3, title: '피날레 더블 언더 (씽씽이) 도전', durationSeconds: 20, guide: '마지막 10초간 높은 점프와 빠른 2회전 스윙으로 폭발적인 피날레를 장식합니다.', actionTip: '점프할 때 무릎을 가슴으로 당기지 않고 하체를 곧게 폅니다.' },
    ],
    rubric: [
      { criterion: '음악 비트 일치도', desc: '줄이 바닥을 치는 소리와 음악의 비트가 정확히 일치하는가?' },
      { criterion: '체력과 지구력', desc: '지치지 않고 일정한 리듬을 끝까지 완주했는가?' },
    ],
    safetyTips: ['앞뒤 친구와 줄이 닿지 않도록 최소 2.5m 안전거리를 확보합니다.'],
  },
  {
    id: 'taebo_fitness',
    name: '태보 & 복싱 에어로빅',
    emoji: '🥊',
    desc: '강렬한 135 BPM 댄스 음악에 잽, 스트레이트, 어퍼컷, 프론트 킥을 결합한 파워 피트니스',
    domain: '표현',
    subCategory: '스포츠 표현 (격투기 융합 에어로빅)',
    achievement: {
      code: '[6체03-03]',
      title: '스포츠 기능과 리듬의 융합 표현',
      desc: '투기 스포츠(태권도, 복싱)의 방어와 공격 기술을 에어로빅 리듬과 결합하여 시연한다.',
    },
    grades: ['5~6학년군'],
    playMode: '개인',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    videoInfo: {
      videoId: 'cb9WHmjR0B0',
      title: '신나는 태보 & 복싱 에어로빅 다이어트 댄스 피트니스',
      defaultBpm: 130,
    },
    steps: [
      { stepNum: 1, title: '원-투 복싱 잽 & 가드 바운스', durationSeconds: 30, guide: '턱밑에 가드를 올리고 왼손 잽, 오른손 스트레이트를 비트에 맞춰 연속으로 뻗습니다.', actionTip: '펀치를 칠 때 허리를 함께 비틀어 파워를 냅니다.' },
      { stepNum: 2, title: '위빙 회피 & 어퍼컷 콤보', durationSeconds: 30, guide: '상체의 U자 회피(위빙) 후 밑에서 위로 턱을 치는 강력한 어퍼컷 연결!', actionTip: '무릎을 굽혀 체중을 아래에서 위로 밀어 올립니다.' },
      { stepNum: 3, title: '프론트 푸시 킥 & 니킥 질주', durationSeconds: 30, guide: '복부를 보호하며 앞차기 4회, 무릎 당겨치기 4회를 빠른 비트에 맞추어 폭격합니다.', actionTip: '호흡을 “칫! 칫!” 짧고 굵게 내뱉습니다.' },
    ],
    rubric: [
      { criterion: '타격감과 절도', desc: '펀치와 킥이 흐느적거리지 않고 끝점에서 절도 있게 멈추는가?' },
      { criterion: '유산소 심폐 열정', desc: '쉼 없이 스텝을 밟으며 전신 유산소 열정을 불태웠는가?' },
    ],
    safetyTips: ['절대 사람을 향해 주먹을 뻗지 않고 허공을 향해 가상 타격합니다.'],
  },
  {
    id: 'flashmob_creator',
    name: '모둠 플래시몹 메이커',
    emoji: '👥',
    desc: '1명에서 시작하여 2명, 4명, 모둠원 전체가 깜짝 합류하는 군무 대형 전술 설계',
    domain: '표현',
    subCategory: '종합 표현 (플래시몹 군무 기획)',
    achievement: {
      code: '[6체03-04]',
      title: '스토리가 있는 종합 표현 작품 창작 및 발표',
      desc: '모둠원과 협의하여 점진적으로 합류하는 깜짝 플래시몹 퍼포먼스를 기획하고 시연한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '1단계: 아무렇지 않은 척 일상 위장', durationSeconds: 20, guide: '교실 곳곳에서 책을 읽거나 멍때리며 일반적인 일상 연기를 합니다.', actionTip: '시작 신호가 울리기 전까지 춤출 기색을 숨깁니다.' },
      { stepNum: 2, title: '2단계: 첫 번째 댄서의 도화선 점화', durationSeconds: 25, guide: '1번 학생이 센터로 뛰어나와 인상적인 독무를 시작합니다.', actionTip: '주변 친구들은 놀라워하는 표정 연기를 합니다.' },
      { stepNum: 3, title: '3단계: 2배씩 번지는 도미노 합류', durationSeconds: 35, guide: '한 마디마다 2명씩 무대로 합류하여 마지막에 모둠 전원이 거대 군무를 폭발시킵니다.', actionTip: '합류하는 순간 폭발적인 에너지를 방출합니다.' },
    ],
    rubric: [
      { criterion: '플래시몹의 서프라이즈 효과', desc: '일상에서 군무로 전환되는 극적인 연출이 훌륭했는가?' },
      { criterion: '시간차 합류의 정확성', desc: '약속된 박자에 지체 없이 자신의 순서에 합류했는가?' },
    ],
    safetyTips: ['무대로 뛰어 들어올 때 친구의 발을 밟지 않도록 주변을 살핍니다.'],
  },
  {
    id: 'expressive_critique',
    name: '표현 페스티벌 쇼케이스',
    emoji: '🏆',
    desc: '한 학기 동안 갈고닦은 모둠별 종합 표현 작품을 무대에서 발표하고 상호 동료 루브릭 평가',
    domain: '표현',
    subCategory: '종합 발표 및 과정 중심 상호 평가',
    achievement: {
      code: '[6체03-04]',
      title: '종합 표현 작품 발표 및 동료 평가',
      desc: '자신과 타인의 표현 작품을 발표하고 심미적 안목으로 동료 피드백을 공유한다.',
    },
    grades: ['5~6학년군'],
    playMode: '협동',
    devices: ['스마트폰', '태블릿 PC', '데스크톱 PC'],
    steps: [
      { stepNum: 1, title: '모둠 쇼케이스 무대 발표', durationSeconds: 40, guide: '무대 조명이 켜지듯 모둠이 준비한 창작 표현 루틴을 전원 하나가 되어 선보입니다.', actionTip: '틀려도 당황하지 않고 미소로 당당하게 이어갑니다.' },
      { stepNum: 2, title: '심사위원단 루브릭 채점', durationSeconds: 25, guide: '관객 학생들은 [독창성], [협동심], [표현력] 3개 영역의 루브릭 점수를 부여합니다.', actionTip: '정당하고 객관적인 기준으로 성실하게 평가합니다.' },
      { stepNum: 3, title: '격려의 스탠딩 오베이션', durationSeconds: 20, guide: '발표 모둠에게 전원이 기립 박수와 격려의 함성을 보내며 축제를 마감합니다.', actionTip: '모두가 표현의 주인공임을 서로 축하합니다.' },
    ],
    rubric: [
      { criterion: '작품의 완성도 및 독창성', desc: '모둠만의 독창적인 아이디어와 스토리가 잘 녹아있는가?' },
      { criterion: '상호 피드백의 진정성', desc: '동료의 노력을 인정하고 건설적인 피드백을 나누었는가?' },
    ],
    safetyTips: ['발표 후 퇴장할 때 조명이나 전선 등에 걸려 넘어지지 않도록 동선을 정돈합니다.'],
  },
];
