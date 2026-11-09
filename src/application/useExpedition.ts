import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../data/supabase';
import {groupClue,initialShip,mapOrder,shipStep,STATIONS,type ExpeditionSnapshot,type FlagshipId,type Station} from '../domain/flagship';
import {DEFAULT_WORKSHOP,SHIP_COURSES,groupWorkshop,settingsOf,rulesOf,workshopSchema} from '../domain/expeditionWorkshop';

export function practiceSnapshot(game:FlagshipId):ExpeditionSnapshot{return {runId:crypto.randomUUID(),game,seed:0,phase:0,status:'playing',revision:0,serverTime:Date.now(),startedAt:Date.now()+5000,event:'calm',owner:false,groupId:'practice',clue:groupClue(0,0)+' 마지막은 숲, 가운데는 탑이에요.',groups:[{id:'practice',name:'연습 모둠',visited:[],vote:null,done:false,ship:initialShip(),axes:[{value:0,at:0,claimed:true,mine:true},{value:0,at:0,claimed:true,mine:true}],loop:[],quality:0,mode:'assisted'}]};}
export function useExpedition(room:string|null,game:FlagshipId,group:string|null){
 const [snapshot,setSnapshot]=useState<ExpeditionSnapshot|null>(()=>{if(room)return null;const s=practiceSnapshot(game);s.workshop={version:1,settings:structuredClone(DEFAULT_WORKSHOP),lessonStep:0,lessonAt:Date.now(),observations:{}};return s;});
 const [error,setError]=useState(''),[missing,setMissing]=useState(false),[busy,setBusy]=useState(false),[stale,setStale]=useState(false);
 const alive=useRef(true),pending=useRef(false),reportPending=useRef(false),latest=useRef(snapshot),readEpoch=useRef(0);latest.current=snapshot;
 const refresh=useCallback(async()=>{if(!room)return;const epoch=readEpoch.current;try{const r=await supabase.rpc('expedition_action',{p_room:room,p_game:game,p_group:group});if(!alive.current||epoch!==readEpoch.current)return;if(r.error){setStale(true);setError('원정 연결을 확인하지 못했어요. 입력을 멈추고 연결을 다시 확인해요.');return;}if(r.data?.missing){setMissing(true);setSnapshot(null);return;}setMissing(false);setStale(false);setSnapshot(old=>!old||old.runId!==r.data.runId||r.data.revision>=old.revision?r.data:old);setError('');}catch{if(alive.current&&epoch===readEpoch.current){setStale(true);setError('원정 연결을 확인하지 못했어요. 입력을 멈추고 연결을 다시 확인해요.');}}},[room,game,group]);
 useEffect(()=>{alive.current=true;let active=true;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{await refresh();if(active)timer=setTimeout(()=>{if(document.hidden){timer=setTimeout(poll,2500);}else void poll();},game==='expedition-ship'?600:2000);};void poll();return()=>{active=false;alive.current=false;clearTimeout(timer);};},[refresh,game]);
 const action=useCallback(async(kind:string,data:Record<string,unknown>={})=>{
  if(room&&kind==='readiness'){
   if(reportPending.current)return false;
   reportPending.current=true;const current=latest.current;
   try{const r=await supabase.rpc('expedition_action',{p_room:room,p_game:game,p_action:kind,p_group:group,p_data:{...data,runId:current?.runId,requestId:crypto.randomUUID()}});
    if(r.error)return false;
    if(alive.current)setSnapshot(old=>old&&old.runId===r.data.runId&&r.data.revision>=old.revision?r.data:old);
    return true;
   }catch{return false;}finally{reportPending.current=false;}
  }
  if(pending.current)return false;
  if(room){pending.current=true;setBusy(true);readEpoch.current++;try{const s=latest.current;const r=await supabase.rpc('expedition_action',{p_room:room,p_game:game,p_action:kind,p_group:group,p_data:{...data,runId:s?.runId,requestId:crypto.randomUUID()}});if(r.error)throw Error();if(alive.current){setSnapshot(old=>!old||old.runId!==r.data.runId||r.data.revision>=old.revision?r.data:old);setMissing(false);setError('');setStale(false);}return true;}catch{if(alive.current){setStale(true);setError('입력을 반영하지 못했어요. 수업 시작·모둠 권한·연결 상태를 확인하고 다시 시도해요.');}return false;}finally{pending.current=false;if(alive.current)setBusy(false);}}
  setSnapshot(prev=>{if(!prev)return prev;const s=structuredClone(prev),g=s.groups[0],w=groupWorkshop(g,s);g.workshop=w;s.revision++;s.serverTime=Date.now();
   if(kind==='settings'){const p=workshopSchema.safeParse(data.settings);if(p.success){s.workshop!.settings=p.data;w.level=p.data.level;w.members=p.data.members;s.seed=p.data.stationOrder==='tower-forest-river'?1:0;s.clue='길 순서: '+mapOrder(s.seed).join(' → ');}}
   if(kind==='rotate'){w.roleRound++;w.roleSwaps++;w.roleAt=Date.now();}
   if(kind==='readiness'){const report={kind:data.kind as 'camera'|'tilt'|'touch',state:data.state as 'ready'|'lost'|'manual'|'off'|'error',at:Date.now()};w.devices=[...w.devices.filter(r=>r.kind!==report.kind),report];}
   if(kind==='visit'&&STATIONS.includes(data.station as Station))g.visited=[...new Set([...g.visited,data.station as Station])];
   const config=settingsOf(s),order=config.stationOrder==='auto'?mapOrder(s.seed):config.stationOrder.split('-');
   if(kind==='vote'&&g.visited.includes(data.station as Station)&&data.station===order[s.phase]){s.phase++;g.visited=[];g.done=s.phase>=3;}
   if(kind==='steer'){const slot=Number(data.slot);g.axes[slot]={value:Number(data.value),at:Date.now(),claimed:true,mine:true};if(typeof data.other==='number')g.axes[1]={value:data.other,at:Date.now(),claimed:true,mine:true};g.ship=shipStep(g.ship,g.axes[0].value,g.axes[1].value,300,rulesOf(g,s),SHIP_COURSES[config.shipCourse]);g.done=g.ship.checkpoint>=3;}
   if(kind==='loop'){g.loop=data.loop as number[];g.quality=Number(data.quality);g.done=g.quality>=rulesOf(g,s).quality;g.mode='partner-confirmed';}
   if(kind==='complete'){g.done=true;g.mode=String(data.mode);}
   return s;});return true;
 },[room,game,group]);
 return {snapshot,error,missing,busy,stale,refresh,action,practice:!room};
}
