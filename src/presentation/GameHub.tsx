import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings, BookOpen, Monitor } from 'lucide-react';

type GradeGroup = '전체' | '저학년' | '중학년' | '고학년';
type PeDomain = '전체' | '건강' | '도전' | '경쟁' | '표현' | '여가';

interface GameDef {
  type: string;
  name: string;
  emoji: string;
  desc: string;
  color: string;
  border: string;
  glow: string;
  difficulty: number;
  peDomain: PeDomain;
  grades: GradeGroup[];
}

const GAMES: GameDef[] = [
  // === 건강 영역 ===
  { type: 'shake', name: '바운스 충전', emoji: '🔋', desc: '폰을 흔들거나 연타해서 100% 채우기!', color: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/30', glow: 'hover:shadow-yellow-500/30', difficulty: 1, peDomain: '건강', grades: ['저학년', '중학년', '고학년'] },
  { type: 'left_right', name: '좌우 반사신경', emoji: '👈👉', desc: '공이 나타난 방향을 빠르게 터치!', color: 'from-blue-500 to-orange-600', border: 'border-blue-400/30', glow: 'hover:shadow-blue-500/30', difficulty: 1, peDomain: '건강', grades: ['저학년', '중학년', '고학년'] },
  { type: 'scream', name: '소리질러!', emoji: '🎤', desc: '마이크를 향해 큰 소리로 게이지 채우기!', color: 'from-blue-500 to-sky-600', border: 'border-blue-400/30', glow: 'hover:shadow-blue-500/30', difficulty: 1, peDomain: '건강', grades: ['저학년', '중학년', '고학년'] },

  // === 도전 영역 ===
  { type: 'volcano', name: '화산 폭발', emoji: '🌋', desc: '10초 안에 화면을 빠르게 연타하세요!', color: 'from-orange-500 to-red-600', border: 'border-orange-400/30', glow: 'hover:shadow-orange-500/30', difficulty: 1, peDomain: '도전', grades: ['저학년', '중학년', '고학년'] },
  { type: 'whack_a_mole', name: '별 두더지 잡기', emoji: '⭐', desc: '3×3 그리드에서 나타나는 별을 잡으세요!', color: 'from-emerald-500 to-teal-600', border: 'border-emerald-400/30', glow: 'hover:shadow-emerald-500/30', difficulty: 2, peDomain: '도전', grades: ['저학년', '중학년', '고학년'] },
  { type: 'stopwatch', name: '스탑워치 눈치', emoji: '⏱️', desc: '마음속으로 세어 정확히 7.00초에 멈추기!', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-400/30', glow: 'hover:shadow-cyan-500/30', difficulty: 2, peDomain: '도전', grades: ['중학년', '고학년'] },
  { type: 'reaction', name: '반응속도 테스트', emoji: '⚡', desc: '초록색으로 바뀌면 최대한 빨리 터치!', color: 'from-lime-500 to-green-600', border: 'border-lime-400/30', glow: 'hover:shadow-lime-500/30', difficulty: 1, peDomain: '도전', grades: ['중학년', '고학년'] },
  { type: 'direction', name: '방향 스와이프', emoji: '👆', desc: '화살표 방향으로 빠르게 스와이프!', color: 'from-teal-500 to-cyan-600', border: 'border-teal-400/30', glow: 'hover:shadow-teal-500/30', difficulty: 2, peDomain: '도전', grades: ['중학년', '고학년'] },
  { type: 'target', name: '타겟 조준', emoji: '🎯', desc: '줄어드는 원이 가장 작을 때 터치!', color: 'from-amber-500 to-orange-600', border: 'border-amber-400/30', glow: 'hover:shadow-amber-500/30', difficulty: 2, peDomain: '도전', grades: ['중학년', '고학년'] },
  { type: 'number_grid', name: '순차적 암호 해제', emoji: '🔢', desc: '1부터 9까지 순서대로 빠르게 터치하세요!', color: 'from-red-500 to-rose-600', border: 'border-red-400/30', glow: 'hover:shadow-red-500/30', difficulty: 2, peDomain: '도전', grades: ['중학년', '고학년'] },

  // === 경쟁 영역 ===
  { type: 'tug_of_war', name: '스마트 줄다리기', emoji: '🏋️', desc: 'AI 상대로 연타 줄다리기!', color: 'from-slate-500 to-zinc-600', border: 'border-slate-400/30', glow: 'hover:shadow-slate-500/30', difficulty: 2, peDomain: '경쟁', grades: ['저학년', '중학년', '고학년'] },
  { type: 'red_green', name: '무궁화꽃이 피었습니다', emoji: '🚦', desc: '초록불일 때만 터치! 빨간불이면 STOP!', color: 'from-emerald-500 to-red-600', border: 'border-emerald-400/30', glow: 'hover:shadow-emerald-500/30', difficulty: 2, peDomain: '경쟁', grades: ['저학년', '중학년', '고학년'] },

  // === 표현 영역 ===
  { type: 'memory', name: '컬러 패턴 기억', emoji: '🧠', desc: '5개 색상이 반짝이는 순서를 기억하기!', color: 'from-indigo-500 to-purple-600', border: 'border-indigo-400/30', glow: 'hover:shadow-indigo-500/30', difficulty: 3, peDomain: '표현', grades: ['중학년', '고학년'] },
  { type: 'color_word', name: '색깔 읽기 챌린지', emoji: '🎨', desc: '글자의 뜻이 아닌 색깔을 구별하세요!', color: 'from-pink-500 to-violet-600', border: 'border-pink-400/30', glow: 'hover:shadow-pink-500/30', difficulty: 3, peDomain: '표현', grades: ['고학년'] },

  // === 여가 영역 ===
  { type: 'fate_card', name: '운명의 카드', emoji: '🃏', desc: '3장 중 1장을 선택! 대박일까 쪽박일까?', color: 'from-fuchsia-500 to-purple-600', border: 'border-fuchsia-400/30', glow: 'hover:shadow-fuchsia-500/30', difficulty: 1, peDomain: '여가', grades: ['저학년', '중학년', '고학년'] },
  { type: 'balloon', name: '풍선 불기', emoji: '🎈', desc: '터지기 전에 수금! 욕심부리면 펑!', color: 'from-pink-500 to-rose-600', border: 'border-pink-400/30', glow: 'hover:shadow-pink-500/30', difficulty: 1, peDomain: '여가', grades: ['저학년', '중학년', '고학년'] },
  { type: 'card_match', name: '짝 맞추기', emoji: '🃏', desc: '같은 그림의 카드 짝을 찾으세요!', color: 'from-violet-500 to-purple-600', border: 'border-violet-400/30', glow: 'hover:shadow-violet-500/30', difficulty: 2, peDomain: '여가', grades: ['저학년', '중학년', '고학년'] },
  { type: 'math', name: '계산왕 스프린트', emoji: '🔢', desc: '20초 안에 사칙연산을 빠르게 풀기!', color: 'from-teal-500 to-emerald-600', border: 'border-teal-400/30', glow: 'hover:shadow-teal-500/30', difficulty: 2, peDomain: '여가', grades: ['중학년', '고학년'] },
  { type: 'coin_flip', name: '동전 뒤집기', emoji: '🪙', desc: '앞/뒤를 예측! 연속 정답 시 배율 UP!', color: 'from-amber-500 to-yellow-600', border: 'border-amber-400/30', glow: 'hover:shadow-amber-500/30', difficulty: 1, peDomain: '여가', grades: ['저학년', '중학년', '고학년'] },
];

const GRADE_GROUPS: { key: GradeGroup; label: string; sub: string }[] = [
  { key: '전체', label: '전체', sub: '모든 학년' },
  { key: '저학년', label: '1~2학년', sub: '저학년' },
  { key: '중학년', label: '3~4학년', sub: '중학년' },
  { key: '고학년', label: '5~6학년', sub: '고학년' },
];

const PE_DOMAINS: { key: PeDomain; emoji: string; color: string }[] = [
  { key: '전체', emoji: '🏫', color: 'bg-slate-700 text-white' },
  { key: '건강', emoji: '💪', color: 'bg-emerald-600 text-white' },
  { key: '도전', emoji: '🔥', color: 'bg-orange-600 text-white' },
  { key: '경쟁', emoji: '🏆', color: 'bg-blue-600 text-white' },
  { key: '표현', emoji: '🎭', color: 'bg-purple-600 text-white' },
  { key: '여가', emoji: '🎮', color: 'bg-pink-600 text-white' },
];

export const GameHub = () => {
  const navigate = useNavigate();
  const [gradeFilter, setGradeFilter] = useState<GradeGroup>('전체');
  const [domainFilter, setDomainFilter] = useState<PeDomain>('전체');

  const filtered = GAMES.filter(g => {
    const gradeMatch = gradeFilter === '전체' || g.grades.includes(gradeFilter);
    const domainMatch = domainFilter === '전체' || g.peDomain === domainFilter;
    return gradeMatch && domainMatch;
  });

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans overflow-y-auto">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/30 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col items-center pt-10 pb-4 px-6">
          <div className="text-4xl mb-2">💧</div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-center">
            땀방울 원정대
          </h1>
          <p className="text-slate-500 font-bold mt-2 text-center text-xs">체육 미니게임을 선택하고 바로 플레이하세요!</p>
        </div>
      </div>

      {/* 학년군 선택 */}
      <div className="px-4 md:px-8 max-w-4xl mx-auto mb-3">
        <h2 className="text-xs font-bold text-slate-500 mb-2 px-1">📚 학년군 선택</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {GRADE_GROUPS.map(g => (
            <button
              key={g.key}
              onClick={() => setGradeFilter(g.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                gradeFilter === g.key
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 체육 영역 선택 */}
      <div className="px-4 md:px-8 max-w-4xl mx-auto mb-5">
        <h2 className="text-xs font-bold text-slate-500 mb-2 px-1">🏅 체육 영역</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PE_DOMAINS.map(d => (
            <button
              key={d.key}
              onClick={() => setDomainFilter(d.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                domainFilter === d.key
                  ? `${d.color} border-transparent shadow-lg`
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <span>{d.emoji}</span> {d.key}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 카운트 */}
      <div className="px-5 md:px-9 max-w-4xl mx-auto mb-3">
        <p className="text-xs text-slate-500 font-bold">
          {gradeFilter !== '전체' || domainFilter !== '전체' ? `${filtered.length}개 게임 표시 중` : `총 ${GAMES.length}개 게임`}
        </p>
      </div>

      {/* Game Grid */}
      <div className="px-4 md:px-8 pb-6 max-w-4xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <span className="text-5xl block mb-4">🔍</span>
            <p className="font-bold">해당 조건에 맞는 게임이 없습니다.</p>
            <p className="text-sm mt-2">필터를 변경해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(game => {
              const domainInfo = PE_DOMAINS.find(d => d.key === game.peDomain)!;
              return (
                <button
                  key={game.type}
                  onClick={() => navigate(`/play/${game.type}`)}
                  className={`group relative bg-slate-900/80 backdrop-blur-sm border ${game.border} rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl ${game.glow} overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shrink-0 shadow-lg`}>
                      <span className="text-xl">{game.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base text-white truncate">{game.name}</h3>
                      <p className="text-slate-400 text-[11px] font-bold line-clamp-1 break-keep">{game.desc}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${domainInfo.color} font-bold`}>
                          {domainInfo.emoji} {game.peDomain}
                        </span>
                        <span className="text-[10px] text-yellow-500 font-bold">{'⭐'.repeat(game.difficulty)}</span>
                        {game.grades.length < 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-500 font-bold border border-slate-700">
                            {game.grades.join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 md:px-8 pb-10 max-w-4xl mx-auto">
        <div className="border-t border-slate-800 pt-5 flex flex-wrap gap-2 justify-center items-center">
          <Link to="/manual" className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-colors border border-slate-700">
            <BookOpen className="w-3.5 h-3.5" /> 사용 설명서
          </Link>
          <Link to="/admin" className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-colors border border-slate-700">
            <Settings className="w-3.5 h-3.5" /> 교사 제어 패널
          </Link>
          <Link to="/board" className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-colors border border-slate-700">
            <Monitor className="w-3.5 h-3.5" /> TV 전광판
          </Link>
          <Link to="/lobby" className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold transition-colors border border-slate-700">
            🔑 PIN 입장
          </Link>
        </div>
        <p className="text-center text-slate-700 text-[10px] font-bold mt-4">ⓒ2026. 엽쌤 All rights reserved.</p>
      </div>
    </div>
  );
};
