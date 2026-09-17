import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VolcanoGame } from './components/minigames/VolcanoGame';
import { WhackAMoleGame } from './components/minigames/WhackAMoleGame';
import { StopwatchGame } from './components/minigames/StopwatchGame';
import { MemoryGame } from './components/minigames/MemoryGame';
import { NumberGridGame } from './components/minigames/NumberGridGame';
import { ScreamGame } from './components/minigames/ScreamGame';
import { ShakeGame } from './components/minigames/ShakeGame';
import { TugOfWarGame } from './components/minigames/TugOfWarGame';
import { FateCardGame } from './components/minigames/FateCardGame';
import { ReactionTest } from './components/minigames/ReactionTest';
import { BalloonPump } from './components/minigames/BalloonPump';
import { DirectionSwipe } from './components/minigames/DirectionSwipe';
import { ColorWord } from './components/minigames/ColorWord';
import { CardMatch } from './components/minigames/CardMatch';
import { MathSprint } from './components/minigames/MathSprint';
import { TargetShoot } from './components/minigames/TargetShoot';
import { RedGreenLight } from './components/minigames/RedGreenLight';
import { LeftRight } from './components/minigames/LeftRight';
import { CoinFlip } from './components/minigames/CoinFlip';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import { startBgm, stopBgm, sfxSuccess, sfxFail } from '../application/soundEffects';

const GAME_TITLES: Record<string, { name: string; emoji: string }> = {
  volcano: { name: '화산 폭발', emoji: '🌋' },
  whack_a_mole: { name: '별 두더지 잡기', emoji: '⭐' },
  stopwatch: { name: '스탑워치 눈치', emoji: '⏱️' },
  memory: { name: '컬러 패턴 기억', emoji: '🧠' },
  number_grid: { name: '순차적 암호 해제', emoji: '🔢' },
  scream: { name: '소리질러!', emoji: '🎤' },
  shake: { name: '바운스 충전', emoji: '🔋' },
  tug_of_war: { name: '스마트 줄다리기', emoji: '🏋️' },
  fate_card: { name: '운명의 카드', emoji: '🃏' },
  reaction: { name: '반응속도 테스트', emoji: '⚡' },
  balloon: { name: '풍선 불기', emoji: '🎈' },
  direction: { name: '방향 스와이프', emoji: '👆' },
  color_word: { name: '색깔 읽기 챌린지', emoji: '🎨' },
  card_match: { name: '짝 맞추기', emoji: '🃏' },
  math: { name: '계산왕 스프린트', emoji: '🔢' },
  target: { name: '타겟 조준', emoji: '🎯' },
  red_green: { name: '무궁화꽃이 피었습니다', emoji: '🚦' },
  left_right: { name: '좌우 반사신경', emoji: '👈👉' },
  coin_flip: { name: '동전 뒤집기', emoji: '🪙' },
};

export const GamePlayPage = () => {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const [key, setKey] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [lastEarnedScore, setLastEarnedScore] = useState(0);

  // BGM 시작/종료
  useEffect(() => {
    startBgm();
    return () => stopBgm();
  }, []);

  // 로컬 enqueueAction — DB 대신 로컬 state에 점수 기록
  const localEnqueueAction = useCallback((action: { payload: { amount: number } }) => {
    const earned = action.payload.amount;
    setLastEarnedScore(earned);
    setGameFinished(true);
    stopBgm();

    // 성공/실패 효과음
    if (earned > 0) {
      sfxSuccess();
    } else {
      sfxFail();
    }

    // 최고 기록 저장
    if (gameType) {
      const bestKey = `physical_best_${gameType}`;
      const currentBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
      if (earned > currentBest) {
        localStorage.setItem(bestKey, String(earned));
      }
    }
  }, [gameType]);

  const handleReplay = () => {
    setGameFinished(false);
    setLastEarnedScore(0);
    setKey(prev => prev + 1);
    startBgm();
  };

  const gameInfo = GAME_TITLES[gameType || ''];
  if (!gameType || !gameInfo) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black mb-4">존재하지 않는 게임입니다</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-cyan-600 rounded-xl font-bold">홈으로</button>
      </div>
    );
  }

  const bestScore = parseInt(localStorage.getItem(`physical_best_${gameType}`) || '0', 10);

  // 화산 게임은 gameRoom을 필요로 하므로 더미 gameRoom 생성
  const dummyGameRoom = {
    id: 'standalone',
    pin_code: '0000',
    name: 'Standalone',
    status: 'playing' as const,
    started_at: new Date().toISOString(),
    global_time_modifier: 0,
    active_minigame: { type: gameType, end_time: Date.now() + 10000 },
    template_id: null,
    flash_sale: false,
  };

  const dummyGroupId = 'standalone-player';

  const renderGame = () => {
    const commonProps = { groupId: dummyGroupId, enqueueAction: localEnqueueAction };

    switch (gameType) {
      case 'volcano':
        return <VolcanoGame key={key} gameRoom={dummyGameRoom as any} {...commonProps} />;
      case 'whack_a_mole':
        return <WhackAMoleGame key={key} {...commonProps} />;
      case 'stopwatch':
        return <StopwatchGame key={key} {...commonProps} />;
      case 'memory':
        return <MemoryGame key={key} {...commonProps} />;
      case 'number_grid':
        return <NumberGridGame key={key} {...commonProps} />;
      case 'scream':
        return <ScreamGame key={key} {...commonProps} />;
      case 'shake':
        return <ShakeGame key={key} {...commonProps} />;
      case 'tug_of_war':
        return <TugOfWarGame key={key} {...commonProps} />;
      case 'fate_card':
        return <FateCardGame key={key} {...commonProps} />;
      case 'reaction':
        return <ReactionTest key={key} {...commonProps} />;
      case 'balloon':
        return <BalloonPump key={key} {...commonProps} />;
      case 'direction':
        return <DirectionSwipe key={key} {...commonProps} />;
      case 'color_word':
        return <ColorWord key={key} {...commonProps} />;
      case 'card_match':
        return <CardMatch key={key} {...commonProps} />;
      case 'math':
        return <MathSprint key={key} {...commonProps} />;
      case 'target':
        return <TargetShoot key={key} {...commonProps} />;
      case 'red_green':
        return <RedGreenLight key={key} {...commonProps} />;
      case 'left_right':
        return <LeftRight key={key} {...commonProps} />;
      case 'coin_flip':
        return <CoinFlip key={key} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-[100dvh]">
      {/* 게임 렌더링 */}
      {renderGame()}

      {/* 상단 네비게이션 — 항상 표시 */}
      <div className="fixed top-4 left-4 z-[10000] flex gap-2">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Home className="w-5 h-5" />
        </button>
      </div>

      {/* 게임 종료 결과 오버레이 */}
      {gameFinished && (
        <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl">
            <span className="text-6xl mb-4">{gameInfo.emoji}</span>
            <h2 className="text-2xl font-black text-white mb-1">{gameInfo.name}</h2>
            <p className="text-slate-400 font-bold text-sm mb-6">게임 종료!</p>

            <div className="w-full bg-slate-800 rounded-2xl p-5 mb-6 flex flex-col items-center border border-slate-700">
              <span className="text-slate-400 text-sm font-bold mb-1">획득 점수</span>
              <span className={`text-5xl font-black font-mono ${lastEarnedScore > 0 ? 'text-cyan-400' : lastEarnedScore < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {lastEarnedScore > 0 ? '+' : ''}{lastEarnedScore}
              </span>
            </div>

            <div className="w-full flex justify-between items-center bg-slate-800/50 rounded-xl px-4 py-3 mb-6 border border-slate-700/50">
              <div className="flex items-center gap-2 text-yellow-500">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-bold">최고 기록</span>
              </div>
              <span className="text-yellow-400 font-black">{bestScore}점</span>
            </div>

            <div className="w-full flex gap-3">
              <button
                onClick={handleReplay}
                className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-base flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <RotateCcw className="w-5 h-5" /> 다시 하기
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-5 h-5" /> 홈으로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
