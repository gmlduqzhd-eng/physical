import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalPoseSession,CAMERA_SETUP_TIMEOUT,type PoseState,type PoseDetector,type PoseEnvironment} from '../src/application/localPoseSession';
import {assessArmFrame} from '../src/application/poseFeedback';
import {screenTilt,relativeTilt,requestOrientationAccess} from '../src/application/shipOrientation';

const deferred=<T>()=>{let resolve!:(value:T)=>void;let reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {resolve,reject,promise};};
class Track extends EventTarget {readyState='live';muted=false;stops=0;stop(){this.stops++;this.readyState='ended';}}
function rig(){
 const track=new Track(),stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;
 const states:PoseState[]=[],frames=new Map<number,FrameRequestCallback>(),timers=new Map<number,{at:number;run:()=>void}>();let now=0,id=0,calls=0,closes=0;
 const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));points[16]={x:.8,y:.2,visibility:1};
 let landmarks=[points],throwInference=false;
 const model:PoseDetector={detectForVideo:()=>{calls++;if(throwInference)throw Error('fixture');return {landmarks};},close:()=>closes++};
 const events=new EventTarget();
 const video={addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events),readyState:2,currentTime:0,srcObject:null,muted:false,playsInline:false,pause:()=>{},play:async()=>{}} as unknown as HTMLVideoElement;
 const env:PoseEnvironment={camera:async()=>stream,detector:async()=>model,video:()=>video,now:()=>now,frame:(run:FrameRequestCallback)=>{frames.set(++id,run);return id;},cancelFrame:(n:number)=>{frames.delete(n);},timer:(run:()=>void,ms:number)=>{timers.set(++id,{at:now+ms,run});return id as unknown as ReturnType<typeof setTimeout>;},cancelTimer:(n:ReturnType<typeof setTimeout>)=>{timers.delete(n as unknown as number);},emit:(s:PoseState)=>states.push(s)};
 const session=createLocalPoseSession(env);
 const advance=(ms:number,move=true)=>{now+=ms;if(move)video.currentTime+=ms/1000;for(const [key,t] of [...timers])if(now>=t.at){timers.delete(key);t.run();}const queued=[...frames.values()];frames.clear();queued.forEach(run=>run(now));};
 return {env,session,stream,video,track,states,advance,latest:()=>states.at(-1)!,stats:()=>({calls,closes,frames:frames.size,timers:timers.size}),empty:()=>{landmarks=[];},breakInference:()=>{throwInference=true;}};
}

test('portrait/landscape/upside-down steering uses the screen axis, rejects invalid signals and calibrates raw saturated angles',()=>{
 assert.equal(screenTilt(60,20,0),20);assert.equal(screenTilt(60,20,90),60);assert.equal(screenTilt(60,20,180),-20);assert.equal(screenTilt(60,20,270),-60);assert.equal(screenTilt(60,20,-90),-60);
 assert.equal(screenTilt(null,20,90),null);assert.equal(screenTilt(10,NaN,0),null);assert.equal(relativeTilt(70,70),0);assert.equal(relativeTilt(75,70),.2);assert.equal(relativeTilt(-179,179),.08);assert.equal(relativeTilt(70,0),1);
});
test('orientation permission requests only the orientation API, fail closed and do not treat a constructor as a signal',async()=>{
 let requested=0;assert.equal(await requestOrientationAccess({isSecureContext:true,DeviceOrientationEvent:{requestPermission:async()=>{requested++;return 'granted';}}}),'granted');assert.equal(requested,1);
 assert.equal(await requestOrientationAccess({isSecureContext:true,DeviceOrientationEvent:{requestPermission:async()=>{throw Error('denied');}}}),'denied');
 assert.equal(await requestOrientationAccess({isSecureContext:false,DeviceOrientationEvent:{}}),'unsupported');assert.equal(await requestOrientationAccess({isSecureContext:true}),'unsupported');
});
test('stopping while permission is pending closes a late stream and never starts inference',async()=>{
 const r=rig(),pending=deferred<MediaStream>();r.env.camera=()=>pending.promise;const operation=r.session.start();r.session.stop();pending.resolve(r.stream);await operation;
 assert.equal(r.track.stops,1);assert.equal(r.latest().status,'off');assert.equal(r.stats().calls,0);assert.equal(r.stats().timers,0);
});
test('stopping during model setup closes a late model without restarting the camera',async()=>{
 const r=rig(),pending=deferred<PoseDetector>();r.env.detector=()=>pending.promise;const operation=r.session.start();await Promise.resolve();await Promise.resolve();r.session.stop();let closed=0;pending.resolve({detectForVideo:()=>({landmarks:[]}),close:()=>closed++});await operation;
 assert.equal(closed,1);assert.equal(r.track.stops,1);assert.equal(r.video.srcObject,null);assert.equal(r.latest().status,'off');
});
test('camera denial preserves an actionable error and allows a fresh attempt',async()=>{
 const r=rig();r.env.camera=async()=>{throw {name:'NotAllowedError'};};await r.session.start();assert.equal(r.latest().status,'error');assert.match(r.latest().message,/권한/);r.env.camera=async()=>r.stream;await r.session.start();r.advance(150);assert.equal(r.latest().status,'tracking');r.session.dispose();
});
test('unanswered permission/model setup expires and late media is released',async()=>{
 const r=rig(),pending=deferred<MediaStream>();r.env.camera=()=>pending.promise;const operation=r.session.start();r.advance(CAMERA_SETUP_TIMEOUT+1);assert.equal(r.latest().status,'error');assert.match(r.latest().message,/기다리다/);pending.resolve(r.stream);await operation;assert.equal(r.track.stops,1);assert.equal(r.stats().frames,0);
});
test('an inference exception preserves error state and releases all owned resources',async()=>{
 const r=rig();await r.session.start();r.breakInference();r.advance(150);assert.equal(r.latest().status,'error');assert.match(r.latest().message,/인식을 중지/);assert.deepEqual(r.stats(),{calls:1,closes:1,frames:0,timers:0});assert.equal(r.track.stops,1);assert.equal(r.video.srcObject,null);
});
test('a frozen video clears the previous pose and eventually closes the camera instead of scoring a stale wrist',async()=>{
 const r=rig();await r.session.start();r.advance(150);assert.equal(r.latest().status,'tracking');assert(r.latest().value);r.advance(450,false);assert.equal(r.latest().status,'lost');assert.equal(r.latest().value,null);r.advance(6000,false);assert.equal(r.latest().status,'error');assert.equal(r.track.stops,1);
});
test('track mute clears landmarks immediately and ended releases resources',async()=>{
 const r=rig();await r.session.start();r.advance(150);r.track.muted=true;r.track.dispatchEvent(new Event('mute'));assert.equal(r.latest().status,'lost');assert.equal(r.latest().value,null);r.track.readyState='ended';r.track.dispatchEvent(new Event('ended'));assert.equal(r.latest().status,'error');assert.equal(r.stats().frames,0);assert.equal(r.stats().closes,1);
});
test('the same video frame is not repeatedly inferred, and losing a visible wrist clears the value',async()=>{
 const r=rig();await r.session.start();r.advance(150);r.advance(150,false);assert.equal(r.stats().calls,1);r.empty();r.advance(150);assert.equal(r.latest().status,'lost');assert.equal(r.latest().value,null);r.session.dispose();const count=r.states.length;r.advance(1000);assert.equal(r.states.length,count);assert.equal(r.stats().frames,0);
});
test('video playback rejection closes the acquired camera and gives an error',async()=>{
 const r=rig();r.video.play=async()=>{throw {name:'NotReadableError'};};await r.session.start();assert.equal(r.latest().status,'error');assert.match(r.latest().message,/다른 앱/);assert.equal(r.track.stops,1);
});

test('video pause immediately clears the pose and no frozen frame is inferred',async()=>{const r=rig();await r.session.start();r.advance(150);assert(r.latest().value);Object.defineProperty(r.video,'paused',{value:true,configurable:true});r.video.dispatchEvent(new Event('pause'));assert.equal(r.latest().status,'lost');assert.equal(r.latest().value,null);const calls=r.stats().calls;r.advance(200);assert.equal(r.stats().calls,calls);r.session.dispose();});

test('pose alignment feedback distinguishes empty frame, shoulder, wrist and arm overlap without lowering confidence',()=>{const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));points[16]={x:.8,y:.2,visibility:1};assert(assessArmFrame(points).value);assert.match(assessArmFrame([]).message,/몸을 찾지/);points[12].visibility=.6;assert.equal(assessArmFrame(points).value,null);assert.match(assessArmFrame(points).message,/어깨/);points[12].visibility=1;points[16].visibility=.6;assert.match(assessArmFrame(points).message,/손목/);points[16].visibility=NaN;assert.equal(assessArmFrame(points).value,null);points[16]={x:1.1,y:.2,visibility:1};assert.equal(assessArmFrame(points).value,null);points[16]={x:.5,y:.5,visibility:1};assert.match(assessArmFrame(points).message,/겹치지/);});

test('back camera preserves non-mirrored game input and stopping clears camera diagnostics',async()=>{const r=rig();r.env.requestedFacing=()=>'environment';await r.session.start();r.advance(150);assert.equal(r.latest().cameraFacing,'unknown');assert(Math.abs(r.latest().value!.x-.8)<.0001);assert(r.latest().diagnostic!.wrist);r.session.stop();assert.equal(r.latest().diagnostic,undefined);assert.equal(r.latest().cameraFacing,undefined);});
