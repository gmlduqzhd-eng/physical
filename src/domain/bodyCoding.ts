/**
 * 몸으로 하는 코딩(파트너 로봇 연구소). 학생이 블록으로 짧은 프로그램을 짜면 짝이 로봇이 되어 몸으로 실행한다.
 * 순차·반복·선택 구조를 익히고(실과 [6실05-01][6실05-02]와 함께 쓸 수 있음), 움직임은 작고 안전한 동작만 쓴다.
 * 이 모듈은 화면과 상관없는 순수 함수만 둔다.
 */
export type MoveId='forward'|'back'|'side'|'clap'|'arms'|'turn'|'stop';
export interface MoveInfo {label:string;emoji:string;seated:string}
export const MOVES:Readonly<Record<MoveId,MoveInfo>>={
 forward:{label:'앞으로 한 걸음',emoji:'⬆️',seated:'한 발을 앞으로 살짝 내밀기'},
 back:{label:'뒤로 한 걸음',emoji:'⬇️',seated:'내민 발을 제자리로 가져오기'},
 side:{label:'옆으로 한 걸음 갔다 오기',emoji:'↔️',seated:'두 손을 옆으로 갔다 오기'},
 clap:{label:'손뼉 한 번',emoji:'👏',seated:'손뼉 한 번'},
 arms:{label:'팔 펴기',emoji:'🙆',seated:'팔 펴기'},
 turn:{label:'제자리에서 반 바퀴 돌기',emoji:'🔄',seated:'고개와 어깨만 옆으로 돌리기'},
 stop:{label:'멈춰서 3초 세기',emoji:'✋',seated:'멈춰서 3초 세기'},
};
export const MOVE_IDS=Object.keys(MOVES) as MoveId[];
export type Block=
 |{kind:'move';move:MoveId}
 |{kind:'repeat';times:2|3|4;body:MoveId[]}
 |{kind:'if';then:MoveId;else:MoveId};
export type Program=Block[];
export type Signal='빨강'|'초록';

/** 블록 수. 반복 블록은 안에 든 동작까지 센다(블록을 줄이는 반복의 장점이 숫자로 보이게). */
export function blockCount(program:Program):number{
 return program.reduce((n,b)=>n+(b.kind==='repeat'?1+b.body.length:1),0);
}

export interface Step {
 /** 몇 번째 블록에서 나온 동작인지(0부터). */ block:number;
 move:MoveId;
 repeat?:{round:number;times:number};
 condition?:{signal:Signal;matched:boolean};
}
/**
 * 프로그램을 실제로 할 동작 순서로 펼친다. 선택 블록마다 신호 하나를 쓴다(신호가 모자라면 rng로 뽑는다).
 * 신호가 빨강이면 '그러면' 동작, 초록이면 '아니면' 동작을 한다.
 */
export function runProgram(program:Program,signals:Signal[]=[],rng:()=>number=Math.random):{steps:Step[];signals:Signal[]}{
 const steps:Step[]=[],used:Signal[]=[];let next=0;
 program.forEach((b,block)=>{
  if(b.kind==='move')steps.push({block,move:b.move});
  else if(b.kind==='repeat'){for(let round=1;round<=b.times;round++)for(const move of b.body)steps.push({block,move,repeat:{round,times:b.times}});}
  else{const signal=signals[next]??(rng()<0.5?'빨강':'초록');next++;used.push(signal);const matched=signal==='빨강';steps.push({block,move:matched?b.then:b.else,condition:{signal,matched}});}
 });
 return {steps,signals:used};
}

/** 블록을 우리말 글(의사코드)로 바꾼다. */
export function pseudoCode(program:Program):string[]{
 const lines:string[]=[];
 program.forEach((b,i)=>{
  const n=`${i+1}.`;
  if(b.kind==='move')lines.push(`${n} ${MOVES[b.move].label}`);
  else if(b.kind==='repeat'){lines.push(`${n} ${b.times}번 반복하기:`);if(b.body.length)b.body.forEach(m=>lines.push(`    - ${MOVES[m].label}`));else lines.push('    - (아직 비어 있어요)');}
  else{lines.push(`${n} 만약 신호가 빨강이면: ${MOVES[b.then].label}`);lines.push(`    아니면: ${MOVES[b.else].label}`);}
 });
 return lines.length?lines:['(아직 블록이 없어요)'];
}

/** 로봇이 출발한 자리로 돌아오는지(앞으로·뒤로 걸음 수가 같은지). 선택 블록은 어느 쪽이 나와도 돌아와야 한다. */
export function returnsHome(program:Program):boolean{
 let worst=0,best=0;
 for(const b of program){
  const d=(m:MoveId)=>m==='forward'?1:m==='back'?-1:0;
  if(b.kind==='move'){worst+=d(b.move);best+=d(b.move);}
  else if(b.kind==='repeat'){const s=b.body.reduce((n,m)=>n+d(m),0)*b.times;worst+=s;best+=s;}
  else{worst+=Math.max(d(b.then),d(b.else));best+=Math.min(d(b.then),d(b.else));}
 }
 return worst===0&&best===0;
}
/** 앞으로 가장 멀리 가는 걸음 수. 좁은 교실에서도 하도록 3걸음까지만 허용한다. */
export function farthestForward(program:Program):number{
 // 선택 블록이 모두 빨강일 때와 모두 초록일 때를 따로 따라가 가장 먼 거리를 잰다.
 const one=(signal:Signal)=>{let p=0,f=0;for(const s of runProgram(program,Array(20).fill(signal)).steps){p+=s.move==='forward'?1:s.move==='back'?-1:0;f=Math.max(f,p);}return f;};
 return Math.max(one('빨강'),one('초록'));
}
export const MAX_FORWARD=3,MAX_STEPS=16;

export interface Mission {
 stage:1|2|3|4;kind:'순차'|'반복'|'선택'|'종합';title:string;goal:string;
 /** 정해진 동작 순서가 있는 미션은 이 순서와 같아야 한다. */ target?:MoveId[];
 maxBlocks?:number;needs?:('repeat'|'if')[];
 /** 선택 미션: 빨강일 때·초록일 때 해야 할 동작. */ branch?:{then:MoveId;else:MoveId};
}
export const MISSIONS:readonly Mission[]=[
 {stage:1,kind:'순차',title:'인사하는 로봇',goal:'앞으로 한 걸음 → 손뼉 한 번 → 팔 펴기 → 뒤로 한 걸음 순서로 짜요.',target:['forward','clap','arms','back']},
 {stage:2,kind:'반복',title:'박수 공장 로봇',goal:'손뼉 세 번과 팔 펴기 세 번을 반복 블록으로 짧게 짜요. 블록은 4개까지예요.',target:['clap','clap','clap','arms','arms','arms'],maxBlocks:4,needs:['repeat']},
 {stage:3,kind:'선택',title:'신호를 보는 로봇',goal:'“만약 신호가 빨강이면 멈춰서 3초, 아니면 팔 펴기” 블록을 넣어요. 신호는 실행할 때마다 바뀌어요.',needs:['if'],branch:{then:'stop',else:'arms'}},
 {stage:4,kind:'종합',title:'나만의 로봇 춤',goal:'반복과 선택을 모두 넣고, 출발한 자리로 돌아오는 로봇 춤을 자유롭게 짜요.',needs:['repeat','if']},
];

/** 미션을 지켰는지와, 못 지켰다면 그 이유(아이가 읽을 수 있는 말). */
export function checkMission(mission:Mission,program:Program):{ok:boolean;reasons:string[]}{
 const reasons:string[]=[];
 if(!program.length)return {ok:false,reasons:['블록을 하나 이상 넣어요.']};
 if(program.some(b=>b.kind==='repeat'&&!b.body.length))reasons.push('비어 있는 반복 블록이 있어요. 안에 동작을 넣어요.');
 if(mission.needs?.includes('repeat')&&!program.some(b=>b.kind==='repeat'))reasons.push('반복 블록을 써요.');
 if(mission.needs?.includes('if')&&!program.some(b=>b.kind==='if'))reasons.push('선택(만약~이면) 블록을 써요.');
 if(mission.maxBlocks&&blockCount(program)>mission.maxBlocks)reasons.push(`블록이 ${blockCount(program)}개예요. ${mission.maxBlocks}개 이하로 줄여요.`);
 if(mission.target){const moves=runProgram(program,[],()=>0).steps.map(s=>s.move);if(program.some(b=>b.kind==='if')||moves.join()!==mission.target.join())reasons.push('미션의 동작 순서와 달라요. 글로 보기로 순서를 확인해요.');}
 if(mission.branch&&!program.some(b=>b.kind==='if'&&b.then===mission.branch!.then&&b.else===mission.branch!.else))reasons.push(`빨강이면 ‘${MOVES[mission.branch.then].label}’, 아니면 ‘${MOVES[mission.branch.else].label}’으로 정해요.`);
 if(!returnsHome(program))reasons.push('앞으로 간 만큼 뒤로 돌아와 출발한 자리에서 끝나요.');
 if(farthestForward(program)>MAX_FORWARD)reasons.push(`앞으로는 ${MAX_FORWARD}걸음까지만 가요.`);
 const longest=Math.max(runProgram(program,Array(20).fill('빨강')).steps.length,runProgram(program,Array(20).fill('초록')).steps.length);
 if(longest>MAX_STEPS)reasons.push(`동작이 ${longest}개예요. ${MAX_STEPS}개 이하로 줄여요.`);
 return {ok:!reasons.length,reasons};
}

/** 미션마다 역할을 바꾼다. 0번 미션은 친구 A가 프로그래머. */
export const programmerFor=(missionIndex:number)=>missionIndex%2===0?'친구 A':'친구 B';
export const robotFor=(missionIndex:number)=>missionIndex%2===0?'친구 B':'친구 A';

/** 한 단계를 소리·화면으로 읽어 줄 문장. */
export function describeStep(step:Step,seated=false):string{
 const move=seated?MOVES[step.move].seated:MOVES[step.move].label;
 if(step.condition)return `신호 ${step.condition.signal} ${step.condition.matched?'✔ 그러면':'✘ 아니면'} → ${move}`;
 if(step.repeat)return `반복 ${step.repeat.round}/${step.repeat.times} · ${move}`;
 return move;
}
