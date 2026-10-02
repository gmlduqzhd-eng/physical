import { useCallback, useEffect, useRef, useState } from 'react';
import { readStorage, writeStorage } from './browserStorage';

export interface VoiceCoachOptions {
  enabled?: boolean;
  rate?: number; // 0.8 ~ 1.2
  pitch?: number;
}

export const useVoiceCoach = (options: VoiceCoachOptions = {}) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const saved = readStorage('voice_coach_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const synth = useRef<SpeechSynthesis | null>(null);
  const koreanVoice = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synth.current = window.speechSynthesis;
      
      const loadVoices = () => {
        if (!synth.current) return;
        const voices = synth.current.getVoices();
        // 한국어 음성 우선 탐색 (ko-KR)
        const ko = voices.find(v => v.lang.startsWith('ko')) || null;
        koreanVoice.current = ko;
      };

      loadVoices();
      const speech = synth.current;
      speech.addEventListener('voiceschanged', loadVoices);
      return () => { speech.removeEventListener('voiceschanged', loadVoices); };
    }
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      writeStorage('voice_coach_enabled', String(next));
      if (!next && synth.current) {
        synth.current.cancel();
      }
      return next;
    });
  }, []);

  const speak = useCallback((text: string, priority = false) => {
    if (!enabled || options.enabled === false || !synth.current) return;

    try {
      if (priority) {
        synth.current.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = options.rate ?? 1.05;
      utterance.pitch = options.pitch ?? 1.0;
      if (koreanVoice.current) {
        utterance.voice = koreanVoice.current;
      }
      synth.current.speak(utterance);
    } catch {
      // 일부 브라우저 예외 무시
    }
  }, [enabled, options.enabled, options.rate, options.pitch]);

  const speakCountdown = useCallback((count: number) => {
    if (count > 0) {
      speak(String(count), true);
    } else if (count === 0) {
      speak('시작!', true);
    }
  }, [speak]);

  const stop = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // 브라우저 예외 무시
    }
  }, []);

  // 훅을 사용하는 컴포넌트 언마운트 시 음성 자동 중단
  useEffect(() => {
    return () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // 브라우저 예외 무시
      }
    };
  }, []);

  return {
    enabled,
    toggleEnabled,
    speak,
    speakCountdown,
    stop
  };
};
