import {useState} from 'react';
import {Link} from 'react-router-dom';
import {readSeries,writeSeries} from '../../application/sportSeriesStore';
import {SPORT_SERIES,markLesson,nextLesson,seriesLessonPath,type SeriesProgress} from '../../domain/sportSeries';

const LEVEL_LABEL={easy:'쉽게',basic:'기본 규칙',hard:'더 어렵게'} as const;

/**
 * 종목 연속 차시: 같은 종목을 쉬운 기능부터 차시 순서대로 이어 한다(반마다 마친 차시를 기억).
 * 차시를 누르면 종목 교실 한 차시가 그 차시의 규칙 수준으로 열린다.
 */
export function SportSeriesCard({classId}:{classId:string}){
 const [progress,setProgress]=useState<SeriesProgress>(()=>readSeries(classId));
 const [openId,setOpenId]=useState<string|null>(null);
 const toggle=(id:string,no:number,done:boolean)=>{const next=markLesson(progress,id,no,done);writeSeries(classId,next);setProgress(next);};
 return <section className="today-card week-card week-series" aria-labelledby="series-title" data-sport-series>
  <p className="eyebrow">여러 차시 · 종목 연속 차시</p>
  <h2 id="series-title">한 종목을 차시 순서대로 이어 가요</h2>
  <p className="week-lead">쉬운 기능부터 경기까지 순서를 지켜요. 차시마다 지켜볼 동작 한 가지와 다시 할지 고르는 기준이 있어요.</p>
  <div className="week-series-pick" role="group" aria-label="종목 고르기">{SPORT_SERIES.map(series=>{const n=(progress[series.id]??[]).length;return <button key={series.id} type="button" aria-expanded={openId===series.id} aria-pressed={openId===series.id} onClick={()=>setOpenId(openId===series.id?null:series.id)} data-series-open={series.id}>
   <span className="week-series-icon" aria-hidden="true">{series.icon}</span><b>{series.name}</b><small>{series.summary}</small><span className="week-series-count" data-all={n===series.lessons.length?'yes':undefined}>마친 차시 {n} / {series.lessons.length}</span>
  </button>;})}</div>
  {SPORT_SERIES.filter(series=>series.id===openId).map(series=>{const next=nextLesson(progress,series),doneList=progress[series.id]??[];
   return <ol key={series.id} className="week-list" aria-label={`${series.name} 차시`}>{series.lessons.map(l=>{const done=doneList.includes(l.no),isNext=next?.no===l.no;
     return <li key={l.no} className="week-lesson" data-series-lesson={l.no} data-done={done?'yes':undefined} data-next={isNext?'yes':undefined}>
      <div className="week-lesson-head"><strong>{l.no}차시</strong>{done&&<span className="week-done">✅ 마쳤어요</span>}{isNext&&<span className="week-reason">다음 차시</span>}<span className="week-reason">규칙 · {LEVEL_LABEL[l.level]}</span></div>
      <p className="week-main">{series.icon} {l.title}</p>
      <ul className="week-series-rules">{l.rules.map(r=><li key={r}>{r}</li>)}</ul>
      <p className="week-sub">👀 지켜볼 동작 · {l.watch}</p>
      <p className="week-sub">🔁 {l.repeatIf}</p>
      <div className="today-row"><Link className="today-secondary week-open" to={seriesLessonPath(series,l.no)} data-series-go={l.no}>이 차시 열기 →</Link>
       <button type="button" className="today-ghost" onClick={()=>toggle(series.id,l.no,!done)} data-series-done={l.no}>{done?'마침 표시 지우기':'마쳤어요 표시'}</button></div>
     </li>;})}</ol>;})}
 </section>;
}
