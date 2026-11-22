/**
 * 오프라인 점수 대기열의 순수 규칙(화면·저장소·네트워크와 떨어져 있어 그대로 시험할 수 있다).
 * useSyncQueue가 이 규칙을 써서 저장·재시도·버리기를 한다.
 */
import { isFreshClassroomRecord } from './storageRetention';
import { isRecord } from './browserStorage';

export interface SyncAction {
  id: string;
  type: 'INCREMENT_SCORE';
  payload: { id: string; amount: number; [key: string]: unknown };
  timestamp: number;
  retryCount?: number;
  nextRetryAt?: number;
}
export type ScoreSaveResult = 'saved' | 'pending' | 'obsolete' | 'retry';

export const SYNC_WARNING = {
  obsolete: '수업 상태·점수 한도·참여 권한 때문에 저장하지 못했습니다. 선생님께 확인해 주세요.',
  pending: '게임 점수를 제출했습니다. 선생님이 확인한 뒤 모둠 점수에 반영됩니다.',
  expired: (count: number) => `너무 오래 기다린 점수 ${count}개는 보내지 못했어요. 선생님께 말해요.`,
  leaving: '아직 선생님께 보내지 못한 점수가 있어요. 화면을 닫으면 사라져요.',
} as const;

/** 저장소에서 읽은 값 중 쓸 수 있는 대기 항목만 고른다(모양이 틀리거나, 같은 id가 또 나오거나, 8시간이 지난 것은 뺀다). */
export function parseSyncQueue(value: unknown, now = Date.now()): SyncAction[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((action): action is SyncAction => {
    if (!isRecord(action) || typeof action.id !== 'string' || !action.id || action.id.length > 128 || ids.has(action.id) || action.type !== 'INCREMENT_SCORE' || !isRecord(action.payload) || typeof action.payload.id !== 'string' || !Number.isSafeInteger(action.payload.amount) || Math.abs(Number(action.payload.amount)) > 1000000 || !isFreshClassroomRecord(action.timestamp, now)) return false;
    ids.add(action.id); return true;
  });
}

/** 재시도 간격: 2초, 4초, 8초, 16초, 그 뒤로는 30초. */
export function retryDelayMs(retries: number): number {
  return Math.min(30000, 1000 * 2 ** Math.min(Math.max(1, retries), 5));
}

/** 보내지 못한 항목에 재시도 횟수와 다음 시도 시각을 적는다. */
export function failedAction(action: SyncAction, now = Date.now()): SyncAction {
  const retries = (action.retryCount || 0) + 1;
  return { ...action, retryCount: retries, nextRetryAt: now + retryDelayMs(retries) };
}

/** 지금 보낼 항목(다음 시도 시각이 가장 이른 것)과 기다릴 시간. */
export function dueAction(queue: readonly SyncAction[], now = Date.now()): { action: SyncAction; delay: number } | null {
  if (!queue.length) return null;
  const action = [...queue].sort((left, right) => (left.nextRetryAt || 0) - (right.nextRetryAt || 0))[0];
  return { action, delay: Math.max(0, (action.nextRetryAt || 0) - now) };
}

/** 8시간이 지나 버려야 하는 항목을 가른다. */
export function splitExpired(queue: readonly SyncAction[], now = Date.now()): { fresh: SyncAction[]; expired: SyncAction[] } {
  const fresh: SyncAction[] = [], expired: SyncAction[] = [];
  for (const action of queue) (isFreshClassroomRecord(action.timestamp, now) ? fresh : expired).push(action);
  return { fresh, expired };
}

/**
 * 한 항목을 서버에 보낸 결과를 정리한다.
 * - saved: 대기열에서 빼고, 앞서 띄운 안내도 지운다.
 * - pending·obsolete: 대기열에서 빼고 안내를 띄운다(다시 보내도 결과가 같다).
 * - retry(또는 오류): 대기열에 두고 다음 시도 시각을 적는다.
 */
export async function settleSyncAction(
  action: SyncAction,
  save: (action: SyncAction) => Promise<ScoreSaveResult>,
  now: () => number = Date.now,
): Promise<{ done: true; warning: string | null } | { done: false; failed: SyncAction }> {
  let result: ScoreSaveResult;
  try { result = await save(action); } catch { result = 'retry'; }
  if (result === 'retry') return { done: false, failed: failedAction(action, now()) };
  return { done: true, warning: result === 'saved' ? null : SYNC_WARNING[result] };
}

/** 같은 id가 이미 있거나 모양이 틀린 항목은 대기열에 넣지 않는다. */
export function canEnqueue(queue: readonly SyncAction[], action: SyncAction, now = Date.now()): boolean {
  return parseSyncQueue([action], now).length === 1 && !queue.some(item => item.id === action.id);
}
