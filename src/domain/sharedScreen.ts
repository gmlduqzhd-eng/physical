export const SCREEN_LESSONS=[
 {id:'signals',title:'출동 신호 함께 듣기',goal:'출동이라는 말이 있을 때만 움직여요.',role:'말을 듣고 함께 움직여요. 다음 판에는 친구가 작은 동작을 제안해요.'},
 {id:'rhythm',title:'우리 반 불빛 합주',goal:'불빛에서 작은 동작, 빈 박자에서는 편하게 쉬어요.',role:'손뼉·발 디딤·작은 팔 동작을 모둠이 골라 함께 맞춰요.'},
 {id:'relay',title:'몸짓 이어 배달하기',goal:'앞사람의 작은 동작을 보고 다음 친구에게 이어요.',role:'기기는 고정해요. 세 사람씩 안전한 간격에서 신호 보내기·따라 하기·연결하기를 번갈아 해요.'},
] as const;
export type ScreenLessonId=typeof SCREEN_LESSONS[number]['id'];
export const SCREEN_ROUND_MS=20000;
export function sharedScreenCue(id:ScreenLessonId,round:number,elapsed:number,seated:boolean){
 const step=Math.floor(Math.max(0,elapsed)/3000),small=seated?'양손 무릎 가볍게 짚기':'제자리 발 번갈아 디디기';
 const moves=['손바닥 펴기','팔 작게 펼치기',small];
 if(id==='rhythm'){const beat=Math.floor(Math.max(0,elapsed)/600)%8,on=(beat+round)%2===0;return {title:on?moves[round%3]:'편하게 쉬는 박자',instruction:on?'불빛과 함께 작은 동작을 해요.':'친구를 보고 다음 박자를 기다려요.',symbol:on?'●':'·',step:beat,active:on};}
 if(id==='relay')return {title:moves[(step+round)%3],instruction:['첫 친구가 신호를 보내요.','짝이 동작을 따라 해요.','다음 친구에게 작은 동작을 이어요.'][(step+round)%3],symbol:['1 → 2','2 → 3','3 → 1'][(step+round)%3],step,active:true};
 const on=(step+round)%3!==1,move=moves[(step+round)%3];return {title:(on?'출동! ':'')+move,instruction:on?'출동 신호예요. 편한 크기로 움직여요.':'출동이라는 말이 없어요. 멈춰서 기다려요.',symbol:on?'→':'Ⅱ',step,active:on};
}
