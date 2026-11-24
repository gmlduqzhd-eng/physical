import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ExportMenu} from './components/ExportMenu';
import {ClassSwitcher} from './components/ClassSwitcher';
import {useClassProgress} from '../application/classProgressStore';
import {useClassRoster} from '../application/classRosterStore';
import {loadTodaySettings,saveTodaySettings} from '../application/todayLessonPrefs';
import {currentClass} from '../domain/classRoster';
import {TODAY_GRADES,TODAY_MINUTES,TODAY_SPACES,type TodaySettings} from '../domain/todayLesson';
import {DEFAULT_WEEK_LESSONS,PICK_REASON_LABEL,WEEK_HEADERS,WEEK_LESSONS,buildWeekPlan,weekKeyOf,weekRows,type WeekLessons} from '../domain/weekPlan';
import type {ExportTable} from '../application/documentExport';
import './TodayLesson.css';
import './WeekPlanPage.css';

/**
 * 여러 차시 한 번에 짜기: 학년·장소·시간과 차시 수를 고르면 차시마다 준비운동·본게임·정리운동을 짜 준다.
 * 본게임은 우리 반 반응(👍/👎)을 보고 고른다. 차시를 누르면 그 본게임으로 '오늘 수업'이 열린다.
 */
export function WeekPlanPage(){
 const progress=useClassProgress(),className=currentClass(useClassRoster()).name;
 const [settings,setSettings]=useState<TodaySettings>(loadTodaySettings);
 const [count,setCount]=useState<WeekLessons>(DEFAULT_WEEK_LESSONS),[shuffle,setShuffle]=useState(0);
 const set=<K extends keyof TodaySettings>(k:K,v:TodaySettings[K])=>setSettings(s=>{const n={...s,[k]:v,mainId:undefined};saveTodaySettings(n);return n;});
 const plan=useMemo(()=>buildWeekPlan(settings,count,progress,weekKeyOf(Date.now()),shuffle),[settings,count,progress,shuffle]);
 const table=():ExportTable=>({title:`${className} 체육 ${count}차시 계획`,fileBase:'체육차시계획',meta:[['반',className],['학년',TODAY_GRADES.find(g=>g.id===settings.grade)?.label??settings.grade],['장소',settings.space],['한 차시',`${settings.minutes}분`],['짠 주',`${plan.weekKey} 주`]],headers:WEEK_HEADERS,rows:weekRows(plan)});
 const stage=(l:typeof plan.lessons[number],kind:string)=>l.plan.stages.find(s=>s.kind===kind);
 return <FlowShell utilities back="/today" backLabel="오늘 수업" className="today-page week-page">
  <section className="today-card week-card" aria-labelledby="week-title">
   <p className="eyebrow">오늘 수업 · 여러 차시</p>
   <h1 id="week-title">{count}차시를 한 번에 짜요</h1>
   <p className="week-lead">본게임은 우리 반 반응을 보고 골라요. 👍가 많았던 활동과 아직 안 해 본 활동이 먼저 나와요.</p>
   <ClassSwitcher manage={false}/>
   <div className="today-quick" role="group" aria-label="학년과 장소">
    <div className="today-choice" role="group" aria-label="학년">{TODAY_GRADES.map(g=><button key={g.id} type="button" aria-pressed={settings.grade===g.id} onClick={()=>set('grade',g.id)}>{g.label}</button>)}</div>
    <div className="today-choice" role="group" aria-label="어디서">{TODAY_SPACES.map(s=><button key={s} type="button" aria-pressed={settings.space===s} onClick={()=>set('space',s)}>{s}</button>)}</div>
   </div>
   <div className="today-quick" role="group" aria-label="시간과 차시 수">
    <div className="today-choice" role="group" aria-label="한 차시 시간">{TODAY_MINUTES.map(m=><button key={m} type="button" aria-pressed={settings.minutes===m} onClick={()=>set('minutes',m)}>{m}분</button>)}</div>
    <div className="today-choice" role="group" aria-label="차시 수">{WEEK_LESSONS.map(n=><button key={n} type="button" aria-pressed={count===n} onClick={()=>setCount(n)} data-week-count={n}>{n}차시</button>)}</div>
   </div>
   <ol className="week-list" aria-label="차시 계획">{plan.lessons.map(l=><li key={l.no} className="week-lesson" data-week-lesson={l.mainId}>
    <div className="week-lesson-head"><strong>{l.no}차시</strong><span className="week-reason" data-reason={l.reason}>{PICK_REASON_LABEL[l.reason]}</span></div>
    <p className="week-main"><span aria-hidden="true">{stage(l,'main')?.emoji}</span> {stage(l,'main')?.title} <small>본게임 {stage(l,'main')?.minutes}분</small></p>
    <p className="week-sub">준비운동 · {stage(l,'warmup')?.title??'-'} / 정리운동 · {stage(l,'cooldown')?.title??'-'}</p>
    <p className="week-sub">돌아보기 · {l.plan.reflection}</p>
    <Link className="today-secondary week-open" to={`/today?main=${encodeURIComponent(l.mainId)}`}>이 차시로 오늘 수업 열기 →</Link>
   </li>)}</ol>
   {plan.lessons.length===0&&<p role="status">이 학년·장소에 맞는 대표 게임이 없어요. 장소를 바꿔 보세요.</p>}
   <div className="today-row"><button type="button" className="today-secondary" onClick={()=>setShuffle(n=>n+1)} data-week-shuffle>🔀 다른 순서로</button><ExportMenu table={table}/></div>
   <p className="today-plan-note">같은 주에는 열 때마다 같은 계획이에요. 수업을 하고 👍/👎를 남기면 다음 계획에 반영돼요.</p>
  </section>
 </FlowShell>;
}
