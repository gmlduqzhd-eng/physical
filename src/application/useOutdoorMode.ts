import { useState, useEffect, useCallback } from 'react';
import { readStorage, writeStorage } from './browserStorage';
import { useWakeLock } from './useWakeLock';

export const useOutdoorMode = () => {
  const [isOutdoorMode, setIsOutdoorMode] = useState(() => {
    return readStorage('physical_outdoor_mode') === 'true';
  });

  useWakeLock(isOutdoorMode);

  // 고대비 클래스 토글
  useEffect(() => {
    writeStorage('physical_outdoor_mode', String(isOutdoorMode));
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
      try { navigator.vibrate(pattern); } catch { /* Vibration is optional. */ }
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
      try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      } catch { /* Voice guidance is optional. */ }
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
