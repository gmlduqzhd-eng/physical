import {useEffect,useRef,useState,type ReactNode} from 'react';
import {TEAM_COLORS,TEAM_NAMES,type ResultSummary} from '../../../domain/funLoop';

const MEDAL=['🥇','🥈','🥉','🏅'];
/**
 * 결과 발표: 우승 팀, 배운 개념, 가장 잘한 동작, 돌아보기 질문, 다음 도전.
 * 기록은 선생님이 버튼 하나로 확인해 남긴다(참여를 미리 체크해 두지 않는다).
 */
export function ResultCeremony({summary,teams,scoreLabel,mvpMove,mvpLabel='가장 잘한 동작',endedBy,extra,afterRecord,onRecord,onReplay,onExit,recorded}:{
 summary:ResultSummary;teams:number;scoreLabel:string;mvpMove?:string;mvpLabel?:string;endedBy:'time'|'goal'|'teacher'|null;extra?:ReactNode;
 /** 선생님 반응(👍/👎)·반 원정 지도 칸. 결과 화면이 열리면 바로 보인다(기록 전에도 반응을 남길 수 있다). */ afterRecord?:ReactNode;
 onRecord:(participation:'performed'|'rested')=>void;onReplay:()=>void;onExit:()=>void;recorded:boolean;
}){
 const [askRest,setAskRest]=useState(false);
 // 결과 화면이 열리면 제목으로 초점을 옮긴다(키보드·화면 낭독기가 결과부터 읽게).
 const titleRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[]);
 return <section className="fun-result" aria-labelledby="fun-result-title" data-practice={summary.practiceOnly||undefined}>
  <div className="fun-result-main">
  <p className="fun-eyebrow">결과 발표</p>
  <h2 id="fun-result-title" ref={titleRef} tabIndex={-1}>{summary.headline}</h2>
  {summary.practiceOnly&&<p className="fun-note">연습 판 점수는 결과에 넣지 않아요. ‘한 판 더’로 본게임까지 해 보세요.</p>}
  {teams>1&&!summary.practiceOnly&&<ol className="fun-podium">{summary.ranking.map(r=><li key={r.team} style={{'--team':TEAM_COLORS[r.team]} as React.CSSProperties} data-rank={r.rank}>
   <span aria-hidden="true">{MEDAL[r.rank-1]??'🏅'}</span><b>{TEAM_NAMES[r.team]}</b><span>{scoreLabel==='점수'?`${r.score}점`:`${scoreLabel} ${r.score}`}</span>
  </li>)}</ol>}
  {extra}
  </div>
  <div className="fun-result-side">
  <ul className="fun-takeaways">
   <li><b>배운 것</b>{summary.conceptLine}</li>
   {mvpMove&&!summary.practiceOnly&&<li><b>{mvpLabel}</b>{mvpMove}</li>}
   <li><b>이야기 나누기</b>{summary.question}</li>
   <li><b>다음 도전</b>{summary.nextChallenge}</li>
  </ul>
  {endedBy==='teacher'&&!summary.practiceOnly&&<p className="fun-note">선생님이 중간에 끝냈어요. 기록은 ‘일부 완료’로 남아요.</p>}
  {/* 연습만 한 판은 기록하지 않으므로 반응 칸도 두지 않는다(기록 없는 판의 반응이 쌓이지 않게). */}
  {!summary.practiceOnly&&afterRecord}
  <div className="fun-result-actions">
   {summary.practiceOnly?<p className="fun-note" role="status">연습 판은 기록하지 않아요. 본게임까지 하면 기록할 수 있어요.</p>:!recorded?<>
    <button type="button" className="fun-primary" onClick={()=>onRecord('performed')}>✅ 모두 참여했어요 · 기록하기</button>
    {!askRest?<button type="button" className="fun-secondary" onClick={()=>setAskRest(true)}>쉬면서 지켜본 친구가 많았어요</button>
     :<button type="button" className="fun-secondary" onClick={()=>onRecord('rested')}>‘쉬면서 함께함’으로 기록하기</button>}
   </>:<p className="fun-note" role="status">기록했어요. 위 칸에서 오늘 놀이 반응(👍/👎)을 남길 수 있어요. 한 판 더 하거나 목록으로 돌아가요.</p>}
   <button type="button" className="fun-secondary" onClick={onReplay}>🔁 한 판 더</button>
   <button type="button" className="fun-link" onClick={onExit}>활동 목록으로</button>
  </div>
  </div>
 </section>;
}
