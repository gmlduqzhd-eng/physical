import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FUN_PHASE_LABEL,acceptsPlayInput,createFunState,reduce,reduceGated,restoreFunState,resultSummary,scheduleSurprises,stateBeforeCue,surprisesNow,takeBackHits,type FunCommand,type FunState} from '../src/domain/funLoop';
import {createFunCommandBus,type FunRemoteSnapshot} from '../src/application/funCommandBus';
import {FUN_SESSION_TTL_MS,clearFunSession,loadFunSession,loadRemoteRoom,saveFunSession,saveRemoteRoom} from '../src/application/funSession';
import {bossDamage,bossRaid,bossStatus,bossesFor,expectedDamage} from '../src/domain/signature/sig-boss-raid';
import {MAX_LENGTH,memoryRelay,memoryRelayGate,memoryResultLine,memoryStage,sequenceLength,variationFor} from '../src/domain/signature/sig-memory-relay';
import {cellHints,moveBingo,moveBingoGate} from '../src/domain/signature/sig-move-bingo';
import {bestByScore,stageShow,stageTally} from '../src/domain/signature/sig-stage-show';
import {signalCaptain} from '../src/domain/signature/sig-signal-captain';
import {mirrorPair} from '../src/domain/signature/sig-mirror-pair';
import {figureJoints,POSE_JOINTS} from '../src/presentation/components/fun/stickFigureJoints';

const timing={demo:10,tutorial:20,play:60,climax:20,cueSeconds:4};
const run=(s:FunState,...cmds:FunCommand[])=>cmds.reduce(reduce,s);
const tickFor=(s:FunState,ms:number)=>{let n=s;for(let t=0;t<ms;t+=250)n=reduce(n,{type:'tick',ms:250});return n;};
const read=(p:string)=>readFileSync(p,'utf8');

test('1: sig games replay inside the game — the page click-capture skips them, and each new round can record again',()=>{
 const page=read('src/presentation/GamePlayPage.tsx');
 assert.match(page,/if \(!gameFinished \|\| signatureGame\) return;/,'the /다시/ capture handler must not hijack sig games (pause → ▶ 다시 시작)');
 assert.match(page,/onRoundReset=\{resetForNextRound\}/);
 assert.match(page,/const resetForNextRound = useCallback\(\(\) => \{\n\s*completionRef\.current = false;\n\s*setGameFinished\(false\);/);
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/onReplay=\{\(\)=>\{(disposeRound\(\);)?onRoundReset\?\.\(\);/,'한 판 더 resets the page completion lock first');
 // B: the legacy result card is not drawn behind a sig game result
 assert.match(page,/\{gameFinished && !showDetailedResult && !signatureGame && \(/);
});

test('2: the remote survives result and replay — bus and RemoteLink live outside the round-keyed arena, and late remotes get the last state',()=>{
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 const outer=sig.slice(sig.indexOf('export function SignaturePlay'),sig.indexOf('function SignatureArena'));
 assert.match(outer,/const bus=useMemo\(\(\)=>createFunCommandBus\(\),\[\]\);/);
 assert.match(outer,/<RemoteLink bus=\{bus\}/);
 assert.doesNotMatch(sig.slice(sig.indexOf('function SignatureArena')),/<RemoteLink/);
 const bus=createFunCommandBus();const got:FunRemoteSnapshot[]=[];
 const snap={gameId:'g',gameName:'G',phase:'result',paused:false,secondsLeft:0,teams:2,scores:[1,2],scoreLabel:'점수',cue:'',combo:0,comboFull:false} as FunRemoteSnapshot;
 bus.publishState(snap);
 bus.attach({connect:()=>()=>{},publishState:s=>got.push(s)});
 assert.deepEqual(got,[snap],'a remote that attaches late immediately gets the latest TV state');
});

test('4: ending from the demo or practice zeroes practice points and names no winner',()=>{
 let s=createFunState({teams:2,timing,seed:1,skipDemo:true});
 s=run(s,{type:'score',team:0,delta:3},{type:'combo',delta:50},{type:'end'});
 assert.deepEqual(s.scores,[0,0]);assert.deepEqual(s.cueHits,{});assert.equal(s.combo,0);
 const r=resultSummary(s,{concept:'민첩성',reflection:'q',nextChallenge:'n'});
 assert.equal(r.practiceOnly,true);assert.deepEqual(r.winners,[]);assert.match(r.headline,/연습만 했어요/);
 // 본게임 중 0:0으로 선생님이 끝내면 '끝까지 했어요'가 아니다
 const t=run(createFunState({teams:2,timing,seed:1,skipDemo:true}),{type:'next'},{type:'end'});
 assert.equal(resultSummary(t,{concept:'a',reflection:'b',nextChallenge:'c'}).headline,'여기까지 함께 했어요!');
});

test('5: while paused nothing scores; one event at a time; the memory-relay gate applies to keyboard and remote too',()=>{
 let s=run(createFunState({teams:2,timing,seed:1,skipDemo:true}),{type:'next'},{type:'pause'});
 const before=s;
 s=run(s,{type:'score',team:0,delta:1},{type:'scoreAll',delta:1},{type:'event',event:'golden'},{type:'combo',delta:100},{type:'special'});
 assert.deepEqual(s.scores,before.scores);assert.equal(s.event,null);assert.equal(s.combo,0);assert.equal(acceptsPlayInput(s),false);
 s=run(s,{type:'resume'},{type:'event',event:'golden'},{type:'event',event:'reverse'});
 assert.equal(s.event?.kind,'golden','a second event does not overwrite the first');
 // 기억 릴레이: 외우는 동안·다른 팀·두 번째 성공은 받지 않고, 마지막 승부는 +2
 let m=run(createFunState({teams:2,timing:memoryRelay.timing,seed:5,skipDemo:true}),{type:'next'});
 const g=(st:FunState,c:FunCommand)=>reduceGated(st,c,memoryRelayGate);
 assert.equal(memoryStage(m),'show');
 assert.deepEqual(g(m,{type:'score',team:0,delta:1}).scores,[0,0],'not while the sequence is showing');
 m=tickFor(m,8000);assert.equal(memoryStage(m),'perform');
 assert.deepEqual(g(m,{type:'score',team:1,delta:1}).scores,[0,0],'only the team whose turn it is');
 m=g(m,{type:'score',team:0,delta:1});assert.deepEqual(m.scores,[1,0]);
 assert.deepEqual(g(m,{type:'score',team:0,delta:1}).scores,[1,0],'once per turn (keyboard 1 pressed twice)');
 assert.deepEqual(g(m,{type:'scoreAll',delta:1}).scores,[1,0]);
 assert.deepEqual(g(m,{type:'score',team:0,delta:-1}).scores,[0,0],'corrections are always allowed');
 let c=run(createFunState({teams:2,timing:memoryRelay.timing,seed:5,skipDemo:true}),{type:'next'},{type:'next'});
 // 마지막 승부는 본게임 차례를 이어받는다: 본게임을 곧바로 넘겨 보여 준 차례가 없으므로 마지막 승부 첫 차례는 청팀.
 c=tickFor(c,9000);c=g(c,{type:'score',team:0,delta:1});
 assert.deepEqual(c.scores,[2,0],'climax success is +2 even from the keyboard');
});

test('6: boss MVP uses the boss that was fighting at that cue; a −1 correction restores HP',()=>{
 let s=run(createFunState({teams:1,timing:bossRaid.timing,seed:2,skipDemo:true}),{type:'next'});
 const first=bossesFor(1,bossRaid.timing)[0];
 s=run(s,{type:'score',team:0,delta:first.hp});
 assert.equal(bossStatus(s).index,1,'first boss down');
 const atZero=stateBeforeCue(s,{phase:'play',index:0});
 assert.equal(bossStatus(atZero).index,0,'at cue 0 the slime was still fighting');
 assert.equal(bossRaid.cue({phase:'play',index:0,seed:2,reversed:false,frozen:false,seated:false,teams:1,state:atZero}).text,`${first.weak}!`);
 const hpAfter=bossDamage(s);
 s=run(s,{type:'score',team:0,delta:-1});
 assert.equal(bossDamage(s),hpAfter-1,'HP goes back up with the correction');
 assert.deepEqual(takeBackHits({'play:1':2,'play:3':1,'climax:0':1},2),{'play:1':2},'latest hits are taken back first');
 // 필살기는 쓴 신호 시점 기준
 let sp=run(createFunState({teams:1,timing:bossRaid.timing,seed:2,skipDemo:true}),{type:'next'},{type:'combo',delta:100});
 sp=tickFor(sp,bossRaid.timing.cueSeconds*1000*2);sp=run(sp,{type:'special'});
 assert.equal(stateBeforeCue(sp,{phase:'play',index:1}).specials,0);
 assert.equal(stateBeforeCue(sp,{phase:'play',index:3}).specials,1);
});

test('E: boss HP scales with team count so the climax happens and one team can still win',()=>{
 for(const teams of [1,2,3,4]){
  // 기대 피해는 실제 보스 HP 배분(드래곤 신호가 길다)으로 센다.
  const {play,total}=expectedDamage(teams,bossRaid.timing,bossesFor(teams,bossRaid.timing));
  const hp=bossesFor(teams,bossRaid.timing).reduce((n,b)=>n+b.hp,0);
  assert.ok(hp>play,`${teams} teams: bosses survive the expected main-game damage (${hp} > ${play.toFixed(1)})`);
  // 기대 피해는 보수적으로 세므로(마지막 승부의 필살기를 빼는 등) HP는 마지막 승부까지의 기대 피해의 1.05배까지 둔다.
  assert.ok(hp<=total*1.05,`${teams} teams: the climax can finish them (${hp} ≤ ${(total*1.05).toFixed(1)})`);
  const b=bossesFor(teams,bossRaid.timing);assert.ok(b[0].hp<b[1].hp&&b[1].hp<b[2].hp,'bosses get tougher');
 }
 assert.ok(bossesFor(1,bossRaid.timing).reduce((n,b)=>n+b.hp,0)<bossesFor(4,bossRaid.timing).reduce((n,b)=>n+b.hp,0));
});

test('F: each game only schedules and accepts the surprise events it allows',()=>{
 const cap=createFunState({teams:2,timing:signalCaptain.timing,seed:1,skipDemo:true,surprises:signalCaptain.surprises});
 assert.ok(!cap.allowedSurprises.climax.includes('reverse'),'the climax is already the reverse card');
 for(let seed=1;seed<60;seed++){
  assert.ok(!scheduleSurprises(seed,signalCaptain.timing.climax,'climax',cap.allowedSurprises.climax).some(x=>x.kind==='reverse'));
  for(const g of [moveBingo,mirrorPair,memoryRelay,stageShow]){
   const st=createFunState({teams:2,timing:g.timing,seed,skipDemo:true,surprises:g.surprises});
   assert.ok(!st.surprises.some(x=>x.kind==='speed'),`${g.id} never schedules 빨리빨리`);
  }
 }
 const bingo=run(createFunState({teams:2,timing:moveBingo.timing,seed:1,skipDemo:true,surprises:moveBingo.surprises}),{type:'next'});
 assert.ok(!surprisesNow(bingo).includes('speed'));
 assert.equal(run(bingo,{type:'event',event:'speed'}).event,null,'a disallowed event from the keyboard/remote is ignored');
 assert.ok(!stageShow.surprises?.play?.includes('golden'),'stage show: one reaction is one point');
});

test('G: memory relay switches to a variation after the 7-step cap, and the result text stops saying "try 7"',()=>{
 let s=run(createFunState({teams:1,timing:memoryRelay.timing,seed:9,skipDemo:true}),{type:'next'});
 // 앞 차례들을 성공으로 채워 최고 길이에 닿게 한다.
 // 3개에서 시작해 4번 성공하면 다섯째 차례(4번)가 7개(최고 길이).
 const hits:Record<string,number>={};for(let i=0;i<4;i++)hits[`play:${i}`]=1;
 s={...s,cueIndex:4,cueHits:hits};
 assert.equal(sequenceLength(s,'play',4),MAX_LENGTH);
 assert.equal(variationFor(s,'play',4),'normal','the first time at 7 is plain');
 s={...s,cueIndex:5,cueHits:{...hits,'play:4':1}};
 assert.equal(sequenceLength(s,'play',5),MAX_LENGTH,'it does not grow past 7');
 assert.equal(variationFor(s,'play',5),'reverse','after succeeding at 7, the next turn varies');
 assert.equal(variationFor({...s,cueHits:{...s.cueHits,'play:5':1}},'play',6),'quick');
 assert.match(memoryRelay.cue({phase:'play',index:5,seed:9,reversed:false,frozen:false,seated:false,teams:1,state:s}).sub??'',/거꾸로/);
 assert.match(memoryResultLine(s),/최고 길이 7개를 해냈어요/);
 assert.doesNotMatch(memoryResultLine(s),/7개에 도전/);
});

test('H: bingo scores only through claimed cells, and hints show winning and blocking cells',()=>{
 const s=createFunState({teams:2,timing:moveBingo.timing,seed:1,skipDemo:true});
 assert.equal(moveBingoGate(s,{type:'score',team:0,delta:1}),null,'scoreboard/keyboard/remote score is refused');
 assert.equal(moveBingoGate(s,{type:'scoreAll',delta:1}),null);
 assert.ok(moveBingoGate(s,{type:'score',team:0,delta:3,tag:'cell'}));
 const owners=[0,0,null,1,1,null,null,null,null];
 const h=cellHints(owners,0,2);
 assert.equal(h[2],'win');assert.equal(h[5],'block');assert.equal(h[0],null);
 const sig=read('src/presentation/components/minigames/signature/modules/sig-move-bingo.tsx');
 assert.match(sig,/dispatch\(\{type:'score',team,delta:points,tag:'cell'\}\)/);
 assert.match(sig,/scoreButtons:false/);
});

test('D: stage show winner, best scene and the reaction table all come from one score',()=>{
 const scores=[3,5,0];const counts=[[1,1,0],[2,1,1],[0,0,0]];
 const rows=stageTally(counts,scores);
 assert.deepEqual(rows.map(r=>r.total),scores);
 assert.equal(rows[0].teacher,1,'teacher +1 shows as its own column');
 assert.deepEqual(bestByScore(scores),[1]);
 assert.deepEqual(bestByScore([0,0,0]),[],'no reactions → no best scene (no contradiction)');
 const st={...createFunState({teams:3,timing:stageShow.timing,seed:4,skipDemo:true}),scores:[3,5,0]};
 assert.match(stageShow.resultHeadline!(st)!,/^가장 많은 응원: 홍팀/);
 assert.equal(resultSummary(run(st,{type:'next'}),stageShow).winners[0]===undefined,false);
});

test('12: seated stick figures keep sitting legs with the pose’s arms',()=>{
 const sit=POSE_JOINTS.sit,j=figureJoints('jump',true);
 assert.deepEqual([j.hip,j.lKnee,j.lFoot,j.rKnee,j.rFoot],[sit.hip,sit.lKnee,sit.lFoot,sit.rKnee,sit.rFoot]);
 assert.ok(j.lHand[1]<j.head[1],'arms still go up');
 assert.deepEqual(figureJoints('run',false),POSE_JOINTS.run);
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/<StickFigure pose=\{shown\.pose\} size=\{120\} seated=\{seated\}\/>/);
 assert.match(sig,/<DemoLoop frames=\{game\.demo\} seated=\{seated\}/);
});

test('13/14: result wording, focus, banner key, reduced-motion demo, deferred surprises',()=>{
 const res=read('src/presentation/components/fun/ResultCeremony.tsx');
 assert.match(res,/✅ 모두 참여했어요 · 기록하기/);assert.doesNotMatch(res,/기록하고 마치기/);
 assert.match(res,/titleRef\.current\?\.focus/);
 assert.doesNotMatch(res,/\{recorded&&afterRecord\}/,'C: the 👍/👎 slot shows before recording');
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/key=\{state\.event\?`\$\{state\.event\.kind\}-\$\{state\.event\.seq\}`:'none'\}/);
 // 움직임 줄이기: 시범은 저절로 넘어가지 않는다
 const held=tickFor(createFunState({teams:2,timing,seed:1,holdDemo:true}),30000);
 assert.equal(held.phase,'demo');
 // 다른 이벤트 중에 예약된 이벤트는 미뤘다가 끝나면 일어난다
 let s=run(createFunState({teams:2,timing:{...timing,play:120},seed:1,skipDemo:true}),{type:'next'});
 s={...s,surprises:[{phase:'play',atMs:30000,kind:'reverse'}]};
 s=tickFor(s,27000);s=run(s,{type:'event',event:'golden'});
 s=tickFor(s,4000);assert.equal(s.event?.kind,'golden');assert.equal(s.deferred,'reverse');
 s=tickFor(s,6000);assert.equal(s.event?.kind,'reverse','the deferred surprise fires right after');
 assert.ok(s.event!.seq>1);
});

test('A: a reload keeps the game — state, setup, module data, record flag and the remote room code',()=>{
 const mem=new Map<string,string>();
 (globalThis as {sessionStorage?:unknown}).sessionStorage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v);},removeItem:(k:string)=>{mem.delete(k);}};
 try{
  const state=run(createFunState({teams:3,timing:bossRaid.timing,seed:77,skipDemo:true}),{type:'next'},{type:'score',team:1,delta:2});
  saveFunSession({gameId:bossRaid.id,setup:{teams:3,seated:true,skipDemo:false,round:2},seed:77,state,recorded:true,module:{x:1}},1000);
  const back=loadFunSession(bossRaid.id,bossRaid.timing,2000)!;
  assert.ok(back);assert.deepEqual(back.state.scores,[0,2,0]);assert.equal(back.state.phase,'play');
  assert.equal(back.state.paused,true,'a resumed game starts paused');
  assert.equal(back.recorded,true);assert.deepEqual(back.module,{x:1});assert.equal(back.setup.round,2);
  assert.equal(loadFunSession(bossRaid.id,{...bossRaid.timing,play:999},2000),null,'a changed game timing is not resumed');
  saveFunSession({gameId:bossRaid.id,setup:{teams:3,seated:true,skipDemo:false,round:2},seed:77,state,recorded:false},1000);
  assert.equal(loadFunSession(bossRaid.id,bossRaid.timing,1000+FUN_SESSION_TTL_MS+1),null,'old sessions expire');
  mem.set(`fun-session:${bossRaid.id}`,'{bad json');assert.equal(loadFunSession(bossRaid.id,bossRaid.timing),null);
  clearFunSession(bossRaid.id);
  saveRemoteRoom('sig-x','ABC234');assert.equal(loadRemoteRoom('sig-x'),'ABC234');
  mem.set('fun-remote-room:sig-y','<script>');assert.equal(loadRemoteRoom('sig-y'),undefined);
  assert.equal(restoreFunState({...state,scores:[1]},{timing:bossRaid.timing,teams:3}),null);
 }finally{delete (globalThis as {sessionStorage?:unknown}).sessionStorage;}
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/⏯ 이어 하기/);assert.match(sig,/initialCode=\{room\}/);
});

test('I: TV and remote use the same phase words',()=>{
 assert.equal(FUN_PHASE_LABEL.climax,'마지막 승부');
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/phaseLabel:FUN_PHASE_LABEL\[state\.phase\],events:surprisesNow\(state\)/);
});
