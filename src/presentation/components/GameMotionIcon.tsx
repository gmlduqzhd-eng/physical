import React from 'react';
import {
  Zap,
  Dumbbell,
  Footprints,
  Shield,
  ShieldCheck,
  Activity,
  Compass,
  Scale,
  MousePointerClick,
  RefreshCw,
  Waves,
  Flame,
  Timer,
  Volume2,
  ArrowUp,
  Brain,
  Target,
  Clock,
  MoveHorizontal,
  Grid,
  Swords,
  Gauge,
  Users,
  Dices,
  Wind,
  Eye,
  Coins,
  Sparkles,
  Music,
  Smile,
  Circle,
  Shapes,
  HeartPulse,
  Crosshair,
  CircleDot,
  Bot,
  Trophy,
  Hammer,
  type LucideIcon
} from 'lucide-react';

interface GameMotionMeta {
  Icon: LucideIcon;
  badgeText: string;
  badgeColor: string; // e.g., 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  iconColor: string;  // e.g., 'text-amber-400'
  glowColor: string;  // e.g., 'from-amber-500/20 via-orange-500/10 to-red-500/10'
  borderColor: string;
}

const MOTION_MAP: Record<string, GameMotionMeta> = {
  // 1. 기초 체력 & 폭발력 (순발력, 스피드)
  jump: {
    Icon: Zap,
    badgeText: '⚡ 순발력',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-orange-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  run: {
    Icon: Footprints,
    badgeText: '🏃 심폐지구',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  volcano: {
    Icon: Flame,
    badgeText: '💥 폭발력',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    iconColor: 'text-red-400',
    glowColor: 'from-red-500/30 via-rose-500/15 to-transparent',
    borderColor: 'border-red-400/50',
  },

  // 2. 근력 & 코어 버닝
  squat: {
    Icon: Dumbbell,
    badgeText: '🔥 하체근력',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
    glowColor: 'from-purple-500/30 via-indigo-500/15 to-transparent',
    borderColor: 'border-purple-400/50',
  },
  plank: {
    Icon: Shield,
    badgeText: '🛡️ 코어버티기',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    iconColor: 'text-teal-400',
    glowColor: 'from-teal-500/30 via-emerald-500/15 to-transparent',
    borderColor: 'border-teal-400/50',
  },
  punch: {
    Icon: Swords,
    badgeText: '🥊 펀치순발',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    iconColor: 'text-rose-400',
    glowColor: 'from-rose-500/30 via-red-500/15 to-transparent',
    borderColor: 'border-rose-400/50',
  },
  arm_raise: {
    Icon: ArrowUp,
    badgeText: '💪 상체지구',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconColor: 'text-blue-400',
    glowColor: 'from-blue-500/30 via-cyan-500/15 to-transparent',
    borderColor: 'border-blue-400/50',
  },

  // 3. 평형성 & 밸런스 & 유연성
  one_leg: {
    Icon: Compass,
    badgeText: '⚖️ 외발균형',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-green-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  tilt_balance: {
    Icon: Scale,
    badgeText: '⚖️ 정밀수평',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  stretch: {
    Icon: Activity,
    badgeText: '🧘 유연성',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    iconColor: 'text-teal-400',
    glowColor: 'from-teal-500/30 via-cyan-500/15 to-transparent',
    borderColor: 'border-teal-400/50',
  },
  body_twist: {
    Icon: RefreshCw,
    badgeText: '🌀 전신비틀기',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    glowColor: 'from-indigo-500/30 via-purple-500/15 to-transparent',
    borderColor: 'border-indigo-400/50',
  },

  // 4. 민첩성 & 반응속도 & 협응성
  multi_touch: {
    Icon: MousePointerClick,
    badgeText: '🎯 양손협응',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    glowColor: 'from-indigo-500/30 via-sky-500/15 to-transparent',
    borderColor: 'border-indigo-400/50',
  },
  speed_circle: {
    Icon: RefreshCw,
    badgeText: '🔄 어깨회전',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
    glowColor: 'from-sky-500/30 via-cyan-500/15 to-transparent',
    borderColor: 'border-sky-400/50',
  },
  reaction: {
    Icon: Timer,
    badgeText: '⏱️ 반응민첩',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    glowColor: 'from-yellow-500/30 via-amber-500/15 to-transparent',
    borderColor: 'border-yellow-400/50',
  },
  shake: {
    Icon: Waves,
    badgeText: '🌊 진동모션',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  scream: {
    Icon: Volume2,
    badgeText: '📢 함성폐활',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    iconColor: 'text-orange-400',
    glowColor: 'from-orange-500/30 via-red-500/15 to-transparent',
    borderColor: 'border-orange-400/50',
  },
  left_right: {
    Icon: MoveHorizontal,
    badgeText: '↔️ 방향전환',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    iconColor: 'text-violet-400',
    glowColor: 'from-violet-500/30 via-purple-500/15 to-transparent',
    borderColor: 'border-violet-400/50',
  },
  target: {
    Icon: Target,
    badgeText: '🎯 타겟적중',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    iconColor: 'text-rose-400',
    glowColor: 'from-rose-500/30 via-pink-500/15 to-transparent',
    borderColor: 'border-rose-400/50',
  },
  zone_touch: {
    Icon: Grid,
    badgeText: '🔲 구역스피드',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconColor: 'text-blue-400',
    glowColor: 'from-blue-500/30 via-cyan-500/15 to-transparent',
    borderColor: 'border-blue-400/50',
  },
  stopwatch: {
    Icon: Clock,
    badgeText: '⏱️ 초감각',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    iconColor: 'text-slate-300',
    glowColor: 'from-slate-500/30 via-gray-500/15 to-transparent',
    borderColor: 'border-slate-400/50',
  },

  // 5. 스포츠 & 구기 & 전술
  'pass-gate-rescue': {
    Icon: Crosshair,
    badgeText: '⚽ 패스전술',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  'dribble-rhythm': {
    Icon: CircleDot,
    badgeText: '🏀 리듬드리블',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    iconColor: 'text-orange-400',
    glowColor: 'from-orange-500/30 via-amber-500/15 to-transparent',
    borderColor: 'border-orange-400/50',
  },
  'rolling-curling': {
    Icon: Target,
    badgeText: '🥌 표적투구',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  'open-space-tactician': {
    Icon: Users,
    badgeText: '🏃 공간전술',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconColor: 'text-blue-400',
    glowColor: 'from-blue-500/30 via-indigo-500/15 to-transparent',
    borderColor: 'border-blue-400/50',
  },
  tilt_race: {
    Icon: Gauge,
    badgeText: '🏎️ 레이싱조절',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  tug_of_war: {
    Icon: Users,
    badgeText: '🤝 협동줄다리기',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    iconColor: 'text-red-400',
    glowColor: 'from-red-500/30 via-orange-500/15 to-transparent',
    borderColor: 'border-red-400/50',
  },

  // 6. 건강 진단 & 자세
  'pulse-detective': {
    Icon: HeartPulse,
    badgeText: '❤️ 심박탐정',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    iconColor: 'text-rose-400',
    glowColor: 'from-rose-500/30 via-red-500/15 to-transparent',
    borderColor: 'border-rose-400/50',
  },
  'posture-guardian': {
    Icon: ShieldCheck,
    badgeText: '🛡️ 바른자세',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-cyan-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },

  // 7. 표현 & 리듬 & 창작
  dance_pose: {
    Icon: Music,
    badgeText: '💃 댄스포즈',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
    glowColor: 'from-pink-500/30 via-rose-500/15 to-transparent',
    borderColor: 'border-pink-400/50',
  },
  animal: {
    Icon: Smile,
    badgeText: '🐾 모방표현',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  circle_draw: {
    Icon: Circle,
    badgeText: '⭕ 궤적표현',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
    glowColor: 'from-purple-500/30 via-pink-500/15 to-transparent',
    borderColor: 'border-purple-400/50',
  },
  trace_shape: {
    Icon: Shapes,
    badgeText: '📐 도형표현',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    glowColor: 'from-indigo-500/30 via-cyan-500/15 to-transparent',
    borderColor: 'border-indigo-400/50',
  },
  'emotion-thermometer': {
    Icon: Smile,
    badgeText: '🎭 감정표현',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
    glowColor: 'from-pink-500/30 via-rose-500/15 to-transparent',
    borderColor: 'border-pink-400/50',
  },
  'partner-robot-lab': {
    Icon: Bot,
    badgeText: '🤖 신체코딩',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },

  // 8. 뇌신체 융합 & 협응
  math: {
    Icon: Brain,
    badgeText: '🧠 두뇌순발',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
    glowColor: 'from-purple-500/30 via-indigo-500/15 to-transparent',
    borderColor: 'border-purple-400/50',
  },
  color_word: {
    Icon: Brain,
    badgeText: '🧠 스트룹인지',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    glowColor: 'from-indigo-500/30 via-sky-500/15 to-transparent',
    borderColor: 'border-indigo-400/50',
  },
  memory: {
    Icon: Brain,
    badgeText: '🧠 동작기억',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
    glowColor: 'from-pink-500/30 via-purple-500/15 to-transparent',
    borderColor: 'border-pink-400/50',
  },
  card_match: {
    Icon: Dices,
    badgeText: '🃏 짝맞추기',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  balloon: {
    Icon: Wind,
    badgeText: '🎈 체공제어',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
    glowColor: 'from-sky-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-sky-400/50',
  },
  red_green: {
    Icon: Eye,
    badgeText: '🚦 정지제어',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    iconColor: 'text-rose-400',
    glowColor: 'from-rose-500/30 via-emerald-500/15 to-transparent',
    borderColor: 'border-rose-400/50',
  },
  coin_flip: {
    Icon: Coins,
    badgeText: '🪙 운신체',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    glowColor: 'from-yellow-500/30 via-amber-500/15 to-transparent',
    borderColor: 'border-yellow-400/50',
  },
  fate_card: {
    Icon: Sparkles,
    badgeText: '✨ 포춘미션',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
    glowColor: 'from-purple-500/30 via-pink-500/15 to-transparent',
    borderColor: 'border-purple-400/50',
  },

  // 9. 생태형 & 야외 활동
  'compass-azimuth': {
    Icon: Compass,
    badgeText: '🧭 방위조준',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  'kayak-paddle': {
    Icon: Waves,
    badgeText: '🛶 교차패들',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  'wind-surf-balance': {
    Icon: Wind,
    badgeText: '🏄 에어로수평',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
    glowColor: 'from-sky-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-sky-400/50',
  },
  'tent-peg-hammer': {
    Icon: Hammer,
    badgeText: '⛺ 팩해머링',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  'trail-maze-run': {
    Icon: Footprints,
    badgeText: '🏃 산악질주',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-emerald-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  'alpine-glider': {
    Icon: Wind,
    badgeText: '🪂 기류활강',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
    glowColor: 'from-sky-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-sky-400/50',
  },
  'campfire-breath': {
    Icon: Flame,
    badgeText: '🔥 호흡이완',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    iconColor: 'text-orange-400',
    glowColor: 'from-orange-500/30 via-amber-500/15 to-transparent',
    borderColor: 'border-orange-400/50',
  },
  'crevasse-jump': {
    Icon: Zap,
    badgeText: '🧗 빙판도약',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },

  // 10. 전략형 & 구기 & 신규 스포츠
  'slingshot-archery': {
    Icon: Target,
    badgeText: '🎯 포물선양궁',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    glowColor: 'from-yellow-500/30 via-amber-500/15 to-transparent',
    borderColor: 'border-yellow-400/50',
  },
  'spike-block-wall': {
    Icon: Shield,
    badgeText: '🏐 블로킹수비',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    glowColor: 'from-indigo-500/30 via-purple-500/15 to-transparent',
    borderColor: 'border-indigo-400/50',
  },
  'base-running-decide': {
    Icon: Footprints,
    badgeText: '⚾ 주루판단',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-orange-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  'badminton-smash-rhythm': {
    Icon: Zap,
    badgeText: '🏸 판정스매시',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    iconColor: 'text-teal-400',
    glowColor: 'from-teal-500/30 via-emerald-500/15 to-transparent',
    borderColor: 'border-teal-400/50',
  },
  'tactical-grid-slide': {
    Icon: Grid,
    badgeText: '🛡️ 공간차단',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  'sound-goalball': {
    Icon: Volume2,
    badgeText: '🔔 골볼청각',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
    glowColor: 'from-purple-500/30 via-indigo-500/15 to-transparent',
    borderColor: 'border-purple-400/50',
  },
  'juggling-bounce-paddle': {
    Icon: CircleDot,
    badgeText: '🎾 저글링바운스',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },

  // 11. 저학년 기초 움직임 & 도약
  'head-shoulders-knees': {
    Icon: Smile,
    badgeText: '🧢 신체비트',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
    glowColor: 'from-pink-500/30 via-rose-500/15 to-transparent',
    borderColor: 'border-pink-400/50',
  },
  'animal-hop-step': {
    Icon: Footprints,
    badgeText: '🐾 동물스텝',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  'bicycle-pedal-crank': {
    Icon: RefreshCw,
    badgeText: '🚲 크랭크페달',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  'double-under-rope': {
    Icon: Zap,
    badgeText: '⚡ 2단줄넘기',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    glowColor: 'from-yellow-500/30 via-amber-500/15 to-transparent',
    borderColor: 'border-yellow-400/50',
  },
  'mirror-motion-invert': {
    Icon: Eye,
    badgeText: '🪞 동작반전',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  'seesaw-balance-tap': {
    Icon: Scale,
    badgeText: '⚖️ 시소중심',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-green-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },

  // 12. 기타 액티비티
  whack_a_mole: {
    Icon: Target,
    badgeText: '🔨 타격반응',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
    glowColor: 'from-amber-500/30 via-yellow-500/15 to-transparent',
    borderColor: 'border-amber-400/50',
  },
  direction: {
    Icon: MoveHorizontal,
    badgeText: '🧭 청각방향',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    iconColor: 'text-violet-400',
    glowColor: 'from-violet-500/30 via-purple-500/15 to-transparent',
    borderColor: 'border-violet-400/50',
  },
  zigzag: {
    Icon: Footprints,
    badgeText: '⚡ 지그재그',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
  freeze: {
    Icon: Eye,
    badgeText: '🧊 얼음땡',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
    glowColor: 'from-sky-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-sky-400/50',
  },
  number_grid: {
    Icon: Grid,
    badgeText: '🔢 숫자스텝',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconColor: 'text-blue-400',
    glowColor: 'from-blue-500/30 via-indigo-500/15 to-transparent',
    borderColor: 'border-blue-400/50',
  },
  wave: {
    Icon: Waves,
    badgeText: '🌊 파도타기',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  },
  fitness: {
    Icon: Activity,
    badgeText: '💪 종합체력',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    glowColor: 'from-emerald-500/30 via-teal-500/15 to-transparent',
    borderColor: 'border-emerald-400/50',
  },
};

interface GameMotionIconProps {
  gameType: string;
  domain?: '운동' | '스포츠' | '표현';
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

export const GameMotionIcon: React.FC<GameMotionIconProps> = ({
  gameType,
  domain,
  size = 'md',
  showBadge = true,
  className = ''
}) => {
  const meta = MOTION_MAP[gameType] || {
    Icon: domain === '스포츠' ? Trophy : domain === '표현' ? Sparkles : Flame,
    badgeText: domain ? `🏃 ${domain}` : '🔥 체육미션',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    glowColor: 'from-cyan-500/30 via-blue-500/15 to-transparent',
    borderColor: 'border-cyan-400/50',
  };

  const { Icon } = meta;

  // Box dimensions
  const boxSize = size === 'sm' ? 'w-11 h-11' : size === 'lg' ? 'w-16 h-16' : 'w-14 h-14';
  const iconSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-9 h-9' : 'w-7 h-7 sm:w-8 sm:h-8';

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* 고대비 글래스모피즘 아이콘 박스 */}
      <div
        className={`${boxSize} rounded-2xl bg-slate-900/95 border-2 ${meta.borderColor} flex items-center justify-center relative overflow-hidden shadow-lg group-hover:scale-105 group-hover:border-white/60 transition-all duration-300`}
      >
        {/* 내부 테마 그라데이션 글로우 */}
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.glowColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
        
        {/* 중앙 상단 미세 하이라이트 */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

        {/* 선명한 벡터 모션 아이콘 */}
        <Icon
          className={`${iconSize} ${meta.iconColor} relative z-10 drop-shadow-md stroke-[2.2] group-hover:rotate-3 transition-transform duration-300`}
        />
      </div>

      {/* 우측 하단 한눈에 보이는 동작 태그 칩 */}
      {showBadge && (
        <span
          className={`absolute -bottom-1 -right-1 z-20 text-[9px] font-black px-1.5 py-0.2 rounded-md border shadow-xs whitespace-nowrap backdrop-blur-md ${meta.badgeColor}`}
        >
          {meta.badgeText}
        </span>
      )}
    </div>
  );
};
