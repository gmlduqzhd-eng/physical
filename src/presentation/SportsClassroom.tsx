import {useEffect,useMemo,useRef,useState} from 'react';
import {useRunningClock} from '../application/useRunningClock';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {readJsonStorage,removeStorage,writeStorage} from '../application/browserStorage';
import {sfxWhistle,sfxCountdown,unlockAudio} from '../application/soundEffects';
import {LESSON_STAGES,MEDAL_LABEL,SPORT_BY_ID,SPORT_FILTERS,SPORT_GROUPS,TEAM_COLORS,TEAM_NAMES,addMedals,filterSports,formatResult,medalStandings,parseMedalTally,rankTeams,type MedalTally,type SportEvent,type SportFilter,type SportGrade} from '../domain/sportsClassroom';
import {hasDeepDive} from '../domain/sportDeepDive';
import './PlayExperiences.css';
import './SportsClassroom.css';

const MEDAL_KEY='physical_class_medals_v1';
const MEDAL_ICON={gold:'🥇',silver:'🥈',bronze:'🥉'} as const;
const readTally=()=>parseMedalTally(readJsonStorage(MEDAL_KEY));

function MedalTable({tally,onReset}:{tally:MedalTally;onReset?:()=>void}){
 const rows=medalStandings(tally);
 if(!rows.length)return <p className="sports-muted">아직 시상한 메달이 없어요. 경기를 마치고 시상하면 여기에 모여요.</p>;
 return <><table className="sports-medals"><caption>우리 반 종합 메달 순위</caption><thead><tr><th scope="col">팀</th><th scope="col">🥇 금</th><th scope="col">🥈 은</th><th scope="col">🥉 동</th></tr></thead><tbody>{rows.map(r=><tr key={r.team}><th scope="row">{r.team}</th><td>{r.gold}</td><td>{r.silver}</td><td>{r.bronze}</td></tr>)}</tbody></table>{onReset&&<button onClick={onReset}>메달 기록 초기화</button>}</>;
}

/** 종목 고르기 */
export function SportsClassroom(){
 const [params,setParams]=useSearchParams();
 const filter=(SPORT_FILTERS.find(f=>f.id===params.get('filter'))?.id??'recommended') as SportFilter;
 const grade=(['1-2','3-4','5-6'].includes(params.get('grade')??'')?params.get('grade'):'all') as SportGrade|'all';
 const [tally,setTally]=useState<MedalTally>(readTally);
 const [confirmReset,setConfirmReset]=useState(false);
 const sports=filterSports(filter,grade);
 const set=(key:string,value:string,empty:string)=>{const next=new URLSearchParams(params);if(value===empty)next.delete(key);else next.set(key,value);setParams(next,{replace:true});};
 return <FlowShell utilities><section className="play-experiences sports-classroom" aria-label="종목 교실">
  <p className="eyebrow">체육수업 대백과 · 종목 교실</p><h1>오늘은 어떤 종목을 할까요</h1>
  <p>아시안게임 28개 종목을 교실·강당에서 바로 하는 리드업 게임으로 만나요. 종목을 고르면 준비운동부터 시상, 돌아보기까지 여섯 단계로 이어져요.</p>
  <div className="sports-filters" role="group" aria-label="종목 고르는 기준">{SPORT_FILTERS.map(f=><button key={f.id} aria-pressed={filter===f.id} onClick={()=>set('filter',f.id,'recommended')}>{f.label}</button>)}
   <label>학년군<select aria-label="학년군" value={grade} onChange={e=>set('grade',e.target.value,'all')}><option value="all">전체</option><option value="1-2">1~2학년</option><option value="3-4">3~4학년</option><option value="5-6">5~6학년</option></select></label></div>
  <p className="sports-muted" role="status">{sports.length}개 종목</p>
  <div className="sports-grid">{sports.map(e=><Link key={e.id} className="sports-card" to={`/sports/${e.id}`} data-sport={e.id}>
   <span className="sports-icon" aria-hidden="true">{e.icon}</span><strong>{e.name}</strong><span>{e.sub}</span>
   <small>{SPORT_GROUPS[e.group]} · {e.place.join('·')}{e.lowGear?' · 도구 간단':''}{e.quiet?' · 조용히':''}</small></Link>)}</div>
  {!sports.length&&<p role="status">조건에 맞는 종목이 없어요. 기준을 바꿔 보세요.</p>}
  <section className="recipe-card" aria-label="우리 반 메달"><h2>우리 반 종합 메달</h2><MedalTable tally={tally} onReset={()=>setConfirmReset(true)}/>
   {confirmReset&&<div className="sports-confirm" role="alert"><p>지금까지의 메달 기록을 모두 지울까요? 되돌릴 수 없어요.</p><button onClick={()=>setConfirmReset(false)}>그대로 두기</button><button className="primary" onClick={()=>{removeStorage(MEDAL_KEY);setTally({});setConfirmReset(false);}}>모두 지우기</button></div>}
   <p className="sports-muted">메달은 이 기기에만 팀 이름으로 저장돼요. 학생 이름이나 개인 기록은 담지 않아요.</p></section>
 </section></FlowShell>;
}

function ScoreMatch({event,teams,scores,setScores}:{event:SportEvent;teams:number;scores:(number|null)[];setScores:(next:(number|null)[])=>void}){
 const [seconds,setSeconds]=useState(event.timers[0]),[running,setRunning]=useState(false);
 const clock=useRunningClock(running),left=Math.max(0,seconds-Math.floor(clock.ms/1000)),ended=useRef(false);
 useEffect(()=>{if(running&&left===0&&!ended.current){ended.current=true;setRunning(false);sfxWhistle();}if(running&&left>0&&left<=3)sfxCountdown();},[left,running]);
 const add=(team:number,amount:number)=>setScores(scores.map((s,i)=>i===team?Math.max(0,(s??0)+amount):s));
 return <>
  <div className="sports-timer"><strong aria-live="off">{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</strong>
   <div className="flagship-row">{event.timers.map(t=><button key={t} aria-pressed={seconds===t} disabled={running} onClick={()=>{setSeconds(t);clock.reset();ended.current=false;}}>{t}초</button>)}
    <button className="primary" onClick={()=>{unlockAudio();if(!running&&left===0){clock.reset();ended.current=false;}if(!running)sfxWhistle();setRunning(!running);}}>{running?'멈춤':left===0?'다시 시작':'시작'}</button>
    <button disabled={running} onClick={()=>{clock.reset();ended.current=false;}}>시계 되돌리기</button></div></div>
  <div className="sports-teams">{Array.from({length:teams},(_,i)=><article key={i} className="sports-team" style={{borderColor:TEAM_COLORS[i]}}><h3 style={{color:TEAM_COLORS[i]}}>{TEAM_NAMES[i]}</h3>
   <strong className="sports-score" aria-live="polite" aria-label={`${TEAM_NAMES[i]} ${scores[i]??0}${event.unit??'점'}`}>{scores[i]??0}<small>{event.unit??'점'}</small></strong>
   <div className="flagship-row">{(event.values??[1]).map(v=><button key={v} className="primary" onClick={()=>add(i,v)}>{event.btnLabel??'점수'} +{v}</button>)}<button onClick={()=>add(i,-1)} aria-label={`${TEAM_NAMES[i]} 1 줄이기`}>−1</button></div></article>)}</div>
  {event.lowerWins&&<p className="sports-muted">이 종목은 {event.unit??'점'} 수가 적은 팀이 이겨요.</p>}
 </>;
}

function TimeMatch({event,teams,scores,setScores}:{event:SportEvent;teams:number;scores:(number|null)[];setScores:(next:(number|null)[])=>void}){
 const [running,setRunning]=useState(false),[penalties,setPenalties]=useState<number[]>(()=>Array(teams).fill(0));
 const clock=useRunningClock(running),now=clock.ms/1000;
 const finish=(team:number)=>{const next=scores.map((s,i)=>i===team?Math.round((now+(penalties[i]??0))*10)/10:s);setScores(next);if(next.slice(0,teams).every(v=>v!==null)){setRunning(false);sfxWhistle();}};
 return <>
  <div className="sports-timer"><strong aria-live="off">{formatResult(event,now)}</strong><div className="flagship-row">
   <button className="primary" disabled={running} onClick={()=>{unlockAudio();sfxWhistle();setRunning(true);}}>{clock.ms?'이어서 출발':'출발!'}</button><button disabled={!running} onClick={()=>setRunning(false)}>멈춤</button>
   <button disabled={running} onClick={()=>{clock.reset();setScores(scores.map(()=>null));setPenalties(Array(teams).fill(0));}}>레이스 처음으로</button></div></div>
  <div className="sports-teams">{Array.from({length:teams},(_,i)=><article key={i} className="sports-team" style={{borderColor:TEAM_COLORS[i]}}><h3 style={{color:TEAM_COLORS[i]}}>{TEAM_NAMES[i]}</h3>
   <strong className="sports-score" aria-live="polite">{scores[i]===null?'달리는 중':formatResult(event,scores[i]!)}</strong>
   <div className="flagship-row"><button className="primary" disabled={!running||scores[i]!==null} onClick={()=>finish(i)}>도착!</button>
    {event.penalty&&<button disabled={scores[i]!==null} onClick={()=>setPenalties(p=>p.map((v,j)=>j===i?v+event.penalty!:v))}>벌칙 +{event.penalty}초{penalties[i]?` (${penalties[i]}초)`:''}</button>}</div></article>)}</div>
  <p className="sports-muted">먼저 들어온 팀이 이겨요. 벌칙 시간은 도착 기록에 더해져요.</p>
 </>;
}

/** 종목 한 차시: 준비운동 → 미션 → 준비·안전 → 경기 → 시상 → 돌아보기 */
export function SportLesson(){
 const {sportId}=useParams(),event=SPORT_BY_ID.get(sportId??'');
 const [stage,setStage]=useState(0),[teams,setTeams]=useState(2),[level,setLevel]=useState<'easy'|'basic'|'hard'>('basic');
 const [scores,setScores]=useState<(number|null)[]>([]),[awarded,setAwarded]=useState(false),[tally,setTally]=useState<MedalTally>(readTally);
 const blank=useMemo(()=>event?.mode==='time'?Array(4).fill(null):Array(4).fill(0),[event]);
 useEffect(()=>{setScores(blank);setAwarded(false);setStage(0);},[blank]);
 useEffect(()=>{window.scrollTo(0,0);},[stage]);
 if(!event)return <FlowShell utilities back="/sports" backLabel="종목 고르기"><section className="play-experiences"><h1>종목을 찾지 못했어요</h1><Link className="primary" to="/sports">종목 고르기로</Link></section></FlowShell>;
 const id=LESSON_STAGES[stage].id,ranking=rankTeams(event,scores.slice(0,teams).map((value,team)=>({team,value})));
 const award=()=>{if(awarded||!ranking.length)return;const next=addMedals(readTally(),ranking);writeStorage(MEDAL_KEY,JSON.stringify(next));setTally(next);setAwarded(true);sfxWhistle();};
 return <FlowShell utilities back="/sports" backLabel="종목 고르기"><section className="play-experiences sports-lesson" aria-label={`${event.name} 수업`} data-sport={event.id} data-stage={id}>
  <p className="eyebrow">종목 교실 · {SPORT_GROUPS[event.group]}</p><h1><span aria-hidden="true">{event.icon}</span> {event.name} <small>{event.sub}</small></h1>
  {hasDeepDive(event.id)&&<p><Link className="sports-deep-link" to={`/sports/${event.id}/deep`}>📖 {event.name} 깊이 보기 · 용어·기술·포지션·퀴즈 →</Link></p>}
  <ol className="sports-stages" aria-label="수업 단계">{LESSON_STAGES.map((s,i)=><li key={s.id}><button aria-current={i===stage?'step':undefined} onClick={()=>setStage(i)}>{i+1}. {s.label}</button></li>)}</ol>
  <section className="recipe-card sports-stage">
   {id==='warmup'&&<><h2>몸을 깨우는 준비운동</h2><p>다치지 않게, 천천히 따라 해요.</p><ul className="sports-picture-list">{event.warmup.map(([icon,text])=><li key={text}><span aria-hidden="true">{icon}</span>{text}</li>)}</ul><p className="sports-guide">{event.guide}</p></>}
   {id==='mission'&&<><h2>{event.missionTitle}</h2><p><strong>오늘의 배움</strong> · {event.goal}</p>
    <div className="sports-filters" role="group" aria-label="규칙 수준">{([['easy','쉽게'],['basic','기본 규칙'],['hard','더 어렵게']] as const).map(([v,label])=><button key={v} aria-pressed={level===v} onClick={()=>setLevel(v)}>{label}</button>)}</div>
    {level==='easy'&&<><ul className="sports-picture-list">{event.easy.map(([icon,text])=><li key={text}><span aria-hidden="true">{icon}</span>{text}</li>)}</ul><p className="sports-guide">{event.easyTip}</p></>}
    {level==='basic'&&<ol className="sports-rules">{event.rules.map(r=><li key={r}>{r}</li>)}</ol>}
    {level==='hard'&&<ul className="sports-rules">{event.hard.map(r=><li key={r}>{r}</li>)}</ul>}</>}
   {id==='ready'&&<><h2>준비물과 안전 약속</h2><h3>준비물</h3><ul className="sports-check">{event.gear.map(g=><li key={g}><label><input type="checkbox"/>{g}</label></li>)}</ul>
    <h3>안전 약속</h3><ul className="sports-rules">{event.safety.map(s=><li key={s}>{s}</li>)}</ul>
    <h3>역할 나누기</h3><ul className="sports-roles">{event.roles.map(([role,count])=><li key={role}><strong>{role}</strong> {count?`팀마다 ${count}명`:'나머지 모두'}</li>)}</ul>
    <label>팀 수<select aria-label="팀 수" value={teams} onChange={e=>setTeams(Number(e.target.value))}>{[2,3,4].map(n=><option key={n} value={n}>{n}팀</option>)}</select></label>
    <p className="sports-muted">{event.place.join('·')}에서 해요. 권장 학년군: {event.grades.map(g=>g.replace('-','~')+'학년').join(', ')}</p></>}
   {id==='match'&&<><h2>{event.mode==='time'?'레이스':'경기'} · {teams}팀</h2>{event.mode==='time'?<TimeMatch key={teams} event={event} teams={teams} scores={scores} setScores={setScores}/>:<ScoreMatch event={event} teams={teams} scores={scores} setScores={setScores}/>}
    <button onClick={()=>{setScores(blank);setAwarded(false);}}>기록 처음으로</button></>}
   {id==='award'&&<><h2>시상식</h2>{ranking.length?<ol className="sports-podium">{ranking.map(r=><li key={r.team} data-medal={r.medal??'none'}><span aria-hidden="true">{r.medal?MEDAL_ICON[r.medal]:'👏'}</span><strong style={{color:TEAM_COLORS[r.team]}}>{TEAM_NAMES[r.team]}</strong><span>{r.rank}위 · {formatResult(event,r.value)}{r.medal?` · ${MEDAL_LABEL[r.medal]}메달`:''}</span></li>)}</ol>:<p>아직 기록이 없어요. 경기 단계에서 기록을 남겨 주세요.</p>}
    <button className="primary" disabled={awarded||!ranking.length} onClick={award}>{awarded?'우리 반 메달에 더했어요':'시상하고 우리 반 메달에 더하기'}</button>
    <p className="sports-muted">모두가 끝까지 참여한 것에 박수를 보내요. 순위는 오늘 경기의 결과일 뿐이에요.</p><MedalTable tally={tally}/></>}
   {id==='reflect'&&<><h2>돌아보기</h2><p className="sports-guide">{event.reflect}</p><p><strong>오늘의 배움</strong> · {event.goal}</p><p>짝이나 모둠과 30초씩 이야기해요. 화면에 적지 않아도 괜찮아요.</p><div className="flagship-row"><Link className="primary" to="/journey?suggest=sports">원정 지도에 도장 찍기</Link><Link to="/sports">다른 종목 고르기</Link><Link to="/hub">신체 놀이 찾기</Link></div></>}
  </section>
  <nav className="sports-nav" aria-label="단계 이동"><button disabled={stage===0} onClick={()=>setStage(stage-1)}>← 이전 단계</button><button className="primary" disabled={stage===LESSON_STAGES.length-1} onClick={()=>setStage(stage+1)}>다음 단계 →</button></nav>
 </section></FlowShell>;
}
