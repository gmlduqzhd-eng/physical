import {useMemo} from 'react';
import {ExportMenu} from './ExportMenu';
import {useClassProgress} from '../../application/classProgressStore';
import {currentClassId} from '../../application/classRosterStore';
import {readJsonStorage} from '../../application/browserStorage';
import {classStorageKey} from '../../domain/classRoster';
import {parseJourney} from '../../domain/classJourney';
import {GAMES} from '../../domain/gamesData';
import {TERM_HEADERS,buildTermSummary,termMeta,termRows} from '../../domain/termSummary';
import type {ExportTable} from '../../application/documentExport';

const BY_ID=new Map(GAMES.map(g=>[g.type,g]));
const nameOf=(id:string)=>{const g=BY_ID.get(id);return g?`${g.emoji??''} ${g.name}`.trim():id;};
const domainOf=(id:string)=>BY_ID.get(id)?.domain;

/**
 * 학기 정리 한 장: 이 반이 한 활동·영역별 판 수·반응이 좋았던 활동·원정 지도 도장.
 * 평가 문구를 대신 쓰지 않고 사실만 모은다(학생 개인 기록 없음). 인쇄하거나 파일로 받아 평가·안내 자료에 쓴다.
 */
export function TermSummaryTab({className}:{className:string}){
 const progress=useClassProgress();
 const summary=useMemo(()=>buildTermSummary(progress,parseJourney(readJsonStorage(classStorageKey('physical_class_journey_v1',currentClassId()))),domainOf),[progress]);
 const table=():ExportTable=>({title:`${className} 체육 수업 정리`,fileBase:'체육수업정리',meta:termMeta(summary,className,nameOf),headers:TERM_HEADERS,rows:termRows(summary,nameOf,domainOf)});
 const empty=!summary.plays&&!summary.votes&&!summary.stamps;
 return <section aria-labelledby="cp-term-title" data-tab="term">
  <h2 id="cp-term-title" className="cp-h2">학기 정리</h2>
  <p className="cp-hint">‘{className}’이 TV로 한 수업 기록을 한 장으로 모아요. 인쇄하거나 파일로 받아 평가·학부모 안내 자료에 써요. 학생 개인 기록은 없어요.</p>
  {empty?<p role="status" className="cp-empty">아직 기록이 없어요. 게임을 마치면 판 수가 쌓이고, 끝 화면에서 👍/👎를 남기면 반응이 모여요.</p>:<>
   <dl className="cp-term-facts">
    <div><dt>기간</dt><dd>{summary.from?`${summary.from} ~ ${summary.to}`:'-'}</dd></div>
    <div><dt>수업한 날</dt><dd data-term-days>{summary.days}일</dd></div>
    <div><dt>한 판 수</dt><dd data-term-plays>{summary.plays}판</dd></div>
    <div><dt>원정 지도 도장</dt><dd>{summary.stamps}개</dd></div>
   </dl>
   {summary.domains.length>0&&<p className="cp-term-line"><strong>영역별</strong> {summary.domains.map(d=>`${d.name} ${d.plays}판`).join(' · ')}</p>}
   {summary.loved.length>0&&<p className="cp-term-line"><strong>반응이 좋았던 활동</strong> {summary.loved.map(a=>nameOf(a.id)).join(', ')}</p>}
   <div className="cp-table-wrap"><table className="cp-table"><thead><tr>{TERM_HEADERS.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{termRows(summary,nameOf,domainOf).map((r,i)=><tr key={summary.activities[i].id}>{r.map((c,j)=>j===0?<th key={j} scope="row">{c}</th>:<td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
   <div className="cp-share"><button type="button" className="cp-share-btn" onClick={()=>window.print()}>🖨 인쇄하기</button><ExportMenu table={table}/></div>
  </>}
 </section>;
}
