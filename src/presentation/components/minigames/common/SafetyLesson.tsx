import {LayoutDiagram} from '../../LayoutDiagram';
import {useEffect,useRef,useState} from 'react';
import {StartLabel} from '../../StartLabel';
import {SAFETY_LESSONS,safetyScenarios,safetyLessonResult,type SafetyLessonId,type SafetyLearningRecord,type SafetyScenario} from '../../../../domain/safetyLessons';
import {safetyChoiceOrder} from '../../../../domain/fourthGameRules';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import './MovementQuest.css';
import './SafetyLesson.css';
import {ActivityReviewRecord} from '../../ActivityReviewRecord';
import {AVAILABLE_GAMES} from '../../../../domain/gamesData';
import {ActivityProgress} from './ActivityProgress';

/** 상황 카드 그림: AED 기기, 수건으로 감싼 얼음팩, 손 떼기 신호. */
export function SafetyPicture({kind}:{kind:NonNullable<SafetyScenario['picture']>}){
 const label=kind==='aed'?'AED 기기 그림: 상자 가운데 하트와 번개 표시':kind==='coldpack'?'수건으로 감싼 얼음팩 그림':'손바닥을 보이며 손 떼기 신호';
 return <figure className="safety-picture" data-picture={kind}><svg viewBox="0 0 120 90" role="img" aria-label={label}>
  {kind==='aed'&&<><rect x="18" y="10" width="84" height="70" rx="12" className="safety-pic-box"/><path d="M60 64 L36 40 A12 12 0 0 1 60 26 A12 12 0 0 1 84 40 Z" className="safety-pic-heart"/><path d="M63 30 L54 46 L62 46 L56 60 L70 42 L62 42 L68 30 Z" className="safety-pic-bolt"/><rect x="50" y="4" width="20" height="8" rx="3" className="safety-pic-box"/></>}
  {kind==='coldpack'&&<><rect x="14" y="22" width="92" height="50" rx="10" className="safety-pic-towel"/><path d="M14 34 H106 M14 60 H106" className="safety-pic-stripe"/><rect x="34" y="30" width="52" height="34" rx="8" className="safety-pic-ice"/><text x="60" y="53" textAnchor="middle" className="safety-pic-text">❄</text></>}
  {kind==='handsoff'&&<><circle cx="60" cy="45" r="40" className="safety-pic-ring"/><text x="60" y="62" textAnchor="middle" className="safety-pic-hand">✋</text></>}
 </svg><figcaption>{kind==='aed'?'AED(자동 심장 충격기)':kind==='coldpack'?'수건으로 감싼 얼음팩':'모두 손 떼세요!'}</figcaption></figure>;
}

interface Props {gameId:SafetyLessonId;groupId?:string;solo?:boolean;enqueueAction?:(action:{id:string;type:string;payload:{id:string;amount:number;details:GameResultDetails};timestamp:number})=>void;onExit?:()=>void}
/**
 * 안전 상황 학습. 한 상황은 두 번 누르면 끝난다: ① 안전한 선택 고르기 → ② 이유와 교실 표현을 보고 '표현했어요' 또는 '읽고 확인했어요'.
 */
export function SafetyLesson({gameId,groupId='standalone-player',enqueueAction,onExit}:Props){
 const spec=SAFETY_LESSONS[gameId];
 const [scenarioSet,setScenarioSet]=useState<'core'|'alternate'>('core');
 const [choiceSeed]=useState(()=>Math.floor(Math.random()*1000));
 const [missed,setMissed]=useState<number[]>([]),[reviewing,setReviewing]=useState(false),[reviewed,setReviewed]=useState(false);
 const [phase,setPhase]=useState<'intro'|'scenario'|'explain'|'summary'|'done'>('intro');
 const [index,setIndex]=useState(0),[selected,setSelected]=useState('');
 const [records,setRecords]=useState<SafetyLearningRecord[]>([]);
 const started=useRef(0),saved=useRef(false),transition=useRef(false);
 const current=safetyScenarios(gameId,reviewing?(scenarioSet==='core'?'alternate':'core'):scenarioSet)[index];
 useEffect(()=>{window.scrollTo(0,0);},[phase,index]);
 const finish=(mode:SafetyLearningRecord['mode'])=>{
  if(phase!=='explain'||saved.current||transition.current)return;
  transition.current=true;
  if(reviewing){setReviewed(true);setReviewing(false);setIndex(2);setPhase('summary');}
  else{const next=[...records,{scenario:index,answer:selected,mode}];setRecords(next);
   if(index===spec.scenarios.length-1)setPhase('summary');
   else{setIndex(index+1);setSelected('');setPhase('scenario');}
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
 const review=()=>{setReviewing(true);setIndex(missed[0]??0);setSelected('');setPhase('scenario');};
 const sourceLinks=<details className="mq-panel"><summary>확인한 공식 자료 · 2026-10-22</summary><ul>{spec.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul></details>;
 const nextLabel=reviewing||index===2?'학습 정리':'다음 상황';
 return <section className="movement-quest safety-lesson" data-safety={gameId} data-phase={phase} aria-label={spec.name}>
  <header className="mq-heading"><span aria-hidden="true">{spec.emoji}</span><div><p>안전 상황 학습</p><h1>{spec.name}</h1></div><span className="mq-pill">{phase==='intro'?'준비':reviewing?'이유 다시 확인':phase==='summary'||phase==='done'?'학습 정리':`${index+1} / 3`}</span></header>
  {phase==='intro'&&<>
   <ol className="safety-rules3" aria-label="학습 방법 3줄">{spec.rules3.map((rule,i)=><li key={i}><strong>{['무엇을','어떻게','언제 끝나요'][i]}</strong><span>{rule}</span></li>)}</ol>
   <button className="mq-primary safety-start" onClick={()=>{started.current=performance.now();setPhase('scenario');}}><StartLabel sub="안전 상황 살펴보기" spoken="안전 상황 살펴보기 시작"/></button>
   <details className="mq-panel safety-prep"><summary>수업 준비 · 상황 카드 묶음 · 자료 확인</summary>
    <label>상황 카드 묶음<select value={scenarioSet} onChange={e=>setScenarioSet(e.target.value as 'core'|'alternate')}><option value="core">기본 상황</option><option value="alternate">다른 상황에서 같은 이유 확인</option></select></label>
    <p>선택지 위치보다 이유를 기억해요. 세 상황 뒤에 다른 상황으로 다시 확인할 수 있어요. 새로운 처치 방법을 제시하지 않아요.</p>
    <h2>준비물</h2><p>{spec.equipment.join(' · ')}</p><LayoutDiagram activity={gameId}/><p>{spec.boundary}</p>
    <details className="mq-panel"><summary>교사용 지도 메모·자료 검토 이력</summary><p>콘텐츠가 확인한 공식 자료 기준일: 2026-10-22. 이 날짜는 오늘 현장에서 검토했다는 뜻이 아니에요.</p><ol><li>공식 자료 링크와 학교의 최신 안내를 수업 전에 다시 확인해요.</li><li>장비·교실 역할 표현과 실제 위급 상황을 구분해요. 학생에게 실제 처치를 시키지 않아요.</li><li>선택 이유를 말해 보게 하고, 읽기·손짓 등 참여 방법을 허용해요.</li></ol><a href="/teacher/manage" target="_blank" rel="noreferrer">관리자 자료 점검 기록 확인·관리</a></details>
    {sourceLinks}<ActivityReviewRecord game={AVAILABLE_GAMES.find(g=>g.type===gameId)!}/>
   </details>
  </>}
  {phase!=='intro'&&phase!=='explain'&&<ActivityProgress steps={spec.scenarios.map(s=>s.title)} current={index} results={records.map(()=>'complete')}/>}
  {(phase==='scenario'||phase==='explain')&&<><p className="mq-kicker">{reviewing?'다른 상황에서 이유 확인':`상황 ${index+1}`} · {current.title}</p><div className="safety-situation"><h2>{current.situation}</h2>{current.picture&&<SafetyPicture kind={current.picture}/>}</div>
   {phase==='scenario'&&<>
    {/* 틀린 뒤 다시 풀 때도 선택지 순서를 그대로 둬요(교실 TV에서 순서가 바뀌면 헷갈려요). */}
    <fieldset className="mq-choices"><legend>어떤 선택이 안전할까요?</legend>{safetyChoiceOrder(current.choices,choiceSeed,index,false).map(c=><button key={c.id} aria-pressed={selected===c.id} onClick={()=>{setSelected(c.id);if(c.id===current.answer)setPhase('explain');else if(!reviewing)setMissed(old=>[...new Set([...old,index])]);}}>{c.label}</button>)}</fieldset>
    {selected&&<p role="alert" className="mq-error">{current.choices.find(c=>c.id===selected)?.feedback}</p>}
   </>}
   {phase==='explain'&&<>
    <div className="mq-panel safety-why"><h3>✅ 왜 안전할까요?</h3><p>{current.explanation}</p><p className="safety-act"><strong>🙋 교실에서 해 봐요</strong> {current.rehearsal}</p></div>
    <div className="safety-finish">
     <button className="mq-primary" onClick={()=>finish('roleplay')}>말·손짓으로 표현했어요 · {nextLabel}</button>
     <button className="mq-secondary" onClick={()=>finish('read')}>읽고 설명을 확인했어요 · {nextLabel}</button>
    </div>
    <p className="safety-boundary">{spec.boundary}</p>
   </>}
  </>}
  {phase==='summary'&&<section className="mq-panel"><h2>세 상황의 선택과 이유를 확인했어요 · 3/3</h2><p>{reviewed?'다른 상황에서도 같은 이유를 다시 확인했어요. 추가 점수나 전문 자격을 뜻하지 않아요.':'헷갈렸던 상황을 먼저, 모두 이해했다면 첫 상황을 다른 맥락으로 다시 살펴봐요.'}</p><button className="mq-primary" onClick={save}>세 상황의 학습 결과 기록하기</button><button disabled={reviewed} onClick={review}>다른 상황으로 이유 한 번 더 확인</button></section>}
  {phase==='done'&&<div className="mq-panel"><h2>세 상황을 배웠어요</h2><p>학습 결과는 실제 구조나 응급처치 능력을 인증하지 않아요. 전문 교육은 교사와 함께 확인해요.</p>{onExit&&<button className="mq-primary" onClick={onExit}>활동 목록으로</button>}</div>}
  {phase!=='intro'&&sourceLinks}
  <p className="mq-footnote">실제 위급 상황에서는 게임을 계속하지 말고 119와 가까운 어른에게 도움을 요청해요.</p>
 </section>;
}
