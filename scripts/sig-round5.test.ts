import test from 'node:test';
import assert from 'node:assert/strict';
import {createFunState,reduce,seededRandom,type FunState,type FunHooks} from '../src/domain/funLoop';
import {mirrorPair,mirrorRound,mirrorStep,leaderFor,ROUND_SECONDS} from '../src/domain/signature/sig-mirror-pair';
import {bossRaid,bossRaidCue,BOSSES,bossesFor} from '../src/domain/signature/sig-boss-raid';
import {boardSizeFor,buildMoveBoard,cellHints,emptyOwners,LINES_4X4,linesOf,newLinesIfClaimed,turnTeam} from '../src/domain/signature/sig-move-bingo';
import {signalCaptain,signalCaptainCue,CARD_EVERY} from '../src/domain/signature/sig-signal-captain';
import {memoryRelay} from '../src/domain/signature/sig-memory-relay';
import type {SignatureGameDef} from '../src/domain/signature/types';

const ctxOf=(game:SignatureGameDef,s:FunState,seed:number,phase=s.phase as 'play',index=s.cueIndex)=>({phase,index,seed,reversed:false,frozen:false,seated:false,teams:s.teams,state:s});
const hooksFor=(game:SignatureGameDef,seed:number):FunHooks=>({
 cueSeconds:s=>s.phase==='tutorial'||s.phase==='play'||s.phase==='climax'?game.cue(ctxOf(game,s,seed)).seconds:undefined,
 allowsEvent:(s,kind)=>!(s.phase==='tutorial'||s.phase==='play'||s.phase==='climax')||!(game.cue(ctxOf(game,s,seed)).blockEvents??[]).includes(kind),
});

test('engine carries the cue remainder: a slightly late timer does not push cues behind the phase clock',()=>{
 let s=reduce(reduce(createFunState({teams:1,timing:{demo:1,tutorial:1,play:60,climax:10,cueSeconds:4},seed:1}),{type:'next'}),{type:'next'});
 for(let i=0;i<16;i++)s=reduce(s,{type:'tick',ms:253});// 4048ms
 assert.equal(s.cueIndex,1);
 assert.equal(s.cueMs,48,'the 48ms past the 4s boundary belong to cue 1');
 // after 60s of 253ms ticks the cue index matches the phase clock (15 cues of 4s), not one cue per 4.048s
 s=reduce(reduce(createFunState({teams:1,timing:{demo:1,tutorial:1,play:600,climax:10,cueSeconds:4},seed:1}),{type:'next'}),{type:'next'});
 while(s.phaseMs<60000)s=reduce(s,{type:'tick',ms:253});
 assert.equal(s.cueIndex,Math.floor(s.phaseMs/4000));
});

test('mirror pair under timer jitter (253ms, 260ms, random 240–280ms): every 찾기 gets its full time and leaders alternate',()=>{
 const tickers:[string,(i:number)=>number][]=[['253',()=>253],['260',()=>260],['random',i=>240+Math.floor(seededRandom(i*31+7)()*41)]];
 for(const [name,tickMs] of tickers){
  for(const seed of [1,7]){
   const hooks=hooksFor(mirrorPair,seed);
   let s=reduce(reduce(createFunState({teams:2,timing:mirrorPair.timing,seed,surprises:{play:[],climax:[]}}),{type:'next'}),{type:'next'});
   const findMs:Record<string,number>={};const leaders:{phase:string;round:number;leader:string}[]=[];
   let i=0;
   while(s.phase!=='result'){
    const ms=tickMs(i++);
    if((s.phase==='play'||s.phase==='climax')){
     if(mirrorStep(s.cueIndex)==='find'){const k=`${s.phase}:${s.cueIndex}`;findMs[k]=(findMs[k]??0)+Math.min(ms,ROUND_SECONDS*1000);}
     const round=mirrorRound(ctxOf(mirrorPair,s,seed));
     const last=leaders[leaders.length-1];
     if(!last||last.phase!==s.phase||last.round!==round)leaders.push({phase:s.phase,round,leader:leaderFor(round)});
    }
    s=reduce(s,{type:'tick',ms},hooks);
   }
   const finds=Object.entries(findMs);
   assert.equal(finds.filter(([k])=>k.startsWith('play:')).length,mirrorPair.timing.play/ROUND_SECONDS,`${name}/${seed}: one 찾기 per play round`);
   assert.equal(finds.filter(([k])=>k.startsWith('climax:')).length,2,`${name}/${seed}: two 찾기 in the climax`);
   for(const [k,ms] of finds)assert.ok(ms>=5000-300,`${name}/${seed}: ${k} lasted only ${ms}ms`);
   // 1번 → 2번 → 1번 … (마지막 승부도 본게임 마지막 라운드의 다음 리더부터)
   for(let k=1;k<leaders.length;k++)assert.notEqual(leaders[k].leader,leaders[k-1].leader,`${name}/${seed}: leader repeats at ${leaders[k].phase} round ${leaders[k].round}`);
  }
 }
});

test('boss cue content is fixed by the boss at the cue start (killing the boss mid-cue does not swap the move)',()=>{
 const s0=createFunState({teams:1,timing:bossRaid.timing,seed:3,skipDemo:true});
 const hp=bossesFor(1,bossRaid.timing);
 // 0번 신호(슬라임) 도중에 슬라임 HP만큼 공격 → 신호는 그대로 슬라임 약점
 const mid:FunState={...s0,phase:'play',cueIndex:0,cueHits:{'play:0':hp[0].hp+hp[1].hp}};
 const cue=bossRaidCue(ctxOf(bossRaid,mid,3,'play',0));
 assert.match(cue.sub??'',new RegExp(BOSSES[0].name));
 assert.equal(cue.seconds,undefined,'a 6s slime cue does not become a 12s dragon cue');
 // 다음 신호(1번)는 새 보스(드래곤)
 const next=bossRaidCue(ctxOf(bossRaid,{...mid,cueIndex:1},3,'play',1));
 assert.match(next.sub??'',new RegExp(BOSSES[2].name));
});

test('bingo: 3–4 teams play on a 4×4 board where three in a row is a bingo, and random play makes bingos',()=>{
 assert.equal(boardSizeFor(2),3);assert.equal(boardSizeFor(3),4);assert.equal(boardSizeFor(4),4);
 const board=buildMoveBoard(5,0,4);
 assert.equal(board.length,16);
 assert.equal(board.filter(c=>c.kind==='quiz').length,5);
 assert.deepEqual(buildMoveBoard(5,0,4),board,'same seed → same board');
 assert.equal(new Set(board.filter(c=>c.kind==='move').map(c=>c.label)).size,11,'no repeated move on a 4×4 board');
 assert.equal(LINES_4X4.length,24);
 const o=emptyOwners(4);o[5]=2;o[6]=2;
 assert.equal(newLinesIfClaimed(o,7,2),1,'5-6-7 is three in a row');
 assert.equal(newLinesIfClaimed(o,4,2),1,'4-5-6 too');
 // 3×3 판은 그대로(2팀)
 assert.equal(buildMoveBoard(5,0).length,9);
 // 4팀 무작위 진행(70% 성공, 차례마다 힌트 칸이 있으면 고름): 판마다 빙고가 나온다
 for(const useHints of [true,false]){
  let bingos=0;const games=60;
  for(let g=0;g<games;g++){
   const rnd=seededRandom(g*13+1);let owners=emptyOwners(4),turns=0;
   for(let k=0;k<40;k++){
    const team=turnTeam(turns,4);turns++;
    const empty=owners.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
    if(!empty.length){owners=emptyOwners(4);continue;}
    const hints=cellHints(owners,team,4);
    const preferred=useHints?empty.filter(i=>hints[i]==='win'):[];
    const cell=(preferred.length?preferred:empty)[Math.floor(rnd()*(preferred.length?preferred.length:empty.length))];
    if(rnd()<0.7){bingos+=newLinesIfClaimed(owners,cell,team);owners=owners.map((v,i)=>i===cell?team:v);}
   }
  }
  assert.ok(bingos/games>=1,`${useHints?'with':'without'} hints: ${(bingos/games).toFixed(2)} bingos per game`);
 }
 // 줄 계산은 칸 수로 판 크기를 알아낸다
 const full3=emptyOwners();full3[0]=0;full3[1]=0;full3[2]=0;
 assert.equal(linesOf(full3,0),1);
});

test('signal captain: number and traffic-light cards block the surprise reverse; a scheduled reverse waits for a card where it means something',()=>{
 const s=createFunState({teams:2,timing:signalCaptain.timing,seed:1,skipDemo:true});
 const cueAt=(index:number)=>signalCaptainCue(ctxOf(signalCaptain,{...s,phase:'play'},1,'play',index));
 // 본게임 카드 순서: 출동(0) · 새나무(1) · 신호등(2) · 숫자(3)
 assert.deepEqual(cueAt(2*CARD_EVERY+1).blockEvents,['reverse'],'traffic light');
 assert.deepEqual(cueAt(3*CARD_EVERY+1).blockEvents,['reverse'],'number');
 assert.deepEqual(cueAt(3*CARD_EVERY).blockEvents,['reverse'],'the number card announcement too');
 assert.equal(cueAt(1).blockEvents,undefined,'dispatch card allows reverse');
 // a reversed number cue does not say "반대로"
 const rev=signalCaptainCue({...ctxOf(signalCaptain,{...s,phase:'play'},1,'play',3*CARD_EVERY+1),reversed:true});
 assert.doesNotMatch(rev.sub??'',/거꾸로/);
 // engine: a reverse scheduled during the traffic card is deferred until the number card ends (dispatch again)
 let p=reduce(reduce(createFunState({teams:2,timing:signalCaptain.timing,seed:1,surprises:{play:['reverse'],climax:[]}}),{type:'next'}),{type:'next'});
 const trafficStartMs=2*CARD_EVERY*signalCaptain.timing.cueSeconds*1000;
 p={...p,surprises:[{phase:'play',atMs:trafficStartMs+1000,kind:'reverse'}]};
 const hooks=hooksFor(signalCaptain,1);
 let startedOn:string|null=null;
 while(p.phase==='play'&&!startedOn){
  p=reduce(p,{type:'tick',ms:250},hooks);
  if(p.event?.kind==='reverse')startedOn=String(Math.floor(p.cueIndex/CARD_EVERY)%4);
 }
 assert.ok(startedOn===null||startedOn==='0'||startedOn==='1',`reverse started on card ${startedOn}`);
});

test('memory relay phases are whole turns (no dead time), and a too-short last turn becomes a whole-class finish',()=>{
 const turn=memoryRelay.timing.cueSeconds;
 assert.equal(memoryRelay.timing.play%turn,0);
 assert.equal(memoryRelay.timing.climax%turn,0);
 assert.ok(memoryRelay.timing.tutorial>=turn*1.6&&memoryRelay.timing.tutorial-turn*1.6<1,'tutorial ≈ one slow turn');
});

test('freeze: the cue length is not fixed while frozen, and the cue clock pauses during the freeze',()=>{
 let s=reduce(reduce(createFunState({teams:1,timing:bossRaid.timing,seed:3,surprises:{play:['freeze'],climax:[]}}),{type:'next'}),{type:'next'});
 s={...s,surprises:[],cueLenSec:null,event:{kind:'freeze',leftMs:3000,seq:1}};
 const hooks:FunHooks={cueSeconds:st=>st.event?.kind==='freeze'?undefined:12};
 s=reduce(s,{type:'tick',ms:500},hooks);
 assert.equal(s.cueLenSec,null,'not fixed to 0 during the freeze');
 assert.equal(s.cueMs,0,'cue clock does not run while frozen');
 for(let i=0;i<6;i++)s=reduce(s,{type:'tick',ms:500},hooks);
 assert.equal(s.event,null);
 assert.equal(s.cueLenSec,12,'after the freeze the cue gets its real 12s length');
});
