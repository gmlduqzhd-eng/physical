import { useState, useEffect, useCallback } from 'react';
import { ScoreRepository } from '../data/scoreRepository';

export interface SyncAction {
  id: string;
  type: 'INCREMENT_SCORE' | 'UPDATE_MISSION';
  payload: any;
  timestamp: number;
}

export const useSyncQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<SyncAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // 네트워크 상태 실시간 감지 및 기존 큐 로드
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedQueue = localStorage.getItem('bomb_defusal_sync_queue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch(e) {
        console.error('Failed to parse sync queue', e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 큐 상태 변경 시 로컬 스토리지에 지속 저장
  useEffect(() => {
    localStorage.setItem('bomb_defusal_sync_queue', JSON.stringify(queue));
  }, [queue]);

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    const currentQueue = [...queue];
    setQueue([]); // 큐를 선행 비움 (중복 처리 방지)

    let failedActions: SyncAction[] = [];

    for (const action of currentQueue) {
      try {
        if (action.type === 'INCREMENT_SCORE') {
          await ScoreRepository.incrementScore(action.payload.id, action.payload.amount);
        } else if (action.type === 'UPDATE_MISSION') {
          await ScoreRepository.updateMissionStats(action.payload.id, action.payload.newStats);
        }
      } catch (err) {
        console.error('Failed to sync action', action, err);
        failedActions.push(action); // 실패한 액션은 다시 큐로 반환 대기
      }
    }

    if (failedActions.length > 0) {
      setQueue(prev => [...failedActions, ...prev]);
    }
    setIsSyncing(false);
  }, [queue, isSyncing]);

  // 온라인 전환 시 큐 비우기 처리
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      processQueue();
    }
  }, [isOnline, queue.length, isSyncing, processQueue]);

  const enqueueAction = useCallback((action: SyncAction) => {
    if (isOnline) {
      // 온라인일 때는 큐를 거치지 않고 바로 DB 실행 (Optimistic 방안)
      if (action.type === 'INCREMENT_SCORE') {
        ScoreRepository.incrementScore(action.payload.id, action.payload.amount).catch(() => {
            // 통신 실패시 큐에 임시 삽입
            setQueue(prev => [...prev, action]);
        });
      } else if (action.type === 'UPDATE_MISSION') {
        ScoreRepository.updateMissionStats(action.payload.id, action.payload.newStats).catch(() => {
            setQueue(prev => [...prev, action]);
        });
      }
    } else {
      // 오프라인일 때는 무조건 큐에 축적
      setQueue(prev => [...prev, action]);
    }
  }, [isOnline]);

  return { isOnline, queueLength: queue.length, isSyncing, enqueueAction };
};
