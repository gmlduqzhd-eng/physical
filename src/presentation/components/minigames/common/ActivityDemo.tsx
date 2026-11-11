import {useEffect,useState} from 'react';
import './ActivityProgress.css';
interface Props{steps:string[];equipment?:string[];roles?:string[];board?:{size:number;blocked:number[];path?:number[];start?:number;destination?:number}}
export function ActivityDemo({steps,equipment=[],roles=[],board}:Props){
 const [playing,setPlaying]=useState(false),[step,setStep]=useState(0);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>{if(document.hidden){setPlaying(false);return;}setStep(n=>(n+1)%Math.max(1,steps.length));},2000);return()=>clearInterval(timer);},[playing,steps.length]);
 return <details className="activity-brief"><summary>배치 그림·첫 동작 시범 안내 · 점수 없음</summary><p>그림은 설명용 예시예요. 교사가 실제 공간·간격·분리 통로를 정하고 기기는 통로 밖에 둬요.</p>
 {board?<svg viewBox={`0 0 ${board.size*50} ${board.size*50}`} role="img" aria-label="번호 표식과 막힌 칸의 배치 예시" style={{maxWidth:300,width:'100%'}}>{Array.from({length:board.size**2},(_,i)=><g key={i} transform={`translate(${i%board.size*50},${Math.floor(i/board.size)*50})`}><rect x="2" y="2" width="46" height="46" rx="6" fill={board.blocked.includes(i)?'#ddd3ce':board.path?.includes(i)?'#d8e8cb':'#f6f6ed'} stroke="#879777"/><text x="25" y="29" textAnchor="middle" fontSize="12" fill="#253b2f">{board.blocked.includes(i)?'금지 ×':i===board.start?'출발':i===board.destination?'도착':i+1}</text></g>)}</svg>:<div className="activity-role-cards" aria-label="기기와 도구를 놓는 설명 그림"><p><strong>기기 거치</strong>교사·기록 담당이 머무르는 통로 밖 자리</p>{equipment.map((tool,i)=><p key={i}><strong>준비물 {i+1}</strong>{tool}</p>)}<p><strong>개인 활동 자리</strong>친구와 닿지 않는 공간 · 앉은 참여도 선택</p></div>}
 {!!roles.length&&<div className="activity-role-cards">{roles.map((role,i)=><p key={i}><strong>역할 {i+1}</strong>{role}</p>)}</div>}
 <p>실제 신호를 시작하기 전에 아래 순서로 규칙을 살펴요. 이 시범은 몸 동작을 측정하지 않아요.</p><ol>{steps.map((cue,i)=><li key={i} aria-current={step===i?'step':undefined}><strong>{step===i?'▶ ':''}{cue}</strong></li>)}</ol><button onClick={()=>setPlaying(v=>!v)}>{playing?'시범 안내 멈추기':'시범 안내 순서대로 보기'}</button><button onClick={()=>{setPlaying(false);setStep(n=>(n+1)%Math.max(1,steps.length));}}>한 동작씩 다음 안내</button></details>;
}
