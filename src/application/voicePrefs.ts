/**
 * 음성 안내 설정 하나. 대표 게임·반 전체 진행(TV 음성)과 다른 활동의 음성 코칭이 같은 값을 쓴다.
 * 어디서 끄든 모든 활동에서 꺼진다. 이 기기에만 저장한다.
 *
 * 예전에는 음성 코칭이 'voice_coach_enabled'에 따로 저장했다. 새 값이 아직 없으면 그 값을 한 번 옮겨 온다.
 */
import {useSyncExternalStore} from 'react';
import {readStorage,removeStorage,writeStorage} from './browserStorage';
import {DEFAULT_SPEECH_PREFS,parseSpeechPrefs,SPEECH_PREFS_KEY,type SpeechPrefs} from './speechAnnouncer';

export const LEGACY_VOICE_COACH_KEY='voice_coach_enabled';
let cache:SpeechPrefs|null=null;
const listeners=new Set<()=>void>();

/**
 * 저장된 값을 읽는다. 예전 음성 코칭이 꺼져 있었으면('false') 새 값이 이미 있어도 꺼진 채로 합친다
 * (예전 TV 음성은 속도만 바꿔도 on:true로 저장했기 때문에, 꺼 둔 선택이 사라지지 않게).
 */
export function loadVoicePrefs(read:(key:string)=>string|null=readStorage):SpeechPrefs{
 const raw=read(SPEECH_PREFS_KEY);
 const legacy=read(LEGACY_VOICE_COACH_KEY);
 if(raw){const prefs=parseSpeechPrefs(raw);return legacy==='false'?{...prefs,on:false}:prefs;}
 return {...DEFAULT_SPEECH_PREFS,on:legacy===null?DEFAULT_SPEECH_PREFS.on:legacy==='true'};
}

function persist(prefs:SpeechPrefs){
 try{writeStorage(SPEECH_PREFS_KEY,JSON.stringify(prefs));removeStorage(LEGACY_VOICE_COACH_KEY);}catch{/* 저장이 막혀도 이번 화면에서는 그대로 쓴다 */}
}

export function getVoicePrefs():SpeechPrefs{
 if(!cache){
  const hadLegacy=readStorage(LEGACY_VOICE_COACH_KEY)!==null;
  cache=loadVoicePrefs();
  // 예전 값은 한 번 합쳐 저장하고 지운다(다음부터는 새 값만 본다).
  if(hadLegacy)persist(cache);
 }
 return cache;
}

/** 바꾼 항목만 지금 저장된 값 위에 덮어쓴다(오래 열어 둔 다른 탭이 새 선택을 되돌리지 않게). */
export function mergeVoicePrefs(stored:SpeechPrefs,before:SpeechPrefs,next:SpeechPrefs):SpeechPrefs{
 const merged={...stored};
 (Object.keys(next) as (keyof SpeechPrefs)[]).forEach(key=>{if(next[key]!==before[key])(merged as Record<string,unknown>)[key]=next[key];});
 return merged;
}

export function setVoicePrefs(next:SpeechPrefs){
 const before=getVoicePrefs();
 cache=mergeVoicePrefs(loadVoicePrefs(),before,next);
 persist(cache);
 listeners.forEach(l=>l());
}
export const setVoiceOn=(on:boolean)=>setVoicePrefs({...getVoicePrefs(),on});
export const toggleVoiceOn=()=>setVoiceOn(!getVoicePrefs().on);

export function subscribeVoicePrefs(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}

// '기기 정보 지우기'를 누르면 저장값이 지워지므로 지금 화면도 저장된 값(기본값)으로 다시 읽는다.
if(typeof window!=='undefined')window.addEventListener?.('physical-device-cleared',()=>{removeStorage(LEGACY_VOICE_COACH_KEY);cache=null;listeners.forEach(l=>l());});

// 다른 탭에서 바꾸면 이 탭도 바로 따라간다(교사 탭에서 끄면 TV 탭도 조용해진다).
if(typeof window!=='undefined')window.addEventListener?.('storage',event=>{
 if(event.key!==null&&event.key!==SPEECH_PREFS_KEY&&event.key!==LEGACY_VOICE_COACH_KEY)return;
 cache=null;listeners.forEach(l=>l());
});

/** 음성 안내 설정을 읽는 훅. */
export function useVoicePrefs():SpeechPrefs{
 return useSyncExternalStore(subscribeVoicePrefs,getVoicePrefs,getVoicePrefs);
}
