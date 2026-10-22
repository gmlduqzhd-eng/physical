import type { QuestRound, QuestSettings } from './movementQuests.js';

export const EXTENDED_QUEST_IDS = ['jump','squat','run','plank','one_leg','fitness','red_green','memory','stopwatch','relay-mission-runner','space-occupier','open-space-tactician'] as const;
export type ExtendedQuestId = typeof EXTENDED_QUEST_IDS[number];
export interface QuestMetadata {
  name: string; emoji: string; description: string; setup: string; rules: string[]; alternative: string;
  equipment?: string[]; team?: boolean; maxPlayers?: number; sources?: {label:string;url:string}[];
}
const fixed = '기기는 거치하고 개인 공간에서 수행해요.';
const seated = '앉아서 표식을 짚거나 팔을 움직이는 대체 동작을 선택할 수 있어요.';
function meta(name: string, emoji: string, description: string, equipment: string[], rules: string[], alternative = seated, team = false): QuestMetadata {
  return { name, emoji, description, equipment, setup: equipment.join(' · ') + ' · 기기 거치', rules, alternative, team, maxPlayers: team ? 4 : 1 };
}
export const EXTENDED_QUEST_META: Record<ExtendedQuestId, QuestMetadata> = {
  jump: meta('징검섬 배달부','🏝️','섬 세 곳을 딛거나 낮게 건너며 배달 순서를 완성해요.', ['미끄럽지 않은 바닥 표식 3개'], ['표식을 편한 한 걸음 간격으로 놓아요.','딛기 또는 낮게 건너기를 고르고, 출발 섬으로 돌아와요.','소리와 큰 신호를 따라가고 끝난 뒤 배달 결과를 확인해요.']),
  squat: meta('높낮이 보물 선반','🧰','내가 닿는 낮음·중간·높음 위치에 보물을 옮기는 작전이에요.', ['가벼운 물건 1개','높이가 다른 안전한 표식 3개'], ['낮은 곳은 편한 범위로 몸을 낮추고, 높은 곳은 팔을 뻗어요.','내 몸에 맞는 선반을 고르고 세 위치를 연결해요.','횟수 경쟁 없이 물건을 옮긴 과정을 확인해요.']),
  run: meta('내 페이스 우편길','📮','제자리걸음과 옆걸음을 골라 일정한 속도로 우편길을 이어요.', ['개인 보행 공간','양옆 표식 2개'], ['기기는 놓고 출발 표식에 서요.','빠르게 뛰는 대신 선택한 걸음으로 신호를 따라가요.','돌아온 뒤 어느 구간이 편했는지 비교해요.']),
  plank: meta('튼튼 다리 설계자','🌉','벽을 짚거나 앉아서 양손을 맞대며 짧게 힘을 주고 쉬는 다리를 만들어요.', ['안정된 벽 또는 의자'], ['기기를 몸에 올리지 않아요.','벽 짚기 또는 앉은 양손 맞대기를 골라요.','짧게 지지하기와 쉬기를 번갈아 하고 숨을 편하게 쉬어요.'], '앉아서 손바닥을 가볍게 맞대었다 풀어요.'),
  one_leg: meta('균형 등대 지키기','🗼','발끝을 대거나 한 발을 살짝 들고, 팔 방향을 바꾸며 등대를 지켜요.', ['안정된 지지물','개인 공간'], ['필요하면 지지물을 가볍게 잡아요.','발끝 대기 또는 잠깐 들기를 고르고 양쪽을 바꾸어요.','흔들려도 발을 내려놓고 다시 참여해요.']),
  fitness: meta('내가 고르는 운동 원정','🧭','이동·균형·팔다리 연결을 하나씩 골라 나만의 세 구간 코스를 만들어요.', ['개인 공간','바닥 표식 2개'], ['첫 구간은 이동, 다음은 균형, 마지막은 팔다리 연결이에요.','각 구간에서 내 수준에 맞는 동작을 골라요.','한 종류만 반복하지 않고 서로 다른 움직임을 경험해요.']),
  red_green: meta('신호등 구조 산책','🚦','걷기·멈춤·느린 걸음을 구별하고 바뀌는 신호에 몸으로 반응해요.', ['개인 보행 통로'], ['초록은 걷기, 빨강은 멈춤, 노랑은 작은 걸음이에요.','기기는 놓고 신호에 맞춰 몸을 움직여요.','틀려도 탈락하지 않고 다음 신호부터 다시 참여해요.']),
  memory: meta('기억의 보급 발자국','🧠','잠깐 본 무늬 순서를 기억해 실제 표식을 방문하고 순서를 복기해요.', ['● ▲ ■ ◆ 표식 4개'], ['순서를 먼저 보고 기억해요.','화면에서 순서가 가려지면 표식을 차례로 방문해요.','다녀온 순서를 기록하고 비교해요. 틀리면 다시 연습해도 돼요.']),
  stopwatch: meta('몸으로 느끼는 시간길','⏳','시계를 보지 않고 걸으며 목표 시간을 느껴 보고 내 예상과 비교해요.', ['개인 공간'], ['목표 시간을 확인하고 제자리걸음 또는 팔 동작을 골라요.','시간 표시 없이 활동하다 목표 시간이라고 느끼면 끝내요.','예상과 기록의 차이를 보고 다음 작전을 조절해요.']),
  'relay-mission-runner': meta('기기 없는 보급 릴레이','🏃','기기는 출발점에 두고 역할을 바꾸며 가벼운 물건을 운반해요.', ['개인별 분리 통로','가벼운 물건','출발·반환 표식'], ['기기를 바통으로 들고 이동하지 않아요.','운반 순서인 친구가 다녀오는 동안 나머지는 자기 자리에서 가볍게 걸어요.','역할을 바꾸어 모두 운반과 대기 동작에 참여해요.'], seated, true),
  'space-occupier': meta('빈 섬 탐사대','🗺️','닫힌 섬을 피해 서로 다른 섬을 맡고 함께 안전한 배치를 만들어요.', ['번호 표식 6개','개인별 분리 동선'], ['닫힌 섬을 확인하고 이동 방향을 고르세요.','화면에 배정된 서로 다른 섬으로 걸어요.','모두 도착하면 출발점으로 돌아와 다음 배치를 시도해요.'], seated, true),
  'open-space-tactician': meta('빈길 패스 설계단','🛤️','막힌 길을 피하는 코스를 고르고 공 전달과 걷기로 계획을 실행해요.', ['3×3 바닥 표식','부드러운 공 1개','개인별 분리 통로'], ['막힌 칸을 피해 가능한 길을 골라요.','걷기와 공 전달 역할을 나누고 순서대로 수행해요.','작전마다 역할을 바꾸고 계획대로 이동했는지 비교해요.'], seated, true),
};

function routeChoices() { return [
  { id:'upper', label:'위쪽 길', detail:'7 → 4 → 1 → 2 → 3', path:[6,3,0,1,2] },
  { id:'lower', label:'아래쪽 길', detail:'7 → 8 → 9 → 6 → 3', path:[6,7,8,5,2] },
  { id:'middle', label:'가운데 길', detail:'7 → 4 → 5 → 6 → 3', path:[6,3,4,5,2] },
]; }
export function makeExtendedQuest(id: ExtendedQuestId, round: number, s: QuestSettings, selected?: string): QuestRound {
  const choices = (a:string,b:string) => [{id:'easy',label:a,detail:'내가 편하게 할 수 있는 방법이에요.'},{id:'challenge',label:b,detail:'익숙해지면 다른 방법에 도전해요.'}];
  const hard=selected==='challenge', cueMs=s.gentle?4500:3500;
  const plan:QuestRound={title:['규칙 익히기','방법 바꾸기','연결 도전'][round],goal:'선택한 몸 미션을 연결해요',hint:fixed,choices:[],cues:[],cueMs,repeats:1,confirmation:'선택한 움직임을 안전한 범위에서 시도했어요'};
  const move=(standing:string,alternative:string)=>s.seated?alternative:standing;
  switch(id){
    case 'jump': plan.choices=choices('한 걸음씩 딛기','낮게 건너기');plan.goal='세 섬을 방문하고 출발 섬으로 돌아오기';plan.cues=(round===0?[1,2,3,2,1]:round===1?[1,3,2,3,1]:[1,2,1,3,1]).map(n=>move(`${n}번 섬 · ${hard?'낮게 건너고 조용히 멈추기':'한 걸음 딛고 멈추기'}`,`${n}번 표식에 팔을 뻗어 짚기`));plan.hint='건너기가 불편하면 언제든 딛기로 바꾸어요. 높이와 횟수를 측정하지 않아요.';break;
    case 'squat': {plan.choices=choices('가까운 선반','옆으로 한 걸음 있는 선반');plan.goal='낮음·중간·높음 선반에 보물 옮기기';const levels=round===0?['중간','낮음','중간','높음']:round===1?['높음','중간','낮음','중간']:['낮음','높음','낮음','중간'];plan.cues=levels.map(level=>move(`${hard?'옆 표식으로 한 걸음 · ':''}${level} 선반으로 물건 옮기기`,`${level} 위치로 팔을 뻗어 물건 옮기기`));plan.hint='낮은 선반은 무릎을 편하게 굽혀 닿는 범위에 두어요. 깊게 앉을 필요는 없어요.';break;}
    case 'run': plan.choices=choices('제자리 우편길','좌우 우편길');plan.goal='내 걸음 속도를 유지하며 출발점으로 돌아오기';plan.cues=Array.from({length:6},(_,i)=>move(hard?`${i%2?'출발점':'옆 표식'}까지 작은 옆걸음`:`${i+1}구간 · 편한 제자리걸음`,`${i%2?'왼팔':'오른팔'}을 뻗고 반대 손을 허벅지에`));plan.repeats=round===2?2:1;plan.hint='다음 작전에서는 보폭을 줄이거나 넓혀 자기 페이스를 찾아요. 걸음 수나 심박수는 측정하지 않아요.';break;
    case 'plank': plan.choices=choices('벽을 가볍게 짚기','앉아 양손 맞대기');plan.goal='짧게 지지하기와 쉬기를 세 번 번갈아 하기';plan.cues=Array.from({length:6},(_,i)=>i%2?'힘을 풀고 편하게 쉬어요':s.seated||hard?'앉아서 손바닥을 가볍게 맞대어요':'벽에 손을 짚고 편한 힘으로 지지해요');plan.cueMs=s.gentle?5000:4000;plan.hint='몸에 기기를 올리거나 화면을 계속 누르지 않아요. 힘을 최대로 주지 않고 숨을 편하게 쉬어요.';break;
    case 'one_leg': plan.choices=choices('발끝을 바닥에 대기','한 발을 잠깐 들기');plan.goal='양쪽을 번갈아 지지하고 팔 방향 바꾸기';plan.cues=['오른쪽','왼쪽','오른쪽','왼쪽'].map((side,i)=>move(`${side} 발로 지지 · 다른 발은 ${hard?'살짝 들기':'발끝 대기'} · 팔 ${i<2?'옆으로':'앞으로'}`,`${side} 팔을 ${i<2?'옆':'앞'}으로 뻗고 잠깐 유지`));plan.hint='흔들리면 발을 내려놓고 다시 참여해요. 필요하면 지지물을 잡고 눈을 뜬 채 활동해요.';break;
    case 'fitness': {const pairs=[['큰 걸음','옆걸음'],['발끝 대고 균형','팔 뻗어 균형'],['무릎과 반대 손','팔과 발 교차']];plan.choices=choices(...pairs[round] as [string,string]);plan.title=['이동 구간','균형 구간','팔다리 연결 구간'][round];const action=pairs[round][hard?1:0];plan.goal=action+'으로 나만의 코스 완성';plan.cues=Array.from({length:6},(_,i)=>i%3===2?'멈추고 편하게 숨 쉬기':move(action+' · 편한 범위에서 연결',i%2?'왼팔 뻗고 오른손 허벅지 짚기':'오른팔 뻗고 왼손 허벅지 짚기'));break;}
    case 'red_green': {plan.choices=choices('걷고 멈추기','옆걸음과 작은 걸음');const signals=round===0?['초록','초록','빨강','초록','빨강']:round===1?['초록','노랑','빨강','노랑','초록']:['노랑','초록','빨강','초록','노랑','빨강'];plan.goal='신호에 따라 움직임을 바꾸고 다음 신호에 다시 참여하기';plan.cues=signals.map(c=>c==='빨강'?'빨강 ■ · 그 자리에서 멈추기':c==='노랑'?move('노랑 ▲ · 작은 걸음', '노랑 ▲ · 팔을 작게 움직이기'):move(`초록 ● · ${hard?'옆걸음':'걷기'}`,'초록 ● · 양팔 번갈아 움직이기'));plan.hint='실수해도 탈락하지 않아요. 빨강이 되면 제자리에서 멈추고 다음 신호부터 다시 참여해요.';break;}
    case 'memory': {const symbols=['● 동그라미','▲ 세모','■ 네모','◆ 마름모'];const length=round+2;const offset=(s.seed??0)%4;const order=Array.from({length},(_,i)=>symbols[(i*(hard?3:1)+round+offset)%4]);plan.choices=choices('가까운 표식','한 걸음 넓은 표식');plan.goal=`${length}개 무늬 순서를 기억해 표식 방문하기`;plan.preview=order;plan.question={prompt:'실제로 다녀온 순서를 골라요',options:symbols,answer:order};plan.cues=Array.from({length},()=>move('기억한 다음 표식을 방문해요', '기억한 다음 표식으로 팔을 뻗어요'));plan.hint=hard?'표식 간격을 편한 한 걸음 더 넓혀요. 순서는 활동 전에만 보여요.':'표식 네 개를 가까이 놓아요. 순서는 활동 전에만 보여요.';break;}
    case 'stopwatch': plan.choices=choices('제자리걸음으로 느끼기','팔 동작으로 느끼기');plan.goal=`시계를 보지 않고 ${8+round*2}초 느껴 보기`;plan.timing={targetSeconds:8+round*2,toleranceSeconds:s.gentle?3:2};plan.cues=[hard||s.seated?'양팔을 번갈아 움직이며 시간을 느껴요':'편하게 제자리걸음하며 시간을 느껴요'];plan.hint='목표 시간이라고 느끼면 종료 버튼을 눌러요. 기록된 시간과 예상의 차이를 비교하고 다시 도전할 수 있어요.';break;
    case 'relay-mission-runner': {const players=s.practice?1:s.players;plan.choices=choices('가까운 반환점','조금 먼 반환점');plan.goal='기기는 두고 보급품을 운반하며 모두 역할 바꾸기';plan.roles=Array.from({length:players},(_,i)=>`${(i+round)%players+1}번: 운반 차례 외에는 제자리걸음`);plan.cues=Array.from({length:players},(_,i)=>[move(`${(i+round)%players+1}번 · ${hard?'먼':'가까운'} 표식으로 물건 운반`,`${(i+round)%players+1}번 · 옆 표식으로 물건 옮기기`),move('운반자는 돌아오기 · 나머지는 제자리걸음','물건을 돌려놓고 팔 풀기')]).flat();plan.cueMs=s.gentle?6500:5000;plan.hint='출발·반환 통로를 분리해요. 걷기로 이동하고 반환점은 안내 시간 안에 여유 있게 다녀올 거리로 두어요.';break;}
    case 'space-occupier': {const closed=round+2;const available=[1,2,3,4,5,6].filter(n=>n!==closed);if(hard)available.reverse();const players=s.practice?1:s.players;plan.choices=choices('시계 방향 탐사','반대 방향 탐사');plan.goal=`${closed}번 섬을 피해 서로 다른 섬으로 이동하기`;plan.roles=Array.from({length:players},(_,i)=>`${i+1}번 친구 → ${available[(i+round)%available.length]}번 섬`);plan.cues=[...plan.roles.map(role=>move(role+'으로 걷기',role+' 표식 짚기')),move('각자 출발점으로 돌아오기','팔을 편히 내리기')];plan.hint='친구가 있는 섬을 빼앗지 않아요. 각자의 분리된 통로에서 배치한 번호 표식으로 이동해요.';plan.confirmation='닫힌 섬을 피하고 서로 다른 섬 배치를 시도했어요';break;}
    case 'open-space-tactician': {plan.choices=routeChoices();plan.blocked=[4,1,5][round];const path=plan.choices.find(c=>c.id===selected)?.path??plan.choices[0].path!;plan.goal='막힌 칸을 피해 걸으며 공 전달 코스 실행하기';plan.cues=path.map((n,i)=>move(`${n+1}번 표식으로 걷기${i===2?' · 멈춰서 공 전달':''}`,`${n+1}번 표식 짚기${i===2?' · 공 굴려 전달':''}`));plan.roles=s.practice?['혼자 경로를 걷고 공은 표적으로 굴리기']:Array.from({length:s.players},(_,i)=>`${i+1}번: ${i===round%s.players?'공 전달 후 이동':'자기 통로에서 경로 따라 이동'}`);plan.confirmation='막힌 칸을 피하는 계획을 실행하고 공 전달 역할을 바꾸었어요';break;}
  }
  if(!plan.choices.length||!plan.cues.length)throw new Error('Missing extended quest: '+id);
  return plan;
}
