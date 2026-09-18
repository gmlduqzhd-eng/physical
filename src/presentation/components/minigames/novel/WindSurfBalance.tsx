import { useState, useEffect, useRef } from 'react';
import { Wind, AlertTriangle } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxFail, sfxPop } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const WindSurfBalance = ({ groupId, enqueueAction }: Props) => {
  const [boardAngle, setBoardAngle] = useState(0); // -45 to +45 deg
  const [windForce, setWindForce] = useState(0); // -3 to +3
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [wipeout, setWipeout] = useState(false);

  const angleRef = useRef(0);
  const windRef = useRef(0);
  const wipeoutRef = useRef(false);

  useEffect(() => {
    // 풍향 및 돌풍 시뮬레이션
    const windTimer = setInterval(() => {
      const gust = (Math.random() - 0.5) * 6;
      setWindForce(gust);
      windRef.current = gust;
      if (Math.abs(gust) > 2) {
        sfxWhoosh();
      }
    }, 2200);

    // 물리 루프 (60fps 또는 50ms 주기)
    const physicsTimer = setInterval(() => {
      if (wipeoutRef.current) return;

      setBoardAngle(prev => {
        // 바람 영향 + 자연 복원력
        const next = prev + windRef.current * 0.4;
        angleRef.current = next;

        if (Math.abs(next) >= 42) {
          // 와이프아웃 (전복)
          wipeoutRef.current = true;
          setWipeout(true);
          sfxFail();
          setTimeout(() => {
            // 1.5초 후 복구
            wipeoutRef.current = false;
            setWipeout(false);
            setBoardAngle(0);
            angleRef.current = 0;
          }, 1500);
          return next > 0 ? 45 : -45;
        }

        // 안전 영역(-15 ~ +15도) 내 체공 점수 가산
        if (Math.abs(next) <= 15) {
          setScore(s => s + 1);
        }
        return next;
      });
    }, 50);

    // 전체 게임 타이머
    const gameTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer);
          clearInterval(windTimer);
          clearInterval(physicsTimer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(gameTimer);
      clearInterval(windTimer);
      clearInterval(physicsTimer);
    };
  }, []);

  const finishGame = () => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: Math.min(200, score) },
      timestamp: Date.now(),
    });
  };

  const steer = (delta: number) => {
    if (wipeout || finished) return;
    sfxPop();
    setBoardAngle(prev => {
      const next = Math.max(-45, Math.min(45, prev + delta));
      angleRef.current = next;
      return next;
    });
  };

  const isSafe = Math.abs(boardAngle) <= 15;

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Wind className="w-6 h-6 text-sky-400" />
          <span className="text-white font-bold text-lg">바람을 타는 윈드서핑</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sky-400 font-mono font-bold text-lg">{timeLeft}s</span>
          <span className="text-emerald-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      {/* 바람 상태 인디케이터 */}
      <div className="w-full bg-slate-900 border border-sky-500/30 rounded-xl p-2.5 flex items-center justify-between my-2">
        <span className="text-xs text-slate-300">현재 돌풍:</span>
        <div className="flex items-center gap-1 font-bold text-sm">
          {windForce < -1 && <span className="text-blue-400">◀ 좌측 돌풍 ({windForce.toFixed(1)})</span>}
          {windForce > 1 && <span className="text-cyan-400">우측 돌풍 ({windForce.toFixed(1)}) ▶</span>}
          {Math.abs(windForce) <= 1 && <span className="text-emerald-400">잔잔한 바람 ({windForce.toFixed(1)})</span>}
        </div>
      </div>

      {/* 서핑 보드 밸런스 시각화 */}
      <div className="relative w-full h-64 bg-gradient-to-b from-sky-950 via-blue-900 to-indigo-950 rounded-2xl overflow-hidden border-2 border-sky-400/40 shadow-inner flex flex-col items-center justify-center p-4">
        {/* 파도 배경 라인 */}
        <div className="absolute bottom-6 w-full h-1 bg-cyan-400/30 border-t border-dashed border-cyan-300/40" />

        {/* 녹색 세이프 존 가이드 각도 (-15 ~ +15) */}
        <div className="absolute w-32 h-32 rounded-full border-4 border-dashed border-emerald-500/40 pointer-events-none" />

        {/* 윈드서핑 캐릭터 및 보트 */}
        <div
          className={`flex flex-col items-center transition-transform duration-100 ${wipeout ? 'animate-spin opacity-50' : ''}`}
          style={{ transform: `rotate(${boardAngle}deg)` }}
        >
          <div className="text-5xl mb-1">🏄</div>
          <div className={`w-36 h-3.5 rounded-full shadow-lg ${isSafe ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'}`} />
        </div>

        {wipeout && (
          <div className="absolute inset-0 bg-blue-950/80 flex flex-col items-center justify-center text-center p-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <span className="text-white font-black text-lg">물에 빠졌습니다 (Wipeout)!</span>
            <span className="text-xs text-sky-300 mt-1">곧 보드를 다시 세웁니다...</span>
          </div>
        )}

        <div className="absolute bottom-2 text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900/80 text-white">
          기울기: {Math.round(boardAngle)}° {isSafe ? '(안정 유지 중)' : '(위험 구간!)'}
        </div>
      </div>

      {/* 조향 제어 버튼 (좌 / 우 카운터 스티어) */}
      <div className="grid grid-cols-2 gap-4 w-full mt-4">
        <button
          onClick={() => steer(-9)}
          disabled={wipeout || finished}
          className="py-5 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg border border-indigo-400/40 flex items-center justify-center gap-2"
        >
          <span>◀ 왼쪽으로 눕히기</span>
        </button>

        <button
          onClick={() => steer(9)}
          disabled={wipeout || finished}
          className="py-5 bg-gradient-to-br from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg border border-cyan-400/40 flex items-center justify-center gap-2"
        >
          <span>오른쪽으로 눕히기 ▶</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-3">
        돌풍에 보드가 뒤집히지 않도록 반대 방향으로 중심을 잡고 가운데 초록 각도를 유지하세요!
      </p>
    </div>
  );
};
