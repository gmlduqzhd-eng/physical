import {useEffect,useMemo,useRef,useState} from 'react';
import {readJsonStorage,readStorage,removeStorage,writeStorage} from '../../application/browserStorage';
import {sfxPop,sfxSuccess,sfxWhistle,unlockAudio} from '../../application/soundEffects';
import {
 BOARD_SIZE,CELL_POINTS,BINGO_POINTS,COOP_POINTS,DEFAULT_SETTINGS,EXAMPLE_QUESTIONS_TEXT,PROMPT_GRADES,PROMPT_LEVELS,PROMPT_TOPICS,TEAM_MARKS,TEAM_NAME_MAX,
 bingoLines,buildQuizPrompt,choiceOptions,finishGame,newGame,ownedCount,parseQuestions,resolveCell,standings,teamScore,validGame,
 type BingoGame,type BingoSettings,type Resolution,
} from '../../domain/peQuizBingo';
import './PeQuizBingo.css';

const GAME_KEY='physical_pe_quiz_bingo_game_v1',SET_KEY='physical_pe_quiz_bingo_set_v1',UNDO_LIMIT=30;
const SETTINGS_OPTIONS={teams:[2,3,4],timeLimit:[0,20,30,60],rounds:[0,4,6,8],moveCells:[0,3,5]} as const;

function Choices<T extends string|number>({label,value,options,format,onChange}:{label:string;value:T;options:readonly T[];format:(v:T)=>string;onChange:(v:T)=>void}){
 return <div className="qb-setting"><span id={`qb-${label}`}>{label}</span><div className="sports-filters" role="group" aria-labelledby={`qb-${label}`}>{options.map(o=><button key={String(o)} type="button" aria-pressed={value===o} onClick={()=>onChange(o)}>{format(o)}</button>)}</div></div>;
}

/** 문제 세트 고치기 · 파일로 주고받기 · AI 부탁 글 만들기. */
function QuestionEditor({text,onChange,onClose}:{text:string;onChange:(t:string)=>void;onClose:()=>void}){
 const [draft,setDraft]=useState(text),[grade,setGrade]=useState<string>(PROMPT_GRADES[2]),[topic,setTopic]=useState<string>(PROMPT_TOPICS[0]),[custom,setCustom]=useState('');
 const [count,setCount]=useState(30),[level,setLevel]=useState<string>(PROMPT_LEVELS[3]),[short,setShort]=useState(true),[copied,setCopied]=useState(''),file=useRef<HTMLInputElement>(null);
 const parsed=useMemo(()=>parseQuestions(draft),[draft]),choice=parsed.questions.filter(q=>q.kind==='choice').length;
 const prompt=buildQuizPrompt({grade,topic:custom.trim()||topic,count,level,shortAnswers:short});
 const download=()=>{const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='체육지식빙고_문제.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const copy=async()=>{try{await navigator.clipboard.writeText(prompt);setCopied('복사했어요. AI 챗봇에 붙여 넣으세요.');}catch{setCopied('복사하지 못했어요. 아래 글을 직접 골라 복사해 주세요.');}};
 return <section className="qb-editor" aria-label="문제 세트 만들기">
  <div className="qb-editor-grid">
   <div>
    <h3>✏️ 문제 입력</h3>
    <p className="sports-muted">한 줄에 문제 하나. 객관식은 <code>문제 | 정답 | 오답1 | 오답2 | 오답3</code>, 주관식은 <code>문제 | 정답</code>. 번호·빈 줄·표 머리글은 알아서 빼고 읽어요.</p>
    <label className="qb-textarea">문제 목록<textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={12} spellCheck={false}/></label>
    <p role="status">{parsed.questions.length?`문제 ${parsed.questions.length}개를 읽었어요 (객관식 ${choice} · 주관식 ${parsed.questions.length-choice})${parsed.questions.length<BOARD_SIZE?` · 모자란 칸은 움직임 칸이 돼요`:''}`:'아직 읽은 문제가 없어요.'}{parsed.skipped?` · 형식이 맞지 않는 ${parsed.skipped}줄은 뺐어요`:''}</p>
    <div className="qb-row">
     <button type="button" className="primary" disabled={!parsed.questions.length} onClick={()=>{onChange(draft);onClose();}}>이 문제로 정하기</button>
     <button type="button" onClick={()=>setDraft(EXAMPLE_QUESTIONS_TEXT)}>예시 문제 넣기</button>
     <button type="button" onClick={download} disabled={!draft.trim()}>파일로 내보내기(.txt)</button>
     <button type="button" onClick={()=>file.current?.click()}>파일 불러오기</button>
     <input ref={file} type="file" accept=".txt,text/plain" hidden onChange={async e=>{const f=e.target.files?.[0];if(f)setDraft(await f.text());e.target.value='';}}/>
     <button type="button" onClick={onClose}>닫기</button>
    </div>
   </div>
   <div>
    <h3>🤖 AI에게 문제 만들기 부탁하기</h3>
    <p className="sports-muted">고르면 부탁 글이 만들어져요. 복사해 AI 챗봇에 붙여 넣고, 나온 결과를 왼쪽에 그대로 붙여 넣으세요. 앱은 AI에 직접 연결하지 않아요.</p>
    <label className="tools-select">학년<select value={grade} onChange={e=>setGrade(e.target.value)}>{PROMPT_GRADES.map(g=><option key={g}>{g}</option>)}</select></label>
    <label className="tools-select">주제<select value={topic} onChange={e=>setTopic(e.target.value)}>{PROMPT_TOPICS.map(t=><option key={t}>{t}</option>)}</select></label>
    <label className="tools-text">직접 쓰는 주제 (선택)<input value={custom} maxLength={40} placeholder="예: 피구 규칙과 안전" onChange={e=>setCustom(e.target.value)}/></label>
    <label className="tools-select">문제 수<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[25,30,40].map(n=><option key={n} value={n}>{n}개</option>)}</select></label>
    <label className="tools-select">난이도<select value={level} onChange={e=>setLevel(e.target.value)}>{PROMPT_LEVELS.map(l=><option key={l}>{l}</option>)}</select></label>
    <label className="qb-check"><input type="checkbox" checked={short} onChange={e=>setShort(e.target.checked)}/> 주관식도 조금 섞기</label>
    <textarea className="qb-prompt" readOnly value={prompt} rows={9} aria-label="AI에게 보낼 부탁 글"/>
    <button type="button" className="primary" onClick={()=>void copy()}>📋 부탁 글 복사하기</button>
    <p role="status" className="sports-muted">{copied||'AI가 만든 문제는 꼭 한 번 읽고 정답이 맞는지 확인하세요.'}</p>
   </div>
  </div>
 </section>;
}

/** 체육 지식 빙고 땅따먹기. 교사 화면 한 대로 진행한다. */
export function PeQuizBingo(){
 const [game,setGame]=useState<BingoGame|null>(()=>validGame(readJsonStorage(GAME_KEY)));
 const [history,setHistory]=useState<BingoGame[]>([]);
 const [settings,setSettings]=useState<BingoSettings>(()=>game?.settings??DEFAULT_SETTINGS);
 const [names,setNames]=useState<string[]>(()=>game?.teamNames??['','','','']);
 const [questionsText,setQuestionsText]=useState(()=>readStorage(SET_KEY)||EXAMPLE_QUESTIONS_TEXT);
 const [editing,setEditing]=useState(false),[picked,setPicked]=useState<number|null>(null),[chosen,setChosen]=useState<string|null>(null);
 const [revealed,setRevealed]=useState(false),[coop,setCoop]=useState(false),[confirmEnd,setConfirmEnd]=useState(false),[left,setLeft]=useState<number|null>(null);
 const questions=useMemo(()=>parseQuestions(questionsText).questions,[questionsText]);

 useEffect(()=>{if(game)writeStorage(GAME_KEY,JSON.stringify(game));else removeStorage(GAME_KEY);},[game]);
 const cell=game&&picked!==null?game.board[picked]:null,question=cell?.type==='question'?game!.questions[cell.question!]:null;
 const expired=left===0;
 // 제한 시간: 문제 칸을 열면 잰다. 객관식은 시간이 끝나면 고를 수 없고 정답을 보여 준다.
 useEffect(()=>{
  if(!game||picked===null||!question||!game.settings.timeLimit||chosen!==null||revealed){setLeft(null);return;}
  const end=Date.now()+game.settings.timeLimit*1000;setLeft(game.settings.timeLimit);
  const t=setInterval(()=>{const s=Math.max(0,Math.ceil((end-Date.now())/1000));setLeft(s);if(!s){clearInterval(t);sfxWhistle();}},250);
  return()=>clearInterval(t);
 },[game,picked,question,chosen,revealed]);

 const closeCell=()=>{setPicked(null);setChosen(null);setRevealed(false);setCoop(false);setLeft(null);};
 const apply=(result:Resolution)=>{
  if(!game||picked===null)return;
  const next=resolveCell(game,picked,result,coop);
  if(next===game)return;
  setHistory(h=>[...h.slice(-UNDO_LIMIT+1),game]);setGame(next);closeCell();
  if(result==='correct'||result==='moved')sfxSuccess();else sfxPop();
 };
 const undo=()=>{const prev=history.at(-1);if(!prev)return;setHistory(h=>h.slice(0,-1));setGame(prev);closeCell();setConfirmEnd(false);};
 const start=(seed=Date.now())=>{unlockAudio();setHistory([]);closeCell();setConfirmEnd(false);setGame(newGame(settings,names,questions.length?questions:parseQuestions(EXAMPLE_QUESTIONS_TEXT).questions,seed));};
 const saveQuestions=(t:string)=>{setQuestionsText(t);writeStorage(SET_KEY,t);};

 if(!game)return <div className="qb">
  <p>팀별로 체육 규칙·안전·건강 문제를 맞히고 5×5 빙고판을 차지해요. 움직임 칸에서는 반 전체가 함께 몸을 움직여요.</p>
  <section className="qb-setup" aria-label="게임 설정">
   <Choices label="팀 수" value={settings.teams} options={SETTINGS_OPTIONS.teams} format={n=>`${n}팀`} onChange={n=>setSettings({...settings,teams:n})}/>
   <div className="qb-teams">{Array.from({length:settings.teams},(_,i)=><label key={i} className="tools-text"><span>{TEAM_MARKS[i]} {i+1}팀 이름</span><input value={names[i]} maxLength={TEAM_NAME_MAX} placeholder={`${i+1}팀`} onChange={e=>setNames(names.map((n,j)=>j===i?e.target.value:n))}/></label>)}</div>
   <Choices label="제한 시간" value={settings.timeLimit} options={SETTINGS_OPTIONS.timeLimit} format={n=>n?`${n}초`:'없음'} onChange={n=>setSettings({...settings,timeLimit:n})}/>
   <Choices label="라운드" value={settings.rounds} options={SETTINGS_OPTIONS.rounds} format={n=>n?`${n}라운드`:'칸이 다 열릴 때까지'} onChange={n=>setSettings({...settings,rounds:n})}/>
   <Choices label="움직임 칸" value={settings.moveCells} options={SETTINGS_OPTIONS.moveCells} format={n=>n?`${n}칸`:'없음'} onChange={n=>setSettings({...settings,moveCells:n})}/>
   <Choices label="틀렸을 때" value={settings.onWrong} options={['keep','void'] as const} format={v=>v==='keep'?'칸 그대로 (다른 팀이 도전)':'빈 칸이 돼요'} onChange={v=>setSettings({...settings,onWrong:v})}/>
   <label className="qb-check"><input type="checkbox" checked={settings.coopBonus} onChange={e=>setSettings({...settings,coopBonus:e.target.checked})}/> 협력 보너스 쓰기 (팀 모두가 이유를 말하면 +{COOP_POINTS}점)</label>
   <p className="sports-muted">점수: 칸 하나 {CELL_POINTS}점 · 빙고 한 줄 {BINGO_POINTS}점{settings.coopBonus?` · 협력 보너스 ${COOP_POINTS}점`:''}. 운으로 점수가 바뀌는 카드는 없어요.</p>
   <p>문제 세트: <strong>{questions.length}문제</strong> (객관식 {questions.filter(q=>q.kind==='choice').length} · 주관식 {questions.filter(q=>q.kind==='short').length}) <button type="button" onClick={()=>setEditing(!editing)} aria-expanded={editing}>📝 문제 세트 만들기 · AI 부탁 글</button></p>
  </section>
  {editing&&<QuestionEditor text={questionsText} onChange={saveQuestions} onClose={()=>setEditing(false)}/>}
  <div className="flagship-row tools-center"><button type="button" className="primary tools-go" onClick={()=>start()}>🚩 게임 시작</button></div>
  <p className="sports-muted">학생 이름은 넣지 않고 팀 이름만 써요. 진행 상황은 이 기기에만 저장돼서 새로고침해도 이어져요.</p>
 </div>;

 const rows=standings(game);
 return <div className="qb" data-finished={game.finished?'yes':'no'}>
  <div className="qb-top">
   <p className="qb-turn" role="status" aria-live="polite">{game.finished?'🏁 게임이 끝났어요':<>{game.settings.rounds?`${game.round}/${game.settings.rounds}라운드`:`${game.round}라운드`} · <strong>{TEAM_MARKS[game.turn]} {game.teamNames[game.turn]}</strong> 차례 · 칸을 골라요</>}</p>
   <div className="qb-row">
    <button type="button" onClick={undo} disabled={!history.length}>↶ 되돌리기</button>
    {!game.finished&&<button type="button" onClick={()=>setConfirmEnd(true)}>🏁 끝내기</button>}
   </div>
  </div>
  {confirmEnd&&<div className="sports-confirm" role="alert"><p>지금 점수로 게임을 끝낼까요?</p><button type="button" onClick={()=>setConfirmEnd(false)}>계속하기</button><button type="button" className="primary" onClick={()=>{setHistory(h=>[...h,game]);setGame(finishGame(game));setConfirmEnd(false);closeCell();}}>끝내기</button></div>}
  <div className="qb-teams-score">{game.teamNames.map((name,t)=><section key={t} className="qb-team" data-team={t} aria-current={!game.finished&&game.turn===t?'true':undefined}>
   <strong>{TEAM_MARKS[t]} {name}</strong><output aria-label={`${name} 점수`}>{teamScore(game,t)}점</output><small>칸 {ownedCount(game,t)} · 빙고 {bingoLines(game,t)}줄{game.bonus[t]?` · 보너스 ${game.bonus[t]}`:''}</small>
  </section>)}</div>
  <div className="qb-board" role="grid" aria-label="빙고판">{game.board.map((c,i)=>{
   const owner=game.owner[i],status=game.status[i];
   const label=status==='owned'?`${i+1}번 칸 · ${game.teamNames[owner!]} 땅`:status==='void'?`${i+1}번 칸 · 빈 칸`:`${i+1}번 칸 · ${c.type==='move'?'움직임 칸일 수도 있어요':'열지 않은 칸'}`;
   return <button key={i} type="button" className="qb-cell" data-status={status} data-team={owner??undefined} aria-label={label} aria-pressed={picked===i}
    disabled={game.finished||status!=='open'||(picked!==null&&picked!==i)} onClick={()=>{unlockAudio();setPicked(i);setChosen(null);setRevealed(false);setCoop(false);}}>
    {status==='owned'?<span aria-hidden="true">{TEAM_MARKS[owner!]}</span>:status==='void'?<span aria-hidden="true">·</span>:<span>{i+1}</span>}
   </button>;})}</div>

  {cell&&!game.finished&&<section className="qb-panel" aria-label={`${picked!+1}번 칸`} aria-live="polite">
   <p className="eyebrow">{picked!+1}번 칸 · {TEAM_MARKS[game.turn]} {game.teamNames[game.turn]}</p>
   {cell.type==='move'?<>
    <h3>🏃 움직임 칸! 반 전체가 함께 해요</h3>
    <p className="qb-move">{cell.move}</p>
    <p className="sports-muted">기기는 내려놓고 제자리에서 해요. 불편한 친구는 작게 하거나 앉아서 해도 돼요.</p>
    {game.settings.coopBonus&&<label className="qb-check"><input type="checkbox" checked={coop} onChange={e=>setCoop(e.target.checked)}/> 팀 모두가 끝까지 함께했어요 (+{COOP_POINTS}점)</label>}
    <div className="qb-row"><button type="button" className="primary" onClick={()=>apply('moved')}>모두 해냈어요 · 칸 차지</button><button type="button" onClick={closeCell}>다른 칸 고르기</button></div>
   </>:question&&<>
    <h3 className="qb-question">{question.prompt}</h3>
    {left!==null&&<p className="qb-timer" data-low={left<=5?'yes':'no'}>⏱ {left}초</p>}
    {question.kind==='choice'?<>
     <div className="qb-options">{choiceOptions(question,picked!).map(o=>{const state=chosen===null&&!expired?undefined:o===question.answer?'answer':o===chosen?'wrong':undefined;
      return <button key={o} type="button" data-state={state} disabled={chosen!==null||expired} onClick={()=>{setChosen(o);if(o===question.answer)sfxSuccess();else sfxPop();}}>{o}</button>;})}</div>
     {(chosen!==null||expired)&&<p role="status" className="qb-result">{chosen===question.answer?'⭕ 정답이에요!':`❌ ${expired&&chosen===null?'시간이 끝났어요':'아쉬워요'} · 정답: ${question.answer}`}</p>}
    </>:<>
     {!revealed?<button type="button" className="primary" onClick={()=>setRevealed(true)}>👀 정답 보기</button>:<p className="qb-result">정답: <strong>{question.answer}</strong> · 선생님이 맞았는지 판정해 주세요</p>}
    </>}
    {game.settings.coopBonus&&(question.kind==='short'?revealed:chosen===question.answer)&&<label className="qb-check"><input type="checkbox" checked={coop} onChange={e=>setCoop(e.target.checked)}/> 팀 모두가 이유를 말했어요 (+{COOP_POINTS}점)</label>}
    <div className="qb-row">
     {question.kind==='choice'&&chosen===question.answer&&<button type="button" className="primary" onClick={()=>apply('correct')}>칸 차지하고 다음 팀</button>}
     {question.kind==='choice'&&(chosen!==null&&chosen!==question.answer||expired&&chosen===null)&&<button type="button" className="primary" onClick={()=>apply('wrong')}>다음 팀으로</button>}
     {question.kind==='short'&&revealed&&<><button type="button" className="primary" onClick={()=>apply('correct')}>⭕ 맞았어요</button><button type="button" onClick={()=>apply('wrong')}>❌ 아쉬워요</button></>}
     {chosen===null&&!revealed&&!expired&&<button type="button" onClick={closeCell}>다른 칸 고르기</button>}
    </div>
   </>}
  </section>}

  {game.finished&&<section className="qb-panel" aria-label="결과">
   <h3>🏆 결과</h3>
   <ol className="qb-standings">{rows.map(r=><li key={r.team}><strong>{r.rank}위 {TEAM_MARKS[r.team]} {r.name}</strong> · {r.score}점 <small>(칸 {r.cells}×{CELL_POINTS} + 빙고 {r.lines}×{BINGO_POINTS}{r.bonus?` + 보너스 ${r.bonus}`:''})</small></li>)}</ol>
   <p className="sports-muted">점수보다 함께 이유를 말하고 움직인 과정을 칭찬해 주세요.</p>
   <div className="qb-row"><button type="button" className="primary" onClick={()=>start()}>🔁 같은 설정으로 다시</button><button type="button" onClick={()=>{setGame(null);setHistory([]);closeCell();}}>⚙️ 설정으로</button></div>
  </section>}

  <details className="qb-log"><summary>📜 진행 기록 ({game.log.length})</summary><ol>{[...game.log].reverse().map((l,i)=><li key={i}>{l}</li>)}</ol></details>
  {!game.finished&&<p className="sports-muted"><button type="button" className="qb-link" onClick={()=>{if(window.confirm('지금 게임을 지우고 설정 화면으로 갈까요?')){setGame(null);setHistory([]);closeCell();}}}>⚙️ 게임을 지우고 설정으로</button></p>}
 </div>;
}
