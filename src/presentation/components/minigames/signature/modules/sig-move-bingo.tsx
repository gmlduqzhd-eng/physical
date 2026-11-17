/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {useEffect,useState,useSyncExternalStore} from 'react';
import {TEAM_COLORS,TEAM_NAMES,acceptsPlayInput} from '../../../../../domain/funLoop';
import {BINGO_BONUS,BOARD_CELLS,boardFull,buildMoveBoard,cellHints,claimPoints,emptyOwners,LINES_3X3,newLinesIfClaimed,turnTeam,type MoveBingoCell} from '../../../../../domain/signature/sig-move-bingo';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';
import './sig-move-bingo.css';

/**
 * 몸 빙고 화면. 칸 주인 기록은 판(seed·연습/본판)마다 이 파일의 작은 저장소(메모리)에 둔다.
 * 점수는 ‘성공’을 누를 때 엔진의 score 명령으로만 준다(빙고 줄 보너스도 같은 명령에 더해서 준다).
 * 한 판 안에서 화면이 다시 그려져도 판이 이어지고, '한 판 더'·목록으로 나가면 그 판 기록을 지운다(dispose).
 * 새로고침하면 새 판(새 seed)으로 시작한다.
 */
interface BoardRecord {boardNo:number;owners:(number|null)[];turns:number;lines:number[];claims:number[];boardsDone:number}
const fresh=():BoardRecord=>({boardNo:0,owners:emptyOwners(),turns:0,lines:[0,0,0,0],claims:[0,0,0,0],boardsDone:0});
const records=new Map<string,BoardRecord>();
const listeners=new Set<()=>void>();
function read(key:string):BoardRecord{
 const hit=records.get(key);if(hit)return hit;
 const rec=fresh();records.set(key,rec);return rec;
}
function write(key:string,rec:BoardRecord){
 if(rec.owners.length!==BOARD_CELLS)return;
 records.set(key,rec);
 listeners.forEach(l=>l());
}
/** 판이 끝나면 그 seed의 연습·본판 기록을 지운다. */
export function disposeBingo(seed:number){for(const key of [...records.keys()])if(key.startsWith(`${seed}:`))records.delete(key);}
export const bingoRecordCount=()=>records.size;
const isRecord=(v:unknown):v is BoardRecord=>{
 const r=v as BoardRecord;const nums=(a:unknown,n?:number)=>Array.isArray(a)&&(n===undefined||a.length===n)&&a.every(x=>typeof x==='number'&&Number.isFinite(x));
 return !!r&&typeof r==='object'&&Number.isInteger(r.boardNo)&&Number.isInteger(r.turns)&&Number.isInteger(r.boardsDone)
  &&Array.isArray(r.owners)&&r.owners.length===BOARD_CELLS&&r.owners.every(o=>o===null||(Number.isInteger(o)&&o>=0&&o<4))&&nums(r.lines,4)&&nums(r.claims,4);
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
function useBoard(seed:number,phase:string):BoardRecord{
 const key=boardKey(seed,phase);
 return useSyncExternalStore(subscribe,()=>read(key),()=>read(key));
}
/** 차지: 주인을 적고, 새 빙고 줄을 세고, 판이 다 차면 새 판으로 넘긴다. */
function claim(seed:number,phase:string,cell:number,team:number){
 const key=boardKey(seed,phase),rec=read(key);
 if(rec.owners[cell]!==null)return;
 const gained=newLinesIfClaimed(rec.owners,cell,team);
 const owners=rec.owners.map((v,i)=>i===cell?team:v);
 const lines=rec.lines.map((v,i)=>i===team?v+gained:v),claims=rec.claims.map((v,i)=>i===team?v+1:v);
 const full=boardFull(owners);
 write(key,{...rec,owners:full?emptyOwners():owners,boardNo:full?rec.boardNo+1:rec.boardNo,boardsDone:full?rec.boardsDone+1:rec.boardsDone,turns:rec.turns+1,lines,claims});
}
const pass=(seed:number,phase:string)=>{const key=boardKey(seed,phase),rec=read(key);write(key,{...rec,turns:rec.turns+1});};

const teamName=(t:number)=>TEAM_NAMES[t]??`${t+1}팀`;
const lineCells=(owners:readonly (number|null)[])=>new Set(LINES_3X3.filter(l=>owners[l[0]]!==null&&l.every(i=>owners[i]===owners[l[0]])).flat());

function BingoPanel({state,seated,dispatch}:SignatureModuleProps){
 const phase=state.phase;
 const rec=useBoard(state.seed,phase);
 const board=buildMoveBoard(state.seed,phase==='tutorial'?999:rec.boardNo);
 const team=turnTeam(rec.turns,state.teams);
 const [pick,setPick]=useState<{turn:string;cell:number;reveal:boolean}|null>(null);
 const turnId=`${phase}:${rec.boardNo}:${rec.turns}`;
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
  claim(state.seed,phase,cell.index,team);
  const full=boardFull(rec.owners.map((v,i)=>i===cell.index?team:v));
  setToast(lines?`🎉 ${teamName(team)} 빙고! +${BINGO_BONUS*lines} 보너스`:full?'판이 다 찼어요! 새 판으로 이어서 해요':`${teamName(team)}이 칸을 차지했어요`);
  setPick(null);
 };
 const willBingo=cell?newLinesIfClaimed(rec.owners,cell.index,team):0;
 return <div className="sig-bingo" data-practice={phase==='tutorial'||undefined}>
  <div className="sig-bingo-board" role="grid" aria-label={`몸 빙고 판${phase==='tutorial'?' (연습)':` · ${rec.boardNo+1}번째 판`}`}>
   {[0,1,2].map(r=><div role="row" key={r} className="sig-bingo-row">{board.slice(r*3,r*3+3).map(c=>{
    const owner=rec.owners[c.index];
    return <div role="gridcell" key={c.index}>
     <button type="button" className="sig-bingo-cell" data-kind={c.kind} data-owner={owner??undefined} data-line={done.has(c.index)||undefined} data-hint={hints[c.index]??undefined} aria-pressed={selected?.cell===c.index}
      disabled={owner!==null} style={owner!==null?{background:TEAM_COLORS[owner]}:undefined}
      aria-label={`${c.index+1}번 칸 · ${c.kind==='quiz'?'체육 지식 문제':(seated?c.seated:c.label)}${owner!==null?` · ${teamName(owner)} 차지`:hints[c.index]==='win'?' · 차지하면 빙고':hints[c.index]==='block'?' · 상대 팀 빙고를 막는 칸':''}`}
      onClick={()=>setPick({turn:turnId,cell:c.index,reveal:false})}>
      {owner!==null?<span className="sig-bingo-owner">{teamName(owner)}</span>:<span>{c.kind==='quiz'?'❓ 체육 지식':(seated?c.seated:c.label)}</span>}
      {owner===null&&hints[c.index]&&<em className="sig-bingo-hint" aria-hidden="true">{hints[c.index]==='win'?'🎯 빙고!':'🛡️ 막기'}</em>}
     </button>
    </div>;
   })}</div>)}
  </div>
  <div className="sig-bingo-side">
   <p className="sig-bingo-turn" style={{borderColor:TEAM_COLORS[team]}}><span className="sig-bingo-dot" style={{background:TEAM_COLORS[team]}} aria-hidden="true"/><b>{teamName(team)} 차례</b>{state.event?.kind==='reverse'?' · 상대 팀이 칸을 골라 줘요':''}</p>
   {!cell?<p className="sig-bingo-help">{phase==='tutorial'?'연습 판: 칸 하나를 눌러 보세요.':'팀이 고른 칸을 눌러요.'}</p>
    :cell.kind==='move'?<div className="sig-bingo-task"><strong>{seated?cell.seated:cell.label}!</strong><span>팀이 모두 해내면 ‘성공’</span></div>
    :<div className="sig-bingo-task" data-kind="quiz"><strong>{cell.prompt}</strong>
     <ol className="sig-bingo-choices">{cell.choices?.map((ch,i)=><li key={ch} data-answer={selected?.reveal&&ch===cell.answer||undefined}><b>{i+1}</b> {ch}</li>)}</ol>
     <span>팀이 손을 들어 하나를 골라요{selected?.reveal?` · 정답: ${cell.answer}`:''}</span>
     <button type="button" onClick={()=>setPick({...selected!,reveal:true})} disabled={selected?.reveal}>👀 정답 보기</button>
    </div>}
   <div className="sig-bingo-actions">
    <button type="button" className="sig-bingo-success" disabled={!cell||!live} onClick={success}>✔ 성공{cell?` +${1+BINGO_BONUS*willBingo}${willBingo?' 빙고!':''}`:''}</button>
    <button type="button" onClick={()=>{pass(state.seed,phase);setPick(null);setToast(`${teamName(team)} 차례를 넘겼어요`);}}>↷ 넘기기</button>
   </div>
   <p className="sig-bingo-toast" role="status">{toast}</p>
  </div>
 </div>;
}

function BingoResult({state}:SignatureModuleProps){
 const rec=useBoard(state.seed,'play');
 const teams=Array.from({length:state.teams},(_,t)=>t);
 return <p className="sig-bingo-result">{teams.map(t=>`${teamName(t)} 칸 ${rec.claims[t]??0}개 · 빙고 ${rec.lines[t]??0}줄`).join(' / ')}{rec.boardsDone?` · 다 채운 판 ${rec.boardsDone}개`:''}</p>;
}

const moveBingoModule:SignatureModule={Panel:BingoPanel,Result:BingoResult,hideFigure:true,wide:true,scoreButtons:false,dispose:disposeBingo,snapshot:snapshotBingo,restore:restoreBingo};
export default moveBingoModule;
