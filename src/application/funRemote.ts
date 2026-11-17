import {parseFunCommand,type FunPhase} from '../domain/funLoop';
import type {ExternalFunCommand,FunRemoteSnapshot,FunTransport} from './funCommandBus';

/**
 * 휴대폰 리모컨 ↔ TV 연결. 실제 전송은 Supabase Realtime broadcast 채널(`fun-remote:방코드`)이고,
 * 테이블·스키마는 쓰지 않는다. 전송 방법은 RemoteChannel 하나로 감싸서, 테스트는 가짜 채널로 돌린다.
 *
 * 방 코드는 TV 화면에 크게 보이고 broadcast는 같은 방 누구에게나 보이므로, 허용과 서명 두 겹으로 막는다.
 *  1) 휴대폰 → TV  'hello' {device,pub}   : 연결 요청. device는 공개키 지문(TV가 다시 계산해 맞춰 본다).
 *  2) TV → 휴대폰  'access' {device,state} : pending·approved·rejected·full·busy. 선생님이 확인 번호를 맞춰 보고 '허용'.
 *  3) 휴대폰 → TV  'cmd' {device,epoch,seq,command,sig} : 휴대폰 키로 서명. 허용된 기기의, 지금 epoch의,
 *     seq가 늘어나는(한 번에 MAX_SEQ_JUMP 이하) 명령만, 1초에 CMD_PER_SEC번까지 받는다. 보낸 쪽 시계는 쓰지 않는다.
 *  4) TV → 휴대폰  'ack'(받음/반영 안 됨) · 'state'(바뀔 때만, 1초에 4번 이하) · 'beat'(살아 있음) · 'closed'(끝)
 *     TV 메시지는 모두 {epoch,k,body,tv,sig}: TV 키로 서명하고 k가 늘어나야 받는다. 휴대폰은 처음 받은 TV 키를 고정한다.
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
/** 휴대폰이 TV 소식을 이만큼 못 받으면 'TV 응답 없음'(가려진 TV 탭은 타이머가 느려지므로 넉넉히). */
export const PHONE_STALE_MS=15_000;
/** 예전 이름(호환). */
export const BEAT_TIMEOUT_MS=PHONE_STALE_MS;
/** 연결을 요청했는데 이만큼 아무 TV도 답하지 않으면 '이 코드는 끝났어요'. */
export const GONE_AFTER_MS=6_000;
/** 허용을 기다리는 요청은 이만큼 다시 묻지 않으면 목록에서 뺀다. */
export const PENDING_TTL_MS=10_000;
/** seq가 한 번에 이만큼 넘게 뛰면 버린다(한 메시지로 기기를 못 쓰게 만들지 못하게). */
export const MAX_SEQ_JUMP=1000;
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

/* ───────── 휴대폰이 받는 TV 상태 검사 ───────── */
const PHASES:readonly FunPhase[]=['demo','tutorial','play','climax','result'];
const EVENT_KINDS=['golden','reverse','freeze','speed'] as const;
/** TV 상태를 믿기 전에 모양·범위를 검사한다. 맞지 않으면 null(화면은 그대로). */
export function parseSnapshot(raw:unknown):FunRemoteSnapshot|null{
 if(!isObj(raw))return null;
 const {teams,scores,phase,secondsLeft,combo}=raw;
 if(typeof teams!=='number'||!Number.isInteger(teams)||teams<1||teams>4)return null;
 if(!Array.isArray(scores)||scores.length!==teams||!scores.every(n=>typeof n==='number'&&Number.isInteger(n)&&Math.abs(n)<=9999))return null;
 if(typeof phase!=='string'||!PHASES.includes(phase as FunPhase))return null;
 if(typeof secondsLeft!=='number'||!Number.isFinite(secondsLeft)||secondsLeft<0||secondsLeft>3600)return null;
 if(typeof combo!=='number'||!Number.isFinite(combo)||combo<0||combo>100)return null;
 const snap:FunRemoteSnapshot={
  gameId:cleanText(raw.gameId,40),gameName:cleanText(raw.gameName,40)||'대표 게임',phase:phase as FunPhase,paused:raw.paused===true,
  secondsLeft:Math.round(secondsLeft),teams,scores:[...scores] as number[],scoreLabel:cleanText(raw.scoreLabel,40),
  cue:cleanText(raw.cue,120),combo:Math.round(combo),comboFull:raw.comboFull===true,
 };
 const label=cleanText(raw.phaseLabel,20);if(label)snap.phaseLabel=label;
 if(Array.isArray(raw.events))snap.events=EVENT_KINDS.filter(e=>(raw.events as unknown[]).includes(e));
 return snap;
}

/* ───────── 서명(WebCrypto ECDSA P-256) ───────── */
/**
 * 방 코드는 화면에 보이고 broadcast는 같은 방 누구에게나 보이므로, 기기 id만으로는 사칭을 막을 수 없다.
 * 그래서 휴대폰과 TV가 각자 키 쌍을 만들고 모든 메시지에 서명한다.
 *  - 휴대폰 id = 공개키 지문(fingerprint). TV는 서명을 확인한 명령만 받는다.
 *  - TV도 서명한다. 휴대폰은 처음 받은 TV 공개키를 고정(pin)하고, 다른 키로 서명된 TV 메시지는 버린다.
 *  - 선생님은 TV와 휴대폰에 뜨는 4자리 확인 번호(지문에서 계산)를 맞춰 보고 허용한다.
 */
export interface RemotePub {x:string;y:string}
export interface RemoteKeys {privateKey:CryptoKey;pub:RemotePub;fp:string}
type KeyStore={get():string|null;set(v:string):void};
const ALG={name:'ECDSA',namedCurve:'P-256'} as const;
const SIG={name:'ECDSA',hash:'SHA-256'} as const;
const subtle=()=>globalThis.crypto.subtle;
const enc=new TextEncoder();
const B64URL_43=/^[A-Za-z0-9_-]{43}$/;
const toB64=(buf:ArrayBuffer)=>{let s='';for(const b of new Uint8Array(buf))s+=String.fromCharCode(b);return btoa(s);};
const fromB64=(s:string)=>{const bin=atob(s);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
export const isRemotePub=(v:unknown):v is RemotePub=>isObj(v)&&typeof v.x==='string'&&typeof v.y==='string'&&B64URL_43.test(v.x)&&B64URL_43.test(v.y);
const pubId=(pub:RemotePub)=>`${pub.x}.${pub.y}`;
/** 공개키 지문: SHA-256 앞 8바이트를 16진수 대문자로(16글자). 기기 id로 쓴다. */
export async function remoteFingerprint(pub:RemotePub):Promise<string>{
 const h=await subtle().digest('SHA-256',enc.encode(pubId(pub)));
 return [...new Uint8Array(h)].slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
/** 사람이 맞춰 보는 4자리 확인 번호. */
export const confirmCode=(fp:string)=>String(Number.parseInt(fp.slice(0,8),16)%10000).padStart(4,'0');
const verifyKeys=new Map<string,Promise<CryptoKey>>();
const verifyKeyOf=(pub:RemotePub)=>{
 const id=pubId(pub);let k=verifyKeys.get(id);
 if(!k){
  k=subtle().importKey('jwk',{kty:'EC',crv:'P-256',x:pub.x,y:pub.y,ext:true},ALG,false,['verify']);
  verifyKeys.set(id,k);
  if(verifyKeys.size>64)verifyKeys.delete(verifyKeys.keys().next().value as string);
 }
 return k;
};
export async function signRemote(keys:RemoteKeys,data:unknown):Promise<string>{
 return toB64(await subtle().sign(SIG,keys.privateKey,enc.encode(JSON.stringify(data))));
}
export async function verifyRemote(pub:RemotePub,data:unknown,sig:unknown):Promise<boolean>{
 if(typeof sig!=='string'||sig.length>200)return false;
 try{return await subtle().verify(SIG,await verifyKeyOf(pub),fromB64(sig),enc.encode(JSON.stringify(data)));}catch{return false;}
}
/**
 * 키 쌍을 만들거나(저장소가 있으면) 이어 쓴다. 서명에 쓰는 개인키는 내보낼 수 없게 다시 가져온다.
 * 저장소에는 새로고침해도 같은 기기로 이어지도록 JWK를 둔다(이 탭의 sessionStorage).
 */
export async function loadRemoteKeys(store?:KeyStore|null):Promise<RemoteKeys>{
 try{
  const raw=store?.get();
  if(raw){
   const v=JSON.parse(raw) as {priv?:JsonWebKey;pub?:unknown};
   if(v.priv&&isRemotePub(v.pub)){
    const privateKey=await subtle().importKey('jwk',v.priv,ALG,false,['sign']);
    return {privateKey,pub:{x:v.pub.x,y:v.pub.y},fp:await remoteFingerprint(v.pub)};
   }
  }
 }catch{/* 저장값이 망가졌으면 새로 만든다 */}
 const pair=await subtle().generateKey(ALG,!!store,['sign','verify']) as CryptoKeyPair;
 const pubJwk=await subtle().exportKey('jwk',pair.publicKey);
 const pub={x:pubJwk.x as string,y:pubJwk.y as string};
 let privateKey=pair.privateKey;
 if(store){
  try{
   const priv=await subtle().exportKey('jwk',pair.privateKey);
   store.set(JSON.stringify({priv,pub}));
   privateKey=await subtle().importKey('jwk',priv,ALG,false,['sign']);
  }catch{/* 저장 못 해도 이번 페이지에서는 동작 */}
 }
 return {privateKey,pub,fp:await remoteFingerprint(pub)};
}
/** sessionStorage 한 칸을 키 저장소로(없거나 막히면 null → 메모리에서만). */
export const sessionKeyStore=(key:string):KeyStore|null=>{
 if(typeof sessionStorage==='undefined')return null;
 return {get:()=>{try{return sessionStorage.getItem(key);}catch{return null;}},set:(v:string)=>{try{sessionStorage.setItem(key,v);}catch{/* 저장 못 함 */}}};
};
/** 이 탭(휴대폰)의 리모컨 키. 새로고침해도 같은 키 → 이미 허용된 휴대폰은 다시 묻지 않는다. */
export const loadPhoneKeys=()=>loadRemoteKeys(sessionKeyStore('fun-remote:phone-key'));
/** TV의 방 코드별 키. 같은 코드로 새로고침하면 같은 키 → 휴대폰이 고정한 TV 키와 맞아 그대로 이어진다. */
export const loadTvKeys=(code:string)=>loadRemoteKeys(sessionKeyStore(`fun-remote:tv-key:${code}`));
export const forgetTvKeys=(code:string)=>{try{sessionStorage.removeItem(`fun-remote:tv-key:${code}`);}catch{/* 없음 */}};
/** 이 휴대폰 키로 보낸 마지막 seq를 기억하는 저장소(새로고침해도 이어지게). */
export const phoneSeqStore=(fp:string)=>sessionKeyStore(`fun-remote:seq:${fp}`);

/** 서명하는 내용(배열 순서 고정). */
const tvSigned=(event:string,room:string,epoch:string,k:number,body:unknown)=>[event,room,epoch,k,body];
const cmdSigned=(room:string,epoch:string,seq:number,device:string,command:unknown)=>['cmd',room,epoch,seq,device,command];
const byeSigned=(room:string,device:string)=>['bye',room,device];

/* ───────── TV 쪽 ───────── */
export type RemoteDeviceState='pending'|'approved';
/** name: 확인 번호 4자리(휴대폰 화면의 번호와 같다). */
export interface RemoteDevice {device:string;name:string;state:RemoteDeviceState}
interface DeviceEntry extends RemoteDevice {lastHelloAt:number;lastSeenAt:number;pub:RemotePub}
export type CommandVerdict={ok:true;device:string;seq:number;command:ExternalFunCommand}|{ok:false;device:string;seq:number;reason:'rate'|'jump'|'invalid'};

/**
 * TV가 받은 명령을 걸러 낸다. 서명을 확인한 기기의 명령만 다룬다.
 *  - null: 모르는 기기·서명 틀림·다른 epoch·이미 받은 seq → 조용히 버린다(응답 없음).
 *  - ok:false: 서명은 맞지만 받을 수 없는 명령(너무 잦음·seq가 크게 뜀·모양 틀림) → 휴대폰에 '반영 안 됨'을 알린다.
 * 기기마다 차례대로 확인한다(비동기 확인 때문에 순서가 뒤바뀌지 않게). 시각은 TV가 받은 때(now)만 쓴다.
 */
export function createCommandFilter(opts:{room:string;epoch:string;now?:()=>number;pubOf:(device:string)=>RemotePub|undefined}){
 const now=opts.now??Date.now;
 const seqs=new Map<string,{last:number;recent:number[]}>();
 const chains=new Map<string,Promise<unknown>>();
 const check=async(raw:Record<string,unknown>,device:string,seq:number):Promise<CommandVerdict|null>=>{
  const pub=opts.pubOf(device);if(!pub)return null;
  if(!await verifyRemote(pub,cmdSigned(opts.room,opts.epoch,seq,device,raw.command),raw.sig))return null;
  if(!opts.pubOf(device))return null;
  const entry=seqs.get(device)??{last:0,recent:[]};
  if(seq<=entry.last)return null;
  if(entry.last>0&&seq-entry.last>MAX_SEQ_JUMP)return {ok:false,device,seq,reason:'jump'};
  const t=now();entry.recent=entry.recent.filter(x=>t-x<1000);
  if(entry.recent.length>=CMD_PER_SEC){seqs.set(device,entry);return {ok:false,device,seq,reason:'rate'};}
  const cmd=parseFunCommand(raw.command);
  entry.last=seq;entry.recent.push(t);seqs.set(device,entry);
  if(!cmd)return {ok:false,device,seq,reason:'invalid'};
  return {ok:true,device,seq,command:cmd as ExternalFunCommand};
 };
 return {
  accept(raw:unknown):Promise<CommandVerdict|null>{
   if(!isObj(raw)||typeof raw.device!=='string'||!ID_RE.test(raw.device)||raw.epoch!==opts.epoch)return Promise.resolve(null);
   const seq=raw.seq;
   if(typeof seq!=='number'||!Number.isSafeInteger(seq)||seq<1)return Promise.resolve(null);
   const device=raw.device;
   if(!opts.pubOf(device))return Promise.resolve(null);
   const run=(chains.get(device)??Promise.resolve()).then(()=>check(raw,device,seq));
   const safe=run.catch(()=>null);
   chains.set(device,safe);
   return safe;
  },
  /** 허용이 취소된 기기는 seq 기억도 지운다(다시 허용되면 새로 시작). */
  forget(device:string){seqs.delete(device);chains.delete(device);},
 };
}

export interface TvRemoteControls {
 approve(device:string):void;
 reject(device:string):void;
 /** 모든 휴대폰에 '연결이 끝났어요'를 알리고 허용 목록을 비운다. */
 disconnectAll(reason?:'rotated'|'stopped'):void;
 /** 페이지를 닫거나 새로고침하기 직전: 휴대폰에 '잠시 끊김'을 알린다(같은 코드로 다시 열면 이어진다). */
 notifyReload():void;
 /** 뒤로 가기 캐시(bfcache)로 페이지가 돌아왔을 때: 새로고침 표시를 지우고 살아 있음을 알린다. */
 resumeAfterReload():void;
 /** TV 탭이 가려지거나 다시 보일 때. 가려지면 휴대폰에 알리고, 다시 보이면 바로 살아 있음 신호를 보낸다. */
 setHidden(hidden:boolean):void;
 devices():RemoteDevice[];
 readonly epoch:string;
 /** TV 확인 번호(휴대폰에도 같은 번호가 뜬다). */
 readonly code:string;
}

/** 일시정지 중에는 받지 않는 명령(TV 엔진도 무시한다). */
const SCORE_LIKE=new Set(['score','scoreAll','event','special','combo']);
/**
 * TV 쪽: 명령 버스에 붙이는 전송 + 허용 관리.
 * 상태 알림은 바뀔 때만, 1초에 4번 이하로 보낸다(연결 요청이 쏟아져도 이 간격을 지킨다).
 * TV가 보내는 모든 메시지는 TV 키로 서명하고 번호(k)를 붙인다.
 */
export function createTvTransport(channel:RemoteChannel,opts:{room:string;keys:RemoteKeys;now?:()=>number;onStatus?:(s:RemoteStatus)=>void;onRemoteSeen?:()=>void;onDevices?:(list:RemoteDevice[])=>void;epoch?:string;beatMs?:number;pendingTtlMs?:number;
 /** 같은 방 코드로 다시 연 TV(새로고침)에서, 전에 허용한 휴대폰(지문)은 다시 묻지 않고 허용한다. */ preapproved?:readonly string[]}):FunTransport&TvRemoteControls{
 const now=opts.now??Date.now;
 const {room,keys}=opts;
 const epoch=opts.epoch??randomId();
 const ttl=opts.pendingTtlMs??PENDING_TTL_MS;
 const devices=new Map<string,DeviceEntry>();
 /** 이 연결에서 거절·끊은 휴대폰(다시 요청해도 받지 않는다. 새 코드에서는 다시 요청할 수 있다). */
 const rejected=new Set<string>();
 const filter=createCommandFilter({room,epoch,now,pubOf:d=>{const e=devices.get(d);return e?.state==='approved'?e.pub:undefined;}});
 let last='',lastAt=-Infinity,latest:FunRemoteSnapshot|null=null,timer:ReturnType<typeof setTimeout>|null=null,beat:ReturnType<typeof setInterval>|null=null,k=0,open=false,reloading=false,hidden=false;
 let out:Promise<unknown>=Promise.resolve();
 /** 서명해서 보낸다. 순서가 바뀌지 않게 하나씩 이어서 보낸다. */
 const tvSend=(event:string,body:Record<string,unknown>)=>{
  const kk=++k;
  out=out.then(async()=>{const sig=await signRemote(keys,tvSigned(event,room,epoch,kk,body));channel.send(event,{epoch,k:kk,body,tv:keys.pub,sig});}).catch(()=>{});
  return out;
 };
 const list=():RemoteDevice[]=>[...devices.values()].map(({device,name,state})=>({device,name,state}));
 const changed=()=>opts.onDevices?.(list());
 const count=(state:RemoteDeviceState)=>[...devices.values()].filter(d=>d.state===state).length;
 const access=(device:string,state:'pending'|'approved'|'rejected'|'full'|'busy')=>tvSend('access',{device,state});
 const prune=()=>{
  let gone=false;const t=now();
  for(const [id,d] of devices)if(d.state==='pending'&&t-d.lastSeenAt>ttl){devices.delete(id);gone=true;}
  if(gone)changed();
 };
 const flush=()=>{
  timer=null;if(!latest||!open)return;
  const s=JSON.stringify(latest);if(s===last)return;
  last=s;lastAt=now();void tvSend('state',{snapshot:latest,hidden});
 };
 const schedule=()=>{const wait=STATE_GAP_MS-(now()-lastAt);if(wait<=0)flush();else if(!timer)timer=setTimeout(flush,wait);};
 const resend=()=>{last='';schedule();};
 const onHello=async(raw:unknown)=>{
  if(!isObj(raw)||typeof raw.device!=='string'||!ID_RE.test(raw.device)||!isRemotePub(raw.pub))return;
  const device=raw.device,pub={x:raw.pub.x,y:raw.pub.y};
  if(rejected.has(device))return;
  const known=devices.get(device);
  if(known){if(pubId(known.pub)!==pubId(pub))return;known.lastSeenAt=now();if(now()-known.lastHelloAt<HELLO_GAP_MS)return;}
  else if(await remoteFingerprint(pub)!==device)return;
  prune();
  let entry=devices.get(device);
  const t=now();
  if(!entry){
   const again=!!opts.preapproved?.includes(device);
   if(!again&&count('approved')>=MAX_REMOTES){void access(device,'full');return;}
   if(!again&&count('pending')>=MAX_PENDING){void access(device,'busy');return;}
   if(again&&count('approved')>=MAX_REMOTES){void access(device,'full');return;}
   entry={device,name:confirmCode(device),state:again?'approved':'pending',lastHelloAt:t,lastSeenAt:t,pub};
   devices.set(device,entry);changed();
  }else if(t-entry.lastHelloAt<HELLO_GAP_MS)return;
  entry.lastHelloAt=t;entry.lastSeenAt=t;
  void access(device,entry.state);
  if(entry.state==='approved'){opts.onRemoteSeen?.();resend();}
 };
 const blockedNow=(cmd:ExternalFunCommand)=>{
  if(!latest)return null;
  if(latest.paused&&SCORE_LIKE.has(cmd.type))return 'paused';
  if(cmd.type==='event'&&latest.events&&!latest.events.includes(cmd.event))return 'event';
  return null;
 };
 const sendBeat=()=>{if(open&&count('approved'))void tvSend('beat',{hidden});};
 /** 페이지를 닫는 순간에는 비동기 서명을 기다릴 수 없으므로, '잠시 끊김' 알림은 미리 서명해 둔다(이 연결의 마지막 번호). */
 const RELOAD_K=Number.MAX_SAFE_INTEGER;
 let reloadNotice:Record<string,unknown>|null=null;
 void signRemote(keys,tvSigned('closed',room,epoch,RELOAD_K,{reason:'reload'})).then(sig=>{reloadNotice={epoch,k:RELOAD_K,body:{reason:'reload'},tv:keys.pub,sig};}).catch(()=>{});
 return {
  epoch,code:confirmCode(keys.fp),
  connect(onRaw){
   open=true;
   channel.on('cmd',raw=>{void filter.accept(raw).then(v=>{
    if(!v||!open)return;
    const blocked=v.ok?blockedNow(v.command):null;
    if(!v.ok||blocked){void tvSend('ack',{device:v.device,seq:v.seq,ok:false,reason:v.ok?blocked:v.reason});return;}
    void tvSend('ack',{device:v.device,seq:v.seq,ok:true});
    opts.onRemoteSeen?.();onRaw(v.command);
   });});
   channel.on('hello',raw=>{void onHello(raw);});
   // 허용 전에 페이지를 닫은 휴대폰은 요청 목록에서 뺀다(서명 확인. 허용된 자리는 선생님이 '끊기'로만 비운다).
   channel.on('bye',raw=>{
    if(!isObj(raw)||typeof raw.device!=='string')return;
    const entry=devices.get(raw.device);if(entry?.state!=='pending')return;
    void verifyRemote(entry.pub,byeSigned(room,entry.device),raw.sig).then(ok=>{if(ok&&devices.get(entry.device)?.state==='pending'){devices.delete(entry.device);changed();}});
   });
   const close=channel.open(s=>opts.onStatus?.(s));
   beat=loose(setInterval(()=>{prune();sendBeat();},opts.beatMs??BEAT_MS));
   // 같은 코드로 다시 연 TV: 전에 허용한 휴대폰에 먼저 알려, 휴대폰이 묻기 전에 새 연결로 옮겨 오게 한다.
   for(const device of opts.preapproved??[])if(ID_RE.test(device))void access(device,'approved');
   return ()=>{
    if(timer){clearTimeout(timer);timer=null;}
    // 닫기 전에 마지막 상태(결과 화면 등)를 보내고 '끝났어요'를 알린다.
    if(latest&&JSON.stringify(latest)!==last){last=JSON.stringify(latest);void tvSend('state',{snapshot:latest,hidden});}
    if(!reloading)void tvSend('closed',{reason:'stopped'});
    open=false;if(beat){clearInterval(beat);beat=null;}
    void out.then(()=>close());
   };
  },
  publishState(snapshot){latest=snapshot;schedule();},
  approve(device){
   const entry=devices.get(device);if(!entry||entry.state==='approved')return;
   if(count('approved')>=MAX_REMOTES){devices.delete(device);void access(device,'full');changed();return;}
   entry.state='approved';void access(device,'approved');changed();opts.onRemoteSeen?.();resend();
  },
  reject(device){
   if(!devices.has(device))return;
   devices.delete(device);rejected.add(device);filter.forget(device);void access(device,'rejected');changed();
  },
  disconnectAll(reason='rotated'){
   void tvSend('closed',{reason});
   for(const d of devices.keys())filter.forget(d);
   devices.clear();changed();
  },
  notifyReload(){reloading=true;if(reloadNotice)channel.send('closed',reloadNotice);else void tvSend('closed',{reason:'reload'});},
  resumeAfterReload(){reloading=false;sendBeat();resend();},
  setHidden(h){if(h===hidden)return;hidden=h;sendBeat();if(!h)resend();},
  devices:list,
 };
}

/* ───────── 휴대폰 쪽 ───────── */
/** asking: 연결 요청 중 · pending: TV 허용 기다림 · busy: TV에 요청이 밀려 있음 · gone: 응답 없는 코드 ·
 *  stale: TV 응답 없음 · closed: TV가 연결을 끝냄 */
export type RemoteAccess='asking'|'pending'|'approved'|'rejected'|'full'|'busy'|'gone'|'closed'|'stale';
export interface RemoteAck {seq:number;ok:boolean;reason?:string}

/**
 * 리모컨 쪽: 연결을 요청하고, 허용되면 서명한 명령을 보내고, TV 상태를 받는다.
 * TV 메시지는 처음 받은 TV 키(고정)로 서명을 확인한 것만 믿는다. 시각은 이 기기 안에서 잰 간격만 쓴다.
 */
export function createRemoteSender(channel:RemoteChannel,opts:{room:string;keys:RemoteKeys;now?:()=>number;onState?:(s:FunRemoteSnapshot)=>void;onStatus?:(s:RemoteStatus)=>void;onAccess?:(a:RemoteAccess)=>void;onAck?:(a:RemoteAck)=>void;onTvHidden?:(hidden:boolean)=>void;onTvCode?:(code:string)=>void;
 timeoutMs?:number;tickMs?:number;goneMs?:number;seqStore?:KeyStore|null}){
 const now=opts.now??Date.now;
 const {room,keys}=opts;
 const device=keys.fp;
 const timeout=opts.timeoutMs??PHONE_STALE_MS;
 const goneMs=opts.goneMs??GONE_AFTER_MS;
 // seq는 이 키로 보낸 마지막 번호에 이어서 늘어난다(새로고침해도 이어지게 저장). TV는 크게 뛴 seq를 버린다.
 let seq=Math.max(0,Number.parseInt(opts.seqStore?.get()??'0',10)||0);
 let epoch:string|null=null,lastK=0,access:RemoteAccess='asking',lastHeard=now(),askingSince=now(),connected=false,pinned:RemotePub|null=null;
 const seen=new Set<string>();
 let inbox:Promise<unknown>=Promise.resolve();
 let byeSig:string|null=null;
 void signRemote(keys,byeSigned(room,device)).then(s=>{byeSig=s;}).catch(()=>{});
 const setAccess=(a:RemoteAccess)=>{if(a!==access){access=a;if(a==='asking')askingSince=now();opts.onAccess?.(a);}};
 const heard=()=>{lastHeard=now();if(access==='stale')setAccess('approved');};
 const leaveEpoch=()=>{if(epoch)seen.add(epoch);epoch=null;lastK=0;};
 const handle=async(event:string,raw:unknown)=>{
  if(!isObj(raw)||typeof raw.epoch!=='string'||!ID_RE.test(raw.epoch)||!isObj(raw.body)||!isRemotePub(raw.tv))return;
  const k=raw.k;if(typeof k!=='number'||!Number.isSafeInteger(k)||k<1)return;
  const body=raw.body,tv={x:raw.tv.x,y:raw.tv.y};
  // 고정한 TV 키가 있으면 그 키만. 없으면 내게 온 'access'일 때만 고정한다.
  if(pinned){if(pubId(tv)!==pubId(pinned))return;}
  else if(event!=='access'||body.device!==device)return;
  if(raw.epoch===epoch){if(k<=lastK)return;}
  else{
   // 새 TV 연결(epoch)로는 내게 온 'access'로만 옮겨 간다. 지나간 epoch로는 돌아가지 않는다.
   if(event!=='access'||body.device!==device||seen.has(raw.epoch))return;
   // 고정한 TV 키의 서명이 맞으면(같은 TV가 새로고침) 허용된 상태에서도 옮겨 간다.
  }
  if(!await verifyRemote(tv,tvSigned(event,room,raw.epoch,k,body),raw.sig))return;
  if(!pinned){pinned=tv;opts.onTvCode?.(confirmCode(await remoteFingerprint(tv)));}
  let switched=false;
  if(raw.epoch!==epoch){leaveEpoch();epoch=raw.epoch;switched=true;}
  lastK=k;
  if(event==='access'){
   if(body.device!==device)return;
   const state=body.state;
   if(state!=='pending'&&state!=='approved'&&state!=='rejected'&&state!=='full'&&state!=='busy')return;
   if(access==='closed'||access==='rejected')return;
   lastHeard=now();setAccess(state);
   // 새 TV 연결로 옮겨 왔으면 바로 인사해 공개키를 알린다(새 TV가 이 휴대폰의 서명을 확인할 수 있게).
   if(switched&&state==='approved'&&connected)channel.send('hello',{device,pub:keys.pub});
   // 밀려 있음·꽉 참: 그 TV에 붙지 않고 계속 묻는다(자리가 나면 다시 받는다).
   if(state==='busy'||state==='full'){epoch=null;lastK=0;}
  }else if(event==='state'){
   if(access!=='approved'&&access!=='stale')return;
   const snap=parseSnapshot(body.snapshot);if(!snap)return;
   heard();opts.onTvHidden?.(body.hidden===true);opts.onState?.(snap);
  }else if(event==='beat'){
   if(access!=='approved'&&access!=='stale')return;
   heard();opts.onTvHidden?.(body.hidden===true);
  }else if(event==='closed'){
   // 새로고침: 곧 같은 코드로 돌아오므로, 허용됐으면 'TV 응답 없음'으로, 기다리던 중이면 다시 묻는다.
   if(body.reason==='reload'){
    if(access==='approved'||access==='stale'){setAccess('stale');return;}
    if(access==='pending'||access==='asking'){leaveEpoch();setAccess('asking');return;}
   }
   leaveEpoch();setAccess('closed');
  }else if(event==='ack'){
   if(body.device!==device||typeof body.seq!=='number')return;
   heard();opts.onAck?.({seq:body.seq,ok:body.ok===true,reason:typeof body.reason==='string'?body.reason.slice(0,20):undefined});
  }
 };
 for(const event of ['access','state','beat','closed','ack'])channel.on(event,raw=>{inbox=inbox.then(()=>handle(event,raw)).catch(()=>{});});
 const asking=()=>access==='asking'||access==='pending'||access==='stale'||access==='busy'||access==='gone'||access==='full';
 const hello=()=>{if(connected&&asking())channel.send('hello',{device,pub:keys.pub});};
 const check=()=>{
  if(access==='approved'&&now()-lastHeard>timeout)setAccess('stale');
  if(access==='asking'&&connected&&now()-askingSince>goneMs)setAccess('gone');
  return access;
 };
 const close=channel.open(s=>{opts.onStatus?.(s);connected=s==='connected';if(connected){lastHeard=now();askingSince=now();hello();}});
 // 허용을 기다리는 동안에는 몇 초마다 다시 묻고(TV가 늦게 열렸을 때), 허용 뒤에는 TV 소식이 끊기면 'TV 응답 없음'.
 const timer=loose(setInterval(()=>{hello();check();},opts.tickMs??2000));
 let out:Promise<unknown>=Promise.resolve();
 const bye=()=>{if(connected&&(access==='pending'||access==='asking'||access==='busy')&&byeSig)channel.send('bye',{device,sig:byeSig});};
 return {
  device,
  /** 확인 번호(TV 화면의 요청과 맞춰 본다). */
  code:confirmCode(device),
  get access(){return access;},
  /** 허용된 상태에서만 보낸다. 보냈으면 그 seq(TV의 확인 응답과 맞춰 본다), 못 보냈으면 0. */
  send(command:ExternalFunCommand):number{
   if(!epoch||access!=='approved')return 0;
   const s=++seq,ep=epoch;
   opts.seqStore?.set(String(s));
   out=out.then(async()=>{const sig=await signRemote(keys,cmdSigned(room,ep,s,device,command));channel.send('cmd',{device,epoch:ep,seq:s,command,sig});}).catch(()=>{});
   return s;
  },
  check,
  /** 허용 전에 떠나면 TV 요청 목록에서 빼 달라고 알린다(페이지를 닫을 때도). */
  bye,
  /** 보낼 것이 남아 있으면 다 보낼 때까지 기다린다(테스트용). */
  flushed:()=>out.then(()=>inbox),
  close(){clearInterval(timer);bye();close();},
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
