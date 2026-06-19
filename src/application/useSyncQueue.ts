import { useState, useEffect, useCallback } from 'react';
import { ScoreRepository } from '../data/scoreRepository';

export interface SyncAction {
  id: string;
  type: 'INCREMENT_SCORE';
  payload: { id: string; amount: number; [key: string]: unknown };
  timestamp: number;
}

export const useSyncQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<SyncAction[]>(() => {
    const savedQueue = localStorage.getItem('bomb_defusal_sync_queue');
    if (savedQueue) {
      try {
        return JSON.parse(savedQueue);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('bomb_defusal_sync_queue', JSON.stringify(queue));
  }, [queue]);

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    const currentQueue = [...queue];
    setQueue([]);

    const failedActions: SyncAction[] = [];

    for (const action of currentQueue) {
      try {
        if (action.type === 'INCREMENT_SCORE') {
          await ScoreRepository.incrementScore(action.payload.id, action.payload.amount);
        }
      } catch (err) {
        console.error('Failed to sync action', action, err);
        failedActions.push(action);
      }
    }

    if (failedActions.length > 0) {
      setQueue(prev => [...failedActions, ...prev]);
    }
    setIsSyncing(false);
  }, [queue, isSyncing]);

  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      processQueue();
    }
  }, [isOnline, queue.length, isSyncing, processQueue]);

  const enqueueAction = useCallback((action: SyncAction) => {
    if (isOnline) {
      if (action.type === 'INCREMENT_SCORE') {
        ScoreRepository.incrementScore(action.payload.id, action.payload.amount).catch(() => {
            setQueue(prev => [...prev, action]);
        });
      }
    } else {
      setQueue(prev => [...prev, action]);
    }
  }, [isOnline]);

  return { isOnline, queueLength: queue.length, isSyncing, enqueueAction };
};
