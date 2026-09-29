import React from 'react';
import { Award, X, Lock, CheckCircle, Sparkles } from 'lucide-react';

interface BadgeArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BadgeInfo {
  id: string;
  name: string;
  emoji: string;
  category: '체력/운동' | '스포츠/기술' | '협동/탐험';
  desc: string;
  condition: string;
}

const ALL_BADGES: BadgeInfo[] = [
  { id: 'first_play', name: '첫 발걸음', emoji: '👟', category: '체력/운동', desc: '처음으로 미니게임을 성공적으로 완료함', condition: '미니게임 1회 완료' },
  { id: 'jump_king', name: '점프의 제왕', emoji: '🦘', category: '체력/운동', desc: '점프 측정에서 연속 30회 이상 도약 달성', condition: '점프왕 30회 이상' },
  { id: 'squat_master', name: '스쿼트 마스터', emoji: '🏋️', category: '체력/운동', desc: '바른 자세로 연속 스쿼트 20회 완주', condition: '스쿼트 20회 이상' },
  { id: 'scream_fire', name: '포효하는 사자', emoji: '🦁', category: '체력/운동', desc: '최대 음량 95% 이상으로 함성 지르기 성공', condition: '소리질러 게이지 95%' },
  { id: 'reaction_god', name: '전광석화 반사신경', emoji: '⚡', category: '스포츠/기술', desc: '0.2초 이내의 초인적인 반응 속도 기록', condition: '반응속도 테스트 0.25s 이하' },
  { id: 'free_throw_sniper', name: '자유투 명사수', emoji: '🏀', category: '스포츠/기술', desc: '완벽한 포물선 각도로 클린슛 성공', condition: '자유투 연속 성공' },
  { id: 'archery_ten', name: '바람의 궁사', emoji: '🎯', category: '스포츠/기술', desc: '풍속을 계산하여 10점 과녁 정중앙 적중', condition: '양궁 10점 만점' },
  { id: 'spin_reader', name: '탁구 스핀 판독기', emoji: '🏓', category: '스포츠/기술', desc: '상대의 탑스핀과 백스핀 궤적을 완벽히 간파', condition: '탁구 회전 5연속 판독' },
  { id: 'bingo_master', name: '빙고 영토 정복자', emoji: '🧩', category: '협동/탐험', desc: '모둠 협동으로 영토 점령 빙고 1줄 완성', condition: '빙고 1줄 완성' },
  { id: 'bomb_defuser', name: '여수 바다의 영웅', emoji: '🌊', category: '협동/탐험', desc: '모든 미션을 완수하고 최종 폭탄을 해체함', condition: '폭탄 해체 성공' },
  { id: 'tamagotchi_max', name: '땀방울의 수호자', emoji: '🐥', category: '체력/운동', desc: '땀방울 다마고치를 불꽃 캐릭터로 최종 진화', condition: '다마고치 레벨 5 달성' },
  { id: 'streak_7', name: '체육 개근왕', emoji: '🔥', category: '체력/운동', desc: '7일 연속 체육 미션 수행 완료', condition: '데일리 스트릭 7일' },
];

export const BadgeArchiveModal: React.FC<BadgeArchiveModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  let unlockedBadges: Record<string, boolean> = {};
  try {
    unlockedBadges = JSON.parse(localStorage.getItem('physical_badges') || '{}');
  } catch {
    unlockedBadges = {};
  }

  const unlockedCount = ALL_BADGES.filter(b => unlockedBadges[b.id]).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-yellow-500/20 text-yellow-400 rounded-xl">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <span>체육 명예의 전당 (배지 도감)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-mono">
                  {unlockedCount} / {ALL_BADGES.length} 달성
                </span>
              </h2>
              <p className="text-xs text-slate-400">활동을 수행하며 숨겨진 체육 업적 배지를 수집해 보세요!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 진행률 바 */}
        <div className="px-6 pt-4 pb-2">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${(unlockedCount / ALL_BADGES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 배지 카드 그리드 */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
          {ALL_BADGES.map((b) => {
            const isUnlocked = !!unlockedBadges[b.id];
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative overflow-hidden ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-slate-800/80 to-slate-900 border-yellow-500/40 shadow-lg shadow-yellow-500/5'
                    : 'bg-slate-900/50 border-slate-800/80 opacity-60'
                }`}
              >
                {isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                {!isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-slate-600" />
                  </div>
                )}

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                  isUnlocked
                    ? 'bg-yellow-500/20 border-yellow-500/30'
                    : 'bg-slate-800 border-slate-700 grayscale'
                }`}>
                  {b.emoji}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {b.category}
                    </span>
                    <h3 className={`font-black text-sm truncate ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                      {b.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug mb-1">{b.desc}</p>
                  <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    조건: {b.condition}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
