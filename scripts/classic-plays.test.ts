import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_PLAY_BY_ID,PHONE_PLAYS,phoneSequence} from '../src/domain/phonePlayCatalog';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {phoneTeamMotion} from '../src/domain/phonePlayProgression';
import {classRoundView} from '../src/domain/phoneClassMode';
import {CLASSIC_CLASS_BRIEF,CORNER_WALK,FOX_BACK,fitGroupCues,groupSizeOf} from '../src/domain/phonePlayClassicsMode';
import {readFileSync} from 'node:fs';

const IDS=['phone-play-101','phone-play-102','phone-play-103','phone-play-104','phone-play-105','phone-play-106'];
const text=(id:string)=>{const p=PHONE_PLAY_BY_ID.get(id)!;return [p.goal,...p.rules,...p.rounds,...p.cues,p.check,p.easy,p.hard,p.seated].join(' ');};

test('the six classroom classics are listed everywhere a teacher picks activities',()=>{
 for(const id of IDS){
  assert(PHONE_PLAYS.some(p=>p.id===id),id);assert(AVAILABLE_GAMES.some(g=>g.type===id),id);assert(LESSON_GAME_CATALOG.some(g=>g.id===id),id);
 }
 for(const [query,id] of [['술래','phone-play-103'],['빙고','phone-play-105'],['여우','phone-play-102'],['가위바위보','phone-play-104']] as const)
  assert(AVAILABLE_GAMES.some(g=>g.type===id&&matchesActivitySearch(g,query)),query);
});

test('the classics keep the app rules: walking only, nobody is knocked out, touching is optional',()=>{
 for(const id of IDS){
  const t=text(id);
  assert.doesNotMatch(t,/달려|뛰어가|전력|질주|쫓아가세요/,id);
  assert.doesNotMatch(t.replace(/탈락은 없어요/g,''),/탈락/,id);
  assert.match(t,/걸|제자리/,id);
 }
 assert.match(text('phone-play-103'),/이름을 부르/,'tag can be played without touching');
 assert.match(text('phone-play-102'),/쫓아가지 않아요/,'the fox never chases');
});

test('every round shows concrete signals, and team plays show a concrete shared motion',()=>{
 for(const id of IDS){
  const p=PHONE_PLAY_BY_ID.get(id)!;
  for(const round of [0,1,2]){const cues=phoneSequence(p,round);assert(cues.length>=1&&cues.every(c=>p.cues.includes(c)),`${id} ${round}`);}
  if(p.kind==='team')for(const round of [0,1,2])assert.notEqual(phoneTeamMotion(p,round),p.rounds[round],`${id} has its own motion text`);
 }
});

const play=(n:number)=>PHONE_PLAY_BY_ID.get(`phone-play-${n}`)!;
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the easy way uses its own signals, matching the easy description',()=>{
 for(const r of [0,1,2]){
  assert(phoneSequence(play(101),r,true).every(c=>groupSizeOf(c)<=2),`101 easy round ${r}`);
  assert(phoneSequence(play(104),r,true).every(c=>c.startsWith('알')||c.startsWith('병아리')),`104 easy round ${r}`);
 }
 assert.match(play(101).easy,/둘/);assert.match(play(104).easy,/알과 병아리/);
});

test('number groups never ask for a group bigger than the players who are there',()=>{
 for(const players of [1,2,3,4,5,6])for(const r of [0,1,2]){
  const cues=fitGroupCues(play(101),phoneSequence(play(101),r),players);
  assert(cues.length>0);assert(cues.every(c=>groupSizeOf(c)<=Math.max(2,players)),`${players}명 ${r}과제`);
 }
 assert.deepEqual(fitGroupCues(play(103),['걷기 시작'],2),['걷기 시작'],'other plays are untouched');
});

test('whole-class signals change during a task, and numbers and corners are random without repeats',()=>{
 for(const n of [101,102,103,104,105,106])for(const r of [0,1,2]){
  const cues=classRoundView(play(n),r,'기본 방법',false,42).cues;
  assert(new Set(cues).size>1,`${n} ${r}과제 신호가 바뀌어야 해요`);
  assert.deepEqual(classRoundView(play(n),r,'기본 방법',false,42).cues,cues,`${n} same seed, same order`);
 }
 for(const n of [101,106]){
  const a=classRoundView(play(n),2,'기본 방법',false,1).cues,b=classRoundView(play(n),2,'기본 방법',false,2).cues;
  assert.notDeepEqual(a,b,`${n} differs between runs`);
  const reveals=n===106?a.filter(c=>!c.startsWith(CORNER_WALK)):a;
  reveals.forEach((c,i)=>assert.notEqual(c,reveals[i-1],`${n} no immediate repeat`));
 }
 const corners=classRoundView(play(106),0,'기본 방법',false,3).cues;
 corners.forEach((c,i)=>assert.equal(c.startsWith(CORNER_WALK),i%2===0,'walk to a corner before each reveal'));
 assert.equal(corners[1].split(' · ').length,1);assert.equal(classRoundView(play(106),2,'기본 방법',false,3).cues[1].split(' · ').length,3);
});

test('the fox sends everyone back to the start line and lunch time is not on a fixed beat',()=>{
 const positions=new Set<string>();
 for(const seed of [1,2,3,4,5]){
  const cues=classRoundView(play(102),2,'기본 방법',false,seed).cues;
  assert(cues.includes(FOX_BACK),`seed ${seed}`);
  let walked=0;for(const c of cues){if(c===FOX_BACK)walked=0;else{const m=c.match(/^(한|두|세) 시/);if(m)walked+={한:1,두:2,세:3}[m[1] as '한']!;}assert(walked<=8,'never walks far without returning');}
  positions.add(cues.map((c,i)=>c.startsWith('밥')?i:-1).filter(i=>i>=0).join(','));
 }
 assert(positions.size>1,'lunch time comes at different moments');
 assert(!classRoundView(play(102),0,'기본 방법',false,9).cues.some(c=>c.startsWith('밥')),'no lunch time in the first task');
});

test('each classic play has its own start brief, and the group hint matches the leader rotation',()=>{
 for(const id of IDS)assert(CLASSIC_CLASS_BRIEF[id]?.length>5,id);
 assert.match(read('src/presentation/components/minigames/common/PhonePlayClass.tsx'),/CLASSIC_CLASS_BRIEF\[p\.id\]\?\?/);
 const device=read('src/presentation/components/minigames/common/PhonePlay.tsx');
 assert.doesNotMatch(device,/신호마다 다음 번호가 이어받아요/);assert.match(device,/초마다 이끄는 사람이 다음 번호로 바뀌어요/);
});
