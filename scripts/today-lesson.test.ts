import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {activityFit} from '../src/domain/activityFit';
import {READY_SIGNATURE_GAMES} from '../src/domain/signatureGames';
import {
 COOLDOWN_IDS,DEFAULT_TODAY,STAGE_MINUTES,TODAY_GRADES,TODAY_MINUTES,TODAY_SPACES,WARMUP_IDS,
 advanceRun,buildTodayPlan,currentStage,mainCandidates,parseRun,stagePath,startRun,type TodaySettings,
} from '../src/domain/todayLesson';

const BY_ID=new Map(AVAILABLE_GAMES.map(g=>[g.type,g]));
const ALL:TodaySettings[]=TODAY_GRADES.flatMap(g=>TODAY_SPACES.flatMap(space=>TODAY_MINUTES.map(minutes=>({...DEFAULT_TODAY,grade:g.id,space,minutes}))));

test('준비·정리운동 후보는 모두 실제로 있는 활동이다', ()=>{
 for(const id of [...WARMUP_IDS,...COOLDOWN_IDS,'stretch'])assert.ok(BY_ID.has(id),id);
});

test('단계 시간의 합은 고른 수업 시간과 같고 순서는 준비→본게임→정리→돌아보기', ()=>{
 for(const minutes of TODAY_MINUTES){
  const m=STAGE_MINUTES[minutes];
  assert.equal(m.warmup+m.main+m.cooldown+m.reflect,minutes);
  assert.ok(m.main>=18&&m.main<=28,`본게임 ${m.main}분`);
  const plan=buildTodayPlan({...DEFAULT_TODAY,minutes},1);
  assert.deepEqual(plan.stages.map(s=>s.kind),['warmup','main','cooldown','reflect']);
  assert.equal(plan.stages.reduce((a,s)=>a+s.minutes,0),minutes);
 }
});

test('모든 학년·공간·시간 조합에서 단계가 학년과 공간에 맞는다', ()=>{
 for(const s of ALL)for(const seed of [0,1,7,12345,999999]){
  const plan=buildTodayPlan(s,seed);
  assert.equal(plan.stages.length,4,JSON.stringify(s));
  for(const st of plan.stages.filter(x=>x.kind==='warmup'||x.kind==='cooldown')){
   const g=BY_ID.get(st.gameId!);assert.ok(g,st.gameId);
   if(st.gameId==='stretch')continue;
   assert.ok(!g.grades?.length||g.grades.includes(s.grade),`${st.gameId} ${s.grade}`);
   assert.ok(activityFit(g).spaces.includes(s.space),`${st.gameId} ${s.space}`);
  }
  const main=plan.stages[1]!;
  const sig=READY_SIGNATURE_GAMES.find(g=>g.id===main.gameId);
  assert.ok(sig,`본게임은 대표 게임: ${main.gameId}`);
  assert.ok(sig.grades.includes(s.grade));
  assert.equal(plan.reflection,sig.reflection,'돌아보기 질문은 대표 게임의 질문');
  assert.equal(plan.stages[3]!.note,sig.reflection);
 }
});

test('운동장에서는 거울 짝꿍·표현 무대가 본게임 후보에 없다', ()=>{
 for(const g of TODAY_GRADES){
  const ids=mainCandidates(g.id,'운동장').map(x=>x.id);
  assert.ok(ids.length>0);
  assert.ok(!ids.includes('sig-mirror-pair')&&!ids.includes('sig-stage-show'),ids.join());
  assert.ok(mainCandidates(g.id,'교실').some(x=>x.id==='sig-mirror-pair'));
 }
});

test('같은 설정과 seed면 같은 수업, seed가 달라지면 다른 수업이 나올 수 있다', ()=>{
 for(const s of ALL)assert.deepEqual(buildTodayPlan(s,42),buildTodayPlan(s,42));
 const plans=new Set(Array.from({length:40},(_,i)=>buildTodayPlan(DEFAULT_TODAY,i).stages.map(x=>x.gameId).join('|')));
 assert.ok(plans.size>1);
});

test('맞는 본게임을 고르면 그대로, 맞지 않으면 알아서 고른다', ()=>{
 const pick=buildTodayPlan({...DEFAULT_TODAY,mainId:'sig-memory-relay'},3);
 assert.equal(pick.stages[1]!.gameId,'sig-memory-relay');
 const bad=buildTodayPlan({...DEFAULT_TODAY,space:'운동장',mainId:'sig-stage-show'},3);
 assert.notEqual(bad.stages[1]!.gameId,'sig-stage-show');
});

test('진행: 다음 단계·건너뛰기 결과와 끝 표시, 활동 주소', ()=>{
 const plan=buildTodayPlan(DEFAULT_TODAY,5);
 let run=startRun(plan,1000);
 assert.equal(currentStage(run)?.kind,'warmup');
 assert.match(stagePath(currentStage(run)!,3)!,/^\/play\/[\w-]+\?returnTo=%2Ftoday$/);
 run=advanceRun(run,'done',61000);
 assert.deepEqual(run.results,[{status:'done',seconds:60}]);
 const main=currentStage(run)!;
 assert.equal(stagePath(main,3),`/play/${main.gameId}?returnTo=%2Ftoday&teams=3`);
 run=advanceRun(run,'skipped',62000);
 run=advanceRun(run,'done',70000);
 assert.equal(run.finishedAt,undefined);
 assert.equal(stagePath(currentStage(run)!,2),undefined,'돌아보기는 이 화면에서 한다');
 run=advanceRun(run,'done',80000);
 assert.equal(run.finishedAt,80000);
 assert.equal(currentStage(run),undefined);
 assert.deepEqual(run.results.map(r=>r.status),['done','skipped','done','done']);
 assert.equal(advanceRun(run,'done',90000),run,'끝난 뒤에는 바뀌지 않는다');
 assert.deepEqual(parseRun(JSON.parse(JSON.stringify(run))),run);
});

test('저장된 값이 이상하면 이어 하지 않는다', ()=>{
 const run=startRun(buildTodayPlan(DEFAULT_TODAY,1),1);
 for(const bad of [null,1,'x',{},{...run,index:-1},{...run,index:9},{...run,results:[{status:'done',seconds:1}]},{...run,plan:{...run.plan,stages:[]}},{...run,plan:{...run.plan,stages:[{kind:'main',minutes:1,title:'x',gameId:'no-such-game'}]}}])
  assert.equal(parseRun(bad),null,JSON.stringify(bad));
 assert.ok(parseRun(run));
});

test('오늘 수업 화면 연결: 경로·홈/허브 링크·돌아오기 허용·팀 수 이어 받기', ()=>{
 const app=readFileSync('src/App.tsx','utf8');
 for(const p of ['/today','/guide','/print/signature-cards'])assert.ok(app.includes(`path="${p}"`),p);
 // round 116: 홈의 '수업 시작'은 수업 방식 고르기(또는 지난번 방식)로 가고, 거기서 오늘 수업으로 온다.
 assert.match(readFileSync('src/presentation/UnifiedHomePage.tsx','utf8'),/to=\{startTo\} data-home-start data-today-link/);
 assert.match(readFileSync('src/application/lessonStartPrefs.ts','utf8'),/tv:'\/today'/);
 assert.match(readFileSync('src/presentation/ActivityLibrary.tsx','utf8'),/to="\/today"/);
 assert.match(readFileSync('src/presentation/Manual.tsx','utf8'),/to="\/guide"/);
 assert.match(readFileSync('src/presentation/GamePlayPage.tsx','utf8'),/solo\|hub\|today/);
 assert.match(readFileSync('src/presentation/components/minigames/signature/SignaturePlay.tsx','utf8'),/get\('teams'\)/);
});
