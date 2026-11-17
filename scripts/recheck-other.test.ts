import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {activityFit,matchesFit,parseFitPeople,parseFitSpace,parseFitTime,situationBadges,timeBucket} from '../src/domain/activityFit';
import {matchesActivitySearch,similarSuggestions} from '../src/domain/activitySearch';
import {questCueView} from '../src/domain/questCueView';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';

const read=(p:string)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('hub address values fall back to 전체 or map to a real choice',()=>{
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
 const page=read('src/presentation/ActivityLibrary.tsx');
 assert.match(page,/purposes as readonly string\[\]\)\.includes\(raw\)/,'unknown purposes are ignored');
 assert.match(page,/교실에서 해요/,'the retired 교실 chip maps to where=교실');
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

test('the place badge follows the chosen place',()=>{
 const multi=AVAILABLE_GAMES.find(g=>activityFit(g).spaces.length>1&&activityFit(g).spaces[0]==='교실'&&activityFit(g).spaces.includes('운동장'))!;
 assert.ok(multi);
 const badge=situationBadges(multi,{space:'운동장'})[0];
 assert.match(badge,/운동장/);
 assert.doesNotMatch(badge,/교실|부터/);
 assert.doesNotMatch(situationBadges(multi)[0],/부터/);
 const page=read('src/presentation/ActivityLibrary.tsx');
 assert.match(page,/wholeClass\?'화면: TV·전자칠판 1대에 띄워/,'whole-class cards do not say a phone is enough');
 assert.doesNotMatch(page,/\['people','참여 인원'/,'phone mode does not repeat the people filter');
 assert.doesNotMatch(page,/\['time','소요 시간'/,'phone mode does not repeat the time filter');
});

test('expression: no result without every rating, and quick skips are not counted as performed',()=>{
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
 const src=read('src/presentation/components/minigames/common/MovementQuest.tsx');
 const plan=src.slice(src.indexOf("{phase === 'plan' && <>"));
 assert.ok(plan.indexOf('mq-start-row')<plan.indexOf('<ActivityDemo'),'start row before the demo');
 assert.match(src,/players: Number\(e\.target\.value\) \};setSettings\(next\);setChoice\(defaultChoice\(round,next\)\)/);
 assert.match(read('src/presentation/components/minigames/common/MovementQuest.css'),/movement-quest\[data-phase=plan\]\) > \.consolidated-course-bar\{order:2\}/);
 for(const cue of ['초록 ● · 걷기','빨강 ■ · 멈추기'])assert.equal(questCueView('red_green',cue).badge,undefined);
});

test('safety choices stay in place and are big on a TV',()=>{
 assert.match(read('src/presentation/components/minigames/common/SafetyLesson.tsx'),/safetyChoiceOrder\(current\.choices,choiceSeed,index,false\)/);
 assert.match(read('src/presentation/components/minigames/common/SafetyLesson.css'),/\.safety-lesson \.mq-choices button\{font-size:clamp\(20px,2\.4vw,28px\)/);
});
