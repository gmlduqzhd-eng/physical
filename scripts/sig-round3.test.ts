import test from 'node:test';
import assert from 'node:assert/strict';
import {createFunState,cueIntervalMs,reduce,reduceGated,restoreFunState,stateBeforeCue,type FunCommand,type FunState} from '../src/domain/funLoop';
import {bossRaid,bossRaidCue,BOSSES} from '../src/domain/signature/sig-boss-raid';
import {signalCaptain,signalCaptainCue,NUMBER_CUE_SECONDS,CARD_EVERY} from '../src/domain/signature/sig-signal-captain';
import {memoryRelay,memoryRelayGate,memoryResultLine,relayTeam,sequenceLength,turnTooShort,START_LENGTH} from '../src/domain/signature/sig-memory-relay';
import {mirrorPair,mirrorStep,STEPS_PER_ROUND,CLOSE_SECONDS} from '../src/domain/signature/sig-mirror-pair';
import {stageShow,curtainGroup,reactionTarget,scenesFor} from '../src/domain/signature/sig-stage-show';
import {moveBingo} from '../src/domain/signature/sig-move-bingo';
import type {SignatureCueContext,SignatureGameDef} from '../src/domain/signature/types';
import {shortcutHelp} from '../src/presentation/components/minigames/signature/signatureCue';

// sessionStorage 대역(이어 하기·리모컨 방 코드 저장 검사용)
class MemoryStorage{private m=new Map<string,string>();get length(){return this.m.size;}key(i:number){return [...this.m.keys()][i]??null;}getItem(k:string){return this.m.get(k)??null;}setItem(k:string,v:string){this.m.set(k,String(v));}removeItem(k:string){this.m.delete(k);}clear(){this.m.clear();}}
(globalThis as unknown as {sessionStorage:MemoryStorage}).sessionStorage=new MemoryStorage();
const store=(globalThis as unknown as {sessionStorage:MemoryStorage}).sessionStorage;

const ctxOf=(game:SignatureGameDef,state:FunState,phase:SignatureCueContext['phase'],index:number,extra:Partial<SignatureCueContext>={}):SignatureCueContext=>({phase,index,seed:state.seed,reversed:false,frozen:false,seated:false,teams:state.teams,state,...extra});
const tick=(s:FunState,ms:number,hooks?:Parameters<typeof reduce>[2])=>{let n=s;for(let t=0;t<ms;t+=250)n=reduce(n,{type:'tick',ms:250},hooks);return n;};

test('per-cue seconds: the boss "10초" cue lasts 12s and number cards 8s; the engine honors the hook',()=>{
 const s=createFunState({teams:2,timing:bossRaid.timing,seed:3,skipDemo:true});
 // 신호 내용은 그 신호가 시작될 때의 보스로 정한다: 앞 신호(0번)에서 보스를 다 쓰러뜨렸으면 1번 신호는 드래곤.
 const dragon=bossRaidCue(ctxOf(bossRaid,{...s,phase:'play',cueIndex:1,cueHits:{'play:0':999}},'play',1));
 assert.match(dragon.text,/10초/);
 assert.equal(dragon.seconds,12);
 const slime=bossRaidCue(ctxOf(bossRaid,{...s,phase:'play'},'play',0));
 assert.equal(slime.seconds,undefined,'"5번" moves keep the normal interval');
 assert.ok(BOSSES.some(b=>/10초/.test(b.weak)));
 // 숫자 카드 신호는 8초
 const sc=createFunState({teams:2,timing:signalCaptain.timing,seed:1,skipDemo:true});
 const numberIndex=3*CARD_EVERY+1;// 본게임 네 번째 카드(숫자)의 첫 동작 신호
 const cue=signalCaptainCue(ctxOf(signalCaptain,{...sc,phase:'play'},'play',numberIndex));
 assert.match(cue.text,/^\d!$/);
 assert.equal(cue.seconds,NUMBER_CUE_SECONDS);
 assert.ok(NUMBER_CUE_SECONDS>=8);
 // 엔진: cueSeconds 훅이 신호 간격을 바꾼다.
 let p=reduce(sc,{type:'next'});
 assert.equal(cueIntervalMs(p,8),8000);
 p=tick(p,5000,{cueSeconds:()=>8});
 assert.equal(p.cueIndex,0,'still on the first cue after 5s with an 8s cue');
 p=tick(p,3500,{cueSeconds:()=>8});
 assert.equal(p.cueIndex,1);
});

test('stage show: the curtain call has each team once and does not score; MVP is the winner’s own scene',()=>{
 for(const teams of [2,3,4]){
  const seen=Array.from({length:teams+3},(_,i)=>curtainGroup(i,teams)).filter(g=>g!==null);
  assert.deepEqual(seen,Array.from({length:teams},(_,g)=>g),`teams ${teams}: each team once`);
  for(let i=0;i<teams+3;i++)assert.equal(reactionTarget({phase:'climax',index:i,teams}),null,'no scoring in the curtain call');
 }
 assert.deepEqual(stageShow.surprises?.climax,[]);
 const s:FunState={...createFunState({teams:4,timing:stageShow.timing,seed:11,skipDemo:true}),scores:[2,9,4,1]};
 const scenes=scenesFor(11,4);
 assert.ok(stageShow.mvpMove?.(s)?.includes(scenes[1].title),'MVP = the winning team scene');
 assert.equal(stageShow.mvpMove?.({...s,scores:[0,0,0,0]}),undefined);
});

test('memory relay: same length per round, short turns are not started, success once per turn even in the tutorial',()=>{
 let s=createFunState({teams:4,timing:memoryRelay.timing,seed:2,skipDemo:true});
 // 연습 판: 한 차례에 한 번만
 const team=relayTeam(0,4);
 s={...s,cueMs:memoryRelay.timing.cueSeconds*1000*1.6-100};// 순서가 가려진 뒤
 const first=reduceGated(s,{type:'score',team,delta:1},memoryRelayGate);
 assert.equal(first.scores[team],1);
 const second=reduceGated(first,{type:'score',team,delta:1},memoryRelayGate);
 assert.equal(second.scores[team],1,'the tutorial also accepts one success per turn');
 // 본게임: 같은 바퀴의 모둠은 같은 길이
 let p=reduce(s,{type:'next'});
 p={...p,cueHits:{'play:1':1}};
 assert.deepEqual([0,1,2,3].map(i=>sequenceLength(p,'play',i)),[START_LENGTH,START_LENGTH,START_LENGTH,START_LENGTH]);
 assert.deepEqual([4,5,6,7].map(i=>sequenceLength(p,'play',i)),[START_LENGTH+1,START_LENGTH+1,START_LENGTH+1,START_LENGTH+1]);
 // 남은 시간이 한 차례보다 짧으면 새 차례를 시작하지 않는다.
 const interval=cueIntervalMs(p);
 const late:FunState={...p,phaseMs:memoryRelay.timing.play*1000-interval+2000,cueMs:0,cueIndex:9};
 assert.equal(turnTooShort(late),true);
 assert.equal(memoryRelay.cue(ctxOf(memoryRelay,late,'play',9)).text,'다 같이 마무리!');
 const lateTeam=relayTeam(9,4);
 // 같은 차례 안에서 시간이 흘러(외우기가 끝난 뒤) 성공을 눌러도 받지 않는다.
 const laterInTurn={...late,phaseMs:late.phaseMs+6000,cueMs:6000};
 assert.equal(turnTooShort(laterInTurn),true);
 assert.equal(memoryRelayGate(laterInTurn,{type:'score',team:lateTeam,delta:1}),null,'no success in a cut-off turn');
 // 같은 시점이라도 시간이 넉넉한 차례면 성공을 받는다.
 assert.ok(memoryRelayGate({...p,cueIndex:9,phaseMs:20000,cueMs:6000},{type:'score',team:lateTeam,delta:1}));
 assert.equal(turnTooShort({...late,phaseMs:1000,cueMs:0}),false);
 assert.match(memoryResultLine({...p,cueHits:{}}),/아직 성공 기록이 없어요/);
});

test('a −1 correction reverts only that team’s own success',()=>{
 let s=reduce(createFunState({teams:2,timing:bossRaid.timing,seed:4,skipDemo:true}),{type:'next'});
 s=reduce(s,{type:'score',team:0,delta:1});
 s=tick(s,bossRaid.timing.cueSeconds*1000+100);
 s=reduce(s,{type:'score',team:1,delta:1});
 assert.deepEqual(s.cueHits,{'play:0':1,'play:1':1});
 const fixed=reduce(s,{type:'score',team:0,delta:-1});
 assert.deepEqual(fixed.scores,[0,1]);
 assert.deepEqual(fixed.cueHits,{'play:1':1},'team 1’s later success stays');
 const penalty=reduce(fixed,{type:'score',team:0,delta:-1});
 assert.deepEqual(penalty.cueHits,{'play:1':1},'a penalty with no own hits leaves the others alone');
});

test('mirror pair: the follower closes eyes (3s) before the secret change, then opens and finds',()=>{
 assert.equal(STEPS_PER_ROUND,5);
 assert.deepEqual([0,1,2,3,4].map(mirrorStep),['lead','keep','close','change','find']);
 const s=createFunState({teams:2,timing:mirrorPair.timing,seed:1,skipDemo:true});
 const close=mirrorPair.cue(ctxOf(mirrorPair,{...s,phase:'play'},'play',2));
 assert.match(close.text,/눈 감기/);
 assert.equal(close.seconds,CLOSE_SECONDS);
 assert.match(mirrorPair.cue(ctxOf(mirrorPair,{...s,phase:'play'},'play',3)).sub??'',/눈 감은 동안/);
 assert.match(mirrorPair.cue(ctxOf(mirrorPair,{...s,phase:'play'},'play',4)).text,/눈 뜨고 찾기/);
 const tutorial=Array.from({length:5},(_,i)=>mirrorPair.cue(ctxOf(mirrorPair,s,'tutorial',i)).text);
 assert.ok(tutorial.some(t=>/눈 감기/.test(t)));
});

test('the boss MVP ignores practice-round specials; stricter restore validation',()=>{
 let s=createFunState({teams:2,timing:bossRaid.timing,seed:5,skipDemo:true});
 s={...s,combo:100};
 s=reduce(s,{type:'special'});
 assert.equal(s.specials,1);
 s=reduce(s,{type:'next'});
 assert.equal(s.specials,0);
 assert.equal(stateBeforeCue(s,{phase:'play',index:0}).specials,0,'the practice special does not count before play:0');
 const timing=bossRaid.timing;
 const ok=JSON.parse(JSON.stringify(s));
 assert.ok(restoreFunState(ok,{timing,teams:2}));
 assert.equal(restoreFunState({...ok,allowedSurprises:{play:['nope'],climax:[]}},{timing,teams:2}),null);
 assert.equal(restoreFunState({...ok,allowedSurprises:null},{timing,teams:2}),null);
 assert.equal(restoreFunState({...ok,surprises:[{phase:'play',atMs:'x',kind:'golden'}]},{timing,teams:2}),null);
 assert.equal(restoreFunState({...ok,surprises:[{phase:'tutorial',atMs:1,kind:'golden'}]},{timing,teams:2}),null);
 assert.equal(restoreFunState({...ok,teamHits:{a:'1'}},{timing,teams:2}),null);
 const legacy={...ok};delete (legacy as Record<string,unknown>).teamHits;
 assert.deepEqual(restoreFunState(legacy,{timing,teams:2})?.teamHits,{},'older saves without teamHits still resume');
});

test('resume is not offered for a recorded result; the remote room code expires and is cleared on exit',async()=>{
 const {saveFunSession,loadFunSession,saveRemoteRoom,loadRemoteRoom,clearRemoteRoom,REMOTE_ROOM_TTL_MS}=await import('../src/application/funSession');
 store.clear();
 const setup={teams:2,seated:false,skipDemo:false,round:0};
 const playing=reduce(createFunState({teams:2,timing:bossRaid.timing,seed:7,skipDemo:true}),{type:'next'});
 saveFunSession({gameId:'sig-boss-raid',setup,seed:7,state:playing,recorded:false});
 assert.ok(loadFunSession('sig-boss-raid',bossRaid.timing),'a game in progress can be resumed');
 const ended=reduce(playing,{type:'end'});
 saveFunSession({gameId:'sig-boss-raid',setup,seed:7,state:ended,recorded:false});
 assert.ok(loadFunSession('sig-boss-raid',bossRaid.timing),'an unrecorded result can still be recorded after a reload');
 saveFunSession({gameId:'sig-boss-raid',setup,seed:7,state:ended,recorded:true});
 assert.equal(loadFunSession('sig-boss-raid',bossRaid.timing),null,'a recorded result is not offered again');
 // 방 코드: 2시간 기한, 목록으로 나가면 방 코드와 그 방의 리모컨 기록을 지운다.
 const now=Date.now();
 saveRemoteRoom('sig-boss-raid','ABC234',now);
 assert.equal(loadRemoteRoom('sig-boss-raid',now+1000),'ABC234');
 // 불러올 때(쓰는 중) 기한이 늘어난다: 마지막으로 쓴 때로부터 2시간이 지나야 끝난다.
 assert.equal(loadRemoteRoom('sig-boss-raid',now+REMOTE_ROOM_TTL_MS),'ABC234','using the code refreshes its 2-hour window');
 assert.equal(loadRemoteRoom('sig-boss-raid',now+REMOTE_ROOM_TTL_MS+REMOTE_ROOM_TTL_MS+1),undefined,'expired 2 hours after the last use');
 saveRemoteRoom('sig-boss-raid','ABC234',now);
 store.setItem('physical_fun_remote_approved_ABC234','["d1"]');
 store.setItem('fun-remote:approved:ABC234','["d1"]');
 store.setItem('physical_fun_remote_approved_ZZZ999','["d2"]');
 clearRemoteRoom('sig-boss-raid');
 assert.equal(loadRemoteRoom('sig-boss-raid'),undefined);
 assert.equal(store.getItem('physical_fun_remote_approved_ABC234'),null);
 assert.equal(store.getItem('fun-remote:approved:ABC234'),null);
 assert.equal(store.getItem('physical_fun_remote_approved_ZZZ999'),'["d2"]','other rooms are untouched');
 store.setItem('fun-remote-room:sig-boss-raid','ABC234');
 assert.equal(loadRemoteRoom('sig-boss-raid'),undefined,'the old plain-code format (no time) is not reused');
});

test('per-game shortcut help shows only the keys the game uses',()=>{
 const bingo=shortcutHelp(moveBingo,{scoreButtons:false});
 assert.doesNotMatch(bingo,/1~4|A |S 필살기/);
 const boss=shortcutHelp(bossRaid,{special:true});
 assert.match(boss,/S 필살기/);
 const memory=shortcutHelp(memoryRelay,{scoreAllLabel:'차례 팀 성공',teamKeysLabel:'1~4 차례 팀 성공 (Shift −1 정정)'});
 assert.match(memory,/A 차례 팀 성공/);
 assert.doesNotMatch(memory,/S 필살기/);
 const stage=shortcutHelp(stageShow,{});
 assert.doesNotMatch(stage,/G 황금 신호/,'stage show has no golden event');
});

test('the gate blocks specials in games without one (wired in SignaturePlay)',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync('src/presentation/components/minigames/signature/SignaturePlay.tsx','utf8');
 assert.match(src,/cmd\.type==='special'&&!mod\.special\?null/);
 assert.match(src,/\{mod\.special&&<ComboGauge/);
 assert.match(src,/inert=\{state\.paused\|\|undefined\}/);
 assert.match(src,/resumeRef\.current\?\.focus/);
 assert.doesNotMatch(src,/useEffect\(\(\)=>\(\)=>dispose\?\.\(seed\)/,'module stores are not disposed in an unmount cleanup');
 // 결과 단계 리모컨 스냅숏에는 결과 제목을 보낸다.
 assert.match(src,/cue:state\.phase==='result'\?resultHeadlineOf\(game,state\):cue\.text/);
 const cmd:FunCommand={type:'special'};assert.equal(cmd.type,'special');
});
