import {useCallback,useEffect,useMemo,useReducer,useRef} from 'react';
import {createFunState,cueIntervalMs,isFinalCountdown,reduceGated,secondsLeft,comboFull,type FunCommand,type FunCommandGate,type FunHooks,type FunState,type FunTiming,type SurpriseAllowance} from '../../../domain/funLoop';
import {createFunCommandBus,keyToFunCommand,type ExternalFunCommand,type FunCommandBus} from '../../../application/funCommandBus';
import {sfxCountdown,sfxSuccess,sfxTimerTick,sfxWhistle,sfxWhoosh} from '../../../application/soundEffects';

export interface FunEngineOptions {
 teams:number;timing:FunTiming;seed:number;
 /** true면 키보드 단축키를 받는다(진행 화면에서만). */ keyboard:boolean;
 /** 목표를 이루면 true(엔진이 2.5초 승리 연출 뒤 결과로 넘긴다). */ isComplete?:(s:FunState)=>boolean;
 sound?:boolean;
 /** 게임 화면 바깥(대표 게임 화면)이 가진 버스를 쓰면, 판이 바뀌어도 리모컨 연결이 이어진다. */
 bus?:FunCommandBus;
 /** 점수·이벤트 명령 문지기(게임 규칙). 버튼·키보드·리모컨 모두 같은 규칙을 지난다. */
 gate?:FunCommandGate;
 /** 이 게임에서 쓰는 깜짝 이벤트. */ surprises?:SurpriseAllowance;
 /** 새로고침 이어 하기: 저장해 둔 상태에서 시작한다(restoreFunState로 검사한 값). */ initialState?:FunState;
 /** 지금 신호만 다른 길이로 보여 줄 때(초). 없으면 게임 기본 간격. */ cueSeconds?:FunHooks['cueSeconds'];
 /** 지금 신호에 맞지 않는 깜짝 이벤트는 미룬다. */ allowsEvent?:FunHooks['allowsEvent'];
}
type Action={kind:'cmd';cmd:FunCommand}|{kind:'reset';state:FunState};
/** 움직임 줄이기 설정이면 시범을 저절로 넘기지 않는다. */
export const prefersReducedMotion=()=>typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * 대표 게임 엔진 훅: 시간(tick), 명령 버스, 키보드, 소리, 승리 판정을 맡는다.
 * 화면은 state를 그리고 dispatch로 명령을 보낸다. 리모컨도 같은 버스로 들어온다.
 */
export function useFunEngine(opts:FunEngineOptions){
 const restored=useRef(opts.initialState);
 const initial=useMemo(()=>restored.current??createFunState({teams:opts.teams,timing:opts.timing,seed:opts.seed,holdDemo:prefersReducedMotion(),surprises:opts.surprises}),[opts.teams,opts.timing,opts.seed,opts.surprises]);
 const gateRef=useRef(opts.gate);gateRef.current=opts.gate;
 const hooksRef=useRef<FunHooks>({});hooksRef.current={cueSeconds:opts.cueSeconds,allowsEvent:opts.allowsEvent};
 // 문지기는 reducer 안에서 지난다: 같은 순간에 들어온 명령도 늘 최신 상태로 판정한다.
 const reducer=useCallback((s:FunState,a:Action)=>a.kind==='reset'?a.state:reduceGated(s,a.cmd,gateRef.current,hooksRef.current),[]);
 const [state,send]=useReducer(reducer,initial);
 const bus=useMemo(()=>opts.bus??createFunCommandBus(),[opts.bus]);
 const stateRef=useRef(state);stateRef.current=state;
 const dispatch=useCallback((cmd:ExternalFunCommand)=>{
  const s=stateRef.current;
  // '일시정지'는 이미 멈춰 있으면 다시 시작으로 바꾼다(키보드 P·리모컨 한 버튼).
  if(cmd.type==='pause'&&s.paused){send({kind:'cmd',cmd:{type:'resume'}});return;}
  send({kind:'cmd',cmd});
 },[]);
 const reset=useCallback(()=>send({kind:'reset',state:createFunState({teams:opts.teams,timing:opts.timing,seed:opts.seed+1})}),[opts.teams,opts.timing,opts.seed]);

 // 명령 버스: TV 버튼·키보드·리모컨이 모두 여기로 들어온다.
 useEffect(()=>bus.subscribe(cmd=>dispatch(cmd)),[bus,dispatch]);

 // 시간: 250ms마다 실제 흐른 시간만큼 tick.
 useEffect(()=>{
  let last=performance.now();
  const id=window.setInterval(()=>{const now=performance.now();send({kind:'cmd',cmd:{type:'tick',ms:now-last}});last=now;},250);
  return ()=>window.clearInterval(id);
 },[]);

 // 화면을 벗어나면 멈춘다(돌아와서 선생님이 다시 시작).
 useEffect(()=>{
  const onHide=()=>{if(document.visibilityState==='hidden'&&!['demo','result'].includes(stateRef.current.phase))send({kind:'cmd',cmd:{type:'pause'}});};
  document.addEventListener('visibilitychange',onHide);return ()=>document.removeEventListener('visibilitychange',onHide);
 },[]);

 // 키보드: Space 다음(Enter는 버튼이 아닐 때만), P 일시정지, 1~4 팀 +1(Shift −1), A 모든 팀 +1, G 황금 신호, S 필살기
 useEffect(()=>{
  if(!opts.keyboard)return;
  const onKey=(e:KeyboardEvent)=>{
   if(e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;
   const target=e.target as HTMLElement|null;
   // 결과 화면에서는 단축키를 쓰지 않는다(기록 버튼 등을 키보드로 누를 수 있게).
   if(stateRef.current.phase==='result')return;
   // Enter는 초점이 있는 버튼을 누르게 둔다. Space는 늘 '다음'이다(마우스로 버튼을 누른 뒤에도 Space로 진행).
   if(e.key==='Enter'&&target?.closest('button,a,summary'))return;
   const cmd=keyToFunCommand({key:e.key,shiftKey:e.shiftKey,target});
   if(!cmd)return;
   e.preventDefault();bus.dispatch(cmd,'key');
  };
  window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
 },[opts.keyboard,bus]);

 // 소리: 단계가 바뀔 때 호루라기, 깜짝 이벤트 때 휙, 마지막 10초 째깍.
 const prev=useRef(state);
 useEffect(()=>{
  const p=prev.current;prev.current=state;
  if(opts.sound===false)return;
  if(p.phase!==state.phase){if(state.phase==='result')sfxSuccess();else if(state.phase!=='demo')sfxWhistle();}
  if(!p.event&&state.event)sfxWhoosh();
  if(isFinalCountdown(state)&&secondsLeft(state)!==secondsLeft(p))sfxTimerTick(secondsLeft(state));
  if(state.phase==='tutorial'&&p.phase==='demo')sfxCountdown();
 },[state,opts.sound]);

 // 목표 달성(보스 처치 등): 2.5초 승리 연출 뒤 결과로.
 const completeNow=!!opts.isComplete&&(state.phase==='play'||state.phase==='climax')&&opts.isComplete(state);
 useEffect(()=>{
  if(!completeNow)return;
  const id=window.setTimeout(()=>send({kind:'cmd',cmd:{type:'finish'}}),2500);
  return ()=>window.clearTimeout(id);
 },[completeNow]);

 return {state,dispatch:(cmd:ExternalFunCommand)=>bus.dispatch(cmd,'tv'),bus,reset,completeNow,
  secondsLeft:secondsLeft(state),cueMs:cueIntervalMs(state,state.cueLenSec??opts.cueSeconds?.(state)),finalCountdown:isFinalCountdown(state),comboFull:comboFull(state)};
}
