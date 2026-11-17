import test from 'node:test';
import assert from 'node:assert/strict';
import {
 BINGO_LINES,BOARD_SIZE,CELL_POINTS,BINGO_POINTS,COOP_POINTS,DEFAULT_SETTINGS,EXAMPLE_QUESTIONS,EXAMPLE_QUESTIONS_TEXT,MOVE_TASKS,
 bingoLines,buildBoard,buildQuizPrompt,choiceOptions,finishGame,newGame,parseQuestions,resolveCell,serializeQuestions,standings,teamScore,validGame,
} from '../src/domain/peQuizBingo';
import {CLASS_TOOLS} from '../src/domain/classTools';

test('the question parser reads choice and short answers and skips numbering, blanks and table headers',()=>{
 const {questions,skipped}=parseQuestions([
  '| 문제 | 정답 | 오답1 | 오답2 | 오답3 |','|---|---|---|---|---|','',
  '1. 농구 한 팀 선수 수는? | 5명 | 6명 | 11명 | 9명',
  'Q2: 깃털 달린 공의 이름은? | 셔틀콕',
  '- 제목만 있는 줄',
  '| 축구 정식 경기 선수 수는? | 11명 | 9명 | 11명 |',
 ].join('\n'));
 assert.equal(questions.length,3);assert.equal(skipped,1);
 assert.deepEqual(questions[0],{kind:'choice',prompt:'농구 한 팀 선수 수는?',answer:'5명',wrong:['6명','11명','9명']});
 assert.deepEqual(questions[1],{kind:'short',prompt:'깃털 달린 공의 이름은?',answer:'셔틀콕',wrong:[]});
 assert.deepEqual(questions[2].wrong,['9명'],'a wrong option equal to the answer is dropped');
 assert.deepEqual(parseQuestions(serializeQuestions(questions)).questions,questions,'export and import round-trip');
});

test('the example set has at least 25 questions, mostly multiple choice, and follows the app safety rules',()=>{
 assert(EXAMPLE_QUESTIONS.length>=25);
 assert.equal(parseQuestions(EXAMPLE_QUESTIONS_TEXT).skipped,0);
 assert(EXAMPLE_QUESTIONS.filter(q=>q.kind==='choice').length>=20);
 for(const q of EXAMPLE_QUESTIONS){assert(!q.wrong.includes(q.answer),q.prompt);assert.equal(new Set(q.wrong).size,q.wrong.length,q.prompt);}
 const answers=EXAMPLE_QUESTIONS.map(q=>q.answer).join(' ');
 assert.doesNotMatch(answers,/숨을? ?참|목을 눌|들고 뛴/,'no correct answer recommends breath holding, neck pressure or running with a device');
 for(const move of MOVE_TASKS)assert.doesNotMatch(move,/달리|뛰어|숨/,move);
});

test('the board places movement cells and every question at most once, the same way for the same seed',()=>{
 const a=buildBoard(30,5,42),b=buildBoard(30,5,42);
 assert.deepEqual(a,b);assert.equal(a.length,BOARD_SIZE);
 assert.equal(a.filter(c=>c.type==='move').length,5);
 const used=a.filter(c=>c.type==='question').map(c=>c.question!);assert.equal(new Set(used).size,20);assert(used.every(q=>q>=0&&q<30));
 assert.equal(buildBoard(12,3,1).filter(c=>c.type==='move').length,13,'missing questions become movement cells');
 assert.equal(buildBoard(30,0,1).filter(c=>c.type==='move').length,0);
 const q=EXAMPLE_QUESTIONS[0];assert.deepEqual(choiceOptions(q,3),choiceOptions(q,3));assert.deepEqual([...choiceOptions(q,3)].sort(),[q.answer,...q.wrong].sort());
});

test('there are 12 bingo lines and a full row scores cells plus one bingo',()=>{
 assert.equal(BINGO_LINES.length,12);assert(BINGO_LINES.every(l=>l.length===5));
 const owner=Array(25).fill(null);[0,1,2,3,4].forEach(i=>{owner[i]=0;});
 assert.equal(bingoLines({owner},0),1);assert.equal(teamScore({owner,bonus:[0,0]},0),5*CELL_POINTS+BINGO_POINTS);
});

test('turns rotate, a wrong answer keeps or voids the cell, coop bonus is optional, and the game ends',()=>{
 let g=newGame({...DEFAULT_SETTINGS,teams:2},['청팀',''],EXAMPLE_QUESTIONS,7);
 assert.deepEqual(g.teamNames,['청팀','2팀']);
 const q0=g.board.findIndex(c=>c.type==='question');
 const before=g;g=resolveCell(g,q0,'correct',true);
 assert.equal(before.status[q0],'open','the previous state is untouched for undo');
 assert.equal(g.owner[q0],0);assert.equal(g.bonus[0],COOP_POINTS);assert.equal(g.turn,1);assert.equal(g.round,1);
 assert.equal(resolveCell(g,q0,'correct'),g,'an owned cell cannot be taken again');
 const q1=g.board.findIndex((c,i)=>c.type==='question'&&g.status[i]==='open');
 g=resolveCell(g,q1,'wrong');assert.equal(g.status[q1],'open');assert.equal(g.turn,0);assert.equal(g.round,2);
 const voidGame=resolveCell(newGame({...DEFAULT_SETTINGS,onWrong:'void'},[],EXAMPLE_QUESTIONS,7),q1,'wrong');assert.equal(voidGame.status[q1],'void');
 const noCoop=resolveCell(newGame({...DEFAULT_SETTINGS,coopBonus:false},[],EXAMPLE_QUESTIONS,7),q0,'correct',true);assert.equal(noCoop.bonus[0],0);
 let limited=newGame({...DEFAULT_SETTINGS,teams:2,rounds:4},[],EXAMPLE_QUESTIONS,3);
 for(let i=0;i<8;i++)limited=resolveCell(limited,limited.status.indexOf('open'),'pass');
 assert.equal(limited.finished,true,'four rounds of two teams end the game');
 let full=newGame({...DEFAULT_SETTINGS,teams:3},[],EXAMPLE_QUESTIONS,9);
 for(let i=0;i<25;i++)full=resolveCell(full,full.status.indexOf('open'),full.board[full.status.indexOf('open')].type==='move'?'moved':'correct');
 assert.equal(full.finished,true);assert.equal(full.status.filter(s=>s==='owned').length,25);
 assert.equal(standings(full).reduce((n,r)=>n+r.cells,0),25);
 assert.equal(finishGame(g).finished,true);
});

test('a saved game is only restored when it is well formed',()=>{
 const g=resolveCell(newGame(DEFAULT_SETTINGS,[],EXAMPLE_QUESTIONS,5),0,'pass');
 assert.deepEqual(validGame(JSON.parse(JSON.stringify(g))),g);
 assert.equal(validGame({...g,owner:g.owner.map(()=>0)}),null,'owners must match owned cells');
 assert.equal(validGame({...g,settings:{...g.settings,teams:9}}),null);
 assert.equal(validGame(null),null);
});

test('the AI prompt asks for the exact line format, verifiable facts and the app safety rules',()=>{
 const prompt=buildQuizPrompt({grade:'초등학교 5학년',topic:'안전',count:30,level:'보통',shortAnswers:false});
 assert.match(prompt,/초등학교 5학년/);assert.match(prompt,/30개/);assert.match(prompt,/문제 \| 정답 \| 오답1 \| 오답2 \| 오답3/);
 assert.match(prompt,/모두 객관식/);assert.match(prompt,/확인할 수 있는 사실/);assert.match(prompt,/숨 참기/);
 assert.match(buildQuizPrompt({grade:'초등학교 3학년',topic:' ',count:25,level:'쉬움',shortAnswers:true}),/주제: 체육 일반[\s\S]*문제 \| 정답 /);
});

test('the quiz bingo is a class tool',()=>{
 assert(CLASS_TOOLS.some(t=>t.id==='quiz-bingo'));
});
