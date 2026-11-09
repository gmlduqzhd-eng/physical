import type {armInput,PosePoint} from '../domain/flagship';
import {assessArmFrame,type PoseDiagnostics} from './poseFeedback';

export type PoseState = { status: 'off'|'loading'|'tracking'|'lost'|'error'; message: string; value: ReturnType<typeof armInput>; diagnostic?:PoseDiagnostics; cameraFacing?:'user'|'environment'|'unknown' };
export type PoseDetector = { detectForVideo(video: HTMLVideoElement, timestamp: number): { landmarks: PosePoint[][] }; close(): void };
export type PoseEnvironment = {
  camera(): Promise<MediaStream>;
  requestedFacing?(): 'user'|'environment';
  detector(): Promise<PoseDetector>;
  video(): HTMLVideoElement | null;
  now(): number;
  frame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  timer(callback: () => void, ms: number): ReturnType<typeof setTimeout>;
  cancelTimer(id: ReturnType<typeof setTimeout>): void;
  emit(state: PoseState): void;
};

export const CAMERA_SETUP_TIMEOUT = 20000;
export function cameraHelp(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return '카메라 권한을 허용하지 않았어요. 주소창의 사이트 권한에서 카메라를 허용한 뒤 다시 켜거나 터치 연습을 선택해 주세요.';
  if (name === 'SecurityError') return '보안 연결에서 카메라를 사용할 수 있어요. HTTPS 주소를 기본 브라우저에서 열거나 터치 연습을 선택해 주세요.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return '사용할 카메라가 없어요. 카메라가 있는 기기 또는 터치 연습을 사용해 주세요.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return '카메라를 열지 못했어요. 카메라를 쓰는 다른 앱·탭을 닫고 다시 켜거나 터치 연습을 선택해 주세요.';
  return '카메라·모델 준비에 실패했어요. 연결과 사이트 카메라 권한을 확인한 뒤 다시 켜거나 터치 연습을 선택해 주세요.';
}

// Each run owns its tracks, model, frame loop and deadline. Late async results
// are disposed without replacing a newer run or updating an unmounted view.
export function createLocalPoseSession(env: PoseEnvironment) {
  let generation = 0, disposed = false, starting = false, frame = 0;
  let stream: MediaStream | null = null, detector: PoseDetector | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  let cameraFacing:PoseState['cameraFacing'];
  const removers: Array<() => void> = [];
  const close = (d: PoseDetector | null) => { try { d?.close(); } catch { /* already released */ } };
  const publish = (status: PoseState['status'], message = '', value: PoseState['value'] = null, diagnostic?:PoseDiagnostics) => { if (!disposed) env.emit({ status, message, value, diagnostic, cameraFacing }); };
  const release = () => {
    generation++; starting = false; env.cancelFrame(frame);
    if (deadline !== null) env.cancelTimer(deadline); deadline = null;
    removers.splice(0).forEach(remove => remove());
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    const video = env.video(); if (video) { video.pause(); video.srcObject = null; }
    close(detector); detector = null; cameraFacing=undefined;
  };
  const stop = (message = '') => { release(); publish('off', message); };
  const fail = (message: string) => { release(); publish('error', message); };
  const start = async () => {
    if (disposed || starting || detector) return;
    starting = true; const epoch = ++generation; publish('loading');
    deadline = env.timer(() => { if (epoch === generation) fail('카메라 또는 모델 응답을 기다리다 중지했어요. 권한 안내를 확인하고 다시 켜거나 터치 연습을 선택해 주세요.'); }, CAMERA_SETUP_TIMEOUT);
    try {
      const camera = await env.camera();
      if (epoch !== generation || disposed) { camera.getTracks().forEach(track => track.stop()); return; }
      stream = camera;
      const actualFacing=camera.getVideoTracks()[0]?.getSettings?.().facingMode;
      cameraFacing=actualFacing==='user'||actualFacing==='environment'?actualFacing:'unknown';
      const mirrored=(cameraFacing==='unknown'?env.requestedFacing?.()??'user':cameraFacing)==='user';
      const video = env.video(); if (!video) throw Error('Missing video');
      const ended = () => { if (epoch === generation) fail('카메라 연결이 끊겼어요. 다른 앱의 카메라 사용·사이트 권한을 확인하고 다시 켜 주세요.'); };
      const muted = () => { if (epoch === generation) publish('lost', '카메라 영상이 잠시 멈췄어요. 판정을 멈추고 새 영상을 기다려요.'); };
      camera.getVideoTracks().forEach(track => {
        track.addEventListener('ended', ended); track.addEventListener('mute', muted);
        removers.push(() => { track.removeEventListener('ended', ended); track.removeEventListener('mute', muted); });
      });
      const stalled=()=>{if(epoch===generation)publish('lost','카메라 재생이 멈췄어요. 새 영상이 올 때까지 판정하지 않아요.');};
      const videoError=()=>{if(epoch===generation)fail('카메라 재생에 실패했어요. 다른 카메라 앱을 닫고 다시 켜 주세요.');};
      for(const event of ['pause','waiting','stalled']){video.addEventListener(event,stalled);removers.push(()=>video.removeEventListener(event,stalled));}
      video.addEventListener('error',videoError);removers.push(()=>video.removeEventListener('error',videoError));
      video.muted = true; video.playsInline = true; video.srcObject = camera;
      await video.play();
      if (epoch !== generation || disposed) return;
      const model = await env.detector();
      if (epoch !== generation || disposed) { close(model); return; }
      detector = model; starting = false;
      if (deadline !== null) env.cancelTimer(deadline); deadline = null;
      let previousInference = -Infinity, previousVideoTime = -1, advancedAt = env.now();
      publish('lost', '오른팔과 손목이 보이게 위치를 조절해 주세요.');
      const tick = (now: number) => {
        if (epoch !== generation || disposed) return;
        const validTrack = camera.getVideoTracks().some(track => track.readyState === 'live' && !track.muted);
        if (!video.paused && !video.ended && video.readyState >= 2 && video.currentTime !== previousVideoTime && validTrack) {
          advancedAt = now;
          if (now - previousInference >= 125) {
            previousInference = now; previousVideoTime = video.currentTime;
            try {
              const result = model.detectForVideo(video, now), assessment=assessArmFrame(result.landmarks[0]??[]);
              const value=assessment.value?(mirrored?assessment.value:{...assessment.value,x:1-assessment.value.x}):null;
              publish(value?'tracking':'lost',assessment.message,value,assessment.diagnostic);
            } catch { fail('동작 인식을 중지했어요. 카메라를 다시 켜거나 터치 연습으로 계속할 수 있어요.'); return; }
          }
        } else if (now - advancedAt > 6000) { fail('카메라 영상이 갱신되지 않아 인식을 종료했어요. 카메라를 다시 켜거나 터치 연습을 선택해 주세요.'); return; }
        else if (now - advancedAt > 400 || !validTrack) publish('lost', '새 카메라 영상을 기다려요. 멈춘 영상은 판정하지 않아요.');
        frame = env.frame(tick);
      };
      frame = env.frame(tick);
    } catch (error) { if (epoch === generation && !disposed) fail(cameraHelp(error)); }
  };
  return { start, stop, dispose: () => { release(); disposed = true; } };
}
