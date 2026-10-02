import { useGameTimeouts } from './common/useGameTimeouts';
import { useState, useRef } from 'react';
import { sfxCoin } from '../../../application/soundEffects';
interface Props { groupId: string; enqueueAction: (a: any) => void; }
const COLORS = ['bg-red-500','bg-blue-500','bg-green-500','bg-yellow-500','bg-purple-500','bg-pink-500'];
const createZones = (round: number) => {
  const count = Math.min(2 + Math.floor(round / 3), 4);
  return Array.from({length: count}, (_, i) => ({ top: `${15 + Math.random() * 60}%`, left: `${5 + (i * (80/count)) + Math.random() * 10}%`, color: COLORS[i % COLORS.length] }));
};
export const MultiTouch = ({ groupId, enqueueAction }: Props) => {
  const scheduleTimeout = useGameTimeouts();
  const [score, setScore] = useState(0); const [round, setRound] = useState(1); const [finished, setFinished] = useState(false);
  const [zones, setZones] = useState(() => createZones(1));
  const [touched, setTouched] = useState<Set<number>>(new Set());
  const scoreRef = useRef(0); const TOTAL = 8;
  const touchedRef = useRef(new Set<number>());
  const roundLockedRef = useRef(false);
  const handleZoneTouch = (idx: number) => {
    if (finished || roundLockedRef.current || touchedRef.current.has(idx)) return;
    const newTouched = new Set(touchedRef.current); newTouched.add(idx);
    touchedRef.current = newTouched;
    setTouched(newTouched); sfxCoin();
    if (newTouched.size >= zones.length) {
      roundLockedRef.current = true;
      const pts = 50; scoreRef.current += pts; setScore(scoreRef.current);
      if (round >= TOTAL) { setFinished(true); enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current }, timestamp: Date.now() }); }
      else { scheduleTimeout(() => { setRound(round + 1); setZones(createZones(round + 1)); touchedRef.current = new Set(); setTouched(new Set()); roundLockedRef.current = false; }, 500); }
    }
  };
  return (
    <div className="min-h-[100dvh] bg-violet-950 flex flex-col items-center p-4 relative overflow-hidden z-[9999] select-none">
      <div className="text-purple-300 font-bold text-sm mb-1">{round}/{TOTAL} 라운드 | 점수: {score}</div>
      <h1 className="text-2xl font-black text-white mb-1 text-center relative z-10">🖐️ 양손 터치</h1>
      <p className="text-purple-200 font-bold mb-2 text-center text-xs relative z-10">모든 버튼을 동시에(빠르게) 터치하세요!</p>
      <div className="relative w-full flex-1 min-h-[70vh] z-10">
        {zones.map((z, i) => (
          <button key={`${round}-${i}`} onPointerDown={() => handleZoneTouch(i)} aria-label={`${i + 1}번 터치 구역`}
            className={`absolute w-20 h-20 rounded-full font-black text-white text-2xl flex items-center justify-center transition-all ${touched.has(i) ? 'bg-slate-700 scale-75 opacity-50' : `${z.color} animate-pulse shadow-lg`}`}
            style={{ top: z.top, left: z.left }}>
            {touched.has(i) ? '✅' : '👆'}
          </button>
        ))}
      </div>
      {finished && <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center"><div className="text-5xl font-black text-purple-300 mb-4">{score}점!</div><p className="text-xl text-white font-bold">양손 터치 완료!</p></div>}
    </div>);
};
