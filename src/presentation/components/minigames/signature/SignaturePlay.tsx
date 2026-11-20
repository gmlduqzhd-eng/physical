import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {getSignatureGame,type SignatureGameDef} from '../../../../domain/signatureGames';
import {FUN_PHASE_LABEL,TEAM_COLORS,TEAM_NAMES,acceptsPlayInput,comboFull,resultSummary,seededRandom,surprisesNow,type FunCommandGate,type FunState,type SurpriseKind} from '../../../../domain/funLoop';
import {createFunCommandBus,type FunCommandBus} from '../../../../application/funCommandBus';
import {clearFunSession,clearRemoteRoom,loadFunSession,loadRemoteRoom,saveFunSession,saveRemoteRoom,type FunSession,type FunSetup} from '../../../../application/funSession';
import {GAMES} from '../../../../domain/gamesData';
import {unlockAudio} from '../../../../application/soundEffects';
import {ComboGauge,DemoLoop,FinalCountdown,ResultCeremony,StickFigure,SurpriseBanner,TeacherControls,TeamScoreboard,TeamShape,TimeBar,TvModeControl,useFunEngine,useTvModeExit,type TeacherButton} from '../../fun';
import {RemoteLink} from '../../fun/RemoteLink';
import {requestRemotePanelClose,useRemotePanelOpen} from '../../fun/remotePanelState';
import {ClassFeedbackSlot} from '../../ClassFeedbackSlot';
import {StartLabel} from '../../StartLabel';
import {holdPlayId,newPlayId,releasePlayId} from '../../../../application/classProgressStore';
import type {SignatureCue} from '../../../../domain/signatureGames';
import {SIGNATURE_MODULES} from './modules';
import {cueOf,shortcutHelp} from './signatureCue';
import type {SignatureModuleProps} from './moduleTypes';
import {useTvVoice} from '../../../../application/useTvVoice';
import {countdownSpeech,surpriseSpeech} from '../../../../application/speechAnnouncer';
import {TvVoiceToggle} from '../../TvVoiceToggle';
import {getLessonActivity,setLessonConfirming,useLessonConfirming,useReportLessonActivity} from '../../todayLessonActivity';
import {useModalDialog} from '../../../../application/useModalDialog';
import '../../fun/fun.css';

interface Props {gameId:string;groupId?:string;enqueueAction?:(a:unknown)=>void;onExit:()=>void;
 /** '한 판 더'를 누르면 부른다(게임 화면 바깥이 '이미 기록함' 상태를 풀어 다음 판도 기록되게). */
 onRoundReset?:()=>void}
const PHASE_LABEL:Record<FunState['phase'],string>=FUN_PHASE_LABEL;
const NEXT_LABEL:Record<FunState['phase'],string>={demo:'연습 판 시작',tutorial:'본게임 시작',play:'마지막 승부로 건너뛰기',climax:'결과 발표',result:''};
/** 모듈이 큰 신호 칸을 바꾸지 않을 때 쓰는 빈 훅(훅 호출 순서를 늘 같게). */
const noSignalOverride=():SignatureCue|null=>null;
/** 차례가 없는 놀이용 빈 훅. */
const noTurnTeam=():number|null=>null;

/** '오늘 수업'에서 연 게임이면 결과 화면의 나가는 버튼을 '오늘 수업으로'라고 쓴다(실제로 /today로 돌아간다). */
const fromTodayLesson=()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('returnTo')==='/today';
/** '■ 끝내기'를 한 번 누른 뒤 이 시간 안에 한 번 더 눌러야 판이 끝난다. */
export const END_CONFIRM_MS=3000;
const lengthOf=(t:string)=>t.length>16?'long':t.length>9?'medium':undefined;
/** 진행 중 신호(시범·결과 제외). */
const isCuePhase=(p:FunState['phase']):p is 'tutorial'|'play'|'climax'=>p==='tutorial'||p==='play'||p==='climax';
/** 결과 큰 제목(연습만 했으면 게임별 제목 대신 '연습만 했어요'). 결과 화면과 리모컨이 같은 말을 쓴다. */
function resultHeadlineOf(game:SignatureGameDef,state:FunState):string{
 const summary=resultSummary(state,game);
 return summary.practiceOnly?summary.headline:game.resultHeadline?.(state)??summary.headline;
}


/** 대표 게임 화면: 시작 화면 → (시범 → 연습 판 → 본게임 → 마지막 승부 → 결과). */
export function SignaturePlay({gameId,groupId='standalone-player',enqueueAction,onExit,onRoundReset}:Props){
 const game=getSignatureGame(gameId);
 const [setup,setSetup]=useState<FunSetup|null>(null);
 // '오늘 수업'에서 고른 팀 수(?teams=1~4)가 있으면 처음 값으로 쓴다. 없거나 맞지 않으면 게임 기본값.
 const [teams,setTeams]=useState<number>(()=>{const q=Number(typeof window==='undefined'?NaN:new URLSearchParams(window.location.search).get('teams'));return game&&Number.isInteger(q)&&q>=game.teamsMin&&q<=4?q:game?.teamsDefault??2;});
 const [seated,setSeated]=useState(false);
 // TV 모드: Esc(열린 창이 없을 때)나 전체 화면 끝내기로 나간다.
 useTvModeExit();
 // 명령 버스와 리모컨 연결은 판(round)보다 오래 산다: 결과 화면·'한 판 더'에서도 휴대폰 리모컨이 끊기지 않는다.
 const bus=useMemo(()=>createFunCommandBus(),[]);
 // 새로고침 이어 하기: 이 탭에 남은 판이 있으면 시작 화면에서 '이어 하기'를 고를 수 있다.
 const [saved,setSaved]=useState<FunSession|null>(()=>game?loadFunSession(game.id,game.timing):null);
 const [resume,setResume]=useState<FunSession|null>(null);
 // 지금 쓰는 리모컨 방 코드. '모두 끊기'로 바뀌면 새 코드로 갱신한다(버린 코드가 되살아나지 않게).
 const [room,setRoom]=useState<string|undefined>(()=>game?loadRemoteRoom(game.id):undefined);
 // 지금 판의 seed. 모듈이 따로 모은 기록(빙고판·응원 수)은 '한 판 더'·목록으로 나갈 때 지운다(화면 정리 때 지우면 개발 모드에서 이어 하기가 깨진다).
 const seedRef=useRef<number|null>(null);
 const disposeRound=()=>{const mod=game?SIGNATURE_MODULES[game.id]:undefined;if(seedRef.current!==null)mod?.dispose?.(seedRef.current);seedRef.current=null;};
 // '오늘 수업' 확인 창이 떠 있는 동안에는 리모컨 막대도 누를 수 없다(초점은 확인 창에).
 const lessonConfirming=useLessonConfirming();
 // 게임 중 '← 목록'(수업 중에는 '← 오늘 수업')을 누르면 바로 나가지 않고 묻는다(진행 중인 판이 사라지지 않게).
 const [leaveAsk,setLeaveAsk]=useState(false);
 const leaveHeld=useRef(false);
 const leaveCancelRef=useRef<HTMLButtonElement>(null);
 const cancelLeave=()=>{if(leaveHeld.current){leaveHeld.current=false;getLessonActivity()?.release?.();}setLeaveAsk(false);};
 const leaveDialogRef=useModalDialog(leaveAsk,cancelLeave);
 // 묻는 동안은 '오늘 수업' 확인 창과 같은 상태로 둔다: 무대는 누를 수 없고, 휴대폰 리모컨 명령도 받지 않는다.
 useEffect(()=>{if(!leaveAsk)return;setLessonConfirming(true);leaveCancelRef.current?.focus();return ()=>setLessonConfirming(false);},[leaveAsk]);
 // 확인 창(이 창이든 '오늘 수업' 막대의 창이든)이 떠 있을 때 무대를 마우스로 눌러도 초점이 창 밖으로 빠지지 않게 한다.
 useEffect(()=>{
  if(!lessonConfirming)return;
  const keep=(e:MouseEvent)=>{const t=e.target instanceof Element?e.target:null;if(!t?.closest('[role="alertdialog"],[aria-modal="true"]'))e.preventDefault();};
  document.addEventListener('mousedown',keep,true);return ()=>document.removeEventListener('mousedown',keep,true);
 },[lessonConfirming]);
 if(!game)return <div className="fun-arena"><p>이 대표 게임은 아직 준비 중이에요.</p><button type="button" className="fun-primary" onClick={onExit}>활동 목록으로</button></div>;
 // 목록으로 나가면 이어 할 판을 지운다(새로고침은 그대로 남는다).
 // '오늘 수업' 막대로 다음 단계에 가거나 목록으로 나가면 이어 할 판과 리모컨 방을 지운다(새로고침은 그대로 남는다).
 const leave=()=>{disposeRound();clearFunSession(game.id);clearRemoteRoom(game.id);};
 const exit=()=>{leave();onExit();};
 const inLesson=fromTodayLesson();
 const askLeave=()=>{
  const act=getLessonActivity();
  if(act?.gameId===game.id&&act.phase==='playing'){leaveHeld.current=!!act.hold?.();setLeaveAsk(true);}
  else exit();
 };
 const leaveDialog=leaveAsk?arena(<div className="fun-leave-backdrop">
  <div ref={leaveDialogRef} tabIndex={-1} className="fun-leave-ask" role="alertdialog" aria-modal="true" aria-labelledby="fun-leave-title" aria-describedby="fun-leave-text">
   <h2 id="fun-leave-title">아직 게임 중이에요</h2>
   <p id="fun-leave-text">{inLesson?'오늘 수업으로 돌아가기 전에 결과를 볼까요?':'목록으로 나가기 전에 결과를 볼까요?'} 기록 없이 나가면 이 판은 사라져요.</p>
   <div className="fun-leave-actions">
    <button type="button" className="fun-primary" onClick={()=>{leaveHeld.current=false;setLeaveAsk(false);getLessonActivity()?.finish?.();}}>결과 발표 보기</button>
    <button type="button" className="fun-secondary" onClick={()=>{leaveHeld.current=false;setLeaveAsk(false);exit();}}>기록 없이 나가기</button>
    <button ref={leaveCancelRef} type="button" className="fun-secondary" onClick={cancelLeave}>취소</button>
   </div>
  </div>
 </div>):null;
 // 리모컨 막대는 시작 화면(이어 할 판이 있을 때)과 게임 화면에서 같은 자리에 하나만 둔다.
 // 화면이 바뀌어도 다시 만들어지지 않아야 휴대폰 연결이 끊기지 않는다(새로고침 → 이어 하기).
 // 방 코드가 있는 동안은 시작 화면에서도 막대를 둔다('새로 시작'으로 남은 판을 지워도 휴대폰 연결이 이어진다).
 const dock=(setup||room)?arena(<div className="fun-dock" role="group" aria-label={setup?'리모컨·나가기':'리모컨'} inert={lessonConfirming||undefined}>
  {/* 나가는 버튼은 늘 왼쪽 위(시작·진행·결과 화면 모두 같은 자리). 게임 화면이 앱 도구 막대를 덮으므로 여기에 둔다. */}
  {setup&&<button type="button" className="fun-exit" aria-label={inLesson?'오늘 수업으로':'활동 목록으로'} onClick={askLeave}>{inLesson?'← 오늘 수업':'← 목록'}</button>}
  {setup&&<TvModeControl className="fun-tv-btn"/>}
  <RemoteLink bus={bus} initialCode={room} onCodeChange={code=>{saveRemoteRoom(game.id,code);setRoom(code);}} announceStop={()=>!loadRemoteRoom(game.id)}/>
 </div>):null;
 if(setup)return <>{dock}{leaveDialog}
  <SignatureArena key={setup.round} game={game} bus={bus} setup={setup} restore={resume&&resume.setup.round===setup.round?resume:null} groupId={groupId} enqueueAction={enqueueAction} onExit={exit} onLeave={leave}
   onSeed={seed=>{seedRef.current=seed;}}
   onReplay={()=>{disposeRound();onRoundReset?.();setResume(null);setSetup(s=>s&&{...s,skipDemo:true,round:s.round+1});}}/>
 </>;
 const merged=game.mergedFrom.map(id=>GAMES.find(g=>g.type===id)?.name).filter(Boolean);
 const start=(skipDemo:boolean)=>{unlockAudio();clearFunSession(game.id);setSaved(null);setResume(null);setSetup({teams,seated,skipDemo,round:0});};
 const resumeSaved=()=>{if(!saved)return;unlockAudio();setResume(saved);setSetup(saved.setup);};
 return <>{dock}<main className="fun-intro" data-game={game.id}>
  {/* 나가는 버튼은 늘 왼쪽 위, TV 모드는 오른쪽 위. 보통 화면에서는 앱 도구 막대의 ←가 왼쪽 위에 있어, 이 버튼은 그 막대를 덮는 TV 모드에서만 보인다. */}
  <div className="fun-intro-top">
   <button type="button" className="fun-exit" aria-label={inLesson?'오늘 수업으로':'활동 목록으로'} onClick={onExit}>{inLesson?'← 오늘 수업':'← 목록'}</button>
   <p className="fun-eyebrow">대표 게임 · TV 하나로 반 전체가 함께</p>
   <TvModeControl className="fun-tv-btn"/>
  </div>
  <h1><span aria-hidden="true">{game.emoji}</span> {game.name}</h1>
  {saved&&<section className="fun-resume" aria-label="이어 하기">
   <p><b>하던 판이 남아 있어요</b> · {FUN_PHASE_LABEL[saved.state.phase]} · {saved.state.scores.map((v,i)=>`${saved.setup.teams===1?'우리 반':TEAM_NAMES[i]} ${v}`).join(' · ')}</p>
   <div className="fun-start">
    <button type="button" className="fun-primary fun-big" onClick={resumeSaved}>⏯ 이어 하기</button>
    <button type="button" className="fun-secondary" onClick={()=>{clearFunSession(game.id);setSaved(null);}}>새로 시작 (남은 판 지우기)</button>
   </div>
  </section>}
  <p className="fun-oneline">{game.oneLine}</p>
  <ol className="fun-rule-card">{(['무엇을','어떻게','언제 끝'] as const).map((h,i)=><li key={h}><b>{h}</b>{game.rules[i]}</li>)}</ol>
  <div className="fun-start">
   {/* 주 버튼은 하나만: 이어 할 판이 있으면 '이어 하기'가 주 버튼이고, 새로 시작은 보조 버튼이 된다. */}
   <button type="button" className={saved?'fun-secondary fun-big':'fun-primary fun-big'} onClick={()=>start(false)}><StartLabel sub="시범 보고 연습 판"/></button>
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
    <li>단축키: {shortcutHelp(game,SIGNATURE_MODULES[game.id]??{})}</li>
    {game.safetyTips.map(t=><li key={t}>안전: {t}</li>)}
    {merged.length>0&&<li>이 게임은 {merged.join(', ')} 놀이를 한 판으로 합쳤어요.</li>}
   </ul>
  </details>
 </main></>;
}

function SignatureArena({game,bus,setup,restore,groupId,enqueueAction,onExit,onLeave,onReplay,onSeed}:{game:SignatureGameDef;bus:FunCommandBus;setup:FunSetup;restore:FunSession|null;groupId:string;enqueueAction?:(a:unknown)=>void;onExit:()=>void;onLeave:()=>void;onReplay:()=>void;onSeed:(seed:number)=>void}){
 const {teams,seated,skipDemo}=setup;
 const seed=useMemo(()=>restore?.seed??Math.floor(Math.random()*1e9),[restore]);
 const mod=SIGNATURE_MODULES[game.id]??{};
 // 이어 하기: 모듈 기록(빙고판·응원 수)을 판을 그리기 전에 되살린다.
 useState(()=>{onSeed(seed);if(restore?.module!=null)mod.restore?.(seed,restore.module);return true;});
 // 필살기가 없는 놀이는 필살기 명령(키보드 S·리모컨)을 받지 않는다. 나머지는 게임 문지기.
 // 신호에 맞지 않는 깜짝 이벤트(예: 숫자 카드의 '거꾸로!')는 버튼·키보드·리모컨으로 눌러도 받지 않고, 예약된 것은 미룬다.
 const allowsEvent=(s:FunState,kind:SurpriseKind)=>!isCuePhase(s.phase)||!(cueOf(game,s,seated).blockEvents??[]).includes(kind);
 const gate:FunCommandGate=(s,cmd)=>cmd.type==='special'&&!mod.special?null:cmd.type==='event'&&!allowsEvent(s,cmd.event)?null:game.commandGate?game.commandGate(s,cmd):cmd;
 // 신호마다 길이가 다를 수 있다(예: '10초 달리기'는 12초, 숫자 카드는 8초).
 const cueSeconds=(s:FunState)=>isCuePhase(s.phase)?cueOf(game,s,seated).seconds:undefined;
 const engine=useFunEngine({teams,timing:game.timing,seed,keyboard:true,isComplete:game.isComplete,bus,gate,cueSeconds,allowsEvent,surprises:game.surprises,initialState:restore?.state});
 const {state,dispatch}=engine;
 const [recorded,setRecorded]=useState(restore?.recorded??false);
 // 이 판의 id: 판을 시작할 때 정하고, 새로고침 이어 하기에도 같은 id를 쓴다(기록 전에 누른 👍/👎가 이 판에 붙어 있게).
 const [playId]=useState(()=>restore?.playId??newPlayId());
 // 결과를 기록할 때 이 판 id로 남도록 잡아 둔다.
 useEffect(()=>{holdPlayId(game.id,playId);return ()=>releasePlayId(game.id,playId);},[game.id,playId]);
 // 새로고침해도 이어 할 수 있게 지금 판을 이 탭에 적어 둔다. 결과를 기록한 판은 지운다(이어 할 것이 없음).
 // 연습 판까지만 하고 끝낸 판은 기록하지 않는다(판 수에 넣지 않는다). 기록할 것이 없으니 이어 할 판도 남기지 않는다.
 const practiceOnly=state.phase==='result'&&resultSummary(state,game).practiceOnly;
 useEffect(()=>{
  if(state.phase==='result'&&(recorded||practiceOnly)){clearFunSession(game.id);return;}
  saveFunSession({gameId:game.id,setup,seed,state,recorded,module:mod.snapshot?.(seed),playId});
 });
 // '오늘 수업' 막대가 진행 중인지 알 수 있게 알린다(진행 중이면 다음 단계 전에 확인을 받는다).
 // 막대의 확인 창이 떠 있는 동안에는 시간을 멈춘다. 이때는 일시정지 덮개가 초점을 가져가지 않는다(초점은 확인 창에).
 const pausedRef=useRef(state.paused);pausedRef.current=state.paused;
 const quietPause=useRef(false);
 const dispatchRef=useRef(dispatch);dispatchRef.current=dispatch;
 useReportLessonActivity({gameId:game.id,phase:state.phase!=='result'?'playing':recorded||practiceOnly?'recorded':'result',finish:()=>{quietPause.current=false;dispatchRef.current({type:'end'});},cleanup:onLeave,
  hold:()=>{if(pausedRef.current)return false;quietPause.current=true;dispatchRef.current({type:'pause'});return true;},
  release:()=>{if(pausedRef.current){quietPause.current=true;dispatchRef.current({type:'resume'});}}});
 const confirming=useLessonConfirming();
 // 휴대폰 리모컨 창이 큰 신호를 가리는 동안에는 시간을 멈춘다(창을 닫으면 이 창 때문에 멈춘 것만 다시 움직인다).
 const panelOpen=useRemotePanelOpen();
 const phaseRef=useRef(state.phase);phaseRef.current=state.phase;
 const panelHeld=useRef(false);
 const panelSawPaused=useRef(state.paused);
 useEffect(()=>{
  const resumed=panelSawPaused.current&&!state.paused;panelSawPaused.current=state.paused;
  if(!panelOpen){
   // 창 때문에 멈춘 것만 다시 움직인다(선생님이 직접 멈춘 판은 그대로).
   if(panelHeld.current){panelHeld.current=false;if(state.paused){quietPause.current=true;dispatch({type:'resume'});}}
   return;
  }
  // 창이 열린 채 판이 다시 움직였다(P·휴대폰 '다시 시작'·확인 창 취소): 선생님이 진행을 원하니 창을 닫아 신호를 보이게 한다.
  if(resumed){panelHeld.current=false;requestRemotePanelClose();return;}
  // 창을 열었거나, 창이 열린 채 시범에서 연습 판으로 넘어갔다: 창 뒤에서 판이 흐르지 않게 멈춘다.
  if(isCuePhase(state.phase)&&!state.paused){panelHeld.current=true;quietPause.current=true;dispatch({type:'pause'});}
 },[panelOpen,state.paused,state.phase,dispatch]);
 // '■ 끝내기'는 한 번 누르면 알리고, 3초 안에 한 번 더 눌러야 끝난다(잘못 눌러 판이 끝나지 않게). 리모컨은 휴대폰에서 따로 묻는다.
 // 마지막 승부의 '▶ 결과 발표'도 판을 끝내는 버튼이라 같은 규칙을 쓴다('마지막 승부로'는 한 번에 넘어간다).
 const [armed,setArmed]=useState<'end'|'result'|null>(null);
 const endArmed=armed==='end',resultArmed=armed==='result';
 const endTimer=useRef<number|undefined>(undefined);
 const disarmEnd=()=>{window.clearTimeout(endTimer.current);setArmed(null);};
 useEffect(()=>()=>window.clearTimeout(endTimer.current),[]);
 useEffect(()=>{window.clearTimeout(endTimer.current);setArmed(null);},[state.phase,state.paused]);
 const controlDispatch=(cmd:Parameters<typeof dispatch>[0])=>{
  const kind=cmd.type==='end'?'end':cmd.type==='next'&&state.phase==='climax'?'result':null;
  if(kind){
   if(armed!==kind){window.clearTimeout(endTimer.current);setArmed(kind);endTimer.current=window.setTimeout(()=>setArmed(null),END_CONFIRM_MS);return;}
   disarmEnd();
  }
  dispatch(cmd);
 };
 const skipped=useRef(false);
 useEffect(()=>{if(skipDemo&&!skipped.current&&state.phase==='demo'){skipped.current=true;dispatch({type:'next'});}},[skipDemo,state.phase,dispatch]);
 const cue=cueOf(game,state,seated);
 /** 버튼도 키보드·리모컨과 같은 규칙: 일시정지·시범이면 끄고, 게임 문지기가 받지 않으면 끈다. */
 const allows=(cmd:Parameters<NonNullable<SignatureGameDef['commandGate']>>[1])=>acceptsPlayInput(state)&&(!game.commandGate||!!game.commandGate(state,cmd));
 const props:SignatureModuleProps={game,state,cue,seated,dispatch};
 // 판에서 고른 것(빙고 칸 등)이 있으면 큰 신호 칸에 그것을 띄운다.
 const useOverride=mod.useSignalCue??noSignalOverride;
 const override=useOverride(props);
 const shown:SignatureCue=override??cue;
 // 팀이 차례로 하는 놀이: 지금 차례인 팀을 화면 테두리·머리줄·점수판에 색과 모양, 글로 함께 알린다.
 const useTurn=mod.useTurnTeam??noTurnTeam;
 const turnRaw=useTurn(props);
 const turnTeam=isCuePhase(state.phase)&&turnRaw!==null&&turnRaw>=0&&turnRaw<teams?turnRaw:null;
 // 리모컨이 붙으면 TV 상태를 알린다(3단계).
 // 결과 단계에는 지난 신호 대신 결과 제목을 보낸다.
 useEffect(()=>{engine.bus.publishState({gameId:game.id,gameName:game.name,phase:state.phase,phaseLabel:FUN_PHASE_LABEL[state.phase],events:surprisesNow(state),paused:state.paused,secondsLeft:engine.secondsLeft,teams:state.teams,scores:state.scores,scoreLabel:game.scoreLabel,cue:state.phase==='result'?resultHeadlineOf(game,state):cue.text,combo:mod.special?state.combo:0,comboFull:!!mod.special&&comboFull(state),busy:confirming||undefined});});
 const titleRef=useRef<HTMLHeadingElement>(null);
 // 휴대폰 폭: 아래에 붙은 선생님 버튼 줄의 높이를 알려, 점수판이 그 바로 위에 붙어 늘 보이게 한다(판이 길어 화면을 넘는 놀이).
 const arenaRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=arenaRef.current,controls=root?.querySelector<HTMLElement>('.fun-controls');
  if(!root||!controls||typeof ResizeObserver==='undefined')return;
  const set=()=>root.style.setProperty('--fun-controls-h',`${controls.offsetHeight}px`);
  set();const ro=new ResizeObserver(set);ro.observe(controls);return ()=>ro.disconnect();
 },[state.phase]);
 useEffect(()=>{if(state.phase!=='result')titleRef.current?.focus({preventScroll:true});},[state.phase]);
 // 일시정지하면 덮개의 '다시 시작'으로 초점을 옮긴다(덮개 뒤 버튼은 inert라 누를 수 없다).
 const resumeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(state.paused&&!quietPause.current)resumeRef.current?.focus({preventScroll:true});},[state.paused]);
 // 다시 시작하면 초점을 '일시정지' 버튼으로 돌려준다(덮개 버튼이 사라져 초점을 잃지 않게).
 const wasPaused=useRef(state.paused);
 useEffect(()=>{
  if(wasPaused.current&&!state.paused){
   // 확인 창을 닫으며 다시 움직인 경우에는 초점을 옮기지 않는다(막대의 버튼으로 돌아간다).
   if(quietPause.current)quietPause.current=false;
   else document.querySelector<HTMLButtonElement>('.fun-arena .fun-controls button[data-command="pause"]')?.focus({preventScroll:true});
  }
  wasPaused.current=state.paused;
 },[state.paused]);

 // 음성 안내: TV를 보지 않는 학생도 큰 신호를 소리로 따라오게. 일시정지면 읽지 않는다.
 const voice=useTvVoice({paused:state.paused});
 const say=voice.say;
 const spokenPhase=useRef<FunState['phase']|null>(null);
 const eventSeq=state.event?.seq;
 useEffect(()=>{if(state.event&&!state.paused)say(surpriseSpeech(state.event.kind),{priority:true,tone:'excited'});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 새 깜짝 이벤트가 시작될 때만 읽는다.
 },[eventSeq]);
 const cueKey=isCuePhase(state.phase)&&!state.paused?`${state.phase}:${state.cueIndex}:${shown.text}`:'';
 useEffect(()=>{
  if(!cueKey)return;
  // 판이 바뀐 첫 신호는 판 이름을 붙여 한 번에 읽는다(두 문장이 서로 끊지 않게).
  const fresh=spokenPhase.current!==state.phase;
  // 마지막 승부는 신나게, 시범·연습 판은 차분하게 읽는다.
  if(say(`${fresh?`${PHASE_LABEL[state.phase]}! `:''}${shown.text}`,{tone:state.phase==='climax'?'excited':state.phase==='demo'||state.phase==='tutorial'?'calm':'normal'}))spokenPhase.current=state.phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 신호가 바뀔 때만 읽는다.
 },[cueKey]);
 const countdown=engine.finalCountdown&&!state.paused?countdownSpeech(engine.secondsLeft):null;
 useEffect(()=>{if(countdown)say(countdown,{priority:true,tone:'excited',noEarcon:true});},[countdown,say]);
 const resultLine=state.phase==='result'?resultHeadlineOf(game,state):'';
 useEffect(()=>{if(resultLine)say(`${FUN_PHASE_LABEL.result}! ${resultLine}`,{priority:true,tone:'excited'});},[resultLine,say]);

 if(state.phase==='result'){
  const summary=resultSummary(state,game);
  // 연습만 하고 끝냈으면 게임별 제목(예: '보스 0마리…') 대신 '연습만 했어요'.
  const headline=resultHeadlineOf(game,state);
  // MVP 동작: 점수를 가장 많이 얻은 '동작 신호'(카드 안내·쉬는 신호는 빼고).
  const mvpGame=game.mvpMove?.(state);
  const mvp=mvpGame?{move:mvpGame,text:mvpGame}:Object.entries(state.cueHits).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([k])=>{const [phase,index]=k.split(':');return cueOf(game,state,seated,{phase:phase as 'play'|'climax',index:Number(index)});}).find(c=>c.scorable!==false);
  const Extra=mod.Result;
  const record=(participation:'performed'|'rested')=>{
   if(recorded||summary.practiceOnly)return;setRecorded(true);clearFunSession(game.id);
   enqueueAction?.({id:Math.random().toString(),type:'INCREMENT_SCORE',timestamp:Date.now(),payload:{id:groupId,amount:100,details:{
    participation,completion:state.endedBy==='teacher'||summary.practiceOnly?'partial':'complete',
    metrics:{'대표 게임':game.name,'팀 점수':state.scores.map((v,i)=>`${teams===1?'우리 반':TEAM_NAMES[i]} ${v}`).join(' · '),'결과':headline,'배운 개념':game.concept,'진행 방법':seated?'앉아서':'서서','기록 기준':'선생님이 확인한 참여 · 신체 능력 측정 아님'},
   }}});
  };
  return arena(<div className="fun-arena" data-phase="result">
   <ResultCeremony summary={{...summary,headline}} teams={teams} scoreLabel={game.scoreLabel} mvpMove={mvp?.move??mvp?.text} mvpLabel={game.mvpLabel} endedBy={state.endedBy}
    extra={Extra?<Extra {...props}/>:undefined} afterRecord={<ClassFeedbackSlot gameId={game.id} playId={playId}/>} recorded={recorded} onRecord={record} onReplay={onReplay} onExit={onExit} exitLabel={fromTodayLesson()?'오늘 수업으로':undefined}/>
  </div>);
 }

 const left=engine.secondsLeft;
 const scoring=state.phase!=='demo';
 // 버튼으로 일으킬 깜짝 이벤트는 이 게임이 쓰는 목록에서 고른다.
 const allowedEvents=surprisesNow(state);
 const surpriseKind=allowedEvents[Math.floor(seededRandom(state.seed+state.eventSeq*17)()*allowedEvents.length)]??'golden';
 const buttons:TeacherButton[]=[
  // 본게임 중 '마지막 승부로'는 일찍 끝내는 버튼이라 눈에 띄는 노란색으로 두지 않는다(시간이 되면 저절로 넘어간다).
  {label:resultArmed?'▶ 한 번 더 누르면 결과 발표':`${state.phase==='play'?'⏭':'▶'} ${NEXT_LABEL[state.phase]}`,command:{type:'next'},hint:'Space',tone:state.phase==='play'?undefined:'primary'},
  {label:state.paused?'▶ 다시 시작':'⏸ 일시정지',command:{type:'pause'},hint:'P'},
  // 점수판 ± 없이 판에서만 점수를 주는 놀이(빙고)는 '모든 팀 +1'도 두지 않는다.
  ...(mod.scoreButtons===false||mod.scoreAllButton===false?[]:[{label:'👍 모든 팀 +1',command:{type:'scoreAll',delta:1},hint:'A',disabled:!scoring||!allows({type:'scoreAll',delta:1})} satisfies TeacherButton]),
  {label:'🎲 깜짝 이벤트',command:{type:'event',event:surpriseKind},disabled:!scoring||!!state.event||!allowedEvents.length||!allows({type:'event',event:surpriseKind})},
  ...(mod.controls?.(props)??[]),
  {label:endArmed?'■ 한 번 더 누르면 끝나요':'■ 끝내기',command:{type:'end'},tone:'danger'},
 ];
 const Panel=mod.Panel;
 return arena(<div ref={arenaRef} className="fun-arena" data-phase={state.phase} data-tone={shown.tone} data-paused={state.paused||undefined} data-final={engine.finalCountdown||undefined}
  data-confirming={confirming||undefined} inert={confirming||undefined} data-turn={turnTeam??undefined} style={turnTeam!==null?{'--fun-turn':TEAM_COLORS[turnTeam]} as React.CSSProperties:undefined}>
  <header className="fun-head">
   <h1 ref={titleRef} tabIndex={-1}><span aria-hidden="true">{game.emoji}</span> {game.name}</h1>
   <span className="fun-phase" data-phase={state.phase}>{PHASE_LABEL[state.phase]}</span>
   {turnTeam!==null&&<span className="fun-turn-chip" style={{'--team':TEAM_COLORS[turnTeam]} as React.CSSProperties}><TeamShape team={turnTeam}/>{TEAM_NAMES[turnTeam]} 차례</span>}
   <span className="fun-timer" role="timer" aria-label={`남은 시간 ${left}초`}>⏱ {left}초</span>
   <TvVoiceToggle voice={voice} className="fun-voice"/>
   {/* 휴대폰 리모컨·'← 목록' 버튼은 판이 바뀌어도 남도록 바깥(fun-dock)에 있다. */}
  </header>
  <TimeBar left={left} total={game.timing[state.phase as 'demo'|'tutorial'|'play'|'climax']}/>
  <div className="fun-body" inert={state.paused||undefined}>
  {state.phase==='demo'?<DemoLoop frames={game.demo} seated={seated} onSkip={()=>dispatch({type:'next'})} skipLabel="▶ 연습 판 시작"/>:<>
   <div className="fun-stage" data-wide={(mod.wide&&!!Panel)||undefined}>
    <section className="fun-signal" data-tone={shown.tone} data-accent={shown.accent?true:undefined} style={shown.accent?{'--fun-signal-accent':shown.accent} as React.CSSProperties:undefined} aria-live="polite" aria-atomic="true">
     {!mod.hideFigure&&shown.pose&&<div className="fun-signal-figure"><StickFigure pose={shown.pose} size={120} seated={seated}/></div>}
     <div className="fun-signal-text">
      {shown.kicker&&<span className="fun-cue-kicker">{shown.kicker}</span>}
      {shown.icon&&<span className="fun-signal-icon" aria-hidden="true">{shown.icon}</span>}
      <strong className="fun-cue" data-length={lengthOf(shown.text)}>{shown.text}</strong>
      {shown.sub&&<p className="fun-cue-sub" data-big={shown.bigSub||undefined}>{shown.sub}</p>}
     </div>
    </section>
    {Panel&&<div className="fun-panel"><Panel {...props}/></div>}
   </div>
   <TeamScoreboard state={state} label={game.scoreLabel} dispatch={dispatch} readOnly={mod.scoreButtons===false} turnTeam={turnTeam} canScore={(team,delta)=>allows({type:'score',team,delta})}/>
   <div className="fun-meta">
    <p className="fun-hint">{state.phase==='tutorial'?'연습 판이에요. 점수 버튼을 눌러 보세요 · 본게임에서 0점부터 다시 시작해요':`점수 기준: ${game.scoringHint}`}</p>
    {mod.special&&<ComboGauge combo={state.combo}/>}
   </div>
  </>}
  {endArmed&&<p className="fun-skip-hint" data-kind="end" role="status">‘끝내기’를 한 번 더 누르면 판이 끝나요</p>}
  {resultArmed&&<p className="fun-skip-hint" data-kind="end" role="status">‘결과 발표’를 한 번 더 누르면 판이 끝나요</p>}
  {engine.skipArmed&&<p className="fun-skip-hint" role="status">Space를 한 번 더 누르면 {state.phase==='climax'?'결과 발표로':'마지막 승부로'} 넘어가요</p>}
  <TeacherControls buttons={state.phase==='demo'?buttons.filter(b=>b.command.type!=='scoreAll'&&b.command.type!=='event'&&b.tone!=='gold'):buttons} dispatch={controlDispatch}/>
  </div>
  {/* 이벤트 번호(seq)로 구분한다: 필살기처럼 다른 기록이 늘어도 같은 알림을 두 번 읽지 않는다. */}
  <SurpriseBanner key={state.event?`${state.event.kind}-${state.event.seq}`:'none'} event={state.event?.kind??null}/>
  <FinalCountdown seconds={left} active={engine.finalCountdown}/>
  {/* 확인 창이 떠 있는 동안은 '다시 시작'을 숨기고, 위 창에서 고르라고 크게 알린다(누를 수 없는 버튼처럼 보이지 않게). */}
  {confirming?<div className="fun-paused" data-confirming="true" role="status"><strong>⏸ 잠깐 멈췄어요</strong><p className="fun-paused-note">확인 창에서 골라 주세요</p></div>
  :state.paused&&<div className="fun-paused" role="status"><strong>⏸ 일시정지</strong>{panelOpen&&<p className="fun-paused-note">📱 리모컨 창을 연 동안 멈춰요 · 창을 닫으면 다시 움직여요</p>}<button ref={resumeRef} type="button" className="fun-primary" onClick={()=>dispatch({type:'pause'})}>▶ 다시 시작 (P)</button></div>}
  {engine.completeNow&&<div className="fun-victory" role="alert"><strong>🎉 해냈어요!</strong></div>}
 </div>);
}
/** 게임 무대는 화면 전체(앱 도구 막대 위)를 덮으므로 body 끝에 그린다. 무대 안에 '← 목록' 버튼이 있다. */
const arena=(node:ReactNode)=>typeof document==='undefined'?node:createPortal(node,document.body);
