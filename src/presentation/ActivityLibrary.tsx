import {TeacherGuidePanel} from './components/TeacherGuidePanel';
import { ActivityReviewRecord } from './components/ActivityReviewRecord';
import {variantsFor} from '../domain/gameLifecycle';
import {PHONE_CATEGORIES,PHONE_PLAYS,PHONE_PLAY_BY_ID} from '../domain/phonePlayCatalog';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {matchesActivitySearch} from '../domain/activitySearch';
import { AVAILABLE_GAMES as GAMES, type GameDef } from '../domain/gamesData';
import { CORE_ACTIVITIES, SIMILAR_TO, SOLO_ACTIVITIES, isMovementActivity, shelfLabel } from '../domain/activityShelves';
import { isQuestId } from '../domain/movementQuests';
import { FIT_PEOPLE, FIT_SPACES, FIT_TIMES, activityFit, matchesFit, parseFitPeople, parseFitSpace, parseFitTime, situationBadges, type FitFilter } from '../domain/activityFit';
import { similarSuggestions } from '../domain/activitySearch';
import { activityGroup, activityIcon } from '../domain/activityGroups';
import { gradeLabel } from '../domain/glossary';
import { useActivityFavorites } from '../application/useActivityFavorites';
import { activityDetail, finishLine } from './activityDetail';
import { FlowShell } from './FlowShell';
import {PhonePlayIcon} from './components/PhonePlayIcon';
// 데이터에 있는 공간만 고를 수 있게 한다. 고르면 항상 0개가 나오는 선택지를 만들지 않는다.
const SPACE_ORDER=['제자리','두 걸음','넓은 공간'] as const;
import './ActivityLibrary.css';
const purposes = ['함께 협동해요', '몸을 움직여요', '리듬을 표현해요'] as const;
const FIT_KEYS=['where','who','minutes'] as const;

/** 카드 상세: 규칙 3줄 / 준비 / 안전 / 쉽게·어렵게·앉아서 순서로 늘 같은 자리에 보여 준다. */
function ActivityDetails({game:g,solo}:{game:GameDef;solo:boolean}){
 const d=activityDetail(g);
 return <details><summary>규칙·안전·교육과정 보기</summary>
  <section className="activity-detail" aria-label={`${g.name} 규칙과 준비`}>
   <h4>규칙</h4><ol>{d.rules.map(r=><li key={r}>{r}</li>)}</ol>
   <h4>준비</h4>{d.prepare.length?<ul>{d.prepare.map(p=><li key={p}>{p}</li>)}</ul>:<p>따로 준비할 것이 없어요.</p>}
   <h4>안전</h4>{d.safety.length?<ul>{d.safety.map(s=><li key={s}>{s}</li>)}</ul>:<p>실제 공간과 기기를 선생님과 확인해요.</p>}
   {d.adapt.length>0&&<><h4>쉽게 · 어렵게 · 앉아서</h4><dl className="activity-adapt">{d.adapt.map(a=><div key={a.label}><dt>{a.label}</dt><dd>{a.text}</dd></div>)}</dl></>}
  </section>
  {!solo&&<TeacherGuidePanel game={g}/>}
  <p className="small">{g.grades.map(gradeLabel).join(' · ')} / {g.devices.join(' · ')}</p>
  <ActivityReviewRecord game={g}/>
 </details>;
}

/** exclude에 맞는 활동은 목록에서 뺀다(예: 수업 중에는 고를 수 없는 대표 원정). */
export function ActivityPicker({ onSelect, solo = false, exclude }: { onSelect?: (game: GameDef) => void; solo?: boolean; exclude?: (game: GameDef) => boolean }) {
  const [params,setParams] = useSearchParams();
  const phoneOnly=params.get('collection')==='phone';
  // 준비물 없는 놀이의 인원·시간은 위의 '몇 명 · 몇 분' 조건이 맡는다(같은 질문을 두 번 묻지 않게).
  const phoneCategory=params.get('category')||'전체',intensity=params.get('intensity')||'전체',space=params.get('space')||'전체';
  // 어디서 · 몇 명 · 몇 분: 모든 활동에 쓰는 공통 조건(주소에 남아 새로고침해도 그대로).
  // 주소 값은 고를 수 있는 값으로 바꿔 읽는다. 맞지 않는 값은 '전체'(예: ?where=체육관 → 체육관·강당, ?where=gym2 → 전체).
  // 예전 칩 '교실에서 해요'(?purpose=)는 '어디서: 교실'로 이어 준다.
  const legacyClassroom=params.get('purpose')==='교실에서 해요';
  const fit:FitFilter={space:legacyClassroom&&!params.get('where')?FIT_SPACES[0]:parseFitSpace(params.get('where')),people:parseFitPeople(params.get('who'),solo?['혼자']:FIT_PEOPLE),time:parseFitTime(params.get('minutes'))};
  const fitActive=fit.space!=='전체'||fit.people!=='전체'||fit.time!=='전체';
  const togglePhone=()=>{const next=new URLSearchParams(params);if(phoneOnly){['collection','category','people','time','intensity','space'].forEach(k=>next.delete(k));}else next.set('collection','phone');setParams(next,{replace:true});setLimit(12);};
  const location=useLocation();
  const {isFavorite,toggleFavorite}=useActivityFavorites();
  const [domain, setDomain] = useState(() => ['운동','스포츠','표현'].includes(params.get('domain') ?? '') ? params.get('domain')! : '전체');
  // 지금 있는 목적 칩만 받는다. 모르는 값(예전 북마크)은 무시한다.
  const [purpose, setPurpose] = useState(()=>{const raw=params.get('purpose')||'';return (purposes as readonly string[]).includes(raw)?raw:'';}); const [query, setQuery] = useState(()=>params.get('q')||'');
  const [all, setAll] = useState(false); const [limit, setLimit] = useState(6); const [showSimilar, setShowSimilar] = useState(false);
  const [grade, setGrade] = useState(()=>params.get('grade')||'전체'); const [device, setDevice] = useState(()=>params.get('device')||'전체');
  const updateFilter=(key:string,value:string)=>{const next=new URLSearchParams(params);if(!value||value==='전체')next.delete(key);else next.set(key,value);setParams(next,{replace:true});setLimit(6);};
  const clearFilters=()=>{setDomain('전체');setPurpose('');setQuery('');setGrade('전체');setDevice('전체');const next=new URLSearchParams(params);for(const key of ['domain','purpose','q','grade','device','collection','category','people','time','intensity','space',...FIT_KEYS])next.delete(key);setParams(next,{replace:true});setLimit(6);};
  const playHref=(id:string)=>`${solo?'/solo/play/':'/play/'}${id}?${new URLSearchParams({returnTo:location.pathname+location.search})}`;
  const isFiltered = phoneOnly || fitActive || domain !== '전체' || !!purpose || !!query || grade !== '전체' || device !== '전체';
  // Teachers see the core shelf first. Near-duplicates stay reachable by name search, by link and with one tap.
  const hideSimilar = !solo && !showSimilar && !query;
  const pool = solo ? SOLO_ACTIVITIES : all || isFiltered ? GAMES : CORE_ACTIVITIES;
  const source = exclude ? pool.filter(g => !exclude(g)) : pool;
  const matched = source.filter(g => {const p=PHONE_PLAY_BY_ID.get(g.type);return matchesFit(g,fit)&&(!phoneOnly||!!p&&(phoneCategory==='전체'||p.category===phoneCategory)&&(intensity==='전체'||p.intensity===intensity)&&(space==='전체'||p.space===space))&&(domain === '전체' || g.domain === domain) && matchesActivitySearch(g,query) && (grade === '전체' || g.grades.some(v => v === grade)) && (device === '전체' || g.devices.some(v => v === device)) && (!purpose || (purpose === purposes[0] ? g.playMode === '협동' : purpose === purposes[1] ? isMovementActivity(g) : g.domain === '표현'));});
  const games = hideSimilar ? matched.filter(g => !SIMILAR_TO.has(g.type)) : matched;
  const hiddenSimilar = matched.length - games.length;
  const suggestions = !games.length && query ? similarSuggestions(query, exclude ? source : pool) : {games:[],sports:[],reason:'',length:0};
  const displayed = games.slice(0, solo || !(all || isFiltered) ? Math.max(12,limit) : limit);
  const fitOptions=[['where','어디서',fit.space,FIT_SPACES],['who','몇 명이',fit.people,solo?(['혼자'] as const):FIT_PEOPLE],['minutes','몇 분',fit.time,FIT_TIMES]] as const;
  return <>
    <fieldset className="activity-fit" aria-label="어디서 · 몇 명 · 몇 분">
      <legend>어디서 · 몇 명 · 몇 분</legend>
      {fitOptions.map(([key,label,value,options])=><label key={key}>{label}<select aria-label={label} value={value} onChange={e=>updateFilter(key,e.target.value)}><option>전체</option>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}
      <label className="activity-fit-search">활동 찾기<input type="search" placeholder="이름 · 장소 · 종목 · 예전 이름" value={query} onChange={e => { setQuery(e.target.value);updateFilter('q',e.target.value); }}/></label>
    </fieldset>
    <div className="chips" aria-label="활동 목적">{purposes.filter(p=>!solo||p!==purposes[0]).map(p => <button key={p} aria-pressed={purpose === p} onClick={() => { const value=p===purpose?'':p;setPurpose(value);updateFilter('purpose',value); }}>{p}</button>)}<button aria-pressed={phoneOnly} onClick={togglePhone}>📱 준비물 없는 놀이만 ({solo?SOLO_ACTIVITIES.filter(g=>PHONE_PLAY_BY_ID.has(g.type)).length:PHONE_PLAYS.length})</button></div>
    {phoneOnly&&<fieldset className="phone-filter-grid"><legend>준비물 없는 놀이 고르기</legend>{([
      ['category','놀이 분류',phoneCategory,['전체',...PHONE_CATEGORIES]],['intensity','활동 강도',intensity,['전체','낮음','보통']],['space','필요 공간',space,['전체',...SPACE_ORDER.filter(v=>PHONE_PLAYS.some(p=>p.space===v))]],
    ] as const).map(([key,label,value,options])=><label key={key}>{label}<select aria-label={label} value={value} onChange={e=>updateFilter(key,e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}<p>폰은 내려놓고 움직여요. 스마트폰 1대를 함께 쓰거나, TV에 띄워 반 전체가 해요.</p></fieldset>}
    <div className="activity-more-filters"><label>활동 영역<select aria-label="활동 영역" value={domain} onChange={e => { setDomain(e.target.value);updateFilter('domain',e.target.value); }}>{['전체','운동','스포츠','표현'].map(v => <option key={v}>{v}</option>)}</select></label>
    <details><summary>학년·기기로 좁혀 보기</summary><div className="grid" style={{marginTop:16}}><label>학년<select value={grade} onChange={e => {setGrade(e.target.value);updateFilter('grade',e.target.value);}}>{['전체','1~2학년','3~4학년군','5~6학년군'].map(v => <option key={v} value={v}>{gradeLabel(v)}</option>)}</select></label><label>사용 기기<select value={device} onChange={e => {setDevice(e.target.value);updateFilter('device',e.target.value);}}>{['전체','스마트폰','태블릿 PC','데스크톱 PC'].map(v => <option key={v}>{v}</option>)}</select></label></div></details></div>
    {isFiltered&&<button style={{marginTop:4}} onClick={clearFilters}>검색·조건 초기화</button>}
    <div className="inline-title" style={{margin:'24px 0 16px'}}><h2>{solo ? '혼자 할 수 있는 활동' : !all && !isFiltered ? `수업에 바로 쓰기 좋은 핵심 활동 ${source.length}개` : '조건에 맞는 활동'}</h2><span className="muted small">{games.length}개 중 {displayed.length}개 표시{hiddenSimilar>0&&<> · 비슷한 활동 {hiddenSimilar}개를 합치면 모두 {matched.length}개</>}</span></div>
    <div className="grid three">{displayed.map(g => {const group=activityGroup(g);return <article className="card catalog-card" data-game-card={g.type} key={g.type}>
      <div className="activity-card-top"><span className="activity-card-icon" aria-hidden="true">{PHONE_PLAY_BY_ID.has(g.type)?<PhonePlayIcon gameType={g.type}/>:activityIcon(g)}</span>
       <button type="button" className="activity-fav" aria-pressed={isFavorite(g.type)} aria-label={`${g.name} 즐겨찾기`} onClick={()=>toggleFavorite(g.type)}>{isFavorite(g.type)?'★':'☆'}</button></div>
      <p className="activity-situation" data-situation>{situationBadges(g,fit).map(b=><span key={b}>{b}</span>)}</p>
      <h3>{g.name}</h3>
      <p className="activity-finish"><strong>이렇게 하면 끝나요</strong> · {finishLine(g)}</p>
      <p className="muted">{g.desc}</p>
      <p className="activity-tags"><span className="pill">{group.icon} {group.label}</span>{isQuestId(g.type) && <span className="pill">연습부터 차근차근</span>}{!solo&&shelfLabel(g.type)&&<span className="pill" data-shelf-note>{shelfLabel(g.type)}</span>}{variantsFor(g.type).length>0&&<span className="pill">다른 놀이 방법 {variantsFor(g.type).length}개</span>}</p>
      {g.recommendedDevice&&<p className="small">{activityFit(g).wholeClass?'화면: TV·전자칠판 1대에 띄워 반 전체가 봐요(없으면 '+g.recommendedDevice+' 1대를 모두가 보이게 세워 둬요)':`기기: ${g.recommendedDevice} 1대를 세워 두고 해요`}</p>}
      <ActivityDetails game={g} solo={solo}/>
      <div className="card-action">{onSelect ? <button className="primary button-wide" onClick={() => onSelect(g)}>이 활동 선택</button> : <><Link className="primary button-wide" to={playHref(g.type)}>{solo ? '체험하기' : '활동 열기'}</Link>{!solo&&<Link className="secondary button-wide" style={{marginTop:8}} to={`/teacher/setup?game=${g.type}`}>이 활동으로 수업 준비</Link>}</>}</div></article>;})}</div>
    {!games.length && <div role="status" className="notice"><p>맞는 활동이 없어요. {fitActive?'‘어디서 · 몇 명 · 몇 분’ 가운데 하나를 ‘전체’로 바꿔 보세요.':'검색어나 조건을 바꿔 보세요.'}</p>
      {query&&<><p>{suggestions.reason}</p>{suggestions.length>0&&<ul className="activity-suggestions" aria-label="비슷한 활동">{suggestions.games.map(s=><li key={s.type}><Link to={playHref(s.type)}>{s.name}</Link></li>)}{!solo&&suggestions.sports.map(s=><li key={s.id}><Link to={`/sports/${s.id}`}>{s.name}</Link></li>)}</ul>}</>}
      {isFiltered&&<button type="button" onClick={clearFilters}>조건 모두 지우기</button>}</div>}
    {hiddenSimilar>0&&<p className="notice" style={{marginTop:20}}>비슷한 활동 {hiddenSimilar}개는 대표 활동 하나로 묶어 숨겼어요. <button onClick={()=>setShowSimilar(true)}>비슷한 활동도 모두 보기</button></p>}
    {displayed.length < games.length && <button style={{marginTop:20}} onClick={() => setLimit(displayed.length + 12)}>활동 더 보기</button>}
    {!solo && !all && !isFiltered && <button style={{marginTop:20}} onClick={() => { setAll(true); setLimit(24); }}>전체 활동 목록 보기 ({exclude ? GAMES.filter(g => !exclude(g)).length : GAMES.length}개)</button>}
  </>;
}
export function ActivityLibrary({ solo = false }: { solo?: boolean }) { return <FlowShell utilities className={solo ? 'solo-library' : ''}><section className="activity-library-head"><h1>{solo ? '혼자 할 활동 고르기' : '오늘 할 활동 고르기'}</h1><p className="forest-lead">{solo ? `학생 정보 입력 없이, 혼자 할 수 있는 ${SOLO_ACTIVITIES.length}개 활동이에요.` : `어디서 · 몇 명 · 몇 분을 고르면 맞는 활동만 보여요. 모두 ${GAMES.length}개예요.`}</p><nav className="forest-hero-actions" aria-label="활동 기록과 수업">{!solo&&<Link className="primary" to="/teacher">수업 준비 시작</Link>}<Link to="/records">내 활동 기록</Link>{!solo&&<Link to="/hub/tools">기록·즐겨찾기</Link>}</nav></section><ActivityPicker solo={solo}/></FlowShell>; }
