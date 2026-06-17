import { useEffect, useRef } from 'react';

// 브라우저 AudioContext를 활용한 절차적 사운드 생성 엔진 (외부 MP3 파일 의존성 제거)
export const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const lastSirenPlay = useRef(0);

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
    // 6초 이내 중복 재생 방지 (청각 테러 차단)
    if (Date.now() - lastSirenPlay.current < 6000) return;
    lastSirenPlay.current = Date.now();
    
    const ctx = audioCtx.current;
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
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
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
