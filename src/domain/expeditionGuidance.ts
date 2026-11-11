import type {ExpeditionSnapshot,FlagshipId} from './flagship.js';
export function expeditionNextStep(s:ExpeditionSnapshot,game:FlagshipId){
 const me=s.groups.find(g=>g.id===s.groupId)??s.groups[0];
 if(s.status!=='playing')return {title:'선생님의 안내를 확인해요',instruction:'기기를 멈추고 주변을 확인해요. 수업이 다시 시작되면 다음 행동을 안내해요.'};
 if(!me)return {title:'모둠 연결을 확인해요',instruction:'우리 모둠으로 다시 들어온 뒤 시작해요.'};
 if(game==='expedition-map'){
  if(s.phase>=3)return {title:'세 길을 연결했어요',instruction:'돌아와 모두의 참여를 확인하고 결과를 제출해요.'};
  if(!me.visited.length)return {title:'단서를 모으고 지점을 정해요',instruction:'기기를 거치해 단서를 함께 읽고, 정해진 통로를 걸어요. 지점에 멈춘 뒤 QR을 확인해요.'};
  if(!me.vote)return {title:'방문한 길 중 다음 길에 투표해요',instruction:'도착·귀환을 함께 확인했으면 우리 모둠의 다음 길을 선택해요.'};
  const waiting=s.groups.filter(g=>!g.vote).length;
  return {title:waiting?`${waiting}모둠의 길 선택을 기다려요`:'함께 같은 길을 다시 의논해요',instruction:waiting?'다른 모둠과 단서를 몸짓으로 전달해요. 기다리는 동안 기기는 놓아요.':'각 모둠의 단서를 다시 연결하고, 우리 모둠의 투표를 바꾸어 볼 수 있어요.'};
 }
 if(game==='expedition-ship')return {title:me.done?'정거장 도착을 확인해요':`다음 목표 · ${Math.min(3,me.ship.checkpoint+1)}번 정거장`,instruction:me.done?'기기를 내려놓고 조종·안내 역할을 교대했는지 확인해요.':'좌우·위아래 담당을 나누고, 한 번에 작은 조작 하나를 바꾸어 천천히 멈춰요.'};
 if(game==='expedition-loop')return {title:me.done?'우리 모둠의 리듬이 연결됐어요':'불빛을 익힌 뒤 한 번 기록해요',instruction:me.done?'조작 역할을 교대하고 다른 모둠의 리듬을 함께 표현해요.':'●는 동작과 입력, ·는 쉼이에요. 입력 담당과 몸동작 담당은 다음 시도에 바꿔요.'};
 if(game==='expedition-rescue')return {title:'바람 보기 → 한 값 조절 → 도착 비교',instruction:'짝은 바람을 몸짓으로 안내해요. 각도와 추진력을 한꺼번에 바꾸지 말고 한 항목씩 비교해요.'};
 if(game==='expedition-shadow')return {title:'기록 → 먼저 보기 → 따라 하기',instruction:'초록 점과 금색 위치를 구분해요. 동작이 보이지 않으면 판정을 멈추고 다시 맞춰요.'};
 return {title:s.phase>=3?'함께 세 관문을 열었어요':`${s.phase+1}번째 관문에 힘을 모아요`,instruction:s.phase>=3?'모두의 역할 교대와 수행을 확인한 뒤 결과를 제출해요.':'아래 관문에서 우리 모둠의 참여를 마치고 확인해요. 공동 진행은 다른 모둠과 함께 바뀌어요.'};
}
export function rhythmTimingHint(taps:number[],pattern:number[]){
 const valid=taps.filter(t=>Number.isFinite(t)&&t>=0&&t<4800);
 if(!valid.length)return '● 불빛 하나부터 보고 기록해요.';
 if(valid.length>pattern.filter(Boolean).length)return '입력이 많아요. ·에서는 쉬고 ●에서 한 번씩만 눌러 비교해요.';
 const offsets=valid.filter(t=>pattern[Math.min(7,Math.round(t/600))]).map(t=>t-Math.round(t/600)*600);
 if(!offsets.length)return '불이 켜진 박자와 쉬는 박자를 다시 구분해요.';
 const mean=offsets.reduce((a,b)=>a+b,0)/offsets.length;
 return Math.abs(mean)<80?'입력과 불빛의 차이가 작아요. 빠뜨린 ●와 쉼을 확인해요.':mean<0?'불빛보다 입력이 빨랐어요. 다음에는 불빛을 기다려 비교해요.':'불빛보다 입력이 늦었어요. 준비 네 박자를 먼저 익혀 비교해요.';
}
