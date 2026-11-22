import {recordRecentActivity} from '../application/recentActivities';
import {ActivityPauseBoundary} from '../application/ActivityPauseContext';
import {classroomResultMessage} from '../domain/fourthGameRules';
import {studentResultMessage} from '../domain/studentResultMessage';
import {StartLabel} from './components/StartLabel';
import {useClassroomActivityStatus} from '../application/useClassroomActivityStatus';
import {FLAGSHIP_GAMES,isFlagship} from '../domain/flagship';
import {PhonePlayIcon} from './components/PhonePlayIcon';
import {mergedMovementMeta} from '../domain/mergedMovementVariants';
import {getRemovedGame,mergedGameUrl,variantsFor} from '../domain/gameLifecycle';
import {Navigate} from 'react-router-dom';
import {isSafetyLessonId,SAFETY_LESSONS,SAFETY_LESSON_IDS} from '../domain/safetyLessons';
import { EXPEDITION_BY_ID } from '../domain/expeditionGames';
import { Suspense, useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
// 활동 화면은 지금 여는 것 하나만 받는다(놀이 화면 첫 묶음을 가볍게).
import {ActivityLoading,ConsolidatedActivity,EmotionThermometer,ExpeditionActivity,ExpressionGameViewer,FlagshipActivity,MovementQuest,PartnerRobotLab,PhonePlay,RetiredGameNotice,SafetyLesson,SignaturePlay,StretchTimer} from './components/minigames/lazyActivities';
import { GAMES } from '../domain/gamesData';
import { gameBestStorageKey, isQuestId, QUEST_IDS, QUEST_META } from '../domain/movementQuests';
import { GUIDED_REFLECTIONS } from '../domain/guidedReflection';
import { useGuidedSubmission } from '../application/useGuidedSubmission';
import { earnsParticipationReward, classroomResultScore,canReportCompletion,normalizeGameResultDetails, type GameResultDetails } from '../domain/gameResultDetails';
import { GameResultDetailsView } from './components/GameResultDetailsView';
import './GamePlayPage.css';
import './GameTheme.css';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { readParticipationCues } from '../domain/participationCues';
import { HeaderToolbar } from './components/HeaderToolbar';
import { CircleHelp } from 'lucide-react';
import { useBackgroundMusic } from '../application/BackgroundMusicContext';
import { useSyncQueue } from '../application/useSyncQueue';
import { useVoiceCoach } from '../application/useVoiceCoach';
import { useTamagotchi } from '../application/useTamagotchi';
import { useWakeLock } from '../application/useWakeLock';
import { useMotionPermission } from '../application/useMotionPermission';
import { CooldownTimerModal } from './components/CooldownTimerModal';
import { Heart } from 'lucide-react';
import {useReportLessonActivity} from './components/todayLessonActivity';
import {READY_SIGNATURE_GAMES,isSignatureId} from '../domain/signatureGames';
import {newPlayId,openPlayId,recordPlay} from '../application/classProgressStore';
import {ClassFeedbackSlot} from './components/ClassFeedbackSlot';
import {TvModeButton} from './components/DisplayButtons';
import {useDisplayPrefs} from '../application/displayPrefs';
import { EXPRESSION_GAMES } from './components/minigames/expression/expressionGamesData';
import { CURRICULUM_GAMES_META } from './components/minigames/curriculum/curriculumGamesMeta';
import { ArrowLeft, Home, RotateCcw, Trophy } from 'lucide-react';
import { startBgm, stopBgm, sfxSuccess, sfxTap } from '../application/soundEffects';
import { usePlayerProfile } from '../application/usePlayerProfile';
import { ReadyCountdownOverlay } from './components/common/ReadyCountdownOverlay';
import { readJsonStorage, readStorage, writeStorage, isRecord, nonnegativeNumber } from '../application/browserStorage';
import { getPhysicalActivityPlan } from '../domain/physicalActivityPlans';
import {MOTION_SENSOR_GAMES,countdownDeviceHint} from '../domain/countdownHint';
import {useTodayRun,saveTodayRun} from '../application/todayLessonStore';
import {advanceRun,currentStage,stagePath} from '../domain/todayLesson';

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
  stopwatch: { name: QUEST_META['stopwatch'].name, emoji: '⏱️', domain: '스포츠', code: '[6체02-02]', target: '기술형 기록 활동' },
  memory: { name: QUEST_META['memory'].name, emoji: '🧠', domain: '스포츠', code: '[6체02-06]', target: '전략형 인지 게임' },
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
  target: { name: QUEST_META['target'].name, emoji: '🎯', domain: '스포츠', code: '[4체02-05]', target: '기술형 표적 활동' },
  red_green: { name: QUEST_META['red_green'].name, emoji: '🚦', domain: '스포츠', code: '[4체02-07]', target: '생태형 민속놀이' },
  left_right: { name: '좌우 반사신경', emoji: '👈👉', domain: '스포츠', code: '[4체02-03]', target: '반사 움직임 기술' },
  coin_flip: { name: '동전 뒤집기', emoji: '🪙', domain: '스포츠', code: '[4체02-09]', target: '전통 놀이 규칙' },
  jump: { name: QUEST_META['jump'].name, emoji: '🦘', domain: '운동', code: '[4체01-02]', target: '순발력 체력운동' },
  squat: { name: QUEST_META['squat'].name, emoji: '🏋️', domain: '운동', code: '[6체01-02]', target: '근력·근지구력 운동' },
  run: { name: QUEST_META['run'].name, emoji: '🏃', domain: '운동', code: '[4체01-02]', target: '심폐지구력 달리기' },
  tilt_balance: { name: '균형 잡기', emoji: '⚖️', domain: '운동', code: '[4체01-02]', target: '평형성 조절 운동' },
  zone_touch: { name: '구역 터치 달리기', emoji: '🏃‍♂️', domain: '스포츠', code: '[4체02-03]', target: '방향전환 달리기' },
  arm_raise: { name: '하늘 높이!', emoji: '🙌', domain: '운동', code: '[4체01-05]', target: '기본 움직임 뻗기' },
  dance_pose: { name: '댄스 포즈', emoji: '💃', domain: '표현', code: '[6체03-06]', target: '현대 표현 동작' },
  circle_draw: { name: '원 그리기 대결', emoji: '⭕', domain: '표현', code: '[4체03-02]', target: '움직임 궤적 표현' },
  trace_shape: { name: '도형 따라 그리기', emoji: '✏️', domain: '표현', code: '[4체03-06]', target: '도구 및 형태 표현' },
  punch: { name: '에어 펀치!', emoji: '🥊', domain: '스포츠', code: '[6체02-02]', target: '투기형 타격 기술' },
  plank: { name: QUEST_META['plank'].name, emoji: '💪', domain: '운동', code: '[6체01-05]', target: '코어 근력 버티기' },
  animal: { name: '동물 체조', emoji: '🐾', domain: '표현', code: '[4체03-03]', target: '사물·자연 모방 표현' },
  tilt_race: { name: '기울기 레이스', emoji: '📱', domain: '스포츠', code: '[4체02-05]', target: '기술형 조작 제어' },
  freeze: { name: '얼음 땡!', emoji: '🧊', domain: '스포츠', code: '[6체02-08]', target: '생태형 신체 정지' },
  wave: { name: '좌우 흔들기', emoji: '👋', domain: '운동', code: '[4체01-04]', target: '맨손체조 생활 습관' },
  speed_circle: { name: '빙글빙글!', emoji: '🌀', domain: '운동', code: '[4체01-02]', target: '가동성 체력운동' },
  zigzag: { name: QUEST_META['zigzag'].name, emoji: '⚡', domain: '스포츠', code: '[4체02-04]', target: '복합 이동 움직임' },
  multi_touch: { name: '양손 터치', emoji: '🖐️', domain: '운동', code: '[6체01-02]', target: '양손 협응성 발달' },
  stretch: { name: '스트레칭 타이머', emoji: '🙆', domain: '운동', code: '[4체01-04]', target: '유연성 생활 습관' },
  one_leg: { name: QUEST_META['one_leg'].name, emoji: '🦩', domain: '운동', code: '[6체01-02]', target: '평형성 체력 측정' },
  fitness: { name: QUEST_META['fitness'].name, emoji: '🎰', domain: '운동', code: '[4체01-06]', target: '체력 운동 실천' },
  body_twist: { name: '몸 비틀기!', emoji: '🔄', domain: '표현', code: '[4체03-05]', target: '리듬 신체 표현' },
  'pulse-detective': { name: QUEST_META['pulse-detective'].name, emoji: '🔍', domain: '운동', code: '[6체01-01]', target: '신체 변화 관찰' },
  'posture-guardian': { name: QUEST_META['posture-guardian'].name, emoji: '🤖', domain: '운동', code: '[4체01-04]', target: '바른 자세 실천' },
  'rolling-curling': { name: '공 굴림 컬링 원정', emoji: '🥌', domain: '스포츠', code: '[4체02-05]', target: '표적 힘 조절' },
  'pass-gate-rescue': { name: QUEST_META['pass-gate-rescue'].name, emoji: '🥅', domain: '스포츠', code: '[4체02-06]', target: '협력 패스 전술' },
  'dribble-rhythm': { name: QUEST_META['dribble-rhythm'].name, emoji: '🥁', domain: '스포츠', code: '[4체02-03]', target: '리듬 조작 움직임' },
  'open-space-tactician': { name: QUEST_META['open-space-tactician'].name, emoji: '🗺️', domain: '스포츠', code: '[6체02-05]', target: '공간 침투 전술' },
  'emotion-thermometer': { name: '감정 온도계', emoji: '🌡️', domain: '표현', code: '[4체03-04]', target: '감정 신체 표현' },
  'partner-robot-lab': { name: '파트너 로봇 연구소', emoji: '🤖', domain: '표현', code: '[4체03-02]', target: '몸으로 하는 코딩 · 차례대로·되풀이·골라서' },
  // 신규 21종 차별화 미니게임 메타 등록
  'compass-azimuth': { name: '나침반 방위각 마스터', emoji: '🧭', domain: '스포츠', code: '[4체02-08]', target: '생태형 오리엔티어링' },
  'kayak-paddle': { name: '급류 탈출 카약', emoji: '🛶', domain: '스포츠', code: '[4체02-07]', target: '생태형 수상 모험' },
  'wind-surf-balance': { name: '바람을 타는 윈드서핑', emoji: '🏄', domain: '스포츠', code: '[6체02-09]', target: '생태형 바람 밸런스' },
  'tent-peg-hammer': { name: '텐트 팩 해머링', emoji: '⛺', domain: '스포츠', code: '[4체02-08]', target: '생태형 캠핑 야외' },
  'trail-maze-run': { name: '모험 트레일 러닝', emoji: '🏃‍♂️', domain: '스포츠', code: '[4체02-07]', target: '생태형 코스 탈출' },
  'alpine-glider': { name: '알프스 활강 글라이더', emoji: '🪂', domain: '스포츠', code: '[6체02-09]', target: '생태형 체공 활강' },
  'campfire-breath': { name: QUEST_META['campfire-breath'].name, emoji: '🔥', domain: '스포츠', code: '[4체02-10]', target: '생태형 여가 이완' },
  'crevasse-jump': { name: '빙판 크레바스 점프', emoji: '🧗', domain: '스포츠', code: '[6체02-08]', target: '생태형 도약 모험' },
  'slingshot-archery': { name: QUEST_META['slingshot-archery'].name, emoji: '🎯', domain: '스포츠', code: '[6체02-04]', target: '전략형 투사체 표적' },
  'spike-block-wall': { name: '스파이크 블로킹 월', emoji: '🏐', domain: '스포츠', code: '[6체02-05]', target: '전략형 네트 블로킹' },
  'base-running-decide': { name: QUEST_META['base-running-decide'].name, emoji: '⚾', domain: '스포츠', code: '[6체02-06]', target: '전략형 필드 주루' },
  'badminton-smash-rhythm': { name: '셔틀콕 스매시 리듬', emoji: '🏸', domain: '스포츠', code: '[4체02-06]', target: '전략형 네트 리듬' },
  'tactical-grid-slide': { name: '수비 포메이션 슬라이더', emoji: '🛡️', domain: '스포츠', code: '[6체02-05]', target: '전략형 수비 차단' },
  'sound-goalball': { name: QUEST_META['sound-goalball'].name, emoji: '🔔', domain: '스포츠', code: '[4체02-06]', target: '전략형 청각 스포츠' },
  'juggling-bounce-paddle': { name: '저글링 바운스 컨트롤러', emoji: '🎾', domain: '스포츠', code: '[4체02-03]', target: '전략형 다구 조작' },
  'head-shoulders-knees': { name: '머리 어깨 무릎 발 바디 비트', emoji: '🧢', domain: '운동', code: '[2체01-01]', target: '기본 움직임 신체 지각' },
  'animal-hop-step': { name: '동물 발자국 깡충 스텝', emoji: '🐾', domain: '운동', code: '[2체01-02]', target: '이동 움직임 징검다리' },
  'bicycle-pedal-crank': { name: '자전거 크랭크 페달', emoji: '🚲', domain: '운동', code: '[2체01-03]', target: '체력 가동성 페달링' },
  'double-under-rope': { name: '이단 줄넘기 더블 탭', emoji: '🪢', domain: '운동', code: '[4체01-02]', target: '체력 도약 2단 쌩쌩이' },
  'mirror-motion-invert': { name: '거울 모드 동작 반전', emoji: '🪞', domain: '운동', code: '[2체01-04]', target: '신경 협응 거울 공간' },
  'seesaw-balance-tap': { name: '균형 시소 버티기', emoji: '⚖️', domain: '운동', code: '[2체01-02]', target: '비이동 평형성 시소' },
  'space-occupier': { name: QUEST_META['space-occupier'].name, emoji: '🗺️', domain: '스포츠', code: '[4체02-06]', target: '전략형 스포츠 공간 분산 침투' },
  'relay-mission-runner': { name: QUEST_META['relay-mission-runner'].name, emoji: '🏃', domain: '운동', code: '[4체01-02]', target: '순발력 및 심폐지구력 릴레이' },
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
FLAGSHIP_GAMES.forEach(g=>{GAME_TITLES[g.type]={name:g.name,emoji:g.emoji,domain:g.domain,code:g.achievement.code,target:g.achievement.title};});
ALL_PHONE_PLAYS.forEach(p=>{GAME_TITLES[p.id]={name:p.name,emoji:p.emoji,domain:p.category==='리듬·표현'?'표현':'운동',code:'연계 확인 필요',target:p.goal};});

SAFETY_LESSON_IDS.forEach(id=>{GAME_TITLES[id]={...GAME_TITLES[id],name:SAFETY_LESSONS[id].name,emoji:SAFETY_LESSONS[id].emoji,target:'안전 상황 판단과 교실 역할 표현',code:'연계 확인 필요'};});
READY_SIGNATURE_GAMES.forEach(g=>{GAME_TITLES[g.id]={name:g.name,emoji:g.emoji,domain:g.domain,code:g.achievement.code,target:g.oneLine};});

export const GamePlayPage = () => {
  const { gameType } = useParams<{ gameType: string }>();
  const [searchParams] = useSearchParams();
  const { pathname,search,hash } = useLocation();
  const moved=mergedGameUrl(pathname,gameType||'',search,hash);
  if(moved)return <Navigate replace to={moved}/>;
  if(getRemovedGame(gameType||''))return <Suspense fallback={<ActivityLoading/>}><RetiredGameNotice id={gameType!}/></Suspense>;
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
  const classroomActivity=useClassroomActivityStatus(hasBattle?battleRoomId:null);
  const variantId=searchParams.get('variant');
  useEffect(()=>{if(!soloMode&&!hasBattle)recordRecentActivity(gameType);},[gameType,soloMode,hasBattle]); // 홈의 '지난번에 한 활동'
  const selectedVariant=useMemo(()=>variantsFor(gameType||'').find(v=>v.id===variantId),[gameType,variantId]);
  const scoreKey=selectedVariant?`${gameType}::variant::${selectedVariant.id}`:undefined;
  const catalogReturn=searchParams.get('returnTo');
  // 오늘 수업 중에 그 단계의 활동을 하고 있으면, 결과 화면에서 바로 다음 단계로 이어 준다.
  const todayRun=useTodayRun();
  const lessonStage=todayRun&&!hasBattle&&!soloMode&&currentStage(todayRun)?.gameId===gameType?currentStage(todayRun):undefined;
  const handleLessonNext=()=>{
    if(!todayRun)return;
    const next=advanceRun(todayRun,'done',Date.now());saveTodayRun(next);
    const ns=currentStage(next);const path=ns&&stagePath(ns,next.plan.settings.teams);
    navigate(path||'/today');
  };
  const safeCatalogReturn=catalogReturn&&/^\/(solo|hub|today)(\?[^#]*)?$/.test(catalogReturn)?catalogReturn:null;
  const hubPath = (guidedRequested || !!missionId) && hasBattle ? `/mobile/${battleRoomId}/${battleGroupId}` : hasBattle ? '/hub/tools?battle=1' : safeCatalogReturn||(soloMode?'/solo':'/hub');
  const { enqueueAction: enqueueClassroomScore, queueLength, isOnline, storageAvailable, syncWarning } = useSyncQueue(hasBattle);
  const guidedSubmission = useGuidedSubmission(guidedMode ? battleRoomId : null, guidedMode ? battleGroupId : null, guidedMode ? missionId : null);
  const enqueueGuidedCompletion = guidedSubmission.enqueueCompletion;
  const [key, setKey] = useState(0);
  // 한 판을 가리키는 id. 다시 하기(key가 바뀜)마다 새로 만들어, 그 판의 기록과 👍/👎를 잇는다.
  const sessionPlayId=useMemo(()=>`${key}-${newPlayId()}`,[key]);
  const [gameFinished, setGameFinished] = useState(false);
  const [resultDetails, setResultDetails] = useState<GameResultDetails | undefined>();
  const quietResult=resultDetails?.participation==='observed'||resultDetails?.participation==='rested';
  const [showDetailedResult, setShowDetailedResult] = useState(false);
  const [lastEarnedScore, setLastEarnedScore] = useState(0);
  const ownsPreparation=isSignatureId(gameType||'')||isFlagship(gameType||'')||isPhonePlay(gameType||'')||isQuestId(gameType||'')||isSafetyLessonId(gameType||'')||EXPEDITION_BY_ID.get(gameType||'')?.kind==='B'||['stretch','rolling-curling','emotion-thermometer','partner-robot-lab','body-rhythm-orchestrator'].includes(gameType||'');
  const [hasStarted, setHasStarted] = useState(!!routeState?.activityPrepared||ownsPreparation);
  const [isCountingDown, setIsCountingDown] = useState(false);
  // '오늘 수업' 막대가 활동 중인지 알 수 있게 알린다(활동 중에 다음 단계로 가려 하면 한 번 묻는다).
  // 자기 시작 화면이 있는 활동(대표 게임·준비물 없는 놀이 등)은 그 화면이 직접 알린다.
  useReportLessonActivity(gameType&&!isSignatureId(gameType)&&(gameFinished||(hasStarted&&!ownsPreparation))?{gameId:gameType,phase:gameFinished?'recorded':'playing'}:null);
  const [, setTotalPlays] = useState(0);
  const [newBadge, setNewBadge] = useState<string | null>(null);
  const [rpeSelected, setRpeSelected] = useState<number | null>(null);
  const [showCooldownModal, setShowCooldownModal] = useState<boolean>(false);
  const completionRef = useRef(false);
  // TV 모드에서는 위쪽 도구 막대를 숨기므로, 무대 위치를 다시 잰다.
  const {tvMode} = useDisplayPrefs();
  const gameLayoutRef = useRef<HTMLDivElement>(null);
  const gameToolbarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const layout = gameLayoutRef.current;
    const toolbar = gameToolbarRef.current;
    if (!hasStarted || !layout || !toolbar) return;
    // Reserve the actual wrapped heading height, including after fonts or viewport changes.
    const measure = () => {
      const declared = parseFloat(getComputedStyle(layout).getPropertyValue('--game-utility-height'));
      const utilities = Number.isFinite(declared) ? declared : 68;
      layout.style.setProperty('--game-stage-offset', `${utilities + Math.ceil(toolbar.getBoundingClientRect().height)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toolbar);
    return () => {
      observer.disconnect();
      layout.style.removeProperty('--game-stage-offset');
    };
  }, [hasStarted, tvMode]);
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current); }, []);

  const { addGameResult, updateLatestRpe } = usePlayerProfile();
  const { speak } = useVoiceCoach();
  const { addXpAndCoins } = useTamagotchi();
  useWakeLock(true);
  const { isGranted: isMotionGranted, requestPermission: requestMotionPermission } = useMotionPermission();


  const handleStartGame = () => {
    setHasStarted(true);
    const hasOwnIntro = isFlagship(gameType||'') || EXPEDITION_BY_ID.get(gameType || '')?.kind === 'B' || ['pulse-detective', 'posture-guardian', 'rolling-curling', 'pass-gate-rescue', 'dribble-rhythm', 'open-space-tactician', 'emotion-thermometer', 'partner-robot-lab', 'space-occupier', 'relay-mission-runner', 'body-rhythm-orchestrator'].includes(gameType || '');
    setIsCountingDown(!hasOwnIntro && !isPhonePlay(gameType||'') && !isQuestId(gameType || '') && !isSafetyLessonId(gameType||'')&&!variantsFor(gameType||'').length);
  };

  const handleCountdownComplete = useCallback(() => {
    completionRef.current = false;
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
    if (plays >= 1 && !badges['first_play']) { badges['first_play'] = true; newBadges.push('👟 첫 발걸음'); }
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
  const { enabled: musicEnabled, volume: musicVolume,suspendLesson } = useBackgroundMusic();
  useEffect(()=>{suspendLesson(classroomActivity.paused);return()=>suspendLesson(false);},[classroomActivity.paused,suspendLesson]);
  useEffect(() => {
    if (musicEnabled && !gameFinished&&!classroomActivity.paused) startBgm(musicVolume);
    else stopBgm();
    return () => stopBgm();
  }, [musicEnabled, musicVolume, gameFinished,classroomActivity.paused]);

  const baseGameInfo=GAME_TITLES[gameType||''];
  const gameInfo=useMemo(()=>selectedVariant?{...baseGameInfo,name:`${baseGameInfo.name} · ${selectedVariant.name}`,target:'통합 활동의 선택 코스'}:baseGameInfo,[baseGameInfo,selectedVariant]);
  const participationCues = (readParticipationCues(hash, gameType || '')||(selectedVariant?readParticipationCues(hash,selectedVariant.id):null));
  const movementMeta=selectedVariant&&mergedMovementMeta(selectedVariant.id);
  const flagshipMeta=FLAGSHIP_GAMES.find(g=>g.type===gameType);
  const activityPlan = flagshipMeta?{title:flagshipMeta.achievement.title,setup:flagshipMeta.equipment?.join(' · ')||'',safety:flagshipMeta.safetyTips?.[0]||''}:movementMeta?{title:movementMeta.name,setup:movementMeta.setup,safety:movementMeta.alternative}:getPhysicalActivityPlan(selectedVariant?.id||gameType||'', EXPRESSION_GAMES.some(game=>game.id===(selectedVariant?.id||gameType)));

  // 게임 완료 시 모둠 점수 및 활동 기록 즉시 반영
  const commitResult = useCallback((payload: { amount: number; details?: GameResultDetails }) => {
    const rawScore = payload.amount;
    const details = normalizeGameResultDetails(selectedVariant?{...payload.details,course:{sourceId:selectedVariant.id,targetId:gameType,sourceName:selectedVariant.name,targetName:baseGameInfo.name,version:1}}:payload.details);
    const quietRecord=details?.participation==='rested'||details?.participation==='observed';
    const earned=quietRecord?0:Math.round(rawScore);
    const classroomScore = classroomResultScore(earned,details);
    if (hasBattle && battleGroupId && classroomScore !== 0) {
      enqueueClassroomScore({ id: crypto.randomUUID(), type: 'INCREMENT_SCORE', payload: { id: battleGroupId, amount: classroomScore, roomId: battleRoomId, activityId: gameType }, timestamp: Date.now() });
    }
    setResultDetails(details);
    setLastEarnedScore(earned);
    setGameFinished(true);
    if(gameType)recordPlay(gameType,Date.now(),openPlayId(gameType)??sessionPlayId);
    if (guidedMode&&canReportCompletion(details)) {
      enqueueGuidedCompletion();
    }

    // 성공/실패 효과음
    if (earned > 0) {
      sfxSuccess();
      speak(hasBattle ? `참여 기록을 이 기기에 남겼어요. 전송 상태와 교사 확인은 화면에서 살펴보세요.` : `참여 기록 ${earned}점을 이 기기에 남겼어요.`, true);
    } else {
      sfxTap();
      speak('확인한 도전을 기록했어요. 다음에는 다른 방법도 골라 보세요.', true);
    }

    // 땀방이 다마고치 경험치 및 코인 적립
    if(earnsParticipationReward(earned,details))addXpAndCoins(15, 20);

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

    if(earnsParticipationReward(earned,details))checkBadges(earned);
  }, [gameType, gameInfo, addGameResult, addXpAndCoins, speak, checkBadges, hasBattle, battleGroupId, battleRoomId, enqueueClassroomScore, guidedMode, enqueueGuidedCompletion,selectedVariant,baseGameInfo,scoreKey,sessionPlayId]);

  const localEnqueueAction = useCallback((action: { payload: { amount: number; details?: GameResultDetails } }) => {
    if (classroomActivity.paused||completionRef.current || !Number.isFinite(action.payload.amount)) return;
    completionRef.current = true;
    commitResult(action.payload);
  }, [commitResult,classroomActivity.paused]);

  const handleReturnToCatalog = () => {
    // Stop active animation timers before rendering the full catalog on mobile.
    setHasStarted(false);
    navigate(hubPath);
  };

  // 대표 게임('한 판 더'를 게임 안에서 처리): 다음 판도 기록되도록 '이미 기록함' 상태만 푼다(게임 화면은 그대로).
  const resetForNextRound = useCallback(() => {
    completionRef.current = false;
    setGameFinished(false);
    setResultDetails(undefined);
    setShowDetailedResult(false);
    setLastEarnedScore(0);
    setRpeSelected(null);
  }, []);

  const handleReplay = () => {
    completionRef.current = false;
    setGameFinished(false);
    setResultDetails(undefined);
    setShowDetailedResult(false);
    setLastEarnedScore(0);
    setRpeSelected(null);
    setKey(prev => prev + 1);
    setHasStarted(ownsPreparation);
  };

  if (!gameType || !gameInfo) {
    return (
      <div className="warm-game min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <h1 className="text-3xl font-black mb-4">존재하지 않는 게임입니다</h1>
        <button onClick={handleReturnToCatalog} className="px-6 py-3 bg-cyan-600 rounded-xl font-bold">홈으로</button>
      </div>
    );
  }

  const signatureGame=isSignatureId(gameType);
  const bestScore = nonnegativeNumber(Number(readStorage(gameBestStorageKey(gameType,selectedVariant?.id))));

  const dummyGroupId = 'standalone-player';

  const renderBaseGame = () => {
    const commonProps = { groupId: dummyGroupId, enqueueAction: localEnqueueAction };
    if(isSignatureId(gameType))return <SignaturePlay key={key} gameId={gameType} groupId={dummyGroupId} enqueueAction={localEnqueueAction as (a:unknown)=>void} onExit={handleReturnToCatalog} onRoundReset={resetForNextRound}/>;
    if(isFlagship(gameType))return <FlagshipActivity key={key} game={gameType} room={hasBattle?battleRoomId:null} group={hasBattle?battleGroupId:null} onFinish={details=>localEnqueueAction({payload:{amount:100,details}})}/>;
    const phone=PHONE_PLAY_BY_ID.get(gameType);
    if(phone)return <PhonePlay key={key} {...commonProps} play={phone} solo={soloMode} onExit={handleReturnToCatalog}/>;
    if(isSafetyLessonId(gameType))return <SafetyLesson key={key} {...commonProps} gameId={gameType} solo={soloMode} onExit={handleReturnToCatalog}/>;
    if (isQuestId(gameType)) return <MovementQuest key={key} {...commonProps} gameId={gameType} solo={soloMode} onExit={handleReturnToCatalog}/>;

    const expedition=EXPEDITION_BY_ID.get(gameType||'');
    if(expedition?.kind==='B')return <ExpeditionActivity key={key} game={expedition} groupId={dummyGroupId} solo={soloMode} enqueueAction={localEnqueueAction}/>;
    // 지금은 이 세 활동만 이 화면 전용 컴포넌트로 열린다. 나머지는 위의 신체 놀이·원정·안전·폰 놀이 화면이나 정리 안내로 먼저 처리된다.
    switch (gameType) {
      case 'stretch':
        return <StretchTimer key={key} {...commonProps} />;
      case 'emotion-thermometer':
        return <EmotionThermometer key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      case 'partner-robot-lab':
        return <PartnerRobotLab key={key} {...commonProps} onExit={handleReturnToCatalog} />;
      default: {
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
    <div ref={gameLayoutRef} className="game-tools-scope game-tools-layout">
      <div className="game-utilities-bar"><HeaderToolbar studentMode={hasBattle}><button className="icon-toolbar-action" type="button" onClick={handleReturnToCatalog} title="활동 목록으로"><ArrowLeft aria-hidden="true"/><span>활동 목록으로</span></button><button className="icon-toolbar-action" type="button" onClick={() => navigate('/manual')} title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></button></HeaderToolbar></div>
      <ActivityPauseBoundary paused={classroomActivity.paused} message={classroomActivity.message}>
    <div className={`warm-game gameplay-page ${hasStarted ? 'has-game-toolbar' : ''} relative min-h-[100dvh] bg-slate-950`}>
      {/* 활동 준비 화면 */}
      {!hasStarted && !gameFinished && (
        <div className="game-prepare fixed inset-0 z-[10002] overflow-y-auto p-4"><div className="game-prepare-inner">
          <button className="game-prepare-back" onClick={handleReturnToCatalog}><ArrowLeft aria-hidden="true"/>활동 목록으로</button>
          <div className="game-prepare-heading"><span className="game-prepare-emoji" aria-hidden="true">{isPhonePlay(gameType||'')?<PhonePlayIcon gameType={gameType||''} size={48}/>:gameInfo.emoji}</span><div><p className="game-prepare-eyebrow">땀방울 원정대 · {soloMode ? '혼자 해보기' : '활동 준비'}</p><h1>{gameInfo.name}</h1><p className="game-prepare-target">{gameInfo.target}</p></div></div>
          <div className="game-prepare-info">{(()=>{
            // 표현·안전 활동은 게임마다 다른 3줄 규칙을 보여 준다. 같은 문구('짝과 표현 발표')를 모든 표현 활동에 붙이지 않는다.
            const id=selectedVariant?.id||gameType||'';
            const rules3=EXPRESSION_GAMES.find(e=>e.id===id)?.rules3??(isSafetyLessonId(id)?SAFETY_LESSONS[id].rules3:undefined);
            if(rules3)return <><p>{GAMES.find(game=>game.type===id)?.desc}</p><ol className="game-prepare-rules3" aria-label="놀이 규칙 3줄">{rules3.map((rule,i)=><li key={i}><strong>{['무엇을','어떻게','언제 끝나요'][i]}</strong> {rule}</li>)}</ol><small>{isSafetyLessonId(id)?activityPlan.safety:'기기는 놓고, 서로 닿지 않는 자기 자리에서 해요. 앉거나 작은 동작으로 해도 돼요.'}</small></>;
            return <><p>{movementMeta?.description||GAMES.find(game=>game.type===id)?.desc}</p><small>{hasBattle ? '활동 결과를 제출해요. 교사 확인이 필요한 수업은 승인 후 점수가 반영돼요.' : '목표 기록을 확인하고 신체 활동을 안전하게 진행해 보세요.'}</small><p className="mt-2 text-sm font-bold">{isSafetyLessonId(gameType)?'안전 학습':'신체 놀이'}: {activityPlan.title}</p><small>{activityPlan.setup} · {activityPlan.safety}</small></>;
          })()}</div>
          {participationCues && <div className="game-prepare-info" aria-label="수업 참여 안내"><strong>오늘의 신체 놀이</strong><p>{participationCues.mission}</p><small>역할 바꾸기: {participationCues.roles}<br/>기다리는 동안: {participationCues.waiting}</small><p className="mt-2 text-xs">선생님이 공유한 안내를 확인하세요. 화면 조작은 실제 움직임의 증거가 아닙니다.</p></div>}
          {/* Permission guidance stays in preparation so it never covers game controls. */}
          {!isMotionGranted && !isQuestId(gameType) && MOTION_SENSOR_GAMES.includes(gameType) && (
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
          <button type="button" className="game-prepare-start" onClick={handleStartGame}><StartLabel sub="바로 시작"/></button><p className="game-prepare-note">몸을 움직이기 전 주변 공간과 기기를 확인해 주세요.</p>
        </div></div>
      )}

      {/* 3초 움직임 준비 카운트다운 */}
      {isCountingDown && (
        <ReadyCountdownOverlay
          onComplete={handleCountdownComplete}
          message={`${gameInfo.name} 시작 준비! ${countdownDeviceHint(gameType||'',typeof window!=='undefined'&&window.matchMedia('(min-width: 768px)').matches)}`}
        />
      )}

      {/* 게임 렌더링 */}
      {hasStarted && !isCountingDown && <div className="gameplay-content" hidden={gameFinished && !showDetailedResult} onClickCapture={event => {
        // 대표 게임은 '한 판 더'·'다시 시작'을 게임 안에서 처리한다(일시정지의 '▶ 다시 시작'을 가로채지 않게).
        if (!gameFinished || signatureGame) return;
        const button = (event.target as HTMLElement).closest('button');
        if (button && /다시|재도전/.test(button.textContent || '')) {
          event.preventDefault();
          event.stopPropagation();
          handleReplay();
        }
      }}>{showDetailedResult && <p className="bg-slate-900 p-3 text-center text-sm text-slate-300">아래 점수는 활동 원점수입니다. 이 점수가 활동 기록에 반영됩니다.</p>}{participationCues && !gameFinished && <details className="mx-auto mt-16 mb-2 max-w-md rounded-xl border border-cyan-500/40 bg-slate-900 p-3 text-sm text-white"><summary className="cursor-pointer font-bold">오늘의 신체 놀이 · 역할·대기 안내</summary><p className="mt-2">{participationCues.mission}</p><p className="mt-1">역할: {participationCues.roles}</p><p className="mt-1">대기: {participationCues.waiting}</p></details>}{<Suspense fallback={<ActivityLoading/>}>{renderGame()}</Suspense>}</div>}

      {/* 배지 획득 토스트 */}
      {newBadge && (
        // 결과 화면에서는 아래쪽에 띄워 축하·점수를 가리지 않는다.
        <div role="status" className={`game-achievement-toast fixed ${gameFinished ? 'bottom-6' : 'top-20'} left-1/2 -translate-x-1/2 z-[10003] bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-900 px-6 py-3 rounded-2xl shadow-2xl font-black text-sm animate-bounce border-2 border-yellow-300 pointer-events-none`}>
          🎉 새 배지 획득! {newBadge}
        </div>
      )}

      {/* 상단 네비게이션 */}
      {hasStarted && (
        <div ref={gameToolbarRef} className="gameplay-toolbar fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between pointer-events-none">
          <button onClick={handleReturnToCatalog} className="game-toolbar-back" aria-label="활동 목록으로"><ArrowLeft aria-hidden="true"/></button>
          <div className="game-toolbar-title"><strong>{gameInfo.name}</strong><small>{gameInfo.domain} · {gameInfo.target}</small></div>
          {showDetailedResult && <button className="game-toolbar-result" onClick={() => setShowDetailedResult(false)}>점수 화면</button>}
          {/* 교실 TV 모드: 위쪽 도구 막대와 작은 설명을 숨기고 놀이 화면을 넓게 쓴다. */}
          {!showDetailedResult && !hasBattle && <TvModeButton className="game-toolbar-tv"/>}
        </div>
      )}

      {/* 게임 종료 결과 오버레이 */}
      {/* 대표 게임은 결과 발표(ResultCeremony)가 결과·반응 칸을 모두 맡으므로 이 결과 카드를 그리지 않는다. */}
      {gameFinished && !showDetailedResult && !signatureGame && (
        <div className="game-result-overlay fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex flex-col items-center overflow-y-auto p-4 font-sans animate-in fade-in duration-200">
          <div className="game-result-card bg-slate-900/95 border border-slate-700 rounded-3xl p-5 my-auto shrink-0 max-w-sm w-full flex flex-col items-center shadow-2xl">
            {/* 학생 폰(수업방)에서는 교육과정 코드 칩을 숨기고 '선생님용 설명'에 둔다. */}
            {!hasBattle&&<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 mb-4">
              {gameInfo.code!=='연계 확인 필요'&&<><span>{gameInfo.code}</span><span className="text-slate-500">|</span></>}<span className="text-slate-300">{gameInfo.target}</span>
            </div>}
            <span className="text-6xl mb-3">{isPhonePlay(gameType||'')?<PhonePlayIcon gameType={gameType||''} size={48}/>:gameInfo.emoji}</span>
            <h2 className="text-2xl font-black text-white mb-1">{gameInfo.name}</h2>
            <p className="text-emerald-400 font-bold text-xs mb-3">{quietResult?(resultDetails?.participation==='rested'?'휴식 기록을 남겼어요.':'관찰 참여를 기록했어요.'):resultDetails?.completion==='partial'?'일부 수행·도전을 기록했어요.':'활동을 마쳤어요!'}</p>
            {/* 오늘 수업 중: 수업을 잇는 길을 결과 카드 맨 위에 둔다(TV에서 스크롤하지 않아도 보이게). */}
            {lessonStage&&<div className="lesson-next-top w-full mb-4"><button onClick={handleLessonNext} className="game-stage-primary lesson-next w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-colors shadow-lg">다음 단계로 ▶</button><p className="mt-2 text-center text-xs text-slate-300">반응(👍/👎)은 아래에서 남길 수 있어요.</p></div>}
            {/* 학생 폰: 큰 축하 한 줄과 점수를 맨 위에 둔다(390x844 첫 화면 안). */}
            {hasBattle && (
              <div className="student-result-hero w-full mb-4 text-center">
                <p role="status" className="student-result-message text-xl font-black text-white">
                  {studentResultMessage({quiet:quietResult,partial:resultDetails?.completion==='partial',queue:queueLength,online:isOnline,warning:syncWarning??'',score:classroomResultScore(lastEarnedScore,resultDetails)})}{!storageAvailable&&queueLength>0&&' 화면을 열어 두세요.'}
                </p>
                <div className="result-score student-result-score w-full mt-3 bg-slate-800 rounded-2xl p-4 flex flex-col items-center border border-slate-700">
                  <span className="text-slate-300 text-base font-bold mb-1">오늘 얻은 점수</span>
                  <span className={`result-score-value text-6xl font-black font-mono ${lastEarnedScore > 0 ? 'text-cyan-400' : lastEarnedScore < 0 ? 'text-red-500' : 'text-slate-500'}`}>{lastEarnedScore > 0 ? '+' : ''}{lastEarnedScore}</span>
                </div>
              </div>
            )}
            {guidedMode && !quietResult && resultDetails?.completion!=='partial' && guidedSubmission.error && (
              <div role="status" className="mb-4 text-center text-sm text-cyan-300">
                <p>{guidedSubmission.error}</p>
                {!guidedSubmission.receipt?.completed && <button className="mt-2 rounded-lg border border-cyan-400 px-3 py-2" onClick={guidedSubmission.retry}>지금 다시 보내기</button>}
              </div>
            )}
            {guidedMode && !quietResult && resultDetails?.completion!=='partial' && <fieldset className="w-full rounded-2xl bg-slate-800/70 border border-slate-700 p-4 mb-4"><legend className="px-2 text-sm font-bold text-white">오늘 잘한 움직임 하나</legend><div className="grid gap-2">{GUIDED_REFLECTIONS.map(choice => <button key={choice.value} type="button" aria-pressed={guidedSubmission.receipt?.reflection === choice.value} onClick={() => guidedSubmission.chooseReflection(choice.value)} className={`rounded-xl border px-3 py-3 text-sm text-left ${guidedSubmission.receipt?.reflection === choice.value ? 'border-cyan-300 bg-cyan-900 text-white' : 'border-slate-600 text-slate-200'}`}>{choice.label}</button>)}</div><p role="status" className={`mt-2 ${guidedSubmission.receipt?.saved ? 'text-lg font-black text-emerald-300' : 'text-base text-cyan-200'}`}>{guidedSubmission.receipt?.reflection ? guidedSubmission.receipt.saved ? <><span aria-hidden="true">✅ </span><span>선생님 화면에 저장했어요.</span></> : '선택을 저장하고 있어요.' : '한 가지만 골라요.'}</p></fieldset>}
            {hasBattle ? <details className="student-result-teacher-note w-full mb-4 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"><summary className="cursor-pointer font-bold">선생님용 설명</summary><p className="mt-2">{classroomResultMessage({quiet:quietResult,partial:resultDetails?.completion==='partial',queue:queueLength,online:isOnline,warning:syncWarning??'',score:classroomResultScore(lastEarnedScore,resultDetails)})}</p><p className="mt-2">{gameInfo.code!=='연계 확인 필요'&&<>{gameInfo.code} · </>}{gameInfo.target}</p><p className="mt-2 leading-relaxed">이 점수는 이 활동의 참여·감상·화면 규칙 기록이에요(자동 체력 측정 아님). 게임마다 기준이 달라 서로 다른 게임의 점수를 체력이나 운동 능력 순위로 비교하지 않아요.</p></details> : <><p className="text-sm leading-relaxed mb-4">이 점수는 이 활동의 참여·감상·화면 규칙 기록이에요. 게임마다 기준이 달라 서로 다른 게임의 점수를 체력이나 운동 능력 순위로 비교하지 않아요.</p><div className="result-score w-full bg-slate-800 rounded-2xl p-5 mb-3 flex flex-col items-center border border-slate-700">
              <span className="text-slate-400 text-sm font-bold mb-1">참여·감상·화면 규칙 점수 · 자동 체력 측정 아님</span>
              <span className={`result-score-value text-5xl font-black font-mono ${lastEarnedScore > 0 ? 'text-cyan-400' : lastEarnedScore < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {lastEarnedScore > 0 ? '+' : ''}{lastEarnedScore}
              </span>

            </div></>}
            {!quietResult&&<div className="w-full flex justify-between items-center bg-slate-800/50 rounded-xl px-4 py-3 mb-4 border border-slate-700/50">
              <div className="flex items-center gap-2 text-yellow-500"><Trophy className="w-4 h-4" /><span className="text-sm font-bold">{gameType==='rolling-curling'?'참여 확인 점수':'최고 기록'}</span></div>
              <span className="text-yellow-400 font-black">{bestScore}점</span>
            </div>}
            {/* 결과 → 반응(👍/👎) → 다음 순서(대표 게임 결과 발표와 같게). 힘든 정도·쿨다운·자세한 결과는 그 아래에 둔다. */}
            {gameType&&<ClassFeedbackSlot gameId={gameType} playId={sessionPlayId}/>}
            {lastEarnedScore > 300 && (
              <div className="w-full bg-orange-950/50 border border-orange-500/30 rounded-xl px-4 py-2.5 mb-4 text-center">
                <p className="text-xs font-bold text-orange-300">💪 훌륭해요! 다음에는 자신의 기록을 넘어 보세요!</p>
              </div>
            )}

            {/* RPE 운동 자각도 이모지 평가 */}
            {!quietResult&&<div className="w-full bg-slate-800/60 rounded-2xl px-4 py-4 mb-4 border border-slate-700/50">
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
                    aria-pressed={rpeSelected === value}
                    onClick={() => {
                      setRpeSelected(value);
                      // RPE 값을 최근 기록에 업데이트
                      if (gameType && gameInfo) {
                        updateLatestRpe(gameType, value);
                      }
                    }}
                    className={`result-rpe-choice min-w-0 whitespace-normal flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all border-2 ${
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
            </div>}

            {/* 🫀 쿨다운 & 심박수 정리운동 버튼 */}
            {!quietResult&&<button
              onClick={() => setShowCooldownModal(true)}
              className="game-result-cooldown w-full mb-4 py-3 border font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
            >
              <Heart className="w-4 h-4" />
              <span>🫀 운동 후 쿨다운 루틴</span>
            </button>}

            {resultDetails && <div className="w-full mb-4"><GameResultDetailsView details={resultDetails} /></div>}
            <button onClick={() => setShowDetailedResult(true)} className="w-full mb-4 py-3 bg-slate-800 border border-slate-600 text-white rounded-xl font-bold text-sm">게임 상세 결과 보기</button>
            <button disabled={hasBattle&&(queueLength>0||(guidedMode&&!quietResult&&resultDetails?.completion!=='partial'&&!guidedSubmission.receipt?.completed))} onClick={()=>navigate(hasBattle?'/records?'+new URLSearchParams({returnTo:`/mobile/${battleRoomId}/${battleGroupId}`}):'/records')} className="w-full mb-4 min-h-12 rounded-xl border border-cyan-600 bg-slate-800 p-3 font-bold text-white disabled:opacity-50">내 활동 기록 확인</button>
            {lessonStage?<div className="w-full flex flex-col gap-3">
              {/* 오늘 수업 중: 다음 단계 버튼은 카드 맨 위에 있고, 여기에는 한 번 더·오늘 수업으로만 둔다('홈으로'로 수업에서 벗어나지 않게). */}
              <div className="w-full flex gap-3">
                <button onClick={handleReplay} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors"><RotateCcw className="w-5 h-5" /> 한 번 더</button>
                <button onClick={()=>navigate('/today')} className="result-return flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors">오늘 수업으로</button>
              </div>
            </div>:
            <div className="w-full flex gap-3">
              <button onClick={handleReplay} className="game-stage-primary flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-base flex items-center justify-center gap-2 transition-colors shadow-lg">
                <RotateCcw className="w-5 h-5" /> 다시 하기
              </button>
              <button onClick={handleReturnToCatalog} className="result-return flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
                <Home className="w-5 h-5" /> {soloMode ? '활동 목록으로' : guidedRequested ? '모둠으로' : '홈으로'}
              </button>
            </div>}
          </div>
        </div>
      )}

      {/* 🫀 쿨다운 모달 */}
      <CooldownTimerModal
        isOpen={showCooldownModal}
        onClose={() => setShowCooldownModal(false)}
      />


    </div></ActivityPauseBoundary></div>
  );
};

import {PHONE_PLAY_BY_ID,ALL_PHONE_PLAYS,isPhonePlay} from '../domain/phonePlayCatalog';
