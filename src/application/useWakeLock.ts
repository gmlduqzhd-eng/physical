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

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (!('wakeLock' in navigator)) return false;
    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        setIsActive(true);
        return true;
      }
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);

      sentinel.addEventListener('release', () => {
        setIsActive(false);
      });
      return true;
    } catch {
      setIsActive(false);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async (): Promise<void> => {
    try {
      if (sentinelRef.current) {
        await sentinelRef.current.release();
        sentinelRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (!autoAcquire) return;

    requestWakeLock();

    // 탭을 다른 곳으로 전환했다가 다시 돌아왔을 때 WakeLock 다시 획득
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoAcquire) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [autoAcquire, requestWakeLock, releaseWakeLock]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock
  };
}
