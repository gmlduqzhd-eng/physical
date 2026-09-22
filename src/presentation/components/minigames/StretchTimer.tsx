import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

interface StretchPose {
  id: 'reach_sky' | 'side_stretch' | 'shoulder_roll';
  name: string;
  desc: string;
  duration: number;
}

const POSES: StretchPose[] = [
  { id: 'reach_sky', name: '기지개 켜기', desc: '두 팔을 하늘 높이 쭉 뻗어 온몸을 펴세요!', duration: 7 },
  { id: 'side_stretch', name: '옆구리 늘리기', desc: '한 손을 머리 위로 넘겨 상체를 옆으로 길게 늘리세요!', duration: 7 },
  { id: 'shoulder_roll', name: '어깨 돌리기', desc: '양손을 어깨에 올리고 팔꿈치로 원을 그리며 돌리세요!', duration: 7 },
];

const PoseIllustration = ({ poseId }: { poseId: StretchPose['id'] }) => {
  if (poseId === 'reach_sky') {
    // 기지개 켜기: 두 팔을 Y자로 하늘을 향해 높이 뻗고 몸통을 곧게 편 자세
    return (
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-2xl">
          {/* 부드러운 배경 원광 */}
          <circle cx="80" cy="80" r="70" fill="#0D9488" fillOpacity="0.25" />
          {/* 머리 */}
          <circle cx="80" cy="38" r="16" fill="#FDE047" />
          {/* 미소 */}
          <path d="M 75 42 Q 80 47 85 42" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* 눈 */}
          <circle cx="74" cy="36" r="2" fill="#713F12" />
          <circle cx="86" cy="36" r="2" fill="#713F12" />
          {/* 몸통 */}
          <line x1="80" y1="54" x2="80" y2="105" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" />
          {/* 왼팔 (위로 쭉 뻗음) */}
          <path d="M 80 62 L 44 20" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" />
          <circle cx="43" cy="18" r="6" fill="#FDE047" />
          {/* 오른팔 (위로 쭉 뻗음) */}
          <path d="M 80 62 L 116 20" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" />
          <circle cx="117" cy="18" r="6" fill="#FDE047" />
          {/* 양다리 */}
          <line x1="80" y1="105" x2="62" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          <line x1="80" y1="105" x2="98" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          {/* 하늘 방향 신장 가이드 화살표 */}
          <path d="M 80 18 L 80 4" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 74 10 L 80 4 L 86 10" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    );
  }

  if (poseId === 'side_stretch') {
    // 옆구리 늘리기: 한 손은 허리에 올리고 다른 팔은 머리 위로 아치형으로 넘겨 옆구리를 늘린 정확한 자세
    return (
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-2xl">
          {/* 부드러운 배경 원광 */}
          <circle cx="80" cy="80" r="70" fill="#0EA5E9" fillOpacity="0.25" />
          {/* 머리 (상체 기울기에 맞춤) */}
          <circle cx="94" cy="42" r="16" fill="#FDE047" />
          <path d="M 89 45 Q 94 50 99 45" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="88" cy="40" r="2" fill="#713F12" />
          <circle cx="99" cy="40" r="2" fill="#713F12" />
          {/* 상체 (옆으로 휜 아치형) */}
          <path d="M 90 58 Q 84 82 76 105" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" fill="none" />
          {/* 왼팔 (손을 허리에 올림) */}
          <path d="M 88 66 L 66 78 L 72 92" stroke="#38BDF8" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="73" cy="93" r="5" fill="#FDE047" />
          {/* 오른팔 (머리 위로 포물선 아치를 그리며 시원하게 옆구리를 늘림) */}
          <path d="M 94 62 C 122 36, 92 8, 52 18" stroke="#F43F5E" strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="19" r="6" fill="#FDE047" />
          {/* 양다리 (안정적인 지지) */}
          <line x1="76" y1="105" x2="56" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          <line x1="76" y1="105" x2="98" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          {/* 옆구리 스트레치 효과선 */}
          <path d="M 52 64 Q 62 82 60 98" stroke="#FBBF24" strokeWidth="3" strokeDasharray="4 3" fill="none" />
          <text x="32" y="84" fill="#FBBF24" fontSize="10" fontWeight="900">옆구리 쭉~</text>
        </svg>
      </div>
    );
  }

  // 어깨 돌리기: 양손을 어깨에 올리고 팔꿈치를 둥글게 회전하는 모션 + 회전 화살표
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-2xl">
        {/* 부드러운 배경 원광 */}
        <circle cx="80" cy="80" r="70" fill="#6366F1" fillOpacity="0.25" />
        {/* 머리 */}
        <circle cx="80" cy="38" r="16" fill="#FDE047" />
        <path d="M 75 42 Q 80 47 85 42" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="74" cy="36" r="2" fill="#713F12" />
        <circle cx="86" cy="36" r="2" fill="#713F12" />
        {/* 몸통 */}
        <line x1="80" y1="54" x2="80" y2="105" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" />
        {/* 왼팔 (손을 어깨에 올린 팔꿈치 자세) */}
        <path d="M 80 62 L 48 64 L 68 58" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="68" cy="58" r="5" fill="#FDE047" />
        {/* 오른팔 (손을 어깨에 올린 팔꿈치 자세) */}
        <path d="M 80 62 L 112 64 L 92 58" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="92" cy="58" r="5" fill="#FDE047" />
        {/* 양다리 */}
        <line x1="80" y1="105" x2="62" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
        <line x1="80" y1="105" x2="98" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
        {/* 어깨 회전 궤적 화살표 좌/우 */}
        <path d="M 38 64 A 14 14 0 1 1 48 78" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 48 81 L 53 74 L 43 75" fill="#34D399" />
        <path d="M 122 64 A 14 14 0 1 0 112 78" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 112 81 L 107 74 L 117 75" fill="#34D399" />
      </svg>
    </div>
  );
};

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
    <div className="min-h-[100dvh] bg-teal-950 flex flex-col items-center justify-center p-6 pt-16 relative overflow-hidden z-[9999] select-none text-white">
      <div className="text-sky-300 font-bold text-sm mb-1">{poseIdx + 1} / {POSES.length} 단계</div>
      <h1 className="text-3xl font-black mb-1 text-center">🧘 스트레칭 타이머</h1>
      <p className="text-slate-300 text-xs mb-6 text-center">동작을 보고 천천히 따라 해보세요!</p>

      {/* 정확한 자세 일러스트 */}
      <div className="mb-4">
        <PoseIllustration poseId={current.id} />
      </div>

      <h2 className="text-2xl font-black text-sky-200 mb-1">{current.name}</h2>
      <p className="text-slate-200 text-sm mb-6 text-center max-w-xs">{current.desc}</p>

      <div className="text-7xl font-black text-white mb-6">
        {timeLeft}<span className="text-2xl font-bold ml-1">초</span>
      </div>

      <div className="w-full max-w-xs h-4 bg-teal-900 rounded-full overflow-hidden border border-teal-700">
        <div
          className="h-full bg-teal-400 transition-all duration-1000"
          style={{ width: `${((current.duration - timeLeft) / current.duration) * 100}%` }}
        />
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center">
          <div className="text-5xl font-black text-sky-300 mb-2">✨ 스트레칭 완료!</div>
          <p className="text-xl text-white font-bold mb-4">+500점 획득</p>
        </div>
      )}
    </div>
  );
};

