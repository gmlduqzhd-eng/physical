import { useState, useRef } from 'react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const BalloonPump = ({ groupId, enqueueAction }: Props) => {
  const [size, setSize] = useState(60);
  const [popped, setPopped] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const lockRef = useRef(false);
  // 풍선이 터지는 임계값 (120~220 사이 랜덤)
  const [popThreshold] = useState(() => 120 + Math.floor(Math.random() * 100));

  const handlePump = () => {
    if (popped || cashedOut) return;
    const newSize = size + 4 + Math.floor(Math.random() * 4);
    if (newSize >= popThreshold) {
      setPopped(true);
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 0 }, timestamp: Date.now() });
    } else {
      setSize(newSize);
    }
  };

  const handleCashOut = () => {
    if (popped || cashedOut || lockRef.current) return;
    lockRef.current = true;
    setCashedOut(true);
    const score = Math.floor((size - 60) * 5);
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: score }, timestamp: Date.now() });
  };

  const progress = Math.min(100, ((size - 60) / (popThreshold - 60)) * 100);

  return (
    <div className="min-h-[100dvh] bg-sky-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-sky-500/5"></div>
      
      <h1 className="text-3xl font-black text-white mb-2 text-center relative z-10">풍선 불기</h1>
      <p className="text-sky-300 font-bold mb-8 text-center relative z-10 text-sm">
        {popped ? '💥 펑! 풍선이 터졌습니다!' : cashedOut ? `🎉 ${Math.floor((size - 60) * 5)}점 획득!` : '펌프를 눌러 풍선을 불리고, 터지기 전에 수금하세요!'}
      </p>

      {/* 풍선 */}
      <div className="relative z-10 mb-8 flex items-center justify-center" style={{ height: 240 }}>
        {!popped ? (
          <div 
            className="rounded-full bg-gradient-to-br from-pink-400 to-rose-600 shadow-[0_0_40px_rgba(244,63,94,0.3)] transition-all duration-100 flex items-center justify-center"
            style={{ width: size, height: size * 1.2 }}
          >
            <span className="text-white/50 font-black text-2xl">🎈</span>
          </div>
        ) : (
          <div className="text-8xl animate-bounce">💥</div>
        )}
      </div>

      {/* 위험도 게이지 */}
      {!popped && !cashedOut && (
        <div className="w-full max-w-xs h-3 bg-slate-800 rounded-full overflow-hidden relative z-10 mb-8 border border-slate-700">
          <div className={`h-full transition-all duration-100 ${progress > 80 ? 'bg-red-500' : progress > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* 버튼 */}
      {!popped && !cashedOut && (
        <div className="flex gap-4 relative z-10 w-full max-w-xs">
          <button
            onMouseDown={handlePump}
            onTouchStart={(e) => { e.preventDefault(); handlePump(); }}
            className="flex-1 py-5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-2xl text-white font-black text-xl shadow-[0_6px_0_rgba(3,105,161,1)] active:shadow-none active:translate-y-[6px] transition-all"
          >
            펌프! 💨
          </button>
          <button
            onClick={handleCashOut}
            className="flex-1 py-5 bg-amber-500 hover:bg-amber-400 rounded-2xl text-white font-black text-xl shadow-[0_6px_0_rgba(180,83,9,1)] active:shadow-none active:translate-y-[6px] transition-all"
          >
            수금! 💰
          </button>
        </div>
      )}

      {(popped || cashedOut) && (
        <div className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${cashedOut ? 'text-amber-400' : 'text-red-500'}`}>
            {cashedOut ? `+${Math.floor((size - 60) * 5)}점!` : 'BOOM!'}
          </div>
          <p className="text-xl text-white font-bold">
            {cashedOut ? '안전하게 수금했습니다!' : '욕심이 과했네요...'}
          </p>
        </div>
      )}
    </div>
  );
};
