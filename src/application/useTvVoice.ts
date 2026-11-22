import {useCallback,useEffect,useSyncExternalStore} from 'react';
import {useActivityPause} from './ActivityPauseContext';
import {duckForSpeech,sfxEarcon} from './soundEffects';
import {createAnnouncer,VOICE_WAIT_MS,type Announcer,type SayOptions,type SpeechPrefs,type SpeechStatus} from './speechAnnouncer';
import {getVoicePrefs,setVoicePrefs,subscribeVoicePrefs} from './voicePrefs';

/**
 * TV 화면(대표 게임·반 전체 진행)의 음성 안내. 켜기/끄기·속도·크기는 voicePrefs 하나에 저장해
 * 다른 활동의 음성 코칭(useVoiceCoach)과 함께 쓴다.
 * 한 화면에 TV 음성은 하나뿐이라 안내기는 하나를 함께 쓴다.
 */
let announcer:Announcer|null=null;
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(l=>l());
// 설정이 바뀌면(어느 화면에서든) 안내기에도 바로 알려 준다.
subscribeVoicePrefs(()=>{announcer?.setPrefs(getVoicePrefs());notify();});

const browserSynth=()=>typeof window!=='undefined'&&'speechSynthesis' in window&&typeof window.SpeechSynthesisUtterance==='function'?window.speechSynthesis:null;
const readPrefs=getVoicePrefs;
export function tvAnnouncer():Announcer{
 if(!announcer){
  const synth=browserSynth();
  // 말하는 동안 배경음악을 줄이고(duckForSpeech), 한동안 조용했다가 말할 때는 짧은 알림음을 먼저 낸다.
  announcer=createAnnouncer({synth,utterance:synth?text=>new window.SpeechSynthesisUtterance(text):null,prefs:readPrefs(),onHeard:notify,onSpeaking:duckForSpeech,earcon:sfxEarcon});
  // 목소리 목록은 늦게 온다: 오면 지원 상태 표시를 다시 그린다.
  try{synth?.addEventListener?.('voiceschanged',notify);}catch{/* 무시 */}
  // 끝내 목록이 오지 않으면(목소리가 없는 기기) '안 돼요' 표시로 바꾼다.
  if(synth)setTimeout(notify,VOICE_WAIT_MS+50);
 }
 return announcer;
}
function setPrefs(next:SpeechPrefs){
 tvAnnouncer();
 setVoicePrefs(next);
}
const subscribe=(l:()=>void)=>{listeners.add(l);return ()=>{listeners.delete(l);};};

/**
 * 손동작에서 음성을 깨운다(iOS·Chrome 자동 재생 규칙).
 * iOS는 pointerdown·touchstart를 '사용자 동작'으로 치지 않으므로 click·touchend·keydown에서 깨운다.
 * 깨우기에 성공할 때까지(예: 목소리 목록이 늦게 와서 건너뛴 경우) 다음 손동작에서도 다시 시도한다.
 */
const UNLOCK_EVENTS=['click','touchend','keydown'] as const;
let unlockBound=false;
function bindUnlock(){
 if(unlockBound||typeof window==='undefined')return;unlockBound=true;
 const go=()=>{
  const a=tvAnnouncer();a.unlock();
  if(a.unlocked())for(const ev of UNLOCK_EVENTS)window.removeEventListener(ev,go,true);
 };
 for(const ev of UNLOCK_EVENTS)window.addEventListener(ev,go,true);
}

export interface TvVoice {
 prefs:SpeechPrefs;status:SpeechStatus;
 say:(text:string,opts?:SayOptions)=>boolean;
 setPrefs:(next:SpeechPrefs)=>void;
 /** '목소리 확인' 단추. */ test:()=>boolean;
 /** 고른 목소리 이름(없으면 null: 브라우저 기본 목소리). */ voiceName:string|null;
 stop:()=>void;
}

/** paused: 이 화면이 멈춰 있으면 true(읽지 않고, 읽던 말도 끊는다). 수업 전체 일시정지도 함께 따른다. */
export function useTvVoice({paused=false}:{paused?:boolean}={}):TvVoice{
 const prefs=useSyncExternalStore(subscribe,readPrefs,readPrefs);
 const status=useSyncExternalStore(subscribe,()=>tvAnnouncer().status(),()=>'unknown' as SpeechStatus);
 const voiceName=useSyncExternalStore(subscribe,()=>tvAnnouncer().voiceName(),()=>null);
 const classroomPaused=useActivityPause();
 const stopped=paused||classroomPaused;
 useEffect(()=>{bindUnlock();},[]);
 useEffect(()=>{tvAnnouncer().setPaused(stopped);},[stopped]);
 // 화면을 떠나면 읽던 말을 끊는다.
 useEffect(()=>()=>{tvAnnouncer().cancel();},[]);
 const say=useCallback((text:string,opts?:SayOptions)=>tvAnnouncer().say(text,opts),[]);
 const test=useCallback(()=>{tvAnnouncer().unlock();return tvAnnouncer().say('목소리 확인. 신호를 이렇게 읽어 줘요.',{priority:true,force:true});},[]);
 const stop=useCallback(()=>tvAnnouncer().cancel(),[]);
 return {prefs,status,say,setPrefs,test,stop,voiceName};
}
