import { useState } from 'react';
import { sfxSuccess, sfxClick } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const MISSIONS = [
  { id: 'jump', task: '제자리에서 10번 높이 점프하기!', pts: 300 },
  { id: 'jumping_jack', task: '팔벌려뛰기 10회 실시하기!', pts: 350 },
  { id: 'high_knee', task: '무릎 높여 제자리 뛰기 15초!', pts: 400 },
  { id: 'toe_touch', task: '발끝 닿기 스트레칭 10초 유지!', pts: 250 },
  { id: 'jump_rope', task: '투명 줄넘기 20회 빠르게 회전!', pts: 400 },
];

const MissionIllustration = ({ missionId }: { missionId: string }) => {
  if (missionId === 'jumping_jack') {
    // 팔벌려뛰기(점핑잭): 양팔을 머리 위로 V자로 벌리고 양다리를 넓게 벌린 동작
    return (
      <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
        <circle cx="50" cy="22" r="10" fill="#FDE047" />
        <line x1="50" y1="32" x2="50" y2="62" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
        {/* 양팔 위로 벌림 */}
        <line x1="50" y1="38" x2="22" y2="15" stroke="#38BDF8" strokeWidth="6.5" strokeLinecap="round" />
        <circle cx="21" cy="14" r="3.5" fill="#FDE047" />
        <line x1="50" y1="38" x2="78" y2="15" stroke="#38BDF8" strokeWidth="6.5" strokeLinecap="round" />
        <circle cx="79" cy="14" r="3.5" fill="#FDE047" />
        {/* 양다리 옆으로 벌림 */}
        <line x1="50" y1="62" x2="26" y2="92" stroke="#818CF8" strokeWidth="7" strokeLinecap="round" />
        <line x1="50" y1="62" x2="74" y2="92" stroke="#818CF8" strokeWidth="7" strokeLinecap="round" />
      </svg>
    );
  }

  if (missionId === 'toe_touch') {
    // 발끝 닿기: 상체를 깊이 숙여 양손으로 발끝을 터치하는 스트레칭 자세
    return (
      <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
        <line x1="38" y1="92" x2="38" y2="52" stroke="#818CF8" strokeWidth="7" strokeLinecap="round" />
        <line x1="46" y1="92" x2="46" y2="52" stroke="#818CF8" strokeWidth="7" strokeLinecap="round" />
        {/* 상체 숙임 */}
        <path d="M 42 52 Q 46 36 60 55" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx="64" cy="62" r="8" fill="#FDE047" />
        {/* 손으로 발끝 터치 */}
        <path d="M 52 48 L 44 86" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
        <circle cx="43" cy="88" r="3" fill="#FDE047" />
        <path d="M 40 92 L 48 92" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (missionId === 'jump_rope') {
    // 투명 줄넘기: 공중에 떠서 발을 모으고 양옆에 줄넘기 곡선
    return (
      <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
        {/* 줄넘기 줄 (타원형 아치) */}
        <path d="M 20 55 C 10 10, 90 10, 80 55 C 75 88, 25 88, 20 55" stroke="#FBBF24" strokeWidth="3" strokeDasharray="3 2" fill="none" />
        <circle cx="50" cy="28" r="9" fill="#FDE047" />
        <line x1="50" y1="37" x2="50" y2="65" stroke="#38BDF8" strokeWidth="7.5" strokeLinecap="round" />
        {/* 양손 손잡이 */}
        <path d="M 50 44 L 28 52" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
        <path d="M 50 44 L 72 52" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
        {/* 공중으로 모은 발 */}
        <line x1="50" y1="65" x2="45" y2="84" stroke="#818CF8" strokeWidth="6.5" strokeLinecap="round" />
        <line x1="50" y1="65" x2="55" y2="84" stroke="#818CF8" strokeWidth="6.5" strokeLinecap="round" />
        {/* 바닥 바운스 효과선 */}
        <path d="M 40 92 L 60 92" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (missionId === 'high_knee') {
    // 무릎 높여 뛰기: 한쪽 무릎을 높이 치켜올린 역동적인 러닝 자세
    return (
      <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md">
        <circle cx="50" cy="20" r="9" fill="#FDE047" />
        <line x1="50" y1="29" x2="50" y2="58" stroke="#38BDF8" strokeWidth="7.5" strokeLinecap="round" />
        {/* 오른팔 앞으로, 왼팔 뒤로 */}
        <path d="M 50 36 L 68 44" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
        <path d="M 50 36 L 32 46" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
        {/* 지지하는 다리 */}
        <line x1="50" y1="58" x2="44" y2="90" stroke="#818CF8" strokeWidth="7" strokeLinecap="round" />
        {/* 높이 올린 무릎 */}
        <path d="M 50 58 L 70 52 L 66 74" stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  // 기본 점프
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-md animate-bounce">
      <circle cx="50" cy="22" r="9" fill="#FDE047" />
      <line x1="50" y1="31" x2="50" y2="60" stroke="#38BDF8" strokeWidth="7.5" strokeLinecap="round" />
      {/* 위로 뻗은 양팔 */}
      <path d="M 50 38 L 30 20" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
      <path d="M 50 38 L 70 20" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
      {/* 굽힌 무릎 점프 */}
      <path d="M 50 60 L 38 74 L 42 88" stroke="#818CF8" strokeWidth="6.5" strokeLinecap="round" fill="none" />
      <path d="M 50 60 L 62 74 L 58 88" stroke="#818CF8" strokeWidth="6.5" strokeLinecap="round" fill="none" />
    </svg>
  );
};


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
      <p className="text-pink-200 text-xs mb-8 text-center">룰렛을 돌려 오늘의 랜덤 체육 미션을 완수하세요!</p>

      <div className="w-72 h-72 rounded-3xl bg-slate-900 border-4 border-rose-500/50 flex flex-col items-center justify-center p-6 shadow-2xl mb-8 text-center">
        {selectedMission ? (
          <>
            <div className="mb-2 flex items-center justify-center">
              <MissionIllustration missionId={selectedMission.id} />
            </div>
            <p className="text-lg font-black text-white mb-2">{selectedMission.task}</p>
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
          <div className="text-5xl font-black text-pink-300 mb-2">🎉 미션 완수!</div>
          <p className="text-xl text-white font-bold mb-4">+{selectedMission?.pts}점 획득</p>
        </div>
      )}
    </div>
  );
};
