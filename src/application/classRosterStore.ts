import {useSyncExternalStore} from 'react';
import {EMPTY_ROSTER,addClass,classStorageKey,parseRoster,removeClass,renameClass,selectClass,type ClassRoster} from '../domain/classRoster';

/** 반 목록과 지금 고른 반. 이 기기에만 저장한다(반 이름만, 학생 정보 없음). */
export const CLASS_ROSTER_KEY='physical_classes_v1';
/** 반별로 따로 저장하는 기록 자리(기본 이름). 반을 지우거나 파일로 보관할 때 함께 다룬다. */
export const CLASS_DATA_KEYS=['physical_class_progress_v1','physical_class_journey_v1'] as const;

const listeners=new Set<()=>void>();
let cache:ClassRoster|null=null;

function load():ClassRoster{
 try{const raw=window.localStorage.getItem(CLASS_ROSTER_KEY);return raw?parseRoster(JSON.parse(raw)):EMPTY_ROSTER;}catch{return EMPTY_ROSTER;}
}
export function getRoster():ClassRoster{return cache??=load();}
export const currentClassId=()=>getRoster().current;
/** 지금 고른 반의 저장 자리 이름. */
export const classKey=(base:string)=>classStorageKey(base,currentClassId());

function save(next:ClassRoster){
 if(next===getRoster())return;
 cache=next;
 try{window.localStorage.setItem(CLASS_ROSTER_KEY,JSON.stringify(next));}catch{/* 저장이 막혀도 이번 화면에서는 쓴다 */}
 listeners.forEach(l=>l());
}
const newId=()=>{try{return crypto.randomUUID().replace(/-/g,'').slice(0,8);}catch{return Math.random().toString(36).slice(2,10).padEnd(8,'0');}};

export function createClass(name:string){save(addClass(getRoster(),name,newId()));}
export function renameClassTo(id:string,name:string){save(renameClass(getRoster(),id,name));}
export function chooseClass(id:string){save(selectClass(getRoster(),id));}
/** 반과 그 반의 기록을 함께 지운다. */
export function deleteClass(id:string){
 const next=removeClass(getRoster(),id);
 if(next===getRoster())return;
 try{CLASS_DATA_KEYS.forEach(base=>window.localStorage.removeItem(classStorageKey(base,id)));}catch{/* 저장소를 못 쓰면 목록만 지운다 */}
 save(next);
}
/** 파일에서 가져온 반 목록으로 바꾼다. */
export function replaceRoster(next:ClassRoster){cache=null;save(parseRoster(next));}

function subscribe(listener:()=>void){
 listeners.add(listener);
 const onStorage=(e:StorageEvent)=>{if(e.key===CLASS_ROSTER_KEY){cache=null;listener();}};
 window.addEventListener('storage',onStorage);
 return()=>{listeners.delete(listener);window.removeEventListener('storage',onStorage);};
}
/** 반 목록이 바뀌면(다른 탭 포함) 다시 그린다. */
export function useClassRoster():ClassRoster{return useSyncExternalStore(subscribe,getRoster,()=>EMPTY_ROSTER);}
/** 반을 바꿀 때 다른 저장소(반응 기록 등)가 다시 읽도록 알린다. */
export function onClassChange(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}

// '기기 정보 지우기'를 누르면 반 목록도 처음으로 돌린다.
if(typeof window!=='undefined')window.addEventListener?.('physical-device-cleared',()=>{cache=null;listeners.forEach(l=>l());});
