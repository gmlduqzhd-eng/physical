import { EXPEDITION_BY_ID } from './expeditionGames';
import { isQuestId, QUEST_META } from './movementQuests';
/** Classroom movement tasks paired with screen games. A tap is never motion evidence. */
export interface PhysicalActivityPlan {
  idea: number;
  title: string;
  activity: string;
  alternative: string;
  setup: string;
  safety: string;
  secondsPerTurn: number;
}

const plans: PhysicalActivityPlan[] = [
  {
    idea: 1, title: '바닥 표식 찾기',
    activity: '바닥의 표식 3개를 순서대로 찾아 이동하고 출발점으로 돌아오세요. 짝과 역할을 바꿉니다.',
    alternative: '앉은 자리에서 팔을 뻗어 세 방향의 표식을 차례로 가리키세요.',
    setup: '표식 3개 · 약 2m 공간 · 기기 고정',
    safety: '뛰지 않고 이동하며 서로 부딪히지 않을 간격을 둡니다.', secondsPerTurn: 20,
  },
  {
    idea: 2, title: '움직임과 멈춤',
    activity: '짝의 신호에 맞춰 제자리에서 움직였다가 멈추기를 3회 반복하세요. 역할을 바꿉니다.',
    alternative: '앉아서 팔을 움직였다가 신호에 맞춰 멈추세요.',
    setup: '빈 공간 · 신호를 보여줄 기기 1대',
    safety: '제자리에서 실시하고 학생 사이에 팔 한 뼘 이상 간격을 둡니다.', secondsPerTurn: 18,
  },
  {
    idea: 3, title: '실제 운동 짝 확인',
    activity: '게임에서 안내한 동작을 안전한 범위에서 수행하세요. 짝이 횟수나 유지 시간을 관찰하고 역할을 바꿉니다.',
    alternative: '앉아서 가능한 상체 동작이나 교사가 정한 대체 동작을 수행하세요.',
    setup: '개인 활동 공간 · 필요한 경우 매트 · 기기 거치',
    safety: '통증이 있으면 즉시 멈춥니다. 달리거나 버티는 동안 기기를 들지 않습니다.', secondsPerTurn: 20,
  },
  {
    idea: 4, title: '기기 고정 릴레이',
    activity: '기기는 출발점에 놓고 반환점까지 이동해 돌아오세요. 짝과 역할을 바꿔 모두 참여합니다.',
    alternative: '거리를 줄이거나 휠체어·걷기 이동으로 같은 코스를 마칩니다.',
    setup: '출발·반환 표식 2개 · 고정 기기 1대',
    safety: '기기를 들고 뛰지 않습니다. 돌아오는 동선을 분리합니다.', secondsPerTurn: 20,
  },
  {
    idea: 5, title: '실제 공 기술 시도',
    activity: '부드러운 공으로 굴리기·패스·드리블 중 게임에 맞는 동작을 3회 시도하세요. 짝과 역할을 바꿉니다.',
    alternative: '작은 거리에서 공을 굴리거나 앉아서 주고받으세요.',
    setup: '부드러운 공 1개 · 목표 표식 · 모둠 기기 1대',
    safety: '얼굴을 향해 던지지 않고 주변 모둠과 거리를 둡니다.', secondsPerTurn: 25,
  },
  {
    idea: 6, title: '짝과 표현 발표',
    activity: '게임의 동작이나 감정을 온몸으로 표현해 짝에게 보여주세요. 짝도 다른 표현을 보여주고 서로 한 가지 좋은 점을 말합니다.',
    alternative: '앉은 자세에서 얼굴·팔·상체로 표현하세요.',
    setup: '팔을 펼칠 공간 · 기기 1대',
    safety: '서로의 몸을 밀거나 억지로 자세를 만들지 않습니다. 촬영은 필요하지 않습니다.', secondsPerTurn: 20,
  },
  {
    idea: 7, title: '답 카드로 이동',
    activity: '게임의 답이나 규칙에 맞는 카드 위치로 이동한 뒤 출발점으로 돌아오세요. 짝도 한 번 참여합니다.',
    alternative: '제자리에서 해당 방향으로 팔을 뻗거나 가까운 카드를 선택하세요.',
    setup: '답 카드 2~4장 · 안전한 이동 통로 · 중앙 화면',
    safety: '답을 찾으려고 뛰지 않습니다. 카드 위치를 서로 겹치지 않게 둡니다.', secondsPerTurn: 18,
  },
  {
    idea: 8, title: '큰 움직임으로 그리기',
    activity: '손가락 대신 팔이나 리본으로 공중에 원·파동을 좌우 각 2회 그리세요. 짝과 역할을 바꿉니다.',
    alternative: '앉아서 가능한 크기로 팔·손목을 움직이세요.',
    setup: '팔을 펼칠 공간 · 선택 사항: 짧은 리본',
    safety: '어깨가 아프면 작은 동작으로 줄이고 몸을 억지로 회전하지 않습니다.', secondsPerTurn: 18,
  },
  {
    idea: 9, title: '활동 전후 몸 상태 살피기',
    activity: '편안한 강도의 제자리 움직임 뒤 실제 맥박이나 스스로 느낀 운동 강도를 비교해 짝에게 이야기하세요. 역할을 바꿉니다.',
    alternative: '호흡을 고르며 앉은 자세에서 팔을 움직이고 느낌의 변화를 기록하세요.',
    setup: '개인 공간 · 타이머 · 선택 사항: 맥박 기록지',
    safety: '무리한 강도를 요구하지 않습니다. 화면 탭 박자는 실제 심박수가 아닙니다.', secondsPerTurn: 25,
  },
  {
    idea: 10, title: '게임 규칙 몸으로 보여주기',
    activity: '화면에서 익힌 규칙이나 움직임을 안전한 몸짓으로 짝에게 설명하고, 짝도 다른 차례에 참여하세요.',
    alternative: '앉아서 상체 동작 또는 가리키기로 규칙을 표현하세요.',
    setup: '팔을 펼칠 공간 · 고정 기기 1대',
    safety: '서로 밀거나 실제 응급처치를 친구 몸에 실시하지 않습니다.', secondsPerTurn: 15,
  },
];

const groups: ReadonlyArray<readonly [number, readonly string[]]> = [
  [1, ['zone_touch', 'zigzag', 'agility-dot-drill']],
  [2, ['red_green', 'freeze']],
  [3, ['jump', 'squat', 'run', 'plank', 'one_leg', 'arm_raise', 'shake', 'stretch', 'wave', 'punch', 'tilt_balance', 'foot-center-balance', 'shuttle-run-beep', 'eccentric-isom-push', 'posture-spine-align', 'cross-lateral-brain', 'double-under-rope', 'animal-hop-step', 'head-shoulders-knees', 'seesaw-balance-tap']],
  [4, ['relay-mission-runner', 'space-occupier', 'trail-maze-run', 'base-running-decide']],
  [5, ['rolling-curling', 'pass-gate-rescue', 'dribble-rhythm', 'basketball-free-throw', 'volleyball-apex-set', 'curling-weight-control', 'badminton-drop-clear', 'baseball-bunt-defense', 'juggling-bounce-paddle']],
  [6, ['dance_pose', 'animal', 'body_twist', 'emotion-thermometer', 'partner-robot-lab', 'body-rhythm-orchestrator', 'shadow-pose-sculpture', 'emotion-freeze-mime', 'partner-mirror-duet', 'step-mania-4lane', 'mirror-motion-invert']],
  [7, ['math', 'color_word', 'memory', 'number_grid', 'whack_a_mole', 'card_match', 'reaction', 'left_right']],
  [8, ['speed_circle', 'circle_draw', 'trace_shape', 'ribbon-wave-stream', 'mobility-joint-circle', 'bicycle-pedal-crank']],
  [9, ['pulse-detective', 'pulse-zone-target', 'breath-pacer-478', 'campfire-breath']],
];

export function getPhysicalActivityPlan(gameType: string, isExpressionGame = false): PhysicalActivityPlan {
  if (isQuestId(gameType)) {
    const quest = QUEST_META[gameType];
    return { idea: 0, title: quest.name, activity: quest.description, alternative: quest.alternative, setup: quest.setup,
      safety: '기기는 거치하고 걸어서 이동해요. 개인 공간을 확보하고 통증이 있으면 쉬어요.', secondsPerTurn: 30 };
  }
  const expedition = EXPEDITION_BY_ID.get(gameType);
  if (expedition) return {idea:0,title:expedition.name,activity:expedition.desc,alternative:expedition.alternative,setup:expedition.space+' · '+expedition.equipment.join(' · ')+' · 기기 고정',safety:expedition.safety,secondsPerTurn:20};
  if (isExpressionGame) return plans[5];
  const match = groups.find(([, ids]) => ids.includes(gameType));
  return match ? plans[match[0] - 1] : plans[9];
}

export const PHYSICAL_ACTIVITY_PLANS = plans;
