import React, { useState, useRef } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Play } from 'lucide-react';
import { useAudio } from '../../application/useAudio';
import { useVoiceCoach } from '../../application/useVoiceCoach';

interface MotionCamChallengeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MotionCamChallenge: React.FC<MotionCamChallengeProps> = ({ isOpen, onClose }) => {
  const { playBeep } = useAudio();
  const { speak } = useVoiceCoach();

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [motionCount, setMotionCount] = useState<number>(0);
  const [motionEnergy, setMotionEnergy] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevImageData = useRef<ImageData | null>(null);
  const animFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTriggerTime = useRef<number>(0);

  if (!isOpen) return null;

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        speak('카메라 모션 감지가 시작되었습니다. 2미터 뒤로 물러서서 몸을 움직여보세요!', true);
        startMotionTracking();
      }
    } catch {
      setErrorMsg('카메라 권한을 허용해야 핸즈프리 모션 감지를 할 수 있습니다.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
    }
    setCameraActive(false);
  };

  const startMotionTracking = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const checkFrame = () => {
      if (!video.videoWidth || !video.videoHeight) {
        animFrameId.current = requestAnimationFrame(checkFrame);
        return;
      }

      canvas.width = 64;
      canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);

      const currentImageData = ctx.getImageData(0, 0, 64, 48);
      const curr = currentImageData.data;

      if (prevImageData.current) {
        const prev = prevImageData.current.data;
        let diffScore = 0;

        for (let i = 0; i < curr.length; i += 4) {
          const rDiff = Math.abs(curr[i] - prev[i]);
          const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
          const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);
          if (rDiff + gDiff + bDiff > 80) {
            diffScore++;
          }
        }

        const energy = Math.min(100, Math.floor((diffScore / (64 * 48)) * 300));
        setMotionEnergy(energy);

        // 움직임이 특정 임계치(35% 이상)를 넘고, 쿨다운(700ms)이 지났을 때 카운트
        const now = Date.now();
        if (energy > 35 && now - lastTriggerTime.current > 700) {
          lastTriggerTime.current = now;
          setMotionCount(c => {
            const next = c + 1;
            playBeep();
            if (next % 5 === 0) {
              speak(`${next}회 달성! 좋아요!`, true);
            }
            return next;
          });
        }
      }

      prevImageData.current = currentImageData;
      animFrameId.current = requestAnimationFrame(checkFrame);
    };

    animFrameId.current = requestAnimationFrame(checkFrame);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-cyan-500/30">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black">모션 감지 캠 챌린지</h2>
          <p className="text-xs text-slate-400">
            폰을 바닥에 세워두고 온몸으로 점프하거나 팔을 흔드세요!
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-300 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 비디오 & 모션 감지 디스플레이 */}
        <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video border border-slate-800 mb-4 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${!cameraActive && 'hidden'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!cameraActive ? (
            <div className="text-center p-4">
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4 fill-slate-950" /> 전면 카메라 켜기
              </button>
            </div>
          ) : (
            <div className="absolute top-3 left-3 bg-black/60 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              모션 감지 중
            </div>
          )}
        </div>

        {/* 움직임 에너지 게이지 & 카운트 */}
        {cameraActive && (
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 mb-4">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-400">실시간 움직임 감도</span>
              <span className="text-cyan-400">{motionEnergy}%</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden mb-3 border border-slate-700">
              <div
                className={`h-full transition-all duration-75 ${
                  motionEnergy > 35 ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-cyan-500'
                }`}
                style={{ width: `${motionEnergy}%` }}
              />
            </div>

            <div className="text-center">
              <span className="text-xs font-bold text-slate-400">인식된 신체 점프/동작 수</span>
              <p className="text-4xl font-mono font-black text-amber-400 mt-1">
                {motionCount} <span className="text-sm">회</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {cameraActive && (
            <button
              onClick={() => setMotionCount(0)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 카운트 초기화
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
