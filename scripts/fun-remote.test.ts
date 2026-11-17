import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommandFilter,createRemoteSender,createTvTransport,generateRoomCode,isValidRoomCode,normalizeRoomCode,remoteUrl,STALE_MS,type RemoteChannel,type RemoteStatus} from '../src/application/funRemote';
import {createFunCommandBus,type FunRemoteSnapshot} from '../src/application/funCommandBus';

/** 두 쪽을 잇는 가짜 broadcast 채널(자기가 보낸 것은 받지 않는다 = self:false). */
function fakeHub(){
 const peers:{handlers:Map<string,((p:unknown)=>void)[]>}[]=[];
 const make=(statusOnOpen:RemoteStatus='connected'):RemoteChannel=>{
  const me={handlers:new Map<string,((p:unknown)=>void)[]>()};peers.push(me);
  return {
   send(event,payload){for(const p of peers)if(p!==me)for(const h of p.handlers.get(event)??[])h(structuredClone(payload));},
   on(event,handler){me.handlers.set(event,[...(me.handlers.get(event)??[]),handler]);},
   open(onStatus){onStatus(statusOnOpen);return ()=>{const i=peers.indexOf(me);if(i>=0)peers.splice(i,1);};},
  };
 };
 return {make};
}
const snap=(over:Partial<FunRemoteSnapshot>={}):FunRemoteSnapshot=>({gameId:'sig-signal-captain',gameName:'신호 대장',phase:'play',paused:false,secondsLeft:30,teams:2,scores:[1,2],scoreLabel:'점수',cue:'출동! 팔 올려',combo:10,comboFull:false,...over});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

test('room codes are 6 unambiguous characters and survive normalization',()=>{
 for(let i=0;i<200;i++){const c=generateRoomCode();assert.ok(isValidRoomCode(c),c);assert.doesNotMatch(c,/[01OIL]/);}
 assert.equal(normalizeRoomCode(' ab-c2 3d '),'ABC23D');
 assert.equal(isValidRoomCode('ABC12D'),false,'1 is excluded');
 assert.equal(isValidRoomCode('ABC2'),false);
 assert.equal(remoteUrl('https://x.app/','ABCDEF'),'https://x.app/fun-remote?room=ABCDEF');
});

test('the command filter drops duplicates, out-of-order, stale and invalid commands',()=>{
 let now=1_000_000;const f=createCommandFilter(()=>now);
 const p=(seq:number,command:unknown,sender='A',at=now)=>({sender,seq,at,command});
 assert.deepEqual(f(p(1,{type:'next'})),{type:'next'});
 assert.equal(f(p(1,{type:'next'})),null,'same seq twice');
 assert.equal(f(p(0,{type:'pause'})),null,'older seq');
 assert.deepEqual(f(p(2,{type:'score',team:1,delta:1})),{type:'score',team:1,delta:1});
 assert.deepEqual(f(p(1,{type:'pause'},'B')),{type:'pause'},'each sender has its own sequence');
 assert.equal(f(p(3,{type:'tick',ms:999})),null,'internal commands are refused');
 assert.equal(f(p(4,{type:'score',team:9,delta:1})),null,'invalid team');
 assert.equal(f(p(5,{type:'next'},'A',now-STALE_MS-1)),null,'stale');
 assert.equal(f({seq:6,command:{type:'next'}}),null,'malformed payload');
 now+=10;assert.deepEqual(f(p(6,{type:'end'})),{type:'end'},'a refused seq does not block later ones');
});

test('a phone command reaches the TV bus, and the TV state comes back to the phone',async()=>{
 const hub=fakeHub();
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe((cmd,src)=>got.push([cmd,src]));
 let seen=0;const tvStatus:RemoteStatus[]=[];
 const detach=bus.attach(createTvTransport(hub.make(),{onStatus:s=>tvStatus.push(s),onRemoteSeen:()=>seen++}));
 const states:FunRemoteSnapshot[]=[];
 const phone=createRemoteSender(hub.make(),{onState:s=>states.push(s)});
 bus.publishState(snap());
 await wait(300);
 assert.ok(states.length>=1);assert.deepEqual(states.at(-1)!.scores,[1,2]);
 phone.send({type:'next'});phone.send({type:'score',team:0,delta:1});
 assert.deepEqual(got,[[{type:'next'},'remote'],[{type:'score',team:0,delta:1},'remote']]);
 assert.ok(seen>=2);assert.deepEqual(tvStatus,['connected']);
 // 같은 상태는 다시 보내지 않고, 바뀐 상태만 보낸다.
 const before=states.length;bus.publishState(snap());await wait(300);assert.equal(states.length,before);
 bus.publishState(snap({scores:[2,2]}));await wait(300);assert.deepEqual(states.at(-1)!.scores,[2,2]);
 detach();phone.close();
 phone.send({type:'next'});assert.equal(got.length,2,'nothing arrives after the TV detaches');
});

test('a phone that connects late gets the current state at once (hello)',async()=>{
 const hub=fakeHub();const bus=createFunCommandBus();
 const detach=bus.attach(createTvTransport(hub.make()));
 bus.publishState(snap({scores:[5,4]}));await wait(300);
 const states:FunRemoteSnapshot[]=[];const phone=createRemoteSender(hub.make(),{onState:s=>states.push(s)});
 await wait(50);
 assert.deepEqual(states.at(-1)?.scores,[5,4]);
 detach();phone.close();
});

test('the TV keeps working with no remote channel',()=>{
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe(c=>got.push(c));
 bus.dispatch({type:'next'},'tv');bus.publishState(snap());
 assert.deepEqual(got,[{type:'next'}]);
});
