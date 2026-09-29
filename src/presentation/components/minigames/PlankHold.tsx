import { useState, useEffect, useRef } from 'react';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const PlankHold = ({ groupId, enqueueAction }: Props) => {
  const [holdTime, setHoldTime] = useState(0);
  const [stable, setStable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const holdRef = useRef(0);
  const stableRef = useRef(false);
  const failedRef = useRef(false);
  const finishedRef = useRef(false);
  const isPointerHolding = useRef(false);
  const TARGET = 30;

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (failedRef.current || finishedRef.current) return;
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const isLevel = Math.abs(beta) < 25 && Math.abs(gamma) < 25;
      const currentStable = isLevel || isPointerHolding.current;
      stableRef.current = currentStable;
      setStable(currentStable);
      if (!currentStable && holdRef.current > 3 && !failedRef.current && !finishedRef.current) {
        failedRef.current = true;
        finishedRef.current = true;
        setFailed(true);
        setFinished(true);
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: holdRef.current * 15 },
          timestamp: Date.now()
        });
      }
    };
    window.addEventListener('deviceorientation', handler);

    const timer = setInterval(() => {
      if (failedRef.current || finishedRef.current) return;
      if (!stableRef.current) return;

      const next = holdRef.current + 1;
      holdRef.current = next;
      setHoldTime(next);

      if (next >= TARGET && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      }
    }, 1000);

    return () => {
      window.removeEventListener('deviceorientation', handler);
      clearInterval(timer);
    };
  }, [groupId, enqueueAction]);

  const handlePointerDown = () => {
    if (failedRef.current || finishedRef.current) return;
    isPointerHolding.current = true;
    stableRef.current = true;
    setStable(true);
  };

  const handlePointerUp = () => {
    isPointerHolding.current = false;
    stableRef.current = false;
    setStable(false);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 pt-16 relative overflow-hidden z-[9999] select-none transition-colors cursor-pointer touch-none ${
        stable ? 'bg-emerald-950' : 'bg-red-950'
      }`}
    >
      <h1 className="text-3xl font-black text-white mb-2 text-center">💪 코어 플랭크 챌린지</h1>
      <p className="text-slate-300 font-bold mb-4 text-center text-sm">폰을 등 위에 올리고 일직선 플랭크 자세를 유지하세요!</p>

      {/* 정확한 플랭크 자세 SVG 일러스트 */}
      <div className="mb-4 flex items-center justify-center">
        <svg viewBox="0 0 160 80" className="w-52 h-26 drop-shadow-xl">
          {/* 바닥선 */}
          <line x1="10" y1="68" x2="150" y2="68" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          {/* 머리 */}
          <circle cx="130" cy="38" r="10" fill="#FDE047" />
          {/* 몸통 & 다리 (완벽한 일직선 라인) */}
          <line x1="30" y1="48" x2="122" y2="44" stroke="#38BDF8" strokeWidth="12" strokeLinecap="round" />
          {/* 발끝 지지 */}
          <line x1="30" y1="48" x2="26" y2="68" stroke="#818CF8" strokeWidth="8" strokeLinecap="round" />
          {/* 팔꿈치 및 전완 지지 (90도 직각) */}
          <line x1="112" y1="46" x2="112" y2="68" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
          <line x1="112" y1="68" x2="128" y2="68" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
          {/* 등 위에 올려진 스마트폰 */}
          <rect x="65" y="28" width="24" height="12" rx="3" fill="#1E293B" stroke="#34D399" strokeWidth="2.5" />
          <circle cx="85" cy="34" r="1.5" fill="#34D399" />
          {/* 수평 상태 체크 표시 */}
          <text x="63" y="22" fill={stable ? '#34D399' : '#F87171'} fontSize="9" fontWeight="900">
            {stable ? '● 수평 유지' : '▲ 균형 흔들림'}
          </text>
        </svg>
      </div>

      <div className="text-7xl font-black text-white mb-3">{holdTime}<span className="text-2xl font-bold ml-1">초</span></div>
      <div className="w-full max-w-xs h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-3">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all" style={{ width: `${(holdTime / TARGET) * 100}%` }} />
      </div>
      <p className="text-sm font-black">{failed ? '❌ 흔들렸습니다!' : stable ? '✅ 훌륭합니다! 코어를 단단히 유지하세요!' : '⚠️ 등 위의 폰이 떨어지지 않게 수평을 유지하세요!'}</p>
      <p className="text-slate-400 text-xs mt-3 font-bold">목표: {TARGET}초</p>

      {(finished || failed) && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-cyan-300 mb-4">{holdTime}초 버팀!</div><p className="text-xl text-white font-bold">+{finished ? 500 : holdTime * 15}점</p></div>}
    </div>
  );
};
