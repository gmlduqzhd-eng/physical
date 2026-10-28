import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, ClipboardCheck, QrCode, UserRound } from 'lucide-react';
import { AVAILABLE_GAMES as GAMES } from '../domain/gamesData';
import {PHONE_PLAYS} from '../domain/phonePlayCatalog';
import {ForestBrand,ForestOrbit} from './components/ForestIdentity';
import { AccessQrDialog, type AccessQrDialogHandle } from './components/AccessQrDialog';
import { HeaderToolbar } from './components/HeaderToolbar';
import './UnifiedHomePage.css';

const domains = [
  { name: '운동', description: '체력·건강·기본 움직임' },
  { name: '스포츠', description: '기술·전략·협동 활동' },
  { name: '표현', description: '리듬·동작·창의적 표현' },
];

export function UnifiedHomePage() {
  const qr = useRef<AccessQrDialogHandle>(null);
  return <div className="unified-home"><div className="shell">
    <header><Link className="brand" to="/" aria-label="땀방울 원정대 홈"><ForestBrand/></Link>
      <HeaderToolbar label="상단 메뉴"><button className="icon-toolbar-action" type="button" title="접속 QR" aria-haspopup="dialog" aria-controls="access-qr-dialog" onClick={() => { void qr.current?.open(); }}><QrCode aria-hidden="true"/><span>접속 QR</span></button><Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link></HeaderToolbar>
    </header>
    <main><section className="welcome forest-hero" aria-labelledby="home-title"><div><p className="eyebrow">땀방울 원정대 · 함께 움직이는 체육 시간</p><h1 id="home-title">함께 움직이는<br/>시간의 즐거움.</h1><p className="forest-lead">준비는 가볍게, 경험은 풍성하게.<br/>스마트폰 하나로 만나는 {PHONE_PLAYS.length}가지 몸 놀이.</p><nav className="forest-hero-actions" aria-label="추천 놀이 탐색"><Link to="/hub?collection=phone">나에게 맞는 놀이 찾기 <ArrowRight aria-hidden="true"/></Link></nav></div><ForestOrbit/></section>
      <nav className="roles" aria-label="역할 선택">
        <Link to="/teacher" className="role teacher"><div className="role-top"><span className="icon"><ClipboardCheck aria-hidden="true"/></span></div><div className="role-copy"><h2>선생님, 수업을 준비해요.</h2><p>활동을 고르고 모둠을 구성하면<br/>오늘의 수업을 시작할 수 있어요.</p></div><span className="action">교사로 시작하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/lobby" className="role student"><div className="role-top"><span className="icon"><QrCode aria-hidden="true"/></span></div><div className="role-copy"><h2>학생은 바로 참여해요.</h2><p>선생님이 알려주신 QR이나 코드로<br/>우리 수업에 함께해요.</p></div><span className="action">수업 참여하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/solo" className="role solo"><div className="role-top"><span className="icon"><UserRound aria-hidden="true"/></span></div><div className="role-copy"><h2>혼자서도 즐겁게 해봐요.</h2><p>수업 코드 없이 원하는 게임을 고르고<br/>바로 체험할 수 있어요.</p></div><span className="action">혼자 해보기 <ArrowRight aria-hidden="true"/></span></Link>
      </nav>
      <section className="phone-home-link"><div><p className="eyebrow">별도 준비물 없는 {PHONE_PLAYS.length}가지 몸 놀이</p><h2>스마트폰은 내려놓고, 함께 움직여요.</h2><p>혼자·짝·모둠, 필요한 공간과 시간에 맞춰 골라요.</p></div><Link to="/hub?collection=phone">준비물 없는 놀이 찾기 <ArrowRight aria-hidden="true"/></Link></section>
      <section className="library" aria-labelledby="library-title"><div className="library-title"><div className="library-heading"><h2 id="library-title">오늘은 어떤 활동을 해볼까요?</h2><span className="catalog-note"><b>{GAMES.length}</b>개의 활동 자료</span></div><Link to="/hub">전체 보기 →</Link></div><div className="categories">{domains.map(domain => <Link className="category" key={domain.name} to={`/hub?domain=${encodeURIComponent(domain.name)}`}><div><h3>{domain.name}</h3><p>{domain.description}</p></div><strong>{GAMES.filter(game => game.domain === domain.name).length}<small>개</small></strong></Link>)}</div></section>
    </main>
    <footer><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 예시로 둘러보기 ↗</Link><Link to="/privacy">개인정보 안내</Link></nav></footer>
  </div><AccessQrDialog dialogRef={qr}/></div>;
}
