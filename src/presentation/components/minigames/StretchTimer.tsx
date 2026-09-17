import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const POSES = [
  { name: '기지개 켜기', emoji: '🙆‍♂️', desc: '두 팔을 하늘 높이 쭉 뻗으세요!', duration: 7 },
  { name: '옆구리 늘리기', emoji: '🤸‍♂️', desc: '상체를 좌우로 길게 늘려보세요!', duration: 7 },
  { name: '어깨 돌리기', emoji: '🧘‍♂️', desc: '어깨와 가슴을 활짝 펴고 심호흡하세요!', duration: 7 },
];

export const StretchTimer = ({ groupId, enqueueAction }: Props) => {
  const [poseIdx, setPoseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(POSES[0].duration);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          sfxCoin();
          if (poseIdx + 1 >= POSES.length) {
            if (!finishedRef.current) {
              finishedRef.current = true;
              setFinished(true);
              sfxSuccess();
              enqueueAction({
                id: Math.random().toString(),
                type: 'INCREMENT_SCORE',
                payload: { id: groupId, amount: 500 },
                timestamp: Date.now()
              });
            }
            return 0;
          } else {
            setPoseIdx(p => p + 1);
            return POSES[poseIdx + 1].duration;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [poseIdx, finished, groupId, enqueueAction]);

  const current = POSES[poseIdx] || POSES[0];

  return (
    <div className="min-h-[100dvh] bg-teal-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none text-white">
      <div className="text-teal-400 font-bold text-sm mb-2">{poseIdx + 1} / {POSES.length} 단계</div>
      <h1 className="text-3xl font-black mb-1 text-center">🧘 스트레칭 타이머</h1>
      <p className="text-teal-200 text-xs mb-8 text-center">몸을 유연하게 이완해 보세요!</p>

      <div className="text-8xl mb-6 animate-bounce">{current.emoji}</div>
      <h2 className="text-2xl font-black text-teal-300 mb-2">{current.name}</h2>
      <p className="text-slate-200 text-sm mb-6 text-center max-w-xs">{current.desc}</p>

      <div className="text-7xl font-black text-white mb-6">
        {timeLeft}<span className="text-2xl">초</span>
      </div>

      <div className="w-full max-w-xs h-4 bg-teal-900 rounded-full overflow-hidden border border-teal-700">
        <div
          className="h-full bg-teal-400 transition-all duration-1000"
          style={{ width: `${((current.duration - timeLeft) / current.duration) * 100}%` }}
        />
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-teal-400 mb-2">✨ 스트레칭 완료!</div>
          <p className="text-xl text-white font-bold mb-4">+500점 획득</p>
        </div>
      )}
    </div>
  );
};
