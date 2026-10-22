import {variantsFor} from '../domain/gameLifecycle';
import {PHONE_CATEGORIES,PHONE_PLAYS,PHONE_PLAY_BY_ID} from '../domain/phonePlayCatalog';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {matchesActivitySearch} from '../domain/activitySearch';
import { AVAILABLE_GAMES as GAMES, type GameDef } from '../domain/gamesData';
import { FEATURED_GAMES } from '../domain/featuredGames';
import { isQuestId } from '../domain/movementQuests';
import { LESSON_GAME_CATALOG } from '../data/lessonGameCatalog';
import { FlowShell } from './FlowShell';
import {PhonePlayIcon} from './components/PhonePlayIcon';
import './ActivityLibrary.css';
const purposes = ['함께 협동해요', '몸을 움직여요', '교실에서 해요', '리듬을 표현해요'] as const;
export function ActivityPicker({ onSelect, solo = false }: { onSelect?: (game: GameDef) => void; solo?: boolean }) {
  const [params,setParams] = useSearchParams();
  const phoneOnly=params.get('collection')==='phone';
  const phoneCategory=params.get('category')||'전체',people=params.get('people')||'전체',time=params.get('time')||'전체',intensity=params.get('intensity')||'전체',space=params.get('space')||'전체';
  const togglePhone=()=>{const next=new URLSearchParams(params);if(phoneOnly){['collection','category','people','time','intensity','space'].forEach(k=>next.delete(k));}else next.set('collection','phone');setParams(next,{replace:true});setLimit(12);};
  const location=useLocation();
  const [domain, setDomain] = useState(() => ['운동','스포츠','표현'].includes(params.get('domain') ?? '') ? params.get('domain')! : '전체');
  const [purpose, setPurpose] = useState(()=>params.get('purpose')||''); const [query, setQuery] = useState(()=>params.get('q')||'');
  const [all, setAll] = useState(false); const [limit, setLimit] = useState(6);
  const [grade, setGrade] = useState(()=>params.get('grade')||'전체'); const [device, setDevice] = useState(()=>params.get('device')||'전체');
  const updateFilter=(key:string,value:string)=>{const next=new URLSearchParams(params);if(!value||value==='전체')next.delete(key);else next.set(key,value);setParams(next,{replace:true});setLimit(6);};
  const clearFilters=()=>{setDomain('전체');setPurpose('');setQuery('');setGrade('전체');setDevice('전체');const next=new URLSearchParams(params);for(const key of ['domain','purpose','q','grade','device','collection','category','people','time','intensity','space'])next.delete(key);setParams(next,{replace:true});setLimit(6);};
  const playHref=(id:string)=>`${solo?'/solo/play/':'/play/'}${id}?${new URLSearchParams({returnTo:location.pathname+location.search})}`;
  const isFiltered = phoneOnly || domain !== '전체' || !!purpose || !!query || grade !== '전체' || device !== '전체';
  const source = solo || all || isFiltered ? GAMES : FEATURED_GAMES;
  const games = source.filter(g => {const p=PHONE_PLAY_BY_ID.get(g.type);return (!phoneOnly||!!p&&(phoneCategory==='전체'||p.category===phoneCategory)&&(people==='전체'||p.players===people)&&(time==='전체'||(time==='5분 이하'?p.minutes<=5:p.minutes>5))&&(intensity==='전체'||p.intensity===intensity)&&(space==='전체'||p.space===space))&&(domain === '전체' || g.domain === domain) && matchesActivitySearch(g,query) && (grade === '전체' || g.grades.some(v => v === grade)) && (device === '전체' || g.devices.some(v => v === device)) && (!purpose || (purpose === purposes[0] ? g.playMode === '협동' : purpose === purposes[1] ? g.physicalActivity === true : purpose === purposes[2] ? LESSON_GAME_CATALOG.some(l => l.id === g.type && l.space.includes('교실')) : g.domain === '표현'));});
  const displayed = games.slice(0, solo ? Math.max(12,limit) : all || isFiltered ? limit : FEATURED_GAMES.length);
  return <><section className="phone-collection" aria-label="스마트폰만으로 하는 놀이"><div><span className="pill">별도 준비물 없음 · {PHONE_PLAYS.length}가지</span><h2>스마트폰만 있으면, 몸 놀이 시작!</h2><p>폰은 내려놓고 움직여요. 혼자·짝·모둠, 필요한 공간에 맞춰 골라요.</p></div><button className={phoneOnly?'secondary':'primary'} aria-pressed={phoneOnly} onClick={togglePhone}>{phoneOnly?'전체 활동으로':'스마트폰만으로 하는 놀이 보기'}</button></section>
    {phoneOnly&&<fieldset className="phone-filter-grid"><legend>준비물 없는 놀이 고르기</legend>{([
      ['category','놀이 분류',phoneCategory,['전체',...PHONE_CATEGORIES]],['people','참여 인원',people,['전체','혼자','짝','모둠']],['time','소요 시간',time,['전체','5분 이하','6분 이상']],['intensity','활동 강도',intensity,['전체','낮음','보통']],['space','필요 공간',space,['전체','제자리','두 걸음','넓은 공간']],
    ] as const).map(([key,label,value,options])=><label key={key}>{label}<select aria-label={label} value={value} onChange={e=>updateFilter(key,e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}<p>모든 놀이는 스마트폰 1대 공유로 가능해요. 짝 2명 · 모둠 3~6명이 기본이에요.</p></fieldset>}
    <div className="chips" aria-label="활동 목적">{purposes.map(p => <button key={p} aria-pressed={purpose === p} onClick={() => { const value=p===purpose?'':p;setPurpose(value);updateFilter('purpose',value); }}>{p}</button>)}</div>
    <label>활동 영역<select aria-label="활동 영역" value={domain} onChange={e => { setDomain(e.target.value);updateFilter('domain',e.target.value); }}>{['전체','운동','스포츠','표현'].map(v => <option key={v}>{v}</option>)}</select></label>
    <label>어떤 활동을 찾으세요?<input type="search" placeholder="활동 이름으로 검색" value={query} onChange={e => { setQuery(e.target.value);updateFilter('q',e.target.value); }}/></label>
    <details><summary>학년·기기로 좁혀 보기</summary><div className="grid" style={{marginTop:16}}><label>학년<select value={grade} onChange={e => {setGrade(e.target.value);updateFilter('grade',e.target.value);}}>{['전체','1~2학년','3~4학년군','5~6학년군'].map(v => <option key={v} value={v}>{v === '1~2학년' ? '1~2학년군' : v}</option>)}</select></label><label>사용 기기<select value={device} onChange={e => {setDevice(e.target.value);updateFilter('device',e.target.value);}}>{['전체','스마트폰','태블릿 PC','데스크톱 PC'].map(v => <option key={v}>{v}</option>)}</select></label></div></details>
    {isFiltered&&<button onClick={clearFilters}>검색·조건 초기화</button>}
    <div className="inline-title" style={{margin:'28px 0 16px'}}><h2>{solo ? '모든 게임' : !all && !isFiltered ? `먼저 해 볼 대표 활동 ${FEATURED_GAMES.length}개` : '조건에 맞는 활동'}</h2><span className="muted small">{games.length}개 중 {displayed.length}개 표시</span></div>
    <div className="grid three">{displayed.map(g => <article className="card catalog-card" data-game-card={g.type} key={g.type}><span className="activity-card-icon" aria-hidden="true">{PHONE_PLAY_BY_ID.has(g.type)?<PhonePlayIcon gameType={g.type}/>:g.emoji}</span><h3>{g.name}</h3>{isQuestId(g.type) && <span className="pill">새 몸 미션 · 연습부터 차근차근</span>}{g.recommendedDevice&&<p className="small">{g.recommendedDevice} 거치 권장 · {g.activityType} 활동</p>}<p className="muted">{g.desc}</p>{variantsFor(g.type).length>0&&<span className="pill">선택 코스 {variantsFor(g.type).length}개</span>}<span className="pill">{g.durationMinutes ? `약 ${g.durationMinutes}분` : '시간은 교사 조절'}</span><p className="small">준비물: {g.equipment?.join(', ') || '활동 안내에서 확인'}</p>
      <details><summary>규칙·안전·교육과정 보기</summary><p><strong>활동 방법</strong> · {g.desc}</p><p><strong>완료 기준</strong> · {solo ? '게임을 끝내고 결과 화면에서 점수를 확인합니다.' : '게임을 끝내고 결과 화면을 확인합니다. 참여 중인 수업방이 있으면 완료 즉시 모둠 점수에 반영됩니다.'}</p><p>{g.grades.map(grade=>grade === '1~2학년' ? '1~2학년군' : grade).join(' · ')} / {g.devices.join(' · ')}</p><p>{g.achievement.title}</p><p>{g.achievement.desc}</p><h3>활동 전 안전 확인</h3>{(g.safetyTips?.length || LESSON_GAME_CATALOG.find(l=>l.id===g.type)?.safetyNotes.length) ? <ul>{[...new Set([...(g.safetyTips||[]),...(LESSON_GAME_CATALOG.find(l=>l.id===g.type)?.safetyNotes||[])])].map(s => <li key={s}>{s}</li>)}</ul> : <p>활동 안내와 실제 공간·기기를 선생님과 확인하세요.</p>}<p>참여 의사와 주변 공간을 확인한 후 활동을 시작하세요.</p></details>
      <div className="card-action">{onSelect ? <button className="primary button-wide" onClick={() => onSelect(g)}>이 활동 선택</button> : <><Link className="primary button-wide" to={playHref(g.type)}>{solo ? '체험하기' : '활동 열기'}</Link>{!solo&&<Link className="secondary button-wide" style={{marginTop:8}} to={`/teacher/setup?game=${g.type}`}>이 활동으로 수업 준비</Link>}</>}</div></article>)}</div>
    {!games.length && <p role="status" className="notice">맞는 활동이 없어요. 검색어나 조건을 바꿔 보세요.</p>}
    {displayed.length < games.length && <button style={{marginTop:20}} onClick={() => { setAll(true); setLimit(displayed.length + 12); }}>활동 더 보기</button>}
    {!solo && !all && !isFiltered && <button style={{marginTop:20}} onClick={() => { setAll(true); setLimit(24); }}>전체 활동 목록 보기 ({GAMES.length}개)</button>}
  </>;
}
export function ActivityLibrary({ solo = false }: { solo?: boolean }) { return <FlowShell utilities className={solo ? 'solo-library' : ''}><p className="eyebrow">{solo ? '수업 코드 없이 자유롭게' : '활동 찾기'}</p><h1>{solo ? '혼자 해보기' : '어떤 활동을 해 볼까요?'}</h1><p className="muted">{solo ? `PIN이나 학생 정보 입력 없이 ${GAMES.length}개 게임을 골라 체험해요. 시작 전 활동 규칙과 주변 공간을 확인하세요.` : '목적을 고르거나 이름으로 찾아보세요. 기기를 쓰기 전 활동 규칙을 확인해요.'}</p><nav className="row" aria-label="활동 기록과 수업"><Link className="secondary" to="/records">내 활동 기록</Link>{!solo&&<Link className="secondary" to="/teacher">교사 수업 준비</Link>}</nav><ActivityPicker solo={solo}/>{!solo && <details><summary>더 많은 도구</summary><p>즐겨찾기·기록·테마 모드·스테이션·음악 등 기존 도구를 사용할 수 있어요.</p><Link className="secondary" to="/hub/tools">전체 도구 열기</Link></details>}</FlowShell>; }
