import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {EMPTY_PROGRESS,MAX_ENTRIES,addPlay,keepTotal,mergeProgress,parseProgress,totalPlays,unseenPlays,type ClassProgress} from '../src/domain/classProgress';
import {COOLDOWN_IDS,DEFAULT_TODAY,TODAY_GRADES,TODAY_SPACES,advanceRun,buildTodayPlan,mainPath,otherMains,stageCandidates,stageMinute,stagePlanText,startRun} from '../src/domain/todayLesson';
import {MOTION_SENSOR_GAMES,countdownDeviceHint} from '../src/domain/countdownHint';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {isQuestId} from '../src/domain/movementQuests';

const day=new Date(2026,10,19,9).getTime();
const read=(p:string)=>readFileSync(p,'utf8');

test('정리운동 후보에 혼자 하는 숨 쉼터가 없고, 모든 학년·공간에 후보가 3개 이상이다',()=>{
 assert.ok(!(COOLDOWN_IDS as readonly string[]).includes('breath-pacer-478'));
 for(const g of TODAY_GRADES)for(const s of TODAY_SPACES){
  assert.ok(stageCandidates('cooldown',g.id,s).length>=3,`${g.id} ${s} 정리운동`);
  assert.ok(stageCandidates('warmup',g.id,s).length>=3,`${g.id} ${s} 준비운동`);
 }
 for(let seed=0;seed<200;seed++)for(const g of TODAY_GRADES)for(const s of TODAY_SPACES)
  assert.ok(!buildTodayPlan({...DEFAULT_TODAY,grade:g.id,space:s},seed).stages.some(x=>x.gameId==='breath-pacer-478'));
});

test('단계 시간: 계획 글과 지금 몇 분째인지, 다른 대표 게임 고르기',()=>{
 const plan=buildTodayPlan(DEFAULT_TODAY,7);
 const [warm,main,cool,reflect]=plan.stages;
 assert.match(stagePlanText(warm),/^2~3번 되풀이 · 약 \d+분$/);
 assert.match(stagePlanText(cool),/^2~3번 되풀이 · 약 \d+분$/);
 assert.match(stagePlanText(main),/^여러 판 · 약 \d+분$/);
 assert.match(stagePlanText(reflect),/^약 \d+분$/);
 let run=startRun(plan,day);
 assert.equal(stageMinute(run,day),1);
 assert.equal(stageMinute(run,day+59_000),1);
 assert.equal(stageMinute(run,day+3*60_000+5_000),4);
 assert.equal(stageMinute(run,day-5_000),1,'시계가 어긋나도 1분째부터');
 assert.deepEqual(otherMains(run),[],'준비운동 단계에는 다른 대표 게임을 권하지 않는다');
 run=advanceRun(run,'done',day+60_000);
 const others=otherMains(run);
 assert.ok(others.length>0&&others.length<=3);
 assert.ok(others.every(g=>g.id!==main.gameId));
 assert.equal(mainPath('sig-boss-raid',4),'/play/sig-boss-raid?returnTo=%2Ftoday&teams=4');
});

test('오늘 수업 화면: 지금 몇 분째·한 판 더·다른 대표 게임을 보여 준다',()=>{
 const page=read('src/presentation/TodayLesson.tsx');
 assert.match(page,/지금 \{minute\}분째 · 계획 \{stage\.minutes\}분/);
 assert.match(page,/다른 대표 게임으로 한 판 더/);
 assert.match(page,/계획한 시간을 다 썼어요/);
 assert.match(page,/계획 \{s\.minutes\}분/,'끝 화면과 순서 줄에 걸린 시간과 계획 시간을 함께');
});

test('끝 화면(밝은 바탕)에서 누른 반응이 눈에 보인다',()=>{
 const css=read('src/presentation/components/ClassFeedbackSlot.css');
 assert.match(css,/\[data-tone=light\] \.class-feedback-votes button\[aria-pressed=true\]\{[^}]*background:#0e7490;color:#fff/);
});

test('수업 중 결과 화면: 다음 단계로가 카드 맨 위에 크게, 홈으로 대신 오늘 수업으로',()=>{
 const page=read('src/presentation/GamePlayPage.tsx');
 // '다음 단계로 ▶'는 결과 카드 맨 위(마쳤어요 줄 바로 아래)에 있어 TV에서 스크롤하지 않아도 보인다.
 assert.match(page,/활동을 마쳤어요!'\}<\/p>\s*\{\/\*[^*]*\*\/\}\s*\{lessonStage&&<div className="lesson-next-top[\s\S]{0,500}다음 단계로 ▶/);
 assert.equal((page.match(/다음 단계로 ▶/g)||[]).length,1,'다음 단계 버튼은 하나만');
 assert.match(page,/navigate\('\/today'\)[^>]*>오늘 수업으로/);
 assert.match(page,/currentStage\(todayRun\)\?\.gameId===gameType/);
});

test('준비 카운트다운 안내: 센서 놀이는 큰 화면에서도 손에 쥐고, 나머지는 화면 크기를 따른다',()=>{
 // 목록에는 지금 열 수 있고 카운트다운을 쓰는 활동만 남는다(합쳐진 예전 놀이나 움직임 미션 id는 넣지 않는다).
 const available=new Set(AVAILABLE_GAMES.map(g=>g.type));
 for(const id of MOTION_SENSOR_GAMES){assert.ok(available.has(id),`${id}: 지금 열 수 있는 활동`);assert.ok(!isQuestId(id),`${id}: 카운트다운이 뜨는 활동`);}
 for(const id of MOTION_SENSOR_GAMES)assert.match(countdownDeviceHint(id,true),/손에 꼭 쥐어요/);
 // 합쳐진 예전 센서 놀이(새 주소로 옮겨 감)는 목록에 없다.
 assert.ok(!MOTION_SENSOR_GAMES.includes('tilt_balance'));
 assert.match(countdownDeviceHint('ganggangsullae',true),/모두가 볼 수 있게/);
 assert.doesNotMatch(countdownDeviceHint('ganggangsullae',false),/쥐/,'기기를 놓고 하는 표현 놀이에 손에 쥐라고 하지 않는다');
});

test('다른 놀이 방법 막대: 휴대폰에서만 아래로, 넓은 화면은 맨 위 한 줄',()=>{
 const css=read('src/presentation/components/minigames/common/MovementQuest.css');
 assert.match(css,/@media\(max-width:640px\)\{\s*div\[data-consolidated\]\{display:flex;flex-direction:column\}[\s\S]*?consolidated-course-bar\{order:2\}\s*\}/);
 assert.match(css,/@media\(min-width:641px\)\{[\s\S]*?consolidated-course-note\{display:none\}/);
});

test('/games에서도 오늘 수업 막대가 뜬다',()=>{
 assert.match(read('src/App.tsx'),/pathname==='\/games'/);
});

test('누적 판 수: 두 탭이 저마다 남긴 판을 더하고, 예전 탭이 total 없이 저장해도 줄지 않는다',()=>{
 let base:ClassProgress=EMPTY_PROGRESS;
 for(let i=0;i<3;i++)base=addPlay(base,'a',day+i,`b${i}`);
 let a=base,b=base;
 a=addPlay(addPlay(a,'a',day+10,'a1'),'a',day+11,'a2');
 b=addPlay(b,'a',day+12,'b9');
 assert.equal(unseenPlays(a,b),1);
 assert.equal(totalPlays(mergeProgress(a,b)),6);
 assert.equal(totalPlays(mergeProgress(a,a)),5,'같은 기록끼리는 늘지 않는다');
 // 2000판을 넘긴 반: 예전 탭이 total 없이 저장(남은 2000판 + 새 1판)
 let big:ClassProgress=EMPTY_PROGRESS;
 for(let i=0;i<MAX_ENTRIES+100;i++)big=addPlay(big,'a',day+i,`p${i}`);
 assert.equal(totalPlays(big),MAX_ENTRIES+100);
 const old=parseProgress({version:2,plays:[...big.plays.slice(1),{id:'a',at:day+9_999_999,play:'new'}],votes:[],reasons:[]});
 assert.equal(old.total,undefined);
 assert.equal(totalPlays(keepTotal(old,big)),MAX_ENTRIES+101);
 // 다른 탭의 '모두 지우기'는 그대로 따른다
 assert.equal(totalPlays(keepTotal(EMPTY_PROGRESS,big)),0);
 // 지워진 오래된 판은 다시 세지 않는다
 const stale=parseProgress({version:2,plays:[{id:'a',at:day-5,play:'ancient'},...big.plays],votes:[],reasons:[]});
 assert.equal(unseenPlays(big,stale),0);
});
