import { useEffect, useRef } from 'react';

// 브라우저 AudioContext를 활용한 절차적 사운드 생성 엔진 (외부 MP3 파일 의존성 제거)
export const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    // 사용자 제스처 전까지는 AudioContext를 생성하지 않거나 suspend 상태임
    const initAudio = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.current.state === 'suspended') {
        audioCtx.current.resume();
      }
    };
    
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playBeep = () => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.current.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, audioCtx.current.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.current.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.3);
    
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.3);
  };

  const playSiren = () => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    osc.type = 'square';
    
    // 사이렌 위아래 주파수 변조
    for(let i=0; i<6; i++) {
      osc.frequency.setValueAtTime(600, audioCtx.current.currentTime + i);
      osc.frequency.linearRampToValueAtTime(1000, audioCtx.current.currentTime + i + 0.5);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.current.currentTime + i + 1);
    }

    gain.gain.setValueAtTime(0.2, audioCtx.current.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.current.currentTime + 6);
    
    osc.start();
    osc.stop(audioCtx.current.currentTime + 6);
  };

  const playVictory = () => {
    if (!audioCtx.current) return;
    // 아르페지오 팡파레
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((freq, i) => {
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, audioCtx.current.currentTime + i*0.1);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.current.currentTime + i*0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + i*0.1 + 1);
      
      osc.start(audioCtx.current.currentTime + i*0.1);
      osc.stop(audioCtx.current.currentTime + i*0.1 + 1);
    });
  };

  return { playBeep, playSiren, playVictory };
};
