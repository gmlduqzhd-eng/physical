import {phoneSequence,type PhonePlay} from './phonePlayCatalog.js';
export type PhoneStrategy='core'|'small'|'seated';
export function phoneStrategies(play:PhonePlay,round:number){
 const choices=[{id:'core' as const,label:play.rounds[round],guide:play.rules[round]},{id:'small' as const,label:'작고 여유 있게',guide:play.easy},{id:'seated' as const,label:'앉은 동작으로',guide:play.seated}];
 return choices.map((_,i)=>choices[(i+round)%choices.length]);
}
const teamMotions:Record<string,string[]>={
 '004':['서로 다른 손 높이에서 천천히 높이를 맞추고 멈추기','손 높이를 바꿔 다시 맞추고 멈추기','눈을 맞추고 함께 팔을 멈추기'],
 '010':['친구의 작은 끝 자세를 이어 표현','새로운 팔 끝 자세로 이어 표현','마지막 자세를 첫 친구에게 손짓으로 전달'],
 '013':['천천히 팔을 움직이다 함께 멈추기','다음 친구의 손짓에 맞춰 팔 멈추기','모두 편한 속도로 팔 움직이기'],
 '031':['내가 고른 작은 팔 동작 표현','차례로 손·팔 박자에 합류','한 사람은 쉬고 나머지는 작은 박자 유지'],
 '034':['함께 고른 편한 끝 자세 표현','각자 다른 팔 움직임으로 같은 끝 자세에 도착','함께 시작하고 같은 끝 자세로 멈추기'],
 '036':['손 높이 신호를 보고 작게 팔 펴기','손짓의 크기를 보고 편한 범위로 바꾸기','새 지휘자의 손짓에 맞춰 팔 움직이기'],
 '040':['가벼운 느낌을 작은 손짓으로 표현','부드러운 느낌을 팔 물결로 표현','고른 느낌을 편한 손·팔 모양으로 표현'],
 '043':['각자 통로에서 출발 자세 만들기','닿지 않는 나란한 통로에서 작은 발 디딤','각자 제자리에서 멈춰 간격 살피기'],
 '054':['각자 편한 크기의 팔 동작 표현','신호 역할을 바꾸며 작은 팔 박자','모두 편한 크기로 팔 움직임 마무리'],
 '064':['각자 고른 편한 손·팔 동작','짝이 고른 작은 동작을 함께 표현','두 동작을 번갈아 표현하고 쉬기'],
 '065':['눈을 맞추고 같은 순간 팔 펴기','눈을 맞추고 같은 순간 작은 제자리 발 디딤','같은 순간 팔을 내리고 멈추기'],
 '068':['각자 제안한 작은 손·팔 동작','두 제안 동작을 순서대로 연결','모두 편한 크기로 두 동작 이어 표현'],
 '073':['손끝으로 첫 방향 가리키기','서로 닿지 않고 팔의 선 이어 표현','각자 자리에서 전체 길을 팔로 표현'],
 '074':['쉼 신호를 손짓으로 전하기','쉬는 친구를 기다리며 작은 팔 박자','각자 편한 동작 또는 관찰로 마무리'],
 '076':['번호 순서로 번갈아 팔 펴기','각자 자리에서 작은 발 디딤 번갈아 하기','먼저 신호 보낼 친구를 바꾸어 팔 펴기'],
 '084':['함께 고른 원래 작은 동작','한 가지 바꾼 팔 방향으로 표현','원래와 바꾼 동작을 번갈아 비교'],
 '088':['떨어진 자리에서 손끝 방향 연결','한 친구의 손 방향만 바꾸어 연결','서로 닿지 않고 손끝 방향 다시 연결'],
 '099':['작은 팔 물결을 다음 번호에 전달','다음 친구가 준비되면 작은 물결 전달','마지막 신호에 함께 손 내리기'],
};
export function phoneTeamMotion(play:PhonePlay,round:number){return teamMotions[play.id.slice(-3)]?.[round]??play.rounds[round];}
export function phoneRoles(play:PhonePlay,players:number,round:number,created:string[]=[],seated=false){
 const leader=round%players;
 return Array.from({length:players},(_,i)=>({seat:i+1,role:play.id==='phone-play-008'?['자기 자리에서 걷기 또는 앉은 발 디딤','작게 팔 펴기','가슴 앞에서 손 모으기'][(i+round)%3]:play.kind==='team'?`${i===leader?'처음 신호 보내기':'신호 보고 함께 참여'} · ${seated?play.seated:phoneTeamMotion(play,round)}`:play.kind==='create'?`${(i+round)%2===0?'표현':'관찰 후 역할 교대'} · ${(created.length?created:play.cues).join(' → ')}`:`${i===leader?'처음 신호 읽기':'몸으로 참여·짝 확인'} · ${seated?play.seated:play.rounds[round]}`}));
}
export function phoneRoundCues(play:PhonePlay,round:number,level:string,created:string[]=[],strategy:PhoneStrategy='core'){
 if(strategy==='seated')return [play.seated];
 if(strategy==='small')return [play.easy,...phoneSequence(play,round,true)];
 if(play.kind==='create'&&created.length>=2)return created;
 const cues=phoneSequence(play,round,level==='쉬운 방법');
 return level==='추가 도전'&&play.kind!=='memory'?[...cues].reverse():cues;
}
export function phoneNextHint(play:PhonePlay,outcome:'complete'|'partial'|'rest'|'observe',round:number){
 return outcome==='rest'||outcome==='observe'?`쉬거나 관찰한 기록을 남겼어요. 다음에는 ${play.easy}`:outcome==='partial'?`‘${play.rounds[Math.min(2,round+1)]}’에서는 ${play.easy}`:`다음 과제에서는 ${play.rules[Math.min(2,round+1)]}`;
}
