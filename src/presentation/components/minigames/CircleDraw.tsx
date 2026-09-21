import { useState, useRef } from 'react';
import { sfxClick } from '../../../application/soundEffects';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

export const CircleDraw = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<{x: number; y: number}[]>([]);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const totalRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setDrawing(true);
    setPoints([pos]);
    setScore(null);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    if (pos) setPoints(prev => [...prev, pos]);
  };

  const handleEnd = () => {
    if (!drawing || points.length < 10) return;
    setDrawing(false);
    // 원형도 계산
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const dists = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
    const avgR = dists.reduce((s, d) => s + d, 0) / dists.length;
    const variance = dists.reduce((s, d) => s + (d - avgR) ** 2, 0) / dists.length;
    const circularity = Math.max(0, 100 - Math.sqrt(variance) * 2);
    const pts = Math.round(circularity * 5);
    setScore(pts);
    sfxClick();
    setTotalScore(s => s + pts);
    totalRef.current += pts;

    if (round >= 3) {
      setTimeout(() => {
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: totalRef.current }, timestamp: Date.now() });
      }, 1000);
    } else {
      setTimeout(() => { setRound(r => r + 1); setPoints([]); setScore(null); }, 1200);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-rose-950 flex flex-col items-center justify-center p-4 relative overflow-hidden z-[9999] select-none">
      <div className="flex justify-between w-full max-w-sm mb-2 relative z-10">
        <div><span className="text-pink-300 text-sm font-bold">라운드</span><div className="text-white text-2xl font-black">{round}/3</div></div>
        <div className="text-right"><span className="text-pink-300 text-sm font-bold">총 점수</span><div className="text-white text-2xl font-black">{totalScore}</div></div>
      </div>
      <h1 className="text-2xl font-black text-white mb-1 text-center relative z-10">⭕ 원 그리기 대결</h1>
      <p className="text-pink-200 font-bold mb-2 text-center text-xs relative z-10">팔을 크게 뻗어 완벽한 원을 그리세요!</p>
      <div ref={canvasRef} className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-3xl border-2 border-rose-800 overflow-hidden z-10 touch-none"
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}>
        {/* 가이드 원 */}
        <div className="absolute inset-[15%] border-2 border-dashed border-rose-700/30 rounded-full" />
        {/* 그린 경로 */}
        <svg className="absolute inset-0 w-full h-full">
          {points.length > 1 && <polyline fill="none" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" points={points.map(p => `${p.x},${p.y}`).join(' ')} />}
        </svg>
        {points.length === 0 && !score && <div className="absolute inset-0 flex items-center justify-center text-rose-600 font-bold">여기에 원을 그리세요!</div>}
      </div>
      {score !== null && <div className={`mt-4 text-3xl font-black ${score >= 400 ? 'text-emerald-400' : score >= 250 ? 'text-yellow-400' : 'text-red-400'}`}>{score >= 400 ? '완벽! 🎯' : score >= 250 ? '좋아요! 👍' : '다시 도전! 💪'} +{score}점</div>}
    </div>
  );
};
