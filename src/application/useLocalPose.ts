import {useCallback,useEffect,useRef,useState} from 'react';
import type {PoseLandmarker} from '@mediapipe/tasks-vision';
import {armInput} from '../domain/flagship';
export function useLocalPose(){
 const video=useRef<HTMLVideoElement|null>(null),model=useRef<PoseLandmarker|null>(null),stream=useRef<MediaStream|null>(null),raf=useRef(0),generation=useRef(0),loading=useRef(false);
 const [status,setStatus]=useState<'off'|'loading'|'tracking'|'lost'|'error'>('off'),[message,setMessage]=useState(''),[value,setValue]=useState<ReturnType<typeof armInput>>(null);
 const stop=useCallback(()=>{generation.current++;loading.current=false;cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;model.current?.close();model.current=null;setValue(null);setStatus('off');},[]);
 useEffect(()=>{const lifecycle=generation;const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);lifecycle.current++;cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());model.current?.close();};},[stop]);
 const start=useCallback(async()=>{
  if(loading.current||model.current)return;loading.current=true;const token=++generation.current;setStatus('loading');setMessage('');
  let camera:MediaStream|null=null,detector:PoseLandmarker|null=null;
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('이 브라우저는 카메라를 사용할 수 없어요. 터치 연습을 선택해 주세요.');
   camera=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:480},height:{ideal:360},facingMode:'user'},audio:false});
   if(token!==generation.current){camera.getTracks().forEach(t=>t.stop());return;}stream.current=camera;
   const {FilesetResolver,PoseLandmarker:Pose}=await import('@mediapipe/tasks-vision');
   const vision=await FilesetResolver.forVisionTasks('/vision');
   detector=await Pose.createFromOptions(vision,{baseOptions:{modelAssetPath:'/vision/pose_landmarker_lite.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.65,minTrackingConfidence:.65});
   if(token!==generation.current){camera.getTracks().forEach(t=>t.stop());detector.close();return;}
   model.current=detector;const v=video.current;if(!v)throw Error('카메라 화면을 준비하지 못했어요.');v.srcObject=camera;await v.play();let previous=0;
   const frame=(now:number)=>{if(token!==generation.current)return;
    if(now-previous>=125&&v.readyState>=2){previous=now;try{const result=detector!.detectForVideo(v,now);const next=armInput(result.landmarks[0]??[]);setValue(next);setStatus(next?'tracking':'lost');}catch{setValue(null);setStatus('error');setMessage('동작 인식을 멈췄어요. 카메라를 끄고 터치 연습으로 계속할 수 있어요.');stop();return;}}
    raf.current=requestAnimationFrame(frame);
   };raf.current=requestAnimationFrame(frame);
  }catch(e){camera?.getTracks().forEach(t=>t.stop());detector?.close();if(token===generation.current){stream.current=null;model.current=null;setStatus('error');setValue(null);setMessage(e instanceof Error&&e.message.startsWith('이 브라우저')?e.message:'카메라 권한·연결·모델 파일을 확인해 주세요. 터치 연습으로도 진행할 수 있어요.');}}
  finally{if(token===generation.current)loading.current=false;}
 },[stop]);
 return {video,status,message,value,start,stop};
}
