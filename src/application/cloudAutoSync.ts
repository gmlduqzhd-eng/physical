import {useSyncExternalStore} from 'react';
import {readStorage} from './browserStorage';
import {exportBackupText} from './classBackupStore';
import {readAccount,saveToAccount} from './classCloudStore';
import {EMPTY_SYNC,contentKey,decideSync,isEmptyBackup,parseSyncRecord,type SyncRecord} from '../domain/cloudSync';
import type {ClassBackup} from '../domain/classBackup';

/**
 * 계정 자동 보관. 로그인한 선생님이면 기록이 바뀔 때 계정에 조용히 한 벌 올린다.
 * - 기록이 그대로면 서버에 묻지도 않는다(1분마다 이 기기 기록만 비교).
 * - 다른 기기에서 그 뒤에 다른 기록을 올렸으면 올리지 않고 선생님께 묻는다.
 * - 이 기기가 비어 있고 계정에 기록이 있으면 가져올지 묻는다.
 */
export const SYNC_KEY='physical_class_cloud_sync_v1';
export type SyncPrompt={kind:'conflict'|'offer-load';serverAt:string|null};

const listeners=new Set<()=>void>();
let prompt:SyncPrompt|null=null,running=false,checkedServer=false,unavailableAt=0;
const emit=()=>listeners.forEach(l=>l());

export function readSyncRecord():SyncRecord{
 try{const raw=window.localStorage.getItem(SYNC_KEY);return raw?parseSyncRecord(JSON.parse(raw)):EMPTY_SYNC;}catch{return EMPTY_SYNC;}
}
function writeSyncRecord(next:SyncRecord){try{window.localStorage.setItem(SYNC_KEY,JSON.stringify(next));}catch{/* 저장이 막히면 다음에 다시 비교한다 */}emit();}
const hasTeacherLogin=()=>!!(readStorage('physical_supabase_auth','session')||readStorage('physical_supabase_auth'));
const localBackup=():ClassBackup|null=>{try{return JSON.parse(exportBackupText()) as ClassBackup;}catch{return null;}};

export type SyncResult='off'|'signed-out'|'unavailable'|'same'|'uploaded'|'asked'|'skipped';
/** 한 번 맞춰 본다. force면 기록이 그대로여도 서버를 확인한다(앱을 처음 열 때). */
export async function syncOnce(force=false):Promise<SyncResult>{
 const rec=readSyncRecord();
 if(rec.off)return 'off';
 if(!hasTeacherLogin())return 'signed-out';
 const local=localBackup();if(!local)return 'skipped';
 const key=contentKey(local);
 if(!force&&key===rec.key)return 'same';
 const server=await readAccount();
 if(typeof server==='string')return server;
 const serverBackup=server.payload&&typeof server.payload==='object'&&Array.isArray((server.payload as ClassBackup).classes)?server.payload as ClassBackup:null;
 const decision=decideSync(rec,{key,empty:isEmptyBackup(local)},{key:serverBackup?contentKey(serverBackup):null,at:server.updatedAt});
 if(decision==='same'){writeSyncRecord({...rec,key,serverAt:server.updatedAt,dismissedAt:null});setPrompt(null);return 'same';}
 if(decision==='skip-empty')return 'skipped';
 if(decision==='conflict'||decision==='offer-load'){
  // '나중에'를 고른 그 서버 기록이면 다시 묻지 않는다(자동 보관은 멈춘 채).
  setPrompt(rec.dismissedAt===server.updatedAt?null:{kind:decision,serverAt:server.updatedAt});
  return 'asked';
 }
 const saved=await saveToAccount();
 if(saved.status!=='ready')return saved.status==='signed-out'?'signed-out':'unavailable';
 writeSyncRecord({...rec,key,serverAt:saved.savedAt,dismissedAt:null});setPrompt(null);
 return 'uploaded';
}

function setPrompt(next:SyncPrompt|null){if(JSON.stringify(next)!==JSON.stringify(prompt)){prompt=next;emit();}}
/** '나중에': 이 서버 기록으로는 다시 묻지 않는다. */
export function dismissPrompt(){const rec=readSyncRecord();writeSyncRecord({...rec,dismissedAt:prompt?.serverAt??null});setPrompt(null);}
/** 이 기기 기록을 계정에 올린다(다른 기기에서 올린 것을 덮어쓴다). */
export async function keepThisDevice():Promise<boolean>{
 const local=localBackup();if(!local)return false;
 const saved=await saveToAccount();if(saved.status!=='ready')return false;
 writeSyncRecord({...readSyncRecord(),key:contentKey(local),serverAt:saved.savedAt,dismissedAt:null});setPrompt(null);return true;
}
export function setAutoSync(on:boolean){writeSyncRecord({...readSyncRecord(),off:on?undefined:true});if(on)void syncOnce(true);else setPrompt(null);}

const getPrompt=()=>prompt;
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};};
export const useSyncPrompt=()=>useSyncExternalStore(subscribe,getPrompt,()=>null);
export const useAutoSyncOn=()=>useSyncExternalStore(subscribe,()=>!readSyncRecord().off,()=>true);

async function tick(force=false){
 if(running)return;running=true;
 // 서버에 기능이 없거나 연결이 안 되면 10분 동안은 다시 묻지 않는다.
 if(!force&&Date.now()-unavailableAt<600_000){running=false;return;}
 try{const r=await syncOnce(force||!checkedServer);if(r==='unavailable')unavailableAt=Date.now();if(r!=='signed-out'&&r!=='off')checkedServer=true;}catch{/* 다음 차례에 다시 */}finally{running=false;}
}
/** 앱이 뜬 뒤 한 번, 그 뒤 1분마다(화면이 보일 때), 그리고 화면을 떠날 때 맞춘다. */
export function startAutoSync(){
 if(typeof window==='undefined')return;
 // 로그인하지 않았으면 매번 저장소만 보고 끝난다(서버 부품도 받지 않는다). 수업 중에 로그인해도 다음 차례부터 맞춘다.
 const idle=(window as Window&{requestIdleCallback?:(cb:()=>void,o?:{timeout:number})=>void}).requestIdleCallback;
 const first=()=>{void tick(true);};
 if(idle)idle(first,{timeout:15_000});else window.setTimeout(first,5_000);
 window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)void tick();},60_000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&navigator.onLine!==false)void tick();});
}
