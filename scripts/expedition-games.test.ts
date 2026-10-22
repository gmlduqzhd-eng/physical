import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPEDITION_GAMES,HELD_EXPEDITION_SPECS} from '../src/domain/expeditionGames';
import {GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {createExpeditionRound,validateExpeditionRecord,checkExpeditionAnswer,reachablePath,expeditionScore,expeditionBingo,type ExpeditionRecord} from '../src/domain/expeditionRules';
import {normalizeGameResultDetails} from '../src/domain/gameResultDetails';
const b=EXPEDITION_GAMES.filter(g=>g.kind==='B');
test('92 approved games, 20 expressions and 72 rule games are registered once; eight are absent',()=>{
 assert.equal(EXPEDITION_GAMES.length,92);assert.equal(b.length,72);assert.equal(GAMES.length,225);
 assert.equal(new Set(GAMES.map(g=>g.type)).size,225);
 for(const game of EXPEDITION_GAMES){assert.equal(GAMES.filter(g=>g.type===game.id).length,1);assert.equal(LESSON_GAME_CATALOG.filter(g=>g.id===game.id).length,1);assert(game.desc&&game.space&&game.equipment.length&&game.alternative);}
 for(const spec of HELD_EXPEDITION_SPECS)assert(!EXPEDITION_GAMES.some(g=>g.spec===spec));
});
test('all 20 expression activities have distinct stages, durations, movement guides and rubrics',()=>{
 for(const game of EXPEDITION_GAMES.filter(g=>g.kind==='A')){const data=EXPRESSION_GAMES.find(g=>g.id===game.id)!;assert(data);assert(data.steps.length>=3);assert.equal(new Set(data.steps.map(s=>s.title)).size,data.steps.length);assert(data.steps.every(s=>s.durationSeconds>0&&s.guide.length>15));assert(data.rubric.length>=2);assert.equal(data.achievement.code,'연계 확인 필요');}
});
test('every B rule generates valid plans and accepts one complete record with its own game ID',()=>{
 for(const game of b){const plans=Array.from({length:game.rounds},(_,i)=>createExpeditionRound(game,i,game.players,()=>.42));const records:ExpeditionRecord[]=plans.map((plan,i)=>{
  const answer=plan.allocation?plan.allocation.counts.map(String):plan.kind==='unique'?plan.question!.options.slice(0,game.players):plan.kind==='choice'?[plan.question!.options[0]]:plan.question?.answer||[];
  const record:ExpeditionRecord={round:i+1,kind:plan.kind,source:'self-report',participants:Array.from({length:game.players},(_,j)=>j+1),counts:plan.targets.map(t=>t.goal),checks:plan.checks,answer,correct:checkExpeditionAnswer(game,plan,answer,game.players),elapsedMs:(plan.targetSeconds||12)*1000,...(plan.timing==='arrival'?{arrivals:Array(game.players).fill(12000)}:{})};
  assert.equal(validateExpeditionRecord(plan,record,game.players),null,game.spec);
  assert(validateExpeditionRecord(plan,{...record,participants:[]},game.players),game.spec+' rejects missing participation');
  if(plan.targets.length)assert(validateExpeditionRecord(plan,{...record,counts:plan.targets.map(()=>NaN)},game.players));
  assert(plan.steps.length&&plan.steps.every(s=>s.seconds>0&&s.instruction.length>10));return record;
 });
 const score=expeditionScore(records,plans);assert(Number.isFinite(score)&&score>=0&&score<=100,game.spec);
 const details=normalizeGameResultDetails({activity:{gameId:game.id,specId:game.spec,soloPreview:true,rounds:records}})!;
 assert.equal(details.activity!.gameId,game.id);assert.equal(details.activity!.rounds.length,game.rounds);
 }
});
test('random math, no-repeat routes, non-overlapping assignments and mazes stay solvable',()=>{
 for(let sample=0;sample<100;sample++)for(const spec of ['S02','S04','S05','S06','T01','T03','T04','T08','T36']){
  const game=b.find(g=>g.spec===spec)!;let seed=sample+1;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const plan=createExpeditionRound(game,sample%3,4,random);
  if(plan.board)assert(reachablePath(4,plan.board.start,plan.board.destination,plan.board.blocked).length);
  if(plan.allocation){assert.equal(plan.allocation.counts.reduce((a,v)=>a+v,0),4);assert(plan.allocation.counts.every(n=>n>0));}
  if(spec==='S06'){assert.equal(new Set(plan.question!.answer).size,2);assert(checkExpeditionAnswer(game,plan,plan.question!.answer,1));assert(!checkExpeditionAnswer(game,plan,['1','1'],1));}
  if(spec==='S02')assert(plan.steps.every((s,i)=>!i||s.instruction!==plan.steps[i-1].instruction));
  if(spec==='T01')assert.equal(new Set(plan.roles.map(s=>s.split(': ')[1])).size,4);
 }
});
test('memory sequences, 8-beat patterns, rule reversal and original-state modifications are explicit',()=>{
 for(const spec of ['S05','T05','T46']){const game=b.find(g=>g.spec===spec)!;const plan=createExpeditionRound(game,0,game.players);assert(plan.secret!.length>=3);assert(plan.steps.every(s=>!s.instruction.includes(plan.secret!.join(' → '))));}
 for(const game of b.filter(g=>g.family==='rhythm'))assert(createExpeditionRound(game,0,game.players).steps.every(s=>s.beats?.length===8),game.spec);
 assert(createExpeditionRound(b.find(g=>g.spec==='S03')!,0,1).steps.some(s=>s.title==='반전 규칙'));
 const repair=EXPRESSION_GAMES.find(g=>g.id==='exp-phone-48')!;assert(repair.steps.slice(1).every(s=>/원본/.test(s.guide)));
});
test('four-room escape and four-station rotation really include all four activities',()=>{
 const game=b.find(g=>g.spec==='T50')!;assert.equal(game.rounds,4);assert(createExpeditionRound(game,3,4).steps[0].instruction.includes('천으로 공 운반'));
 assert.equal(createExpeditionRound(game,2,4).steps[0].beats!.length,8);
 assert.equal(createExpeditionRound(b.find(g=>g.spec==='T41')!,1,4).steps[0].beats!.length,8);
 assert.deepEqual(createExpeditionRound(b.find(g=>g.spec==='S01')!,0,1).targets,[{label:'중앙으로 돌아온 왕복 수',goal:3}]);
 for(const spec of ['T42','T44']){const game=b.find(g=>g.spec===spec)!;for(let person=0;person<4;person++)assert.equal(new Set(Array.from({length:4},(_,round)=>createExpeditionRound(game,round,4).roles[person].split(': ')[1])).size,4);}
});
test('unique receiving spots reject reuse, island counts reject wrong allocations, bingo tracks actual reported hits',()=>{
 const game=b.find(g=>g.spec==='T40')!,p=createExpeditionRound(game,0,4);
 assert(!checkExpeditionAnswer(game,p,['1번 표식','1번 표식','2번 표식','3번 표식'],4));assert(checkExpeditionAnswer(game,p,p.question!.options.slice(0,4),4));
 const bingo=b.find(g=>g.spec==='S39')!,plans=Array.from({length:3},(_,i)=>createExpeditionRound(bingo,i,1));
 const records=plans.map((p,i)=>({round:i+1,kind:p.kind,source:'self-report' as const,participants:[1],counts:[1,1,1],checks:p.checks,answer:[],correct:true,elapsedMs:12000}));assert.equal(expeditionBingo(records,plans).lines,8);assert.equal(expeditionBingo(records.map(r=>({...r,counts:[0,0,0]})),plans).lines,0);
});
test('invalid/corrupt nested records are removed and legacy results remain compatible',()=>{
 assert.deepEqual(normalizeGameResultDetails({metrics:{기존:'유지'},activity:{gameId:'exp-phone-01',specId:'S01',rounds:[{round:1,source:'sensor'}]}}),{metrics:{기존:'유지'},activity:{gameId:'exp-phone-01',specId:'S01',soloPreview:false,rounds:[]}});
 assert.equal(normalizeGameResultDetails({activity:{gameId:'unsafe',specId:'S01',rounds:[]}}),undefined);
});


test('29 redesigned expedition flows keep native puzzles, roles, bingo and all stations at both paces',async()=>{
  const {REVAMPED_EXPEDITION_IDS,paceExpedition,expeditionRehearsal}=await import('../src/domain/expeditionRevamps');
  assert.equal(REVAMPED_EXPEDITION_IDS.length,29);
  for(const id of REVAMPED_EXPEDITION_IDS){
    const game=EXPEDITION_GAMES.find(g=>g.id===id)!;
    const native=Array.from({length:game.rounds},(_,i)=>createExpeditionRound(game,i,game.players,()=>.42));
    const adapted=paceExpedition(native,true);
    for(let i=0;i<native.length;i++){
      for(const key of ['question','allocation','roles','targets','checks','bingoCells','timing','targetSeconds'] as const)assert.deepEqual(adapted[i][key],native[i][key]);
      assert(adapted[i].steps.every((s,j)=>s.seconds>=native[i].steps[j].seconds));
    }
    assert.equal(adapted.length,game.rounds);
    const rehearsal=expeditionRehearsal(adapted[0]);assert.equal(rehearsal.steps.length,1);assert.equal(rehearsal.steps[0].seconds,8);assert.equal(rehearsal.timing,undefined);
  }
});
