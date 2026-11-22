import {TeacherGuidePanel} from './components/TeacherGuidePanel';
import { ActivityReviewRecord } from './components/ActivityReviewRecord';
import {variantsFor} from '../domain/gameLifecycle';
import {PHONE_CATEGORIES,PHONE_PLAYS,PHONE_PLAY_BY_ID} from '../domain/phonePlayCatalog';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {matchesActivitySearch} from '../domain/activitySearch';
import { AVAILABLE_GAMES as GAMES, type GameDef } from '../domain/gamesData';
import { SOLO_ACTIVITIES, isMovementActivity, shelfLabel } from '../domain/activityShelves';
import { FEATURED_GAMES, featuredFirst, libraryLead, hubPool, includesArchive, isFeatured, mergedInto } from '../domain/featuredGames';
import { isQuestId } from '../domain/movementQuests';
import { isSignatureId } from '../domain/signatureGames';
import { FIT_PEOPLE, FIT_SPACES, FIT_TIMES, activityFit, matchesFit, parseFitPeople, parseFitSpace, parseFitTime, situationBadges, type FitFilter } from '../domain/activityFit';
import { similarSuggestions } from '../domain/activitySearch';
import { activityGroup, activityIcon } from '../domain/activityGroups';
import { gradeLabel } from '../domain/glossary';
import { useActivityFavorites } from '../application/useActivityFavorites';
import { activityDetail, finishLine } from './activityDetail';
import { FlowShell } from './FlowShell';
import {PhonePlayIcon} from './components/PhonePlayIcon';
import {QuickPicks} from './components/QuickPicks';
import {HubMoreSections} from './components/HubMoreSections';

const GRADE_OPTIONS=['1~2학년','3~4학년군','5~6학년군'] as const;
const DEVICE_OPTIONS=['스마트폰','태블릿 PC','데스크톱 PC'] as const;
// 데이터에 있는 공간만 고를 수 있게 한다. 고르면 항상 0개가 나오는 선택지를 만들지 않는다.
const SPACE_ORDER=['제자리','두 걸음','넓은 공간'] as const;
import './ActivityLibrary.css';
const purposes = ['함께 협동해요', '몸을 움직여요', '리듬을 표현해요'] as const;
const FIT_KEYS=['where','who','minutes'] as const;

/** 카드 상세: 규칙 3줄 / 준비 / 안전 / 쉽게·어렵게·앉아서 순서로 늘 같은 자리에 보여 준다. */
function ActivityDetails({game:g,solo}:{game:GameDef;solo:boolean}){
 // 혼자 하기(/solo)에서는 팀 TV 게임으로 이어 주지 않는다.
 const d=activityDetail(g),merged=solo?undefined:mergedInto(g.type);
 return <details><summary>규칙·안전·교육과정 보기</summary>
  <section className="activity-detail" aria-label={`${g.name} 규칙과 준비`}>
   {merged&&<p className="activity-merged" data-merged-into={merged.type}>이 놀이는 <Link to={`${solo?'/solo/play/':'/play/'}${merged.type}`}>{merged.emoji} {merged.name}</Link>의 규칙 카드로도 할 수 있어요.</p>}
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
  // 기본은 대표 게임만. '보관함까지 모두 보기'(?view=all)를 누르면 나머지 활동도 보여 준다.
  const viewAll=params.get('view')==='all';
  // 준비물 없는 놀이의 인원·시간은 위의 '몇 명 · 몇 분' 조건이 맡는다(같은 질문을 두 번 묻지 않게).
  const phoneCategory=params.get('category')||'전체',intensity=params.get('intensity')||'전체',space=params.get('space')||'전체';
  // 어디서 · 몇 명 · 몇 분: 모든 활동에 쓰는 공통 조건(주소에 남아 새로고침해도 그대로).
  // 주소 값은 고를 수 있는 값으로 바꿔 읽는다. 맞지 않는 값은 '전체'(예: ?where=체육관 → 체육관·강당, ?where=gym2 → 전체).
  // 예전 칩 '교실에서 해요'(?purpose=)는 '어디서: 교실'로 이어 준다.
  const legacyClassroom=params.get('purpose')==='교실에서 해요';
  const fit:FitFilter={space:legacyClassroom&&!params.get('where')?FIT_SPACES[0]:parseFitSpace(params.get('where')),people:parseFitPeople(params.get('who'),solo?['혼자']:FIT_PEOPLE),time:parseFitTime(params.get('minutes'))};
  const fitActive=fit.space!=='전체'||fit.people!=='전체'||fit.time!=='전체';
  const togglePhone=()=>{const next=new URLSearchParams(params);if(phoneOnly){['collection','category','people','time','intensity','space'].forEach(k=>next.delete(k));}else next.set('collection','phone');setParams(next,{replace:true});setLimit(PAGE);};
  const location=useLocation();
  const {isFavorite,toggleFavorite}=useActivityFavorites();
  const [domain, setDomain] = useState(() => ['운동','스포츠','표현'].includes(params.get('domain') ?? '') ? params.get('domain')! : '전체');
  // 지금 있는 목적 칩만 받는다. 모르는 값(예전 북마크)은 무시한다.
  const [purpose, setPurpose] = useState(()=>{const raw=params.get('purpose')||'';return (purposes as readonly string[]).includes(raw)?raw:'';}); const [query, setQuery] = useState(()=>params.get('q')||'');
  const PAGE=12; const [limit, setLimit] = useState(PAGE);
  // 주소의 학년·기기 값은 고를 수 있는 값일 때만 쓴다(모르는 값이면 결과가 0개인데 선택 칸은 '전체'로 보이는 일이 없게).
  const [grade, setGrade] = useState(()=>{const raw=params.get('grade')||'';return (GRADE_OPTIONS as readonly string[]).includes(raw)?raw:'전체';}); const [device, setDevice] = useState(()=>{const raw=params.get('device')||'';return (DEVICE_OPTIONS as readonly string[]).includes(raw)?raw:'전체';});
  const updateFilter=(key:string,value:string)=>{const next=new URLSearchParams(params);if(!value||value==='전체')next.delete(key);else next.set(key,value);setParams(next,{replace:true});setLimit(PAGE);};
  const clearFilters=()=>{setDomain('전체');setPurpose('');setQuery('');setGrade('전체');setDevice('전체');const next=new URLSearchParams(params);for(const key of ['domain','purpose','q','grade','device','collection','category','people','time','intensity','space',...FIT_KEYS])next.delete(key);setParams(next,{replace:true});setLimit(PAGE);};
  const setViewAll=(on:boolean)=>{const next=new URLSearchParams(params);if(on)next.set('view','all');else next.delete('view');setParams(next,{replace:true});setLimit(PAGE);};
  const playHref=(id:string)=>`${solo?'/solo/play/':'/play/'}${id}?${new URLSearchParams({returnTo:location.pathname+location.search})}`;
  const moreCount=[phoneOnly,domain!=='전체',!!purpose,grade!=='전체',device!=='전체'].filter(Boolean).length;
  const [moreOpen,setMoreOpen]=useState(moreCount>0);
  // 학년·기기 조건을 갖고 들어왔으면(예: ?grade=) 안쪽 칸도 펼쳐서 무엇을 골랐는지 보이게 한다.
  const [gradeOpen,setGradeOpen]=useState(grade!=='전체'||device!=='전체');
  // 접어 두었을 때도 무엇을 골랐는지 보이도록, 고른 조건을 하나씩 지울 수 있는 칩으로 보여 준다.
  const chosenFilters:{key:string;label:string;clear:()=>void}[]=[
    ...(phoneOnly?[{key:'phone',label:'📱 준비물 없는 놀이',clear:togglePhone}]:[]),
    ...(purpose?[{key:'purpose',label:purpose,clear:()=>{setPurpose('');updateFilter('purpose','');}}]:[]),
    ...(domain!=='전체'?[{key:'domain',label:`영역: ${domain}`,clear:()=>{setDomain('전체');updateFilter('domain','전체');}}]:[]),
    ...(grade!=='전체'?[{key:'grade',label:`학년: ${gradeLabel(grade)}`,clear:()=>{setGrade('전체');updateFilter('grade','전체');}}]:[]),
    ...(device!=='전체'?[{key:'device',label:`기기: ${device}`,clear:()=>{setDevice('전체');updateFilter('device','전체');}}]:[]),
  ];
  const isFiltered = phoneOnly || fitActive || domain !== '전체' || !!purpose || !!query || grade !== '전체' || device !== '전체';
  // 검색어나 '준비물 없는 놀이' 모음은 보관함까지 모두 찾고, 대표 게임을 앞에 둔다.
  const archiveIncluded = !solo && includesArchive({viewAll,query,phoneOnly});
  const pool = solo ? SOLO_ACTIVITIES : hubPool({viewAll,query,phoneOnly});
  const source = exclude ? pool.filter(g => !exclude(g)) : pool;
  const fits = (g:GameDef) => {const p=PHONE_PLAY_BY_ID.get(g.type);return matchesFit(g,fit)&&(!phoneOnly||!!p&&(phoneCategory==='전체'||p.category===phoneCategory)&&(intensity==='전체'||p.intensity===intensity)&&(space==='전체'||p.space===space))&&(domain === '전체' || g.domain === domain) && matchesActivitySearch(g,query) && (grade === '전체' || g.grades.some(v => v === grade)) && (device === '전체' || g.devices.some(v => v === device)) && (!purpose || (purpose === purposes[0] ? g.playMode === '협동' : purpose === purposes[1] ? isMovementActivity(g) : g.domain === '표현'));};
  const matchedRaw = source.filter(fits);
  const matched = solo ? matchedRaw : featuredFirst(matchedRaw);
  // 대표 게임 보기에서 조건에 맞는 보관함 활동이 더 있으면 알려 준다.
  const archiveMore = !solo && !archiveIncluded ? (exclude ? GAMES.filter(g=>!exclude(g)) : GAMES).filter(g=>!isFeatured(g.type)&&fits(g)).length : 0;
  // 화면에 적힌 수와 실제 카드 수가 늘 같도록 비슷한 활동도 묶지 않고 모두 보여 준다(카드에 '비슷한 활동: …' 표시가 붙는다).
  const games = matched;
  const suggestions = !games.length && query ? similarSuggestions(query, exclude ? source : pool) : {games:[],sports:[],reason:'',length:0};
  const displayed = games.slice(0, limit);
  const fitOptions=[['where','어디서',fit.space,FIT_SPACES],['who','몇 명이',fit.people,solo?(['혼자'] as const):FIT_PEOPLE],['minutes','몇 분',fit.time,FIT_TIMES]] as const;
  return <>
    {!solo&&!onSelect&&<QuickPicks returnTo={location.pathname+location.search} className="hub-quick-picks"/>}
    <fieldset className="activity-fit" aria-label="어디서 · 몇 명 · 몇 분">
      <legend>어디서 · 몇 명 · 몇 분</legend>
      {fitOptions.map(([key,label,value,options])=><label key={key}>{label}<select aria-label={label} value={value} onChange={e=>updateFilter(key,e.target.value)}><option>전체</option>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}
      <label className="activity-fit-search">활동 찾기<input type="search" placeholder="이름 · 장소 · 종목 · 예전 이름" value={query} onChange={e => { setQuery(e.target.value);updateFilter('q',e.target.value); }}/></label>
    </fieldset>
    {/* TV 첫 화면에 카드가 보이도록 목적·영역·학년 조건은 접어 둔다. 이미 고른 조건이 있으면 펼쳐서 보여 준다. */}
    <details className="activity-filter-more" open={moreOpen} onToggle={e=>setMoreOpen(e.currentTarget.open)}><summary>조건 더 보기 · 목적 · 영역 · 학년{moreCount>0&&<span className="activity-filter-count"> ({moreCount}개 고름)</span>}</summary>
    <div className="chips" aria-label="활동 목적">{purposes.filter(p=>!solo||p!==purposes[0]).map(p => <button key={p} aria-pressed={purpose === p} onClick={() => { const value=p===purpose?'':p;setPurpose(value);updateFilter('purpose',value); }}>{p}</button>)}<button aria-pressed={phoneOnly} onClick={togglePhone}>📱 준비물 없는 놀이만 ({solo?SOLO_ACTIVITIES.filter(g=>PHONE_PLAY_BY_ID.has(g.type)).length:`${PHONE_PLAYS.length} · 보관함 포함`})</button></div>
    {phoneOnly&&<fieldset className="phone-filter-grid"><legend>준비물 없는 놀이 고르기</legend>{([
      ['category','놀이 분류',phoneCategory,['전체',...PHONE_CATEGORIES]],['intensity','활동 강도',intensity,['전체','낮음','보통']],['space','필요 공간',space,['전체',...SPACE_ORDER.filter(v=>PHONE_PLAYS.some(p=>p.space===v))]],
    ] as const).map(([key,label,value,options])=><label key={key}>{label}<select aria-label={label} value={value} onChange={e=>updateFilter(key,e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}<p>폰은 내려놓고 움직여요. 스마트폰 1대를 함께 쓰거나, TV에 띄워 반 전체가 해요.</p></fieldset>}
    <div className="activity-more-filters"><label>활동 영역<select aria-label="활동 영역" value={domain} onChange={e => { setDomain(e.target.value);updateFilter('domain',e.target.value); }}>{['전체','운동','스포츠','표현'].map(v => <option key={v}>{v}</option>)}</select></label>
    <details open={gradeOpen} onToggle={e=>setGradeOpen(e.currentTarget.open)}><summary>학년·기기로 좁혀 보기</summary><div className="grid" style={{marginTop:16}}><label>학년<select value={grade} onChange={e => {setGrade(e.target.value);updateFilter('grade',e.target.value);}}>{['전체',...GRADE_OPTIONS].map(v => <option key={v} value={v}>{gradeLabel(v)}</option>)}</select></label><label>사용 기기<select value={device} onChange={e => {setDevice(e.target.value);updateFilter('device',e.target.value);}}>{['전체',...DEVICE_OPTIONS].map(v => <option key={v}>{v}</option>)}</select></label></div></details></div>
    </details>
    {!moreOpen&&chosenFilters.length>0&&<ul className="activity-filter-chosen" aria-label="고른 조건">{chosenFilters.map(f=><li key={f.key}><button type="button" onClick={f.clear} aria-label={`${f.label} 조건 지우기`}>{f.label} <span aria-hidden="true">✕</span></button></li>)}</ul>}
    {isFiltered&&<button style={{marginTop:4}} onClick={clearFilters}>검색·조건 초기화</button>}
    <div className="inline-title" style={{margin:'14px 0 12px'}}><h2>{solo ? '혼자 할 수 있는 활동' : !archiveIncluded ? (isFiltered ? '조건에 맞는 추천 활동' : `먼저 해 보기 좋은 추천 활동 ${source.length}개`) : query ? '찾은 활동 · 추천 활동 먼저' : phoneOnly ? `준비물 없는 놀이 ${matched.length}개 · 보관함까지 모두` : isFiltered ? `조건에 맞는 활동 ${matched.length}개` : `보관함까지 모든 활동 ${matched.length}개`}</h2>{games.length>0&&<span className="muted small" data-list-count role="status" aria-live="polite">{displayed.length<games.length?`${games.length}개 중 ${displayed.length}개 표시`:`${games.length}개 모두 표시`}</span>}</div>
    <div className="grid three">{displayed.map(g => {const group=activityGroup(g),cardFit=activityFit(g);return <article className="card catalog-card catalog-card-compact" data-game-card={g.type} key={g.type}>
      {/* 카드는 이름 · 한 줄 규칙 · 인원·시간만. TV 첫 화면에 두 줄이 보이게 하고, 나머지는 '자세히'에 접는다. */}
      <div className="activity-card-top"><span className="activity-card-icon" aria-hidden="true">{PHONE_PLAY_BY_ID.has(g.type)?<PhonePlayIcon gameType={g.type}/>:activityIcon(g)}</span>
       {/* 이름을 눌러도 열린다. */}
       <h3>{onSelect?g.name:<Link className="activity-name-link" to={playHref(g.type)}>{g.name}<span aria-hidden="true"> ›</span></Link>}</h3>
       <button type="button" className="activity-fav" aria-pressed={isFavorite(g.type)} aria-label={`${g.name} 즐겨찾기`} onClick={()=>toggleFavorite(g.type)}>{isFavorite(g.type)?'★':'☆'}</button></div>
      <p className="activity-oneline" data-card-rule>{g.desc}</p>
      <p className="activity-meta" data-card-meta><span><span aria-hidden="true">👥</span><span className="sr-only">인원 </span> {cardFit.wholeClass?'반 전체':cardFit.people.join(' · ')||'모둠'}</span><span><span aria-hidden="true">⏱</span><span className="sr-only">시간 </span> {cardFit.minutes}분</span>{!solo&&!isFeatured(g.type)&&<span className="activity-meta-archive" data-archive>🗄 보관함</span>}{!solo&&isFeatured(g.type)&&archiveIncluded&&<span className="activity-meta-featured" data-featured>⭐ 추천 활동</span>}</p>
      <div className="activity-card-foot"><div className="card-action">{onSelect ? <button className="primary button-wide" onClick={() => onSelect(g)}>이 활동 선택</button> : <Link className="secondary button-wide card-open" to={playHref(g.type)}>{solo ? '체험하기' : '활동 열기'}</Link>}</div>
      <details className="activity-card-more" data-card-more><summary aria-label={`${g.name} 자세히`}>자세히</summary>
      <p className="activity-situation" data-situation>{situationBadges(g,fit).map(b=><span key={b}>{b}</span>)}</p>
      <p className="activity-finish"><strong>이렇게 하면 끝나요</strong> · {finishLine(g)}</p>
      <p className="activity-tags"><span className="pill">{group.icon} {group.label}</span>{isQuestId(g.type) && <span className="pill">연습부터 차근차근</span>}{!solo&&shelfLabel(g.type)&&<span className="pill" data-shelf-note>{shelfLabel(g.type)}</span>}{variantsFor(g.type).length>0&&<span className="pill">다른 놀이 방법 {variantsFor(g.type).length}개</span>}</p>
      {g.recommendedDevice&&<p className="small">{cardFit.wholeClass?'화면: TV·전자칠판 1대에 띄워 반 전체가 봐요(없으면 '+g.recommendedDevice+' 1대를 모두가 보이게 세워 둬요)':`기기: ${g.recommendedDevice} 1대를 세워 두고 해요`}</p>}
      <ActivityDetails game={g} solo={solo}/>
      {!onSelect&&!solo&&!isSignatureId(g.type)&&<Link className="secondary button-wide" to={`/teacher/setup?game=${g.type}`}>이 활동으로 수업 준비</Link>}{!onSelect&&!solo&&isSignatureId(g.type)&&<p className="small muted" data-tv-only>📺 학생 기기 없이 TV 한 대로 반 전체가 해요</p>}
      </details></div></article>;})}</div>
    {!games.length && <div role="status" className="notice"><p>{archiveMore>0?'추천 활동 가운데 맞는 활동이 없어요.':'맞는 활동이 없어요.'} {fitActive?'‘어디서 · 몇 명 · 몇 분’ 가운데 하나를 ‘전체’로 바꿔 보세요.':'검색어나 조건을 바꿔 보세요.'}</p>
      {query&&<><p>{suggestions.reason}</p>{suggestions.length>0&&<ul className="activity-suggestions" aria-label="비슷한 활동">{suggestions.games.map(s=><li key={s.type}><Link to={playHref(s.type)}>{s.name}</Link></li>)}{!solo&&suggestions.sports.map(s=><li key={s.id}><Link to={`/sports/${s.id}`}>{s.name}</Link></li>)}</ul>}</>}
      {isFiltered&&<button type="button" onClick={clearFilters}>조건 모두 지우기</button>}</div>}
    {archiveMore>0&&<p className="notice activity-archive-more" style={{marginTop:20}}>조건에 맞는 활동이 보관함에 {archiveMore}개 더 있어요. <button type="button" onClick={()=>setViewAll(true)}>보관함까지 보기</button></p>}
    {displayed.length < games.length && <button style={{marginTop:20}} onClick={() => setLimit(displayed.length + PAGE)}>활동 더 보기</button>}
    {!solo && !query && !phoneOnly && <button type="button" className="activity-view-toggle" style={{marginTop:20}} aria-pressed={viewAll} onClick={() => setViewAll(!viewAll)}>{viewAll ? `⭐ 추천 활동만 보기 (${FEATURED_GAMES.filter(g=>!exclude||!exclude(g)).length}개)` : `🗄 보관함까지 모두 보기 (${exclude ? GAMES.filter(g => !exclude(g)).length : GAMES.length}개)`}</button>}
  </>;
}
export function ActivityLibrary({ solo = false }: { solo?: boolean }) { const [params]=useSearchParams(); return <FlowShell utilities className={solo ? 'solo-library' : ''}><section className="activity-library-head"><h1>{solo ? '혼자 할 활동 고르기' : '오늘 할 활동 고르기'}</h1><p className="forest-lead" data-library-lead>{libraryLead(solo,params.get('view')==='all',SOLO_ACTIVITIES.length,{query:params.get('q')??'',phoneOnly:params.get('collection')==='phone'})}</p><nav className="forest-hero-actions" aria-label="활동 기록과 수업">{!solo&&<Link className="primary" to="/today">📋 오늘 수업 40분</Link>}{!solo&&<Link to="/teacher">수업 준비 시작</Link>}<Link to="/records">내 활동 기록</Link>{!solo&&<Link to="/hub/tools">기록·즐겨찾기</Link>}</nav></section><ActivityPicker solo={solo}/>{!solo&&<HubMoreSections/>}</FlowShell>; }
