import test from 'node:test';
import assert from 'node:assert/strict';
import {createFunState,reduce,reduceGated,seededRandom,comboFull,type FunState,type FunHooks} from '../src/domain/funLoop';
import {mirrorPair,mirrorStep,ROUND_SECONDS,STEPS_PER_ROUND} from '../src/domain/signature/sig-mirror-pair';
import {bossRaid,bossStatus,bossesFor} from '../src/domain/signature/sig-boss-raid';
import {PREP_CUES,stageShow,stageShowGate} from '../src/domain/signature/sig-stage-show';
import {memoryRelay,turnTeamAt,currentTurnTeam} from '../src/domain/signature/sig-memory-relay';
import {loadFunSession,saveFunSession} from '../src/application/funSession';
import type {SignatureGameDef} from '../src/domain/signature/types';

const ctxOf=(game:SignatureGameDef,s:FunState,seed:number)=>({phase:s.phase as 'play',index:s.cueIndex,seed,reversed:false,frozen:false,seated:false,teams:s.teams,state:s});
const hooksFor=(game:SignatureGameDef,seed:number):FunHooks=>({cueSeconds:s=>s.phase==='tutorial'||s.phase==='play'||s.phase==='climax'?game.cue(ctxOf(game,s,seed)).seconds:undefined});

test('mirror pair: play and climax are whole rounds, so every round\'s 찾기 step gets its full time',()=>{
 assert.equal(ROUND_SECONDS,22);
 assert.equal(mirrorPair.timing.play%ROUND_SECONDS,0,'play is whole rounds');
 assert.equal(mirrorPair.timing.climax,ROUND_SECONDS*2,'climax is 2 rounds');
 assert.ok(!(mirrorPair.surprises?.play??[]).includes('freeze'),'freeze would push a round past the phase end');
 for(const seed of [1,7,42]){
  const hooks=hooksFor(mirrorPair,seed);
  let s=reduce(createFunState({teams:2,timing:mirrorPair.timing,seed,surprises:mirrorPair.surprises}),{type:'next'});
  // tutorial too: the 5 practice steps fit
  const findMs:Record<string,number>={};const tutorialSteps=new Set<number>();
  while(s.phase!=='result'){
   if(s.phase==='tutorial')tutorialSteps.add(s.cueIndex);
   if((s.phase==='play'||s.phase==='climax')&&mirrorStep(s.cueIndex)==='find'){const k=`${s.phase}:${s.cueIndex}`;findMs[k]=(findMs[k]??0)+250;}
   s=reduce(s,{type:'tick',ms:250},hooks);
  }
  assert.ok(tutorialSteps.size>=STEPS_PER_ROUND,`tutorial shows all ${STEPS_PER_ROUND} steps (saw ${tutorialSteps.size})`);
  const finds=Object.entries(findMs);
  assert.equal(finds.filter(([k])=>k.startsWith('play:')).length,mirrorPair.timing.play/ROUND_SECONDS,'one 찾기 per play round');
  assert.equal(finds.filter(([k])=>k.startsWith('climax:')).length,2,'two 찾기 in the climax');
  // golden/reverse events do not change cue timing, so each 찾기 lasts the full 5s
  for(const [k,ms] of finds)assert.ok(ms>=4750,`${k} lasted ${ms}ms`);
 }
});

test('engine: a cue keeps the length it had when it started, even if the state changes mid-cue',()=>{
 let s=reduce(createFunState({teams:1,timing:{demo:1,tutorial:1,play:60,climax:10,cueSeconds:6},seed:3}),{type:'next'});
 s=reduce(s,{type:'next'});
 let long=false;
 const hooks:FunHooks={cueSeconds:()=>long?12:undefined};
 s=reduce(s,{type:'tick',ms:500},hooks); // cue 0 starts with the default 6s
 long=true; // e.g. the dragon appears mid-cue
 for(let i=0;i<12;i++)s=reduce(s,{type:'tick',ms:500},hooks);
 assert.equal(s.cueIndex,1,'cue 0 ended at 6s, not 12s');
 // the next cue picks up the new length
 for(let i=0;i<14;i++)s=reduce(s,{type:'tick',ms:500},hooks);
 assert.equal(s.cueIndex,1,'cue 1 is 12s long');
 for(let i=0;i<12;i++)s=reduce(s,{type:'tick',ms:500},hooks);
 assert.equal(s.cueIndex,2);
});

test('boss raid: HP accounts for the long dragon cues; at a 70% success rate the climax is reached and most games are won',()=>{
 for(const teams of [1,2,3,4]){
  let wins=0,climax=0;const N=80;
  for(let seed=1;seed<=N;seed++){
   const rnd=seededRandom(seed*97);
   const hooks=hooksFor(bossRaid,seed);
   let s=reduce(reduce(createFunState({teams,timing:bossRaid.timing,seed,surprises:bossRaid.surprises}),{type:'next'}),{type:'next'});
   let last='',reached=false;
   while(s.phase!=='result'){
    if(s.phase==='climax')reached=true;
    const key=`${s.phase}:${s.cueIndex}`;
    if(key!==last){last=key;
     if(bossRaid.cue(ctxOf(bossRaid,s,seed)).scorable!==false)for(let t=0;t<teams;t++)if(rnd()<0.7)s=reduce(s,{type:'score',team:t,delta:1});
     if(comboFull(s))s=reduce(s,{type:'special'});
    }
    if(bossStatus(s).done){wins++;break;}
    s=reduce(s,{type:'tick',ms:500},hooks);
   }
   if(reached)climax++;
  }
  // 70% 성공이면 대개 이기고(75% 이상), 거의 늘 마지막 승부까지 간다(95% 이상).
  assert.ok(climax/N>=0.95,`teams ${teams}: climax reached ${climax}/${N}`);
  assert.ok(wins/N>=0.75&&wins/N<=0.99,`teams ${teams}: win rate ${wins}/${N} (HP ${bossesFor(teams,bossRaid.timing).map(b=>b.hp).join('/')})`);
 }
});

test('stage show: 45s prep, and the non-scoring curtain call blocks positive points from buttons, keyboard and remote',()=>{
 assert.equal(PREP_CUES*stageShow.timing.cueSeconds,45);
 let s=reduce(reduce(createFunState({teams:3,timing:stageShow.timing,seed:5,surprises:stageShow.surprises}),{type:'next'}),{type:'next'});
 const gate=stageShow.commandGate!;
 assert.equal(gate,stageShowGate);
 assert.deepEqual(gate(s,{type:'score',team:0,delta:1}),{type:'score',team:0,delta:1},'play scores normally');
 s=reduceGated(s,{type:'score',team:1,delta:1},gate);
 assert.equal(s.scores[1],1);
 s=reduce(s,{type:'next'}); // curtain call
 assert.equal(s.phase,'climax');
 assert.equal(gate(s,{type:'score',team:0,delta:1}),null);
 assert.equal(gate(s,{type:'scoreAll',delta:1}),null);
 s=reduceGated(s,{type:'scoreAll',delta:1},gate);
 assert.deepEqual(s.scores,[0,1,0],'no points during the curtain call');
 s=reduceGated(s,{type:'score',team:1,delta:-1},gate);
 assert.equal(s.scores[1],0,'corrections still work');
});

test('memory relay: the climax continues the play turn order, so 4 teams get equal turns',()=>{
 let s=reduce(reduce(createFunState({teams:4,timing:memoryRelay.timing,seed:9,surprises:memoryRelay.surprises}),{type:'next'}),{type:'next'});
 // play shows 6 turns (청 홍 황 녹 청 홍), then the climax
 for(let i=0;i<5;i++)s={...s,cueIndex:s.cueIndex+1};
 s={...s,cueMs:1000};// 여섯 번째 차례도 화면에 나왔다
 s=reduce(s,{type:'next'});
 assert.equal(s.phase,'climax');
 assert.equal(s.phaseCues.play,6);
 assert.equal(currentTurnTeam(s),2,'climax starts with 황팀 (turn 7), not 청팀');
 assert.equal(turnTeamAt(s,'climax',1),3);
 assert.equal(turnTeamAt(s,'play',0),0);
});

test('fun session keeps the play id across a reload (votes before recording stay attached)',()=>{
 const mem=new Map<string,string>();
 (globalThis as {sessionStorage?:unknown}).sessionStorage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v);},removeItem:(k:string)=>{mem.delete(k);},key:(i:number)=>[...mem.keys()][i]??null,get length(){return mem.size;}};
 const state=reduce(createFunState({teams:2,timing:bossRaid.timing,seed:11}),{type:'next'});
 saveFunSession({gameId:bossRaid.id,setup:{teams:2,seated:false,skipDemo:false,round:0},seed:11,state,recorded:false,playId:'abc123-play'});
 assert.equal(loadFunSession(bossRaid.id,bossRaid.timing)?.playId,'abc123-play');
 saveFunSession({gameId:bossRaid.id,setup:{teams:2,seated:false,skipDemo:false,round:0},seed:11,state,recorded:false,playId:'<bad id>'});
 assert.equal(loadFunSession(bossRaid.id,bossRaid.timing)?.playId,undefined,'invalid ids are dropped');
 delete (globalThis as {sessionStorage?:unknown}).sessionStorage;
});
