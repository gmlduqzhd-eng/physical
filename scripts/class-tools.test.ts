import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASS_TOOLS,roundRobin,leagueTable,leagueMatchCount,matchKey,bumpScore,homeAwayScore,numberSubject,makeLadder,traceLadder,ladderResults,drawNumber,splitGroups,rollDice,ladderLabels,formatClock,type Rng} from '../src/domain/classTools';

const seeded=(seed:number):Rng=>()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};

test('a league schedule lets every pair of teams meet exactly once, and nobody plays twice in a round',()=>{
 assert.deepEqual(roundRobin(1),[]);
 for(let teams=2;teams<=10;teams++){
  const rounds=roundRobin(teams),pairs=new Set<string>();
  assert.equal(rounds.length,teams%2?teams:teams-1,`${teams} rounds`);
  for(const round of rounds){
   const busy=new Set<number>();
   for(const m of round.matches){assert(m.home!==m.away&&!busy.has(m.home)&&!busy.has(m.away));busy.add(m.home);busy.add(m.away);assert(!pairs.has(matchKey(m)));pairs.add(matchKey(m));}
   if(teams%2){assert(round.rest!==null&&!busy.has(round.rest));assert.equal(busy.size,teams-1);}else{assert.equal(round.rest,null);assert.equal(busy.size,teams);}
  }
  assert.equal(pairs.size,leagueMatchCount(teams));
  if(teams%2)assert.deepEqual(rounds.map(r=>r.rest).sort(),Array.from({length:teams},(_,i)=>i),'every team rests once');
 }
});
test('the league table gives 3 for a win and 1 for a draw, then goal difference, and equal records share a rank',()=>{
 const rounds=roundRobin(4),empty=leagueTable(4,rounds,{});
 assert(empty.every(r=>r.played===0&&r.rank===1));
 const table=leagueTable(4,rounds,{'0-1':[2,0],'2-3':[1,1],'0-2':[0,0],'1-3':[3,1]});
 const by=Object.fromEntries(table.map(r=>[r.team,r]));
 assert.deepEqual([by[0].points,by[0].win,by[0].draw,by[0].played],[4,1,1,2]);assert.equal(by[1].points,3);assert.equal(by[2].points,2);assert.equal(by[3].points,1);
 assert.deepEqual(table.map(r=>r.team),[0,1,2,3]);assert.deepEqual(table.map(r=>r.rank),[1,2,3,4]);
 // a score is stored once per pair, whichever side is home in the schedule
 const m=rounds.flatMap(r=>r.matches).find(x=>matchKey(x)==='0-1')!;assert(m);
 const tie=leagueTable(3,roundRobin(3),{'0-1':[1,1]});assert.deepEqual(tie.slice(0,2).map(r=>r.rank),[1,1]);assert.equal(tie[2].rank,3);
});
test('a ladder always sends each start to a different end, and rungs never touch',()=>{
 for(let seed=1;seed<=60;seed++)for(let columns=2;columns<=8;columns++){
  const ladder=makeLadder(columns,10,seeded(seed*columns));
  for(const row of ladder.rungs){assert.equal(row.length,columns-1);for(let c=1;c<row.length;c++)assert(!(row[c]&&row[c-1]));}
  for(let c=0;c<columns-1;c++)assert(ladder.rungs.some(row=>row[c]),'every gap has a rung');
  assert.deepEqual([...ladderResults(ladder)].sort((a,b)=>a-b),Array.from({length:columns},(_,i)=>i));
  const path=traceLadder(ladder,0);assert.equal(path.length,11);assert(path.every((c,i)=>i===0||Math.abs(c-path[i-1])<=1));
 }
 assert.deepEqual(ladderLabels('술래, 심판\n기록',5),['술래','심판','기록','통과','통과']);assert.deepEqual(ladderLabels('a,b,c',2),['a','b']);
});
test('number draw never repeats, groups differ by at most one, dice stay within 1 to 6',()=>{
 const rng=seeded(7),drawn:number[]=[];
 for(let i=0;i<25;i++){const n=drawNumber(25,drawn,rng);assert(n!==null&&n>=1&&n<=25&&!drawn.includes(n));drawn.push(n);}
 assert.equal(drawNumber(25,drawn,rng),null);
 for(const [total,groups] of [[25,4],[30,6],[7,3],[3,5],[24,10]] as const){
  const out=splitGroups(total,groups,seeded(total));const sizes=out.map(g=>g.length);
  assert.equal(out.length,Math.min(groups,total));assert.equal(Math.max(...sizes)-Math.min(...sizes)<=1,true);
  assert.deepEqual(out.flat().sort((a,b)=>a-b),Array.from({length:total},(_,i)=>i+1));
 }
 const dice=rollDice(200,seeded(3));assert(dice.every(d=>d>=1&&d<=6));assert.equal(new Set(dice).size,6);
 assert.equal(formatClock(0),'0:00.0');assert.equal(formatClock(75_340),'1:15.3');
 assert.equal(new Set(CLASS_TOOLS.map(t=>t.id)).size,CLASS_TOOLS.length);
});
test('a win is credited to the team that scored, even when the higher-numbered team is the home side',()=>{
 for(let teams=3;teams<=8;teams++){
  const rounds=roundRobin(teams),flipped=rounds.flatMap(r=>r.matches).filter(m=>m.home>m.away);
  assert(flipped.length>0,`${teams} teams have matches where the home team has the higher number`);
  for(const m of [...flipped,...rounds.flatMap(r=>r.matches).filter(x=>x.home<x.away)]){
   // the home team scores 3, the away team 1, through the same helper the screen uses
   let s=bumpScore(m,null,0,3);s=bumpScore(m,s,1,1);
   assert.deepEqual(homeAwayScore(m,s),[3,1]);
   const table=leagueTable(teams,rounds,{[matchKey(m)]:s}),by=Object.fromEntries(table.map(r=>[r.team,r]));
   assert.deepEqual([by[m.home].win,by[m.home].points,by[m.away].loss,by[m.away].points],[1,3,1,0],`${teams}팀 ${m.home+1}팀(홈) vs ${m.away+1}팀`);
  }
 }
 assert.deepEqual(bumpScore({home:2,away:0},[1,1],0,-5),[1,0],'scores never go below zero');
});
test('the dice sentence uses the right particle for each number',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11,12].map(numberSubject),['1이','2가','3이','4가','5가','6이','7이','8이','9가','10이','11이','12가']);
});
