import {defineSignatureGame,pickCue} from './define.js';
import type {Pose,SignatureCue,SignatureCueContext} from './types.js';

/**
 * 거울 짝꿍: 반 전체가 짝을 지어 마주 보고, 리더가 움직이면 짝이 거울처럼 따라 한다.
 * '하나 바꾸기!' 신호가 나오면 리더가 몸 한 곳만 바꾸고, 짝이 찾으면 둘이 함께 손을 든다.
 * 선생님은 찾은 짝 수만큼 팀 점수를 더한다. 라운드마다 리더가 바뀌고, 마지막 승부는 '두 군데 바꾸기'.
 * 거울 춤(exp-phone-49)·그림자 인형사·좌우 바꾼 동작 번역(028)을 한 판으로 합쳤다.
 */
export interface MirrorMove {name:string;seated:string;pose:Pose;seatedPose:Pose}
export const MIRROR_MOVES:readonly MirrorMove[]=[
 {name:'팔로 크게 원 그리기',seated:'팔로 크게 원 그리기',pose:'armsSide',seatedPose:'armsSide'},
 {name:'두 팔 위로 쭉',seated:'두 팔 위로 쭉',pose:'armsUp',seatedPose:'armsUp'},
 {name:'손으로 물결 만들기',seated:'손으로 물결 만들기',pose:'wave',seatedPose:'wave'},
 {name:'한 발 들고 균형',seated:'한 손 머리 위에 얹기',pose:'oneLeg',seatedPose:'armsUp'},
 {name:'무릎 굽혔다 펴기',seated:'어깨 으쓱 올렸다 내리기',pose:'squat',seatedPose:'sit'},
 {name:'앞으로 팔 뻗기',seated:'앞으로 팔 뻗기',pose:'armsFront',seatedPose:'armsFront'},
 {name:'손가락으로 하늘 가리키기',seated:'손가락으로 하늘 가리키기',pose:'point',seatedPose:'point'},
 {name:'천천히 손뼉 치기',seated:'천천히 손뼉 치기',pose:'clap',seatedPose:'clap'},
];
/** 리더가 몰래 바꿀 수 있는 곳. 앉아서 할 때는 발 대신 표정을 쓴다. */
export const CHANGE_PARTS:readonly string[]=['손 모양','팔 높이','고개 방향','발 위치','표정'];
export const SEATED_CHANGE_PARTS:readonly string[]=['손 모양','팔 높이','고개 방향','손가락 개수','표정'];

/** 한 라운드 = 신호 4개: 따라 하기 → 계속 따라 하기 → 하나 바꾸기 → 찾기. */
export const STEPS_PER_ROUND=4;
export type MirrorStep='lead'|'keep'|'change'|'find';
const STEP_ORDER:readonly MirrorStep[]=['lead','keep','change','find'];
export type Leader='1번'|'2번';
/** 라운드 번호(본게임과 마지막 승부를 이어서 센다: 마지막 승부도 리더가 계속 번갈아 바뀐다). */
export function mirrorRound(ctx:Pick<SignatureCueContext,'phase'|'index'|'state'>):number{
 const local=Math.floor(Math.max(0,ctx.index)/STEPS_PER_ROUND);
 if(ctx.phase!=='climax')return local;
 // 본게임에서 실제로 보여 준 신호 수로 센다(일찍 넘기거나 '빨리빨리!'로 신호가 빨라져도 리더 교대가 이어진다).
 // 본게임을 건너뛰었으면(연습 판에서 바로 넘김) 0라운드부터.
 const shown=ctx.state.phaseCues.play;
 const playRounds=shown===undefined?0:Math.ceil(shown/STEPS_PER_ROUND);
 return playRounds+local;
}
/** 라운드마다 리더가 바뀐다. 짝수 라운드는 1번, 홀수 라운드는 2번. */
export const leaderFor=(round:number):Leader=>round%2===0?'1번':'2번';
export const followerOf=(leader:Leader):Leader=>leader==='1번'?'2번':'1번';
export const mirrorStep=(index:number):MirrorStep=>STEP_ORDER[Math.max(0,index)%STEPS_PER_ROUND];
/** 마지막 승부는 두 군데를 바꾼다. */
export const changesFor=(phase:SignatureCueContext['phase'])=>phase==='climax'?2:1;

/** 이 라운드의 동작과 바꿀 곳(같은 라운드 안에서는 같은 동작). */
export function roundPlan(ctx:SignatureCueContext):{move:MirrorMove;moveName:string;pose:Pose;parts:string[]}{
 const round=mirrorRound(ctx);
 const at={seed:ctx.seed,phase:'play' as const,index:round};
 const move=pickCue(MIRROR_MOVES,at,3);
 const list=ctx.seated?SEATED_CHANGE_PARTS:CHANGE_PARTS;
 const first=pickCue(list,at,11);
 const second=pickCue(list.filter(p=>p!==first),at,17);
 return {move,moveName:ctx.seated?move.seated:move.name,pose:ctx.seated?move.seatedPose:move.pose,parts:changesFor(ctx.phase)===2?[first,second]:[first]};
}

export function mirrorPairCue(ctx:SignatureCueContext):SignatureCue{
 if(ctx.phase==='tutorial'){
  const steps:SignatureCue[]=[
   {text:'지금 짝과 마주 봐요',sub:'한 사람은 1번, 한 사람은 2번이에요. 팔을 뻗어도 닿지 않게 떨어져요',icon:'👫',tone:'calm',pose:'stand',scorable:false},
   {text:'지금 1번이 천천히 팔 올리기!',sub:'2번은 거울처럼 똑같이 따라 해요. 1번이 오른팔이면 2번은 왼팔!',icon:'🪞',pose:'armsUp',move:'팔 올리기'},
   {text:'지금 하나 바꾸기 연습!',sub:'1번이 손 모양 하나만 몰래 바꿔요. 2번은 어디가 바뀌었는지 찾아요',icon:'🔀',tone:'gold',pose:'wave',move:'하나 바꾸기'},
   {text:'찾았으면 짝과 손 번쩍!',sub:'선생님이 찾은 짝 수만큼 점수를 눌러요(연습이라 본게임에서 0부터)',icon:'🙋',tone:'go',pose:'armsUp',move:'바뀐 곳 찾기'},
  ];
  return steps[Math.max(0,ctx.index)%steps.length];
 }
 const round=mirrorRound(ctx),leader=leaderFor(round),follower=followerOf(leader);
 const plan=roundPlan(ctx),climax=ctx.phase==='climax';
 // 깜짝 '거꾸로!': 따라 하던 사람이 리더가 된다.
 const swapNote=ctx.reversed?` · 🔄 거꾸로! 이번엔 ${follower}이 리더`:'';
 switch(mirrorStep(ctx.index)){
  case 'lead':return {text:`${leader} 리더: ${plan.moveName}!`,sub:`${follower}은 거울처럼 똑같이 따라 해요${climax?' · 마지막 승부: 두 군데 바꾸기!':''}${swapNote}`,icon:'🪞',pose:plan.pose,move:plan.moveName};
  case 'keep':return {text:'거울처럼 똑같이~',sub:`${leader}은 천천히! ${follower}이 따라올 수 있게 움직여요${swapNote}`,icon:'🪞',tone:'calm',pose:plan.pose,move:plan.moveName};
  case 'change':return climax
   ?{text:'두 군데 바꾸기!',sub:`${leader}이 두 곳을 몰래 바꿔요 (예: ${plan.parts.join(' · ')}). ${follower}은 두 곳을 다 찾아요`,icon:'🔀',tone:'gold',pose:plan.pose,move:`${plan.moveName} · 두 군데 바꾸기`}
   :{text:'하나 바꾸기!',sub:`${leader}이 몸 한 곳만 몰래 바꿔요 (예: ${plan.parts[0]})`,icon:'🔀',tone:'gold',pose:plan.pose,move:`${plan.moveName} · 하나 바꾸기`};
  default:return {text:climax?'두 곳 다 찾았나요?':'어디가 바뀌었을까?',sub:'찾은 짝은 함께 손 번쩍! 선생님이 찾은 짝 수만큼 팀 점수를 더해요',icon:'🙋',tone:'go',pose:'armsUp',move:`${plan.moveName} · 바뀐 곳 찾기`};
 }
}

export const mirrorPair=defineSignatureGame({
 id:'sig-mirror-pair',ready:true,
 name:'거울 짝꿍',emoji:'🪞',
 oneLine:'짝이 거울처럼 따라 하다가 ‘하나 바꾸기!’가 나오면 바뀐 곳을 찾아요.',
 rules:['짝과 마주 보고, 리더가 움직이면 짝이 거울처럼 똑같이 따라 해요.','‘하나 바꾸기!’가 나오면 리더가 몸 한 곳만 바꾸고, 짝이 찾으면 둘이 손을 번쩍 들어요.','라운드마다 리더가 바뀌어요. 마지막 승부는 두 군데 바꾸기! 끝나면 결과 발표.'],
 concept:'관찰과 협응',
 reflection:'짝이 바꾼 곳을 어떻게 알아챘나요? 거울처럼 따라 하기가 쉬웠던 동작은 무엇이었나요?',
 nextChallenge:'다음에는 더 작은 곳(손가락·표정)을 바꿔서 짝이 찾을 수 있는지 도전해 봐요.',
 scoringHint:'‘어디가 바뀌었을까?’ 때 손 든 짝 수만큼 그 팀 +1 · 빠른 셈 버튼(+3·+5)도 써요',
 scoreLabel:'찾은 짝',
 seatedNote:'의자에 앉아 마주 보고, 다리 대신 팔·손·고개·표정만 써요.',
 demo:[
  {pose:'stand',caption:'짝과 마주 봐요 (1번·2번)'},
  {pose:'armsUp',caption:'1번이 팔을 올리면 2번도 거울처럼!'},
  {pose:'wave',caption:'‘하나 바꾸기!’ → 1번이 손 모양만 몰래 바꿔요'},
  {pose:'point',caption:'2번이 바뀐 곳을 찾아요'},
  {pose:'armsUp',caption:'찾았으면 둘이 함께 손 번쩍! 다음 라운드는 2번이 리더'},
 ],
 timing:{demo:12,tutorial:32,play:120,climax:40,cueSeconds:5},
 teamsDefault:2,teamsMin:1,
 mergedFrom:['exp-phone-49','shadow_puppeteer','phone-play-028'],
 cue:mirrorPairCue,
 // '천천히 따라 하기'가 규칙이라 '빨리빨리'는 쓰지 않는다.
 surprises:{play:['golden','reverse','freeze'],climax:['golden','reverse']},
 domain:'표현',subCategory:'표현 대표 게임',
 achievement:{code:'연계 확인 필요',title:'거울처럼 따라 하며 움직임 표현하기',desc:'짝의 움직임을 관찰하고 거울처럼 따라 하며 몸의 여러 부분으로 움직임을 표현한다.'},
 grades:['1~2학년','3~4학년군','5~6학년군'],
 spaces:['교실','체육관','다목적실'],minutes:5,players:{min:2,max:30},intensity:'낮음',
 safetyTips:['짝과 팔을 뻗어도 닿지 않을 만큼 떨어져 마주 봐요.','발을 바꿀 때는 제자리에서 천천히 움직여요.'],
 teachingTips:['처음에는 큰 동작으로, 익숙해지면 손가락·표정처럼 작은 곳을 바꾸게 해 주세요.','짝 수가 홀수면 세 명이 한 모둠이 되어 리더를 차례로 맡아요.'],
});
