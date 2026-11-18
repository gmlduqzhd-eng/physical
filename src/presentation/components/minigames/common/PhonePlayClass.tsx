import {useCallback,useEffect,useRef,useState} from 'react';
import {useActivityPause} from '../../../../application/ActivityPauseContext';
import {sfxPop,sfxWhistle,sfxCountdown,unlockAudio} from '../../../../application/soundEffects';
import {useWakeLock} from '../../../../application/useWakeLock';
import {useTvVoice} from '../../../../application/useTvVoice';
import {TvVoiceToggle} from '../../TvVoiceToggle';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import type {PhonePlay as Play} from '../../../../domain/phonePlayCatalog';
import {classCueIntervalMs,classCueMs,classOutcomeResult,classPhaseMs,classRoundView,type ClassOutcome} from '../../../../domain/phoneClassMode';
import {adaptClassicPlay,BINGO_BOARD,BINGO_ROWS_TO_WIN,bingoRows,CLASSIC_CLASS_BRIEF,CLASSIC_LADDER,groupSizeOf,ladderTop} from '../../../../domain/phonePlayClassicsMode';

type Phase='rules'|'countdown'|'brief'|'active'|'record'|'done';
interface Props {play:Play;taskSeconds:number;seated:boolean;level:string;sound:boolean;pace:number;onLeave:()=>void;enqueueAction:(action:{payload:{amount:number;details:GameResultDetails}})=>void;
 /** 시작 화면에서 역할 정하기를 이미 안내했으면 true: 규칙 카드에서 '준비됐어요'를 기다리지 않고 저절로 넘어간다. */ rolesReady?:boolean}

/** 무엇을 · 어떻게 · 언제 끝: 놀이마다 같은 자리에 같은 순서로 보여 준다. */
export function PhoneRuleCard({rule3,className=''}:{rule3:readonly string[];className?:string}){
 return <ol className={`pp-rule-card ${className}`} aria-label="놀이 규칙 세 줄">{rule3.map((line,i)=><li key={i}><b>{['무엇을','어떻게','언제 끝'][i]}</b><span>{line}</span></li>)}</ol>;
}

/** 움직임 빙고판: 다 한 칸을 눌러 지우고, 과제마다 한 줄씩 지워 세 줄을 다 지우면 빙고. */
export function MovementBingoBoard({row,done,onToggle}:{row:number;done:readonly boolean[];onToggle:(index:number)=>void}){
 const rows=bingoRows(done),left=BINGO_ROWS_TO_WIN-rows;
 return <div className="pc-bingo" data-rows={rows}>
  <div className="pc-bingo-grid" role="group" aria-label="움직임 빙고판 · 다 한 칸을 눌러 지워요">{BINGO_BOARD.flat().map((move,i)=><button key={i} type="button" aria-pressed={done[i]} data-row={Math.floor(i/3)} data-now={Math.floor(i/3)===row||undefined} onClick={()=>onToggle(i)}>{done[i]?'✔ ':''}{move}</button>)}</div>
  {rows>0&&(left>0?<p className="pc-bingo-progress" role="status">✔ {rows}줄 지웠어요 · {left}줄 더 지우면 빙고!</p>:<p className="pc-bingo-win" role="status">🎉 빙고! 세 줄을 다 지웠어요</p>)}
 </div>;
}

/** 숫자 모둠: 큰 숫자와 사람 그림으로 몇 명이 모일지 바로 보이게 한다. */
function GroupNumber({cue}:{cue:string}){
 const n=groupSizeOf(cue);if(!n)return null;
 return <div className="pc-number" aria-hidden="true"><strong>{n}</strong><span>{'🧍'.repeat(n)}</span></div>;
}

/** 진화 산책: 자세는 가위바위보로 바뀌므로 사다리를 고정해 보여 준다. */
function EvolutionLadder({top}:{top:number}){
 return <ol className="pc-ladder" aria-label="진화 단계">{CLASSIC_LADDER.slice(0,top+1).map((step,i)=><li key={step.name}><b>{i+1}. {step.name}</b><span>{step.pose}</span></li>)}</ol>;
}

/**
 * Whole-class mode: one teacher screen (TV or projector), children without devices.
 * The rule card comes first (it waits for the teacher when roles must be chosen), then all three tasks run in a row;
 * one tap at the end records how the class took part.
 */
export function PhonePlayClass({play,taskSeconds,seated,level,sound,pace,onLeave,enqueueAction,rolesReady=false}:Props){
 const classroomPaused=useActivityPause();
 useWakeLock();
 // 숫자 모둠 만들기는 쉬운 방법이면 과제 제목도 쉬운 신호(둘 모둠)에 맞춘다.
 const p=adaptClassicPlay(play,level==='쉬운 방법',Infinity);
 // 역할·번호를 정해야 하는 놀이는 교사가 '준비됐어요'를 누를 때까지 규칙 카드에서 기다린다.
 // 시작 화면에서 이미 역할을 정하고 들어왔으면(rolesReady) 기다리지 않는다.
 const waitForTeacher=!!p.setup&&!seated&&!rolesReady;
 const [phase,setPhase]=useState<Phase>('rules'),[round,setRound]=useState(0),[elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false);
 const [bingo,setBingo]=useState<boolean[]>(()=>Array(9).fill(false));
 const moved=useRef(0),submitted=useRef(false);
 // 무작위 신호(숫자·구석·여우)는 진행마다 새 순서로 나오되, 화면이 다시 그려져도 바뀌지 않게 한 번 정한 씨앗을 쓴다.
 const [seed]=useState(()=>Math.floor(Math.random()*1e9));
 const baseCueMs=classCueMs(p.id)*pace,view=classRoundView(play,round,level,seated,seed,baseCueMs/1000,taskSeconds);
 // 기억 놀이는 순서의 모든 신호가 과제 시간 안에 나와야 하므로, 느린 속도여도 간격을 과제 시간에 맞춘다.
 const cueMs=classCueIntervalMs(baseCueMs,taskSeconds,view.cues.length,view.memory),cueIndex=Math.floor(elapsed/cueMs);
 const waiting=phase==='rules'&&waitForTeacher;
 const duration=classPhaseMs(phase,taskSeconds,view.memory||!!view.plan),cue=view.cues[cueIndex%view.cues.length];
 const step=view.steps.length?view.steps[cueIndex%view.steps.length]:-1,ruleLine=view.rules[cueIndex%Math.max(1,view.rules.length)]??p.rule3[1];
 const together=p.players!=='혼자';
 const stopped=paused||classroomPaused;
 // 놀이 101~106의 준비 안내는 3초 카운트다운에만 두면 금방 사라지므로, 진행하는 동안 작은 글씨로 계속 보여 준다.
 const setupHint=seated?undefined:CLASSIC_CLASS_BRIEF[p.id];
 // 음성 안내는 대표 게임과 같은 TV 음성 설정(🔊 단추)을 따른다. 멈춤 중에는 읽지 않는다.
 const voice=useTvVoice({paused:stopped});
 const sayRaw=voice.say,stopVoice=voice.stop;
 const say=useCallback((text:string,long=false)=>{sayRaw(text,long?{long:true}:undefined);},[sayRaw]);

 useEffect(()=>{const hide=()=>{if(document.hidden){setPaused(true);stopVoice();}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[stopVoice]);
 useEffect(()=>{
  if(!['rules','countdown','brief','active'].includes(phase)||stopped||waiting)return;
  let last=performance.now();
  const timer=window.setInterval(()=>{const now=performance.now(),delta=now-last;last=now;if(document.hidden)return;if(phase==='active')moved.current+=delta;setElapsed(n=>Math.min(duration,n+delta));},100);
  return()=>window.clearInterval(timer);
 },[phase,stopped,duration,waiting]);
 // Phase changes: rules → countdown → (brief → active) × 3 → record.
 useEffect(()=>{
  if(stopped||waiting||elapsed<duration)return;
  if(phase==='rules'){setElapsed(0);setPhase('countdown');}
  else if(phase==='countdown'){setElapsed(0);setPhase('brief');}
  else if(phase==='brief'){setElapsed(0);setPhase('active');}
  else if(phase==='active'){if(sound)sfxWhistle();setElapsed(0);if(round<2){setRound(round+1);setPhase('brief');}else{setPhase('record');say('세 과제가 끝났어요. 제자리에 멈추고 선생님을 봐요.');}}
 },[phase,elapsed,duration,stopped,waiting,round,sound,say]);
 // Sound and voice: the rules once, countdown tick, task announcement, whistle at start, a pop and the spoken cue at every change.
 useEffect(()=>{if(phase==='rules')say(`${p.name}. ${p.rule3.join('. ')}${waitForTeacher&&p.setup?`. ${p.setup}`:''}`,true);},[phase,say,p.name,p.rule3,p.setup,waitForTeacher]);
 const briefLine=`${round+1}번 과제. ${p.rounds[round]}${view.memory?`. 순서는 ${view.brief}`:''}${view.plan?`. 좋은 방법은 ${view.plan}`:''}`;
 useEffect(()=>{if(stopped)return;if(phase==='countdown'&&sound)sfxCountdown();if(phase==='brief')say(briefLine,true);if(phase==='active'&&sound)sfxWhistle();},[phase,stopped,sound,say,briefLine]);
 useEffect(()=>{if(phase!=='active'||stopped||document.hidden)return;if(sound&&cueIndex>0)sfxPop();say(cue);},[phase,stopped,cueIndex,cue,sound,say]);

 const record=(outcome:ClassOutcome)=>{
  if(submitted.current||phase!=='record')return;submitted.current=true;setPhase('done');
  enqueueAction({payload:classOutcomeResult(p,outcome,{taskSeconds,seated,level,movedMs:moved.current})});
 };
 const left=Math.max(0,Math.ceil((duration-elapsed)/1000));
 const big=stopped?'멈춤':phase==='countdown'?String(left):phase==='brief'?view.brief:cue;
 const running=['brief','active'].includes(phase);
 // 판·사다리·큰 숫자처럼 그림이 함께 나오는 놀이는 큰 글씨를 줄여 한 화면에 다 들어가게 한다.
 const board=['phone-play-101','phone-play-104','phone-play-105'].includes(p.id);
 // 남은 시간은 머리글의 같은 자리에 늘 보인다(신호 칸이 길어져도 가려지지 않게).
 const timer=phase==='rules'?(waitForTeacher?'':`${left}초 뒤 시작`):phase==='countdown'?'곧 시작해요':phase==='brief'?`${left}초 뒤 시작`:phase==='active'?`${left}초 남음`:'';
 // 기억 놀이: 안내·카운트다운에는 진짜 순서를, 하는 동안에는 가린 순서(006은 ?)를 보여 준다.
 const shownSequence=phase==='active'?view.sequence:view.reveal;
 return <section role="dialog" aria-modal="true" className="phone-play phone-class" data-phone-class={p.id} data-phase={phase} data-round={round} data-board={board||undefined} aria-label={`${p.name} 반 전체 진행`}>
  <header className="pc-head"><p className="pp-eyebrow">반 전체 진행 · 교사 화면 1대</p><h1>{p.name}</h1><TvVoiceToggle voice={voice} className="pc-voice"/>{timer&&<p className="pc-timer" aria-hidden={phase==='rules'||phase==='countdown'||undefined}>⏱ {timer}</p>}<ol className="pc-steps" aria-label="과제 진행">{p.rounds.map((title,i)=><li key={title} data-state={phase==='record'||phase==='done'||i<round?'done':i===round&&phase!=='rules'?'now':'next'}>{i+1}</li>)}</ol></header>
  {phase==='rules'&&<div className="pp-signal pc-signal pc-rules" role="status" aria-live="polite">
   <p className="pc-task">{stopped?'잠깐 멈췄어요':'이렇게 놀아요'}</p>
   <PhoneRuleCard rule3={p.rule3} className="pc-rule-card"/>
   {waitForTeacher?<p className="pc-setup" role="note">먼저 정해요 · {p.setup}</p>:p.setup&&!seated?<p className="pc-setup" role="note">정한 역할 그대로 · {p.setup}</p>:<p className="pc-left">잠시 뒤 시작해요</p>}
  </div>}
  {['countdown','brief','active'].includes(phase)&&<div className="pp-signal pc-signal" data-memory-brief={phase==='brief'&&view.memory||undefined} role="status" aria-live={phase==='active'?'off':'polite'}>
   <p className="pc-task">{stopped?'잠깐 멈췄어요':phase==='countdown'?CLASSIC_CLASS_BRIEF[p.id]??(together?p.players==='짝'?'짝과 떨어져 서고, 1번·2번을 정해요':'모둠과 떨어져 서고, 한 사람씩 번호를 정해요':'자리를 넓게 잡고 화면을 봐요'):phase==='brief'?`${round+1}번 과제`:`${round+1}번 과제 · ${p.rounds[round]}`}</p>
   {phase==='active'&&!stopped&&p.id==='phone-play-101'&&<GroupNumber cue={cue}/>}
   <strong className="pc-cue" data-length={big.length>44?'long':big.length>20?'medium':'short'}>{big}</strong>
   {running&&!stopped&&<p className="pc-rule">{phase==='brief'&&view.memory?'이 순서를 기억해요':ruleLine}</p>}
   {(running||phase==='countdown')&&shownSequence.length>0&&<ol className="pc-sequence" aria-label={phase==='active'?'기억할 순서':'먼저 이 순서를 기억해요'}>{shownSequence.map((c,i)=><li key={i} data-now={phase==='active'&&i===step||undefined}>{c}</li>)}</ol>}
   {phase==='brief'&&view.plan&&<p className="pc-plan">👍 좋은 방법 · {view.plan}</p>}
   {running&&p.id==='phone-play-104'&&<EvolutionLadder top={ladderTop(round,level==='쉬운 방법')}/>}
   {running&&p.id==='phone-play-105'&&<MovementBingoBoard row={round} done={bingo} onToggle={i=>setBingo(b=>b.map((v,j)=>j===i?!v:v))}/>}
   {setupHint&&phase!=='countdown'&&<p className="pc-hint">준비 · {setupHint}</p>}
   {phase==='brief'&&view.memory&&(p.id==='phone-play-006'||level==='추가 도전')&&<p className="pc-left">{p.id==='phone-play-006'?'시작하면 한 동작이 ?로 숨어요':'시작하면 순서가 가려져요'}</p>}
  </div>}
  {['rules','countdown','brief','active'].includes(phase)&&<div className="pc-controls">
   {waiting?<button className="pp-primary" onClick={()=>{unlockAudio();setElapsed(0);setPaused(false);setPhase('countdown');}}>준비됐어요 · 시작</button>:<button className={paused?'pp-primary':'pc-pause'} aria-pressed={paused} onClick={()=>{if(paused)unlockAudio();setPaused(!paused);voice.stop();}}>{paused?'이어서 하기':'잠깐 멈추기'}</button>}
   {phase!=='countdown'&&!waiting&&<button className="pp-primary" onClick={()=>{setElapsed(duration);}} disabled={stopped}>{phase==='rules'||phase==='brief'?'바로 시작':round<2?'다음 과제로':'마치고 기록하기'}</button>}
  </div>}
  {phase==='record'&&<div className="pp-panel pc-record"><h2>우리 반은 어떻게 참여했나요?</h2><p>한 번만 고르면 기록돼요. 기기가 동작이나 체력을 판정하지 않아요.</p>
   <button className="pp-primary" onClick={()=>record('all')}>모두 함께 했어요</button>
   <button onClick={()=>record('some')}>일부만 했어요</button>
   <button onClick={()=>record('rest')}>쉬거나 지켜봤어요</button>
  </div>}
  {phase==='done'&&<p role="status">반 전체 참여 기록을 저장했어요.</p>}
  {phase!=='done'&&<button className="pp-exit" onClick={onLeave}>닫기 · 반 전체 진행 그만두기</button>}
 </section>;
}
