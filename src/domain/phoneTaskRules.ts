import type {PhonePlay} from './phonePlayCatalog.js';
export function phoneMemoryTask(p:PhonePlay,round:number,easy=false,challenge=false,fill?:string){
 const base=Array.from({length:easy?Math.min(2,p.cues.length):challenge?4:Math.min(3,p.cues.length)},(_,i)=>p.cues[(i+round)%p.cues.length]);
 let expected=[...base],shown=[...base],prompt='처음 익힌 기본 동작 순서 되짚기',rule=p.rounds[round];
 if(p.id==='phone-play-006'){const missing=round%base.length;expected=[base[missing]];shown=base.map((c,i)=>i===missing?'빈칸 · 빠진 동작을 기억해요':c);prompt='시범에서 빠진 동작 하나 고르기';rule=`처음 순서를 익힌 뒤 ${missing+1}번째 빈칸의 동작을 찾아 몸으로 표현해요.`;}
 if(p.id==='phone-play-014'){expected=[...base].reverse();prompt='거꾸로 표현한 동작 순서';rule='기본 순서를 익힌 뒤 마지막 동작부터 거꾸로 몸으로 해요.';}
 if(p.id==='phone-play-033'){expected=[...base.slice(0,3),fill&&p.cues.includes(fill)?fill:p.cues[round%p.cues.length]];shown=[...base.slice(0,3),'내가 고른 네 번째 동작'];prompt='빈 박자를 채운 네 동작의 순서';rule='네 번째 박자에 넣을 동작을 고르고, 세 동작과 이어 몸으로 표현해요.';}
 if(p.id==='phone-play-003')rule='새 신호가 나올 때 바로 앞 신호의 동작을 해요. 첫 신호에서는 준비하고 기다려요.';
 if(p.id==='phone-play-012'){expected=base.slice(0,Math.min(base.length,round+2));rule='끝 자세를 기억해 다음 동작 하나와 연결해요. 과제가 바뀌면 연결을 하나 더 익혀요.';}
 if(p.id==='phone-play-028'){const swap=(text:string)=>text.replaceAll('왼','__SIDE__').replaceAll('오른','왼').replaceAll('__SIDE__','오른');expected=base.map(c=>p.cues.includes(swap(c))?swap(c):c);prompt='좌우를 바꾸어 읽은 기본 순서';rule='오른쪽·왼쪽이 있는 신호는 반대편 동작으로 바꾸어 표현해요.';}
 return {base,expected,shown,prompt,rule};
}
export function phoneRoundCheck(p:PhonePlay,round:number){return `이번 과제 ‘${p.rounds[round]}’에 참여한 역할과 동작을 직접 확인했어요.`;}
export function phoneObservation(p:PhonePlay){
 const measured:Record<string,{label:string;options:string[]}>= {
  '017':{label:'두 팔의 높이 관찰',options:['서로 비슷해요','서로 달라요','관찰하기 어려워요']},
  '021':{label:'바꾼 자세의 흔들림 관찰',options:['움직임이 작아 보여요','움직임이 커 보여요','차이를 정하기 어려워요']},
  '027':{label:'발바닥 접촉을 느낀 위치',options:['앞쪽에 가까워요','가운데에 가까워요','뒤쪽에 가까워요','구별하기 어려워요']},
  '045':{label:'주변에 닿지 않는 팔 움직임 크기',options:['접은 팔 범위','작게 펼친 팔 범위','손만 움직이는 범위']},
  '059':{label:'처음 익힌 속도와 비교',options:['비슷한 속도예요','조금 빨라졌어요','조금 느려졌어요','비교하기 어려워요']},
  '090':{label:'계획과 실행이 달랐던 부분',options:['팔 방향','동작 순서','끝 자세','같아 보여요','아직 모르겠어요']},
  '091':{label:'지금 몸 느낌을 날씨 몸짓으로',options:['맑음','구름','바람','선택하지 않음']},
  '092':{label:'손을 모으고 펼 때의 느낌',options:['편안해요','다른 느낌이에요','차이를 모르겠어요','쉬고 싶어요']},
  '094':{label:'자연스러운 숨과 팔 움직임의 느낌',options:['편안해요','동작을 더 작게 하고 싶어요','멈추고 쉬고 싶어요','차이를 모르겠어요']},
  '096':{label:'작은 팔 움직임 전후 어깨 느낌',options:['편안해요','다른 느낌이에요','차이를 모르겠어요','쉬고 싶어요']},
  '098':{label:'앞에서 편하게 가리킨 모양',options:['둥근 모양','각진 모양','편하게 느낀 색','아직 고르지 않음']},
 };
 if(measured[p.id.slice(-3)])return measured[p.id.slice(-3)];
 if(p.category==='균형·협응')return {label:'동작 크기와 중심 관찰',options:['작은 범위로 움직였어요','좌우 크기가 달랐어요','쉬며 살펴봤어요']};
 if(p.category==='리듬·표현')return {label:'움직임 빠르기 관찰',options:['천천히 표현했어요','보통 빠르기로 표현했어요','중간에 쉬었어요']};
 if(p.category==='이동·공간')return {label:'출발 자리로 돌아온 위치',options:['출발 자리 근처예요','출발 자리와 달라요','앉아서 방향을 짚었어요']};
 return {label:'내가 선택한 움직임 관찰',options:['작게 움직였어요','편한 동작을 바꿨어요','쉬며 살펴봤어요']};
}
export function phoneScenario(p:PhonePlay,round:number){return [`‘${p.rounds[round]}’ · 각자의 통로를 먼저 확인할 수 있는 상황`,`‘${p.rounds[round]}’ · 움직일 공간이 줄어 작은 동작이 필요한 상황`,`‘${p.rounds[round]}’ · 앉은 참여자와 함께 방법을 정하는 상황`][round];}
export function phoneBundle(raw:number,carry:number){const total=Math.max(0,Math.floor(raw))+Math.max(0,Math.min(1,Math.floor(carry)));return {count:Math.floor(total/2),remainder:total%2};}
