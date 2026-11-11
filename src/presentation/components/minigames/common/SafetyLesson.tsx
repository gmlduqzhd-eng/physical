import {useEffect,useRef,useState} from 'react';
import {SAFETY_LESSONS,safetyScenarios,safetyLessonResult,type SafetyLessonId,type SafetyLearningRecord} from '../../../../domain/safetyLessons';
import {safetyChoiceOrder} from '../../../../domain/fourthGameRules';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import './MovementQuest.css';
import {ActivityReviewRecord} from '../../ActivityReviewRecord';
import {AVAILABLE_GAMES} from '../../../../domain/gamesData';
import {ActivityProgress} from './ActivityProgress';

interface Props {gameId:SafetyLessonId;groupId?:string;solo?:boolean;enqueueAction?:(action:{id:string;type:string;payload:{id:string;amount:number;details:GameResultDetails};timestamp:number})=>void;onExit?:()=>void}
export function SafetyLesson({gameId,groupId='standalone-player',enqueueAction,onExit}:Props){
 const spec=SAFETY_LESSONS[gameId];
 const [scenarioSet,setScenarioSet]=useState<'core'|'alternate'>('core');
 const [choiceSeed]=useState(()=>Math.floor(Math.random()*1000));
 const [missed,setMissed]=useState<number[]>([]),[reviewing,setReviewing]=useState(false),[reviewed,setReviewed]=useState(false);
 const [reason,setReason]=useState(false);
 const [phase,setPhase]=useState<'intro'|'scenario'|'explain'|'rehearsal'|'summary'|'done'>('intro');
 const [index,setIndex]=useState(0),[selected,setSelected]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [records,setRecords]=useState<SafetyLearningRecord[]>([]);
 const started=useRef(0),saved=useRef(false),transition=useRef(false);
 const current=safetyScenarios(gameId,reviewing?(scenarioSet==='core'?'alternate':'core'):scenarioSet)[index];
 useEffect(()=>{window.scrollTo(0,0);},[phase,index]);
 const finish=(mode:SafetyLearningRecord['mode'])=>{
  if(phase!=='rehearsal'||!confirmed||saved.current||transition.current)return;
  transition.current=true;
  if(reviewing){setReviewed(true);setReviewing(false);setIndex(2);setPhase('summary');}
  else{const next=[...records,{scenario:index,answer:selected,mode}];setRecords(next);
   if(index===spec.scenarios.length-1)setPhase('summary');
   else{setIndex(index+1);setSelected('');setConfirmed(false);setReason(false);setPhase('scenario');}
  }
  queueMicrotask(()=>{transition.current=false;});
 };
 const save=()=>{
  if(phase!=='summary'||saved.current)return;
  const result=safetyLessonResult(gameId,records,(performance.now()-started.current)/1000,scenarioSet);if(!result)return;
  saved.current=true;setPhase('done');
  result.details.metrics={...result.details.metrics,'이유 다시 확인':reviewed?'다른 상황으로 다시 확인 · 추가 점수 없음':'다시 확인 선택 생략'};
  enqueueAction?.({id:crypto.randomUUID(),type:'INCREMENT_SCORE',payload:{id:groupId,...result},timestamp:Date.now()});
 };
 const review=()=>{setReviewing(true);setIndex(missed[0]??0);setSelected('');setConfirmed(false);setReason(false);setPhase('scenario');};
 const sourceLinks=<details className="mq-panel"><summary>확인한 공식 자료 · 2026-10-22</summary><ul>{spec.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul></details>;
 return <section className="movement-quest safety-lesson" data-safety={gameId} data-phase={phase} aria-label={spec.name}>
  <header className="mq-heading"><span aria-hidden="true">{spec.emoji}</span><div><p>안전 상황 학습</p><h1>{spec.name}</h1></div><span className="mq-pill">{phase==='intro'?'준비':reviewing?'이유 다시 확인':phase==='summary'?'학습 정리':`${index+1} / 3`}</span></header>
  <ActivityProgress steps={spec.scenarios.map(s=>s.title)} current={index} results={records.map(()=>'complete')}/>
  {phase==='intro'&&<>
   <label className="mq-panel">상황 카드 묶음<select value={scenarioSet} onChange={e=>setScenarioSet(e.target.value as 'core'|'alternate')}><option value="core">기본 상황</option><option value="alternate">다른 상황에서 같은 이유 확인</option></select></label><p>선택지 위치보다 이유를 기억해요. 세 상황 뒤에 다른 상황으로 다시 확인할 수 있어요. 새로운 처치 방법을 제시하지 않아요.</p><p className="mq-lead">{spec.description}</p><ol className="mq-rules"><li>가상 상황을 읽고 안전한 선택을 골라요.</li><li>이유를 확인한 뒤 교실에서 말·손짓으로 표현해요.</li><li>몸짓이 불편하면 읽고 설명을 확인해도 학습을 마칠 수 있어요.</li></ol>
   <div className="mq-panel"><h2>수업 준비</h2><p>{spec.equipment.join(' · ')}</p><p>{spec.boundary}</p></div><details className="mq-panel"><summary>교사용 지도 메모·자료 검토 이력</summary><p>콘텐츠가 확인한 공식 자료 기준일: 2026-10-22. 이 날짜는 오늘 현장에서 검토했다는 뜻이 아니에요.</p><ol><li>공식 자료 링크와 학교의 최신 안내를 수업 전에 다시 확인해요.</li><li>장비·교실 역할 표현과 실제 위급 상황을 구분해요. 학생에게 실제 처치를 시키지 않아요.</li><li>선택 이유를 말해 보게 하고, 읽기·손짓 등 참여 방법을 허용해요.</li></ol><a href="/teacher/manage" target="_blank" rel="noreferrer">관리자 자료 점검 기록 확인·관리</a></details>{sourceLinks}<ActivityReviewRecord game={AVAILABLE_GAMES.find(g=>g.type===gameId)!}/>
   <button className="mq-primary" onClick={()=>{started.current=performance.now();setPhase('scenario');}}>안전 상황 살펴보기</button>
  </>}
  {(phase==='scenario'||phase==='explain'||phase==='rehearsal')&&<><p className="mq-kicker">{reviewing?'다른 상황에서 이유 확인':`상황 ${index+1}`} · {current.title}</p><h2>{current.situation}</h2>
   {phase==='scenario'&&<>
    <fieldset className="mq-choices"><legend>어떤 선택이 안전할까요?</legend>{safetyChoiceOrder(current.choices,choiceSeed,index,reviewing).map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>{setSelected(c.id);if(c.id===current.answer)setPhase('explain');else if(!reviewing)setMissed(old=>[...new Set([...old,index])]);}}>{c.label}</button>)}</fieldset>
    {selected&&<p role="alert" className="mq-error">{current.choices.find(c=>c.id===selected)?.feedback}</p>}
   </>}
   {phase==='explain'&&<div className="mq-panel"><h3>선택한 이유를 확인해요</h3><p>{current.explanation}</p><label><input type="checkbox" checked={reason} onChange={e=>setReason(e.target.checked)}/>안전한 선택의 이유를 말이나 손짓으로 설명하거나 글로 확인했어요.</label><button disabled={!reason} className="mq-primary" onClick={()=>{setConfirmed(false);setPhase('rehearsal');}}>교실 역할 표현으로</button></div>}
   {phase==='rehearsal'&&<>
    <div className="mq-signal"><p>기기는 놓고 말·손짓으로 표현해요</p><strong>{current.rehearsal}</strong></div>
    <p>{spec.boundary}</p><label className="mq-panel"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>안전한 교실 표현을 해 보았거나 설명을 읽고 확인했어요</label>
    <button className="mq-primary" disabled={!confirmed} onClick={()=>finish('roleplay')}>말·손짓으로 표현했어요 · {reviewing||index===2?'학습 정리':'다음 상황'}</button>
    <button className="mq-secondary" disabled={!confirmed} onClick={()=>finish('read')}>읽고 설명을 확인했어요 · {reviewing||index===2?'학습 정리':'다음 상황'}</button>
   </>}{sourceLinks}
  </>}
  {phase==='summary'&&<section className="mq-panel"><h2>세 상황의 선택과 이유를 확인했어요 · 3/3</h2><p>{reviewed?'다른 상황에서도 같은 이유를 다시 확인했어요. 추가 점수나 전문 자격을 뜻하지 않아요.':'헷갈렸던 상황을 먼저, 모두 이해했다면 첫 상황을 다른 맥락으로 다시 살펴봐요.'}</p><button disabled={reviewed} onClick={review}>다른 상황으로 이유 한 번 더 확인</button><button className="mq-primary" onClick={save}>세 상황의 학습 결과 기록하기</button></section>}
  {phase==='done'&&<div className="mq-panel"><h2>세 상황을 배웠어요</h2><p>학습 결과는 실제 구조나 응급처치 능력을 인증하지 않아요. 전문 교육은 교사와 함께 확인해요.</p>{onExit&&<button className="mq-primary" onClick={onExit}>활동 목록으로</button>}</div>}
  <p className="mq-footnote">실제 위급 상황에서는 게임을 계속하지 말고 119와 가까운 어른에게 도움을 요청해요.</p>
 </section>;
}
