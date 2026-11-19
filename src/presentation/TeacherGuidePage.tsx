import {Link} from 'react-router-dom';
import {FlowShell} from './FlowShell';
import {TeacherQuickGuideBody} from './components/TeacherQuickGuide';
import './TodayLesson.css';

/** '처음 쓰는 선생님' 1분 안내를 언제든 다시 보는 화면(이용 안내에서 연결). */
export function TeacherGuidePage(){
 return <FlowShell utilities className="today-page" back="/manual" backLabel="이용 안내">
  <section className="today-card" aria-labelledby="guide-title">
   <p className="eyebrow">처음 쓰는 선생님 · 1분 안내</p>
   <h1 id="guide-title">TV에 띄우고, 휴대폰으로 진행해요</h1>
   <div className="today-guide-body"><TeacherQuickGuideBody/></div>
   <div className="today-row"><Link className="primary today-primary today-linkbtn" to="/today">📋 오늘 수업 40분 바로 시작</Link><Link to="/print/signature-cards">규칙 카드·QR 안내 인쇄</Link><Link to="/sound-check">🔈 소리 미리듣기</Link></div>
  </section>
 </FlowShell>;
}
