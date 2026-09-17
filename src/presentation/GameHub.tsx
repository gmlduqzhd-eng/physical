import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ChevronRight, Filter, BookOpen, Info, Award } from 'lucide-react';
import { EXPRESSION_GAMES } from './components/minigames/expression/expressionGamesData';

export type GradeGroup = '전체' | '1~2학년' | '3~4학년군' | '5~6학년군';
export type PeDomain2022 = '전체' | '운동' | '스포츠' | '표현';
export type SportType = '전체' | '기술형' | '전략형' | '생태형';
export type DeviceType = '스마트폰' | '태블릿 PC' | '데스크톱 PC';
export type DeviceFilter = '전체' | '스마트폰' | '태블릿 PC' | '데스크톱 PC';
export type PlayMode = '개인' | '협동';
export type PlayModeFilter = '전체' | '개인' | '협동';

export interface AchievementStandard {
  code: string; // e.g. '[4체01-02]'
  title: string; // e.g. '기본 체력운동 시도'
  desc: string; // e.g. '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.'
}

export interface GameDef {
  type: string;
  name: string;
  emoji: string;
  desc: string;
  color: string;
  border: string;
  glow: string;
  difficulty: number;
  domain: '운동' | '스포츠' | '표현';
  sportType?: '기술형' | '전략형' | '생태형';
  subCategory: string;
  achievement: AchievementStandard;
  grades: ('1~2학년' | '3~4학년군' | '5~6학년군')[];
  activityType?: '개인' | '짝' | '모둠';
  durationMinutes?: number;
  equipment?: string[];
  safetyTips?: string[];
  physicalActivity?: boolean;
  devices: DeviceType[];
  playMode: PlayMode;
}

const GAMES: GameDef[] = [
  // ==========================================
  // 1. [운동 영역] 체력, 건강, 성장·발달, 생활 습관, 안전
  // ==========================================
  {
    type: 'jump',
    name: '점프왕!',
    emoji: '🦘',
    desc: '폰을 들고 제자리에서 높이 연속 점프!',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '건강 체력 (순발력)',
    achievement: { code: '[4체01-02]', title: '기본 체력운동 시도', desc: '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'squat',
    name: '스쿼트 챌린지',
    emoji: '🏋️',
    desc: '폰을 가슴에 안고 바른 자세로 스쿼트!',
    color: 'from-purple-500 to-indigo-600',
    border: 'border-purple-400/40',
    glow: 'hover:shadow-purple-500/30',
    difficulty: 3,
    domain: '운동',
    subCategory: '건강 체력 (근력·근지구력)',
    achievement: { code: '[6체01-02]', title: '체력 측정 및 운동 수행', desc: '체력을 측정하고 자신의 수준에 맞는 운동을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'run',
    name: '제자리 달리기',
    emoji: '🏃',
    desc: '폰을 손에 쥐고 제자리에서 힘차게 뛰기!',
    color: 'from-green-500 to-emerald-600',
    border: 'border-green-400/40',
    glow: 'hover:shadow-green-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '건강 체력 (심폐지구력)',
    achievement: { code: '[4체01-02]', title: '기본 체력운동 시도', desc: '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'plank',
    name: '플랭크 챌린지',
    emoji: '🧘',
    desc: '폰을 등에 올리고 수평으로 버티기!',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-400/40',
    glow: 'hover:shadow-emerald-500/30',
    difficulty: 3,
    domain: '운동',
    subCategory: '건강 체력 (코어 근력)',
    achievement: { code: '[6체01-05]', title: '체력 운동의 끈기 있는 수행', desc: '체력 운동을 끈기 있게 규칙적으로 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'stretch',
    name: '스트레칭 타이머',
    emoji: '🧘‍♂️',
    desc: '부위별 스트레칭으로 유연성 기르기!',
    color: 'from-teal-500 to-cyan-600',
    border: 'border-teal-400/40',
    glow: 'hover:shadow-teal-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '건강·생활 습관 (유연성)',
    achievement: { code: '[4체01-04]', title: '건강 생활 습관 실천', desc: '건강한 생활 습관을 이해하고 규칙적으로 실천한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'one_leg',
    name: '한 발 서기',
    emoji: '🦩',
    desc: '한 발로 서서 폰의 수평을 20초간 유지!',
    color: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400/40',
    glow: 'hover:shadow-emerald-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '운동 체력 (평형성)',
    achievement: { code: '[6체01-02]', title: '운동 체력(평형성) 측정', desc: '체력을 측정하고 자신의 수준에 맞는 운동을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'tilt_balance',
    name: '균형 잡기',
    emoji: '⚖️',
    desc: '폰을 정밀하게 기울여 구슬을 중앙에 유지!',
    color: 'from-cyan-500 to-slate-600',
    border: 'border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '운동 체력 (평형성·조절)',
    achievement: { code: '[4체01-02]', title: '기본 체력운동 시도', desc: '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'multi_touch',
    name: '양손 터치',
    emoji: '🖐️',
    desc: '화면 양쪽의 버튼을 양손으로 빠르게 터치!',
    color: 'from-violet-500 to-indigo-600',
    border: 'border-violet-400/40',
    glow: 'hover:shadow-violet-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '운동 체력 (양손 협응성)',
    achievement: { code: '[6체01-02]', title: '운동 체력(협응성) 발달', desc: '체력을 측정하고 자신의 수준에 맞는 운동을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC'],
    playMode: '개인'
  },
  {
    type: 'speed_circle',
    name: '빙글빙글!',
    emoji: '🌀',
    desc: '팔을 크게 뻗어 어깨 원운동 10바퀴!',
    color: 'from-cyan-500 to-teal-600',
    border: 'border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '기본 체력운동 (가동성·순발력)',
    achievement: { code: '[4체01-02]', title: '기본 체력운동 시도', desc: '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'fitness',
    name: '체력 룰렛',
    emoji: '🎰',
    desc: '룰렛을 돌려 나오는 랜덤 체육 미션 완수!',
    color: 'from-orange-500 to-red-600',
    border: 'border-orange-400/40',
    glow: 'hover:shadow-orange-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '체력 운동 실천 (종합)',
    achievement: { code: '[4체01-06]', title: '건강 생활 습관 실천', desc: '운동과 건강한 생활 습관 형성에 관심을 갖고 실천한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'shake',
    name: '바운스 충전',
    emoji: '🔋',
    desc: '폰을 흔들거나 연타해서 100% 충전하기!',
    color: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-400/40',
    glow: 'hover:shadow-yellow-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '건강 체력 (순발력)',
    achievement: { code: '[4체01-02]', title: '기본 체력운동 시도', desc: '기본 체력운동의 방법과 절차를 익혀 자신의 수준에 맞게 시도한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'volcano',
    name: '화산 폭발',
    emoji: '🌋',
    desc: '10초 동안 화면을 빠르게 연타하여 게이지 폭발!',
    color: 'from-orange-500 to-red-600',
    border: 'border-orange-400/40',
    glow: 'hover:shadow-orange-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '운동 체력 (순발력·스피드)',
    achievement: { code: '[6체01-01]', title: '운동 체력 요소 탐색', desc: '건강 체력과 운동 체력의 의미·요소를 알고 운동 방법을 탐색한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'reaction',
    name: '반응속도 테스트',
    emoji: '⚡',
    desc: '화면이 초록색으로 바뀌는 순간 빛의 속도로 터치!',
    color: 'from-lime-500 to-green-600',
    border: 'border-lime-400/40',
    glow: 'hover:shadow-lime-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '운동 체력 (민첩성·반응시간)',
    achievement: { code: '[6체01-02]', title: '민첩성 체력 측정·수행', desc: '체력을 측정하고 자신의 수준에 맞는 운동을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'scream',
    name: '소리질러!',
    emoji: '🎤',
    desc: '마이크를 향해 함성을 질러 스트레스 해소!',
    color: 'from-blue-500 to-sky-600',
    border: 'border-blue-400/40',
    glow: 'hover:shadow-blue-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '건강 생활 습관 (정서 관리)',
    achievement: { code: '[4체01-04]', title: '정서 관리 습관 실천', desc: '건강한 생활 습관을 이해하고 규칙적으로 실천한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'arm_raise',
    name: '하늘 높이!',
    emoji: '🙌',
    desc: '팔을 하늘 높이 힘차게 올렸다 내리기 반복!',
    color: 'from-orange-500 to-amber-600',
    border: 'border-orange-400/40',
    glow: 'hover:shadow-orange-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '기본 움직임 (뻗기·버티기)',
    achievement: { code: '[4체01-05]', title: '안전한 기본 움직임', desc: '자신의 신체적 특징을 긍정적으로 인식하고 안전하게 운동한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'wave',
    name: '좌우 흔들기',
    emoji: '👋',
    desc: '상체와 팔을 좌우로 크게 흔들며 스트레칭!',
    color: 'from-pink-500 to-fuchsia-600',
    border: 'border-pink-400/40',
    glow: 'hover:shadow-pink-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '건강·운동 습관 (맨손체조)',
    achievement: { code: '[4체01-04]', title: '맨손체조 생활 실천', desc: '건강한 생활 습관을 이해하고 규칙적으로 실천한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'math',
    name: '계산왕 스프린트',
    emoji: '🔢',
    desc: '20초 안에 빠른 뇌 활성화 사칙연산 풀기!',
    color: 'from-teal-500 to-emerald-600',
    border: 'border-teal-400/40',
    glow: 'hover:shadow-teal-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '뇌건강 인지 운동',
    achievement: { code: '[4체01-01]', title: '신체·두뇌 건강 이해', desc: '운동과 체력의 의미 및 관계를 이해한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'color_word',
    name: '색깔 읽기 챌린지',
    emoji: '🎨',
    desc: '글자의 뜻이 아닌 시각 색상을 구별하는 뇌 협응!',
    color: 'from-pink-500 to-violet-600',
    border: 'border-pink-400/40',
    glow: 'hover:shadow-pink-500/30',
    difficulty: 3,
    domain: '운동',
    subCategory: '신경 협응 인지 운동',
    achievement: { code: '[6체01-01]', title: '신체 협응 요소 탐색', desc: '건강 체력과 운동 체력의 의미·요소를 알고 운동 방법을 탐색한다.' },
    grades: ['5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },

  // ==========================================
  // 2. [스포츠 영역] 기술형 · 전략형 · 생태형
  // ==========================================
  // --- 기술형 (기록형, 동작형, 투기형, 표적 활동) ---
  {
    type: 'target',
    name: '타겟 조준',
    emoji: '🎯',
    desc: '줄어드는 조준원이 가장 작아진 순간 명중!',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-amber-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '표적 활동 (조작 움직임)',
    achievement: { code: '[4체02-05]', title: '기술형 표적 활동 움직임', desc: '기술형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'whack_a_mole',
    name: '별 두더지 잡기',
    emoji: '⭐',
    desc: '3×3 그리드에서 깜빡이는 별 표적을 타격!',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-400/40',
    glow: 'hover:shadow-emerald-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '표적·조작 활동',
    achievement: { code: '[6체02-02]', title: '기술형 스포츠 기본 기능', desc: '기술형 스포츠의 기본 기능을 파악하고 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'stopwatch',
    name: '스탑워치 눈치',
    emoji: '⏱️',
    desc: '정확한 감각으로 목표 시간(7.00초)을 정밀 계측!',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '기록형 활동 (시간 계측)',
    achievement: { code: '[6체02-02]', title: '기록형 스포츠 기능 수행', desc: '기술형 스포츠의 기본 기능을 파악하고 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'left_right',
    name: '좌우 반사신경',
    emoji: '👈👉',
    desc: '표적이 나타난 방향으로 민첩하게 반사 반응!',
    color: 'from-blue-500 to-orange-600',
    border: 'border-blue-400/40',
    glow: 'hover:shadow-blue-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '비이동 반사 움직임',
    achievement: { code: '[4체02-03]', title: '기본 움직임 기술 수행', desc: '움직임 요소에 따라 기본 움직임 기술을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'direction',
    name: '방향 스와이프',
    emoji: '👆',
    desc: '화살표 방향으로 신속하게 스와이프 조작!',
    color: 'from-teal-500 to-cyan-600',
    border: 'border-teal-400/40',
    glow: 'hover:shadow-teal-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '조작 움직임 (방향 전환)',
    achievement: { code: '[4체02-03]', title: '기본 움직임 기술 수행', desc: '움직임 요소에 따라 기본 움직임 기술을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'zone_touch',
    name: '구역 터치 달리기',
    emoji: '🏃‍♂️',
    desc: '사방의 구역 표적을 민첩하게 터치하며 왕복!',
    color: 'from-indigo-500 to-violet-600',
    border: 'border-indigo-400/40',
    glow: 'hover:shadow-indigo-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '이동 움직임 (방향 전환 달리기)',
    achievement: { code: '[4체02-03]', title: '이동 움직임 기술 수행', desc: '움직임 요소에 따라 기본 움직임 기술을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'zigzag',
    name: '지그재그 런!',
    emoji: '⚡',
    desc: '좌우 번갈아 나타나는 지점을 순차적으로 터치!',
    color: 'from-lime-500 to-green-600',
    border: 'border-lime-400/40',
    glow: 'hover:shadow-lime-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '복합 이동 움직임',
    achievement: { code: '[4체02-04]', title: '복합 움직임 기술 수행', desc: '기본 움직임을 연결한 복합 움직임 기술을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'punch',
    name: '에어 펀치!',
    emoji: '🥊',
    desc: '허공을 향해 시원하고 절도 있게 펀치 동작!',
    color: 'from-red-500 to-rose-600',
    border: 'border-red-400/40',
    glow: 'hover:shadow-red-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '투기형 활동 (타격 기술)',
    achievement: { code: '[6체02-02]', title: '투기형 스포츠 기본 기능', desc: '기술형 스포츠의 기본 기능을 파악하고 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'tilt_race',
    name: '기울기 레이스',
    emoji: '📱',
    desc: '폰을 정밀하게 기울여 별 표적을 획득하는 레이스!',
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-400/40',
    glow: 'hover:shadow-sky-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '표적 제어 (조작 움직임)',
    achievement: { code: '[4체02-05]', title: '기술형 스포츠 조작 수행', desc: '기술형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'tug_of_war',
    name: '스마트 줄다리기',
    emoji: '🏋️',
    desc: '상대편과 팽팽한 힘과 연타로 줄다리기 대결!',
    color: 'from-slate-500 to-zinc-600',
    border: 'border-slate-400/40',
    glow: 'hover:shadow-slate-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '대결·투기형 (당기기 힘 겨루기)',
    achievement: { code: '[4체02-05]', title: '기술형 스포츠 움직임', desc: '기술형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },

  // --- 전략형 (공간 탐색, 패턴, 심리 전략 게임) ---
  {
    type: 'number_grid',
    name: '순차적 암호 해제',
    emoji: '🔢',
    desc: '1부터 9까지 최적의 동선을 찾아 빠르게 터치!',
    color: 'from-red-500 to-rose-600',
    border: 'border-red-400/40',
    glow: 'hover:shadow-red-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '공간 탐색 전략 게임',
    achievement: { code: '[4체02-06]', title: '전략형 스포츠 기본 움직임', desc: '전략형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'memory',
    name: '컬러 패턴 기억',
    emoji: '🧠',
    desc: '반짝이는 컬러 시퀀스 패턴을 기억하고 재현!',
    color: 'from-indigo-500 to-purple-600',
    border: 'border-indigo-400/40',
    glow: 'hover:shadow-indigo-500/30',
    difficulty: 3,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '패턴 전략 인지 게임',
    achievement: { code: '[6체02-06]', title: '전략형 게임 전략 적용', desc: '전략형 스포츠의 활동 방법과 기본 전략을 게임에 적용한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'card_match',
    name: '짝 맞추기',
    emoji: '🃏',
    desc: '카드 위치를 전략적으로 기억해 같은 짝 맞추기!',
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-400/40',
    glow: 'hover:shadow-violet-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '시각 공간 전략 게임',
    achievement: { code: '[4체02-06]', title: '전략형 스포츠 참여', desc: '전략형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'balloon',
    name: '풍선 불기',
    emoji: '🎈',
    desc: '터지기 직전의 타이밍을 노려 점수를 수금하는 전략!',
    color: 'from-pink-500 to-rose-600',
    border: 'border-pink-400/40',
    glow: 'hover:shadow-pink-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '위험 판단 심리 전략',
    achievement: { code: '[6체02-06]', title: '전략형 게임 전략 적용', desc: '전략형 스포츠의 활동 방법과 기본 전략을 게임에 적용한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },

  // --- 생태형 (민속놀이, 자연·환경 규칙 놀이) ---
  {
    type: 'red_green',
    name: '무궁화꽃이 피었습니다',
    emoji: '🚦',
    desc: '초록불일 때 전진! 빨간불일 때는 완벽한 얼음!',
    color: 'from-emerald-500 to-red-600',
    border: 'border-emerald-400/40',
    glow: 'hover:shadow-emerald-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '생태형',
    subCategory: '민속놀이 (정지와 이동 신체조절)',
    achievement: { code: '[4체02-07]', title: '생태형 민속놀이 움직임', desc: '생태형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'freeze',
    name: '얼음 땡!',
    emoji: '🧊',
    desc: '신나게 움직이다가 멈춤 신호에 즉시 정지!',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '생태형',
    subCategory: '민속 신체놀이 (규칙 준수)',
    achievement: { code: '[6체02-08]', title: '생태형 민속놀이 기능 수행', desc: '생태형 스포츠의 기본 기능을 파악하고 수행한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'coin_flip',
    name: '동전 뒤집기',
    emoji: '🪙',
    desc: '앞/뒤 예측과 승부의 규칙을 지키는 전통 동전 놀이!',
    color: 'from-amber-500 to-yellow-600',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-amber-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '생태형',
    subCategory: '전통 놀이 (규칙 준수)',
    achievement: { code: '[4체02-09]', title: '게임 최선 및 규칙 준수', desc: '게임에 최선을 다하고 규칙을 지킨다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'fate_card',
    name: '운명의 카드',
    emoji: '🃏',
    desc: '카드 선택으로 승패를 인정하고 즐기는 놀이 문화!',
    color: 'from-fuchsia-500 to-purple-600',
    border: 'border-fuchsia-400/40',
    glow: 'hover:shadow-fuchsia-500/30',
    difficulty: 1,
    domain: '스포츠',
    sportType: '생태형',
    subCategory: '생활 여가 놀이 (상대 인정)',
    achievement: { code: '[6체02-10]', title: '목표 노력 및 상대 인정', desc: '목표 달성을 위해 노력하고 상대의 기술을 인정한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },

  // ==========================================
  // 3. [표현 영역] 기본 움직임 표현, 스포츠·전통·현대 표현
  // ==========================================
  {
    type: 'dance_pose',
    name: '댄스 포즈',
    emoji: '💃',
    desc: '화면 지시에 맞춰 개성 넘치는 포즈를 표현!',
    color: 'from-fuchsia-500 to-pink-600',
    border: 'border-fuchsia-400/40',
    glow: 'hover:shadow-fuchsia-500/30',
    difficulty: 1,
    domain: '표현',
    subCategory: '현대 표현 (라인댄스·동작)',
    achievement: { code: '[6체03-06]', title: '현대 표현 기본 동작', desc: '현대 표현의 기본 동작을 파악하고 표현한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'animal',
    name: '동물 체조',
    emoji: '🐾',
    desc: '토끼뜀, 곰걸음 등 동물들의 움직임을 모방 표현!',
    color: 'from-amber-500 to-yellow-600',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-amber-500/30',
    difficulty: 1,
    domain: '표현',
    subCategory: '사물·자연 모방 표현',
    achievement: { code: '[4체03-03]', title: '사물·자연 모방 표현', desc: '사물이나 자연을 움직임으로 모방하여 표현한다.' },
    grades: ['1~2학년', '3~4학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'circle_draw',
    name: '원 그리기 대결',
    emoji: '⭕',
    desc: '팔을 부드럽고 크게 뻗어 공간에 원형 궤적 표현!',
    color: 'from-rose-500 to-pink-600',
    border: 'border-rose-400/40',
    glow: 'hover:shadow-rose-500/30',
    difficulty: 2,
    domain: '표현',
    subCategory: '움직임 요소 표현 (공간·궤적)',
    achievement: { code: '[4체03-02]', title: '움직임 요소 표현 탐색', desc: '움직임 요소에 따른 표현 방법을 탐색하고 시도한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC'],
    playMode: '개인'
  },
  {
    type: 'trace_shape',
    name: '도형 따라 그리기',
    emoji: '✏️',
    desc: '별, 하트, 삼각형 등의 윤곽을 신체로 따라 그리기!',
    color: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400/40',
    glow: 'hover:shadow-emerald-500/30',
    difficulty: 2,
    domain: '표현',
    subCategory: '도구 및 형태 표현',
    achievement: { code: '[4체03-06]', title: '도구 활용 움직임 표현', desc: '도구를 활용하여 움직임을 표현한다.' },
    grades: ['1~2학년', '3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'body_twist',
    name: '몸 비틀기!',
    emoji: '🔄',
    desc: '몸을 좌우로 비틀며 회전 리듬을 신체로 표현!',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-amber-500/30',
    difficulty: 2,
    domain: '표현',
    subCategory: '기초 신체 표현 (회전·비틀기)',
    achievement: { code: '[4체03-05]', title: '기본 움직임 리듬 표현', desc: '기본 움직임을 리듬에 맞춰 표현한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    devices: ['스마트폰','태블릿 PC'],
    playMode: '개인'
  },

  // ==========================================
  // [신규 신체활동 게임 8종]
  // ==========================================
  // --- 신규 운동 영역 (2종) ---
  {
    type: 'pulse-detective',
    name: '심박 탐정단',
    emoji: '🔍',
    desc: '안정 시, 운동 직후, 회복 후 15초 맥박 변화를 탐색!',
    color: 'from-rose-500 to-red-600',
    border: 'border-rose-400/40',
    glow: 'hover:shadow-rose-500/30',
    difficulty: 2,
    domain: '운동',
    subCategory: '건강 체력 (심폐지구력·신체변화)',
    achievement: { code: '[6체01-01]', title: '운동 전후 신체 변화 탐색', desc: '건강 체력과 운동 체력의 의미·요소를 알고 운동 방법을 탐색한다.' },
    grades: ['5~6학년군'],
    activityType: '개인',
    durationMinutes: 4,
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'posture-guardian',
    name: '자세 수호 로봇',
    emoji: '🤖',
    desc: '의자 앉기, 짐 들기 등 5대 바른 자세를 10초씩 유지 수리!',
    color: 'from-indigo-500 to-blue-600',
    border: 'border-indigo-400/40',
    glow: 'hover:shadow-indigo-500/30',
    difficulty: 1,
    domain: '운동',
    subCategory: '건강·안전 생활 습관 (바른 자세)',
    achievement: { code: '[4체01-04]', title: '건강한 생활 습관 실천', desc: '건강한 생활 습관을 이해하고 규칙적으로 실천한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    activityType: '개인',
    durationMinutes: 4,
    equipment: ['의자 또는 가벼운 물건'],
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },

  // --- 신규 스포츠 영역 (4종) ---
  {
    type: 'rolling-curling',
    name: '공 굴림 컬링 원정',
    emoji: '🥌',
    desc: '실제 공을 바닥 표적으로 굴려 5회 시도 점수와 힘 조절 분석!',
    color: 'from-amber-500 to-yellow-600',
    border: 'border-amber-400/40',
    glow: 'hover:shadow-amber-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '기술형',
    subCategory: '표적 활동 (힘 조절 조작)',
    achievement: { code: '[4체02-05]', title: '기술형 표적 활동 기본 움직임', desc: '기술형 스포츠에 적합한 기본 움직임을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    activityType: '개인',
    durationMinutes: 5,
    equipment: ['공 1개', '바닥 표적'],
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'pass-gate-rescue',
    name: '패스 게이트 구조대',
    emoji: '🥅',
    desc: '콘 게이트 사이로 모둠원 전원이 협력 패스를 성공시키는 미션!',
    color: 'from-blue-500 to-cyan-600',
    border: 'border-blue-400/40',
    glow: 'hover:shadow-blue-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '협력 패스 전략 (모둠)',
    achievement: { code: '[4체02-06]', title: '전략형 스포츠 기본 움직임과 배려', desc: '전략형 스포츠에 적합한 기본 움직임을 수행하고 팀원과 협력한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    activityType: '모둠',
    durationMinutes: 5,
    equipment: ['공 1개', '콘 4~6개'],
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'dribble-rhythm',
    name: '드리블 박자 공장',
    emoji: '🥁',
    desc: '메트로놈 박자(60/90/120 BPM)에 맞춰 20초간 안정적 공 통제!',
    color: 'from-orange-500 to-amber-600',
    border: 'border-orange-400/40',
    glow: 'hover:shadow-orange-500/30',
    difficulty: 2,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '조작 움직임 (리듬 드리블)',
    achievement: { code: '[4체02-03]', title: '기본 움직임 기술 수행', desc: '움직임 요소에 따라 기본 움직임 기술을 수행한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    activityType: '개인',
    durationMinutes: 4,
    equipment: ['공 1개'],
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '개인'
  },
  {
    type: 'open-space-tactician',
    name: '빈 공간 설계자',
    emoji: '🗺️',
    desc: '미니 전술판에서 빈 공간 침투 경로를 설계하고 실전 1분 실행!',
    color: 'from-cyan-500 to-teal-600',
    border: 'border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 3,
    domain: '스포츠',
    sportType: '전략형',
    subCategory: '공간 침투 전술 (영역형/네트형)',
    achievement: { code: '[6체02-05]', title: '전략형 스포츠 기본 기능 및 전략 적용', desc: '전략형 스포츠의 기본 기능을 파악하고 기본 전략을 게임에 적용한다.' },
    grades: ['5~6학년군'],
    activityType: '모둠',
    durationMinutes: 5,
    equipment: ['공', '콘'],
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },

  // --- 신규 표현 영역 (2종) ---
  {
    type: 'emotion-thermometer',
    name: '감정 온도계',
    emoji: '🌡️',
    desc: '선택한 감정과 온도를 15초간 온몸으로 표현하고 짝과 감상 나누기!',
    color: 'from-purple-500 to-pink-600',
    border: 'border-purple-400/40',
    glow: 'hover:shadow-purple-500/30',
    difficulty: 1,
    domain: '표현',
    subCategory: '신체 감정 표현 및 감상',
    achievement: { code: '[4체03-04]', title: '느낌과 생각의 움직임 표현', desc: '느낌과 생각을 움직임으로 표현하고 서로의 움직임을 감상한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    activityType: '짝',
    durationMinutes: 4,
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  {
    type: 'partner-robot-lab',
    name: '파트너 로봇 연구소',
    emoji: '🤖',
    desc: '팔·다리·몸통 카드를 조합해 시퀀스를 만들고 짝과 교대로 로봇 표현!',
    color: 'from-fuchsia-500 to-purple-600',
    border: 'border-fuchsia-400/40',
    glow: 'hover:shadow-fuchsia-500/30',
    difficulty: 2,
    domain: '표현',
    subCategory: '신체 부위별 창의 표현 (짝)',
    achievement: { code: '[4체03-02]', title: '움직임 요소에 따른 표현 탐색', desc: '움직임 요소에 따른 표현 방법을 탐색하고 시도한다.' },
    grades: ['3~4학년군', '5~6학년군'],
    activityType: '짝',
    durationMinutes: 4,
    physicalActivity: true,
    devices: ['스마트폰','태블릿 PC','데스크톱 PC'],
    playMode: '협동'
  },
  ...EXPRESSION_GAMES.map(eg => ({
    type: eg.id,
    name: eg.name,
    emoji: eg.emoji,
    desc: eg.desc,
    color: 'from-purple-500 to-indigo-600',
    border: 'border-purple-400/40',
    glow: 'hover:shadow-purple-500/30',
    difficulty: 2,
    domain: '표현' as const,
    subCategory: eg.subCategory,
    achievement: eg.achievement,
    grades: eg.grades,
    activityType: (eg.playMode === '협동' ? '모둠' : '개인') as '개인' | '짝' | '모둠',
    durationMinutes: 3,
    physicalActivity: true,
    devices: eg.devices,
    playMode: eg.playMode,
  })),
];

const GRADE_GROUPS: { key: GradeGroup; label: string; badge: string; desc: string }[] = [
  { key: '전체', label: '전체 학년', badge: 'ALL', desc: '모든 학년군' },
  { key: '1~2학년', label: '1~2학년', badge: '즐거운 생활', desc: '놀이·신체활동 통합' },
  { key: '3~4학년군', label: '3~4학년군', badge: '초등 중학년', desc: '기본 움직임·기초 체력' },
  { key: '5~6학년군', label: '5~6학년군', badge: '초등 고학년', desc: '체력 분석·전략 응용' },
];

const PE_DOMAINS: {
  key: PeDomain2022;
  emoji: string;
  badge: string;
  color: string;
  activeBg: string;
  border: string;
  desc: string;
}[] = [
  {
    key: '전체',
    emoji: '🌟',
    badge: '전체 보기',
    color: 'text-slate-200',
    activeBg: 'bg-slate-700 text-white border-slate-500',
    border: 'border-slate-700',
    desc: '2022 개정 교육과정 전체 체육활동'
  },
  {
    key: '운동',
    emoji: '🏃',
    badge: '운동 영역',
    color: 'text-emerald-400',
    activeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/40',
    border: 'border-emerald-500/30',
    desc: '체력, 건강, 성장·발달, 생활 습관, 안전'
  },
  {
    key: '스포츠',
    emoji: '⚽',
    badge: '스포츠 영역',
    color: 'text-blue-400',
    activeBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-lg shadow-blue-900/40',
    border: 'border-blue-500/30',
    desc: '기술형 · 전략형 · 생태형 스포츠'
  },
  {
    key: '표현',
    emoji: '🎭',
    badge: '표현 영역',
    color: 'text-purple-400',
    activeBg: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 shadow-lg shadow-purple-900/40',
    border: 'border-purple-500/30',
    desc: '기본 움직임 표현, 스포츠·전통·현대 표현'
  },
];

const SPORT_SUB_TYPES: { key: SportType; label: string; emoji: string }[] = [
  { key: '전체', label: '전체 스포츠', emoji: '🏆' },
  { key: '기술형', label: '기술형 (표적·기록·투기)', emoji: '🎯' },
  { key: '전략형', label: '전략형 (영역·필드·전략)', emoji: '🧠' },
  { key: '생태형', label: '생태형 (민속·환경·놀이)', emoji: '🌿' },
];

const DEVICE_FILTERS: { key: DeviceFilter; label: string; emoji: string }[] = [
  { key: '전체', label: '전체 기기', emoji: '💻' },
  { key: '스마트폰', label: '스마트폰', emoji: '📱' },
  { key: '태블릿 PC', label: '태블릿 PC', emoji: '📟' },
  { key: '데스크톱 PC', label: '데스크톱 PC', emoji: '🖥️' },
];

const PLAY_MODE_FILTERS: { key: PlayModeFilter; label: string; emoji: string }[] = [
  { key: '전체', label: '전체 형태', emoji: '🎮' },
  { key: '개인', label: '개인 게임', emoji: '👤' },
  { key: '협동', label: '협동 게임', emoji: '🤝' },
];

export const GameHub = () => {
  const navigate = useNavigate();
  const [gradeFilter, setGradeFilter] = useState<GradeGroup>('전체');
  const [domainFilter, setDomainFilter] = useState<PeDomain2022>('전체');
  const [sportFilter, setSportFilter] = useState<SportType>('전체');
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('전체');
  const [playModeFilter, setPlayModeFilter] = useState<PlayModeFilter>('전체');
  const [activeAchievement, setActiveAchievement] = useState<AchievementStandard | null>(null);

  const filtered = GAMES.filter(g => {
    const gradeMatch = gradeFilter === '전체' || g.grades.includes(gradeFilter);
    const domainMatch = domainFilter === '전체' || g.domain === domainFilter;
    const sportMatch = domainFilter !== '스포츠' || sportFilter === '전체' || g.sportType === sportFilter;
    const deviceMatch = deviceFilter === '전체' || g.devices.includes(deviceFilter as DeviceType);
    const playModeMatch = playModeFilter === '전체' || g.playMode === playModeFilter;
    return gradeMatch && domainMatch && sportMatch && deviceMatch && playModeMatch;
  });

  const hasActiveFilter = domainFilter !== '전체' || sportFilter !== '전체' || gradeFilter !== '전체' || deviceFilter !== '전체' || playModeFilter !== '전체';
  const resetAllFilters = () => {
    setDomainFilter('전체');
    setSportFilter('전체');
    setGradeFilter('전체');
    setDeviceFilter('전체');
    setPlayModeFilter('전체');
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans overflow-y-auto">
      {/* 성취기준 상세 모달 */}
      {activeAchievement && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveAchievement(null)}
        >
          <div
            className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 font-mono font-black text-sm rounded-lg border border-cyan-500/30">
                {activeAchievement.code}
              </span>
              <span className="text-xs font-bold text-slate-400">2022 개정 초등 체육과 교육과정</span>
            </div>
            <h3 className="text-xl font-black text-white mb-2">{activeAchievement.title}</h3>
            <p className="text-sm text-slate-300 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 leading-relaxed">
              &ldquo;{activeAchievement.desc}&rdquo;
            </p>
            <button
              onClick={() => setActiveAchievement(null)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-sm text-white shadow-lg"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[220px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col items-center pt-8 pb-5 px-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-3">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300">2022 개정 교육과정 초등 체육과 연계</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 text-center">
            땀방울 원정대
          </h1>
          <p className="text-slate-400 font-medium mt-1.5 text-center text-xs md:text-sm max-w-xl">
            초등 2022 개정 체육과 3대 영역(<span className="text-emerald-400 font-bold">운동</span> · <span className="text-blue-400 font-bold">스포츠</span> · <span className="text-purple-400 font-bold">표현</span>) 및 성취기준에 맞춘 스마트 체육 미니게임 플랫폼
          </p>
        </div>
      </div>

      {/* 대영역 선택 (운동 · 스포츠 · 표현) */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-5 mb-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> 2022 개정 체육과 영역
          </h2>
          <span className="text-[11px] text-slate-500">교육부 고시 제2022-33호 기반</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PE_DOMAINS.map(d => {
            const isSelected = domainFilter === d.key;
            return (
              <button
                key={d.key}
                onClick={() => {
                  setDomainFilter(d.key);
                  if (d.key !== '스포츠') setSportFilter('전체');
                }}
                className={`p-3 rounded-2xl text-left transition-all border relative overflow-hidden ${
                  isSelected
                    ? d.activeBg
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/90'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{d.emoji}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {d.key === '전체' ? `${GAMES.length}종` : `${GAMES.filter(g => g.domain === d.key).length}종`}
                  </span>
                </div>
                <div className="font-black text-sm">{d.key}</div>
                <div className={`text-[10px] font-medium truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                  {d.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 스포츠 영역 선택 시 세부 유형 (기술형 / 전략형 / 생태형) */}
      {domainFilter === '스포츠' && (
        <div className="px-4 md:px-8 max-w-5xl mx-auto mb-4 animate-in fade-in duration-200">
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-500/20">
            <h3 className="text-xs font-bold text-blue-300 mb-2 px-1 flex items-center gap-1.5">
              <span>⚽</span> 스포츠 세부 유형 (기술형 · 전략형 · 생태형)
            </h3>
            <div className="flex flex-wrap gap-2">
              {SPORT_SUB_TYPES.map(st => (
                <button
                  key={st.key}
                  onClick={() => setSportFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    sportFilter === st.key
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{st.emoji}</span> {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 필터 그룹: 기기 지원 / 활동 형태 / 학년군 */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto mb-4 space-y-2.5 overflow-hidden">
        {/* 기기 분류 (스마트폰 · 태블릿 PC · 데스크톱 PC) */}
        <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-300 px-1 flex items-center gap-1.5">
              <span>🖥️</span> 지원 기기 분류
            </h2>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              스마트폰 · 태블릿 PC · 데스크톱 PC
            </span>
          </div>
          <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
            {DEVICE_FILTERS.map(d => {
              const count = d.key === '전체' 
                ? GAMES.length 
                : GAMES.filter(g => g.devices.includes(d.key as DeviceType)).length;
              const isSelected = deviceFilter === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDeviceFilter(d.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-md shadow-emerald-900/30'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{d.emoji}</span>
                  <span>{d.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 활동 형태 (개인/협동) & 학년군 선택 (2열 레이아웃) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-hidden">
          {/* 활동 형태 */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
            <h2 className="text-xs font-bold text-slate-300 mb-2 px-1 flex items-center gap-1.5">
              <span>👥</span> 활동 형태 (개인 / 협동)
            </h2>
            <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
              {PLAY_MODE_FILTERS.map(pm => {
                const count = pm.key === '전체'
                  ? GAMES.length
                  : GAMES.filter(g => g.playMode === pm.key).length;
                const isSelected = playModeFilter === pm.key;
                return (
                  <button
                    key={pm.key}
                    type="button"
                    onClick={() => setPlayModeFilter(pm.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white shadow-md shadow-amber-900/30'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{pm.emoji}</span>
                    <span>{pm.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 학년군 선택 */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
            <h2 className="text-xs font-bold text-slate-300 mb-2 px-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> 학년군 선택
            </h2>
            <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
              {GRADE_GROUPS.map(g => {
                const count = g.key === '전체'
                  ? GAMES.length
                  : GAMES.filter(game => game.grades.includes(g.key as any)).length;
                const isSelected = gradeFilter === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGradeFilter(g.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{g.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-800 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 결과 카운트 및 안내 */}
      <div className="px-5 md:px-9 max-w-5xl mx-auto mb-3 flex items-center justify-between text-xs text-slate-400">
        <div className="font-bold flex items-center gap-2">
          <span>검색 결과 <strong className="text-cyan-400 font-black text-sm">{filtered.length}</strong> / {GAMES.length}개 게임</span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-400 hover:text-cyan-300 border border-slate-700 transition-colors"
            >
              필터 초기화 ↺
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          💡 성취기준 코드를 클릭하면 세부 목표를 볼 수 있습니다
        </span>
      </div>

      {/* Game Grid */}
      <div className="px-4 md:px-8 pb-8 max-w-5xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600 bg-slate-900/40 rounded-3xl border border-slate-800">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="font-bold text-slate-400">해당 조건에 일치하는 게임이 없습니다.</p>
            <p className="text-xs text-slate-500 mt-1">영역이나 학년군 필터를 변경해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map(game => {
              const domainInfo = PE_DOMAINS.find(d => d.key === game.domain)!;
              return (
                <div
                  key={game.type}
                  className={`group relative bg-slate-900/90 backdrop-blur-sm border ${game.border} rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.015] hover:shadow-xl ${game.glow} overflow-hidden flex flex-col justify-between`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

                  <div>
                    {/* 상단 성취기준 태그 & 활동 형태 & 영역 태그 */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAchievement(game.achievement);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300 transition-colors"
                          title="성취기준 상세 보기"
                        >
                          <Info className="w-2.5 h-2.5" />
                          <span>{game.achievement.code}</span>
                        </button>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                          game.playMode === '협동'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                        }`}>
                          {game.playMode === '협동' ? '🤝 협동' : '👤 개인'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          game.domain === '운동' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' :
                          game.domain === '스포츠' ? 'bg-blue-950 text-blue-300 border border-blue-800/50' :
                          'bg-purple-950 text-purple-300 border border-purple-800/50'
                        }`}>
                          {domainInfo.emoji} {game.domain}
                          {game.sportType && ` · ${game.sportType}`}
                        </span>
                      </div>
                    </div>

                    {/* 아이콘 및 게임명 */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shrink-0 shadow-lg text-2xl group-hover:scale-105 transition-transform`}>
                        {game.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base text-white truncate group-hover:text-cyan-300 transition-colors">
                          {game.name}
                        </h3>
                        <p className="text-slate-400 text-xs font-medium line-clamp-1 mt-0.5">
                          {game.desc}
                        </p>
                      </div>
                    </div>

                    {/* 세부 활동 카테고리 & 성취기준 요지 */}
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 mb-3">
                      <div className="text-[11px] font-bold text-slate-300 truncate">
                        🎯 {game.subCategory}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {game.achievement.title}
                      </div>
                    </div>
                  </div>

                  {/* 하단 학년군, 기기 아이콘 & 시작 버튼 */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        {game.grades.map(gr => (
                          <span key={gr} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/60">
                            {gr}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/70" title={`지원 기기: ${game.devices.join(', ')}`}>
                        {game.devices.includes('스마트폰') && <span title="스마트폰 지원">📱</span>}
                        {game.devices.includes('태블릿 PC') && <span title="태블릿 PC 지원">📟</span>}
                        {game.devices.includes('데스크톱 PC') && <span title="데스크톱 PC 지원">🖥️</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/play/${game.type}`)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1 active:scale-95 transition-all shrink-0"
                    >
                      시작 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 md:px-8 pb-10 max-w-5xl mx-auto">
        <div className="border-t border-slate-800/80 pt-6 flex justify-center items-center">
          <Link to="/manual" className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl text-xs font-bold transition-all border border-slate-800 shadow-md hover:border-cyan-500/40">
            <BookOpen className="w-4 h-4 text-cyan-400" /> 사용 설명서
          </Link>
        </div>
        <p className="text-center text-slate-600 text-[11px] font-medium mt-4">
          땀방울 원정대 ⓒ2026. 엽쌤 All rights reserved.
        </p>
      </div>
    </div>
  );
};
