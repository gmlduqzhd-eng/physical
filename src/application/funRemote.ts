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
 *     TV 메시지는 모두 {epoch,k,body,tv,sig}: TV 키로 서명하고 k가 늘어나야 받는다.
 *
 * TV 키 고정(pin): TV 화면의 QR 주소에는 TV 공개키의 전체 지문(`&tv=…`)이 들어 있다. 휴대폰은 그 지문과 같은
 * TV 키의 메시지만 믿는다(먼저 끼어든 가짜 TV에 붙지 않는다). QR 없이 코드만 넣었으면, 선생님이 휴대폰에 뜬
 * TV 확인 번호를 TV 화면과 맞춰 보고 '같아요'를 눌러야 그 TV에 붙는다(다른 TV 키가 함께 답하면 멈춘다).
 * 서명은 키 순서와 상관없는 정규 JSON 위에서 한다(서버가 키 순서를 바꿔 보내도 깨지지 않게).
 */
export type RemoteStatus='idle'|'connecting'|'connected'|'unavailable'|'error';
export interface RemoteChannel {
 send(event:string,payload:unknown):void;
 on(event:string,handler:(payload:unknown)=>void):void;
 /** 연결 상태가 바뀌면 알린다. 돌려준 함수로 끊는다. */
 open(onStatus:(s:RemoteStatus)=>void):()=>void;
 /** 열지 않고 버릴 때(새 코드로 바뀌어 쓰지 않게 된 채널) 정리한다. */
 dispose?():void;
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
/** 새 연결 요청은 이 시간 동안 이만큼까지만 받는다(새 키로 요청을 쏟아부어도 선생님 화면이 막히지 않게). */
export const ADMIT_WINDOW_MS=2_000;
export const ADMIT_MAX=4;
/** 꽉 차서 밀려난 요청은 잠깐 다시 받지 않는다(요청 카드가 들락날락하며 깜빡이지 않게. 진짜 휴대폰은 2초마다 다시 묻는다). */
export const EVICT_COOLDOWN_MS=3_000;
/** seq가 한 번에 이만큼 넘게 뛰면 받지 않고, 휴대폰이 서명한 '다시 맞추기'(resync)를 받은 뒤 이어 간다. */
export const MAX_SEQ_JUMP=1000;
/** QR로 들어온 휴대폰(방 비밀값으로 인사를 증명)은 이 따로 된 몫으로 받는다(코드만 아는 기기가 쏟아부어도 막히지 않게). */
export const TRUSTED_ADMIT_MAX=6;
/** 지문 확인 전에 보는 요청 수 상한(이만큼 넘으면 '요청이 너무 많아요' 경고). 확인 계산으로 TV가 느려지지 않게 한다. */
export const HELLO_ATTEMPT_MAX=24;
/** 요청이 넘친 뒤 이만큼 조용하면 경고를 내린다. */
export const FLOOD_QUIET_MS=10_000;
/** 코드만 아는 기기(방 비밀값 없음)의 허용 대기는 이만큼까지만(오래 자리를 차지하지 못하게). */
export const ANON_PENDING_MAX_MS=60_000;
/** 확인 번호를 맞춰 볼 때 견주는 최근 기기(밀려남·거절·만료)를 이만큼 기억한다. */
export const RECENT_NAME_MS=60_000;
/** 받았다는 응답이 이만큼 없으면 같은 명령(같은 seq)을 한 번 더 보낸다. */
export const ACK_RETRY_MS=2_500;
/** 다시 보내고도 이만큼 지나면 '반영되지 않았어요'. 그 전까지는 '확인 중…'. */
export const ACK_GIVE_UP_MS=7_000;
/** 서명 확인을 기다리는 명령은 기기마다 이만큼까지(틀린 서명을 쏟아부어 진짜 명령을 늦추지 못하게). */
export const VERIFY_QUEUE_MAX=8;
const STATE_GAP_MS=250;
const HELLO_GAP_MS=1_000;
const ROOM_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH=6;
/** 사람이 맞춰 보는 확인 번호 길이(31글자 알파벳 6자리 ≈ 8.9억 가지: 같은 번호의 키를 미리 만들어 두기 어렵다). */
export const CONFIRM_CODE_LENGTH=6;

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
/** 리모컨 주소. pin(TV 키 전체 지문)이 있으면 함께 넣어, 휴대폰이 그 TV만 믿게 한다. */
export const remoteUrl=(origin:string,code:string,pin?:string,secret?:string)=>`${origin.replace(/\/$/,'')}/fun-remote?room=${encodeURIComponent(code)}${pin&&isRemotePin(pin)?`&tv=${pin}`:''}${secret&&isRoomSecret(secret)?`#k=${secret}`:''}`;
/** 방 비밀값: QR 주소의 # 뒤에만 들어간다(서버로 가지 않고 화면에 글자로 보이지 않는다). 16바이트 base64url. */
const SECRET_RE=/^[A-Za-z0-9_-]{22}$/;
export const isRoomSecret=(v:unknown):v is string=>typeof v==='string'&&SECRET_RE.test(v);
export const generateRoomSecret=(rand:(n:number)=>Uint8Array=n=>crypto.getRandomValues(new Uint8Array(n)))=>{let s='';for(const b of rand(16))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
/** 주소의 # 부분에서 방 비밀값을 읽는다(#k=…). */
export const readRoomSecret=(hash:string|null|undefined)=>{const m=/(?:^#|&)k=([A-Za-z0-9_-]{22})(?:&|$)/.exec(hash??'');return m?m[1]:null;};

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
 // TV가 확인 창을 띄운 동안: 휴대폰이 누르기 전부터 'TV에서 확인 중'을 보여 줄 수 있게 넘긴다.
 if(raw.busy===true)snap.busy=true;
 return snap;
}

/* ───────── 정규 JSON(서명할 내용) ───────── */
/** 객체 키를 정렬해서 직렬화한다. 받은 쪽에서 키 순서가 바뀌어도 같은 문자열이 나온다. */
export function canonicalJson(v:unknown):string{
 if(Array.isArray(v))return `[${v.map(x=>x===undefined?'null':canonicalJson(x)).join(',')}]`;
 if(isObj(v))return `{${Object.keys(v).filter(key=>v[key]!==undefined).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(v[key])}`).join(',')}}`;
 return JSON.stringify(v)??'null';
}

/* ───────── 서명(WebCrypto ECDSA P-256) ───────── */
/**
 * 방 코드는 화면에 보이고 broadcast는 같은 방 누구에게나 보이므로, 기기 id만으로는 사칭을 막을 수 없다.
 * 그래서 휴대폰과 TV가 각자 키 쌍을 만들고 모든 메시지에 서명한다.
 *  - 휴대폰 id = 공개키 지문(fingerprint). TV는 서명을 확인한 명령만 받는다.
 *  - TV도 서명한다. 휴대폰은 QR에 담긴 TV 키 지문(pin)과 같은 키의 메시지만 믿는다.
 *  - 선생님은 TV와 휴대폰에 뜨는 6자리 확인 번호(지문에서 계산)를 맞춰 보고 허용한다.
 * 개인키는 내보낼 수 없는 CryptoKey로 만들고, 새로고침해도 이어지도록 IndexedDB에 CryptoKey 그대로 둔다
 * (개인키 값을 글자로 저장하지 않는다). IndexedDB를 못 쓰면 이번 페이지에서만 쓴다.
 */
export interface RemotePub {x:string;y:string}
export interface RemoteKeys {privateKey:CryptoKey;pub:RemotePub;fp:string}
export interface KeyRecord {privateKey:CryptoKey;pub:RemotePub;at:number}
/**
 * get: 없으면 null. 읽지 못했으면(시간 초과·오류) throw → 있는 키를 덮어쓰지 않고 이번 페이지에서만 쓰는 키를 만든다.
 * add: 비어 있을 때만 쓴다(있으면 false). 없으면 set으로 쓴다.
 */
export interface KeyStore {get():Promise<KeyRecord|null>;set(rec:KeyRecord):Promise<void>;add?(rec:KeyRecord):Promise<boolean>;remove?():Promise<void>}
const ALG={name:'ECDSA',namedCurve:'P-256'} as const;
const SIG={name:'ECDSA',hash:'SHA-256'} as const;
const subtle=()=>globalThis.crypto.subtle;
const enc=new TextEncoder();
const B64URL_43=/^[A-Za-z0-9_-]{43}$/;
const toB64=(buf:ArrayBuffer)=>{let s='';for(const b of new Uint8Array(buf))s+=String.fromCharCode(b);return btoa(s);};
const fromB64=(s:string)=>{const bin=atob(s);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
const toB64Url=(buf:ArrayBuffer)=>toB64(buf).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const isRemotePub=(v:unknown):v is RemotePub=>isObj(v)&&typeof v.x==='string'&&typeof v.y==='string'&&B64URL_43.test(v.x)&&B64URL_43.test(v.y);
export const isRemotePin=(v:unknown):v is string=>typeof v==='string'&&B64URL_43.test(v);
const pubId=(pub:RemotePub)=>`${pub.x}.${pub.y}`;
/** 공개키 지문: SHA-256 앞 8바이트를 16진수 대문자로(16글자). 기기 id로 쓴다. */
export async function remoteFingerprint(pub:RemotePub):Promise<string>{
 const h=await subtle().digest('SHA-256',enc.encode(pubId(pub)));
 return [...new Uint8Array(h)].slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
/** TV 키 고정용 전체 지문(SHA-256 32바이트, base64url 43글자). QR 주소에 넣는다. */
export async function remotePin(pub:RemotePub):Promise<string>{
 return toB64Url(await subtle().digest('SHA-256',enc.encode(`pin:${pubId(pub)}`)));
}
/** 사람이 맞춰 보는 6자리 확인 번호(헷갈리는 글자 없는 31글자 알파벳). 지문 64비트에서 계산한다. */
export function confirmCode(fp:string):string{
 let n=/^[0-9A-F]{16}$/.test(fp)?BigInt(`0x${fp}`):0n;let out='';
 for(let i=0;i<CONFIRM_CODE_LENGTH;i++){out+=ROOM_ALPHABET[Number(n%31n)];n/=31n;}
 return out;
}
/**
 * 휴대폰 확인 번호(SAS). 휴대폰 지문에 TV가 연결마다 새로 정하는 값(epoch)을 섞는다:
 * 지문을 엿본 뒤 미리 같은 번호의 키를 갈아 만들어 둘 수 없다(epoch는 TV가 열린 뒤에야 정해진다).
 */
export async function sasCode(fp:string,nonce:string):Promise<string>{
 const h=new Uint8Array(await subtle().digest('SHA-256',enc.encode(`sas:${fp}:${nonce}`)));
 return confirmCode([...h].slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase());
}
/* 방 비밀값으로 만든 인사 증명(HMAC-SHA256). QR로 들어온 휴대폰만 만들 수 있다. */
const macKeys=new Map<string,Promise<CryptoKey>>();
const macKeyOf=(secret:string)=>{
 let k=macKeys.get(secret);
 if(!k){k=subtle().importKey('raw',fromB64(secret.replace(/-/g,'+').replace(/_/g,'/')+'=='),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);macKeys.set(secret,k);if(macKeys.size>8)macKeys.delete(macKeys.keys().next().value as string);}
 return k;
};
const helloSigned=(room:string,device:string,pub:RemotePub)=>['hello',room,device,pub.x,pub.y];
export async function helloMac(secret:string,room:string,device:string,pub:RemotePub):Promise<string>{
 return toB64Url(await subtle().sign('HMAC',await macKeyOf(secret),enc.encode(canonicalJson(helloSigned(room,device,pub)))));
}
export async function verifyHelloMac(secret:string,room:string,device:string,pub:RemotePub,mac:unknown):Promise<boolean>{
 if(typeof mac!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(mac))return false;
 try{return await subtle().verify('HMAC',await macKeyOf(secret),fromB64(mac.replace(/-/g,'+').replace(/_/g,'/')+'='),enc.encode(canonicalJson(helloSigned(room,device,pub))));}catch{return false;}
}
/** 화면에 보일 때는 3글자씩 띄운다(예: "K7M 2QX"). */
export const formatConfirmCode=(code:string)=>code.length===CONFIRM_CODE_LENGTH?`${code.slice(0,3)} ${code.slice(3)}`:code;
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
 return toB64(await subtle().sign(SIG,keys.privateKey,enc.encode(canonicalJson(data))));
}
export async function verifyRemote(pub:RemotePub,data:unknown,sig:unknown):Promise<boolean>{
 if(typeof sig!=='string'||sig.length>200)return false;
 try{return await subtle().verify(SIG,await verifyKeyOf(pub),fromB64(sig),enc.encode(canonicalJson(data)));}catch{return false;}
}
const isKeyRecord=(v:unknown):v is KeyRecord=>isObj(v)&&isRemotePub(v.pub)&&isObj(v.privateKey)&&(v.privateKey as {type?:unknown}).type==='private';
/**
 * 키 쌍을 만들거나(저장소가 있으면) 이어 쓴다. 개인키는 처음부터 내보낼 수 없게 만든다.
 * 저장소에는 CryptoKey 자체를 둔다(IndexedDB는 CryptoKey를 그대로 담는다. 값은 꺼낼 수 없다).
 */
export async function loadRemoteKeys(store?:KeyStore|null,now:()=>number=Date.now):Promise<RemoteKeys>{
 const fromRec=async(rec:KeyRecord):Promise<RemoteKeys>=>({privateKey:rec.privateKey,pub:{x:rec.pub.x,y:rec.pub.y},fp:await remoteFingerprint(rec.pub)});
 /** 저장소를 읽지 못함(시간 초과 등): 있을지 모르는 키를 덮어쓰지 않는다. */
 let unknown=false;
 try{
  const rec=await store?.get();
  if(isKeyRecord(rec)){
   // 쓸 때마다 마지막 사용 시각을 늘린다(오래 쓴 키가 '오래된 키'로 지워지지 않게).
   try{await store?.set({privateKey:rec.privateKey,pub:rec.pub,at:now()});}catch{/* 못 늘려도 동작 */}
   return fromRec(rec);
  }
 }catch{unknown=true;}
 const pair=await subtle().generateKey(ALG,false,['sign','verify']) as CryptoKeyPair;
 const pubJwk=await subtle().exportKey('jwk',pair.publicKey);
 const pub={x:pubJwk.x as string,y:pubJwk.y as string};
 const rec:KeyRecord={privateKey:pair.privateKey,pub,at:now()};
 if(store&&!unknown){
  try{
   if(store.add){
    // 그 사이 다른 쪽이 먼저 저장했으면 그 키를 쓴다(덮어쓰지 않는다).
    if(!await store.add(rec)){const again=await store.get().catch(()=>null);if(isKeyRecord(again))return fromRec(again);}
   }else await store.set(rec);
  }catch{/* 저장 못 해도 이번 페이지에서는 동작 */}
 }
 return {privateKey:pair.privateKey,pub,fp:await remoteFingerprint(pub)};
}
/** 메모리 저장소(테스트, 또는 IndexedDB를 못 쓸 때). */
export function memoryKeyStore():KeyStore{
 let rec:KeyRecord|null=null;
 return {get:async()=>rec,set:async r=>{rec=r;},add:async r=>{if(rec)return false;rec=r;return true;},remove:async()=>{rec=null;}};
}
const IDB_NAME='physical-fun-remote',IDB_STORE='keys';
let idbOpen:Promise<IDBDatabase>|null=null;
const idbReq=<T,>(r:IDBRequest<T>)=>new Promise<T>((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
/** IndexedDB가 늦게 열리거나(일부 사생활 보호 모드) 막혀도 화면이 멈추지 않게 기다리는 시간을 둔다. */
const withTimeout=<T,>(p:Promise<T>,ms:number,fallback:T)=>Promise.race([p,new Promise<T>(r=>setTimeout(()=>r(fallback),ms))]);
/** 시간이 넘으면 실패로(throw) 끝낸다. 읽기에서 '없음'과 '못 읽음'을 가르려고 쓴다. */
const orTimeout=<T,>(p:Promise<T>,ms:number)=>Promise.race([p,new Promise<T>((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
const idb=()=>{
 if(typeof indexedDB==='undefined')return null;
 idbOpen??=new Promise<IDBDatabase>((res,rej)=>{
  const r=indexedDB.open(IDB_NAME,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IDB_STORE))r.result.createObjectStore(IDB_STORE);};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'));
 }).catch(e=>{idbOpen=null;throw e;});
 return idbOpen;
};
const idbStore=async(mode:IDBTransactionMode)=>{const db=await idb();if(!db)throw new Error('no idb');return db.transaction(IDB_STORE,mode).objectStore(IDB_STORE);};
/** IndexedDB 한 칸을 키 저장소로. IndexedDB가 없으면 null(→ 메모리에서만). */
export function idbKeyStore(id:string):KeyStore|null{
 if(typeof indexedDB==='undefined')return null;
 return {
  // 못 읽으면 throw(없는 것과 다르다): 부르는 쪽이 있는 키를 덮어쓰지 않는다.
  get:()=>orTimeout((async()=>(await idbReq((await idbStore('readonly')).get(id)) as KeyRecord|undefined)??null)(),1500),
  set:rec=>withTimeout((async()=>{try{await idbReq((await idbStore('readwrite')).put(rec,id));}catch{/* 저장 못 함 */}})(),1500,undefined),
  // 비어 있을 때만 쓴다(이미 있으면 IndexedDB가 거절한다).
  add:rec=>withTimeout((async()=>{try{await idbReq((await idbStore('readwrite')).add(rec,id));return true;}catch{return false;}})(),1500,false),
  remove:()=>withTimeout((async()=>{try{await idbReq((await idbStore('readwrite')).delete(id));}catch{/* 없음 */}})(),1500,undefined),
 };
}
/** 오래 쓰지 않은 TV·휴대폰 키(마지막 사용이 기한을 넘은 것)를 IndexedDB에서 지운다. */
async function pruneKeys(maxAgeMs:number){
 if(typeof indexedDB==='undefined')return;
 try{
  const store=await idbStore('readwrite');const now=Date.now();
  await new Promise<void>(res=>{
   const cur=store.openCursor();
   cur.onsuccess=()=>{const c=cur.result;if(!c){res();return;}const v=c.value as KeyRecord|undefined;
    const key=String(c.key);
    if((key.startsWith('tv:')||key.startsWith('phone:'))&&(!v||typeof v.at!=='number'||now-v.at>maxAgeMs))c.delete();c.continue();};
   cur.onerror=()=>res();
  });
 }catch{/* 무시 */}
}
/** 예전 버전이 sessionStorage에 남긴 개인키(JWK)를 지운다. */
function purgeLegacyKeys(){
 if(typeof sessionStorage==='undefined')return;
 try{
  const drop:string[]=[];
  for(let i=0;i<sessionStorage.length;i++){const key=sessionStorage.key(i);if(key&&(key==='fun-remote:phone-key'||key.startsWith('fun-remote:tv-key:')))drop.push(key);}
  drop.forEach(key=>sessionStorage.removeItem(key));
 }catch{/* 무시 */}
}
/** 이 탭을 가리키는 이름(비밀이 아니다). 같은 휴대폰의 다른 탭과 키·seq가 섞이지 않게 한다. */
function tabId(){
 try{
  let id=sessionStorage.getItem('fun-remote:tab');
  if(!id||!/^[A-Z0-9]{12}$/.test(id)){id=randomId();sessionStorage.setItem('fun-remote:tab',id);}
  return id;
 }catch{return null;}
}
/** TV 키를 마지막으로 쓴 뒤 이만큼 지나면 버린다(방 코드 기한과 같게). 휴대폰 키도 같다. */
export const TV_KEY_MAX_AGE_MS=2*60*60*1000;
/**
 * 이 탭(휴대폰)의 리모컨 키. 방 코드마다 새 키(다른 방에서 엿본 지문으로 확인 번호를 미리 맞춰 둘 수 없게).
 * 같은 방에서 새로고침하면 같은 키 → 이미 허용된 휴대폰은 다시 묻지 않는다.
 */
export const loadPhoneKeys=(room?:string)=>{purgeLegacyKeys();void pruneKeys(TV_KEY_MAX_AGE_MS);const tab=tabId();return loadRemoteKeys(tab?idbKeyStore(room?`phone:${tab}:${room}`:`phone:${tab}`):null);};
/** TV의 방 코드별 키. 같은 코드로 새로고침하면 같은 키 → 휴대폰이 고정한 TV 키와 맞아 그대로 이어진다. */
export const loadTvKeys=async(code:string)=>{purgeLegacyKeys();void pruneKeys(TV_KEY_MAX_AGE_MS);return loadRemoteKeys(idbKeyStore(`tv:${code}`));};
/** 쓰고 있는 TV 키의 마지막 사용 시각을 늘린다(2시간 넘게 써도 지워지지 않게). */
export const touchTvKeys=async(code:string)=>{
 const store=idbKeyStore(`tv:${code}`);if(!store)return;
 try{const rec=await store.get();if(isKeyRecord(rec))await store.set({privateKey:rec.privateKey,pub:rec.pub,at:Date.now()});}catch{/* 못 늘려도 동작 */}
};
export const forgetTvKeys=(code:string)=>{void idbKeyStore(`tv:${code}`)?.remove?.();try{sessionStorage.removeItem(`fun-remote:tv-key:${code}`);}catch{/* 없음 */}};
type TextStore={get():string|null;set(v:string):void};
/** sessionStorage 한 칸(글자). 없거나 막히면 null. */
export const sessionTextStore=(key:string):TextStore|null=>{
 if(typeof sessionStorage==='undefined')return null;
 return {get:()=>{try{return sessionStorage.getItem(key);}catch{return null;}},set:(v:string)=>{try{sessionStorage.setItem(key,v);}catch{/* 저장 못 함 */}}};
};
/** 이 휴대폰 키로 보낸 마지막 seq를 기억하는 저장소(새로고침해도 이어지게). 비밀이 아니다. */
export const phoneSeqStore=(fp:string)=>sessionTextStore(`fun-remote:seq:${fp}`);
/** QR 없이 코드로 연결해 선생님이 '같아요'로 확인한 TV 키 지문(이 탭, 이 방 코드). */
export const phonePinStore=(room:string)=>sessionTextStore(`fun-remote:pin:${room}`);

/** 서명하는 내용(배열 순서 고정, 정규 JSON). */
const tvSigned=(event:string,room:string,epoch:string,k:number,body:unknown)=>[event,room,epoch,k,body];
const cmdSigned=(room:string,epoch:string,seq:number,device:string,command:unknown)=>['cmd',room,epoch,seq,device,command];
const byeSigned=(room:string,epoch:string,device:string,n:number)=>['bye',room,epoch,device,n];
const resyncSigned=(room:string,epoch:string,device:string,seq:number)=>['resync',room,epoch,device,seq];

/* ───────── TV 쪽 ───────── */
export type RemoteDeviceState='pending'|'approved';
/**
 * name: 확인 번호 6자리(휴대폰 화면의 번호와 같다).
 * trusted: QR로 들어와 방 비밀값으로 인사를 증명함. twin: 같은 확인 번호의 다른 기기가 있거나 최근에 있었음(허용하지 않는다).
 */
export interface RemoteDevice {device:string;name:string;state:RemoteDeviceState;trusted?:boolean;twin?:boolean}
interface DeviceEntry extends RemoteDevice {lastHelloAt:number;lastSeenAt:number;createdAt:number;pub:RemotePub;trusted:boolean}
export type CommandVerdict=
 |{ok:true;device:string;seq:number;command:ExternalFunCommand}
 |{ok:false;device:string;seq:number;reason:'rate'|'jump'|'invalid'}
 /** 이미 받은 seq를 휴대폰이 다시 보냈다(응답이 사라졌을 때). 다시 반영하지 않고 같은 응답만 다시 보낸다. */
 |{dup:true;ok?:undefined;device:string;seq:number};

/**
 * TV가 받은 명령을 걸러 낸다. 서명을 확인한 기기의 명령만 다룬다.
 *  - null: 모르는 기기·서명 틀림·다른 epoch·이미 받은 seq → 조용히 버린다(응답 없음).
 *  - ok:false: 서명은 맞지만 받을 수 없는 명령(너무 잦음·seq가 크게 뜀·모양 틀림) → 휴대폰에 '반영 안 됨'을 알린다.
 * 기기마다 차례대로 확인한다(비동기 확인 때문에 순서가 뒤바뀌지 않게). 시각은 TV가 받은 때(now)만 쓴다.
 * 확인을 기다리는 명령은 기기마다 VERIFY_QUEUE_MAX개까지(틀린 서명을 쏟아부어 진짜 명령을 늦추지 못하게).
 * 이미 받은 seq는 서명이 맞으면 {dup}으로 알린다(휴대폰이 응답을 못 받아 다시 보낸 것: 같은 응답만 다시 보낸다).
 */
export function createCommandFilter(opts:{room:string;epoch:string;now?:()=>number;pubOf:(device:string)=>RemotePub|undefined}){
 const now=opts.now??Date.now;
 const seqs=new Map<string,{last:number;recent:number[]}>();
 const chains=new Map<string,Promise<unknown>>();
 const depth=new Map<string,number>();
 const queue=<T,>(device:string,job:()=>Promise<T>):Promise<T|null>=>{
  const d=depth.get(device)??0;
  if(d>=VERIFY_QUEUE_MAX)return Promise.resolve(null);
  depth.set(device,d+1);
  const run=(chains.get(device)??Promise.resolve()).then(job);
  const safe=run.catch(()=>null).finally(()=>{const n=(depth.get(device)??1)-1;if(n<=0)depth.delete(device);else depth.set(device,n);});
  chains.set(device,safe);return safe;
 };
 const check=async(raw:Record<string,unknown>,device:string,seq:number):Promise<CommandVerdict|null>=>{
  const pub=opts.pubOf(device);if(!pub)return null;
  if(!await verifyRemote(pub,cmdSigned(opts.room,opts.epoch,seq,device,raw.command),raw.sig))return null;
  if(!opts.pubOf(device))return null;
  const entry=seqs.get(device)??{last:0,recent:[]};
  if(seq<=entry.last)return {dup:true,device,seq};
  if(entry.last>0&&seq-entry.last>MAX_SEQ_JUMP)return {ok:false,device,seq,reason:'jump'};
  const t=now();entry.recent=entry.recent.filter(x=>t-x<1000);
  if(entry.recent.length>=CMD_PER_SEC){seqs.set(device,entry);return {ok:false,device,seq,reason:'rate'};}
  const cmd=parseFunCommand(raw.command);
  entry.last=seq;entry.recent.push(t);seqs.set(device,entry);
  if(!cmd)return {ok:false,device,seq,reason:'invalid'};
  return {ok:true,device,seq,command:cmd as ExternalFunCommand};
 };
 const shape=(raw:unknown):raw is Record<string,unknown>&{device:string;seq:number}=>isObj(raw)&&typeof raw.device==='string'&&ID_RE.test(raw.device)&&raw.epoch===opts.epoch&&typeof raw.seq==='number'&&Number.isSafeInteger(raw.seq)&&raw.seq>=1&&!!opts.pubOf(raw.device);
 return {
  accept(raw:unknown):Promise<CommandVerdict|null>{
   if(!shape(raw))return Promise.resolve(null);
   return queue(raw.device,()=>check(raw,raw.device,raw.seq));
  },
  /**
   * seq가 크게 뛰어 거절된 기기가 서명해 보낸 '다시 맞추기'. 지금보다 큰 seq로만 옮긴다(되돌릴 수 없으니 다시 보내기로 쓸 수 없다).
   * 돌려준 값: 옮겼으면 true.
   */
  resync(raw:unknown):Promise<boolean>{
   if(!shape(raw))return Promise.resolve(false);
   const device=raw.device,seq=raw.seq;
   return queue(device,async()=>{
    const pub=opts.pubOf(device);if(!pub)return false;
    if(!await verifyRemote(pub,resyncSigned(opts.room,opts.epoch,device,seq),raw.sig))return false;
    const entry=seqs.get(device)??{last:0,recent:[]};
    if(seq<=entry.last)return false;
    entry.last=seq;seqs.set(device,entry);return true;
   }).then(v=>v===true);
  },
  /** 허용이 취소된 기기는 seq 기억도 지운다(다시 허용되면 새로 시작). */
  forget(device:string){seqs.delete(device);chains.delete(device);depth.delete(device);},
 };
}

export interface TvRemoteControls {
 approve(device:string):void;
 reject(device:string):void;
 /** 모든 휴대폰에 '연결이 끝났어요'를 알리고 허용 목록을 비운다. */
 disconnectAll(reason?:'rotated'|'stopped'):void;
 /**
  * 선생님이 게임을 나갈 때(목록으로): 휴대폰에 '연결이 끝났어요'를 알린다.
  * 화면이 바뀌어 연결을 떼어 낼 때(detach)는 알리지 않는다: 같은 방 코드로 곧 다시 붙는다.
  */
 stop():void;
 /** 페이지를 닫거나 새로고침하기 직전: 휴대폰에 '잠시 끊김'을 알린다(같은 코드로 다시 열면 이어진다). */
 notifyReload():void;
 /** 뒤로 가기 캐시(bfcache)로 페이지가 돌아왔을 때: 새로고침 표시를 지우고 살아 있음을 알린다. */
 resumeAfterReload():void;
 /** TV 탭이 가려지거나 다시 보일 때. 가려지면 휴대폰에 알리고, 다시 보이면 바로 살아 있음 신호를 보낸다. */
 setHidden(hidden:boolean):void;
 devices():RemoteDevice[];
 /** 연결 요청이 너무 많이 들어오는 중인지('새 코드 만들기'를 권한다). */
 flooded():boolean;
 readonly epoch:string;
 /** TV 확인 번호(휴대폰에도 같은 번호가 뜬다). */
 readonly code:string;
}

/** 일시정지 중에는 받지 않는 명령(TV 엔진도 무시한다). '다음'도 다시 시작한 뒤에 받는다. */
const PAUSED_BLOCKED=new Set(['score','scoreAll','event','special','combo','next']);
/** 응답을 다시 보낼 수 있게 기기마다 기억하는 최근 응답 수. */
const ACK_CACHE=16;
/**
 * TV 쪽: 명령 버스에 붙이는 전송 + 허용 관리.
 * 상태 알림은 허용된 휴대폰이 있을 때만, 바뀔 때만, 1초에 4번 이하로 보낸다(연결 요청이 쏟아져도 이 간격을 지킨다).
 * TV가 보내는 모든 메시지는 TV 키로 서명하고 번호(k)를 붙인다.
 *
 * 연결 요청은 두 줄로 받는다.
 *  - 믿는 줄: QR로 들어와 방 비밀값(secret)으로 인사를 증명한 휴대폰. 코드만 아는 기기의 몫과 따로 센다.
 *  - 보통 줄: 코드만 넣은 휴대폰. 지문 확인을 통과한 요청만 몫에 넣고, 대기 자리가 꽉 차면 먼저 밀려난다.
 * 요청이 넘치면 onFlood(true)로 알린다(TV 화면: '연결 요청이 너무 많아요 · 새 코드 만들기').
 */
export function createTvTransport(channel:RemoteChannel,opts:{room:string;keys:RemoteKeys;now?:()=>number;onStatus?:(s:RemoteStatus)=>void;onRemoteSeen?:()=>void;onDevices?:(list:RemoteDevice[])=>void;epoch?:string;beatMs?:number;pendingTtlMs?:number;
 /** 같은 방 코드로 다시 연 TV(새로고침)에서, 전에 허용한 휴대폰(지문)은 다시 묻지 않고 허용한다. */ preapproved?:readonly string[];
 /** 방 비밀값(QR 주소의 #k=…). 있으면 그 값으로 인사를 증명한 휴대폰을 먼저 받는다. */ secret?:string|null;
 onFlood?:(flooded:boolean)=>void}):FunTransport&TvRemoteControls{
 const now=opts.now??Date.now;
 const {room,keys}=opts;
 const secret=isRoomSecret(opts.secret)?opts.secret:null;
 const epoch=opts.epoch??randomId();
 const ttl=opts.pendingTtlMs??PENDING_TTL_MS;
 /** 기다리는 요청의 '살아 있음'을 세는 최소 간격(대기 시간보다 짧게). */
 const helloGap=Math.min(HELLO_GAP_MS,ttl/3);
 const devices=new Map<string,DeviceEntry>();
 /** 이 연결에서 거절·끊은 휴대폰(다시 요청해도 받지 않는다. 새 코드에서는 다시 요청할 수 있다). */
 const rejected=new Set<string>();
 /** 지문 확인을 통과해 새로 받은 요청 시각(줄마다 따로). */
 const admitted={trusted:[] as number[],anon:[] as number[]};
 /** 지문 확인 전, 새 요청이 들어온 시각(확인 계산을 쏟아붓기 막기). */
 const attempts:number[]=[];
 /** 밀려난 요청을 다시 받지 않는 시각까지. */
 const cooldown=new Map<string,number>();
 /** 최근에 밀려나거나 거절·만료된 기기의 확인 번호(같은 번호로 다시 나타나면 '쌍둥이'로 표시). */
 const recent=new Map<string,{name:string;until:number}>();
 /** 기기별로 받은 마지막 bye 번호(엿본 bye를 다시 보내 요청을 지우지 못하게). */
 const byeSeen=new Map<string,number>();
 /** 기기별 최근 응답(seq → 응답). 휴대폰이 같은 seq를 다시 보내면 같은 응답을 다시 보낸다. */
 const acks=new Map<string,Map<number,Record<string,unknown>>>();
 /** '밀려 있어요'(busy) 응답을 보낸 시각(쏟아지는 요청에 응답으로 같이 쏟아내지 않게). */
 const busySent:number[]=[];
 let floodUntil=0,flooding=false;
 /** 쏟아지는 중 상한에 막힌 요청이 몇 번 왔는지(되풀이하는 진짜 휴대폰을 가려낸다). */
 const floodSeen=new Map<string,number>();
 const filter=createCommandFilter({room,epoch,now,pubOf:d=>{const e=devices.get(d);return e?.state==='approved'?e.pub:undefined;}});
 let last='',lastAt=-Infinity,latest:FunRemoteSnapshot|null=null,timer:ReturnType<typeof setTimeout>|null=null,beat:ReturnType<typeof setInterval>|null=null,k=0,open=false,reloading=false,hidden=false;
 let out:Promise<unknown>=Promise.resolve();
 /** 서명해서 보낸다. 순서가 바뀌지 않게 하나씩 이어서 보낸다. */
 const tvSend=(event:string,body:Record<string,unknown>,force=false)=>{
  const kk=++k;
  // 새로고침 알림을 보낸 뒤에는(페이지가 닫히는 중) 서명이 늦게 끝난 메시지를 보내지 않는다: 휴대폰이 '연결됨'으로 되돌아가지 않게.
  out=out.then(async()=>{const sig=await signRemote(keys,tvSigned(event,room,epoch,kk,body));if(force||!reloading)channel.send(event,{epoch,k:kk,body,tv:keys.pub,sig});}).catch(()=>{});
  return out;
 };
 const remember=(device:string,name:string)=>{recent.set(device,{name,until:now()+RECENT_NAME_MS});if(recent.size>64)recent.delete(recent.keys().next().value as string);};
 const list=():RemoteDevice[]=>{
  const t=now();
  for(const [id,r] of recent)if(r.until<t)recent.delete(id);
  const all=[...devices.values()];
  return all.map(({device,name,state,trusted})=>{
   // 같은 확인 번호의 다른 기기가 지금 있거나 최근에 있었으면(밀려남·거절·만료 포함) 허용하지 못하게 표시한다.
   const twin=state==='pending'&&(all.some(d=>d.device!==device&&d.name===name)||[...recent].some(([id,r])=>id!==device&&r.name===name));
   return {device,name,state,trusted,...(twin?{twin:true}:{})};
  });
 };
 const changed=()=>opts.onDevices?.(list());
 const count=(state:RemoteDeviceState)=>[...devices.values()].filter(d=>d.state===state).length;
 const access=(device:string,state:'pending'|'approved'|'rejected'|'full'|'busy')=>tvSend('access',{device,state});
 const setFlood=(on:boolean)=>{if(on)floodUntil=now()+FLOOD_QUIET_MS;const next=on||now()<floodUntil;if(next!==flooding){flooding=next;opts.onFlood?.(next);}};
 const sendBusy=(device:string)=>{
  // 코드만 넣은 휴대폰이 진짜 TV의 답도 보게 한다(가짜 TV만 답하면 휴대폰이 '서로 다른 TV'를 알아챈다). 1초에 2번까지만.
  const t=now();while(busySent.length&&t-busySent[0]>1000)busySent.shift();
  if(busySent.length>=2)return;busySent.push(t);void access(device,'busy');
 };
 const prune=()=>{
  let gone=false;const t=now();
  for(const [id,d] of devices){
   if(d.state!=='pending')continue;
   // 다시 묻지 않는 요청, 또는 코드만 아는 기기가 너무 오래 자리를 차지하면 뺀다.
   if(t-d.lastSeenAt>ttl||(!d.trusted&&t-d.createdAt>ANON_PENDING_MAX_MS)){devices.delete(id);remember(id,d.name);cooldown.set(id,t+EVICT_COOLDOWN_MS);gone=true;}
  }
  if(gone)changed();
  if(flooding&&t>=floodUntil)setFlood(false);
 };
 const flush=()=>{
  timer=null;if(!latest||!open||!count('approved'))return;
  const s=JSON.stringify(latest);if(s===last)return;
  last=s;lastAt=now();void tvSend('state',{snapshot:latest,hidden});
 };
 const schedule=()=>{const wait=STATE_GAP_MS-(now()-lastAt);if(wait<=0)flush();else if(!timer)timer=setTimeout(flush,wait);};
 const resend=()=>{last='';schedule();};
 /** 살아 있음 신호. idle: 이 TV 화면이 아직 게임을 띄우지 않았음(새로고침 뒤 '이어 하기'를 기다리는 중 등). */
 const sendBeat=()=>{if(open&&count('approved'))void tvSend('beat',{hidden,idle:!latest});};
 /** 대기 자리를 하나 비운다. 보통 줄의 가장 오래 소식 없는 요청부터. 믿는 줄 요청이 오면 믿는 줄 요청도 비울 수 있다. */
 const makeRoom=(forTrusted:boolean):boolean=>{
  const pend=[...devices.values()].filter(d=>d.state==='pending').sort((a,b)=>a.lastSeenAt-b.lastSeenAt);
  const victim=pend.find(d=>!d.trusted)??(forTrusted?pend[0]:undefined);
  if(!victim)return false;
  const t=now();
  devices.delete(victim.device);remember(victim.device,victim.name);
  cooldown.set(victim.device,t+EVICT_COOLDOWN_MS);if(cooldown.size>64)cooldown.delete(cooldown.keys().next().value as string);
  void access(victim.device,'busy');
  return true;
 };
 const onHello=async(raw:unknown)=>{
  if(!isObj(raw)||typeof raw.device!=='string'||!ID_RE.test(raw.device)||!isRemotePub(raw.pub))return;
  const device=raw.device,pub={x:raw.pub.x,y:raw.pub.y};
  if(rejected.has(device))return;
  const again=!!opts.preapproved?.includes(device);
  const known=devices.get(device);
  const t0=now();
  // 방 비밀값으로 만든 증명이 맞으면 믿는 줄(QR로 들어온 휴대폰). 증명 확인은 가벼워서 쏟아지는 요청보다 먼저 본다.
  const trusted=!!secret&&typeof raw.mac==='string'&&await verifyHelloMac(secret,room,device,pub,raw.mac);
  if(known){
   if(pubId(known.pub)!==pubId(pub))return;
   // 이미 기다리는 요청도 HELLO_GAP_MS에 한 번만 '살아 있음'으로 센다(쏟아부어 자리를 붙잡아 두지 못하게).
   if(t0-known.lastHelloAt<helloGap)return;
  }else{
   if(!again&&(cooldown.get(device)??0)>t0)return;
   // 지문 확인 전의 요청 수 상한(확인 계산으로 TV가 느려지지 않게). 넘치면 경고.
   while(attempts.length&&t0-attempts[0]>ADMIT_WINDOW_MS)attempts.shift();
   // 믿는 줄(QR) 요청은 이 상한에 막히지 않는다(쏟아지는 가짜 요청이 진짜 휴대폰을 막지 못하게).
   if(!again&&!trusted){
    if(attempts.length>=HELLO_ATTEMPT_MAX){
     setFlood(true);
     // 코드만 넣은 휴대폰은 같은 요청을 되풀이한다: 두 번째부터는 진짜 TV의 '밀려 있어요'를 받게 해, 가짜 TV만 답하는 상황을 알아채게 한다.
     const n=(floodSeen.get(device)??0)+1;floodSeen.set(device,n);if(floodSeen.size>128)floodSeen.delete(floodSeen.keys().next().value as string);
     if(n>=2)sendBusy(device);
     return;
    }
    attempts.push(t0);
   }
  }
  if(!known){
   if(await remoteFingerprint(pub)!==device)return;
   // 지문 확인을 통과한 요청만 몫에 넣는다(가짜 지문으로 몫을 채우지 못한다). 믿는 줄과 보통 줄은 따로 센다.
   if(!again){
    const lane=trusted?admitted.trusted:admitted.anon,max=trusted?TRUSTED_ADMIT_MAX:ADMIT_MAX;
    const t=now();while(lane.length&&t-lane[0]>ADMIT_WINDOW_MS)lane.shift();
    if(lane.length>=max){setFlood(true);if(!trusted)sendBusy(device);return;}
    lane.push(t);
   }
  }
  prune();
  let entry=devices.get(device);
  const t=now();
  if(!entry){
   if(count('approved')>=MAX_REMOTES){void access(device,'full');return;}
   if(!again&&count('pending')>=MAX_PENDING){
    // 꽉 찼으면 보통 줄의 가장 오래 소식 없는 요청을 내보낸다. 보통 줄 요청은 믿는 줄 요청을 밀어내지 못한다.
    if(!makeRoom(trusted)){setFlood(true);sendBusy(device);return;}
   }
   const name=await sasCode(device,epoch);
   if(devices.has(device))return;
   entry={device,name,state:again?'approved':'pending',lastHelloAt:t,lastSeenAt:t,createdAt:t,pub,trusted};
   devices.set(device,entry);changed();
  }else{
   if(t-entry.lastHelloAt<helloGap)return;
   if(trusted&&!entry.trusted){entry.trusted=true;changed();}
  }
  entry.lastHelloAt=t;entry.lastSeenAt=t;
  void access(device,entry.state);
  if(entry.state==='approved'){opts.onRemoteSeen?.();resend();sendBeat();}
 };
 const blockedNow=(cmd:ExternalFunCommand)=>{
  // TV 화면이 아직 게임을 띄우지 않았으면(시작·이어 하기 화면) 받지 않는다: 휴대폰에 '보냈어요'가 거짓으로 뜨지 않게.
  if(!latest)return 'idle';
  // TV가 '다음 활동으로 갈까요?'를 묻는 동안에는 받지 않는다(창 뒤에서 게임이 움직이지 않게).
  if(latest.busy)return 'busy';
  if(latest.paused&&PAUSED_BLOCKED.has(cmd.type))return 'paused';
  if(cmd.type==='event'&&latest.events&&!latest.events.includes(cmd.event))return 'event';
  return null;
 };
 const ack=(device:string,seq:number,body:Record<string,unknown>)=>{
  let m=acks.get(device);if(!m){m=new Map();acks.set(device,m);}
  m.set(seq,body);if(m.size>ACK_CACHE)m.delete(m.keys().next().value as number);
  void tvSend('ack',{device,seq,...body});
 };
 /**
  * 페이지를 닫는 순간에는 비동기 서명을 기다릴 수 없으므로, '잠시 끊김' 알림은 미리 서명해 둔다.
  * 휴대폰은 이 알림의 번호로 다음 번호 기준을 바꾸지 않는다(뒤로 가기 캐시로 같은 연결이 돌아와도 이어진다).
  */
 const RELOAD_K=Number.MAX_SAFE_INTEGER;
 let reloadNotice:Record<string,unknown>|null=null;
 void signRemote(keys,tvSigned('closed',room,epoch,RELOAD_K,{reason:'reload'})).then(sig=>{reloadNotice={epoch,k:RELOAD_K,body:{reason:'reload'},tv:keys.pub,sig};}).catch(()=>{});
 return {
  epoch,code:confirmCode(keys.fp),
  connect(onRaw){
   open=true;
   channel.on('cmd',raw=>{void filter.accept(raw).then(v=>{
    if(!v||!open)return;
    if('dup' in v){
     // 응답이 사라져 휴대폰이 같은 명령을 다시 보냈다: 반영하지 않고 같은 응답만 다시 보낸다.
     const prev=acks.get(v.device)?.get(v.seq);if(prev)void tvSend('ack',{device:v.device,seq:v.seq,...prev});
     return;
    }
    const blocked=v.ok?blockedNow(v.command):null;
    if(!v.ok||blocked){ack(v.device,v.seq,{ok:false,reason:v.ok?blocked:v.reason});return;}
    ack(v.device,v.seq,{ok:true});
    opts.onRemoteSeen?.();onRaw(v.command);
   });});
   channel.on('resync',raw=>{void filter.resync(raw).then(ok=>{if(ok&&isObj(raw))void tvSend('ack',{device:raw.device,seq:raw.seq,ok:true,resync:true});});});
   channel.on('hello',raw=>{void onHello(raw);});
   // 허용 전에 페이지를 닫은 휴대폰은 요청 목록에서 뺀다(서명·epoch·번호 확인. 허용된 자리는 선생님이 '끊기'로만 비운다).
   channel.on('bye',raw=>{
    if(!isObj(raw)||typeof raw.device!=='string'||raw.epoch!==epoch||typeof raw.n!=='number'||!Number.isSafeInteger(raw.n))return;
    const entry=devices.get(raw.device);if(entry?.state!=='pending')return;
    const n=raw.n;if(n<=(byeSeen.get(entry.device)??0))return;
    void verifyRemote(entry.pub,byeSigned(room,epoch,entry.device,n),raw.sig).then(ok=>{
     if(!ok||n<=(byeSeen.get(entry.device)??0))return;
     byeSeen.set(entry.device,n);
     if(devices.get(entry.device)?.state==='pending'){devices.delete(entry.device);changed();}
    });
   });
   const close=channel.open(s=>opts.onStatus?.(s));
   beat=loose(setInterval(()=>{prune();sendBeat();},opts.beatMs??BEAT_MS));
   // 같은 코드로 다시 연 TV: 전에 허용한 휴대폰에 먼저 알려, 휴대폰이 묻기 전에 새 연결로 옮겨 오게 한다.
   for(const device of opts.preapproved??[])if(ID_RE.test(device))void access(device,'approved');
   return ()=>{
    if(timer){clearTimeout(timer);timer=null;}
    // 떼어 내기 전에 마지막 상태(결과 화면 등)를 보낸다. '끝났어요'는 보내지 않는다(같은 코드로 곧 다시 붙을 수 있다. 끝낼 때는 stop()).
    if(latest&&count('approved')&&JSON.stringify(latest)!==last){last=JSON.stringify(latest);void tvSend('state',{snapshot:latest,hidden});}
    open=false;if(beat){clearInterval(beat);beat=null;}
    void out.then(()=>close());
   };
  },
  publishState(snapshot){latest=snapshot;schedule();},
  approve(device){
   const entry=devices.get(device);if(!entry||entry.state==='approved')return;
   if(list().find(d=>d.device===device)?.twin)return;
   if(count('approved')>=MAX_REMOTES){devices.delete(device);void access(device,'full');changed();return;}
   entry.state='approved';void access(device,'approved');changed();opts.onRemoteSeen?.();resend();sendBeat();
  },
  reject(device){
   const entry=devices.get(device);if(!entry)return;
   devices.delete(device);remember(device,entry.name);rejected.add(device);filter.forget(device);acks.delete(device);void access(device,'rejected');changed();
  },
  disconnectAll(reason='rotated'){
   void tvSend('closed',{reason});
   for(const d of devices.keys())filter.forget(d);
   devices.clear();acks.clear();changed();
  },
  stop(){if(!reloading)void tvSend('closed',{reason:'stopped'});},
  notifyReload(){reloading=true;if(reloadNotice)channel.send('closed',reloadNotice);else void tvSend('closed',{reason:'reload'},true);},
  resumeAfterReload(){reloading=false;sendBeat();resend();},
  setHidden(h){if(h===hidden)return;hidden=h;sendBeat();if(!h)resend();},
  devices:list,
  flooded:()=>flooding,
 };
}

/* ───────── 휴대폰 쪽 ───────── */
/** asking: 연결 요청 중 · pending: TV 허용 기다림 · busy: TV에 요청이 밀려 있음 · gone: 응답 없는 코드 ·
 *  stale: TV 응답 없음 · closed: TV가 연결을 끝냄 · reloading: TV가 새로고침 중('이어 하기'를 기다림) ·
 *  verify: QR 없이 연결해 TV 확인 번호를 사람이 맞춰 봐야 함 · conflict: 서로 다른 TV 키가 답함(가짜 TV 의심) */
export type RemoteAccess='asking'|'pending'|'approved'|'rejected'|'full'|'busy'|'gone'|'closed'|'stale'|'reloading'|'verify'|'conflict';
export interface RemoteAck {seq:number;ok:boolean;reason?:string}

/**
 * 리모컨 쪽: 연결을 요청하고, 허용되면 서명한 명령을 보내고, TV 상태를 받는다.
 * TV 메시지는 고정한 TV 키(QR의 pin, 또는 사람이 확인한 키)로 서명을 확인한 것만 믿는다.
 * 시각은 이 기기 안에서 잰 간격만 쓴다.
 */
export function createRemoteSender(channel:RemoteChannel,opts:{room:string;keys:RemoteKeys;now?:()=>number;onState?:(s:FunRemoteSnapshot)=>void;onStatus?:(s:RemoteStatus)=>void;onAccess?:(a:RemoteAccess)=>void;onAck?:(a:RemoteAck)=>void;onTvHidden?:(hidden:boolean)=>void;onTvCode?:(code:string)=>void;
 /** TV 화면이 아직 게임을 띄우지 않았음(새로고침 뒤 '이어 하기'를 기다리는 중 등). */ onTvIdle?:(idle:boolean)=>void;
 /** QR 주소의 TV 키 지문. 있으면 이 TV만 믿는다. 없으면 사람이 TV 확인 번호를 맞춰 보고 confirmTv()를 불러야 한다. */ tvPin?:string|null;
 /** 사람이 확인해 고정한 TV 키 지문(이 탭에 기억해 새로고침해도 이어지게). */ onPinned?:(pin:string)=>void;
 /** QR 주소의 방 비밀값(#k=…). 있으면 인사에 증명을 붙여 TV가 먼저 받게 한다. */ secret?:string|null;
 /** 이 휴대폰의 확인 번호(TV 연결이 정해지면 계산된다: TV가 정한 값이 섞인다). */ onCode?:(code:string)=>void;
 timeoutMs?:number;tickMs?:number;goneMs?:number;seqStore?:TextStore|null;ackRetryMs?:number}){
 const now=opts.now??Date.now;
 const {room,keys}=opts;
 const device=keys.fp;
 const timeout=opts.timeoutMs??PHONE_STALE_MS;
 const goneMs=opts.goneMs??GONE_AFTER_MS;
 const tvPin=isRemotePin(opts.tvPin)?opts.tvPin:null;
 const secret=isRoomSecret(opts.secret)?opts.secret:null;
 const retryMs=opts.ackRetryMs??ACK_RETRY_MS;
 /** 인사 메시지. 방 비밀값이 있으면 증명(mac)을 붙인 뒤에 보낸다. */
 let helloMsg:Record<string,unknown>|null=secret?null:{device,pub:keys.pub};
 /** 지금 TV 연결(epoch)에서의 확인 번호. */
 let myCode='';
 const codeFor=(ep:string)=>{void sasCode(device,ep).then(c=>{if(epoch===ep&&c!==myCode){myCode=c;opts.onCode?.(c);}}).catch(()=>{});};
 /** 응답을 기다리는 명령(seq → 서명한 메시지·다시 보내기 타이머). 응답이 없으면 같은 seq로 한 번 더 보낸다. */
 const inflight=new Map<number,{msg:Record<string,unknown>|null;timer:ReturnType<typeof setTimeout>|null;retried:boolean}>();
 const dropInflight=(s:number)=>{const f=inflight.get(s);if(f?.timer)clearTimeout(f.timer);inflight.delete(s);};
 // seq는 이 키로 보낸 마지막 번호에 이어서 늘어난다(새로고침해도 이어지게 저장). bye 번호도 같은 줄에서 받는다.
 let seq=Math.max(0,Number.parseInt(opts.seqStore?.get()??'0',10)||0);
 const nextSeq=()=>{seq+=1;opts.seqStore?.set(String(seq));return seq;};
 let epoch:string|null=null,lastK=0,access:RemoteAccess='asking',lastHeard=now(),askingSince=now(),connected=false,pinned:RemotePub|null=null;
 /** 새로고침 알림 직전 상태(허용됐던 휴대폰만 TV 소식으로 되살린다). */
 let beforeReload:RemoteAccess|null=null;
 /** QR 없이 연결: 처음 답한 TV 키(사람이 확인하기 전)와 그 TV가 보낸 마지막 허용 소식. */
 let candidate:{tv:RemotePub;epoch:string;k:number;state:string}|null=null;
 const seen=new Set<string>();
 const pins=new Map<string,Promise<string>>();
 const pinOf=(tv:RemotePub)=>{const id=pubId(tv);let p=pins.get(id);if(!p){p=remotePin(tv);pins.set(id,p);}return p;};
 let inbox:Promise<unknown>=Promise.resolve();
 let byeMsg:Record<string,unknown>|null=null;
 const setAccess=(a:RemoteAccess)=>{if(a!==access){access=a;if(a==='asking')askingSince=now();opts.onAccess?.(a);}};
 const heard=()=>{lastHeard=now();if(access==='stale'||(access==='reloading'&&beforeReload==='approved'))setAccess('approved');};
 const leaveEpoch=()=>{if(epoch)seen.add(epoch);epoch=null;lastK=0;byeMsg=null;};
 /** 허용 전에 떠날 때 보낼 bye를 미리 서명해 둔다(페이지를 닫는 순간에는 기다릴 수 없다). epoch·번호가 들어가 다시 쓸 수 없다. */
 const prepareBye=()=>{
  if(!epoch)return;
  const ep=epoch,n=nextSeq();
  void signRemote(keys,byeSigned(room,ep,device,n)).then(sig=>{if(epoch===ep)byeMsg={device,epoch:ep,n,sig};}).catch(()=>{});
 };
 const applyAccess=(state:string,switched:boolean)=>{
  if(state!=='pending'&&state!=='approved'&&state!=='rejected'&&state!=='full'&&state!=='busy')return;
  if(access==='closed'||access==='rejected'||access==='conflict')return;
  lastHeard=now();beforeReload=null;setAccess(state);
  // 새 TV 연결로 옮겨 왔으면 바로 인사해 공개키를 알린다(새 TV가 이 휴대폰의 서명을 확인할 수 있게).
  if(switched&&state==='approved'&&connected&&helloMsg)channel.send('hello',helloMsg);
  if(state==='pending'&&(switched||!byeMsg))prepareBye();
  // 밀려 있음·꽉 참: 그 TV에 붙지 않고 계속 묻는다(자리가 나면 다시 받는다).
  if(state==='busy'||state==='full'){epoch=null;lastK=0;}
 };
 const handle=async(event:string,raw:unknown)=>{
  if(access==='conflict')return;
  if(!isObj(raw)||typeof raw.epoch!=='string'||!ID_RE.test(raw.epoch)||!isObj(raw.body)||!isRemotePub(raw.tv))return;
  const k=raw.k;if(typeof k!=='number'||!Number.isSafeInteger(k)||k<1)return;
  const body=raw.body,tv={x:raw.tv.x,y:raw.tv.y};
  // 고정한 TV 키가 있으면 그 키만. 없으면 내게 온 'access'일 때만(QR의 pin이 있으면 그 지문과 같은 키만).
  if(pinned){if(pubId(tv)!==pubId(pinned))return;}
  else{
   if(event!=='access'||body.device!==device)return;
   if(tvPin&&await pinOf(tv)!==tvPin)return;
  }
  if(raw.epoch===epoch){if(k<=lastK)return;}
  // 새 TV 연결(epoch)로는 내게 온 'access'로만 옮겨 간다. 지나간 epoch로는 돌아가지 않는다.
  else if(event!=='access'||body.device!==device||seen.has(raw.epoch))return;
  if(!await verifyRemote(tv,tvSigned(event,room,raw.epoch,k,body),raw.sig))return;
  if(!pinned){
   if(tvPin){pinned=tv;opts.onTvCode?.(confirmCode(await remoteFingerprint(tv)));}
   else{
    // QR 없이 코드로 연결: 사람이 TV 확인 번호를 맞춰 보기 전에는 붙지 않는다. 다른 TV 키가 또 답하면 멈춘다.
    if(candidate&&pubId(candidate.tv)!==pubId(tv)){candidate=null;setAccess('conflict');return;}
    if(!candidate)opts.onTvCode?.(confirmCode(await remoteFingerprint(tv)));
    if(!candidate||k>candidate.k||raw.epoch!==candidate.epoch)candidate={tv,epoch:raw.epoch,k,state:String(body.state)};
    setAccess('verify');
    return;
   }
  }
  let switched=false;
  if(raw.epoch!==epoch){leaveEpoch();epoch=raw.epoch;switched=true;codeFor(raw.epoch);}
  // 새로고침 알림(미리 서명, 가장 큰 번호)은 다음 번호 기준을 바꾸지 않는다: 같은 연결이 돌아오면 그대로 이어진다.
  const reloadNotice=event==='closed'&&body.reason==='reload';
  if(!reloadNotice)lastK=k;
  if(event==='access'){
   if(body.device!==device)return;
   applyAccess(String(body.state),switched);
  }else if(event==='state'){
   if(access!=='approved'&&access!=='stale'&&!(access==='reloading'&&beforeReload==='approved'))return;
   const snap=parseSnapshot(body.snapshot);if(!snap)return;
   heard();opts.onTvHidden?.(body.hidden===true);opts.onTvIdle?.(false);opts.onState?.(snap);
  }else if(event==='beat'){
   if(access!=='approved'&&access!=='stale'&&!(access==='reloading'&&beforeReload==='approved'))return;
   heard();opts.onTvHidden?.(body.hidden===true);opts.onTvIdle?.(body.idle===true);
  }else if(event==='closed'){
   // 새로고침: 곧 같은 코드로 돌아오므로 'TV에서 이어 하기를 눌러요'로 기다린다(연결은 그대로 둔다).
   if(reloadNotice){
    if(access==='approved'||access==='stale'||access==='pending'||access==='asking'||access==='reloading'){
     if(access!=='reloading')beforeReload=access==='stale'?'approved':access;
     lastHeard=now();setAccess('reloading');
    }
    return;
   }
   leaveEpoch();setAccess('closed');
  }else if(event==='ack'){
   if(body.device!==device||typeof body.seq!=='number')return;
   heard();
   if(body.resync===true)return;
   const ack={seq:body.seq,ok:body.ok===true,reason:typeof body.reason==='string'?body.reason.slice(0,20):undefined};
   // 같은 seq의 응답은 한 번만 알린다(다시 보낸 명령에 TV가 다시 답해도 두 번 세지 않게).
   if(!inflight.has(ack.seq))return;
   dropInflight(ack.seq);
   opts.onAck?.(ack);
   // seq가 크게 뛰었다고 거절되면(저장소가 꼬였을 때) 서명한 '다시 맞추기'로 TV 기준을 지금 번호로 옮긴다.
   if(!ack.ok&&ack.reason==='jump')sendResync();
  }
 };
 for(const event of ['access','state','beat','closed','ack'])channel.on(event,raw=>{inbox=inbox.then(()=>handle(event,raw)).catch(()=>{});});
 const asking=()=>access==='asking'||access==='pending'||access==='stale'||access==='busy'||access==='gone'||access==='full'||access==='reloading'||access==='verify';
 const hello=()=>{if(connected&&asking()&&helloMsg)channel.send('hello',helloMsg);};
 if(secret)void helloMac(secret,room,device,keys.pub).then(mac=>{helloMsg={device,pub:keys.pub,mac};hello();}).catch(()=>{helloMsg={device,pub:keys.pub};hello();});
 const check=()=>{
  if((access==='approved'||access==='reloading')&&now()-lastHeard>timeout)setAccess('stale');
  if(access==='asking'&&connected&&now()-askingSince>goneMs)setAccess('gone');
  return access;
 };
 const close=channel.open(s=>{opts.onStatus?.(s);connected=s==='connected';if(connected){lastHeard=now();askingSince=now();hello();}});
 // 허용을 기다리는 동안에는 몇 초마다 다시 묻고(TV가 늦게 열렸을 때), 허용 뒤에는 TV 소식이 끊기면 'TV 응답 없음'.
 const timer=loose(setInterval(()=>{hello();check();},opts.tickMs??2000));
 let out:Promise<unknown>=Promise.resolve();
 const sendResync=()=>{
  if(!epoch||access!=='approved')return;
  const s=nextSeq(),ep=epoch;
  out=out.then(async()=>{const sig=await signRemote(keys,resyncSigned(room,ep,device,s));channel.send('resync',{device,epoch:ep,seq:s,sig});}).catch(()=>{});
 };
 const bye=()=>{if(connected&&(access==='pending'||access==='asking'||access==='busy'||access==='verify')&&byeMsg)channel.send('bye',byeMsg);};
 return {
  device,
  /** 확인 번호(TV 화면의 요청과 맞춰 본다). TV 연결이 정해지기 전에는 ''. */
  get code(){return myCode;},
  get access(){return access;},
  /** QR 없이 연결했을 때: 사람이 TV 화면의 확인 번호와 같다고 확인하면 그 TV 키를 고정하고 이어 간다. */
  async confirmTv(){
   if(access!=='verify'||!candidate||pinned)return false;
   const c=candidate;candidate=null;pinned=c.tv;
   opts.onPinned?.(await pinOf(c.tv));
   let switched=false;
   if(c.epoch!==epoch){leaveEpoch();epoch=c.epoch;switched=true;codeFor(c.epoch);}
   // 확인을 기다리는 사이 더 새 메시지를 받았을 수 있다: 번호 기준은 뒤로 가지 않는다.
   lastK=Math.max(lastK,c.k);
   applyAccess(c.state,switched);
   if(access==='verify')setAccess('asking');
   hello();
   return true;
  },
  /** 허용된 상태에서만 보낸다. 보냈으면 그 seq(TV의 확인 응답과 맞춰 본다), 못 보냈으면 0. */
  send(command:ExternalFunCommand):number{
   if(!epoch||access!=='approved')return 0;
   const s=nextSeq(),ep=epoch;
   const f={msg:null as Record<string,unknown>|null,timer:null as ReturnType<typeof setTimeout>|null,retried:false};
   inflight.set(s,f);
   if(inflight.size>32){const first=inflight.keys().next().value as number;dropInflight(first);}
   out=out.then(async()=>{
    const sig=await signRemote(keys,cmdSigned(room,ep,s,device,command));
    const msg={device,epoch:ep,seq:s,command,sig};
    channel.send('cmd',msg);
    if(!inflight.has(s))return;
    f.msg=msg;
    // 응답이 사라졌을 수 있다: 같은 seq로 한 번 더 보낸다(TV는 같은 seq를 다시 반영하지 않고 같은 응답만 다시 보낸다).
    f.timer=loose(setTimeout(()=>{f.timer=null;if(!inflight.has(s)||f.retried||epoch!==ep)return;f.retried=true;channel.send('cmd',msg);},retryMs));
   }).catch(()=>{});
   return s;
  },
  check,
  /** 허용 전에 떠나면 TV 요청 목록에서 빼 달라고 알린다(페이지를 닫을 때도). */
  bye,
  /** 보낼 것이 남아 있으면 다 보낼 때까지 기다린다(테스트용). */
  flushed:()=>out.then(()=>inbox),
  close(){clearInterval(timer);for(const s of [...inflight.keys()])dropInflight(s);bye();close();},
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
  dispose(){bc.close();},
 };
}
/** 실제 채널을 먼저, 안 되면 같은 기기 채널. 둘 다 없으면 null. */
export const openRemoteChannel=(code:string)=>supabaseRemoteChannel(code)??localRemoteChannel(code);
