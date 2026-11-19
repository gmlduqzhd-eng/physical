import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {generateLessonPlan,lessonFitWarning,teacherScreenOnly} from '../src/domain/lessonPlan';
import {READY_SIGNATURE_IDS,isSignatureId} from '../src/domain/signatureGames';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';

const read=(path:string)=>readFileSync(path,'utf8');

test('TV-only signature games are never auto-picked for student-device lessons, and a manual pick is warned',()=>{
 assert.ok(READY_SIGNATURE_IDS.length>0);
 for(const id of READY_SIGNATURE_IDS)assert.ok(teacherScreenOnly({id}),id);
 for(const device of ['모둠별 1대','학생 1인 1기기'] as const)for(const grade of ['1~2학년 · 즐거운 생활 연계','3~4학년군','5~6학년군'] as const)for(const domain of ['자동','운동','스포츠','표현'] as const){
  const plan=generateLessonPlan(grade,40,domain,'','자동 추천',24,'자동',device,[],null,'auto');
  assert.ok(plan.recommendedGame,`${grade} ${domain} ${device}`);
  assert.ok(!isSignatureId(plan.recommendedGame!.game.id),`${grade} ${domain} ${device} picked ${plan.recommendedGame!.game.id}`);
 }
 const sig=LESSON_GAME_CATALOG.find(g=>isSignatureId(g.id))!;
 assert.match(lessonFitWarning(sig,'자동 추천','모둠별 1대')!,/TV\(교사 화면 1대\)/);
 assert.match(lessonFitWarning(sig,'자동 추천','학생 1인 1기기')!,/교사용 1대/);
 assert.equal(lessonFitWarning(sig,'자동 추천','교사용 1대'),null);
});

test('student-device classroom pickers and the setup link leave out signature games',()=>{
 assert.match(read('src/presentation/GuidedClassroom.tsx'),/<ActivityPicker exclude=\{g=>isSignatureId\(g\.type\)\}/);
 assert.match(read('src/presentation/GuidedClassroom.tsx'),/const requestedGame=tvOnlyAsked\?undefined:/);
 assert.match(read('src/presentation/GuidedClassroomControl.tsx'),/exclude=\{game => isFlagship\(game\.type\) \|\| isSignatureId\(game\.type\)\}/);
 const lib=read('src/presentation/ActivityLibrary.tsx');
 assert.match(lib,/!solo&&!isSignatureId\(g\.type\)&&<Link[^>]*to=\{`\/teacher\/setup\?game=/);
});

test('solo mode does not link to team TV games, and every hub count matches the cards shown',async()=>{
 const lib=read('src/presentation/ActivityLibrary.tsx');
 assert.match(lib,/merged=solo\?undefined:mergedInto\(g\.type\)/);
 // 비슷한 활동을 몰래 묶지 않는다: 목록 수 = 카드 수, '보관함에 N개 더' = 보관함 보기에서 더 나오는 카드 수.
 assert.doesNotMatch(lib,/SIMILAR_TO|hiddenSimilar|합치면 모두/);
 assert.match(lib,/!isFeatured\(g\.type\)&&fits\(g\)\)\.length/);
 assert.match(lib,/const games = matched;/);
 // 한 번에 보여 주는 수는 어느 보기에서나 같다.
 assert.match(lib,/const PAGE=12;/);
 assert.doesNotMatch(lib,/setLimit\((6|12|24|on\?24:12)\)/);
 assert.match(lib,/const displayed = games\.slice\(0, limit\);/);
 // 보관함 보기의 머리말·제목·버튼이 같은 수를 말한다.
 const {libraryLead,FEATURED_GAMES}=await import('../src/domain/featuredGames');
 const total=AVAILABLE_GAMES.length,featured=FEATURED_GAMES.length;
 assert.match(libraryLead(false,false,10),new RegExp(`추천 활동 ${featured}개를 보여 줘요. 나머지 ${total-featured}개는 보관함`));
 const all=libraryLead(false,true,10);
 assert.match(all,new RegExp(`모든 활동 ${total}개를 보여 줘요`));
 assert.doesNotMatch(all,/추천 활동 \d+개를 보여 줘요/);
 assert.match(lib,/`보관함까지 모든 활동 \$\{matched\.length\}개`/);
 assert.match(lib,/보관함까지 모두 보기 \(\$\{exclude \? GAMES\.filter\(g => !exclude\(g\)\)\.length : GAMES\.length\}개\)/);
 assert.equal(libraryLead(true,true,7),'학생 정보 입력 없이, 혼자 할 수 있는 7개 활동이에요.');
});

test('class-progress suggestions explain their rules and need more than one reaction',async()=>{
 const {SUGGESTION_RULES,MIN_PLAYS_FOR_SUGGESTION,MIN_DOWN_FOR_ARCHIVE}=await import('../src/domain/classProgress');
 assert.ok(MIN_PLAYS_FOR_SUGGESTION>=5&&MIN_DOWN_FOR_ARCHIVE>=2);
 assert.match(SUGGESTION_RULES.archive,/5판 이상.*👎가 2번 이상/);
 const page=read('src/presentation/ClassProgressPage.tsx');
 assert.match(page,/data-rules><summary>후보는 이렇게 골라요<\/summary>/);
 assert.match(page,/\{SUGGESTION_RULES\.archive\}/);
 const css=read('src/presentation/ClassProgressPage.css');
 assert.match(css,/\.cp-table thead th\{text-align:right/);
 assert.match(css,/\.cp-table thead th:first-child,\.cp-table tbody th\{text-align:left\}/);
});

test('after a failed save, new class progress is kept in memory instead of being overwritten by a stale read',async()=>{
 const store=new Map<string,string>();let failWrites=false;
 const listeners=new Map<string,Set<()=>void>>();
 (globalThis as {window?:unknown}).window={
  localStorage:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{if(failWrites)throw new Error('QuotaExceededError');store.set(k,v);},removeItem:(k:string)=>store.delete(k)},
  addEventListener:(t:string,f:()=>void)=>{if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t)!.add(f);},
  removeEventListener:(t:string,f:()=>void)=>listeners.get(t)?.delete(f),
  dispatchEvent:()=>true,
 };
 const s=await import('../src/application/classProgressStore');
 s.clearProgress();
 s.recordPlay('sig-boss-raid',1_000);
 assert.equal(s.readProgress().plays.length,1);
 assert.equal(s.progressSaveFailed(),false);
 failWrites=true;
 s.recordPlay('sig-move-bingo',2_000);
 s.recordPlay('sig-stage-show',3_000);
 assert.equal(s.progressSaveFailed(),true);
 // 저장소에는 예전 값(1판)만 있지만, 화면은 새 기록(3판)을 그대로 쓴다.
 assert.equal(JSON.parse(store.get(s.CLASS_PROGRESS_KEY)!).plays.length,1);
 assert.equal(s.readProgress().plays.length,3);
 failWrites=false;
 s.recordPlay('sig-mirror-pair',4_000);
 assert.equal(s.progressSaveFailed(),false);
 assert.equal(JSON.parse(store.get(s.CLASS_PROGRESS_KEY)!).plays.length,4);
 assert.match(read('src/presentation/ClassProgressPage.tsx'),/progressSaveFailed\(\)&&<p className="cp-save-warning" role="alert"/);
});
