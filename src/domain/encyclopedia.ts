/** 체육수업 대백과: 홈과 교사 화면에서 보여 주는 갈래 목록. */
import {CLASS_TOOLS} from './classTools';
export interface EncyclopediaEntry {id:string;to:string;icon:string;title:string;summary:string}
export const ENCYCLOPEDIA:EncyclopediaEntry[]=[
 {id:'sports',to:'/sports',icon:'🏅',title:'종목 교실',summary:'아시안게임 28개 종목 리드업 게임, 점수판과 시상'},
 {id:'tools',to:'/tools',icon:'🧰',title:'수업 도구',summary:`${CLASS_TOOLS.slice(0,5).map(t=>t.label).join(' · ')} 등 ${CLASS_TOOLS.length}가지`},
 {id:'safety',to:'/safety',icon:'🦺',title:'안전 교실',summary:'사람이 많은 곳의 안전을 학년군·상황별로, 응급·건강 안전 수업'},
 {id:'journey',to:'/journey',icon:'🗺️',title:'우리 반 원정 지도',summary:'수업마다 도장을 찍어 일곱 섬을 건너는 학급 지도'},
 {id:'angle',to:'/lab/angle',icon:'📐',title:'각도 실험',summary:'몇 도로 던져야 가장 멀리 갈까, 화면에서 실험하고 운동장에서 확인'},
 {id:'more',to:'/more',icon:'🕹️',title:'쉬는 시간·더 보기',summary:'쉬는시간 오락실과 엽쌤의 다른 수업 앱'},
];

/** 엽쌤의 다른 웹앱. 새 창으로 열린다. inApp은 땀방울 원정대 안에 옮겨 온 곳. */
export interface SiblingApp {id:string;title:string;url:string;icon:string;summary:string;inApp?:{to:string;label:string}}
const BASE='https://gmlduqzhd123-lab.github.io';
export const SIBLING_APPS:SiblingApp[]=[
 {id:'old-game',title:'엽쌤스쿨 쉬는시간 오락실 100',url:`${BASE}/old-game/`,icon:'🕹️',summary:'아케이드·두뇌 퍼즐·학습 퀴즈·학급 도구 미니게임 100가지. 비 오는 날이나 쉬는 시간에 써요.',inApp:{to:'/tools',label:'수업 도구'}},
 {id:'worms',title:'조준! 각도왕',url:`${BASE}/Worms/`,icon:'📐',summary:'각도를 읽고 조준하는 턴제 전략 게임. 가로 화면에서 해요.',inApp:{to:'/lab/angle',label:'각도 실험'}},
 {id:'asian-game',title:'엽쌤의 아시안게임 체육 수업',url:`${BASE}/Asian-Game/`,icon:'🏆',summary:'28개 종목 리드업 게임과 대회 소식.',inApp:{to:'/sports',label:'종목 교실'}},
 {id:'volleyball',title:'우리 모두 배구왕',url:`${BASE}/Volleyball/`,icon:'🏐',summary:'9인제 배구 용어·기술·포지션과 배구 영상 모음.',inApp:{to:'/sports/volleyball/deep',label:'배구 깊이 보기'}},
 {id:'halloween',title:'할로윈 안전 놀이터',url:`${BASE}/Halloween/`,icon:'🎃',summary:'사람이 많은 곳의 안전을 이야기와 놀이로 배우는 계기교육.',inApp:{to:'/safety',label:'안전 교실'}},
 {id:'odyssey-run',title:'오디세이 런: 이타카로!',url:`${BASE}/Odyssey-Run/`,icon:'⛵',summary:'섬을 건너 집으로 돌아가는 달리기 모험.',inApp:{to:'/journey',label:'우리 반 원정 지도'}},
 {id:'yscode',title:'엽쌤의 바이브 코딩 교실',url:`${BASE}/YScode/`,icon:'💡',summary:'엽쌤이 만든 수업·업무용 웹앱 모음.'},
];
