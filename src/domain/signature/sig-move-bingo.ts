import {seededRandom,TEAM_NAMES,type FunCommand,type FunState} from '../funLoop.js';
import {EXAMPLE_QUESTIONS} from '../peQuizBingo.js';
import {defineSignatureGame} from './define.js';
import type {Pose,SignatureCue,SignatureCueContext} from './types.js';

/**
 * 몸 빙고: 3×3 동작판에서 팀이 차례로 칸을 고르고, 동작(또는 체육 지식 문제)을 해내면 그 칸을 차지한다.
 * 가로·세로·대각선 한 줄을 한 팀이 모두 차지하면 빙고(보너스 +2). 판이 다 차면 새 판으로 이어서 한다.
 * 움직임 빙고(105)와 체육 지식 빙고의 문제를 한 판으로 합쳤다.
 *
 * 칸 차지 기록(어느 팀이 어느 칸)은 화면 모듈이 판마다 따로 보관하고, 점수는 엔진의 score 명령으로만 준다.
 * 이 파일은 판 만들기·줄 판정·차례 계산 같은 순수 함수만 둔다.
 */
export interface BingoMove {label:string;seated:string;pose:Pose}
export const BINGO_MOVES:readonly BingoMove[]=[
 {label:'팔 벌려 높이 뛰기 5번',seated:'두 팔 위로 쭉 뻗기 5번',pose:'jump'},
 {label:'무릎 굽혔다 펴기 5번',seated:'발 구르기 10번',pose:'squat'},
 {label:'한 발로 5초 서기',seated:'한 발 들고 5초',pose:'oneLeg'},
 {label:'제자리 달리기 10초',seated:'앉아서 팔 빠르게 흔들기 10초',pose:'run'},
 {label:'손뼉 치며 한 바퀴 돌기',seated:'머리 위로 손뼉 5번',pose:'clap'},
 {label:'옆으로 두 걸음 갔다 오기',seated:'몸을 옆으로 기울였다 오기 4번',pose:'stepRight'},
 {label:'허공 펀치 10번',seated:'허공 펀치 10번',pose:'punch'},
 {label:'얼음 자세 5초',seated:'얼음 자세 5초',pose:'freeze'},
 {label:'팔 크게 원 그리기 5번',seated:'팔 크게 원 그리기 5번',pose:'armsSide'},
];
/** 체육 지식 칸에 쓰는 문제(객관식만: 손을 들어 보기 중 하나를 골라요). */
export const BINGO_QUIZ=EXAMPLE_QUESTIONS.filter(q=>q.wrong.length>=2);
export const BOARD_CELLS=9,QUIZ_CELLS=3,BINGO_BONUS=2;
/** 3×3 판의 줄: 가로 3, 세로 3, 대각선 2. */
export const LINES_3X3:readonly (readonly [number,number,number])[]=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export type BingoCellKind='move'|'quiz';
export interface MoveBingoCell {
 index:number;kind:BingoCellKind;
 /** 칸에 보이는 짧은 이름. */ label:string;
 /** 앉아서 하는 동작(동작 칸). */ seated?:string;pose?:Pose;
 /** 문제 칸: 문제·정답·보기(정답 포함, 섞음). */ prompt?:string;answer?:string;choices?:string[];
}

function shuffle<T>(list:readonly T[],rnd:()=>number):T[]{
 const out=[...list];
 for(let k=out.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[out[k],out[j]]=[out[j],out[k]];}
 return out;
}
/** seed와 판 번호가 같으면 늘 같은 판. 동작 6칸 + 문제 3칸(가운데 칸은 늘 동작). */
export function buildMoveBoard(seed:number,boardNo=0):MoveBingoCell[]{
 const rnd=seededRandom(seed*97+boardNo*7919+11);
 const moves=shuffle(BINGO_MOVES,rnd).slice(0,BOARD_CELLS-QUIZ_CELLS);
 const quiz=shuffle(BINGO_QUIZ,rnd).slice(0,QUIZ_CELLS);
 const quizSlots=new Set(shuffle([0,1,2,3,5,6,7,8],rnd).slice(0,QUIZ_CELLS));
 let m=0,q=0;
 return Array.from({length:BOARD_CELLS},(_,index):MoveBingoCell=>{
  if(quizSlots.has(index)&&quiz[q]){
   const item=quiz[q++];
   const choices=shuffle([item.answer,...item.wrong.slice(0,2)],rnd);
   return {index,kind:'quiz',label:'❓ 체육 지식',prompt:item.prompt,answer:item.answer,choices};
  }
  const mv=moves[m++];
  return {index,kind:'move',label:mv.label,seated:mv.seated,pose:mv.pose};
 });
}

/** 칸 주인: 팀 번호 또는 null(빈칸). */
export type Owners=readonly (number|null)[];
export const emptyOwners=():(number|null)[]=>Array(BOARD_CELLS).fill(null);
/** 그 팀이 다 차지한 줄 수. */
export function linesOf(owners:Owners,team:number):number{
 return LINES_3X3.filter(line=>line.every(i=>owners[i]===team)).length;
}
/** team이 cell을 차지하면 새로 생기는 빙고 줄 수(이미 찬 칸이면 0). */
export function newLinesIfClaimed(owners:Owners,cell:number,team:number):number{
 if(cell<0||cell>=BOARD_CELLS||owners[cell]!==null)return 0;
 const next=owners.map((v,i)=>i===cell?team:v);
 return linesOf(next,team)-linesOf(owners,team);
}
/** 칸을 차지했을 때 줄 점수: 칸 1점 + 새 빙고 줄마다 보너스. */
export const claimPoints=(owners:Owners,cell:number,team:number)=>1+BINGO_BONUS*newLinesIfClaimed(owners,cell,team);
export const boardFull=(owners:Owners)=>owners.every(v=>v!==null);
/** 차례: 차지하거나 넘긴 횟수(turns)를 팀 수로 나눈 나머지. */
/**
 * 점수는 칸 차지로만: 칸을 차지할 때 화면이 tag:'cell'을 붙여 보낸다. 점수판 ±·'모든 팀 +1'·키보드·리모컨 점수는
 * 칸과 어긋나므로 받지 않는다(빙고에서는 점수판에 ± 버튼을 두지 않는다).
 */
export function moveBingoGate(_s:FunState,cmd:FunCommand):FunCommand|null{
 if(cmd.type==='scoreAll')return null;
 if(cmd.type==='score'&&cmd.tag!=='cell')return null;
 return cmd;
}
/** 칸 힌트: 이 칸을 차지하면 우리 팀 빙고(win), 상대 팀이 차지하면 빙고라 막아야 함(block). */
export function cellHints(owners:Owners,team:number,teams:number):('win'|'block'|null)[]{
 return owners.map((o,cell)=>{
  if(o!==null)return null;
  if(newLinesIfClaimed(owners,cell,team)>0)return 'win';
  for(let t=0;t<teams;t++)if(t!==team&&newLinesIfClaimed(owners,cell,t)>0)return 'block';
  return null;
 });
}
export const turnTeam=(turns:number,teams:number)=>((turns%Math.max(1,teams))+Math.max(1,teams))%Math.max(1,teams);

export function moveBingoCue(ctx:SignatureCueContext):SignatureCue{
 if(ctx.phase==='tutorial'){
  return ctx.index%2===0
   ?{text:'지금 칸 하나를 골라요!',sub:'연습 판이에요. 칸을 누르고 동작을 해 본 뒤 ‘성공’을 눌러요',icon:'🎯',move:'칸 고르기',pose:'point',scorable:false}
   :{text:'한 줄이면 빙고!',sub:'가로·세로·대각선 세 칸을 한 팀이 모두 차지하면 보너스 +2',icon:'✨',tone:'calm',pose:'armsUp',scorable:false};
 }
 const climax=ctx.phase==='climax';
 return {
  text:climax?'마지막 승부! 빙고를 노려요':'칸을 골라 동작을 해내요!',
  sub:`해내면 그 칸은 우리 팀 것 · 한 줄이면 빙고 +${BINGO_BONUS}${ctx.reversed?' · 🔄 거꾸로! 이번에는 상대 팀이 칸을 골라 줘요':''}`,
  icon:climax?'🏁':'🎯',tone:climax?'gold':undefined,move:'칸 차지하기',pose:'point',scorable:false,
 };
}

export const moveBingo=defineSignatureGame({
 id:'sig-move-bingo',ready:true,
 name:'몸 빙고',emoji:'🎯',
 oneLine:'3×3 동작판에서 팀이 차례로 칸을 골라 동작을 해내면 그 칸을 차지해요. 한 줄을 모두 차지하면 빙고예요!',
 rules:['차례인 팀이 판에서 칸 하나를 골라요(동작 칸 또는 ❓ 체육 지식 칸).','동작을 모두 해내거나 문제를 맞히면 선생님이 ‘성공’을 눌러 그 칸을 차지해요.','가로·세로·대각선 한 줄을 차지하면 빙고 +2! 시간이 끝나면 점수가 많은 팀이 우승.'],
 concept:'민첩성',
 reflection:'우리 팀은 빙고를 만들려고 어떤 칸을 먼저 골랐나요? 그 까닭은?',
 nextChallenge:'다음에는 상대 팀의 줄을 막으면서 우리 줄을 만들어 봐요.',
 scoringHint:'칸 차지 +1 · 빙고 줄 +2 · 판이 다 차면 새 판',
 seatedNote:'동작 칸을 앉아서 하는 동작으로 바꿔서 해요.',
 demo:[
  {pose:'point',caption:'차례인 팀이 칸 하나를 골라요'},{pose:'jump',caption:'칸의 동작을 팀이 함께 해내요'},
  {pose:'armsUp',caption:'해내면 그 칸을 차지! ❓ 칸은 문제를 맞혀요'},{pose:'clap',caption:'한 줄을 모두 차지하면 빙고!'},
 ],
 timing:{demo:10,tutorial:30,play:150,climax:45,cueSeconds:10},
 teamsDefault:2,teamsMin:2,
 mergedFrom:['phone-play-105'],
 cue:moveBingoCue,
 commandGate:moveBingoGate,
 // 차례로 칸을 고르는 놀이라 신호 속도('빨리빨리')는 의미가 없다.
 surprises:{play:['golden','reverse','freeze'],climax:['golden','reverse']},
 domain:'운동',subCategory:'민첩·전략 대표 게임',
 achievement:{code:'연계 확인 필요',title:'여러 가지 기본 움직임과 체육 지식',desc:'여러 가지 기본 움직임을 해 보고 체육 활동에 필요한 지식을 익힌다.'},
 spaces:['교실','체육관','다목적실','운동장'],minutes:6,players:{min:4,max:30},intensity:'보통',
 safetyTips:['뛰는 동작 전에 팀원끼리 팔 간격을 벌려요.','한 발 서기는 벽이나 친구 어깨를 짚어도 돼요.'],
 teachingTips:['차례인 팀이 의논해서 칸을 고르게 해 주세요. 선생님은 그 칸을 눌러 보여 주면 돼요.','❓ 칸은 팀이 손을 들어 보기 하나를 고른 뒤 ‘정답 보기’를 눌러 확인해요.',`${TEAM_NAMES[0]}·${TEAM_NAMES[1]}이 번갈아 하며, 못 하면 ‘넘기기’로 차례를 넘겨요.`],
});
