import {z} from 'zod';
import {FLAGSHIP_IDS,FLAGSHIPS,type FlagshipId} from './flagship.js';
import {DEFAULT_WORKSHOP,workshopSchema,type WorkshopSettings} from './expeditionWorkshop.js';

export const PRIMARY_EXPERIENCES=([
 {id:'map',game:'expedition-map',name:'힌트를 모아 길 열기',title:'움직이는 비밀지도',description:'모둠마다 다른 힌트를 모아야 문이 열려요.'},
 {id:'loop',game:'expedition-loop',name:'우리 박자를 반 전체 합주로',title:'바디루프 발전소',description:'손뼉·발 디딤을 맞추고 모둠의 입력 박자를 함께 들어요.'},
] as const).map(item=>{
 // 준비물과 시간은 대표 원정 소개(/expeditions)와 같은 값을 쓴다. 페이지마다 다르게 적히지 않게 한다.
 const flagship=FLAGSHIPS.find(f=>f.id===item.game)!;
 return {...item,equipment:flagship.device,minutes:flagship.minutes};
});
export type ExperienceId=typeof PRIMARY_EXPERIENCES[number]['id'];
export const experienceById=(id:string|undefined)=>PRIMARY_EXPERIENCES.find(g=>g.id===id);
export const experienceForGame=(game:string)=>PRIMARY_EXPERIENCES.find(g=>g.game===game);

// Deliberately no strings for names, room IDs, student data, recovery codes or tokens.
export const playRecipeSchema=z.object({v:z.literal(1),game:z.enum(FLAGSHIP_IDS),groups:z.number().int().min(1).max(20),minutes:z.number().int().min(5).max(90),settings:workshopSchema}).strict();
export type PlayRecipe=z.infer<typeof playRecipeSchema>;
export function playRecipeHash(input:PlayRecipe){return '#recipe='+encodeURIComponent(JSON.stringify(playRecipeSchema.parse(input)));}
export function parsePlayRecipe(hash:string):PlayRecipe|null{
 try{if(!hash.startsWith('#recipe=')||hash.length>4000)return null;const p=playRecipeSchema.safeParse(JSON.parse(decodeURIComponent(hash.slice(8))));return p.success?p.data:null;}catch{return null;}
}
export function playRecipeLink(origin:string,input:PlayRecipe){const url=new URL(origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid sharing origin');return url.origin+'/lessons'+playRecipeHash(input);}
export function makePlayRecipe(game:FlagshipId,groups=6,minutes=20,settings?:WorkshopSettings):PlayRecipe{
 const config=settings?{...settings}:{...DEFAULT_WORKSHOP,packageMinutes:[10,20,40].includes(minutes)?minutes:null};
 if(config.packageMinutes!==null&&config.packageMinutes!==minutes)config.packageMinutes=null;
 return playRecipeSchema.parse({v:1,game,groups,minutes,settings:config});
}
export const STARTER_RECIPES=[
 {id:'map-team',title:'체육관 · 모둠별 한 대',game:'expedition-map',devices:'모둠별 1대',equipment:'지점 QR 3장 · 안전한 걷기 동선',steps:['공간·기기 확인 2분','힌트와 몸짓 약속 연습 4분','모둠 탐사·역할 교대 11분','선택한 길 돌아보기 3분']},
 {id:'loop-class',title:'교실 · 작은 동작 합주',game:'expedition-loop',devices:'모둠별 1대 · 공용 스피커 선택',equipment:'의자 사이 개인 공간 · 제자리 작은 동작',steps:['간격·참여 방법 확인 2분','손뼉·작은 동작 연습 4분','역할 교대하며 박자 연결 11분','우리 반 합주·돌아보기 3분']},
] as const;
export const STUDENT_ACTIONS:Record<FlagshipId,{icon:string;title:string;text:string}>={
 'expedition-map':{icon:'🗺️',title:'묻고, 걷고, 함께 골라요',text:'모둠마다 가진 힌트를 모아 길을 골라요. QR을 비출 때는 멈춰요.'},
 'expedition-ship':{icon:'↔',title:'방향을 전하고, 함께 멈춰요',text:'조종자는 방향을 나누고 다른 친구는 몸짓으로 안내해요. 정거장 앞에서 천천히 멈춰요.'},
 'expedition-loop':{icon:'♫',title:'몸으로 박자를 맞추고 연결해요',text:'불빛에서 작은 동작을 하고 한 사람은 박자를 눌러요. 다음 시도에는 역할을 바꿔요.'},
 'expedition-rescue':{icon:'↗',title:'작게 조준하고 타이밍을 맞춰요',text:'편안한 팔 각도로 가상 캡슐을 조준해요. 실제 물건을 던지지 않아요.'},
 'expedition-shadow':{icon:'〰',title:'길을 보고 천천히 따라가요',text:'손목이 갈 길을 먼저 보고 따라가요. 불편하면 작은 동작이나 터치 연습을 선택해요.'},
 'expedition-boss':{icon:'◇',title:'관문마다 서로의 신호를 이어요',text:'현재 관문을 함께 해결해요. 막히면 단서를 나누고 역할을 바꿔요.'},
};
