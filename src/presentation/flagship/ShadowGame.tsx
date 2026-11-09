import {useEffect,useRef,useState} from 'react';
import {shadowDistance} from '../../domain/flagship';
import {useLocalPose} from '../../application/useLocalPose';
import {LEVEL_RULES,type ExpeditionLevel} from '../../domain/expeditionWorkshop';
import {PoseControls} from './PoseControls';
type Point={x:number;y:number};
export function ShadowGame({disabled,onSolved,onMode,onReset,level='normal'}:{level?:ExpeditionLevel;disabled:boolean;onReset:()=>void;onSolved:()=>void;onMode:(mode:string)=>void}){
 const rules=LEVEL_RULES[level];
 const pose=useLocalPose(),[assisted,setAssisted]=useState(true),[cursor,setCursor]=useState<Point>({x:.5,y:.5}),[path,setPath]=useState<Point[]>([]),[phase,setPhase]=useState<'idle'|'record'|'preview'|'follow'|'result'>('idle'),[step,setStep]=useState(0),[round,setRound]=useState(0),[hits,setHits]=useState(0),[message,setMessage]=useState('');
 const current=assisted?cursor:pose.value,latest=useRef(current);latest.current=current;const stored=useRef<Point[]>([]),matched=useRef(0),started=useRef(0),pointer=useRef<number|null>(null);
 useEffect(()=>{onMode(assisted?'assisted':'camera');},[assisted,onMode]);
 const stopPose=pose.stop;
 const changeMode=(next:boolean)=>{pointer.current=null;stored.current=[];setPath([]);setPhase('idle');setRound(0);setHits(0);onReset();setAssisted(next);setMessage('참여 방식을 바꾸어 움직임을 새로 기록해요.');};
 const movePointer=(e:React.PointerEvent<SVGSVGElement>)=>{const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());setCursor({x:Math.max(.05,Math.min(.95,point.x/100)),y:Math.max(.05,Math.min(.95,point.y/75))});};
 useEffect(()=>{if(disabled){stopPose();setPhase('idle');setMessage('일시정지했어요. 다시 시작하면 새로 기록해요.');}},[disabled,stopPose]);
 useEffect(()=>{if(!['record','preview','follow'].includes(phase))return;started.current=performance.now();let last=-1;const timer=setInterval(()=>{if(document.hidden){setPhase('idle');setMessage('화면을 떠나 기록을 멈췄어요. 다시 시작해요.');return;}
  const elapsed=performance.now()-started.current,idx=Math.floor(elapsed/rules.shadowMs);setStep(Math.min(7,idx));
  if(phase==='preview'){if(elapsed>=2000){matched.current=0;last=-1;setPhase('follow');}return;}
  if(idx>=8){if(phase==='record'){const p=stored.current,spread=p.length?Math.max(...p.map(v=>v.x))-Math.min(...p.map(v=>v.x))+Math.max(...p.map(v=>v.y))-Math.min(...p.map(v=>v.y)):0;if(p.length<8||spread<.15){setPhase('idle');setMessage('손목을 천천히 다른 위치로 움직이며 다시 기록해요. 카메라 인식이 끊기면 판정을 멈춰요.');return;}setPath([...p]);setPhase('preview');}else{setHits(matched.current);setPhase('result');if(matched.current>=rules.shadowHits&&round===2){stopPose();onSolved();}}return;}
  if(elapsed%rules.shadowMs<400||idx===last)return;last=idx;const p=latest.current;
  if(phase==='record'){if(p)stored.current.push({x:p.x,y:p.y});}
  else{const target=path[round===2?7-idx:idx];if(p&&target&&shadowDistance(p,target,round===1)<=rules.shadowRadius)matched.current++;}
 },40);return()=>clearInterval(timer);},[phase,path,round,onSolved,stopPose,rules]);
 const target=path[round===2?7-step:step],shown=target?{x:round===1?1-target.x:target.x,y:target.y}:null;
 return <><PoseControls pose={pose} assisted={assisted} setAssisted={changeMode} disabled={disabled}/><p>자기 공간에서 오른손을 천천히 움직여 선을 만들어요. 2초 뒤 같은 길, 좌우 반전, 거꾸로 순서의 그림자를 따라가요. 관절을 무리하게 꺾지 않고 작은 동작도 사용할 수 있어요.</p><p className="flagship-progress">{['같은 길','좌우 반전','거꾸로 순서'][round]} · {phase==='record'?'움직임 기록':phase==='preview'?'2초 뒤 그림자 따라가기':phase==='follow'?`따라가기 ${step+1}/8`:phase==='result'?`${hits}/8 지점 연결`:'움직임 준비'}</p>
 <svg className="flagship-shadow" viewBox="0 0 100 75" tabIndex={assisted?0:-1} role="application" aria-label="터치 연습판. 드래그 또는 방향키로 손목 점 이동" onPointerMove={e=>{if(assisted&&!disabled&&pointer.current===e.pointerId)movePointer(e);}} onPointerDown={e=>{if(assisted&&!disabled&&e.isPrimary!==false){pointer.current=e.pointerId;movePointer(e);try{e.currentTarget.setPointerCapture?.(e.pointerId);}catch{/* pointer cancelled by browser */}}}} onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}} onLostPointerCapture={()=>{pointer.current=null;}} onKeyDown={e=>{const directions:Record<string,[number,number]>={ArrowLeft:[-.08,0],ArrowRight:[.08,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]};if(assisted&&!disabled&&directions[e.key]){e.preventDefault();const [x,y]=directions[e.key];setCursor(p=>({x:Math.max(.05,Math.min(.95,p.x+x)),y:Math.max(.05,Math.min(.95,p.y+y))}));}}}><rect width="100" height="75" rx="4" fill="#e6ebdf"/>{path.length>0&&<polyline points={path.map(p=>`${(round===1?1-p.x:p.x)*100},${p.y*75}`).join(' ')} fill="none" stroke="#adbaa4" strokeWidth="1" strokeDasharray="2 2"/>}{shown&&phase!=='record'&&<ellipse cx={shown.x*100} cy={shown.y*75} rx={rules.shadowRadius*100} ry={rules.shadowRadius*75} fill="#e4c171" opacity=".7"/>}{current&&<circle cx={current.x*100} cy={current.y*75} r="3" fill="#426d58"/>}</svg>
 <p>초록 점은 현재 손목, 금색 원은 따라갈 위치예요. 터치 연습에서는 판을 드래그하거나 방향키로 조작해요.</p>
 {phase==='idle'&&<button disabled={disabled||!assisted&&pose.status!=='tracking'} onClick={()=>{stored.current=[];setPath([]);setRound(0);setMessage('');setPhase('record');}}>8지점 움직임 기록 시작</button>}
 {phase==='result'&&!(hits>=rules.shadowHits&&round===2)&&<button disabled={disabled} onClick={()=>{if(hits>=rules.shadowHits)setRound(n=>n+1);matched.current=0;setPhase('preview');}}>{hits>=rules.shadowHits?'역할 바꾸고 다음 그림자':'같은 그림자 다시 따라가기'}</button>}{hits>=rules.shadowHits&&round===2&&phase==='result'&&<p className="flagship-win">세 그림자를 연결했어요!</p>}{message&&<p role="status">{message}</p>}<button onClick={()=>{stopPose();onReset();stored.current=[];setPath([]);setPhase('idle');setRound(0);setHits(0);setMessage('이 화면의 움직임 좌표를 지웠어요.');}}>카메라 끄고 움직임 지우기</button><p>좌표는 이 화면 메모리에만 잠시 있으며 이동·종료하면 사라져요. 정확도 수치는 자세나 운동 능력의 평가가 아니에요.</p></>;
}
