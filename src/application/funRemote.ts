import {parseFunCommand} from '../domain/funLoop';
import type {ExternalFunCommand,FunRemoteSnapshot,FunTransport} from './funCommandBus';

/**
 * 휴대폰 리모컨 ↔ TV 연결. 실제 전송은 Supabase Realtime broadcast 채널(`fun-remote:방코드`)이고,
 * 테이블·스키마는 쓰지 않는다. 전송 방법은 RemoteChannel 하나로 감싸서, 테스트는 가짜 채널로 돌린다.
 *
 * 리모컨 → TV: 'cmd' {sender, seq, at, command}
 *   - 보낸 기기(sender)마다 seq가 늘어나야 받는다(같은 명령 두 번·순서 뒤바뀜 무시).
 *   - 30초보다 오래된 명령은 버린다(다시 연결될 때 밀려온 옛 명령).
 *   - command는 TV의 명령 버스가 parseFunCommand로 한 번 더 검사한다.
 * TV → 리모컨: 'state' {at, snapshot}, 그리고 리모컨이 'hello'를 보내면 지금 상태를 바로 다시 보낸다.
 */
export type RemoteStatus='idle'|'connecting'|'connected'|'unavailable'|'error';
export interface RemoteChannel {
 send(event:string,payload:unknown):void;
 on(event:string,handler:(payload:unknown)=>void):void;
 /** 연결 상태가 바뀌면 알린다. 돌려준 함수로 끊는다. */
 open(onStatus:(s:RemoteStatus)=>void):()=>void;
}
export const STALE_MS=30_000;
const ROOM_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH=6;

/** 추측하기 어려운 방 코드(헷갈리는 0·O·1·I·L 제외). crypto가 없으면 만들지 않는다. */
export function generateRoomCode(rand:(n:number)=>Uint8Array=n=>crypto.getRandomValues(new Uint8Array(n))):string{
 const bytes=rand(ROOM_CODE_LENGTH*2);let out='';
 // 모듈로 치우침을 줄이려고 알파벳 길이의 배수 밖 값은 건너뛴다.
 const limit=Math.floor(256/ROOM_ALPHABET.length)*ROOM_ALPHABET.length;
 for(const b of bytes){if(out.length===ROOM_CODE_LENGTH)break;if(b<limit)out+=ROOM_ALPHABET[b%ROOM_ALPHABET.length];}
 while(out.length<ROOM_CODE_LENGTH){const [b]=rand(1);if(b<limit)out+=ROOM_ALPHABET[b%ROOM_ALPHABET.length];}
 return out;
}
export const normalizeRoomCode=(raw:string|null|undefined)=>(raw??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export const isValidRoomCode=(code:string)=>code.length===ROOM_CODE_LENGTH&&[...code].every(c=>ROOM_ALPHABET.includes(c));
export const remoteChannelName=(code:string)=>`fun-remote:${code}`;
export const remoteUrl=(origin:string,code:string)=>`${origin.replace(/\/$/,'')}/fun-remote?room=${encodeURIComponent(code)}`;

interface CmdPayload {sender:string;seq:number;at:number;command:unknown}
const isCmdPayload=(v:unknown):v is CmdPayload=>!!v&&typeof v==='object'&&typeof (v as CmdPayload).sender==='string'&&(v as CmdPayload).sender.length<=40&&Number.isInteger((v as CmdPayload).seq)&&typeof (v as CmdPayload).at==='number';

/** 받은 명령을 걸러 내는 상태(보낸 기기마다 마지막 seq). 순수하게 시험할 수 있게 따로 둔다. */
export function createCommandFilter(now:()=>number=Date.now){
 const lastSeq=new Map<string,number>();
 return (raw:unknown):ExternalFunCommand|null=>{
  if(!isCmdPayload(raw))return null;
  if(Math.abs(now()-raw.at)>STALE_MS)return null;
  const prev=lastSeq.get(raw.sender)??-1;
  if(raw.seq<=prev)return null;
  const cmd=parseFunCommand(raw.command);
  if(!cmd)return null;
  lastSeq.set(raw.sender,raw.seq);
  if(lastSeq.size>20)lastSeq.delete(lastSeq.keys().next().value!);
  return cmd as ExternalFunCommand;
 };
}

/** TV 쪽: 명령 버스에 붙이는 전송. 상태 알림은 바뀔 때만 보내고, 1초에 4번을 넘지 않는다. */
export function createTvTransport(channel:RemoteChannel,opts:{now?:()=>number;onStatus?:(s:RemoteStatus)=>void;onRemoteSeen?:()=>void}={}):FunTransport{
 const now=opts.now??Date.now;
 let last='',lastAt=0,latest:FunRemoteSnapshot|null=null,timer:ReturnType<typeof setTimeout>|null=null;
 const flush=()=>{timer=null;if(!latest)return;const s=JSON.stringify(latest);if(s===last)return;last=s;lastAt=now();channel.send('state',{at:lastAt,snapshot:latest});};
 return {
  connect(onRaw){
   const filter=createCommandFilter(now);
   channel.on('cmd',raw=>{const cmd=filter(raw);if(cmd){opts.onRemoteSeen?.();onRaw(cmd);}});
   channel.on('hello',()=>{opts.onRemoteSeen?.();last='';flush();});
   const close=channel.open(s=>opts.onStatus?.(s));
   return ()=>{if(timer)clearTimeout(timer);close();};
  },
  publishState(snapshot){
   latest=snapshot;
   const wait=250-(now()-lastAt);
   if(wait<=0)flush();else if(!timer)timer=setTimeout(flush,wait);
  },
 };
}

/** 리모컨 쪽: 명령을 보내고 TV 상태를 받는다. */
export function createRemoteSender(channel:RemoteChannel,opts:{now?:()=>number;sender?:string;onState?:(s:FunRemoteSnapshot)=>void;onStatus?:(s:RemoteStatus)=>void}={}){
 const now=opts.now??Date.now;
 const sender=opts.sender??generateRoomCode()+generateRoomCode();
 let seq=0,lastStateAt=0;
 channel.on('state',raw=>{
  const p=raw as {at?:unknown;snapshot?:unknown};
  if(!p||typeof p.at!=='number'||p.at<lastStateAt||!p.snapshot||typeof p.snapshot!=='object')return;
  lastStateAt=p.at;opts.onState?.(p.snapshot as FunRemoteSnapshot);
 });
 const close=channel.open(s=>{opts.onStatus?.(s);if(s==='connected')channel.send('hello',{sender,at:now()});});
 return {
  send(command:ExternalFunCommand){seq++;channel.send('cmd',{sender,seq,at:now(),command} satisfies CmdPayload);},
  close,
 };
}

/** Supabase가 설정돼 있을 때만 실제 채널을 만든다(없으면 null → '이 기기에서 연결할 수 없어요'). */
export const remoteConfigured=()=>!!(import.meta.env?.VITE_SUPABASE_URL&&import.meta.env?.VITE_SUPABASE_ANON_KEY);
export function supabaseRemoteChannel(code:string):RemoteChannel|null{
 if(!remoteConfigured())return null;
 const handlers:[string,(p:unknown)=>void][]=[];
 let ch:{send:(m:{type:'broadcast';event:string;payload:unknown})=>unknown}|null=null;
 const queue:[string,unknown][]=[];
 return {
  send(event,payload){if(ch)void ch.send({type:'broadcast',event,payload});else queue.push([event,payload]);},
  on(event,handler){handlers.push([event,handler]);},
  open(onStatus){
   let closed=false,cleanup=()=>{};
   onStatus('connecting');
   void import('../data/supabase').then(({supabase})=>{
    if(closed)return;
    const channel=supabase.channel(remoteChannelName(code),{config:{broadcast:{self:false,ack:false}}});
    for(const [event,handler] of handlers)channel.on('broadcast',{event},msg=>handler((msg as {payload?:unknown}).payload));
    channel.subscribe(status=>{
     if(closed)return;
     if(status==='SUBSCRIBED'){ch=channel;onStatus('connected');for(const [e,p] of queue.splice(0))void channel.send({type:'broadcast',event:e,payload:p});}
     else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){ch=null;onStatus('error');}
     else if(status==='CLOSED'){ch=null;onStatus('idle');}
    });
    cleanup=()=>{ch=null;void supabase.removeChannel(channel);};
   }).catch(()=>{if(!closed)onStatus('error');});
   return ()=>{closed=true;cleanup();};
  },
 };
}

/** 같은 기기 탭끼리 시험·시연할 때 쓰는 채널(BroadcastChannel). Supabase가 없어도 동작한다. */
export function localRemoteChannel(code:string):RemoteChannel|null{
 if(typeof BroadcastChannel==='undefined')return null;
 const bc=new BroadcastChannel(remoteChannelName(code));
 const handlers=new Map<string,((p:unknown)=>void)[]>();
 bc.onmessage=e=>{const m=e.data as {event?:string;payload?:unknown};if(m&&typeof m.event==='string')for(const h of handlers.get(m.event)??[])h(m.payload);};
 return {
  send(event,payload){bc.postMessage({event,payload});},
  on(event,handler){handlers.set(event,[...(handlers.get(event)??[]),handler]);},
  open(onStatus){onStatus('connected');return ()=>bc.close();},
 };
}
/** 실제 채널을 먼저, 안 되면 같은 기기 채널. 둘 다 없으면 null. */
export const openRemoteChannel=(code:string)=>supabaseRemoteChannel(code)??localRemoteChannel(code);
