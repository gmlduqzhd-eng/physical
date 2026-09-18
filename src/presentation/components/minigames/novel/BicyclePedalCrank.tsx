import { useState, useRef, useEffect } from 'react';
import { Bike } from 'lucide-react';
import { sfxSuccess, sfxWhoosh } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const BicyclePedalCrank = ({ groupId, enqueueAction }: Props) => {
  const [rotations, setRotations] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [speedRpm, setSpeedRpm] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);

  const dialRef = useRef<HTMLDivElement>(null);
  const lastAngleRef = useRef<number | null>(null);
  const cumulativeAngleRef = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    // 자연 감속 루프
    const decayTimer = setInterval(() => {
      setSpeedRpm(rpm => Math.max(0, Math.round(rpm * 0.92)));
    }, 200);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(decayTimer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(decayTimer);
    };
  }, []);

  const finishGame = () => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(250, Math.round(cumulativeAngleRef.current / 360) * 15) },
      timestamp: Date.now(),
    });
  };

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = (rad * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (lastAngleRef.current !== null) {
      let delta = deg - lastAngleRef.current;
      // 360도 경계 처리 (시계 방향 회전 감지)
      if (delta < -180) delta += 360;
      if (delta > 180) delta -= 360;

      if (delta > 0) {
        // 시계 방향 정회전!
        cumulativeAngleRef.current += delta;
        const totalRots = Math.floor(cumulativeAngleRef.current / 360);
        setRotations(totalRots);
        setDistanceKm(Number((cumulativeAngleRef.current / 360 * 0.05).toFixed(2)));
        setSpeedRpm(prev => Math.min(180, prev + Math.round(delta * 0.8)));

        if (Math.round(cumulativeAngleRef.current) % 360 < 20) {
          sfxWhoosh();
        }
      }
    }

    lastAngleRef.current = deg;
    setCurrentAngle(deg);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (finished) return;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lastAngleRef.current = null;
    calculateAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || finished) return;
    calculateAngle(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    lastAngleRef.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Bike className="w-6 h-6 text-cyan-400" />
          <span className="text-white font-bold text-lg">자전거 크랭크 페달</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{rotations}회전</span>
        </div>
      </div>

      {/* 속도 계기판 및 주행 대시보드 */}
      <div className="w-full bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-4 flex items-center justify-around my-2 shadow-xl">
        <div className="text-center">
          <span className="text-[10px] text-slate-400">속도 (RPM)</span>
          <div className="text-2xl font-black text-cyan-300 font-mono">{speedRpm}</div>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-slate-400">주행 거리</span>
          <div className="text-2xl font-black text-emerald-300 font-mono">{distanceKm} km</div>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-slate-400">파워 획득</span>
          <div className="text-2xl font-black text-amber-300 font-mono">{rotations * 15}점</div>
        </div>
      </div>

      {/* 원형 페달 크랭크 제스처 영역 */}
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-64 h-64 rounded-full border-4 border-slate-700 bg-slate-950 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none my-3"
      >
        {/* 기어 톱니 링 */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-500/30 animate-spin-slow pointer-events-none" />

        {/* 회전 크랭크 암 & 페달 */}
        <div
          className="absolute w-full h-full pointer-events-none flex items-center justify-center transition-transform ease-out duration-75"
          style={{ transform: `rotate(${currentAngle}deg)` }}
        >
          <div className="w-3 h-40 bg-gradient-to-b from-slate-400 via-slate-600 to-slate-400 rounded-full shadow-lg relative flex items-start justify-center">
            {/* 상단 페달 */}
            <div className="w-10 h-5 bg-amber-500 rounded-md border border-amber-300 shadow-md -mt-2" />
          </div>
        </div>

        <div className="relative z-10 w-16 h-16 rounded-full bg-cyan-900 border-4 border-cyan-400 flex items-center justify-center pointer-events-none">
          <Bike className="w-8 h-8 text-white" />
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        💡 페달 핸들을 잡고 시계 방향으로 원을 뱅글뱅글 힘차게 연속으로 돌리세요!
      </p>
    </div>
  );
};
