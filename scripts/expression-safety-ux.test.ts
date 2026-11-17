import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {BANNED_EXPRESSION_WORDS,EXPRESSION_KID_TEXT,stepCue} from '../src/presentation/components/minigames/expression/expressionKidText';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {SAFETY_LESSON_IDS,SAFETY_LESSONS} from '../src/domain/safetyLessons';

const live=new Set(AVAILABLE_GAMES.map(g=>g.type));
const expression=EXPRESSION_GAMES.filter(g=>live.has(g.id)&&!g.id.startsWith('exp-'));
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all 22 offered expression activities have kid-language text and 3-line rules',()=>{
 assert.equal(expression.length,22);
 for(const g of expression){
  assert(EXPRESSION_KID_TEXT[g.id],`${g.id} has kid text`);
  assert.equal(g.rules3?.length,3,`${g.id}: three rule lines`);
  assert(g.rules3!.every(line=>line.trim().length>4),`${g.id}: rule lines are filled in`);
  for(const s of g.steps){assert(s.cue,`${g.id} step ${s.stepNum} has a short cue`);assert(stepCue(s).length<=40,`${g.id} step ${s.stepNum}: the cue is short enough to read from afar`);}
 }
});

test('no banned hard words in what children read',()=>{
 for(const g of expression){
  const text=[g.name,g.desc,...g.rules3!,...g.steps.flatMap(s=>[s.title,s.cue??'',s.guide,s.actionTip]),...g.rubric.flatMap(r=>[r.criterion,r.desc])].join(' ');
  for(const word of BANNED_EXPRESSION_WORDS)assert(!text.includes(word),`${g.id} still says ${word}`);
  assert.doesNotMatch(text,/합니다|입니다|습니다/,`${g.id}: written in the ~해요 form`);
 }
 const layout=read('src/presentation/components/minigames/common/ExpressionActivityLayout.tsx');
 for(const word of ['루브릭','성찰 및','과정 중심 평가'])assert(!layout.includes(word),`layout says ${word}`);
});

test('reported mismatches are fixed: steps, names and planning time',()=>{
 const by=(id:string)=>expression.find(g=>g.id===id)!;
 assert.doesNotMatch(by('magic_scarf').desc,/날리|직선/,'the scarf is held, not thrown');
 assert.doesNotMatch(by('sound_painter').desc,/실로폰/,'only the sounds the app plays');
 assert.doesNotMatch(by('shadow_puppeteer').desc+by('shadow_puppeteer').steps.map(s=>s.guide).join(' '),/\bA\b|\bB\b/,'roles are named, not A/B');
 assert(!(by('musical_freeze').name.includes('뮤지컬')&&by('musical_scene_maker').name.includes('뮤지컬')),'the two musical activities have different names');
 const story=by('story_drama_relay');assert.match(story.steps[0].title,/이야기 정하기/);assert.equal(story.steps[0].durationSeconds,60);assert.equal(story.steps.length,5);
 assert.equal(by('art_gallery_critic').repeatPerGroup,true);
 const flash=by('flashmob_creator');assert(flash.joinChart);for(const s of flash.steps)assert.doesNotMatch(s.title,/^\d단계/,'no duplicate step numbers');
 for(const id of ['cheerleading_team','taebo_fitness','talchum_korea','ganggangsullae','world_folk_dance','kpop_easy_challenge'])assert(by(id).poses,`${id} has picture cards`);
 assert.doesNotMatch(by('music_jumprope').videoInfo!.title,/^\[초등/,'the video title says to follow without a rope');
});

test('class layout: countdown always, compact cue first, participation checked at the end only',()=>{
 const layout=read('src/presentation/components/minigames/common/ExpressionActivityLayout.tsx');
 assert.match(layout,/useState<'countdown' \| 'active' \| 'rubric' \| 'result'>\('countdown'\)/,'the 3s countdown runs even after the prepare screen');
 assert.match(layout,/\[compact,setCompact\]=useState\(true\)/,'the short card is the default');
 assert.match(layout,/useState<number\[\]>\(allSteps\)/,'all steps count as performed until a teacher unchecks one');
 assert.match(layout,/const \[useVideo,setUseVideo\]=useState\(!!game\.videoInfo&&game\.id==='kpop_easy_challenge'\)/,'the K-POP video is on by default');
 const active=layout.slice(layout.indexOf("{phase === 'active' && ("),layout.indexOf('{/* 설정 서랍'));
 assert(!active.includes('type="checkbox"'),'no participation checkbox during play');
 assert(active.indexOf('expression-cue')<active.indexOf('YouTubeExpressionPlayer'),'the cue comes before the video');
 assert(!layout.includes("'도전 기록'"));
 const css=read('src/presentation/components/minigames/common/ExpressionActivity.css');
 assert.match(css,/\.expression-cue\{[^}]*font-size:clamp\(26px,3\.6vw,46px\)/,'the cue reaches 46px on a classroom TV');
 assert.match(read('src/presentation/components/minigames/expression/ExpressionSoundPlayer.tsx'),/expression-freeze-overlay/,'the freeze game shows a full-screen sign');
});

test('safety lessons: 3-line rules first and at most 2 taps per situation',()=>{
 for(const id of SAFETY_LESSON_IDS){assert.equal(SAFETY_LESSONS[id].rules3.length,3,id);}
 assert.equal(SAFETY_LESSONS['heatwave-pm25-shield'].name,'더위·미세먼지 안전 판단');
 assert.equal(SAFETY_LESSONS['water-rescue-throw'].name,'물 밖에서 돕기');
 assert(SAFETY_LESSONS['aed-defibrillator-pad'].scenarios.every(s=>s.picture),'every AED card has a picture');
 assert.equal(SAFETY_LESSONS['rice-treatment-firstaid'].scenarios[1].picture,'coldpack');
 const src=read('src/presentation/components/minigames/common/SafetyLesson.tsx');
 assert(!src.includes('type="checkbox"'),'no confirmation checkboxes');
 // tap 1: the safe choice opens the explanation; tap 2: one of the finish buttons moves on.
 assert.match(src,/if\(c\.id===current\.answer\)setPhase\('explain'\)/);
 const explain=src.slice(src.indexOf("{phase==='explain'&&<>"),src.indexOf("{phase==='summary'"));
 assert.match(explain,/finish\('roleplay'\)/);assert.match(explain,/finish\('read'\)/);
 assert.doesNotMatch(explain,/disabled=/,'the finish buttons are never locked');
 const intro=src.slice(src.indexOf("{phase==='intro'&&<>"),src.indexOf("{phase!=='intro'&&phase!=='explain'&&<ActivityProgress"));
 assert(intro.indexOf('safety-start')<intro.indexOf('<details'),'the start button comes before the collapsed material');
});
