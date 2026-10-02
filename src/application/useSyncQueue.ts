import { useState, useEffect, useCallback, useRef } from 'react';
import { ScoreRepository } from '../data/scoreRepository';
import { readStorage, readJsonStorage, writeStorage, removeStorage, isRecord } from './browserStorage';

export interface SyncAction {
  id: string;
  type: 'INCREMENT_SCORE';
  payload: { id: string; amount: number; [key: string]: unknown };
  timestamp: number;
  retryCount?: number;
  nextRetryAt?: number;
}
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
export function parseSyncQueue(value: unknown): SyncAction[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((action): action is SyncAction => {
    if (!isRecord(action) || typeof action.id !== 'string' || !action.id || action.id.length > 128 || ids.has(action.id) || action.type !== 'INCREMENT_SCORE' || !isRecord(action.payload) || typeof action.payload.id !== 'string' || !Number.isSafeInteger(action.payload.amount) || Math.abs(Number(action.payload.amount)) > 1000000 || !Number.isFinite(action.timestamp)) return false;
    ids.add(action.id); return true;
  });
}
function loadActions(): SyncAction[] {
  const actions: unknown[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) actions.push(readJsonStorage(key));
    }
  } catch { /* In-memory submissions remain usable when storage is denied. */ }
  const merged = new Map(parseSyncQueue(actions).map(action => [action.id, action]));
  for (const action of volatileActions.values()) merged.set(action.id, action);
  return [...merged.values()].sort((left, right) => left.timestamp - right.timestamp);
}
function initialQueue(): SyncAction[] {
  const legacy = parseSyncQueue(readJsonStorage(LEGACY_KEY));
  let migrated = true;
  for (const action of legacy) migrated = persistAction(action) && migrated;
  if (migrated) removeStorage(LEGACY_KEY);
  return parseSyncQueue([...loadActions(), ...legacy]);
}
const inFlight = new Set<string>();
export const useSyncQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [initial] = useState(() => {
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(PREFIX)) {
        if (event.newValue === null) {
          const id = event.key.slice(PREFIX.length);
          volatileActions.delete(id); storageFailures.delete(id);
        }
        updateQueue(loadActions());
        setStorageAvailable(storageFailures.size === 0);
      }
    };
    const handleQueueEvent = (event: Event) => {
      const { action, removedId } = (event as CustomEvent<{ action?: SyncAction; removedId?: string }>).detail;
      const retained = queueRef.current.filter(item => item.id !== removedId && item.id !== action?.id);
      updateQueue(action ? [...retained, action] : retained);
      setStorageAvailable(storageFailures.size === 0);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(QUEUE_EVENT, handleQueueEvent);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); window.removeEventListener('storage', handleStorage); window.removeEventListener(QUEUE_EVENT, handleQueueEvent); };
  }, [updateQueue]);

  useEffect(() => {
    if (!isOnline || queue.length === 0) return;
    let cancelled = false;
    const action = [...queue].sort((left, right) => (left.nextRetryAt || 0) - (right.nextRetryAt || 0))[0];
    const delay = Math.max(0, (action.nextRetryAt || 0) - Date.now());
    const timer = window.setTimeout(async () => {
      if (cancelled || inFlight.has(action.id)) return;
      inFlight.add(action.id); setIsSyncing(true);
      try {
        const execute = async () => {
          const result = await ScoreRepository.saveScoreAction(action.payload.id, action.payload.amount, action.id);
          if (result === 'retry') throw new Error('Score request failed');
          if (result === 'obsolete') setSyncWarning('삭제된 수업 또는 모둠의 점수는 저장할 수 없어 대기 목록에서 정리했습니다.');
          removeStorage(PREFIX + action.id);
          volatileActions.delete(action.id); storageFailures.delete(action.id);
          setStorageAvailable(storageFailures.size === 0);
          updateQueue(queueRef.current.filter(item => item.id !== action.id));
          notifyQueue({ removedId: action.id });
        };
        if (navigator.locks) await navigator.locks.request('physical-score-' + action.id, execute);
        else await execute();
      } catch {
        const retries = (action.retryCount || 0) + 1;
        const failed = { ...action, retryCount: retries, nextRetryAt: Date.now() + Math.min(30000, 1000 * 2 ** Math.min(retries, 5)) };
        setStorageAvailable(persistAction(failed));
        updateQueue(queueRef.current.map(item => item.id === action.id ? failed : item));
        notifyQueue({ action: failed });
      } finally { inFlight.delete(action.id); setIsSyncing(false); }
    }, delay);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [queue, isOnline, storageAvailable, updateQueue]);

  const enqueueAction = useCallback((action: SyncAction) => {
    if (parseSyncQueue([action]).length !== 1 || queueRef.current.some(item => item.id === action.id)) return;
    setStorageAvailable(persistAction(action));
    updateQueue([...queueRef.current, action]);
    notifyQueue({ action });
  }, [updateQueue]);

  return { isOnline, queueLength: queue.length, isSyncing, enqueueAction, storageAvailable, syncWarning };
};
