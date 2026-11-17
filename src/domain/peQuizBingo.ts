/**
 * 체육 지식 빙고 땅따먹기. 팀이 5×5 칸을 골라 체육 규칙·안전·건강 문제를 맞히면 그 칸을 차지한다.
 * 몇 칸은 '움직임 칸'이라 문제 대신 반 전체가 짧은 동작을 하고, 선생님이 확인하면 그 팀이 차지한다.
 * 운으로 점수가 바뀌는 카드는 쓰지 않는다. 학생 이름은 다루지 않고 팀 이름만 쓴다.
 */
export type QuizKind='choice'|'short';
export interface QuizQuestion {kind:QuizKind;prompt:string;answer:string;wrong:string[]}
export type CellType='question'|'move';
export interface BingoCell {index:number;type:CellType;question?:number;move?:string}
export type CellStatus='open'|'owned'|'void';
export interface BingoSettings {teams:2|3|4;timeLimit:0|20|30|60;onWrong:'keep'|'void';rounds:0|4|6|8;moveCells:0|3|5;coopBonus:boolean}
export interface BingoGame {
 settings:BingoSettings;teamNames:string[];questions:QuizQuestion[];board:BingoCell[];
 status:CellStatus[];owner:(number|null)[];bonus:number[];turn:number;round:number;finished:boolean;log:string[];
}
export const CELL_POINTS=10,BINGO_POINTS=30,COOP_POINTS=5,BOARD_SIZE=25,TEAM_NAME_MAX=8;
export const TEAM_MARKS=['🦊','🐳','🐸','🦄'] as const;
export const DEFAULT_SETTINGS:BingoSettings={teams:2,timeLimit:0,onWrong:'keep',rounds:0,moveCells:5,coopBonus:true};

/** 움직임 칸 동작. 걷기·제자리 동작만 쓰고, 숨 참기나 기기를 들고 움직이는 동작은 넣지 않는다. */
export const MOVE_TASKS=['제자리 걸음 10번','팔 벌려 별 모양 5번','무릎 손뼉 8번','한 발 서기 5초 (벽을 짚어도 좋아요)','어깨 돌리기 5번','옆으로 한 걸음씩 4번 갔다 오기'] as const;

/** 가로 5줄·세로 5줄·대각선 2줄. */
export const BINGO_LINES:number[][]=[
 ...Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c)),
 ...Array.from({length:5},(_,c)=>Array.from({length:5},(_,r)=>r*5+c)),
 [0,6,12,18,24],[4,8,12,16,20],
];

/* ── 문제 세트 읽기·쓰기 ── */
const HEADER=/^(문제|질문)$/;
/**
 * 한 줄에 문제 하나. `문제 | 정답 | 오답1 | 오답2 | 오답3`이면 객관식, `문제 | 정답`이면 주관식.
 * 번호(1. 1) Q1:), 빈 줄, 표 머리글과 구분선, 표의 양끝 세로 막대는 알아서 뺀다.
 */
export function parseQuestions(text:string):{questions:QuizQuestion[];skipped:number}{
 const questions:QuizQuestion[]=[];let skipped=0;
 for(const raw of text.replace(/\r/g,'').split('\n')){
  let line=raw.trim();if(!line)continue;
  if(/^\|?\s*:?-{2,}/.test(line))continue;
  line=line.replace(/^\|/,'').replace(/\|$/,'').trim();
  line=line.replace(/^(?:Q\s*\d+\s*[.:)]|\d+\s*[.)]|[-*•])\s*/i,'');
  const cells=line.split('|').map(s=>s.trim()).filter(Boolean);
  if(cells.length&&HEADER.test(cells[0])&&cells.some(c=>c==='정답'))continue;
  if(cells.length<2){skipped++;continue;}
  const [prompt,answer,...wrong]=cells;
  const distinctWrong=[...new Set(wrong.filter(w=>w!==answer))].slice(0,3);
  questions.push(distinctWrong.length?{kind:'choice',prompt,answer,wrong:distinctWrong}:{kind:'short',prompt,answer,wrong:[]});
 }
 return {questions,skipped};
}
export const serializeQuestions=(questions:readonly QuizQuestion[])=>questions.map(q=>[q.prompt,q.answer,...q.wrong].join(' | ')).join('\n');

/* ── 빙고판 ── */
export type Rng=()=>number;
/** 같은 씨앗이면 같은 판이 나온다(되돌리기·새로고침 뒤에도 판이 그대로). */
export function seededRng(seed:number):Rng{let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function shuffled<T>(items:readonly T[],rng:Rng):T[]{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
/**
 * 25칸을 만든다. 움직임 칸 수만큼 자리를 고르고 나머지에 문제를 섞어 놓는다.
 * 문제가 모자라면 남는 칸도 움직임 칸이 된다.
 */
export function buildBoard(questionCount:number,moveCells:number,seed:number):BingoCell[]{
 const rng=seededRng(seed);
 const questionSlots=Math.min(questionCount,BOARD_SIZE-moveCells),positions=shuffled(Array.from({length:BOARD_SIZE},(_,i)=>i),rng);
 const questionOrder=shuffled(Array.from({length:questionCount},(_,i)=>i),rng).slice(0,questionSlots);
 const cells:BingoCell[]=Array.from({length:BOARD_SIZE},(_,index)=>({index,type:'move'}));
 positions.slice(0,questionSlots).forEach((pos,i)=>{cells[pos]={index:pos,type:'question',question:questionOrder[i]};});
 let m=Math.floor(rng()*MOVE_TASKS.length);
 for(const cell of cells)if(cell.type==='move'){cell.move=MOVE_TASKS[m%MOVE_TASKS.length];m++;}
 return cells;
}
/** 객관식 보기 순서. 칸마다 정해져 있어 다시 그려도 바뀌지 않는다. */
export function choiceOptions(q:QuizQuestion,cellIndex:number):string[]{
 return shuffled([q.answer,...q.wrong],seededRng(cellIndex*7919+q.prompt.length));
}

export function newGame(settings:BingoSettings,teamNames:readonly string[],questions:readonly QuizQuestion[],seed:number):BingoGame{
 const names=Array.from({length:settings.teams},(_,i)=>cleanTeamName(teamNames[i]??'',i));
 return {settings,teamNames:names,questions:[...questions],board:buildBoard(questions.length,settings.moveCells,seed),
  status:Array(BOARD_SIZE).fill('open'),owner:Array(BOARD_SIZE).fill(null),bonus:Array(settings.teams).fill(0),turn:0,round:1,finished:false,log:['게임 시작']};
}
export const cleanTeamName=(name:string,i:number)=>name.trim().slice(0,TEAM_NAME_MAX)||`${i+1}팀`;

/* ── 점수 ── */
export const ownedCount=(g:Pick<BingoGame,'owner'>,team:number)=>g.owner.filter(o=>o===team).length;
export const bingoLines=(g:Pick<BingoGame,'owner'>,team:number)=>BINGO_LINES.filter(line=>line.every(i=>g.owner[i]===team)).length;
export const teamScore=(g:Pick<BingoGame,'owner'|'bonus'>,team:number)=>ownedCount(g,team)*CELL_POINTS+bingoLines(g,team)*BINGO_POINTS+(g.bonus[team]??0);
/** 순위. 점수 → 빙고 줄 → 칸 수가 같으면 같은 순위. */
export function standings(g:BingoGame){
 const rows=g.teamNames.map((name,team)=>({team,name,cells:ownedCount(g,team),lines:bingoLines(g,team),bonus:g.bonus[team],score:teamScore(g,team),rank:0}));
 const key=(r:typeof rows[number])=>[r.score,r.lines,r.cells].join();
 rows.sort((a,b)=>b.score-a.score||b.lines-a.lines||b.cells-a.cells||a.team-b.team);
 rows.forEach((r,i)=>{r.rank=i&&key(rows[i-1])===key(r)?rows[i-1].rank:i+1;});
 return rows;
}

/* ── 진행 ── */
export type Resolution='correct'|'wrong'|'moved'|'pass';
/**
 * 지금 팀이 고른 칸의 결과를 반영하고 차례를 넘긴다. 원래 판은 바꾸지 않고 새 판을 돌려준다(되돌리기용).
 * correct·moved: 칸 차지(협력 보너스 선택) · wrong: 설정에 따라 칸을 남기거나 빈 칸으로 · pass: 차례만 넘김.
 */
export function resolveCell(g:BingoGame,cellIndex:number,result:Resolution,coop=false):BingoGame{
 if(g.finished||cellIndex<0||cellIndex>=BOARD_SIZE||g.status[cellIndex]!=='open')return g;
 const team=g.turn,name=g.teamNames[team],status=[...g.status],owner=[...g.owner],bonus=[...g.bonus],log=[...g.log];
 const cell=`${cellIndex+1}번 칸`;
 if(result==='correct'||result==='moved'){
  status[cellIndex]='owned';owner[cellIndex]=team;
  const extra=coop&&g.settings.coopBonus?COOP_POINTS:0;bonus[team]+=extra;
  const before=bingoLines(g,team),after=bingoLines({owner},team);
  log.push(`${g.round}라운드 · ${name}: ${cell} ${result==='moved'?'움직임 완료':'정답'}${extra?` · 협력 보너스 +${extra}`:''}${after>before?` · 빙고 ${after}줄!`:''}`);
 }else if(result==='wrong'){
  if(g.settings.onWrong==='void')status[cellIndex]='void';
  log.push(`${g.round}라운드 · ${name}: ${cell} 아쉬워요${g.settings.onWrong==='void'?' · 빈 칸이 됐어요':' · 다른 팀이 다시 도전할 수 있어요'}`);
 }else log.push(`${g.round}라운드 · ${name}: 차례를 넘겼어요`);
 const turn=(team+1)%g.settings.teams,round=turn===0?g.round+1:g.round;
 const noOpen=!status.includes('open'),overRounds=g.settings.rounds>0&&round>g.settings.rounds;
 const finished=noOpen||overRounds;if(finished)log.push(noOpen?'모든 칸을 열어 게임이 끝났어요':`${g.settings.rounds}라운드를 마쳐 게임이 끝났어요`);
 return {...g,status,owner,bonus,log,turn,round,finished};
}
export const finishGame=(g:BingoGame):BingoGame=>g.finished?g:{...g,finished:true,log:[...g.log,'선생님이 게임을 끝냈어요']};

/** 저장했다가 다시 읽은 값이 올바른 판인지 확인한다. 틀리면 null. */
export function validGame(raw:unknown):BingoGame|null{
 if(!raw||typeof raw!=='object')return null;
 const g=raw as BingoGame,s=g.settings;
 const ok=s&&[2,3,4].includes(s.teams)&&[0,20,30,60].includes(s.timeLimit)&&['keep','void'].includes(s.onWrong)&&[0,4,6,8].includes(s.rounds)&&[0,3,5].includes(s.moveCells)&&typeof s.coopBonus==='boolean'
  &&Array.isArray(g.teamNames)&&g.teamNames.length===s.teams&&g.teamNames.every(n=>typeof n==='string'&&n.length<=TEAM_NAME_MAX)
  &&Array.isArray(g.questions)&&g.questions.every(q=>q&&typeof q.prompt==='string'&&typeof q.answer==='string'&&Array.isArray(q.wrong)&&(q.kind==='choice'||q.kind==='short'))
  &&Array.isArray(g.board)&&g.board.length===BOARD_SIZE&&g.board.every((c,i)=>c&&c.index===i&&(c.type==='move'?typeof c.move==='string':Number.isInteger(c.question)&&c.question!>=0&&c.question!<g.questions.length))
  &&Array.isArray(g.status)&&g.status.length===BOARD_SIZE&&g.status.every(v=>v==='open'||v==='owned'||v==='void')
  &&Array.isArray(g.owner)&&g.owner.length===BOARD_SIZE&&g.owner.every((o,i)=>(o===null)===(g.status[i]!=='owned')&&(o===null||Number.isInteger(o)&&o>=0&&o<s.teams))
  &&Array.isArray(g.bonus)&&g.bonus.length===s.teams&&g.bonus.every(n=>Number.isInteger(n)&&n>=0)
  &&Number.isInteger(g.turn)&&g.turn>=0&&g.turn<s.teams&&Number.isInteger(g.round)&&g.round>=1&&typeof g.finished==='boolean'&&Array.isArray(g.log)&&g.log.every(l=>typeof l==='string');
 return ok?g:null;
}

/* ── AI에게 문제 만들기 부탁하기 ── */
export const PROMPT_TOPICS=['경기 규칙','안전','건강 생활','종목 지식'] as const;
export const PROMPT_GRADES=['초등학교 3학년','초등학교 4학년','초등학교 5학년','초등학교 6학년'] as const;
export const PROMPT_LEVELS=['쉬움','보통','어려움','쉬움부터 어려움까지 골고루'] as const;
/** 선생님이 복사해 AI 챗봇에 붙여 넣는 부탁 글. 앱은 AI를 직접 부르지 않는다. */
export function buildQuizPrompt(o:{grade:string;topic:string;count:number;level:string;shortAnswers:boolean}):string{
 return [
  `${o.grade} 체육 수업에서 쓸 퀴즈 문제 ${o.count}개를 만들어 주세요. 주제: ${o.topic.trim()||'체육 일반'}. 난이도: ${o.level}.`,
  '',
  '[반드시 지킬 형식]',
  '- 한 줄에 문제 하나만 씁니다. 번호, 머리글, 설명, 빈 줄은 쓰지 않습니다.',
  '- 객관식: 문제 | 정답 | 오답1 | 오답2 | 오답3',
  o.shortAnswers?'- 주관식(답이 한두 낱말인 것): 문제 | 정답   (전체의 5분의 1 정도만)':'- 모두 객관식으로 만듭니다.',
  '- 칸은 세로 막대 | 로만 나눕니다. 문제 안에는 | 를 쓰지 않습니다.',
  '',
  '[내용 기준]',
  '- 초등학생이 이해할 수 있는 쉬운 우리말로 씁니다.',
  '- 교과서나 공식 경기 규칙으로 확인할 수 있는 사실만 씁니다. 확실하지 않은 숫자나 기록은 쓰지 않습니다.',
  '- 정답은 하나뿐이고, 오답은 그럴듯하지만 분명히 틀린 것으로 씁니다.',
  '- 안전 문제는 학교 체육 안전 수칙과 맞게 씁니다. 숨 참기, 목을 눌러 맥박 재기, 기기를 들고 뛰기를 권하지 않습니다.',
  '- 진단·치료 같은 의학적 판단이나 특정 상품·인물 이야기는 넣지 않습니다.',
 ].join('\n');
}

/* ── 예시 문제 세트 (3~6학년 체육 규칙·안전·건강) ── */
export const EXAMPLE_QUESTIONS_TEXT=[
 '준비운동을 하는 가장 큰 까닭은? | 몸을 데워 다치지 않게 하려고 | 점수를 높이려고 | 활동을 빨리 끝내려고 | 친구를 이기려고',
 '정리운동을 하는 까닭은? | 몸을 천천히 편안하게 되돌리려고 | 더 힘들게 하려고 | 점수를 얻으려고 | 시간을 채우려고',
 '스트레칭은 어떻게 하면 좋을까요? | 아프지 않을 만큼 천천히 늘린다 | 반동을 주며 세게 튕긴다 | 아플 때까지 당긴다 | 숨을 참고 버틴다',
 '운동할 때 숨은 어떻게 쉬면 좋을까요? | 참지 않고 편하게 쉰다 | 최대한 오래 참는다 | 입을 막고 쉰다 | 운동이 끝날 때까지 쉬지 않는다',
 '운동하다 몸이 아프거나 어지러우면? | 바로 멈추고 선생님께 알린다 | 참고 계속한다 | 친구에게만 말한다 | 더 빨리 움직인다',
 '스마트폰이나 태블릿으로 활동할 때 이동하는 방법은? | 기기를 내려놓고 걸어서 이동한다 | 기기를 들고 뛴다 | 기기를 친구에게 던진다 | 화면을 보며 걷는다',
 '여럿이 함께 움직이는 활동에서 안전한 이동 방법은? | 주위를 살피며 걷는다 | 뒤를 보며 뛴다 | 눈을 감고 걷는다 | 친구를 밀며 지나간다',
 '공이 다른 모둠 구역으로 굴러가면? | 활동이 멈췄을 때 걸어가서 가져온다 | 바로 뛰어 들어간다 | 그냥 두고 집에 간다 | 큰 소리로 화를 낸다',
 '더운 날 운동장에서 활동할 때 알맞은 것은? | 그늘에서 쉬고 물을 자주 마신다 | 한낮에 쉬지 않고 뛴다 | 물을 참는다 | 모자를 벗어 둔다',
 '운동 중 물은 언제 마시면 좋을까요? | 목마르기 전에 조금씩 자주 | 운동이 끝난 뒤 한 번에 많이 | 마시지 않는다 | 땀이 날 때만',
 '미세먼지가 매우 나쁜 날 체육 수업은? | 실내 활동으로 바꾼다 | 운동장에서 오래 달린다 | 바깥에서 더 오래 논다 | 아무 상관 없다',
 '모둠 활동에서 친구가 실수했을 때 알맞은 말은? | 괜찮아, 다시 해 보자 | 너 때문에 졌어 | 너는 빠져 | 아무 말도 하지 않고 무시한다',
 '줄넘기를 할 때 발의 어느 부분으로 가볍게 착지하면 좋을까요? | 발 앞꿈치 | 발뒤꿈치만 | 발 옆날 | 무릎',
 '오래달리기와 관계가 깊은 체력 요소는? | 심폐지구력 | 유연성 | 순발력 | 평형성',
 '앉아 윗몸 앞으로 굽히기로 알아볼 수 있는 체력 요소는? | 유연성 | 심폐지구력 | 순발력 | 민첩성',
 '제자리 멀리뛰기로 알아볼 수 있는 체력 요소는? | 순발력 | 유연성 | 평형성 | 심폐지구력',
 '한 발로 서서 버티는 활동과 관계가 깊은 체력 요소는? | 평형성 | 순발력 | 심폐지구력 | 유연성',
 '축구에서 골키퍼가 아닌 선수가 경기 중 공을 일부러 손으로 만지면? | 반칙이다 | 득점이 된다 | 코너킥이 된다 | 아무 일도 없다',
 '농구에서 공을 들고 드리블 없이 여러 걸음 걸으면 어떤 반칙일까요? | 트래블링 | 오프사이드 | 홈런 | 아웃',
 '배구에서 블로킹을 빼고, 한 팀이 상대 코트로 넘기기 전까지 공을 칠 수 있는 횟수는? | 3번까지 | 1번까지 | 5번까지 | 몇 번이든',
 '농구 경기에서 한 팀이 코트에 내보내는 선수는 몇 명일까요? | 5명 | 6명 | 9명 | 11명',
 '정식 축구 경기에서 한 팀이 경기장에 내보내는 선수는 몇 명일까요? | 11명 | 5명 | 9명 | 15명',
 '야구에서 타자가 스트라이크를 세 번 받으면? | 삼진 아웃 | 홈런 | 볼넷 | 안타',
 '태권도 겨루기를 시작하기 전과 마친 뒤에 하는 것은? | 서로 인사한다 | 등을 돌린다 | 소리를 지른다 | 바로 뛰어나간다',
 '경기에서 졌을 때 알맞은 행동은? | 상대를 축하하고 다음을 준비한다 | 공을 차며 화를 낸다 | 심판을 탓한다 | 인사하지 않고 간다',
 '배드민턴에서 라켓으로 치는, 깃털이 달린 공의 이름은? | 셔틀콕',
 '농구에서 공을 바닥에 튀기며 이동하는 기술은? | 드리블',
 '경기를 진행하고 규칙에 따라 판정하는 사람은? | 심판',
 '근육과 관절을 부드럽게 늘려 주는 운동은? | 스트레칭',
 '규칙을 지키고 상대를 존중하며 공정하게 겨루는 태도를 무엇이라고 할까요? | 페어플레이',
].join('\n');
export const EXAMPLE_QUESTIONS:QuizQuestion[]=parseQuestions(EXAMPLE_QUESTIONS_TEXT).questions;
