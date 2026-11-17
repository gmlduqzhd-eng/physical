import test from 'node:test';
import assert from 'node:assert/strict';
import {createFunState,reduce,type FunState} from '../src/domain/funLoop';
import {MERGED_INTO} from '../src/domain/featuredGames';
import {READY_SIGNATURE_IDS,getSignatureGame} from '../src/domain/signatureGames';
import {CHANGE_PARTS,SEATED_CHANGE_PARTS,STEPS_PER_ROUND,leaderFor,mirrorPair,mirrorRound,mirrorStep,roundPlan} from '../src/domain/signature/sig-mirror-pair';
import {PERFORM_CUES,PREP_CUES,REACTIONS,SCENE_CARDS,addReaction,bestGroups,curtainGroup,emptyReactions,reactionTarget,scenesFor,stageEndIndex,stageShow,stageSlot} from '../src/domain/signature/sig-stage-show';
import type {SignatureCueContext} from '../src/domain/signature/types';

const stateFor=(game:typeof mirrorPair,teams=2,seed=42)=>createFunState({teams,timing:game.timing,seed});
const ctx=(game:typeof mirrorPair,phase:SignatureCueContext['phase'],index:number,o:Partial<SignatureCueContext>={}):SignatureCueContext=>{
 const state=o.state??stateFor(game,o.teams??2,o.seed??42);
 return {phase,index,seed:o.seed??42,reversed:false,frozen:false,seated:false,teams:o.teams??state.teams,state,...o};
};
const plannedFor=(id:string)=>Object.entries(MERGED_INTO).filter(([,v])=>v===id).map(([k])=>k).sort();

test('both games are ready, registered and merge exactly the planned archive games',()=>{
 for(const g of [mirrorPair,stageShow]){
  assert.equal(g.ready,true,g.id);
  assert.ok(READY_SIGNATURE_IDS.includes(g.id),g.id);
  assert.equal(getSignatureGame(g.id)?.id,g.id);
  assert.deepEqual([...g.mergedFrom].sort(),plannedFor(g.id),g.id);
  assert.equal(g.rules.length,3);
  assert.ok(!JSON.stringify(g).includes('만드는 중'),`${g.id} still has placeholder text`);
 }
});

test('cues are deterministic for the same phase, index and seed',()=>{
 for(const g of [mirrorPair,stageShow])for(const phase of ['tutorial','play','climax'] as const)for(let i=0;i<30;i++){
  for(const teams of [2,3,4]){
   const a=g.cue(ctx(g,phase,i,{teams})),b=g.cue(ctx(g,phase,i,{teams}));
   assert.deepEqual(a,b,`${g.id} ${phase} ${i}`);
   assert.ok(a.text.length>0);
  }
 }
 // 다른 seed면 장면 카드·동작이 달라질 수 있다(같은 seed끼리만 같으면 된다).
 assert.notDeepEqual(scenesFor(1,4).map(s=>s.id),scenesFor(2,4).map(s=>s.id));
});

test('tutorial cues lead step by step with “지금 …”',()=>{
 for(const g of [mirrorPair,stageShow]){
  const first=g.cue(ctx(g,'tutorial',0));
  assert.match(first.text,/^지금 /,g.id);
 }
});

test('mirror pair: the leader swaps every round and play/climax round numbers continue',()=>{
 assert.equal(leaderFor(0),'1번');assert.equal(leaderFor(1),'2번');assert.equal(leaderFor(2),'1번');
 const s=stateFor(mirrorPair);
 const leaders=Array.from({length:6},(_,r)=>mirrorPair.cue(ctx(mirrorPair,'play',r*STEPS_PER_ROUND)).text.slice(0,2));
 assert.deepEqual(leaders,['1번','2번','1번','2번','1번','2번']);
 // 한 라운드: 따라 하기 → 똑같이 → 하나 바꾸기 → 찾기
 assert.deepEqual([0,1,2,3].map(mirrorStep),['lead','keep','change','find']);
 assert.equal(mirrorPair.cue(ctx(mirrorPair,'play',2)).text,'하나 바꾸기!');
 assert.equal(mirrorPair.cue(ctx(mirrorPair,'climax',2)).text,'두 군데 바꾸기!');
 // 마지막 승부는 본게임 다음 라운드 번호로 이어진다(리더가 계속 번갈아).
 const playRounds=mirrorPair.timing.play/(mirrorPair.timing.cueSeconds*STEPS_PER_ROUND);
 assert.equal(mirrorRound({phase:'climax',index:0,state:s}),playRounds);
 // 라운드 안에서는 같은 동작, 마지막 승부는 서로 다른 두 곳을 바꾼다.
 const p0=roundPlan(ctx(mirrorPair,'play',0)),p1=roundPlan(ctx(mirrorPair,'play',3));
 assert.equal(p0.moveName,p1.moveName);
 for(let i=0;i<20;i++){const c=roundPlan(ctx(mirrorPair,'climax',i*STEPS_PER_ROUND+2,{seed:i}));assert.equal(c.parts.length,2);assert.notEqual(c.parts[0],c.parts[1]);}
 // 앉아서 할 때는 발을 쓰지 않는다.
 for(let i=0;i<40;i++){const c=roundPlan(ctx(mirrorPair,'play',i,{seated:true,seed:i}));assert.ok(SEATED_CHANGE_PARTS.includes(c.parts[0]));assert.doesNotMatch(c.moveName,/발/);}
 assert.ok(CHANGE_PARTS.includes('발 위치'));
});

test('mirror pair: the quick count adds found pairs to the team score',()=>{
 let s:FunState=reduce(reduce(stateFor(mirrorPair),{type:'next'}),{type:'next'});
 assert.equal(s.phase,'play');
 s=reduce(s,{type:'score',team:0,delta:3});s=reduce(s,{type:'score',team:1,delta:5});
 assert.deepEqual(s.scores,[3,5]);
});

test('stage show: every group prepares, then performs once in order, then the show is done',()=>{
 for(const teams of [2,3,4]){
  const performers:number[]=[];let i=0;
  for(;stageSlot(i,teams).kind!=='done';i++){const s=stageSlot(i,teams);if(s.kind==='perform')performers.push(s.group);else assert.ok(i<PREP_CUES);}
  assert.equal(i,stageEndIndex(teams));
  const expected=Array.from({length:teams},(_,g)=>Array(PERFORM_CUES).fill(g)).flat();
  assert.deepEqual(performers,expected,`teams ${teams}`);
  // 본게임 시간 안에 모든 모둠이 발표할 수 있다.
  assert.ok(stageEndIndex(teams)*stageShow.timing.cueSeconds<=stageShow.timing.play,`teams ${teams} fits`);
  // 모둠마다 다른 장면 카드
  const scenes=scenesFor(7,teams);assert.equal(new Set(scenes.map(s=>s.id)).size,teams);
 }
 // 커튼콜은 안내 다음 모둠이 차례로 인사한다.
 assert.equal(curtainGroup(0,3),null);
 assert.deepEqual([1,2,3,4].map(i=>curtainGroup(i,3)),[0,1,2,0]);
});

test('stage show: reactions score the performing group and tally by kind',()=>{
 const teams=3;
 // 준비 시간에는 반응 버튼이 쉬고, 발표 중에는 발표하는 모둠이 받는다.
 assert.equal(reactionTarget({phase:'play',index:0,teams}),null);
 assert.equal(reactionTarget({phase:'play',index:PREP_CUES,teams}),0);
 assert.equal(reactionTarget({phase:'play',index:PREP_CUES+PERFORM_CUES,teams}),1);
 let counts=emptyReactions(teams);
 const r1=addReaction(counts,1,'clap')!;counts=r1.counts;
 assert.deepEqual(r1.command,{type:'score',team:1,delta:1});
 counts=addReaction(counts,1,'laugh')!.counts;counts=addReaction(counts,2,'wow')!.counts;
 assert.deepEqual(counts,[[0,0,0],[1,0,1],[0,1,0]]);
 assert.deepEqual(bestGroups(counts),[1]);
 assert.equal(addReaction(counts,5,'clap'),null);
 assert.deepEqual(bestGroups(emptyReactions(2)),[]);
 assert.equal(REACTIONS.length,3);
 // 엔진에서 반응 = 그 모둠 +1
 let s=reduce(reduce(createFunState({teams,timing:stageShow.timing,seed:3}),{type:'next'}),{type:'next'});
 s=reduce(s,r1.command);assert.deepEqual(s.scores,[0,1,0]);
});

test('stage show: scene cards are kind, short and never single out a person',()=>{
 assert.ok(SCENE_CARDS.length>=10);
 for(const c of SCENE_CARDS){
  assert.ok(c.title.length<=20,c.title);
  assert.doesNotMatch(c.title+c.hint,/바보|못생|뚱뚱|놀리|때리|싸우|무서|죽|피|벌칙/,c.title);
 }
});
