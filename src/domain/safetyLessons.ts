import type { GameResultDetails } from './gameResultDetails.js';

export const SAFETY_LESSON_IDS=['cpr-compression-110','aed-defibrillator-pad','water-rescue-throw','heatwave-pm25-shield','rice-treatment-firstaid'] as const;
export type SafetyLessonId=typeof SAFETY_LESSON_IDS[number];
export interface SafetyChoice {id:string;label:string;feedback:string}
export interface SafetyScenario {title:string;situation:string;choices:SafetyChoice[];answer:string;explanation:string;rehearsal:string}
export interface SafetyLessonSpec {name:string;emoji:string;description:string;equipment:string[];boundary:string;sources:{label:string;url:string}[];scenarios:SafetyScenario[]}
const c=(id:string,label:string,feedback:string):SafetyChoice=>({id,label,feedback});
const q=(title:string,situation:string,right:string,wrong:string,explanation:string,rehearsal:string):SafetyScenario=>({title,situation,choices:[c('safe',right,explanation),c('rethink',wrong,'다시 살펴봐요. '+explanation)],answer:'safe',explanation,rehearsal});
const cprSources=[{label:'질병관리청 · 심폐소생술',url:'https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=6226'},{label:'AHA · 2025 성인 기본소생술',url:'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support'}];
export const SAFETY_LESSONS:Record<SafetyLessonId,SafetyLessonSpec>={
 'cpr-compression-110':{name:'도움을 잇는 심폐소생 안전교실',emoji:'🆘',description:'현장 확인·도움 요청·전문 안내 연결을 상황 카드와 몸짓으로 익혀요.',equipment:['상황 카드','안전한 교실 공간'],boundary:'안전 학습이에요. 친구 몸을 누르거나 실제 119에 연습 전화를 하지 않아요. 실제로 반응이 없고 정상 호흡이 없으면 119에 신고하고 상담원의 지시를 따라요. 압박 실습은 전문 강사와 교육용 마네킹으로 배워요.',sources:cprSources,scenarios:[
  q('주변부터 살펴요','사람이 쓰러져 있어요. 주변에는 움직이는 차량이 있어요.','내 안전을 확보하고 어른에게 위험을 알려요','바로 차도로 뛰어들어요','구조자도 안전해야 도움을 줄 수 있어요. 위험한 곳으로 뛰어들지 않아요.','교실의 안전한 위치를 가리키고 “여기서 도움을 요청할게요”라고 말해요.'),
  q('119와 AED를 연결해요','안전한 곳에서 확인했는데 반응이 없고 정상 호흡이 없어요.','119에 신고하고 주변 사람에게 AED를 요청해요','혼자 화면의 압박 버튼만 눌러요','지체 없이 119와 AED를 요청하고 상담원의 안내를 따라요. 화면 탭은 실제 가슴압박이 아니에요.','전화 연결 없이 “○○님은 119 신고, ○○님은 AED를 부탁해요”라고 역할을 나누어 말해요.'),
  q('실습 장소를 구별해요','심폐소생술 동작을 더 배우고 싶어요.','전문 강사와 교육용 마네킹으로 배워요','친구 가슴을 눌러 연습해요','실제 심장정지 대응과 이 교실 연습은 달라요. 이 앱은 압박 깊이·자세·효과를 측정하지 않아요.','사람을 만지지 않고 교육 장소와 도움을 받을 어른을 가리켜 설명해요.'),
 ]},
 'aed-defibrillator-pad':{name:'AED 안내 연결 작전',emoji:'⚡',description:'AED의 음성 안내와 접촉 금지 신호를 상황별로 익혀요.',equipment:['AED 그림 또는 카드','안전한 교실 공간'],boundary:'그림으로 익히는 안전 학습이에요. 실제 AED를 연습 작동하거나 친구 몸에 패드를 붙이지 않아요. 실제 사용은 119 상담원과 기기 음성 안내를 따라요.',sources:[cprSources[0],{label:'행정안전부 · AED 절차',url:'https://www.mois.go.kr/chd/sub/a06/rescue_4/screen.do'}],scenarios:[
  q('기기 안내 듣기','심폐소생술 현장에 AED가 도착했어요.','전원을 켜고 기기의 음성·그림 안내를 따라요','그림을 무시하고 아무 곳에 패드를 붙여요','AED마다 안내가 있어요. 패드는 기기 그림이 지정한 맨가슴 위치에 부착하며, 수업에서는 그림과 교육용 장비로만 배워요.','전원 카드와 안내 그림을 차례로 가리키고 “기기 안내를 따라요”라고 말해요.'),
  q('분석 중에는 손 떼기','기기가 심장 리듬을 분석한다고 알려요.','모두 환자에게서 손을 떼도록 알려요','친구를 잡은 채 분석을 기다려요','리듬 분석과 충격 때에는 누구도 환자에게 닿지 않게 확인해요.','사람에게 손대지 않고 손바닥을 보이며 “모두 손을 떼세요” 신호를 연습해요.'),
  q('충격 뒤 안내 잇기','AED가 충격을 시행했거나 충격이 필요 없다고 안내해요.','즉시 심폐소생술을 이어가도록 기기·상담원 안내를 따라요','모든 처치가 끝났다고 판단하고 떠나요','AED 한 번으로 구조가 끝나지 않아요. 기기 안내에 따라 심폐소생술을 이어가며 구급대를 기다려요.','그림 카드의 다음 안내를 가리키고 구조자에게 전달하는 말만 연습해요.'),
 ]},
 'water-rescue-throw':{name:'물 밖 도움 연결대',emoji:'🛟',description:'물에 들어가지 않고 도움 요청과 안전한 구조 도구 전달을 익혀요.',equipment:['물 없는 교실','부드러운 공 또는 종이 구명환','빈 바닥 표적'],boundary:'실제 물과 사람을 대상으로 연습하지 않아요. 수업의 부드러운 도구는 구조 장비가 아니에요. 실제 사고에는 안전한 곳에서 구조요원·어른과 119에 도움을 요청해요.',sources:[{label:'American Red Cross · Water Safety',url:'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html'}],scenarios:[
  q('물 밖에서 도움 요청','친구가 물에서 힘들어하고 있어요.','안전한 곳에서 크게 알리고 구조요원·어른에게 도움을 요청해요','친구를 잡으러 물에 뛰어들어요','자신을 위험에 빠뜨리지 않는 도움이 우선이에요. 물에 직접 들어가지 않아요.','물 대신 바닥 선을 두고 선 뒤에서 구조요원을 부르는 말과 손짓을 해요.'),
  q('안전한 도구 전달','어른이 구조 장비를 가져와 안전한 물 밖에서 도와주고 있어요.','어른 안내에 따라 물 밖에서 도구를 전달해요','줄을 몸에 감고 친구가 당기게 해요','안전한 곳에서 뻗거나 던지는 도움을 배우되, 아이 혼자 위험한 가장자리로 가거나 줄에 얽히지 않아요.','사람 없는 교실 표적으로 종이 구명환을 가볍게 보내요. 줄은 사용하지 않아요.'),
  q('구조 뒤에도 도움 잇기','구조요원이 친구를 물 밖으로 옮겼어요.','119 연결과 어른의 처치가 이어지도록 주변을 비워요','괜찮아 보여서 혼자 돌려보내요','물 밖으로 나왔다고 끝난 것이 아니에요. 구조요원과 의료 도움에 연결해요.','안전한 길을 손으로 가리키고 구급대가 들어올 통로를 설명해요.'),
 ]},
 'heatwave-pm25-shield':{name:'오늘의 체육 안전 설계단',emoji:'☀️',description:'가상 날씨·대기 상황을 보고 활동 장소와 쉬는 방법을 정해요.',equipment:['가상 상황 카드','실내 안전 위치 표식'],boundary:'표시 상황은 학습용 예시이며 실시간 날씨·대기 정보가 아니에요. 실제 수업은 학교 지침과 공식 경보·관측 정보를 확인해 교사가 결정해요.',sources:[{label:'에어코리아 · 높은 미세먼지 행동요령',url:'https://m.airkorea.or.kr/air/forecast'},{label:'CDC · Heat Health',url:'https://www.cdc.gov/heat-health/hcp/clinical-overview/index.html'}],scenarios:[
  q('더운 날 활동 조절','가상 상황: 매우 더운 야외에서 오래 뛰는 수업을 하려 해요.','교사와 시원한 장소·짧은 활동·휴식으로 계획을 조절해요','더 빨리 뛰어서 수업을 끝내요','더위에는 활동을 줄이고 시원한 곳에서 쉴 계획이 필요해요. 목마를 때까지 무조건 버티지 않아요.','교실에서 그늘·실내·휴식 표식 중 시원한 장소를 가리키고 이동 계획을 말해요.'),
  q('나쁜 공기와 수업 장소','가상 상황: 미세먼지가 높고 야외에서 긴 경기를 하려 해요.','교사와 공기 상태를 확인하고 안전한 실내 대체 활동을 정해요','창문을 모두 열고 같은 경기를 계속해요','미세먼지가 높은 날 어린이는 실외 활동을 줄이고 학교의 대체 수업 안내를 따라요. 실내 공기도 확인해야 해요.','야외 경기 카드를 내려놓고 실내의 가벼운 팔 동작 카드를 골라 보여줘요.'),
  q('몸이 보내는 중단 신호','더운 곳에서 활동하던 친구가 어지럽다고 말해요.','즉시 멈추고 시원한 곳에서 어른에게 도움을 요청해요','참고 마지막 한 바퀴를 더 돌아요','이상 증상이 있으면 활동을 중단해요. 의식이 흐리거나 쓰러지는 등 심한 상태면 119 도움을 요청하고, 의식 없는 사람에게 물을 먹이지 않아요.','실제 아픈 역할 없이 멈춤 손짓을 하고 도움을 받을 어른을 가리켜요.'),
 ]},
 'rice-treatment-firstaid':{name:'다친 친구 도움 안내소',emoji:'🩹',description:'활동 중 통증이 생겼을 때 멈추고 보호하며 어른에게 알리는 판단을 배워요.',equipment:['상황 카드','수건·냉찜질 그림 카드'],boundary:'부상을 진단하거나 친구에게 붕대를 감는 실습이 아니에요. 통증이 생기면 활동을 멈추고 교사·보건교사에게 알려요. 심한 통증·변형·감각 이상은 신속한 의료 도움이 필요해요.',sources:[{label:'NHS · Sprains and strains',url:'https://www.nhs.uk/conditions/sprains-and-strains/'}],scenarios:[
  q('통증이 생기면 중단','친구가 발목을 접질렀고 아파서 걷기 어려워요.','운동을 멈추고 다친 곳에 무게를 싣지 않도록 어른을 불러요','괜찮은지 확인하려고 계속 뛰게 해요','활동을 멈추고 다친 부위를 보호해요. 아이가 진단하거나 억지로 걷게 하지 않아요.','멈춤 손짓을 하고 교사나 보건실 방향을 가리켜 도움 요청 문장을 말해요.'),
  q('냉찜질은 어른과 확인','어른이 냉찜질을 준비하려고 해요.','얼음팩을 수건으로 감싸고 적용 방법을 어른과 확인해요','얼음을 피부에 바로 대고 오래 둬요','얼음은 피부에 직접 대지 않아요. NHS는 수건으로 감싼 팩을 한 번에 최대 20분으로 안내해요. 실제 적용은 보건교사와 확인해요.','실제 냉찜질 없이 수건 그림과 얼음팩 그림을 짝지어 보여줘요.'),
  q('더 큰 도움이 필요한 때','부위 모양이 변했거나 감각이 이상하고 통증이 심해요.','즉시 어른에게 알리고 신속한 의료 도움을 받아요','친구끼리 세게 마사지하고 붕대를 꽉 감아요','변형·감각 이상 등은 단순 염좌로 단정하지 않아요. 무리한 마사지나 압박을 하지 말고 의료 도움으로 연결해요.','친구 몸을 만지지 않고 관찰한 상황을 어른에게 전달하는 말을 연습해요.'),
 ]},
};
export const isSafetyLessonId=(id:string):id is SafetyLessonId=>(SAFETY_LESSON_IDS as readonly string[]).includes(id);
export interface SafetyLearningRecord {scenario:number;answer:string;mode:'roleplay'|'read'}
export function safetyLessonResult(id:SafetyLessonId,records:SafetyLearningRecord[],seconds:number):{amount:number;details:GameResultDetails}|null{
 const spec=SAFETY_LESSONS[id];
 if(records.length!==spec.scenarios.length||!Number.isFinite(seconds)||seconds<0||records.some((r,i)=>r.scenario!==i||r.answer!==spec.scenarios[i].answer||!['roleplay','read'].includes(r.mode)))return null;
 return {amount:records.length*100,details:{totalTime:Math.round(seconds),metrics:{'학습 확인':`${records.length}/3 안전한 선택과 설명 확인`,'학습 방식':records.map((r,i)=>`${i+1}: ${r.mode==='roleplay'?'교실 역할 표현':'읽고 설명 확인'}`).join(' / '),'점수 기준':'안전한 상황 선택과 학습 확인 · 실제 응급처치 역량 평가 아님','시간 범위':'학습 시작부터 확인까지의 경과 시간 · 실제 활동 시간 아님','자료 확인일':'2026-10-22','기록 버전':'안전 학습 v1 · 이전 화면 게임 점수와 직접 비교하지 않아요'}}};
}
