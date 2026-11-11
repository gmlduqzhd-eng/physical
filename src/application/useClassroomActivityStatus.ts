import {useEffect,useState} from 'react';
import {activityRoomPaused} from '../domain/fourthGameRules';
import {supabase} from '../data/supabase';
export type ActivityRoomStatus='checking'|'playing'|'waiting'|'paused'|'finished'|'unavailable';

export function useClassroomActivityStatus(roomId:string|null){
 const [state,setState]=useState<{room:string|null;status:ActivityRoomStatus}>({room:roomId,status:roomId?'checking':'playing'});
 useEffect(()=>{
  if(!roomId)return;
  let alive=true,pending=false,revision=0;let controller:AbortController|null=null;
  const refresh=async()=>{
   if(pending||!alive)return;pending=true;const current=++revision;controller=new AbortController();
   const timeout=setTimeout(()=>controller?.abort(),5000);
   try{const {data,error}=await supabase.from('game_rooms').select('status').eq('id',roomId).abortSignal(controller.signal).maybeSingle();
    if(alive&&current===revision)setState({room:roomId,status:!error&&data&&['playing','waiting','paused','finished'].includes(data.status)?data.status:'unavailable'});
   }catch{if(alive&&current===revision)setState({room:roomId,status:'unavailable'});}finally{clearTimeout(timeout);pending=false;}
  };
  const offline=()=>{revision++;controller?.abort();if(alive)setState({room:roomId,status:'unavailable'});};
  const visibility=()=>{if(!document.hidden)void refresh();};
  void refresh();const timer=setInterval(()=>{if(!navigator.onLine)offline();else void refresh();},1500);
  const channel=supabase.channel(`activity-status-${roomId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'game_rooms',filter:`id=eq.${roomId}`},()=>void refresh()).subscribe();
  window.addEventListener('offline',offline);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;controller?.abort();clearInterval(timer);void supabase.removeChannel(channel);window.removeEventListener('offline',offline);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visibility);};
 },[roomId]);
 const status=!roomId?'playing':state.room===roomId?state.status:'checking';
 return {status,paused:activityRoomPaused(status),message:status==='paused'?'선생님이 수업을 잠시 멈췄어요.':status==='finished'?'수업이 종료되었어요.':status==='waiting'?'선생님의 수업 시작을 기다려요.':status==='checking'?'수업 연결을 확인하고 있어요.':'연결 확인 중에는 활동을 멈춰요.'};
}
