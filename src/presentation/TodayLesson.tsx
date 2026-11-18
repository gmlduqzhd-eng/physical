import {useMemo,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ClassFeedbackSlot} from './components/ClassFeedbackSlot';
import {TeacherQuickGuide} from './components/TeacherQuickGuide';
import {saveTodayRun,useTodayRun} from '../application/todayLessonStore';
import {
 DEFAULT_TODAY,STAGE_LABEL,TODAY_GRADES,TODAY_MINUTES,TODAY_SPACES,TODAY_TEAMS,
 advanceRun,buildTodayPlan,currentStage,formatSeconds,mainCandidates,startRun,stagePath,
 type TodayPlan,type TodayRun,type TodaySettings,type TodayStage,
} from '../domain/todayLesson';
import './TodayLesson.css';

/**
 * '오늘 수업' 40분 묶음 화면. 설정은 모두 기본값이 있어 ▶ 한 번이면 시작한다.
 * 단계마다 기존 활동 화면을 그대로 열고, 활동에서 나오면 이 화면으로 돌아와 다음 단계를 보여 준다.
 */
const newSeed=()=>Math.floor(Math.random()*1e9);

export function TodayLesson(){
 const run=useTodayRun();
 const [params]=useSearchParams();
 const forceGuide=params.get('guide')==='1';
 return <FlowShell utilities className="today-page">
  <TeacherQuickGuide force={forceGuide}/>
  {run?(run.finishedAt!==undefined?<TodaySummary run={run}/>:<TodayStageView run={run}/>):<TodaySetup/>}
 </FlowShell>;
}

function StageList({plan,run}:{plan:TodayPlan;run?:TodayRun}){
 return <ol className="today-stages" aria-label="오늘 수업 순서">
  {plan.stages.map((s,i)=>{
   const result=run?.results[i];
   const state=result?result.status:run&&i===run.index&&run.finishedAt===undefined?'now':'next';
   return <li key={i} data-state={state}>
    <span className="today-stage-no" aria-hidden="true">{result?.status==='done'?'✓':result?.status==='skipped'?'–':i+1}</span>
    <span className="today-stage-text"><b>{STAGE_LABEL[s.kind]}</b> · {s.emoji} {s.title}</span>
    <span className="today-stage-min">{result?formatSeconds(result.seconds):`약 ${s.minutes}분`}</span>
    <span className="sr-only">{state==='now'?'지금 단계':state==='done'?'마침':state==='skipped'?'건너뜀':'다음 단계'}</span>
   </li>;
  })}
 </ol>;
}

function TodaySetup(){
 const navigate=useNavigate();
 const [settings,setSettings]=useState<TodaySettings>(DEFAULT_TODAY);
 const [seed,setSeed]=useState(newSeed);
 const plan=useMemo(()=>buildTodayPlan(settings,seed),[settings,seed]);
 const mains=mainCandidates(settings.grade,settings.space);
 // 학년·공간을 바꿔 고른 본게임이 맞지 않게 되면 '알아서 골라 주세요'로 돌린다.
 const set=<K extends keyof TodaySettings>(k:K,v:TodaySettings[K])=>setSettings(s=>{const n={...s,[k]:v};if(n.mainId&&!mainCandidates(n.grade,n.space).some(g=>g.id===n.mainId))n.mainId=undefined;return n;});
 const start=()=>{
  const r=startRun(plan,Date.now());saveTodayRun(r);
  const first=r.plan.stages[0];const path=first&&stagePath(first,settings.teams);
  if(path)navigate(path);
 };
 return <section className="today-card" aria-labelledby="today-title">
  <p className="eyebrow">오늘 수업 · 한 번에 진행</p>
  <h1 id="today-title">준비운동부터 돌아보기까지 {settings.minutes}분</h1>
  <p className="today-lead">학년·공간·시간을 고르면 준비운동 → 대표 게임 → 정리운동 → 돌아보기를 짜 드려요. 고르지 않아도 기본값으로 바로 시작해요.</p>
  <button type="button" className="primary today-primary today-big" onClick={start}>▶ 오늘 수업 시작 · {plan.stages[1]?.title??'대표 게임'}</button>
  <StageList plan={plan}/>
  <details className="today-settings" open>
   <summary>학년 · 공간 · 시간 · 팀 바꾸기</summary>
   <fieldset><legend>학년</legend><div className="today-choice">{TODAY_GRADES.map(g=><button key={g.id} type="button" aria-pressed={settings.grade===g.id} onClick={()=>set('grade',g.id)}>{g.label}</button>)}</div></fieldset>
   <fieldset><legend>어디서</legend><div className="today-choice">{TODAY_SPACES.map(s=><button key={s} type="button" aria-pressed={settings.space===s} onClick={()=>set('space',s)}>{s}</button>)}</div></fieldset>
   <fieldset><legend>몇 분</legend><div className="today-choice">{TODAY_MINUTES.map(m=><button key={m} type="button" aria-pressed={settings.minutes===m} onClick={()=>set('minutes',m)}>{m}분</button>)}</div></fieldset>
   <fieldset><legend>팀 수 (대표 게임)</legend><div className="today-choice">{TODAY_TEAMS.map(n=><button key={n} type="button" aria-pressed={settings.teams===n} onClick={()=>set('teams',n)}>{n}팀</button>)}</div></fieldset>
   <label className="today-select">본게임(대표 게임)
    <select value={settings.mainId??''} onChange={e=>set('mainId',e.target.value||undefined)}>
     <option value="">알아서 골라 주세요</option>
     {mains.map(g=><option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
    </select>
   </label>
   <button type="button" className="today-secondary" onClick={()=>setSeed(newSeed())}>🔀 다른 준비·정리운동으로</button>
  </details>
  <p className="today-more"><Link to="/guide">처음 쓰는 선생님 1분 안내</Link> · <Link to="/print/signature-cards">규칙 카드·QR 안내 인쇄</Link></p>
 </section>;
}

function TodayStageView({run}:{run:TodayRun}){
 const navigate=useNavigate();
 const stage=currentStage(run) as TodayStage;
 const total=run.plan.stages.length,path=stagePath(stage,run.plan.settings.teams);
 const step=(status:'done'|'skipped')=>{
  const next=advanceRun(run,status,Date.now());saveTodayRun(next);
  const ns=currentStage(next);const p=ns&&stagePath(ns,next.plan.settings.teams);
  if(p)navigate(p);else window.scrollTo(0,0);
 };
 const quit=()=>saveTodayRun(null);
 return <section className="today-card" aria-labelledby="today-stage-title">
  <p className="eyebrow">오늘 수업 · {run.index+1}/{total} · {STAGE_LABEL[stage.kind]}</p>
  <h1 id="today-stage-title"><span aria-hidden="true">{stage.emoji}</span> {stage.kind==='reflect'?'돌아보기':stage.title}</h1>
  {stage.kind==='reflect'
   ?<><p className="today-question">{stage.note}</p><p className="today-lead">손을 들어 두세 명이 말해 봐요. 약 {stage.minutes}분이면 충분해요.</p>
     <button type="button" className="primary today-primary today-big" onClick={()=>step('done')}>✅ 오늘 수업 마치기</button></>
   :<><p className="today-lead">{stage.note} 약 {stage.minutes}분.</p>
     {path&&<button type="button" className="primary today-primary today-big" onClick={()=>navigate(path)}>▶ {stage.title} 열기</button>}
     <div className="today-row"><button type="button" className="today-secondary" onClick={()=>step('done')}>다음 단계 ▶</button><button type="button" className="today-ghost" onClick={()=>step('skipped')}>건너뛰기</button></div></>}
  <StageList plan={run.plan} run={run}/>
  <p className="today-more"><button type="button" className="today-link" onClick={quit}>오늘 수업 그만하고 새로 짜기</button></p>
 </section>;
}

function TodaySummary({run}:{run:TodayRun}){
 const totalSec=Math.round(((run.finishedAt??Date.now())-run.startedAt)/1000);
 const done=run.results.filter(r=>r.status==='done').length;
 return <section className="today-card" aria-labelledby="today-summary-title">
  <p className="eyebrow">오늘 수업 끝 · {formatSeconds(totalSec)}</p>
  <h1 id="today-summary-title">🎉 오늘 수업을 마쳤어요</h1>
  <p className="today-lead">{run.plan.stages.length}단계 중 {done}단계를 했어요.</p>
  <StageList plan={run.plan} run={run}/>
  <div className="today-reflection"><p className="today-reflection-label">오늘의 질문</p><p className="today-question">{run.plan.reflection}</p></div>
  <h2 className="today-sub">활동마다 반응 남기기</h2>
  {run.plan.stages.filter(s=>s.gameId).map(s=><div key={s.gameId} className="today-feedback"><p><b>{STAGE_LABEL[s.kind]}</b> · {s.emoji} {s.title}</p><ClassFeedbackSlot gameId={s.gameId!} tone="light"/></div>)}
  <button type="button" className="primary today-primary" onClick={()=>saveTodayRun(null)}>새 수업 짜기</button>
 </section>;
}
