import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_PLAY_BY_ID,PHONE_PLAYS,phoneSequence} from '../src/domain/phonePlayCatalog';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {phoneTeamMotion} from '../src/domain/phonePlayProgression';

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
