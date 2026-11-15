import {useCallback,useEffect,useRef,useState} from 'react';
import {useActivityPause} from '../../../../application/ActivityPauseContext';
import {sfxPop,sfxWhistle,sfxCountdown,unlockAudio} from '../../../../application/soundEffects';
import {useWakeLock} from '../../../../application/useWakeLock';
import type {GameResultDetails} from '../../../../domain/gameResultDetails';
import type {PhonePlay as Play} from '../../../../domain/phonePlayCatalog';
import {classOutcomeResult,classPhaseMs,classRoundView,CLASS_CUE_MS,type ClassOutcome} from '../../../../domain/phoneClassMode';

type Phase='countdown'|'brief'|'active'|'record'|'done';
interface Props {play:Play;taskSeconds:number;seated:boolean;level:string;voice:boolean;sound:boolean;pace:number;onLeave:()=>void;enqueueAction:(action:{payload:{amount:number;details:GameResultDetails}})=>void}

/**
 * Whole-class mode: one teacher screen (TV or projector), children without devices.
 * One tap starts all three tasks in a row; one tap at the end records how the class took part.
 */
export function PhonePlayClass({play:p,taskSeconds,seated,level,voice,sound,pace,onLeave,enqueueAction}:Props){
 const classroomPaused=useActivityPause();
 useWakeLock();
 const [phase,setPhase]=useState<Phase>('countdown'),[round,setRound]=useState(0),[elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false);
 const moved=useRef(0),submitted=useRef(false);
 const view=classRoundView(p,round,level,seated),cueMs=CLASS_CUE_MS*pace,cueIndex=Math.floor(elapsed/cueMs);
 const duration=classPhaseMs(phase,taskSeconds,view.memory),cue=view.cues[cueIndex%view.cues.length];
 const stopped=paused||classroomPaused;
 const say=useCallback((text:string)=>{if(!voice||!window.speechSynthesis)return;const speech=new SpeechSynthesisUtterance(text);speech.lang='ko-KR';window.speechSynthesis.cancel();window.speechSynthesis.speak(speech);},[voice]);

 useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);
 useEffect(()=>{const hide=()=>{if(document.hidden){setPaused(true);window.speechSynthesis?.cancel();}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{
  if(!['countdown','brief','active'].includes(phase)||stopped)return;
  let last=performance.now();
  const timer=window.setInterval(()=>{const now=performance.now(),delta=now-last;last=now;if(document.hidden)return;if(phase==='active')moved.current+=delta;setElapsed(n=>Math.min(duration,n+delta));},100);
  return()=>window.clearInterval(timer);
 },[phase,stopped,duration]);
 // Phase changes: countdown → (brief → active) × 3 → record.
 useEffect(()=>{
  if(stopped||elapsed<duration)return;
  if(phase==='countdown'){setElapsed(0);setPhase('brief');}
  else if(phase==='brief'){setElapsed(0);setPhase('active');}
  else if(phase==='active'){if(sound)sfxWhistle();setElapsed(0);if(round<2){setRound(round+1);setPhase('brief');}else{setPhase('record');say('세 과제가 끝났어요. 제자리에 멈추고 선생님을 봐요.');}}
 },[phase,elapsed,duration,stopped,round,sound,say]);
 // Sound and voice: countdown tick, task announcement, whistle at start, a pop and the spoken cue at every change.
 useEffect(()=>{if(stopped)return;if(phase==='countdown'&&sound)sfxCountdown();if(phase==='brief')say(`${round+1}번 과제. ${p.rounds[round]}`);if(phase==='active'&&sound)sfxWhistle();},[phase,round,stopped,sound,say,p.rounds]);
 useEffect(()=>{if(phase!=='active'||stopped||document.hidden)return;if(sound&&cueIndex>0)sfxPop();say(cue);},[phase,stopped,cueIndex,cue,sound,say]);

 const record=(outcome:ClassOutcome)=>{
  if(submitted.current||phase!=='record')return;submitted.current=true;setPhase('done');
  enqueueAction({payload:classOutcomeResult(p,outcome,{taskSeconds,seated,level,movedMs:moved.current})});
 };
 const left=Math.max(0,Math.ceil((duration-elapsed)/1000));
 const big=stopped?'멈춤':phase==='countdown'?String(left):phase==='brief'?view.brief:cue;
 return <section role="dialog" aria-modal="true" className="phone-play phone-class" data-phone-class={p.id} data-phase={phase} data-round={round} aria-label={`${p.name} 반 전체 진행`}>
  <header className="pc-head"><p className="pp-eyebrow">반 전체 진행 · 교사 화면 1대</p><h1>{p.name}</h1><ol className="pc-steps" aria-label="과제 진행">{p.rounds.map((title,i)=><li key={title} data-state={phase==='record'||phase==='done'||i<round?'done':i===round?'now':'next'}>{i+1}</li>)}</ol></header>
  {['countdown','brief','active'].includes(phase)&&<>
   <div className="pp-signal pc-signal" role="status" aria-live={phase==='active'?'off':'polite'}>
    <p className="pc-task">{stopped?'잠깐 멈췄어요':phase==='countdown'?'자리를 넓게 잡고 화면을 봐요':`${round+1}번 과제 · ${p.rounds[round]}`}</p>
    <strong className="pc-cue" data-length={big.length>44?'long':big.length>20?'medium':'short'}>{big}</strong>
    <p className="pc-left">{phase==='active'?`${left}초 남음`:phase==='brief'?(view.memory?`순서를 기억해요 · ${left}초 뒤 시작`:`${left}초 뒤 시작`):'곧 시작해요'}</p>
   </div>
   <div className="pc-controls"><button className="pp-primary" onClick={()=>{if(paused)unlockAudio();setPaused(!paused);window.speechSynthesis?.cancel();}}>{paused?'이어서 하기':'잠깐 멈추기'}</button>{phase!=='countdown'&&<button onClick={()=>{setElapsed(duration);}} disabled={stopped}>{phase==='brief'?'바로 시작':round<2?'다음 과제로':'마치고 기록하기'}</button>}</div>
  </>}
  {phase==='record'&&<div className="pp-panel pc-record"><h2>우리 반은 어떻게 참여했나요?</h2><p>한 번만 고르면 기록돼요. 기기가 동작이나 체력을 판정하지 않아요.</p>
   <button className="pp-primary" onClick={()=>record('all')}>모두 함께 했어요</button>
   <button onClick={()=>record('some')}>일부만 했어요</button>
   <button onClick={()=>record('rest')}>쉬거나 지켜봤어요</button>
  </div>}
  {phase==='done'&&<p role="status">반 전체 참여 기록을 저장했어요.</p>}
  {phase!=='done'&&<button className="pp-exit" onClick={onLeave}>닫기 · 반 전체 진행 그만두기</button>}
 </section>;
}
