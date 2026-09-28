import React, { useState } from 'react';
import { Flame, CheckCircle, Trophy, Sparkles, X, ArrowRight } from 'lucide-react';
import { useDailyStreak } from '../../application/useDailyStreak';

interface DailyStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchGame: (gameType: string) => void;
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({ isOpen, onClose, onLaunchGame }) => {
  const { streakData, isTodayCompleted, completeTodayMission } = useDailyStreak();
  const [activeStep, setActiveStep] = useState<number>(0);
  const completed = isTodayCompleted();

  if (!isOpen) return null;

  // 요일 계산 (최근 7일)
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const today = new Date();
  const pastWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const str = d.toISOString().slice(0, 10);
    return {
      dateStr: str,
      dayName: days[d.getDay()],
      isToday: i === 6,
      isDone: streakData.history.includes(str)
    };
  });

  const routines = [
    { title: '1분 목 & 어깨 워밍업', desc: '고개를 좌우로 천천히 돌리고 어깨를 으쓱으쓱!', emoji: '🧘', type: 'stretch' },
    { title: '1분 스피드 터치 챌린지', desc: '오늘의 추천 게임으로 순발력 깨우기!', emoji: '⚡', type: 'reaction' },
    { title: '1분 심호흡 & 쿨다운', desc: '코로 숨을 깊게 들이마시고 입으로 후~', emoji: '🌬️', type: 'breathe' }
  ];

  const handleFinishRoutine = () => {
    completeTodayMission(100);
    setActiveStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 스트릭 헤더 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm mb-3">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-bounce" />
            <span>{streakData.currentStreak}일 연속 땀방울 달성 중!</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">오늘의 3분 땀방울 챌린지</h2>
          <p className="text-sm text-slate-400 mt-1">하루 3분, 가벼운 신체활동으로 활력을 충전해요!</p>
        </div>

        {/* 주간 스트릭 도장판 */}
        <div className="grid grid-cols-7 gap-2 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 mb-6">
          {pastWeek.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <span className={`text-xs font-bold ${item.isToday ? 'text-amber-400' : 'text-slate-400'}`}>
                {item.dayName}
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  item.isDone
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                    : item.isToday
                    ? 'border-2 border-dashed border-amber-400/80 text-amber-300'
                    : 'bg-slate-700/40 text-slate-500'
                }`}
              >
                {item.isDone ? '🔥' : item.isToday ? '오늘' : '·'}
              </div>
            </div>
          ))}
        </div>

        {/* 3단계 루틴 진행 카드 */}
        {completed ? (
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 rounded-2xl p-5 text-center">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce" />
            <h3 className="text-lg font-black text-amber-300">오늘의 3분 챌린지 완료!</h3>
            <p className="text-xs text-slate-300 mt-1">
              내일도 잊지 말고 스트릭 불꽃을 이어가세요! (+100 땀방울 획득)
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20"
            >
              내일 또 만나요!
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((r, idx) => {
              const isCurrent = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-cyan-500/10 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                      : isPast
                      ? 'bg-slate-800/40 border-slate-700 opacity-70'
                      : 'bg-slate-800/30 border-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{r.emoji}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        {r.title}
                        {isPast && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                      </p>
                      <p className="text-xs text-slate-400">{r.desc}</p>
                    </div>
                  </div>
                  {isCurrent && (
                    <button
                      onClick={() => {
                        if (idx === 1) {
                          onLaunchGame('reaction');
                          onClose();
                        } else {
                          setActiveStep(s => s + 1);
                        }
                      }}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
                    >
                      {idx === 1 ? '게임 시작' : '다음'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {activeStep >= 2 && (
              <button
                onClick={handleFinishRoutine}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 mt-4"
              >
                <Sparkles className="w-5 h-5 fill-slate-950" />
                오늘의 3분 챌린지 도장 찍기! (+100P)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
