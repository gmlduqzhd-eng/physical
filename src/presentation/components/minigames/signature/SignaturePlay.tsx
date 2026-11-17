import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {getSignatureGame,type SignatureGameDef} from '../../../../domain/signatureGames';
import {SURPRISE_KINDS,TEAM_NAMES,comboFull,resultSummary,seededRandom,type FunState} from '../../../../domain/funLoop';
import {GAMES} from '../../../../domain/gamesData';
import {unlockAudio} from '../../../../application/soundEffects';
import {ComboGauge,DemoLoop,FinalCountdown,ResultCeremony,StickFigure,SurpriseBanner,TeacherControls,TeamScoreboard,useFunEngine,type TeacherButton} from '../../fun';
import {SIGNATURE_MODULES} from './modules';
import {cueOf} from './signatureCue';
import type {SignatureModuleProps} from './moduleTypes';
import '../../fun/fun.css';

interface Props {gameId:string;groupId?:string;enqueueAction?:(a:unknown)=>void;onExit:()=>void}
const PHASE_LABEL:Record<FunState['phase'],string>={demo:'시범',tutorial:'연습 판',play:'본게임',climax:'마지막 승부',result:'결과'};
const NEXT_LABEL:Record<FunState['phase'],string>={demo:'연습 판 시작',tutorial:'본게임 시작',play:'마지막 승부로',climax:'결과 발표',result:''};

const lengthOf=(t:string)=>t.length>16?'long':t.length>9?'medium':undefined;

/** 대표 게임 화면: 시작 화면 → (시범 → 연습 판 → 본게임 → 마지막 승부 → 결과). */
export function SignaturePlay({gameId,groupId='standalone-player',enqueueAction,onExit}:Props){
 const game=getSignatureGame(gameId);
 const [setup,setSetup]=useState<{teams:number;seated:boolean;skipDemo:boolean;round:number}|null>(null);
 const [teams,setTeams]=useState<number>(game?.teamsDefault??2);
 const [seated,setSeated]=useState(false);
 if(!game)return <div className="fun-arena"><p>이 대표 게임은 아직 준비 중이에요.</p><button type="button" className="fun-primary" onClick={onExit}>활동 목록으로</button></div>;
 if(setup)return <SignatureArena key={setup.round} game={game} teams={setup.teams} seated={setup.seated} skipDemo={setup.skipDemo} groupId={groupId} enqueueAction={enqueueAction} onExit={onExit} onReplay={()=>setSetup(s=>s&&{...s,skipDemo:true,round:s.round+1})}/>;
 const merged=game.mergedFrom.map(id=>GAMES.find(g=>g.type===id)?.name).filter(Boolean);
 const start=(skipDemo:boolean)=>{unlockAudio();setSetup({teams,seated,skipDemo,round:0});};
 return <main className="fun-intro" data-game={game.id}>
  <p className="fun-eyebrow">대표 게임 · TV 하나로 반 전체가 함께</p>
  <h1><span aria-hidden="true">{game.emoji}</span> {game.name}</h1>
  <p className="fun-oneline">{game.oneLine}</p>
  <ol className="fun-rule-card">{(['무엇을','어떻게','언제 끝'] as const).map((h,i)=><li key={h}><b>{h}</b>{game.rules[i]}</li>)}</ol>
  <div className="fun-start">
   <button type="button" className="fun-primary fun-big" onClick={()=>start(false)}>▶ 시작 (시범 보고 연습 판)</button>
   <button type="button" className="fun-secondary" onClick={()=>start(true)}>시범 건너뛰고 연습 판부터</button>
  </div>
  <fieldset className="fun-setup">
   <legend>팀 수</legend>
   <div className="fun-choice">{[1,2,3,4].filter(n=>n>=game.teamsMin).map(n=><button type="button" key={n} aria-pressed={teams===n} onClick={()=>setTeams(n)}>{n===1?'반 전체 한 팀':`${n}팀 (${TEAM_NAMES.slice(0,n).join('·')})`}</button>)}</div>
  </fieldset>
  <label className="fun-check"><input type="checkbox" checked={seated} onChange={e=>setSeated(e.target.checked)}/>앉아서 하기 · {game.seatedNote}</label>
  <details className="fun-more"><summary>선생님 안내 · 단축키 · 안전</summary>
   <ul>
    <li>흐름: 시범 → 연습 판(점수 연습) → 본게임 {game.timing.play}초 → 마지막 승부 {game.timing.climax}초 → 결과 발표</li>
    <li>점수 기준: {game.scoringHint}</li>
    <li>단축키: Space 다음 · P 일시정지 · 1~4 팀 +1 (Shift −1) · A 모든 팀 +1 · G 황금 신호 · S 필살기</li>
    {game.safetyTips.map(t=><li key={t}>안전: {t}</li>)}
    {merged.length>0&&<li>이 게임은 {merged.join(', ')} 놀이를 한 판으로 합쳤어요.</li>}
   </ul>
  </details>
  <button type="button" className="fun-link" onClick={onExit}>활동 목록으로</button>
 </main>;
}

function SignatureArena({game,teams,seated,skipDemo,groupId,enqueueAction,onExit,onReplay}:{game:SignatureGameDef;teams:number;seated:boolean;skipDemo:boolean;groupId:string;enqueueAction?:(a:unknown)=>void;onExit:()=>void;onReplay:()=>void}){
 const seed=useMemo(()=>Math.floor(Math.random()*1e9),[]);
 const engine=useFunEngine({teams,timing:game.timing,seed,keyboard:true,isComplete:game.isComplete});
 const {state,dispatch}=engine;
 const [recorded,setRecorded]=useState(false);
 const skipped=useRef(false);
 useEffect(()=>{if(skipDemo&&!skipped.current&&state.phase==='demo'){skipped.current=true;dispatch({type:'next'});}},[skipDemo,state.phase,dispatch]);
 const cue=cueOf(game,state,seated);
 const mod=SIGNATURE_MODULES[game.id]??{};
 const props:SignatureModuleProps={game,state,cue,seated,dispatch};
 // 리모컨이 붙으면 TV 상태를 알린다(3단계).
 useEffect(()=>{engine.bus.publishState({gameId:game.id,gameName:game.name,phase:state.phase,paused:state.paused,secondsLeft:engine.secondsLeft,teams:state.teams,scores:state.scores,scoreLabel:game.scoreLabel,cue:cue.text,combo:state.combo,comboFull:comboFull(state)});});
 const titleRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[state.phase]);

 if(state.phase==='result'){
  const summary=resultSummary(state,game);
  const headline=game.resultHeadline?.(state)??summary.headline;
  // MVP 동작: 점수를 가장 많이 얻은 '동작 신호'(카드 안내·쉬는 신호는 빼고).
  const mvp=Object.entries(state.cueHits).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([k])=>{const [phase,index]=k.split(':');return cueOf(game,state,seated,{phase:phase as 'play'|'climax',index:Number(index)});}).find(c=>c.scorable!==false);
  const Extra=mod.Result;
  const record=(participation:'performed'|'rested')=>{
   if(recorded)return;setRecorded(true);
   enqueueAction?.({id:Math.random().toString(),type:'INCREMENT_SCORE',timestamp:Date.now(),payload:{id:groupId,amount:100,details:{
    participation,completion:state.endedBy==='teacher'?'partial':'complete',
    metrics:{'대표 게임':game.name,'팀 점수':state.scores.map((v,i)=>`${teams===1?'우리 반':TEAM_NAMES[i]} ${v}`).join(' · '),'결과':headline,'배운 개념':game.concept,'진행 방법':seated?'앉아서':'서서','기록 기준':'선생님이 확인한 참여 · 신체 능력 측정 아님'},
   }}});
  };
  return arena(<div className="fun-arena" data-phase="result">
   <ResultCeremony summary={{...summary,headline}} teams={teams} scoreLabel={game.scoreLabel} mvpMove={mvp?.move??mvp?.text} endedBy={state.endedBy}
    extra={Extra?<Extra {...props}/>:undefined} recorded={recorded} onRecord={record} onReplay={onReplay} onExit={onExit}/>
  </div>);
 }

 const left=engine.secondsLeft;
 const scoring=state.phase!=='demo';
 const surpriseKind=SURPRISE_KINDS[Math.floor(seededRandom(state.seed+state.log.length*17)()*SURPRISE_KINDS.length)];
 const buttons:TeacherButton[]=[
  {label:`▶ ${NEXT_LABEL[state.phase]}`,command:{type:'next'},hint:'Space',tone:'primary'},
  {label:state.paused?'▶ 다시 시작':'⏸ 일시정지',command:{type:'pause'},hint:'P'},
  {label:'👍 모든 팀 +1',command:{type:'scoreAll',delta:1},hint:'A',disabled:!scoring},
  {label:'🎲 깜짝 이벤트',command:{type:'event',event:surpriseKind},disabled:!scoring||!!state.event},
  ...(mod.controls?.(props)??[]),
  {label:'■ 끝내기',command:{type:'end'},tone:'danger'},
 ];
 const Panel=mod.Panel;
 return arena(<div className="fun-arena" data-phase={state.phase} data-tone={cue.tone} data-paused={state.paused||undefined} data-final={engine.finalCountdown||undefined}>
  <header className="fun-head">
   <h1 ref={titleRef} tabIndex={-1}><span aria-hidden="true">{game.emoji}</span> {game.name}</h1>
   <span className="fun-phase" data-phase={state.phase}>{PHASE_LABEL[state.phase]}</span>
   <span className="fun-timer" aria-label={`남은 시간 ${left}초`}>⏱ {left}초</span>
   {/* 게임 화면이 앱 도구 막대를 덮으므로 여기에도 나가는 버튼을 둔다. */}
   <button type="button" className="fun-exit" aria-label="활동 목록으로" onClick={onExit}>← 목록</button>
  </header>
  {state.phase==='demo'?<DemoLoop frames={game.demo} onSkip={()=>dispatch({type:'next'})} skipLabel="▶ 연습 판 시작"/>:<>
   <section className="fun-signal" data-tone={cue.tone} aria-live="polite" aria-atomic="true">
    {!mod.hideFigure&&cue.pose&&<div className="fun-signal-figure"><StickFigure pose={cue.pose} size={120}/></div>}
    <div className="fun-signal-text">
     {cue.icon&&<span className="fun-signal-icon" aria-hidden="true">{cue.icon}</span>}
     <strong className="fun-cue" data-length={lengthOf(cue.text)}>{cue.text}</strong>
     {cue.sub&&<p className="fun-cue-sub">{cue.sub}</p>}
    </div>
   </section>
   {Panel&&<Panel {...props}/>}
   <p className="fun-hint">{state.phase==='tutorial'?'연습 판이에요. 점수 버튼을 눌러 보세요 · 본게임에서 0점부터 다시 시작해요':`점수 기준: ${game.scoringHint}`}</p>
   <TeamScoreboard state={state} label={game.scoreLabel} dispatch={dispatch}/>
   <ComboGauge combo={state.combo}/>
  </>}
  <TeacherControls buttons={state.phase==='demo'?buttons.filter(b=>b.command.type!=='scoreAll'&&b.command.type!=='event'&&b.tone!=='gold'):buttons} dispatch={dispatch}/>
  <SurpriseBanner key={state.event?`${state.event.kind}-${state.log.length}`:'none'} event={state.event?.kind??null}/>
  <FinalCountdown seconds={left} active={engine.finalCountdown}/>
  {state.paused&&<div className="fun-paused" role="status"><strong>⏸ 일시정지</strong><button type="button" className="fun-primary" onClick={()=>dispatch({type:'pause'})}>▶ 다시 시작 (P)</button></div>}
  {engine.completeNow&&<div className="fun-victory" role="alert"><strong>🎉 해냈어요!</strong></div>}
 </div>);
}
/** 게임 무대는 화면 전체(앱 도구 막대 위)를 덮으므로 body 끝에 그린다. 무대 안에 '← 목록' 버튼이 있다. */
const arena=(node:ReactNode)=>typeof document==='undefined'?node:createPortal(node,document.body);
