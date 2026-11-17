import test from 'node:test';
import assert from 'node:assert/strict';
import {CMD_PER_SEC,MAX_REMOTES,createCommandFilter,createRemoteSender,createTvTransport,generateRoomCode,isValidRoomCode,normalizeRoomCode,parseSnapshot,remoteUrl,stableRemoteDevice,type RemoteAccess,type RemoteChannel,type RemoteDevice,type RemoteStatus} from '../src/application/funRemote';
import {createFunCommandBus,type FunRemoteSnapshot} from '../src/application/funCommandBus';

/** 여러 쪽을 잇는 가짜 broadcast 채널(자기가 보낸 것은 받지 않는다 = self:false). 몰래 끼어드는 기기도 흉내 낸다. */
function fakeHub(){
 const peers:{handlers:Map<string,((p:unknown)=>void)[]>}[]=[];
 const sent:[string,unknown][]=[];
 const make=(statusOnOpen:RemoteStatus='connected'):RemoteChannel=>{
  const me={handlers:new Map<string,((p:unknown)=>void)[]>()};peers.push(me);
  return {
   send(event,payload){sent.push([event,payload]);for(const p of peers)if(p!==me)for(const h of p.handlers.get(event)??[])h(structuredClone(payload));},
   on(event,handler){me.handlers.set(event,[...(me.handlers.get(event)??[]),handler]);},
   open(onStatus){onStatus(statusOnOpen);return ()=>{const i=peers.indexOf(me);if(i>=0)peers.splice(i,1);};},
  };
 };
 /** 채널에 날것을 바로 쏘는 기기(공격자). */
 const raw=()=>{const ch=make();ch.open(()=>{});return ch;};
 return {make,raw,sent};
}
const snap=(over:Partial<FunRemoteSnapshot>={}):FunRemoteSnapshot=>({gameId:'sig-signal-captain',gameName:'신호 대장',phase:'play',paused:false,secondsLeft:30,teams:2,scores:[1,2],scoreLabel:'점수',cue:'출동! 팔 올려',combo:10,comboFull:false,...over});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

/** TV와 휴대폰을 붙인다. 시계는 각자 따로 줄 수 있다(시계 차이 시험). */
function setup(opts:{tvNow?:()=>number;phoneNow?:()=>number}={}){
 const hub=fakeHub();
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe((cmd,src)=>got.push([cmd,src]));
 let devices:RemoteDevice[]=[];
 const tv=createTvTransport(hub.make(),{now:opts.tvNow,onDevices:l=>{devices=l;},beatMs:20});
 const detach=bus.attach(tv);
 const phone=(name?:string)=>{const access:RemoteAccess[]=[];const states:FunRemoteSnapshot[]=[];const s=createRemoteSender(hub.make(),{now:opts.phoneNow,name,onAccess:a=>access.push(a),onState:x=>states.push(x),timeoutMs:120,tickMs:15});return {s,access,states};};
 return {hub,bus,got,tv,detach,phone,devices:()=>devices};
}

test('room codes are 6 unambiguous characters and survive normalization',()=>{
 for(let i=0;i<200;i++){const c=generateRoomCode();assert.ok(isValidRoomCode(c),c);assert.doesNotMatch(c,/[01OIL]/);}
 assert.equal(normalizeRoomCode(' ab-c2 3d '),'ABC23D');
 assert.equal(isValidRoomCode('ABC12D'),false,'1 is excluded');
 assert.equal(isValidRoomCode('ABC2'),false);
 assert.equal(remoteUrl('https://x.app/','ABCDEF'),'https://x.app/fun-remote?room=ABCDEF');
});

test('approval: a phone with only the room code cannot control the TV until the teacher allows it',async()=>{
 const {got,tv,detach,phone,devices}=setup();
 const p=phone('🐯');
 await wait(5);
 assert.deepEqual(p.access,['pending']);
 assert.equal(devices().length,1);assert.equal(devices()[0].state,'pending');assert.equal(devices()[0].name,'🐯');
 assert.equal(p.s.send({type:'end'}),false,'the phone itself refuses to send while pending');
 tv.approve(devices()[0].device);
 assert.equal(p.access.at(-1),'approved');
 assert.equal(p.s.send({type:'next'}),true);
 assert.deepEqual(got,[[{type:'next'},'remote']]);
 detach();p.s.close();
});

test('rejection and the 2-phone limit',async()=>{
 const {tv,detach,phone,devices}=setup();
 const a=phone(),b=phone(),c=phone(),d=phone();
 await wait(5);
 const ids=devices().map(x=>x.device);
 tv.reject(ids[3]);
 assert.equal(d.access.at(-1),'rejected');
 tv.approve(ids[0]);tv.approve(ids[1]);
 assert.equal(devices().filter(x=>x.state==='approved').length,MAX_REMOTES);
 tv.approve(ids[2]);
 assert.equal(c.access.at(-1),'full','a third phone is told the TV is full');
 const e=phone();await wait(5);
 assert.equal(e.access.at(-1),'full','new phones are refused once two are connected');
 assert.equal(a.access.at(-1),'approved');assert.equal(b.access.at(-1),'approved');
 detach();for(const x of [a,b,c,d,e])x.s.close();
});

test('an attacker who knows the code cannot inject commands, replay them or reuse an old TV session',async()=>{
 const {hub,got,tv,detach,phone,devices}=setup();
 const p=phone();await wait(5);tv.approve(devices()[0].device);
 p.s.send({type:'next'});
 const captured=hub.sent.filter(([e])=>e==='cmd').map(([,x])=>x);
 assert.equal(captured.length,1);
 const evil=hub.raw();
 evil.send('cmd',captured[0]);
 assert.equal(got.length,1,'replaying a captured command is ignored (seq already used)');
 evil.send('cmd',{...(captured[0] as object),seq:(captured[0] as {seq:number}).seq+1,command:{type:'end'}});
 assert.equal(got.length,2,'note: an approved device id is a secret; this is the only way in');
 evil.send('cmd',{device:'ZZZZZZZZZZZZ',epoch:tv.epoch,seq:1,command:{type:'end'}});
 evil.send('cmd',{...(captured[0] as object),epoch:'OLDOLDOLDOLD',seq:(captured[0] as {seq:number}).seq+5000,command:{type:'end'}});
 assert.equal(got.length,2,'unknown devices and old TV sessions are ignored');
 detach();p.s.close();
});

test('clock skew between phone and TV does not matter',async()=>{
 const {got,tv,detach,phone,devices}=setup({phoneNow:()=>Date.now()+3_600_000});
 const p=phone();await wait(5);tv.approve(devices()[0].device);
 p.s.send({type:'next'});p.s.send({type:'pause'});
 assert.equal(got.length,2,'commands from a phone whose clock is an hour ahead still work');
 detach();p.s.close();
});

test('a command flood from one phone is rate limited, and hello floods do not bypass the state throttle',async()=>{
 let now=1_000_000;
 const {hub,bus,got,tv,detach,phone,devices}=setup({tvNow:()=>now});
 const p=phone();await wait(5);tv.approve(devices()[0].device);
 for(let i=0;i<20;i++)p.s.send({type:'score',team:0,delta:1});
 assert.equal(got.length,CMD_PER_SEC);
 now+=1001;p.s.send({type:'next'});
 assert.equal(got.length,CMD_PER_SEC+1,'the limit is per second');
 bus.publishState(snap());
 const before=hub.sent.filter(([e])=>e==='state').length;
 const evil=hub.raw();
 for(let i=0;i<50;i++)evil.send('hello',{device:'FLOOD'+String(i).padStart(4,'0'),name:'x'});
 for(let i=0;i<50;i++)p.s.check();
 const after=hub.sent.filter(([e])=>e==='state').length;
 assert.ok(after-before<=1,`state was sent ${after-before} times`);
 assert.ok(devices().filter(x=>x.state==='pending').length<=4,'pending requests are capped');
 detach();p.s.close();
});

test('the phone ignores malformed or hostile TV state',async()=>{
 const {hub,tv,bus,detach,phone,devices}=setup();
 const p=phone();await wait(5);tv.approve(devices()[0].device);
 bus.publishState(snap({scores:[3,4]}));await wait(300);
 assert.deepEqual(p.states.at(-1)?.scores,[3,4]);
 const n0=p.states.length;
 const evil=hub.raw();
 for(const bad of [{teams:1e9,scores:[]},{teams:-1,scores:[]},{...snap(),scores:[{}]},{...snap(),phase:'hack'},{...snap(),secondsLeft:Infinity},null,'x'])
  evil.send('state',{epoch:tv.epoch,n:1e9,snapshot:bad});
 assert.equal(p.states.length,n0,'bad snapshots never reach the screen');
 assert.equal(parseSnapshot({...snap(),teams:1e9}),null);
 assert.equal(parseSnapshot({...snap(),scores:[1]}),null,'scores must match teams');
 assert.equal(parseSnapshot({...snap(),cue:'a'.repeat(500)})?.cue.length,120,'long text is cut');
 assert.equal(parseSnapshot({...snap(),cue:'a\u0000b'})?.cue,'ab');
 assert.equal(parseSnapshot({...snap(),gameName:{}})?.gameName,'대표 게임','a wrong-typed name is replaced, not rendered');
 assert.deepEqual(parseSnapshot(snap())?.scores,[1,2]);
 detach();p.s.close();
});

test('liveness: heartbeat keeps the phone connected, silence shows TV 응답 없음, close and rotate end the link',async()=>{
 const {tv,detach,phone,devices,bus}=setup();
 const p=phone();await wait(5);tv.approve(devices()[0].device);
 await wait(200);
 assert.equal(p.s.access,'approved','heartbeats keep it alive');
 // 결과 화면 상태는 닫기 직전에도 전해진다.
 bus.publishState(snap({phase:'result'}));
 detach();
 assert.equal(p.states.at(-1)?.phase,'result');
 assert.equal(p.s.access,'closed');
 p.s.close();

 const s2=setup();const q=s2.phone();await wait(5);s2.tv.approve(s2.devices()[0].device);
 s2.tv.disconnectAll('rotated');
 assert.equal(q.s.access,'closed','rotating the code tells old phones');
 assert.equal(q.s.send({type:'next'}),false);
 s2.detach();q.s.close();

 // TV가 아무 말 없이 사라지면(전원·새로고침) 'TV 응답 없음'.
 const hub=fakeHub();const tvCh=hub.make();
 const tv3=createTvTransport(tvCh,{beatMs:10_000});const bus3=createFunCommandBus();const off3=bus3.attach(tv3);
 const access:RemoteAccess[]=[];
 const r=createRemoteSender(hub.make(),{onAccess:a=>access.push(a),timeoutMs:60,tickMs:10});
 await wait(5);tv3.approve(tv3.devices()[0].device);
 await wait(150);
 assert.equal(r.access,'stale');
 r.close();off3();
});

test('the command filter alone: epoch, seq and approval',()=>{
 const f=createCommandFilter({epoch:'EPOCHEPOCH12',isApproved:d=>d==='DEVICEDEVICE'});
 const c=(seq:number,command:unknown,device='DEVICEDEVICE',epoch='EPOCHEPOCH12')=>({device,epoch,seq,command});
 assert.deepEqual(f.accept(c(1,{type:'next'})),{type:'next'});
 assert.equal(f.accept(c(1,{type:'next'})),null,'same seq twice');
 assert.equal(f.accept(c(3,{type:'tick',ms:999})),null,'internal commands are refused');
 assert.deepEqual(f.accept(c(4,{type:'pause'})),{type:'pause'},'a refused seq does not block later ones');
 assert.equal(f.accept(c(9,{type:'next'},'OTHEROTHER12')),null,'not approved');
 assert.equal(f.accept({seq:6,command:{type:'next'}}),null,'malformed');
});

test('the TV keeps working with no remote channel',()=>{
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe(c=>got.push(c));
 bus.dispatch({type:'next'},'tv');bus.publishState(snap());
 assert.deepEqual(got,[{type:'next'}]);
});

test('TV reload with the same code: the phone sees TV 응답 없음, then reconnects without re-approval',async()=>{
 const hub=fakeHub();
 const bus1=createFunCommandBus();const got:unknown[]=[];
 const tv1=createTvTransport(hub.make(),{beatMs:20});const off1=bus1.attach(tv1);
 const phone=createRemoteSender(hub.make(),{timeoutMs:120,tickMs:15});
 await wait(5);const id=tv1.devices()[0].device;tv1.approve(id);
 assert.equal(phone.access,'approved');
 // 새로고침 직전 알림 → 휴대폰은 'TV 응답 없음'으로 바로 바뀐다(끝난 것으로 보지 않음).
 tv1.notifyReload();off1();
 assert.equal(phone.access,'stale');
 assert.equal(phone.send({type:'next'}),false);
 // 같은 코드로 다시 연 TV: 전에 허용한 기기는 자동 허용.
 const bus2=createFunCommandBus();bus2.subscribe(c=>got.push(c));
 const tv2=createTvTransport(hub.make(),{beatMs:20,preapproved:[id]});const off2=bus2.attach(tv2);
 await wait(60);
 assert.equal(phone.access,'approved','the phone moves to the new TV session by itself');
 assert.equal(tv2.devices()[0]?.state,'approved');
 assert.equal(phone.send({type:'next'}),true);
 assert.deepEqual(got,[{type:'next'}]);
 // 허용 목록에 없던 기기는 다시 허용을 기다린다.
 const other=createRemoteSender(hub.make(),{tickMs:15});await wait(30);
 assert.equal(other.access,'pending');
 off2();phone.close();other.close();
});

test('a TV that disappears without notice turns the phone stale after the timeout',async()=>{
 const hub=fakeHub();const bus=createFunCommandBus();
 const tv=createTvTransport(hub.make(),{beatMs:10_000});const off=bus.attach(tv);
 const phone=createRemoteSender(hub.make(),{timeoutMs:60,tickMs:10});
 await wait(5);tv.approve(tv.devices()[0].device);
 assert.equal(phone.access,'approved');
 await wait(150);
 assert.equal(phone.access,'stale');
 off();phone.close();
});

test('a phone that reloads keeps its device id and stays approved; closing before approval withdraws the request',async()=>{
 const store=new Map<string,string>();const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
 const id=stableRemoteDevice(storage);
 assert.equal(stableRemoteDevice(storage),id,'same tab, same id');
 const hub=fakeHub();const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe(c=>got.push(c));
 const tv=createTvTransport(hub.make(),{beatMs:20});const off=bus.attach(tv);
 const first=createRemoteSender(hub.make(),{device:id,tickMs:15});
 await wait(5);tv.approve(id);first.send({type:'next'});first.close();
 await wait(1100);
 const again=createRemoteSender(hub.make(),{device:id,tickMs:15});
 await wait(40);
 assert.equal(again.access,'approved','the reloaded phone is still allowed');
 assert.equal(again.send({type:'pause'}),true);
 assert.deepEqual(got,[{type:'next'},{type:'pause'}],'its new commands are not mistaken for replays');
 const quitter=createRemoteSender(hub.make(),{tickMs:15});await wait(10);
 assert.equal(tv.devices().filter(d=>d.state==='pending').length,1);
 quitter.close();
 assert.equal(tv.devices().filter(d=>d.state==='pending').length,0,'bye removes a pending request');
 off();again.close();
});
