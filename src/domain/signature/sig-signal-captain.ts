import {defineSignatureGame,pickCue} from './define.js';
import type {Pose,SignatureCue,SignatureCueContext} from './types.js';

/**
 * 신호 대장: 큰 신호에 맞게 움직이고, 라운드마다 규칙 카드가 바뀐다.
 * 출동(001)·새와 나무(011)·신호등(red_green)·숫자 모둠(101)을 한 게임의 규칙 카드로 합쳤다.
 */
export interface RuleCard {id:string;title:string;icon:string;rule:string;seatedRule:string}
export const SIGNAL_CARDS:readonly RuleCard[]=[
 {id:'dispatch',title:'출동 카드',icon:'🚨',rule:'“출동!”이 붙은 말만 따라 해요. 없으면 그대로 멈춰요.',seatedRule:'“출동!”이 붙은 말만 앉은 채로 따라 해요.'},
 {id:'bird-tree',title:'새·나무 카드',icon:'🐦',rule:'새 = 두 팔 벌려 날기 · 나무 = 두 손 모아 위로',seatedRule:'새 = 앉아서 두 팔 벌리기 · 나무 = 두 손 모아 위로'},
 {id:'traffic',title:'신호등 카드',icon:'🚦',rule:'초록 = 제자리 걷기 · 노랑 = 천천히 · 빨강 = 멈춤',seatedRule:'초록 = 앉아서 발 구르기 · 노랑 = 천천히 · 빨강 = 멈춤'},
 {id:'number',title:'숫자 카드',icon:'🔢',rule:'숫자만큼 걸어가 모여서 손을 잡아요.',seatedRule:'숫자만큼 손가락을 펴서 높이 들어요.'},
 {id:'opposite',title:'거꾸로 카드',icon:'🔄',rule:'말과 반대로 움직여요. “위!”면 팔을 아래로!',seatedRule:'말과 반대로 움직여요. “위!”면 팔을 아래로!'},
];
const MOVES:readonly {say:string;pose:Pose;seated:string;opposite:string}[]=[
 {say:'팔 위로',pose:'armsUp',seated:'팔 위로',opposite:'팔 아래로'},
 {say:'손뼉 두 번',pose:'clap',seated:'손뼉 두 번',opposite:'손 무릎에'},
 {say:'한 발 들기',pose:'oneLeg',seated:'한 발 살짝 들기',opposite:'두 발 딛기'},
 {say:'옆으로 한 걸음',pose:'stepRight',seated:'몸을 옆으로 기울이기',opposite:'제자리 그대로'},
 {say:'무릎 살짝 굽히기',pose:'squat',seated:'허리 쭉 펴기',opposite:'쭉 서기'},
 {say:'양팔 옆으로',pose:'armsSide',seated:'양팔 옆으로',opposite:'팔 몸에 붙이기'},
];
const OPPOSITES:readonly {say:string;do:string;pose:Pose}[]=[
 {say:'위!',do:'팔을 아래로',pose:'armsDown'},{say:'아래!',do:'팔을 위로',pose:'armsUp'},
 {say:'크게!',do:'몸을 작게',pose:'squat'},{say:'작게!',do:'몸을 크게',pose:'armsSide'},
 {say:'앞으로!',do:'팔을 뒤로',pose:'armsDown'},{say:'멈춰!',do:'제자리 걷기',pose:'run'},
];
/** 라운드 카드 순서: 연습 판은 출동, 본게임은 6신호마다 카드를 바꾸고, 마지막 승부는 거꾸로. */
export const CARD_EVERY=6,NUMBER_CUE_SECONDS=8;
export function cardFor(ctx:Pick<SignatureCueContext,'phase'|'index'>):RuleCard{
 if(ctx.phase==='tutorial')return SIGNAL_CARDS[0];
 if(ctx.phase==='climax')return SIGNAL_CARDS[4];
 return SIGNAL_CARDS[Math.floor(ctx.index/CARD_EVERY)%4];
}
const isAnnounce=(ctx:SignatureCueContext)=>ctx.phase==='play'&&ctx.index%CARD_EVERY===0||(ctx.phase!=='play'&&ctx.index===0);

export function signalCaptainCue(ctx:SignatureCueContext):SignatureCue{
 const card=cardFor(ctx),rule=ctx.seated?card.seatedRule:card.rule;
 if(isAnnounce(ctx))return {text:`${card.icon} ${card.title}`,sub:rule,tone:'calm',move:card.title,scorable:false};
 const r=(list:readonly unknown[],salt=0)=>pickCue(list,ctx,salt);
 const prefix=ctx.phase==='tutorial'?'지금 ':'';
 let cue:SignatureCue;
 switch(card.id){
  case 'dispatch':{
   const m=r(MOVES) as typeof MOVES[number];
   // 셋 중 하나는 '출동' 없이 나오는 함정 신호.
   const trap=pickCue([false,false,true],ctx,5);
   const move=ctx.seated?m.seated:m.say;
   cue=trap?{text:`${move}!`,sub:'“출동!”이 없어요 → 그대로 멈춰요',move:'함정에서 멈추기',pose:'freeze'}:{text:`${prefix}출동! ${move}!`,sub:rule,move,pose:m.pose};
   break;
  }
  case 'bird-tree':{
   const bird=r([true,false,true,false,false,true]) as boolean;
   cue=bird?{text:`${prefix}새!`,sub:rule,icon:'🐦',move:'새',pose:'armsSide'}:{text:`${prefix}나무!`,sub:rule,icon:'🌳',move:'나무',pose:'armsUp'};
   break;
  }
  case 'traffic':{
   const light=r(['초록','노랑','빨강']) as '초록'|'노랑'|'빨강';
   const map={초록:{tone:'go',icon:'🟢',do:ctx.seated?'발 구르기':'제자리 걷기',pose:'run'},노랑:{tone:'warn',icon:'🟡',do:'천천히',pose:'stand'},빨강:{tone:'stop',icon:'🔴',do:'멈춤',pose:'freeze'}} as const;
   const x=map[light];
   cue={text:`${x.icon} ${light}!`,sub:rule,tone:x.tone,move:`${light} · ${x.do}`,pose:x.pose};
   break;
  }
  case 'number':{
   const n=r([2,3,4,2,3]) as number;
   // 걸어가 모이고 손을 잡을 시간을 준다(8초).
   cue={text:`${n}!`,sub:ctx.seated?`손가락 ${n}개를 높이 들어요`:`${n}명이 걸어가 모여 손을 잡아요`,icon:'👥',move:`${n}명 모이기`,pose:'wave',seconds:NUMBER_CUE_SECONDS};
   break;
  }
  default:{
   const o=r(OPPOSITES) as typeof OPPOSITES[number];
   cue={text:o.say,sub:`반대로 → ${o.do}`,icon:'🔄',move:`${o.say} → ${o.do}`,pose:o.pose};
  }
 }
 // 깜짝 '거꾸로!' 동안에는 반대로 움직인다(거꾸로 카드는 이미 반대라 그대로).
 if(ctx.reversed&&card.id!=='opposite')cue={...cue,sub:'🔄 거꾸로! 신호와 반대로 움직여요'};
 return cue;
}

export const signalCaptain=defineSignatureGame({
 id:'sig-signal-captain',ready:true,
 name:'신호 대장',emoji:'🚨',
 oneLine:'큰 화면의 신호를 보고 몸으로 따라 해요. 라운드마다 규칙 카드가 바뀌어요!',
 rules:['화면에 나오는 신호를 보고 몸으로 따라 해요.','규칙 카드(출동·새와 나무·신호등·숫자·거꾸로)가 바뀌면 새 규칙으로 해요.','틀린 사람이 나온 팀은 −1, 모두 맞힌 팀은 +1. 마지막 승부가 끝나면 우승 팀 발표!'],
 concept:'반응 속도',
 reflection:'어떤 규칙 카드가 가장 헷갈렸나요? 왜 그랬을까요?',
 nextChallenge:'다음에는 신호 간격을 더 짧게 해서 도전해 봐요.',
 scoringHint:'신호마다: 모두 맞힌 팀 +1 · 틀린 사람이 나온 팀 −1',
 seatedNote:'모든 신호를 앉은 채로 팔·손·발 구르기로 바꿔서 해요.',
 demo:[
  {pose:'stand',caption:'화면을 보고 기다려요'},{pose:'armsUp',caption:'“출동! 팔 위로!” → 팔을 번쩍!'},
  {pose:'freeze',caption:'“팔 위로!”(출동 없음) → 그대로 멈춤'},{pose:'armsSide',caption:'“새!” → 두 팔 벌려 날기'},
  {pose:'run',caption:'🟢 초록! → 제자리 걷기'},{pose:'freeze',caption:'🔴 빨강! → 멈춤'},
 ],
 timing:{demo:14,tutorial:30,play:120,climax:40,cueSeconds:4},
 teamsDefault:2,
 mergedFrom:['phone-play-001','phone-play-011','red_green','phone-play-101','exp-tablet-06'],
 cue:signalCaptainCue,
 // 마지막 승부는 '거꾸로 카드'라 깜짝 '거꾸로!'는 아무것도 바꾸지 못한다 → 빼고, 본게임에서만 쓴다.
 surprises:{play:['golden','reverse','freeze','speed'],climax:['golden','speed']},
 domain:'운동',subCategory:'반응·민첩 대표 게임',
 achievement:{code:'[4체01-03]',title:'신호에 반응하는 기본 움직임',desc:'신호에 맞춰 이동·비이동 움직임을 바꾸며 반응한다.'},
 spaces:['교실','체육관','다목적실','운동장'],minutes:5,players:{min:4,max:30},intensity:'보통',
 safetyTips:['옆 친구와 팔을 벌려도 닿지 않게 간격을 벌려요.','숫자 카드에서는 뛰지 말고 걸어서 모여요.'],
 teachingTips:['처음 연습 판에서 점수 버튼을 한 번씩 눌러 보여 주세요(연습 판 점수는 본게임에서 0으로 돌아가요).','틀린 친구를 탈락시키지 말고 팀 점수로만 셉니다.'],
});
