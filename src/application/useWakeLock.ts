import { useEffect, useRef, useState, useCallback } from 'react';

export interface WakeLockState {
  isSupported: boolean;
  isActive: boolean;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => Promise<void>;
}

export function useWakeLock(autoAcquire: boolean = true): WakeLockState {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const pendingRef = useRef<Promise<boolean> | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return false;
    if (sentinelRef.current && !sentinelRef.current.released) {
      setIsActive(true);
      return true;
    }
    if (pendingRef.current) return pendingRef.current;
    const generation = generationRef.current;
    const pending = (async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        // A permission response can arrive after the component closes.
        if (generation !== generationRef.current) {
          await sentinel.release();
          return false;
        }
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            setIsActive(false);
          }
        }, { once: true });
        return true;
      } catch {
        if (generation === generationRef.current) setIsActive(false);
        return false;
      }
    })();
    pendingRef.current = pending;
    try { return await pending; } finally {
      if (pendingRef.current === pending) pendingRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async (): Promise<void> => {
    generationRef.current += 1;
    pendingRef.current = null;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    try {
      if (sentinel && !sentinel.released) {
        await sentinel.release();
      }
    } catch {
      // ignore
    } finally {
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (autoAcquire) void requestWakeLock();

    // 탭을 다른 곳으로 전환했다가 다시 돌아왔을 때 WakeLock 다시 획득
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoAcquire) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [autoAcquire, requestWakeLock, releaseWakeLock]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock
  };
}
