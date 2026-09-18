import { useState, useRef, useEffect } from 'react';
import { Target, Wind } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxPop, sfxFail, sfxTap } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const SlingshotArchery = ({ groupId, enqueueAction }: Props) => {
  const [arrowCount, setArrowCount] = useState(5);
  const [pullVector, setPullVector] = useState({ x: 0, y: 0 });
  const [isPulling, setIsPulling] = useState(false);
  const [wind, setWind] = useState(1.5); // wind factor
  const [score, setScore] = useState(0);
  const [lastShot, setLastShot] = useState<{ ring: string; pts: number } | null>(null);
  const [finished, setFinished] = useState(false);

  const anchorRef = useRef({ x: 180, y: 240 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 각 발마다 바람 변화
    setWind((Math.random() - 0.5) * 4);
  }, [arrowCount]);

  const finishGame = (finalScore?: number) => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: finalScore !== undefined ? finalScore : score },
      timestamp: Date.now(),
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (arrowCount <= 0 || finished) return;
    setIsPulling(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sfxTap();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPulling || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // 앵커 기준으로 뒤로 당겨진 벡터 계산
    const dx = Math.max(-60, Math.min(60, currentX - anchorRef.current.x));
    const dy = Math.max(0, Math.min(80, currentY - anchorRef.current.y)); // 아래로 당김

    setPullVector({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (!isPulling) return;
    setIsPulling(false);
    sfxWhoosh();

    // 발사 궤적 계산
    // 뒤로 당긴 만큼 반대 방향으로 발사 (-dx, -dy)
    const power = Math.hypot(pullVector.x, pullVector.y);
    if (power < 15) {
      setPullVector({ x: 0, y: 0 });
      return; // 너무 살짝 당김
    }

    // 타겟 중심과의 거리 계산 (바람 영향 포함)
    const targetOffset = Math.hypot(
      -pullVector.x * 1.5 + wind * 8,
      -pullVector.y * 1.5 + 85
    );

    let pts = 0;
    let ring = '빗나감';
    if (targetOffset <= 20) {
      pts = 10;
      ring = '텐(10점) 엑스텐 정중앙!';
      sfxSuccess();
    } else if (targetOffset <= 45) {
      pts = 8;
      ring = '골드(8점) 원!';
      sfxPop();
    } else if (targetOffset <= 75) {
      pts = 5;
      ring = '레드(5점) 원!';
      sfxPop();
    } else {
      pts = 1;
      ring = '외곽(1점)';
      sfxFail();
    }

    const nextScore = score + pts * 10;
    setScore(nextScore);
    setLastShot({ ring, pts: pts * 10 });
    setPullVector({ x: 0, y: 0 });

    const remaining = arrowCount - 1;
    setArrowCount(remaining);

    if (remaining <= 0) {
      setTimeout(() => finishGame(nextScore), 1200);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-yellow-400" />
          <span className="text-white font-bold text-lg">슬링샷 양궁 퍼펙트 텐</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">화살 {arrowCount}발</span>
          <span className="text-yellow-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 풍향 표시 */}
      <div className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 flex items-center justify-between text-xs text-slate-300 my-1">
        <div className="flex items-center gap-1">
          <Wind className="w-4 h-4 text-sky-400" />
          <span>바람 저항:</span>
        </div>
        <span className="font-bold text-sky-300">
          {wind > 0 ? `동풍 +${wind.toFixed(1)}m/s ▶` : `◀ 서풍 ${Math.abs(wind).toFixed(1)}m/s`}
        </span>
      </div>

      {/* 양궁 과녁 및 슬링샷 발사대 컨테이너 */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-80 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 rounded-2xl overflow-hidden border-2 border-yellow-500/40 shadow-inner flex flex-col items-center justify-between p-4 touch-none cursor-crosshair"
      >
        {/* 상단 양궁 타겟 동심원 */}
        <div className="relative w-36 h-36 rounded-full bg-white border-4 border-slate-800 shadow-xl flex items-center justify-center mt-2">
          <div className="w-28 h-28 rounded-full bg-blue-600 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-inner">
                <div className="w-3 h-3 rounded-full bg-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 하단 슬링샷 활시위 */}
        <div className="relative w-48 h-24 flex items-center justify-center">
          {/* 발사대 기둥 */}
          <div className="absolute w-44 h-2 bg-amber-700 rounded-full top-4" />
          <div className="absolute -left-1 top-0 text-xl">🎋</div>
          <div className="absolute -right-1 top-0 text-xl">🎋</div>

          {/* 당겨지는 시위와 화살 */}
          <div
            className="absolute transition-transform ease-out duration-75 flex flex-col items-center"
            style={{
              transform: `translate(${pullVector.x}px, ${pullVector.y}px)`,
            }}
          >
            <div className="text-3xl -rotate-45 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              🏹
            </div>
            {isPulling && (
              <span className="text-[10px] text-yellow-300 font-bold bg-slate-900/80 px-1 rounded">
                파워: {Math.round(Math.hypot(pullVector.x, pullVector.y))}
              </span>
            )}
          </div>
        </div>

        {lastShot && (
          <div className="absolute top-44 bg-slate-900/90 border border-yellow-500/60 px-4 py-1.5 rounded-full text-center animate-bounce">
            <span className="text-yellow-300 font-bold text-xs">
              🎯 {lastShot.ring} (+{lastShot.pts}점)
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center mt-3">
        화살을 아래로 당겼다가 목표 지점을 향해 손을 놓아 발사하세요! 바람의 방향을 감안해야 합니다.
      </p>
    </div>
  );
};
