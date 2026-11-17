import {useEffect,useState} from 'react';
import {EMPTY_PROGRESS,addPlay,parseProgress,setVote,type ClassProgress,type Vote} from '../domain/classProgress';

/** 이 기기에만 남는 우리 반 반응·원정 지도 기록. 저장이 막힌 브라우저에서도 화면은 그대로 쓸 수 있다. */
export const CLASS_PROGRESS_KEY='physical_class_progress_v1';
const EVENT='class-progress-change';
let memory:ClassProgress=EMPTY_PROGRESS;

export function readProgress():ClassProgress{
 try{const raw=window.localStorage.getItem(CLASS_PROGRESS_KEY);if(raw){memory=parseProgress(JSON.parse(raw));}}catch{/* 저장소를 못 쓰면 메모리 값 */}
 return memory;
}
function write(next:ClassProgress){
 memory=next;
 try{window.localStorage.setItem(CLASS_PROGRESS_KEY,JSON.stringify(next));}catch{/* 저장소가 막혀도 이번 화면에서는 쓴다 */}
 try{window.dispatchEvent(new Event(EVENT));}catch{/* 서버 렌더링 등 */}
}
export function recordPlay(id:string,at=Date.now()){write(addPlay(readProgress(),id,at));}
export function recordVote(id:string,vote:Vote,at=Date.now()){write(setVote(readProgress(),id,vote,at));}
export function clearProgress(){write({...EMPTY_PROGRESS,plays:[],votes:[]});}

/** 기록이 바뀌면(다른 탭 포함) 다시 그린다. */
export function useClassProgress():ClassProgress{
 const [p,setP]=useState<ClassProgress>(()=>readProgress());
 useEffect(()=>{
  const on=()=>setP(readProgress());
  const onStorage=(e:StorageEvent)=>{if(e.key===CLASS_PROGRESS_KEY)on();};
  window.addEventListener(EVENT,on);window.addEventListener('storage',onStorage);
  return ()=>{window.removeEventListener(EVENT,on);window.removeEventListener('storage',onStorage);};
 },[]);
 return p;
}
