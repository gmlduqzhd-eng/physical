import {readStorage,writeStorage,removeStorage} from './browserStorage';

/**
 * 익명 활동 실행 횟수: 판을 기록할 때 "어떤 활동을 한 판 했다"만 서버에 센다.
 * 보내는 것은 활동 번호 하나뿐이다. 누가·어느 반·어느 기기인지, 점수나 반응은 보내지 않는다.
 * 개인정보 안내에서 끌 수 있다. 실패해도 수업에는 아무 영향이 없다.
 */
export const STATS_OFF_KEY='physical_stats_off_v1';
export const statsEnabled=()=>readStorage(STATS_OFF_KEY)!=='1';
export function setStatsEnabled(on:boolean){if(on)removeStorage(STATS_OFF_KEY);else writeStorage(STATS_OFF_KEY,'1');}

const ID=/^[a-zA-Z0-9_-]{1,80}$/;
/** 보낼 요청을 만든다(주소와 키가 없거나 번호가 이상하면 null). */
export function statsRequest(activityId:string,url:string|undefined,key:string|undefined):{url:string;init:RequestInit}|null{
 if(!url||!key||!ID.test(activityId)||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))return null;
 return {url:`${url}/rest/v1/rpc/count_activity_play`,init:{method:'POST',keepalive:true,credentials:'omit',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify({activity:activityId})}};
}
export function countActivityPlay(activityId:string){
 try{
  if(!statsEnabled())return;
  const req=statsRequest(activityId,import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY);
  if(req)void fetch(req.url,req.init).catch(()=>{});
 }catch{/* 통계는 실패해도 된다 */}
}
