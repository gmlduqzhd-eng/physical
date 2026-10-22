import type { QuestRound, QuestSettings } from './movementQuests.js';
import type { QuestMetadata } from './extendedMovementQuests.js';

export const REFLECTION_QUEST_IDS=['pulse-detective','posture-guardian','campfire-breath','breath-pacer-478'] as const;
export type ReflectionQuestId=typeof REFLECTION_QUEST_IDS[number];
export const BREATH_SOURCE={label:'NHS · 편안한 호흡 안내 (2026-10-22 확인)',url:'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/'};
const base=(name:string,emoji:string,description:string,equipment:string[],rules:string[],alternative:string):QuestMetadata=>({name,emoji,description,equipment,setup:equipment.join(' · ')+' · 기기 거치',rules,alternative});
export const REFLECTION_QUEST_META:Record<ReflectionQuestId,QuestMetadata>={
  'pulse-detective':base('몸의 변화 관찰 탐정','🕵️','쉬기·가볍게 움직이기·다시 쉬기를 비교하고 내 느낌을 기록해요.',['안정된 의자','개인 공간'],['쉬면서 손목의 맥박이나 호흡 느낌을 선택해 살펴요. 목은 누르지 않아요.','가볍게 움직인 뒤 내 느낌이 어떻게 달라졌는지 비교해요.','숫자 측정은 요구하지 않아요. 못 찾거나 기록을 건너뛰어도 괜찮아요.'],'앉아서 팔을 번갈아 움직이고 전후 느낌을 살펴요.'),
  'posture-guardian':base('생활 자세 배달 로봇','🤖','앉기·가벼운 물건 옮기기·방향 바꾸기를 시도하며 편한 방법을 찾아요.',['안정된 의자','가벼운 물건 1개','탁자'],['자세를 오래 고정하지 않고 상황마다 편한 방법을 골라요.','가벼운 물건을 가까이 두고 옮긴 뒤 방향을 천천히 바꾸어요.','불편하면 범위를 줄이거나 대체 동작을 골라요.'],'앉은 자리에서 가벼운 물건을 가까운 두 표식 사이로 옮겨요.'),
  'campfire-breath':{...base('숲 소리 정리 쉼터','🌿','주변 소리를 듣고 어깨와 팔을 편히 두며 활동을 마무리해요.',['안정된 의자 또는 개인 공간'],['편하게 앉거나 서서 주변의 소리 하나를 찾아요.','호흡을 참거나 깊게 강요하지 않고 내 속도로 쉬어요.','불편하면 안내를 멈추고 평소 호흡으로 돌아와요.'],'의자에 편히 앉아 팔을 내려놓고 주변 소리를 들어요.'),sources:[BREATH_SOURCE]},
  'breath-pacer-478':{...base('내 속도 호흡 쉼터','🌬️','숨 참기 없이 편한 들숨과 날숨을 골라 짧게 쉬어요.',['등을 지지하는 안정된 의자'],['신호는 참고만 하고 내가 편한 호흡을 우선해요.','숫자에 맞춰 숨을 참거나 내쉬기를 억지로 늘리지 않아요.','어지럽거나 불편하면 멈추고 가까운 어른에게 알려요.'],'편하게 앉아 신호 없이 평소 호흡을 해도 돼요.'),sources:[BREATH_SOURCE]},
};

export function makeReflectionQuest(id:ReflectionQuestId,round:number,s:QuestSettings,choice?:string):QuestRound{
  const guided=choice==='guided';
  const p:QuestRound={title:['준비 살피기','방법 시도','느낌 비교'][round],goal:'내 몸의 느낌을 살펴요',hint:'느낌과 선택은 개인 관찰 기록이에요. 건강 상태나 체력을 진단하지 않아요.',choices:[{id:'own',label:'내 리듬으로 하기',detail:'편한 범위와 속도를 스스로 골라요.'},{id:'guided',label:'작은 신호 참고하기',detail:'안내를 참고하되 불편하면 내 속도로 바꿔요.'}],cues:[],cueMs:s.gentle?5000:4000,repeats:1,confirmation:'편한 방법을 시도하고 내 느낌을 살펴봤어요',reflection:{prompt:'지금 느낌은 어떤가요? (선택 사항)',options:['편했어요','범위를 줄였어요','잠깐 쉬었어요','기록 건너뛰기']}};
  if(id==='pulse-detective'){
    p.choices=[{id:'own',label:'호흡 느낌 살피기',detail:'숫자 없이 편안한 호흡의 느낌을 살펴요.'},{id:'guided',label:'손목 맥박 살피기',detail:'편하게 손목을 짚어 보고, 못 찾으면 호흡을 살펴도 돼요.'}];
    p.title=['쉬는 몸 관찰','가벼운 움직임 후 관찰','다시 쉬며 비교'][round];p.goal=p.title;
    const observe=guided?'손목 안쪽에 두 손가락을 가볍게 대보기 · 목 누르지 않기':'호흡이 어떻게 느껴지는지 살피기';
    p.cues=round===0?['편한 자세로 앉아 쉬기',observe,'느낌을 말로 떠올리기']:round===1?[s.seated?'양팔을 번갈아 가볍게 움직이기':'편하게 제자리걸음하기',s.seated?'팔을 편한 범위로 움직이기':'속도를 올리지 않고 걸음 이어가기','편히 멈추기',observe]:['편하게 앉아 쉬기','팔을 내려놓고 평소 호흡하기',observe,'활동 전후 느낌을 비교하기'];
    p.reflection={prompt:round===0?'쉬는 몸에서 무엇을 느꼈나요? (선택 사항)':'앞 관찰과 비교한 느낌은? (선택 사항)',options:round===0?['호흡을 느꼈어요','손목 맥박을 찾았어요','잘 모르겠어요','기록 건너뛰기']:['조금 빨라진 느낌','비슷한 느낌','조금 느려진 느낌','잘 모르겠어요','기록 건너뛰기']};
    p.hint='느낌에 정답이나 정상 범위 점수는 없어요. 손목에서 못 찾으면 그냥 건너뛰어요. 불편하면 움직임을 멈춰요.';
  }else if(id==='posture-guardian'){
    p.choices=[{id:'own',label:'가까운 두 자리',detail:'물건을 몸 가까운 두 위치로 옮겨요.'},{id:'guided',label:'방향을 바꾸는 두 자리',detail:'발 또는 몸 전체의 방향을 천천히 바꾸어 옮겨요.'}];
    if(round===0)p.choices=[{id:'own',label:'물건 가까이 놓기',detail:'자주 쓰는 물건을 편히 닿는 곳에 둬요.'},{id:'guided',label:'팔 거리 살피기',detail:'물건에 손이 편히 닿는 거리를 찾아요.'}];
    if(round===2)p.choices=[{id:'own',label:'정면 두 표식 연결',detail:'가까운 정면 위치를 연결해요.'},{id:'guided',label:'양옆 두 표식 연결',detail:'천천히 방향을 바꾸어 연결해요.'}];
    p.title=['앉는 자리 정비','가벼운 물건 배달','방향 바꾸어 정리'][round];p.goal=p.title;
    p.cues=round===0?['안정된 의자에 앉아 발과 팔을 편히 두기',guided?'팔을 편히 뻗어 닿는 곳을 살펴 물건 위치 조절':'물건을 몸 가까운 탁자 위치에 놓기','같은 자세를 오래 고정하지 않고 팔을 가볍게 풀기']:round===1?['가벼운 물건을 몸 가까이 들기',s.seated?'앉아서 가까운 옆 표식으로 옮기기':guided?'물건을 가까이 든 채 발 방향을 바꾸어 옮기기':'정면 가까운 탁자로 물건 옮기기','물건을 내려놓고 팔 풀기']:['물건을 출발 표식에서 집기',s.seated?(guided?'양옆 닿는 범위의 표식으로 물건 옮기기':'정면 두 표식으로 물건 옮기기'):(guided?'발을 조금씩 옮겨 전체 방향 바꾸기':'정면 한 걸음 거리로 물건 옮기기'),'도착 표식에 내려놓고 편했던 방법 비교'];
    p.confirmation='앉기·옮기기 미션에서 내게 편한 방법을 시도했어요';
  }else{
    p.hint='숨을 참는 구간이 없어요. 화면보다 내 호흡을 우선해요. 어지럽거나 불편하면 즉시 멈추고 어른에게 알려요.';
    if(id==='campfire-breath'){
      p.title=['주변 소리 찾기','어깨와 팔 풀기','숲 쉼터 마무리'][round];p.goal=p.title;
      p.cues=round===0?['발과 팔을 편히 두어요',guided?'주변의 가까운 소리 하나를 찾아요':'눈을 뜨고 편히 주변을 살펴요','평소 호흡으로 쉬어요']:round===1?[guided?'어깨를 편안히 내려놓아요':'내가 편한 자세로 어깨 힘을 풀어요',guided?'손에 힘을 풀고 팔을 편히 두어요':'팔을 내가 편한 위치에 두어요','무리하게 숨을 깊이 쉬지 않아요']:['내가 편한 호흡으로 쉬어요',guided?'주변 소리 하나를 다시 찾아요':'내가 편한 시선과 자세를 골라요','천천히 팔을 움직이고 활동을 마쳐요'];
    }else{
      p.title=['편한 자리 고르기','내 호흡 따라가기','쉼 돌아보기'][round];p.goal=p.title;
      p.cues=round===0?['등을 지지하고 편히 앉아요',guided?'손과 발을 차례로 편히 두어요':'내가 편한 위치에 손과 발을 두어요','호흡을 바꾸려 애쓰지 않고 느껴요']:round===1?Array.from({length:4},(_,i)=>guided?(i%2?'편하게 내쉬어요 · 신호보다 내 호흡 우선':'편하게 들이쉬어요 · 무리하지 않기'):'내 속도로 자연스럽게 호흡해요'):['평소 호흡으로 쉬어요',guided?'어깨와 손에 힘을 차례로 풀어요':'내 속도로 편하게 쉬어요','작은 팔 동작으로 마무리해요'];
    }
  }
  return p;
}
