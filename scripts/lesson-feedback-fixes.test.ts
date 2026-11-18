import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {EMPTY_PROGRESS,MAX_ENTRIES,REASONS,SUMMARY_NOTES,addPlay,classBadges,currentVote,lessonPlayId,mapView,mergeProgress,parseProgress,reactionRows,reasonsForVote,setReasons,setVote,shareSummary,totalPlays,type ClassProgress} from '../src/domain/classProgress';
import {DEFAULT_TODAY,advanceRun,bindStagePlays,buildTodayPlan,isStaleRun,parseRun,recordsSince,resumeRun,runSeconds,sameLocalDay,stageOutcomes,startRun,summaryPlayId,type TodayRun} from '../src/domain/todayLesson';
import {withoutRemoved} from '../src/application/classProgressStore';

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
 assert.match(text,/활동별 반응 \(판 수 · 👍 · 👎 · 고른 이유\)/);
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

// ── 96차 점검: 끝 화면 반응 묶기, 이어 하기, 오래 쓴 기록 ──
const bind=(run:TodayRun,p:ClassProgress)=>bindStagePlays(run,id=>lessonPlayId(p,id,recordsSince(run),run.finishedAt!));

test('기록 없이 넘어간 판: 끝 화면에서 반응을 바꾸고 다시 눌러도(새로고침 포함) 표는 하나다',()=>{
 let run=finishedRun(day);
 const main=run.plan.stages[1].gameId!;
 // 결과 화면에서 👍만 누르고 기록 없이 넘어감
 let p:ClassProgress=setVote(EMPTY_PROGRESS,main,'up',day+90000,'claimed-1');
 run=bind(run,p);
 assert.equal(run.stagePlays?.[1],'claimed-1','끝 화면의 칸이 그 판에 묶인다');
 // 끝 화면에서 👎로 바꾸고(시각이 수업 끝난 뒤가 됨), 다시 👍, 또 👎
 for(const [i,v] of (['down','up','down'] as const).entries()){
  // 새로고침: sessionStorage에서 다시 읽은 수업도 같은 판에 묶여 있다
  const again=bind(parseRun(JSON.parse(JSON.stringify(run)))!,p);
  assert.equal(again.stagePlays?.[1],'claimed-1');
  p=setVote(p,main,v,run.finishedAt!+(i+1)*5000,again.stagePlays![1]);
 }
 assert.equal(p.votes.filter(v=>v.id===main).length,1);
 assert.equal(currentVote(p,main,'claimed-1'),'down');
 // 묶음을 적어 두지 않았더라도, 다시 누른 반응(시각이 끝난 뒤)을 같은 판으로 찾는다
 assert.equal(lessonPlayId(p,main,run.startedAt,run.finishedAt!),'claimed-1');
});

test('활동이 없는 단계는 묶지 않고, 남긴 판이 없으면 수업·단계로 정해지는 id를 쓴다',()=>{
 const run=bind(finishedRun(day),EMPTY_PROGRESS);
 assert.deepEqual(run.stagePlays,run.plan.stages.map((s,i)=>s.gameId?summaryPlayId(run,i):''));
 assert.equal(bind(run,setVote(EMPTY_PROGRESS,run.plan.stages[1].gameId!,'up',day+1000,'later')),run,'한 번 정한 묶음은 바뀌지 않는다');
 assert.equal(parseRun(JSON.parse(JSON.stringify({...run,stagePlays:['a']}))),null,'단계 수와 맞지 않는 묶음은 읽지 않는다');
});

test('어제 수업을 이어 해도 어제 기록한 판과 반응이 그대로 이 수업의 것이다',()=>{
 const yesterday=day-24*3600_000;
 let run=startRun(buildTodayPlan(DEFAULT_TODAY,3),yesterday);
 run=advanceRun(run,'done',yesterday+300_000);
 const warm=run.plan.stages[0].gameId!,main=run.plan.stages[1].gameId!;
 let p:ClassProgress=addPlay(EMPTY_PROGRESS,warm,yesterday+200_000,'w1');
 p=setVote(p,warm,'up',yesterday+210_000,'w1');
 run=resumeRun(run,day);
 assert.equal(recordsSince(run),yesterday,'판을 찾는 시작 시각은 처음 시작한 때');
 assert.equal(isStaleRun(run,day),false);
 for(const [i,s] of (['done','done','done'] as const).entries())run=advanceRun(run,s,day+(i+1)*60_000);
 p=addPlay(p,main,day+30_000,'m1');
 const since=recordsSince(run),until=run.finishedAt!;
 const recorded=(id:string)=>p.plays.some(x=>x.id===id&&x.at>=since&&x.at<=until);
 assert.deepEqual(stageOutcomes(run,recorded),['played','played','passed','played']);
 const bound=bind(run,p);
 assert.equal(bound.stagePlays?.[0],'w1','어제 👍를 남긴 판에 그대로 묶인다');
 assert.equal(currentVote(p,warm,bound.stagePlays![0]),'up');
 assert.equal(runSeconds(run),300+60*3,'걸린 시간은 단계 시간의 합(밤사이 시간 제외)');
 assert.ok(parseRun(JSON.parse(JSON.stringify(bound))),'이어 한 수업도 새로고침 뒤 읽힌다');
});

test('한 단계를 아주 오래 띄워 둔 수업도 이어 하기 안내가 되풀이되지 않는다',()=>{
 const yesterday=new Date(2026,10,17,13).getTime(),morning=new Date(2026,10,18,8,30).getTime();
 let run=startRun(buildTodayPlan(DEFAULT_TODAY,3),yesterday);
 run=advanceRun(run,'done',yesterday+9.5*3600_000); // 한 단계 9시간 반
 const resumed=resumeRun(run,morning);
 assert.equal(isStaleRun(resumed,morning),false);
 assert.ok(resumed.startedAt>=new Date(2026,10,18).getTime());
 assert.equal(recordsSince(resumeRun(resumed,morning+1000)),yesterday,'두 번 이어 해도 처음 시작한 때를 지킨다');
});

test('기록한 뒤 건너뛰기로 나간 활동은 한 것으로 보여 준다',()=>{
 const run=finishedRun(day); // 세 번째 단계(정리운동)를 건너뜀
 const cool=run.plan.stages[2].gameId!;
 assert.equal(stageOutcomes(run,id=>id===cool)[2],'played');
 assert.equal(stageOutcomes(run,()=>false)[2],'skipped');
 const page=readFileSync('src/presentation/TodayLesson.tsx','utf8');
 assert.match(page,/outcome\?\(outcome==='played'\?'done':outcome\)/,'끝 화면의 ✓/→/– 표시는 실제 결과를 따른다');
});

test('깨진 진행 값: 끝 시각이 시작보다 앞서거나 단계 시간이 숫자가 아니면 읽지 않는다',()=>{
 const run=finishedRun(day),raw=JSON.parse(JSON.stringify(run));
 assert.ok(parseRun(raw));
 assert.equal(parseRun({...raw,finishedAt:raw.startedAt-5000}),null);
 assert.equal(parseRun({...raw,recordsSince:raw.startedAt+1}),null);
 const bad=JSON.parse(JSON.stringify(run));bad.plan.stages[0].minutes=null; // NaN은 JSON에서 null이 된다
 assert.equal(parseRun(bad),null);
});

test('공유용 요약에 고른 이유가 이름과 수로 들어간다',()=>{
 let p:ClassProgress=addPlay(EMPTY_PROGRESS,'sig-boss-raid',day,'a');
 p=setVote(p,'sig-boss-raid','down',day+1,'a');
 p=setReasons(p,'sig-boss-raid','a',['hard','confusing'],undefined,day+2);
 p=addPlay(p,'sig-boss-raid',day+10,'b');p=setVote(p,'sig-boss-raid','down',day+11,'b');
 p=setReasons(p,'sig-boss-raid','b',['hard'],undefined,day+12);
 const text=shareSummary(p,name,new Date(day));
 assert.match(text,/sig-boss-raid: 2판 · 👍 0 · 👎 2 \(👍 0%\) · 이유: 어려웠어요 2, 헷갈렸어요 1/);
 const page=readFileSync('src/presentation/ClassProgressPage.tsx','utf8');
 assert.match(page,/fallbackOpen&&<SummaryFallback text=\{shareSummary\(progress,nameOf\)\}/,'복사가 막혔을 때의 글 칸은 지금 기록으로 다시 만든다');
});

test('반응 칸: 같은 반응을 다시 눌러도 바뀌지 않고, 👍↔👎를 오가도 앞서 고른 이유가 돌아온다',()=>{
 const slot=readFileSync('src/presentation/components/ClassFeedbackSlot.tsx','utf8');
 assert.match(slot,/if\(v===vote\)return;/);
 assert.match(slot,/remembered\.current\[vote\]=saved\.reasons/);
 assert.match(slot,/\.\.\.remembered\.current\[v\]/);
 assert.match(slot,/REASONS\.filter\(r=>r\.vote!==vote&&picked\.has\(r\.id\)\)/,'예전 기록의 다른 쪽 이유도 보이고 뺄 수 있다');
});

test('오래 쓴 기록: 한도를 넘겨 판을 지워도 지도·배지는 이어지고, 지운 판의 반응·이유도 함께 지운다',()=>{
 let p:ClassProgress=EMPTY_PROGRESS;
 for(let i=0;i<MAX_ENTRIES+5;i++){
  p=addPlay(p,i%2?'a':'b',day+i*10,`p${i}`);
  if(i<10){p=setVote(p,i%2?'a':'b','up',day+i*10+1,`p${i}`);p=setReasons(p,i%2?'a':'b',`p${i}`,['loved'],undefined,day+i*10+2);}
 }
 // 기록하지 않은 오래된 판의 반응과, 최근 판의 반응
 p=setVote(p,'a','down',day+20,'orphan-old');
 p=setVote(p,'a','down',day+(MAX_ENTRIES+4)*10+5,'orphan-new');
 p=addPlay(p,'a',day+(MAX_ENTRIES+6)*10,'last');
 assert.equal(p.plays.length,MAX_ENTRIES);
 assert.equal(totalPlays(p),MAX_ENTRIES+6);
 assert.equal(mapView(p).total,MAX_ENTRIES+6);
 assert.equal(mapView(p).opened,(MAX_ENTRIES+6)%30);
 assert.ok(classBadges(p).find(b=>b.id==='plays-50')?.earned);
 const kept=new Set(p.plays.map(x=>x.play));
 assert.ok(p.votes.every(v=>kept.has(v.play)||v.play==='orphan-new'),'지운 판과 그보다 오래된 반응은 남지 않는다');
 assert.ok(p.reasons.every(r=>kept.has(r.play)));
 const row=reactionRows(p).find(r=>r.id==='a')!;
 assert.equal(row.unrecorded,1,'남은 기록 안 한 판 반응은 최근 것 하나뿐');
 // 저장했다 읽어도, 두 탭을 합쳐도 누적 판 수가 줄지 않는다
 const back=parseProgress(JSON.parse(JSON.stringify(p)));
 assert.equal(totalPlays(back),MAX_ENTRIES+6);
 assert.equal(totalPlays(mergeProgress(back,EMPTY_PROGRESS)),MAX_ENTRIES+6);
 assert.equal(totalPlays(parseProgress({plays:[{id:'a',at:day}],votes:[]})),1,'예전 기록(누적 수 없음)은 판 수 그대로');
});

test('저장이 막힌 동안 지운 이유와 모두 지우기는 저장소의 예전 값으로 되살아나지 않는다',()=>{
 let stored:ClassProgress=addPlay(EMPTY_PROGRESS,'a',day,'p1');
 stored=setVote(stored,'a','down',day+1,'p1');
 stored=setReasons(stored,'a','p1',['hard'],'메모',day+2);
 // 이 탭에서 p1의 이유를 지움
 const memory=setReasons(stored,'a','p1',[],undefined,day+3);
 const merged=mergeProgress(memory,withoutRemoved(stored,0,new Set(['p1'])));
 assert.equal(merged.reasons.length,0);
 assert.equal(merged.plays.length,1);
 // 모두 지우기
 const cleared=mergeProgress({...EMPTY_PROGRESS,plays:[],votes:[],reasons:[]},withoutRemoved(stored,day+10,new Set()));
 assert.deepEqual([cleared.plays.length,cleared.votes.length,cleared.reasons.length,totalPlays(cleared)],[0,0,0,0]);
 // 지운 뒤 다른 탭이 남긴 새 기록은 남는다
 const other=addPlay(stored,'b',day+20,'p2');
 assert.equal(mergeProgress(EMPTY_PROGRESS,withoutRemoved(other,day+10,new Set())).plays.length,1);
});

test('오늘 수업의 본게임 시간은 여러 판을 하는 시간임을 알려 준다',()=>{
 const page=readFileSync('src/presentation/TodayLesson.tsx','utf8');
 assert.match(page,/여러 판 · 약 \$\{s\.minutes\}분/);
 assert.match(page,/한 판은 5~6분쯤이에요/);
});
