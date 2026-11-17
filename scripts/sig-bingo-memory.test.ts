import test from 'node:test';
import assert from 'node:assert/strict';
import {createFunState,cueIntervalMs,reduce,type FunCommand,type FunState} from '../src/domain/funLoop';
import {MERGED_INTO} from '../src/domain/featuredGames';
import {READY_SIGNATURE_IDS} from '../src/domain/signatureGames';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {BINGO_BONUS,BINGO_QUIZ,BOARD_CELLS,QUIZ_CELLS,boardFull,buildMoveBoard,claimPoints,emptyOwners,linesOf,moveBingo,newLinesIfClaimed,turnTeam} from '../src/domain/signature/sig-move-bingo';
import {MAX_LENGTH,START_LENGTH,TUTORIAL_LENGTH,longestSuccess,memoryRelay,memoryStage,relayTeam,sequenceFor,sequenceLength,showMs} from '../src/domain/signature/sig-memory-relay';
import type {SignatureCueContext,SignatureGameDef} from '../src/domain/signature/types';

const run=(s:FunState,...cmds:FunCommand[])=>cmds.reduce(reduce,s);
const tickFor=(s:FunState,ms:number)=>{let n=s;for(let t=0;t<ms;t+=250)n=reduce(n,{type:'tick',ms:250});return n;};
const ctx=(state:FunState,over:Partial<SignatureCueContext>={}):SignatureCueContext=>({phase:'play',index:0,seed:state.seed,reversed:false,frozen:false,seated:false,teams:state.teams,state,...over});
const planned=(id:string)=>Object.entries(MERGED_INTO).filter(([,v])=>v===id).map(([k])=>k).sort();

test('both games are ready, listed and merge exactly the planned games',()=>{
 for(const g of [moveBingo,memoryRelay] as SignatureGameDef[]){
  assert.equal(g.ready,true);
  assert.ok(READY_SIGNATURE_IDS.includes(g.id),g.id);
  assert.ok(AVAILABLE_GAMES.some(x=>x.type===g.id),g.id);
  assert.deepEqual([...g.mergedFrom].sort(),planned(g.id));
  assert.ok(!g.rules.some(r=>r.includes('만드는 중'))&&!g.reflection.includes('만드는 중'));
 }
});

test('cues are deterministic for the same phase, index and seed',()=>{
 for(const g of [moveBingo,memoryRelay] as SignatureGameDef[]){
  const s=createFunState({teams:3,timing:g.timing,seed:42,skipDemo:true});
  for(const phase of ['tutorial','play','climax'] as const)for(let i=0;i<8;i++){
   assert.deepEqual(g.cue(ctx(s,{phase,index:i})),g.cue(ctx(s,{phase,index:i})),`${g.id} ${phase}:${i}`);
  }
 }
});

test('bingo board: same seed same board, 6 moves + 3 quiz cells, centre is a move',()=>{
 const a=buildMoveBoard(7,0),b=buildMoveBoard(7,0),c=buildMoveBoard(7,1);
 assert.deepEqual(a,b);
 assert.notDeepEqual(a,c,'the next board is different');
 assert.equal(a.length,BOARD_CELLS);
 assert.equal(a.filter(x=>x.kind==='quiz').length,QUIZ_CELLS);
 assert.equal(a[4].kind,'move');
 for(const q of a.filter(x=>x.kind==='quiz')){assert.ok(q.choices?.includes(q.answer!));assert.equal(q.choices?.length,3);}
 assert.ok(BINGO_QUIZ.length>=QUIZ_CELLS);
});

test('bingo lines: rows, columns and diagonals; bonus only for the new line',()=>{
 const o=emptyOwners();
 o[0]=0;o[1]=0;
 assert.equal(linesOf(o,0),0);
 assert.equal(newLinesIfClaimed(o,2,0),1,'row 0-1-2');
 assert.equal(claimPoints(o,2,0),1+BINGO_BONUS);
 assert.equal(newLinesIfClaimed(o,2,1),0,'the other team gets no line');
 const d=emptyOwners();d[0]=1;d[8]=1;d[2]=1;d[6]=1;
 assert.equal(newLinesIfClaimed(d,4,1),2,'centre completes both diagonals');
 const col=emptyOwners();col[1]=0;col[4]=0;col[7]=0;
 assert.equal(linesOf(col,0),1);
 assert.equal(newLinesIfClaimed(col,1,0),0,'an owned cell cannot be claimed again');
 assert.equal(boardFull(Array(9).fill(0)),true);
 assert.deepEqual([0,1,2,3,4].map(t=>turnTeam(t,2)),[0,1,0,1,0]);
});

test('memory relay: sequence grows by one after each successful turn, capped',()=>{
 let s=createFunState({teams:2,timing:memoryRelay.timing,seed:5,skipDemo:true});
 assert.equal(sequenceLength(s,'tutorial',0),TUTORIAL_LENGTH);
 s=run(s,{type:'next'});
 assert.equal(s.phase,'play');
 assert.equal(sequenceLength(s,'play',0),START_LENGTH);
 s=run(s,{type:'score',team:relayTeam(0,2),delta:1});
 assert.equal(sequenceLength(s,'play',0),START_LENGTH,'this turn keeps its length');
 assert.equal(sequenceLength(s,'play',1),START_LENGTH+1,'the next turn is one longer');
 s=tickFor(s,cueIntervalMs(s)+100);
 assert.equal(s.cueIndex,1);
 assert.equal(sequenceLength(s,'play',2),START_LENGTH+1,'no success at turn 1 → same length');
 assert.equal(longestSuccess(s),START_LENGTH);
 const many={...s,cueHits:Object.fromEntries(Array.from({length:12},(_,i)=>[`play:${i}`,1]))};
 assert.equal(sequenceLength(many,'play',12),MAX_LENGTH);
 assert.equal(sequenceLength(many,'climax',0),MAX_LENGTH,'the climax carries over the play successes');
 const seq=sequenceFor(9,'play',3,7);
 assert.deepEqual(seq,sequenceFor(9,'play',3,7));
 for(let i=2;i<seq.length;i++)assert.ok(!(seq[i].id===seq[i-1].id&&seq[i].id===seq[i-2].id),'no shape three times in a row');
});

test('memory relay: shown first, hidden while the group performs',()=>{
 let s=createFunState({teams:2,timing:memoryRelay.timing,seed:5,skipDemo:true});
 s=run(s,{type:'next'});
 assert.equal(memoryStage(s),'show');
 const len=sequenceLength(s,'play',0),hideAt=showMs(len,cueIntervalMs(s));
 assert.ok(hideAt<=cueIntervalMs(s)/2);
 s=tickFor(s,hideAt-500);assert.equal(memoryStage(s),'show');
 s=tickFor(s,750);assert.equal(memoryStage(s),'perform');
 s=tickFor(s,cueIntervalMs(s)-s.cueMs+250);assert.equal(s.cueIndex,1);assert.equal(memoryStage(s),'show','a new turn shows the sequence again');
});
