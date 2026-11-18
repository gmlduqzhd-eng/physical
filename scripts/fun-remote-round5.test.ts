import test from 'node:test';
import assert from 'node:assert/strict';
import {ACK_RETRY_MS,ADMIT_MAX,MAX_PENDING,VERIFY_QUEUE_MAX,createCommandFilter,createRemoteSender,createTvTransport,generateRoomSecret,helloMac,isRoomSecret,loadRemoteKeys,memoryKeyStore,readRoomSecret,remotePin,remoteUrl,sasCode,signRemote,type KeyStore,type RemoteAccess,type RemoteAck,type RemoteChannel,type RemoteDevice,type RemoteKeys} from '../src/application/funRemote';
import {createFunCommandBus,type FunRemoteSnapshot} from '../src/application/funCommandBus';

/* ───────── 5차: 방 비밀값(QR) 줄 · 쏟아지는 요청 · idle 거절 · 사라진 응답 다시 보내기 · 떼어 내기 · SAS 번호 ───────── */

type H=(p:unknown)=>void;
/** 여러 쪽을 잇는 가짜 broadcast 채널. drop(event,payload)이 true면 그 메시지는 아무에게도 가지 않는다(사라진 응답 흉내). */
function fakeHub(){
 const peers:{handlers:Map<string,H[]>}[]=[];
 let drop:(event:string,payload:unknown)=>boolean=()=>false;
 const make=():RemoteChannel=>{
  const me={handlers:new Map<string,H[]>()};peers.push(me);
  return {
   send(event,payload){if(drop(event,payload))return;const c=structuredClone(payload);for(const p of peers)if(p!==me)for(const h of p.handlers.get(event)??[])h(structuredClone(c));},
   on(event,handler){me.handlers.set(event,[...(me.handlers.get(event)??[]),handler]);},
   open(onStatus){onStatus('connected');return ()=>{const i=peers.indexOf(me);if(i>=0)peers.splice(i,1);};},
  };
 };
 const raw=()=>{const ch=make();ch.open(()=>{});return ch;};
 return {make,raw,setDrop:(f:typeof drop)=>{drop=f;}};
}
const snap=(over:Partial<FunRemoteSnapshot>={}):FunRemoteSnapshot=>({gameId:'sig-signal-captain',gameName:'신호 대장',phase:'play',paused:false,secondsLeft:30,teams:2,scores:[1,2],scoreLabel:'점수',cue:'출동! 팔 올려',combo:10,comboFull:false,...over});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const settle=()=>wait(120);
const ROOM='ABC234';
const rnd43=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');

async function setup(opts:{secret?:string|null;idle?:boolean;hub?:ReturnType<typeof fakeHub>;tvKeys?:RemoteKeys;preapproved?:string[];pendingTtlMs?:number}={}){
 const hub=opts.hub??fakeHub();
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe((cmd,src)=>got.push([cmd,src]));
 let devices:RemoteDevice[]=[];const floods:boolean[]=[];
 const tvKeys=opts.tvKeys??await loadRemoteKeys();
 const tv=createTvTransport(hub.make(),{room:ROOM,keys:tvKeys,secret:opts.secret,onDevices:l=>{devices=l;},onFlood:f=>floods.push(f),beatMs:30,preapproved:opts.preapproved,pendingTtlMs:opts.pendingTtlMs});
 const detach=bus.attach(tv);
 if(!opts.idle)bus.publishState(snap());
 const pin=await remotePin(tvKeys.pub);
 const phone=async(o:{keys?:RemoteKeys;secret?:string|null;pin?:string|null;ackRetryMs?:number}={})=>{
  const access:RemoteAccess[]=[];const acks:RemoteAck[]=[];const codes:string[]=[];const idle:boolean[]=[];const tvCodes:string[]=[];
  const keys=o.keys??await loadRemoteKeys();
  const s=createRemoteSender(hub.make(),{room:ROOM,keys,secret:o.secret,tvPin:o.pin===undefined?pin:o.pin,onAccess:a=>access.push(a),onAck:a=>acks.push(a),onCode:c=>codes.push(c),onTvIdle:i=>idle.push(i),onTvCode:c=>tvCodes.push(c),timeoutMs:150,tickMs:40,goneMs:10_000,ackRetryMs:o.ackRetryMs});
  return {s,keys,access,acks,codes,idle,tvCodes};
 };
 return {hub,bus,got,tv,tvKeys,pin,detach,phone,floods,devices:()=>devices};
}
/** 지문이 틀린 가짜 인사를 계속 쏟아붓는다(PoC A·C). */
const junkFlood=(ch:RemoteChannel,prefix='A')=>{
 let stop=false;
 void (async()=>{while(!stop){for(let i=0;i<8;i++)ch.send('hello',{device:prefix.repeat(14)+String(Math.random()).slice(2,4),pub:{x:rnd43(),y:rnd43()}});await wait(50);}})();
 return ()=>{stop=true;};
};

test('room secret: 16 random bytes in the QR fragment (#k=), never in the query; parsed back from the hash',()=>{
 const k=generateRoomSecret();
 assert.ok(isRoomSecret(k));assert.equal(k.length,22);
 assert.notEqual(generateRoomSecret(),k);
 const pin='A'.repeat(43);
 const url=remoteUrl('https://x.app','ABC234',pin,k);
 assert.equal(url,`https://x.app/fun-remote?room=ABC234&tv=${pin}#k=${k}`);
 assert.equal(new URL(url).search.includes(k),false,'the secret is not sent to the server');
 assert.equal(readRoomSecret(new URL(url).hash),k);
 assert.equal(readRoomSecret('#x=1&k='+k),k);
 assert.equal(readRoomSecret('#k=short'),null);
 assert.equal(remoteUrl('https://x.app','ABC234',pin,'bad'),`https://x.app/fun-remote?room=ABC234&tv=${pin}`);
});

test('🔴 PoC A: a flood of junk hellos (wrong fingerprints) does not keep a QR phone out; the TV shows the flood warning',async()=>{
 const secret=generateRoomSecret();
 const {hub,tv,detach,phone,devices,floods}=await setup({secret});
 const stop=junkFlood(hub.raw());
 await wait(100);
 const p=await phone({secret});
 await wait(1500);
 assert.ok(devices().some(d=>d.device===p.keys.fp&&d.trusted),'the QR phone is listed in the trusted lane');
 assert.equal(p.access.at(-1),'pending');
 assert.ok(floods.includes(true),'the TV warns: 연결 요청이 너무 많아요');
 assert.equal(tv.flooded(),true);
 assert.ok(devices().every(d=>d.device===p.keys.fp),'no junk entry (wrong fingerprint) got in');
 tv.approve(p.keys.fp);await settle();
 assert.equal(p.access.at(-1),'approved');
 stop();detach();p.s.close();
});

test('🔴 PoC B: an attacker with real keys refreshing old requests cannot push the QR phone out (trusted lane is not evicted by the code-only lane)',async()=>{
 const secret=generateRoomSecret();
 const {hub,detach,phone,devices}=await setup({secret,pendingTtlMs:1500});
 const p=await phone({secret});await settle();
 assert.ok(devices().some(d=>d.device===p.keys.fp));
 const evil=hub.raw();const junk:{device:string;pub:{x:string;y:string}}[]=[];
 for(let r=0;r<3;r++){
  for(let i=0;i<ADMIT_MAX;i++){const k=await loadRemoteKeys();junk.push({device:k.fp,pub:k.pub});evil.send('hello',junk.at(-1));}
  await wait(400);
  // 이미 기다리는 요청을 계속 새로 고친다(쏟아붓기).
  for(let n=0;n<20;n++)for(const j of junk.slice(-3))evil.send('hello',j);
  await wait(300);
 }
 assert.ok(devices().some(d=>d.device===p.keys.fp),'the QR phone is still listed');
 assert.notEqual(p.access.at(-1),'busy');
 assert.ok(devices().filter(d=>d.state==='pending').length<=MAX_PENDING);
 detach();p.s.close();
});

test('a hello with a wrong room-secret proof is treated as code-only (lower lane), not trusted',async()=>{
 const secret=generateRoomSecret();
 const {detach,phone,devices}=await setup({secret});
 const p=await phone({secret:generateRoomSecret()});await settle();
 const q=await phone({secret});await settle();
 assert.equal(devices().find(d=>d.device===p.keys.fp)?.trusted,false);
 assert.equal(devices().find(d=>d.device===q.keys.fp)?.trusted,true);
 // 증명은 방·기기·키에 묶여 있다(엿본 증명을 다른 키에 붙여 쓰지 못한다).
 const other=await loadRemoteKeys();
 assert.notEqual(await helloMac(secret,ROOM,other.fp,other.pub),await helloMac(secret,ROOM,q.keys.fp,q.keys.pub));
 detach();p.s.close();q.s.close();
});

test('🔴 PoC C: code-only phone during a flood still hears the real TV, so a fake TV answering alone is caught as a conflict',async()=>{
 const {hub,detach,phone}=await setup();
 const atk=hub.raw();const stop=junkFlood(atk,'B');
 const evil=await loadRemoteKeys();const ep='EVILEPOCH123';let k=1;
 atk.on('hello',p=>{
  const h=p as {device:string};if(h.device.startsWith('BBBB'))return;
  const body={device:h.device,state:'pending'};const kk=k++;
  void signRemote(evil,['access',ROOM,ep,kk,body]).then(sig=>atk.send('access',{epoch:ep,k:kk,body,tv:evil.pub,sig}));
 });
 await wait(100);
 const p=await phone({pin:null});
 await wait(2500);
 assert.equal(p.access.at(-1),'conflict','two TV keys answered: 서로 다른 TV가 답했어요');
 stop();detach();p.s.close();
});

test('🟠 idle TV (start screen): commands are answered with a signed nack (reason idle) and nothing is applied',async()=>{
 const {bus,got,tv,detach,phone,devices}=await setup({idle:true});
 const p=await phone();await settle();tv.approve(devices()[0].device);await settle();
 assert.equal(p.idle.at(-1),true);
 const seq=p.s.send({type:'next'});await settle();
 assert.deepEqual(p.acks.at(-1),{seq,ok:false,reason:'idle'});
 assert.equal(got.length,0);
 bus.publishState(snap());await settle();
 const seq2=p.s.send({type:'next'});await settle();
 assert.deepEqual(p.acks.at(-1),{seq:seq2,ok:true,reason:undefined});
 detach();p.s.close();
});

test('🟠 lost ack: the phone resends the same seq once; the TV does not apply it twice and re-acks',async()=>{
 const {hub,got,tv,detach,phone,devices}=await setup();
 const p=await phone({ackRetryMs:200});await settle();tv.approve(devices()[0].device);await settle();
 let dropped=0;
 hub.setDrop((e,payload)=>{if(e==='ack'&&dropped===0&&(payload as {body?:{seq?:number}}).body?.seq){dropped++;return true;}return false;});
 const seq=p.s.send({type:'score',team:0,delta:1});
 await wait(100);
 assert.equal(p.acks.length,0,'the first ack was lost');
 await wait(400);
 assert.deepEqual(p.acks,[{seq,ok:true,reason:undefined}],'the retry got the cached ack (only one ack shown)');
 assert.deepEqual(got,[[{type:'score',team:0,delta:1},'remote']],'applied once');
 // 이어서 보내는 명령도 정상(다시 보내기가 순서를 꼬지 않는다).
 const s2=p.s.send({type:'next'});await settle();
 assert.equal(p.acks.at(-1)?.seq,s2);assert.equal(got.length,2);
 assert.ok(ACK_RETRY_MS>=2000,'real phones wait long enough before resending');
 detach();p.s.close();
});

test('🟠 PoC D: detaching (intro screen remount) does not end the phone; reattaching with the same key resumes; only stop() ends it',async()=>{
 const hub=fakeHub();const tvKeys=await loadRemoteKeys();
 const first=await setup({hub,tvKeys});
 const p=await first.phone();await settle();first.tv.approve(p.keys.fp);await settle();
 assert.equal(p.access.at(-1),'approved');
 first.detach();await settle();
 assert.notEqual(p.access.at(-1),'closed','unmount is not 끝났어요');
 const second=await setup({hub,tvKeys,preapproved:[p.keys.fp]});
 await wait(300);
 assert.equal(p.access.at(-1),'approved');
 const seq=p.s.send({type:'next'});await settle();
 assert.equal(p.acks.at(-1)?.seq,seq);
 assert.deepEqual(second.got,[[{type:'next'},'remote']]);
 second.tv.stop();await settle();
 assert.equal(p.access.at(-1),'closed','an explicit end tells the phone');
 second.detach();p.s.close();
});

test('🟠 PoC E: reusing a stored key refreshes its last-use time (pruning goes by last use)',async()=>{
 const st=memoryKeyStore();let t=1000;
 const a=await loadRemoteKeys(st,()=>t);
 assert.equal((await st.get())?.at,1000);
 t=5000;const b=await loadRemoteKeys(st,()=>t);
 assert.equal(a.fp,b.fp);
 assert.equal((await st.get())?.at,5000);
});

test('🟡 a store that cannot be read (IndexedDB timeout) is not overwritten with a new key',async()=>{
 const inner=memoryKeyStore();const kept=await loadRemoteKeys(inner);
 let writes=0;
 const flaky:KeyStore={get:async()=>{throw new Error('timeout');},set:async r=>{writes++;await inner.set(r);},add:async r=>{writes++;return inner.add!(r);}};
 const fresh=await loadRemoteKeys(flaky);
 assert.notEqual(fresh.fp,kept.fp,'this page uses a temporary key');
 assert.equal(writes,0,'the stored key is left alone');
 assert.equal((await loadRemoteKeys(inner)).fp,kept.fp);
});

test('🟠 SAS: the confirmation code mixes in the TV connection nonce; phone and TV show the same code; a new connection gives a new code',async()=>{
 const keys=await loadRemoteKeys();
 const a=await sasCode(keys.fp,'EPOCHAAAAAAA'),b=await sasCode(keys.fp,'EPOCHBBBBBBB');
 assert.match(a,/^[A-HJKMNP-Z2-9]{6}$/);
 assert.notEqual(a,b,'a fingerprint ground for one TV connection does not match another');
 const {tv,detach,phone,devices}=await setup();
 const p=await phone();await settle();
 assert.equal(devices()[0].name,p.codes.at(-1));
 assert.equal(devices()[0].name,await sasCode(p.keys.fp,tv.epoch));
 detach();p.s.close();
});

test('🟡 per-device verification queue is capped (junk signatures cannot pile up behind a real phone)',async()=>{
 const keys=await loadRemoteKeys();const epoch='EPOCHAAAAAAA';
 const f=createCommandFilter({room:ROOM,epoch,pubOf:d=>d===keys.fp?keys.pub:undefined});
 const junk=Array.from({length:VERIFY_QUEUE_MAX+20},(_,i)=>f.accept({device:keys.fp,epoch,seq:i+1,command:{type:'next'},sig:'A'.repeat(86)}));
 const res=await Promise.all(junk);
 assert.ok(res.every(r=>r===null));
 // 상한을 넘은 것은 확인 없이 버려지고, 줄이 비면 진짜 명령은 다시 받는다.
 const sig=await signRemote(keys,['cmd',ROOM,epoch,1,keys.fp,{type:'next'}]);
 assert.equal((await f.accept({device:keys.fp,epoch,seq:1,command:{type:'next'},sig}))?.ok,true);
});
