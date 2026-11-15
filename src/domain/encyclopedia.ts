/** 체육수업 대백과: 홈과 교사 화면에서 보여 주는 갈래 목록. */
export interface EncyclopediaEntry {id:string;to:string;icon:string;title:string;summary:string}
export const ENCYCLOPEDIA:EncyclopediaEntry[]=[
 {id:'sports',to:'/sports',icon:'🏅',title:'종목 교실',summary:'아시안게임 28개 종목 리드업 게임, 점수판과 시상'},
 {id:'tools',to:'/tools',icon:'🧰',title:'수업 도구',summary:'리그 대진표, 레이스 시계, 사다리타기, 번호 뽑기'},
 {id:'safety',to:'/safety',icon:'🦺',title:'안전 교실',summary:'사람이 많은 곳의 안전을 학년군·상황별로, 응급·건강 안전 수업'},
 {id:'journey',to:'/journey',icon:'🗺️',title:'우리 반 원정 지도',summary:'수업마다 도장을 찍어 일곱 섬을 건너는 학급 지도'},
];
