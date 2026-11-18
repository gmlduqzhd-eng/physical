import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {activityFit,matchesFit,parseFitPeople,parseFitSpace,parseFitTime,situationBadges,timeBucket} from '../src/domain/activityFit';
import {matchesActivitySearch,similarSuggestions} from '../src/domain/activitySearch';
import {questCueView} from '../src/domain/questCueView';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {renderHtml,textOf} from './render-for-test';

/** 활동 목록 첫 화면(주소의 조건을 읽은 상태)을 그린다. */
const library=async(query:string,solo=false)=>{
 const {createElement}=await import('react');
 const {ActivityPicker}=await import('../src/presentation/ActivityLibrary');
 return renderHtml(createElement(ActivityPicker,{solo}),'/?'+query);
};
const selected=(html:string,label:string)=>html.match(new RegExp(`aria-label="${label}">(?:(?!</select>).)*?<option selected="">([^<]*)<`))?.[1];

const read=(p:string)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('hub address values fall back to 전체 or map to a real choice',async()=>{
 assert.equal(parseFitSpace('체육관'),'체육관·강당');
 assert.equal(parseFitSpace('강당'),'체육관·강당');
 assert.equal(parseFitSpace('운동장'),'운동장');
 assert.equal(parseFitSpace('gym2'),'전체');
 assert.equal(parseFitSpace(null),'전체');
 assert.equal(parseFitPeople('모둠',['혼자']),'전체','solo pages only offer 혼자');
 assert.equal(parseFitPeople('반전체'),'반 전체');
 assert.equal(parseFitTime('10'),'6~10분');
 assert.equal(parseFitTime('6~10분'),'6~10분');
 assert.equal(parseFitTime('soon'),'전체');
 const unknown=await library('purpose=gym-day');
 assert.doesNotMatch(unknown,/aria-label="활동 목적">(?:(?!<\/div>).)*aria-pressed="true"/,'unknown purposes are ignored');
 assert.doesNotMatch(unknown,/검색·조건 초기화/,'an unknown purpose is not an active filter');
 assert.equal(selected(await library('purpose='+encodeURIComponent('교실에서 해요')),'어디서'),'교실','the retired 교실 chip maps to where=교실');
 assert.equal(selected(await library('where='+encodeURIComponent('체육관')),'어디서'),'체육관·강당');
});

test('searching "10분" gives the same activities as the 6~10분 filter',()=>{
 const bySearch=AVAILABLE_GAMES.filter(g=>matchesActivitySearch(g,'10분')).map(g=>g.type);
 const byFilter=AVAILABLE_GAMES.filter(g=>matchesFit(g,{time:'6~10분'})).map(g=>g.type);
 assert.ok(byFilter.length>0);
 assert.deepEqual(bySearch,byFilter);
 assert.ok(AVAILABLE_GAMES.filter(g=>matchesActivitySearch(g,'5분')).every(g=>timeBucket(activityFit(g).minutes)==='5분 이하'));
});

test('an empty search suggests similar activities or sports',()=>{
 assert.equal(AVAILABLE_GAMES.filter(g=>matchesActivitySearch(g,'피구')).length,0);
 const dodge=similarSuggestions('피구',AVAILABLE_GAMES);
 assert.ok(dodge.games.length>0,'throwing or rolling activities');
 assert.match(dodge.reason,/피구는 없지만/);
 const run=similarSuggestions('육상',AVAILABLE_GAMES);
 assert.ok(run.sports.some(s=>s.id==='relay'));
 assert.ok(similarSuggestions('쿼디치',AVAILABLE_GAMES).reason.length>0,'always a hint');
});

test('the place badge follows the chosen place',async()=>{
 const multi=AVAILABLE_GAMES.find(g=>activityFit(g).spaces.length>1&&activityFit(g).spaces[0]==='교실'&&activityFit(g).spaces.includes('운동장'))!;
 assert.ok(multi);
 const badge=situationBadges(multi,{space:'운동장'})[0];
 assert.match(badge,/운동장/);
 assert.doesNotMatch(badge,/교실|부터/);
 assert.doesNotMatch(situationBadges(multi)[0],/부터/);
 // 반 전체 활동 카드는 '폰 1대면 된다'가 아니라 TV·전자칠판에 띄우라고 안내한다.
 const whole=AVAILABLE_GAMES.find(g=>activityFit(g).wholeClass&&g.recommendedDevice)!;
 assert.ok(whole,'a whole-class activity with a device');
 const card=textOf(await library('view=all&q='+encodeURIComponent(whole.name)));
 assert.match(card,/화면: TV·전자칠판 1대에 띄워 반 전체가 봐요/,'whole-class cards do not say a phone is enough');
 // 준비물 없는 놀이 모드는 위의 '몇 명 · 몇 분'을 다시 묻지 않는다.
 const phone=await library('collection=phone');
 const grid=phone.slice(phone.indexOf('phone-filter-grid'),phone.indexOf('</fieldset>',phone.indexOf('phone-filter-grid')));
 assert.ok(grid.length>0,'phone filters are shown');
 assert.doesNotMatch(grid,/참여 인원|몇 명/,'phone mode does not repeat the people filter');
 assert.doesNotMatch(grid,/소요 시간|몇 분/,'phone mode does not repeat the time filter');
});

test('expression: no result without every rating, and quick skips are not counted as performed',()=>{
 // 평가 점수를 모두 눌러야 결과 버튼이 열리는 흐름은 클릭이 필요해 첫 화면 그리기로 볼 수 없다(Node에 DOM 없음). 소스로 확인한다.
 const src=read('src/presentation/components/minigames/common/ExpressionActivityLayout.tsx');
 assert.match(src,/ratings\.length===assessment\.length&&ratings\.every\(rating=>rating>=1\)/);
 assert.match(src,/disabled=\{!ratingsReady\}/);
 assert.match(src,/MIN_STEP_SECONDS=5/);
 assert.match(src,/\(spent\[i\]\?\?0\)>=MIN_STEP_SECONDS/);
 assert.match(src,/useState<number\[\]>\(\(\)=>expressionAssessment\(/,'ratings start as zeros, one per criterion');
});

test('story relay uses the story the group chose',()=>{
 const story=EXPRESSION_GAMES.find(g=>g.id==='story_drama_relay')!;
 const text=JSON.stringify(story.steps);
 assert.doesNotMatch(text,/즐거운 하루 시작/);
 assert.match(text,/우리 (모둠이 정한 )?이야기/);
});

test('movement quests: start is on top, the player count refreshes the default, the traffic light does not repeat itself',()=>{
 // 작전 고르기 화면과 인원 바꾸기는 버튼을 눌러야 나오고, 순서(order)는 CSS라 Node에서 그릴 수 없어 소스로 확인한다.
 const src=read('src/presentation/components/minigames/common/MovementQuest.tsx');
 const plan=src.slice(src.indexOf("{phase === 'plan' && <>"));
 assert.ok(plan.indexOf('mq-start-row')<plan.indexOf('<ActivityDemo'),'start row before the demo');
 assert.match(src,/players: Number\(e\.target\.value\) \};setSettings\(next\);setChoice\(defaultChoice\(round,next\)\)/);
 assert.match(read('src/presentation/components/minigames/common/MovementQuest.css'),/movement-quest\[data-phase=plan\]\) > \.consolidated-course-bar\{order:2\}/);
 for(const cue of ['초록 ● · 걷기','빨강 ■ · 멈추기'])assert.equal(questCueView('red_green',cue).badge,undefined);
});

test('safety choices stay in place and are big on a TV',()=>{
 // 다시 풀 때 보기 순서를 그대로 두는 인자와 TV 글자 크기(CSS)는 화면 밖 설정이라 소스로 확인한다.
 assert.match(read('src/presentation/components/minigames/common/SafetyLesson.tsx'),/safetyChoiceOrder\(current\.choices,choiceSeed,index,false\)/);
 assert.match(read('src/presentation/components/minigames/common/SafetyLesson.css'),/\.safety-lesson \.mq-choices button\{font-size:clamp\(20px,2\.4vw,28px\)/);
});
