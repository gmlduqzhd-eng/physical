import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {readJsonStorage,removeStorage,writeStorage} from '../application/browserStorage';
import {sfxPop,sfxSuccess,unlockAudio} from '../application/soundEffects';
import {JOURNEY_ISLANDS,JOURNEY_KINDS,JOURNEY_TOTAL,STAMPS_PER_ISLAND,addStamp,islandStamps,isJourneyKind,journeyProgress,kindCounts,parseJourney,undoStamp,type JourneyKind,type JourneyStamp} from '../domain/classJourney';
import './PlayExperiences.css';
import './SportsClassroom.css';
import './ClassJourney.css';

const JOURNEY_KEY='physical_class_journey_v1';
const KIND_ICON=Object.fromEntries(JOURNEY_KINDS.map(k=>[k.id,k.icon])) as Record<JourneyKind,string>;
const KIND_LABEL=Object.fromEntries(JOURNEY_KINDS.map(k=>[k.id,k.label])) as Record<JourneyKind,string>;

/** 우리 반 원정 지도 */
export function ClassJourney(){
 const [params]=useSearchParams(),suggested=params.get('suggest');
 const [stamps,setStamps]=useState<JourneyStamp[]>(()=>parseJourney(readJsonStorage(JOURNEY_KEY)));
 const [kind,setKind]=useState<JourneyKind>(isJourneyKind(suggested)?suggested:'play'),[confirm,setConfirm]=useState(false),[fresh,setFresh]=useState(false);
 const progress=journeyProgress(stamps),save=(next:JourneyStamp[])=>{setStamps(next);writeStorage(JOURNEY_KEY,JSON.stringify(next));};
 const stamp=()=>{if(progress.finished)return;unlockAudio();const next=addStamp(stamps,kind);save(next);setFresh(true);if(journeyProgress(next).justArrived)sfxSuccess();else sfxPop();};
 const arrival=fresh?progress.justArrived:null,target=progress.sailingTo===null?null:JOURNEY_ISLANDS[progress.sailingTo];
 return <FlowShell utilities><section className="play-experiences sports-classroom class-journey" aria-label="우리 반 원정 지도">
  <p className="eyebrow">체육수업 대백과 · 우리 반 원정 지도</p><h1>우리 반 원정 지도</h1>
  <p>체육 수업을 마칠 때마다 도장을 하나 찍어요. 도장 네 개마다 섬 하나에 도착하고, 일곱 섬을 건너면 원정이 끝나요.</p>
  <p className="journey-status" role="status">{progress.finished?'일곱 섬을 모두 건넜어요. 원정 완주!':`도장 ${progress.total} / ${JOURNEY_TOTAL} · ${target!.name}까지 ${progress.stepsToNext}번 남았어요`}</p>
  {arrival&&<section className="journey-arrival" role="alert"><p className="eyebrow">섬 도착</p><h2><span aria-hidden="true">{arrival.icon}</span> {arrival.name}에 도착했어요</h2><p>{arrival.value}</p><p className="sports-guide">도착 미션 · {arrival.quest}</p><button onClick={()=>setFresh(false)}>미션을 마쳤어요</button></section>}
  <ol className="journey-map" aria-label="원정 지도">{JOURNEY_ISLANDS.map((island,i)=>{const got=islandStamps(stamps,i),state=i<progress.arrived?'arrived':i===progress.sailingTo?'sailing':'ahead';
   return <li key={island.id} className="journey-island" data-state={state} data-island={island.id}><div className="journey-head"><span className="journey-icon" aria-hidden="true">{state==='sailing'?'⛵':island.icon}</span><div><strong>{i+1}. {island.name}</strong><small>{state==='arrived'?'도착':state==='sailing'?'항해 중':'아직 먼 섬'}</small></div></div>
    <p>{island.value}</p>
    <ul className="journey-stamps" aria-label={`${island.name} 도장 ${got.length}개`}>{Array.from({length:STAMPS_PER_ISLAND},(_,s)=><li key={s} data-filled={got[s]?'yes':'no'} title={got[s]?`${KIND_LABEL[got[s].kind]} · ${got[s].date}`:undefined}>{got[s]?KIND_ICON[got[s].kind]:''}</li>)}</ul></li>;})}</ol>
  <section className="recipe-card" aria-label="도장 찍기"><h2>오늘 수업 도장 찍기</h2>
   <div className="sports-filters" role="group" aria-label="오늘 한 수업">{JOURNEY_KINDS.map(k=><button key={k.id} aria-pressed={kind===k.id} onClick={()=>setKind(k.id)}><span aria-hidden="true">{k.icon}</span> {k.label}</button>)}</div>
   <div className="flagship-row"><button className="primary journey-go" disabled={progress.finished} onClick={stamp}>{progress.finished?'원정을 마쳤어요':`${KIND_ICON[kind]} 도장 찍기`}</button><button disabled={!stamps.length} onClick={()=>{save(undoStamp(stamps));setFresh(false);}}>방금 찍은 도장 취소</button><button disabled={!stamps.length} onClick={()=>setConfirm(true)}>새 원정 시작</button></div>
   {confirm&&<div className="sports-confirm" role="alert"><p>지금까지 찍은 도장 {stamps.length}개를 모두 지우고 처음부터 시작할까요? 되돌릴 수 없어요.</p><button onClick={()=>setConfirm(false)}>그대로 두기</button><button className="primary" onClick={()=>{removeStorage(JOURNEY_KEY);setStamps([]);setConfirm(false);setFresh(false);}}>모두 지우고 새로 시작</button></div>}
   {stamps.length>0&&<p className="sports-muted">지금까지 · {kindCounts(stamps).filter(k=>k.count).map(k=>`${k.label} ${k.count}번`).join(', ')}</p>}
   <p className="sports-muted">도장은 이 기기에만 수업 종류와 날짜로 저장돼요. 학생 이름이나 개인 기록은 담지 않아요. 다른 기기에서는 보이지 않아요.</p></section>
  <div className="flagship-row"><Link to="/sports">종목 교실</Link><Link to="/hub">신체 놀이 찾기</Link><Link to="/safety">안전 교실</Link></div>
 </section></FlowShell>;
}
