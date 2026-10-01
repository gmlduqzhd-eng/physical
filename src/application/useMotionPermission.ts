import { useState, useCallback, useEffect } from 'react';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export function useMotionPermission() {
  const [status, setStatus] = useState<PermissionStatus>('prompt');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setStatus('unsupported');
      return;
    }

    const anyMotion = window.DeviceMotionEvent as any;
    if (!anyMotion) {
      setStatus('unsupported');
      return;
    }

    // iOS 13+ 가 아닌 브라우저(안드로이드, 데스크톱 등)는 권한 요청 함수가 없고 기본 허용됨
    if (typeof anyMotion.requestPermission !== 'function') {
      setStatus('granted');
      return;
    }

    // iOS 사파리에서 저장된 권한 상태 확인 (세션 기준)
    const saved = sessionStorage.getItem('motion_permission_status');
    if (saved === 'granted') {
      setStatus('granted');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const anyMotion = window.DeviceMotionEvent as any;

    if (typeof anyMotion !== 'undefined' && typeof anyMotion.requestPermission === 'function') {
      try {
        const response = await anyMotion.requestPermission();
        if (response === 'granted') {
          setStatus('granted');
          sessionStorage.setItem('motion_permission_status', 'granted');
          return true;
        } else {
          setStatus('denied');
          return false;
        }
      } catch (e) {
        console.warn('Motion permission request failed:', e);
        setStatus('denied');
        return false;
      }
    } else {
      // 일반 브라우저
      setStatus('granted');
      return true;
    }
  }, []);

  return {
    status,
    isGranted: status === 'granted',
    requestPermission,
  };
}
