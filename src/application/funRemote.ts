import {parseFunCommand,type FunPhase} from '../domain/funLoop';
import type {ExternalFunCommand,FunRemoteSnapshot,FunTransport} from './funCommandBus';

/**
 * 휴대폰 리모컨 ↔ TV 연결. 실제 전송은 Supabase Realtime broadcast 채널(`fun-remote:방코드`)이고,
 * 테이블·스키마는 쓰지 않는다. 전송 방법은 RemoteChannel 하나로 감싸서, 테스트는 가짜 채널로 돌린다.
 *
 * 방 코드는 TV 화면에 크게 보이므로, 코드만으로는 조작할 수 없게 선생님의 '허용'을 받는다.
 *  1) 휴대폰 → TV  'hello' {device,name}            : 연결 요청(기기마다 무작위 id)
 *  2) TV → 휴대폰  'access' {device,epoch,state}     : pending(허용 기다림)·approved·rejected·full
 *     선생님이 TV에서 '허용'을 한 번 누르면 approved. 허용된 휴대폰은 최대 MAX_REMOTES대.
 *  3) 휴대폰 → TV  'cmd' {device,epoch,seq,command}  : 허용된 기기의, 지금 TV 연결(epoch)의 명령만 받는다.
 *     - 기기마다 seq가 늘어나야 받는다(재전송·중복·순서 뒤바뀜 무시). 허용된 기기의 seq 기억은 지우지 않는다.
 *     - 보낸 쪽 시계는 쓰지 않는다(학교 PC·휴대폰 시계가 틀려도 동작). 옛 명령은 epoch·seq로 걸러진다.
 *     - 기기마다 1초에 CMD_PER_SEC번까지만 받는다.
 *     - command는 TV의 명령 버스가 parseFunCommand로 한 번 더 검사한다.
 *  4) TV → 휴대폰  'state' {epoch,n,snapshot}        : 바뀔 때만, 1초에 4번 이하. n은 TV가 매기는 번호.
 *     'beat' {epoch}  : 몇 초마다 보내는 살아 있음 신호. 휴대폰은 BEAT_TIMEOUT_MS 동안 못 받으면 'TV 응답 없음'.
 *     'closed' {epoch,reason} : 모두 끊기·새 코드·게임 화면 닫힘. 휴대폰은 '연결이 끝났어요'를 보여 준다.
 */
export type RemoteStatus='idle'|'connecting'|'connected'|'unavailable'|'error';
export interface RemoteChannel {
 send(event:string,payload:unknown):void;
 on(event:string,handler:(payload:unknown)=>void):void;
 /** 연결 상태가 바뀌면 알린다. 돌려준 함수로 끊는다. */
 open(onStatus:(s:RemoteStatus)=>void):()=>void;
}
export const MAX_REMOTES=2;
export const MAX_PENDING=4;
export const CMD_PER_SEC=6;
export const BEAT_MS=3_000;
export const BEAT_TIMEOUT_MS=8_000;
const STATE_GAP_MS=250;
const HELLO_GAP_MS=1_000;
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
const randomId=()=>generateRoomCode()+generateRoomCode();
/** 반복 타이머가 Node(테스트)를 붙잡지 않게 한다. 브라우저에는 영향 없음. */
const loose=<T,>(t:T):T=>{(t as {unref?:()=>void}).unref?.();return t;};
export const normalizeRoomCode=(raw:string|null|undefined)=>(raw??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export const isValidRoomCode=(code:string)=>code.length===ROOM_CODE_LENGTH&&[...code].every(c=>ROOM_ALPHABET.includes(c));
export const remoteChannelName=(code:string)=>`fun-remote:${code}`;
export const remoteUrl=(origin:string,code:string)=>`${origin.replace(/\/$/,'')}/fun-remote?room=${encodeURIComponent(code)}`;

const ID_RE=/^[A-Z0-9]{6,24}$/;
const isObj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
// eslint-disable-next-line no-control-regex -- 받은 글자에서 제어 문자를 지운다.
const CONTROL_RE=/[\u0000-\u001f\u007f]/g;
const cleanText=(v:unknown,max:number)=>typeof v==='string'?v.replace(CONTROL_RE,'').slice(0,max):'';
const REMOTE_ICONS=['🐯','🐰','🦊','🐼','🐸','🐳','🦁','🐧'];
/** 기기 id로 고르는 동물 표시. TV의 허용 목록과 휴대폰 화면에 같은 동물이 나와 어느 휴대폰인지 맞춰 볼 수 있다. */
export const remoteIcon=(device:string)=>REMOTE_ICONS[[...device].reduce((n,c)=>n+c.charCodeAt(0),0)%REMOTE_ICONS.length];

/* ───────── 휴대폰이 받는 TV 상태 검사 ───────── */
const PHASES:readonly FunPhase[]=['demo','tutorial','play','climax','result'];
/** TV 상태를 믿기 전에 모양·범위를 검사한다. 맞지 않으면 null(화면은 그대로). */
export function parseSnapshot(raw:unknown):FunRemoteSnapshot|null{
 if(!isObj(raw))return null;
 const {teams,scores,phase,secondsLeft,combo}=raw;
 if(typeof teams!=='number'||!Number.isInteger(teams)||teams<1||teams>4)return null;
 if(!Array.isArray(scores)||scores.length!==teams||!scores.every(n=>typeof n==='number'&&Number.isInteger(n)&&Math.abs(n)<=9999))return null;
 if(typeof phase!=='string'||!PHASES.includes(phase as FunPhase))return null;
 if(typeof secondsLeft!=='number'||!Number.isFinite(secondsLeft)||secondsLeft<0||secondsLeft>3600)return null;
 if(typeof combo!=='number'||!Number.isFinite(combo)||combo<0||combo>100)return null;
 return {
  gameId:cleanText(raw.gameId,40),gameName:cleanText(raw.gameName,40)||'대표 게임',phase:phase as FunPhase,paused:raw.paused===true,
  secondsLeft:Math.round(secondsLeft),teams,scores:[...scores] as number[],scoreLabel:cleanText(raw.scoreLabel,40),
  cue:cleanText(raw.cue,120),combo:Math.round(combo),comboFull:raw.comboFull===true,
 };
}

/* ───────── TV 쪽 ───────── */
export type RemoteDeviceState='pending'|'approved';
export interface RemoteDevice {device:string;name:string;state:RemoteDeviceState}
interface DeviceEntry extends RemoteDevice {lastHelloAt:number}

/**
 * TV가 받은 명령을 걸러 낸다. 순수하게 시험할 수 있게 따로 둔다.
 * 허용된 기기의, 지금 epoch의 명령만, seq가 늘어날 때만, 기기마다 1초에 CMD_PER_SEC번까지 받는다.
 * 시각은 TV가 받은 때(now)만 쓴다.
 */
export function createCommandFilter(opts:{epoch:string;now?:()=>number;isApproved:(device:string)=>boolean}){
 const now=opts.now??Date.now;
 const seqs=new Map<string,{last:number;recent:number[]}>();
 return {
  accept(raw:unknown):ExternalFunCommand|null{
   if(!isObj(raw)||typeof raw.device!=='string'||!ID_RE.test(raw.device)||raw.epoch!==opts.epoch)return null;
   const seq=raw.seq;
   if(typeof seq!=='number'||!Number.isSafeInteger(seq)||seq<1)return null;
   if(!opts.isApproved(raw.device))return null;
   const entry=seqs.get(raw.device)??{last:0,recent:[]};
   if(seq<=entry.last)return null;
   const t=now();entry.recent=entry.recent.filter(x=>t-x<1000);
   if(entry.recent.length>=CMD_PER_SEC)return null;
   const cmd=parseFunCommand(raw.command);
   if(!cmd)return null;
   entry.last=seq;entry.recent.push(t);seqs.set(raw.device,entry);
   return cmd as ExternalFunCommand;
  },
  /** 허용이 취소된 기기는 seq 기억도 지운다(다시 허용되면 새 epoch로 새로 시작). */
  forget(device:string){seqs.delete(device);},
 };
}

export interface TvRemoteControls {
 approve(device:string):void;
 reject(device:string):void;
 /** 모든 휴대폰에 '연결이 끝났어요'를 알리고 허용 목록을 비운다. */
 disconnectAll(reason?:'rotated'|'stopped'):void;
 /** 페이지를 닫거나 새로고침하기 직전: 휴대폰에 '잠시 끊김'을 알린다(같은 코드로 다시 열면 이어진다). */
 notifyReload():void;
 devices():RemoteDevice[];
 readonly epoch:string;
}

/**
 * TV 쪽: 명령 버스에 붙이는 전송 + 허용 관리.
 * 상태 알림은 바뀔 때만, 1초에 4번 이하로 보낸다(연결 요청이 쏟아져도 이 간격을 지킨다).
 */
export function createTvTransport(channel:RemoteChannel,opts:{now?:()=>number;onStatus?:(s:RemoteStatus)=>void;onRemoteSeen?:()=>void;onDevices?:(list:RemoteDevice[])=>void;epoch?:string;beatMs?:number;
 /** 같은 방 코드로 다시 연 TV(새로고침)에서, 전에 허용한 휴대폰은 다시 묻지 않고 허용한다. */ preapproved?:readonly string[]}={}):FunTransport&TvRemoteControls{
 const now=opts.now??Date.now;
 const epoch=opts.epoch??randomId();
 const devices=new Map<string,DeviceEntry>();
 const filter=createCommandFilter({epoch,now,isApproved:d=>devices.get(d)?.state==='approved'});
 let last='',lastAt=-Infinity,latest:FunRemoteSnapshot|null=null,timer:ReturnType<typeof setTimeout>|null=null,beat:ReturnType<typeof setInterval>|null=null,n=0,open=false,reloading=false;
 const list=():RemoteDevice[]=>[...devices.values()].map(({device,name,state})=>({device,name,state}));
 const changed=()=>opts.onDevices?.(list());
 const count=(state:RemoteDeviceState)=>[...devices.values()].filter(d=>d.state===state).length;
 const access=(device:string,state:'pending'|'approved'|'rejected'|'full')=>channel.send('access',{device,epoch,state});
 const flush=()=>{
  timer=null;if(!latest||!open)return;
  const s=JSON.stringify(latest);if(s===last)return;
  last=s;lastAt=now();n++;channel.send('state',{epoch,n,snapshot:latest});
 };
 const schedule=()=>{const wait=STATE_GAP_MS-(now()-lastAt);if(wait<=0)flush();else if(!timer)timer=setTimeout(flush,wait);};
 const resend=()=>{last='';schedule();};
 const onHello=(raw:unknown)=>{
  if(!isObj(raw)||typeof raw.device!=='string'||!ID_RE.test(raw.device))return;
  const device=raw.device,t=now();
  let entry=devices.get(device);
  if(entry&&t-entry.lastHelloAt<HELLO_GAP_MS)return;
  if(!entry){
   if(count('approved')>=MAX_REMOTES){access(device,'full');return;}
   if(count('pending')>=MAX_PENDING)return;
   const again=!!opts.preapproved?.includes(device);
   entry={device,name:cleanText(raw.name,8)||remoteIcon(device),state:again?'approved':'pending',lastHelloAt:t};
   devices.set(device,entry);changed();
  }
  entry.lastHelloAt=t;
  access(device,entry.state);
  if(entry.state==='approved'){opts.onRemoteSeen?.();resend();}
 };
 return {
  epoch,
  connect(onRaw){
   open=true;
   channel.on('cmd',raw=>{const cmd=filter.accept(raw);if(cmd){opts.onRemoteSeen?.();onRaw(cmd);}});
   channel.on('hello',onHello);
   // 허용 전에 페이지를 닫은 휴대폰은 요청 목록에서 뺀다(허용된 자리는 선생님이 '끊기'로만 비운다).
   channel.on('bye',raw=>{if(isObj(raw)&&typeof raw.device==='string'&&devices.get(raw.device)?.state==='pending'){devices.delete(raw.device);changed();}});
   const close=channel.open(s=>opts.onStatus?.(s));
   beat=loose(setInterval(()=>{if(open&&count('approved'))channel.send('beat',{epoch});},opts.beatMs??BEAT_MS));
   return ()=>{
    if(timer){clearTimeout(timer);timer=null;}
    // 닫기 전에 마지막 상태(결과 화면 등)를 보내고 '끝났어요'를 알린다.
    if(latest&&JSON.stringify(latest)!==last){n++;channel.send('state',{epoch,n,snapshot:latest});}
    if(!reloading)channel.send('closed',{epoch,reason:'stopped'});
    open=false;if(beat){clearInterval(beat);beat=null;}
    close();
   };
  },
  publishState(snapshot){latest=snapshot;schedule();},
  approve(device){
   const entry=devices.get(device);if(!entry||entry.state==='approved')return;
   if(count('approved')>=MAX_REMOTES){devices.delete(device);access(device,'full');changed();return;}
   entry.state='approved';access(device,'approved');changed();opts.onRemoteSeen?.();resend();
  },
  reject(device){
   if(!devices.has(device))return;
   devices.delete(device);filter.forget(device);access(device,'rejected');changed();
  },
  disconnectAll(reason='rotated'){
   channel.send('closed',{epoch,reason});
   for(const d of devices.keys())filter.forget(d);
   devices.clear();changed();
  },
  notifyReload(){reloading=true;channel.send('closed',{epoch,reason:'reload'});},
  devices:list,
 };
}

/* ───────── 휴대폰 쪽 ───────── */
/** asking: 연결 요청 중 · pending: TV 허용 기다림 · stale: TV 응답 없음 · closed: TV가 연결을 끝냄 */
export type RemoteAccess='asking'|'pending'|'approved'|'rejected'|'full'|'closed'|'stale';
/** 리모컨 쪽: 연결을 요청하고, 허용되면 명령을 보내고, TV 상태를 받는다. 시각은 이 기기 안에서 잰 간격만 쓴다. */
export function createRemoteSender(channel:RemoteChannel,opts:{now?:()=>number;device?:string;name?:string;onState?:(s:FunRemoteSnapshot)=>void;onStatus?:(s:RemoteStatus)=>void;onAccess?:(a:RemoteAccess)=>void;timeoutMs?:number;tickMs?:number}={}){
 const now=opts.now??Date.now;
 const device=opts.device??randomId();
 const name=opts.name??remoteIcon(device);
 const timeout=opts.timeoutMs??BEAT_TIMEOUT_MS;
 // seq는 이 휴대폰 시계에서 시작해 늘어난다. 같은 기기 id로 페이지를 다시 열어도 앞의 seq보다 커서 TV가 받아 준다
 // (TV와 시계를 맞출 필요는 없다: 같은 휴대폰의 앞뒤 값끼리만 비교된다).
 let seq=Math.max(0,Math.floor(now())),epoch:string|null=null,lastN=0,access:RemoteAccess='asking',lastHeard=now(),connected=false;
 const setAccess=(a:RemoteAccess)=>{if(a!==access){access=a;opts.onAccess?.(a);}};
 const fromTv=(e:unknown)=>typeof e==='string'&&!!epoch&&e===epoch;
 const heard=()=>{lastHeard=now();if(access==='stale')setAccess('approved');};
 channel.on('access',raw=>{
  if(!isObj(raw)||raw.device!==device||typeof raw.epoch!=='string'||!ID_RE.test(raw.epoch))return;
  const state=raw.state;
  if(state!=='pending'&&state!=='approved'&&state!=='rejected'&&state!=='full')return;
  if(access==='closed'||access==='rejected')return;
  // TV가 새로고침돼 새 epoch로 다시 허용하면(같은 방 코드) 그 TV로 옮겨 간다. 응답이 끊긴(stale) 동안에만.
  if(epoch&&raw.epoch!==epoch){if(access!=='stale')return;epoch=null;}
  lastHeard=now();
  // 처음 받은 TV(epoch)를 기억한다. 허용 전(pending)이라도 그 TV가 '모두 끊기'하면 알 수 있게.
  if(!epoch&&(state==='pending'||state==='approved')){epoch=raw.epoch;lastN=0;}
  setAccess(state);
 });
 channel.on('state',raw=>{
  if(!isObj(raw)||!fromTv(raw.epoch)||(access!=='approved'&&access!=='stale'))return;
  const n=raw.n;
  if(typeof n!=='number'||!Number.isSafeInteger(n)||n<=lastN)return;
  const snap=parseSnapshot(raw.snapshot);if(!snap)return;
  heard();lastN=n;opts.onState?.(snap);
 });
 channel.on('beat',raw=>{if(isObj(raw)&&fromTv(raw.epoch))heard();});
 channel.on('closed',raw=>{
  if(!isObj(raw)||!fromTv(raw.epoch))return;
  // 새로고침: 곧 같은 코드로 돌아오므로 'TV 응답 없음'으로 두고 다시 묻는다.
  if(raw.reason==='reload'&&(access==='approved'||access==='stale')){setAccess('stale');return;}
  epoch=null;setAccess('closed');
 });
 const hello=()=>{if(connected&&(access==='asking'||access==='pending'||access==='stale'))channel.send('hello',{device,name});};
 const check=()=>{if(access==='approved'&&now()-lastHeard>timeout)setAccess('stale');return access;};
 const close=channel.open(s=>{opts.onStatus?.(s);connected=s==='connected';if(connected){lastHeard=now();hello();}});
 // 허용을 기다리는 동안에는 몇 초마다 다시 묻고(TV가 늦게 열렸을 때), 허용 뒤에는 TV 소식이 끊기면 'TV 응답 없음'.
 const timer=loose(setInterval(()=>{hello();check();},opts.tickMs??2000));
 return {
  device,name,
  get access(){return access;},
  /** 허용된 상태에서만 보낸다. 보냈으면 true. */
  send(command:ExternalFunCommand){if(!epoch||access!=='approved')return false;seq++;channel.send('cmd',{device,epoch,seq,command});return true;},
  check,
  close(){clearInterval(timer);if(connected&&access==='pending')channel.send('bye',{device});close();},
 };
}

/** 휴대폰 탭마다 한 번 만든 기기 id(새로고침해도 같은 id → 이미 허용된 휴대폰은 다시 묻지 않는다). */
export function stableRemoteDevice(storage:Pick<Storage,'getItem'|'setItem'>|null=typeof sessionStorage==='undefined'?null:sessionStorage):string{
 const key='fun-remote:device';
 try{const v=storage?.getItem(key);if(v&&ID_RE.test(v))return v;}catch{/* 저장 못 함 */}
 const id=randomId();
 try{storage?.setItem(key,id);}catch{/* 저장 못 해도 이번 페이지에서는 동작 */}
 return id;
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
