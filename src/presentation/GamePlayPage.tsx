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
import { JumpDetector } from './components/minigames/JumpDetector';
import { SquatCounter } from './components/minigames/SquatCounter';
import { RunInPlace } from './components/minigames/RunInPlace';
import { TiltBalance } from './components/minigames/TiltBalance';
import { ZoneTouch } from './components/minigames/ZoneTouch';
import { ArmRaise } from './components/minigames/ArmRaise';
import { DancePose } from './components/minigames/DancePose';
import { CircleDraw } from './components/minigames/CircleDraw';
import { TraceShape } from './components/minigames/TraceShape';
import { PunchCounter } from './components/minigames/PunchCounter';
import { PlankHold } from './components/minigames/PlankHold';
import { AnimalMove } from './components/minigames/AnimalMove';
import { TiltRace } from './components/minigames/TiltRace';
import { FreezeGame } from './components/minigames/FreezeGame';
import { WaveCounter } from './components/minigames/WaveCounter';
import { SpeedCircle } from './components/minigames/SpeedCircle';
import { ZigZagTouch } from './components/minigames/ZigZagTouch';
import { MultiTouch } from './components/minigames/MultiTouch';
import { StretchTimer } from './components/minigames/StretchTimer';
import { OneLegBalance } from './components/minigames/OneLegBalance';
import { FitnessRoulette } from './components/minigames/FitnessRoulette';
import { BodyTwist } from './components/minigames/BodyTwist';
import { PulseDetective } from './components/minigames/PulseDetective';
import { PostureGuardian } from './components/minigames/PostureGuardian';
import { RollingCurling } from './components/minigames/RollingCurling';
import { PassGateRescue } from './components/minigames/PassGateRescue';
import { DribbleRhythm } from './components/minigames/DribbleRhythm';
import { OpenSpaceTactician } from './components/minigames/OpenSpaceTactician';
import { EmotionThermometer } from './components/minigames/EmotionThermometer';
import { PartnerRobotLab } from './components/minigames/PartnerRobotLab';
import { EXPRESSION_GAMES } from './components/minigames/expression/expressionGamesData';
import { ExpressionGameViewer } from './components/minigames/expression/ExpressionGameViewer';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import { startBgm, stopBgm, sfxSuccess, sfxFail } from '../application/soundEffects';

interface GameMeta {
  name: string;
  emoji: string;
  domain: '운동' | '스포츠' | '표현';
  code: string;
  target: string;
}

const GAME_TITLES: Record<string, GameMeta> = {
  volcano: { name: '화산 폭발', emoji: '🌋', domain: '운동', code: '[6체01-01]', target: '순발력 운동 체력' },
  whack_a_mole: { name: '별 두더지 잡기', emoji: '⭐', domain: '스포츠', code: '[6체02-02]', target: '기술형 표적 활동' },
  stopwatch: { name: '스탑워치 눈치', emoji: '⏱️', domain: '스포츠', code: '[6체02-02]', target: '기술형 기록 활동' },
  memory: { name: '컬러 패턴 기억', emoji: '🧠', domain: '스포츠', code: '[6체02-06]', target: '전략형 인지 게임' },
  number_grid: { name: '순차적 암호 해제', emoji: '🔢', domain: '스포츠', code: '[4체02-06]', target: '전략형 공간 탐색' },
  scream: { name: '소리질러!', emoji: '🎤', domain: '운동', code: '[4체01-04]', target: '건강 정서 관리' },
  shake: { name: '바운스 충전', emoji: '🔋', domain: '운동', code: '[4체01-02]', target: '기본 체력운동' },
  tug_of_war: { name: '스마트 줄다리기', emoji: '🏋️', domain: '스포츠', code: '[4체02-05]', target: '기술형 투기 활동' },
  fate_card: { name: '운명의 카드', emoji: '🃏', domain: '스포츠', code: '[6체02-10]', target: '생태형 여가 놀이' },
  reaction: { name: '반응속도 테스트', emoji: '⚡', domain: '운동', code: '[6체01-02]', target: '민첩성 체력 측정' },
  balloon: { name: '풍선 불기', emoji: '🎈', domain: '스포츠', code: '[6체02-06]', target: '전략형 심리 게임' },
  direction: { name: '방향 스와이프', emoji: '👆', domain: '스포츠', code: '[4체02-03]', target: '조작 움직임 기술' },
  color_word: { name: '색깔 읽기 챌린지', emoji: '🎨', domain: '운동', code: '[6체01-01]', target: '신경 협응 인지' },
  card_match: { name: '짝 맞추기', emoji: '🃏', domain: '스포츠', code: '[4체02-06]', target: '전략형 시각 탐색' },
  math: { name: '계산왕 스프린트', emoji: '🔢', domain: '운동', code: '[4체01-01]', target: '두뇌 건강 이해' },
  target: { name: '타겟 조준', emoji: '🎯', domain: '스포츠', code: '[4체02-05]', target: '기술형 표적 활동' },
  red_green: { name: '무궁화꽃이 피었습니다', emoji: '🚦', domain: '스포츠', code: '[4체02-07]', target: '생태형 민속놀이' },
  left_right: { name: '좌우 반사신경', emoji: '👈👉', domain: '스포츠', code: '[4체02-03]', target: '반사 움직임 기술' },
  coin_flip: { name: '동전 뒤집기', emoji: '🪙', domain: '스포츠', code: '[4체02-09]', target: '전통 놀이 규칙' },
  jump: { name: '점프왕!', emoji: '🦘', domain: '운동', code: '[4체01-02]', target: '순발력 체력운동' },
  squat: { name: '스쿼트 챌린지', emoji: '🏋️', domain: '운동', code: '[6체01-02]', target: '근력·근지구력 운동' },
  run: { name: '제자리 달리기', emoji: '🏃', domain: '운동', code: '[4체01-02]', target: '심폐지구력 달리기' },
  tilt_balance: { name: '균형 잡기', emoji: '⚖️', domain: '운동', code: '[4체01-02]', target: '평형성 조절 운동' },
  zone_touch: { name: '구역 터치 달리기', emoji: '🏃‍♂️', domain: '스포츠', code: '[4체02-03]', target: '방향전환 달리기' },
  arm_raise: { name: '하늘 높이!', emoji: '🙌', domain: '운동', code: '[4체01-05]', target: '기본 움직임 뻗기' },
  dance_pose: { name: '댄스 포즈', emoji: '💃', domain: '표현', code: '[6체03-06]', target: '현대 표현 동작' },
  circle_draw: { name: '원 그리기 대결', emoji: '⭕', domain: '표현', code: '[4체03-02]', target: '움직임 궤적 표현' },
  trace_shape: { name: '도형 따라 그리기', emoji: '✏️', domain: '표현', code: '[4체03-06]', target: '도구 및 형태 표현' },
  punch: { name: '에어 펀치!', emoji: '🥊', domain: '스포츠', code: '[6체02-02]', target: '투기형 타격 기술' },
  plank: { name: '플랭크 챌린지', emoji: '🧘', domain: '운동', code: '[6체01-05]', target: '코어 근력 버티기' },
  animal: { name: '동물 체조', emoji: '🐾', domain: '표현', code: '[4체03-03]', target: '사물·자연 모방 표현' },
  tilt_race: { name: '기울기 레이스', emoji: '📱', domain: '스포츠', code: '[4체02-05]', target: '기술형 조작 제어' },
  freeze: { name: '얼음 땡!', emoji: '🧊', domain: '스포츠', code: '[6체02-08]', target: '생태형 신체 정지' },
  wave: { name: '좌우 흔들기', emoji: '👋', domain: '운동', code: '[4체01-04]', target: '맨손체조 생활 습관' },
  speed_circle: { name: '빙글빙글!', emoji: '🌀', domain: '운동', code: '[4체01-02]', target: '가동성 체력운동' },
  zigzag: { name: '지그재그 런!', emoji: '⚡', domain: '스포츠', code: '[4체02-04]', target: '복합 이동 움직임' },
  multi_touch: { name: '양손 터치', emoji: '🖐️', domain: '운동', code: '[6체01-02]', target: '양손 협응성 발달' },
  stretch: { name: '스트레칭 타이머', emoji: '🧘', domain: '운동', code: '[4체01-04]', target: '유연성 생활 습관' },
  one_leg: { name: '한 발 서기', emoji: '🦩', domain: '운동', code: '[6체01-02]', target: '평형성 체력 측정' },
  fitness: { name: '체력 룰렛', emoji: '🎰', domain: '운동', code: '[4체01-06]', target: '체력 운동 실천' },
  body_twist: { name: '몸 비틀기!', emoji: '🔄', domain: '표현', code: '[4체03-05]', target: '리듬 신체 표현' },
  'pulse-detective': { name: '심박 탐정단', emoji: '🔍', domain: '운동', code: '[6체01-01]', target: '신체 변화 관찰' },
  'posture-guardian': { name: '자세 수호 로봇', emoji: '🤖', domain: '운동', code: '[4체01-04]', target: '바른 자세 실천' },
  'rolling-curling': { name: '공 굴림 컬링 원정', emoji: '🥌', domain: '스포츠', code: '[4체02-05]', target: '표적 힘 조절' },
  'pass-gate-rescue': { name: '패스 게이트 구조대', emoji: '🥅', domain: '스포츠', code: '[4체02-06]', target: '협력 패스 전술' },
  'dribble-rhythm': { name: '드리블 박자 공장', emoji: '🥁', domain: '스포츠', code: '[4체02-03]', target: '리듬 조작 움직임' },
  'open-space-tactician': { name: '빈 공간 설계자', emoji: '🗺️', domain: '스포츠', code: '[6체02-05]', target: '공간 침투 전술' },
  'emotion-thermometer': { name: '감정 온도계', emoji: '🌡️', domain: '표현', code: '[4체03-04]', target: '감정 신체 표현' },
  'partner-robot-lab': { name: '파트너 로봇 연구소', emoji: '🤖', domain: '표현', code: '[4체03-02]', target: '신체 요소 창의 표현' },
};

// 30종 신규 표현 게임 메타 자동 등록
EXPRESSION_GAMES.forEach(eg => {
  GAME_TITLES[eg.id] = {
    name: eg.name,
    emoji: eg.emoji,
    domain: '표현',
    code: eg.achievement.code,
    target: eg.subCategory,
  };
});

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
      case 'jump':
        return <JumpDetector key={key} {...commonProps} />;
      case 'squat':
        return <SquatCounter key={key} {...commonProps} />;
      case 'run':
        return <RunInPlace key={key} {...commonProps} />;
      case 'tilt_balance':
        return <TiltBalance key={key} {...commonProps} />;
      case 'zone_touch':
        return <ZoneTouch key={key} {...commonProps} />;
      case 'arm_raise':
        return <ArmRaise key={key} {...commonProps} />;
      case 'dance_pose':
        return <DancePose key={key} {...commonProps} />;
      case 'circle_draw':
        return <CircleDraw key={key} {...commonProps} />;
      case 'trace_shape':
        return <TraceShape key={key} {...commonProps} />;
      case 'punch':
        return <PunchCounter key={key} {...commonProps} />;
      case 'plank':
        return <PlankHold key={key} {...commonProps} />;
      case 'animal':
        return <AnimalMove key={key} {...commonProps} />;
      case 'tilt_race':
        return <TiltRace key={key} {...commonProps} />;
      case 'freeze':
        return <FreezeGame key={key} {...commonProps} />;
      case 'wave':
        return <WaveCounter key={key} {...commonProps} />;
      case 'speed_circle':
        return <SpeedCircle key={key} {...commonProps} />;
      case 'zigzag':
        return <ZigZagTouch key={key} {...commonProps} />;
      case 'multi_touch':
        return <MultiTouch key={key} {...commonProps} />;
      case 'stretch':
        return <StretchTimer key={key} {...commonProps} />;
      case 'one_leg':
        return <OneLegBalance key={key} {...commonProps} />;
      case 'fitness':
        return <FitnessRoulette key={key} {...commonProps} />;
      case 'body_twist':
        return <BodyTwist key={key} {...commonProps} />;
      case 'pulse-detective':
        return <PulseDetective key={key} />;
      case 'posture-guardian':
        return <PostureGuardian key={key} />;
      case 'rolling-curling':
        return <RollingCurling key={key} />;
      case 'pass-gate-rescue':
        return <PassGateRescue key={key} />;
      case 'dribble-rhythm':
        return <DribbleRhythm key={key} />;
      case 'open-space-tactician':
        return <OpenSpaceTactician key={key} />;
      case 'emotion-thermometer':
        return <EmotionThermometer key={key} />;
      case 'partner-robot-lab':
        return <PartnerRobotLab key={key} />;
      default: {
        const isExpressionGame = EXPRESSION_GAMES.some(eg => eg.id === gameType);
        if (isExpressionGame && gameType) {
          return (
            <div className="pt-16 pb-12 px-4 min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center">
              <ExpressionGameViewer
                key={key}
                gameType={gameType}
                onComplete={(score) => localEnqueueAction({ payload: { amount: score } })}
                onExit={() => navigate('/')}
              />
            </div>
          );
        }
        return null;
      }
    }
  };

  return (
    <div className="relative min-h-[100dvh]">
      {/* 게임 렌더링 */}
      {renderGame()}

      {/* 상단 네비게이션 & 2022 개정 교육과정 성취기준 뱃지 */}
      <div className="fixed top-4 left-4 right-4 z-[10000] flex items-center justify-between pointer-events-none">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white transition-colors pointer-events-auto shadow-lg"
          title="대시보드로 돌아가기"
        >
          <Home className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full shadow-lg">
          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60">
            {gameInfo.code}
          </span>
          <span className="text-[11px] font-bold text-slate-300 hidden xs:inline">
            {gameInfo.target}
          </span>
        </div>
      </div>

      {/* 게임 종료 결과 오버레이 */}
      {gameFinished && (
        <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 font-sans animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-slate-700 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl">
            {/* 2022 개정 성취기준 배지 */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 mb-4">
              <span>{gameInfo.code}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{gameInfo.target}</span>
            </div>

            <span className="text-6xl mb-3">{gameInfo.emoji}</span>
            <h2 className="text-2xl font-black text-white mb-1">{gameInfo.name}</h2>
            <p className="text-emerald-400 font-bold text-xs mb-5">2022 개정 초등 체육과 학습 완료!</p>

            <div className="w-full bg-slate-800 rounded-2xl p-5 mb-5 flex flex-col items-center border border-slate-700">
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
