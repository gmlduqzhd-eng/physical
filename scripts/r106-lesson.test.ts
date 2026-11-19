import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHONE_PLAY_BY_ID} from '../src/domain/phonePlayCatalog';
import {CLASS_RULE_CHANGE_ROUNDS,QUICK_BRIEF_MS,classBriefChangesRule,classBriefMs,estimateSpeechMs} from '../src/domain/phonePlayBriefs';
import {CLASS_BRIEF_MS} from '../src/domain/phoneClassMode';
import {DEFAULT_TODAY,addExtraMain,advanceRun,buildTodayPlan,currentStage,otherMains,stageOutcomes,stageTitle,stageWindow,startRun,withRecordedExtras,type TodayRun} from '../src/domain/todayLesson';

const read=(p:string)=>readFileSync(p,'utf8');
const t0=new Date(2026,10,19,9).getTime();
function atMain(seed=7):TodayRun{
 const run=startRun(buildTodayPlan(DEFAULT_TODAY,seed),t0);
 const main=advanceRun(run,'done',t0+5*60000);
 assert.equal(currentStage(main)?.kind,'main');
 return main;
}

test('역할·규칙이 바뀌는 2·3번 과제 목록: 모두 실제 과제이고, 제목이 바뀜을 말한다',()=>{
 const listed:string[]=[];
 for(const [id,rounds] of Object.entries(CLASS_RULE_CHANGE_ROUNDS)){
  const play=PHONE_PLAY_BY_ID.get(id);
  assert.ok(play,`${id}는 있는 놀이`);
  for(const r of rounds){
   assert.ok(r===1||r===2,`${id}: 2·3번 과제만 적는다`);
   const title=play.rounds[r];
   assert.ok(title,`${id} ${r+1}번 과제가 있다`);
   assert.match(title,/바꿔|바꾸|차례|술래|규칙|거꾸로/,`${id} ${r+1}번 '${title}'은 역할·규칙이 바뀌는 과제`);
   listed.push(`${id}:${r+1}`);
  }
 }
 // 긴 안내를 받는 과제(놀이:과제 번호). 바꿀 때는 이 목록도 함께 고친다.
 assert.deepEqual(listed,[
  'phone-play-007:3','phone-play-008:2','phone-play-008:3','phone-play-011:2','phone-play-011:3','phone-play-019:2','phone-play-020:3',
  'phone-play-024:3','phone-play-028:2','phone-play-031:2','phone-play-033:3','phone-play-053:2','phone-play-057:3','phone-play-060:2',
  'phone-play-067:2','phone-play-069:3','phone-play-070:3','phone-play-076:3','phone-play-081:3','phone-play-085:3','phone-play-089:3','phone-play-103:2',
 ]);
 assert.ok(classBriefChangesRule('phone-play-007',2)&&classBriefChangesRule('phone-play-069',2)&&classBriefChangesRule('phone-play-011',1));
 assert.ok(!classBriefChangesRule('phone-play-007',1),'역할이 그대로인 과제는 짧은 신호');
 assert.ok(!classBriefChangesRule('phone-play-016',2),'같은 동작을 반대 발로 하는 것은 규칙이 바뀌는 과제가 아니다');
 assert.ok(!classBriefChangesRule('phone-play-007',0),'첫 과제는 원래 긴 안내라 목록에 없다');
});

test('안내 시간: 음성을 켰으면 안내 문장을 다 읽을 때까지 과제를 시작하지 않는다',()=>{
 const line='3번 과제. 신호 주는 사람을 바꿔요';
 assert.equal(classBriefMs(QUICK_BRIEF_MS,line,null),QUICK_BRIEF_MS,'음성을 끄면 짧은 신호 그대로');
 assert.equal(classBriefMs(QUICK_BRIEF_MS,line,{on:false,rate:1}),QUICK_BRIEF_MS);
 const spoken=classBriefMs(QUICK_BRIEF_MS,line,{on:true,rate:1});
 assert.ok(spoken>QUICK_BRIEF_MS&&spoken===estimateSpeechMs(line),'짧은 신호도 안내 문장이 끝날 때까지 기다린다');
 assert.ok(classBriefMs(QUICK_BRIEF_MS,line,{on:true,rate:.82})>spoken,'느리게 읽으면 더 기다린다');
 assert.equal(classBriefMs(CLASS_BRIEF_MS,'2번 과제. 짧아요',{on:true,rate:1}),CLASS_BRIEF_MS,'긴 안내는 기본 6초보다 짧아지지 않는다');
 assert.equal(estimateSpeechMs('   '),0);
 const src=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(src,/duration=phase==='brief'\?classBriefMs\(baseMs,briefLine,voiceOn\?/,'안내 단계 시간은 음성 길이를 따른다');
});

test('끝 화면·단계 이름: 링크만 눌렀다가 나온 대표 게임은 빼고, 실제로 한 게임만 적는다',()=>{
 let run=atMain();
 const [a,b]=otherMains(run);assert.ok(a&&b);
 run=addExtraMain(addExtraMain(run,a.id),b.id);
 const planned=currentStage(run)!.title;
 assert.equal(stageTitle(run,run.index,id=>id===a.id),`${planned} + ${a.name}`,'한 게임만 이름에 넣는다');
 assert.equal(stageTitle(run,run.index,()=>false),planned,'아무것도 안 했으면 계획한 이름 그대로');
 assert.equal(stageTitle(run,run.index),`${planned} + ${a.name} + ${b.name}`,'걸러 주지 않으면 모두(예전 동작)');
 const lesson=read('src/presentation/TodayLesson.tsx');
 assert.match(lesson,/run\.extraMains\?\?\[\]\)\.map\(\(id,k\)=>did\(id\)&&/,'반응 칸도 실제로 한 게임만');
 assert.match(lesson,/shown=\{did\}/,'끝 화면 단계 이름도 실제로 한 게임만');
});

test('활동 목록에서 직접 연 대표 게임도 본게임 시간 안에 기록했으면 본게임으로 센다',()=>{
 const run=atMain(5);
 const win=stageWindow(run,run.index)!;
 assert.equal(win.to,Infinity,'지금 단계는 끝이 없다');
 const planned=currentStage(run)!.gameId!;
 const other=otherMains(run)[0].id;
 const before={id:other,at:t0+60000};// 준비운동 중에 한 판: 본게임이 아니다
 const during={id:other,at:t0+8*60000};
 assert.equal(withRecordedExtras(run,[before,{id:planned,at:t0+7*60000},{id:'phone-play-010',at:t0+9*60000}]),run,'새로 찾은 게임이 없으면 그대로');
 const withExtra=withRecordedExtras(run,[before,during]);
 assert.deepEqual(withExtra.extraMains,[other]);
 assert.equal(withRecordedExtras(withExtra,[during]),withExtra,'이미 적었으면 그대로');
 // 본게임을 마친 뒤 끝 화면: 본게임 단계가 '했어요'로 잡힌다(그 게임만 기록했어도).
 const done=advanceRun(advanceRun(advanceRun(run,'done',t0+30*60000),'done',t0+35*60000),'done',t0+38*60000);
 const mainWin=stageWindow(done,1)!;
 assert.ok(mainWin.from<=t0+5*60000&&mainWin.to>=t0+30*60000,'지난 단계의 시간 창을 걸린 시간으로 되짚는다');
 const finished=withRecordedExtras(done,[during,{id:other,at:t0+36*60000}]);
 assert.deepEqual(finished.extraMains,[other],'본게임 시간 밖의 판은 세지 않는다');
 const outcomes=stageOutcomes(finished,id=>id===other);
 assert.equal(outcomes[1],'played');
});

test('끝 화면: 건너뛴 단계는 반응 칸을 두지 않는다(이미 남긴 반응이 있으면 보여 준다)',()=>{
 const lesson=read('src/presentation/TodayLesson.tsx');
 assert.match(lesson,/s\.gameId&&\(outcomes\[i\]!=='skipped'\|\|did\(s\.gameId\)\)&&/);
});

test('반 전체 진행 화면에서도 밝기를 바꿀 수 있다',()=>{
 const src=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(src,/className="pc-theme"[^>]*aria-label=\{isDark\?'라이트 모드로 전환':'다크 모드로 전환'\}[^>]*onClick=\{toggleTheme\}/);
});
