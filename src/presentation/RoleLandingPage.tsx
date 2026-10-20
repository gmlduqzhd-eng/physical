import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, QrCode } from 'lucide-react';
import { useBackgroundMusic } from '../application/BackgroundMusicContext';
import './RoleLandingPage.css';
export function RoleLandingPage() {
  const { enabled, toggle } = useBackgroundMusic();
  return <main className="role-start"><div className="role-start-wrap">
    <header className="role-start-header">
      <Link to="/" className="role-start-brand" aria-label="땀방울 원정대 홈"><svg viewBox="0 0 32 38" fill="none" aria-hidden="true"><path d="M16 2C12 9 3 17 3 24a13 13 0 0026 0C29 17 20 9 16 2Z" fill="currentColor"/><path d="M9 23c0 4 2 6 6 7" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>땀방울 원정대</Link>
      <nav aria-label="이용 설정"><button type="button" aria-pressed={enabled} onClick={toggle}>{enabled ? '음악 끄기' : '음악 켜기'}</button><Link to="/manual">이용 안내 ↗</Link></nav>
    </header>
    <section className="role-start-hero" aria-labelledby="role-start-title"><p className="role-start-eyebrow">READY, SET, TOGETHER</p><h1 id="role-start-title">오늘의 체육,<br/>함께 시작해요.</h1><p className="role-start-lead">선생님도 학생도, 나에게 맞는 문으로 들어오세요.</p><img className="role-start-art" src="/start-court.svg" alt="" width="280" height="191"/></section>
    <nav className="role-start-cards" aria-label="참여 역할 선택">
      <Link to="/teacher" className="role-start-card"><div className="role-start-card-top"><span className="role-start-icon"><ClipboardCheck aria-hidden="true"/></span><span className="role-start-chip">선생님</span></div><div><h2>수업을 준비할까요?</h2><p>활동 선택부터 수업 진행까지,<br/>한 곳에서 간편하게 준비해요.</p></div><span className="role-start-cta">교사로 시작하기 <ArrowRight aria-hidden="true"/></span></Link>
      <Link to="/lobby" className="role-start-card role-start-student"><div className="role-start-card-top"><span className="role-start-icon"><QrCode aria-hidden="true"/></span><span className="role-start-chip">학생</span></div><div><h2>함께 움직여 볼까요?</h2><p>선생님이 알려주신 QR이나 코드로<br/>우리 수업에 바로 참여해요.</p></div><span className="role-start-cta">수업 참여하기 <ArrowRight aria-hidden="true"/></span></Link>
    </nav>
    <aside className="role-start-under"><p><strong>혼자서도 즐겁게</strong><span>나에게 맞는 체육 활동을 찾아보세요.</span></p><Link to="/hub">활동 둘러보기 <ArrowRight aria-hidden="true"/></Link></aside>
    <footer className="role-start-footer"><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 사용법 둘러보기</Link><Link to="/privacy">개인정보 안내</Link></nav></footer>
  </div></main>;
}
