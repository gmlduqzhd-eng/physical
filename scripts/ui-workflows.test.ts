import test from 'node:test';
import assert from 'node:assert/strict';
import {generateLessonPlan,lessonGroupSizes,validateLessonInputs,type DeviceOption,type SpaceOption} from '../src/domain/lessonPlan';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {isAvailableGame,mergedGameUrl} from '../src/domain/gameLifecycle';
import {latestRequest} from '../src/application/latestRequest';

const plan=(minutes=40,students=21,space:SpaceOption='좁은 실내 공간',device:DeviceOption='모둠별 1대',maximum=4)=>
  generateLessonPlan('3~4학년군',minutes,'운동','','모둠',students,space,device,['협력'],LESSON_GAME_CATALOG[0],'manual',maximum);

test('every supported lesson duration has positive phases, an exact total and matching activity time',()=>{
  for(let minutes=6;minutes<=480;minutes++){
    const p=plan(minutes);
    assert.equal(p.lessonFlow.reduce((n,s)=>n+s.time,0),minutes);
    assert(p.lessonFlow.every(s=>Number.isInteger(s.time)&&s.time>=1),String(minutes));
    assert.equal(p.recommendedGame?.usageTime,p.lessonFlow.find(s=>s.stage==='전개 ②')!.time);
  }
});
test('blank, fractional, zero and out-of-range fields cannot silently become defaults',()=>{
  for(const value of ['', ' ', '0','-1','1.5','201','abc',NaN,Infinity])assert(validateLessonInputs(40,value,4));
  for(const value of ['',5,481,6.5])assert(validateLessonInputs(value,21,4));
  for(const value of ['',1,21,2.1])assert(validateLessonInputs(40,21,value));
  assert.equal(validateLessonInputs('6','21','4'),null);
  assert.throws(()=>plan(5));assert.throws(()=>plan(40,0));
});
test('all class sizes distribute every student once into balanced groups within the chosen maximum',()=>{
  for(let students=1;students<=200;students++)for(let maximum=2;maximum<=20;maximum++){
    const groups=lessonGroupSizes(students,maximum);
    assert.equal(groups.reduce((n,s)=>n+s,0),students);
    assert(groups.every(size=>size>=1&&size<=maximum));
    assert(Math.max(...groups)-Math.min(...groups)<=1);
  }
  assert.deepEqual(lessonGroupSizes(21,4),[4,4,4,3,3,3]);
});
test('selected location, devices and actual group membership survive into the plan',()=>{
  for(const space of ['교실','체육관','운동장','다목적실','좁은 실내 공간'] as SpaceOption[]){
    const p=plan(6,21,space);assert(p.gameDetail!.arrangement.startsWith(space));
    if(space!=='체육관')assert(!p.gameDetail!.arrangement.includes('체육관'));
    assert(!p.gameDetail!.arrangement.includes('2m'));assert(!p.gameDetail!.rotation.includes('나머지 3명'));
    assert(p.gameDetail!.preparation.includes('4명씩 3모둠 · 3명씩 3모둠'));
  }
  const offline=plan(40,21,'교실','없음');assert(offline.gameDetail!.deviceOps.includes('기기를 사용하지 않는다'));assert(!offline.gameDetail!.preparation.includes('기기에서 게임을 실행'));
  const one=plan(6,1);assert(one.gameDetail!.rotation.includes('혼자 남는 학생'));
});
test('current catalog and retained redirects resolve without obsolete game-name or control assumptions',()=>{
  assert(LESSON_GAME_CATALOG.length>0);
  for(const game of LESSON_GAME_CATALOG){assert(isAvailableGame(game.id),game.id);assert.equal(game.route,'/play/'+game.id);}
  assert.equal(mergedGameUrl('/play/reaction','reaction','',''),'/play/red_green?variant=reaction');
});
test('late member searches and abandoned reads cannot replace the latest search result',async()=>{
  const requests=latestRequest();let displayed='';let releaseOld!:()=>void;
  const oldCurrent=requests.begin();const old=new Promise<void>(r=>releaseOld=r).then(()=>{if(oldCurrent())displayed='old';});
  const newCurrent=requests.begin();if(newCurrent())displayed='new';releaseOld();await old;assert.equal(displayed,'new');
  const unmounted=requests.begin();requests.cancel();assert.equal(unmounted(),false);
});
