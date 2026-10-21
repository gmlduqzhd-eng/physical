import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GAMES, type GameDef } from '../domain/gamesData';
import { FEATURED_GAMES } from '../domain/featuredGames';
import { LESSON_GAME_CATALOG } from '../data/lessonGameCatalog';
import { FlowShell } from './FlowShell';
import './ActivityLibrary.css';
const purposes = ['함께 협동해요', '몸을 움직여요', '교실에서 해요', '리듬을 표현해요'] as const;
export function ActivityPicker({ onSelect, solo = false }: { onSelect?: (game: GameDef) => void; solo?: boolean }) {
  const [params] = useSearchParams();
  const [domain, setDomain] = useState(() => ['운동','스포츠','표현'].includes(params.get('domain') ?? '') ? params.get('domain')! : '전체');
  const [purpose, setPurpose] = useState(''); const [query, setQuery] = useState('');
  const [all, setAll] = useState(false); const [limit, setLimit] = useState(6);
  const [grade, setGrade] = useState('전체'); const [device, setDevice] = useState('전체');
  const isFiltered = domain !== '전체' || !!purpose || !!query || grade !== '전체' || device !== '전체';
  const source = solo || all || isFiltered ? GAMES : FEATURED_GAMES;
  const games = source.filter(g => (domain === '전체' || g.domain === domain) && (!query || (g.name + g.desc).includes(query)) && (grade === '전체' || g.grades.some(v => v === grade)) && (device === '전체' || g.devices.some(v => v === device)) && (!purpose || (purpose === purposes[0] ? g.playMode === '협동' : purpose === purposes[1] ? g.physicalActivity === true : purpose === purposes[2] ? LESSON_GAME_CATALOG.some(l => l.id === g.type && l.space.includes('교실')) : g.domain === '표현')));
  const displayed = solo ? games : games.slice(0, all || isFiltered ? limit : FEATURED_GAMES.length);
  return <><div className="chips" aria-label="활동 목적">{purposes.map(p => <button key={p} aria-pressed={purpose === p} onClick={() => { setPurpose(p === purpose ? '' : p); setLimit(6); }}>{p}</button>)}</div>
    <label>활동 영역<select aria-label="활동 영역" value={domain} onChange={e => { setDomain(e.target.value); setLimit(6); }}>{['전체','운동','스포츠','표현'].map(v => <option key={v}>{v}</option>)}</select></label>
    <label>어떤 활동을 찾으세요?<input type="search" placeholder="활동 이름으로 검색" value={query} onChange={e => { setQuery(e.target.value); setLimit(6); }}/></label>
    <details><summary>학년·기기로 좁혀 보기</summary><div className="grid" style={{marginTop:16}}><label>학년<select value={grade} onChange={e => setGrade(e.target.value)}>{['전체','1~2학년','3~4학년군','5~6학년군'].map(v => <option key={v} value={v}>{v === '1~2학년' ? '1~2학년군' : v}</option>)}</select></label><label>사용 기기<select value={device} onChange={e => setDevice(e.target.value)}>{['전체','스마트폰','태블릿 PC','데스크톱 PC'].map(v => <option key={v}>{v}</option>)}</select></label></div></details>
    <div className="inline-title" style={{margin:'28px 0 16px'}}><h2>{solo ? '모든 게임' : !all && !isFiltered ? '수업에 바로 쓰기 좋은 대표 활동 11개' : '조건에 맞는 활동'}</h2><span className="muted small">{games.length}개 중 {displayed.length}개 표시</span></div>
    <div className="grid three">{displayed.map(g => <article className="card catalog-card" data-game-card={g.type} key={g.type}><span className="activity-card-icon" aria-hidden="true">{g.emoji}</span><h3>{g.name}</h3>{g.recommendedDevice&&<p className="small">{g.recommendedDevice} 거치 권장 · {g.activityType} 활동</p>}<p className="muted">{g.desc}</p><span className="pill">{g.durationMinutes ? `약 ${g.durationMinutes}분` : '시간은 교사 조절'}</span><p className="small">준비물: {g.equipment?.join(', ') || '활동 안내에서 확인'}</p>
      <details><summary>규칙·안전·교육과정 보기</summary><p><strong>활동 방법</strong> · {g.desc}</p><p><strong>완료 기준</strong> · {solo ? '게임을 끝내고 결과 화면에서 점수를 확인합니다.' : '게임을 끝내고 결과 화면을 확인합니다. 참여 중인 수업방이 있으면 완료 즉시 모둠 점수에 반영됩니다.'}</p><p>{g.grades.map(grade=>grade === '1~2학년' ? '1~2학년군' : grade).join(' · ')} / {g.devices.join(' · ')}</p><p>{g.achievement.title}</p><p>{g.achievement.desc}</p><h3>활동 전 안전 확인</h3>{(g.safetyTips?.length || LESSON_GAME_CATALOG.find(l=>l.id===g.type)?.safetyNotes.length) ? <ul>{[...new Set([...(g.safetyTips||[]),...(LESSON_GAME_CATALOG.find(l=>l.id===g.type)?.safetyNotes||[])])].map(s => <li key={s}>{s}</li>)}</ul> : <p>활동 안내와 실제 공간·기기를 선생님과 확인하세요.</p>}<p>참여 의사와 주변 공간을 확인한 후 활동을 시작하세요.</p></details>
      <div className="card-action">{onSelect ? <button className="primary button-wide" onClick={() => onSelect(g)}>이 활동 선택</button> : <Link className="primary button-wide" to={solo ? `/solo/play/${g.type}` : `/play/${g.type}`}>{solo ? '체험하기' : '활동 열기'}</Link>}</div></article>)}</div>
    {!games.length && <p role="status" className="notice">맞는 활동이 없어요. 검색어나 조건을 바꿔 보세요.</p>}
    {displayed.length < games.length && <button style={{marginTop:20}} onClick={() => { setAll(true); setLimit(displayed.length + 12); }}>활동 더 보기</button>}
    {!solo && !all && !isFiltered && <button style={{marginTop:20}} onClick={() => { setAll(true); setLimit(24); }}>전체 활동 목록 보기 ({GAMES.length}개)</button>}
  </>;
}
export function ActivityLibrary({ solo = false }: { solo?: boolean }) { return <FlowShell utilities className={solo ? 'solo-library' : ''}><p className="eyebrow">{solo ? '수업 코드 없이 자유롭게' : '활동 찾기'}</p><h1>{solo ? '혼자 해보기' : '어떤 활동을 해 볼까요?'}</h1><p className="muted">{solo ? `PIN이나 학생 정보 입력 없이 ${GAMES.length}개 게임을 골라 체험해요. 시작 전 활동 규칙과 주변 공간을 확인하세요.` : '목적을 고르거나 이름으로 찾아보세요. 기기를 쓰기 전 활동 규칙을 확인해요.'}</p><ActivityPicker solo={solo}/>{!solo && <details><summary>더 많은 도구</summary><p>즐겨찾기·기록·테마 모드·스테이션·음악 등 기존 도구를 사용할 수 있어요.</p><Link className="secondary" to="/hub/tools">전체 도구 열기</Link></details>}</FlowShell>; }
