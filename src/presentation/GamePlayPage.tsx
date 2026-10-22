import {mergedGameUrl,variantsFor} from '../domain/gameLifecycle';
import {ConsolidatedActivity} from './components/minigames/common/ConsolidatedActivity';
import {Navigate} from 'react-router-dom';
import {isSafetyLessonId,SAFETY_LESSONS,SAFETY_LESSON_IDS} from '../domain/safetyLessons';
import {SafetyLesson} from './components/minigames/common/SafetyLesson';
import { EXPEDITION_BY_ID } from '../domain/expeditionGames';
import { ExpeditionActivity } from './components/minigames/expedition/ExpeditionActivity';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GAMES } from '../domain/gamesData';
import { gameBestStorageKey, isQuestId, QUEST_IDS, QUEST_META } from '../domain/movementQuests';
import { MovementQuest } from './components/minigames/common/MovementQuest';
import { GUIDED_REFLECTIONS } from '../domain/guidedReflection';
import { useGuidedSubmission } from '../application/useGuidedSubmission';
import { normalizeGameResultDetails, type GameResultDetails } from '../domain/gameResultDetails';
import { GameResultDetailsView } from './components/GameResultDetailsView';
import './GamePlayPage.css';
import './GameTheme.css';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { readParticipationCues } from '../domain/participationCues';
import { HeaderUtilities } from './components/HeaderUtilities';
import { useBackgroundMusic } from '../application/BackgroundMusicContext';
import { useSyncQueue } from '../application/useSyncQueue';
import type { GameRoom } from '../domain/types';
import { useVoiceCoach } from '../application/useVoiceCoach';
import { useTamagotchi } from '../application/useTamagotchi';
import { useWakeLock } from '../application/useWakeLock';
import { useMotionPermission } from '../application/useMotionPermission';
import { CooldownTimerModal } from './components/CooldownTimerModal';
import { Heart } from 'lucide-react';
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
import { CompassAzimuth } from './components/minigames/novel/CompassAzimuth';
import { KayakPaddle } from './components/minigames/novel/KayakPaddle';
import { WindSurfBalance } from './components/minigames/novel/WindSurfBalance';
import { TentPegHammer } from './components/minigames/novel/TentPegHammer';
import { TrailMazeRun } from './components/minigames/novel/TrailMazeRun';
import { AlpineGlider } from './components/minigames/novel/AlpineGlider';
import { CampfireBreath } from './components/minigames/novel/CampfireBreath';
import { CrevasseJump } from './components/minigames/novel/CrevasseJump';
import { SlingshotArchery } from './components/minigames/novel/SlingshotArchery';
import { SpikeBlockWall } from './components/minigames/novel/SpikeBlockWall';
import { BaseRunningDecide } from './components/minigames/novel/BaseRunningDecide';
import { BadmintonSmashRhythm } from './components/minigames/novel/BadmintonSmashRhythm';
import { TacticalGridSlide } from './components/minigames/novel/TacticalGridSlide';
import { SoundGoalball } from './components/minigames/novel/SoundGoalball';
import { JugglingBouncePaddle } from './components/minigames/novel/JugglingBouncePaddle';
import { HeadShouldersKnees } from './components/minigames/novel/HeadShouldersKnees';
import { AnimalHopStep } from './components/minigames/novel/AnimalHopStep';
import { BicyclePedalCrank } from './components/minigames/novel/BicyclePedalCrank';
import { DoubleUnderRope } from './components/minigames/novel/DoubleUnderRope';
import { MirrorMotionInvert } from './components/minigames/novel/MirrorMotionInvert';
import { SeesawBalanceTap } from './components/minigames/novel/SeesawBalanceTap';
import { SpaceOccupier } from './components/minigames/SpaceOccupier';
import { RelayMissionRunner } from './components/minigames/RelayMissionRunner';
import { BodyRhythmOrchestrator } from './components/minigames/BodyRhythmOrchestrator';
import { EXPRESSION_GAMES } from './components/minigames/expression/expressionGamesData';
import { ExpressionGameViewer } from './components/minigames/expression/ExpressionGameViewer';
import { CURRICULUM_GAMES_META } from './components/minigames/curriculum/curriculumGamesMeta';
import { CurriculumGameRouter } from './components/minigames/curriculum/CurriculumGameRouter';
import { ArrowLeft, Home, RotateCcw, Trophy } from 'lucide-react';
import { startBgm, stopBgm, sfxSuccess, sfxFail } from '../application/soundEffects';
import { usePlayerProfile } from '../application/usePlayerProfile';
import { ReadyCountdownOverlay } from './components/common/ReadyCountdownOverlay';
import { readJsonStorage, readStorage, writeStorage, isRecord, nonnegativeNumber } from '../application/browserStorage';
import { getPhysicalActivityPlan } from '../domain/physicalActivityPlans';

interface GameMeta {
  name: string;
  emoji: string;
  domain: '운동' | '스포츠' | '표현' | '안전';
  code: string;
  target: string;
}

const GAME_TITLES: Record<string, GameMeta> = {
  volcano: { name: '화산 폭발', emoji: '🌋', domain: '운동', code: '[6체01-01]', target: '순발력 운동 체력' },
  whack_a_mole: { name: '두더지 잡기', emoji: '🐹', domain: '스포츠', code: '[6체02-02]', target: '기술형 표적 활동' },
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
  plank: { name: '플랭크 챌린지', emoji: '💪', domain: '운동', code: '[6체01-05]', target: '코어 근력 버티기' },
  animal: { name: '동물 체조', emoji: '🐾', domain: '표현', code: '[4체03-03]', target: '사물·자연 모방 표현' },
  tilt_race: { name: '기울기 레이스', emoji: '📱', domain: '스포츠', code: '[4체02-05]', target: '기술형 조작 제어' },
  freeze: { name: '얼음 땡!', emoji: '🧊', domain: '스포츠', code: '[6체02-08]', target: '생태형 신체 정지' },
  wave: { name: '좌우 흔들기', emoji: '👋', domain: '운동', code: '[4체01-04]', target: '맨손체조 생활 습관' },
  speed_circle: { name: '빙글빙글!', emoji: '🌀', domain: '운동', code: '[4체01-02]', target: '가동성 체력운동' },
  zigzag: { name: '지그재그 런!', emoji: '⚡', domain: '스포츠', code: '[4체02-04]', target: '복합 이동 움직임' },
  multi_touch: { name: '양손 터치', emoji: '🖐️', domain: '운동', code: '[6체01-02]', target: '양손 협응성 발달' },
  stretch: { name: '스트레칭 타이머', emoji: '🙆', domain: '운동', code: '[4체01-04]', target: '유연성 생활 습관' },
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
  // 신규 21종 차별화 미니게임 메타 등록
  'compass-azimuth': { name: '나침반 방위각 마스터', emoji: '🧭', domain: '스포츠', code: '[4체02-08]', target: '생태형 오리엔티어링' },
  'kayak-paddle': { name: '급류 탈출 카약', emoji: '🛶', domain: '스포츠', code: '[4체02-07]', target: '생태형 수상 모험' },
  'wind-surf-balance': { name: '바람을 타는 윈드서핑', emoji: '🏄', domain: '스포츠', code: '[6체02-09]', target: '생태형 바람 밸런스' },
  'tent-peg-hammer': { name: '텐트 팩 해머링', emoji: '⛺', domain: '스포츠', code: '[4체02-08]', target: '생태형 캠핑 야외' },
  'trail-maze-run': { name: '모험 트레일 러닝', emoji: '🏃‍♂️', domain: '스포츠', code: '[4체02-07]', target: '생태형 코스 탈출' },
  'alpine-glider': { name: '알프스 활강 글라이더', emoji: '🪂', domain: '스포츠', code: '[6체02-09]', target: '생태형 체공 활강' },
  'campfire-breath': { name: '생태 모닥불 호흡 릴랙스', emoji: '🔥', domain: '스포츠', code: '[4체02-10]', target: '생태형 여가 이완' },
  'crevasse-jump': { name: '빙판 크레바스 점프', emoji: '🧗', domain: '스포츠', code: '[6체02-08]', target: '생태형 도약 모험' },
  'slingshot-archery': { name: '슬링샷 양궁 퍼펙트 텐', emoji: '🎯', domain: '스포츠', code: '[6체02-04]', target: '전략형 투사체 표적' },
  'spike-block-wall': { name: '스파이크 블로킹 월', emoji: '🏐', domain: '스포츠', code: '[6체02-05]', target: '전략형 네트 블로킹' },
  'base-running-decide': { name: '야구/티볼 주루 판단', emoji: '⚾', domain: '스포츠', code: '[6체02-06]', target: '전략형 필드 주루' },
  'badminton-smash-rhythm': { name: '셔틀콕 스매시 리듬', emoji: '🏸', domain: '스포츠', code: '[4체02-06]', target: '전략형 네트 리듬' },
  'tactical-grid-slide': { name: '수비 포메이션 슬라이더', emoji: '🛡️', domain: '스포츠', code: '[6체02-05]', target: '전략형 수비 차단' },
  'sound-goalball': { name: '골볼 소리 탐지 캐치', emoji: '🔔', domain: '스포츠', code: '[4체02-06]', target: '전략형 청각 스포츠' },
  'juggling-bounce-paddle': { name: '저글링 바운스 컨트롤러', emoji: '🎾', domain: '스포츠', code: '[4체02-03]', target: '전략형 다구 조작' },
  'head-shoulders-knees': { name: '머리 어깨 무릎 발 바디 비트', emoji: '🧢', domain: '운동', code: '[2체01-01]', target: '기본 움직임 신체 지각' },
  'animal-hop-step': { name: '동물 발자국 깡충 스텝', emoji: '🐾', domain: '운동', code: '[2체01-02]', target: '이동 움직임 징검다리' },
  'bicycle-pedal-crank': { name: '자전거 크랭크 페달', emoji: '🚲', domain: '운동', code: '[2체01-03]', target: '체력 가동성 페달링' },
  'double-under-rope': { name: '이단 줄넘기 더블 탭', emoji: '🪢', domain: '운동', code: '[4체01-02]', target: '체력 도약 2단 쌩쌩이' },
  'mirror-motion-invert': { name: '거울 모드 동작 반전', emoji: '🪞', domain: '운동', code: '[2체01-04]', target: '신경 협응 거울 공간' },
  'seesaw-balance-tap': { name: '균형 시소 버티기', emoji: '⚖️', domain: '운동', code: '[2체01-02]', target: '비이동 평형성 시소' },
  'space-occupier': { name: '스마트 코트: 빈 공간 점령 작전', emoji: '🗺️', domain: '스포츠', code: '[4체02-06]', target: '전략형 스포츠 공간 분산 침투' },
  'relay-mission-runner': { name: '모둠 스마트 바통 릴레이', emoji: '🏃', domain: '운동', code: '[4체01-02]', target: '순발력 및 심폐지구력 릴레이' },
  'body-rhythm-orchestrator': { name: '바디 모션 심포니', emoji: '🎶', domain: '표현', code: '[4체03-02]', target: '움직임 4요소와 리듬 표현' },
};

EXPEDITION_BY_ID.forEach(game=>{GAME_TITLES[game.id]={name:game.name,emoji:'🧭',domain:game.kind==='A'||game.family==='rhythm'?'표현':game.family==='equipment'?'스포츠':'운동',code:'연계 확인 필요',target:'몸으로 참여하는 원정 활동'};});

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

// 30종 교육과정 차별화 미니게임 메타 자동 등록
Object.values(CURRICULUM_GAMES_META).forEach(cm => {
  GAME_TITLES[cm.id] = {
    name: cm.name,
    emoji: cm.emoji,
    domain: cm.domain,
    code: cm.code,
    target: cm.target,
  };
});

QUEST_IDS.forEach(id => { GAME_TITLES[id] = { ...GAME_TITLES[id], name: QUEST_META[id].name, emoji: QUEST_META[id].emoji, target: QUEST_META[id].description }; });

SAFETY_LESSON_IDS.forEach(id=>{GAME_TITLES[id]={...GAME_TITLES[id],name:SAFETY_LESSONS[id].name,emoji:SAFETY_LESSONS[id].emoji,target:'안전 상황 판단과 교실 역할 표현',code:'연계 확인 필요'};});

export const GamePlayPage = () => {
  const { gameType } = useParams<{ gameType: string }>();
  const [searchParams] = useSearchParams();
  const { pathname,search,hash } = useLocation();
  const moved=mergedGameUrl(pathname,gameType||'',search,hash);
  if(moved)return <Navigate replace to={moved}/>;
  return <GamePlaySession key={`${pathname}:${gameType}:${searchParams.get('room')}:${searchParams.get('group')}:${searchParams.get('guided')}:${searchParams.get('mission')}:${searchParams.get('variant')}`} />;
};

const GamePlaySession = () => {
  const { gameType } = useParams<{ gameType: string }>();
  const { hash, pathname,state:routeState } = useLocation();
  const soloMode = pathname.startsWith('/solo/play/');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const battleRoomId = searchParams.get('room');
  const battleGroupId = searchParams.get('group');
  const hasBattle = !soloMode && !!battleRoomId && !!battleGroupId && uuid.test(battleRoomId) && uuid.test(battleGroupId);
  const guidedRequested = !soloMode && searchParams.get('guided') === '1';
  const missionId = soloMode ? null : searchParams.get('mission');
  const guidedMode = hasBattle && !!missionId;
  const variantId=searchParams.get('variant');
  const selectedVariant=useMemo(()=>variantsFor(gameType||'').find(v=>v.id===variantId),[gameType,variantId]);
  const scoreKey=selectedVariant?`${gameType}::variant::${selectedVariant.id}`:undefined;
  const hubPath = soloMode ? '/solo' : (guidedRequested || !!missionId) && hasBattle ? `/mobile/${battleRoomId}/${battleGroupId}` : hasBattle ? '/hub/tools?battle=1' : '/hub';
  const { enqueueAction: enqueueClassroomScore, queueLength, isOnline, storageAvailable, syncWarning } = useSyncQueue(hasBattle);
  const guidedSubmission = useGuidedSubmission(guidedMode ? battleRoomId : null, guidedMode ? battleGroupId : null, guidedMode ? missionId : null);
  const enqueueGuidedCompletion = guidedSubmission.enqueueCompletion;
  const [key, setKey] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [resultDetails, setResultDetails] = useState<GameResultDetails | undefined>();
  const [showDetailedResult, setShowDetailedResult] = useState(false);
  const [lastEarnedScore, setLastEarnedScore] = useState(0);
  const [hasStarted, setHasStarted] = useState(!!routeState?.activityPrepared);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [, setTotalPlays] = useState(0);
  const [newBadge, setNewBadge] = useState<string | null>(null);
  const [rpeSelected, setRpeSelected] = useState<number | null>(null);
  const [showCooldownModal, setShowCooldownModal] = useState<boolean>(false);
  const completionRef = useRef(false);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current); }, []);

  const { addGameResult, updateLatestRpe } = usePlayerProfile();
  const { speak } = useVoiceCoach();
  const { addXpAndCoins } = useTamagotchi();
  useWakeLock(true);
  const { isGranted: isMotionGranted, requestPermission: requestMotionPermission } = useMotionPermission();

  const standaloneTiming = useRef({
    startedAt: new Date().toISOString(),
    endTime: Date.now() + 90000,
  });

  const handleStartGame = () => {
    setHasStarted(true);
    const hasOwnIntro = EXPEDITION_BY_ID.get(gameType || '')?.kind === 'B' || ['pulse-detective', 'posture-guardian', 'rolling-curling', 'pass-gate-rescue', 'dribble-rhythm', 'open-space-tactician', 'emotion-thermometer', 'partner-robot-lab', 'space-occupier', 'relay-mission-runner', 'body-rhythm-orchestrator'].includes(gameType || '');
    setIsCountingDown(!hasOwnIntro && !isQuestId(gameType || '') && !isSafetyLessonId(gameType||'')&&!variantsFor(gameType||'').length);
    if (hasOwnIntro) standaloneTiming.current = { startedAt: new Date().toISOString(), endTime: Date.now() + 90000 };
  };

  const handleCountdownComplete = useCallback(() => {
    completionRef.current = false;
    standaloneTiming.current = { startedAt: new Date().toISOString(), endTime: Date.now() + 90000 };
    setIsCountingDown(false);
  }, []);


  // 업적 배지 체크
  const checkBadges = useCallback((score: number) => {
    const savedBadges = readJsonStorage('physical_badges');
    const badges: Record<string, boolean> = isRecord(savedBadges) ? Object.fromEntries(Object.entries(savedBadges).filter(([, value]) => value === true).map(([name]) => [name, true])) : {};
    const plays = nonnegativeNumber(Number(readStorage('physical_total_plays'))) + 1;
    writeStorage('physical_total_plays', String(plays));
    setTotalPlays(plays);

    // 배지 조건 체크
    const newBadges: string[] = [];
    if (plays >= 1 && !badges['first_play']) { badges['first_play'] = true; newBadges.push('🌱 첫 발자국'); }
    if (score >= 500 && !badges['high_scorer']) { badges['high_scorer'] = true; newBadges.push('🏅 하이스코어러'); }
    if (plays >= 10 && !badges['veteran']) { badges['veteran'] = true; newBadges.push('🎖️ 베테랑 (10회 플레이)'); }
    if (plays >= 50 && !badges['master']) { badges['master'] = true; newBadges.push('👑 마스터 (50회 플레이)'); }

    // 다양한 게임 플레이 배지
    const savedGames = readJsonStorage('physical_played_games');
    const playedGames: string[] = Array.isArray(savedGames) ? [...new Set(savedGames.filter((type): type is string => typeof type === 'string' && !!GAME_TITLES[type]))] : [];
    if (gameType && !playedGames.includes(gameType)) {
      playedGames.push(gameType);
      writeStorage('physical_played_games', JSON.stringify(playedGames));
    }
    if (playedGames.length >= 10 && !badges['explorer']) { badges['explorer'] = true; newBadges.push('🌍 탐험가 (10종 플레이)'); }
    if (playedGames.length >= 30 && !badges['collector']) { badges['collector'] = true; newBadges.push('💎 수집가 (30종 플레이)'); }

    writeStorage('physical_badges', JSON.stringify(badges));
    if (newBadges.length > 0) {
      setNewBadge(newBadges[0]);
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = setTimeout(() => setNewBadge(null), 4000);
    }
  }, [gameType]);

  // The shared music preference controls the game's synthesized BGM too.
  const { enabled: musicEnabled, volume: musicVolume } = useBackgroundMusic();
  useEffect(() => {
    if (musicEnabled && !gameFinished) startBgm(musicVolume);
    else stopBgm();
    return () => stopBgm();
  }, [musicEnabled, musicVolume, gameFinished]);

  const baseGameInfo=GAME_TITLES[gameType||''];
  const gameInfo=useMemo(()=>selectedVariant?{...baseGameInfo,name:`${baseGameInfo.name} · ${selectedVariant.name}`,target:'통합 활동의 선택 코스'}:baseGameInfo,[baseGameInfo,selectedVariant]);
  const participationCues = (readParticipationCues(hash, gameType || '')||(selectedVariant?readParticipationCues(hash,selectedVariant.id):null));
  const activityPlan = getPhysicalActivityPlan(selectedVariant?.id||gameType||'', EXPRESSION_GAMES.some(game=>game.id===(selectedVariant?.id||gameType)));

  // 게임 완료 시 모둠 점수 및 활동 기록 즉시 반영
  const commitResult = useCallback((payload: { amount: number; details?: GameResultDetails }) => {
    const rawScore = payload.amount;
    const earned = Math.round(rawScore);
    const classroomScore = earned > 0 ? earned : (hasBattle ? 10 : 0);
    if (hasBattle && battleGroupId && classroomScore !== 0) {
      enqueueClassroomScore({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: battleGroupId, amount: classroomScore, roomId: battleRoomId }, timestamp: Date.now() });
    }
    const details = normalizeGameResultDetails(selectedVariant?{...payload.details,metrics:{...payload.details?.metrics,'통합 활동':baseGameInfo.name,'선택 코스':selectedVariant.name,'변형 ID':selectedVariant.id,'기록 구분':'통합 코스 v1 · 이전 점수와 직접 비교하지 않아요'}}:payload.details);
    setResultDetails(details);
    setLastEarnedScore(earned);
    setGameFinished(true);
    if (guidedMode) {
      enqueueGuidedCompletion();
    }

    // 성공/실패 효과음
    if (earned > 0) {
      sfxSuccess();
      speak(hasBattle ? `활동 완료! 모둠 점수 ${classroomScore}점을 기록했습니다!` : `화면 게임 완료! ${earned}점을 기록했습니다!`, true);
    } else {
      sfxFail();
      speak('수고하셨습니다! 다음엔 더 잘할 수 있어요!', true);
    }

    // 땀방이 다마고치 경험치 및 코인 적립
    addXpAndCoins(15, 20);

    // 최고 기록 저장
    if (gameType) {
      const bestKey = gameBestStorageKey(gameType,selectedVariant?.id);
      const currentBest = nonnegativeNumber(Number(readStorage(bestKey)));
      if (earned > currentBest) {
        writeStorage(bestKey, String(earned));
      }
    }

    // 플레이어 프로필에 점수 누적 저장 (RPE는 나중에 별도 저장)
    if (gameType && gameInfo) {
      addGameResult(gameType, gameInfo.name, earned, undefined, undefined, details,scoreKey);
    }

    checkBadges(earned);
  }, [gameType, gameInfo, addGameResult, addXpAndCoins, speak, checkBadges, hasBattle, battleGroupId, battleRoomId, enqueueClassroomScore, guidedMode, enqueueGuidedCompletion,selectedVariant,baseGameInfo,scoreKey]);

  const localEnqueueAction = useCallback((action: { payload: { amount: number; details?: GameResultDetails } }) => {
    if (completionRef.current || !Number.isFinite(action.payload.amount)) return;
    completionRef.current = true;
    commitResult(action.payload);
  }, [commitResult]);

  const handleReturnToCatalog = () => {
    // Stop active animation timers before rendering the full catalog on mobile.
    setHasStarted(false);
    navigate(hubPath);
  };

  const handleReplay = () => {
    completionRef.current = false;
    setGameFinished(false);
    setResultDetails(undefined);
    setShowDetailedResult(false);
    setLastEarnedScore(0);
    setRpeSelected(null);
    setKey(prev => prev + 1);
    setHasStarted(false);
  };

  if (!gameType || !gameInfo) {
    return (
      <div className="warm-game min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black mb-4">존재하지 않는 게임입니다</h1>
        <button onClick={handleReturnToCatalog} className="px-6 py-3 bg-cyan-600 rounded-xl font-bold">홈으로</button>
      </div>
    );
  }

  const bestScore = nonnegativeNumber(Number(readStorage(gameBestStorageKey(gameType,selectedVariant?.id))));

  // 화산 게임은 gameRoom을 필요로 하므로 더미 gameRoom 생성
  const dummyGameRoom: GameRoom = {
    id: 'standalone',
    pin_code: '0000',
    name: 'Standalone',
    status: 'playing' as const,
    started_at: standaloneTiming.current.startedAt,
    global_time_modifier: 0,
    active_minigame: { type: gameType, end_time: standaloneTiming.current.endTime },
    template_id: null,
    flash_sale: false,
    announcement: null,
    created_at: standaloneTiming.current.startedAt,
  };

  const dummyGroupId = 'standalone-player';

  const renderBaseGame = () => {
    const commonProps = { groupId: dummyGroupId, enqueueAction: localEnqueueAction };
    if(isSafetyLessonId(gameType))return <SafetyLesson key={key} {...commonProps} gameId={gameType} solo={soloMode} onExit={handleReturnToCatalog}/>;
    if (isQuestId(gameType)) return <MovementQuest key={key} {...commonProps} gameId={gameType} solo={soloMode} onExit={handleReturnToCatalog}/>;

    const expedition=EXPEDITION_BY_ID.get(gameType||'');
    if(expedition?.kind==='B')return <ExpeditionActivity key={key} game={expedition} groupId={dummyGroupId} solo={soloMode} enqueueAction={localEnqueueAction}/>;
    switch (gameType) {
      case 'volcano':
        return <VolcanoGame key={key} gameRoom={dummyGameRoom} {...commonProps} />;
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
        return <ZigZagTouch key={key} {...commonProps} solo={soloMode} />;
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
        return <PulseDetective key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'posture-guardian':
        return <PostureGuardian key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'rolling-curling':
        return <RollingCurling key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'pass-gate-rescue':
        return <PassGateRescue key={key} {...commonProps} solo={soloMode} onExit={handleReturnToCatalog} />;
      case 'dribble-rhythm':
        return <DribbleRhythm key={key} {...commonProps} solo={soloMode} onExit={handleReturnToCatalog} />;
      case 'open-space-tactician':
        return <OpenSpaceTactician key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'emotion-thermometer':
        return <EmotionThermometer key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'partner-robot-lab':
        return <PartnerRobotLab key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'compass-azimuth':
        return <CompassAzimuth key={key} {...commonProps} />;
      case 'kayak-paddle':
        return <KayakPaddle key={key} {...commonProps} />;
      case 'wind-surf-balance':
        return <WindSurfBalance key={key} {...commonProps} />;
      case 'tent-peg-hammer':
        return <TentPegHammer key={key} {...commonProps} />;
      case 'trail-maze-run':
        return <TrailMazeRun key={key} {...commonProps} />;
      case 'alpine-glider':
        return <AlpineGlider key={key} {...commonProps} />;
      case 'campfire-breath':
        return <CampfireBreath key={key} {...commonProps} />;
      case 'crevasse-jump':
        return <CrevasseJump key={key} {...commonProps} />;
      case 'slingshot-archery':
        return <SlingshotArchery key={key} {...commonProps} />;
      case 'spike-block-wall':
        return <SpikeBlockWall key={key} {...commonProps} />;
      case 'base-running-decide':
        return <BaseRunningDecide key={key} {...commonProps} />;
      case 'badminton-smash-rhythm':
        return <BadmintonSmashRhythm key={key} {...commonProps} />;
      case 'tactical-grid-slide':
        return <TacticalGridSlide key={key} {...commonProps} />;
      case 'sound-goalball':
        return <SoundGoalball key={key} {...commonProps} />;
      case 'juggling-bounce-paddle':
        return <JugglingBouncePaddle key={key} {...commonProps} />;
      case 'head-shoulders-knees':
        return <HeadShouldersKnees key={key} {...commonProps} />;
      case 'animal-hop-step':
        return <AnimalHopStep key={key} {...commonProps} />;
      case 'bicycle-pedal-crank':
        return <BicyclePedalCrank key={key} {...commonProps} />;
      case 'double-under-rope':
        return <DoubleUnderRope key={key} {...commonProps} />;
      case 'mirror-motion-invert':
        return <MirrorMotionInvert key={key} {...commonProps} />;
      case 'seesaw-balance-tap':
        return <SeesawBalanceTap key={key} {...commonProps} />;
      case 'space-occupier':
        return <SpaceOccupier key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'relay-mission-runner':
        return <RelayMissionRunner key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'body-rhythm-orchestrator':
        return <BodyRhythmOrchestrator key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      default: {
        if (gameType && CURRICULUM_GAMES_META[gameType]) {
          return (
            <CurriculumGameRouter
              key={key}
              gameType={gameType}
              groupId={dummyGroupId}
              enqueueAction={localEnqueueAction}
              onExit={handleReturnToCatalog}
            />
          );
        }
        const isExpressionGame = EXPRESSION_GAMES.some(eg => eg.id === gameType);
        if (isExpressionGame && gameType) {
          return (
            <div className="pb-12 px-4 min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center">
              <ExpressionGameViewer
                key={key}
                prepared
                gameType={gameType}
                onComplete={(score, details) => localEnqueueAction({ payload: { amount: score, details } })}
                onExit={handleReturnToCatalog}
              />
            </div>
          );
        }
        return null;
      }
    }
  };

  const renderGame=()=>variantsFor(gameType).length?<ConsolidatedActivity targetId={gameType} selected={variantId} solo={soloMode} groupId={dummyGroupId} enqueueAction={localEnqueueAction}>{renderBaseGame()}</ConsolidatedActivity>:renderBaseGame();

  return (
    <div className="game-tools-scope game-tools-layout">
      <nav className="game-utilities-bar" aria-label="이용 설정"><HeaderUtilities/></nav>
    <div className={`warm-game gameplay-page ${hasStarted ? 'has-game-toolbar' : ''} relative min-h-[100dvh] bg-slate-950`}>
      {/* 활동 준비 화면 */}
      {!hasStarted && !gameFinished && (
        <div className="game-prepare fixed inset-0 z-[10002] overflow-y-auto p-4"><div className="game-prepare-inner">
          <button className="game-prepare-back" onClick={handleReturnToCatalog}><ArrowLeft aria-hidden="true"/>활동 목록으로</button>
          <div className="game-prepare-heading"><span className="game-prepare-emoji" aria-hidden="true">{gameInfo.emoji}</span><div><p className="game-prepare-eyebrow">땀방울 원정대 · {soloMode ? '혼자 해보기' : '활동 준비'}</p><h1>{gameInfo.name}</h1><p className="game-prepare-target">{gameInfo.target}</p></div></div>
          <div className="game-prepare-info"><p>{GAMES.find(game=>game.type===(selectedVariant?.id||gameType))?.desc}</p><small>{hasBattle ? '활동을 완료하면 획득 점수가 우리 모둠 점수에 즉시 반영됩니다.' : '목표 기록을 확인하고 신체 활동을 안전하게 진행해 보세요.'}</small><p className="mt-2 text-sm font-bold">{isSafetyLessonId(gameType)?'안전 학습':'몸 활동'}: {activityPlan.title}</p><small>{activityPlan.setup} · {activityPlan.safety}</small></div>
          {participationCues && <div className="game-prepare-info" aria-label="수업 참여 안내"><strong>오늘의 몸 미션</strong><p>{participationCues.mission}</p><small>역할 바꾸기: {participationCues.roles}<br/>기다리는 동안: {participationCues.waiting}</small><p className="mt-2 text-xs">선생님이 공유한 안내를 확인하세요. 화면 조작은 실제 움직임의 증거가 아닙니다.</p></div>}
          {/* Permission guidance stays in preparation so it never covers game controls. */}
          {!isMotionGranted && !isQuestId(gameType) && ['jump', 'squat', 'run', 'target', 'tilt_balance', 'tilt_race', 'shake', 'arm_raise', 'wave', 'one_leg', 'freeze', 'plank', 'punch', 'foot-center-balance', 'body_twist', 'head-shoulders-knees', 'kayak-paddle', 'badminton-smash-rhythm', 'seesaw-balance-tap'].includes(gameType) && (
            <div className="game-sensor-setup game-prepare-info">
              <div className="text-xs">
                <span className="font-bold text-amber-400 block mb-0.5">움직임 센서 연결</span>
                <span>센서를 허용하거나 게임 안의 터치 조작을 이용해 주세요.</span>
              </div>
              <button
                onClick={requestMotionPermission}
                className="game-stage-primary mt-3 px-4 py-3 rounded-xl text-sm font-bold"
              >
                센서 허용하기
              </button>
            </div>
          )}
          <button type="button" className="game-prepare-start" onClick={handleStartGame}>활동 시작</button><p className="game-prepare-note">몸을 움직이기 전 주변 공간과 기기를 확인해 주세요.</p>
        </div></div>
      )}

      {/* 3초 움직임 준비 카운트다운 */}
      {isCountingDown && (
        <ReadyCountdownOverlay
          onComplete={handleCountdownComplete}
          message={`${gameInfo.name} 시작 준비! 스마트폰을 거치하거나 손에 쥐세요.`}
        />
      )}

      {/* 게임 렌더링 */}
      {hasStarted && !isCountingDown && <div className="gameplay-content" hidden={gameFinished && !showDetailedResult} onClickCapture={event => {
        if (!gameFinished) return;
        const button = (event.target as HTMLElement).closest('button');
        if (button && /다시|재도전/.test(button.textContent || '')) {
          event.preventDefault();
          event.stopPropagation();
          handleReplay();
        }
      }}>{showDetailedResult && <p className="bg-slate-900 p-3 text-center text-sm text-slate-300">아래 점수는 활동 원점수입니다. 이 점수가 활동 기록에 반영됩니다.</p>}{participationCues && !gameFinished && <details className="mx-auto mt-16 mb-2 max-w-md rounded-xl border border-cyan-500/40 bg-slate-900 p-3 text-sm text-white"><summary className="cursor-pointer font-bold">오늘의 몸 미션 · 역할·대기 안내</summary><p className="mt-2">{participationCues.mission}</p><p className="mt-1">역할: {participationCues.roles}</p><p className="mt-1">대기: {participationCues.waiting}</p></details>}{renderGame()}</div>}

      {/* 배지 획득 토스트 */}
      {newBadge && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10003] bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-900 px-6 py-3 rounded-2xl shadow-2xl font-black text-sm animate-bounce border-2 border-yellow-300">
          🎉 새 배지 획득! {newBadge}
        </div>
      )}

      {/* 상단 네비게이션 */}
      {hasStarted && (
        <div className="gameplay-toolbar fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between pointer-events-none">
          <button onClick={handleReturnToCatalog} className="game-toolbar-back" aria-label="활동 목록으로"><ArrowLeft aria-hidden="true"/></button>
          <div className="game-toolbar-title"><strong>{gameInfo.name}</strong><small>{gameInfo.domain} · {gameInfo.target}</small></div>
          {showDetailedResult && <button className="game-toolbar-result" onClick={() => setShowDetailedResult(false)}>점수 화면</button>}
        </div>
      )}

      {/* 게임 종료 결과 오버레이 */}
      {gameFinished && !showDetailedResult && (
        <div className="game-result-overlay fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex flex-col items-center overflow-y-auto p-4 font-sans animate-in fade-in duration-200">
          <div className="game-result-card bg-slate-900/95 border border-slate-700 rounded-3xl p-5 my-auto shrink-0 max-w-sm w-full flex flex-col items-center shadow-2xl">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 mb-4">
              <span>{gameInfo.code}</span><span className="text-slate-500">|</span><span className="text-slate-300">{gameInfo.target}</span>
            </div>
            <span className="text-6xl mb-3">{gameInfo.emoji}</span>
            <h2 className="text-2xl font-black text-white mb-1">{gameInfo.name}</h2>
            <p className="text-emerald-400 font-bold text-xs mb-3">활동을 마쳤어요!</p>
            {hasBattle && (
              <p role="status" className="mb-4 text-center text-xs text-cyan-300">
                {syncWarning || (queueLength === 0 ? '모둠 점수에 즉시 반영되었어요!' : !storageAvailable ? '점수 전송을 위해 이 화면을 열어 두세요.' : !isOnline ? '연결이 돌아오면 모둠 점수를 자동으로 전송합니다.' : '모둠 점수를 반영하고 있습니다…')}
              </p>
            )}
            {guidedMode && guidedSubmission.error && (
              <div role="status" className="mb-4 text-center text-sm text-cyan-300">
                <p>{guidedSubmission.error}</p>
                {!guidedSubmission.receipt?.completed && <button className="mt-2 rounded-lg border border-cyan-400 px-3 py-2" onClick={guidedSubmission.retry}>지금 다시 보내기</button>}
              </div>
            )}
            {guidedMode && <fieldset className="w-full rounded-2xl bg-slate-800/70 border border-slate-700 p-4 mb-4"><legend className="px-2 text-sm font-bold text-white">오늘 잘한 움직임 하나</legend><div className="grid gap-2">{GUIDED_REFLECTIONS.map(choice => <button key={choice.value} type="button" aria-pressed={guidedSubmission.receipt?.reflection === choice.value} onClick={() => guidedSubmission.chooseReflection(choice.value)} className={`rounded-xl border px-3 py-3 text-sm text-left ${guidedSubmission.receipt?.reflection === choice.value ? 'border-cyan-300 bg-cyan-900 text-white' : 'border-slate-600 text-slate-200'}`}>{choice.label}</button>)}</div><p role="status" className="mt-2 text-xs text-cyan-200">{guidedSubmission.receipt?.reflection ? guidedSubmission.receipt.saved ? '선생님 화면에 저장했어요.' : '선택을 저장하고 있어요.' : '한 가지만 골라 주세요.'}</p></fieldset>}
            <div className="result-score w-full bg-slate-800 rounded-2xl p-5 mb-3 flex flex-col items-center border border-slate-700">
              <span className="text-slate-400 text-sm font-bold mb-1">화면 게임 점수 · 신체 활동 증거 아님</span>
              <span className={`result-score-value text-5xl font-black font-mono ${lastEarnedScore > 0 ? 'text-cyan-400' : lastEarnedScore < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {lastEarnedScore > 0 ? '+' : ''}{lastEarnedScore}
              </span>

            </div>
            <div className="w-full flex justify-between items-center bg-slate-800/50 rounded-xl px-4 py-3 mb-4 border border-slate-700/50">
              <div className="flex items-center gap-2 text-yellow-500"><Trophy className="w-4 h-4" /><span className="text-sm font-bold">최고 기록</span></div>
              <span className="text-yellow-400 font-black">{bestScore}점</span>
            </div>
            {lastEarnedScore > 300 && (
              <div className="w-full bg-orange-950/50 border border-orange-500/30 rounded-xl px-4 py-2.5 mb-4 text-center">
                <p className="text-xs font-bold text-orange-300">💪 훌륭해요! 다음에는 자신의 기록을 넘어 보세요!</p>
              </div>
            )}

            {/* RPE 운동 자각도 이모지 평가 */}
            <div className="w-full bg-slate-800/60 rounded-2xl px-4 py-4 mb-4 border border-slate-700/50">
              <p className="text-sm font-bold text-slate-300 text-center mb-3">오늘의 활동은 얼마나 힘들었나요?</p>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { emoji: '😆', label: '너무 쉬움', value: 1 },
                  { emoji: '😃', label: '쉬움', value: 2 },
                  { emoji: '😐', label: '보통', value: 3 },
                  { emoji: '😓', label: '힘들었음', value: 4 },
                  { emoji: '🥵', label: '매우 힘듦', value: 5 },
                ].map(({ emoji, label, value }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setRpeSelected(value);
                      // RPE 값을 최근 기록에 업데이트
                      if (gameType && gameInfo) {
                        updateLatestRpe(gameType, value);
                      }
                    }}
                    className={`min-w-0 whitespace-normal flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all border-2 ${
                      rpeSelected === value
                        ? 'bg-cyan-600/30 border-cyan-400 scale-110 shadow-lg shadow-cyan-900/50'
                        : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className={`text-2xl transition-transform ${rpeSelected === value ? 'scale-125' : ''}`}>{emoji}</span>
                    <span className={`text-[10px] font-bold ${rpeSelected === value ? 'text-cyan-300' : 'text-slate-500'}`}>{label}</span>
                  </button>
                ))}
              </div>
              {rpeSelected && (
                <p className="text-center text-[11px] text-cyan-400/80 font-bold mt-2 animate-in fade-in duration-200">
                  ✅ 자각도 {rpeSelected}/5 기록 완료!
                </p>
              )}
            </div>

            {/* 🫀 쿨다운 & 심박수 정리운동 버튼 */}
            <button
              onClick={() => setShowCooldownModal(true)}
              className="w-full mb-4 py-3 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
            >
              <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
              <span>🫀 운동 후 쿨다운 & 심박수 회복 루틴</span>
            </button>

            {resultDetails && <div className="w-full mb-4"><GameResultDetailsView details={resultDetails} /></div>}
            <button onClick={() => setShowDetailedResult(true)} className="w-full mb-4 py-3 bg-slate-800 border border-slate-600 text-white rounded-xl font-bold text-sm">게임 상세 결과 보기</button>
            <div className="w-full flex gap-3">
              <button onClick={handleReplay} className="game-stage-primary flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-base flex items-center justify-center gap-2 transition-colors shadow-lg">
                <RotateCcw className="w-5 h-5" /> 다시 하기
              </button>
              <button onClick={handleReturnToCatalog} className="result-return flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
                <Home className="w-5 h-5" /> {soloMode ? '활동 목록으로' : guidedRequested ? '모둠으로' : '홈으로'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🫀 쿨다운 모달 */}
      <CooldownTimerModal
        isOpen={showCooldownModal}
        onClose={() => setShowCooldownModal(false)}
      />


    </div></div>
  );
};

