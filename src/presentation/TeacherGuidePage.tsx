import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {TeacherQuickGuideBody} from './components/TeacherQuickGuide';
import {LESSON_HELPER_LINKS} from '../domain/lessonHelpers';
import './TodayLesson.css';
import './StudentUi.css';

/** '처음 쓰는 선생님' 1분 안내를 언제든 다시 보는 화면(이용 안내에서 연결). */
export function TeacherGuidePage(){
 return <FlowShell utilities className="today-page sui-scope" back="/manual" backLabel="이용 안내">
  <section className="today-card" aria-labelledby="guide-title">
   <p className="eyebrow">처음 쓰는 선생님 · 1분 안내</p>
   <h1 id="guide-title">TV에 띄우고, 휴대폰으로 진행해요</h1>
   <div className="today-guide-body"><TeacherQuickGuideBody/></div>
   <div className="today-row"><Link className="primary today-primary today-linkbtn" to="/today">📋 오늘 수업 40분 바로 시작</Link><Link to="/print/signature-cards">규칙 카드·QR 안내 인쇄</Link><Link to="/sound-check">🔈 소리 미리듣기</Link><Link to="/display-check">👀 뒤에서 보여요?</Link></div>
  </section>
  <section className="today-card" aria-labelledby="guide-helpers-title" data-guide-helpers>
   <h2 id="guide-helpers-title">수업 중에 바로 쓰는 도구와 안내</h2>
   <ul className="today-guide-links">{LESSON_HELPER_LINKS.map(l=><li key={l.title}><Link to={l.to}>{l.icon} {l.title}</Link></li>)}</ul>
   <p className="today-plan-note">쓰는 법은 <Link to="/manual">이용 안내</Link>에 차례대로 있어요.</p>
  </section>
 </FlowShell>;
}
