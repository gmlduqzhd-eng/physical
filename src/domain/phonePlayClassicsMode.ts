import type {PhonePlay} from './phonePlayCatalog.js';

/**
 * 2026-11에 더한 놀이 101~106의 진행 규칙.
 * - 쉬운 방법은 놀이마다 정해 둔 신호를 쓴다(앞 신호 두 개만 자르지 않는다).
 * - 숫자 모둠 만들기는 함께하는 인원보다 큰 모둠 신호를 내지 않는다.
 * - 반 전체 진행에서는 과제 동안 신호가 바뀐다. 숫자·구석은 무작위(고를 것이 둘뿐이면 두 번까지만 이어짐), 여우는 같은 시간이 바로 이어지지 않고,
 *   '밥 먹을 시간'이 예측되지 않게 섞이되 3과제 시간 안에 꼭 나오며, 출발선으로 돌아가는 신호를 넣는다.
 * - 숫자 모둠 만들기는 쉬운 방법·인원에 맞춰 과제 제목과 자리별 동작도 바꾼다(adaptClassicPlay).
 */
export const CLASSIC_IDS:ReadonlySet<string>=new Set(['phone-play-101','phone-play-102','phone-play-103','phone-play-104','phone-play-105','phone-play-106']);
export const isClassicPlay=(id:string)=>CLASSIC_IDS.has(id);

const EGG='알: 두 손을 동그랗게 모으고 걷기',CHICK='병아리: 팔꿈치 날개로 걷기';
const PAIR='둘이 모여 다리 모양',WAVE='모두 제자리에서 손 흔들기';
/** 쉬운 방법 신호(과제마다). 놀이 설명의 '쉬운 방법'과 같은 내용이다. */
export const CLASSIC_EASY_CUES:Readonly<Record<string,[string[],string[],string[]]>>={
 'phone-play-101':[[PAIR,WAVE],[PAIR,WAVE],[PAIR,WAVE]],
 'phone-play-104':[[EGG,CHICK],[EGG,CHICK],[EGG,CHICK]],
};
/** 반 전체 진행을 시작할 때 화면에 보이는 준비 안내. */
export const CLASSIC_CLASS_BRIEF:Readonly<Record<string,string>>={
 'phone-play-101':'넓게 흩어져 서요. 숫자가 나오면 걸어서 모여요',
 'phone-play-102':'출발선에 서고, 여우 역할을 정해요',
 'phone-play-103':'술래를 정하고, 모두 걷기만 해요',
 'phone-play-104':'모두 알 자세로 흩어져 서요',
 'phone-play-105':'모둠끼리 떨어져 서요. 빙고판 한 줄을 함께 지워요',
 'phone-play-106':'교실 네 구석 번호(1·2·3·4)를 먼저 확인해요',
};

const GROUP_WORDS:Readonly<Record<string,number>>={둘:2,셋:3,넷:4};
const GROUP_CUES:Readonly<Record<number,string>>={2:PAIR,3:'셋이 모여 세모 모양',4:'넷이 모여 네모 모양'};
/** '셋이 모여 …'처럼 모둠 크기가 있는 신호면 그 크기. 없으면 0. */
export function groupSizeOf(cue:string){const word=Object.keys(GROUP_WORDS).find(w=>cue.startsWith(w+'이'));return word?GROUP_WORDS[word]:0;}
/** 함께하는 인원으로 만들 수 있는 가장 큰 모둠(2~4). 반 전체는 Infinity를 넘긴다. */
export const maxGroupOf=(players:number)=>Math.min(4,Math.max(2,players));
/**
 * 숫자 모둠 만들기에서 함께하는 인원보다 큰 모둠 신호는 만들 수 있는 가장 큰 모둠 신호로 바꾼다.
 * (셋이 함께하면 '넷' 대신 '셋'을 내서, 세 명 중 한 명이 늘 남지 않게 한다.)
 */
export function fitGroupCues(play:Pick<PhonePlay,'id'>,cues:readonly string[],players:number):string[]{
 if(play.id!=='phone-play-101')return [...cues];
 const max=maxGroupOf(players),out:string[]=[];
 for(const c of cues){const fitted=groupSizeOf(c)>max?GROUP_CUES[max]:c;if(!out.includes(fitted))out.push(fitted);}
 return out.length?out:[PAIR];
}
type Three=[string,string,string];
/** 숫자 모둠 만들기의 과제 제목과 함께하는 동작. 쉬운 방법·인원에 따라 실제 신호와 같은 말을 쓴다. */
const GROUP_TEXT:Readonly<Record<2|3|4,{rounds:Three;motions:Three}>>={
 2:{rounds:['둘 모둠을 만들어요','둘 모둠으로 다리 모양을 만들어요','신호가 바뀌어도 서로 불러 모두 들어가요'],motions:['둘이 모여 다리 모양 만들기','둘이 모여 다리 모양 · 신호가 바뀌면 손 흔들기','남은 친구를 불러 함께 다리 모양 만들기']},
 3:{rounds:['둘·셋 모둠을 만들어요','셋 모둠으로 모양을 만들어요','숫자가 바뀌어도 서로 불러 모두 들어가요'],motions:['둘·셋이 모여 다리·세모 모양 만들기','셋이 모여 세모 모양 만들기','남은 친구를 불러 함께 모양 만들기']},
 4:{rounds:['둘·셋 모둠을 만들어요','넷 모둠으로 모양을 만들어요','숫자가 바뀌어도 서로 불러 모두 들어가요'],motions:['둘·셋이 모여 다리·세모 모양 만들기','넷이 모여 네모 모양 만들기','남은 친구를 불러 함께 모양 만들기']},
};
/**
 * 화면에 보일 놀이 정보를 쉬운 방법과 인원에 맞춘다. 지금은 숫자 모둠 만들기(101)만 바뀐다.
 * players는 함께하는 인원(반 전체 진행은 Infinity). 과제 제목·자리별 동작·신호가 서로 같은 모둠 크기를 말하게 한다.
 */
export function adaptClassicPlay<T extends PhonePlay>(play:T,easy:boolean,players:number):T{
 if(play.id!=='phone-play-101')return play;
 const size=(easy?2:maxGroupOf(players)) as 2|3|4,text=GROUP_TEXT[size];
 const roundCues=play.roundCues?play.roundCues.map(cues=>fitGroupCues(play,cues,size)) as [string[],string[],string[]]:undefined;
 return {...play,rounds:[...text.rounds],teamMotions:[...text.motions] as Three,...(roundCues?{roundCues}:{})};
}

/** 같은 씨앗이면 같은 순서가 나오는 난수. 화면이 다시 그려져도 신호 순서가 바뀌지 않게 한다. */
export function seededRandom(seed:number){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/**
 * 같은 신호가 바로 이어지지 않게 고른다. 고를 것이 둘뿐이면 A·B·A·B로 뻔해지지 않게
 * 같은 신호가 두 번까지는 이어질 수 있게 하고, 세 번 이어지지는 않게 한다.
 */
export function pickVaried<T>(pool:readonly T[],count:number,rng:()=>number):T[]{
 const out:T[]=[];
 for(let i=0;i<count;i++){
  const last=out[i-1],runOfTwo=i>=2&&out[i-2]===last;
  const choices=pool.length>2||(pool.length===2&&runOfTwo)?pool.filter(c=>c!==last):pool;
  out.push(choices[Math.floor(rng()*choices.length)]);
 }
 return out;
}
const HOURS=['한 시: 한 걸음','두 시: 두 걸음','세 시: 세 걸음'],MEAL='밥 먹을 시간! 얼음';
export const FOX_BACK='모두 출발선으로 돌아가요';
/**
 * 여우야 몇 시니: 걸음 수 신호를 섞되 같은 시간이 바로 이어지지 않게 하고, 몇 걸음마다 출발선으로 돌아가게 한다.
 * '밥 먹을 시간'은 일정하지 않은 때에 넣되, 그 과제에서는 화면에 보이는 신호(visible개) 안에 반드시 한 번 나온다.
 */
function foxCues(round:number,easy:boolean,count:number,rng:()=>number,visible:number):string[]{
 const maxHour=easy||round===0?2:3,meal=round>=2,out:string[]=[];
 // 첫 '밥 먹을 시간' 자리: 두 번째 신호부터 화면에 보이는 마지막 신호 사이에서 무작위로 정한다.
 const lastSeen=Math.max(1,Math.min(count,visible)-1),firstMeal=meal?1+Math.floor(rng()*lastSeen):-1;
 let walked=0,sinceMeal=0,lastHour=0,backAt=5+Math.floor(rng()*2);
 while(out.length<count){
  if(out.length===firstMeal||(meal&&out.length>firstMeal&&sinceMeal>=2&&rng()<0.3)){out.push(MEAL);sinceMeal=0;lastHour=0;continue;}
  if(walked>=backAt){out.push(FOX_BACK);walked=0;lastHour=0;backAt=5+Math.floor(rng()*2);continue;}
  const hours=Array.from({length:maxHour},(_,i)=>i+1).filter(h=>h!==lastHour),h=hours[Math.floor(rng()*hours.length)];
  out.push(HOURS[h-1]);walked+=h;sinceMeal++;lastHour=h;
 }
 return out;
}
export const WALK_ONLY='걷기만!',TAG_SWAP='술래 바꾸기!',EVOLVE_CUE='같은 자세 친구를 찾아 가위바위보!';
/** 진화 산책의 단계(과제마다 올라갈 수 있는 곳까지). 화면에 사다리로 고정해 보여 준다. */
export const CLASSIC_LADDER:readonly {name:string;pose:string}[]=[{name:'알',pose:'두 손을 동그랗게 모으고 걷기'},{name:'병아리',pose:'팔꿈치 날개로 걷기'},{name:'닭',pose:'팔을 펴고 무릎 올려 걷기'},{name:'하늘 새',pose:'가장자리에서 응원'}];
export const ladderTop=(round:number,easy:boolean)=>easy?1:Math.min(3,round+1);
/** 움직임 빙고판(3×3). 줄마다 과제 하나. */
export const BINGO_BOARD:readonly (readonly string[])[]=[['제자리 걸음 10번','팔 벌려 별 모양 5번','무릎 손뼉 8번'],['한 발 서기 5초','제자리 걸음 10번','팔 벌려 별 모양 5번'],['무릎 손뼉 8번','한 발 서기 5초','제자리 걸음 10번']];
/** 다 지운 칸(9칸, 줄 순서)으로 빙고가 된 줄 수를 센다(가로·세로·대각선). */
export function bingoLines(done:readonly boolean[]):number{
 const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
 return lines.filter(line=>line.every(i=>done[i])).length;
}
const CORNER_MOVES=['1번 구석: 무릎 올려 걷기 8번','2번 구석: 팔 벌려 별 모양 5번','3번 구석: 한 발 서기 5초','4번 구석: 어깨 돌리기 6번'];
export const CORNER_WALK='구석으로 걸어가요';
function combinations(items:readonly number[],size:number):number[][]{
 if(size===0)return [[]];if(items.length<size)return [];
 const [first,...rest]=items;return [...combinations(rest,size-1).map(c=>[first,...c]),...combinations(rest,size)];
}
/** 네 구석 운동 뽑기: '구석으로 걸어가요' 다음에 뽑힌 구석을 보여 준다. 과제마다 뽑는 구석 수가 1·2·3개로 늘어난다. */
function cornerCues(round:number,easy:boolean,count:number,rng:()=>number,walkSeconds:number):string[]{
 const corners=easy?[0,1]:[0,1,2,3],pickCount=Math.min(corners.length-1,round+1);
 const picks=combinations(corners,pickCount).map(set=>set.map(i=>CORNER_MOVES[i]).join(' · '));
 return pickVaried(picks,Math.ceil(count/2),rng).flatMap(picked=>[`${CORNER_WALK} (${walkSeconds}초)`,picked]).slice(0,count);
}
/**
 * 반 전체 진행에서 한 과제 동안 돌아가며 보여 줄 신호.
 * roundCues는 그 과제에 정해 둔 신호(쉬운 방법이면 쉬운 신호)다. taskSeconds는 과제 시간으로, 꼭 보여야 할 신호의 자리를 정할 때 쓴다.
 */
export function classicClassCues(play:Pick<PhonePlay,'id'>,round:number,level:string,roundCues:readonly string[],seed:number,count=16,cueSeconds=6,taskSeconds=45):string[]{
 const easy=level==='쉬운 방법',rng=seededRandom(seed*31+round*7+1);
 if(play.id==='phone-play-101')return pickVaried(roundCues,count,rng);
 if(play.id==='phone-play-102')return foxCues(round,easy,count,rng,Math.max(1,Math.floor(taskSeconds/Math.max(1,cueSeconds))));
 if(play.id==='phone-play-106')return cornerCues(round,easy,count,rng,Math.round(cueSeconds));
 // 술래: 술래잡기를 끊지 않게 '걷기만!'을 고정하고, 술래가 둘 이상인 과제에서만 술래 바꾸기를 알린다.
 if(play.id==='phone-play-103')return Array.from({length:count},(_,i)=>(round===1&&i%3===2)||(round===2&&i%2===1)?TAG_SWAP:WALK_ONLY);
 // 진화 산책: 자세는 가위바위보 결과로 바뀌므로 화면은 사다리(CLASSIC_LADDER)를 고정해 보여 주고, 신호는 하나로 둔다.
 if(play.id==='phone-play-104')return [`${EVOLVE_CUE} · ${CLASSIC_LADDER[ladderTop(round,easy)].name}까지`];
 // 움직임 빙고: 그 과제의 줄(세 동작)을 보여 주고, 교사가 판에서 다 한 칸을 지운다.
 if(play.id==='phone-play-105')return [`${['첫째','둘째','셋째'][Math.min(2,round)]} 줄을 함께 해요! (${roundCues.length}칸)`];
 return Array.from({length:count},(_,i)=>roundCues[i%roundCues.length]);
}
