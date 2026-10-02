import React, { useState, useRef, useEffect } from 'react';
import { useModalDialog } from '../../application/useModalDialog';
import { X, Trophy, Swords, RotateCcw } from 'lucide-react';
import { useAudio } from '../../application/useAudio';
import { useVoiceCoach } from '../../application/useVoiceCoach';

interface SplitBattleGameProps {
  isOpen: boolean;
  onClose: () => void;
}

type BattleType = 'tug' | 'flag' | 'tap';

export const SplitBattleGame: React.FC<SplitBattleGameProps> = ({ isOpen, onClose }) => {
  const dialogRef = useModalDialog(isOpen, onClose);
  const ended = useRef(false);
  const rope = useRef(0);
  const counts = useRef({ p1: 0, p2: 0 });
  const { playBeep } = useAudio();
  const { speak } = useVoiceCoach();

  const [battleType, setBattleType] = useState<BattleType>('tug');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'ended'>('menu');
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);

  // 1. 줄다리기 상태: 0(중앙), -50 (P1 승리), +50 (P2 승리)
  const [ropePos, setRopePos] = useState(0);

  // 2. 깃발 잡기 상태
  const [flagVisible, setFlagVisible] = useState(false);
  const flagTimer = useRef<number | null>(null);

  // 3. 스피드 25회 연타 대결
  const [p1Count, setP1Count] = useState(0);
  const [p2Count, setP2Count] = useState(0);

  useEffect(() => () => { if (flagTimer.current) clearTimeout(flagTimer.current); }, []);
  if (!isOpen) return null;
  const finish = (player: 'p1' | 'p2') => {
    if (ended.current) return;
    ended.current = true;
    setWinner(player);
    setGameState('ended');
    speak(`${player === 'p1' ? '플레이어 1' : '플레이어 2'} 승리!`, true);
  };

  const startBattle = (type: BattleType) => {
    if (flagTimer.current) clearTimeout(flagTimer.current);
    ended.current = false;
    rope.current = 0;
    counts.current = {p1: 0, p2: 0};
    setBattleType(type);
    setRopePos(0);
    setP1Count(0);
    setP2Count(0);
    setFlagVisible(false);
    setWinner(null);
    setGameState('playing');

    if (type === 'flag') {
      const delay = Math.floor(Math.random() * 2500) + 1500;
      flagTimer.current = window.setTimeout(() => {
        setFlagVisible(true);
        playBeep();
      }, delay);
    }

    speak('배틀 시작! 준비, 출발!', true);
  };

  // 줄다리기 클릭
  const handleTug = (player: 'p1' | 'p2') => {
    if (gameState !== 'playing' || battleType !== 'tug') return;
    playBeep();
    if (ended.current) return;
    rope.current += player === 'p1' ? -5 : 5;
    setRopePos(rope.current);
    if (rope.current <= -45) finish('p1');
    else if (rope.current >= 45) finish('p2');
  };

  // 깃발 터치
  const handleFlagCatch = (player: 'p1' | 'p2') => {
    if (gameState !== 'playing' || battleType !== 'flag') return;
    if (!flagVisible) {
      // 헛손질 페널티
      return;
    }
    finish(player);
  };

  // 스피드 연타
  const handleTap = (player: 'p1' | 'p2') => {
    if (gameState !== 'playing' || battleType !== 'tap') return;
    playBeep();
    if (ended.current) return;
    const next = ++counts.current[player];
    if (player === 'p1') setP1Count(next); else setP2Count(next);
    if (next >= 25) finish(player);
  };

  const activatePlayer = (player: 'p1' | 'p2') => {
    if (battleType === 'tug') handleTug(player);
    if (battleType === 'flag') handleFlagCatch(player);
    if (battleType === 'tap') handleTap(player);
  };

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="2인 화면분할 배틀" tabIndex={-1} className="fixed inset-0 z-[10005] bg-black flex flex-col justify-between text-white select-none overflow-hidden">
      {/* 닫기 및 메뉴 바 */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-600 shadow-xl"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {gameState === 'menu' ? (
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 bg-slate-950 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mb-4 shadow-xl shadow-rose-500/30 animate-bounce">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">2인 화면분할 배틀 모드</h2>
          <p className="text-sm text-slate-400 max-w-xs mb-8 leading-relaxed">
            폰이나 태블릿 1대를 가운데 두고<br />친구와 마주 보며 신나게 대결하세요!
          </p>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => startBattle('tug')}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 font-black text-left flex items-center justify-between shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <div>
                <p className="text-lg font-black">🪢 광속 줄다리기</p>
                <p className="text-xs text-blue-100">연타로 밧줄을 내 진영으로 당기기</p>
              </div>
              <span className="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">플레이</span>
            </button>

            <button
              onClick={() => startBattle('flag')}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 font-black text-left flex items-center justify-between shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            >
              <div>
                <p className="text-lg font-black">🚩 깃발 먼저 낚아채기</p>
                <p className="text-xs text-amber-100">깃발이 뜨는 순간 초광속 터치</p>
              </div>
              <span className="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">플레이</span>
            </button>

            <button
              onClick={() => startBattle('tap')}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-500 font-black text-left flex items-center justify-between shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              <div>
                <p className="text-lg font-black">⚡ 25회 스피드 폭풍 연타</p>
                <p className="text-xs text-purple-100">누가 먼저 25번을 누를 것인가!</p>
              </div>
              <span className="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold">플레이</span>
            </button>
          </div>
        </div>
      ) : (
        /* 게임 플레이 분할 화면 */
        <div className="flex-1 flex flex-col relative w-full h-full">
          {/* 상단 플레이어 (P1 - 180도 회전되어 마주 보는 구조) */}
          <div
            role="button" tabIndex={0} aria-label="플레이어 1" aria-disabled={gameState !== 'playing'}
            onPointerDown={() => activatePlayer('p1')}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activatePlayer('p1'); } }}
            className="touch-none flex-1 bg-gradient-to-b from-blue-900 to-blue-950 flex flex-col items-center justify-center rotate-180 cursor-pointer active:brightness-125 transition-all border-b-2 border-slate-700/60 p-4"
          >
            <div className="text-center">
              <span className="px-3 py-1 bg-blue-500 text-slate-950 text-xs font-black rounded-full">
                PLAYER 1 (청팀)
              </span>
              {battleType === 'tug' && (
                <p className="text-2xl font-black mt-2">연타해서 당겨라!! 🪢</p>
              )}
              {battleType === 'flag' && (
                <p className="text-2xl font-black mt-2">
                  {flagVisible ? '지금 터치!! 🚩' : '준비...'}
                </p>
              )}
              {battleType === 'tap' && (
                <p className="text-4xl font-mono font-black mt-2 text-cyan-300">
                  {p1Count} / 25
                </p>
              )}
            </div>
          </div>

          {/* 중앙 경계선 & 공용 인터랙션 영역 */}
          <div className="h-16 bg-slate-900 flex items-center justify-center relative shrink-0 border-y border-slate-700">
            {battleType === 'tug' && (
              <div className="w-full max-w-xs h-6 bg-slate-950 rounded-full relative overflow-hidden border border-slate-700 flex items-center">
                {/* 밧줄 중앙 매듭 */}
                <div
                  className="w-8 h-8 rounded-full bg-amber-400 absolute top-1/2 -translate-y-1/2 shadow-lg shadow-amber-400/50 transition-all duration-75 flex items-center justify-center text-xs font-black text-slate-950"
                  style={{ left: `calc(50% + ${ropePos}%)`, transform: 'translate(-50%, -50%)' }}
                >
                  🪢
                </div>
              </div>
            )}

            {battleType === 'flag' && (
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${
                  flagVisible ? 'bg-amber-400 scale-125 shadow-xl shadow-amber-400/80 animate-ping' : 'bg-slate-800 opacity-20'
                }`}
              >
                🚩
              </div>
            )}

            {battleType === 'tap' && (
              <div className="text-xs font-bold text-slate-400 flex items-center gap-4">
                <span className="text-blue-400 font-bold">P1: {p1Count}</span>
                <span className="text-rose-400 font-bold">P2: {p2Count}</span>
              </div>
            )}
          </div>

          {/* 하단 플레이어 (P2 - 정상 시점) */}
          <div
            role="button" tabIndex={0} aria-label="플레이어 2" aria-disabled={gameState !== 'playing'}
            onPointerDown={() => activatePlayer('p2')}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activatePlayer('p2'); } }}
            className="touch-none flex-1 bg-gradient-to-b from-rose-950 to-rose-900 flex flex-col items-center justify-center cursor-pointer active:brightness-125 transition-all p-4"
          >
            <div className="text-center">
              <span className="px-3 py-1 bg-rose-500 text-slate-950 text-xs font-black rounded-full">
                PLAYER 2 (홍팀)
              </span>
              {battleType === 'tug' && (
                <p className="text-2xl font-black mt-2">연타해서 당겨라!! 🪢</p>
              )}
              {battleType === 'flag' && (
                <p className="text-2xl font-black mt-2">
                  {flagVisible ? '지금 터치!! 🚩' : '준비...'}
                </p>
              )}
              {battleType === 'tap' && (
                <p className="text-4xl font-mono font-black mt-2 text-rose-300">
                  {p2Count} / 25
                </p>
              )}
            </div>
          </div>

          {/* 승리 팝업 오버레이 */}
          {gameState === 'ended' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 z-40">
              <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 animate-bounce" />
                <h3 className="text-2xl font-black mb-1">
                  {winner === 'p1' ? '🎉 청팀(P1) 승리!' : '🎉 홍팀(P2) 승리!'}
                </h3>
                <p className="text-xs text-slate-400 mb-6">엄청난 스피드였습니다!</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => startBattle(battleType)}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" /> 다시하기
                  </button>
                  <button
                    onClick={() => setGameState('menu')}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                  >
                    종목 선택
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
