/** 우리 반 원정 지도: 수업을 마칠 때마다 도장을 찍어 일곱 섬을 차례로 건넌다. 이 기기에만 남고 학생 이름은 없다. */
export const JOURNEY_KINDS=[
 {id:'sports',label:'종목 교실',icon:'🏅'},
 {id:'play',label:'신체 놀이',icon:'🤸'},
 {id:'expedition',label:'협동 원정',icon:'🧭'},
 {id:'safety',label:'안전 교실',icon:'🦺'},
 {id:'other',label:'그 밖의 체육 수업',icon:'👟'},
] as const;
export type JourneyKind=typeof JOURNEY_KINDS[number]['id'];
export interface JourneyStamp {kind:JourneyKind;date:string}
export interface JourneyIsland {id:string;name:string;icon:string;value:string;quest:string}

export const STAMPS_PER_ISLAND=4;
export const JOURNEY_ISLANDS:JourneyIsland[]=[
 {id:'challenge',name:'도전의 섬',icon:'⛰️',value:'처음 해 보는 것도 한 번 더 해 봐요',quest:'다 함께 제자리에서 열 번 뛰고, 서로 손뼉을 마주쳐요.'},
 {id:'together',name:'협동의 섬',icon:'🤝',value:'혼자보다 함께할 때 더 멀리 가요',quest:'모둠이 둥글게 모여 손바닥을 가운데로 모으고 “하나, 둘, 셋, 협동!”을 함께 외쳐요.'},
 {id:'rules',name:'규칙의 섬',icon:'⚖️',value:'규칙을 지키면 모두가 즐거워요',quest:'선생님의 “멈춰!” 신호에 얼음처럼 세 번 멈춰 봐요.'},
 {id:'safety',name:'안전의 섬',icon:'🛟',value:'내 몸과 친구의 몸을 함께 지켜요',quest:'팔을 벌려 내 자리를 넓게 잡고, 주변을 한 바퀴 둘러봐요.'},
 {id:'express',name:'표현의 섬',icon:'🎭',value:'몸으로 생각과 느낌을 나타내요',quest:'오늘 기분을 신체 동작 하나로 만들어 짝에게 보여 줘요.'},
 {id:'grit',name:'끈기의 섬',icon:'🔥',value:'힘들어도 끝까지 해 봐요',quest:'벽에 등을 대고 투명 의자 자세로 열을 세요.'},
 {id:'friend',name:'우정의 항구',icon:'⚓',value:'함께 땀 흘린 친구에게 고마움을 전해요',quest:'옆 친구에게 “함께해서 고마워”라고 말하고 다 같이 만세를 해요.'},
];
export const JOURNEY_TOTAL=JOURNEY_ISLANDS.length*STAMPS_PER_ISLAND;
const KIND_IDS=new Set<string>(JOURNEY_KINDS.map(k=>k.id));
export const isJourneyKind=(value:unknown):value is JourneyKind=>typeof value==='string'&&KIND_IDS.has(value);

/** 저장소에서 읽은 값을 믿지 않고 걸러 낸다. */
export function parseJourney(raw:unknown):JourneyStamp[]{
 if(!Array.isArray(raw))return [];
 return raw.filter((s):s is JourneyStamp=>!!s&&typeof s==='object'&&isJourneyKind((s as JourneyStamp).kind)&&/^\d{4}-\d{2}-\d{2}$/.test(String((s as JourneyStamp).date))).map(s=>({kind:s.kind,date:s.date})).slice(0,JOURNEY_TOTAL);
}
export const localDate=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
/** 도장을 하나 더한다. 지도가 다 찼으면 그대로 돌려준다. */
export const addStamp=(stamps:readonly JourneyStamp[],kind:JourneyKind,date=localDate()):JourneyStamp[]=>stamps.length>=JOURNEY_TOTAL?[...stamps]:[...stamps,{kind,date}];
export const undoStamp=(stamps:readonly JourneyStamp[]):JourneyStamp[]=>stamps.slice(0,-1);

export interface JourneyProgress {total:number;arrived:number;sailingTo:number|null;stepsToNext:number;finished:boolean;justArrived:JourneyIsland|null}
/** arrived: 도착한 섬 수. sailingTo: 지금 향하는 섬 번호(다 건넜으면 null). justArrived: 마지막 도장으로 막 도착한 섬. */
export function journeyProgress(stamps:readonly JourneyStamp[]):JourneyProgress{
 const total=Math.min(stamps.length,JOURNEY_TOTAL),arrived=Math.floor(total/STAMPS_PER_ISLAND),finished=total>=JOURNEY_TOTAL;
 return {total,arrived,sailingTo:finished?null:arrived,stepsToNext:finished?0:STAMPS_PER_ISLAND-total%STAMPS_PER_ISLAND,finished,justArrived:total>0&&total%STAMPS_PER_ISLAND===0?JOURNEY_ISLANDS[arrived-1]:null};
}
export const islandStamps=(stamps:readonly JourneyStamp[],island:number)=>stamps.slice(island*STAMPS_PER_ISLAND,(island+1)*STAMPS_PER_ISLAND);
export function kindCounts(stamps:readonly JourneyStamp[]){
 return JOURNEY_KINDS.map(k=>({...k,count:stamps.filter(s=>s.kind===k.id).length}));
}
