import { useState, useEffect, useRef } from 'react';
import { sfxClick, sfxPop } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const MISSIONS = [
  { emoji: '🐰', name: '토끼 점프', desc: '제자리에서 3번 점프!', duration: 5 },
  { emoji: '🐻', name: '곰 걷기', desc: '엎드려서 팔다리로 4보 걸어가기!', duration: 8 },
  { emoji: '🐸', name: '개구리 뜀', desc: '쪼그려 앉았다 점프! 3번!', duration: 6 },
  { emoji: '🦅', name: '독수리 날개', desc: '팔을 크게 펼치고 위아래로 10번!', duration: 7 },
  { emoji: '🐍', name: '뱀 기어가기', desc: '바닥에 엎드려 3초간 기어가기!', duration: 6 },
  { emoji: '🦩', name: '학 다리', desc: '한 발로 5초간 균형 잡기!', duration: 7 },
  { emoji: '🐒', name: '원숭이 흉내', desc: '양팔을 위아래로 흔들며 5번 점프!', duration: 6 },
  { emoji: '🦀', name: '게 걸음', desc: '옆으로 5보 걸어가기!', duration: 6 },
];

export const AnimalMove = ({ groupId, enqueueAction }: Props) => {
  const [missionIdx, setMissionIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState(0);
  const [finished, setFinished] = useState(false);
  const doneRef = useRef(0);
  const TOTAL = 5;

  const [missions] = useState(() => {
    const shuffled = [...MISSIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, TOTAL);
  });

  useEffect(() => {
    if (done >= TOTAL) {
      setFinished(true);
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: doneRef.current * 100 }, timestamp: Date.now() });
      return;
    }
    setCountdown(missions[missionIdx]?.duration ?? 5);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [done]);

  const handleDone = () => {
    sfxClick();
    setDone(d => { const n = d + 1; doneRef.current = n; return n; });
    setMissionIdx(i => i + 1);
  };

  const handleSkip = () => {
    sfxPop();
    setMissionIdx(i => i + 1);
    setDone(d => d + 1);
    doneRef.current += 0; // skip = no points
  };

  const mission = missions[Math.min(missionIdx, TOTAL - 1)];

  return (
    <div className="min-h-[100dvh] bg-amber-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="text-amber-400 font-bold text-sm mb-2 relative z-10">{done + 1}/{TOTAL} 미션</div>
      <h1 className="text-2xl font-black text-white mb-4 text-center relative z-10">🐾 동물 체조</h1>
      {!finished && (
        <>
          <span className="text-8xl mb-4">{mission.emoji}</span>
          <div className="text-3xl font-black text-amber-300 mb-2">{mission.name}</div>
          <p className="text-amber-200 font-bold text-center mb-6">{mission.desc}</p>
          <div className={`text-5xl font-black mb-6 ${countdown <= 2 ? 'text-red-500' : 'text-white'}`}>{countdown > 0 ? countdown : '시간 종료!'}</div>
          <div className="flex gap-4">
            <button onClick={handleDone} className="px-8 py-4 bg-emerald-600 rounded-2xl text-white font-black text-lg active:scale-95 transition-transform">✅ 완료!</button>
            <button onClick={handleSkip} className="px-8 py-4 bg-slate-700 rounded-2xl text-slate-300 font-black text-lg active:scale-95 transition-transform">⏭️ 패스</button>
          </div>
        </>
      )}
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-amber-400 mb-4">{doneRef.current * 100}점!</div><p className="text-xl text-white font-bold">동물 체조 완료!</p></div>}
    </div>
  );
};
