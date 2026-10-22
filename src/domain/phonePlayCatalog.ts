import type {GameDef} from './gamesData.js';
import {PHONE_PLAY_EXPANSION} from './phonePlayExpansion.js';
import {PHONE_PLAY_VISUALS,type PhonePlayVisual} from './phonePlayVisuals.js';

export const PHONE_CATEGORIES=['반응·민첩성','균형·협응','리듬·표현','이동·공간','전신 활동','협력·소통','판단·전략','정리·이완'] as const;
export type PhoneCategory=typeof PHONE_CATEGORIES[number];
export type PhoneKind='signal'|'memory'|'create'|'estimate'|'count'|'team'|'decision'|'observe';
export interface PhonePlay extends PhonePlayVisual {
 id:string;name:string;category:PhoneCategory;kind:PhoneKind;players:'혼자'|'짝'|'모둠';
 space:'제자리'|'두 걸음'|'넓은 공간';intensity:'낮음'|'보통';minutes:4|6;seconds:number;
 goal:string;rules:string[];rounds:string[];cues:string[];check:string;easy:string;hard:string;seated:string;
 options?:string[];related?:string;
}
// Each row specifies a different task/rule/interaction, not a renamed timer.
// Delimiters are only an authoring shorthand; the runtime receives named fields.
export type PhonePlayRow=[number,string,number,PhoneKind,PhonePlay['players'],PhonePlay['space'],string,string,string,string,string,string,string,string,string?,string?];
const rows:PhonePlayRow[]=[
 ...PHONE_PLAY_EXPANSION,
 [1,'우주 관제사의 예외 신호',0,'signal','혼자','제자리','명령 앞에 「출동」이 있을 때만 동작하고 나머지는 기다려요.','출동이 붙은 말만 실행해요|제자리에서 발을 번갈아 디뎌요|틀리면 멈춰 규칙을 말하고 다시 합류해요','출동 신호를 골라 움직여요|동작 이름만 나오면 기다려요|출동과 대기 신호를 섞어 구별해요','출동, 제자리 두 걸음|팔 펼치기, 움직이지 않기|출동, 팔을 옆으로|대기, 편안히 서기','출동이 있는 명령만 실행했나요?','두 신호만 구별해요.','동작 이름만 나오는 방해 신호에도 기다려요.','발 디디기 대신 손바닥을 번갈아 펴요.','red_green'],
 [15,'세 자세 기억 금고',1,'memory','혼자','제자리','세 가지 지지 자세의 순서를 기억해 몸으로 재현해요.','화면의 자세 순서를 먼저 읽어요|발을 바닥에서 높이 들지 않고 순서대로 자세를 바꿔요|마친 뒤 실행한 순서를 되짚어요','앞뒤 발 지지 순서를 익혀요|팔 방향까지 함께 기억해요|순서가 바뀌어도 천천히 연결해요','두 발 나란히|오른발 살짝 앞|왼발 살짝 앞','세 자세를 안전하게 연결하고 순서를 기억했나요?','두 발을 가까이 두고 작은 보폭으로 해요.','자세 사이에 팔 방향을 하나씩 더해요.','앉아서 오른손 앞·왼손 앞·양손 무릎 자세를 연결해요.','one_leg'],
 [29,'무성 영화의 세 장면',2,'create','짝','제자리','말없이 시작·사건·해결을 몸으로 표현하고 짝이 이야기를 연결해요.','한 명은 배우, 한 명은 관객이에요|움직임의 크기와 높낮이로 장면을 구별해요|장면 뒤 역할을 바꾸고 서로 본 내용을 이야기해요','바람에 모자가 날아간 장면|작은 문을 발견한 장면|길을 잃었다가 집을 찾은 장면','시작 자세|사건 표현|해결 자세','서로 다른 세 장면과 역할 바꾸기를 했나요?','한 장면을 두 동작으로 표현해요.','같은 장면을 느리게·보통 속도로 비교해요.','앉아서 팔·표정·몸통의 작은 움직임으로 표현해요.','emotion-thermometer'],
 [41,'짧고 긴 걸음의 거리 암호',3,'memory','짝','두 걸음','짝이 보낸 짧음·길음·쉼의 암호를 다른 왕복 거리로 번역해요.','짧음은 한 걸음 왕복, 길음은 작은 두 걸음 왕복이에요|보낸 순서를 기억해 자기 통로에서 걷고 매번 출발점으로 돌아와요|쉼은 제자리에서 쉬고 역할을 바꿔 거리 암호를 보내요','거리와 암호의 뜻을 익혀요|바뀐 순서의 거리 암호를 걸어요|짝에게 받은 순서를 몸짓으로 답해요','짧음: 한 걸음 왕복|길음: 두 걸음 왕복|쉼: 제자리 휴식','거리와 쉼을 구별해 왕복하고 암호 순서도 기억했나요?','한 걸음과 제자리 쉼 두 신호만 써요.','같은 거리 암호를 손짓으로도 전달해요.','앉아서 손을 짧게·조금 더 길게 왕복하고 쉼을 구별해요.'],
 [53,'짝수 완성 움직임 공장',4,'count','혼자','제자리','두 동작을 모두 해야 한 묶음으로 세는 움직임 도전을 해요.','제자리걸음 두 번과 양팔 벌리기를 연결해요|두 동작을 모두 마쳤을 때만 한 묶음으로 세요|횟수보다 같은 순서를 유지해요','두 동작 묶음의 횟수를 세요|순서를 거꾸로 바꾸어 세요|마지막 묶음까지 빠뜨림 없이 연결해요','제자리 두 걸음|양팔 벌리기|완성한 묶음만 세기','빠뜨린 동작 없이 완성한 묶음만 셌나요?','팔을 작게 벌리고 느리게 해요.','묶음 사이에 옆으로 한 발 디디기를 더해요.','앉아서 양손 무릎 두 번·양팔 벌리기를 한 묶음으로 해요.','fitness'],
 [65,'말 없는 출발 합의',5,'team','모둠','제자리','구호를 외치지 않고 서로를 보며 함께 동작을 시작해요.','서로 닿지 않는 간격으로 마주 봐요|한 명이 천천히 팔을 들면 눈을 맞추고 함께 시작해요|다음 신호를 보내는 사람을 바꾸고 모두 참여해요','같은 순간 팔을 펴요|같은 순간 제자리걸음을 시작해요|같은 순간 움직임을 마쳐요','눈 맞추기|함께 펼치기|함께 멈추기','모두가 신호 보내기와 따라 하기에 참여했나요?','시작 전 고개 끄덕임을 허용해요.','구호 없이 시작과 끝을 함께 맞춰요.','앉아서 손바닥 펴기와 팔 내리기로 맞춰요.','partner-robot-lab'],
 [79,'서로 다른 길의 합의',6,'decision','짝','두 걸음','두 사람의 이동 통로가 겹치지 않는 계획을 골라 실행해요.','각자의 두 걸음 통로를 손으로 가리켜요|둘 다 안전하게 움직일 계획을 고르고 이유를 말해요|폰을 놓고 계획을 실행한 뒤 시작 위치로 돌아와요','평행한 통로를 정해요|서로의 진행 방향을 확인해요|출발 시점을 바꾸어 비교해요','통로 확인|자기 길 걷기|출발점 귀환','통로가 겹치지 않고 둘 다 돌아왔나요?','두 사람이 번갈아 이동해요.','같은 시점에 출발하되 통로와 간격을 유지해요.','앉아서 각자 앞의 공중 공간에 서로 겹치지 않는 길을 그려요.','zigzag','서로 떨어진 평행 통로|같은 좁은 통로에서 마주 출발|서로의 길을 가로질러 출발'],
 [91,'움직임 뒤 몸의 날씨',7,'observe','혼자','제자리','작은 움직임 전후의 몸 느낌을 날씨 몸짓으로 표현해요.','편안한 제자리걸음 뒤 멈춰 몸 느낌을 살펴요|맑음·구름·바람 중 가까운 느낌을 팔로 표현해요|좋고 나쁨을 겨루지 않고 바뀐 느낌을 기억해요','걸음 전 몸 느낌을 표현해요|작은 걸음 뒤 느낌을 표현해요|쉬어 본 뒤 달라진 점을 표현해요','작은 걸음|편안히 멈춤|느낌을 몸짓으로','움직임 전후의 느낌을 비교했나요?','발을 옮기지 않고 손을 천천히 펴요.','느낌이 달라진 이유를 한 문장으로 말해요.','앉아서 손바닥 펴기 전후의 몸 느낌을 살펴요.','pulse-detective'],
];

export const PHONE_PLAYS:PhonePlay[]=[...rows].sort((a,b)=>a[0]-b[0]).map(([n,name,c,kind,players,space,goal,rules,rounds,cues,check,easy,hard,seated,related,options])=>({
 ...PHONE_PLAY_VISUALS[`phone-play-${String(n).padStart(3,'0')}`],
 id:`phone-play-${String(n).padStart(3,'0')}`,name,category:PHONE_CATEGORIES[c],kind,players,space,
 intensity:c===7||c===1?'낮음':'보통',minutes:players==='모둠'?6:4,seconds:players==='모둠'?36:24,
 goal,rules:rules.split('|'),rounds:rounds.split('|'),cues:cues.split('|'),check,easy,hard,seated,related,options:options?.split('|'),
}));
export const PHONE_PLAY_BY_ID=new Map(PHONE_PLAYS.map(p=>[p.id,p]));
export const isPhonePlay=(id:string)=>PHONE_PLAY_BY_ID.has(id);
export const phonePlayerRange=(p:PhonePlay)=>p.players==='혼자'?{min:1,max:1}:p.players==='짝'?{min:2,max:2}:{min:3,max:6};
export const phoneSetup=(p:PhonePlay)=>`${p.space==='제자리'?'팔다리를 펼쳐도 닿지 않는 제자리 공간':p.space==='두 걸음'?'각자 두 걸음 왕복할 통로':'서로 겹치지 않는 넉넉한 개인 통로'} · 스마트폰 1대는 활동 구역 밖 안전한 곳에 내려놓아요. 표시물·가구·촬영은 필요 없어요.`;
export const phoneSafety=['기기를 손에 들고 움직이지 않아요. 이동은 걷기로 하고 기기 쪽으로 접근하지 않아요.','서로 닿지 않는 간격을 확인하고 불편하면 멈추거나 작은 동작을 선택해요. 눈을 감거나 접촉을 강요하지 않아요.'];
export const PHONE_GAME_DEFS:GameDef[]=PHONE_PLAYS.map(p=>({
 type:p.id,name:p.name,emoji:p.emoji,desc:p.goal,
 color:'from-teal-600 to-cyan-700',border:'border-teal-400/40',glow:'hover:shadow-teal-500/30',difficulty:p.kind==='decision'?3:2,
 domain:p.category==='리듬·표현'?'표현':'운동',subCategory:p.category,
 achievement:{code:'연계 확인 필요',title:'준비물 없는 몸 놀이',desc:'실제 움직임과 선택·협력·자기 확인을 연결하는 놀이입니다. 성취기준 코드를 임의로 부여하지 않습니다.'},
 grades:p.kind==='decision'?['3~4학년군','5~6학년군']:['1~2학년','3~4학년군','5~6학년군'],
 durationMinutes:p.minutes,equipment:['스마트폰 1대 · 별도 준비물 없음'],safetyTips:[...phoneSafety,p.seated],physicalActivity:true,
 recommendedDevice:'스마트폰',devices:['스마트폰','태블릿 PC','데스크톱 PC'],playMode:p.players==='혼자'?'개인':'협동',activityType:p.players==='혼자'?'개인':p.players,
}));

export interface PhoneRecord {round:number;outcome:'complete'|'partial';elapsedMs:number;count:number;answer:string[];participants:number[];easy?:boolean}
export function phoneSequence(p:PhonePlay,round:number,easy=false):string[]{const cues=p.cues;return Array.from({length:Math.min(easy?2:4,cues.length)},(_,i)=>cues[(i+round)%cues.length]);}
export function phoneTarget(round:number){return [8,10,12][round]??10;}
export function phoneRecordValid(p:PhonePlay,r:PhoneRecord,players:number):boolean{
 return Number.isInteger(r.round)&&r.round>=0&&r.round<3&&['complete','partial'].includes(r.outcome)&&Number.isFinite(r.elapsedMs)&&r.elapsedMs>=(p.kind==='estimate'?1000:p.seconds*1000)&&r.elapsedMs<=120000
  &&Number.isInteger(r.count)&&r.count>=0&&r.count<=99&&Array.isArray(r.participants)&&r.participants.length>0&&new Set(r.participants).size===r.participants.length&&r.participants.every(n=>Number.isInteger(n)&&n>=1&&n<=players)
  &&Array.isArray(r.answer)&&r.answer.length<=4&&r.answer.every(s=>p.cues.includes(s))
  &&(r.outcome!=='complete'||(r.participants.length===players&&(p.kind!=='memory'||JSON.stringify(r.answer)===JSON.stringify(phoneSequence(p,r.round,r.easy===true)))&&(p.kind!=='count'||r.count>0)&&(p.kind!=='estimate'||Math.abs(r.elapsedMs-phoneTarget(r.round)*1000)<=3500)));
}
