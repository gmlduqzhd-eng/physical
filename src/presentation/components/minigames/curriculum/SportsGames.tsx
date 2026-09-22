import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess, sfxPop, sfxTap, hapticTap } from '../../../../application/soundEffects';

interface GameProps {
  groupId: string;
  enqueueAction: (a: any) => void;
  onExit?: () => void;
}

/* =========================================================================
   11. 🏹 wind-archery-pro (풍향·풍속 탄도학 윈드 양궁)
   ========================================================================= */
export const WindArcheryPro = ({ groupId, enqueueAction }: GameProps) => {
  const [windSpeed, setWindSpeed] = useState(5); // m/s
  const [windDir, setWindDir] = useState<'left' | 'right'>('left');
  const [aimOffset, setAimOffset] = useState(0); // 사용자 조준 오프셋 (-50 ~ 50)
  const [arrowResult, setArrowResult] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const resetWind = () => {
    const spd = Math.floor(Math.random() * 8) + 3; // 3~10 m/s
    const dir = Math.random() > 0.5 ? 'left' : 'right';
    setWindSpeed(spd);
    setWindDir(dir);
    setAimOffset(0);
    setArrowResult(null);
  };

  const handleShoot = () => {
    if (arrowResult !== null || finished) return;
    sfxTap();
    hapticTap();

    // 바람이 공을 미는 픽셀 오프셋: left면 -spd*4, right면 +spd*4
    const windPush = windDir === 'left' ? -windSpeed * 4 : windSpeed * 4;
    // 최종 착탄 위치 (0이 정중앙 10점)
    const finalImpact = aimOffset + windPush;
    const distance = Math.abs(finalImpact);

    let points = 0;
    if (distance <= 8) points = 10;
    else if (distance <= 20) points = 9;
    else if (distance <= 35) points = 8;
    else if (distance <= 50) points = 7;
    else points = 5;

    setArrowResult(points);
    if (points >= 9) sfxCoin(); else sfxPop();

    const newTotal = totalScore + points;
    setTotalScore(newTotal);
    scoreRef.current = newTotal * 20;

    setTimeout(() => {
      if (round >= 3) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: scoreRef.current },
          timestamp: Date.now()
        });
      } else {
        setRound(r => r + 1);
        resetWind();
      }
    }, 1200);
  };

  return (
    <div className="min-h-[100dvh] bg-emerald-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-emerald-300 text-xs font-bold">화살</span><div className="text-2xl font-black">{round} / 3 발</div></div>
        <div className="text-right"><span className="text-emerald-300 text-xs font-bold">점수 합계</span><div className="text-2xl font-black text-amber-400">{totalScore}점</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏹 풍향·풍속 탄도 윈드 양궁</h1>
      <p className="text-xs text-emerald-200 mb-6 text-center max-w-xs">
        바람의 방향과 세기를 읽고, 바람의 반대쪽으로 조준선을 옮겨 쏘세요!
      </p>

      {/* 바람 안내판 */}
      <div className="bg-slate-900/80 border border-emerald-600 rounded-2xl px-5 py-2.5 flex items-center gap-3 mb-6 shadow-lg">
        <span className="text-xs font-bold text-slate-300">현재 바람:</span>
        <span className="text-xl font-black text-cyan-300">
          {windDir === 'left' ? '◀ 서풍' : '동풍 ▶'} {windSpeed} m/s
        </span>
      </div>

      {/* 양궁 과녁 시각화 */}
      <div className="relative w-64 h-64 rounded-full bg-slate-900 border-4 border-emerald-800 flex items-center justify-center overflow-hidden mb-6 shadow-2xl">
        {/* 과녁 동심원 */}
        <div className="w-56 h-56 rounded-full border-2 border-white/20 bg-white flex items-center justify-center">
          <div className="w-44 h-44 rounded-full bg-black flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] font-black text-black">
                  10
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 조준 십자선 (사용자가 오프셋 조절) */}
        <div
          style={{ transform: `translateX(${aimOffset}px)` }}
          className="absolute w-8 h-8 border-2 border-dashed border-cyan-400 rounded-full flex items-center justify-center pointer-events-none shadow-[0_0_15px_rgba(34,211,238,0.9)]"
        >
          <div className="w-2 h-2 bg-cyan-400 rounded-full" />
        </div>

        {/* 화살 착탄 결과 표시 */}
        {arrowResult !== null && (
          <div className="absolute text-3xl font-black text-amber-300 animate-bounce">
            🎯 {arrowResult}점!
          </div>
        )}
      </div>

      {/* 조준선 슬라이더 */}
      <div className="w-full max-w-xs flex flex-col gap-2 mb-6">
        <div className="flex justify-between text-xs font-bold text-emerald-300">
          <span>◀ 왼쪽 조준</span>
          <span>중앙</span>
          <span>오른쪽 조준 ▶</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={aimOffset}
          onChange={e => setAimOffset(Number(e.target.value))}
          disabled={arrowResult !== null}
          className="w-full accent-cyan-400"
        />
      </div>

      <button
        onClick={handleShoot}
        disabled={arrowResult !== null}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-50"
      >
        🏹 화살 발사!
      </button>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">총 {totalScore}점 명중!</div>
          <p className="text-lg text-white font-bold mb-4">+{scoreRef.current}점 획득 (환경 극복 조준력)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   12. 🏐 volleyball-apex-set (배구 정점 포물선 토스·스파이크)
   ========================================================================= */
export const VolleyballApexSet = ({ groupId, enqueueAction }: GameProps) => {
  const [ballY, setBallY] = useState(100); // 0 (정점) ~ 100 (바닥)
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [hits, setHits] = useState(0);
  const [finished, setFinished] = useState(false);
  const hitsRef = useRef(0);

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setBallY(y => {
        if (direction === 'up') {
          if (y <= 5) {
            setDirection('down');
            return 5;
          }
          return y - 5;
        } else {
          if (y >= 95) {
            setDirection('up');
            return 95;
          }
          return y + 5;
        }
      });
    }, 40);
    return () => clearInterval(interval);
  }, [direction, finished]);

  const isApex = ballY <= 20;

  const handleHit = () => {
    if (finished) return;
    if (isApex) {
      sfxCoin();
      hapticTap();
      const nextHits = hits + 1;
      setHits(nextHits);
      hitsRef.current = nextHits;
      setBallY(95);
      setDirection('up');

      if (nextHits >= 5) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      }
    } else {
      sfxPop();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-sky-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-sky-300 text-xs font-bold">스파이크 성공</span><div className="text-2xl font-black">{hits} / 5회</div></div>
        <div className="text-right"><span className="text-sky-300 text-xs font-bold">목표</span><div className="text-2xl font-black text-amber-400">포물선 정점 타격!</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏐 배구 정점 토스 & 스파이크</h1>
      <p className="text-xs text-sky-200 mb-6 text-center max-w-xs">
        공이 포물선의 최고 정점(초록색 존)에 도달하는 찰나에 강스파이크를 날리세요!
      </p>

      {/* 배구 네트 & 공 궤적 박스 */}
      <div className="relative w-64 h-72 bg-slate-900 border-4 border-sky-700 rounded-3xl overflow-hidden p-4 flex flex-col justify-between mb-8 shadow-2xl">
        {/* 최고 정점 타깃 존 (상단 0~25%) */}
        <div className={`w-full h-16 rounded-2xl border-2 border-dashed flex items-center justify-center ${isApex ? 'bg-emerald-500/30 border-emerald-400 animate-pulse' : 'bg-sky-500/10 border-sky-500/30'}`}>
          <span className="text-xs font-black text-emerald-300">💥 최고 타점 APEX ZONE</span>
        </div>

        {/* 배구공 위치 */}
        <div
          style={{ top: `${ballY * 0.7}%` }}
          className="absolute left-1/2 -translate-x-1/2 text-5xl transition-all duration-75 pointer-events-none drop-shadow-xl"
        >
          🏐
        </div>

        {/* 하단 배구 네트 */}
        <div className="w-full h-8 bg-white/20 border-t-2 border-white flex items-center justify-center text-xs font-bold text-slate-300">
          배구 네트
        </div>
      </div>

      <button
        onClick={handleHit}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
      >
        ⚡ 타이밍 강스파이크!
      </button>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">🏐 퍼펙트 스파이크 완료!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (궤적 예측 및 임팩트)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   13. ⚾ strike-zone-vision (140km/h 스트라이크존 선구안)
   ========================================================================= */
export const StrikeZoneVision = ({ groupId, enqueueAction }: GameProps) => {
  const [pitch, setPitch] = useState<{ isStrike: boolean; type: string; x: number; y: number } | null>(null);
  const [decision, setDecision] = useState<'swing' | 'take' | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const nextPitch = () => {
    const isStrike = Math.random() > 0.45;
    const types = ['직구 142km/h', '슬라이더 130km/h', '낙차 큰 커브 118km/h'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    // 존 안(-40~40) 또는 존 밖(-80~-50, 50~80)
    const x = isStrike ? (Math.random() * 60 - 30) : (Math.random() > 0.5 ? Math.random() * 30 + 55 : -Math.random() * 30 - 55);
    const y = isStrike ? (Math.random() * 60 - 30) : (Math.random() > 0.5 ? Math.random() * 30 + 55 : -Math.random() * 30 - 55);
    setPitch({ isStrike, type: chosenType, x, y });
    setDecision(null);
  };

  useEffect(() => {
    nextPitch();
  }, []);

  const handleDecision = (userChoice: 'swing' | 'take') => {
    if (decision !== null || !pitch || finished) return;
    setDecision(userChoice);

    const isCorrect = (userChoice === 'swing' && pitch.isStrike) || (userChoice === 'take' && !pitch.isStrike);
    if (isCorrect) {
      sfxCoin();
      hapticTap();
      setScore(s => s + 1);
      scoreRef.current += 100;
    } else {
      sfxPop();
    }

    setTimeout(() => {
      if (round >= 5) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: scoreRef.current },
          timestamp: Date.now()
        });
      } else {
        setRound(r => r + 1);
        nextPitch();
      }
    }, 1000);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-slate-400 text-xs font-bold">투구</span><div className="text-2xl font-black">{round} / 5 구</div></div>
        <div className="text-right"><span className="text-slate-400 text-xs font-bold">판정 성공</span><div className="text-2xl font-black text-amber-400">{score}개</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">⚾ 140km/h 스트라이크존 선구안</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        포수 시점에서 날아온 공이 네모난 스트라이크 존 안인지 밖인지 순간 판정하세요!
      </p>

      {/* 9분할 스트라이크 존 박스 */}
      <div className="relative w-64 h-64 bg-slate-900 border-4 border-slate-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        {/* 9분할 스트라이크 존 (가운데 3x3) */}
        <div className="w-36 h-36 border-4 border-amber-400/80 bg-amber-400/10 grid grid-cols-3 grid-rows-3 gap-0">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-amber-400/30" />
          ))}
        </div>

        {/* 투구 궤적 착탄 위치 */}
        {pitch && (
          <div
            style={{ transform: `translate(${pitch.x}px, ${pitch.y}px)` }}
            className="absolute text-4xl animate-in zoom-in-50 duration-200"
          >
            ⚾
          </div>
        )}
      </div>

      <div className="text-sm font-bold text-cyan-300 mb-6">
        구종: {pitch?.type}
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => handleDecision('swing')}
          disabled={decision !== null}
          className="flex-1 py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-transform"
        >
          💥 스트라이크! (스윙)
        </button>
        <button
          onClick={() => handleDecision('take')}
          disabled={decision !== null}
          className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-transform"
        >
          👀 볼! (참기)
        </button>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">{score}개 정답!</div>
          <p className="text-lg text-white font-bold mb-4">+{scoreRef.current}점 획득 (프로급 동체시력 선구안)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   14. ⚽ offside-breaker-pass (3:2 오프사이드 트랩 브레이커)
   ========================================================================= */
export const OffsideBreakerPass = ({ groupId, enqueueAction }: GameProps) => {
  const [defenseLineX, setDefenseLineX] = useState(50); // 수비수 최종 라인
  const [strikerX, setStrikerX] = useState(20); // 우리 공격수 침투 위치
  const [passResult, setPassResult] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (finished || passResult !== null) return;
    const interval = setInterval(() => {
      setDefenseLineX(d => Math.max(35, Math.min(75, d + (Math.random() * 12 - 6))));
      setStrikerX(s => (s >= 80 ? 20 : s + 4));
    }, 150);
    return () => clearInterval(interval);
  }, [finished, passResult]);

  const handlePass = () => {
    if (passResult !== null || finished) return;
    sfxTap();
    hapticTap();

    // 공격수가 수비 라인보다 뒤에 있거나 같으면 온사이드!
    const isOnside = strikerX <= defenseLineX + 2;
    if (isOnside) {
      sfxCoin();
      setPassResult('⚽ 완벽한 온사이드 스루패스! 1:1 찬스 골!');
      setScore(s => s + 1);
      scoreRef.current += 120;
    } else {
      sfxPop();
      setPassResult('🚩 깃발 번쩍! 오프사이드 반칙!');
    }

    setTimeout(() => {
      if (round >= 4) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: scoreRef.current },
          timestamp: Date.now()
        });
      } else {
        setRound(r => r + 1);
        setPassResult(null);
        setStrikerX(20);
      }
    }, 1200);
  };

  return (
    <div className="min-h-[100dvh] bg-emerald-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-emerald-300 text-xs font-bold">공격 찬스</span><div className="text-2xl font-black">{round} / 4 라운드</div></div>
        <div className="text-right"><span className="text-emerald-300 text-xs font-bold">골 성공</span><div className="text-2xl font-black text-amber-400">{score}골</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">⚽ 오프사이드 트랩 브레이커</h1>
      <p className="text-xs text-emerald-200 mb-6 text-center max-w-xs">
        우리 공격수가 수비 라인을 넘어서기 직전 찰나에 킬패스를 찔러 넣으세요!
      </p>

      {/* 축구 잔디 피치 */}
      <div className="relative w-full max-w-sm h-56 bg-emerald-900 border-4 border-white/40 rounded-3xl overflow-hidden p-4 flex flex-col justify-between mb-6 shadow-2xl">
        {/* 잔디 줄무늬 */}
        <div className="absolute inset-0 grid grid-cols-6 opacity-20 pointer-events-none">
          <div className="bg-white/20" /><div /><div className="bg-white/20" /><div /><div className="bg-white/20" /><div />
        </div>

        {/* 수비수 최종 라인 (적색 가상선) */}
        <div
          style={{ left: `${defenseLineX}%` }}
          className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] z-10"
        >
          <span className="text-[10px] bg-red-600 px-1 rounded absolute top-2 -translate-x-1/2">수비라인</span>
          <div className="absolute top-12 -translate-x-1/2 text-2xl">🛡️</div>
          <div className="absolute bottom-12 -translate-x-1/2 text-2xl">🛡️</div>
        </div>

        {/* 침투하는 우리 공격수 */}
        <div
          style={{ left: `${strikerX}%` }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-3xl z-20 transition-all duration-75"
        >
          🏃‍♂️
        </div>

        {/* 우리 미드필더 패서 */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl z-20">
          👟⚽
        </div>
      </div>

      {passResult && (
        <div className="text-sm font-black text-amber-300 mb-4 animate-bounce">
          {passResult}
        </div>
      )}

      <button
        onClick={handlePass}
        disabled={passResult !== null}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-50"
      >
        ⚡ 스루패스 찌르기!
      </button>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-emerald-400 mb-2">{score}골 폭풍 득점!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (공간 침투 전술 감각)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   15. 🏸 badminton-drop-clear (셔틀콕 드롭 vs 클리어 선택)
   ========================================================================= */
export const BadmintonDropClear = ({ groupId, enqueueAction }: GameProps) => {
  const [oppPosition, setOppPosition] = useState<'back' | 'front'>('back');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const nextOpp = () => {
    setOppPosition(Math.random() > 0.5 ? 'back' : 'front');
  };

  const handleShot = (shot: 'drop' | 'clear') => {
    if (finished) return;
    // 상대가 뒤에 있으면 네트 앞 '드롭'이 정답, 앞에 있으면 엔드라인 뒤 '클리어'가 정답
    const isSuccess = (oppPosition === 'back' && shot === 'drop') || (oppPosition === 'front' && shot === 'clear');
    if (isSuccess) {
      sfxCoin();
      hapticTap();
      setScore(s => s + 1);
      scoreRef.current += 100;
    } else {
      sfxPop();
    }

    if (round >= 5) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: scoreRef.current },
        timestamp: Date.now()
      });
    } else {
      setRound(r => r + 1);
      nextOpp();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-teal-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-teal-300 text-xs font-bold">랠리</span><div className="text-2xl font-black">{round} / 5 구</div></div>
        <div className="text-right"><span className="text-teal-300 text-xs font-bold">점수</span><div className="text-2xl font-black text-amber-400">{score}득점</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏸 셔틀콕 드롭 vs 클리어</h1>
      <p className="text-xs text-teal-200 mb-6 text-center max-w-xs">
        상대 수비수의 위치를 보고 빈 공간으로 셔틀콕을 떨어뜨리세요!
      </p>

      {/* 배드민턴 코트 탑뷰 */}
      <div className="relative w-64 h-72 bg-emerald-800 border-4 border-white rounded-3xl p-3 flex flex-col justify-between mb-6 shadow-2xl">
        {/* 상대 코트 (상단) */}
        <div className="h-1/2 border-b-2 border-white flex flex-col justify-between relative">
          <span className="text-[10px] text-white/50">상대 엔드라인</span>
          {oppPosition === 'back' && <div className="text-3xl text-center animate-bounce">🏃 (뒤쪽 수비)</div>}
          {oppPosition === 'front' && <div className="text-3xl text-center animate-bounce">🏃 (네트 앞 대기)</div>}
          <div className="w-full h-1 bg-white/70" />
        </div>

        {/* 우리 코트 (하단) */}
        <div className="h-1/2 flex flex-col justify-end items-center">
          <div className="text-4xl">🏸 (나)</div>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => handleShot('drop')}
          className="flex-1 py-5 bg-sky-600 hover:bg-sky-500 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform"
        >
          ⬇️ 네트 앞 드롭샷!
        </button>
        <button
          onClick={() => handleShot('clear')}
          className="flex-1 py-5 bg-orange-600 hover:bg-orange-500 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform"
        >
          ⬆️ 후방 하이클리어!
        </button>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">{score}득점 승리!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (빈 공간 공략 전술)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   16. 🏀 basketball-free-throw (포물선 각도·파워 자유투)
   ========================================================================= */
export const BasketballFreeThrow = ({ groupId, enqueueAction }: GameProps) => {
  const [power, setPower] = useState(50);
  const [isShooting, setIsShooting] = useState(false);
  const [baskets, setBaskets] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const handleShoot = () => {
    if (isShooting || finished) return;
    setIsShooting(true);
    sfxTap();
    hapticTap();

    // 완벽한 힘 구간: 65 ~ 75
    const isGoal = power >= 65 && power <= 75;

    setTimeout(() => {
      if (isGoal) {
        sfxCoin();
        setBaskets(b => b + 1);
        scoreRef.current += 150;
      } else {
        sfxPop();
      }

      if (round >= 3) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: scoreRef.current },
          timestamp: Date.now()
        });
      } else {
        setRound(r => r + 1);
        setIsShooting(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-stone-400 text-xs font-bold">시도</span><div className="text-2xl font-black">{round} / 3 슛</div></div>
        <div className="text-right"><span className="text-stone-400 text-xs font-bold">골 성공</span><div className="text-2xl font-black text-amber-400">{baskets}개</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏀 포물선 각도·파워 자유투</h1>
      <p className="text-xs text-stone-300 mb-6 text-center max-w-xs">
        포물선 파워 게이지를 림 거리(65~75%)에 정확히 맞추어 슛을 쏘세요!
      </p>

      {/* 농구 림 & 백보드 비주얼 */}
      <div className="relative w-64 h-64 bg-slate-900 border-4 border-orange-800 rounded-3xl p-4 flex flex-col justify-between items-center mb-6 shadow-2xl">
        {/* 농구 림 */}
        <div className="w-20 h-10 border-b-4 border-orange-500 rounded-b-full flex items-center justify-center relative">
          <div className="w-16 h-12 border-dashed border-2 border-white/50 -mt-2" />
        </div>

        {/* 슛 궤적 애니메이션 농구공 */}
        <div className={`text-5xl transition-all duration-700 ${isShooting ? '-translate-y-36 scale-75' : 'translate-y-0 scale-100'}`}>
          🏀
        </div>
      </div>

      {/* 파워 슬라이더 */}
      <div className="w-full max-w-xs flex flex-col gap-2 mb-6">
        <div className="flex justify-between text-xs font-bold text-amber-300">
          <span>약함</span>
          <span className="text-emerald-400 font-black">목표 파워 존 (65~75%)</span>
          <span>강함</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          value={power}
          onChange={e => setPower(Number(e.target.value))}
          disabled={isShooting}
          className="w-full accent-orange-500"
        />
      </div>

      <button
        onClick={handleShoot}
        disabled={isShooting}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-50"
      >
        🏀 클린 슛 발사!
      </button>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-orange-400 mb-2">{baskets}개 슛 림 통과!</div>
          <p className="text-lg text-white font-bold mb-4">+{scoreRef.current}점 획득 (투사체 포물선 조절력)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   17. 🥌 curling-weight-control (컬링 하우스 힘 조절 스톤)
   ========================================================================= */
export const CurlingWeightControl = ({ groupId, enqueueAction }: GameProps) => {
  const [chargeTime, setChargeTime] = useState(0);
  const [stonePos, setStonePos] = useState(0); // 0 ~ 100
  const [isSliding, setIsSliding] = useState(false);
  const [finished, setFinished] = useState(false);
  const pressStart = useRef(0);

  const handlePointerDown = () => {
    if (isSliding || finished) return;
    pressStart.current = Date.now();
    sfxTap();
  };

  const handlePointerUp = () => {
    if (isSliding || finished || pressStart.current === 0) return;
    const duration = Date.now() - pressStart.current;
    pressStart.current = 0;
    setChargeTime(duration);
    setIsSliding(true);

    // 슬라이딩 거리 계산 (duration이 약 800~1100ms일 때 하우스 중앙 50% 안착)
    const targetDistance = Math.min(100, Math.max(10, Math.floor((duration / 1000) * 50)));

    let cur = 0;
    const timer = setInterval(() => {
      cur += 2;
      setStonePos(cur);
      if (cur >= targetDistance) {
        clearInterval(timer);
        setIsSliding(false);
        const distFromCenter = Math.abs(cur - 50);
        let scoreEarned = 0;
        if (distFromCenter <= 6) scoreEarned = 500;
        else if (distFromCenter <= 15) scoreEarned = 350;
        else if (distFromCenter <= 30) scoreEarned = 200;
        else scoreEarned = 100;

        setFinished(true);
        if (scoreEarned >= 350) sfxSuccess(); else sfxPop();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: scoreEarned },
          timestamp: Date.now()
        });
      }
    }, 40);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🥌 컬링 하우스 힘 조절 스톤</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        발사 버튼을 적절한 시간(약 1초) 동안 꾹 누르고 떼어 하우스 중앙 버튼에 스톤을 멈추세요!
      </p>

      {/* 컬링 아이스 시트 */}
      <div className="relative w-72 h-64 bg-slate-900 border-4 border-cyan-800 rounded-3xl p-4 flex items-center mb-6 overflow-hidden shadow-2xl">
        {/* 하우스 타깃 (우측 50% 지점) */}
        <div className="absolute left-[40%] w-24 h-24 rounded-full border-4 border-red-500 bg-red-500/20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-black">
              정앙
            </div>
          </div>
        </div>

        {/* 컬링 스톤 */}
        <div
          style={{ left: `${stonePos}%` }}
          className="absolute text-4xl transition-all duration-75 drop-shadow-xl"
        >
          🥌
        </div>
      </div>

      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        disabled={isSliding}
        className="w-full max-w-xs py-6 bg-gradient-to-r from-cyan-500 to-blue-500 active:from-cyan-600 active:to-blue-600 text-white font-black text-xl rounded-3xl shadow-xl active:scale-95 transition-transform"
      >
        {isSliding ? '미끄러지는 중... 🧊' : '꾹 눌러서 힘 모으고 떼기!'}
      </button>
      {chargeTime > 0 && (
        <p className="text-xs text-cyan-300 mt-3">투구 압력 시간: {(chargeTime / 1000).toFixed(2)}초</p>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-cyan-400 mb-2">하우스 안착 완료!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (빙판 마찰력 조절)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   18. 🥋 taekwondo-counter-kick (태권도 반격 발차기 패링)
   ========================================================================= */
export const TaekwondoCounterKick = ({ groupId, enqueueAction }: GameProps) => {
  const [oppState, setOppState] = useState<'idle' | 'warning' | 'attack'>('idle');
  const [counters, setCounters] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const countersRef = useRef(0);

  useEffect(() => {
    if (finished) return;
    setOppState('idle');
    const delay = Math.random() * 2000 + 1000;

    const warnTimer = setTimeout(() => {
      setOppState('warning');
      sfxTap();
      const attackTimer = setTimeout(() => {
        setOppState('attack');
        hapticTap();
      }, 500);
      return () => clearTimeout(attackTimer);
    }, delay);

    return () => clearTimeout(warnTimer);
  }, [round, finished]);

  const handleCounter = () => {
    if (finished) return;
    if (oppState === 'attack') {
      sfxCoin();
      hapticTap();
      const next = counters + 1;
      setCounters(next);
      countersRef.current = next;
    } else {
      sfxPop();
    }

    if (round >= 5) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: countersRef.current * 100 },
        timestamp: Date.now()
      });
    } else {
      setRound(r => r + 1);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-red-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-red-300 text-xs font-bold">대결 라운드</span><div className="text-2xl font-black">{round} / 5 회</div></div>
        <div className="text-right"><span className="text-red-300 text-xs font-bold">카운터 적중</span><div className="text-2xl font-black text-amber-400">{counters}회</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🥋 태권도 반격 발차기 패링</h1>
      <p className="text-xs text-red-200 mb-6 text-center max-w-xs">
        상대방이 공격해오는 0.3초 순간을 노려 번개 같은 뒤후리기 카운터를 차세요!
      </p>

      {/* 겨루기 매트 비주얼 */}
      <div className={`relative w-64 h-64 rounded-3xl border-4 flex flex-col items-center justify-center mb-6 shadow-2xl transition-colors duration-100 ${
        oppState === 'attack' ? 'bg-red-800 border-red-400 animate-pulse' : oppState === 'warning' ? 'bg-amber-900 border-amber-400' : 'bg-slate-900 border-red-800'
      }`}>
        <div className="text-7xl mb-2">
          {oppState === 'attack' ? '💥🥋' : oppState === 'warning' ? '⚠️🥋' : '🥋'}
        </div>
        <div className="text-sm font-black">
          {oppState === 'attack' ? '지금 카운터 차기!' : oppState === 'warning' ? '공격 준비 중...' : '기회 엿보기...'}
        </div>
      </div>

      <button
        onClick={handleCounter}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
      >
        ⚡ 전광석화 반격 발차기!
      </button>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">{counters}회 카운터 적중!</div>
          <p className="text-lg text-white font-bold mb-4">+{counters * 100}점 획득 (투기형 반격 타이밍)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   19. 🏓 tabletennis-spin-read (탁구 커트/탑스핀 회전 판독)
   ========================================================================= */
export const TabletennisSpinRead = ({ groupId, enqueueAction }: GameProps) => {
  const [spin, setSpin] = useState<'topspin' | 'backspin'>('topspin');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const nextSpin = () => {
    setSpin(Math.random() > 0.5 ? 'topspin' : 'backspin');
  };

  const handleReturn = (racketAngle: 'close' | 'open') => {
    if (finished) return;
    // 탑스핀(전진회전)은 라켓을 숙여서(close) 쳐야 하고, 백스핀(커트)은 라켓을 열어서(open) 쳐야 함!
    const isCorrect = (spin === 'topspin' && racketAngle === 'close') || (spin === 'backspin' && racketAngle === 'open');

    if (isCorrect) {
      sfxCoin();
      hapticTap();
      setScore(s => s + 1);
      scoreRef.current += 100;
    } else {
      sfxPop();
    }

    if (round >= 5) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: scoreRef.current },
        timestamp: Date.now()
      });
    } else {
      setRound(r => r + 1);
      nextSpin();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-blue-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-blue-300 text-xs font-bold">랠리</span><div className="text-2xl font-black">{round} / 5 구</div></div>
        <div className="text-right"><span className="text-blue-300 text-xs font-bold">리턴 성공</span><div className="text-2xl font-black text-amber-400">{score}개</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏓 탁구 회전 판독 리턴</h1>
      <p className="text-xs text-blue-200 mb-6 text-center max-w-xs">
        공의 회전 방향을 읽고, 탑스핀은 숙이고(Close), 백스핀은 눕혀서(Open) 받으세요!
      </p>

      {/* 탁구대 시각화 */}
      <div className="relative w-64 h-64 bg-blue-900 border-4 border-white rounded-3xl p-4 flex flex-col items-center justify-center mb-6 shadow-2xl">
        <div className="text-5xl mb-2 animate-spin-slow">
          🏓
        </div>
        <div className="text-lg font-black text-amber-300 mb-1">
          {spin === 'topspin' ? '🌀 전진 탑스핀 (위로 감김)' : '🔄 역회전 백스핀 (커트)'}
        </div>
        <span className="text-xs text-blue-200">
          {spin === 'topspin' ? '공이 튀어오릅니다!' : '공이 네트에 걸리기 쉽습니다!'}
        </span>
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => handleReturn('close')}
          className="flex-1 py-5 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform"
        >
          ↘️ 라켓 숙이기 (탑스핀 대응)
        </button>
        <button
          onClick={() => handleReturn('open')}
          className="flex-1 py-5 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform"
        >
          ↗️ 라켓 눕히기 (백스핀 대응)
        </button>
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">{score}개 리턴 성공!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (회전 물리 역학 이해)</p>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   20. ⚾ baseball-bunt-defense (번트 타구 대시 & 1루 송구 수비)
   ========================================================================= */
export const BaseballBuntDefense = ({ groupId, enqueueAction }: GameProps) => {
  const [buntProgress, setBuntProgress] = useState(0); // 0 (포구) ~ 100 (1루 도달)
  const [pickedUp, setPickedUp] = useState(false);
  const [throwGauge, setThrowGauge] = useState(50);
  const [outs, setOuts] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const outsRef = useRef(0);

  useEffect(() => {
    if (finished || pickedUp) return;
    const interval = setInterval(() => {
      setBuntProgress(p => {
        if (p >= 100) {
          // 주자 세이프 (실패)
          sfxPop();
          return 100;
        }
        return p + 5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [pickedUp, finished]);

  const handlePickUp = () => {
    if (pickedUp || finished) return;
    sfxTap();
    hapticTap();
    setPickedUp(true);
  };

  const handleThrow = () => {
    if (!pickedUp || finished) return;
    // 완벽 송구: 50~70%
    const isOut = throwGauge >= 50 && throwGauge <= 70;
    if (isOut) {
      sfxCoin();
      hapticTap();
      const next = outs + 1;
      setOuts(next);
      outsRef.current = next;
    } else {
      sfxPop();
    }

    if (round >= 3) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: outsRef.current * 160 },
        timestamp: Date.now()
      });
    } else {
      setRound(r => r + 1);
      setPickedUp(false);
      setBuntProgress(0);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-stone-400 text-xs font-bold">수비 기회</span><div className="text-2xl font-black">{round} / 3 이닝</div></div>
        <div className="text-right"><span className="text-stone-400 text-xs font-bold">아웃 카운트</span><div className="text-2xl font-black text-amber-400">{outs}개</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">⚾ 번트 타구 대시 & 1루 송구</h1>
      <p className="text-xs text-stone-300 mb-6 text-center max-w-xs">
        굴러가는 번트공을 쫓아가 낚아채고, 1루로 정확한 파워로 레이저 송구하세요!
      </p>

      {/* 다이아몬드 그라운드 비주얼 */}
      <div className="relative w-64 h-64 bg-amber-950/80 border-4 border-amber-800 rounded-3xl p-4 flex flex-col justify-between mb-6 shadow-2xl">
        <div className="flex justify-between items-center text-xs font-bold text-amber-300">
          <span>3루</span>
          <span>2루</span>
          <span>1루 🏃</span>
        </div>

        {/* 주자 달리는 게이지 */}
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
          <div style={{ width: `${buntProgress}%` }} className="bg-red-500 h-full transition-all duration-100" />
        </div>

        <div className="text-center text-4xl">
          {pickedUp ? '🧤 공 포구 완료! (송구 준비)' : '⚾ 떼구르르... 번트 타구!'}
        </div>
      </div>

      {!pickedUp ? (
        <button
          onClick={handlePickUp}
          className="w-full max-w-xs py-5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          🏃‍♂️ 번트공으로 대시 & 맨손 포구!
        </button>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="range"
            min="10"
            max="100"
            value={throwGauge}
            onChange={e => setThrowGauge(Number(e.target.value))}
            className="w-full accent-red-500"
          />
          <button
            onClick={handleThrow}
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
          >
            🎯 1루로 전광석화 송구!
          </button>
        </div>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="text-5xl font-black text-amber-400 mb-2">{outs}명 아웃 성공!</div>
          <p className="text-lg text-white font-bold mb-4">+500점 획득 (필드형 민첩 수비)</p>
        </div>
      )}
    </div>
  );
};
