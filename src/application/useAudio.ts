import { useEffect, useRef } from 'react';

// 브라우저 AudioContext를 활용한 절차적 사운드 생성 엔진 (외부 MP3 파일 의존성 제거)
export const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const lastSirenPlay = useRef(0);

  const getAudioCtx = () => {
    if (!audioCtx.current) {
      const AudioCtxConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxConstructor) {
        audioCtx.current = new AudioCtxConstructor();
      }
    }
    if (audioCtx.current && audioCtx.current.state === 'suspended') {
      audioCtx.current.resume().catch(() => {});
    }
    return audioCtx.current;
  };

  useEffect(() => {
    const initAudio = () => {
      getAudioCtx();
    };
    
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playBeep = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const playSiren = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // 6초 이내 중복 재생 방지 (청각 테러 차단)
    if (Date.now() - lastSirenPlay.current < 6000) return;
    lastSirenPlay.current = Date.now();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    
    // 사이렌 위아래 주파수 변조
    for(let i=0; i<6; i++) {
      osc.frequency.setValueAtTime(600, ctx.currentTime + i);
      osc.frequency.linearRampToValueAtTime(1000, ctx.currentTime + i + 0.5);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + i + 1);
    }

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 6);
    
    osc.start();
    osc.stop(ctx.currentTime + 6);
  };

  const playVictory = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // 아르페지오 팡파레
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, ctx.currentTime + i*0.1);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i*0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i*0.1 + 1);
      
      osc.start(ctx.currentTime + i*0.1);
      osc.stop(ctx.currentTime + i*0.1 + 1);
    });
  };

  return { playBeep, playSiren, playVictory };
};
