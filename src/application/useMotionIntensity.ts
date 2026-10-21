import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 실시간 움직임 강도(Motion Intensity) 측정 훅
 * DeviceMotion 이벤트의 가속도 데이터를 기반으로 움직임 게이지 값을 산출합니다.
 *
 * - 최근 2초간 가속도 크기의 이동 평균을 계산
 * - 0-100 범위로 정규화된 intensity 값 반환
 * - idle / low / active / vigorous 4단계 레벨 분류
 * - 누적 운동 에너지(totalEnergy) 추적
 * - React 상태 업데이트는 ~4Hz (250ms 간격)로 제한하여 렌더링 부담 최소화
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MotionIntensityLevel = 'idle' | 'low' | 'active' | 'vigorous';

export interface MotionIntensityState {
  /** 정규화된 움직임 강도 (0-100) */
  intensity: number;
  /** 현재 움직임 수준 */
  level: MotionIntensityLevel;
  /** 마운트 이후 누적 운동 에너지 */
  totalEnergy: number;
  /** DeviceMotion API 지원 여부 */
  isSupported: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 이동 평균 계산에 사용할 윈도우 크기 (2초, 60Hz 기준 약 120 샘플) */
const ROLLING_WINDOW_MS = 2000;

/** React 상태 업데이트 주기 (ms) – 약 4 Hz */
const STATE_UPDATE_INTERVAL_MS = 250;

/**
 * intensity 정규화에 사용하는 최대 가속도 크기 (m/s²).
 * 일반적인 격렬한 운동 시 가속도 변화량은 약 30 m/s² 안팎이므로
 * 이 값으로 나누어 0-100 스케일에 매핑합니다.
 */
const MAX_ACCELERATION_MAGNITUDE = 30;

/** 레벨 분류 임계값 */
const THRESHOLD_IDLE = 5;
const THRESHOLD_LOW = 20;
const THRESHOLD_ACTIVE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyLevel(intensity: number): MotionIntensityLevel {
  if (intensity < THRESHOLD_IDLE) return 'idle';
  if (intensity < THRESHOLD_LOW) return 'low';
  if (intensity < THRESHOLD_ACTIVE) return 'active';
  return 'vigorous';
}

function checkDeviceMotionSupport(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.DeviceMotionEvent === 'undefined') return false;
  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMotionIntensity(): MotionIntensityState {
  const [state, setState] = useState<MotionIntensityState>({
    intensity: 0,
    level: 'idle',
    totalEnergy: 0,
    isSupported: false,
  });

  // Mutable refs – 센서 이벤트 콜백에서 직접 갱신하여 불필요한 리렌더 방지
  const samplesRef = useRef<{ time: number; magnitude: number }[]>([]);
  const totalEnergyRef = useRef(0);
  const isSupportedRef = useRef(false);

  // DeviceMotion 이벤트 핸들러 (유효한 센서 숫자가 있을 때만 true 반환)
  const handleMotion = useCallback((event: DeviceMotionEvent): boolean => {
    const now = performance.now();

    const hasLinear =
      event.acceleration != null &&
      (typeof event.acceleration.x === 'number' ||
        typeof event.acceleration.y === 'number' ||
        typeof event.acceleration.z === 'number');
    const accel = hasLinear ? event.acceleration : event.accelerationIncludingGravity;
    if (!accel) return false;

    const rawX = accel.x;
    const rawY = accel.y;
    const rawZ = accel.z;
    if (
      (rawX == null || !Number.isFinite(rawX)) &&
      (rawY == null || !Number.isFinite(rawY)) &&
      (rawZ == null || !Number.isFinite(rawZ))
    ) {
      return false;
    }

    const x = typeof rawX === 'number' && Number.isFinite(rawX) ? rawX : 0;
    const y = typeof rawY === 'number' && Number.isFinite(rawY) ? rawY : 0;
    const z = typeof rawZ === 'number' && Number.isFinite(rawZ) ? rawZ : 0;

    // accelerationIncludingGravity를 사용하는 경우 중력(~9.8) 기저선 제거
    const rawMagnitude = Math.sqrt(x * x + y * y + z * z);
    const magnitude = hasLinear
      ? rawMagnitude
      : Math.abs(rawMagnitude - 9.8);

    // 이동 평균 윈도우에 샘플 추가
    samplesRef.current.push({ time: now, magnitude });

    // 2초 이전 샘플 제거
    const cutoff = now - ROLLING_WINDOW_MS;
    samplesRef.current = samplesRef.current.filter((s) => s.time >= cutoff);

    // 누적 에너지 갱신 (가속도 크기 합산)
    totalEnergyRef.current += magnitude;
    return true;
  }, []);

  useEffect(() => {
    const hasApi = checkDeviceMotionSupport();

    if (!hasApi) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    // 실제 유효한 센서 데이터가 한 번이라도 수신되어야 supported로 전환
    let receivedData = false;
    let intervalId: number | null = null;

    const wrappedHandler = (event: DeviceMotionEvent) => {
      const valid = handleMotion(event);
      if (!valid) return;
      if (!receivedData) {
        receivedData = true;
        isSupportedRef.current = true;
        setState((prev) => ({ ...prev, isSupported: true }));

        // 센서 데이터 수신 확인 후에만 상태 동기화 interval 시작
        intervalId = window.setInterval(() => {
          const samples = samplesRef.current;
          const avg =
            samples.length > 0
              ? samples.reduce((sum, s) => sum + s.magnitude, 0) / samples.length
              : 0;

          const intensity = Math.min(100, (avg / MAX_ACCELERATION_MAGNITUDE) * 100);
          const level = classifyLevel(intensity);

          setState({
            intensity: Math.round(intensity * 10) / 10,
            level,
            totalEnergy: Math.round(totalEnergyRef.current),
            isSupported: true,
          });
        }, STATE_UPDATE_INTERVAL_MS);
      }
    };

    // 센서 이벤트 등록
    window.addEventListener('devicemotion', wrappedHandler as EventListener);

    return () => {
      window.removeEventListener('devicemotion', wrappedHandler as EventListener);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [handleMotion]);

  return state;
}
