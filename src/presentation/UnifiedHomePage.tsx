import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, QrCode } from 'lucide-react';
import { GAMES } from '../domain/gamesData';
import brandLogo from '../assets/brand-logo.png';
import { BackgroundMusicButton } from './components/BackgroundMusicButton';
import { LinkShareButton } from './components/LinkShareButton';
import { AccessQrDialog, type AccessQrDialogHandle } from './components/AccessQrDialog';
import './UnifiedHomePage.css';

const domains = [
  { name: '운동', description: '체력·건강·기본 움직임' },
  { name: '스포츠', description: '기술·전략·협동 활동' },
  { name: '표현', description: '리듬·동작·창의적 표현' },
];

export function UnifiedHomePage() {
  const qr = useRef<AccessQrDialogHandle>(null);
  return <div className="unified-home"><div className="wrap">
    <header><Link className="brand" to="/" aria-label="땀방울 원정대 홈"><img src={brandLogo} alt="" width="44" height="51"/><div>땀방울 원정대<small>PHYSICAL EDUCATION</small></div></Link>
      <nav aria-label="상단 메뉴"><Link to="/manual">이용 안내</Link><details className="home-tools"><summary>음악·공유 ＋</summary><div className="tools-panel"><BackgroundMusicButton/><div className="tools-actions"><button type="button" aria-haspopup="dialog" aria-controls="access-qr-dialog" onClick={() => { void qr.current?.open(); }}>접속 QR 보기</button><LinkShareButton/></div></div></details></nav>
    </header>
    <main><div className="layout"><section className="intro" aria-labelledby="home-title"><div className="eyebrow">2022 개정 교육과정 연계</div><h1 id="home-title">오늘의 체육,<br/><em>함께 시작해요.</em></h1><p className="lead">준비하는 선생님도, 참여하는 학생도.<br/>우리의 체육 시간이 한 곳에서 시작됩니다.</p><div className="stats"><strong>{GAMES.length}</strong><span>개의 활동 자료<br/>학년과 영역에 맞춰 준비했어요.</span></div><div className="tags"><span>1–2학년</span><span>3–4학년군</span><span>5–6학년군</span></div><img className="court" src="/start-court.svg" alt="" width="200" height="136"/></section>
      <section aria-labelledby="quick-title"><div className="quick-title"><h2 id="quick-title">나에게 맞는 시작</h2><span>별도 접속 단계 없이 바로</span></div><nav className="cards" aria-label="역할 선택">
        <Link to="/teacher" className="role teacher"><div className="card-top"><span className="icon"><ClipboardCheck aria-hidden="true"/></span><span className="chip">선생님</span></div><div><h2>수업을 준비할까요?</h2><p>활동 선택부터 수업 진행까지,<br/>한 곳에서 간편하게 준비해요.</p></div><span className="cta">교사로 시작하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/lobby" className="role student"><div className="card-top"><span className="icon"><QrCode aria-hidden="true"/></span><span className="chip">학생</span></div><div><h2>함께 움직여 볼까요?</h2><p>선생님이 알려주신 QR이나 코드로<br/>우리 수업에 바로 참여해요.</p></div><span className="cta">수업 참여하기 <ArrowRight aria-hidden="true"/></span></Link>
      </nav></section></div>
      <section className="library-strip" aria-labelledby="library-title"><div className="section-top"><div><h2 id="library-title">어떤 움직임을 찾고 있나요?</h2><p>운동·스포츠·표현, 수업에 맞춰 골라보세요.</p></div><Link className="text-link" to="/hub">전체 활동 둘러보기 →</Link></div><div className="categories">{domains.map(domain => <Link className="category" key={domain.name} to={`/hub?domain=${encodeURIComponent(domain.name)}`}><div><h3>{domain.name}</h3><p>{domain.description}</p></div><strong>{GAMES.filter(game => game.domain === domain.name).length}<small>개</small></strong></Link>)}</div></section>
    </main>
    <footer><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 예시로 둘러보기 ↗</Link><Link to="/privacy">개인정보 안내</Link></nav></footer>
  </div><AccessQrDialog dialogRef={qr}/></div>;
}
