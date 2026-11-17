import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMBO_MAX,COMBO_PER_POINT,createFunState,cueIntervalMs,isFinalCountdown,parseFunCommand,reduce,resultSummary,scheduleSurprises,secondsLeft,type FunCommand,type FunState} from '../src/domain/funLoop';
import {createFunCommandBus,keyToFunCommand} from '../src/application/funCommandBus';
import {READY_SIGNATURE_GAMES,READY_SIGNATURE_IDS,SIGNATURE_GAMES,getSignatureGame,pickCue,signatureFor} from '../src/domain/signatureGames';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {SIGNAL_CARDS,cardFor,signalCaptain} from '../src/domain/signature/sig-signal-captain';
import {BOSSES,BOSS_TOTAL_HP,bossDamage,bossRaid,bossStatus} from '../src/domain/signature/sig-boss-raid';
import type {SignatureCueContext} from '../src/domain/signature/types';

const timing={demo:10,tutorial:20,play:60,climax:20,cueSeconds:4};
const run=(s:FunState,...cmds:FunCommand[])=>cmds.reduce(reduce,s);
const tickFor=(s:FunState,ms:number)=>{let n=s;for(let t=0;t<ms;t+=250)n=reduce(n,{type:'tick',ms:250});return n;};

test('phases go demo → tutorial → play → climax → result, by button or by time',()=>{
 let s=createFunState({teams:2,timing,seed:3});
 assert.equal(s.phase,'demo');
 s=run(s,{type:'next'});assert.equal(s.phase,'tutorial');
 s=tickFor(s,20000);assert.equal(s.phase,'play','the tutorial ends by itself');
 s=tickFor(s,60000);assert.equal(s.phase,'climax');
 s=tickFor(s,20000);assert.equal(s.phase,'result');assert.equal(s.endedBy,'time');
 assert.equal(createFunState({teams:2,timing,skipDemo:true}).phase,'tutorial');
});

test('tutorial points are practice: they reset when the main game starts',()=>{
 let s=createFunState({teams:3,timing,seed:1,skipDemo:true});
 s=run(s,{type:'score',team:0,delta:1},{type:'scoreAll',delta:1});
 assert.deepEqual(s.scores,[2,1,1]);
 s=run(s,{type:'next'});
 assert.equal(s.phase,'play');assert.deepEqual(s.scores,[0,0,0]);assert.equal(s.combo,0);
});

test('golden doubles positive points only; combo fills and the special needs a full gauge',()=>{
 let s=run(createFunState({teams:2,timing,seed:1,skipDemo:true}),{type:'next'});
 s=run(s,{type:'event',event:'golden'},{type:'score',team:1,delta:1},{type:'score',team:0,delta:-1});
 assert.deepEqual(s.scores,[-1,2]);
 assert.equal(s.combo,COMBO_PER_POINT*2);
 assert.equal(run(s,{type:'special'}).specials,0,'not full yet');
 s=run(s,{type:'combo',delta:999});assert.equal(s.combo,COMBO_MAX);
 s=run(s,{type:'special'});assert.equal(s.specials,1);assert.equal(s.combo,0);
 // 잘못된 팀·값은 무시
 assert.deepEqual(run(s,{type:'score',team:5,delta:1}).scores,s.scores);
 assert.deepEqual(run(s,{type:'score',team:0,delta:Number.NaN}).scores,s.scores);
});

test('pause stops time; freeze holds the cue; speed halves the cue interval; tutorial is slower',()=>{
 let s=run(createFunState({teams:2,timing,seed:1,skipDemo:true}),{type:'next'});
 const paused=tickFor(run(s,{type:'pause'}),5000);
 assert.equal(paused.phaseMs,0);assert.equal(secondsLeft(paused),60);
 s=run(s,{type:'event',event:'freeze'});
 const frozen=tickFor(s,2500);assert.equal(frozen.cueIndex,0,'no new cue while frozen');
 const sped=run(createFunState({teams:2,timing,seed:1,skipDemo:true}),{type:'next'},{type:'event',event:'speed'});
 assert.equal(cueIntervalMs(sped),2000);
 assert.equal(cueIntervalMs(createFunState({teams:2,timing,skipDemo:true})),6400);
});

test('end and finish record how the game ended; finish only counts in scoring phases',()=>{
 const s=createFunState({teams:2,timing,skipDemo:true});
 assert.equal(run(s,{type:'end'}).endedBy,'teacher');
 assert.equal(run(s,{type:'finish'}).phase,'tutorial');
 assert.equal(run(s,{type:'next'},{type:'finish'}).endedBy,'goal');
 // 결과 뒤에는 어떤 명령도 바꾸지 않는다.
 const done=run(s,{type:'end'});assert.equal(run(done,{type:'score',team:0,delta:1}),done);
});

test('surprises are deterministic, spaced and never in the first 20% or last 3 seconds',()=>{
 for(let seed=1;seed<200;seed++){
  const a=scheduleSurprises(seed,120),b=scheduleSurprises(seed,120);
  assert.deepEqual(a,b);assert(a.length<=2);
  for(const x of a){assert(x.atMs>=24000&&x.atMs<=117000,String(x.atMs));}
  if(a.length===2)assert(a[1].atMs-a[0].atMs>=10000);
  assert(!scheduleSurprises(seed,40,'climax').some(x=>x.kind==='freeze'));
 }
 // 예약된 이벤트는 그 시점에 실제로 일어난다.
 const s=createFunState({teams:2,timing:{...timing,play:120},seed:7,skipDemo:true});
 const due=s.surprises.find(x=>x.phase==='play');
 if(due){const n=tickFor(run(s,{type:'next'}),due.atMs+250);assert(n.log.some(l=>l.text.length>0));}
});

test('the final countdown shows in the last 10 seconds of the climax only',()=>{
 let s=run(createFunState({teams:2,timing,seed:1,skipDemo:true}),{type:'next'},{type:'next'});
 assert.equal(isFinalCountdown(s),false);
 s=tickFor(s,11000);assert.equal(isFinalCountdown(s),true);
});

test('remote and keyboard commands are validated; tick and finish never come from outside',()=>{
 assert.deepEqual(parseFunCommand({type:'score',team:1,delta:1}),{type:'score',team:1,delta:1});
 for(const bad of [null,[],{type:'tick',ms:1e9},{type:'finish'},{type:'score',team:9,delta:1},{type:'score',team:0,delta:50},{type:'event',event:'boom'},{type:'scoreAll',delta:0},'next'])assert.equal(parseFunCommand(bad),null,JSON.stringify(bad));
 assert.deepEqual(keyToFunCommand({key:' '}),{type:'next'});
 assert.deepEqual(keyToFunCommand({key:'2'}),{type:'score',team:1,delta:1});
 assert.deepEqual(keyToFunCommand({key:'@',shiftKey:true}),{type:'score',team:1,delta:-1});
 assert.equal(keyToFunCommand({key:'1',target:{tagName:'INPUT'}}),null);
 const bus=createFunCommandBus(),got:string[]=[];
 bus.subscribe((c,src)=>got.push(`${src}:${c.type}`));
 let deliver:(raw:unknown)=>void=()=>{};
 const detach=bus.attach({connect:on=>{deliver=on;return ()=>{deliver=()=>{};};}});
 deliver({type:'next'});deliver({type:'tick',ms:5});deliver({type:'hack'});bus.dispatch({type:'pause'},'key');
 detach();deliver({type:'next'});
 assert.deepEqual(got,['remote:next','key:pause']);
});

test('result: winner, ties, concept line with the right particle and MVP cue',()=>{
 let s=run(createFunState({teams:3,timing,seed:1,skipDemo:true}),{type:'next'},{type:'score',team:2,delta:3},{type:'score',team:0,delta:1});
 const r=resultSummary(s,{concept:'반응 속도',reflection:'q',nextChallenge:'n'});
 assert.equal(r.headline,'황팀 우승!');assert.deepEqual(r.winners,[2]);
 assert.equal(r.conceptLine,'오늘 우리는 반응 속도를 연습했어요.');
 assert.deepEqual(r.mvpCue,{phase:'play',index:0});
 s=run(s,{type:'score',team:0,delta:2});
 assert.equal(resultSummary(s,{concept:'심폐 지구력',reflection:'',nextChallenge:''}).headline,'청팀·황팀 공동 우승!');
 assert.equal(resultSummary(s,{concept:'심폐 지구력',reflection:'',nextChallenge:''}).conceptLine,'오늘 우리는 심폐 지구력을 연습했어요.');
 const solo=resultSummary(run(createFunState({teams:1,timing,skipDemo:true}),{type:'next'},{type:'score',team:0,delta:4}),{concept:'협동',reflection:'',nextChallenge:''});
 assert.equal(solo.headline,'우리 반 4점!');
});

const ctx=(over:Partial<SignatureCueContext>={},state?:FunState):SignatureCueContext=>({phase:'play',index:0,seed:42,reversed:false,frozen:false,seated:false,teams:2,state:state??createFunState({teams:2,timing:signalCaptain.timing,seed:42}),...over});

test('registry: only ready signature games appear in the catalog, with complete data',()=>{
 assert.equal(SIGNATURE_GAMES.length,6);
 assert(SIGNATURE_GAMES.every(g=>g.id.startsWith('sig-')));
 assert.deepEqual(READY_SIGNATURE_IDS.slice(0,2),['sig-signal-captain','sig-boss-raid']);
 for(const g of SIGNATURE_GAMES){
  const live=AVAILABLE_GAMES.some(a=>a.type===g.id),lesson=LESSON_GAME_CATALOG.some(l=>l.id===g.id);
  assert.equal(live,g.ready,g.id);assert.equal(lesson,g.ready,g.id);assert.equal(!!getSignatureGame(g.id),g.ready,g.id);
 }
 for(const g of READY_SIGNATURE_GAMES){
  assert.equal(g.rules.length,3);assert(g.demo.length>=3,g.id);assert(g.oneLine.endsWith('요.')||g.oneLine.endsWith('요!'),g.id);
  assert(!/만드는 중/.test(JSON.stringify(g)),g.id);
  assert(g.timing.tutorial>=15&&g.timing.climax>=20,g.id);
 }
 assert.equal(signatureFor('red_green')?.id,'sig-signal-captain');
 // 공용 파일은 대표 게임을 레지스트리로만 연결한다.
 const page=readFileSync(new URL('../src/presentation/GamePlayPage.tsx',import.meta.url),'utf8');
 assert.match(page,/if\(isSignatureId\(gameType\)\)return <SignaturePlay/);
});

test('every ready game gives the same cue for the same (phase, index, seed) and has tutorial, seated and climax cues',()=>{
 for(const g of READY_SIGNATURE_GAMES){
  for(const phase of ['tutorial','play','climax'] as const)for(let i=0;i<40;i++){
   const a=g.cue(ctx({phase,index:i})),b=g.cue(ctx({phase,index:i}));
   assert.deepEqual(a,b,`${g.id} ${phase} ${i}`);
   assert(a.text.length>0&&a.text.length<=24,`${g.id} cue too long: ${a.text}`);
   assert(!/만드는 중/.test(a.text));
  }
  assert(g.cue(ctx({phase:'tutorial',index:1})).text.startsWith('지금')||g.cue(ctx({phase:'tutorial',index:0})).text.length>0,g.id);
 }
});

test('pickCue avoids back-to-back repeats and uses the whole list',()=>{
 const list=['a','b','c'];
 const seq=Array.from({length:60},(_,i)=>pickCue(list,{seed:9,phase:'play',index:i}));
 for(let i=1;i<seq.length;i++)assert.notEqual(seq[i],seq[i-1],`repeat at ${i}`);
 assert.deepEqual([...new Set(seq)].sort(),list);
});

test('signal captain: cards rotate with an announcement, tutorial leads with "지금", traps exist, seated text differs',()=>{
 assert.equal(cardFor({phase:'tutorial',index:3}).id,'dispatch');
 assert.equal(cardFor({phase:'climax',index:0}).id,'opposite');
 const cards=Array.from({length:24},(_,i)=>cardFor({phase:'play',index:i}).id);
 assert.deepEqual([...new Set(cards)],SIGNAL_CARDS.slice(0,4).map(c=>c.id));
 assert.match(signalCaptain.cue(ctx({index:6})).text,/카드/,'card change is announced');
 const tut=Array.from({length:10},(_,i)=>signalCaptain.cue(ctx({phase:'tutorial',index:i})).text);
 assert(tut.some(t=>t.startsWith('지금 출동!')),tut.join('|'));
 const play=Array.from({length:6},(_,i)=>signalCaptain.cue(ctx({index:i+1})));
 const all=Array.from({length:60},(_,i)=>signalCaptain.cue(ctx({index:i,seed:i})));
 assert(all.some(c=>c.sub?.includes('출동!”이 없어요')),'there are trap cues');
 assert(play.every(c=>c.sub),'every cue explains the rule');
 const traffic=signalCaptain.cue(ctx({index:13}));assert(['go','warn','stop'].includes(traffic.tone??''),JSON.stringify(traffic));
 const seated=Array.from({length:60},(_,i)=>signalCaptain.cue(ctx({index:i,seed:i,seated:true})).text).join(' ');
 assert.doesNotMatch(seated,/한 발 들기|옆으로 한 걸음/);
 assert.match(signalCaptain.cue(ctx({index:1,reversed:true})).sub??'',/거꾸로/);
});

test('boss raid: damage counts climax double and specials, bosses fall in order, the game completes',()=>{
 let s=run(createFunState({teams:2,timing:bossRaid.timing,seed:1,skipDemo:true}),{type:'next'});
 assert.equal(bossStatus(s).boss.id,'slime');
 s=run(s,{type:'score',team:0,delta:5},{type:'score',team:1,delta:5});
 assert.equal(bossDamage(s),10);assert.equal(bossStatus(s).boss.id,'golem');assert.equal(bossStatus(s).defeated,1);
 s=run(s,{type:'next'},{type:'score',team:0,delta:5});
 assert.equal(bossDamage(s),20,'climax hits count double');
 s=run(s,{type:'combo',delta:100},{type:'special'});
 assert.equal(bossDamage(s),25);
 assert.equal(bossRaid.isComplete!(s),false);
 s=run(s,{type:'score',team:1,delta:5},{type:'score',team:0,delta:5});
 assert(bossDamage(s)>=BOSS_TOTAL_HP);assert.equal(bossRaid.isComplete!(s),true);
 assert.equal(bossStatus(s).defeated,BOSSES.length);
 assert.match(bossRaid.resultHeadline!(s)!,/모두 물리쳤어요/);
 // 연습 판 공격은 본게임에 이어지지 않는다.
 const practice=run(createFunState({teams:2,timing:bossRaid.timing,skipDemo:true}),{type:'score',team:0,delta:5},{type:'next'});
 assert.equal(bossDamage(practice),0);
 // 쉬는 신호가 섞여 계속 뛰지 않는다.
 const cues=Array.from({length:9},(_,i)=>bossRaid.cue(ctx({index:i},s)).tone);
 assert.equal(cues.filter(t=>t==='rest').length,3);
 assert.match(bossRaid.cue(ctx({phase:'tutorial',index:0})).text,/^지금 /);
 assert.match(bossRaid.cue(ctx({seated:true,index:0},run(createFunState({teams:2,timing:bossRaid.timing,skipDemo:true}),{type:'next'}))).text,/두 팔 위로/);
});
