import {CROWD_GOAL_DATA,CROWD_HALLOWEEN_CARDS,CROWD_SOURCE,CROWD_THEME_DATA} from './crowdSafetyData.js';
import {CROWD_THEME_GRADE_TEXT} from './crowdSafetyGrades.js';

/** 다중밀집 안전 교실: 학년군 × 상황 주제. 판단 → 몸으로 익히기 → 생각 확인 → 약속. */
export type CrowdGrade='1-2'|'3-4'|'5-6';
export type CrowdGoalId='route'|'two-way'|'warning'|'chest'|'belongings'|'fallen';
export interface CrowdCheck {question:string;options:string[];answer:number}
export interface CrowdGoal {id:string;title:string;checks:Record<string,CrowdCheck>}
export interface CrowdCard {goal:string;title:string;situation:string;right:string;wrong:string;rightFeedback:string;wrongFeedback:string}
export interface CrowdTheme {id:string;label:string;icon:string;situations:{place:string;situation:string;right:string;wrong:string;goal:string}[]}
export interface CrowdDrill {goal:CrowdGoalId;icon:string;title:string;how:string;say:string}

export const CROWD_GRADES:{id:CrowdGrade;label:string;focus:string}[]=[
 {id:'1-2',label:'1~2학년',focus:'쉬운 낱말로 고르기'},
 {id:'3-4',label:'3~4학년',focus:'이유와 안전 약속'},
 {id:'5-6',label:'5~6학년',focus:'근거와 동선 비교'},
];
export const CROWD_GOALS=CROWD_GOAL_DATA;
export const CROWD_THEMES=CROWD_THEME_DATA;
export {CROWD_SOURCE};
export const CROWD_STEPS=[{id:'decide',label:'상황 판단'},{id:'move',label:'몸으로 익히기'},{id:'check',label:'생각 확인'},{id:'promise',label:'우리 반 약속'}] as const;

/** 목표마다 왜 그 행동이 안전한지 한 줄. 주제별 상황 카드의 되짚기에 쓴다. */
export const CROWD_WHY:Record<CrowdGoalId,string>={
 route:'들어가기 전에 이동로와 나갈 곳을 봐 두면 붐빌 때 당황하지 않아요.',
 'two-way':'마주 걷는 길에서는 오른쪽으로 걷고, 멈출 때는 가장자리로 먼저 가요.',
 warning:'걸음이 느려지고 어깨가 닿으면 붐빈다는 신호예요. 흐름을 보며 넓은 쪽으로 벗어나요.',
 chest:'떠밀릴 때는 무리하게 버티지 않고 두 팔이나 가방으로 가슴 앞 공간을 지켜요.',
 belongings:'붐비는 곳에서 허리를 숙이면 뒷사람이 걸려 넘어질 수 있어요. 물건보다 몸이 먼저예요.',
 fallen:'바로 일어날 수 없으면 두 팔로 머리를 감싸고 무릎을 당겨 몸을 둥글게 해요.',
};
/** 체육 시간에 몸으로 해 보는 연습. 실제로 붐비게 만들거나 서로 밀지 않는다. */
export const CROWD_DRILLS:CrowdDrill[]=[
 {goal:'route',icon:'🚪',title:'나가는 곳 가리키기',how:'지금 있는 곳에서 나갈 수 있는 문을 두 곳 찾아 손으로 가리켜요.',say:'“나가는 곳은 저기, 그리고 저기!”'},
 {goal:'two-way',icon:'➡️',title:'오른쪽으로 비켜 걷기',how:'두 줄이 마주 보고 천천히 걸어요. 만나기 전에 오른쪽으로 한 걸음 비켜 지나가요.',say:'“오른쪽으로, 멈추지 않고”'},
 {goal:'warning',icon:'↗️',title:'대각선으로 벗어나기',how:'제자리걸음을 하다가 신호가 나면 대각선 앞으로 세 걸음 걸어 넓은 곳에 서요.',say:'“어깨가 닿으면 넓은 쪽으로”'},
 {goal:'chest',icon:'🛡️',title:'가슴 앞 공간 지키기',how:'발을 어깨너비로 벌리고 두 팔을 가슴 앞에 모아요. 셋을 세고 풀어요. 세 번 해요.',say:'“밀지 않고, 가슴 앞 지키기”'},
 {goal:'belongings',icon:'🎒',title:'줍지 않고 지나가기',how:'바닥의 콩주머니를 줍지 않고 지나가 벽 쪽에 선 다음, 손을 들어 알려요.',say:'“물건보다 내 몸 먼저”'},
 {goal:'fallen',icon:'🙆',title:'몸 둥글게 말기',how:'매트 위에서 옆으로 누워 두 팔로 머리를 감싸고 무릎을 가슴 쪽으로 당겨요. 다섯을 세요.',say:'“머리 감싸고, 둥글게”'},
];
export const CROWD_DRILL_RULE='친구와 팔 간격을 두고 해요. 서로 밀거나 일부러 붐비게 만들지 않아요. 눕는 연습은 매트 위에서만 해요.';
export const CROWD_PROMISES=['들어가기 전에 나가는 곳을 먼저 봐요','오른쪽으로 걷고 길 가운데에서 멈추지 않아요','어깨가 닿으면 넓은 쪽으로 벗어나요','떠밀리면 가슴 앞 공간을 지켜요','붐비는 곳에서는 물건을 줍지 않아요','넘어지면 머리를 감싸고 몸을 둥글게 해요'];

export const isCrowdGrade=(value:unknown):value is CrowdGrade=>value==='1-2'||value==='3-4'||value==='5-6';
export const crowdTheme=(id:string|null|undefined)=>CROWD_THEMES.find(t=>t.id===id)??CROWD_THEMES[0];

export interface CrowdDecision {goal:CrowdGoalId;title:string;situation:string;choices:{text:string;safe:boolean;feedback:string}[]}
/**
 * 안전한 선택이 첫째에 오는지(true) 카드마다 정한다. 늘 같은 자리도, 첫째·둘째 번갈아 나오는 것도 아니게
 * 섞인 무늬에서 고르고, 주제·학년군마다 다른 무늬가 되도록 글자로 정한다. 같은 수업은 늘 같은 순서다.
 */
export function safeFirstPattern(n:number,seed:string):boolean[]{
 let h=7;for(const ch of seed)h=(h*31+ch.charCodeAt(0))>>>0;
 if(n<=1)return [h%2===0];
 if(n===2)return h%2?[true,false]:[false,true];
 if(n===3)return [[true,true,false],[true,false,false],[false,true,true],[false,false,true]][h%4];
 const base=[true,true,false,false,true,false],shift=h%base.length;
 return Array.from({length:n},(_,i)=>base[(i+shift)%base.length]);
}
/** 주제와 학년군에 맞는 상황 카드. 할로윈은 학년군마다 원본 글이 따로 있고, 나머지 주제는 1~2·3~4학년용으로 다시 쓴 글을 쓴다. */
export function crowdDecisions(themeId:string,grade:CrowdGrade):CrowdDecision[]{
 const theme=crowdTheme(themeId),rewrite=grade==='5-6'?undefined:CROWD_THEME_GRADE_TEXT[theme.id]?.[grade];
 const cards=theme.situations.length
  ?theme.situations.map((s,i)=>{const why=CROWD_WHY[s.goal as CrowdGoalId],[situation,right,wrong]=rewrite?.[i]??[s.situation,s.right,s.wrong];return {goal:s.goal,title:s.place,situation,right,wrong,rightFeedback:why,wrongFeedback:'다시 살펴봐요. '+why};})
  :CROWD_HALLOWEEN_CARDS[grade];
 const order=safeFirstPattern(cards.length,`${theme.id}/${grade}`);
 return cards.map((c,i)=>{
  const safe={text:c.right,safe:true,feedback:c.rightFeedback},risky={text:c.wrong,safe:false,feedback:c.wrongFeedback};
  return {goal:c.goal as CrowdGoalId,title:c.title,situation:c.situation,choices:order[i]?[safe,risky]:[risky,safe]};
 });
}
/** 1~2학년 첫 질문은 원본이 할로윈 축제를 가리켜서, 어느 주제에도 맞는 말로 바꾼다. */
const CHECK_OVERRIDE:Partial<Record<CrowdGoalId,Partial<Record<CrowdGrade,CrowdCheck>>>>={
 route:{'1-2':{question:'사람이 많은 곳에 들어가기 전에 무엇을 먼저 볼까요?',options:['나갈 수 있는 길','재미있는 구경거리만'],answer:0}},
};
/** 학년군의 확인 질문 여섯 개. 원본은 정답이 늘 첫째라서 질문마다 고정된 순서로 섞는다. */
export const crowdChecks=(grade:CrowdGrade)=>{const order=safeFirstPattern(CROWD_GOALS.length,`checks/${grade}`);return CROWD_GOALS.map((g,i)=>{const c=CHECK_OVERRIDE[g.id as CrowdGoalId]?.[grade]??g.checks[grade],flip=c.answer===0?!order[i]:order[i];
 return {goal:g.id as CrowdGoalId,title:g.title,question:c.question,options:flip?[...c.options].reverse():c.options,answer:flip?c.options.length-1-c.answer:c.answer};});};
/** 생각 확인 결과. 틀린 목표를 돌려줘 다시 살펴보게 한다. */
export function crowdCheckResult(grade:CrowdGrade,answers:readonly (number|null)[]){
 const checks=crowdChecks(grade),missed=checks.filter((c,i)=>answers[i]!==c.answer).map(c=>c.goal);
 return {total:checks.length,correct:checks.length-missed.length,missed};
}
