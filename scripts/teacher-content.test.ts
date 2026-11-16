import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES,GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {ALL_STANDARDS} from '../src/data/curriculumStandards';
import {generateLessonPlan,pickStandards} from '../src/domain/lessonPlan';
import {findStandards} from '../src/data/curriculumStandards';
import {isBlockedTelemetry} from '../src/application/blockVisionTelemetry';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const plan=(grade:string,domain:string,minutes=40,game:typeof LESSON_GAME_CATALOG[number]|null=null)=>generateLessonPlan(grade as never,minutes,domain as never,'','자동 추천' as never,24,'체육관' as never,'모둠별 1대' as never,[],game,(game?'manual':'auto') as never);

test('the manual no longer shows retired activities or advice that contradicts the safety rules',()=>{
 const manual=read('src/presentation/Manual.tsx');
 assert.doesNotMatch(manual,/심박 탐정단|점핑잭 직후|15초 맥박수|최소 2m|스트랩을 착용|팝콘 팡팡|점프왕|표현 활동 30종|2체03/);
 assert.match(manual,/CORE_ACTIVITIES/);assert.match(manual,/FLAGSHIP_SAFETY/);
});

test('every curriculum code shown exists, and grades 1-2 have no PE code',()=>{
 const known=new Set(ALL_STANDARDS.map(s=>s.code));
 for(const game of [...GAMES,...EXPRESSION_GAMES]){const code=game.achievement.code;if(code==='연계 확인 필요')continue;assert(!/\[2체/.test(code),game.type??game.id);assert(known.has(code),`${code} ${'type' in game?game.type:game.id}`);}
});

test('lesson plan standards follow the recommended activity',()=>{
 const strategy=LESSON_GAME_CATALOG.find(g=>g.id==='space-occupier')!;
 assert(pickStandards(findStandards('5~6학년군','스포츠'),strategy).every(s=>s.subArea.includes('전략형')));
 const loop=LESSON_GAME_CATALOG.find(g=>g.id==='expedition-loop')!;
 assert(pickStandards(findStandards('5~6학년군','표현'),loop).every(s=>s.subArea.includes('현대')));
});

test('the lesson plan catalog covers every live activity, including expression ones',()=>{
 assert.deepEqual(AVAILABLE_GAMES.filter(g=>!LESSON_GAME_CATALOG.some(l=>l.id===g.type)).map(g=>g.type),[]);
 assert(LESSON_GAME_CATALOG.some(g=>g.id==='talchum_korea'));
});

test('low-grade goals are full sentences and level advice uses real options',()=>{
 for(const domain of ['놀이','표현','기본 움직임','자동']){
  const goals=(plan('1~2학년 · 즐거운 생활 연계',domain) as unknown as {learningGoals:{goals:string[]}}).learningGoals.goals;
  for(const goal of goals)assert.match(goal,/있다\.$/,goal);
  assert.doesNotMatch(goals.join(' '),/표현는|하기는/);
 }
 assert.doesNotMatch(read('src/domain/lessonPlan.ts'),/배율로 시작/);
});

test('a long activity gets its real time in the plan and the total still adds up',()=>{
 for(const minutes of [40,45,80]){
  const boss=LESSON_GAME_CATALOG.find(g=>g.id==='expedition-boss')!;
  const flow=(plan('5~6학년군','자동',minutes,boss) as unknown as {lessonFlow:{stage:string;time:number;materials:string}[]}).lessonFlow;
  assert.equal(flow.reduce((n,p)=>n+p.time,0),minutes);
  assert.equal(flow.find(p=>p.stage==='전개 ②')!.time,24);
  assert.match(flow.find(p=>p.stage==='전개 ②')!.materials,/2대/);
 }
});

test('the 20-minute package uses the 12-minute map, and buttons show what is needed',()=>{
 const setup=read('src/presentation/GuidedClassroom.tsx');
 assert.match(setup,/PACKAGE_GAME=\{10:'expedition-map',20:'expedition-map',40:'expedition-boss'\}/);
 assert.match(setup,/필요: \{FLAGSHIPS/);
});

test('pose recognition does not report usage to Google, other requests pass',()=>{
 assert.equal(isBlockedTelemetry('https://odml.pa.googleapis.com/v1/log'),true);
 assert.equal(isBlockedTelemetry('/vision/pose_landmarker_lite.task'),false);
 assert.equal(isBlockedTelemetry('https://example.supabase.co/rest/v1/x'),false);
 assert.match(read('src/application/useLocalPose.ts'),/blockVisionTelemetry\(\)/);
});

test('plan generator choices announce their pressed state',()=>{
 const source=read('src/presentation/components/LessonPlanGeneratorV2.tsx');
 assert.equal((source.match(/aria-pressed=\{/g)??[]).length>=6,true);
 assert.doesNotMatch(source,/⑩/);
});

test('the Google callback finds the teacher sign-in client even when the teacher screen was never opened first',()=>{
 const source=read('src/application/teacherGoogle.ts');
 assert.match(source,/clients\[endpoint\]\?\?\(endpoint==='teacher'\?mainTeacherClient/);
 assert.match(source,/import\('\.\.\/data\/supabase'\)/);
});
