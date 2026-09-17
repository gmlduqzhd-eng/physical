import { useState } from 'react';
import { sfxSuccess, sfxClick } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const MISSIONS = [
  { task: '제자리에서 10번 높이 점프하기!', emoji: '🦘', pts: 300 },
  { task: '팔벌려뛰기 10회 실시하기!', emoji: '⭐', pts: 350 },
  { task: '무릎 높여 제자리 뛰기 15초!', emoji: '🏃', pts: 400 },
  { task: '발끝 닿기 스트레칭 10초 유지!', emoji: '🧘', pts: 250 },
  { task: '투명 줄넘기 20회 빠르게 회전!', emoji: '⚡', pts: 400 },
];

export const FitnessRoulette = ({ groupId, enqueueAction }: Props) => {
  const [spinning, setSpinning] = useState(false);
  const [selectedMission, setSelectedMission] = useState<typeof MISSIONS[0] | null>(null);
  const [completed, setCompleted] = useState(false);

  const spin = () => {
    if (spinning || completed) return;
    setSpinning(true);
    sfxClick();

    let counter = 0;
    const interval = setInterval(() => {
      setSelectedMission(MISSIONS[counter % MISSIONS.length]);
      sfxClick();
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        const finalIdx = Math.floor(Math.random() * MISSIONS.length);
        const chosen = MISSIONS[finalIdx];
        setSelectedMission(chosen);
        setSpinning(false);
      }
    }, 100);
  };

  const handleFinish = () => {
    if (!selectedMission || completed) return;
    setCompleted(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: selectedMission.pts },
      timestamp: Date.now()
    });
  };

  return (
    <div className="min-h-[100dvh] bg-rose-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none text-white">
      <h1 className="text-3xl font-black mb-2 text-center">🎰 체력 룰렛</h1>
      <p className="text-rose-300 text-xs mb-8 text-center">룰렛을 돌려 오늘의 랜덤 체육 미션을 완수하세요!</p>

      <div className="w-72 h-72 rounded-3xl bg-slate-900 border-4 border-rose-500/50 flex flex-col items-center justify-center p-6 shadow-2xl mb-8 text-center">
        {selectedMission ? (
          <>
            <div className="text-7xl mb-4 animate-bounce">{selectedMission.emoji}</div>
            <p className="text-lg font-black text-rose-200 mb-2">{selectedMission.task}</p>
            <span className="text-xs font-bold text-amber-400">보상: +{selectedMission.pts}점</span>
          </>
        ) : (
          <>
            <div className="text-6xl mb-3">🎲</div>
            <p className="text-sm font-bold text-slate-400">아래 버튼을 눌러<br />미션을 뽑아보세요!</p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {!selectedMission && (
          <button
            onClick={spin}
            disabled={spinning}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 font-black text-lg rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {spinning ? '돌아가는 중... 🎰' : '룰렛 돌리기 🎯'}
          </button>
        )}

        {selectedMission && !completed && (
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-black text-lg rounded-2xl shadow-lg transition-all active:scale-95 animate-pulse"
          >
            미션 완료했습니다! ✅
          </button>
        )}
      </div>

      {completed && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-rose-400 mb-2">🎉 미션 완수!</div>
          <p className="text-xl text-white font-bold mb-4">+{selectedMission?.pts}점 획득</p>
        </div>
      )}
    </div>
  );
};
