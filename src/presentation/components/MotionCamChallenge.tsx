import React, { useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Play } from 'lucide-react';
import { useAudio } from '../../application/useAudio';
import { useVoiceCoach } from '../../application/useVoiceCoach';
import { useModalDialog } from '../../application/useModalDialog';
import {useMotionCamera} from '../../application/useMotionCamera';

interface MotionCamChallengeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MotionCamChallenge: React.FC<MotionCamChallengeProps> = ({ isOpen, onClose }) => {
  const { playBeep } = useAudio();
  const { speak, stop } = useVoiceCoach();

  const camera=useMotionCamera(),stopCamera=camera.stop,videoRef=camera.video,canvasRef=camera.canvas;
  const cameraActive=camera.status==='tracking'||camera.status==='lost',isStarting=camera.status==='loading';
  const errorMsg=camera.status==='error'?camera.message:null,motionCount=camera.count,motionEnergy=camera.energy;
  const previousCount=useRef(0);
  useEffect(()=>{if(!isOpen){stopCamera();stop();}},[isOpen,stopCamera,stop]);
  useEffect(()=>{if(motionCount>previousCount.current){playBeep();if(motionCount%5===0)speak(motionCount+'회 감지했어요.',true);}previousCount.current=motionCount;},[motionCount,playBeep,speak]);
  const startCamera=()=>{void camera.start();};

  const handleClose = () => {
    stopCamera();
    stop();
    onClose();
  };
  const dialogRef = useModalDialog(isOpen, handleClose);
  if (!isOpen) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="모션 감지 캠 챌린지" tabIndex={-1} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md max-h-[90dvh] overflow-y-auto w-full p-4 sm:p-6 text-white shadow-2xl relative">
        <button
          onClick={handleClose}
          aria-label="모션 감지 캠 닫기"
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
            기기를 안정적으로 거치하고 개인 공간에서 작은 팔 동작으로 시작해요.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl flex items-center gap-2 text-xs text-rose-300 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <label className="block text-sm mb-3">모션 카메라 모드<select aria-label="모션 카메라 모드" className="block w-full min-w-0 rounded-xl p-3 mt-2 bg-slate-800 text-white" value={camera.mode} disabled={isStarting} onChange={e=>void camera.changeMode(e.target.value as 'auto'|'compatibility')}><option value="auto">자동 최적화</option><option value="compatibility">호환 모드 · 끊길 때 선택</option></select></label>
        <p className="text-xs text-slate-400 mb-3">영상은 이 기기 안에서만 비교하며 저장·전송하지 않아요. 화면 변화 횟수이며 자세·운동 횟수의 정확한 측정이 아닙니다.</p>
        {camera.message&&<p role="status" className="text-sm mb-3">{camera.message}</p>}
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
                disabled={isStarting}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4 fill-slate-950" /> {isStarting ? '카메라 연결 중…' : '전면 카메라 켜기'}
              </button>
            </div>
          ) : (
            <div className="absolute top-3 left-3 bg-black/60 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {camera.status==='tracking'?'새 영상 감지 중':'영상 복구 대기 · 판정 중지'}
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
              <span className="text-xs font-bold text-slate-400">감지된 화면 움직임 횟수</span>
              <p className="text-4xl font-mono font-black text-amber-400 mt-1">
                {motionCount} <span className="text-sm">회</span>
              </p>
            </div>
          </div>
        )}

        {cameraActive&&<button onClick={stopCamera} className="w-full py-3 mb-3 rounded-xl bg-slate-800 text-white">카메라 끄기</button>}
        <div className="flex gap-2">
          {cameraActive && (
            <button
              onClick={camera.reset}
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
