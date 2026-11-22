import {useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ClassFeedbackSlot,ClassMapLink} from './components/ClassFeedbackSlot';
import {TeacherQuickGuide} from './components/TeacherQuickGuide';
import {saveTodayRun,useStoredTodayRun} from '../application/todayLessonStore';
import {useClassProgress} from '../application/classProgressStore';
import {lessonPlayId,type ClassProgress} from '../domain/classProgress';
import {MAP_MOMENT_MS,lessonMapMoment,type LessonMapMoment} from '../domain/lessonMapMoment';
import {readStorage,writeStorage} from '../application/browserStorage';
import {loadTodaySettings,loadTodayShuffle,saveTodaySettings,saveTodayShuffle} from '../application/todayLessonPrefs';
import {
 STAGE_LABEL,TODAY_GRADES,TODAY_MINUTES,TODAY_SPACES,TODAY_TEAMS,
 addExtraMain,advanceRun,localDayKey,todaySeed,bindStagePlays,buildTodayPlan,currentStage,formatSeconds,isStaleRun,mainCandidates,mainPath,otherMains,recordsSince,resumeRun,runSeconds,stageMinute,stageOutcomes,stagePlanText,stageTitle,mainGameLabel,startRun,stagePath,withRecordedExtras,
 type StageOutcome,type TodayPlan,type TodayRun,type TodaySettings,
} from '../domain/todayLesson';
import './TodayLesson.css';

/**
 * '오늘 수업' 40분 묶음 화면. 설정은 모두 기본값이 있어 ▶ 한 번이면 시작한다.
 * 단계마다 기존 활동 화면을 그대로 열고, 활동에서 나오면 이 화면으로 돌아와 다음 단계를 보여 준다.
 */
export function TodayLesson(){
 const run=useStoredTodayRun();
 const [params]=useSearchParams();
 // '1분 안내 다시 보기'를 누를 때마다 안내 창을 새로 띄운다(주소의 ?guide=1로도 열린다).
 const [guideAgain,setGuideAgain]=useState(0);
 const openGuide=()=>setGuideAgain(n=>n+1);
 const forceGuide=params.get('guide')==='1'||guideAgain>0;
 // 다른 날 남은 수업: 끝난 수업이면 조용히 치우고, 하던 수업이면 이어 할지 묻는다(기본은 새로 짜기).
 const stale=!!run&&isStaleRun(run,Date.now());
 const view=!run||(stale&&run.finishedAt!==undefined)?<TodaySetup openGuide={openGuide}/>
  :stale?<StalePrompt run={run}/>
  :run.finishedAt!==undefined?<TodaySummary run={run}/>:<TodayStageView run={run}/>;
 return <FlowShell utilities className="today-page">
  <TeacherQuickGuide key={guideAgain} force={forceGuide}/>
  {view}
 </FlowShell>;
}

function StalePrompt({run}:{run:TodayRun}){
 const navigate=useNavigate();
 const day=new Date(run.startedAt).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
 const resume=()=>{
  const next=resumeRun(run,Date.now());saveTodayRun(next);
  const s=currentStage(next);const p=s&&stagePath(s,next.plan.settings.teams);
  if(p)navigate(p);
 };
 return <section className="today-card" aria-labelledby="today-stale-title">
  <p className="eyebrow">오늘 수업</p>
  <h1 id="today-stale-title">{day}에 하던 수업이 남아 있어요</h1>
  <p className="today-lead">오늘은 새 수업을 짜는 것을 권해요. 하던 수업을 이어 하면 {run.index+1}단계({STAGE_LABEL[run.plan.stages[run.index]?.kind??'reflect']})부터 다시 해요.</p>
  <button type="button" className="primary today-primary today-big" onClick={()=>saveTodayRun(null)} autoFocus>✨ 오늘 수업 새로 짜기</button>
  <div className="today-row"><button type="button" className="today-secondary" onClick={resume}>{day} 수업 이어 하기</button></div>
  <StageList plan={run.plan} run={run}/>
 </section>;
}

const OUTCOME_TEXT:Record<StageOutcome,string>={played:'했어요',passed:'기록 없이 넘겼어요',skipped:'건너뛰었어요'};
/** outcomes: 끝 화면에서만 넘긴다(활동을 실제로 했는지, 열지 않고 넘겼는지). */
/** shown(gameId): '한 판 더' 게임 가운데 실제로 한 것만 단계 이름에 넣는다(없으면 모두). */
function StageList({plan,run,outcomes,shown}:{plan:TodayPlan;run?:TodayRun;outcomes?:StageOutcome[];shown?:(gameId:string)=>boolean}){
 return <ol className="today-stages" aria-label="오늘 수업 순서">
  {plan.stages.map((s,i)=>{
   const result=run?.results[i],outcome=outcomes?.[i];
   // 끝 화면에서는 실제 결과(했어요/넘겼어요/건너뛰었어요)가 표시를 정한다: 기록한 뒤 '건너뛰기'로 나간 활동도 ✓.
   const state=outcome?(outcome==='played'?'done':outcome):result?result.status:run&&i===run.index&&run.finishedAt===undefined?'now':'next';
   return <li key={i} data-state={state}>
    <span className="today-stage-no" aria-hidden="true">{state==='passed'?'→':state==='done'?'✓':state==='skipped'?'–':i+1}</span>
    <span className="today-stage-text"><b>{STAGE_LABEL[s.kind]}</b> · {s.emoji} {run?stageTitle(run,i,shown):s.title}{outcome&&<small className="today-stage-outcome"> · {OUTCOME_TEXT[outcome]}</small>}</span>
    <span className="today-stage-min">{result?<>{formatSeconds(result.seconds)}<small> · 계획 {s.minutes}분</small></>:stagePlanText(s)}</span>
    {!outcome&&<span className="sr-only">{state==='now'?'지금 단계':state==='done'?'마침':state==='skipped'?'건너뜀':'다음 단계'}</span>}
   </li>;
  })}
 </ol>;
}

function TodaySetup({openGuide}:{openGuide:()=>void}){
 const navigate=useNavigate();
 // 마지막으로 고른 학년·공간·시간·팀 수를 기억한다(1~2학년 선생님이 매번 바꾸지 않게).
 const [settings,setSettings]=useState<TodaySettings>(loadTodaySettings);
 // 같은 날·같은 설정이면 계획이 늘 같다. '다른 활동으로'를 눌러야만 바뀐다(그 횟수도 오늘 동안 기억한다).
 const [day,setDay]=useState(()=>localDayKey(Date.now()));
 const [shuffle,setShuffle]=useState(()=>loadTodayShuffle(Date.now()));
 // 화면을 자정 넘겨 열어 두었다가 돌아오면 오늘 날짜로 다시 맞춘다(어제 계획이 '오늘 계획'으로 보이지 않게).
 useEffect(()=>{
  const sync=()=>{
   if(document.visibilityState==='hidden')return;
   const now=Date.now(),today=localDayKey(now);
   setDay(prev=>{if(prev===today)return prev;setShuffle(loadTodayShuffle(now));return today;});
  };
  document.addEventListener('visibilitychange',sync);window.addEventListener('focus',sync);
  return ()=>{document.removeEventListener('visibilitychange',sync);window.removeEventListener('focus',sync);};
 },[]);
 const seed=todaySeed(day,settings,shuffle);
 const plan=useMemo(()=>buildTodayPlan(settings,seed),[settings,seed]);
 const mains=mainCandidates(settings.grade,settings.space);
 // 학년·공간을 바꿔 고른 본게임이 맞지 않게 되면 '알아서 골라 주세요'로 돌린다.
 const set=<K extends keyof TodaySettings>(k:K,v:TodaySettings[K])=>setSettings(s=>{const n={...s,[k]:v};if(n.mainId&&!mainCandidates(n.grade,n.space).some(g=>g.id===n.mainId))n.mainId=undefined;saveTodaySettings(n);return n;});
 const reshuffle=()=>{
  // 날짜가 바뀐 채 누르면 어제 횟수를 오늘로 넘기지 않고 오늘 것부터 다시 센다.
  const now=Date.now(),today=localDayKey(now);
  const next=(today===day?shuffle:loadTodayShuffle(now))+1;
  if(today!==day)setDay(today);
  saveTodayShuffle(now,next);setShuffle(next);
 };
 const start=()=>{
  const r=startRun(plan,Date.now());saveTodayRun(r);
  const first=r.plan.stages[0];const path=first&&stagePath(first,settings.teams);
  if(path)navigate(path);
 };
 return <section className="today-card" aria-labelledby="today-title">
  <p className="eyebrow">오늘 수업 · 한 번에 진행</p>
  <h1 id="today-title">준비운동부터 돌아보기까지 {settings.minutes}분</h1>
  {/* 학년과 장소는 시작 버튼 바로 위 한 줄에서 고른다(첫 화면 안에서 확인하고 누르게). */}
  <div className="today-quick" role="group" aria-label="학년과 장소">
   <div className="today-choice" role="group" aria-label="학년">{TODAY_GRADES.map(g=><button key={g.id} type="button" aria-pressed={settings.grade===g.id} onClick={()=>set('grade',g.id)}>{g.label}</button>)}</div>
   <div className="today-choice" role="group" aria-label="어디서">{TODAY_SPACES.map(s=><button key={s} type="button" aria-pressed={settings.space===s} onClick={()=>set('space',s)}>{s}</button>)}</div>
  </div>
  <button type="button" className="primary today-primary today-big" onClick={start}>▶ 오늘 수업 시작 · {plan.stages[1]?.title??'대표 게임'}</button>
  <div className="today-row today-plan-row"><button type="button" className="today-secondary" onClick={reshuffle}>🔀 다른 활동으로</button><span className="today-plan-note">오늘은 열 때마다 같은 계획이에요</span></div>
  <StageList plan={plan}/>
  <details className="today-settings">
   <summary>시간 · 팀 · 본게임 바꾸기 <small>({settings.minutes}분 · {settings.teams}팀)</small></summary>
   <fieldset><legend>몇 분</legend><div className="today-choice">{TODAY_MINUTES.map(m=><button key={m} type="button" aria-pressed={settings.minutes===m} onClick={()=>set('minutes',m)}>{m}분</button>)}</div></fieldset>
   <fieldset><legend>팀 수 (대표 게임)</legend><div className="today-choice">{TODAY_TEAMS.map(n=><button key={n} type="button" aria-pressed={settings.teams===n} onClick={()=>set('teams',n)}>{n}팀</button>)}</div></fieldset>
   <label className="today-select">본게임(대표 게임)
    <select value={settings.mainId??''} onChange={e=>set('mainId',e.target.value||undefined)}>
     <option value="">알아서 골라 주세요</option>
     {mains.map(g=><option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
    </select>
   </label>
  </details>
  <p className="today-more"><button type="button" className="today-link today-guide-again" onClick={openGuide}>❓ 1분 안내 다시 보기</button> · <Link to="/guide">처음 쓰는 선생님 안내 전체</Link> · <Link to="/print/signature-cards">규칙 카드·QR 안내 인쇄</Link></p>
 </section>;
}

/** 일정 간격으로 지금 시각을 다시 읽는다('지금 N분째' 표시용). */
function useNow(everyMs:number){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),everyMs);return ()=>window.clearInterval(t);},[everyMs]);
 return now;
}

/** 이 수업 동안 그 게임을 실제로 했는지: 기록한 판이 있거나 반응을 남긴 판이 있으면 한 것으로 본다. */
const didInLesson=(progress:ClassProgress,run:TodayRun,until:number)=>(gameId:string)=>!!lessonPlayId(progress,gameId,recordsSince(run),until);

function TodayStageView({run:stored}:{run:TodayRun}){
 const navigate=useNavigate();
 const progress=useClassProgress();
 const now=useNow(15000);
 // 활동 목록에서 직접 연 다른 대표 게임도 본게임 시간 안에 기록했으면 '한 판 더'로 센다(판 수와 끝 화면이 같은 판을 세게).
 const run=withRecordedExtras(stored,progress.plays);
 useEffect(()=>{if(run!==stored)saveTodayRun(run);},[run,stored]);
 const stage=currentStage(run);
 if(!stage)return null; // parseRun이 걸러 주지만, 혹시 모를 깨진 값에서도 화면이 멈추지 않게
 const total=run.plan.stages.length,teams=run.plan.settings.teams,path=stagePath(stage,teams);
 const step=(status:'done'|'skipped')=>{
  const next=advanceRun(run,status,Date.now());saveTodayRun(next);
  const ns=currentStage(next);const p=ns&&stagePath(ns,next.plan.settings.teams);
  if(p)navigate(p);else window.scrollTo(0,0);
 };
 const quit=()=>saveTodayRun(null);
 // 이 단계에서 기록한 판 수(본게임은 다른 대표 게임으로 한 판도 함께 센다)와 지난 시간으로, 한 판 더 할지 넘어갈지를 알려 준다.
 const others=otherMains(run);
 const stageIds=new Set(stage.kind==='main'?[stage.gameId,...mainCandidates(run.plan.settings.grade,run.plan.settings.space).map(g=>g.id)]:[stage.gameId]);
 const rounds=progress.plays.filter(x=>stageIds.has(x.id)&&x.at>=run.stageStartedAt).length;
 const minute=stageMinute(run,now),over=minute>stage.minutes;
 const unit=stage.kind==='main'?'판':'번';
 const again=stage.kind==='main'?'한 판 더':'한 번 더';
 const nextFirst=rounds>0&&(over||stage.kind!=='main');
 return <section className="today-card" aria-labelledby="today-stage-title">
  <p className="eyebrow">오늘 수업 · {run.index+1}/{total} · {STAGE_LABEL[stage.kind]}</p>
  <h1 id="today-stage-title"><span aria-hidden="true">{stage.emoji}</span> {stage.kind==='reflect'?'돌아보기':stage.title}</h1>
  {stage.kind==='reflect'
   ?<><p className="today-question">{stage.note}</p><p className="today-lead">손을 들어 두세 명이 말해 봐요. 약 {stage.minutes}분이면 충분해요.</p>
     <button type="button" className="primary today-primary today-big" onClick={()=>step('done')}>✅ 오늘 수업 마치기</button></>
   :<><p className="today-clock" role="status">⏱ 지금 {minute}분째 · 계획 {stage.minutes}분{rounds>0?` · ${rounds}${unit} 했어요`:''}</p>
     <p className="today-lead">{rounds===0?<>{stage.note} {stage.kind==='main'?`한 판은 4~6분쯤이에요. 약 ${stage.minutes}분 동안 여러 판을 해요.`:`한 번은 2~3분쯤이에요. 약 ${stage.minutes}분 동안 2~3번 되풀이해요.`}</>
      :over?'계획한 시간을 다 썼어요. 다음 단계로 넘어가요.'
      :stage.kind==='main'?`시간이 남았어요. ${again} 하거나 다른 대표 게임으로 바꿔 봐요.`:`시간이 남으면 ${again} 해요. 충분하면 다음 단계로 가요.`}</p>
     {nextFirst
      ?<><button type="button" className="primary today-primary today-big" onClick={()=>step('done')}>다음 단계 ▶</button>
        <div className="today-row">{path&&<button type="button" className="today-secondary" onClick={()=>navigate(path)}>🔁 {again} · {stage.title}</button>}</div></>
      :<>{path&&<button type="button" className="primary today-primary today-big" onClick={()=>navigate(path)}>{rounds>0?`🔁 ${again} · ${stage.title}`:`▶ ${stage.title} 열기`}</button>}
        <div className="today-row"><button type="button" className="today-secondary" onClick={()=>step('done')}>다음 단계 ▶</button>{rounds===0&&<button type="button" className="today-ghost" onClick={()=>step('skipped')}>건너뛰기</button>}</div></>}
     {stage.kind==='main'&&rounds>0&&!over&&others.length>0&&<div className="today-others"><p>다른 대표 게임으로 한 판 더</p><div className="today-choice">{others.map(g=><button key={g.id} type="button" onClick={()=>{saveTodayRun(addExtraMain(run,g.id));navigate(mainPath(g.id,teams));}}>{g.emoji} {g.name}</button>)}</div></div>}</>}
  <StageList plan={run.plan} run={run} shown={didInLesson(progress,run,Infinity)}/>
  <p className="today-more"><button type="button" className="today-link" onClick={quit}>오늘 수업 그만하고 새로 짜기</button></p>
 </section>;
}

/**
 * 끝 화면의 반응은 수업 중에 그 활동에 남긴 판(기록한 판, 없으면 반응만 누른 판)에 붙인다.
 * 게임 결과 화면에서 이미 누른 반응이 그대로 보이고, 다시 눌러도 같은 판의 반응을 바꿀 뿐이다.
 * 그런 판이 없으면 이 수업·이 단계로 정해지는 판 id를 써서 새로고침해도 같은 칸으로 이어진다.
 */
/**
 * 수업 끝: 반 원정 지도 칸이 열리는 장면. 칸이 차례로 튀어나온 뒤에도 선생님이 '닫기'를 누를 때까지 그대로 둔다.
 * 저절로 접히면 아래 내용(👍/👎 반응 칸)이 갑자기 위로 올라와 잘못 누르기 쉽기 때문이다.
 * 소리로 읽는 것은 제목 한 줄뿐이고(30칸을 다 읽지 않게), 닫은 뒤에는 한 줄 안내로 초점을 옮긴다.
 * 움직임 줄이기를 켠 기기에서는 칸이 움직이지 않고 그대로 보인다(CSS).
 */
function MapMoment({moment,onClose}:{moment:LessonMapMoment;onClose:()=>void}){
 const fresh=new Set(moment.fresh);
 const first=moment.fresh[0]??0;
 return <div className="today-map-moment" data-full={moment.full||undefined}>
  <p className="today-map-moment-title" role="status" aria-live="polite"><span aria-hidden="true">🗺️</span> {moment.line}</p>
  <ol className="today-map-moment-tiles" aria-label={`반 원정 지도 ${moment.view.opened}/${moment.view.tiles.length}칸`}>{moment.view.tiles.map(t=><li key={t.index} data-open={t.open||undefined} data-fresh={fresh.has(t.index)||undefined} style={fresh.has(t.index)?{animationDelay:`${Math.min(MAP_MOMENT_MS-600,(t.index-first)*160)}ms`}:undefined}><span aria-hidden="true">{t.open?t.icon:'·'}</span></li>)}</ol>
  <p className="today-map-moment-sub">{moment.full?`${moment.view.current.icon} ${moment.view.current.name}까지 모두 다녀왔어요. 다음 수업부터 새 지도를 열어요.`:<>지금 {moment.view.current.icon} {moment.view.current.name}{moment.view.nextRegion?` · ${moment.view.nextRegion.icon} ${moment.view.nextRegion.name}까지 ${moment.view.nextRegion.left}칸`:''}</>}</p>
  <div className="today-map-moment-actions"><Link className="today-map-moment-link" to="/class-progress?tab=map">반 원정 지도 보기</Link><button type="button" className="today-map-moment-skip" onClick={onClose}>닫기</button></div>
 </div>;
}

function TodaySummary({run:stored}:{run:TodayRun}){
 const progress=useClassProgress();
 // 수업 중 활동 목록에서 직접 연 대표 게임도 본게임 시간 안에 기록했으면 본게임으로 센다(단계 화면의 판 수와 같게).
 const run=withRecordedExtras(stored,progress.plays);
 const finished=run.finishedAt??Date.now();
 const since=recordsSince(run);
 const totalSec=runSeconds(run);
 // 단계마다 반응을 붙일 판을 한 번 정해 수업에 적어 둔다. 그 뒤에는 다시 누르거나 새로고침해도 같은 판의 반응만 바뀐다.
 const bound=bindStagePlays(run,gameId=>lessonPlayId(progress,gameId,since,finished));
 useEffect(()=>{if(bound!==stored)saveTodayRun(bound);},[bound,stored]);
 const recorded=(gameId:string)=>progress.plays.some(x=>x.id===gameId&&x.at>=since&&x.at<=finished);
 const outcomes=stageOutcomes(run,recorded);
 // '한 판 더' 링크를 눌렀다가 바로 나온 게임처럼 실제로 하지 않은 게임은 단계 이름과 반응 칸에서 뺀다.
 const did=didInLesson(progress,run,finished);
 const count=(o:StageOutcome)=>outcomes.filter(x=>x===o).length;
 // 수업을 마치면 지도 칸이 열리는 장면을 한 번 크게 보여 준다(같은 수업은 새로고침해도 다시 띄우지 않는다).
 const moment=lessonMapMoment(progress,since,finished);
 const momentKey=`physical_today_map_moment_${finished}`;
 const [momentOpen,setMomentOpen]=useState(()=>readStorage(momentKey,'session')!=='seen');
 // 닫으면 한 줄 안내로 초점을 옮긴다(닫기 단추가 사라지며 초점이 페이지 맨 처음으로 빠지지 않게).
 const mapLineRef=useRef<HTMLParagraphElement>(null);
 const focusLine=useRef(false);
 const closeMoment=()=>{writeStorage(momentKey,'seen','session');focusLine.current=true;setMomentOpen(false);};
 useEffect(()=>{if(!momentOpen&&focusLine.current){focusLine.current=false;mapLineRef.current?.focus();}},[momentOpen]);
 const parts=[`${count('played')}단계를 했어요`,count('passed')?`${count('passed')}단계는 기록 없이 넘겼어요`:'',count('skipped')?`${count('skipped')}단계는 건너뛰었어요`:''].filter(Boolean);
 return <section className="today-card" aria-labelledby="today-summary-title">
  <p className="eyebrow">오늘 수업 끝 · {formatSeconds(totalSec)} · 계획 {run.plan.settings.minutes}분</p>
  <h1 id="today-summary-title">🎉 오늘 수업을 마쳤어요</h1>
  {moment&&momentOpen&&<MapMoment moment={moment} onClose={closeMoment}/>}
  {moment&&!momentOpen&&<p ref={mapLineRef} tabIndex={-1} className="today-map-line">🗺️ {moment.line} <Link to="/class-progress?tab=map">반 원정 지도 보기</Link></p>}
  <p className="today-lead">{run.plan.stages.length}단계 중 {parts.join(' · ')}.</p>
  <StageList plan={run.plan} run={run} outcomes={outcomes} shown={did}/>
  <div className="today-reflection"><p className="today-reflection-label">오늘의 질문</p><p className="today-question">{run.plan.reflection}</p></div>
  <h2 className="today-sub">활동마다 반응 남기기</h2>
  <p className="today-hint">게임 결과 화면에서 이미 누른 반응은 그대로 보여요. 바꾸고 싶을 때만 다시 눌러요.</p>
  {/* 건너뛴 단계는 반응 칸을 두지 않는다(그 활동에 이미 남긴 반응이 있으면 그대로 보여 준다). */}
  {run.plan.stages.map((s,i)=>s.gameId&&(outcomes[i]!=='skipped'||did(s.gameId))&&<div key={`${i}-${s.gameId}`} className="today-feedback-group">
   <div className="today-feedback"><p><b>{STAGE_LABEL[s.kind]}</b> · {s.emoji} {s.title}</p><ClassFeedbackSlot gameId={s.gameId} playId={bound.stagePlays?.[i]} tone="light" showMap={false}/></div>
   {/* 본게임 중 '다른 대표 게임으로 한 판 더'로 한 게임도 칸을 따로 둔다(그 게임에 남긴 판에 붙는다). */}
   {s.kind==='main'&&(run.extraMains??[]).map((id,k)=>did(id)&&<div key={`x-${id}`} className="today-feedback"><p><b>{STAGE_LABEL.main}</b> · {mainGameLabel(id)} <small>(한 판 더)</small></p><ClassFeedbackSlot gameId={id} playId={bound.extraPlays?.[k]} tone="light" showMap={false}/></div>)}
  </div>)}
  <ClassMapLink progress={progress}/>
  <button type="button" className="primary today-primary" onClick={()=>saveTodayRun(null)}>새 수업 짜기</button>
 </section>;
}
