import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

export const ScreamGame = ({ groupId, enqueueAction }: Props) => {
  const [volume, setVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [micFailed, setMicFailed] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let animationFrame: number;
    let timer: any;

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        const checkVolume = () => {
          if (finished) return;
          
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          
          // Map 0-150 range to 0-100% roughly
          const volPercent = Math.min(100, Math.max(0, (average / 150) * 100));
          
          setVolume(volPercent);
          setMaxVolume(prev => {
            if (prev >= 95) return prev;
            const nextMax = Math.max(prev, volPercent);
            if (nextMax >= 95 && !finished) {
              setFinished(true);
              setWon(true);
              enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
            }
            return nextMax;
          });
          
          animationFrame = requestAnimationFrame(checkVolume);
        };
        
        checkVolume();
      } catch (err) {
        console.error('Mic error:', err);
        setMicFailed(true);
      }
    };

    startMic();

    timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          setWon(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [finished]);

  const handleFallbackTap = () => {
    if (finished) return;
    setMaxVolume(prev => {
      if (prev >= 100) return 100;
      const nextMax = prev + 5;
      setVolume(nextMax);
      if (nextMax >= 100) {
        setFinished(true);
        setWon(true);
        enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: 500 }, timestamp: Date.now() });
      }
      return nextMax;
    });
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

      {micFailed && (
        <button 
          onClick={handleFallbackTap}
          className="relative z-10 px-6 py-4 bg-red-600 rounded-xl text-white font-black animate-bounce"
        >
          마이크 접근 실패! 여기를 미친듯이 연타하세요!
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
