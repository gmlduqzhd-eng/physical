import type { QuestRound, QuestSettings } from './movementQuests.js';
import type { QuestMetadata } from './extendedMovementQuests.js';

export const SPORTS_QUEST_IDS = ['target','slingshot-archery','base-running-decide','sound-goalball','badminton-drop-clear','basketball-free-throw','tabletennis-spin-read','shuttle-run-beep'] as const;
export type SportsQuestId = typeof SPORTS_QUEST_IDS[number];
const makeMeta=(name:string,emoji:string,description:string,equipment:string[],rules:string[],alternative:string,team=false):QuestMetadata=>({name,emoji,description,equipment,setup:equipment.join(' · ')+' · 기기 거치 · 분리된 개인 통로',rules,alternative,team,maxPlayers:2});
export const SPORTS_QUEST_META:Record<SportsQuestId,QuestMetadata>={
  target:makeMeta('표적 보급 실험실','🎯','거리와 힘을 골라 실제 콩주머니를 보내고 다음 시도에서 조절해요.',['콩주머니 또는 부드러운 공','바닥 표적 3개'],['가까운 표적 또는 조금 먼 표적을 골라요.','세 번 보내고 모두 멈춘 뒤 회수해요.','어느 방향으로 갔는지 보고 힘과 방향을 바꿔요.'],'앉아서 책상 위 표적으로 부드러운 공을 굴려요.'),
  'slingshot-archery':makeMeta('곡선 보물 던지기','🌈','종이 공을 낮은 곡선으로 보내며 가까운 바구니와 먼 바구니를 비교해요.',['구긴 종이 공 3개','낮은 바구니 2개'],['고무줄과 발사 도구 없이 손으로 던져요.','가까운 바구니와 먼 바구니 중 하나를 골라요.','세 번 보내고 바구니 앞·안·뒤 중 어디로 갔는지 비교해요.'],'앉아서 같은 종이 공을 두 바구니로 가볍게 보내요.'),
  'base-running-decide':makeMeta('멈출까 갈까 베이스 작전','⚾','공의 위치를 보고 진루와 대기를 고른 뒤 실제 베이스 통로에서 걸어 실행해요.',['출발·다음 베이스 표식','수비 위치 카드'],['공이 다음 베이스에 먼저 도착했는지 상황을 읽어요.','진루가 열렸으면 다음 표식까지 걷고, 막혔으면 출발 표식에서 기다려요.','태그·슬라이딩·전력 질주 없이 판단과 발걸음을 연결해요.'],'앉아서 손으로 베이스 표식 사이를 이동하거나 기다려요.'),
  'sound-goalball':makeMeta('소리 따라 굴림 짝꿍','🔔','짝의 방향 신호를 듣고 부드러운 공을 굴려 받으며 역할을 바꿔요.',['부드러운 공','좌·가운데·우 표식'],['시야를 가리지 않고 낮게 공을 굴려요.','보내는 친구가 방향을 말하고 받는 친구는 그쪽 표식에서 공을 멈춰요.','몸을 던지지 않고 역할을 교대해요. 소리 대신 큰 표식 신호도 가능해요.'],'앉아서 탁자 위 공을 굴리고 좌·우 표식을 짚어요.',true),
  'badminton-drop-clear':makeMeta('빈 코트 셔틀 배송','🏸','상대 위치를 보고 앞·뒤 빈 구역을 선택해 실제 셔틀이나 스카프를 보내요.',['스카프 또는 셔틀','앞·뒤 표적','선택: 어린이 라켓'],['상대가 뒤에 있으면 앞, 앞에 있으면 뒤 구역을 살펴요.','라켓 없이 손으로 보내도 돼요. 스윙 공간은 개인별로 분리해요.','보낸 뒤 중앙으로 돌아와 다음 상대 위치를 읽어요.'],'앉아서 스카프를 가까운·먼 책상 표적으로 보내요.'),
  'basketball-free-throw':makeMeta('내 거리 슛 연구소','🏀','내게 맞는 거리에서 부드러운 공을 바구니로 보내며 세 번씩 비교해요.',['부드러운 공','낮고 안정된 바구니','거리 표식 2개'],['가까운 거리부터 골라 세 번 시도해요.','앞·안·뒤 중 어디로 갔는지 보고 다음 작전에서 힘을 조절해요.','공을 회수할 때는 모두 멈추고 걷기로 이동해요.'],'앉아서 낮은 바구니로 부드러운 공을 보내요.'),
  'tabletennis-spin-read':makeMeta('탁구 회전 관찰소','🏓','공의 회전 방향을 읽고 탁자 위에서 공을 굴리며 실제 변화를 살펴요.',['탁구공 또는 가벼운 공','안정된 탁자','선택: 라켓'],['회전 화살표를 보고 위쪽 회전과 반대 회전을 구별해요.','손으로 공을 작게 굴려 보고 진행 방향과 변화를 관찰해요.','화면 정답만으로 실제 리시브 능력을 판정하지 않아요.'],'안정된 의자에 앉아 손으로 공을 굴려 관찰해요.'),
  'shuttle-run-beep':makeMeta('내 페이스 왕복 우편','📯','가까운 두 표식 사이를 일정한 걷기 신호에 맞춰 오가고 편한 거리를 찾아요.',['출발·반환 표식 2개','분리된 보행 통로'],['신호 사이에 여유 있게 걸을 수 있는 거리를 골라요.','도착하면 기다렸다 다음 신호에 출발해요.','못 맞춰도 뛰어 쫓지 않고 거리를 줄여 다시 참여해요.'],'앉아서 두 표식 사이로 팔을 뻗어 왕복해요.'),
};

export function makeSportsQuest(id:SportsQuestId,round:number,s:QuestSettings,choice?:string):QuestRound{
  const options=(a:string,b:string)=>[{id:'near',label:a,detail:'첫 방법을 골라 몸으로 시도해요.'},{id:'far',label:b,detail:'다른 방법의 결과를 비교해요.'}];
  const far=choice==='far';
  const p:QuestRound={title:['첫 시도','방법 조절','비교 도전'][round],goal:'선택한 스포츠 미션을 실행해요',hint:'기기는 거치하고 실제 도구로 시도해요. 성공 횟수와 운동량을 자동 측정하지 않아요.',choices:[],cues:[],cueMs:s.gentle?6000:5000,repeats:1,confirmation:'세 번 시도하고 선택한 방법의 결과를 비교했어요'};
  const action=(a:string,b:string)=>s.seated?b:a;
  const trials=(a:string)=>Array.from({length:3},(_,i)=>[`${i+1}차 · ${a}`,`${i+1}차 · 공이 간 곳을 보고 모두 멈춰 회수`]).flat();
  switch(id){
    case 'target':p.choices=options('가까운 표적','조금 먼 표적');p.goal=['가운데','왼쪽','오른쪽'][round]+` 표적에 세 번 보내고 힘 조절하기`;p.cues=trials(action(`${far?'먼':'가까운'} ${['가운데','왼쪽','오른쪽'][round]} 표적으로 콩주머니 보내기`,`${far?'먼':'가까운'} 책상 표적으로 공 굴리기`));break;
    case 'slingshot-archery':p.choices=options('가까운 바구니','먼 바구니');p.goal='낮은 곡선으로 종이 공을 보내고 거리 비교하기';p.cues=trials(`${far?'먼':'가까운'} 바구니로 종이 공을 낮게 던지기${round===1?' · 앞 시도보다 힘 조절':round===2?' · 편했던 방법 다시 확인':''}`);p.hint='손으로 보내는 표적 게임이에요. 사람을 향해 던지지 않고, 고무줄·슬링샷을 사용하지 않아요.';break;
    case 'base-running-decide':{const open=round!==1;p.title=['공이 멀리 있어요','공이 먼저 도착했어요','다시 열린 베이스'][round];p.goal=open?'공이 다른 곳에 있고 다음 베이스까지 길이 열렸어요.':'수비가 공을 잡고 다음 베이스를 지키고 있어요.';p.choices=[{id:'hold',label:'현재 베이스에서 대기',detail:'다음 길이 막혔으면 안전하게 기다려요.'},{id:'advance',label:'다음 베이스로 걷기',detail:'길이 열렸으면 분리된 통로로 진루해요.'}];p.decision={answer:open?'advance':'hold',explanation:open?'다음 베이스가 열렸어요. 걷기로 진루해요.':'공이 먼저 도착했어요. 현재 베이스에서 기다려요.'};p.cues=open?[action('다음 베이스로 걷기','손을 다음 베이스 표식으로'),action('베이스에서 멈추고 주변 보기','다음 표식에서 손 멈추기'),action('출발점으로 걸어 돌아오기','손을 출발 표식으로')]:[action('현재 베이스에서 발을 멈추기','출발 표식에서 손 멈추기'),'수비 위치를 다시 확인하기',action('자기 자리에서 편하게 제자리걸음','양팔 가볍게 번갈아 움직이기')];p.confirmation='상황에 맞게 진루 또는 대기를 골라 몸으로 실행했어요';break;}
    case 'sound-goalball':{p.choices=options('말소리 방향 신호','큰 표식 방향 신호');p.goal='좌·가운데·우로 굴리고 받기 역할 바꾸기';const dirs=round===0?['왼쪽','가운데','오른쪽']:round===1?['오른쪽','왼쪽','가운데']:['가운데','오른쪽','왼쪽'];p.cues=dirs.flatMap(d=>s.practice?[`${d} 표적을 확인하고 직접 공을 굴리기`,`공을 회수하고 ${d} 표식 짚기`]:[`${d} · ${far?'큰 표식':'말소리'}으로 방향 알리고 공 굴리기`,`${d} · 받는 친구가 공 멈추기 · 보내기와 받기 역할 교대`]);p.roles=s.practice?['혼자 굴리기·회수·방향 짚기를 체험해요. 짝의 소리를 듣는 활동은 함께할 때 해요.']:['1번과 2번이 보내기·받기를 매 구간 바꾸어요.'];p.confirmation=s.practice?'굴리기·회수·방향 짚기를 연습했어요':'방향을 알리고 보내기·받기를 서로 바꾸었어요';break;}
    case 'badminton-drop-clear':{const back=round!==1;p.goal=`상대가 ${back?'뒤':'앞'} 구역에 있어요. 어느 빈 구역으로 보낼까요?`;p.choices=[{id:'front',label:'앞 빈 구역으로 보내기',detail:'가까운 표적으로 짧게 보내요.'},{id:'back',label:'뒤 빈 구역으로 보내기',detail:'먼 표적으로 여유 있게 보내요.'}];p.decision={answer:back?'front':'back',explanation:`상대가 ${back?'뒤':'앞'}에 있어 ${back?'앞':'뒤'} 구역이 비었어요.`};p.cues=trials(action(`${back?'앞':'뒤'} 표적으로 셔틀 또는 스카프 보내고 중앙으로`,` ${back?'가까운':'먼'} 책상 표적으로 스카프 보내기`));p.confirmation='빈 구역을 골라 세 번 보내고 준비 위치로 돌아왔어요';break;}
    case 'basketball-free-throw':p.choices=options('가까운 슛 자리','조금 먼 슛 자리');p.goal='내가 고른 거리에서 세 번 보내고 앞·안·뒤 비교하기';p.cues=trials(`${far?'조금 먼':'가까운'} 자리에서 낮은 바구니로 보내기${round===1?' · 앞 작전보다 힘 조절':round===2?' · 가장 편했던 방법 적용':''}`);break;
    case 'tabletennis-spin-read':{const top=round!==1;p.goal=`공의 앞쪽 표면이 ${top?'아래로 ↓':'위로 ↑'} 돌아요. 앞으로 가는 공의 회전 이름은?`;p.choices=[{id:'top',label:'전진 회전',detail:'공 앞쪽 표면이 아래로 돌아요.'},{id:'back',label:'후진 회전',detail:'공 앞쪽 표면이 위로 돌아요.'}];p.decision={answer:top?'top':'back',explanation:top?'앞으로 굴러가는 바퀴 방향의 회전이에요.':'앞으로 가는 공이 바퀴와 반대 방향으로 돌아요.'};p.cues=['공을 손으로 작게 굴리고 표면의 움직임 관찰','공을 잡고 반대 방향으로 작게 돌려 비교','라켓 또는 손으로 공을 가볍게 보내고 결과 관찰'];p.confirmation='회전 방향을 구별하고 공을 직접 굴려 비교했어요';break;}
    case 'shuttle-run-beep':p.choices=options('가까운 두 표식','한 걸음 넓은 두 표식');p.goal='서두르지 않고 두 표식을 세 번 왕복하기';p.cueMs=s.gentle?8000:6500;p.cues=Array.from({length:6},(_,i)=>action(`${far?'한 걸음 넓은':'가까운'} ${i%2?'출발':'반환'} 표식까지 걷고 기다리기`,`${i%2?'출발':'반환'} 표식으로 팔을 뻗고 기다리기`));p.confirmation='내 페이스로 세 번 왕복하고 편한 거리를 비교했어요';p.hint='체력검사나 최대 속도 경쟁이 아니에요. 신호보다 늦으면 거리를 줄여요.';break;
  }
  return p;
}
