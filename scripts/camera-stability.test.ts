import test from 'node:test';
import assert from 'node:assert/strict';
import {monitorCamera} from '../src/application/cameraMonitor';
import {createMotionCameraSession,type MotionCameraState} from '../src/application/motionCameraSession';
import {createQrCameraSession,type QrCameraState,type QrDriver} from '../src/application/qrCameraSession';
import {missionQrValue,TREASURE_QR_CODES} from '../src/domain/missionQr';
import {classroomQrPath} from '../src/domain/classroomQr';

const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));
const deferred=<T>()=>{let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function rig(){
 let now=0,id=0,plays=0,stops=0;const frames=new Map<number,FrameRequestCallback>(),timers=new Map<number,{at:number;fn:()=>void}>();
 const track=Object.assign(new EventTarget(),{readyState:'live',muted:false,enabled:true,stop:()=>{stops++;track.readyState='ended';}});
 const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;
 const video=Object.assign(new EventTarget(),{paused:false,ended:false,readyState:2,currentTime:0,videoWidth:320,videoHeight:240,srcObject:stream,muted:true,playsInline:true,play:async()=>{plays++;video.paused=false;},pause:()=>{video.paused=true;}}) as unknown as HTMLVideoElement;
 const clock={now:()=>now,frame:(fn:FrameRequestCallback)=>{frames.set(++id,fn);return id;},cancelFrame:(n:number)=>{frames.delete(n);},timer:(fn:()=>void,ms:number)=>{timers.set(++id,{at:now+ms,fn});return id as unknown as ReturnType<typeof setTimeout>;},cancelTimer:(n:ReturnType<typeof setTimeout>)=>{timers.delete(n as unknown as number);}};
 const advance=(ms:number,move=true)=>{now+=ms;if(move)video.currentTime+=ms/1000;for(const [key,t] of [...timers])if(now>=t.at){timers.delete(key);t.fn();}const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn(now));};
 return {track,stream,video,clock,advance,elapse:(ms:number)=>{now+=ms;},stats:()=>({frames:frames.size,timers:timers.size,plays,stops})};
}
function motion(){const r=rig(),states:MotionCameraState[]=[];let pixels=new Uint8ClampedArray(64*48*4),reads=0,cameras=0;const session=createMotionCameraSession({...r.clock,camera:async()=>{cameras++;return r.stream;},video:()=>r.video,pixels:()=>{reads++;return pixels;},emit:s=>states.push(s)});return {...r,session,states,latest:()=>states.at(-1)!,pixels:(value:number)=>{pixels=new Uint8ClampedArray(64*48*4).fill(value);},reads:()=>reads,cameras:()=>cameras};}
function qr(){
 const r=rig(),states:QrCameraState[]=[],accepted:string[]=[];let read=(text:string)=>{void text;},opens=0,closes=0,pauses=0,resumes=0;
 const driver:QrDriver={open:async(_mode,fn)=>{opens++;read=fn;},video:()=>r.video,pause:()=>{pauses++;},resume:()=>{resumes++;},close:async()=>{closes++;r.track.stop();r.video.srcObject=null;}};
 const env={...r.clock,create:async()=>driver,parse:(text:string)=>text==='valid'?'accepted':null,accept:(text:string)=>{accepted.push(text);},invalidMessage:'등록된 QR을 사용해 주세요.',emit:(s:QrCameraState)=>states.push(s)};
 const session=createQrCameraSession(env);return {...r,session,driver,env,accepted,states,read:(text:string)=>read(text),latest:()=>states.at(-1)!,counts:()=>({opens,closes,pauses,resumes})};
}

test('monitor only consumes new live frames and invalidates a muted, disabled or frozen source',()=>{
 const r=rig();let count=0;const monitor=monitorCamera(r.video,r.stream,{state:()=>{},frame:()=>count++,fatal:()=>{}},r.clock);
 r.advance(120);assert.equal(count,1);r.advance(120,false);assert.equal(count,1);r.track.muted=true;r.track.dispatchEvent(new Event('mute'));assert(!monitor.fresh());r.track.muted=false;r.track.enabled=false;r.advance(120);assert.equal(count,1);r.track.enabled=true;r.advance(120);assert.equal(count,2);r.elapse(401);assert(!monitor.fresh());monitor.stop();assert.equal(r.stats().frames,0);
});
test('monitor resumes the same live video once and removes all handlers when stopped',async()=>{
 const r=rig();let fatal=0;const monitor=monitorCamera(r.video,r.stream,{state:()=>{},frame:()=>{},fatal:()=>fatal++},r.clock);r.advance(120);r.video.pause();r.video.dispatchEvent(new Event('pause'));assert(!monitor.fresh());await flush();assert.equal(r.stats().plays,1);r.advance(120,false);assert(!monitor.fresh());r.advance(120);assert(monitor.fresh());monitor.stop();r.video.pause();r.track.dispatchEvent(new Event('unmute'));assert.equal(r.stats().plays,1);assert.equal(fatal,0);
});
test('monitor fails closed after six seconds of no fresh frame or an ended stream',()=>{
 for(const ended of [false,true]){const r=rig();let fatal=0;monitorCamera(r.video,r.stream,{state:()=>{},frame:()=>{},fatal:()=>fatal++},r.clock);r.advance(100);if(ended)r.track.dispatchEvent(new Event('ended'));else r.advance(6100,false);assert.equal(fatal,1);assert.equal(r.stats().frames,0);}
});
test('motion counts real frame changes but not a frozen video or the first frame after a pause',async()=>{
 const r=motion();await r.session.start();r.advance(120);r.pixels(255);r.advance(800);assert.equal(r.latest().count,1);const reads=r.reads();r.advance(500,false);assert.equal(r.reads(),reads);assert.equal(r.latest().energy,0);r.pixels(0);r.advance(120);assert.equal(r.latest().count,1);assert.equal(r.latest().energy,0);r.advance(800);assert.equal(r.latest().count,1);r.pixels(255);r.advance(800);assert.equal(r.latest().count,2);r.session.dispose();assert.equal(r.stats().stops,1);
});
test('motion mute/unmute resets comparison baseline without reacquiring permission',async()=>{
 const r=motion();await r.session.start();r.advance(120);r.track.muted=true;r.track.dispatchEvent(new Event('mute'));assert.equal(r.latest().status,'lost');r.pixels(255);r.track.muted=false;r.track.dispatchEvent(new Event('unmute'));r.advance(800);assert.equal(r.latest().count,0);assert.equal(r.cameras(),1);r.session.dispose();
});
test('motion compatibility reduces sample cadence and reset preserves tracking with a new baseline',async()=>{
 const r=motion();await r.session.start('compatibility');r.advance(100);r.advance(100);assert.equal(r.reads(),1);r.advance(100);assert.equal(r.reads(),2);r.pixels(255);r.advance(800);assert.equal(r.latest().count,1);r.session.reset();assert.equal(r.latest().count,0);r.pixels(0);r.advance(800);assert.equal(r.latest().count,0);r.session.dispose();
});
test('motion releases late camera permission and does not update a disposed view',async()=>{
 const r=rig(),pending=deferred<MediaStream>(),states:MotionCameraState[]=[];const session=createMotionCameraSession({...r.clock,camera:()=>pending.promise,video:()=>r.video,pixels:()=>new Uint8ClampedArray(64*48*4),emit:s=>states.push(s)});const operation=session.start();session.dispose();const count=states.length;pending.resolve(r.stream);await operation;assert.equal(r.stats().stops,1);assert.equal(states.length,count);assert.equal(r.stats().frames,0);assert.equal(r.stats().timers,0);
});
test('motion draw error, camera denial and prolonged freeze each close owned resources',async()=>{
 for(const error of ['draw','permission','freeze']){const r=rig(),states:MotionCameraState[]=[];const session=createMotionCameraSession({...r.clock,camera:async()=>{if(error==='permission')throw {name:'NotAllowedError'};return r.stream;},video:()=>r.video,pixels:()=>{if(error==='draw')throw Error('draw');return new Uint8ClampedArray(64*48*4);},emit:s=>states.push(s)});await session.start();r.advance(120);if(error==='freeze')r.advance(6100,false);assert.equal(states.at(-1)!.status,'error');assert.equal(r.stats().stops,error==='permission'?0:1);assert.equal(r.stats().frames,0);session.dispose();}
});
test('QR ignores startup, invalid, muted and stale-frame callbacks; accepts only once after closing',async()=>{
 const r=qr();await r.session.start();r.read('valid');assert.equal(r.accepted.length,0);r.advance(120);r.read('foreign');assert.match(r.latest().message,/등록/);r.track.muted=true;r.track.dispatchEvent(new Event('mute'));r.read('valid');assert.equal(r.accepted.length,0);r.track.muted=false;r.advance(120);r.elapse(401);r.read('valid');assert.equal(r.accepted.length,0);r.advance(120);r.read('valid');r.read('valid');await flush();assert.deepEqual(r.accepted,['accepted']);assert.equal(r.counts().closes,1);assert.equal(r.stats().frames,0);assert.equal(r.stats().stops,1);
});
test('QR pause suspends decode and resumes only after a genuinely new frame',async()=>{
 const r=qr();await r.session.start();assert.equal(r.counts().pauses,0,'initial overlay is not ready to pause');r.advance(120);const resumes=r.counts().resumes;r.video.pause();r.video.dispatchEvent(new Event('pause'));assert.equal(r.latest().status,'recovering');assert.equal(r.counts().pauses,1);r.read('valid');assert.equal(r.accepted.length,0);await flush();r.advance(120,false);assert.equal(r.counts().resumes,resumes);r.advance(120);assert.equal(r.counts().resumes,resumes+1);await r.session.stop();
});
test('QR cancellation while permission is pending closes late stream, blocks overlapping starts and never accepts',async()=>{
 const r=qr(),pending=deferred<void>();r.driver.open=async(_mode,fn)=>{r.read=fn;await pending.promise;};const operation=r.session.start();await flush();const stop=r.session.stop();await r.session.start();assert.equal(r.latest().status,'closing');r.read('valid');pending.resolve();await operation;await stop;assert.equal(r.counts().closes,1);assert.equal(r.stats().stops,1);assert.equal(r.accepted.length,0);assert.equal(r.latest().status,'off');
});
test('QR cancellation during lazy import never opens camera and cleans only that driver',async()=>{
 const r=qr(),pending=deferred<QrDriver>();r.env.create=()=>pending.promise;const operation=r.session.start();const stop=r.session.stop();pending.resolve(r.driver);await operation;await stop;assert.equal(r.counts().opens,0);assert.equal(r.counts().closes,1);assert.equal(r.stats().frames,0);
});
test('QR timeout does not reopen permission and disposes a late result',async()=>{
 const r=qr(),pending=deferred<void>();r.driver.open=()=>pending.promise;const operation=r.session.start();await flush();r.advance(20001,false);assert.equal(r.latest().status,'closing');pending.resolve();await operation;await flush();assert.equal(r.latest().status,'error');assert.equal(r.counts().closes,1);assert.equal(r.accepted.length,0);
});
test('QR stop during acceptance cleanup cancels pending navigation or mission submission',async()=>{
 const r=qr(),pending=deferred<void>();r.driver.close=()=>pending.promise;await r.session.start();r.advance(120);r.read('valid');const stop=r.session.stop();pending.resolve();await stop;await flush();assert.equal(r.accepted.length,0);assert.equal(r.latest().status,'off');
});
test('QR driver failure and camera termination clean the scanner without a duplicate callback',async()=>{
 for(const ended of [false,true]){const r=qr();if(!ended)r.driver.open=async()=>{throw {name:'NotAllowedError'};};await r.session.start();if(ended){r.advance(100);r.track.dispatchEvent(new Event('ended'));await flush();}assert.equal(r.latest().status,'error');assert.equal(r.counts().closes,1);assert.equal(r.accepted.length,0);assert.equal(r.stats().frames,0);}
});
test('QR input allowlists preserve valid join, station and treasure codes and reject foreign content',()=>{
 const room='11111111-1111-4111-8111-111111111111',url=`https://physical-pi.vercel.app/join?room=${room}&group=1%EB%AA%A8%EB%91%A0#code=123456789abc`;
 assert(classroomQrPath(url,'https://physical-pi.vercel.app'));assert.equal(classroomQrPath(url.replace('physical-pi.vercel.app','evil.example'),'https://physical-pi.vercel.app'),null);
 for(const code of TREASURE_QR_CODES)assert.equal(missionQrValue(code,[]),code);assert.equal(missionQrValue('registered',['registered']),'registered');assert.equal(missionQrValue('TREASURE_FAKE',[]),null);assert.equal(missionQrValue('javascript:alert(1)',[]),null);assert.equal(missionQrValue('x'.repeat(4097),['x'.repeat(4097)]),null);
});

test('QR detaches a cancelled pending surface before waiting for permission and disposes without UI updates',async()=>{
 const r=qr(),pending=deferred<void>();let retired=0;r.driver.retire=()=>{retired++;};r.driver.open=()=>pending.promise;const operation=r.session.start();await flush();r.session.dispose();const states=r.states.length;assert.equal(retired,1);pending.resolve();await operation;await flush();assert.equal(r.states.length,states);assert.equal(r.counts().closes,1);assert.equal(r.stats().frames,0);assert.equal(r.accepted.length,0);
});
