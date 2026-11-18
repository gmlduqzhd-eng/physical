import test from 'node:test';
import assert from 'node:assert/strict';
import {ADMIT_MAX,ADMIT_WINDOW_MS,MAX_SEQ_JUMP,canonicalJson,createRemoteSender,createTvTransport,loadRemoteKeys,remotePin,signRemote,type RemoteAccess,type RemoteAck,type RemoteChannel,type RemoteDevice,type RemoteKeys,type RemoteStatus} from '../src/application/funRemote';
import {createFunCommandBus,type FunRemoteSnapshot} from '../src/application/funCommandBus';

/* ───────── 4차: TV 키 고정(QR pin) · 새로고침 알림 · 대기열 · 정규 서명 · bye · 다시 맞추기 ───────── */

/** 객체 키 순서를 거꾸로 바꿔 다시 만든다(서버가 키를 정렬해 보내는 경우 흉내). */
const reorder=(v:unknown):unknown=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.keys(v as object).reverse().map(k=>[k,reorder((v as Record<string,unknown>)[k])])):v;
/** 여러 쪽을 잇는 가짜 broadcast 채널(자기가 보낸 것은 받지 않는다). 모든 메시지는 누구나 엿볼 수 있다(sent). */
function fakeHub(opts:{reorderKeys?:boolean}={}){
 const peers:{handlers:Map<string,((p:unknown)=>void)[]>}[]=[];
 const sent:[string,unknown][]=[];
 const deliver=(payload:unknown)=>opts.reorderKeys?reorder(structuredClone(payload)):structuredClone(payload);
 const make=(statusOnOpen:RemoteStatus='connected'):RemoteChannel=>{
  const me={handlers:new Map<string,((p:unknown)=>void)[]>()};peers.push(me);
  return {
   send(event,payload){sent.push([event,structuredClone(payload)]);for(const p of peers)if(p!==me)for(const h of p.handlers.get(event)??[])h(deliver(payload));},
   on(event,handler){me.handlers.set(event,[...(me.handlers.get(event)??[]),handler]);},
   open(onStatus){onStatus(statusOnOpen);return ()=>{const i=peers.indexOf(me);if(i>=0)peers.splice(i,1);};},
  };
 };
 const raw=()=>{const ch=make();ch.open(()=>{});return ch;};
 const seen=(event:string)=>sent.filter(([e])=>e===event).map(([,p])=>p as Record<string,unknown>);
 return {make,raw,sent,seen};
}
const snap=(over:Partial<FunRemoteSnapshot>={}):FunRemoteSnapshot=>({gameId:'sig-signal-captain',gameName:'신호 대장',phase:'play',paused:false,secondsLeft:30,teams:2,scores:[1,2],scoreLabel:'점수',cue:'출동! 팔 올려',combo:10,comboFull:false,...over});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const settle=()=>wait(120);
const ROOM='ABCDEF';
const memStore=()=>{let v:string|null=null;return {get:()=>v,set:(x:string)=>{v=x;}};};

async function setup(opts:{tvKeys?:RemoteKeys;pendingTtlMs?:number;hub?:ReturnType<typeof fakeHub>;beatMs?:number}={}){
 const hub=opts.hub??fakeHub();
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe((cmd,src)=>got.push([cmd,src]));
 let devices:RemoteDevice[]=[];
 const tvKeys=opts.tvKeys??await loadRemoteKeys();
 const tv=createTvTransport(hub.make(),{room:ROOM,keys:tvKeys,onDevices:l=>{devices=l;},beatMs:opts.beatMs??20,pendingTtlMs:opts.pendingTtlMs});
 const detach=bus.attach(tv);
 const pin=await remotePin(tvKeys.pub);
 /** pin: undefined면 QR처럼 TV 지문을 넣고, null이면 코드만 넣은 연결(사람 확인 필요). */
 const phone=async(o:{keys?:RemoteKeys;seqStore?:ReturnType<typeof memStore>;pin?:string|null;timeoutMs?:number}={})=>{
  const access:RemoteAccess[]=[];const states:FunRemoteSnapshot[]=[];const acks:RemoteAck[]=[];const tvCodes:string[]=[];const idle:boolean[]=[];const pinned:string[]=[];
  const keys=o.keys??await loadRemoteKeys();
  const s=createRemoteSender(hub.make(),{room:ROOM,keys,tvPin:o.pin===undefined?pin:o.pin,onPinned:x=>pinned.push(x),onAccess:a=>access.push(a),onState:x=>states.push(x),onAck:a=>acks.push(a),onTvCode:c=>tvCodes.push(c),onTvIdle:i=>idle.push(i),timeoutMs:o.timeoutMs??150,tickMs:15,goneMs:10_000,seqStore:o.seqStore});
  return {s,keys,access,states,acks,tvCodes,idle,pinned};
 };
 return {hub,bus,got,tv,tvKeys,pin,detach,phone,devices:()=>devices};
}

test('🔴 PoC: a fake TV that answers first with its own key is ignored by a phone opened from the QR (pinned TV fingerprint)',async()=>{
 const hub=fakeHub();
 const tvKeys=await loadRemoteKeys();
 // 진짜 TV는 조금 늦게 답한다(공격자가 먼저 끼어든다).
 const slowCh=hub.make();
 const lateCh:RemoteChannel={...slowCh,on(e,h){slowCh.on(e,p=>setTimeout(()=>h(p),40));}};
 const tv=createTvTransport(lateCh,{room:ROOM,keys:tvKeys,beatMs:20});
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe(c=>got.push(c));const detach=bus.attach(tv);
 tv.publishState(snap());await wait(50);
 assert.equal(hub.seen('state').length,0,'no state (and so no epoch in state) is broadcast while no phone is approved');
 // 공격자: 휴대폰의 hello를 보면 자기 키로 '허용됨'과 가짜 점수를 바로 보낸다.
 const evil=hub.raw();const fake=await loadRemoteKeys();let ek=1;
 evil.on('hello',p=>{void (async()=>{
  const d=(p as {device:string}).device;const ep='EVILEPOCH123';
  const body={device:d,state:'approved'};const k1=ek++;
  evil.send('access',{epoch:ep,k:k1,body,tv:fake.pub,sig:await signRemote(fake,['access',ROOM,ep,k1,body])});
  const b2={snapshot:snap({gameName:'FAKE',scores:[99,0]}),hidden:false};const k2=ek++;
  evil.send('state',{epoch:ep,k:k2,body:b2,tv:fake.pub,sig:await signRemote(fake,['state',ROOM,ep,k2,b2])});
 })();});
 const pin=await remotePin(tvKeys.pub);
 const access:RemoteAccess[]=[];const states:FunRemoteSnapshot[]=[];const tvCodes:string[]=[];
 const keys=await loadRemoteKeys();
 const s=createRemoteSender(hub.make(),{room:ROOM,keys,tvPin:pin,onAccess:a=>access.push(a),onState:x=>states.push(x),onTvCode:c=>tvCodes.push(c),tickMs:15,timeoutMs:500});
 await wait(250);
 assert.ok(!access.includes('approved'),'not approved by the fake TV');
 assert.equal(access.at(-1),'pending','waits for the real teacher approval');
 assert.ok(states.every(x=>x.gameName!=='FAKE'),'no fake score shown');
 assert.deepEqual(tvCodes,[tv.code],'the phone shows the real TV code');
 tv.approve(keys.fp);await wait(200);
 assert.equal(access.at(-1),'approved');
 const seq=s.send({type:'next'});await wait(200);
 assert.ok(seq>0);assert.deepEqual(got,[{type:'next'}],'commands reach the real TV');
 detach();s.close();
});

test('🔴 manual code entry (no QR pin): the phone waits for a person to confirm the TV code; two different TV keys answering is a conflict',async()=>{
 // 1) TV 하나만 답함 → 확인 번호를 보여 주고, '같아요'를 누르면 이어 간다(확인한 지문을 기억).
 const one=await setup();
 const p=await one.phone({pin:null});await settle();
 assert.equal(p.access.at(-1),'verify','asks the person to compare the TV code first');
 assert.deepEqual(p.tvCodes,[one.tv.code]);
 assert.equal(p.s.send({type:'next'}),0,'cannot send before confirming');
 assert.equal(await p.s.confirmTv(),true);await settle();
 assert.equal(p.access.at(-1),'pending');
 assert.deepEqual(p.pinned,[one.pin],'the confirmed TV fingerprint is remembered for reloads');
 one.tv.approve(p.keys.fp);await settle();
 assert.equal(p.access.at(-1),'approved');
 one.detach();p.s.close();
 // 2) 공격자 TV가 함께 답하면 멈춘다.
 const two=await setup();
 const evil=two.hub.raw();const fake=await loadRemoteKeys();let ek=1;
 evil.on('hello',q=>{void (async()=>{const d=(q as {device:string}).device,ep='EVILEPOCH999',body={device:d,state:'approved'},k=ek++;evil.send('access',{epoch:ep,k,body,tv:fake.pub,sig:await signRemote(fake,['access',ROOM,ep,k,body])});})();});
 const q=await two.phone({pin:null});await settle();
 assert.equal(q.access.at(-1),'conflict','different TV keys answered: stop and ask for the QR');
 assert.equal(await q.s.confirmTv(),false);
 two.detach();q.s.close();
});

test('🔴 PoC: after a reload notice, a TV that comes back from the back-forward cache (same connection) is heard again',async()=>{
 // 페이지가 얼어 있는 동안(뒤로 가기 캐시)에는 살아 있음 신호가 없다고 보고, 돌아온 뒤의 신호만 본다.
 const {tv,detach,phone,devices}=await setup({beatMs:100_000});
 const p=await phone({timeoutMs:2000});await settle();tv.approve(devices()[0].device);await settle();
 assert.equal(p.access.at(-1),'approved');
 tv.notifyReload();await settle();
 assert.equal(p.access.at(-1),'reloading');
 tv.resumeAfterReload();await settle();
 assert.equal(p.access.at(-1),'approved','beats after the pre-signed reload notice are accepted again');
 tv.publishState(snap({scores:[5,6]}));await wait(300);
 assert.deepEqual(p.states.at(-1)?.scores,[5,6]);
 detach();p.s.close();
});

test('signatures use canonical JSON: a channel that reorders object keys does not break approval, commands, acks or state',async()=>{
 assert.equal(canonicalJson({b:1,a:{d:[1,{z:1,y:2}],c:'x'}}),canonicalJson({a:{c:'x',d:[1,{y:2,z:1}]},b:1}));
 const hub=fakeHub({reorderKeys:true});
 const {got,tv,detach,phone,devices}=await setup({hub});
 const p=await phone();await settle();
 assert.equal(p.access.at(-1),'pending');
 tv.approve(devices()[0].device);await settle();
 assert.equal(p.access.at(-1),'approved');
 const seq=p.s.send({type:'score',team:1,delta:1});await settle();
 assert.deepEqual(got,[[{type:'score',team:1,delta:1},'remote']]);
 assert.equal(p.acks.at(-1)?.seq,seq);
 tv.publishState(snap({scores:[7,8]}));await wait(300);
 assert.deepEqual(p.states.at(-1)?.scores,[7,8]);
 detach();p.s.close();
});

test('pending flood: new keys are admitted at most ADMIT_MAX per window, and a phone that keeps asking still gets in',async()=>{
 const {hub,tv,detach,phone,devices}=await setup({pendingTtlMs:400});
 // 공격자가 새 키로 요청을 쏟아붓는다.
 const evil=hub.raw();
 const flood=await Promise.all(Array.from({length:12},()=>loadRemoteKeys()));
 for(const k of flood)evil.send('hello',{device:k.fp,pub:k.pub});
 await settle();
 assert.ok(devices().length<=ADMIT_MAX,'only ADMIT_MAX new requests in one window');
 // 진짜 휴대폰은 계속 묻는다: 창이 지나면 들어온다(가장 오래된 요청이 밀려난다).
 const p=await phone();
 await wait(ADMIT_WINDOW_MS+400);
 assert.ok(devices().some(d=>d.device===p.keys.fp),'the real phone is listed');
 tv.approve(p.keys.fp);await settle();
 assert.equal(p.access.at(-1),'approved');
 detach();p.s.close();
});

test('bye is bound to the TV connection and a counter: a replayed bye cannot remove the same phone again',async()=>{
 const {hub,detach,phone,devices}=await setup();
 const keys=await loadRemoteKeys();const store=memStore();
 const a=await phone({keys,seqStore:store});await settle();
 a.s.close();await settle();
 assert.equal(devices().length,0,'a genuine bye removes the request');
 const captured=hub.seen('bye').at(-1)!;
 assert.equal(typeof captured.n,'number');assert.equal(typeof captured.epoch,'string');
 // 같은 휴대폰이 다시 요청한다(같은 키, 같은 TV 연결).
 const b=await phone({keys,seqStore:store});await wait(1200);
 assert.equal(devices().length,1);
 hub.raw().send('bye',captured);await settle();
 assert.equal(devices().length,1,'the replayed bye is ignored');
 detach();b.s.close();
});

test('seq jump: after a jump is refused, the phone re-syncs with a signed message and the next command works',async()=>{
 const {hub,got,tv,detach,phone,devices}=await setup();
 const store=memStore();
 const p=await phone({seqStore:store});await settle();tv.approve(devices()[0].device);await settle();
 p.s.send({type:'next'});await settle();
 assert.equal(got.length,1);
 // 저장소가 꼬여 seq가 크게 뛴 상황(다른 탭 등). 같은 키로 다시 연다.
 p.s.close();
 store.set(String(Number(store.get())+MAX_SEQ_JUMP+500));
 const q=await phone({keys:p.keys,seqStore:store});await wait(1200);
 assert.equal(q.access.at(-1),'approved');
 const jumped=q.s.send({type:'pause'});await settle();
 assert.deepEqual(q.acks.find(a=>a.seq===jumped),{seq:jumped,ok:false,reason:'jump'});
 await settle();
 const after=q.s.send({type:'next'});await settle();
 assert.deepEqual(q.acks.at(-1),{seq:after,ok:true,reason:undefined},'works again after the signed re-sync');
 assert.deepEqual(got.at(-1),[{type:'next'},'remote']);
 // 서명 없는(또는 엿본) 다시 맞추기로 남의 기준을 옮기지 못한다.
 const seenResync=hub.seen('resync').at(-1)!;
 hub.raw().send('resync',{...seenResync,seq:(seenResync.seq as number)+5000});
 await settle();
 const again=q.s.send({type:'next'});await settle();
 assert.deepEqual(q.acks.at(-1),{seq:again,ok:true,reason:undefined},'a forged re-sync did not move the counter');
 detach();q.s.close();
});

test('idle TV: before the game screen publishes anything, beats tell the phone to start or press 이어 하기 on the TV',async()=>{
 const {tv,detach,phone,devices}=await setup();
 const p=await phone();await settle();tv.approve(devices()[0].device);await wait(150);
 assert.equal(p.idle.at(-1),true,'the TV has not shown a game yet');
 tv.publishState(snap());await wait(300);
 assert.equal(p.idle.at(-1),false);
 detach();p.s.close();
});
