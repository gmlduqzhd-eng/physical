import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {ALL_STANDARDS} from '../src/data/curriculumStandards';
import {teacherGuide} from '../src/domain/teacherGuide';

const known=new Set(ALL_STANDARDS.map(s=>s.code));

test('every live activity has a teacher guide with real standards, three questions and an honest source label',()=>{
 for(const g of AVAILABLE_GAMES){
  const guide=teacherGuide(g);
  assert.equal(guide.questions.length,3,g.type);
  for(const s of guide.standards){
   assert(s.standards.length>=1,g.type);
   for(const st of s.standards){assert(known.has(st.code),`${g.type} ${st.code}`);assert.equal(st.gradeGroup,s.grade,g.type);assert.equal(st.domain,g.domain,g.type);}
   if(s.source==='data')assert.equal(s.standards[0].code,g.achievement.code,g.type);
  }
  assert.equal(guide.standards.length,(['3~4학년군','5~6학년군'] as const).filter(x=>g.grades.includes(x)).length,g.type);
  if(g.grades.includes('1~2학년'))assert(guide.lowGradeTheme,g.type);else assert.equal(guide.lowGradeTheme,null,g.type);
 }
});

test('codes written in the activity data are kept, and missing ones are marked as suggestions',()=>{
 const strategy=teacherGuide(AVAILABLE_GAMES.find(g=>g.type==='space-occupier')!);
 assert.equal(strategy.standards.find(s=>s.grade==='3~4학년군')?.source,'data');
 assert(strategy.standards.find(s=>s.grade==='5~6학년군')!.standards.every(s=>s.subArea.includes('전략형')));
 const fox=teacherGuide(AVAILABLE_GAMES.find(g=>g.type==='phone-play-102')!);
 assert(fox.standards.every(s=>s.source==='suggested'));assert.match(fox.questions[0],/밥 먹을 시간/);
});

test('the activity library shows the guide to teachers only',()=>{
 assert.match(readFileSync(new URL('../src/presentation/ActivityLibrary.tsx',import.meta.url),'utf8'),/\{!solo&&<TeacherGuidePanel game=\{g\}\/>\}/);
});

test('fallback standards fit the activity, and nothing contradicts the suggestions',()=>{
 const pick=(id:string)=>teacherGuide(AVAILABLE_GAMES.find(g=>g.type===id)!);
 for(const id of ['phone-play-102','phone-play-103'])assert(!pick(id).standards.some(s=>s.standards.some(x=>x.subArea.includes('측정'))),id);
 assert(!pick('partner-robot-lab').standards.some(s=>s.standards.some(x=>x.subArea.includes('전통'))));
 assert.match(pick('partner-robot-lab').questions[0],/블록/);
 for(const g of AVAILABLE_GAMES)assert.doesNotMatch(g.achievement.desc,/임의로 부여하지/,g.type);
 assert.equal(teacherGuide(AVAILABLE_GAMES[0]),teacherGuide(AVAILABLE_GAMES[0]),'guides are cached per activity');
});

test('the sports scoreboard asks before clearing and records the start without an undo entry',()=>{
 const source=readFileSync(new URL('../src/presentation/SportsClassroom.tsx',import.meta.url),'utf8');
 assert.match(source,/setConfirmClear\(\{\}\)/);assert.match(source,/이번 경기 기록과 되돌리기 목록을 모두 지울까요/);
 assert.match(source,/const kind=scoreChange\(scores,next\);if\(kind==='same'\)return;if\(kind==='change'\)setUndoStack/);
});
