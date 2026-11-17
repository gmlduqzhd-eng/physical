/* eslint-disable react-refresh/only-export-components -- 모듈 파일은 화면 부품 묶음(SignatureModule)을 내보낸다. */
import {useEffect,useState} from 'react';
import {TEAM_COLORS,TEAM_NAMES} from '../../../../../domain/funLoop';
import {REACTIONS,addReaction,bestGroups,emptyReactions,reactionTarget,scenesFor,stageSlot,type Reaction,type ReactionCounts} from '../../../../../domain/signature/sig-stage-show';
import type {SignatureModule,SignatureModuleProps} from '../moduleTypes';
import './sig-stage-show.css';

/**
 * 관객 반응 집계는 엔진 상태(팀 점수)에 없는 '반응 종류별 수'라서 판마다(seed) 따로 모은다.
 * 진행 판(Panel)이 쓰고 결과 칸(Result)이 읽는다. 연습 판 반응은 세지 않는다.
 */
const store=new Map<number,ReactionCounts>();
const countsOf=(seed:number,teams:number)=>{const c=store.get(seed);return c&&c.length===teams?c:emptyReactions(teams);};
const teamName=(teams:number,g:number)=>teams===1?'우리 반':TEAM_NAMES[g];

function StagePanel({state,dispatch}:SignatureModuleProps){
 const [counts,setCounts]=useState<ReactionCounts>(()=>countsOf(state.seed,state.teams));
 const [practice,setPractice]=useState(0);
 const phase=state.phase;
 const slot=phase==='play'?stageSlot(state.cueIndex,state.teams):null;
 // 모든 모둠이 발표하면 기다리지 않고 커튼콜(마지막 승부)로 넘어간다.
 useEffect(()=>{if(slot?.kind==='done'&&!state.paused)dispatch({type:'next'});},[slot?.kind,state.paused,dispatch]);
 if(phase!=='tutorial'&&phase!=='play'&&phase!=='climax')return null;
 const scenes=scenesFor(state.seed,state.teams);
 const target=reactionTarget({phase,index:state.cueIndex,teams:state.teams});
 const react=(reaction:Reaction)=>{
  if(target===null)return;
  if(phase==='tutorial'){setPractice(n=>n+1);dispatch({type:'score',team:target,delta:1});return;}
  const r=addReaction(counts,target,reaction);if(!r)return;
  store.set(state.seed,r.counts);setCounts(r.counts);dispatch(r.command);
 };
 const prep=slot?.kind==='prep'||phase==='tutorial';
 return <div className="sig-stage" data-mode={prep?'prep':'show'}>
  {prep?<ol className="sig-stage-cards" aria-label="모둠별 장면 카드">
   {scenes.map((sc,g)=><li key={sc.id} style={{'--team':TEAM_COLORS[g]} as React.CSSProperties}>
    <span className="sig-stage-team">{teamName(state.teams,g)}</span>
    <span className="sig-stage-emoji" aria-hidden="true">{phase==='tutorial'?'🎴':sc.emoji}</span>
    <b>{phase==='tutorial'?'장면 카드는 본게임에서 받아요':sc.title}</b>
    {phase!=='tutorial'&&<small>{sc.hint}</small>}
   </li>)}
  </ol>:<div className="sig-stage-now" style={target!==null?{'--team':TEAM_COLORS[target]} as React.CSSProperties:undefined}>
   {target!==null?<><span className="sig-stage-emoji" aria-hidden="true">{scenes[target].emoji}</span><div><span className="sig-stage-team">{teamName(state.teams,target)} 무대</span><b>{scenes[target].title}</b></div></>:<b>🎬 다 같이 무대 인사를 준비해요</b>}
  </div>}
  <div className="sig-stage-react" role="group" aria-label="관객 반응 버튼">
   {REACTIONS.map((r,k)=><button key={r.id} type="button" disabled={target===null} onClick={()=>react(r.id)} aria-label={`${r.label}${target!==null?` · ${teamName(state.teams,target)}에게`:''}`}>
    <span aria-hidden="true">{r.emoji}</span>{r.label}{phase!=='tutorial'&&target!==null&&<em>{counts[target]?.[k]??0}</em>}
   </button>)}
   {phase==='tutorial'&&<p className="sig-stage-practice">연습으로 누른 응원 {practice}번 · 본게임에서 0부터 다시 세요</p>}
   {prep&&phase!=='tutorial'&&<p className="sig-stage-practice">준비 시간에는 응원 버튼이 쉬어요. 발표가 시작되면 눌러요</p>}
  </div>
 </div>;
}

function StageResult({state}:SignatureModuleProps){
 const counts=countsOf(state.seed,state.teams),scenes=scenesFor(state.seed,state.teams),best=bestGroups(counts);
 return <div className="sig-stage-result">
  {best.length>0?<p className="sig-stage-best">🏆 가장 많은 응원: {best.map(g=>`${teamName(state.teams,g)} 「${scenes[g].emoji} ${scenes[g].title}」`).join(' · ')}</p>:<p className="sig-stage-best">응원 버튼 기록이 없어요. 다음에는 발표 때 관객 반응을 눌러 주세요.</p>}
  <table><caption>모둠별 장면과 관객 반응</caption>
   <thead><tr><th scope="col">모둠</th><th scope="col">장면</th>{REACTIONS.map(r=><th key={r.id} scope="col"><span aria-hidden="true">{r.emoji}</span> {r.label}</th>)}</tr></thead>
   <tbody>{scenes.map((sc,g)=><tr key={sc.id} data-best={best.includes(g)||undefined}><th scope="row">{teamName(state.teams,g)}</th><td>{sc.emoji} {sc.title}</td>{REACTIONS.map((r,k)=><td key={r.id}>{counts[g]?.[k]??0}</td>)}</tr>)}</tbody>
  </table>
 </div>;
}
const stageShowModule:SignatureModule={Panel:StagePanel,Result:StageResult,hideFigure:true};
export default stageShowModule;
