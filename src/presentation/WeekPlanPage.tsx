import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ExportMenu} from './components/ExportMenu';
import {ClassSwitcher} from './components/ClassSwitcher';
import {useClassProgress} from '../application/classProgressStore';
import {useClassRoster} from '../application/classRosterStore';
import {loadTodaySettings,saveTodaySettings} from '../application/todayLessonPrefs';
import {currentClass} from '../domain/classRoster';
import {TODAY_GRADES,TODAY_MINUTES,TODAY_SPACES,parseTodaySettings,type TodaySettings} from '../domain/todayLesson';
import {DEFAULT_WEEK_LESSONS,PICK_REASON_LABEL,WEEK_HEADERS,WEEK_LESSONS,buildWeekPlan,lessonsDone,parsePinnedWeek,pinWeek,pinnedPlan,weekKeyOf,weekRows,type PinnedWeek,type WeekLessons} from '../domain/weekPlan';
import {readJsonStorage,removeStorage,writeStorage} from '../application/browserStorage';
import {classStorageKey} from '../domain/classRoster';
import type {ExportTable} from '../application/documentExport';
import './TodayLesson.css';
import './WeekPlanPage.css';
import {OfflineReady} from './components/OfflineReady';
import {CloudSyncPrompt} from './components/CloudSyncPrompt';

/**
 * 여러 차시 한 번에 짜기: 학년·장소·시간과 차시 수를 고르면 차시마다 준비운동·본게임·정리운동을 짜 준다.
 * 본게임은 우리 반 반응(👍/👎)을 보고 고른다. 차시를 누르면 그 본게임으로 '오늘 수업'이 열린다.
 */
export function WeekPlanPage(){
 const roster=useClassRoster();
 // 반을 바꾸면 그 반의 고정 계획으로 다시 그린다.
 return <WeekPlanOf key={roster.current} classId={roster.current} className={currentClass(roster).name}/>;
}
const PIN_BASE='physical_week_plan_v1';
function WeekPlanOf({classId,className}:{classId:string;className:string}){
 const progress=useClassProgress(),pinKey=classStorageKey(PIN_BASE,classId),weekKey=weekKeyOf(Date.now());
 // 이번 주에 고정해 둔 계획(주가 바뀌면 저절로 풀린다).
 const [pin,setPin]=useState<PinnedWeek|null>(()=>parsePinnedWeek(readJsonStorage(pinKey),weekKey,parseTodaySettings));
 const [settings,setSettings]=useState<TodaySettings>(loadTodaySettings);
 const [count,setCount]=useState<WeekLessons>(DEFAULT_WEEK_LESSONS),[shuffle,setShuffle]=useState(0);
 const set=<K extends keyof TodaySettings>(k:K,v:TodaySettings[K])=>setSettings(s=>{const n={...s,[k]:v,mainId:undefined};saveTodaySettings(n);return n;});
 const draft=useMemo(()=>buildWeekPlan(settings,count,progress,weekKey,shuffle),[settings,count,progress,weekKey,shuffle]);
 const plan=useMemo(()=>pin?pinnedPlan(pin):draft,[pin,draft]);
 const done=pin?lessonsDone(pin,progress):[];
 const fix=()=>{const next=pinWeek(draft,Date.now());writeStorage(pinKey,JSON.stringify(next));setPin(next);};
 const unfix=()=>{removeStorage(pinKey);setPin(null);};
 const table=():ExportTable=>({title:`${className} 체육 ${plan.lessons.length}차시 계획`,fileBase:'체육차시계획',meta:[['반',className],['학년',TODAY_GRADES.find(g=>g.id===plan.settings.grade)?.label??plan.settings.grade],['장소',plan.settings.space],['한 차시',`${plan.settings.minutes}분`],['짠 주',`${plan.weekKey} 주`]],headers:WEEK_HEADERS,rows:weekRows(plan)});
 const stage=(l:typeof plan.lessons[number],kind:string)=>l.plan.stages.find(s=>s.kind===kind);
 return <FlowShell utilities back="/today" backLabel="오늘 수업" className="today-page week-page">
  <section className="today-card week-card" aria-labelledby="week-title">
   <p className="eyebrow">오늘 수업 · 여러 차시</p>
   <h1 id="week-title">{pin?`이번 주 ${plan.lessons.length}차시 계획`:`${count}차시를 한 번에 짜요`}</h1>
   <p className="week-lead">본게임은 우리 반 반응을 보고 골라요. 👍가 많았던 활동과 아직 안 해 본 활동이 먼저 나와요.</p>
   <ClassSwitcher manage={false}/>
   <CloudSyncPrompt/>
   {pin?<p className="week-pinned" role="status" data-week-pinned>📌 이번 주 계획을 정해 두었어요. 수업을 하고 반응을 남겨도 순서는 그대로예요. 마친 차시는 {done.filter(Boolean).length} / {plan.lessons.length}</p>:<>
   <div className="today-quick" role="group" aria-label="학년과 장소">
    <div className="today-choice" role="group" aria-label="학년">{TODAY_GRADES.map(g=><button key={g.id} type="button" aria-pressed={settings.grade===g.id} onClick={()=>set('grade',g.id)}>{g.label}</button>)}</div>
    <div className="today-choice" role="group" aria-label="어디서">{TODAY_SPACES.map(s=><button key={s} type="button" aria-pressed={settings.space===s} onClick={()=>set('space',s)}>{s}</button>)}</div>
   </div>
   <div className="today-quick" role="group" aria-label="시간과 차시 수">
    <div className="today-choice" role="group" aria-label="한 차시 시간">{TODAY_MINUTES.map(m=><button key={m} type="button" aria-pressed={settings.minutes===m} onClick={()=>set('minutes',m)}>{m}분</button>)}</div>
    <div className="today-choice" role="group" aria-label="차시 수">{WEEK_LESSONS.map(n=><button key={n} type="button" aria-pressed={count===n} onClick={()=>setCount(n)} data-week-count={n}>{n}차시</button>)}</div>
   </div>
   </>}
   <ol className="week-list" aria-label="차시 계획">{plan.lessons.map(l=><li key={l.no} className="week-lesson" data-week-lesson={l.mainId} data-done={done[l.no-1]?'yes':undefined}>
    <div className="week-lesson-head"><strong>{l.no}차시</strong>{done[l.no-1]&&<span className="week-done" data-week-done>✅ 마쳤어요</span>}<span className="week-reason" data-reason={l.reason}>{PICK_REASON_LABEL[l.reason]}</span></div>
    <p className="week-main"><span aria-hidden="true">{stage(l,'main')?.emoji}</span> {stage(l,'main')?.title} <small>본게임 {stage(l,'main')?.minutes}분</small></p>
    <p className="week-sub">준비운동 · {stage(l,'warmup')?.title??'-'} / 정리운동 · {stage(l,'cooldown')?.title??'-'}</p>
    <p className="week-sub">돌아보기 · {l.plan.reflection}</p>
    <Link className="today-secondary week-open" to={`/today?main=${encodeURIComponent(l.mainId)}`} onClick={()=>saveTodaySettings({...plan.settings})}>이 차시로 오늘 수업 열기 →</Link>
   </li>)}</ol>
   {plan.lessons.length===0&&<p role="status">이 학년·장소에 맞는 대표 게임이 없어요. 장소를 바꿔 보세요.</p>}
   <div className="today-row">{pin?<button type="button" className="today-secondary" onClick={unfix} data-week-unpin>계획 다시 짜기</button>:<><button type="button" className="primary today-primary" onClick={fix} disabled={!plan.lessons.length} data-week-pin>📌 이 계획으로 정하기</button><button type="button" className="today-secondary" onClick={()=>setShuffle(n=>n+1)} data-week-shuffle>🔀 다른 순서로</button></>}<ExportMenu table={table}/></div>
   <OfflineReady/>
   <p className="today-plan-note">{pin?'주가 바뀌면 새 계획을 짤 수 있어요. 그동안 남긴 👍/👎는 다음 계획에 반영돼요.':'‘이 계획으로 정하기’를 누르면 이번 주 동안 순서가 바뀌지 않고, 마친 차시가 표시돼요.'}</p>
  </section>
 </FlowShell>;
}
