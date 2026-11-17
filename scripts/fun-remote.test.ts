import test from 'node:test';
import assert from 'node:assert/strict';
import {CMD_PER_SEC,MAX_REMOTES,MAX_SEQ_JUMP,confirmCode,createCommandFilter,createRemoteSender,createTvTransport,generateRoomCode,isValidRoomCode,loadRemoteKeys,normalizeRoomCode,parseSnapshot,remoteFingerprint,remoteUrl,signRemote,type RemoteAccess,type RemoteAck,type RemoteChannel,type RemoteDevice,type RemoteKeys,type RemoteStatus} from '../src/application/funRemote';
import {createFunCommandBus,type FunRemoteSnapshot} from '../src/application/funCommandBus';

/** 여러 쪽을 잇는 가짜 broadcast 채널(자기가 보낸 것은 받지 않는다 = self:false). 모든 메시지는 누구나 엿볼 수 있다(sent). */
function fakeHub(){
 const peers:{handlers:Map<string,((p:unknown)=>void)[]>}[]=[];
 const sent:[string,unknown][]=[];
 const make=(statusOnOpen:RemoteStatus='connected'):RemoteChannel=>{
  const me={handlers:new Map<string,((p:unknown)=>void)[]>()};peers.push(me);
  return {
   send(event,payload){sent.push([event,structuredClone(payload)]);for(const p of peers)if(p!==me)for(const h of p.handlers.get(event)??[])h(structuredClone(payload));},
   on(event,handler){me.handlers.set(event,[...(me.handlers.get(event)??[]),handler]);},
   open(onStatus){onStatus(statusOnOpen);return ()=>{const i=peers.indexOf(me);if(i>=0)peers.splice(i,1);};},
  };
 };
 /** 채널에 날것을 바로 쏘는 기기(공격자). 엿본 메시지도 그대로 다시 쏠 수 있다. */
 const raw=()=>{const ch=make();ch.open(()=>{});return ch;};
 const seen=(event:string)=>sent.filter(([e])=>e===event).map(([,p])=>p as Record<string,unknown>);
 return {make,raw,sent,seen};
}
const snap=(over:Partial<FunRemoteSnapshot>={}):FunRemoteSnapshot=>({gameId:'sig-signal-captain',gameName:'신호 대장',phase:'play',paused:false,secondsLeft:30,teams:2,scores:[1,2],scoreLabel:'점수',cue:'출동! 팔 올려',combo:10,comboFull:false,...over});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const ROOM='ABCDEF';
const memStore=()=>{let v:string|null=null;return {get:()=>v,set:(x:string)=>{v=x;}};};

/** TV와 휴대폰을 붙인다. 키는 진짜 WebCrypto로 만든다. */
async function setup(opts:{tvNow?:()=>number;phoneNow?:()=>number;tvKeys?:RemoteKeys;preapproved?:string[];pendingTtlMs?:number;hub?:ReturnType<typeof fakeHub>}={}){
 const hub=opts.hub??fakeHub();
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe((cmd,src)=>got.push([cmd,src]));
 let devices:RemoteDevice[]=[];
 const tvKeys=opts.tvKeys??await loadRemoteKeys();
 const tv=createTvTransport(hub.make(),{room:ROOM,keys:tvKeys,now:opts.tvNow,onDevices:l=>{devices=l;},beatMs:20,preapproved:opts.preapproved,pendingTtlMs:opts.pendingTtlMs});
 const detach=bus.attach(tv);
 const phone=async(o:{keys?:RemoteKeys;seqStore?:ReturnType<typeof memStore>;goneMs?:number}={})=>{
  const access:RemoteAccess[]=[];const states:FunRemoteSnapshot[]=[];const acks:RemoteAck[]=[];const tvCodes:string[]=[];const hidden:boolean[]=[];
  const keys=o.keys??await loadRemoteKeys();
  const s=createRemoteSender(hub.make(),{room:ROOM,keys,now:opts.phoneNow,onAccess:a=>access.push(a),onState:x=>states.push(x),onAck:a=>acks.push(a),onTvCode:c=>tvCodes.push(c),onTvHidden:h=>hidden.push(h),timeoutMs:150,tickMs:15,goneMs:o.goneMs??10_000,seqStore:o.seqStore});
  return {s,keys,access,states,acks,tvCodes,hidden};
 };
 return {hub,bus,got,tv,tvKeys,detach,phone,devices:()=>devices};
}
const settle=()=>wait(120);

test('room codes are 6 unambiguous characters and survive normalization',()=>{
 for(let i=0;i<200;i++){const c=generateRoomCode();assert.ok(isValidRoomCode(c),c);assert.doesNotMatch(c,/[01OIL]/);}
 assert.equal(normalizeRoomCode(' ab-c2 3d '),'ABC23D');
 assert.equal(isValidRoomCode('ABC12D'),false,'1 is excluded');
 assert.equal(remoteUrl('https://x.app/','ABCDEF'),'https://x.app/fun-remote?room=ABCDEF');
});

test('keys: the device id is the public-key fingerprint, the 4-digit code comes from it, and stored keys come back the same',async()=>{
 const store=memStore();
 const a=await loadRemoteKeys(store),b=await loadRemoteKeys(store);
 assert.equal(a.fp,b.fp,'reloading the page keeps the same device');
 assert.match(a.fp,/^[0-9A-F]{16}$/);
 assert.equal(a.fp,await remoteFingerprint(a.pub));
 assert.match(confirmCode(a.fp),/^\d{4}$/);
 assert.equal(a.privateKey.extractable,false,'the key used for signing cannot be exported');
 const c=await loadRemoteKeys();assert.notEqual(c.fp,a.fp);
});

test('approval by fingerprint: a phone cannot control the TV until the teacher allows it; both sides show matching codes',async()=>{
 const {got,tv,detach,phone,devices}=await setup();
 const p=await phone();
 await settle();
 assert.deepEqual(p.access,['pending']);
 assert.equal(devices().length,1);
 assert.equal(devices()[0].device,p.keys.fp,'the TV lists the phone by its key fingerprint');
 assert.equal(devices()[0].name,p.s.code,'the TV shows the same confirmation code as the phone');
 assert.deepEqual(p.tvCodes,[tv.code],'the phone shows the TV code too');
 assert.equal(p.s.send({type:'end'}),0,'the phone itself refuses to send while pending');
 tv.approve(devices()[0].device);
 await settle();
 assert.equal(p.access.at(-1),'approved');
 const seq=p.s.send({type:'next'});assert.ok(seq>0);
 await settle();
 assert.deepEqual(got,[[{type:'next'},'remote']]);
 assert.deepEqual(p.acks,[{seq,ok:true,reason:undefined}],'the TV acknowledges what it applied');
 detach();p.s.close();
});

test('🔴 forged commands with an observed device id and epoch are rejected; the real phone keeps working',async()=>{
 const {hub,got,tv,detach,phone,devices}=await setup();
 const p=await phone();await settle();tv.approve(devices()[0].device);await settle();
 assert.ok(p.s.send({type:'next'}));await settle();
 // 공격자는 채널에서 진짜 휴대폰의 명령과 TV의 허용을 엿본다.
 const observed=hub.seen('cmd').at(-1)!;
 const evil=hub.raw();
 // 1) 서명 없이 사칭 2) 엿본 서명을 다른 명령에 붙이기 3) 엿본 명령을 그대로 다시 보내기 4) 아주 큰 seq로 기기 막기
 evil.send('cmd',{device:observed.device,epoch:observed.epoch,seq:(observed.seq as number)+1,command:{type:'end'}});
 evil.send('cmd',{...observed,seq:(observed.seq as number)+1,command:{type:'end'}});
 evil.send('cmd',observed);
 evil.send('cmd',{...observed,seq:Number.MAX_SAFE_INTEGER,command:{type:'end'}});
 // 5) 자기 키로 서명해도 허용 목록에 없는 지문이면 무시
 const attacker=await loadRemoteKeys();
 const sig=await signRemote(attacker,['cmd',ROOM,observed.epoch,(observed.seq as number)+5,observed.device,{type:'end'}]);
 evil.send('cmd',{...observed,seq:(observed.seq as number)+5,command:{type:'end'},sig});
 await settle();
 assert.deepEqual(got,[[{type:'next'},'remote']],'only the genuine command reached the game');
 // 진짜 휴대폰은 막히지 않았다.
 const next=p.s.send({type:'pause'});await settle();
 assert.deepEqual(got.at(-1),[{type:'pause'},'remote']);
 assert.equal(p.acks.at(-1)?.seq,next);
 detach();p.s.close();
});

test('🔴 forged closed / state / beat / access from someone without the TV key are ignored by the phone',async()=>{
 const {hub,tv,detach,phone,devices}=await setup();
 const p=await phone();await settle();tv.approve(devices()[0].device);
 tv.publishState(snap({scores:[3,4]}));await wait(300);
 const before=p.states.length;
 const real=hub.seen('state').at(-1)!;
 const evil=hub.raw();const fake=await loadRemoteKeys();
 const forge=async(event:string,body:Record<string,unknown>,k=999)=>{const sig=await signRemote(fake,[event,ROOM,real.epoch,k,body]);evil.send(event,{epoch:real.epoch,k,body,tv:fake.pub,sig});};
 await forge('closed',{reason:'rotated'});
 await forge('state',{snapshot:snap({scores:[99,0]}),hidden:false});
 await forge('access',{device:p.keys.fp,state:'rejected'});
 // 진짜 TV 키를 쓰지만 서명이 틀린 것 · 엿본 진짜 메시지를 다시 보내기(k가 늘지 않음)
 evil.send('closed',{epoch:real.epoch,k:1e6,body:{reason:'rotated'},tv:real.tv,sig:real.sig});
 evil.send('state',real);
 await settle();
 assert.equal(p.access.at(-1),'approved','still connected');
 assert.equal(p.states.length,before,'no fake or replayed state shown');
 assert.ok(p.states.every(s=>s.scores[0]!==99));
 // 가짜 beat로 사라진 TV를 살아 있는 척 못 한다.
 tv.notifyReload();detach();await settle();
 assert.equal(p.access.at(-1),'stale');
 for(let i=0;i<8;i++){await forge('beat',{hidden:false},2000+i);await wait(30);}
 assert.equal(p.s.check(),'stale','fake heartbeats do not keep a missing TV alive');
 p.s.close();
});

test('seq: a verified phone cannot jump more than MAX_SEQ_JUMP at once; normal sends continue after a reload',async()=>{
 const store=memStore();
 const filterKeys=await loadRemoteKeys();
 const f=createCommandFilter({room:ROOM,epoch:'EPOCHAAAAAAA',pubOf:d=>d===filterKeys.fp?filterKeys.pub:undefined});
 const cmd=async(seq:number,command:unknown={type:'next'})=>f.accept({device:filterKeys.fp,epoch:'EPOCHAAAAAAA',seq,command,sig:await signRemote(filterKeys,['cmd',ROOM,'EPOCHAAAAAAA',seq,filterKeys.fp,command])});
 assert.equal((await cmd(5))?.ok,true,'the first seq may be anything');
 assert.equal(await cmd(5),null,'replay ignored');
 assert.deepEqual(await cmd(5+MAX_SEQ_JUMP+1),{ok:false,device:filterKeys.fp,seq:5+MAX_SEQ_JUMP+1,reason:'jump'});
 assert.equal((await cmd(6))?.ok,true,'the jump did not move the counter, so the next real one works');
 assert.equal((await cmd(7,{type:'hack'}))?.ok,false,'malformed command is answered, not applied');
 // 휴대폰 쪽: seq는 저장소에 이어서 늘어난다.
 const {tv,detach,phone,devices}=await setup();
 const keys=await loadRemoteKeys();
 const a=await phone({keys,seqStore:store});await settle();tv.approve(devices()[0].device);await settle();
 const s1=a.s.send({type:'next'});a.s.close();
 const b=await phone({keys,seqStore:store});await wait(1200);
 assert.equal(b.access.at(-1),'approved','same key → still approved (no re-approval)');
 const s2=b.s.send({type:'next'});
 assert.equal(s2,s1+1,'seq continues from storage');
 await settle();assert.equal(b.acks.at(-1)?.ok,true);
 detach();b.s.close();
});

test('pending requests: TTL, busy when full, and the 2-phone limit',async()=>{
 const {tv,detach,phone,devices}=await setup({pendingTtlMs:300});
 const ps=await Promise.all([phone(),phone(),phone(),phone()]);
 await settle();
 assert.equal(devices().filter(d=>d.state==='pending').length,4);
 const fifth=await phone();await settle();
 assert.equal(fifth.access.at(-1),'busy','a full queue answers busy instead of silence');
 // 넷 중 셋이 사라지면(다시 묻지 않음) 시간이 지나 목록에서 빠진다.
 for(const p of ps.slice(1))p.s.close();
 await wait(800);
 assert.ok(devices().length<=3,'stale requests expire');
 assert.ok(['pending','busy'].includes(fifth.access.at(-1)!));
 // 허용은 2대까지.
 const ids=devices().filter(d=>d.state==='pending').map(d=>d.device);
 for(const id of ids)tv.approve(id);
 await settle();
 assert.equal(devices().filter(d=>d.state==='approved').length,Math.min(MAX_REMOTES,ids.length));
 detach();ps[0].s.close();fifth.s.close();
});

test('reject and bye: a rejected phone is told, and a phone that leaves before approval withdraws its request (signed)',async()=>{
 const {hub,tv,detach,phone,devices}=await setup();
 const a=await phone(),b=await phone();await settle();
 tv.reject(a.keys.fp);await settle();
 assert.equal(a.access.at(-1),'rejected');
 // 남의 요청을 서명 없이 지우지 못한다.
 hub.raw().send('bye',{device:b.keys.fp,sig:'AAAA'});await settle();
 assert.equal(devices().length,1);
 b.s.close();await settle();
 assert.equal(devices().length,0,'a genuine bye removes the pending request');
 detach();a.s.close();
});

test('acks: paused and disallowed events come back as 반영되지 않았어요; a command flood is rate limited',async()=>{
 const {got,tv,detach,phone,devices}=await setup();
 const p=await phone();await settle();tv.approve(devices()[0].device);
 tv.publishState(snap({paused:true,events:['golden']}));await wait(300);
 const s1=p.s.send({type:'score',team:0,delta:1});await settle();
 assert.deepEqual(p.acks.at(-1),{seq:s1,ok:false,reason:'paused'});
 tv.publishState(snap({paused:false,events:['golden']}));await wait(300);
 const s2=p.s.send({type:'event',event:'speed'});await settle();
 assert.deepEqual(p.acks.at(-1),{seq:s2,ok:false,reason:'event'});
 assert.equal(got.length,0,'neither reached the game');
 const s3=p.s.send({type:'event',event:'golden'});await settle();
 assert.deepEqual(p.acks.at(-1),{seq:s3,ok:true,reason:undefined});
 await wait(1100);
 for(let i=0;i<CMD_PER_SEC+4;i++)p.s.send({type:'next'});
 await settle();
 assert.equal(got.filter(([c])=>(c as {type:string}).type==='next').length,CMD_PER_SEC);
 assert.ok(p.acks.some(a=>a.reason==='rate'));
 detach();p.s.close();
});

test('clock skew between phone and TV does not matter',async()=>{
 const {got,tv,detach,phone,devices}=await setup({phoneNow:()=>Date.now()+3_600_000});
 const p=await phone();await settle();tv.approve(devices()[0].device);await settle();
 p.s.send({type:'next'});await settle();
 assert.deepEqual(got,[[{type:'next'},'remote']]);
 detach();p.s.close();
});

test('the phone ignores malformed TV state; snapshot events and phase label pass through',()=>{
 assert.equal(parseSnapshot({...snap(),teams:9}),null);
 assert.equal(parseSnapshot({...snap(),scores:[1]}),null);
 assert.equal(parseSnapshot({...snap(),phase:'boom'}),null);
 const s=parseSnapshot({...snap(),events:['golden','nope','speed'],phaseLabel:'마지막 승부\u0000'});
 assert.deepEqual(s?.events,['golden','speed']);
 assert.equal(s?.phaseLabel,'마지막 승부');
});

test('liveness: heartbeat keeps the phone connected, silence shows TV 응답 없음, a hidden TV is reported, rotate ends the link',async()=>{
 const {tv,detach,phone,devices}=await setup();
 const p=await phone();await settle();tv.approve(devices()[0].device);await settle();
 await wait(200);
 assert.equal(p.s.check(),'approved','beats keep it alive');
 tv.setHidden(true);await settle();
 assert.equal(p.hidden.at(-1),true,'the phone learns the TV tab is hidden');
 tv.setHidden(false);await settle();
 assert.equal(p.hidden.at(-1),false);
 tv.disconnectAll('rotated');await settle();
 assert.equal(p.access.at(-1),'closed');
 detach();p.s.close();
});

test('rotation and an old code: a phone that opens a code no TV answers shows 이 코드는 끝났어요',async()=>{
 const hub=fakeHub();
 const keys=await loadRemoteKeys();
 const access:RemoteAccess[]=[];
 const s=createRemoteSender(hub.make(),{room:ROOM,keys,onAccess:a=>access.push(a),tickMs:15,goneMs:80});
 await wait(200);
 assert.equal(access.at(-1),'gone');
 s.close();
});

test('TV reload with the same code and key: approved phones go stale then reconnect without re-approval; pending phones go back to asking',async()=>{
 const hub=fakeHub();
 const tvKeys=await loadRemoteKeys();
 const first=await setup({hub,tvKeys});
 const a=await first.phone(),b=await first.phone();await settle();
 first.tv.approve(a.keys.fp);await settle();
 first.tv.notifyReload();first.detach();await settle();
 assert.equal(a.access.at(-1),'stale','approved phone waits for the TV');
 assert.equal(b.access.at(-1),'asking','pending phone goes back to asking instead of closed');
 // 같은 코드·같은 키로 TV가 돌아온다(전에 허용한 지문은 다시 묻지 않음).
 const second=await setup({hub,tvKeys,preapproved:[a.keys.fp]});
 await wait(120);
 assert.equal(a.access.at(-1),'approved','reconnected without re-approval');
 assert.equal(b.access.at(-1),'pending','the pending phone asks the new TV again');
 const seq=a.s.send({type:'next'});await settle();
 assert.deepEqual(second.got,[[{type:'next'},'remote']]);
 assert.equal(a.acks.at(-1)?.seq,seq);
 second.detach();a.s.close();b.s.close();
});

test('a different TV key on the same code is not trusted by a phone that pinned the first TV',async()=>{
 const hub=fakeHub();
 const first=await setup({hub});
 const a=await first.phone();await settle();first.tv.approve(a.keys.fp);await settle();
 first.tv.notifyReload();first.detach();await settle();
 const impostor=await setup({hub,preapproved:[a.keys.fp]});
 await wait(200);
 assert.notEqual(a.access.at(-1),'approved','a TV with another key cannot take over the phone');
 impostor.detach();a.s.close();
});

test('TV reload: the reload notice goes out synchronously (pre-signed), and the reopened TV pulls approved phones over without waiting for TV 응답 없음',async()=>{
 const hub=fakeHub();
 const tvKeys=await loadRemoteKeys();
 const first=await setup({hub,tvKeys});
 const a=await first.phone();await settle();first.tv.approve(a.keys.fp);await settle();
 const before=hub.seen('closed').length;
 first.tv.notifyReload();
 assert.equal(hub.seen('closed').length,before+1,'sent in the same tick, before the page goes away');
 first.detach();await settle();
 assert.equal(a.access.at(-1),'stale');
 const second=await setup({hub,tvKeys,preapproved:[a.keys.fp]});
 await settle();
 assert.equal(a.access.at(-1),'approved','moved to the new TV connection right away');
 a.s.send({type:'next'});await settle();
 assert.deepEqual(second.got,[[{type:'next'},'remote']]);
 second.detach();a.s.close();
});

test('the TV keeps working with no remote channel',()=>{
 const bus=createFunCommandBus();const got:unknown[]=[];bus.subscribe(c=>got.push(c));
 bus.dispatch({type:'next'});
 assert.deepEqual(got,[{type:'next'}]);
});
