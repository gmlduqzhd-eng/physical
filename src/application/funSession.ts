import {restoreFunState,type FunState,type FunTiming} from '../domain/funLoop';

/**
 * 대표 게임 이어 하기: TV를 새로고침해도 판이 사라지지 않게 지금 판을 sessionStorage(이 탭)에 적어 둔다.
 * 같은 탭에서 다시 열면 시작 화면에 '이어 하기'가 나온다. 판 기록·모듈 기록(빙고판·응원 수)·기록 여부를 함께 저장한다.
 * 리모컨 방 코드는 따로 저장해, 새로고침해도 휴대폰이 같은 방으로 다시 이어진다.
 */
export interface FunSetup {teams:number;seated:boolean;skipDemo:boolean;round:number}
export interface FunSession {
 v:1;gameId:string;savedAt:number;setup:FunSetup;seed:number;state:FunState;
 /** 결과를 이미 기록했는지(새로고침 뒤 두 번 기록하지 않게). */ recorded:boolean;
 /** 게임 화면 부품(모듈)이 따로 모은 기록. */ module?:unknown;
}
export const FUN_SESSION_TTL_MS=3*60*60*1000;
const sessionKey=(gameId:string)=>`fun-session:${gameId}`;
const roomKey=(gameId:string)=>`fun-remote-room:${gameId}`;

function storage():Storage|null{try{return typeof sessionStorage==='undefined'?null:sessionStorage;}catch{return null;}}

export function saveFunSession(session:Omit<FunSession,'v'|'savedAt'>,now=Date.now()):void{
 const s=storage();if(!s)return;
 try{s.setItem(sessionKey(session.gameId),JSON.stringify({...session,v:1,savedAt:now} satisfies FunSession));}catch{/* 저장 공간이 없어도 게임은 그대로 */}
}
/** 저장된 판을 읽어 검사한다. 오래됐거나(3시간), 모양이 틀리거나, 게임 시간이 바뀌었으면 null(그리고 지운다). */
export function loadFunSession(gameId:string,timing:FunTiming,now=Date.now()):FunSession|null{
 const s=storage();if(!s)return null;
 let raw:unknown;
 try{const text=s.getItem(sessionKey(gameId));if(!text)return null;raw=JSON.parse(text);}catch{clearFunSession(gameId);return null;}
 const v=raw as Partial<FunSession>;
 const setup=v?.setup;
 const okSetup=!!setup&&Number.isInteger(setup.teams)&&setup.teams>=1&&setup.teams<=4&&typeof setup.seated==='boolean'&&Number.isInteger(setup.round)&&setup.round>=0;
 if(!v||v.v!==1||v.gameId!==gameId||typeof v.savedAt!=='number'||now-v.savedAt>FUN_SESSION_TTL_MS||!okSetup||typeof v.seed!=='number'){clearFunSession(gameId);return null;}
 const state=restoreFunState(v.state,{timing,teams:setup!.teams});
 if(!state||state.seed!==v.seed){clearFunSession(gameId);return null;}
 // 이미 결과를 기록한 판은 이어 할 것이 없다(끝난 판을 '하던 판'으로 다시 보여 주지 않는다).
 if(state.phase==='result'&&v.recorded===true){clearFunSession(gameId);return null;}
 return {v:1,gameId,savedAt:v.savedAt,setup:{...setup!,skipDemo:true},seed:v.seed,state,recorded:v.recorded===true,module:v.module};
}
export function clearFunSession(gameId:string){try{storage()?.removeItem(sessionKey(gameId));}catch{/* 무시 */}}

/** 리모컨 방 코드는 2시간까지만 다시 쓴다(오래 켜 둔 탭에서 예전 코드가 계속 살아 있지 않게). */
export const REMOTE_ROOM_TTL_MS=2*60*60*1000;
/** 리모컨 쪽이 이 방의 기록(허용한 휴대폰 등)을 sessionStorage에 둘 때 쓰는 키 앞머리. clearRemoteRoom이 함께 지운다. */
export const REMOTE_STORAGE_PREFIXES=['physical_fun_remote_','fun-remote:'] as const;
const ROOM_RE=/^[A-Z0-9]{6}$/;
export function loadRemoteRoom(gameId:string,now=Date.now()):string|undefined{
 const s=storage();if(!s)return undefined;
 try{
  const raw=s.getItem(roomKey(gameId));if(!raw)return undefined;
  const v=JSON.parse(raw) as {code?:unknown;at?:unknown};
  if(typeof v?.code==='string'&&ROOM_RE.test(v.code)&&typeof v.at==='number'&&now-v.at>=0&&now-v.at<=REMOTE_ROOM_TTL_MS)return v.code;
 }catch{/* 예전 형식(코드만 저장)이거나 깨진 값: 기한을 알 수 없으므로 쓰지 않는다 */}
 clearRemoteRoom(gameId);
 return undefined;
}
export function saveRemoteRoom(gameId:string,code:string,now=Date.now()){
 if(!ROOM_RE.test(code))return;
 try{storage()?.setItem(roomKey(gameId),JSON.stringify({code,at:now}));}catch{/* 무시 */}
}
/**
 * 목록으로 나갈 때: 이 게임의 리모컨 방 코드와, 그 방에 대한 리모컨 기록(허용한 휴대폰 목록 등)을 지운다.
 * 리모컨 쪽 키는 REMOTE_STORAGE_PREFIXES로 시작하고 방 코드를 담는다.
 */
export function clearRemoteRoom(gameId:string){
 const s=storage();if(!s)return;
 try{
  const raw=s.getItem(roomKey(gameId));
  let code:string|undefined;
  try{const v=raw?JSON.parse(raw) as {code?:unknown}:null;if(typeof v?.code==='string')code=v.code;}catch{if(raw&&ROOM_RE.test(raw))code=raw;}
  s.removeItem(roomKey(gameId));
  if(!code)return;
  const keys:string[]=[];
  for(let i=0;i<s.length;i++){const k=s.key(i);if(k&&REMOTE_STORAGE_PREFIXES.some(p=>k.startsWith(p))&&k.includes(code))keys.push(k);}
  keys.forEach(k=>s.removeItem(k));
 }catch{/* 무시 */}
}
