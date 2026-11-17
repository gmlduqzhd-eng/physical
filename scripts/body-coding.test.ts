import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MISSIONS,blockCount,checkMission,describeStep,farthestForward,missionGoal,pathsOf,programmerFor,pseudoCode,returnsHome,robotFor,runProgram,type Program} from '../src/domain/bodyCoding';

test('a program unrolls repeats and picks a branch from the signal',()=>{
 const program:Program=[{kind:'move',move:'forward'},{kind:'repeat',times:3,body:['clap']},{kind:'if',then:'stop',else:'arms'},{kind:'move',move:'back'}];
 const red=runProgram(program,['빨강']);
 assert.deepEqual(red.steps.map(s=>s.move),['forward','clap','clap','clap','stop','back']);
 assert.deepEqual(red.steps[3].repeat,{round:3,times:3});
 assert.deepEqual(red.steps[4].condition,{signal:'빨강',matched:true});
 assert.deepEqual(runProgram(program,['초록']).steps.map(s=>s.move),['forward','clap','clap','clap','arms','back']);
 assert.equal(runProgram(program,[],()=>0.9).signals[0],'초록','a missing signal is drawn at run time');
 assert.equal(blockCount(program),5);
 assert.equal(describeStep(red.steps[2]),'반복 2/3 · 손뼉 한 번');
 assert.match(describeStep(red.steps[4]),/신호 빨강 ✔ 그러면 → 멈춰서 3초 세기/);
 assert.match(describeStep(red.steps[0],true),/한 발을 앞으로/,'seated wording');
});

test('pseudo-code reads like Korean steps',()=>{
 const lines=pseudoCode([{kind:'repeat',times:2,body:['arms','clap']},{kind:'if',then:'stop',else:'clap'}]);
 assert.deepEqual(lines,['1. 2번 반복하기:','    - 팔 펴기','    - 손뼉 한 번','2. 만약 신호가 빨강이면: 멈춰서 3초 세기','    아니면: 손뼉 한 번']);
 assert.deepEqual(pseudoCode([]),['(아직 블록이 없어요)']);
});

test('the robot must come back home and never walk far, whichever branch runs',()=>{
 assert(returnsHome([{kind:'move',move:'forward'},{kind:'move',move:'back'}]));
 assert(!returnsHome([{kind:'move',move:'forward'}]));
 assert(!returnsHome([{kind:'if',then:'forward',else:'clap'}]),'one branch would leave the robot away from home');
 assert.equal(farthestForward([{kind:'repeat',times:4,body:['forward']},{kind:'repeat',times:4,body:['back']}]),4);
 assert.match(checkMission(MISSIONS[3],[{kind:'repeat',times:4,body:['forward']},{kind:'if',then:'stop',else:'arms'},{kind:'repeat',times:4,body:['back']}]).reasons.join(),/3걸음 넘게 떨어지지/);
});

test('each mission has a solution and explains what is missing',()=>{
 const solutions:Program[]=[
  [{kind:'move',move:'forward'},{kind:'move',move:'clap'},{kind:'move',move:'arms'},{kind:'move',move:'back'}],
  [{kind:'repeat',times:3,body:['clap']},{kind:'repeat',times:3,body:['arms']}],
  [{kind:'move',move:'forward'},{kind:'if',then:'stop',else:'arms'},{kind:'move',move:'back'}],
  [{kind:'repeat',times:2,body:['clap','arms']},{kind:'if',then:'turn',else:'side'}],
 ];
 MISSIONS.forEach((m,i)=>assert.deepEqual(checkMission(m,solutions[i]),{ok:true,reasons:[]},m.title));
 const longWay:Program=[1,2,3].map(()=>({kind:'move',move:'clap'} as const)).concat([1,2,3].map(()=>({kind:'move',move:'arms'} as const)));
 assert.match(checkMission(MISSIONS[1],longWay).reasons.join(),/반복 블록을 써요/);
 assert.match(checkMission(MISSIONS[1],longWay).reasons.join(),/4개 이하/);
 assert.match(checkMission(MISSIONS[2],[{kind:'if',then:'arms',else:'stop'}]).reasons.join(),/빨강이면 ‘멈춰서 3초 세기’/);
 assert.match(checkMission(MISSIONS[1],[{kind:'repeat',times:3,body:[]}]).reasons.join(),/비어 있는 반복/);
 assert.deepEqual(checkMission(MISSIONS[0],[]).reasons,['블록을 하나 이상 넣어요.']);
});

test('roles swap every mission and the screen keeps the app safety rules',()=>{
 assert.equal(programmerFor(0),'친구 A');assert.equal(robotFor(0),'친구 B');
 assert.equal(programmerFor(1),'친구 B');assert.equal(robotFor(1),'친구 A');
 const screen=readFileSync(new URL('../src/presentation/components/minigames/PartnerRobotLab.tsx',import.meta.url),'utf8');
 assert.match(screen,/몸으로 하는 코딩/);assert.match(screen,/6실05-01/);assert.match(screen,/aria-live/);
 assert.doesNotMatch(screen,/달려|뛰어|전력/);
});

test('a half turn flips which way forward and back go, so programs cannot sneak past the step limit',()=>{
 const sneaky:Program=[{kind:'repeat',times:3,body:['forward']},{kind:'move',move:'turn'},{kind:'repeat',times:3,body:['back']},{kind:'if',then:'clap',else:'arms'},{kind:'move',move:'turn'}];
 assert.equal(returnsHome(sneaky),false);assert.equal(farthestForward(sneaky),6);assert.equal(checkMission(MISSIONS[3],sneaky).ok,false);
 const loop:Program=[{kind:'repeat',times:4,body:['forward','turn','back']},{kind:'if',then:'clap',else:'arms'}];
 // 앞으로 → 돌기 → 뒤로(= 원래 앞쪽으로 한 걸음 더)를 두 번 하면 처음 자리로 돌아온다: 가장 멀리 2걸음.
 assert.equal(farthestForward(loop),2);assert(returnsHome(loop));
 const away:Program=[{kind:'move',move:'turn'},{kind:'repeat',times:4,body:['back']},{kind:'move',move:'turn'},{kind:'repeat',times:4,body:['back']},{kind:'if',then:'clap',else:'arms'}];
 assert.equal(farthestForward(away),4,'walking backwards after a turn still counts as distance');assert.equal(checkMission(MISSIONS[3],away).ok,false);
 const outAndBack:Program=[{kind:'repeat',times:2,body:['forward']},{kind:'move',move:'turn'},{kind:'repeat',times:2,body:['forward']},{kind:'move',move:'turn'},{kind:'if',then:'clap',else:'arms'}];
 assert(returnsHome(outAndBack));assert.equal(farthestForward(outAndBack),2);assert.equal(checkMission(MISSIONS[3],outAndBack).ok,true);
 assert(!returnsHome([{kind:'if',then:'turn',else:'clap'},{kind:'move',move:'forward'},{kind:'move',move:'back'},{kind:'if',then:'forward',else:'clap'}]),'every signal combination must end at home');
});

test('mission messages: the repeat mission accepts the interleaved answer, the order is shown, and particles are right',()=>{
 assert.equal(checkMission(MISSIONS[1],[{kind:'repeat',times:3,body:['clap','arms']}]).ok,true);
 assert.match(checkMission(MISSIONS[0],[{kind:'move',move:'clap'}]).reasons.join(' '),/미션 순서: 앞으로 한 걸음 → 손뼉 한 번/);
 assert.match(checkMission(MISSIONS[2],[{kind:'if',then:'arms',else:'stop'}]).reasons.join(' '),/‘팔 펴기’로 정해요/);
});

test('every signal combination is checked, even with many choice blocks',()=>{
 // 11 safe choice blocks, then one more whose 초록 branch walks away: only some combinations fail.
 const safe=Array.from({length:11},()=>({kind:'if' as const,then:'clap' as const,else:'arms' as const}));
 const bad:Program=[...safe,{kind:'if',then:'clap',else:'forward'}];
 assert.equal(returnsHome(bad),false,'the 12th choice block must still be checked');
 const far:Program=[...safe,...Array.from({length:4},()=>({kind:'if' as const,then:'clap' as const,else:'forward' as const})),{kind:'repeat',times:4,body:['back']}];
 assert.ok(farthestForward(far)>3);
 assert.ok(pathsOf(bad).length<=4,'states are merged instead of enumerated');
});

test('seated mode uses seated names in the text view, goal and order message; turn hint only with a turn block',()=>{
 assert.match(pseudoCode([{kind:'move',move:'forward'}],true)[0],/한 발을 앞으로 살짝 내밀기/);
 assert.match(missionGoal(MISSIONS[0],true),/한 발을 앞으로 살짝 내밀기/);
 assert.doesNotMatch(missionGoal(MISSIONS[0],true),/한 걸음/);
 assert.match(checkMission(MISSIONS[0],[{kind:'move',move:'clap'}],true).reasons.join(' '),/미션 순서: 한 발을 앞으로 살짝 내밀기/);
 const noTurn=checkMission(MISSIONS[0],[{kind:'move',move:'clap'},{kind:'move',move:'forward'}]).reasons.join(' ');
 assert.match(noTurn,/출발한 자리에서 끝나야/);
 assert.doesNotMatch(noTurn,/반 바퀴/);
 assert.match(checkMission(MISSIONS[3],[{kind:'move',move:'turn'},{kind:'move',move:'forward'}]).reasons.join(' '),/반 바퀴 돌면/);
});
