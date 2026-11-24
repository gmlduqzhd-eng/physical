import {useEffect,useMemo,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ExportMenu} from './components/ExportMenu';
import {clearProgress,progressSaveFailed,useClassProgress} from '../application/classProgressStore';
import {REASONS,REASON_EXPORT_HEADERS,REASON_HINTS,MIN_REASON_COUNT,archiveCandidates,classBadges,featuredCandidates,mapView,reactionRows,reasonExportRows,reasonRows,shareSummary,topProblems,weekCompare,SUGGESTION_RULES,type ReactionRow} from '../domain/classProgress';
import {GAMES} from '../domain/gamesData';
import {isFeatured} from '../domain/featuredGames';
import type {ExportTable} from '../application/documentExport';
import {ClassSwitcher} from './components/ClassSwitcher';
import {useClassRoster} from '../application/classRosterStore';
import {currentClass} from '../domain/classRoster';
import './ClassProgressPage.css';

const NAME=new Map(GAMES.map(g=>[g.type,`${g.emoji??''} ${g.name}`.trim()]));
const nameOf=(id:string)=>NAME.get(id)??id;
const pct=(r:ReactionRow)=>r.ratio===null?'반응 없음':`${Math.round(r.ratio*100)}%`;
const today=()=>new Date().toLocaleDateString('ko-KR');
/** 표 한 칸에 보여 줄 메모 수(나머지는 '외 N개'). */
const NOTES_SHOWN=3;

/** 바로 복사가 안 될 때 보여 주는 요약 글 칸. 띄우자마자 전체 선택해 둔다. */
function SummaryFallback({text}:{text:string}){
 const ref=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;el.focus();el.select();},[text]);
 return <label className="cp-share-fallback">공유용 요약 <small>(길게 눌러 복사해요)</small>
  <textarea ref={ref} readOnly value={text} rows={Math.min(16,text.split('\n').length+1)} onFocus={e=>e.currentTarget.select()}/>
 </label>;
}

/** 선생님용: 우리 반 반응(👍/👎)과 반 원정 지도. 기록은 이 기기에만 있다. */
export function ClassProgressPage(){
 const progress=useClassProgress();
 const className=currentClass(useClassRoster()).name;
 const [params,setParams]=useSearchParams();
 const tabParam=params.get('tab');
 const tab=tabParam==='map'?'map':tabParam==='reasons'?'reasons':'reactions';
 const [copied,setCopied]=useState('');
 // 복사가 막힌 기기(학교 PC·일부 태블릿): 요약 글을 칸에 보여 주고 전체 선택해 두어 손으로 복사하게 한다.
 const [fallbackOpen,setFallbackOpen]=useState(false);
 const [confirm,setConfirm]=useState(false);
 const rows=useMemo(()=>reactionRows(progress),[progress]);
 const archive=archiveCandidates(rows,isFeatured),promote=featuredCandidates(rows,isFeatured);
 const map=mapView(progress),week=weekCompare(progress,Date.now()),badges=classBadges(progress);
 const reasons=useMemo(()=>reasonRows(progress),[progress]),problems=useMemo(()=>topProblems(progress),[progress]);
 const reasonTable=():ExportTable=>({title:'우리 반 반응 이유',fileBase:'우리반반응이유',meta:[['반',className],['저장한 때',today()],['기록 위치','이 기기(브라우저)'],['이유를 남긴 판',`${progress.reasons.length}판`]],headers:REASON_EXPORT_HEADERS,rows:reasonExportRows(progress,nameOf)});
 const copySummary=async()=>{
  const text=shareSummary(progress,nameOf);
  try{
   if(!navigator.clipboard?.writeText)throw new Error('no clipboard');
   await navigator.clipboard.writeText(text);setFallbackOpen(false);setCopied('요약을 복사했어요. 메신저에 붙여 넣으면 돼요.');
  }catch{setFallbackOpen(true);setCopied('이 기기에서는 바로 복사할 수 없어요. 아래 글을 길게 눌러(또는 Ctrl+C로) 복사해요.');}
 };
 const table=():ExportTable=>({title:'우리 반 활동 반응',fileBase:'우리반반응',meta:[['반',className],['저장한 때',today()],['기록 위치','이 기기(브라우저)'],['판 수',`${progress.plays.length}판`]],
  headers:['활동','기록한 판','👍','👎','👍 비율','기록 안 한 판 반응','구분'],rows:rows.map(r=>[nameOf(r.id),r.plays,r.up,r.down,pct(r),r.unrecorded,isFeatured(r.id)?'대표':'보관함'])});
 return <FlowShell utilities back="/tools" backLabel="수업 도구">
  <section className="class-progress" aria-labelledby="cp-title">
   <h1 id="cp-title">{className} 반응 · 원정 지도</h1>
   <ClassSwitcher/>
   <p className="cp-lead">게임이 끝날 때 남긴 👍/👎와 판 수를 모아 보여 줘요. 기록은 이 기기에만 저장돼요.</p>
   {progressSaveFailed()&&<p className="cp-save-warning" role="alert" data-save-failed>⚠ 이 기기에 기록을 저장하지 못했어요(저장 공간이 꽉 찼거나 막혀 있어요). 지금 화면을 닫으면 최근 기록이 사라질 수 있으니, ‘내보내기’로 먼저 파일에 저장해 두세요.</p>}
   <nav className="cp-tabs" aria-label="보기 고르기">
    <button type="button" aria-current={tab==='reactions'?'page':undefined} onClick={()=>setParams({},{replace:true})}>👍 우리 반 반응</button>
    <button type="button" aria-current={tab==='reasons'?'page':undefined} onClick={()=>setParams({tab:'reasons'},{replace:true})}>🗒 반응 이유</button>
    <button type="button" aria-current={tab==='map'?'page':undefined} onClick={()=>setParams({tab:'map'},{replace:true})}>🗺 반 원정 지도</button>
   </nav>
   {tab==='reasons'?<section aria-labelledby="cp-reasons-title" data-tab="reasons">
    <h2 id="cp-reasons-title" className="cp-h2">반응 이유</h2>
    <p className="cp-hint">결과 화면에서 👍/👎 뒤에 고른 이유와 한 줄 메모를 모아요. 같은 이유가 {MIN_REASON_COUNT}번 이상 나오면 다음 할 일을 알려 줘요.</p>
    <div className="cp-share"><button type="button" className="cp-share-btn" onClick={copySummary} disabled={!progress.plays.length&&!progress.votes.length&&!progress.reasons.length}>📋 공유용 요약 복사</button>{copied&&<span role="status">{copied}</span>}</div>
    {/* 기록이 바뀌면 글 칸의 요약도 함께 바뀐다. */}
    {fallbackOpen&&<SummaryFallback text={shareSummary(progress,nameOf)}/>}
    {!reasons.length?<p className="cp-empty">아직 이유가 없어요. 게임 결과 화면에서 👍/👎를 누른 뒤 '어려웠어요', '헷갈렸어요' 같은 이유를 골라 보세요.</p>:<>
     <article className="cp-problems"><h3>많이 나온 문제</h3>
      {problems.length?<ul>{problems.map(t=><li key={t.reason}><b>{t.label}</b>가 많은 활동: {t.games.map(g=>`${nameOf(g.id)}(${g.count})`).join(', ')}</li>)}</ul>:<p>아직 {MIN_REASON_COUNT}번 이상 나온 문제가 없어요.</p>}
     </article>
     {/* 좁은 화면에서는 줄마다 카드로 보인다(CSS). 칸마다 data-label로 머리글을 단다. */}
     <div className="cp-table-wrap"><table className="cp-table cp-reason-table">
      <thead><tr><th scope="col">활동</th><th scope="col">👍 비율</th><th scope="col">고른 이유 (판 수)</th><th scope="col">다음 할 일</th><th scope="col">최근 메모</th></tr></thead>
      <tbody>{reasons.map(r=>{const picked=REASONS.filter(x=>r.counts[x.id]);return <tr key={r.id}><th scope="row">{nameOf(r.id)}{!isFeatured(r.id)&&<small> · 보관함</small>}</th><td data-label="👍 비율">{r.ratio===null?'반응 없음':`${Math.round(r.ratio*100)}%`}</td><td data-label="고른 이유" className="cp-reason-cell">{picked.length?<ul>{picked.map(x=><li key={x.id} data-vote={x.vote}>{x.vote==='up'?'👍':'👎'} {x.label} <b>{r.counts[x.id]}</b></li>)}</ul>:'메모만 있어요'}</td><td data-label="다음 할 일" className="cp-hint-cell">{r.hint??'-'}</td><td data-label="최근 메모" className="cp-notes">{r.notes.length?<>{r.notes.slice(0,NOTES_SHOWN).map(n=><span key={`${n.play}-${n.at}`}>“{n.note}”</span>)}{r.notes.length>NOTES_SHOWN&&<small>외 {r.notes.length-NOTES_SHOWN}개 · 내보내기 파일에 모두 있어요</small>}</>:'-'}</td></tr>;})}</tbody>
     </table></div>
     <details className="cp-rules"><summary>다음 할 일은 이렇게 골라요</summary><ul>
      {REASON_HINTS.map(h=><li key={h.reason}>{REASONS.find(r=>r.id===h.reason)?.label} {MIN_REASON_COUNT}번 이상 → {h.hint}</li>)}
      <li>‘헷갈렸어요’가 많은 게임은 보관함으로 보내기보다 안내를 고치는 것이 먼저예요.</li>
      <li>{SUGGESTION_RULES.note}</li>
     </ul></details>
     <ExportMenu table={reasonTable}/>
    </>}
   </section>:tab==='reactions'?<>
    {!rows.length?<p className="cp-empty">아직 기록이 없어요. 게임을 한 판 마치고 결과 화면에서 👍/👎를 눌러 보세요. <Link to="/hub">활동 찾기 →</Link></p>:<>
     <div className="cp-cards">
      <article><h2>🗄 보관함으로 보낼 후보</h2><p className="cp-hint" data-rule="archive">{SUGGESTION_RULES.archive}</p>
       {archive.length?<ul>{archive.map(r=><li key={r.id}>{nameOf(r.id)} <span>{r.plays}판 · 👍 {pct(r)}</span></li>)}</ul>:<p>아직 없어요.</p>}</article>
      <article><h2>⭐ 대표로 올릴 후보</h2><p className="cp-hint" data-rule="featured">{SUGGESTION_RULES.featured}</p>
       {promote.length?<ul>{promote.map(r=><li key={r.id}>{nameOf(r.id)} <span>{r.plays}판 · 👍 {pct(r)}</span></li>)}</ul>:<p>아직 없어요.</p>}</article>
     </div>
     <details className="cp-rules" data-rules><summary>후보는 이렇게 골라요</summary><ul>
      <li>🗄 보관함으로 보낼 후보: {SUGGESTION_RULES.archive}</li>
      <li>⭐ 대표로 올릴 후보: {SUGGESTION_RULES.featured}</li>
      <li>👍 비율은 👍와 👎를 누른 판만 세요. 반응을 남기지 않은 판은 판 수에만 들어가요.</li>
      <li>반응은 판마다 따로 남아요. 결과를 기록하지 않고 누른 반응은 '기록 안 한 판 반응'으로 따로 세고, 👍·👎 수에도 들어가요.</li>
      <li>{SUGGESTION_RULES.note}</li>
     </ul></details>
     <h2 className="cp-h2">많이 한 활동</h2>
     <div className="cp-table-wrap"><table className="cp-table">
      <thead><tr><th scope="col">활동</th><th scope="col">기록한 판</th><th scope="col">👍</th><th scope="col">👎</th><th scope="col">👍 비율</th><th scope="col" title="결과를 기록하지 않은 판에 남긴 반응">기록 안 한 판 반응</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><th scope="row">{nameOf(r.id)}{!isFeatured(r.id)&&<small> · 보관함</small>}</th><td>{r.plays}</td><td>{r.up}</td><td>{r.down}</td><td>{pct(r)}</td><td>{r.unrecorded||'-'}</td></tr>)}</tbody>
     </table></div>
     <ExportMenu table={table}/>
    </>}
   </>:<>
    <p className="cp-week" role="status">{week.line} <span>(이번 주 {week.thisWeek}판 · 지난주 {week.lastWeek}판)</span></p>
    <p>지금 <b>{map.current.icon} {map.current.name}</b>에 있어요 · 모두 {map.total}판{map.lap>1?` · ${map.lap}바퀴째`:''}{map.nextRegion?` · ${map.nextRegion.icon} ${map.nextRegion.name}까지 ${map.nextRegion.left}판`:''}</p>
    <ol className="cp-map" aria-label={`원정 지도 ${map.tiles.length}칸 중 ${map.opened}칸 열림`}>
     {map.tiles.map(t=><li key={t.index} data-open={t.open||undefined} title={`${t.index+1}칸 · ${t.region}`}><span aria-hidden="true">{t.open?t.icon:'·'}</span><span className="sr-only">{t.index+1}칸 {t.region} {t.open?'열림':'잠김'}</span></li>)}
    </ol>
    <h2 className="cp-h2">반 배지</h2>
    <ul className="cp-badges">{badges.map(b=><li key={b.id} data-earned={b.earned||undefined}><span aria-hidden="true">{b.earned?b.icon:'🔒'}</span><b>{b.name}</b><small>{b.desc}{b.earned?' · 받았어요':''}</small></li>)}</ul>
   </>}
   <div className="cp-reset">
    {!confirm?<button type="button" onClick={()=>setConfirm(true)} disabled={!progress.plays.length&&!progress.votes.length}>기록 처음으로</button>
     :<p role="alert">이 기기에 남은 반응과 지도 기록을 모두 지울까요? <button type="button" onClick={()=>setConfirm(false)}>그대로 두기</button> <button type="button" className="cp-danger" onClick={()=>{clearProgress();setConfirm(false);}}>모두 지우기</button></p>}
   </div>
  </section>
 </FlowShell>;
}
