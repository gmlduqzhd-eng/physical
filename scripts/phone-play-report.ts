import fs from 'node:fs';
import {PHONE_CATEGORIES,PHONE_PLAYS} from '../src/domain/phonePlayCatalog';
import {PHONE_PLAY_EXPANSION} from '../src/domain/phonePlayExpansion';
const out=process.argv[2]||'../../outputs/phone-plays';fs.mkdirSync(out,{recursive:true});
const candidates=[...PHONE_PLAYS,...PHONE_PLAY_EXPANSION.filter(row=>!PHONE_PLAYS.some(p=>p.id===`phone-play-${String(row[0]).padStart(3,'0')}`)).map(([n,name,c,kind,players,space,goal,rules,rounds,cues,check,easy,hard,seated,related])=>({id:`phone-play-${String(n).padStart(3,'0')}`,name,category:PHONE_CATEGORIES[c],kind,players,space,goal,rules:rules.split('|'),rounds:rounds.split('|'),cues:cues.split('|'),check,easy,hard,seated,related,minutes:players==='모둠'?6:4,intensity:c===1||c===7?'낮음':'보통'}))].sort((a,b)=>a.id.localeCompare(b.id));
const excluded=[
 ['색만 바꾸는 신호등','red_green','색과 이름만 바꾸면 기존 신호 규칙 전환과 같아 제외'],['시간만 바꾼 얼음 자세','freeze','멈춤 시간 차이는 기존 활동의 난이도에 해당'],['걸음으로 초 맞추기','stopwatch','기존 몸속 시계의 시간 추정과 같아 제외하고 거리 암호로 교체'],['표식 기억 순서 추가','exp-phone-05','기존 표식 기억 활동의 코스로 처리할 내용'],['한 발 오래 버티기','one_leg','시간을 늘리는 방식만으로 별도 놀이를 만들지 않음'],['그대로 따라 하는 거울','partner-robot-lab','단순 복제는 기존 짝 표현과 중복'],['운동 횟수만 바꾼 룰렛','fitness','횟수 변경은 난이도 차이로 분류'],['호흡 숫자만 바꾼 타이머','campfire-breath','호흡 간격 변경만으로 별도 놀이를 늘리지 않음'],['방향만 추가한 표식 터치','zone_touch','기존 표식 이동 코스와 중복하며 별도 준비물 조건에도 맞지 않음'],['팔 돌리기 속도 경쟁','wave','동작 속도만 바꾸는 별도 항목을 제외'],['박자만 바꾼 몸 합주','body-rhythm-orchestrator','음악 속도 차이만으로 별도 놀이를 만들지 않음'],['기기를 바통으로 든 달리기','relay-mission-runner','스마트폰을 들고 달리는 방식은 새 목록에서 제외'],
];
const counts=Object.fromEntries(PHONE_CATEGORIES.map(c=>[c,candidates.filter(p=>p.category===c).length]));
fs.writeFileSync(out+'/catalog.json',JSON.stringify({candidateCount:candidates.length,releasedCount:PHONE_PLAYS.length,categories:counts,excluded,plays:candidates},null,2));
let md='# 스마트폰만으로 하는 몸 놀이 100가지\n\n스마트폰 1대는 활동 구역 밖에 내려놓습니다. 별도 준비물·카메라·마이크·GPS는 필요하지 않습니다. PC에서도 안내를 열 수 있습니다. 점수는 직접 확인한 수행 기록이며 자동 측정·체력 판정이 아닙니다.\n\n';
md+='| 분류 | 개수 |\n|---|---:|\n'+Object.entries(counts).map(([c,n])=>`| ${c} | ${n} |`).join('\n')+'\n\n';
md+='## 중복 검토로 추가하지 않은 초안 12개\n\n| 초안 | 기존 활동 | 처리 이유 |\n|---|---|---|\n'+excluded.map(row=>'| '+row.join(' | ')+' |').join('\n')+'\n\n기존 활동·링크·기록은 삭제하지 않습니다. 새 목록의 이름·횟수·시간 차이만으로 독립 항목을 만들지 않고 규칙·상호작용·성공 기준을 함께 검토했습니다.\n\n';
for(const category of PHONE_CATEGORIES){md+=`## ${category}\n\n| 번호 | 놀이 | 인원 | 시간 | 공간 | 목표 |\n|---|---|---|---|---|---|\n`;md+=candidates.filter(p=>p.category===category).map(p=>`| ${p.id.split('-').at(-1)} | ${p.name} | ${p.players} | 약 ${p.minutes}분 | ${p.space} | ${p.goal} |`).join('\n')+'\n\n';}
md+='## 놀이별 진행 안내\n\n';for(const p of candidates){md+=`### ${p.id} · ${p.name}\n\n${p.goal}\n\n${p.rules.map((r,i)=>`${i+1}. ${r}`).join('\n')}\n\n- 세 과제: ${p.rounds.join(' → ')}\n- 완료 확인: ${p.check}\n- 쉬운 방법: ${p.easy}\n- 추가 도전: ${p.hard}\n- 앉은 대안: ${p.seated}\n\n`;}
fs.writeFileSync(out+'/놀이_100가지_분류표.md',md);console.log(JSON.stringify({candidateCount:candidates.length,releasedCount:PHONE_PLAYS.length,categories:counts}));
