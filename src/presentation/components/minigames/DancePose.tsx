import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxPop } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const POSES = [
  { name: '하늘 위로!', emoji: '🙆', desc: '팔을 머리 위로 올리세요' },
  { name: '앞으로 뻗어!', emoji: '🤸', desc: '팔을 앞으로 쭉 뻗으세요' },
  { name: '왼쪽으로!', emoji: '🤾', desc: '몸을 왼쪽으로 기울이세요' },
  { name: '오른쪽으로!', emoji: '🤾', desc: '몸을 오른쪽으로 기울이세요' },
  { name: '아래로 숙여!', emoji: '🙇', desc: '몸을 숙이세요' },
  { name: '뒤로 젖혀!', emoji: '🧘', desc: '몸을 살짝 뒤로 젖히세요' },
];

export const DancePose = ({ groupId, enqueueAction }: Props) => {
  const [round, setRound] = useState(0);
  const [poseIdx, setPoseIdx] = useState(0);
  const [timePerPose, setTimePerPose] = useState(3);
  const [score, setScore] = useState(0);
  const [matched, setMatched] = useState(false);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const TOTAL_ROUNDS = 8;

  useEffect(() => {
    if (round >= TOTAL_ROUNDS) {
      setFinished(true);
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current }, timestamp: Date.now() });
      return;
    }
    setPoseIdx(Math.floor(Math.random() * POSES.length));
    setTimePerPose(3);
    setMatched(false);

    const countdown = setInterval(() => {
      setTimePerPose(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          if (!matched) sfxPop();
          setRound(r => r + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [round]);

  const handleConfirm = () => {
    if (finished || matched) return;
    setMatched(true);
    sfxCoin();
    const bonus = timePerPose * 30 + 50;
    setScore(s => s + bonus);
    scoreRef.current += bonus;
    setTimeout(() => setRound(r => r + 1), 500);
  };

  const pose = POSES[poseIdx];

  return (
    <div className="min-h-[100dvh] bg-fuchsia-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-4 relative z-10">
        <div><span className="text-pink-300 text-sm font-bold">라운드</span><div className="text-white text-2xl font-black">{Math.min(round + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</div></div>
        <div className="text-right"><span className="text-pink-300 text-sm font-bold">점수</span><div className="text-white text-2xl font-black">{score}</div></div>
      </div>
      <h1 className="text-2xl font-black text-white mb-4 text-center relative z-10">💃 댄스 포즈</h1>
      {!finished && (
        <>
          <span className="text-8xl mb-4">{pose.emoji}</span>
          <div className="text-3xl font-black text-pink-200 mb-2 text-center">{pose.name}</div>
          <p className="text-pink-300 font-bold text-sm mb-6">{pose.desc}</p>
          <div className={`text-5xl font-black mb-6 ${timePerPose <= 1 ? 'text-red-500' : 'text-white'}`}>{timePerPose}</div>
          {!matched ? (
            <button onClick={handleConfirm} className="px-10 py-5 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-2xl text-white font-black text-xl active:scale-95 transition-transform shadow-lg">
              ✅ 포즈 완료!
            </button>
          ) : (
            <div className="text-3xl font-black text-emerald-400 animate-bounce">👍 성공!</div>
          )}
        </>
      )}
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-pink-300 mb-4">총 {score}점!</div><p className="text-xl text-white font-bold">{score >= 300 ? '완벽한 댄서!' : '좋은 움직임!'}</p></div>}
    </div>
  );
};
