import { useGameScoreSubmission } from '../common/useGameScoreSubmission';
import { useGameTimeouts } from '../common/useGameTimeouts';
import React, { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess, sfxPop, sfxTap, hapticTap } from '../../../../application/soundEffects';
import { GameResultOverlay } from './GameResultOverlay';

interface GameProps {
  groupId: string;
  enqueueAction: (a: any) => void;
  onExit?: () => void;
}

/* =========================================================================
   11. 🏹 wind-archery-pro (풍향·풍속 탄도학 윈드 양궁)
   ========================================================================= */
export const WindArcheryPro: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [windSpeed, setWindSpeed] = useState(5);
  const [windDir, setWindDir] = useState<'left' | 'right'>('left');
  const [aimOffset, setAimOffset] = useState(0);
  const [arrowResult, setArrowResult] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const resetWind = () => {
    const spd = Math.floor(Math.random() * 8) + 3;
    const dir = Math.random() > 0.5 ? 'left' : 'right';
    setWindSpeed(spd);
    setWindDir(dir);
    setAimOffset(0);
    setArrowResult(null);
  };

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setRound(1);
    setTotalScore(0);
    setFinished(false);
    resetWind();
  };

  const handleShoot = () => {
    if (arrowResult !== null || finished) return;
    sfxTap();
    hapticTap();

    const windPush = windDir === 'left' ? -windSpeed * 4 : windSpeed * 4;
    const finalImpact = aimOffset + windPush;
    const distance = Math.abs(finalImpact);

    const points = distance <= 8 ? 10
      : distance <= 20 ? 9
      : distance <= 35 ? 8
      : distance <= 50 ? 7
      : 5;

    setArrowResult(points);
    if (points >= 9) sfxCoin(); else sfxPop();

    const newTotal = totalScore + points;
    setTotalScore(newTotal);
    scoreRef.current = newTotal * 20;

    scheduleTimeout(() => {
      if (round >= 3) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: Math.max(200, scoreRef.current) },
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

      <div className="bg-slate-900/80 border border-emerald-600 rounded-2xl px-5 py-2.5 flex items-center gap-3 mb-6 shadow-lg">
        <span className="text-xs font-bold text-slate-300">현재 바람:</span>
        <span className="text-xl font-black text-cyan-300">
          {windDir === 'left' ? '◀ 서풍' : '동풍 ▶'} {windSpeed} m/s
        </span>
      </div>

      <div className="relative w-64 h-64 rounded-full bg-slate-900 border-4 border-emerald-800 flex items-center justify-center overflow-hidden mb-6 shadow-2xl">
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

        <div
          style={{ transform: `translateX(${aimOffset}px)` }}
          className="absolute w-8 h-8 border-2 border-dashed border-cyan-400 rounded-full flex items-center justify-center pointer-events-none shadow-[0_0_15px_rgba(34,211,238,0.9)]"
        >
          <div className="w-2 h-2 bg-cyan-400 rounded-full" />
        </div>

        {arrowResult !== null && (
          <div className="absolute text-3xl font-black text-amber-300 animate-bounce">
            🎯 {arrowResult}점!
          </div>
        )}
      </div>

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
        <GameResultOverlay
          title={`🎯 총 ${totalScore}점 명중!`}
          subtitle="바람의 방향과 세기를 계산하여 정밀한 탄도 오프셋 사격을 완수했습니다."
          score={Math.max(200, scoreRef.current)}
          badge="환경 극복 명사수"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   12. 🏐 volleyball-apex-set (배구 정점 포물선 토스·스파이크)
   ========================================================================= */
export const VolleyballApexSet: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [ballHeight, setBallHeight] = useState(0);
  const [hits, setHits] = useState(0);
  const [finished, setFinished] = useState(false);
  const hitsRef = useRef(0);
  const dirRef = useRef<'up' | 'down'>('up');
  const TARGET_HITS = 5;

  const handleRestart = () => {
    resetScoreSubmission();
    hitsRef.current = 0;
    dirRef.current = 'up';
    setBallHeight(0);
    setHits(0);
    setFinished(false);
  };

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setBallHeight(h => {
        if (dirRef.current === 'up') {
          if (h >= 90) {
            dirRef.current = 'down';
            return 90;
          }
          return h + 4;
        } else {
          if (h <= 10) {
            dirRef.current = 'up';
            return 10;
          }
          return h - 4;
        }
      });
    }, 40);
    return () => clearInterval(interval);
  }, [finished]);

  const isApex = ballHeight >= 82 && ballHeight <= 94;

  const handleSpike = () => {
    if (finished) return;
    if (isApex) {
      sfxSuccess();
      hapticTap();
      const next = hits + 1;
      setHits(next);
      hitsRef.current = next;

      if (next >= TARGET_HITS) {
        setFinished(true);
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      } else {
        setBallHeight(10);
        dirRef.current = 'up';
      }
    } else {
      sfxPop();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-sky-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-sky-300 text-xs font-bold">스파이크 성공</span><div className="text-2xl font-black">{hits} / {TARGET_HITS}회</div></div>
        <div className="text-right"><span className="text-sky-300 text-xs font-bold">정점 판정</span><div className={`text-xl font-black ${isApex ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>{isApex ? 'APEX! 정점!' : '궤적 상승/하강 중'}</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏐 배구 정점 포물선 스파이크</h1>
      <p className="text-xs text-sky-200 mb-6 text-center max-w-xs">
        토스된 공이 꼭짓점(정점)에서 멈추는 찰나에 강스파이크 버튼을 누르세요!
      </p>

      <div className="relative w-64 h-72 bg-slate-900 border-4 border-sky-600 rounded-3xl p-4 flex flex-col justify-between mb-6 shadow-2xl overflow-hidden">
        <div className="absolute top-4 left-4 right-4 h-12 bg-amber-500/20 border-2 border-dashed border-amber-400 rounded-2xl flex items-center justify-center pointer-events-none">
          <span className="text-xs font-black text-amber-300">최적 타격 정점 존 (APEX)</span>
        </div>

        <div
          style={{ bottom: `${ballHeight}%` }}
          className="absolute left-1/2 -translate-x-1/2 text-5xl transition-all duration-75 drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]"
        >
          🏐
        </div>
      </div>

      <button
        onClick={handleSpike}
        className={`w-full max-w-xs py-6 rounded-3xl font-black text-2xl transition-all shadow-2xl active:scale-95 ${
          isApex ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 animate-bounce ring-4 ring-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        {isApex ? '💥 지금 정점 스파이크!!' : '정점 도달을 기다리세요'}
      </button>

      {finished && (
        <GameResultOverlay
          title="🏐 환상의 정점 스파이크 완주!"
          subtitle="중력과 포물선 궤적의 꼭짓점을 순간 포착하는 타이밍 감각을 증명했습니다."
          score={500}
          badge="배구 정점 타격왕"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   13. ⚾ strike-zone-vision (140km/h 스트라이크존 선구안)
   ========================================================================= */
export const StrikeZoneVision: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [pitch, setPitch] = useState<{ isStrike: boolean; x: number; y: number } | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const TOTAL_ROUNDS = 6;

  const throwPitch = () => {
    const isStrike = Math.random() > 0.45;
    const x = isStrike ? Math.random() * 80 - 40 : (Math.random() > 0.5 ? 65 : -65);
    const y = isStrike ? Math.random() * 80 - 40 : (Math.random() > 0.5 ? 65 : -65);
    setPitch({ isStrike, x, y });
  };

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setRound(1);
    setScore(0);
    setFinished(false);
    throwPitch();
  };

  useEffect(() => {
    throwPitch();
  }, []);

  const handleDecision = (userChoice: 'strike' | 'ball') => {
    if (!pitch || finished) return;
    const isCorrect = (userChoice === 'strike' && pitch.isStrike) || (userChoice === 'ball' && !pitch.isStrike);

    if (isCorrect) {
      sfxCoin();
      hapticTap();
      const next = score + 1;
      setScore(next);
      scoreRef.current = next * 90;
    } else {
      sfxPop();
    }

    if (round >= TOTAL_ROUNDS) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: Math.max(200, scoreRef.current) },
        timestamp: Date.now()
      });
    } else {
      setRound(r => r + 1);
      throwPitch();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-slate-400 text-xs font-bold">투구 수</span><div className="text-2xl font-black">{round} / {TOTAL_ROUNDS}구</div></div>
        <div className="text-right"><span className="text-slate-400 text-xs font-bold">선구안 적중</span><div className="text-2xl font-black text-cyan-400">{score}개</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">⚾ 140km/h 스트라이크존 선구안</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        홈플레이트 상공으로 들어오는 공이 존 안쪽인지 바깥쪽인지 판독하세요!
      </p>

      <div className="relative w-64 h-64 bg-slate-900 border-4 border-slate-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        <div className="w-32 h-40 border-4 border-dashed border-cyan-400 rounded-xl flex items-center justify-center bg-cyan-950/20">
          <span className="text-[10px] font-black text-cyan-300">STRIKE ZONE</span>
        </div>

        {pitch && (
          <div
            style={{ transform: `translate(${pitch.x}px, ${pitch.y}px)` }}
            className="absolute text-3xl animate-in zoom-in-50 duration-200"
          >
            ⚾
          </div>
        )}
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => handleDecision('strike')}
          className="flex-1 py-5 bg-gradient-to-r from-red-600 to-rose-600 active:scale-95 rounded-2xl font-black text-xl text-white shadow-xl transition-all"
        >
          🔴 스트라이크!
        </button>
        <button
          onClick={() => handleDecision('ball')}
          className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-95 rounded-2xl font-black text-xl text-white shadow-xl transition-all"
        >
          🟢 볼! (참기)
        </button>
      </div>

      {finished && (
        <GameResultOverlay
          title={`⚾ ${score}개 완벽 판정 선구안!`}
          subtitle="광속 투구의 궤적을 순식간에 판단하는 최고 수준의 동체시력을 입증했습니다."
          score={Math.max(200, score * 90)}
          badge="특급 선구안 타자"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   14. ⚽ offside-breaker-pass (3:2 오프사이드 트랩 브레이커)
   ========================================================================= */
export const OffsideBreakerPass: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [defLinePos, setDefLinePos] = useState(50);
  const [passStatus, setPassStatus] = useState<'ready' | 'success' | 'offside'>('ready');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setRound(1);
    setScore(0);
    setPassStatus('ready');
    setFinished(false);
  };

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setDefLinePos(pos => {
        const next = pos + (Math.random() * 16 - 8);
        return Math.max(20, Math.min(80, next));
      });
    }, 200);
    return () => clearInterval(timer);
  }, [finished]);

  const handlePass = () => {
    if (passStatus !== 'ready' || finished) return;
    const FW_POS = 55;
    // top 0%가 상대 골대이므로, 수비 라인이 공격수보다 뒤에 머물 때(defLinePos > FW_POS) 공격수가 오프사이드 위치에 있게 됩니다.
    // 수비 라인이 공격수보다 앞선 위치(defLinePos <= FW_POS)에 있을 때만 온사이드 침투 성공입니다.
    const isOffside = defLinePos > FW_POS;

    if (!isOffside) {
      sfxSuccess();
      hapticTap();
      setPassStatus('success');
      const next = score + 1;
      setScore(next);
      scoreRef.current = next * 170;
    } else {
      sfxPop();
      setPassStatus('offside');
    }

    scheduleTimeout(() => {
      if (round >= 3) {
        setFinished(true);
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: Math.max(200, scoreRef.current) },
          timestamp: Date.now()
        });
      } else {
        setRound(r => r + 1);
        setPassStatus('ready');
      }
    }, 1000);
  };

  return (
    <div className="min-h-[100dvh] bg-emerald-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-emerald-300 text-xs font-bold">공격 찬스</span><div className="text-2xl font-black">{round} / 3회</div></div>
        <div className="text-right"><span className="text-emerald-300 text-xs font-bold">침투 성공</span><div className="text-2xl font-black text-amber-400">{score}골</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">⚽ 3:2 오프사이드 트랩 브레이커</h1>
      <p className="text-xs text-emerald-200 mb-6 text-center max-w-xs leading-relaxed">
        수비 라인이 공격수보다 골대 쪽(화면 위)으로 물러나 <strong>온사이드(🟢)</strong>일 때 칼같은 스루패스를 찔러주세요!
      </p>

      <div className="relative w-72 h-72 bg-emerald-900 border-4 border-emerald-600 rounded-3xl p-4 overflow-hidden mb-6 shadow-2xl">
        {/* 상대 골대 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/25 border-b-2 border-x-2 border-white/60 rounded-b-lg px-3 py-0.5 text-[10px] font-black text-amber-300 shadow flex items-center gap-1 z-10">
          🥅 상대 골대
        </div>

        {/* 실시간 침투 판정 인디케이터 */}
        <div className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm border border-emerald-500/50 bg-slate-950/80">
          {defLinePos <= 55 ? (
            <span className="text-emerald-300">🟢 온사이드 찬스!</span>
          ) : (
            <span className="text-rose-400">🔴 오프사이드 트랩!</span>
          )}
        </div>

        <div
          style={{ top: `${defLinePos}%` }}
          className="absolute left-0 right-0 h-[3px] bg-red-400 border-t border-dashed border-white flex items-center justify-between px-2 transition-all duration-150"
        >
          <span className="text-[10px] text-red-200 font-bold">🛡️ 수비 최종 라인</span>
          <span className="text-lg">🏃‍♂️</span>
        </div>

        <div style={{ top: '55%' }} className="absolute right-8 text-2xl flex items-center gap-1">
          <span>🏃</span>
          <span className="text-[10px] font-bold text-cyan-300">우리 공격수</span>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-3xl">
          ⚽ (미드필더)
        </div>

        {passStatus === 'success' && (
          <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center animate-in zoom-in z-20">
            <span className="text-4xl font-black text-amber-300">⚽ GOAL! 온사이드 돌파!</span>
          </div>
        )}
        {passStatus === 'offside' && (
          <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center animate-in zoom-in z-20">
            <span className="text-4xl font-black text-red-400">🚩 OFFSIDE! 깃발 업!</span>
          </div>
        )}
      </div>

      <button
        onClick={handlePass}
        disabled={passStatus !== 'ready'}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-50"
      >
        👟 스루패스 찌르기!
      </button>

      {finished && (
        <GameResultOverlay
          title={`⚽ ${score}회 온사이드 찬스 성공!`}
          subtitle="수비 라인의 전후진 오프사이드 트랩을 정확히 읽고 킬패스를 연결했습니다."
          score={Math.max(200, scoreRef.current)}
          badge="오프사이드 브레이커"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   15. 🏸 badminton-drop-clear (배드민턴 드롭샷 & 하이클리어 코스)
   ========================================================================= */
export const BadmintonDropClear: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [oppPos, setOppPos] = useState<'front' | 'back'>('front');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const TOTAL_ROUNDS = 5;

  const nextOpp = () => {
    setOppPos(Math.random() > 0.5 ? 'front' : 'back');
  };

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setRound(1);
    setScore(0);
    setFinished(false);
    nextOpp();
  };

  useEffect(() => {
    nextOpp();
  }, []);

  const handleShot = (shotType: 'drop' | 'clear') => {
    if (finished) return;
    const isCorrect = (oppPos === 'back' && shotType === 'drop') || (oppPos === 'front' && shotType === 'clear');

    if (isCorrect) {
      sfxCoin();
      hapticTap();
      const next = score + 1;
      setScore(next);
      scoreRef.current = next * 100;
    } else {
      sfxPop();
    }

    if (round >= TOTAL_ROUNDS) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: Math.max(200, scoreRef.current) },
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
        <div><span className="text-teal-300 text-xs font-bold">랠리</span><div className="text-2xl font-black">{round} / {TOTAL_ROUNDS}회</div></div>
        <div className="text-right"><span className="text-teal-300 text-xs font-bold">빈 코스 득점</span><div className="text-2xl font-black text-amber-400">{score}점</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏸 배드민턴 드롭 & 클리어 코스</h1>
      <p className="text-xs text-teal-200 mb-6 text-center max-w-xs">
        상대방이 뒤에 있으면 네트 앞 드롭샷! 앞에 쏠려있으면 엔드라인 클리어!
      </p>

      <div className="relative w-64 h-64 bg-teal-900 border-4 border-teal-600 rounded-3xl p-3 flex flex-col justify-between mb-6 shadow-2xl">
        <div className="h-1/2 border-b-2 border-white flex flex-col justify-center items-center relative">
          <span className="text-[10px] text-teal-300">상대 후위 코트</span>
          {oppPos === 'back' && <div className="text-3xl animate-bounce">🏃 (상대 뒤에 위치!)</div>}
        </div>

        <div className="h-1/2 flex flex-col justify-center items-center relative">
          <span className="text-[10px] text-teal-300">상대 전위 코트 (네트 앞)</span>
          {oppPos === 'front' && <div className="text-3xl animate-bounce">🏃 (상대 앞에 전진!)</div>}
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => handleShot('drop')}
          className="flex-1 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          ⬇️ 네트 앞 드롭샷!
        </button>
        <button
          onClick={() => handleShot('clear')}
          className="flex-1 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-base rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          ⬆️ 깊은 하이클리어!
        </button>
      </div>

      {finished && (
        <GameResultOverlay
          title={`🏸 ${score}회 빈 코스 공략 성공!`}
          subtitle="상대의 코트 포지셔닝을 실시간 간파하여 최적의 공격 코스로 공략했습니다."
          score={Math.max(200, scoreRef.current)}
          badge="배드민턴 코스 전술가"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   16. 🏀 basketball-free-throw (포물선 각도 자유투)
   ========================================================================= */
export const BasketballFreeThrow: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [angle, setAngle] = useState(51); // 최적 초기값 51도
  const [isShooting, setIsShooting] = useState(false);
  const [ballPos, setBallPos] = useState<{ x: number; y: number; rot: number }>({ x: 45, y: 175, rot: 0 });
  const [swishNet, setSwishNet] = useState(false);
  const [result, setResult] = useState<'goal' | 'rim_hit' | null>(null);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const animFrameId = useRef<number | null>(null);
  const TOTAL_SHOTS = 3;

  // 농구장 좌표계: viewBox="0 0 300 230"
  // 출발점 (45, 175) -> 림 중심 (235, 78)
  const calculateY = (x: number, thetaDeg: number) => {
    const x0 = 45;
    const y0 = 175;
    const dx = x - x0;
    const rad = (thetaDeg * Math.PI) / 180;
    const k = 0.00381; // 51도에서 정확히 (235, 78) 림 중심을 통과하는 포물선 계수
    return y0 - Math.tan(rad) * dx + k * dx * dx;
  };

  // 실시간 점선 궤적 포인트 생성
  const trajectoryPath = (() => {
    let d = `M 45 175`;
    const step = 8;
    for (let x = 45 + step; x <= 265; x += step) {
      const y = calculateY(x, angle);
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  })();

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setScore(0);
    setShots(0);
    setIsShooting(false);
    setBallPos({ x: 45, y: 175, rot: 0 });
    setSwishNet(false);
    setResult(null);
    setFinished(false);
  };

  const handleShoot = () => {
    if (isShooting || finished) return;
    setIsShooting(true);
    setResult(null);
    setSwishNet(false);
    sfxTap();
    hapticTap();

    const isGoal = angle >= 49 && angle <= 53;
    const startTime = performance.now();
    const duration = 900; // ms

    const animateFlight = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // t: 0 -> 1 동안 x축 이동 (45 -> 목표 X)
      // 골인이면 235(림 중심), 빗나가면 각도에 따라 착탄
      const targetX = isGoal ? 235 : angle < 49 ? 215 : 255;
      const currentX = 45 + (targetX - 45) * progress;
      const currentY = calculateY(currentX, angle);
      const currentRot = progress * -540; // 백스핀 회전

      setBallPos({ x: currentX, y: currentY, rot: currentRot });

      if (progress < 1) {
        animFrameId.current = requestAnimationFrame(animateFlight);
      } else {
        // 비행 완료 후 림 통과 또는 튕김 연출
        if (isGoal) {
          sfxSuccess();
          hapticTap();
          setSwishNet(true);
          setResult('goal');
          const nextScore = score + 1;
          setScore(nextScore);
          scoreRef.current = nextScore * 170;

          // 공이 그물 밑으로 쑥 떨어짐
          scheduleTimeout(() => {
            setBallPos({ x: 235, y: 115, rot: -720 });
          }, 150);
        } else {
          sfxPop();
          setResult('rim_hit');
          // 림 맞고 튕겨 굴러떨어짐
          setBallPos({ x: targetX > 235 ? 248 : 205, y: 150, rot: -600 });
        }

        const nextShots = shots + 1;
        setShots(nextShots);

        scheduleTimeout(() => {
          setIsShooting(false);
          setSwishNet(false);
          if (nextShots >= TOTAL_SHOTS) {
            setFinished(true);
            enqueueAction({
              id: Math.random().toString(),
              type: 'INCREMENT_SCORE',
              payload: { id: groupId, amount: Math.max(200, scoreRef.current) },
              timestamp: Date.now(),
            });
          } else {
            // 다음 슛을 위해 공 위치 복귀
            setBallPos({ x: 45, y: 175, rot: 0 });
            setResult(null);
          }
        }, 1200);
      }
    };

    animFrameId.current = requestAnimationFrame(animateFlight);
  };

  useEffect(() => {
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-white flex flex-col items-center justify-center p-4 pt-16 relative select-none">
      {/* 상단 경기 상태바 */}
      <div className="flex justify-between w-full max-w-sm mb-3">
        <div>
          <span className="text-amber-300 text-xs font-bold">시도 횟수</span>
          <div className="text-2xl font-black">{shots} / {TOTAL_SHOTS}회</div>
        </div>
        <div className="text-right">
          <span className="text-amber-300 text-xs font-bold">클린 슛 득점</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{score}골</div>
        </div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏀 포물선 각도 자유투</h1>
      <p className="text-xs text-amber-200/90 mb-4 text-center max-w-xs leading-relaxed">
        슬라이더로 발사각을 조절하여 림 안으로 쏙 들어가는 최적 포물선 궤적을 만드세요!
      </p>

      {/* 2D 농구장 & 포물선 물리 시뮬레이션 캔버스 */}
      <div className="relative w-full max-w-sm h-64 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-4 border-amber-600/70 rounded-3xl p-1 overflow-hidden shadow-2xl mb-4 flex items-center justify-center">
        <svg viewBox="0 0 300 230" className="w-full h-full">
          <defs>
            {/* 체육관 원목 코트 패턴 */}
            <linearGradient id="woodFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350F" />
              <stop offset="100%" stopColor="#451A03" />
            </linearGradient>
            {/* 백보드 유리 그라데이션 */}
            <linearGradient id="glassBoard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.1)" />
            </linearGradient>
          </defs>

          {/* 원목 코트 바닥 */}
          <rect x="0" y="195" width="300" height="35" fill="url(#woodFloor)" />
          <line x1="0" y1="195" x2="300" y2="195" stroke="#F59E0B" strokeWidth="2" />
          {/* 자유투 라인 & 3점 라인 호 */}
          <ellipse cx="60" cy="195" rx="55" ry="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

          {/* ================= 농구 골대 구조 ================= */}
          {/* 지지대 기둥 */}
          <line x1="265" y1="30" x2="265" y2="195" stroke="#475569" strokeWidth="6" />
          <line x1="250" y1="80" x2="265" y2="80" stroke="#64748B" strokeWidth="4" />

          {/* 투명 백보드 */}
          <rect x="248" y="32" width="6" height="75" rx="2" fill="url(#glassBoard)" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* 백보드 조준 사각형 */}
          <rect x="246" y="55" width="3" height="30" fill="none" stroke="#EF4444" strokeWidth="2" />

          {/* 림 지지 브래킷 */}
          <line x1="240" y1="78" x2="248" y2="78" stroke="#DC2626" strokeWidth="3.5" />

          {/* 그물망 (Net) - 골인 시 스위시 애니메이션 */}
          <g className={swishNet ? 'animate-bounce' : ''}>
            <polygon
              points="218,78 244,78 238,105 224,105"
              fill="rgba(255,255,255,0.2)"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            <line x1="222" y1="78" x2="228" y2="105" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
            <line x1="240" y1="78" x2="234" y2="105" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
          </g>

          {/* 주황색 림 (Rim 링) */}
          <ellipse cx="231" cy="78" rx="14" ry="4" fill="none" stroke="#EA580C" strokeWidth="3" />

          {/* 림 타깃 스팟 가이드 */}
          <circle cx="231" cy="78" r="7" fill="none" stroke={angle >= 49 && angle <= 53 ? '#10B981' : '#F59E0B'} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.8" />

          {/* ================= 포물선 궤적 가이드 ================= */}
          {!isShooting && (
            <path
              d={trajectoryPath}
              fill="none"
              stroke={angle >= 49 && angle <= 53 ? '#34D399' : '#F59E0B'}
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.85"
            />
          )}

          {/* 슈터 서있는 위치 표시 */}
          <circle cx="45" cy="195" r="14" fill="#0284C7" opacity="0.3" />
          <text x="35" y="210" fill="#93C5FD" fontSize="9" fontWeight="bold">슈팅존</text>

          {/* ================= 비행 농구공 ================= */}
          <g transform={`translate(${ballPos.x}, ${ballPos.y}) rotate(${ballPos.rot})`}>
            {/* 농구공 본체 */}
            <circle cx="0" cy="0" r="12" fill="#EA580C" stroke="#7C2D12" strokeWidth="1.5" />
            {/* 농구공 홈 라인 */}
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#000000" strokeWidth="1.2" opacity="0.8" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#000000" strokeWidth="1.2" opacity="0.8" />
            <path d="M -8 -8 Q 0 0 -8 8" fill="none" stroke="#000000" strokeWidth="1" opacity="0.7" />
            <path d="M 8 -8 Q 0 0 8 8" fill="none" stroke="#000000" strokeWidth="1" opacity="0.7" />
          </g>

          {/* 결과 시각 피드백 */}
          {result === 'goal' && (
            <g transform="translate(185, 45)">
              <rect x="0" y="0" width="100" height="24" rx="8" fill="#065F46" opacity="0.9" />
              <text x="50" y="16" fill="#6EE7B7" fontSize="11" fontWeight="900" textAnchor="middle">
                ✨ SWISH! 클린 슛!
              </text>
            </g>
          )}
          {result === 'rim_hit' && (
            <g transform="translate(185, 45)">
              <rect x="0" y="0" width="100" height="24" rx="8" fill="#991B1B" opacity="0.9" />
              <text x="50" y="16" fill="#FCA5A5" fontSize="11" fontWeight="900" textAnchor="middle">
                💥 림 튕김! 각도 조절!
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* 포물선 발사각 컨트롤러 */}
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2 mb-4 shadow-xl">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-400">낮은 탄도 (30°)</span>
          <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40">
            <span className="text-slate-300 text-xs">선택 각도:</span>
            <span className="text-amber-400 font-mono text-lg font-black">{angle}°</span>
            {angle >= 49 && angle <= 53 && (
              <span className="text-emerald-400 text-[10px] font-black ml-1">🎯 적정각!</span>
            )}
          </div>
          <span className="text-slate-400">높은 탄도 (70°)</span>
        </div>

        <input
          type="range"
          min="30"
          max="70"
          value={angle}
          onChange={e => setAngle(Number(e.target.value))}
          disabled={isShooting}
          className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-slate-400 px-1">
          <span>평사포 (림 앞 충돌)</span>
          <span className="text-emerald-400 font-bold">권장 자유투각: 49~53°</span>
          <span>고각포 (백보드 초과)</span>
        </div>
      </div>

      {/* 발사 버튼 */}
      <button
        onClick={handleShoot}
        disabled={isShooting}
        className="w-full max-w-sm py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-orange-950/50 active:scale-98 transition-all disabled:opacity-50"
      >
        {isShooting ? '포물선 궤적 비행 중... 🏀' : '🏀 포물선 슛 발사!'}
      </button>

      {/* 경기 종료 결과 오버레이 */}
      {finished && (
        <GameResultOverlay
          title={`🏀 ${score}골 자유투 성공!`}
          subtitle="최적 포물선 발사각과 투사체 역학을 적용하여 림을 완벽히 갈랐습니다."
          score={Math.max(200, scoreRef.current)}
          badge="자유투 명사수"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   17. 🥌 curling-weight-control (컬링 하우스 힘 조절 스톤)
   ========================================================================= */
export const CurlingWeightControl: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [chargeTime, setChargeTime] = useState(0);
  const [stonePos, setStonePos] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(500);
  const pressStart = useRef(0);
  const slideTimerRef = useRef<any>(null);

  const clearSlideTimer = () => {
    if (slideTimerRef.current) {
      clearInterval(slideTimerRef.current);
      slideTimerRef.current = null;
    }
  };

  const handleRestart = () => {
    resetScoreSubmission();
    clearSlideTimer();
    setChargeTime(0);
    setStonePos(0);
    setIsSliding(false);
    setFinalScore(500);
    setFinished(false);
  };

  useEffect(() => {
    return () => clearSlideTimer();
  }, []);

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
    clearSlideTimer();

    const targetDistance = Math.min(100, Math.max(10, Math.floor((duration / 1000) * 50)));

    let cur = 0;
    slideTimerRef.current = setInterval(() => {
      cur += 2;
      setStonePos(cur);
      if (cur >= targetDistance) {
        clearSlideTimer();
        setIsSliding(false);
        const distFromCenter = Math.abs(cur - 50);
        const scoreEarned = distFromCenter <= 6 ? 500
          : distFromCenter <= 15 ? 350
          : distFromCenter <= 30 ? 200
          : 100;

        setFinalScore(scoreEarned);
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

      <div className="relative w-72 h-64 bg-slate-900 border-4 border-cyan-800 rounded-3xl p-4 flex items-center mb-6 overflow-hidden shadow-2xl">
        <div className="absolute right-4 w-44 h-44 rounded-full border-4 border-blue-500 bg-blue-900/40 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border-4 border-white bg-white/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              버튼
            </div>
          </div>
        </div>

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
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={isSliding}
        className="w-full max-w-xs py-6 bg-gradient-to-r from-cyan-500 to-blue-500 active:from-cyan-600 active:to-blue-600 text-white font-black text-xl rounded-3xl shadow-xl active:scale-95 transition-transform touch-none"
      >
        {isSliding ? '미끄러지는 중... 🧊' : '꾹 눌러서 힘 모으고 떼기!'}
      </button>
      {chargeTime > 0 && (
        <p className="text-xs text-cyan-300 mt-3">투구 압력 시간: {(chargeTime / 1000).toFixed(2)}초</p>
      )}

      {finished && (
        <GameResultOverlay
          title={finalScore >= 500 ? "🥌 하우스 정중앙 안착 성공!" : finalScore >= 350 ? "🥌 하우스 내부 안착 성공!" : "🥌 투구 완료"}
          subtitle="빙판의 마찰력과 투구 지속 압력을 정밀하게 컨트롤했습니다."
          score={finalScore}
          badge="빙판 전략 컬링 마스터"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   18. 🥋 taekwondo-counter-kick (태권도 반격 발차기 패링)
   ========================================================================= */
export const TaekwondoCounterKick: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const scheduleTimeout = useGameTimeouts();
  const [oppState, setOppState] = useState<'idle' | 'warning' | 'attack'>('idle');
  const [counters, setCounters] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const countersRef = useRef(0);
  const warnTimerRef = useRef<any>(null);
  const attackTimerRef = useRef<any>(null);
  const expireTimerRef = useRef<any>(null);

  const clearAllTimers = () => {
    if (warnTimerRef.current) { clearTimeout(warnTimerRef.current); warnTimerRef.current = null; }
    if (attackTimerRef.current) { clearTimeout(attackTimerRef.current); attackTimerRef.current = null; }
    if (expireTimerRef.current) { clearTimeout(expireTimerRef.current); expireTimerRef.current = null; }
  };

  const handleRestart = () => {
    resetScoreSubmission();
    clearAllTimers();
    countersRef.current = 0;
    setRound(1);
    setCounters(0);
    setFinished(false);
  };

  useEffect(() => {
    clearAllTimers();
    if (finished) return;
    setOppState('idle');
    const delay = Math.random() * 2000 + 1000;

    warnTimerRef.current = scheduleTimeout(() => {
      setOppState('warning');
      sfxTap();

      attackTimerRef.current = scheduleTimeout(() => {
        setOppState('attack');
        hapticTap();

        expireTimerRef.current = scheduleTimeout(() => {
          if (round >= 3) {
            setFinished(true);
            sfxSuccess();
            enqueueAction({
              id: Math.random().toString(),
              type: 'INCREMENT_SCORE',
              payload: { id: groupId, amount: Math.max(200, countersRef.current * 170) },
              timestamp: Date.now()
            });
          } else {
            setRound(r => r + 1);
          }
        }, 500);
      }, 600);
    }, delay);

    return () => clearAllTimers();
  }, [round, finished, groupId, enqueueAction, scheduleTimeout]);

  const handleParry = () => {
    if (oppState === 'attack' && !finished) {
      clearAllTimers();
      sfxSuccess();
      hapticTap();
      const next = counters + 1;
      setCounters(next);
      countersRef.current = next;
      setOppState('idle');

      if (round >= 3) {
        setFinished(true);
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: Math.max(200, next * 170) },
          timestamp: Date.now()
        });
      } else {
        setRound(r => r + 1);
      }
    } else {
      sfxPop();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-red-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-red-300 text-xs font-bold">라운드</span><div className="text-2xl font-black">{round} / 3 라운드</div></div>
        <div className="text-right"><span className="text-red-300 text-xs font-bold">카운터 킥</span><div className="text-2xl font-black text-amber-400">{counters}회</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🥋 태권도 반격 발차기 패링</h1>
      <p className="text-xs text-red-200 mb-6 text-center max-w-xs">
        상대가 공격 예비 동작 후 번쩍 빛날 때 즉시 뒤후려차기 반격 버튼을 탭하세요!
      </p>

      <div className={`relative w-64 h-64 rounded-3xl border-4 flex flex-col items-center justify-center mb-6 shadow-2xl transition-colors ${
        oppState === 'attack' ? 'bg-red-600 border-white animate-ping' : oppState === 'warning' ? 'bg-amber-800 border-amber-400' : 'bg-slate-900 border-red-800'
      }`}>
        <div className="text-7xl mb-2">
          {oppState === 'attack' ? '💥' : oppState === 'warning' ? '⚠️' : '🥋'}
        </div>
        <span className="text-sm font-black">
          {oppState === 'attack' ? '지금 공격해옵니다!!' : oppState === 'warning' ? '발차기 준비 중...' : '대치 상태 (호흡 조절)'}
        </span>
      </div>

      <button
        onClick={handleParry}
        className={`w-full max-w-xs py-6 rounded-3xl font-black text-2xl transition-all shadow-2xl active:scale-95 ${
          oppState === 'attack' ? 'bg-amber-400 text-amber-950 animate-bounce ring-4 ring-white' : 'bg-slate-800 text-slate-500'
        }`}
      >
        {oppState === 'attack' ? '⚡ 전광석화 카운터 뒤후리기!' : '상대 공격을 기다리세요'}
      </button>

      {finished && (
        <GameResultOverlay
          title={`🥋 ${counters}회 번개 반격 성공!`}
          subtitle="상대의 예비 동작을 읽고 찰나의 순간에 카운터 공격을 적중시켰습니다."
          score={Math.max(200, counters * 170)}
          badge="태권도 전광석화 카운터"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   19. 🏓 tabletennis-spin-read (탁구 회전 드라이브 판독)
   ========================================================================= */
export const TabletennisSpinRead: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [spinType, setSpinType] = useState<'top' | 'back'>('top');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const TOTAL_ROUNDS = 5;

  const nextSpin = () => {
    setSpinType(Math.random() > 0.5 ? 'top' : 'back');
  };

  const handleRestart = () => {
    resetScoreSubmission();
    scoreRef.current = 0;
    setRound(1);
    setScore(0);
    setFinished(false);
    nextSpin();
  };

  useEffect(() => {
    nextSpin();
  }, []);

  const handleReceive = (selected: 'top' | 'back') => {
    if (finished) return;
    if (selected === spinType) {
      sfxCoin();
      hapticTap();
      const next = score + 1;
      setScore(next);
      scoreRef.current = next * 100;
    } else {
      sfxPop();
    }

    if (round >= TOTAL_ROUNDS) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: Math.max(200, scoreRef.current) },
        timestamp: Date.now()
      });
    } else {
      setRound(r => r + 1);
      nextSpin();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-slate-400 text-xs font-bold">리시브 시도</span><div className="text-2xl font-black">{round} / {TOTAL_ROUNDS}회</div></div>
        <div className="text-right"><span className="text-slate-400 text-xs font-bold">판독 성공</span><div className="text-2xl font-black text-cyan-400">{score}점</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🏓 탁구 회전 드라이브 판독</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        상대방의 라켓 마찰 궤적을 보고 전진 탑스핀인지 후진 백스핀(커트)인지 맞추세요!
      </p>

      <div className="relative w-64 h-64 bg-slate-900 border-4 border-blue-600 rounded-3xl p-4 flex flex-col items-center justify-center mb-6 shadow-2xl">
        <div className="text-7xl mb-2 animate-spin-slow">
          🏓
        </div>
        <div className="text-lg font-black text-amber-300">
          {spinType === 'top' ? '⬆️ 라켓이 위로 긁어올려짐!' : '⬇️ 라켓이 아래로 깎아내려짐!'}
        </div>
        <span className="text-xs text-slate-400 mt-1">공의 회전 방향을 읽으세요!</span>
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => handleReceive('top')}
          className="flex-1 py-5 bg-gradient-to-r from-red-600 to-rose-600 active:scale-95 rounded-2xl font-black text-sm text-white shadow-xl transition-all flex flex-col items-center gap-1"
        >
          <span>⬆️ 탑스핀</span>
          <span className="text-[10px] opacity-80">(라켓 면 닫고 블록)</span>
        </button>
        <button
          onClick={() => handleReceive('back')}
          className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 active:scale-95 rounded-2xl font-black text-sm text-white shadow-xl transition-all flex flex-col items-center gap-1"
        >
          <span>⬇️ 백스핀 (커트)</span>
          <span className="text-[10px] opacity-80">(라켓 면 열고 푸시)</span>
        </button>
      </div>

      {finished && (
        <GameResultOverlay
          title={`🏓 ${score}회 회전 판독 성공!`}
          subtitle="탁구 러버의 마찰 궤적으로 탑스핀과 백스핀을 구분해 완벽히 리시브했습니다."
          score={Math.max(200, scoreRef.current)}
          badge="탁구 스핀 판독기"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   20. ⚾ baseball-bunt-defense (번트 대시 1루 송구 수비)
   ========================================================================= */
export const BaseballBuntDefense: React.FC<GameProps> = ({ groupId, enqueueAction: queueAction, onExit }) => {
  const [enqueueAction, resetScoreSubmission] = useGameScoreSubmission(queueAction);
  const [buntCatch, setBuntCatch] = useState(false);
  const [throwAcc, setThrowAcc] = useState(50);
  const [finished, setFinished] = useState(false);

  const handleRestart = () => {
    resetScoreSubmission();
    setBuntCatch(false);
    setThrowAcc(50);
    setFinished(false);
  };

  const handleCatch = () => {
    if (buntCatch || finished) return;
    sfxTap();
    hapticTap();
    setBuntCatch(true);
  };

  const handleThrow = () => {
    if (!buntCatch || finished) return;
    const isOut = Math.abs(throwAcc - 50) <= 12;

    if (isOut) {
      sfxSuccess();
      hapticTap();
    } else {
      sfxPop();
    }

    setFinished(true);
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: isOut ? 500 : 250 },
      timestamp: Date.now()
    });
  };

  return (
    <div className="min-h-[100dvh] bg-amber-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">⚾ 기습 번트 대시 1루 송구</h1>
      <p className="text-xs text-amber-200 mb-6 text-center max-w-xs">
        굴러오는 번트 타구에 즉시 대시해 잡고, 게이지 중앙을 맞춰 1루로 송구하세요!
      </p>

      <div className="relative w-64 h-64 bg-slate-900 border-4 border-amber-700 rounded-3xl p-4 flex flex-col items-center justify-between mb-6 shadow-2xl">
        <span className="text-xs font-bold text-amber-300">내야 다이아몬드 잔디</span>

        <button
          onClick={handleCatch}
          disabled={buntCatch}
          className={`text-5xl transition-transform active:scale-90 ${buntCatch ? 'opacity-30' : 'animate-bounce cursor-pointer'}`}
        >
          ⚾
        </button>

        <span className="text-xs text-slate-300">
          {buntCatch ? '✅ 타구 포구 완료! 1루수 글러브로 송구!' : '굴러오는 야구공을 터치해 포구하세요!'}
        </span>
      </div>

      {buntCatch && (
        <div className="w-full max-w-xs flex flex-col gap-2 mb-6 animate-in fade-in">
          <div className="flex justify-between text-xs font-bold text-amber-300">
            <span>악송구 (좌)</span>
            <span className="text-emerald-400">1루수 미트 (중앙 50)</span>
            <span>악송구 (우)</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={throwAcc}
            onChange={e => setThrowAcc(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>
      )}

      <button
        onClick={handleThrow}
        disabled={!buntCatch}
        className={`w-full max-w-xs py-5 rounded-2xl font-black text-xl transition-all shadow-xl active:scale-95 ${
          buntCatch ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-4 ring-white' : 'bg-slate-800 text-slate-500'
        }`}
      >
        {buntCatch ? '🎯 1루로 정확히 송구!!' : '공을 먼저 잡으세요'}
      </button>

      {finished && (
        <GameResultOverlay
          title={Math.abs(throwAcc - 50) <= 12 ? "⚾ 타자 주자 1루 아웃!" : "⚾ 악송구! 타자 주자 세이프"}
          subtitle={
            Math.abs(throwAcc - 50) <= 12
              ? "기습 번트 타구에 즉각 전진 대시하여 1루수로 정확한 노바운드 송구를 성공시켰습니다."
              : "송구 각도가 다소 빗나갔지만, 빠른 전진 포구로 적극적인 수비 센스를 보여주었습니다."
          }
          score={Math.abs(throwAcc - 50) <= 12 ? 500 : 250}
          badge="철벽 내야 수비수"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};
