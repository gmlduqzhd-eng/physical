import { useState, useEffect, useRef, useCallback } from 'react';
import { GameIcons as LucideIcons } from '../../icons';

interface Props { groupId: string; enqueueAction: (action: any) => void; }

export const ScreamGame = ({ groupId, enqueueAction }: Props) => {
  const [volume, setVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [micFailed, setMicFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const maxVolumeRef = useRef(0);
  const sessionRef = useRef(0);

  const stopMicrophone = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  useEffect(() => () => { sessionRef.current += 1; stopMicrophone(); }, [stopMicrophone]);

  const finishGame = useCallback((victory: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    sessionRef.current += 1;
    stopMicrophone();
    setFinished(true);
    setWon(victory);
    enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: victory ? 500 : 0 }, timestamp: Date.now() });
  }, [enqueueAction, groupId, stopMicrophone]);

  useEffect(() => {
    if (!started || finished) return;
    const timer = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [started, finished]);

  useEffect(() => { if (started && timeLeft === 0) finishGame(false); }, [started, timeLeft, finishGame]);

  const startFallback = () => {
    sessionRef.current += 1;
    stopMicrophone();
    setRequesting(false);
    setMicFailed(true);
    setStarted(true);
  };

  const startMic = async () => {
    if (requesting || started || finishedRef.current) return;
    const session = ++sessionRef.current;
    setRequesting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable');
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextConstructor() as AudioContext;
      audioContextRef.current = audioCtx;
      await audioCtx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (session !== sessionRef.current || finishedRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      setRequesting(false);
      setStarted(true);
      const checkVolume = () => {
        if (session !== sessionRef.current || finishedRef.current) return;
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        const percent = Math.min(100, Math.max(0, average / 150 * 100));
        maxVolumeRef.current = Math.max(maxVolumeRef.current, percent);
        setVolume(percent);
        setMaxVolume(maxVolumeRef.current);
        if (percent >= 95) { finishGame(true); return; }
        animationRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch {
      if (session !== sessionRef.current || finishedRef.current) return;
      startFallback();
    }
  };

  const handleFallbackTap = () => {
    if (!started || finishedRef.current) return;
    const next = Math.min(100, maxVolumeRef.current + 8);
    maxVolumeRef.current = next;
    setVolume(next);
    setMaxVolume(next);
    if (next >= 95) finishGame(true);
  };

  return (
    <div className="min-h-[100dvh] bg-blue-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
      
      <div className="text-white text-2xl font-bold mb-2 relative z-10">남은 시간</div>
      <div className="text-6xl font-black text-blue-400 mb-8 relative z-10 font-mono">
        {timeLeft}초
      </div>

      <LucideIcons.Mic2 className={`w-32 h-32 ${volume > 80 ? 'text-red-500 scale-125' : volume > 50 ? 'text-yellow-400 scale-110' : 'text-blue-400'} transition-all duration-75 relative z-10 mb-8`} />

      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">소리질러!</h1>
      <p className="text-blue-200 font-bold mb-12 text-center relative z-10">스마트폰을 향해 크게 함성을 질러<br/>데시벨 게이지를 끝까지 채우세요!</p>
      
      {/* Volume Meter */}
      <div className="w-full max-w-sm h-12 bg-black/50 rounded-full border-4 border-blue-900 relative overflow-hidden z-10 mb-8 flex items-center justify-center">
        <div 
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
          style={{ width: `${Math.max(volume, maxVolume)}%` }}
        ></div>
        <span className="relative z-20 text-white font-black text-xl drop-shadow-md">
          {Math.floor(Math.max(volume, maxVolume))}%
        </span>
      </div>

      {!started && (
        <div className="relative z-10 flex flex-col gap-3 w-full max-w-xs">
          <button onClick={startMic} disabled={requesting} className="px-6 py-4 bg-blue-600 rounded-xl text-white font-black disabled:opacity-60">
            {requesting ? '마이크 권한을 확인하고 있어요…' : '마이크로 시작하기'}
          </button>
          <button onClick={startFallback} className="px-6 py-3 bg-slate-700 rounded-xl text-white font-bold">화면 터치로 시작하기</button>
          <p className="text-xs text-blue-200 text-center">시작하면 10초 동안 도전합니다.</p>
        </div>
      )}
      {micFailed && started && (
        <button 
          onClick={handleFallbackTap}
          className="relative z-10 px-6 py-4 bg-red-600 rounded-xl text-white font-black animate-bounce"
        >
          여기를 빠르게 연타하세요!
        </button>
      )}

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className={`text-6xl font-black mb-4 ${won ? 'text-emerald-400' : 'text-red-500'}`}>
            {won ? 'PERFECT!' : 'FAILED...'}
          </div>
          <p className="text-xl text-white font-bold">
            {won ? '+500점 획득!' : '목소리가 너무 작았습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};
