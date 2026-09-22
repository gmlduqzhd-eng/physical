import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxPop } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

interface DancePoseItem {
  id: 'sky' | 'front' | 'tilt_left' | 'tilt_right' | 'bow' | 'back';
  name: string;
  desc: string;
}

const POSES: DancePoseItem[] = [
  { id: 'sky', name: '하늘 위로!', desc: '팔을 머리 위로 힘차게 뻗으세요!' },
  { id: 'front', name: '앞으로 뻗어!', desc: '두 팔을 앞으로 곧게 뻗으세요!' },
  { id: 'tilt_left', name: '왼쪽으로 틸트!', desc: '상체를 왼쪽으로 슉 기울이세요!' },
  { id: 'tilt_right', name: '오른쪽으로 틸트!', desc: '상체를 오른쪽으로 슉 기울이세요!' },
  { id: 'bow', name: '아래로 숙여!', desc: '허리를 숙여 손을 발 방향으로 내리세요!' },
  { id: 'back', name: '가슴 펴고 젖혀!', desc: '가슴을 활짝 펴고 상체를 살짝 젖히세요!' },
];

const DanceIllustration = ({ poseId }: { poseId: DancePoseItem['id'] }) => {
  return (
    <div className="flex items-center justify-center mb-3">
      <svg viewBox="0 0 120 120" className="w-36 h-36 drop-shadow-xl animate-pulse">
        {/* 포즈별 그래픽 */}
        {poseId === 'sky' && (
          <>
            <circle cx="60" cy="28" r="12" fill="#FDE047" />
            <line x1="60" y1="40" x2="60" y2="80" stroke="#E879F9" strokeWidth="10" strokeLinecap="round" />
            {/* 두 팔 위로 */}
            <path d="M 60 48 L 32 14" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            <path d="M 60 48 L 88 14" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            {/* 다리 */}
            <line x1="60" y1="80" x2="45" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <line x1="60" y1="80" x2="75" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
          </>
        )}
        {poseId === 'front' && (
          <>
            <circle cx="60" cy="30" r="12" fill="#FDE047" />
            <line x1="60" y1="42" x2="60" y2="80" stroke="#E879F9" strokeWidth="10" strokeLinecap="round" />
            {/* 팔 앞으로 나란히 (정면 뻗기) */}
            <line x1="60" y1="52" x2="60" y2="70" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            <circle cx="46" cy="52" r="8" fill="#F472B6" />
            <circle cx="74" cy="52" r="8" fill="#F472B6" />
            {/* 다리 */}
            <line x1="60" y1="80" x2="46" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <line x1="60" y1="80" x2="74" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
          </>
        )}
        {poseId === 'tilt_left' && (
          <>
            {/* 머리 좌측 기울기 */}
            <circle cx="44" cy="30" r="12" fill="#FDE047" />
            {/* 몸통 좌측 기울기 */}
            <line x1="44" y1="42" x2="60" y2="80" stroke="#E879F9" strokeWidth="10" strokeLinecap="round" />
            {/* 팔 좌측 뻗기 */}
            <path d="M 50 50 L 16 38" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            <path d="M 50 50 L 82 66" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            {/* 다리 지지 */}
            <line x1="60" y1="80" x2="44" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <line x1="60" y1="80" x2="76" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <path d="M 24 20 L 14 30 L 24 40" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        )}
        {poseId === 'tilt_right' && (
          <>
            {/* 머리 우측 기울기 */}
            <circle cx="76" cy="30" r="12" fill="#FDE047" />
            {/* 몸통 우측 기울기 */}
            <line x1="76" y1="42" x2="60" y2="80" stroke="#E879F9" strokeWidth="10" strokeLinecap="round" />
            {/* 팔 우측 뻗기 */}
            <path d="M 70 50 L 104 38" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            <path d="M 70 50 L 38 66" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            {/* 다리 지지 */}
            <line x1="60" y1="80" x2="44" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <line x1="60" y1="80" x2="76" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <path d="M 96 20 L 106 30 L 96 40" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        )}
        {poseId === 'bow' && (
          <>
            {/* 숙인 자세 */}
            <circle cx="76" cy="52" r="11" fill="#FDE047" />
            <path d="M 48 78 Q 50 48 70 50" stroke="#E879F9" strokeWidth="10" strokeLinecap="round" fill="none" />
            {/* 아래로 내린 팔 */}
            <line x1="64" y1="56" x2="68" y2="92" stroke="#E879F9" strokeWidth="7.5" strokeLinecap="round" />
            {/* 다리 */}
            <line x1="48" y1="78" x2="44" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <line x1="48" y1="78" x2="56" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
          </>
        )}
        {poseId === 'back' && (
          <>
            {/* 뒤로 젖힌 자세 */}
            <circle cx="48" cy="26" r="12" fill="#FDE047" />
            <path d="M 60 80 Q 70 52 52 38" stroke="#E879F9" strokeWidth="10" strokeLinecap="round" fill="none" />
            {/* 가슴 활짝 */}
            <path d="M 60 48 L 86 52" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            <path d="M 60 48 L 34 52" stroke="#E879F9" strokeWidth="8" strokeLinecap="round" />
            {/* 다리 */}
            <line x1="60" y1="80" x2="46" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
            <line x1="60" y1="80" x2="74" y2="112" stroke="#A855F7" strokeWidth="9" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
};


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
          <DanceIllustration poseId={pose.id} />
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
