import type { GameResultDetails } from './gameResultDetails.js';
import { EXTENDED_QUEST_IDS, EXTENDED_QUEST_META, makeExtendedQuest } from './extendedMovementQuests.js';
import type { ExtendedQuestId, QuestMetadata } from './extendedMovementQuests.js';

export const PILOT_QUEST_IDS = ['zigzag', 'dribble-rhythm', 'pass-gate-rescue'] as const;
export const QUEST_IDS = [...PILOT_QUEST_IDS, ...EXTENDED_QUEST_IDS] as const;
export type QuestId = typeof QUEST_IDS[number];
export type QuestSettings = { seated: boolean; gentle: boolean; practice: boolean; players: number; seed?: number };
export type QuestRecord = { round: number; choice: string; outcome: 'complete' | 'partial'; activeMs: number; retries: number; answer?: string[] };
export interface QuestChoice { id: string; label: string; detail: string; path?: number[] }
export interface QuestRound {
  title: string; goal: string; hint: string; choices: QuestChoice[]; cues: string[]; cueMs: number;
  repeats: number; blocked?: number; roles?: string[]; confirmation: string;
  preview?: string[]; question?: { prompt: string; options: string[]; answer: string[] };
  timing?: { targetSeconds: number; toleranceSeconds: number };
}
export const QUEST_META: Record<QuestId, QuestMetadata> = {
  ...EXTENDED_QUEST_META,
  zigzag: {
    equipment: ['바닥 표식 9개', '콩주머니 1개'],
    name: '갈림길 보급 작전', emoji: '🧭',
    description: '막힌 길을 피해 경로를 고르고, 실제 바닥 표식을 걸어 보급품을 가져와요.',
    setup: '3×3 바닥 표식 9개(1~9번) · 콩주머니 1개 · 개인 통로 · 기기 거치',
    rules: ['아래 왼쪽 7번에서 출발해 위 오른쪽 3번의 보급품을 가져와요.', '막힌 칸을 피해 길을 고르고, 같은 길로 걸어 돌아와요.', '한 번 연습한 뒤 막힌 길이 달라지는 세 작전에 도전해요.'],
    alternative: '앉아서 책상 위 3×3 표식을 순서대로 짚고 가벼운 물건을 옮겨요.',
  },
  'dribble-rhythm': {
    equipment: ['개인 공 1개'],
    name: '리듬 배송 공장', emoji: '🥁',
    description: '공을 다루는 박자를 익히고 손 바꾸기와 옆걸음을 연결해 세 배송을 완성해요.',
    setup: '개인 공 1개 · 미끄럽지 않은 개인 공간 · 기기 거치',
    rules: ['화면의 큰 신호와 소리에 맞춰 공을 한 번씩 튀겨요.', '편한 손 또는 손 바꾸기를 고르고 8박자를 이어요.', '실수해도 공을 잡고 다음 박자부터 다시 참여해요.'],
    alternative: '앉아서 공을 무릎에서 손으로 옮기거나 손바닥으로 허벅지를 가볍게 두드려요.',
  },
  'pass-gate-rescue': {
    team: true, maxPlayers: 6, equipment: ['부드러운 공 1개', '인원보다 1개 많은 표식'],
    name: '빈자리 패스 구조대', emoji: '🥅',
    description: '공을 굴려 보내고 빈 표식으로 이동해, 모두가 보내기와 받기에 참여해요.',
    setup: '부드러운 공 1개 · 인원보다 1개 많은 원형 바닥 표식 · 기기 거치',
    rules: ['원을 따라 다음 친구에게 공을 굴려 보내요.', '보낸 사람은 비어 있는 옆 표식으로 이동해요. 공이 멈춘 뒤 다음 패스를 해요.', '모두 보내기와 받기를 해 보고, 작전마다 시작하는 사람을 바꿔요.'],
    alternative: '앉은 자리의 원형 책상 표식에서 공을 굴리고, 보낸 뒤 손을 빈 표식으로 옮겨요.',
  },
};

export function isQuestId(id: string): id is QuestId { return (QUEST_IDS as readonly string[]).includes(id); }
export function gameBestStorageKey(id: string): string {
  return `physical_best_${id}${isQuestId(id) ? '_movement_v1' : ''}`;
}
export function safeRoute(path: readonly number[], blocked: number): boolean {
  return path.length >= 2 && path[0] === 6 && path[path.length - 1] === 2 && path.every((cell, i) =>
    Number.isInteger(cell) && cell >= 0 && cell <= 8 && cell !== blocked && (i === 0 ||
      Math.abs(Math.floor(cell / 3) - Math.floor(path[i - 1] / 3)) + Math.abs(cell % 3 - path[i - 1] % 3) === 1));
}

export function makeQuestRound(id: QuestId, round: number, settings: QuestSettings, choiceId?: string): QuestRound {
  if (!Number.isInteger(round) || round < 0 || round > 2) throw new Error('Invalid quest round');
  if ((EXTENDED_QUEST_IDS as readonly string[]).includes(id)) return makeExtendedQuest(id as ExtendedQuestId, round, settings, choiceId);
  const seated = settings.seated;
  if (id === 'zigzag') {
    const blocked = [4, 1, 5][round];
    const choices: QuestChoice[] = [
      { id: 'upper', label: '위쪽 길', detail: '7 → 4 → 1 → 2 → 3', path: [6, 3, 0, 1, 2] },
      { id: 'lower', label: '아래쪽 길', detail: '7 → 8 → 9 → 6 → 3', path: [6, 7, 8, 5, 2] },
      { id: 'middle', label: '가운데 길', detail: '7 → 4 → 5 → 6 → 3', path: [6, 3, 4, 5, 2] },
    ];
    const selected = choices.find(c => c.id === choiceId);
    const path = selected?.path ?? choices.find(c => safeRoute(c.path!, blocked))!.path!;
    const route = [...path, ...path.slice(0, -1).reverse()];
    return { title: ['첫 보급', '길이 바뀌었어요', '마지막 구조 작전'][round],
      goal: `${blocked + 1}번을 피해 3번 보급품을 7번 기지로 가져오기`,
      hint: seated ? '번호를 따라 팔을 뻗어 짚어요. 3번에서 물건을 가져와요.' : '표식 간격은 편한 한 걸음으로 두세요. 3번에서 집고 같은 길로 돌아와요.',
      choices, blocked, cues: route.map((n, i) => `${n + 1}번${i === 4 ? ' · 보급품 집기' : i === 8 ? ' · 기지 도착' : ''}`),
      cueMs: settings.gentle ? 4500 : 3500, repeats: 1, confirmation: '막힌 칸을 피하고 보급품을 기지로 가져왔어요' };
  }
  if (id === 'dribble-rhythm') {
    const choices = [
      { id: 'steady', label: '편한 손으로 연결', detail: '한 손으로 안정적인 박자를 만들어요.' },
      { id: 'switch', label: '두 손 번갈아 연결', detail: '4박자마다 손을 바꾸어요.' },
    ];
    const switching = choiceId === 'switch';
    const cues = Array.from({ length: 8 }, (_, beat) => {
      const hand = switching ? beat < 4 ? '오른손' : '왼손' : '편한 손';
      return seated ? `${hand} · ${beat + 1}박 두드리기` : `${hand} · ${beat + 1}박 튀기기${round === 2 && beat === 4 ? ' · 옆으로 한 걸음' : ''}`;
    });
    return { title: ['박자 시동', '연결 작전', '움직이며 배송'][round],
      goal: round === 2 ? seated ? '팔을 옆으로 옮기며 8박자 연결하기' : '8박자 중 한 번 옆걸음하고 공을 다시 다루기' : '자기 속도로 8박자 연결하기',
      hint: '놓치면 공을 잡고 다음 박자에 다시 시작해요. 빠른 속도에 추가 점수는 없어요.',
      choices, cues: seated && round === 2 ? cues.map((c, i) => i === 4 ? c + ' · 팔을 옆으로' : c) : cues,
      cueMs: 60000 / (settings.gentle ? 60 : 80), repeats: round === 0 ? 2 : 3,
      confirmation: round === 2 ? '옆으로 움직이고 8박자를 한 번 이상 이었어요' : '8박자를 한 번 이상 이었어요' };
  }
  const players = Math.min(6, Math.max(2, Math.round(settings.players) || 2));
  const choices = [
    { id: 'wide', label: '가까이서 정확하게', detail: '표식을 가깝게 두고 천천히 굴려요.' },
    { id: 'space', label: '간격을 조금 넓혀 도전', detail: '모두 편한 범위에서만 거리를 늘려요.' },
  ];
  const starter = round % players + 1;
  const order = Array.from({ length: players }, (_, i) => (starter - 1 + i) % players + 1);
  const practice = settings.practice;
  const spacing = choiceId === 'space' ? '모두 편한 범위에서 표식 간격을 조금 넓히고, 더 먼 표적까지 공을 보내요.' : '공이 다음 표식에 멈추도록 가까운 거리에서 천천히 조절해요.';
  return { title: ['구조 연결 시작', '출발 역할 교대', '함께 돌아오기'][round],
    goal: practice ? '공을 표적으로 굴리고 회수한 뒤 빈 표식으로 이동하기' : '모두 한 번 이상 보내고 받고, 보낸 뒤 빈자리로 이동하기',
    hint: spacing + (practice ? ' 혼자서는 굴리기와 이동 규칙을 연습해요. 모둠 참여 기록으로 표시하지 않아요.' : ` 아래 순서로 원을 따라 서고 마지막 표식은 비워요. ${starter}번부터 다음 친구에게 보내요. 보낸 사람은 한 칸 뒤의 빈자리로 이동하고, 그 뒤 다음 친구가 보내요.`),
    choices, roles: practice ? ['혼자 굴리기 → 회수하기 → 빈자리로 이동'] : order.map((n, i) => `시계 방향 ${i + 1}번째 표식: ${n}번 친구`),
    cues: practice ? ['표적으로 굴려요', '공을 회수해요', seated ? '손을 빈 표식으로' : '빈 표식으로 걸어요'] :
      order.flatMap(n => [`${n}번 · 다음 친구에게 굴려요`, seated ? `${n}번 · 손을 빈 표식으로` : `${n}번 · 빈자리로 걸어요`]),
    cueMs: settings.gentle ? 6500 : 5000, repeats: 1,
    confirmation: practice ? '굴리기·회수·자리 바꾸기를 연습했어요' : '모두 보내고 받았고, 보낸 뒤 빈자리로 이동했어요' };
}

export function questDuration(plan: QuestRound): number { return plan.timing ? 60000 : plan.cues.length * plan.repeats * plan.cueMs; }
export function questAccurate(plan: QuestRound, record: Pick<QuestRecord,'answer'|'activeMs'>): boolean {
  if (plan.question && (record.answer?.length !== plan.question.answer.length || !record.answer.every((a,i) => a === plan.question!.answer[i]))) return false;
  return !plan.timing || Math.abs(record.activeMs / 1000 - plan.timing.targetSeconds) <= plan.timing.toleranceSeconds;
}
export function questCue(plan: QuestRound, activeMs: number): string {
  return plan.cues[Math.min(plan.cues.length * plan.repeats - 1, Math.floor(Math.max(0, activeMs) / plan.cueMs)) % plan.cues.length];
}
export function questResult(id: QuestId, settings: QuestSettings, records: readonly QuestRecord[]): { amount: number; details: GameResultDetails } | null {
  if (records.length !== 3 || records.some((record, index) => {
    const plan = makeQuestRound(id, index, settings, record.choice);
    const choice = plan.choices.find(c => c.id === record.choice);
    return record.round !== index || !choice || (choice.path && !safeRoute(choice.path, plan.blocked!)) ||
      !['complete', 'partial'].includes(record.outcome) || !Number.isFinite(record.activeMs) || record.activeMs < (plan.timing ? 1000 : questDuration(plan)) || record.activeMs > 7200000 ||
      (record.outcome === 'complete' && !questAccurate(plan, record)) ||
      !Number.isInteger(record.retries) || record.retries < 0;
  })) return null;
  const completed = records.filter(r => r.outcome === 'complete').length;
  return { amount: completed * 100, details: { totalTime: Math.round(records.reduce((s, r) => s + r.activeMs, 0) / 1000), metrics: {
    '기록 방식': '활동 후 직접 확인 · 센서 측정 아님', '작전 달성': `${completed}/3 · 직접 확인`,
    '참여 방식': settings.practice ? '혼자 규칙 연습 · 모둠 참여 미확인' : `${settings.players}명 함께 활동 · 직접 확인`,
    '활동 선택': `${settings.seated ? '앉아서' : '서서'} · ${settings.gentle ? '천천히' : '기본 속도'}`,
    '점수 기준': '달성했다고 확인한 작전당 100점 · 속도/횟수/운동량 평가 아님',
    '작전 선택': records.map((r, i) => `${i + 1}: ${makeQuestRound(id, i, settings).choices.find(c => c.id === r.choice)?.label}`).join(' / '),
    '다시 시도': `${records.reduce((s, r) => s + r.retries, 0)}회 · 감점 없음`,
    '시간 범위': '작전별 최종 시도 안내 시간 · 연습·재도전·휴식 제외',
    '기록 버전': '몸 미션 v1 · 이전 화면 게임 점수와 직접 비교하지 않아요',
  } } };
}
