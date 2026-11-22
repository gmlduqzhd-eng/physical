import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ENCYCLOPEDIA } from '../../domain/encyclopedia';
import { SCREEN } from '../../domain/glossary';
import { FeaturedExperiences } from './FeaturedExperiences';
import '../EntryCards.css';

/**
 * 더 찾기: 예전에 처음 화면의 '더 보기'에 있던 입구(수업 도구·체육수업 대백과·혼자 하기·원리 체험)를
 * '활동·도구 찾기'(활동 고르기) 아래에 모은다. 처음 화면에는 입구 세 개만 남긴다.
 * 예전 주소의 자리표(#library-title, #encyclopedia-title, #featured-play-title)는 여기로 내려온다.
 */
export function HubMoreSections() {
  useEffect(() => {
    const reveal = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = id ? document.getElementById(id) : null;
      // 활동 목록이 다 그려진 뒤 내려가야 자리가 맞는다.
      if (target?.closest('[data-hub-more]')) requestAnimationFrame(() => requestAnimationFrame(() => target.scrollIntoView({ block: 'start' })));
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  return <section className="hub-more entry-scope" aria-labelledby="library-title" data-hub-more>
    <h2 id="library-title">더 찾기</h2>
    <div><h3 id="hub-tools-title">도구와 다른 방법</h3>
      <nav className="hub-more-grid" aria-labelledby="hub-tools-title">
        <Link to="/tools" data-hub-more-link="tools"><span aria-hidden="true">🧰</span><strong>{SCREEN.tools}</strong><small>타이머 · 모둠 나누기 · 번호 뽑기 · 대진표</small></Link>
        <Link to="/hub?collection=phone" data-hub-more-link="phone"><span aria-hidden="true">🙌</span><strong>준비물 없는 놀이</strong><small>TV에 띄워 반 전체가 함께</small></Link>
        <Link to="/expeditions" data-hub-more-link="expeditions"><span aria-hidden="true">🧭</span><strong>대표 원정</strong><small>비밀지도 · 바디루프 · 학급 보스</small></Link>
        <Link to="/solo" data-hub-more-link="solo"><span aria-hidden="true">🙂</span><strong>혼자 해보기</strong><small>수업 비밀번호 없이 바로 체험해요</small></Link>
        <Link to="/together" data-hub-more-link="together"><span aria-hidden="true">🖥️</span><strong>공용 화면 한 대로 시작</strong><small>로그인 없이 함께 보는 화면 수업</small></Link>
        <Link to="/hub/extras" data-hub-more-link="extras"><span aria-hidden="true">⭐</span><strong>기록 · 즐겨찾기</strong><small>내 기록과 즐겨찾기한 활동</small></Link>
      </nav>
    </div>
    <div><h3 id="encyclopedia-title">체육수업 대백과</h3>
      <nav className="hub-more-grid" aria-labelledby="encyclopedia-title">{ENCYCLOPEDIA.map(entry => <Link key={entry.id} to={entry.to} data-encyclopedia={entry.id}><span aria-hidden="true">{entry.icon}</span><strong>{entry.title}</strong><small>{entry.summary}</small></Link>)}</nav>
    </div>
    <FeaturedExperiences />
  </section>;
}
