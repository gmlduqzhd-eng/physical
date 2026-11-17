import {ENCYCLOPEDIA} from '../domain/encyclopedia';
import {HomeAccountTabs} from './components/HomeAccountTabs';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, ClipboardCheck, QrCode, UserRound } from 'lucide-react';
import { AVAILABLE_GAMES as GAMES } from '../domain/gamesData';
import {PHONE_PLAYS} from '../domain/phonePlayCatalog';
import {ForestBrand} from './components/ForestIdentity';
import { AccessQrDialog, type AccessQrDialogHandle } from './components/AccessQrDialog';
import { HeaderToolbar } from './components/HeaderToolbar';
import './UnifiedHomePage.css';
import {FeaturedExperiences} from './components/FeaturedExperiences';

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
    </header><HomeAccountTabs/>
    <main><section className="welcome forest-hero home-hero" aria-labelledby="home-title"><div><p className="eyebrow">땀방울 원정대 · 초등 체육 활동 {GAMES.length}개</p><h1 id="home-title">오늘 체육,<br/>세 번 눌러 시작해요</h1><p className="forest-lead">어디서 · 몇 명 · 몇 분을 고르면 맞는 활동이 나와요.<br/>TV에 띄우거나 기기 한 대로 바로 해요.</p><nav className="forest-hero-actions home-main-actions" aria-label="바로 시작"><Link to="/hub">🔎 조건으로 활동 찾기 <ArrowRight aria-hidden="true"/></Link><Link to="/lobby">🙋 학생 수업 참여</Link><Link to="/tools">🧰 수업 도구</Link></nav><p className="home-hero-more"><Link to="/try/map">로그인 없이 원리 체험</Link> · <Link to="/together">공용 화면 한 대로 시작</Link></p></div><picture className="home-hero-art"><source media="(max-width: 700px)" srcSet="/images/home-hero-900.webp"/><img src="/images/home-hero-1600.webp" width={1600} height={900} alt="운동장에서 공을 들고 달리고 뛰어오르는 땀방울 친구들" fetchPriority="high" decoding="async"/></picture></section>
      <FeaturedExperiences/>
      <nav className="roles" aria-label="역할 선택">
        <Link to="/teacher" className="role teacher"><div className="role-top"><span className="icon"><ClipboardCheck aria-hidden="true"/></span></div><div className="role-copy"><h2>선생님, 수업을 준비해요.</h2><p>활동을 고르고 모둠을 구성하면<br/>오늘의 수업을 시작할 수 있어요.</p></div><span className="action">교사로 시작하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/lobby" className="role student"><div className="role-top"><span className="icon"><QrCode aria-hidden="true"/></span></div><div className="role-copy"><h2>학생은 바로 참여해요.</h2><p>선생님이 알려주신 QR이나 코드로<br/>우리 수업에 함께해요.</p></div><span className="action">수업 참여하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/solo" className="role solo"><div className="role-top"><span className="icon"><UserRound aria-hidden="true"/></span></div><div className="role-copy"><h2>혼자서도 즐겁게 해봐요.</h2><p>수업 코드 없이 원하는 게임을 고르고<br/>바로 체험할 수 있어요.</p></div><span className="action">혼자 해보기 <ArrowRight aria-hidden="true"/></span></Link>
      </nav>
      <section className="encyclopedia" aria-labelledby="encyclopedia-title"><p className="eyebrow">체육수업 대백과</p><h2 id="encyclopedia-title">수업에 필요한 것을 한곳에서</h2><div className="encyclopedia-grid">{ENCYCLOPEDIA.map(entry=><Link key={entry.id} to={entry.to} data-encyclopedia={entry.id}><span aria-hidden="true">{entry.icon}</span><strong>{entry.title}</strong><small>{entry.summary}</small></Link>)}</div></section>
      <section className="phone-home-link"><div><p className="eyebrow">새 대표 협동 게임</p><h2>몸으로 연결하는 세 가지 원정</h2><p>비밀지도 · 바디루프 · 학급 보스</p></div><Link to="/expeditions">대표 원정 살펴보기 <ArrowRight aria-hidden="true"/></Link></section>
      <section className="phone-home-link"><div><p className="eyebrow">준비물 없는 활동 {PHONE_PLAYS.length}개</p><h2>스마트폰은 내려놓고, 함께 움직여요.</h2><p>TV에 띄워 반 전체가 하거나, 기기 한 대로 짝·모둠이 해요.</p></div><Link to="/hub?collection=phone">준비물 없는 놀이 찾기 <ArrowRight aria-hidden="true"/></Link></section>
      <section className="library" aria-labelledby="library-title"><div className="library-title"><div className="library-heading"><h2 id="library-title">오늘은 어떤 활동을 해볼까요?</h2><span className="catalog-note">활동 <b>{GAMES.length}</b>개</span></div><Link to="/hub">전체 보기 →</Link></div><div className="categories">{domains.map(domain => <Link className="category" key={domain.name} to={`/hub?domain=${encodeURIComponent(domain.name)}`}><div><h3>{domain.name}</h3><p>{domain.description}</p></div><strong>{GAMES.filter(game => game.domain === domain.name).length}<small>개</small></strong></Link>)}</div></section>
    </main>
    <footer><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 예시로 둘러보기 ↗</Link><Link to="/privacy">개인정보 안내</Link></nav><p className="ys-credit">© 2026 엽쌤. All rights reserved. · <a href="https://gmlduqzhd123-lab.github.io/YScode/">엽쌤의 다른 앱 보기 →</a></p></footer>
  </div><AccessQrDialog dialogRef={qr}/></div>;
}
