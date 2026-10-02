import { useState, useCallback, useEffect } from 'react';
import { readStorage, writeStorage } from './browserStorage';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';
type SensorEventConstructor = { requestPermission?: () => Promise<string> };
const PERMISSION_KEY = 'motion_orientation_permission_status';

const sensorConstructors = () => [window.DeviceMotionEvent, window.DeviceOrientationEvent]
  .filter(Boolean) as SensorEventConstructor[];

export function useMotionPermission() {
  const [status, setStatus] = useState<PermissionStatus>('prompt');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setStatus('unsupported');
      return;
    }

    const sensors = sensorConstructors();
    if (!window.isSecureContext || sensors.length === 0) {
      setStatus('unsupported');
      return;
    }

    // iOS 13+ 가 아닌 브라우저(안드로이드, 데스크톱 등)는 권한 요청 함수가 없고 기본 허용됨
    if (sensors.every(sensor => typeof sensor.requestPermission !== 'function')) {
      setStatus('granted');
      return;
    }

    // iOS 사파리에서 저장된 권한 상태 확인 (세션 기준)
    const saved = readStorage(PERMISSION_KEY, 'session');
    if (saved === 'granted') {
      setStatus('granted');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const sensors = sensorConstructors();

    if (sensors.length === 0 || !window.isSecureContext) {
      setStatus('unsupported');
      return false;
    }

    if (sensors.some(sensor => typeof sensor.requestPermission === 'function')) {
      try {
        // Invoke both APIs before awaiting so iOS retains the original button gesture.
        const responses = await Promise.all(sensors.map(sensor => sensor.requestPermission?.() ?? Promise.resolve('granted')));
        if (responses.every(response => response === 'granted')) {
          setStatus('granted');
          writeStorage(PERMISSION_KEY, 'granted', 'session');
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
