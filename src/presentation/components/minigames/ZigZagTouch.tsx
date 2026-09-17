import { useState, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';
interface Props { groupId: string; enqueueAction: (a: any) => void; }
export const ZigZagTouch = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0); const [current, setCurrent] = useState(0); const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const [targets] = useState(() => {
    const t: {x: number; y: number}[] = [];
    for (let i = 0; i < 20; i++) t.push({ x: i % 2 === 0 ? 15 + Math.random() * 25 : 60 + Math.random() * 25, y: 5 + i * 4.5 });
    return t;
  });
  const handleTouch = (idx: number) => {
    if (idx !== current || finished) return;
    sfxCoin(); setScore(s => { const n = s + 1; scoreRef.current = n; return n; }); setCurrent(c => c + 1);
    if (idx >= targets.length - 1) { setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() }); }
  };
  return (
    <div className="min-h-[100dvh] bg-lime-950 flex flex-col items-center p-4 relative overflow-hidden z-[9999] select-none">
      <h1 className="text-2xl font-black text-white mb-1 text-center relative z-10">⚡ 지그재그 런!</h1>
      <p className="text-lime-300 font-bold mb-2 text-center text-xs relative z-10">순서대로 빠르게 터치하세요! ({score}/{targets.length})</p>
      <div className="relative w-full max-w-sm flex-1 min-h-[80vh] z-10">
        {targets.map((t, i) => (
          <button key={i} onClick={() => handleTouch(i)}
            className={`absolute w-12 h-12 rounded-full font-black text-sm flex items-center justify-center transition-all ${i < current ? 'bg-lime-700/30 text-lime-700 scale-75' : i === current ? 'bg-lime-500 text-white animate-pulse shadow-[0_0_20px_rgba(132,204,22,0.4)] scale-110' : 'bg-slate-700 text-slate-500'}`}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}>
            {i + 1}
          </button>
        ))}
      </div>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-lime-400 mb-4">완주! 🏃</div><p className="text-xl text-white font-bold">+500점</p></div>}
    </div>);
};
