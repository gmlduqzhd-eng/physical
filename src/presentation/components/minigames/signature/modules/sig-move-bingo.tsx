/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {useEffect,useState,useSyncExternalStore} from 'react';
import type {SignatureCue} from '../../../../../domain/signatureGames';
import {TEAM_SHAPES,TeamShape} from '../../../fun';
import {TEAM_COLORS,TEAM_NAMES,acceptsPlayInput,frozen} from '../../../../../domain/funLoop';
import {BINGO_BONUS,boardFull,boardSizeFor,buildMoveBoard,cellHints,claimPoints,emptyOwners,linesForCells,newLinesIfClaimed,turnTeam,type MoveBingoCell} from '../../../../../domain/signature/sig-move-bingo';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';
import './sig-move-bingo.css';

/**
 * 신체 빙고 화면. 칸 주인 기록은 판(seed·연습/본판)마다 이 파일의 작은 저장소(메모리)에 둔다.
 * 점수는 ‘성공’을 누를 때 엔진의 score 명령으로만 준다(빙고 줄 보너스도 같은 명령에 더해서 준다).
 * 한 판 안에서 화면이 다시 그려져도 판이 이어지고, '한 판 더'·목록으로 나가면 그 판 기록을 지운다(dispose).
 * 새로고침하면 새 판(새 seed)으로 시작한다.
 */
interface BoardRecord {boardNo:number;owners:(number|null)[];turns:number;lines:number[];claims:number[];boardsDone:number}
const fresh=(size:number):BoardRecord=>({boardNo:0,owners:emptyOwners(size),turns:0,lines:[0,0,0,0],claims:[0,0,0,0],boardsDone:0});
const validCells=(n:number)=>n===9||n===16;
const records=new Map<string,BoardRecord>();
const listeners=new Set<()=>void>();
/** 판 크기는 팀 수로 정한다(2팀 3×3, 3~4팀 4×4). 크기가 다른 기록은 버리고 새로 만든다. */
function read(key:string,size:number):BoardRecord{
 const hit=records.get(key);if(hit&&hit.owners.length===size*size)return hit;
 const rec=fresh(size);records.set(key,rec);return rec;
}
function write(key:string,rec:BoardRecord){
 if(!validCells(rec.owners.length))return;
 records.set(key,rec);
 listeners.forEach(l=>l());
}
/**
 * 지금 차례에 고른 칸(판마다). 판 화면과 큰 신호 칸이 함께 읽는다(고른 칸의 동작을 큰 글씨로 띄우려고).
 * turn은 '단계:판 번호:차례 수'라서 차례가 넘어가면 저절로 지난 선택이 된다.
 */
interface BingoPick {turn:string;cell:number;reveal:boolean}
const picks=new Map<string,BingoPick>();
function setPick(key:string,pick:BingoPick|null){if(pick)picks.set(key,pick);else picks.delete(key);listeners.forEach(l=>l());}
/** 판이 끝나면 그 seed의 연습·본판 기록을 지운다. */
export function disposeBingo(seed:number){
 for(const key of [...records.keys()])if(key.startsWith(`${seed}:`))records.delete(key);
 for(const key of [...picks.keys()])if(key.startsWith(`${seed}:`))picks.delete(key);
}
export const bingoRecordCount=()=>records.size;
const isRecord=(v:unknown):v is BoardRecord=>{
 const r=v as BoardRecord;const nums=(a:unknown,n?:number)=>Array.isArray(a)&&(n===undefined||a.length===n)&&a.every(x=>typeof x==='number'&&Number.isFinite(x));
 return !!r&&typeof r==='object'&&Number.isInteger(r.boardNo)&&Number.isInteger(r.turns)&&Number.isInteger(r.boardsDone)
  &&Array.isArray(r.owners)&&validCells(r.owners.length)&&r.owners.every(o=>o===null||(Number.isInteger(o)&&o>=0&&o<4))&&nums(r.lines,4)&&nums(r.claims,4);
};
/** 새로고침 이어 하기: 이 판(seed)의 연습·본판 기록을 꺼내고 되살린다. */
export function snapshotBingo(seed:number):Record<string,BoardRecord>{return Object.fromEntries([...records.entries()].filter(([k])=>k.startsWith(`${seed}:`)));}
export function restoreBingo(seed:number,data:unknown){
 if(!data||typeof data!=='object')return;
 for(const [key,rec] of Object.entries(data as Record<string,unknown>))if(key.startsWith(`${seed}:`)&&isRecord(rec))records.set(key,rec);
 listeners.forEach(l=>l());
}
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};};
const boardKey=(seed:number,phase:string)=>`${seed}:${phase==='tutorial'?'practice':'main'}`;
function useBoard(seed:number,phase:string,size:number):BoardRecord{
 const key=boardKey(seed,phase);
 return useSyncExternalStore(subscribe,()=>read(key,size),()=>read(key,size));
}
function usePick(seed:number,phase:string):BingoPick|null{
 const key=boardKey(seed,phase);
 return useSyncExternalStore(subscribe,()=>picks.get(key)??null,()=>picks.get(key)??null);
}
const turnIdOf=(phase:string,rec:BoardRecord)=>`${phase}:${rec.boardNo}:${rec.turns}`;
/** 차지: 주인을 적고, 새 빙고 줄을 세고, 판이 다 차면 새 판으로 넘긴다. */
function claim(seed:number,phase:string,cell:number,team:number,size:number){
 const key=boardKey(seed,phase),rec=read(key,size);
 if(rec.owners[cell]!==null)return;
 const gained=newLinesIfClaimed(rec.owners,cell,team);
 const owners=rec.owners.map((v,i)=>i===cell?team:v);
 const lines=rec.lines.map((v,i)=>i===team?v+gained:v),claims=rec.claims.map((v,i)=>i===team?v+1:v);
 const full=boardFull(owners);
 write(key,{...rec,owners:full?emptyOwners(size):owners,boardNo:full?rec.boardNo+1:rec.boardNo,boardsDone:full?rec.boardsDone+1:rec.boardsDone,turns:rec.turns+1,lines,claims});
}
const pass=(seed:number,phase:string,size:number)=>{const key=boardKey(seed,phase),rec=read(key,size);setPick(key,null);write(key,{...rec,turns:rec.turns+1});};

const teamName=(t:number)=>TEAM_NAMES[t]??`${t+1}팀`;
/**
 * 큰 신호 칸: 칸을 고르면 그 칸의 동작(또는 체육 지식 문제)을 팀 색과 함께 크게 띄운다.
 * 칸을 고르기 전에는 null(게임 신호 '칸을 골라 동작을 해내요!'가 그대로 보인다).
 */
function useBingoSignal({state,seated}:SignatureModuleProps):SignatureCue|null{
 const phase=state.phase,size=boardSizeFor(state.teams);
 const rec=useBoard(state.seed,phase,size);
 const pick=usePick(state.seed,phase);
 if(phase!=='tutorial'&&phase!=='play'&&phase!=='climax')return null;
 // 얼음 동안에는 '🧊 얼음!' 큰 신호를 덮지 않는다("멈춰요"와 "동작해요"가 함께 보이지 않게).
 if(frozen(state))return null;
 if(!pick||pick.turn!==turnIdOf(phase,rec))return null;
 const board=buildMoveBoard(state.seed,phase==='tutorial'?999:rec.boardNo,size);
 const cell=board[pick.cell];if(!cell)return null;
 const team=turnTeam(rec.turns,state.teams);
 const who=teamName(team);
 const willBingo=newLinesIfClaimed(rec.owners,cell.index,team)>0;
 if(cell.kind==='quiz')return {kicker:`${who} 도전! · 체육 지식`,text:cell.prompt??'체육 지식 문제',
  sub:pick.reveal?`정답: ${cell.answer}`:(cell.choices??[]).map((c,i)=>`${i+1} ${c}`).join('   ·   '),bigSub:true,
  icon:'❓',accent:TEAM_COLORS[team],scorable:false,tone:pick.reveal?'go':undefined};
 const label=(seated?cell.seated:undefined)??cell.label;
 return {kicker:`${who} 도전!${willBingo?' 🎯 이 칸이면 빙고!':''}`,text:`${label}!`,sub:'팀이 모두 해내면 선생님이 ‘✔ 성공’을 눌러요',icon:'🎯',accent:TEAM_COLORS[team],pose:cell.pose,move:label};
}
const lineCells=(owners:readonly (number|null)[])=>new Set(linesForCells(owners.length).filter(l=>owners[l[0]]!==null&&l.every(i=>owners[i]===owners[l[0]])).flat());

function BingoPanel({state,seated,dispatch}:SignatureModuleProps){
 const phase=state.phase,size=boardSizeFor(state.teams);
 const rec=useBoard(state.seed,phase,size);
 const board=buildMoveBoard(state.seed,phase==='tutorial'?999:rec.boardNo,size);
 const team=turnTeam(rec.turns,state.teams);
 const pick=usePick(state.seed,phase);
 const key=boardKey(state.seed,phase);
 const turnId=turnIdOf(phase,rec);
 const selected=pick&&pick.turn===turnId?pick:null;
 const cell:MoveBingoCell|undefined=selected?board[selected.cell]:undefined;
 const [toast,setToast]=useState('');
 useEffect(()=>{if(!toast)return;const t=window.setTimeout(()=>setToast(''),2500);return()=>window.clearTimeout(t);},[toast]);
 if(phase!=='tutorial'&&phase!=='play'&&phase!=='climax')return null;
 const done=lineCells(rec.owners);
 // 힌트: 🎯 이 칸이면 우리 팀 빙고 · 🛡️ 상대 팀이 이 칸이면 빙고(막을 칸)
 const hints=cellHints(rec.owners,team,state.teams);
 const live=acceptsPlayInput(state);
 const success=()=>{
  // 일시정지 중에는 점수를 받지 않으므로 칸도 차지하지 않는다(점수와 칸이 어긋나지 않게).
  if(!cell||!live)return;
  const points=claimPoints(rec.owners,cell.index,team),lines=newLinesIfClaimed(rec.owners,cell.index,team);
  // tag:'cell' — 빙고 점수는 칸 차지로만 받는다(점수판 ±·키보드·리모컨 점수는 받지 않음).
  dispatch({type:'score',team,delta:points,tag:'cell'});
  claim(state.seed,phase,cell.index,team,size);
  const full=boardFull(rec.owners.map((v,i)=>i===cell.index?team:v));
  setToast(lines?`🎉 ${teamName(team)} 빙고! +${BINGO_BONUS*lines} 보너스`:full?'판이 다 찼어요! 새 판으로 이어서 해요':`${teamName(team)}이 칸을 차지했어요`);
  setPick(key,null);
 };
 const willBingo=cell?newLinesIfClaimed(rec.owners,cell.index,team):0;
 return <div className="sig-bingo" data-practice={phase==='tutorial'||undefined}>
  <div className="sig-bingo-board" data-size={size} role="grid" aria-label={`신체 빙고 판 ${size}×${size}${phase==='tutorial'?' (연습)':` · ${rec.boardNo+1}번째 판`}`}>
   {Array.from({length:size},(_,r)=>r).map(r=><div role="row" key={r} className="sig-bingo-row" style={{gridTemplateColumns:`repeat(${size},minmax(0,1fr))`}}>{board.slice(r*size,r*size+size).map(c=>{
    const owner=rec.owners[c.index];
    return <div role="gridcell" key={c.index}>
     <button type="button" className="sig-bingo-cell" data-kind={c.kind} data-owner={owner??undefined} data-line={done.has(c.index)||undefined} data-hint={hints[c.index]??undefined} aria-pressed={selected?.cell===c.index}
      disabled={owner!==null} style={owner!==null?{background:TEAM_COLORS[owner]}:undefined}
      aria-label={`${c.index+1}번 칸 · ${c.kind==='quiz'?'체육 지식 문제':(seated?c.seated:c.label)}${owner!==null?` · ${teamName(owner)} 차지`:hints[c.index]==='win'?' · 차지하면 빙고':hints[c.index]==='block'?' · 상대 팀 빙고를 막는 칸':''}`}
      onClick={()=>setPick(key,{turn:turnId,cell:c.index,reveal:false})}>
      {owner!==null?<span className="sig-bingo-owner"><i aria-hidden="true">{TEAM_SHAPES[owner]} </i>{teamName(owner)}</span>:<span>{c.kind==='quiz'?<><i className="sig-bingo-quiz-badge" aria-hidden="true">❓</i>체육 지식</>:(seated?c.seated:c.label)}</span>}
      {owner===null&&hints[c.index]&&<em className="sig-bingo-hint" aria-hidden="true">{hints[c.index]==='win'?'🎯 빙고!':'🛡️ 막기'}</em>}
     </button>
    </div>;
   })}</div>)}
  </div>
  <div className="sig-bingo-side">
   <p className="sig-bingo-turn" style={{borderColor:TEAM_COLORS[team]}}><TeamShape team={team}/><b>{teamName(team)} 차례</b>{state.event?.kind==='reverse'?' · 상대 팀이 칸을 골라 줘요':''}</p>
   {!cell?<p className="sig-bingo-help">{phase==='tutorial'?'연습 판: 칸 하나를 눌러 보세요.':'팀이 고른 칸을 눌러요.'}</p>
    :cell.kind==='move'?<div className="sig-bingo-task"><span>큰 화면의 동작을 팀이 모두 해내면 ‘성공’</span></div>
    :<div className="sig-bingo-task" data-kind="quiz">
     {/* 문제와 보기는 큰 신호 칸에 크게 나온다. 여기서는 정답 확인만. */}
     <span>팀이 손을 들어 큰 화면의 보기 하나를 골라요{selected?.reveal?` · 정답: ${cell.answer}`:''}</span>
     <button type="button" onClick={()=>setPick(key,{...selected!,reveal:true})} disabled={selected?.reveal}>👀 정답 보기</button>
    </div>}
   <div className="sig-bingo-actions">
    <button type="button" className="sig-bingo-success" disabled={!cell||!live} onClick={success}>✔ 성공{cell?` +${1+BINGO_BONUS*willBingo}${willBingo?' 빙고!':''}`:''}</button>
    <button type="button" onClick={()=>{pass(state.seed,phase,size);setToast(`${teamName(team)} 차례를 넘겼어요`);}}>↷ 넘기기</button>
   </div>
   <p className="sig-bingo-toast" role="status">{toast}</p>
  </div>
 </div>;
}

function BingoResult({state}:SignatureModuleProps){
 const rec=useBoard(state.seed,'play',boardSizeFor(state.teams));
 const teams=Array.from({length:state.teams},(_,t)=>t);
 return <p className="sig-bingo-result">{teams.map(t=>`${teamName(t)} 칸 ${rec.claims[t]??0}개 · 빙고 ${rec.lines[t]??0}줄`).join(' / ')}{rec.boardsDone?` · 다 채운 판 ${rec.boardsDone}개`:''}</p>;
}

/** 지금 칸을 고를 차례인 팀. */
function useBingoTurnTeam({state}:SignatureModuleProps):number|null{
 const phase=state.phase,rec=useBoard(state.seed,phase,boardSizeFor(state.teams));
 if(state.teams<2||(phase!=='tutorial'&&phase!=='play'&&phase!=='climax'))return null;
 return turnTeam(rec.turns,state.teams);
}
const moveBingoModule:SignatureModule={Panel:BingoPanel,useSignalCue:useBingoSignal,useTurnTeam:useBingoTurnTeam,Result:BingoResult,hideFigure:true,wide:true,scoreButtons:false,dispose:disposeBingo,snapshot:snapshotBingo,restore:restoreBingo};
export default moveBingoModule;
