/** 체육수업 대백과: 홈과 교사 화면에서 보여 주는 갈래 목록. */
export interface EncyclopediaEntry {id:string;to:string;icon:string;title:string;summary:string}
export const ENCYCLOPEDIA:EncyclopediaEntry[]=[
 {id:'sports',to:'/sports',icon:'🏅',title:'종목 교실',summary:'아시안게임 28개 종목 리드업 게임, 점수판과 시상'},
 {id:'tools',to:'/tools',icon:'🧰',title:'수업 도구',summary:'리그 대진표, 레이스 시계, 사다리타기, 번호 뽑기'},
];
