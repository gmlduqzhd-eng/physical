import {useSyncExternalStore} from 'react';
import {NO_BACKUP,markBackedUp,markSnoozed,parseBackupMark,type BackupMark} from '../domain/backupNudge';
import {parseProgress} from '../domain/classProgress';
import {classStorageKey} from '../domain/classRoster';
import {CLASS_DATA_KEYS,getRoster} from './classRosterStore';

/** 마지막으로 기록을 보관한 때(이 기기에만 저장). 보관 알림과 '계정에도 한 벌 있어요' 문구에 쓴다. */
export const BACKUP_MARK_KEY='physical_class_backup_mark_v1';
const listeners=new Set<()=>void>();
let cache:BackupMark|null=null;

function load():BackupMark{try{const raw=window.localStorage.getItem(BACKUP_MARK_KEY);return raw?parseBackupMark(JSON.parse(raw)):NO_BACKUP;}catch{return NO_BACKUP;}}
export function getBackupMark():BackupMark{return cache??=load();}
function save(next:BackupMark){cache=next;try{window.localStorage.setItem(BACKUP_MARK_KEY,JSON.stringify(next));}catch{/* 저장이 막혀도 이번 화면에서는 쓴다 */}listeners.forEach(l=>l());}

/** 모든 반의 판 수 합(보관 파일에 들어가는 것과 같은 범위). */
export function totalPlaysAllClasses():number{
 let total=0;
 for(const c of getRoster().classes){try{const raw=window.localStorage.getItem(classStorageKey(CLASS_DATA_KEYS[0],c.id));if(raw)total+=parseProgress(JSON.parse(raw)).plays.length;}catch{/* 못 읽는 반은 0판으로 */}}
 return total;
}
export function noteBackedUp(cloud:boolean,now=Date.now()){save(markBackedUp(getBackupMark(),totalPlaysAllClasses(),now,cloud));}
export function snoozeBackupNudge(){save(markSnoozed(getBackupMark(),totalPlaysAllClasses()));}

function subscribe(listener:()=>void){
 listeners.add(listener);
 const onStorage=(e:StorageEvent)=>{if(e.key===BACKUP_MARK_KEY){cache=null;listener();}};
 window.addEventListener('storage',onStorage);
 return()=>{listeners.delete(listener);window.removeEventListener('storage',onStorage);};
}
export function useBackupMark():BackupMark{return useSyncExternalStore(subscribe,getBackupMark,()=>NO_BACKUP);}
if(typeof window!=='undefined')window.addEventListener?.('physical-device-cleared',()=>{cache=null;listeners.forEach(l=>l());});
