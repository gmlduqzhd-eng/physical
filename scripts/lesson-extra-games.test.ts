import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_TODAY,MAX_EXTRA_MAINS,addExtraMain,advanceRun,bindStagePlays,buildTodayPlan,currentStage,isStageGame,otherMains,parseRun,stageGameIds,stageOutcomes,stageTitle,startRun,type TodayRun} from '../src/domain/todayLesson';
import {EMPTY_PROGRESS,addPlay,lessonPlayId,setVote,type ClassProgress} from '../src/domain/classProgress';

const t0=new Date(2026,10,19,9).getTime();
const read=(p:string)=>readFileSync(p,'utf8');
/** 준비운동을 마치고 본게임 단계에 선 수업. */
function atMain(seed=7):TodayRun{
 const run=startRun(buildTodayPlan(DEFAULT_TODAY,seed),t0);
 const main=advanceRun(run,'done',t0+5*60000);
 assert.equal(currentStage(main)?.kind,'main');
 return main;
}

test("'한 판 더'로 연 다른 대표 게임은 본게임 단계의 게임으로 적힌다(겹치지 않게, 본게임 단계에서만)",()=>{
 const run=atMain();
 const other=otherMains(run)[0];assert.ok(other,'다른 대표 게임 후보가 있다');
 const planned=currentStage(run)!.gameId!;
 const a=addExtraMain(run,other.id);
 assert.deepEqual(a.extraMains,[other.id]);
 assert.equal(addExtraMain(a,other.id),a,'같은 게임을 두 번 적지 않는다');
 assert.equal(addExtraMain(a,planned),a,'계획한 본게임은 따로 적지 않는다');
 assert.equal(addExtraMain(a,'phone-play-010'),a,'대표 게임이 아니면 적지 않는다');
 assert.ok(isStageGame(a,other.id)&&isStageGame(a,planned),'둘 다 지금 단계의 게임');
 assert.deepEqual(stageGameIds(a,a.index),[planned,other.id]);
 assert.equal(stageTitle(a,a.index),`${currentStage(a)!.title} + ${other.name}`);
 // 준비운동 단계에서는 적지 않는다.
 const warm=startRun(buildTodayPlan(DEFAULT_TODAY,7),t0);
 assert.equal(addExtraMain(warm,other.id),warm);
 // 다음 단계로 넘어가면 더 이상 지금 단계의 게임이 아니다.
 const next=advanceRun(a,'done',t0+30*60000);
 assert.ok(!isStageGame(next,other.id));
});

test('끝 화면: 다른 대표 게임에도 반응 칸이 따로 묶이고, 새로고침·다시 누르기에도 표가 하나다',()=>{
 let run=atMain(11);
 const other=otherMains(run)[0];const planned=currentStage(run)!.gameId!;
 run=addExtraMain(run,other.id);
 let p:ClassProgress=EMPTY_PROGRESS;
 p=addPlay(p,planned,t0+7*60000,'p-main');
 p=addPlay(p,other.id,t0+12*60000,'p-other');
 p=setVote(p,other.id,'down',t0+12*60000+1,'p-other');
 while(run.finishedAt===undefined)run=advanceRun(run,'done',t0+40*60000);
 const since=run.startedAt,until=run.finishedAt!;
 const lookup=(id:string)=>lessonPlayId(p,id,since,until);
 const bound=bindStagePlays(run,lookup);
 const mainIndex=run.plan.stages.findIndex(s=>s.kind==='main');
 assert.equal(bound.stagePlays?.[mainIndex],'p-main');
 assert.deepEqual(bound.extraPlays,['p-other'],'다른 대표 게임은 그 게임에 남긴 판에 붙는다');
 assert.equal(bindStagePlays(bound,lookup),bound,'한 번 정하면 그대로');
 const again=parseRun(JSON.parse(JSON.stringify(bound)));
 assert.ok(again);assert.deepEqual(again!.extraPlays,['p-other'],'새로고침해도 같은 칸');
 const p2=setVote(setVote(p,other.id,'up',until+1,'p-other'),other.id,'down',until+2,'p-other');
 assert.equal(p2.votes.filter(v=>v.play==='p-other').length,1,'같은 판에 다시 눌러도 표는 하나');
 const outs=stageOutcomes(run,id=>id===other.id);
 assert.equal(outs[mainIndex],'played','다른 대표 게임만 기록해도 본게임 단계는 했어요');
});

test('다른 대표 게임에 판이 없으면 이 수업·이 순서로 정해지는 칸 id를 쓴다',()=>{
 let run=atMain(13);const other=otherMains(run)[0];
 run=addExtraMain(run,other.id);
 while(run.finishedAt===undefined)run=advanceRun(run,'done',t0+40*60000);
 const a=bindStagePlays(run,()=>undefined),b=bindStagePlays(run,()=>undefined);
 assert.equal(a.extraPlays?.[0],b.extraPlays?.[0]);
 assert.match(a.extraPlays![0],/^today-.*-x0$/);
});

test('parseRun: 다른 대표 게임 목록이 깨졌으면 읽지 않는다',()=>{
 const base=atMain();
 const run=addExtraMain(base,otherMains(base)[0].id);
 assert.ok(parseRun(JSON.parse(JSON.stringify(run))));
 assert.equal(parseRun({...run,extraMains:['없는-게임']}),null);
 assert.equal(parseRun({...run,extraMains:[run.extraMains![0],run.extraMains![0]]}),null,'겹치면 안 된다');
 assert.equal(parseRun({...run,extraMains:Array(MAX_EXTRA_MAINS+1).fill(run.extraMains![0])}),null);
 assert.equal(parseRun({...run,extraPlays:['a','b']}),null,'반응 칸 수가 게임 수와 같아야 한다');
 assert.ok(parseRun({...run,extraPlays:['a']}));
});

test("막대: 다른 대표 게임도 지금 단계로 보고, 시작한 활동에는 '건너뛰기' 없이 한 길(묻기)만 둔다",()=>{
 const bar=read('src/presentation/components/TodayLessonBar.tsx');
 assert.match(bar,/isStageGame\(run,playId\)/,'한 판 더로 연 게임도 지금 단계');
 assert.match(bar,/\{!started&&<button[^>]*today-bar-skip[^>]*onClick=\{\(\)=>step\('skipped'\)\}>건너뛰기/,'시작한 활동에는 건너뛰기를 감춘다');
 const lesson=read('src/presentation/TodayLesson.tsx');
 assert.match(lesson,/saveTodayRun\(addExtraMain\(run,g\.id\)\);navigate\(mainPath\(g\.id,teams\)\)/,'링크를 누를 때 수업에 적어 둔다');
 assert.match(lesson,/run\.extraMains\?\?\[\]\)\.map\(\(id,k\)=>[\s\S]{0,300}playId=\{bound\.extraPlays\?\.\[k\]\}/,'끝 화면에 반응 칸을 따로 둔다');
});

test('준비운동(반 전체 진행): 2·3번 과제는 짧은 신호 뒤 바로 시작한다',()=>{
 const src=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(read('src/domain/phonePlayBriefs.ts'),/QUICK_BRIEF_MS=2000/);
 assert.match(src,/quickBrief=phase==='brief'&&round>0&&!view\.memory&&!view\.plan&&!classBriefChangesRule\(play\.id,round\)/,'순서·방법을 읽는 과제와 역할·규칙이 바뀌는 과제는 안내 시간을 그대로 둔다');
 assert.match(src,/!quickBrief&&<button/,"짧은 신호 동안에는 '바로 시작'을 누를 필요가 없다");
});
