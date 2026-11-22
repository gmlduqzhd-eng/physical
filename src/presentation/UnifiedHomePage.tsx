import {ENCYCLOPEDIA} from '../domain/encyclopedia';
import {HomeAccountTabs} from './components/HomeAccountTabs';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, ClipboardCheck, QrCode, UserRound } from 'lucide-react';
import {HOME_FEATURED_GAMES as FEATURED_GAMES,HOME_GAME_COUNT,HOME_PHONE_PLAY_COUNT,homeDomainCount,homeGame} from '../domain/homeCatalog';
import {ForestBrand} from './components/ForestIdentity';
import { AccessQrDialog, type AccessQrDialogHandle } from './components/AccessQrDialog';
import { HeaderToolbar } from './components/HeaderToolbar';
import './UnifiedHomePage.css';
import {FeaturedExperiences} from './components/FeaturedExperiences';
import {QuickPicks} from './components/QuickPicks';
import {readRecentActivities} from '../application/recentActivities';
import {readFavorites} from '../application/useActivityFavorites';

const domains = [
  { name: '운동', description: '체력·건강·기본 움직임' },
  { name: '스포츠', description: '기술·전략·협동 활동' },
  { name: '표현', description: '리듬·동작·창의적 표현' },
];

export function UnifiedHomePage() {
  const qr = useRef<AccessQrDialogHandle>(null);
  // 첫 화면에는 '지난번에 한 활동'과 '즐겨찾기'만 두고, 나머지 입구는 '더 보기'에 접어 둔다.
  const byId = (ids: readonly string[]) => ids.flatMap(id => { const game = homeGame(id); return game ? [game] : []; });
  const [recent] = useState(() => byId(readRecentActivities()).slice(0, 4));
  const [favorites] = useState(() => byId([...readFavorites()]).slice(0, 4));
  const [moreOpen, setMoreOpen] = useState(false);
  // 주소에 #자리표가 있고(예: /#library-title) 그 자리가 '더 보기' 안에 있으면, 접힌 칸을 펼치고 그 자리로 내려간다.
  // 모르는 자리표면 아무것도 펼치지 않는다.
  useEffect(() => {
    const reveal = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = id ? document.getElementById(id) : null;
      if (!target?.closest('[data-home-more]')) return;
      setMoreOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => target.scrollIntoView({ block: 'start' })));
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  const shelf = recent.length ? recent : FEATURED_GAMES.slice(0, 4);
  return <div className="unified-home"><div className="shell">
    <header><Link className="brand" to="/" aria-label="땀방울 원정대 홈"><ForestBrand/></Link>
      <HeaderToolbar label="상단 메뉴"><button className="icon-toolbar-action" type="button" title="접속 QR" aria-haspopup="dialog" aria-controls="access-qr-dialog" onClick={() => { void qr.current?.open(); }}><QrCode aria-hidden="true"/><span>접속 QR</span></button><Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link></HeaderToolbar>
    </header><HomeAccountTabs/>
    <main><section className="welcome forest-hero home-hero" aria-labelledby="home-title"><div>{/* 학생 입구는 하나: 폰에서는 첫 화면 맨 위 큰 단추, 넓은 화면에서는 작은 알약 링크로 보인다. */}<Link to="/lobby" className="home-student-join" data-home-student>🙋 학생 참여하기 <ArrowRight aria-hidden="true"/></Link><p className="eyebrow">땀방울 원정대 · 초등 체육 활동 {HOME_GAME_COUNT}개</p><h1 id="home-title">오늘 체육,<br/>세 번 눌러 시작해요</h1><p className="forest-lead">어디서 · 몇 명 · 몇 분을 고르면 맞는 활동이 나와요.<br/>TV에 띄우거나 기기 한 대로 바로 해요.</p><nav className="forest-hero-actions home-main-actions" aria-label="바로 시작"><Link to="/today" data-today-link>📋 오늘 수업 시작 (40분) <ArrowRight aria-hidden="true"/></Link><Link to="/hub" data-home-hub>🔎 활동 고르기 <ArrowRight aria-hidden="true"/></Link></nav><nav className="home-side-actions" aria-label="다른 시작"><Link to="/tools">🧰 수업 도구</Link></nav><p className="home-hero-more"><Link to="/try/map">로그인 없이 원리 체험</Link> · <Link to="/together">공용 화면 한 대로 시작</Link></p></div><picture className="home-hero-art"><source media="(max-width: 700px)" srcSet="/images/home-hero-900.webp"/><img src="/images/home-hero-1600.webp" width={1600} height={900} alt="운동장에서 공을 들고 달리고 뛰어오르는 땀방울 친구들" fetchPriority="high" decoding="async"/></picture></section>
      <QuickPicks returnTo="/" className="home-quick-picks"/>
      <section className="home-featured" aria-labelledby="home-featured-title" data-home-shelf={recent.length ? 'recent' : 'featured'}><div className="library-title"><div className="library-heading"><p className="eyebrow">{recent.length ? '이 기기에서 최근에 연 활동' : <>추천 활동 {FEATURED_GAMES.length}개</>}</p><h2 id="home-featured-title">{recent.length ? '지난번에 한 활동' : '먼저 이것부터 해 보세요'}</h2></div><Link to="/hub">추천 활동 모두 보기 →</Link></div>
        <ul className="home-featured-list">{shelf.map(g=><li key={g.type}><Link to={`/play/${g.type}`} data-featured-link={g.type}><span aria-hidden="true">{g.emoji}</span><strong>{g.name}</strong></Link></li>)}</ul>
        {favorites.length>0&&<><h3 className="home-shelf-sub" id="home-favorites-title">★ 즐겨찾기</h3><ul className="home-featured-list" aria-labelledby="home-favorites-title">{favorites.map(g=><li key={g.type}><Link to={`/play/${g.type}`} data-favorite-link={g.type}><span aria-hidden="true">{g.emoji}</span><strong>{g.name}</strong></Link></li>)}</ul></>}
      </section>
      <details className="home-more" open={moreOpen} onToggle={e=>setMoreOpen(e.currentTarget.open)} data-home-more><summary><span>더 보기</span><small>영역별로 찾기 · 교사 수업 준비 · 혼자 하기 · 체육수업 대백과</small></summary>
      <section className="library home-find" aria-labelledby="library-title"><div className="library-title"><div className="library-heading"><h2 id="library-title">다른 방법으로 찾기</h2><span className="catalog-note">활동 <b>{HOME_GAME_COUNT}</b>개</span></div></div><div className="categories">{domains.map(domain => <Link className="category" key={domain.name} to={`/hub?domain=${encodeURIComponent(domain.name)}`}><div><h3>{domain.name}</h3><p>{domain.description}</p></div><strong>{homeDomainCount(domain.name)}<small>개</small></strong></Link>)}<Link className="category" to="/hub?collection=phone"><div><h3>준비물 없는 놀이</h3><p>TV에 띄워 반 전체가 함께</p></div><strong>{HOME_PHONE_PLAY_COUNT}<small>개</small></strong></Link><Link className="category" to="/expeditions"><div><h3>대표 원정</h3><p>비밀지도 · 바디루프 · 학급 보스</p></div><strong>3<small>개</small></strong></Link></div></section>
      <nav className="roles" aria-label="역할 선택">
        <Link to="/teacher" className="role teacher"><div className="role-top"><span className="icon"><ClipboardCheck aria-hidden="true"/></span></div><div className="role-copy"><h2>선생님, 수업을 준비해요.</h2><p>활동을 고르고 모둠을 구성하면<br/>오늘의 수업을 시작할 수 있어요.</p></div><span className="action">교사로 시작하기 <ArrowRight aria-hidden="true"/></span></Link>
        <Link to="/solo" className="role solo"><div className="role-top"><span className="icon"><UserRound aria-hidden="true"/></span></div><div className="role-copy"><h2>혼자서도 즐겁게 해봐요.</h2><p>수업 코드 없이 원하는 게임을 고르고<br/>바로 체험할 수 있어요.</p></div><span className="action">혼자 해보기 <ArrowRight aria-hidden="true"/></span></Link>
      </nav>
      <section className="encyclopedia" aria-labelledby="encyclopedia-title"><p className="eyebrow">체육수업 대백과</p><h2 id="encyclopedia-title">수업에 필요한 것을 한곳에서</h2><div className="encyclopedia-grid">{ENCYCLOPEDIA.map(entry=><Link key={entry.id} to={entry.to} data-encyclopedia={entry.id}><span aria-hidden="true">{entry.icon}</span><strong>{entry.title}</strong><small>{entry.summary}</small></Link>)}</div></section>
      <FeaturedExperiences/>
      </details>
    </main>
    <footer><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 예시로 둘러보기 ↗</Link><Link to="/privacy">개인정보 안내</Link></nav><p className="ys-credit">© 2026 엽쌤. All rights reserved. · <a href="https://gmlduqzhd123-lab.github.io/YScode/">엽쌤의 다른 앱 보기 →</a></p></footer>
  </div><AccessQrDialog dialogRef={qr}/></div>;
}
