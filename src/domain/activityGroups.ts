import type {GameDef} from './gamesData';

/**
 * 보여 주기용 활동 분류 11개. 활동 자료의 subCategory(60가지가 넘음)는 그대로 두고, 화면에서만 이 묶음으로 보여 준다.
 * 묶음마다 아이콘이 달라 같은 🧭가 수십 개 카드에 반복되지 않는다.
 */
export const ACTIVITY_GROUPS=[
 {id:'expedition',label:'대표 원정',icon:'🗺️'},
 {id:'reaction',label:'반응·민첩',icon:'⚡'},
 {id:'balance',label:'균형·협응',icon:'🤸'},
 {id:'fitness',label:'체력 기르기',icon:'💪'},
 {id:'moving',label:'이동·공간',icon:'🏃'},
 {id:'ball',label:'공·도구 기술',icon:'🎯'},
 {id:'team',label:'협력·소통',icon:'🤝'},
 {id:'rhythm',label:'리듬·표현',icon:'🎵'},
 {id:'thinking',label:'판단·기억',icon:'🧠'},
 {id:'calm',label:'정리·이완',icon:'🧘'},
 {id:'safety',label:'안전',icon:'🦺'},
] as const;
export type ActivityGroupId=typeof ACTIVITY_GROUPS[number]['id'];
export type ActivityGroup=typeof ACTIVITY_GROUPS[number];
const BY_ID=new Map<string,ActivityGroup>(ACTIVITY_GROUPS.map(g=>[g.id,g]));

/** subCategory 낱말로 묶음을 고른다. 앞에 있는 규칙이 먼저다. */
const RULES:[RegExp,ActivityGroupId][]=[
 [/대표 협동 원정/,'expedition'],
 [/안전/,'safety'],
 [/정리·이완|유연성|감정/,'calm'],
 [/리듬·표현|표현|무용|안무|탈춤|원무|뮤지컬|치어리딩|플래시몹|모방|움직임 공간 요소|움직임 요소 결합|에어로빅|줄넘기/,'rhythm'],
 [/반응·민첩|민속놀이/,'reaction'],
 [/균형·협응|평형성/,'balance'],
 [/체력|근력|심폐|순발력|운동 교육과정/,'fitness'],
 [/표적|조작|패스|드리블|필드형|배리어프리|도구 활용|스포츠 교육과정/,'ball'],
 [/판단·전략|인지|기록형|시간 계측/,'thinking'],
 [/협력·소통/,'team'],
 [/이동·공간|이동 움직임|공간 만들기|전신 활동/,'moving'],
];
/** '몸으로 참여하는 원정 활동'·'움직임 연결과 표현'처럼 넓은 분류는 활동 이름과 설명으로 나눈다. */
const WORD_RULES:[RegExp,ActivityGroupId][]=[
 [/공|패스|드리블|표적|콩주머니|라켓|배구|축구|셔틀|스카프/,'ball'],
 [/리듬|박자|발판|춤|표현|몸짓|동작|액션|문자/,'rhythm'],
 [/기억|숫자|암호|색과 글자|순서|분류/,'thinking'],
 [/모둠|함께|협동|천 위|징검다리|공장/,'team'],
];
export function activityGroup(game:Pick<GameDef,'subCategory'|'name'|'desc'|'domain'>):ActivityGroup{
 for(const [re,id] of RULES)if(re.test(game.subCategory))return BY_ID.get(id)!;
 const text=`${game.name} ${game.desc}`;
 for(const [re,id] of WORD_RULES)if(re.test(text))return BY_ID.get(id)!;
 return BY_ID.get(game.domain==='표현'?'rhythm':'moving')!;
}
/** 카드 아이콘: 활동마다 따로 정한 이모지를 쓰되, 여러 활동에 똑같이 붙은 🧭는 묶음 아이콘으로 바꾼다. */
export const activityIcon=(game:Pick<GameDef,'emoji'|'subCategory'|'name'|'desc'|'domain'>)=>game.emoji==='🧭'?activityGroup(game).icon:game.emoji;
