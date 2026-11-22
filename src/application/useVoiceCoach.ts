import {useActivityPause} from './ActivityPauseContext';
import { useCallback, useEffect, useRef } from 'react';
import { setVoiceOn, useVoicePrefs } from './voicePrefs';

export interface VoiceCoachOptions {
  enabled?: boolean;
  rate?: number; // 0.8 ~ 1.2
  pitch?: number;
}

export const useVoiceCoach = (options: VoiceCoachOptions = {}) => {
  // 음성 안내 켜기·끄기는 TV 음성 안내와 같은 설정 하나를 쓴다(어디서 끄든 모두 꺼진다).
  const enabled = useVoicePrefs().on;
  const paused=useActivityPause(),pausedRef=useRef(paused);pausedRef.current=paused;
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

  useEffect(()=>{if(paused)synth.current?.cancel();},[paused]);
  useEffect(() => { if (!enabled) synth.current?.cancel(); }, [enabled]);
  const toggleEnabled = useCallback(() => { setVoiceOn(!enabled); }, [enabled]);

  const speak = useCallback((text: string, priority = false) => {
    if (pausedRef.current||!enabled || options.enabled === false || !synth.current) return;

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
