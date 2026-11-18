import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_PROGRESS,REASONS,SUMMARY_NOTES,addPlay,currentVote,lessonPlayId,reasonsForVote,setReasons,setVote,shareSummary,type ClassProgress} from '../src/domain/classProgress';
import {DEFAULT_TODAY,advanceRun,buildTodayPlan,isStaleRun,parseRun,resumeRun,sameLocalDay,stageOutcomes,startRun,summaryPlayId,type TodayRun} from '../src/domain/todayLesson';

const day=new Date(2026,10,18,9).getTime();
const name=(id:string)=>id;
const finishedRun=(start:number):TodayRun=>{
 let run=startRun(buildTodayPlan(DEFAULT_TODAY,3),start);
 for(const [i,status] of (['done','done','skipped','done'] as const).entries())run=advanceRun(run,status,start+(i+1)*60000);
 return run;
};

test('오늘 수업 끝 화면의 반응은 게임 결과 화면에서 남긴 판에 붙어 두 번 쌓이지 않는다',()=>{
 const run=finishedRun(day);
 const main=run.plan.stages[1].gameId!;
 // 게임 결과 화면: 판을 기록하고 그 판에 👍
 let p:ClassProgress=addPlay(EMPTY_PROGRESS,main,day+90000,'sig-play-1');
 p=setVote(p,main,'up',day+91000,'sig-play-1');
 const play=lessonPlayId(p,main,run.startedAt,run.finishedAt!);
 assert.equal(play,'sig-play-1');
 assert.equal(currentVote(p,main,play),'up','끝 화면에 이미 누른 반응이 보인다');
 // 끝 화면에서 다시 눌러도(새로고침 뒤 포함) 같은 판의 반응만 바뀐다
 p=setVote(p,main,'up',run.finishedAt!+5000,play);
 p=setVote(p,main,'down',run.finishedAt!+9000,lessonPlayId(p,main,run.startedAt,run.finishedAt!));
 assert.equal(p.votes.filter(v=>v.id===main).length,1);
 assert.equal(currentVote(p,main,play),'down');
});

test('기록 없이 반응만 남긴 판도 찾고, 아무것도 없으면 단계마다 고정된 판 id를 쓴다',()=>{
 const run=finishedRun(day);
 const warm=run.plan.stages[0].gameId!;
 let p=setVote(EMPTY_PROGRESS,warm,'up',day+30000,'claimed-1');
 assert.equal(lessonPlayId(p,warm,run.startedAt,run.finishedAt!),'claimed-1');
 assert.equal(lessonPlayId(p,warm,run.finishedAt!+1,run.finishedAt!+2),undefined,'수업 밖의 판은 쓰지 않는다');
 const cool=run.plan.stages[2].gameId!;
 assert.equal(lessonPlayId(p,cool,run.startedAt,run.finishedAt!),undefined);
 const id=summaryPlayId(run,2);
 assert.equal(id,summaryPlayId(JSON.parse(JSON.stringify(run)),2),'새로고침해도 같은 id');
 assert.notEqual(id,summaryPlayId(run,0));
 p=setVote(setVote(p,cool,'up',day+1,id),cool,'up',day+2,id);
 assert.equal(p.votes.filter(v=>v.id===cool).length,1);
});

test('단계 결과: 기록한 활동만 했어요, 열지 않고 넘긴 단계와 건너뛴 단계는 따로',()=>{
 const run=finishedRun(day);
 const main=run.plan.stages[1].gameId!;
 assert.deepEqual(stageOutcomes(run,id=>id===main),['passed','played','skipped','played']);
});

test('다른 날 남은 수업은 알아보고, 이어 하면 밤사이 시간을 빼고 다시 센다',()=>{
 let run=startRun(buildTodayPlan(DEFAULT_TODAY,3),day);
 run=advanceRun(run,'done',day+120000);
 const next=new Date(2026,10,19,9).getTime();
 assert.equal(isStaleRun(run,day+3600000),false);
 assert.equal(isStaleRun(run,next),true);
 assert.ok(sameLocalDay(day,new Date(2026,10,18,23,59).getTime()));
 const resumed=resumeRun(run,next);
 assert.equal(resumed.stageStartedAt,next);
 assert.equal(next-resumed.startedAt,120000,'이미 한 단계 시간만 남는다');
 assert.equal(isStaleRun(resumed,next),false);
 assert.ok(parseRun(JSON.parse(JSON.stringify(resumed))));
});

test('깨진 진행 값은 이어 하지 않는다(끝 표시·설정·결과 모양)',()=>{
 const run=finishedRun(day);
 const live=startRun(buildTodayPlan(DEFAULT_TODAY,3),day);
 const noFinish={...run,finishedAt:undefined};
 for(const bad of [
  noFinish,
  {...live,finishedAt:day},
  {...live,finishedAt:'x'},
  {...live,plan:{...live.plan,settings:{...live.plan.settings,teams:9}}},
  {...live,plan:{...live.plan,settings:{...live.plan.settings,teams:'2'}}},
  {...live,plan:{...live.plan,settings:{...live.plan.settings,grade:'7학년'}}},
  {...live,plan:{...live.plan,settings:{...live.plan.settings,minutes:41}}},
  {...run,results:[...run.results.slice(0,3),{status:'weird',seconds:1}]},
  {...run,results:[...run.results.slice(0,3),{status:'done',seconds:-1}]},
  {...live,index:0.5},
  {...live,startedAt:0},
 ])assert.equal(parseRun(JSON.parse(JSON.stringify(bad))),null,JSON.stringify(bad).slice(0,120));
 assert.ok(parseRun(JSON.parse(JSON.stringify(run))));
 assert.ok(parseRun(JSON.parse(JSON.stringify(live))));
});

test('👍에는 좋은 이유만, 👎에는 고칠 이유만 보이고 예전 기록의 이유도 그대로 읽힌다',()=>{
 assert.deepEqual(reasonsForVote('up').map(r=>r.label),['학생들이 좋아했어요','딱 알맞았어요','또 하고 싶어요']);
 assert.deepEqual(reasonsForVote('down').map(r=>r.label),['어려웠어요','길었어요','지루했어요','헷갈렸어요','너무 쉬웠어요']);
 assert.equal(reasonsForVote('up').length+reasonsForVote('down').length,REASONS.length);
 // 예전 화면에서 👍와 함께 고른 '너무 쉬웠어요'
 const p=setReasons(setVote(EMPTY_PROGRESS,'jump','up',day,'p1'),'jump','p1',['easy','loved'],undefined,day+1);
 assert.deepEqual(p.reasons[0].reasons,['easy','loved']);
});

test('공유용 요약: 활동별 판 수·👍·👎가 들어가고, 메모가 많으면 외 N개로 알린다',()=>{
 let p:ClassProgress=EMPTY_PROGRESS;
 for(let i=0;i<SUMMARY_NOTES+3;i++){
  const id=i%2?'bingo':'jump',play=`p${i}`;
  p=setReasons(setVote(addPlay(p,id,day+i*10,play),id,i%3?'up':'down',day+i*10+1,play),id,play,[],`메모 ${i}`,day+i*10+2);
 }
 const text=shareSummary(p,name,new Date(day));
 assert.match(text,/활동별 반응 \(판 수 · 👍 · 👎\)/);
 assert.match(text,/- jump: 12판 · 👍 \d+ · 👎 \d+/);
 assert.match(text,/- bingo: 11판 · 👍 \d+ · 👎 \d+/);
 assert.match(text,/외 3개/);
 assert.equal((text.match(/^- (jump|bingo): 메모/gm)??[]).length,SUMMARY_NOTES);
 // 메모가 몇 개뿐이면 모두 들어간다(예전에는 5개까지만 들어가 첫 게임 메모가 빠졌다)
 let few:ClassProgress=EMPTY_PROGRESS;
 for(let i=0;i<6;i++)few=setReasons(addPlay(few,`g${i}`,day+i,`q${i}`),`g${i}`,`q${i}`,[],`짧은 메모 ${i}`,day+i);
 const t2=shareSummary(few,name,new Date(day));
 for(let i=0;i<6;i++)assert.match(t2,new RegExp(`g${i}: 짧은 메모 ${i}`));
 assert.doesNotMatch(t2,/외 \d+개 \(/);
 assert.doesNotMatch(text,/undefined|NaN/);
});
