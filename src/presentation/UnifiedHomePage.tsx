import {HomeAccountTabs} from './components/HomeAccountTabs';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleHelp, Play, QrCode, Search, UserRound } from 'lucide-react';
import {HOME_FEATURED_GAMES as FEATURED_GAMES,homeGame} from '../domain/homeCatalog';
import {ForestBrand} from './components/ForestIdentity';
import { AccessQrDialog, type AccessQrDialogHandle } from './components/AccessQrDialog';
import { HeaderToolbar } from './components/HeaderToolbar';
import './UnifiedHomePage.css';
import './EntryCards.css';
import {readRecentActivities} from '../application/recentActivities';
import {readFavorites} from '../application/useActivityFavorites';
import {lessonStartPath} from '../application/lessonStartPrefs';

/** 예전 처음 화면의 '더 보기' 자리표. 이제 그 칸들은 활동 고르기 아래 '더 찾기'에 있다. */
const MOVED_ANCHORS = new Set(['library-title', 'encyclopedia-title', 'featured-play-title']);

/**
 * 처음 화면: 입구는 세 개(수업 시작 · 학생 참여 · 활동·도구 찾기)와 '지난번에 한 활동' 한 줄뿐이다.
 * 주 버튼은 화면에 하나 — 넓은 화면(TV·PC)은 수업 시작, 폰은 학생 참여(EntryCards.css가 폭에 따라 바꾼다).
 * 빠른 추천·체육수업 대백과·혼자 하기 등은 '활동·도구 찾기'(활동 고르기) 안으로 옮겼다.
 */
export function UnifiedHomePage() {
  const qr = useRef<AccessQrDialogHandle>(null);
  const navigate = useNavigate();
  const byId = (ids: readonly string[]) => ids.flatMap(id => { const game = homeGame(id); return game ? [game] : []; });
  const [recent] = useState(() => byId(readRecentActivities()).slice(0, 4));
  const [favorites] = useState(() => byId([...readFavorites()]).slice(0, 4));
  // 지난번에 고른 수업 방식이 있으면 그 화면으로 바로, 없으면 방식 고르기(/start-lesson)로 간다.
  const [startTo] = useState(() => lessonStartPath());
  // 예전 주소(/#library-title 등)로 들어오면 옮겨 간 자리(활동 고르기 아래)로 보낸다. 모르는 자리표는 그대로 둔다.
  useEffect(() => {
    const moveOld = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (MOVED_ANCHORS.has(id)) navigate(`/hub#${id}`, { replace: true });
    };
    moveOld();
    window.addEventListener('hashchange', moveOld);
    return () => window.removeEventListener('hashchange', moveOld);
  }, [navigate]);
  const shelf = recent.length ? recent : FEATURED_GAMES.slice(0, 4);
  return <div className="unified-home entry-scope"><div className="shell">
    <header><Link className="brand" to="/" aria-label="땀방울 원정대 홈"><ForestBrand/></Link>
      <HeaderToolbar label="상단 메뉴"><button className="icon-toolbar-action" type="button" title="접속 QR" aria-haspopup="dialog" aria-controls="access-qr-dialog" onClick={() => { void qr.current?.open(); }}><QrCode aria-hidden="true"/><span>접속 QR</span></button><Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link></HeaderToolbar>
    </header><HomeAccountTabs/>
    <main className="home-entries" aria-labelledby="home-title">
      <div className="entry-head"><h1 id="home-title">무엇을 할까요?</h1><p>세 가지 중에 하나를 골라요.</p></div>
      <div className="entry-grid">
        <section className="entry-card" data-entry="lesson" aria-labelledby="home-entry-lesson"><Play aria-hidden="true"/><h2 id="home-entry-lesson">수업 시작</h2><p>선생님이 오늘 수업을 열어요. TV 한 대로도, 모둠 폰으로도 할 수 있어요.</p><Link className="entry-btn ui-btn ui-btn--lg" to={startTo} data-home-start data-today-link>수업 시작하기</Link></section>
        <section className="entry-card" data-entry="student" aria-labelledby="home-entry-student"><UserRound aria-hidden="true"/><h2 id="home-entry-student">학생 참여</h2><p>모둠 비밀번호를 누르고 내 번호를 골라 들어가요.</p><Link to="/lobby" className="entry-btn ui-btn ui-btn--lg home-student-join" data-home-student>학생 참여하기</Link></section>
        <section className="entry-card" data-entry="find" aria-labelledby="home-entry-find"><Search aria-hidden="true"/><h2 id="home-entry-find">활동·도구 찾기</h2><p>활동을 둘러보거나 타이머, 모둠 뽑기 같은 수업 도구를 써요.</p><Link className="entry-btn ui-btn ui-btn--lg" to="/hub" data-home-hub>찾아보기</Link></section>
      </div>
      <section className="entry-strip home-featured" aria-labelledby="home-featured-title" data-home-shelf={recent.length ? 'recent' : 'featured'}><h2 id="home-featured-title">{recent.length ? '지난번에 한 활동' : '먼저 해 볼 활동'}</h2>
        <ul>{shelf.map(g=><li key={g.type}><Link className="entry-chip" to={`/play/${g.type}`} data-featured-link={g.type}><span aria-hidden="true">{g.emoji}</span>{g.name}</Link></li>)}</ul>
        <Link className="entry-strip-more" to="/hub">추천 활동 {FEATURED_GAMES.length}개 모두 보기 →</Link>
      </section>
      {favorites.length>0&&<section className="entry-strip home-favorites" aria-labelledby="home-favorites-title"><h2 id="home-favorites-title">★ 즐겨찾기</h2>
        <ul>{favorites.map(g=><li key={g.type}><Link className="entry-chip" to={`/play/${g.type}`} data-favorite-link={g.type}><span aria-hidden="true">{g.emoji}</span>{g.name}</Link></li>)}</ul>
      </section>}
    </main>
    <footer><p>작은 움직임이, 함께하는 즐거움으로.</p><nav aria-label="도움말"><Link to="/demo">처음이라면? 예시로 둘러보기 ↗</Link><Link to="/teacher/manage">선생님 로그인 · 내 수업</Link><Link to="/privacy">개인정보 안내</Link></nav><p className="ys-credit">© 2026 엽쌤. All rights reserved. · <a href="https://gmlduqzhd123-lab.github.io/YScode/">엽쌤의 다른 앱 보기 →</a></p></footer>
  </div><AccessQrDialog dialogRef={qr}/></div>;
}
