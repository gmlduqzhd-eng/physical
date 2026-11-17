import {useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {ExportMenu} from './components/ExportMenu';
import {clearProgress,useClassProgress} from '../application/classProgressStore';
import {archiveCandidates,classBadges,featuredCandidates,mapView,reactionRows,weekCompare,MIN_PLAYS_FOR_SUGGESTION,type ReactionRow} from '../domain/classProgress';
import {GAMES} from '../domain/gamesData';
import {isFeatured} from '../domain/featuredGames';
import type {ExportTable} from '../application/documentExport';
import './ClassProgressPage.css';

const NAME=new Map(GAMES.map(g=>[g.type,`${g.emoji??''} ${g.name}`.trim()]));
const nameOf=(id:string)=>NAME.get(id)??id;
const pct=(r:ReactionRow)=>r.ratio===null?'반응 없음':`${Math.round(r.ratio*100)}%`;
const today=()=>new Date().toLocaleDateString('ko-KR');

/** 선생님용: 우리 반 반응(👍/👎)과 반 원정 지도. 기록은 이 기기에만 있다. */
export function ClassProgressPage(){
 const progress=useClassProgress();
 const [params,setParams]=useSearchParams();
 const tab=params.get('tab')==='map'?'map':'reactions';
 const [confirm,setConfirm]=useState(false);
 const rows=useMemo(()=>reactionRows(progress),[progress]);
 const archive=archiveCandidates(rows,isFeatured),promote=featuredCandidates(rows,isFeatured);
 const map=mapView(progress),week=weekCompare(progress,Date.now()),badges=classBadges(progress);
 const table=():ExportTable=>({title:'우리 반 활동 반응',fileBase:'우리반반응',meta:[['저장한 때',today()],['기록 위치','이 기기(브라우저)'],['판 수',`${progress.plays.length}판`]],
  headers:['활동','판 수','👍','👎','👍 비율','구분'],rows:rows.map(r=>[nameOf(r.id),r.plays,r.up,r.down,pct(r),isFeatured(r.id)?'대표':'보관함'])});
 return <FlowShell utilities back="/tools" backLabel="수업 도구">
  <section className="class-progress" aria-labelledby="cp-title">
   <h1 id="cp-title">우리 반 반응 · 원정 지도</h1>
   <p className="cp-lead">게임이 끝날 때 남긴 👍/👎와 판 수를 모아 보여 줘요. 기록은 이 기기에만 저장돼요.</p>
   <nav className="cp-tabs" aria-label="보기 고르기">
    <button type="button" aria-current={tab==='reactions'?'page':undefined} onClick={()=>setParams({},{replace:true})}>👍 우리 반 반응</button>
    <button type="button" aria-current={tab==='map'?'page':undefined} onClick={()=>setParams({tab:'map'},{replace:true})}>🗺 반 원정 지도</button>
   </nav>
   {tab==='reactions'?<>
    {!rows.length?<p className="cp-empty">아직 기록이 없어요. 게임을 한 판 마치고 결과 화면에서 👍/👎를 눌러 보세요. <Link to="/hub">활동 찾기 →</Link></p>:<>
     <div className="cp-cards">
      <article><h2>🗄 보관함으로 보낼 후보</h2><p className="cp-hint">대표 게임 중 {MIN_PLAYS_FOR_SUGGESTION}판 이상 했고 👍가 40% 미만</p>
       {archive.length?<ul>{archive.map(r=><li key={r.id}>{nameOf(r.id)} <span>{r.plays}판 · 👍 {pct(r)}</span></li>)}</ul>:<p>아직 없어요.</p>}</article>
      <article><h2>⭐ 대표로 올릴 후보</h2><p className="cp-hint">보관함 활동 중 {MIN_PLAYS_FOR_SUGGESTION}판 이상 했고 👍가 80% 이상</p>
       {promote.length?<ul>{promote.map(r=><li key={r.id}>{nameOf(r.id)} <span>{r.plays}판 · 👍 {pct(r)}</span></li>)}</ul>:<p>아직 없어요.</p>}</article>
     </div>
     <h2 className="cp-h2">많이 한 활동</h2>
     <div className="cp-table-wrap"><table className="cp-table">
      <thead><tr><th scope="col">활동</th><th scope="col">판 수</th><th scope="col">👍</th><th scope="col">👎</th><th scope="col">👍 비율</th></tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><th scope="row">{nameOf(r.id)}{!isFeatured(r.id)&&<small> · 보관함</small>}</th><td>{r.plays}</td><td>{r.up}</td><td>{r.down}</td><td>{pct(r)}</td></tr>)}</tbody>
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
