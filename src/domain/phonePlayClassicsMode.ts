import type {PhonePlay} from './phonePlayCatalog.js';

/**
 * 2026-11에 더한 놀이 101~106의 진행 규칙.
 * - 쉬운 방법은 놀이마다 정해 둔 신호를 쓴다(앞 신호 두 개만 자르지 않는다).
 * - 숫자 모둠 만들기는 함께하는 인원보다 큰 모둠 신호를 내지 않는다.
 * - 반 전체 진행에서는 과제 동안 신호가 바뀐다. 숫자·구석은 무작위(같은 신호 연속 없음), 여우는 '밥 먹을 시간'이 예측되지 않게 섞고 출발선으로 돌아가는 신호를 넣는다.
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
/** '셋이 모여 …'처럼 모둠 크기가 있는 신호면 그 크기. 없으면 0. */
export function groupSizeOf(cue:string){const word=Object.keys(GROUP_WORDS).find(w=>cue.startsWith(w+'이'));return word?GROUP_WORDS[word]:0;}
/** 숫자 모둠 만들기에서 함께하는 인원보다 큰 모둠 신호를 뺀다. 모두 빠지면 둘 모둠으로 한다. */
export function fitGroupCues(play:Pick<PhonePlay,'id'>,cues:readonly string[],players:number):string[]{
 if(play.id!=='phone-play-101')return [...cues];
 const kept=cues.filter(c=>groupSizeOf(c)<=Math.max(2,players));
 return kept.length?kept:[PAIR];
}

/** 같은 씨앗이면 같은 순서가 나오는 난수. 화면이 다시 그려져도 신호 순서가 바뀌지 않게 한다. */
export function seededRandom(seed:number){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function pickNoRepeat(pool:readonly string[],count:number,rng:()=>number):string[]{
 const out:string[]=[];
 for(let i=0;i<count;i++){const choices=pool.length>1?pool.filter(c=>c!==out[i-1]):pool;out.push(choices[Math.floor(rng()*choices.length)]);}
 return out;
}
const HOURS=['한 시: 한 걸음','두 시: 두 걸음','세 시: 세 걸음'],MEAL='밥 먹을 시간! 얼음';
export const FOX_BACK='모두 출발선으로 돌아가요';
/** 여우야 몇 시니: 걸음 수 신호를 섞고, '밥 먹을 시간'은 일정하지 않은 때에 넣고, 몇 걸음마다 출발선으로 돌아가게 한다. */
function foxCues(round:number,easy:boolean,count:number,rng:()=>number):string[]{
 const maxHour=easy||round===0?2:3,meal=round>=2,out:string[]=[];let walked=0,sinceMeal=0;
 while(out.length<count){
  if(walked>=6){out.push(FOX_BACK);walked=0;sinceMeal=0;continue;}
  if(meal&&sinceMeal>=1&&rng()<0.3){out.push(MEAL);sinceMeal=0;continue;}
  const h=1+Math.floor(rng()*maxHour);out.push(HOURS[h-1]);walked+=h;sinceMeal++;
 }
 return out;
}
const CORNER_MOVES=['1번 구석: 무릎 올려 걷기 8번','2번 구석: 팔 벌려 별 모양 5번','3번 구석: 한 발 서기 5초','4번 구석: 어깨 돌리기 6번'];
export const CORNER_WALK='구석으로 걸어가요';
/** 네 구석 운동 뽑기: '구석으로 걸어가요' 다음에 뽑힌 구석을 보여 준다. 과제마다 뽑는 구석 수가 1·2·3개로 늘어난다. */
function cornerCues(round:number,easy:boolean,count:number,rng:()=>number,walkSeconds:number):string[]{
 const corners=easy?[0,1]:[0,1,2,3],pickCount=Math.min(corners.length-1,round+1),out:string[]=[];let last='';
 while(out.length<count){
  out.push(`${CORNER_WALK} (${walkSeconds}초)`);
  let picked='';
  for(let tries=0;tries<6;tries++){const pool=[...corners],set:number[]=[];while(set.length<pickCount)set.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);picked=set.sort((a,b)=>a-b).map(i=>CORNER_MOVES[i]).join(' · ');if(picked!==last)break;}
  out.push(picked);last=picked;
 }
 return out;
}
/**
 * 반 전체 진행에서 한 과제 동안 돌아가며 보여 줄 신호.
 * roundCues는 그 과제에 정해 둔 신호(쉬운 방법이면 쉬운 신호)다.
 */
export function classicClassCues(play:Pick<PhonePlay,'id'>,round:number,level:string,roundCues:readonly string[],seed:number,count=16,cueSeconds=6):string[]{
 const easy=level==='쉬운 방법',rng=seededRandom(seed*31+round*7+1);
 if(play.id==='phone-play-101')return pickNoRepeat(roundCues,count,rng);
 if(play.id==='phone-play-102')return foxCues(round,easy,count,rng);
 if(play.id==='phone-play-106')return cornerCues(round,easy,count,rng,Math.round(cueSeconds));
 // 술래·진화 산책·움직임 빙고는 그 과제의 신호를 차례로 되풀이한다.
 return Array.from({length:count},(_,i)=>roundCues[i%roundCues.length]);
}
