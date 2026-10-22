import {useEffect,useRef,useState} from 'react';
import {SAFETY_LESSONS,safetyLessonResult,type SafetyLessonId,type SafetyLearningRecord} from '../../../../domain/safetyLessons';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import './MovementQuest.css';

interface Props {gameId:SafetyLessonId;groupId?:string;solo?:boolean;enqueueAction?:(action:{id:string;type:string;payload:{id:string;amount:number;details:GameResultDetails};timestamp:number})=>void;onExit?:()=>void}
export function SafetyLesson({gameId,groupId='standalone-player',enqueueAction,onExit}:Props){
 const spec=SAFETY_LESSONS[gameId];
 const [phase,setPhase]=useState<'intro'|'scenario'|'explain'|'rehearsal'|'done'>('intro');
 const [index,setIndex]=useState(0),[selected,setSelected]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [records,setRecords]=useState<SafetyLearningRecord[]>([]);
 const started=useRef(0),saved=useRef(false),transition=useRef(false);
 const current=spec.scenarios[index];
 useEffect(()=>{window.scrollTo(0,0);},[phase,index]);
 const finish=(mode:SafetyLearningRecord['mode'])=>{
  if(phase!=='rehearsal'||!confirmed||saved.current||transition.current)return;
  transition.current=true;
  const next=[...records,{scenario:index,answer:selected,mode}];
  if(index===spec.scenarios.length-1){
   const result=safetyLessonResult(gameId,next,(performance.now()-started.current)/1000);
   if(!result){transition.current=false;return;}
   saved.current=true;setRecords(next);setPhase('done');
   enqueueAction?.({id:crypto.randomUUID(),type:'INCREMENT_SCORE',payload:{id:groupId,...result},timestamp:Date.now()});
  }else{setRecords(next);setIndex(index+1);setSelected('');setConfirmed(false);setPhase('scenario');}
  queueMicrotask(()=>{transition.current=false;});
 };
 const sourceLinks=<details className="mq-panel"><summary>확인한 공식 자료 · 2026-10-22</summary><ul>{spec.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul></details>;
 return <section className="movement-quest safety-lesson" data-safety={gameId} data-phase={phase} aria-label={spec.name}>
  <header className="mq-heading"><span aria-hidden="true">{spec.emoji}</span><div><p>안전 상황 학습</p><h1>{spec.name}</h1></div><span className="mq-pill">{phase==='intro'?'준비':`${index+1} / 3`}</span></header>
  <div className="mq-progress" aria-label={`${records.length}개 상황 학습 완료`}>{spec.scenarios.map((_,i)=><span key={i} className={i<records.length?'is-complete':''}>{i<records.length?'✓':i+1}</span>)}</div>
  {phase==='intro'&&<>
   <p className="mq-lead">{spec.description}</p><ol className="mq-rules"><li>가상 상황을 읽고 안전한 선택을 골라요.</li><li>이유를 확인한 뒤 교실에서 말·손짓으로 표현해요.</li><li>몸짓이 불편하면 읽고 설명을 확인해도 학습을 마칠 수 있어요.</li></ol>
   <div className="mq-panel"><h2>수업 준비</h2><p>{spec.equipment.join(' · ')}</p><p>{spec.boundary}</p></div>{sourceLinks}
   <button className="mq-primary" onClick={()=>{started.current=performance.now();setPhase('scenario');}}>안전 상황 살펴보기</button>
  </>}
  {(phase==='scenario'||phase==='explain'||phase==='rehearsal')&&<><p className="mq-kicker">상황 {index+1} · {current.title}</p><h2>{current.situation}</h2>
   {phase==='scenario'&&<>
    <fieldset className="mq-choices"><legend>어떤 선택이 안전할까요?</legend>{[...current.choices].sort((a,b)=>index%2?a.id.localeCompare(b.id):b.id.localeCompare(a.id)).map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>{setSelected(c.id);if(c.id===current.answer)setPhase('explain');}}>{c.label}</button>)}</fieldset>
    {selected&&<p role="alert" className="mq-error">{current.choices.find(c=>c.id===selected)?.feedback}</p>}
   </>}
   {phase==='explain'&&<div className="mq-panel"><h3>선택한 이유를 확인해요</h3><p>{current.explanation}</p><button className="mq-primary" onClick={()=>{setConfirmed(false);setPhase('rehearsal');}}>교실 역할 표현으로</button></div>}
   {phase==='rehearsal'&&<>
    <div className="mq-signal"><p>기기는 놓고 말·손짓으로 표현해요</p><strong>{current.rehearsal}</strong></div>
    <p>{spec.boundary}</p><label className="mq-panel"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>안전한 교실 표현을 해 보았거나 설명을 읽고 확인했어요</label>
    <button className="mq-primary" disabled={!confirmed} onClick={()=>finish('roleplay')}>말·손짓으로 표현했어요 · {index===2?'학습 마치기':'다음 상황'}</button>
    <button className="mq-secondary" disabled={!confirmed} onClick={()=>finish('read')}>읽고 설명을 확인했어요 · {index===2?'학습 마치기':'다음 상황'}</button>
   </>}{sourceLinks}
  </>}
  {phase==='done'&&<div className="mq-panel"><h2>세 상황을 배웠어요</h2><p>학습 결과는 실제 구조나 응급처치 능력을 인증하지 않아요. 전문 교육은 교사와 함께 확인해요.</p>{onExit&&<button className="mq-primary" onClick={onExit}>활동 목록으로</button>}</div>}
  <p className="mq-footnote">실제 위급 상황에서는 게임을 계속하지 말고 119와 가까운 어른에게 도움을 요청해요.</p>
 </section>;
}
