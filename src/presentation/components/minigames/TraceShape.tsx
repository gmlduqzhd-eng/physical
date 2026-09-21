import { useState, useRef } from 'react';
import { sfxClick } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

const SHAPES = [
  { name: '별', points: [[50,5],[63,35],[97,39],[72,60],[78,95],[50,77],[22,95],[28,60],[3,39],[37,35]] },
  { name: '하트', points: [[50,85],[15,50],[5,30],[15,10],[35,5],[50,20],[65,5],[85,10],[95,30],[85,50]] },
  { name: '삼각형', points: [[50,5],[95,90],[5,90]] },
];

export const TraceShape = ({ groupId, enqueueAction }: Props) => {
  const [shapeIdx, setShapeIdx] = useState(0);
  const [tracing, setTracing] = useState(false);
  const [traced, setTraced] = useState<{x:number;y:number}[]>([]);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState<number|null>(null);
  const totalRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: ((cx - rect.left)/rect.width)*100, y: ((cy - rect.top)/rect.height)*100 };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); const p = getPos(e); if (p) { setTracing(true); setTraced([p]); setRoundScore(null); } };
  const handleMove = (e: React.TouchEvent | React.MouseEvent) => { if (!tracing) return; e.preventDefault(); const p = getPos(e); if (p) setTraced(prev => [...prev, p]); };
  const handleEnd = () => {
    if (!tracing || traced.length < 5) return;
    setTracing(false);
    sfxClick();
    const pts = Math.min(500, Math.floor(traced.length * 3));
    setRoundScore(pts);
    setTotalScore(s => s + pts);
    totalRef.current += pts;
    if (round >= 3) {
      setTimeout(() => enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: totalRef.current }, timestamp: Date.now() }), 1000);
    } else {
      setTimeout(() => { setRound(r => r + 1); setShapeIdx(s => (s + 1) % SHAPES.length); setTraced([]); setRoundScore(null); }, 1200);
    }
  };

  const shape = SHAPES[shapeIdx];
  const svgPath = shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ') + ' Z';

  return (
    <div className="min-h-[100dvh] bg-emerald-950 flex flex-col items-center justify-center p-4 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-2 relative z-10">
        <div><span className="text-cyan-300 text-sm font-bold">라운드</span><div className="text-white text-2xl font-black">{round}/3</div></div>
        <div className="text-right"><span className="text-cyan-300 text-sm font-bold">총 점수</span><div className="text-white text-2xl font-black">{totalScore}</div></div>
      </div>
      <h1 className="text-2xl font-black text-white mb-1 text-center relative z-10">✏️ 도형 따라 그리기</h1>
      <p className="text-cyan-200 font-bold mb-2 text-center text-xs relative z-10">{shape.name} 모양을 따라 그리세요!</p>
      <div ref={canvasRef} className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-3xl border-2 border-emerald-800 overflow-hidden z-10 touch-none"
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <path d={svgPath} fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="2" strokeDasharray="4" />
          {traced.length > 1 && <polyline fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" points={traced.map(p => `${p.x},${p.y}`).join(' ')} />}
        </svg>
      </div>
      {roundScore !== null && <div className="mt-4 text-2xl font-black text-cyan-300">+{roundScore}점!</div>}
    </div>
  );
};
