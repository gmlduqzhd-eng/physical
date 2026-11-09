import {useCallback,useEffect,useRef,useState} from 'react';
import {createLocalPoseSession,type PoseState} from './localPoseSession';
import {compatiblePoseDetector,poseCameraConstraints,type PoseMode} from './poseRuntime';

export function useLocalPose(){
 const requestedFacing=useRef<'user'|'environment'>('user'),[facingMode,setFacingMode]=useState<'user'|'environment'>('user');
 const requestedMode=useRef<PoseMode>('auto'),[mode,setMode]=useState<PoseMode>('auto');
 const video=useRef<HTMLVideoElement|null>(null),session=useRef<ReturnType<typeof createLocalPoseSession>|null>(null);
 const [state,setState]=useState<PoseState>({status:'off',message:'',value:null});
 useEffect(()=>{
  const current=createLocalPoseSession({
   camera:()=>{if(!window.isSecureContext)return Promise.reject({name:'SecurityError'});if(!navigator.mediaDevices?.getUserMedia)return Promise.reject({name:'NotFoundError'});return navigator.mediaDevices.getUserMedia(poseCameraConstraints(requestedMode.current,requestedFacing.current));},
   requestedFacing:()=>requestedFacing.current,
   interval:()=>requestedMode.current==='compatibility'?167:84,
   detector:async(engine)=>{const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision');const vision=await FilesetResolver.forVisionTasks('/vision');return compatiblePoseDetector(delegate=>PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'/vision/pose_landmarker_lite.task',delegate},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.65,minTrackingConfidence:.65}),engine==='CPU'||requestedMode.current==='compatibility');},
   video:()=>video.current,now:()=>performance.now(),frame:callback=>requestAnimationFrame(callback),cancelFrame:id=>cancelAnimationFrame(id),timer:(callback,ms)=>setTimeout(callback,ms),cancelTimer:id=>clearTimeout(id),emit:setState,
  });
  session.current=current;
  const hide=()=>{if(document.hidden)current.stop('화면을 떠나 카메라를 껐어요. 돌아온 뒤 켜기 버튼을 눌러 다시 시작해 주세요.');};
  const leave=()=>current.stop('화면을 떠나 카메라를 껐어요. 다시 켜기 버튼으로 시작해 주세요.');
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);current.dispose();if(session.current===current)session.current=null;};
 },[]);
 const start=useCallback(async()=>{await session.current?.start();},[]),stop=useCallback(()=>session.current?.stop(),[]);
 const switchCamera=useCallback(async()=>{const current=session.current;if(!current)return;current.stop();requestedFacing.current=requestedFacing.current==='user'?'environment':'user';setFacingMode(requestedFacing.current);await current.start();},[]);
 const changeMode=useCallback(async(next:PoseMode)=>{const current=session.current;if(!current||next===requestedMode.current)return;current.stop();requestedMode.current=next;setMode(next);await current.start();},[]);
 return {video,...state,start,stop,facingMode,switchCamera,mode,changeMode};
}
