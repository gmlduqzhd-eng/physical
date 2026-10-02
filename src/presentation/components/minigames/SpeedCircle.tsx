import { useState, useRef } from 'react';
import { sfxClick, hapticTap } from '../../../application/soundEffects';
interface Props { groupId: string; enqueueAction: (a: any) => void; }
export const SpeedCircle = ({ groupId, enqueueAction }: Props) => {
  const [laps, setLaps] = useState(0); const [finished, setFinished] = useState(false);
  const drawingRef = useRef(false); const finishedRef = useRef(false);
  const lapsRef = useRef(0); const angleRef = useRef(0); const lastAngle = useRef(0); const totalAngle = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null); const TARGET = 10;
  const getAngle = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return 0;
    const cx = e.clientX; const cy = e.clientY;
    return Math.atan2(cy - rect.top - rect.height/2, cx - rect.left - rect.width/2);
  };
  const handleStart = (e: React.PointerEvent<HTMLDivElement>) => { if (finishedRef.current || !e.isPrimary) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drawingRef.current = true; lastAngle.current = getAngle(e); };
  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => { if (!drawingRef.current || finishedRef.current || !e.isPrimary) return; e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    if (Math.hypot(e.clientX - rect.left - rect.width/2, e.clientY - rect.top - rect.height/2) < rect.width * 0.15) return;
    const angle = getAngle(e); let delta = angle - lastAngle.current;
    if (delta > Math.PI) delta -= 2 * Math.PI; if (delta < -Math.PI) delta += 2 * Math.PI;
    totalAngle.current += delta; lastAngle.current = angle; angleRef.current = angle;
    if (Math.abs(totalAngle.current) >= Math.PI * 2) { totalAngle.current -= Math.sign(totalAngle.current) * Math.PI * 2; sfxClick(); hapticTap();
      const next = lapsRef.current + 1; lapsRef.current = next; setLaps(next);
      if (next >= TARGET) { finishedRef.current = true; enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() }); setFinished(true); }
    } };
  const handleEnd = () => { drawingRef.current = false; };
  return (
    <div className="min-h-[100dvh] bg-cyan-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <h1 className="text-2xl font-black text-white mb-2 text-center relative z-10">🌀 빙글빙글!</h1>
      <p className="text-cyan-300 font-bold mb-2 text-center text-xs relative z-10">팔을 크게 뻗어 원을 {TARGET}바퀴 그리세요!</p>
      <div className="text-cyan-400 font-bold mb-4 relative z-10">{laps}/{TARGET} 바퀴</div>
      <div ref={canvasRef} className="relative w-64 h-64 bg-slate-800 rounded-full border-4 border-cyan-700 z-10 touch-none flex items-center justify-center"
        onPointerDown={handleStart} onPointerMove={handleMove} onPointerUp={handleEnd} onPointerCancel={handleEnd}>
        <div className="w-full max-w-[80%] h-4 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all" style={{ width: `${(laps / TARGET) * 100}%` }} />
        </div>
        <div className="absolute text-4xl" style={{ transform: `rotate(${angleRef.current}rad) translateX(110px)` }}>👆</div>
      </div>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-cyan-400 mb-4">완주! 🎉</div><p className="text-xl text-white font-bold">+500점</p></div>}
    </div>);
};
