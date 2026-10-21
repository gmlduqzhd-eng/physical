import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, QrCode, UserRound } from 'lucide-react';
import { GAMES } from '../domain/gamesData';
import brandLogo from '../assets/brand-logo.png';
import { AccessQrDialog, type AccessQrDialogHandle } from './components/AccessQrDialog';
import { HeaderUtilities } from './components/HeaderUtilities';
import './UnifiedHomePage.css';

const domains = [
  { name: '운동', description: '체력·건강·기본 움직임' },
  { name: '스포츠', description: '기술·전략·협동 활동' },
  { name: '표현', description: '리듬·동작·창의적 표현' },
];

export function UnifiedHomePage() {
  const qr = useRef<AccessQrDialogHandle>(null);
  return <div className="unified-home"><div className="shell">
    <header><Link className="brand" to="/" aria-label="땀방울 원정대 홈"><img src={brandLogo} alt="" width="44" height="51"/><div>땀방울 원정대<small>PHYSICAL EDUCATION</small></div></Link>
      <nav className="header-nav" aria-label="상단 메뉴">
        <HeaderUtilities/>
        <div className="header-help"><button type="button" aria-haspopup="dialog" aria-controls="access-qr-dialog" onClick={() => { void qr.current?.open(); }}><QrCode aria-hidden="true"/>접속 QR</button><Link to="/manual">이용 안내</Link></div>
      </nav>
    </header>
    <main><section className="welcome" aria-labelledby="home-title"><div><div className="eyebrow">땀방울 원정대 · 우리들의 체육 교실</div><h1 id="home-title">작은 움직임에서,<br/><em>함께하는 즐거움으로.</em></h1></div><div className="welcome-side"><p className="lead">선생님의 준비는 더 간편하게,<br/>학생들의 참여는 더 즐겁게.<br/>오늘의 체육 수업을 여기서 시작하세요.</p><p className="grade-note">2022 개정 교육과정 연계 · 1–2학년군 · 3–4학년군 · 5–6학년군</p></div></section>
      <nav className="roles" aria-label="역할 선택">
        <Link to="/teacher" className="role teacher"><div className="role-top"><span className="icon"><ClipboardCheck aria-hidden="true"/></span></div><div className="role-copy"><h2>선생님, 수업을 준비해요.</h2><p>활동을 고르고 모둠을 구성하면<br/>오늘의 수업을 시작할 수 있어요.</p></div><span className="action">교사로 시작하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/lobby" className="role student"><div className="role-top"><span className="icon"><QrCode aria-hidden="true"/></span></div><div className="role-copy"><h2>학생은 바로 참여해요.</h2><p>선생님이 알려주신 QR이나 코드로<br/>우리 수업에 함께해요.</p></div><span className="action">수업 참여하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/solo" className="role solo"><div className="role-top"><span className="icon"><UserRound aria-hidden="true"/></span></div><div className="role-copy"><h2>혼자서도 즐겁게 해봐요.</h2><p>수업 코드 없이 원하는 게임을 고르고<br/>바로 체험할 수 있어요.</p></div><span className="action">혼자 해보기 <ArrowRight aria-hidden="true"/></span></Link>
      </nav>
      <section className="library" aria-labelledby="library-title"><div className="library-title"><div className="library-heading"><h2 id="library-title">오늘은 어떤 활동을 해볼까요?</h2><span className="catalog-note"><b>{GAMES.length}</b>개의 활동 자료</span></div><Link to="/hub">전체 보기 →</Link></div><div className="categories">{domains.map(domain => <Link className="category" key={domain.name} to={`/hub?domain=${encodeURIComponent(domain.name)}`}><div><h3>{domain.name}</h3><p>{domain.description}</p></div><strong>{GAMES.filter(game => game.domain === domain.name).length}<small>개</small></strong></Link>)}</div></section>
    </main>
    <footer><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 예시로 둘러보기 ↗</Link><Link to="/privacy">개인정보 안내</Link></nav></footer>
  </div><AccessQrDialog dialogRef={qr}/></div>;
}
