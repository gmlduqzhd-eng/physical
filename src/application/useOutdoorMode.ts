import { useState, useEffect, useCallback } from 'react';

export const useOutdoorMode = () => {
  const [isOutdoorMode, setIsOutdoorMode] = useState(() => {
    return localStorage.getItem('physical_outdoor_mode') === 'true';
  });

  // Wake Lock - 화면 자동 꺼짐 방지
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if (isOutdoorMode && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch { /* 무시 */ }
      }
    };

    requestWakeLock();

    // 탭 전환 후 복귀 시 재요청
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOutdoorMode) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      wakeLock?.release();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOutdoorMode]);

  // 고대비 클래스 토글
  useEffect(() => {
    localStorage.setItem('physical_outdoor_mode', String(isOutdoorMode));
    if (isOutdoorMode) {
      document.documentElement.classList.add('outdoor-mode');
    } else {
      document.documentElement.classList.remove('outdoor-mode');
    }
  }, [isOutdoorMode]);

  const toggleOutdoorMode = () => setIsOutdoorMode(prev => !prev);

  // 진동 피드백
  const vibrate = useCallback((pattern: number | number[] = 100) => {
    if (isOutdoorMode && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [isOutdoorMode]);

  // 성공 진동 (짧은 3연타)
  const vibrateSuccess = useCallback(() => vibrate([50, 30, 50, 30, 50]), [vibrate]);
  
  // 실패 진동 (긴 1회)
  const vibrateFail = useCallback(() => vibrate(300), [vibrate]);

  // 시간 종료 진동 (긴 2회)
  const vibrateTimeUp = useCallback(() => vibrate([500, 200, 500]), [vibrate]);

  // TTS 음성 안내
  const speak = useCallback((text: string) => {
    if (isOutdoorMode && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [isOutdoorMode]);

  return { 
    isOutdoorMode, 
    toggleOutdoorMode, 
    vibrate, 
    vibrateSuccess, 
    vibrateFail, 
    vibrateTimeUp, 
    speak 
  };
};
