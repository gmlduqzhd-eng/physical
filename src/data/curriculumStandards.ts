// 2022 개정 초등학교 체육과 교육과정 성취기준 데이터
// 출처: 교육부 고시 제2022-33호 (초등학교 체육과)

export interface CurriculumStandard {
  code: string;
  gradeGroup: '3~4학년군' | '5~6학년군';
  domain: '운동' | '스포츠' | '표현';
  subArea: string;
  text: string;
  knowledge?: string;
  process?: string;
  attitude?: string;
}

export interface LowGradeTheme {
  theme: string;
  keywords: string[];
  description: string;
}

// ─── 1~2학년 즐거운 생활 연계 신체활동 테마 ───
export const LOW_GRADE_THEMES: LowGradeTheme[] = [
  { theme: '놀이 중심 신체활동', keywords: ['놀이','재미','즐거움'], description: '다양한 놀이를 통해 신체활동의 즐거움을 경험한다.' },
  { theme: '기본 움직임 탐색', keywords: ['이동','비이동','걷기','뛰기','구르기'], description: '걷기, 달리기, 뛰기 등 기본 이동 움직임을 탐색한다.' },
  { theme: '신체 인식과 조절', keywords: ['신체부위','균형','조절'], description: '자신의 신체 부위를 알고 움직임을 조절한다.' },
  { theme: '친구와 함께하기', keywords: ['협동','함께','친구','짝'], description: '친구와 함께 움직이며 어울리는 즐거움을 느낀다.' },
  { theme: '안전하게 움직이기', keywords: ['안전','규칙','약속'], description: '안전 약속을 지키며 즐겁게 활동한다.' },
  { theme: '느낌과 생각을 몸으로 표현하기', keywords: ['표현','흉내','모방','감정'], description: '느낌과 생각을 자유롭게 몸으로 표현한다.' },
  { theme: '리듬에 맞추어 움직이기', keywords: ['리듬','음악','박자','노래'], description: '음악과 리듬에 맞추어 신나게 몸을 움직인다.' },
  { theme: '자연 속 신체놀이', keywords: ['자연','야외','생태','탐험'], description: '자연 환경에서 다양한 신체놀이를 경험한다.' },
];

// ─── 3~4학년군 성취기준 ───
export const STANDARDS_3_4: CurriculumStandard[] = [
  // 운동 영역
  { code: '[4체01-01]', gradeGroup: '3~4학년군', domain: '운동', subArea: '체력의 의미', text: '운동과 체력의 의미 및 관계를 이해한다.', knowledge: '체력의 의미와 종류', process: '체력 요소 파악', attitude: '운동에 대한 관심' },
  { code: '[4체01-02]', gradeGroup: '3~4학년군', domain: '운동', subArea: '기본 체력운동', text: '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.', knowledge: '체력운동 방법', process: '수준별 운동 수행', attitude: '도전 의지' },
  { code: '[4체01-03]', gradeGroup: '3~4학년군', domain: '운동', subArea: '성장과 발달', text: '성장과 발달에 영향을 미치는 요인을 알고 건강한 생활 습관을 탐색한다.', knowledge: '성장 발달 요인', process: '건강 습관 탐색', attitude: '건강 관심' },
  { code: '[4체01-04]', gradeGroup: '3~4학년군', domain: '운동', subArea: '건강 생활 습관', text: '건강한 생활 습관을 이해하고 규칙적으로 실천한다.', knowledge: '건강 습관 지식', process: '규칙적 실천', attitude: '자기 관리' },
  { code: '[4체01-05]', gradeGroup: '3~4학년군', domain: '운동', subArea: '안전한 운동', text: '자신의 신체적 특징을 긍정적으로 인식하고 안전하게 운동한다.', knowledge: '신체 특징 이해', process: '안전한 운동 수행', attitude: '긍정적 신체 인식' },
  { code: '[4체01-06]', gradeGroup: '3~4학년군', domain: '운동', subArea: '운동 실천', text: '운동과 건강한 생활 습관 형성에 관심을 갖고 실천한다.', knowledge: '생활 습관', process: '운동 실천', attitude: '자발적 참여' },
  // 스포츠 영역
  { code: '[4체02-01]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '움직임 요소', text: '움직임의 요소(힘, 시간, 공간, 흐름)를 이해한다.', knowledge: '움직임 요소', process: '움직임 탐색', attitude: '탐구심' },
  { code: '[4체02-02]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '움직임 유형', text: '이동, 비이동, 조작 움직임의 유형을 파악한다.', knowledge: '움직임 유형', process: '유형별 수행', attitude: '다양한 시도' },
  { code: '[4체02-03]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '기본 움직임 기술', text: '움직임 요소에 따라 기본 움직임 기술을 수행한다.', knowledge: '기본 기술', process: '기술 수행', attitude: '꾸준한 연습' },
  { code: '[4체02-04]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '복합 움직임', text: '기본 움직임을 연결한 복합 움직임 기술을 수행한다.', knowledge: '복합 기술', process: '연결 수행', attitude: '도전 정신' },
  { code: '[4체02-05]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '기술형 스포츠', text: '기술형 스포츠에 적합한 기본 움직임을 수행한다.', knowledge: '기술형 원리', process: '기본 움직임 수행', attitude: '규칙 준수' },
  { code: '[4체02-06]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '전략형 스포츠', text: '전략형 스포츠에 적합한 기본 움직임을 수행한다.', knowledge: '전략형 원리', process: '전략적 움직임', attitude: '팀 배려' },
  { code: '[4체02-07]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '생태형 스포츠', text: '생태형 스포츠에 적합한 기본 움직임을 수행한다.', knowledge: '생태형 원리', process: '자연 속 움직임', attitude: '환경 존중' },
  { code: '[4체02-08]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '생태형 기능', text: '자연환경과 지형지물을 활용하는 생태형 스포츠의 기본 기능과 안전을 익힌다.', knowledge: '생태 스포츠 기능', process: '안전한 수행', attitude: '자연 친화' },
  { code: '[4체02-09]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '게임 규칙', text: '게임에 최선을 다하고 규칙을 지킨다.', knowledge: '규칙 이해', process: '최선 다하기', attitude: '정정당당' },
  { code: '[4체02-10]', gradeGroup: '3~4학년군', domain: '스포츠', subArea: '생태 여가', text: '자연 환경 속에서 신체와 정서를 이완하고 바른 호흡 습관을 형성한다.', knowledge: '이완 방법', process: '호흡 연습', attitude: '평화로움' },
  // 표현 영역
  { code: '[4체03-01]', gradeGroup: '3~4학년군', domain: '표현', subArea: '움직임 언어', text: '움직임 언어의 의미와 종류를 이해한다.', knowledge: '움직임 언어', process: '언어 탐색', attitude: '표현 관심' },
  { code: '[4체03-02]', gradeGroup: '3~4학년군', domain: '표현', subArea: '움직임 요소 표현', text: '움직임 요소에 따른 표현 방법을 탐색하고 시도한다.', knowledge: '표현 방법', process: '탐색과 시도', attitude: '창의성' },
  { code: '[4체03-03]', gradeGroup: '3~4학년군', domain: '표현', subArea: '모방 표현', text: '사물이나 자연을 움직임으로 모방하여 표현한다.', knowledge: '모방 기법', process: '모방 표현', attitude: '관찰력' },
  { code: '[4체03-04]', gradeGroup: '3~4학년군', domain: '표현', subArea: '느낌과 생각 표현', text: '느낌과 생각을 움직임으로 표현하고 서로의 움직임을 감상한다.', knowledge: '감정 표현', process: '표현과 감상', attitude: '존중' },
  { code: '[4체03-05]', gradeGroup: '3~4학년군', domain: '표현', subArea: '리듬 표현', text: '기본 움직임을 리듬에 맞춰 표현한다.', knowledge: '리듬 이해', process: '리듬 맞춤 표현', attitude: '즐거움' },
  { code: '[4체03-06]', gradeGroup: '3~4학년군', domain: '표현', subArea: '도구 활용 표현', text: '도구를 활용하여 움직임을 표현한다.', knowledge: '도구 활용법', process: '도구 표현', attitude: '안전한 사용' },
];

// ─── 5~6학년군 성취기준 ───
export const STANDARDS_5_6: CurriculumStandard[] = [
  // 운동 영역
  { code: '[6체01-01]', gradeGroup: '5~6학년군', domain: '운동', subArea: '체력 요소 탐색', text: '건강 체력과 운동 체력의 의미·요소를 알고 운동 방법을 탐색한다.', knowledge: '건강/운동 체력 구분', process: '운동 방법 탐색', attitude: '자기주도적 학습' },
  { code: '[6체01-02]', gradeGroup: '5~6학년군', domain: '운동', subArea: '체력 측정과 수행', text: '체력을 측정하고 자신의 수준에 맞는 운동을 수행한다.', knowledge: '측정 방법', process: '수준별 수행', attitude: '성실함' },
  { code: '[6체01-03]', gradeGroup: '5~6학년군', domain: '운동', subArea: '건강한 생활', text: '영양, 휴식, 운동이 건강에 미치는 영향을 이해하고 실천한다.', knowledge: '영양/휴식 지식', process: '건강 관리 실천', attitude: '자기 관리' },
  { code: '[6체01-04]', gradeGroup: '5~6학년군', domain: '운동', subArea: '질병 예방', text: '비만, 약물 등의 건강 문제를 이해하고 예방한다.', knowledge: '건강 문제 이해', process: '예방 실천', attitude: '건강 의식' },
  { code: '[6체01-05]', gradeGroup: '5~6학년군', domain: '운동', subArea: '체력 운동 실천', text: '체력 운동을 끈기 있게 규칙적으로 수행한다.', knowledge: '운동 계획', process: '규칙적 수행', attitude: '끈기와 인내' },
  // 스포츠 영역
  { code: '[6체02-01]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '기술형 스포츠 이해', text: '기술형 스포츠의 의미와 유형을 이해한다.', knowledge: '기술형 유형', process: '유형 분류', attitude: '관심' },
  { code: '[6체02-02]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '기술형 기본 기능', text: '기술형 스포츠의 기본 기능을 파악하고 수행한다.', knowledge: '기본 기능', process: '기능 수행', attitude: '도전' },
  { code: '[6체02-03]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '기술형 기록 향상', text: '자신의 기록을 향상하기 위해 끈기 있게 노력한다.', knowledge: '기록 관리', process: '기록 향상', attitude: '끈기' },
  { code: '[6체02-04]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '전략형 이해', text: '전략형 스포츠의 의미와 유형을 이해한다.', knowledge: '전략형 유형', process: '유형 분석', attitude: '분석력' },
  { code: '[6체02-05]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '전략형 기본 기능', text: '전략형 스포츠의 기본 기능을 파악하고 기본 전략을 게임에 적용한다.', knowledge: '기본 전략', process: '전략 적용', attitude: '협력' },
  { code: '[6체02-06]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '전략형 게임 적용', text: '전략형 스포츠의 활동 방법과 기본 전략을 게임에 적용한다.', knowledge: '게임 전략', process: '게임 적용', attitude: '페어플레이' },
  { code: '[6체02-07]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '생태형 이해', text: '생태형 스포츠의 의미와 유형을 이해한다.', knowledge: '생태형 유형', process: '유형 탐색', attitude: '자연 존중' },
  { code: '[6체02-08]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '생태형 기본 기능', text: '생태형 스포츠의 기본 기능을 파악하고 수행한다.', knowledge: '기본 기능', process: '자연 속 수행', attitude: '안전 의식' },
  { code: '[6체02-09]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '생태형 도전', text: '바람, 파도 등 자연 요소의 변화에 신체를 적응시키며 지속적으로 도전한다.', knowledge: '자연 환경 이해', process: '적응과 도전', attitude: '도전 정신' },
  { code: '[6체02-10]', gradeGroup: '5~6학년군', domain: '스포츠', subArea: '스포츠 정신', text: '목표 달성을 위해 노력하고 상대의 기술을 인정한다.', knowledge: '스포츠맨십', process: '목표 노력', attitude: '상대 인정' },
  // 표현 영역
  { code: '[6체03-01]', gradeGroup: '5~6학년군', domain: '표현', subArea: '전통 표현', text: '전통 표현의 기본 동작을 파악하고 표현한다.', knowledge: '전통 동작', process: '전통 표현', attitude: '문화 존중' },
  { code: '[6체03-02]', gradeGroup: '5~6학년군', domain: '표현', subArea: '전통 창작', text: '전통 표현의 기본 동작을 변형하여 표현한다.', knowledge: '변형 기법', process: '창작 표현', attitude: '창의성' },
  { code: '[6체03-03]', gradeGroup: '5~6학년군', domain: '표현', subArea: '현대 표현 이해', text: '현대 표현의 의미와 유형을 이해한다.', knowledge: '현대 표현 유형', process: '유형 탐색', attitude: '개방성' },
  { code: '[6체03-04]', gradeGroup: '5~6학년군', domain: '표현', subArea: '스포츠 표현', text: '스포츠 표현의 기본 동작을 파악하고 표현한다.', knowledge: '스포츠 표현', process: '기본 동작 표현', attitude: '신체 자신감' },
  { code: '[6체03-05]', gradeGroup: '5~6학년군', domain: '표현', subArea: '창작 표현', text: '주제에 맞는 동작을 창작하고 발표한다.', knowledge: '창작 방법', process: '창작과 발표', attitude: '자기 표현' },
  { code: '[6체03-06]', gradeGroup: '5~6학년군', domain: '표현', subArea: '현대 표현 기본', text: '현대 표현의 기본 동작을 파악하고 표현한다.', knowledge: '현대 동작', process: '기본 동작 표현', attitude: '감상 태도' },
];

// ─── 전체 성취기준 목록 ───
export const ALL_STANDARDS = [...STANDARDS_3_4, ...STANDARDS_5_6];

// ─── 핵심 역량 ───
export const CORE_COMPETENCIES = [
  { name: '움직임 수행 역량', description: '다양한 움직임을 이해하고 효과적으로 수행하는 능력' },
  { name: '건강 관리 역량', description: '건강한 생활 습관을 형성하고 지속적으로 관리하는 능력' },
  { name: '신체활동 문화 향유 역량', description: '신체활동의 가치를 인식하고 문화적으로 향유하는 능력' },
];

// 교육과정 영역 도메인별 성취기준 검색
export function findStandards(gradeGroup: '3~4학년군' | '5~6학년군', domain?: '운동' | '스포츠' | '표현'): CurriculumStandard[] {
  const pool = gradeGroup === '3~4학년군' ? STANDARDS_3_4 : STANDARDS_5_6;
  if (!domain) return pool;
  return pool.filter(s => s.domain === domain);
}
