import { cleanClassroomStorage, isFreshClassroomRecord } from './storageRetention';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ScoreRepository } from '../data/scoreRepository';
import { readStorage, readJsonStorage, writeStorage, removeStorage, deviceStorageGeneration } from './browserStorage';
import { SYNC_WARNING, canEnqueue, dueAction, parseSyncQueue, settleSyncAction, splitExpired, type SyncAction } from './syncQueueLogic';
export { parseSyncQueue, type SyncAction } from './syncQueueLogic';

const LEGACY_KEY = 'bomb_defusal_sync_queue';
const PREFIX = 'physical_sync_action_';
const QUEUE_EVENT = 'physical-score-queue-change';
// Keep unacknowledged actions across route changes even when storage is denied.
const volatileActions = new Map<string, SyncAction>();
const storageFailures = new Set<string>();
function persistAction(action: SyncAction): boolean {
  volatileActions.set(action.id, action);
  const saved = writeStorage(PREFIX + action.id, JSON.stringify(action));
  if (saved) storageFailures.delete(action.id);
  else storageFailures.add(action.id);
  return storageFailures.size === 0;
}
const notifyQueue = (detail: { action?: SyncAction; removedId?: string }) => window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail }));
function loadActions(): SyncAction[] {
  cleanClassroomStorage();
  const actions: unknown[] = [];
  try {
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(PREFIX)) actions.push(readJsonStorage(key));
    }
  } catch { /* In-memory submissions remain usable when storage is denied. */ }
  const merged = new Map(parseSyncQueue(actions).map(action => [action.id, action]));
  for (const action of volatileActions.values()) {
    if (isFreshClassroomRecord(action.timestamp)) merged.set(action.id, action);
    else { volatileActions.delete(action.id); storageFailures.delete(action.id); }
  }
  return [...merged.values()].sort((left, right) => left.timestamp - right.timestamp);
}
function initialQueue(): SyncAction[] {
  removeStorage(LEGACY_KEY);
  cleanClassroomStorage();
  return loadActions();
}
const inFlight = new Set<string>();
export const useSyncQueue = (enabled = true) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [initial] = useState(() => {
    if (!enabled) return { actions: [] as SyncAction[], storageAvailable: true };
    const actions = initialQueue();
    return { actions, storageAvailable: storageFailures.size === 0 && actions.every(action => readStorage(PREFIX + action.id) !== null) };
  });
  const [queue, setQueue] = useState(initial.actions);
  const [isSyncing, setIsSyncing] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(initial.storageAvailable);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const updateQueue = useCallback((next: SyncAction[]) => { queueRef.current = next; setQueue(next); }, []);

  useEffect(() => {
    if (!enabled) return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    // 대기열은 탭마다 따로 둔다(sessionStorage). 다른 탭의 storage 이벤트는 오지 않으므로 듣지 않는다.
    const handleQueueEvent = (event: Event) => {
      const { action, removedId } = (event as CustomEvent<{ action?: SyncAction; removedId?: string }>).detail;
      const retained = queueRef.current.filter(item => item.id !== removedId && item.id !== action?.id);
      updateQueue(action ? [...retained, action] : retained);
      setStorageAvailable(storageFailures.size === 0);
    };
    const clear = () => { volatileActions.clear(); storageFailures.clear(); updateQueue([]); };
    window.addEventListener('physical-device-cleared', clear);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(QUEUE_EVENT, handleQueueEvent);
    return () => { window.removeEventListener('physical-device-cleared', clear); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); window.removeEventListener(QUEUE_EVENT, handleQueueEvent); };
  }, [enabled, updateQueue]);

  useEffect(() => {
    if (!enabled || !isOnline || queue.length === 0) return;
    let cancelled = false;
    const { expired } = splitExpired(queue);
    if (expired.length) {
      // 8시간이 지난 점수는 서버가 받지 않는다. 말없이 버리지 않고 학생에게 알린다.
      for (const item of expired) { removeStorage(PREFIX + item.id); volatileActions.delete(item.id); storageFailures.delete(item.id); }
      setSyncWarning(SYNC_WARNING.expired(expired.length));
      updateQueue(loadActions());
      return;
    }
    const { action, delay } = dueAction(queue)!;
    const timer = window.setTimeout(async () => {
      if (cancelled || inFlight.has(action.id)) return;
      const generation=deviceStorageGeneration();
      inFlight.add(action.id); setIsSyncing(true);
      try {
        const execute = async () => {
          const outcome = await settleSyncAction(action, item => ScoreRepository.saveScoreAction(item.payload.id, item.payload.amount, item.id, typeof item.payload.activityId === 'string' ? item.payload.activityId : 'classroom-extra'));
          if (!outcome.done) {
            if (generation!==deviceStorageGeneration()) return;
            setStorageAvailable(persistAction(outcome.failed));
            updateQueue(queueRef.current.map(item => item.id === action.id ? outcome.failed : item));
            notifyQueue({ action: outcome.failed });
            return;
          }
          // 잘 보냈으면 앞서 띄운 안내를 지우고, 확인 대기·저장 불가면 그 안내를 띄운다.
          setSyncWarning(outcome.warning);
          removeStorage(PREFIX + action.id);
          volatileActions.delete(action.id); storageFailures.delete(action.id);
          setStorageAvailable(storageFailures.size === 0);
          updateQueue(queueRef.current.filter(item => item.id !== action.id));
          notifyQueue({ removedId: action.id });
        };
        if (navigator.locks) await navigator.locks.request('physical-score-' + action.id, execute);
        else await execute();
      } finally { inFlight.delete(action.id); setIsSyncing(false); }
    }, delay);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [enabled, queue, isOnline, storageAvailable, updateQueue]);

  // 아직 보내지 못한 점수가 있는데 화면을 닫으려 하면 브라우저가 한 번 더 묻게 한다(대기열은 탭을 닫으면 사라진다).
  const hasPending = enabled && queue.length > 0;
  useEffect(() => {
    if (!hasPending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = SYNC_WARNING.leaving; return SYNC_WARNING.leaving; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasPending]);

  const enqueueAction = useCallback((action: SyncAction) => {
    if (!enabled) return;
    if (!canEnqueue(queueRef.current, action)) return;
    setStorageAvailable(persistAction(action));
    updateQueue([...queueRef.current, action]);
    notifyQueue({ action });
  }, [enabled, updateQueue]);

  return { isOnline, queueLength: queue.length, isSyncing, enqueueAction, storageAvailable, syncWarning };
};
