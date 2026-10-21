import type { ExpeditionSpec } from './expeditionGames';

export interface ExpeditionStep { title:string; instruction:string; seconds:number; beats?:string[]; }
export interface ExpeditionBoard { size:number; start:number; destination:number; blocked:number[]; path:number[]; }
export interface ExpeditionRound {
  title:string; steps:ExpeditionStep[]; checks:string[]; roles:string[]; kind:string;
  targets:{label:string;goal:number}[];
  board?:ExpeditionBoard; secret?:string[];
  question?:{prompt:string;options:string[];answer:string[];ordered:boolean};
  allocation?:{labels:string[];counts:number[]};
  timing?:'estimate'|'lap'|'arrival'; targetSeconds?:number;
  wordCue?:{text:string;color:string;rule:string};
  bingoCells?:number[];
}
export interface ExpeditionRecord {
  round:number; kind:string; source:'self-report'|'peer-report'; participants:number[];
  counts:number[]; checks:string[]; answer:string[]; correct:boolean; elapsedMs:number;
  arrivals?:number[];
}
const colors=['빨강 ●','파랑 ▲','노랑 ■','초록 ◆'];
const pick=(n:number,random:()=>number)=>Math.min(n-1,Math.max(0,Math.floor(random()*n)));
export function shuffled<T>(items:T[],random:()=>number=Math.random):T[]{
  const result=[...items];for(let i=result.length-1;i>0;i--){const j=pick(i+1,random);[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function noRepeatPath(length:number,options:string[],random:()=>number=Math.random):string[]{
  const path:string[]=[];for(let i=0;i<length;i++){const next=options.filter(x=>x!==path.at(-1));path.push(next[pick(next.length,random)]);}return path;
}
export function reachablePath(size:number,start:number,destination:number,blocked:number[]):number[]{
  const queue=[[start]],seen=new Set([start]);
  while(queue.length){const path=queue.shift()!,last=path.at(-1)!;if(last===destination)return path;
    for(const next of [last-size,last+size,last%size>0?last-1:-1,last%size<size-1?last+1:-1]){
      if(next<0||next>=size*size||seen.has(next)||blocked.includes(next))continue;seen.add(next);queue.push([...path,next]);
    }
  }return [];
}
export function makeBoard(round:number,random:()=>number=Math.random):ExpeditionBoard{
  const size=4,start=0,destination=15;
  // Preserve one complete corridor, then vary obstacles elsewhere.
  const corridor=round%2?[0,4,8,12,13,14,15]:[0,1,2,3,7,11,15];
  const blocked=shuffled(Array.from({length:16},(_,i)=>i).filter(i=>!corridor.includes(i)),random).slice(0,4);
  return {size,start,destination,blocked,path:reachablePath(size,start,destination,blocked)};
}
const tasks=(entries:string[],seconds=8):ExpeditionStep[]=>entries.map((instruction,i)=>({title:`구간 ${i+1}`,instruction,seconds}));
const rotate=(list:string[],offset:number)=>list.map((_,i)=>list[(i+offset)%list.length]);
const beats=(patterns:string[],instruction:string,bpm=80):ExpeditionStep=>({title:'8박자 연결',instruction,seconds:8*60/bpm,beats:patterns});

export function createExpeditionRound(game:ExpeditionSpec,round:number,players:number,random:()=>number=Math.random):ExpeditionRound{
  if(game.kind!=='B')throw new Error('Expression activities use their own stage data');
  const number=round+1,turn=colors[round%4],other=colors[(round+1)%4];
  const plan:ExpeditionRound={title:`${number}라운드`,steps:[],checks:[],roles:Array.from({length:players},(_,i)=>`${i+1}번: 개인 통로에서 수행`),kind:game.family,targets:[{label:'직접 확인한 성공',goal:3}]};
  const sequence=(labels:string[],verb:string)=>{plan.steps=tasks(labels.map(label=>`${verb}: ${label}`));};
  const roleCycle=(roles:string[])=>{plan.roles=Array.from({length:players},(_,i)=>`${i+1}번: ${roles[(i+round)%roles.length]}`);};
  const memory=(items:string[],prompt:string)=>{plan.secret=items;plan.steps=tasks(['공개한 순서를 떠올리며 실제 표식에서 수행해요. 기기는 거치해 둡니다.'],items.length*6);plan.question={prompt,options:[...new Set([...items,...colors])],answer:items,ordered:true};plan.checks=['활동 중 순서 안내를 다시 보지 않고 시도했어요.'];};
  switch(game.spec){
    case 'S01': sequence(noRepeatPath(3,colors,random).flatMap(c=>[c,'중앙 출발점']),'표식을 다녀와요');plan.targets=[{label:'중앙으로 돌아온 왕복 수',goal:3}];plan.checks=['매번 중앙으로 돌아왔어요.'];break;
    case 'S02': sequence(noRepeatPath(5,colors,random),'앞 지점에서 바로 다음 색으로 걸어요');plan.checks=['중앙 귀환 없이 색 사이를 이어 갔어요.'];break;
    case 'S03': {const directions=noRepeatPath(4,['왼쪽','오른쪽'],random);plan.steps=directions.map((d,i)=>({title:i%2?'반전 규칙':'정상 규칙',instruction:`${i%2?'반전! 반대쪽':'정상! 부른 쪽'}으로 옆걸음. 지령: ${d} · 이동: ${i%2?(d==='왼쪽'?'오른쪽':'왼쪽'):d}`,seconds:8}));break;}
    case 'S04': plan.board=makeBoard(round,random);sequence(plan.board.path.map(i=>`${Math.floor(i/4)+1}행 ${i%4+1}열`),'금지 칸을 피해 정한 길로 걸어요');plan.checks=['금지 칸을 지나지 않았어요.'];break;
    case 'S05': memory(noRepeatPath(3+round,colors,random),'기억해서 방문한 순서');break;
    case 'S06': {const nums=shuffled([1,2,3,4,5,6],random),a=nums[0],b=nums[1];plan.steps=tasks([`목표 합 ${a+b}. 바닥 숫자 1~6에서 합을 만드는 두 곳을 방문하고 돌아와요.`],20);plan.question={prompt:`합이 ${a+b}가 되도록 방문한 두 숫자`,options:['1','2','3','4','5','6'],answer:[String(a),String(b)],ordered:false};plan.kind='sum';break;}
    case 'S07': sequence(rotate(colors,round).map((c,i)=>`${c} 콘 ${i%2?'눕히기':'세우기'}`),'걸어서 콘 상태를 바꿔요');plan.checks=rotate(colors,round).map((c,i)=>`${c} 콘을 ${i%2?'눕힌':'세운'} 상태와 비교했어요.`);break;
    case 'S08': plan.steps=tasks(['긴 걷기 통로를 끝까지 다녀와요.','짧은 통로를 옆걸음으로 다녀와요.'],15);plan.targets=[{label:'긴 걷기 코스',goal:1},{label:'짧은 옆걸음 코스',goal:1}];plan.checks=['서로 다른 두 경로를 모두 시도했어요.'];break;
    case 'S09': {const pattern=noRepeatPath(4,colors,random);sequence(pattern.map(c=>`${c} 조각을 출발점으로 가져오기`),'지점에서 조각을 가져와 목표 무늬를 만들어요');plan.question={prompt:'완성한 조각 순서',options:colors,answer:pattern,ordered:true};break;}
    case 'S10': sequence(rotate(['평지: 큰 걸음','좁은 길: 옆걸음','풀숲: 무릎 올려 걷기'],round),'지형에 맞게 이동해요');break;
    case 'S11': plan.steps=[beats(rotate(['왼발','왼발','오른발','오른발','왼발','왼발','오른발','오른발'],round*2),`${round===0?'제자리':round===1?'앞뒤':'좌우'}로 두 박자씩 발의 중심을 바꿔요.`)];break;
    case 'S12': plan.steps=[beats(rotate(['왼발 앞','오른발 앞','왼발 뒤','오른발 뒤','왼발 옆','오른발 모음','오른발 옆','왼발 모음'],round*2),'바닥 네 칸에서 현재 발 신호에 맞춰 8박자를 연결해요. 화면을 밟지 않아요.')];break;
    case 'S13': plan.steps=[beats(['안','안','밖','밖','안','안','밖','밖'],`${round%2?'뒤쪽 사다리에서 앞으로':'출발점에서 앞으로'} 테이프 사다리를 걸어요.`),beats(['왼쪽 안','오른쪽 안','왼쪽 밖','오른쪽 밖','오른쪽 안','왼쪽 안','오른쪽 밖','왼쪽 밖'],'옆 사다리에서 발 순서를 바꿔 연결해요.')];break;
    case 'S14': plan.steps=['제자리 번갈아 딛기','좌우 스텝','앞뒤 스텝'].map(t=>beats(Array.from({length:8},(_,i)=>i%2?'오른발':'왼발'),`줄 없이 팔을 돌리며 ${t}를 해요. 낮은 뛰기 대신 딛기를 선택해도 돼요.`));break;
    case 'S15': plan.steps=[beats(rotate(['왼무릎·오른손','오른무릎·왼손','손뼉','손뼉','왼무릎·오른손','오른무릎·왼손','손뼉','팔 펴기'],round*2),'무릎과 반대 손을 만나게 하고 손뼉으로 마디를 이어요.')];break;
    case 'S16': plan.steps=[beats(['팔 위','팔 위','팔 옆','팔 옆','팔 앞','팔 앞','팔 위','팔 앞'],'발은 매 박자 번갈아 걷고 팔은 표시된 조합으로 바꿔요. 발 8박자와 팔 전환을 따로 따라가요.')];break;
    case 'S17': plan.steps=[beats(Array(8).fill('왼손 튀기기'),`${turn} 표식까지 걸으며 왼손으로 공을 튀겨요.`),beats(Array(8).fill('오른손 튀기기'),`${other} 문을 돌아 출발점까지 오른손으로 공을 튀겨요.`)];plan.checks=['손과 돌아오는 경로를 바꿨어요.'];break;
    case 'S18': plan.steps=[beats(Array.from({length:8},(_,i)=>i%2?'오른발 가볍게 올리기':'왼발 가볍게 올리기'),`공을 밟고 서지 않고 발바닥만 가볍게 번갈아 대요. 마디가 끝나면 ${turn} 표식으로 공을 옮겨요.`),beats(Array.from({length:8},(_,i)=>i%2?'왼발':'오른발'),`${turn} 표식에서 반대 발로 시작해요.`)];break;
    case 'S19': plan.steps=[beats(['띄우기','왼손 받기','옆걸음','멈춤','띄우기','오른손 받기','옆걸음','멈춤'],`${turn} 정거장에서 손을 바꾸어 스카프를 받으며 ${other} 정거장으로 옆걸음해요.`)];break;
    case 'S20': plan.steps=['앞 방향','왼 대각선','오른 대각선'].map(d=>beats(['주먹 앞','반대 주먹 앞','옆걸음','몸 조금 낮추기','주먹 앞','반대 주먹 앞','옆걸음','바로 서기'],`${d}에서 같은 콤보를 해요. 다른 사람을 향해 주먹을 뻗지 않아요.`));break;
    case 'S24': sequence(rotate(['왼쪽 낮은 보석에 손 뻗기','천천히 일어서기','오른쪽 높은 목표에 팔 뻗기'],round),'세 높이를 연결해 배송해요');plan.checks=['짝이 세 높이 배송을 직접 보고 확인했어요.'];roleCycle(['동작 수행','배송 수 확인']);break;
    case 'S27': sequence(rotate(['팔 뻗으며 걷기','무릎 올려 걷기','팔 뻗기와 무릎 올리기 연결'],round),'상체와 하체를 번갈아 움직여요');break;
    case 'S28': {const missions=shuffled(['큰 걸음','옆걸음','팔 벌려 걷기','무릎 올려 걷기','앞뒤 스텝'],random).slice(0,3);sequence(missions,'뽑힌 순서로 미션을 해요');plan.checks=missions.map(m=>m+' 미션을 시도했어요.');plan.title='보물상자 '+number;break;}
    case 'S29': plan.timing='estimate';plan.targetSeconds=[8,12,16][round];plan.steps=tasks([`${plan.targetSeconds}초를 기억하고 시간 표시 없이 제자리걸음을 해요. 시간이 되었다고 생각하면 종료해요.`],60);plan.targets=[];break;
    case 'S30': plan.timing='lap';plan.steps=tasks([`기기는 거치한 채 같은 두 표식 사이를 걸어 왕복해요. 출발은 시작 버튼, 도착은 도착 버튼으로 직접 기록해요. ${number}/3번째 시간입니다.`],120);plan.targets=[];break;
    case 'S31': sequence([`${turn} 표적에 던지기`, '회수 신호: 모두 멈춘 뒤 공 가져오기',`${other} 쪽으로 던지는 자리를 바꾸기`],'콩주머니 배송');plan.targets=[{label:turn+' 표적 성공',goal:3}];break;
    case 'S32': sequence(rotate(['왼쪽 위치: 벽에 보내고 받기','가운데 표식으로 옆걸음 후 보내고 받기','오른쪽 위치로 이동해 보내고 받기'],round),'스펀지공 우편을 이어요');break;
    case 'S33': sequence([`${turn} 문으로 공 굴리기·짝은 옆걸음으로 막기`,'공격과 수비 역할 바꾸기',`${other} 문으로 굴리기·옆걸음으로 막기`],'분리된 통로에서 공을 막아요');roleCycle(['공 굴리기','문 수비']);plan.checks=['공격과 수비를 모두 했어요.'];break;
    case 'S34': sequence(['짝에게 공 보내기','보낸 사람은 세 표식 중 빈자리로 이동','새 위치에서 다시 받기'],'세 표식으로 패스 연결');plan.targets=[{label:'끊김 없이 연결',goal:3}];plan.checks=['두 사람이 공 보내기와 자리 이동을 모두 했어요.'];break;
    case 'S35': sequence(rotate(['1번 정거장: 왼손','2번 정거장: 오른손','3번 정거장: 양손 번갈아'],round),'풍선을 띄우며 방문해요. 떨어지면 현재 구간부터 다시');break;
    case 'S36': sequence(noRepeatPath(3,colors,random).flatMap(c=>[`${c} 문으로 발 드리블`,`${c} 문 뒤 원 안에 공 멈추기`]),'색문 탈출');plan.checks=['각 문 뒤 원 안에서 공을 멈추어 봤어요.'];break;
    case 'S37': sequence(['왼쪽 표식으로 옆걸음해 부드러운 공 받기','가운데로 돌아온 뒤 오른쪽 표식으로 이동해 받기','보내기·받기 역할 바꾸기'],'한 걸음 리시브');roleCycle(['공 보내기','옆걸음 리시브']);break;
    case 'S38': sequence(rotate(['1번 정거장: 라켓 위 공을 멈추기','2번 정거장: 한 번 튀기고 받기','3번 정거장: 방향 바꿔 돌아오기'],round),'라켓으로 세 정거장을 걸어요');plan.checks=['세 정거장의 다른 동작을 시도했어요.'];break;
    case 'S39': plan.bingoCells=shuffled([round*3,round*3+1,round*3+2],random);plan.targets=plan.bingoCells.map(cell=>({label:`${cell+1}번 칸`,goal:1}));plan.steps=tasks([`${number}번 출발 위치에서 배정된 세 숫자 표적으로 굴려요.`,'회수 신호에 공을 가져오고 출발 위치를 바꿔요.']);plan.checks=['공을 직접 회수하고 출발 위치를 바꿨어요.'];plan.kind='bingo';break;
    case 'S40': sequence([`${turn} 쪽 한 걸음: 각자 스카프 띄우고 오른손으로 상대 스카프 받기`,`${other} 쪽 한 걸음: 왼손으로 바꿔 받기`],'서로 부딪치지 않는 거리에서 바꿔잡기');plan.targets=[{label:'오른손 조합',goal:2},{label:'왼손 조합',goal:2}];break;
    case 'T01': {const positions=shuffled(Array.from({length:16},(_,i)=>i),random).slice(0,players);plan.steps=tasks(['개인 통로의 바닥 격자에서 자신에게 배정된 좌표를 찾아 이동해요.'],20);plan.roles=positions.map((p,i)=>`${i+1}번: ${Math.floor(p/4)+1}행 ${p%4+1}열`);plan.checks=['화면에 배정된 좌표를 전원이 직접 확인했어요.'];break;}
    case 'T02': sequence([['삼각형','사각형','마름모'][round],'각자의 통로로 흩어져 걷기','같은 대형을 다시 만들기'],'다른 사람을 밀지 않고 대형을 만들어요');plan.checks=[`${['삼각형','사각형','마름모'][round]} 대형을 직접 보고 확인했어요.`];break;
    case 'T03': {const first=1+pick(players-1,random);plan.allocation={labels:['왼쪽 섬','오른쪽 섬'],counts:[first,players-first]};plan.steps=tasks([`왼쪽 섬 ${first}명, 오른쪽 섬 ${players-first}명으로 나누어 이동해요.`],20);plan.targets=[];break;}
    case 'T04': plan.board=makeBoard(round,random);plan.steps=tasks(['개인 통로에서 지도에 남아 있는 길을 정해 보급품을 옮겨요.','출발점으로 돌아와 바뀐 도로를 확인해요.']);plan.checks=['막힌 도로 대신 연결된 다른 길로 이동했어요.'];break;
    case 'T05': memory(shuffled(colors,random).slice(0,players),'번호 순으로 실제 섰던 색 표식');plan.roles=Array.from({length:players},(_,i)=>`${i+1}번: ${i+1}번째 배치 기억`);break;
    case 'T06': {const word=turn,color=other;const meaning=round%2===0;plan.wordCue={text:word,color:['#bf3030','#1e5db8','#926b00','#23733f'][(round+1)%4],rule:meaning?'글자의 뜻':'글자의 색'};plan.steps=tasks([`현재 규칙: ${meaning?'글자의 뜻':'글자의 색'}. 각자의 네 갈래 통로에서 답을 다녀와요.`],18);plan.question={prompt:'다녀온 길의 표식',options:colors,answer:[meaning?word:color],ordered:true};break;}
    case 'T07': plan.roles=Array.from({length:players},(_,i)=>`${i+1}번: ${[['1→2→3→4','2→4→6→8','1→3→5→7','8→6→4→2'][(i+round)%4]]}`);plan.steps=tasks(['각자의 숫자 통로에서 배정받은 순서를 따라 걷고 돌아와요.'],24);plan.checks=['전원이 자신에게 배정된 서로 다른 숫자 규칙을 시도했어요.'];break;
    case 'T08': plan.board=makeBoard(round,random);plan.steps=tasks(['시작과 도착, 금지 칸을 보고 걸을 길을 정해요.','개인별로 분리된 바닥 미로에서 정한 길을 걸어요.'],15);plan.checks=['화면 지도와 실제 바닥 표식의 길을 비교했어요.'];break;
    case 'T09': roleCycle(['앞쪽을 교실 앞','앞쪽을 교실 오른쪽','앞쪽을 교실 뒤','앞쪽을 교실 왼쪽']);sequence(rotate(['앞','오른쪽','뒤','왼쪽'],round),'자기 기준 앞쪽에서 화살표를 해석해 걸어요');plan.checks=['기준 앞쪽이 바뀌어도 자기 경로를 따라갔어요.'];break;
    case 'T10': {const reverse=round%2===1;plan.steps=noRepeatPath(4,['초록 ●','파랑 ▲'],random).map(c=>({title:reverse?'규칙 교환':'기본 규칙',instruction:`${c}: ${(c.startsWith('초록')!==reverse)?'앞으로 걷기':'옆걸음'}. 틀려도 다음 신호부터 다시 참여해요.`,seconds:8}));break;}
    case 'T18': roleCycle(['앞뒤 스텝','좌우 스텝','무릎 올려 걷기','뒤꿈치 들지 않고 팔 스텝']);plan.steps=[beats(Array.from({length:8},(_,i)=>String(i%4+1)),'같은 네 박자에 각자 맡은 다른 스텝을 해요.'),beats(Array.from({length:8},(_,i)=>String(i%4+1)),'짝의 스텝을 서로 배워요.'),beats(Array.from({length:8},(_,i)=>String(i%4+1)),'번호 순으로 스텝을 연결하고 모두 따라 해요.')];break;
    case 'T21': sequence(['서로 다른 받기 표식에 서서 공 보내기','공을 보낸 사람은 다섯 표식 중 빈자리로 이동','모든 사람이 받기와 이동을 할 때까지 연결'],'패스하고 빈자리');plan.checks=['전원이 받기와 빈자리 이동을 했어요.'];break;
    case 'T22': roleCycle(['빨강 공 보내기','빨강 공 받기','파랑 공 보내기','파랑 공 받기']);sequence(rotate(['빨강 공 배송','파랑 공 배송'],round).flatMap(c=>[c,'받는 위치 바꾸기']),'두 짝의 통로를 분리해 배송해요');plan.targets=[{label:'빨강 배송',goal:2},{label:'파랑 배송',goal:2}];break;
    case 'T23': sequence(['짝에게 벽 바운드 패스 보내기','보낸 사람은 옆 표식을 다녀오기','다시 받을 위치로 돌아와 패스 받기'],'벽 패스 왕복 항로');plan.checks=['패스 뒤 옆 표식을 다녀오고 다시 받았어요.'];break;
    case 'T24': roleCycle(['받기','올리기','넘기기','빈자리 이동']);sequence(['공 받기 또는 잡기','올려 보내기','넘기고 새 자리로 이동'],'세 연결을 이어요. 잡아 보내기도 가능해요');plan.targets=[{label:'세 연결 묶음',goal:2}];break;
    case 'T25': plan.steps=[beats(Array(8).fill('왼손 또는 왼발'),`${turn} 코스에서 각자 공을 다뤄요.`),beats(Array(8).fill('오른손 또는 오른발'),`${other} 코스로 옮겨 반대 손·발로 바꿔요.`)];break;
    case 'T26': sequence(noRepeatPath(3,colors,random).flatMap(c=>[`${c} 출구로 공 몰기`,'정지 ■: 발바닥으로 공 멈추기']),'신호에 맞춰 기지를 순환해요');break;
    case 'T27': plan.bingoCells=[round*3,round*3+1,round*3+2,...shuffled(Array.from({length:9},(_,i)=>i).filter(i=>Math.floor(i/3)!==round),random).slice(0,Math.max(0,players-3))];plan.targets=plan.bingoCells.map(cell=>({label:`${cell+1}번 빙고 칸`,goal:1}));plan.roles=Array.from({length:players},(_,i)=>`${i+1}번: ${plan.targets.filter((_,j)=>j%players===i).map(t=>t.label).join('·')} 담당`);plan.steps=tasks(['각자 통로에서 맡은 칸으로 공을 굴려요.','회수 신호에 공을 가져오고 성공한 빙고 칸을 기록해요.'],12);plan.kind='bingo';break;
    case 'T28': sequence(['가까운 표적 던지기','중간 표적 던지기','먼 표적 던지기','공통 회수 신호: 함께 걸어서 회수'],'세 구역 배송');plan.targets=['가까운 구역','중간 구역','먼 구역'].map(label=>({label,goal:2}));break;
    case 'T29': sequence([`${turn} 정거장: 왼손으로 2회 주고받기`,`${other} 정거장: 오른손으로 3회 주고받기`],'짝별 통로에서 풍선으로 연결해요');plan.targets=[{label:'첫 정거장',goal:2},{label:'다음 정거장',goal:3}];break;
    case 'T30': roleCycle(['느린 공 보내기','왼쪽 수비','다음 공 준비','오른쪽 수비']);sequence(rotate(['왼쪽 구역으로 옆걸음 후 돌려주기','오른쪽 구역으로 옆걸음 후 돌려주기'],round),'라켓 수비망');plan.checks=['받는 구역과 역할을 교대했어요.'];break;
    case 'T31': sequence(['천 위 가벼운 공을 옆걸음으로 운반','넓은 회전 구간 통과','공이 떨어지지 않게 천을 함께 낮추고 도착'],'천 가장자리를 잡고 공동 배송');plan.checks=['손을 놓지 않고 서로 속도를 맞추어 봤어요.'];break;
    case 'T32': sequence(['짧은 홈통으로 공을 다음 사람에게 굴리기','보낸 사람은 빈 통로로 줄 끝에 이동','새 위치에서 홈통을 연결해 받기'],'움직이는 공 수로');plan.checks=['전원이 보내기 후 줄 끝으로 이동했어요.'];break;
    case 'T33': roleCycle(['사각 코스 앞 변','사각 코스 오른 변','사각 코스 뒤 변','사각 코스 왼 변']);plan.steps=tasks(['자기 변의 출발 바구니와 도착 바구니 사이를 왕복해 보급품을 옮겨요.'],25);plan.targets=Array.from({length:players},(_,i)=>({label:`${i+1}번 통로 배송`,goal:2}));break;
    case 'T34': plan.steps=tasks(['개인 통로에서 고리를 한 걸음 앞쪽으로 옮겨요.','고리 안으로 걸어 들어간 뒤 다음 고리를 옮겨 도착해요.'],12);plan.checks=['다른 사람의 통로를 침범하지 않고 각자 다리를 건넜어요.'];break;
    case 'T35': {const design=rotate(colors,round);plan.steps=tasks([`자기 구역에서 콘을 옮겨 설계도를 복원해요: ${design.join(' → ')}.`,'서로의 구역과 설계도를 비교해요. 다음 라운드에는 두 색 위치가 바뀌어요.'],15);plan.question={prompt:'번호 순으로 배치한 콘 색',options:colors,answer:design,ordered:true};plan.checks=['설계도와 실제 배치를 직접 비교했어요.'];break;}
    case 'T36': {const pieces=shuffled(['1','2','3','4'],random);plan.steps=tasks([`각자 경로에서 자기 번호 조각을 가져와요. 목표 암호는 ${pieces.join(' → ')}입니다.`,'모둠이 가져온 네 조각을 목표 순서로 조립해요.'],15);plan.question={prompt:'조립한 암호',options:['1','2','3','4'],answer:pieces,ordered:true};break;}
    case 'T37': sequence(round%2?['모양 분류: 원 물건을 원 바구니로','모양 분류: 네모 물건을 네모 바구니로']:['색 분류: 빨강 물건을 빨강 바구니로','색 분류: 파랑 물건을 파랑 바구니로'],'수집 칸에서 새 목적지로 옮겨요');plan.checks=['현재 분류 규칙으로 바구니를 바꿨어요.'];break;
    case 'T38': roleCycle(['북 기지: 빨강 조각','동 기지: 파랑 조각','남 기지: 노랑 조각','서 기지: 초록 조각']);plan.steps=tasks(['자기 통로에서 화면이 요청한 보급품을 맡은 기지로 전달해요.'],25);plan.targets=Array.from({length:players},(_,i)=>({label:`${i+1}번 요청 해결`,goal:1}));break;
    case 'T39': plan.timing='arrival';plan.targetSeconds=12;roleCycle(['긴 걷기: 바로 출발','옆걸음: 2초 뒤 출발','표식 돌아가기: 바로 출발','짧은 걷기: 4초 뒤 출발']);plan.steps=tasks(['각자 경로의 출발 시점을 조절해 10~14초 안에 함께 도착해요. 도착하면 거치된 기기에서 자기 번호로 직접 확인해요.'],60);plan.targets=[];break;
    case 'T40': plan.steps=tasks(['여섯 받기 표식을 준비하고 공을 패스해요.','같은 라운드에서 사용한 받기 표식은 다시 사용하지 않아요.','전원이 서로 다른 표식에서 받고 다음 라운드에 사용 상태를 초기화해요.'],10);plan.question={prompt:'참여 번호 순으로 사용한 받기 표식',options:['1번 표식','2번 표식','3번 표식','4번 표식','5번 표식','6번 표식'],answer:[],ordered:false};plan.kind='unique';break;
    case 'T41': {const kinds=['이동','리듬','공 조작'];plan.kind=kinds[round];roleCycle(Array(players).fill(kinds[round]+' 구역'));plan.steps=round===1?[beats(['왼발','오른발','팔 위','팔 옆','왼발','오른발','팔 앞','팔 모음'],'8박자 걷기와 팔 뻗기를 연결해요.')]:tasks([kinds[round]+': '+['표식 두 곳을 옆걸음으로 다녀와요.','','개인 통로에서 공을 굴리고 회수해요.'][round]],24);plan.checks=['이 구역에서 참여한 번호를 모두 확인했어요.'];break;}
    case 'T42': {const stations=['발놀림','공 굴리기','리듬 스텝','옆걸음 운반'];roleCycle(stations);plan.kind='순환 '+round;plan.steps=tasks(['각자 맡은 구역을 동시에 수행해요. 교대음 뒤 다음 구역으로 이동해요.'],24);plan.checks=['전원이 배정된 구역을 수행하고 교대했어요.'];break;}
    case 'T43': plan.steps=tasks(['콘 사이 옆걸음과 지그재그 걷기 중 원하는 경로를 함께 고르세요.','선택한 경로를 걸어 방 끝까지 이동하고 모여요.'],12);plan.question={prompt:'모둠이 선택해 수행한 경로',options:['콘 사이 옆걸음','지그재그 걷기'],answer:[],ordered:false};plan.kind='choice';break;
    case 'T44': roleCycle(['발 구르기','팔 벌려 걷기','콩주머니 운반','공 굴리기']);plan.steps=tasks(['각자 맡은 장치에서 개인 목표를 채우고 교대해요.'],25);plan.targets=Array.from({length:players},(_,i)=>({label:`${i+1}번 장치 수리`,goal:3}));plan.checks=['각자 목표를 확인하고 다음 장치로 역할을 바꿨어요.'];break;
    case 'T46': {const order=shuffled(['걷기 구역','옆걸음 구역','표식 돌기 구역','공 굴리기 구역'],random);memory(order,'기억해서 중복 없이 방문한 구역 순서');plan.question!.options=['걷기 구역','옆걸음 구역','표식 돌기 구역','공 굴리기 구역'];break;}
    case 'T50': {const rooms=['지그재그 걷기','공 패스 5회','8박자 전신 동작','천으로 공 운반'];const index=Math.min(round,3);plan.title=`${index+1}번 방 · ${rooms[index]}`;plan.steps=index===2?[beats(['왼발 옆','오른발 모음','팔 위','팔 옆','오른발 옆','왼발 모음','몸 조금 낮추기','바로 서기'],'모두 8박자 전신 동작을 연결해요. 앉아서 팔 동작으로 바꾸어도 돼요.')]:tasks([rooms[index]+'를 모두 함께 시도해요.'],24);plan.targets=[{label:rooms[index],goal:index===1?5:1}];plan.checks=['이 방에서 전원이 참여한 것을 직접 확인했어요.'];break;}
    default: throw new Error('Unimplemented expedition rule: '+game.spec);
  }
  if(plan.steps.length===0)throw new Error('Missing steps: '+game.spec);
  if(plan.targets[0]?.label==='직접 확인한 성공')plan.targets=[{label:'안내된 구간을 수행한 수',goal:plan.steps.length}];
  return plan;
}

export function checkExpeditionAnswer(game:ExpeditionSpec,plan:ExpeditionRound,answer:string[],players:number):boolean {
  if(!plan.question)return true;
  if(game.spec==='S06')return answer.length===2&&answer[0]!==answer[1]&&answer.every(a=>plan.question!.options.includes(a))&&answer.reduce((sum,a)=>sum+Number(a),0)===plan.question.answer.reduce((sum,a)=>sum+Number(a),0);
  if(plan.kind==='unique')return answer.length===players&&new Set(answer).size===players;
  if(plan.kind==='choice')return answer.length===1&&plan.question.options.includes(answer[0]);
  return answer.length===plan.question.answer.length&&answer.every((a,i)=>a===plan.question!.answer[i]);
}
export function validateExpeditionRecord(plan:ExpeditionRound,record:ExpeditionRecord,players:number):string|null {
  if(record.participants.length!==players||new Set(record.participants).size!==players||record.participants.some(n=>n<1||n>players))return '참여한 번호를 모두 확인해 주세요.';
  if(plan.checks.some(check=>!record.checks.includes(check)))return '라운드 확인 항목을 직접 확인해 주세요.';
  if(record.counts.length!==plan.targets.length||record.counts.some((n,i)=>!Number.isInteger(n)||n<0||n>plan.targets[i].goal))return '성공 횟수를 목표 범위 안의 숫자로 입력해 주세요.';
  if(!Number.isFinite(record.elapsedMs)||record.elapsedMs<0)return '활동 시간을 다시 확인해 주세요.';
  if(plan.allocation&&(record.answer.length!==plan.allocation.counts.length||record.answer.some((v,i)=>Number(v)!==plan.allocation!.counts[i])))return '직접 확인한 섬별 인원이 제시된 정원과 같아야 해요.';
  if(plan.kind==='unique'&&(record.answer.length!==players||new Set(record.answer).size!==players))return '각자 서로 다른 받기 표식을 선택해 주세요. 같은 표식은 이번 라운드에 다시 쓸 수 없어요.';
  if(plan.question&&plan.kind!=='unique'&&record.answer.length!==(plan.kind==='choice'?1:plan.question.answer.length))return '수행한 답이나 순서를 빠짐없이 기록해 주세요.';
  return null;
}
export function expeditionScore(records:ExpeditionRecord[],plans:ExpeditionRound[]):number{
  if(!records.length)return 0;
  const average=records.reduce((sum,r,i)=>{
    const plan=plans[i];let ratio=plan.targets.length?r.counts.reduce((a,b)=>a+b,0)/plan.targets.reduce((a,b)=>a+b.goal,0):1;
    if(plan.question&&!r.correct)ratio=0;
    if(plan.timing==='estimate')ratio=Math.max(0,1-Math.abs(r.elapsedMs/1000-plan.targetSeconds!)/plan.targetSeconds!);
    if(plan.timing==='arrival')ratio=(r.arrivals||[]).filter(t=>Math.abs(t/1000-plan.targetSeconds!)<=2).length/Math.max(1,r.participants.length);
    return sum+ratio;
  },0)/records.length;
  return Math.round(average*100);
}
export function expeditionBingo(records:ExpeditionRecord[],plans:ExpeditionRound[]):{cells:number[];lines:number}{
  const cells=[...new Set(records.flatMap((record,i)=>plans[i].bingoCells?.filter((_,j)=>record.counts[j]>0)||[]))];
  const rows=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return {cells,lines:rows.filter(row=>row.every(cell=>cells.includes(cell))).length};
}
