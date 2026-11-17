/**
 * 신체 미션 신호를 화면에 크게 보여 줄 때의 모양(글자·색·아이콘).
 * 신호 글은 그대로 두고(기록·음성·테스트가 같은 글을 씀), 화면에 붙일 색과 그림만 여기서 정한다.
 */
export interface QuestCueView {
 text:string;
 /** 신호 칸 배경색. 글자색은 tone으로 정한다. */ color?:string;
 /** 'dark'면 흰 글씨, 'light'면 짙은 글씨. */ tone?:'dark'|'light';
 /** 신호 위에 크게 보일 그림 글자. */ icon?:string;
 /** 아이콘 옆에 크게 보일 짧은 표시(번호·높이 등). */ badge?:string;
}
export const SIGNAL_COLORS={green:'#1f8a4c',yellow:'#f2c230',red:'#c8372d'} as const;
const MEMORY_ICONS:Record<string,string>={'동그라미':'●','세모':'▲','네모':'■','마름모':'◆'};

export function questCueView(gameId:string,text:string):QuestCueView{
 // 신호등: 신호 글(초록 ● · 걷기)에 이미 동작이 있으니 색과 그림만 더한다(같은 말을 두 줄로 쓰지 않음).
 if(gameId==='red_green'){
  if(text.startsWith('초록'))return {text,color:SIGNAL_COLORS.green,tone:'dark',icon:'🟢'};
  if(text.startsWith('노랑'))return {text,color:SIGNAL_COLORS.yellow,tone:'light',icon:'🟡'};
  if(text.startsWith('빨강'))return {text,color:SIGNAL_COLORS.red,tone:'dark',icon:'🔴'};
 }
 if(gameId==='jump'){const n=/(\d)번 (섬|표식)/.exec(text)?.[1];if(n)return {text,icon:'🏝️',badge:`${n}번 섬`};}
 if(gameId==='squat'){
  const level=/(낮음|중간|높음)/.exec(text)?.[1];
  if(level)return {text,icon:level==='낮음'?'⬇️':level==='높음'?'⬆️':'➡️',badge:level==='낮음'?'낮은 곳 (바닥)':level==='높음'?'높은 곳 (벽)':'중간 (의자)'};
 }
 if(gameId==='memory'){
  const shape=Object.keys(MEMORY_ICONS).find(name=>text.includes(name));
  return {text,icon:shape?MEMORY_ICONS[shape]:'👣',badge:shape};
 }
 if(gameId==='plank')return text.includes('쉬')?{text,icon:'😌',badge:'쉬어요'}:{text,icon:'🧱',badge:'버텨요'};
 return {text};
}
/** 기억 미션의 순서 미리보기: '● 동그라미' → {icon:'●',name:'동그라미'} */
export function memoryTile(symbol:string):{icon:string;name:string}{const [icon,...rest]=symbol.split(' ');return {icon,name:rest.join(' ')||icon};}
