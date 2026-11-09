import {useEffect,useRef,useState} from 'react';
import {useReportDevice} from './deviceStatusContext';
import type {useLocalPose} from '../../application/useLocalPose';
export function PoseControls({pose,assisted,setAssisted,disabled}:{pose:ReturnType<typeof useLocalPose>;assisted:boolean;setAssisted:(v:boolean)=>void;disabled:boolean}){
 useReportDevice('camera',assisted?'manual':pose.status==='tracking'?'ready':pose.status==='error'?'error':pose.status==='lost'?'lost':'off');
 const [preview,setPreview]=useState(false),active=!assisted&&['loading','tracking','lost'].includes(pose.status);
 const previous=useRef(pose.status),gaps=useRef(0),[intermittent,setIntermittent]=useState(false);
 useEffect(()=>{if(pose.status==='off'||assisted){gaps.current=0;setIntermittent(false);}else if(previous.current==='tracking'&&pose.status==='lost'){gaps.current++;if(gaps.current>=3)setIntermittent(true);}previous.current=pose.status;},[pose.status,assisted]);
 useEffect(()=>{if(!active)setPreview(false);},[active]);
 const status=assisted?'터치 연습 · 몸 동작 자동 측정 아님':pose.status==='tracking'?'오른팔·손목 인식 중':pose.status==='loading'?'카메라와 로컬 모델 준비 중…':pose.status==='error'?'카메라 오류로 판정을 멈췄어요.':pose.status==='lost'?'팔 위치를 맞춰 주세요. 인식되기 전에는 판정하지 않아요.':'카메라 인식이 꺼져 있어요.';
 const mirrored=(pose.cameraFacing==='unknown'||!pose.cameraFacing?pose.facingMode:pose.cameraFacing)==='user';
 return <div className="pose-controls flagship-note">
  <p>카메라 영상과 추정은 이 기기 안에서만 처리해요. 영상·얼굴·움직임 좌표를 서버나 외부 AI에 보내거나 파일로 저장하지 않아요.</p>
  <ol className="pose-guide"><li>기기를 거치하고 밝은 곳에서 카메라를 바라봐요.</li><li>미리 보기로 상체·양쪽 어깨·오른손목이 화면에 들어오게 맞춰요.</li><li>오른팔을 편안하게 조금 펼쳐요. 앉은 자세로도 할 수 있어요.</li></ol>
  <div className="pose-actions"><button disabled={disabled||pose.status==='loading'} onClick={()=>{pose.stop();setAssisted(false);void pose.start();}}>{active?'기기 안에서 카메라 인식 다시 시작':'기기 안에서 카메라 인식 켜기'}</button><button disabled={disabled||pose.status==='loading'} onClick={()=>{setAssisted(false);void pose.switchCamera();}}>{pose.facingMode==='user'?'후면':'전면'} 카메라로 전환</button><button onClick={()=>{pose.stop();setAssisted(true);}}>카메라 끄고 터치 연습</button></div>
  <p role={pose.status==='error'?'alert':'status'}>{pose.message&&!assisted?pose.message:status}</p>
  {intermittent&&active&&<p className="pose-intermittent" role="status">인식이 반복해서 끊겼어요. 미리 보기로 어깨와 오른손목이 함께 보이게 맞추고, 몸과 손이 겹치지 않도록 작은 동작부터 해 보세요. 끊기는 동안에는 판정하지 않아요. 계속 어려우면 터치 연습으로 참여할 수 있어요.</p>}
  {pose.diagnostic&&!assisted&&<ul className="pose-checks" aria-label="현재 영상의 인식 상태">{([['body','몸 추정'],['shoulder','오른쪽 어깨'],['wrist','오른손목']] as const).map(([key,label])=><li key={key} className={pose.diagnostic![key]?'seen':'not-seen'}>{pose.diagnostic![key]?'✓':'○'} {label} {pose.diagnostic![key]?'포착':'확인 필요'}</li>)}</ul>}
  <label className="flagship-check pose-preview-toggle"><input type="checkbox" checked={preview} disabled={!active} onChange={e=>setPreview(e.target.checked)}/><span>내 기기에서만 카메라 미리 보기</span></label>
  <div className={preview&&active?'pose-preview':'pose-preview-hidden'}><video ref={pose.video} className={preview&&active?'pose-preview-video':'flagship-pose-video'} playsInline muted aria-hidden={!preview||!active} aria-label="이 기기 안에서만 표시하는 카메라 미리 보기" style={mirrored?{transform:'scaleX(-1)'}:undefined}/></div>
  {preview&&active&&<p className="pose-preview-caption">미리 보기는 이 기기 화면에만 표시해요. 사진·영상 파일로 저장하거나 외부로 전송하지 않아요. {!pose.cameraFacing||pose.cameraFacing==='unknown'?'실제 카메라 방향은 영상으로 확인해 주세요.':pose.cameraFacing==='environment'?'후면 카메라 사용 중':'전면 카메라 사용 중'}</p>}
 </div>;
}
