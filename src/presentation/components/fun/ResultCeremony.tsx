import {useState,type ReactNode} from 'react';
import {TEAM_COLORS,TEAM_NAMES,type ResultSummary} from '../../../domain/funLoop';

const MEDAL=['🥇','🥈','🥉','🏅'];
/**
 * 결과 발표: 우승 팀, 배운 개념, MVP 동작, 돌아보기 질문, 다음 도전.
 * 기록은 선생님이 버튼 하나로 확인해 남긴다(참여를 미리 체크해 두지 않는다).
 */
export function ResultCeremony({summary,teams,scoreLabel,mvpMove,endedBy,extra,onRecord,onReplay,onExit,recorded}:{
 summary:ResultSummary;teams:number;scoreLabel:string;mvpMove?:string;endedBy:'time'|'goal'|'teacher'|null;extra?:ReactNode;
 onRecord:(participation:'performed'|'rested')=>void;onReplay:()=>void;onExit:()=>void;recorded:boolean;
}){
 const [askRest,setAskRest]=useState(false);
 return <section className="fun-result" aria-labelledby="fun-result-title">
  <p className="fun-eyebrow">결과 발표</p>
  <h2 id="fun-result-title" tabIndex={-1}>{summary.headline}</h2>
  {teams>1&&<ol className="fun-podium">{summary.ranking.map(r=><li key={r.team} style={{'--team':TEAM_COLORS[r.team]} as React.CSSProperties} data-rank={r.rank}>
   <span aria-hidden="true">{MEDAL[r.rank-1]??'🏅'}</span><b>{TEAM_NAMES[r.team]}</b><span>{scoreLabel==='점수'?`${r.score}점`:`${scoreLabel} ${r.score}`}</span>
  </li>)}</ol>}
  {extra}
  <ul className="fun-takeaways">
   <li><b>배운 것</b>{summary.conceptLine}</li>
   {mvpMove&&<li><b>MVP 동작</b>가장 많이 성공한 동작: {mvpMove}</li>}
   <li><b>이야기 나누기</b>{summary.question}</li>
   <li><b>다음 도전</b>{summary.nextChallenge}</li>
  </ul>
  {endedBy==='teacher'&&<p className="fun-note">선생님이 중간에 끝냈어요. 기록은 ‘일부 완료’로 남아요.</p>}
  <div className="fun-result-actions">
   {!recorded?<>
    <button type="button" className="fun-primary" onClick={()=>onRecord('performed')}>✅ 모두 참여했어요 · 기록하고 마치기</button>
    {!askRest?<button type="button" className="fun-secondary" onClick={()=>setAskRest(true)}>쉬면서 지켜본 친구가 많았어요</button>
     :<button type="button" className="fun-secondary" onClick={()=>onRecord('rested')}>‘쉬면서 함께함’으로 기록하기</button>}
   </>:<p className="fun-note" role="status">기록했어요. 다시 하거나 목록으로 돌아가요.</p>}
   <button type="button" className="fun-secondary" onClick={onReplay}>🔁 한 판 더</button>
   <button type="button" className="fun-link" onClick={onExit}>활동 목록으로</button>
  </div>
 </section>;
}
