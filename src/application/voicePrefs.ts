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

/** 저장된 값을 읽는다. 새 값이 없고 예전 음성 코칭이 꺼져 있었으면 꺼진 채로 옮겨 온다. */
export function loadVoicePrefs(read:(key:string)=>string|null=readStorage):SpeechPrefs{
 const raw=read(SPEECH_PREFS_KEY);
 if(raw)return parseSpeechPrefs(raw);
 const legacy=read(LEGACY_VOICE_COACH_KEY);
 return {...DEFAULT_SPEECH_PREFS,on:legacy===null?DEFAULT_SPEECH_PREFS.on:legacy==='true'};
}

export function getVoicePrefs():SpeechPrefs{
 if(!cache)cache=loadVoicePrefs();
 return cache;
}

export function setVoicePrefs(next:SpeechPrefs){
 cache={...next};
 try{writeStorage(SPEECH_PREFS_KEY,JSON.stringify(cache));removeStorage(LEGACY_VOICE_COACH_KEY);}catch{/* 저장이 막혀도 이번 화면에서는 그대로 쓴다 */}
 listeners.forEach(l=>l());
}
export const setVoiceOn=(on:boolean)=>setVoicePrefs({...getVoicePrefs(),on});
export const toggleVoiceOn=()=>setVoiceOn(!getVoicePrefs().on);

export function subscribeVoicePrefs(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};}

// '기기 정보 지우기'를 누르면 저장값이 지워지므로 지금 화면도 저장된 값(기본값)으로 다시 읽는다.
if(typeof window!=='undefined')window.addEventListener?.('physical-device-cleared',()=>{removeStorage(LEGACY_VOICE_COACH_KEY);cache=null;listeners.forEach(l=>l());});

/** 음성 안내 설정을 읽는 훅. */
export function useVoicePrefs():SpeechPrefs{
 return useSyncExternalStore(subscribeVoicePrefs,getVoicePrefs,getVoicePrefs);
}
