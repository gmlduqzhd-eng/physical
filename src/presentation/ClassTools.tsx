import {useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ExportMenu} from './components/ExportMenu';
import type {ExportTable} from '../application/documentExport';
import {isRecord,readJsonStorage,removeStorage,writeStorage} from '../application/browserStorage';
import {sfxPop,sfxWhistle,unlockAudio} from '../application/soundEffects';
import {useRunningClock} from '../application/useRunningClock';
import {CLASS_TOOLS,bumpScore,drawNumber,formatClock,homeAwayScore,ladderLabels,leagueMatchCount,leagueTable,makeLadder,matchKey,numberSubject,rollDice,roundRobin,splitGroups,traceLadder,type ClassToolId,type Ladder,type MatchScore} from '../domain/classTools';
import './PlayExperiences.css';
import './SportsClassroom.css';
import './ClassTools.css';
import {PeQuizBingo} from './components/PeQuizBingo';

const LEAGUE_KEY='physical_class_league_v1';
const today=()=>new Date().toLocaleString('ko-KR');
/** 엽쌤의 달리기 뽑기 앱. 달리기 경주로 순서를 정할 때 쓴다. */
const RUNRUN_URL='https://gmlduqzhd123-lab.github.io/RunRun/';
const range=(from:number,to:number)=>Array.from({length:to-from+1},(_,i)=>from+i);
function NumberSelect({label,value,min,max,unit,onChange}:{label:string;value:number;min:number;max:number;unit:string;onChange:(n:number)=>void}){
 return <label className="tools-select">{label}<select aria-label={label} value={value} onChange={e=>onChange(Number(e.target.value))}>{range(min,max).map(n=><option key={n} value={n}>{n}{unit}</option>)}</select></label>;
}

/** 기록을 지우기 전에 묻는 띠. 확인을 누를 때만 onYes를 부른다. */
function Confirm({message,yes,onYes,onNo}:{message:string;yes:string;onYes:()=>void;onNo:()=>void}){
 return <div className="sports-confirm" role="alert"><p>{message}</p><button onClick={onNo}>그대로 두기</button><button className="primary" onClick={onYes}>{yes}</button></div>;
}

/* ── 리그 대진표 ── */
interface LeagueState {teams:number;scores:Record<string,MatchScore|undefined>}
function readLeague():LeagueState{
 const raw=readJsonStorage(LEAGUE_KEY);
 if(!isRecord(raw)||typeof raw.teams!=='number'||raw.teams<3||raw.teams>8||!isRecord(raw.scores))return {teams:4,scores:{}};
 const scores:LeagueState['scores']={};
 for(const [key,value] of Object.entries(raw.scores))if(Array.isArray(value)&&value.length===2&&value.every(v=>Number.isInteger(v)&&v>=0&&v<1000))scores[key]=[value[0],value[1]];
 return {teams:raw.teams,scores};
}
function League(){
 const [state,setState]=useState<LeagueState>(readLeague),[confirm,setConfirm]=useState(false),[pendingTeams,setPendingTeams]=useState<number|null>(null);
 // 되돌리기: 이 화면을 연 뒤의 점수 변경을 최근 30개까지 기억한다. 기록 목록은 최근 5개만 보여 준다.
 const [history,setHistory]=useState<{before:LeagueState;label:string}[]>([]);
 const rounds=useMemo(()=>roundRobin(state.teams),[state.teams]),table=leagueTable(state.teams,rounds,state.scores);
 const save=(next:LeagueState,label?:string)=>{if(label)setHistory(h=>[...h.slice(-29),{before:state,label}]);setState(next);writeStorage(LEAGUE_KEY,JSON.stringify(next));};
 const undo=()=>{const last=history.at(-1);if(!last)return;setHistory(h=>h.slice(0,-1));setState(last.before);writeStorage(LEAGUE_KEY,JSON.stringify(last.before));};
 const played=rounds.flatMap(r=>r.matches).filter(m=>state.scores[matchKey(m)]).length;
 const bump=(m:{home:number;away:number},side:0|1,amount:number)=>{const key=matchKey(m),team=side?m.away:m.home;save({...state,scores:{...state.scores,[key]:bumpScore(m,state.scores[key]??null,side,amount)}},amount===0?`${m.home+1}팀 대 ${m.away+1}팀 0 : 0 기록`:`${team+1}팀 ${amount>0?'+':''}${amount}점 (${m.home+1}팀 대 ${m.away+1}팀)`);};
 const scoreOf=(m:{home:number;away:number})=>homeAwayScore(m,state.scores[matchKey(m)]??null);
 const changeTeams=(teams:number)=>{if(played)setPendingTeams(teams);else save({teams,scores:{}});};
 const name=(team:number)=>`${team+1}팀`;
 return <>
  <div className="tools-bar"><NumberSelect label="팀 수" value={state.teams} min={3} max={8} unit="팀" onChange={changeTeams}/>
   <p className="sports-muted" role="status">{leagueMatchCount(state.teams)}경기 가운데 {played}경기 기록</p><button onClick={undo} disabled={!history.length} aria-label={history.length?`되돌리기: ${history.at(-1)!.label}`:'되돌릴 기록 없음'}>↶ 되돌리기</button><button onClick={()=>setConfirm(true)} disabled={!played}>기록 지우기</button></div>
  {history.length>0&&<details className="tools-log"><summary>최근 점수 기록 ({history.length})</summary><ol reversed>{history.slice(-5).reverse().map((h,i)=><li key={history.length-i}>{h.label}</li>)}</ol></details>}
  {confirm&&<Confirm message="대진표의 경기 기록을 모두 지울까요?" yes="모두 지우기" onNo={()=>setConfirm(false)} onYes={()=>{removeStorage(LEAGUE_KEY);setState({teams:state.teams,scores:{}});setHistory([]);setConfirm(false);}}/>}
  {pendingTeams!==null&&<Confirm message={`팀 수를 ${pendingTeams}팀으로 바꾸면 기록한 ${played}경기가 모두 지워져요. 바꿀까요?`} yes="지우고 바꾸기" onNo={()=>setPendingTeams(null)} onYes={()=>{save({teams:pendingTeams,scores:{}});setHistory([]);setPendingTeams(null);}}/>}
  <div className="tools-rounds">{rounds.map(round=><section key={round.round} className="tools-round" aria-label={`${round.round}라운드`}><h3>{round.round}라운드{round.rest!==null&&<small> · {name(round.rest)} 쉼(심판·기록)</small>}</h3>
   {round.matches.map(m=>{const s=scoreOf(m);return <div key={matchKey(m)} className="tools-match" data-played={s?'yes':'no'}>
    {([0,1] as const).map(side=>{const team=side?m.away:m.home;return <div key={side} className="tools-side"><strong>{name(team)}</strong>
     <button aria-label={`${name(team)} 1점 줄이기`} onClick={()=>bump(m,side,-1)} disabled={!s||s[side]===0}>−</button><output aria-label={`${name(team)} 점수`}>{s?s[side]:'·'}</output><button className="primary" aria-label={`${name(team)} 1점 더하기`} onClick={()=>bump(m,side,1)}>+</button></div>;})}
    {!s&&<button className="tools-draw" onClick={()=>bump(m,0,0)}>0 : 0으로 기록</button>}
   </div>;})}</section>)}</div>
  <table className="sports-medals tools-table"><caption>순위표 · 승 3점, 무 1점</caption><thead><tr><th scope="col">순위</th><th scope="col">팀</th><th scope="col">경기</th><th scope="col">승</th><th scope="col">무</th><th scope="col">패</th><th scope="col">득실</th><th scope="col">승점</th></tr></thead>
   <tbody>{table.map(r=><tr key={r.team}><td>{r.played?r.rank:'-'}</td><th scope="row">{name(r.team)}</th><td>{r.played}</td><td>{r.win}</td><td>{r.draw}</td><td>{r.loss}</td><td>{r.scored-r.conceded>0?'+':''}{r.scored-r.conceded}</td><td><strong>{r.points}</strong></td></tr>)}</tbody></table>
  <ExportMenu disabled={!played} table={():ExportTable=>({title:'리그 순위표',fileBase:'리그순위표',meta:[['팀 수',`${state.teams}팀`],['경기 기록',`${leagueMatchCount(state.teams)}경기 중 ${played}경기`],['저장한 때',today()],['순위 규칙','승 3점·무 1점 → 득실차 → 득점']],headers:['순위','팀','경기','승','무','패','득실','승점'],rows:table.map(r=>[r.played?r.rank:'-',name(r.team),r.played,r.win,r.draw,r.loss,`${r.scored-r.conceded>0?'+':''}${r.scored-r.conceded}`,r.points])})}/>
  <p className="sports-muted">기록은 이 기기에만 팀 번호로 저장돼요. 새로고침해도 이어져요. 승점이 같으면 득실차, 득점 순으로 가리고 모두 같으면 같은 순위예요.</p>
 </>;
}

/* ── 레이스 시계 ── */
function Race(){
 const [lanes,setLanes]=useState(4),[running,setRunning]=useState(false),[times,setTimes]=useState<(number|null)[]>(()=>Array(8).fill(null)),[pendingLanes,setPendingLanes]=useState<number|null>(null),[announce,setAnnounce]=useState('');
 const clock=useRunningClock(running),active=times.slice(0,lanes);
 const order=active.map((time,lane)=>({time,lane})).filter((r):r is {time:number;lane:number}=>r.time!==null).sort((a,b)=>a.time-b.time);
 const rank=(lane:number)=>{const mine=active[lane];return mine===null?null:1+order.filter(r=>r.time<mine).length;};
 const finish=(lane:number)=>{const at=clock.read(),next=times.map((t,i)=>i===lane?at:t);setTimes(next);setAnnounce(`${lane+1}팀 도착 ${formatClock(at)}`);sfxPop();if(next.slice(0,lanes).every(t=>t!==null)){setRunning(false);sfxWhistle();}};
 const reset=()=>{setRunning(false);clock.reset();setTimes(Array(8).fill(null));setAnnounce('');};
 const busy=running||clock.ms>0||active.some(t=>t!==null);
 const changeLanes=(n:number)=>{if(busy)setPendingLanes(n);else setLanes(n);};
 return <>
  <div className="tools-bar"><NumberSelect label="팀(레인) 수" value={lanes} min={2} max={8} unit="팀" onChange={changeLanes}/></div>
  {pendingLanes!==null&&<Confirm message={`팀 수를 바꾸면 시계와 도착 기록이 처음으로 돌아가요. ${pendingLanes}팀으로 바꿀까요?`} yes="처음으로 하고 바꾸기" onNo={()=>setPendingLanes(null)} onYes={()=>{reset();setLanes(pendingLanes);setPendingLanes(null);}}/>}
  <div className="sports-timer"><strong aria-live="off">{formatClock(clock.ms)}</strong><div className="flagship-row">
   <button className="primary" disabled={running||(clock.ms>0&&active.every(t=>t!==null))} onClick={()=>{unlockAudio();sfxWhistle();setRunning(true);}}>{clock.ms?'이어서 출발':'출발!'}</button>
   <button disabled={!running} onClick={()=>setRunning(false)}>멈춤</button><button disabled={running||!clock.ms} onClick={reset}>처음으로</button></div></div>
  <div className="tools-lanes">{range(0,lanes-1).map(lane=><div key={lane} className="tools-lane" data-done={active[lane]!==null?'yes':'no'}><strong>{lane+1}팀</strong>
   <output>{active[lane]===null?(running?'달리는 중':'대기'):`${formatClock(active[lane]!)} · ${rank(lane)}위`}</output>
   <button className="primary" disabled={!running||active[lane]!==null} onClick={()=>finish(lane)}>도착!</button>
   <button disabled={active[lane]===null} onClick={()=>{setTimes(times.map((t,i)=>i===lane?null:t));setAnnounce(`${lane+1}팀 도착 취소`);}} aria-label={`${lane+1}팀 도착 취소`}>취소</button></div>)}</div>
  <p className="sports-sr" role="status">{announce}</p>
  <ExportMenu disabled={!order.length} table={():ExportTable=>({title:'레이스 기록',fileBase:'레이스기록',meta:[['팀 수',`${lanes}팀`],['저장한 때',today()]],headers:['순위','팀','기록'],rows:range(0,lanes-1).map(lane=>({lane,r:rank(lane)})).sort((a,b)=>(a.r??99)-(b.r??99)).map(({lane,r})=>[r??'-',`${lane+1}팀`,active[lane]===null?'도착 전':formatClock(active[lane]!)])})}/>
  <p className="sports-muted">출발 신호와 함께 시계가 가요. 팀이 들어올 때마다 그 팀의 도착을 눌러요. 잘못 눌렀으면 취소하고 다시 눌러요.</p>
 </>;
}

/* ── 사다리타기 ── */
const COL_W=100,ROW_H=30,LADDER_ROWS=10;
function ladderPath(ladder:Ladder,start:number){
 const path=traceLadder(ladder,start),x=(c:number)=>COL_W/2+c*COL_W;
 let d=`M${x(start)} 0`;
 for(let i=1;i<path.length;i++){d+=` V${i*ROW_H}`;if(path[i]!==path[i-1])d+=` H${x(path[i])}`;}
 return {d:d+` V${(LADDER_ROWS+1)*ROW_H}`,end:path.at(-1)!};
}
function LadderTool(){
 const [columns,setColumns]=useState(4),[text,setText]=useState('술래, 심판, 기록'),[ladder,setLadder]=useState<Ladder>(()=>makeLadder(4,LADDER_ROWS));
 const [picked,setPicked]=useState<number[]>([]),[current,setCurrent]=useState<number|null>(null);
 const labels=ladderLabels(text,columns),width=columns*COL_W,height=(LADDER_ROWS+1)*ROW_H;
 const fresh=(n=columns)=>{setLadder(makeLadder(n,LADDER_ROWS));setPicked([]);setCurrent(null);};
 const pick=(start:number)=>{unlockAudio();sfxPop();setCurrent(start);if(!picked.includes(start))setPicked([...picked,start]);};
 const shown=picked.length>0,trace=current===null?null:ladderPath(ladder,current);
 return <>
  <div className="tools-bar"><NumberSelect label="줄 수" value={columns} min={2} max={8} unit="줄" onChange={n=>{setColumns(n);fresh(n);}}/>
   <label className="tools-text">아래 결과 (쉼표로 구분)<input value={text} maxLength={80} onChange={e=>setText(e.target.value)} placeholder="술래, 심판, 기록"/></label>
   <button onClick={()=>fresh()}>새 사다리</button><button disabled={picked.length===columns} onClick={()=>{setPicked(range(0,columns-1));setCurrent(null);}}>모두 열기</button></div>
  <div className="tools-ladder" style={{maxWidth:width}}>
   <div className="tools-ladder-row" style={{gridTemplateColumns:`repeat(${columns},1fr)`}}>{range(0,columns-1).map(c=><button key={c} className={current===c?'primary':undefined} aria-pressed={picked.includes(c)} onClick={()=>pick(c)}>{c+1}번</button>)}</div>
   <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={shown?'사다리. 번호를 누르면 길이 표시돼요.':'가로줄이 가려진 사다리. 번호를 누르면 가로줄이 나타나요.'}>
    {range(0,columns-1).map(c=><line key={c} x1={COL_W/2+c*COL_W} x2={COL_W/2+c*COL_W} y1={0} y2={height} className="tools-rail"/>)}
    {shown&&ladder.rungs.map((row,r)=>row.map((on,c)=>on&&<line key={`${r}-${c}`} x1={COL_W/2+c*COL_W} x2={COL_W/2+(c+1)*COL_W} y1={(r+1)*ROW_H} y2={(r+1)*ROW_H} className="tools-rail"/>))}
    {trace&&<path key={current} d={trace.d} className="tools-trace" pathLength={1}/>}
   </svg>
   <div className="tools-ladder-row" style={{gridTemplateColumns:`repeat(${columns},1fr)`}}>{labels.map((label,c)=><span key={c} data-hit={trace?.end===c?'yes':'no'}>{label}</span>)}</div>
  </div>
  {!shown&&<p className="sports-muted">가로줄은 첫 번호를 누르면 나타나요. 먼저 누가 몇 번을 탈지 정해요.</p>}
  {shown&&<ul className="tools-results" aria-label="사다리 결과" aria-live="polite">{[...picked].sort((a,b)=>a-b).map(c=><li key={c}><strong>{c+1}번</strong> → {labels[ladderPath(ladder,c).end]}</li>)}</ul>}
 </>;
}

/* ── 번호 뽑기 ── */
function Draw(){
 const [total,setTotal]=useState(25),[drawn,setDrawn]=useState<number[]>([]),[pending,setPending]=useState<number|null>(null);
 const last=drawn.at(-1),left=total-drawn.length;
 return <>
  <div className="tools-bar"><NumberSelect label="우리 반 인원" value={total} min={2} max={40} unit="명" onChange={n=>{if(drawn.length)setPending(n);else setTotal(n);}}/><button disabled={!drawn.length} onClick={()=>setDrawn([])}>처음부터 다시</button></div>
  {pending!==null&&<Confirm message={`인원을 바꾸면 뽑은 순서 ${drawn.length}개가 지워져요. ${pending}명으로 바꿀까요?`} yes="지우고 바꾸기" onNo={()=>setPending(null)} onYes={()=>{setTotal(pending);setDrawn([]);setPending(null);}}/>}
  <div className="tools-big" aria-live="polite"><strong key={last}>{last??'?'}</strong><span>{last?`${last}번 친구 차례예요`:'뽑기를 눌러요'}</span></div>
  <div className="flagship-row tools-center"><button className="primary tools-go" disabled={!left} onClick={()=>{unlockAudio();const n=drawNumber(total,drawn);if(n!==null){sfxPop();setDrawn([...drawn,n]);}}}>{left?`번호 뽑기 (${left}명 남음)`:'모두 뽑았어요'}</button></div>
  {drawn.length>0&&<p className="tools-drawn"><span className="sports-muted">뽑힌 순서</span> {drawn.join(' · ')}</p>}
  <ExportMenu disabled={!drawn.length} table={():ExportTable=>({title:'번호 뽑기 순서',fileBase:'뽑기순서',meta:[['우리 반 인원',`${total}명`],['뽑은 수',`${drawn.length}명`],['저장한 때',today()]],headers:['차례','번호'],rows:drawn.map((n,i)=>[i+1,`${n}번`])})}/>
  <p className="sports-muted">출석 번호만 써요. 한 번 뽑힌 번호는 다시 나오지 않아서 모두에게 차례가 돌아가요.</p>
  <p className="tools-sibling"><a href={RUNRUN_URL} target="_blank" rel="noopener noreferrer">🏃 달리기 경주로 순서 정하기 · 엽쌤 ‘달리기 뽑기’ 앱 ↗</a><span className="sports-muted"> 화면 속 캐릭터가 달려 먼저 도착한 순서로 정해요. 새 창으로 열려요.</span></p>
 </>;
}

/* ── 모둠 나누기 ── */
function Groups(){
 const [total,setTotal]=useState(24),[count,setCount]=useState(4),[groups,setGroups]=useState<number[][]>([]);
 return <>
  <div className="tools-bar"><NumberSelect label="우리 반 인원" value={total} min={2} max={40} unit="명" onChange={n=>{setTotal(n);setGroups([]);}}/><NumberSelect label="모둠 수" value={count} min={2} max={10} unit="모둠" onChange={n=>{setCount(n);setGroups([]);}}/>
   <button className="primary" onClick={()=>{unlockAudio();sfxPop();setGroups(splitGroups(total,count));}}>{groups.length?'다시 섞기':'모둠 나누기'}</button></div>
  {groups.length?<div className="tools-groups" aria-live="polite">{groups.map((g,i)=><section key={i} className="tools-group"><h3>{i+1}모둠 <small>{g.length}명</small></h3><p>{g.join(' · ')}</p></section>)}</div>
   :<p className="sports-muted">출석 번호를 섞어 인원이 고르게 나뉘어요. 모둠끼리 인원 차이는 한 명을 넘지 않아요.</p>}
  <ExportMenu disabled={!groups.length} table={():ExportTable=>({title:'모둠 명단 (출석 번호)',fileBase:'모둠명단',meta:[['우리 반 인원',`${total}명`],['모둠 수',`${groups.length}모둠`],['저장한 때',today()]],headers:['모둠','인원','출석 번호'],rows:groups.map((g,i)=>[`${i+1}모둠`,`${g.length}명`,g.join(', ')])})}/>
 </>;
}

/* ── 주사위 ── */
const DICE_FACE=['⚀','⚁','⚂','⚃','⚄','⚅'];
function Dice(){
 const [count,setCount]=useState(1),[faces,setFaces]=useState<number[]>([]),[rolling,setRolling]=useState(false);
 useEffect(()=>{if(!rolling)return;const spin=setInterval(()=>setFaces(rollDice(count)),80),stop=setTimeout(()=>{setRolling(false);sfxPop();},700);return()=>{clearInterval(spin);clearTimeout(stop);};},[rolling,count]);
 const sum=faces.reduce((a,b)=>a+b,0);
 return <>
  <div className="tools-bar"><div className="sports-filters" role="group" aria-label="주사위 수">{[1,2].map(n=><button key={n} aria-pressed={count===n} onClick={()=>{setCount(n);setFaces([]);}}>{n}개</button>)}</div></div>
  <div className="tools-big tools-dice" data-rolling={rolling?'yes':'no'}><strong aria-hidden="true">{faces.length?faces.map(f=>DICE_FACE[f-1]).join(' '):DICE_FACE.slice(0,count).map(()=>'🎲').join(' ')}</strong>
   <span role="status">{rolling?'굴리는 중':faces.length?(count===1?`${numberSubject(sum)} 나왔어요`:`${faces.join(' + ')} = ${sum}`):'굴리기를 눌러요'}</span></div>
  <div className="flagship-row tools-center"><button className="primary tools-go" disabled={rolling} onClick={()=>{unlockAudio();setFaces(rollDice(count));setRolling(true);}}>주사위 굴리기</button></div>
 </>;
}

const TOOL_VIEW:Record<ClassToolId,()=>React.ReactElement>={league:League,race:Race,ladder:LadderTool,draw:Draw,groups:Groups,dice:Dice,'quiz-bingo':PeQuizBingo};

/** 수업 도구 모음. 여섯 도구를 늘 붙여 두고 보이는 것만 바꿔, 도구를 오가도 시계·뽑기 기록이 남는다. */
export function ClassTools(){
 const [params,setParams]=useSearchParams();
 const tool=CLASS_TOOLS.find(t=>t.id===params.get('tool'));
 return <FlowShell utilities back={tool?'/tools':undefined} backLabel={tool?'수업 도구':undefined}>
  {!tool&&<section className="play-experiences sports-classroom" aria-label="수업 도구">
   <p className="eyebrow">체육수업 대백과 · 수업 도구</p><h1>수업을 돕는 도구</h1><p>대진표, 시계, 뽑기를 교사 화면 한 대로 써요. 학생 이름은 넣지 않고 번호와 팀만 써요.</p>
   <div className="sports-grid">{CLASS_TOOLS.map(t=><Link key={t.id} className="sports-card" to={`/tools?tool=${t.id}`} data-tool={t.id}><span className="sports-icon" aria-hidden="true">{t.icon}</span><strong>{t.label}</strong><span>{t.summary}</span></Link>)}</div>
   <p className="sports-muted">종목별 점수판과 시상은 <Link to="/sports">종목 교실</Link>에 있어요. 도구를 오가도 이 화면을 떠나기 전까지 기록이 남아 있어요.</p>
  </section>}
  <section className="play-experiences sports-lesson class-tools" hidden={!tool} aria-label={tool?.label??'수업 도구'} data-tool={tool?.id}>
   {tool&&<><p className="eyebrow">수업 도구</p><h1><span aria-hidden="true">{tool.icon}</span> {tool.label}</h1><p>{tool.summary}</p></>}
   <nav className="sports-stages tools-tabs" aria-label="다른 도구">{CLASS_TOOLS.map(t=><button key={t.id} aria-current={t.id===tool?.id?'page':undefined} onClick={()=>setParams({tool:t.id},{replace:true})}>{t.icon} {t.label}</button>)}</nav>
   {CLASS_TOOLS.map(t=>{const View=TOOL_VIEW[t.id];return <section key={t.id} className="recipe-card sports-stage" hidden={t.id!==tool?.id} data-tool-panel={t.id}><View/></section>;})}
  </section>
 </FlowShell>;
}
