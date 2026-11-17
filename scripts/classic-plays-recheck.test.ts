import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_PLAY_BY_ID,phoneSequence} from '../src/domain/phonePlayCatalog';
import {phoneRoles,phoneTeamMotion} from '../src/domain/phonePlayProgression';
import {classRoundView} from '../src/domain/phoneClassMode';
import {CLASSIC_CLASS_BRIEF,adaptClassicPlay,fitGroupCues,groupSizeOf,pickVaried,seededRandom} from '../src/domain/phonePlayClassicsMode';
import {readFileSync} from 'node:fs';

const play=(n:number)=>PHONE_PLAY_BY_ID.get(`phone-play-${n}`)!;
const SIZE_WORDS:[RegExp,number][]=[[/넷/,4],[/셋/,3],[/둘/,2]];
const biggestWord=(text:string)=>SIZE_WORDS.find(([re])=>re.test(text))?.[1]??0;
const runs=(cues:readonly string[])=>{let best=1,now=1;for(let i=1;i<cues.length;i++){now=cues[i]===cues[i-1]?now+1:1;best=Math.max(best,now);}return best;};

test('101: titles, role cards and signals all talk about a group size the players can make',()=>{
 for(const players of [1,2,3,4,5,6])for(const easy of [false,true]){
  const p=adaptClassicPlay(play(101),easy,players),max=easy?2:Math.min(4,Math.max(2,players));
  for(const r of [0,1,2]){
   const cues=fitGroupCues(p,phoneSequence(p,r,easy),players),words=[p.rounds[r],phoneTeamMotion(p,r),...phoneRoles(p,Math.max(players,1),r).map(x=>x.role)];
   for(const w of words)assert(biggestWord(w)<=max,`${players}명 ${easy?'쉬운':'기본'} ${r}과제: ${w}`);
   assert(cues.every(c=>groupSizeOf(c)<=max),`${players}명 ${r}과제 신호`);
   assert(cues.every(c=>play(101).cues.includes(c)),'signals come from the play');
  }
 }
 // 셋이 함께하면 '넷' 과제에서 셋 모둠 신호가 나와 세 명이 함께 들어간다.
 const three=adaptClassicPlay(play(101),false,3);
 assert.match(three.rounds[1],/셋 모둠/);assert(fitGroupCues(three,phoneSequence(three,1),3).some(c=>groupSizeOf(c)===3));
 assert.match(adaptClassicPlay(play(101),true,6).rounds[0],/^둘 모둠/,'easy title matches the pair-only signals');
 assert.equal(adaptClassicPlay(play(101),false,Infinity).rounds[1],play(101).rounds[1],'the whole class keeps the four group');
 assert.equal(adaptClassicPlay(play(102),true,3),play(102),'other plays are untouched');
 assert.match(classRoundView(play(101),0,'쉬운 방법',false,4).brief,/^둘 모둠/,'whole-class easy title');
});

test('two choices are not a strict A·B·A·B beat, and never run three times in a row',()=>{
 let repeats=0,total=0;
 for(let seed=1;seed<=300;seed++){
  const out=pickVaried(['A','B'],16,seededRandom(seed));
  assert(runs(out)<=2,`seed ${seed}`);total+=15;repeats+=out.filter((c,i)=>i>0&&c===out[i-1]).length;
  const three=pickVaried(['A','B','C'],16,seededRandom(seed));assert.equal(runs(three),1,'three or more choices never repeat');
 }
 assert(repeats/total>0.15&&repeats/total<0.5,`repeat share ${repeats/total}`);
 for(const [n,r] of [[101,0],[106,0]] as const)for(let seed=1;seed<=50;seed++){
  const cues=classRoundView(play(n),r,'쉬운 방법',false,seed).cues.filter(c=>!c.startsWith('구석으로'));
  assert(runs(cues)<=2,`${n} easy seed ${seed}`);
 }
 const patterns=new Set(Array.from({length:40},(_,s)=>classRoundView(play(101),0,'쉬운 방법',false,s).cues.slice(0,6).join('|')));
 assert(patterns.size>4,'easy number signals are not one fixed alternation');
});

test('102 whole class: no hour twice in a row, and lunch time always shows in the third task',()=>{
 for(const level of ['기본 방법','쉬운 방법'])for(const taskSeconds of [30,45,60,90])for(let seed=1;seed<=400;seed++)for(const r of [0,1,2]){
  const cues=classRoundView(play(102),r,level,false,seed,6,taskSeconds).cues;
  cues.forEach((c,i)=>assert.notEqual(c,cues[i-1],`${level} ${taskSeconds}s seed ${seed} task ${r} index ${i}`));
  const visible=cues.slice(0,Math.floor(taskSeconds/6));
  if(r===2)assert(visible.some(c=>c.startsWith('밥')),`${level} ${taskSeconds}s seed ${seed}: lunch time is seen`);
  if(r<2)assert(!cues.some(c=>c.startsWith('밥')),'lunch time only in the third task');
 }
 // 느린 속도(신호 9초)로 30초 과제여도 보이는 신호 안에 나온다.
 for(let seed=1;seed<=200;seed++)assert(classRoundView(play(102),2,'기본 방법',false,seed,9,30).cues.slice(0,3).some(c=>c.startsWith('밥')),`slow seed ${seed}`);
 const first=new Set(Array.from({length:60},(_,s)=>classRoundView(play(102),2,'기본 방법',false,s,6,45).cues.findIndex(c=>c.startsWith('밥'))));
 assert(first.size>=3,'lunch time comes at different moments');
});

test('the start brief stays on screen after the short countdown',()=>{
 const src=readFileSync(new URL('../src/presentation/components/minigames/common/PhonePlayClass.tsx',import.meta.url),'utf8');
 assert.match(src,/setupHint=seated\?undefined:CLASSIC_CLASS_BRIEF\[p\.id\]/);
 assert.match(src,/setupHint&&phase!=='countdown'&&<p className="pc-hint">/);
 for(const id of Object.keys(CLASSIC_CLASS_BRIEF))assert(CLASSIC_CLASS_BRIEF[id].length>5);
});
