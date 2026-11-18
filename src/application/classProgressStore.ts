import {useEffect,useState} from 'react';
import {EMPTY_PROGRESS,addPlay,mergeProgress,parseProgress,setReasons,setVote,type ClassProgress,type ReasonId,type Vote} from '../domain/classProgress';

/**
 * 이 기기에만 남는 우리 반 반응·원정 지도 기록. 저장이 막힌 브라우저에서도 화면은 그대로 쓸 수 있다.
 * 키 이름은 그대로 두고, 안의 version(2: 반응 이유 추가)으로 예전 기록을 읽어 옮긴다.
 */
export const CLASS_PROGRESS_KEY='physical_class_progress_v1';
const EVENT='class-progress-change';
let memory:ClassProgress=EMPTY_PROGRESS;
/**
 * 마지막 저장이 실패했는지. 실패한 뒤에는 저장소 값으로 메모리를 덮어쓰지 않고 둘을 합친다.
 * 그래서 이 탭의 새 기록도, 그사이 다른 탭이 남긴 기록도 사라지지 않는다.
 */
let saveFailed=false;
export const progressSaveFailed=()=>saveFailed;

export function readProgress():ClassProgress{
 try{
  const raw=window.localStorage.getItem(CLASS_PROGRESS_KEY);
  if(raw){const stored=parseProgress(JSON.parse(raw));memory=saveFailed?mergeProgress(memory,stored):stored;}
 }catch{/* 저장소를 못 쓰면 메모리 값 */}
 return memory;
}

/** 한 판을 가리키는 id. 게임을 시작할 때 만들어, 그 판의 기록과 반응을 잇는다. */
export function newPlayId():string{
 try{return crypto.randomUUID().slice(0,24);}catch{return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
}
/**
 * 지금 화면에 떠 있는 반응 칸이 잡아 둔 판 id(활동별). 판 id를 따로 넘기지 않는 화면(대표 게임 결과 등)에서
 * 결과를 기록할 때 이 id를 써서, 그 화면에서 누른 반응과 기록이 같은 판으로 묶이게 한다.
 */
const openPlays=new Map<string,string>();
export function claimPlayId(gameId:string):string{const id=newPlayId();openPlays.set(gameId,id);return id;}
/** 이미 만든 판 id를 다시 잡아 둔다(화면이 다시 붙을 때, 예: 개발 모드의 StrictMode 두 번 실행). */
export function holdPlayId(gameId:string,id:string){openPlays.set(gameId,id);}
export function releasePlayId(gameId:string,id:string){if(openPlays.get(gameId)===id)openPlays.delete(gameId);}
export const openPlayId=(gameId:string)=>openPlays.get(gameId);
function write(next:ClassProgress){
 memory=next;
 try{window.localStorage.setItem(CLASS_PROGRESS_KEY,JSON.stringify(next));saveFailed=false;}catch{saveFailed=true;/* 저장소가 막혀도 이번 화면에서는 쓴다 */}
 try{window.dispatchEvent(new Event(EVENT));}catch{/* 서버 렌더링 등 */}
}
/** 판 기록. play(판 id)를 주지 않으면, 화면의 반응 칸이 잡아 둔 판 id를 쓴다. */
export function recordPlay(id:string,at=Date.now(),play?:string){write(addPlay(readProgress(),id,at,play??openPlays.get(id)));}
export function recordVote(id:string,vote:Vote,at=Date.now(),play?:string){write(setVote(readProgress(),id,vote,at,play));}
/** 한 판의 반응 이유와 한 줄 메모(고르지 않아도 된다). */
export function recordReasons(id:string,play:string,reasons:readonly ReasonId[],note?:string,at=Date.now()){write(setReasons(readProgress(),id,play,reasons,note,at));}
export function clearProgress(){write({...EMPTY_PROGRESS,plays:[],votes:[],reasons:[]});}

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
