import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {FIT_PEOPLE,FIT_SPACES,FIT_TIMES,activityFit,lessonMeta,matchesFit,situationBadges,timeBucket} from '../src/domain/activityFit';
import {finishLine} from '../src/presentation/activityDetail';
import {ACTIVITY_GROUPS,activityGroup,activityIcon} from '../src/domain/activityGroups';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {gradeLabel,placeLabel} from '../src/domain/glossary';
import {PHONE_PLAY_BY_ID} from '../src/domain/phonePlayCatalog';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {generateLessonPlan,lessonFitWarning,supportsGroups} from '../src/domain/lessonPlan';
import {SPORT_BY_ID,SPORT_GROUPS} from '../src/domain/sportsClassroom';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const MODE:Record<string,string[]>={개인:['개인'],짝:['짝'],모둠:['모둠','팀 대항','학급 전체']};

test('card players, lesson activity modes and equipment agree for every live activity',()=>{
 for(const g of AVAILABLE_GAMES){
  const lesson=lessonMeta(g.type);
  assert(lesson,`${g.type} has lesson data`);
  if(g.activityType)assert(lesson.activityModes.some(m=>MODE[g.activityType!].includes(m)),`${g.type}: card says ${g.activityType}, lesson says ${lesson.activityModes}`);
  // 짝 활동에 '모둠당' 준비물이 붙으면 카드와 준비물이 서로 다른 인원을 말한다.
  if(g.activityType==='짝')assert(!(g.equipment??[]).some(e=>e.includes('모둠당')),`${g.type}: pair activity with per-group equipment`);
 }
 for(const [id,type] of [['space-occupier','모둠'],['relay-mission-runner','모둠'],['pass-gate-rescue','모둠'],['exp-phone-50','짝']] as const)assert.equal(AVAILABLE_GAMES.find(g=>g.type===id)?.activityType,type,id);
});

test('every live activity can be found by where, how many and how long',()=>{
 for(const g of AVAILABLE_GAMES){
  const fit=activityFit(g);
  assert(fit.spaces.length&&fit.spaces.every(s=>(FIT_SPACES as readonly string[]).includes(s)),g.type);
  assert(fit.people.length&&fit.people.every(p=>(FIT_PEOPLE as readonly string[]).includes(p)),g.type);
  assert(fit.minutes>0,g.type);
  assert.equal(situationBadges(g).length,3,g.type);
  assert(finishLine(g).endsWith('끝나요.')||finishLine(g).includes('끝나요.'),g.type);
 }
 // 준비물 없는 놀이는 TV 한 대로 반 전체가 할 수 있다.
 for(const g of AVAILABLE_GAMES.filter(g=>PHONE_PLAY_BY_ID.has(g.type)))assert(activityFit(g).people.includes('반 전체'),g.type);
 // 조건은 서로 겹쳐도 언제나 맞는 활동만 남긴다.
 for(const space of FIT_SPACES)for(const people of FIT_PEOPLE)for(const time of FIT_TIMES){
  const hits=AVAILABLE_GAMES.filter(g=>matchesFit(g,{space,people,time}));
  for(const g of hits){const f=activityFit(g);assert(f.spaces.includes(space)&&f.people.includes(people)&&timeBucket(f.minutes)===time,g.type);}
 }
 assert(AVAILABLE_GAMES.filter(g=>matchesFit(g,{space:'운동장',people:'반 전체',time:'5분 이하'})).length>=10,'a field lesson for the whole class finds activities');
 assert(AVAILABLE_GAMES.filter(g=>matchesFit(g,{space:'교실',people:'모둠'})).length>=10,'a classroom group lesson finds activities');
 assert.equal(AVAILABLE_GAMES.filter(g=>matchesFit(g,{})).length,AVAILABLE_GAMES.length,'no filter keeps everything');
});

test('search also matches places, sport types, groups and gear, and agrees with the place filter',()=>{
 const field=AVAILABLE_GAMES.filter(g=>matchesActivitySearch(g,'운동장')).map(g=>g.type).sort();
 assert.deepEqual(field,AVAILABLE_GAMES.filter(g=>matchesFit(g,{space:'운동장'})).map(g=>g.type).sort());
 for(const word of ['체육관','강당','전략형','콩주머니','반 전체','공·도구 기술'])assert(AVAILABLE_GAMES.some(g=>matchesActivitySearch(g,word)),word);
 assert(matchesActivitySearch(AVAILABLE_GAMES.find(g=>g.type==='space-occupier')!,'빈 공간 점령'),'old names still work');
});

test('about ten display groups replace the long subcategory list, and no card repeats the compass icon',()=>{
 assert(ACTIVITY_GROUPS.length<=11);
 const used=new Set(AVAILABLE_GAMES.map(g=>activityGroup(g).id));
 assert(used.size>=8,'groups are actually used');
 for(const g of AVAILABLE_GAMES)assert.notEqual(activityIcon(g),'🧭',g.type);
 assert.equal(activityGroup(AVAILABLE_GAMES.find(g=>g.type==='cpr-compression-110')!).id,'safety');
 assert.equal(activityGroup(AVAILABLE_GAMES.find(g=>g.type==='exp-phone-31')!).id,'ball');
});

test('one glossary for grades and places',()=>{
 assert.equal(gradeLabel('1~2학년'),'1~2학년군');assert.equal(gradeLabel('3~4학년군'),'3~4학년군');
 assert.equal(placeLabel('다목적실'),'체육관·강당');assert.equal(placeLabel('체육관'),'체육관·강당');assert.equal(placeLabel('좁은 실내 공간'),'교실');
});

test('the activity library puts the fit filter first, a one-line header and the fixed detail order',()=>{
 const src=read('src/presentation/ActivityLibrary.tsx');
 assert.match(src,/<legend>어디서 · 몇 명 · 몇 분<\/legend>/);
 assert(src.indexOf('className="activity-fit"')<src.indexOf('className="chips"'),'the fit filter comes before the purpose chips');
 assert.doesNotMatch(src,/<strong>활동 방법<\/strong>/,'the card description is not repeated in the details');
 assert.doesNotMatch(src,/완료 기준/);
 const order=['<h4>규칙</h4>','<h4>준비</h4>','<h4>안전</h4>','<h4>쉽게 · 어렵게 · 앉아서</h4>'].map(h=>src.indexOf(h));
 assert(order.every((v,i)=>v>0&&(i===0||v>order[i-1])),'rules → prepare → safety → adapt');
 assert.doesNotMatch(src,/ForestOrbit/,'the big hero art is gone from the list page');
 assert.match(src,/className="primary" to="\/teacher">수업 준비 시작/,'the primary button is lesson preparation, not records');
});

test('seated alternatives leave the safety list and rules leave the tips',async()=>{
 const {activityDetail}=await import('../src/presentation/activityDetail');
 const {teacherGuide}=await import('../src/domain/teacherGuide');
 for(const g of AVAILABLE_GAMES){
  const d=activityDetail(g),phone=PHONE_PLAY_BY_ID.get(g.type);
  assert(d.rules.length>=1&&d.rules.length<=3,g.type);
  const seated=d.adapt.find(a=>a.label==='앉아서')?.text;
  if(seated)assert(!d.safety.includes(seated),`${g.type}: seated alternative is in the safety list`);
  if(phone){assert.deepEqual(d.adapt.map(a=>a.label),['쉽게','어렵게','앉아서'],g.type);for(const r of phone.rules)assert(!teacherGuide(g).tips.includes(r),`${g.type}: rule repeated as a tip`);}
 }
 assert.match(read('src/presentation/components/TeacherGuidePanel.tsx'),/<summary>추천 성취기준 보기 · 수업 전 원문 확인<\/summary>/);
});

test('/hub/tools keeps favorites, roulette and records but no second full catalog',()=>{
 const src=read('src/presentation/GameHub.tsx');
 assert.doesNotMatch(src,/게임 목록 페이지/,'no paginated duplicate catalog');
 assert.doesNotMatch(src,/id="game-search"/);
 assert.match(src,/⭐ 즐겨찾기·뽑기/);assert.match(src,/워밍업 룰렛/);assert.match(src,/RecentGameRecords/);
 assert.match(read('src/presentation/ActivityLibrary.tsx'),/to="\/hub\/tools">기록·즐겨찾기/);
});

test('the lesson plan does not put a solo-only activity into a group lesson and drops the placeholder place',()=>{
 const solo=LESSON_GAME_CATALOG.find(g=>!supportsGroups(g))!;
 assert(solo,'there is a solo-only activity to test with');
 for(const grade of ['3~4학년군','5~6학년군'] as const){
  const plan=generateLessonPlan(grade,40,'자동','','자동 추천',24,'자동','모둠별 1대',[],null,'auto');
  assert(plan.recommendedGame&&supportsGroups(plan.recommendedGame.game),'auto pick for group devices can be done in groups');
  assert(plan.recommendedGame.game.activityModes.includes(plan.overview.activityMode as never),'the lesson mode is one the activity supports');
  assert.doesNotMatch(JSON.stringify(plan),/교사가 확인한 활동 장소/);
 }
 const manual=generateLessonPlan('3~4학년군',40,'운동','','자동 추천',24,'자동','모둠별 1대',[],solo,'manual');
 assert.equal(manual.teacherTips[0].problem,'활동과 수업 형태가 맞지 않아요');
 assert.match(lessonFitWarning(solo,'모둠','교사용 1대')!,/활동이에요/);
 assert.equal(lessonFitWarning({...solo,activityModes:['모둠']},'모둠','모둠별 1대'),null);
});

test('soccer counts knocked-down bottles in the target group, and the team count lives in the match stage',()=>{
 const soccer=SPORT_BY_ID.get('soccer')!;
 assert.equal(soccer.btnLabel,'쓰러진 병');assert.equal(SPORT_GROUPS[soccer.group],'표적·타겟형');
 const src=read('src/presentation/SportsClassroom.tsx');
 assert(src.indexOf('aria-label="팀 수"')>src.indexOf("{id==='match'&&"),'team count select is in the match stage');
 assert.match(src,/className="sports-progress"/);
});

test('bingo starts with one button and the settings collapsed',()=>{
 const src=read('src/presentation/components/PeQuizBingo.tsx');
 assert(src.indexOf('🚩 바로 시작')<src.indexOf('<details className="qb-settings">'),'quick start comes before the settings');
 assert.match(src,/문제를 맞히면 칸을 차지해요\. 한 줄을 채우면 빙고!/);
 assert.doesNotMatch(read('src/domain/classTools.ts'),/땅따먹기/);
});

test('every game renamed in the clarity pass is still found by its previous name',async()=>{
 const {PREVIOUS_GAME_NAMES}=await import('../src/domain/previousGameNames');
 const {matchesActivitySearch}=await import('../src/domain/activitySearch');
 const {GAMES}=await import('../src/domain/gamesData');
 for(const [id,old] of Object.entries(PREVIOUS_GAME_NAMES)){const g=GAMES.find(x=>x.type===id);assert.ok(g,id);assert.ok(matchesActivitySearch(g!,old),`${id} ${old}`);}
});
