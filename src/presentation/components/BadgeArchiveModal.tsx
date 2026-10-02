import React from 'react';
import { isRecord, readJsonStorage } from '../../application/browserStorage';
import { useModalDialog } from '../../application/useModalDialog';
import { normalizePlayerProfile } from '../../application/usePlayerProfile';
import { normalizeTamagotchiState } from '../../application/useTamagotchi';
import { normalizeDailyStreak } from '../../application/useDailyStreak';
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
  { id: 'high_scorer', name: '하이스코어러', emoji: '🏅', category: '스포츠/기술', desc: '한 게임에서 500점 이상의 기록 달성', condition: '미니게임 500점 이상' },
  { id: 'veteran', name: '베테랑', emoji: '🎖️', category: '체력/운동', desc: '미니게임을 꾸준히 10회 완료함', condition: '미니게임 10회 완료' },
  { id: 'master', name: '마스터', emoji: '👑', category: '체력/운동', desc: '50회의 미니게임을 끝까지 완료함', condition: '미니게임 50회 완료' },
  { id: 'brave', name: '용감한 도전자', emoji: '🦁', category: '스포츠/기술', desc: '어려움 난이도에서 점수 획득에 성공함', condition: '어려움 난이도에서 1점 이상' },
  { id: 'explorer', name: '탐험가', emoji: '🌍', category: '협동/탐험', desc: '서로 다른 미니게임 10종을 완료함', condition: '미니게임 10종 완료' },
  { id: 'collector', name: '수집가', emoji: '💎', category: '협동/탐험', desc: '서로 다른 미니게임 30종을 완료함', condition: '미니게임 30종 완료' },
  { id: 'tamagotchi_max', name: '땀방울의 수호자', emoji: '🐥', category: '체력/운동', desc: '땀방이를 꾸준히 키워 레벨 5에 도달함', condition: '다마고치 레벨 5 달성' },
  { id: 'streak_7', name: '체육 개근왕', emoji: '🔥', category: '체력/운동', desc: '7일 연속 체육 미션 수행 완료', condition: '데일리 스트릭 7일' },
];

export const BadgeArchiveModal: React.FC<BadgeArchiveModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useModalDialog(isOpen, onClose);
  if (!isOpen) return null;

  let unlockedBadges: Record<string, boolean> = {};
  try {
    const saved = readJsonStorage('physical_badges');
    unlockedBadges = isRecord(saved) ? Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, value === true])) : {};
  } catch {
    unlockedBadges = {};
  }
  const profile = normalizePlayerProfile(readJsonStorage('physical_player_profile'));
  const pet = normalizeTamagotchiState(readJsonStorage('dambang_tamagotchi_v1'));
  const streak = normalizeDailyStreak(readJsonStorage('dambang_daily_streak_v1'));
  unlockedBadges.first_play ||= !!profile && profile.totalPlays > 0;
  unlockedBadges.tamagotchi_max ||= pet.xp >= 400;
  unlockedBadges.streak_7 ||= Math.max(streak.bestStreak, streak.currentStreak) >= 7;

  const unlockedCount = ALL_BADGES.filter(b => unlockedBadges[b.id]).length;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="체육 명예의 전당 배지 도감" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-yellow-500/20 text-yellow-400 rounded-xl">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black flex flex-wrap items-center gap-2">
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
