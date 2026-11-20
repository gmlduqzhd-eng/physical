import {useCallback,useEffect,useMemo,useReducer,useRef,useState} from 'react';
import {createFunState,cueIntervalMs,isFinalCountdown,reduceGated,secondsLeft,comboFull,type FunCommand,type FunCommandGate,type FunHooks,type FunState,type FunTiming,type SurpriseAllowance} from '../../../domain/funLoop';
import {createFunCommandBus,keyToFunCommand,type ExternalFunCommand,type FunCommandBus} from '../../../application/funCommandBus';
import {isLessonConfirming} from '../todayLessonActivity';
import {isRemotePanelOpen} from './remotePanelState';
import {sfxCountdown,sfxFanfare,sfxTimerTick,sfxWhistle,sfxWhoosh} from '../../../application/soundEffects';

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
/** Space를 한 번 누른 뒤 이 시간 안에 한 번 더 눌러야 본게임·마지막 승부를 넘긴다. */
export const SKIP_CONFIRM_MS=3000;
const isSkipPhase=(p:FunState['phase'])=>p==='play'||p==='climax';
/**
 * 휴대폰 리모컨의 '다음'을 빠르게 두 번 누르면 한 단계를 통째로 건너뛰었다(시범→본게임, 연습 판→마지막 승부).
 * 단계가 바뀐 직후나 바로 앞 '다음' 직후 이 시간 안에 온 리모컨 '다음'은 버린다. TV 버튼·키보드는 그대로.
 */
export const REMOTE_NEXT_GUARD_MS=800;
export function shouldIgnoreRemoteNext(now:number,lastRemoteNextAt:number,phaseChangedAt:number):boolean{
 return now-lastRemoteNextAt<REMOTE_NEXT_GUARD_MS||now-phaseChangedAt<REMOTE_NEXT_GUARD_MS;
}
/** 이 안의 버튼은 Space가 버튼 자체를 누른다. 그 밖(무대의 선생님 버튼 등)에서는 Space가 늘 '다음'이다. */
/** 음성 설정·리모컨 창·리모컨 막대(📱 휴대폰 리모컨·← 목록)·일시정지 덮개 */
const NATIVE_SPACE_ZONES='.tv-voice,.fun-remote-panel,.fun-dock,.fun-paused';
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
 // '다음 활동으로 갈까요?' 확인 창이 떠 있는 동안에는 리모컨 명령을 받지 않는다(창 뒤에서 게임이 다시 움직이지 않게).
 // 휴대폰 '다음'은 단계가 바뀐 직후·바로 앞 '다음' 직후(REMOTE_NEXT_GUARD_MS)에 오면 버린다: 두 번 눌러 한 단계를 건너뛰지 않게.
 // 리모컨 '다음'은 TV 쪽 '한 번 더 누르면' 확인과 섞이지 않는다(리모컨은 휴대폰에서 따로 묻는다).
 const phaseChangedAt=useRef(-Infinity),lastRemoteNext=useRef(-Infinity),seenPhase=useRef(state.phase);
 if(seenPhase.current!==state.phase){seenPhase.current=state.phase;phaseChangedAt.current=performance.now();}
 useEffect(()=>bus.subscribe((cmd,source)=>{
  if(source==='remote'&&isLessonConfirming())return;
  if(source==='remote'&&cmd.type==='next'){
   const now=performance.now();
   if(shouldIgnoreRemoteNext(now,lastRemoteNext.current,phaseChangedAt.current))return;
   lastRemoteNext.current=now;
  }
  dispatch(cmd);
 }),[bus,dispatch]);

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

 // 본게임·마지막 승부에서 Space(다음)를 한 번 누른 상태. 화면이 '한 번 더 누르면 넘어가요'를 보여 준다.
 const [skipArmed,setSkipArmed]=useState(false);
 const armed=useRef(false),armTimer=useRef<number|undefined>(undefined);
 const disarm=useCallback(()=>{window.clearTimeout(armTimer.current);armed.current=false;setSkipArmed(false);},[]);
 const arm=useCallback(()=>{window.clearTimeout(armTimer.current);armed.current=true;setSkipArmed(true);armTimer.current=window.setTimeout(()=>{armed.current=false;setSkipArmed(false);},SKIP_CONFIRM_MS);},[]);

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
   // 음성 설정·리모컨 창·일시정지 덮개의 버튼에 초점이 있으면 Space도 그 버튼을 누른다(게임을 넘기지 않는다).
   if(e.key===' '&&target?.closest(NATIVE_SPACE_ZONES)?.contains(target.closest('button,a,summary')))return;
   const cmd=keyToFunCommand({key:e.key,shiftKey:e.shiftKey,target});
   if(!cmd)return;
   // 휴대폰 리모컨 창이 큰 신호를 가리는 동안에는 일시정지(P)만 받는다(창을 닫고 진행한다).
   if(isRemotePanelOpen()&&cmd.type!=='pause')return;
   e.preventDefault();
   // 본게임·마지막 승부에서 '다음'은 판을 일찍 끝내는 키다: 한 번 누르면 알리고, 3초 안에 한 번 더 눌러야 넘어간다(리모컨의 '넘어갈까요?'와 같은 뜻).
   if(cmd.type==='next'&&isSkipPhase(stateRef.current.phase)){
    if(!armed.current){arm();return;}
    disarm();
   }
   bus.dispatch(cmd,'key');
  };
  window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
 },[opts.keyboard,bus,arm,disarm]);
 // 단계가 바뀌면 '한 번 더' 대기를 푼다.
 useEffect(()=>disarm,[state.phase,disarm]);

 // 소리: 단계가 바뀔 때 호루라기, 깜짝 이벤트 때 휙, 마지막 10초 째깍.
 const prev=useRef(state);
 useEffect(()=>{
  const p=prev.current;prev.current=state;
  if(opts.sound===false)return;
  if(p.phase!==state.phase){if(state.phase==='result')sfxFanfare();else if(state.phase!=='demo')sfxWhistle();}
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

 return {state,dispatch:(cmd:ExternalFunCommand)=>bus.dispatch(cmd,'tv'),bus,reset,completeNow,skipArmed,
  secondsLeft:secondsLeft(state),cueMs:cueIntervalMs(state,state.cueLenSec??opts.cueSeconds?.(state)),finalCountdown:isFinalCountdown(state),comboFull:comboFull(state)};
}
