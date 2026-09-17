import { useNavigate, Link } from 'react-router-dom';
import { Flame, Star, Timer, Brain, ShieldAlert, Mic2, BatteryCharging, Grab, Sparkles, Settings, BookOpen, Monitor } from 'lucide-react';

const GAMES = [
  {
    type: 'volcano',
    name: '화산 폭발',
    emoji: '🌋',
    desc: '10초 안에 화면을 빠르게 연타하세요!',
    icon: Flame,
    color: 'from-orange-500 to-red-600',
    border: 'border-orange-400/30',
    glow: 'hover:shadow-orange-500/30',
    difficulty: 1,
    category: '스피드',
  },
  {
    type: 'whack_a_mole',
    name: '별 두더지 잡기',
    emoji: '⭐',
    desc: '3×3 그리드에서 빠르게 나타나는 별을 잡으세요!',
    icon: Star,
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-400/30',
    glow: 'hover:shadow-emerald-500/30',
    difficulty: 2,
    category: '반응속도',
  },
  {
    type: 'stopwatch',
    name: '스탑워치 눈치',
    emoji: '⏱️',
    desc: '마음속으로 세어 정확히 7.00초에 멈추세요!',
    icon: Timer,
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400/30',
    glow: 'hover:shadow-cyan-500/30',
    difficulty: 2,
    category: '감각',
  },
  {
    type: 'memory',
    name: '컬러 패턴 기억',
    emoji: '🧠',
    desc: '5개 색상이 반짝이는 순서를 기억하고 따라하세요!',
    icon: Brain,
    color: 'from-indigo-500 to-purple-600',
    border: 'border-indigo-400/30',
    glow: 'hover:shadow-indigo-500/30',
    difficulty: 3,
    category: '두뇌',
  },
  {
    type: 'number_grid',
    name: '순차적 암호 해제',
    emoji: '🔢',
    desc: '1부터 9까지 순서대로 빠르게 터치하세요!',
    icon: ShieldAlert,
    color: 'from-red-500 to-rose-600',
    border: 'border-red-400/30',
    glow: 'hover:shadow-red-500/30',
    difficulty: 2,
    category: '스피드',
  },
  {
    type: 'scream',
    name: '소리질러!',
    emoji: '🎤',
    desc: '마이크를 향해 큰 소리를 질러 게이지를 채우세요!',
    icon: Mic2,
    color: 'from-blue-500 to-sky-600',
    border: 'border-blue-400/30',
    glow: 'hover:shadow-blue-500/30',
    difficulty: 1,
    category: '체력',
  },
  {
    type: 'shake',
    name: '바운스 충전',
    emoji: '🔋',
    desc: '폰을 흔들거나 연타해서 100%를 채우세요!',
    icon: BatteryCharging,
    color: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-400/30',
    glow: 'hover:shadow-yellow-500/30',
    difficulty: 1,
    category: '체력',
  },
  {
    type: 'tug_of_war',
    name: '스마트 줄다리기',
    emoji: '🏋️',
    desc: 'AI 상대로 연타 줄다리기! 밧줄을 끝까지 당기세요!',
    icon: Grab,
    color: 'from-slate-500 to-zinc-600',
    border: 'border-slate-400/30',
    glow: 'hover:shadow-slate-500/30',
    difficulty: 2,
    category: '체력',
  },
  {
    type: 'fate_card',
    name: '운명의 카드',
    emoji: '🃏',
    desc: '3장 중 1장을 선택! 대박일까 쪽박일까?',
    icon: Sparkles,
    color: 'from-fuchsia-500 to-purple-600',
    border: 'border-fuchsia-400/30',
    glow: 'hover:shadow-fuchsia-500/30',
    difficulty: 1,
    category: '행운',
  },
];

export const GameHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans overflow-y-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/30 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col items-center pt-12 pb-6 px-6">
          <div className="text-5xl mb-3">💧</div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-center">
            땀방울 원정대
          </h1>
          <p className="text-slate-400 font-bold mt-3 text-center text-sm md:text-base">
            체육 미니게임을 선택하고 바로 플레이하세요!
          </p>
        </div>
      </div>

      {/* Game Grid */}
      <div className="px-4 md:px-8 pb-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map(game => (
            <button
              key={game.type}
              onClick={() => navigate(`/play/${game.type}`)}
              className={`group relative bg-slate-900/80 backdrop-blur-sm border ${game.border} rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${game.glow} overflow-hidden`}
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
              
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shrink-0 shadow-lg`}>
                  <span className="text-2xl">{game.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-lg text-white truncate">{game.name}</h3>
                  </div>
                  <p className="text-slate-400 text-xs font-bold line-clamp-2 break-keep">{game.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">
                      {game.category}
                    </span>
                    <span className="text-[10px] text-yellow-500 font-bold">
                      {'⭐'.repeat(game.difficulty)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="px-4 md:px-8 pb-12 max-w-4xl mx-auto">
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link to="/manual" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors border border-slate-700">
            <BookOpen className="w-4 h-4" /> 사용 설명서
          </Link>
          <Link to="/admin" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors border border-slate-700">
            <Settings className="w-4 h-4" /> 교사 제어 패널
          </Link>
          <Link to="/board" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors border border-slate-700">
            <Monitor className="w-4 h-4" /> TV 전광판
          </Link>
          <Link to="/lobby" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors border border-slate-700">
            🔑 PIN 입장 (수업용)
          </Link>
        </div>
        <p className="text-center text-slate-600 text-xs font-bold mt-6">ⓒ2026. 엽쌤 All rights reserved.</p>
      </div>
    </div>
  );
};
