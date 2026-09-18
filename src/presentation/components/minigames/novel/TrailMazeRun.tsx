import { useState, useRef, useEffect } from 'react';
import { Mountain, AlertCircle } from 'lucide-react';
import { sfxTap, sfxSuccess, sfxFail } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const TrailMazeRun = ({ groupId, enqueueAction }: Props) => {
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [finished, setFinished] = useState(false);
  const [stumble, setStumble] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%

  const isDragging = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPosRef = useRef({ x: 30, y: 150 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const finishGame = (finalScore?: number) => {
    setFinished(true);
    const s = finalScore !== undefined ? finalScore : score;
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: s },
      timestamp: Date.now(),
    });
  };

  // 캔버스에 굽이치는 트레일 오솔길 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 숲
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 트레일 패스 (안전 경로)
    ctx.lineWidth = 44;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#d97706'; // 흙길 색상

    ctx.beginPath();
    ctx.moveTo(30, 150);
    if (stage === 1) {
      ctx.quadraticCurveTo(110, 40, 180, 150);
      ctx.quadraticCurveTo(250, 260, 330, 150);
    } else if (stage === 2) {
      ctx.lineTo(80, 240);
      ctx.lineTo(180, 60);
      ctx.lineTo(260, 240);
      ctx.lineTo(330, 150);
    } else {
      ctx.bezierCurveTo(80, 40, 120, 270, 200, 150);
      ctx.bezierCurveTo(270, 40, 290, 270, 330, 150);
    }
    ctx.stroke();

    // 트레일 중심 유도선
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fef3c7';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 출발지 & 도착지 깃발
    ctx.font = '20px sans-serif';
    ctx.fillText('🚩', 15, 140);
    ctx.fillText('🏁', 315, 140);

    // 러너 현재 위치
    ctx.font = '26px sans-serif';
    ctx.fillText('🏃', currentPosRef.current.x - 12, currentPosRef.current.y + 8);
  }, [stage, stumble]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (finished) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 출발선 근처(x < 60)에서만 드래그 시작 가능
    if (x <= 60 && Math.abs(y - 150) <= 35) {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      currentPosRef.current = { x, y };
      sfxTap();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || finished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 경로 바깥 덤불에 닿았는지 체크 (픽셀 색상 기반: 흙길 색상이 아니면 탈락)
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    // 숲 바닥 색 (#064e3b -> r:6, g:78, b:59)
    const isForest = pixel[0] < 50 && pixel[1] > 60 && pixel[2] < 70;

    if (isForest) {
      // 탈락: 덤불에 걸려 넘어짐
      isDragging.current = false;
      setStumble(true);
      sfxFail();
      currentPosRef.current = { x: 30, y: 150 };
      setProgress(0);
      setTimeout(() => setStumble(false), 800);
      return;
    }

    currentPosRef.current = { x, y };
    const pct = Math.max(0, Math.min(100, Math.round(((x - 30) / (330 - 30)) * 100)));
    setProgress(pct);

    // 골인 체크 (x >= 315)
    if (x >= 315) {
      isDragging.current = false;
      sfxSuccess();
      const add = 60;
      const nextScore = score + add;
      setScore(nextScore);

      if (stage >= 3) {
        finishGame(nextScore + 50);
      } else {
        setStage(s => s + 1);
        currentPosRef.current = { x: 30, y: 150 };
        setProgress(0);
      }
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Mountain className="w-6 h-6 text-amber-400" />
          <span className="text-white font-bold text-lg">모험 트레일 러닝</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">코스 {stage}/3</span>
          <span className="text-amber-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      <div className="text-xs text-center text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 w-full my-1">
        🚩 출발지(왼쪽)의 주자를 터치한 채로 숲길을 따라 🏁 결승선까지 드래그하세요!
      </div>

      {/* 오솔길 캔버스 */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-xl my-2 touch-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={300}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-[300px] cursor-crosshair"
        />

        {stumble && (
          <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center animate-shake">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-1 animate-bounce" />
            <span className="text-white font-bold text-lg">덤불에 발이 걸렸습니다!</span>
            <span className="text-xs text-rose-300">출발선에서 다시 침착하게 달려보세요.</span>
          </div>
        )}
      </div>

      {/* 주행 진행률 */}
      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
        <div
          className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-slate-400 text-center mt-2">
        💡 녹색 덤불에 손가락이 닿으면 넘어집니다. 흙길 중앙을 부드럽게 이어가세요!
      </p>
    </div>
  );
};
