import {TEAM_NAMES,seededRandom,type FunCommand,type FunState} from '../funLoop.js';
import {defineSignatureGame} from './define.js';
import type {SignatureCue,SignatureCueContext} from './types.js';

/**
 * 표현 무대: 모둠마다 장면 카드를 뽑아 45초 동안 함께 준비하고, 차례로 20초씩 무대에서 보여 준다.
 * 관객은 👏(박수)·😮(놀라움)·😂(웃음) 버튼으로 응원하고, 누를 때마다 발표하는 모둠 점수가 +1.
 * 모든 모둠이 발표하면 커튼콜(마지막 승부)로 넘어가 모둠마다 한 번씩 가장 멋진 장면으로 인사한다.
 * 커튼콜은 점수를 세지 않는다(모둠마다 똑같이 한 번씩 인사하므로 순서에 따라 응원 기회가 달라지지 않게).
 * 무성 영화(029)·느린 장면(032)·한 장면 릴레이 극장·세 장면 뮤지컬을 한 판으로 합쳤다.
 */
export interface SceneCard {id:string;emoji:string;title:string;hint:string}
/** 장면 카드: 모두가 웃으며 할 수 있는 따뜻한 장면만. 누군가를 놀리거나 부끄럽게 하는 장면은 넣지 않는다. */
export const SCENE_CARDS:readonly SceneCard[]=[
 {id:'lost',emoji:'🎡',title:'놀이공원에서 길을 잃었어요',hint:'두리번 → 친구들이 손짓 → 다시 만나 꼭 안아요'},
 {id:'puppy',emoji:'🐶',title:'강아지가 공을 물고 도망가요',hint:'공 던지기 → 강아지가 물고 달아나요 → 살금살금 다가가 되찾기'},
 {id:'rain',emoji:'🌧️',title:'소풍날 갑자기 비가 와요',hint:'신나게 도시락 → 후두둑 비 → 함께 우산 쓰고 웃기'},
 {id:'party',emoji:'🎂',title:'친구 생일 깜짝 파티를 준비해요',hint:'몰래 풍선 달기 → 쉿! 숨기 → “생일 축하해!”'},
 {id:'moon',emoji:'🚀',title:'우주선이 처음으로 달에 내려요',hint:'3·2·1 발사 → 둥실둥실 우주 → 달에 깃발 꽂기'},
 {id:'sandcastle',emoji:'🏖️',title:'바닷가에서 모래성을 쌓아요',hint:'모래 퍼 담기 → 파도가 철썩 → 다 같이 다시 쌓기'},
 {id:'penguin',emoji:'🐧',title:'펭귄 가족이 얼음 위를 걸어요',hint:'뒤뚱뒤뚱 걷기 → 미끄덩! → 서로 잡아 주며 일어나기'},
 {id:'seed',emoji:'🌱',title:'작은 씨앗이 큰 나무로 자라요',hint:'웅크린 씨앗 → 싹이 쏙 → 팔을 활짝 큰 나무'},
 {id:'bus',emoji:'🚌',title:'버스가 덜컹덜컹 산길을 올라가요',hint:'줄 서서 타기 → 덜컹덜컹 흔들 → 꼭대기에서 “와!”'},
 {id:'zoo',emoji:'🦁',title:'동물원 친구들이 아침 체조를 해요',hint:'하품하며 일어나기 → 사자·기린·토끼 체조 → 다 같이 만세'},
 {id:'cook',emoji:'🍳',title:'요리사들이 비빔밥을 만들어요',hint:'채소 썰기 → 쓱쓱 비비기 → “맛있다!” 엄지 척'},
 {id:'balloon',emoji:'🎈',title:'풍선을 들고 하늘로 둥실 떠올라요',hint:'풍선 꼭 잡기 → 발이 둥실 → 구름 사이로 손 흔들기'},
];
export type Reaction='clap'|'wow'|'laugh';
export const REACTIONS:readonly {id:Reaction;emoji:string;label:string}[]=[
 {id:'clap',emoji:'👏',label:'박수'},{id:'wow',emoji:'😮',label:'놀라워요'},{id:'laugh',emoji:'😂',label:'재밌어요'},
];
/** 본게임: 처음 신호 9개(45초)는 모든 모둠이 동시에 준비, 그다음 모둠마다 신호 4개(20초)씩 발표. */
export const PREP_CUES=9,PERFORM_CUES=4;
export type StageSlot=
 |{kind:'prep';cuesLeft:number}
 |{kind:'perform';group:number;cuesLeft:number}
 |{kind:'done'};
/** 본게임의 신호 번호로 지금 무엇을 하는지 알아낸다. 모든 모둠이 발표하면 done(모듈이 커튼콜로 넘긴다). */
export function stageSlot(index:number,teams:number):StageSlot{
 const i=Math.max(0,index);
 if(i<PREP_CUES)return {kind:'prep',cuesLeft:PREP_CUES-i};
 const k=i-PREP_CUES,group=Math.floor(k/PERFORM_CUES);
 if(group>=teams)return {kind:'done'};
 return {kind:'perform',group,cuesLeft:PERFORM_CUES-k%PERFORM_CUES};
}
/** 본게임이 끝나는 신호 번호(이 번호가 되면 모든 모둠이 발표를 마친 것). */
export const stageEndIndex=(teams:number)=>PREP_CUES+teams*PERFORM_CUES;
/** 모둠마다 다른 장면 카드. 같은 seed면 같은 카드(새로고침·리모컨에도 같은 화면). */
export function scenesFor(seed:number,teams:number):SceneCard[]{
 const rnd=seededRandom(seed*7919+101);
 const order=SCENE_CARDS.map((_,k)=>k);
 for(let k=order.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[order[k],order[j]]=[order[j],order[k]];}
 return order.slice(0,Math.max(0,teams)).map(k=>SCENE_CARDS[k]);
}
/** 커튼콜(마지막 승부): 첫 신호는 안내, 그다음 모둠마다 한 번씩 인사. 모두 인사하면 null(다 함께 인사). */
export function curtainGroup(index:number,teams:number):number|null{
 if(index<=0||teams<1||index>teams)return null;
 return index-1;
}
/** 관객 반응 집계: counts[모둠][반응 순서]. 반응 한 번 = 발표하는 모둠 점수 +1. */
export type ReactionCounts=number[][];
export const emptyReactions=(teams:number):ReactionCounts=>Array.from({length:teams},()=>REACTIONS.map(()=>0));
export function addReaction(counts:ReactionCounts,group:number,reaction:Reaction):{counts:ReactionCounts;command:{type:'score';team:number;delta:1}}|null{
 const r=REACTIONS.findIndex(x=>x.id===reaction);
 if(r<0||!Number.isInteger(group)||group<0||group>=counts.length)return null;
 return {counts:counts.map((row,g)=>g===group?row.map((v,k)=>k===r?v+1:v):row),command:{type:'score',team:group,delta:1}};
}
/** 반응을 가장 많이 받은 모둠(동점이면 모두). 반응이 하나도 없으면 빈 배열. */
export function bestGroups(counts:ReactionCounts):number[]{
 const totals=counts.map(row=>row.reduce((a,b)=>a+b,0)),max=Math.max(0,...totals);
 return max>0?totals.map((t,g)=>t===max?g:-1).filter(g=>g>=0):[];
}
/**
 * 결과 표의 한 줄: 반응 종류별 수, 선생님이 팀 버튼으로 더하거나 뺀 점수, 합계(=팀 응원 점수).
 * 우승 팀·'가장 많은 응원'·표 합계가 모두 팀 점수 하나에서 나오므로 서로 어긋나지 않는다.
 */
export function stageTally(counts:ReactionCounts,scores:readonly number[]):{group:number;reactions:number[];teacher:number;total:number}[]{
 return scores.map((total,g)=>{const reactions=counts[g]??REACTIONS.map(()=>0);const sum=reactions.reduce((a,b)=>a+b,0);return {group:g,reactions,teacher:total-sum,total};});
}
/** 응원 점수가 가장 높은 모둠(동점이면 모두). 모두 0이면 빈 배열. */
export function bestByScore(scores:readonly number[]):number[]{
 const max=Math.max(0,...scores);
 return max>0?scores.map((v,g)=>v===max?g:-1).filter(g=>g>=0):[];
}
/** 지금 반응 버튼을 누르면 점수를 받을 모둠(없으면 null). 커튼콜은 점수를 세지 않는다. */
export function reactionTarget(ctx:Pick<SignatureCueContext,'phase'|'index'|'teams'>):number|null{
 if(ctx.phase==='play'){const s=stageSlot(ctx.index,ctx.teams);return s.kind==='perform'?s.group:null;}
 if(ctx.phase==='climax')return null;
 if(ctx.phase==='tutorial')return ctx.index>=2?0:null;
 return null;
}

const teamName=(teams:number,g:number)=>teams===1?'우리 반':TEAM_NAMES[g];
/** 커튼콜에는 더하는 점수를 받지 않는다(모둠마다 한 번씩 인사하므로 점수에 영향이 없어야 공평하다). */
export function stageShowGate(s:FunState,cmd:FunCommand):FunCommand|null{
 if(s.phase!=='climax')return cmd;
 if((cmd.type==='score'||cmd.type==='scoreAll')&&cmd.delta>0)return null;
 if(cmd.type==='combo'&&cmd.delta>0)return null;
 return cmd;
}
export function stageShowCue(ctx:SignatureCueContext):SignatureCue{
 const scenes=scenesFor(ctx.seed,ctx.teams);
 if(ctx.phase==='tutorial'){
  const steps:SignatureCue[]=[
   {text:'지금 모둠끼리 모여요',sub:'무대(앞쪽)와 관객석을 정해요. 관객은 무대를 보고 앉아요',icon:'🎭',tone:'calm',pose:'wave',scorable:false},
   {text:'지금 첫 자세 정하기!',sub:'장면 카드를 받으면 시작 자세 → 가운데 → 끝 자세 3장면을 정해요',icon:'🎴',tone:'calm',pose:'armsSide',scorable:false},
   {text:'지금 관객 연습: 👏 눌러 보기!',sub:'발표가 끝나면 관객이 반응 버튼으로 응원해요(연습 점수는 본게임에서 0부터)',icon:'👏',tone:'go',pose:'clap',move:'관객 응원'},
  ];
  return steps[Math.max(0,ctx.index)%steps.length];
 }
 if(ctx.phase==='climax'){
  const g=curtainGroup(ctx.index,ctx.teams);
  if(g===null)return ctx.index<=0
   ?{text:'🎬 커튼콜!',sub:'모둠마다 한 번씩, 자기 장면에서 가장 멋진 순간으로 인사해요 (점수는 세지 않아요)',icon:'🎬',tone:'gold',pose:'armsUp',scorable:false}
   :{text:'🎉 다 같이 인사!',sub:'모든 모둠이 손잡고 함께 인사해요. 서로에게 큰 박수!',icon:'👏',tone:'gold',pose:'armsUp',scorable:false};
  const sc=scenes[g];
  return {text:`${teamName(ctx.teams,g)} 인사!`,sub:`${sc.emoji} ${sc.title} · 가장 멋진 순간에서 얼음! 관객은 큰 박수`,icon:sc.emoji,tone:'gold',pose:'freeze',move:sc.title,scorable:false};
 }
 const slot=stageSlot(ctx.index,ctx.teams);
 if(slot.kind==='prep'){
  const sec=slot.cuesLeft*ctx.state.timing.cueSeconds;
  return {text:ctx.index===0?'장면 카드 뽑기!':`모둠별 준비 · ${sec}초`,sub:ctx.index===0?'모둠마다 다른 장면 카드를 받아요. 시작 → 가운데 → 끝 3장면을 함께 정해요':'말 대신 몸과 표정으로! 시작 자세와 끝 자세를 꼭 정해요',icon:'🎴',tone:'calm',pose:'armsSide',scorable:false};
 }
 if(slot.kind==='done')return {text:'모든 모둠 발표 끝!',sub:'커튼콜로 넘어가요',icon:'🎬',tone:'calm',pose:'armsUp',scorable:false};
 const sc=scenes[slot.group];
 const reverse=ctx.reversed?' · 🔄 거꾸로! 끝 장면부터 거꾸로 보여 줘요':'';
 return {text:`${teamName(ctx.teams,slot.group)} 무대!`,sub:`${sc.emoji} ${sc.title} · 관객은 👏 😮 😂 버튼으로 응원해요${reverse}`,icon:sc.emoji,tone:'go',pose:'wave',move:sc.title};
}

export const stageShow=defineSignatureGame({
 id:'sig-stage-show',ready:true,
 name:'표현 무대',emoji:'🎭',
 oneLine:'장면 카드를 뽑아 모둠이 45초 준비하고, 차례로 20초씩 몸으로 보여 줘요. 관객은 반응 버튼으로 응원해요!',
 rules:['모둠마다 장면 카드를 받아 시작 → 가운데 → 끝 3장면을 45초 동안 함께 정해요.','차례가 되면 20초 동안 말 대신 몸과 표정으로 보여 주고, 관객은 👏 😮 😂 버튼으로 응원해요.','모든 모둠이 발표하면 모둠마다 한 번씩 커튼콜 인사(점수 없음)! 가장 많은 응원을 받은 장면을 발표해요.'],
 concept:'움직임 표현',
 reflection:'친구 모둠의 장면에서 어떤 몸짓이 가장 잘 보였나요? 우리 모둠은 무엇을 더 크게 보여 주면 좋을까요?',
 nextChallenge:'다음에는 장면 사이를 멈춤 없이 이어서, 처음부터 끝까지 한 번에 보여 줘요.',
 scoringHint:'발표 중에 관객이 반응 버튼을 누를 때마다 그 모둠 +1 · 선생님도 팀 버튼으로 더할 수 있어요',
 scoreLabel:'응원',
 seatedNote:'의자에 앉은 채로 상체·팔·손·표정만 써서 장면을 보여 줘요.',
 demo:[
  {pose:'stand',caption:'모둠마다 장면 카드를 받아요 🎴'},
  {pose:'armsSide',caption:'45초 동안 시작 → 가운데 → 끝 자세를 정해요'},
  {pose:'wave',caption:'차례가 되면 20초 동안 몸으로 보여 줘요'},
  {pose:'clap',caption:'관객은 👏 😮 😂 버튼으로 응원해요'},
  {pose:'armsUp',caption:'모든 모둠이 끝나면 커튼콜!'},
 ],
 // 본게임은 모둠 4개가 다 발표할 시간(준비 45초 + 20초×4 = 125초)에 여유를 둔다. 모든 모둠이 발표하면 커튼콜로 바로 넘어간다.
 timing:{demo:12,tutorial:24,play:135,climax:35,cueSeconds:5},
 teamsDefault:3,teamsMin:2,
 mergedFrom:['phone-play-029','phone-play-032','story_drama_relay','musical_scene_maker'],
 cue:stageShowCue,
 // 발표 시간이 신호 간격에 묶여 있어 '빨리빨리'는 모둠 발표를 반으로 줄인다.
 // 응원 한 번 = 1점이라 '황금 신호'(2배)도 쓰지 않는다(응원 수와 점수가 같게).
 // 커튼콜은 점수를 세지 않아 깜짝 이벤트도 쓰지 않는다.
 surprises:{play:['reverse','freeze'],climax:[]},
 // 커튼콜(마지막 승부)은 점수를 세지 않는다: 더하는 점수는 버튼·키보드·리모컨 모두 받지 않는다(빼기 정정은 받음).
 commandGate:stageShowGate,
 // MVP: 우승(가장 많은 응원) 모둠의 장면. 동점이면 함께.
 mvpMove:s=>{const best=bestByScore(s.scores);if(!best.length)return undefined;const scenes=scenesFor(s.seed,s.teams);return best.map(g=>`${teamName(s.teams,g)} 「${scenes[g].title}」`).join(' · ');},
 resultHeadline:s=>{const best=bestByScore(s.scores);if(!best.length)return undefined;const scenes=scenesFor(s.seed,s.teams);return `가장 많은 응원: ${best.map(g=>`${teamName(s.teams,g)} 「${scenes[g].title}」`).join(' · ')}`;},
 domain:'표현',subCategory:'표현 대표 게임',
 achievement:{code:'연계 확인 필요',title:'장면을 몸으로 표현하기',desc:'주어진 장면을 모둠이 함께 구성하고 몸과 표정으로 표현하며, 친구의 표현을 감상하고 응원한다.'},
 grades:['1~2학년','3~4학년군','5~6학년군'],
 spaces:['교실','체육관','다목적실'],minutes:6,players:{min:4,max:30},intensity:'낮음',
 equipment:['교사 화면 1대(TV·전자칠판)','준비물 없음'],
 safetyTips:['무대와 관객석 사이를 넓게 띄워요.','넘어지거나 눕는 장면은 천천히, 바닥을 살핀 뒤에 해요.'],
 teachingTips:['반응 버튼은 선생님이 관객의 박수·놀람·웃음 소리를 듣고 눌러 주세요(학생 대표가 눌러도 좋아요).','점수보다 응원이 목적이에요. 모든 모둠이 한 번 이상 박수를 받도록 이끌어 주세요.'],
});
