import {useEffect,useState} from 'react';
import {useLocalPose} from '../../application/useLocalPose';
import {useShipOrientation} from '../../application/useShipOrientation';
import {PoseControls} from './PoseControls';
import './flagship.css';

export function FlagshipDeviceCheck(){
 const pose=useLocalPose(),tilt=useShipOrientation(false),[assisted,setAssisted]=useState(true),[value,setValue]=useState(0);
 const sample=tilt.sample,enabled=tilt.enabled;
 useEffect(()=>{const timer=setInterval(()=>setValue(enabled?sample().value:0),150);return()=>clearInterval(timer);},[enabled,sample]);
 return <section className="flagship" data-game-color="true" aria-label="카메라·기울기 실제 신호 확인">
  <h2>카메라·기울기 실제 신호 확인</h2>
  <p>휴대폰·태블릿에서 이 화면을 직접 열어 시험해요. API 지원이나 권한 허용만으로 성공이라고 표시하지 않아요. 결과는 이 화면에만 있고 학생 정보·영상·기기 식별자를 보내거나 저장하지 않아요.</p>
  <h3>1. 기기를 거치하고 카메라 확인</h3>
  <PoseControls pose={pose} assisted={assisted} setAssisted={setAssisted} disabled={false}/>
  {pose.status==='tracking'&&pose.value&&<p role="status">실제 영상에서 오른팔·손목 추정값 수신 중 · 가상 발사 각도 {Math.round(pose.value.angle)}°</p>}
  <p>팔을 화면 밖으로 옮기면 ‘찾지 못했어요’로 바뀌고 판정이 멈추는지 확인해요. 영상 자체는 화면에 표시하지 않아요.</p>
  <h3>2. 제자리에서 기울기 확인</h3>
  <button disabled={tilt.status==='requesting'} aria-pressed={tilt.enabled} onClick={()=>{if(tilt.enabled)tilt.stop();else void tilt.start();}}>기울기 시험 {tilt.enabled?'끄기':'켜기'}</button>
  <button disabled={tilt.status!=='tracking'} onClick={tilt.calibrate}>현재 자세를 가운데로 보정</button>
  <p role="status">{tilt.status==='tracking'?'실제 기울기 신호 수신 중':tilt.status==='lost'?'신호 없음 · 중립으로 정지':tilt.status==='denied'?'권한 거절 · 사이트 권한 확인':tilt.status==='unsupported'?'이 환경은 기울기 API 미지원':tilt.status==='off'?'기울기 꺼짐':'권한·실제 신호 확인 중'}</p>
  <meter aria-label="현재 기울기 입력" min={-1} max={1} value={value}/><p>입력 {value.toFixed(2)} · 가운데 0.00</p>
  <p>처음 받은 자세가 가운데예요. 세로·가로로 회전하면 기기를 멈추어 새 가운데를 잡고, 조금 기울였을 때 입력이 달라지는지 확인해요. 화면을 떠나면 꺼지고 직접 켜야 다시 시작해요.</p>
  <button onClick={()=>{pose.stop();setAssisted(true);tilt.stop();setValue(0);}}>카메라·센서 모두 끄기</button>
 </section>;
}
