import { endClassroomSession } from '../data/supabase';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AVAILABLE_GAMES as GAMES } from '../domain/gamesData';
import { GOALS, OBSERVATIONS, TASKS, nextChallenge, type AiResponse, type TeacherInput, type TeacherOutput, type TeacherTask } from '../domain/teacherAi';
import { TeacherLogin } from './components/TeacherAuthGuard';
import { LocalAiSettings } from './components/LocalAiSettings';
import { teacherStatus } from '../application/teacherSession';
import { normalizePlayerProfile } from '../application/usePlayerProfile';
import { readJsonStorage } from '../application/browserStorage';
import './TeacherAi.css';
const defaults: Omit<TeacherInput, 'task' | 'consent'> = { activityId: null, grade: '3~4학년군', goal: '협동과 소통', place: '체육관', device: '태블릿 PC', deviceCount: '모둠별 1대', minutes: 40, groupSize: 6, activityMinutes: 10, classSize: 24, weather: '제약 없음', observations: [], aggregate: null };
export function TeacherAi() {
  const [params] = useSearchParams();
  const [task, setTask] = useState<TeacherTask>('recommend');
  const [form, setForm] = useState({ ...defaults, activityId: GAMES.some(g => g.type === params.get('activity')) ? params.get('activity') : GAMES[0].type });
  const [status, setStatus] = useState({ authenticated: false, configured: false, aiReady: false, localSetup: false });
  const [consent, setConsent] = useState(false); const [reviewed, setReviewed] = useState(false); const [adopted, setAdopted] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [response, setResponse] = useState<AiResponse | null>(null); const [draft, setDraft] = useState<TeacherOutput | null>(null);
  const [localNotes, setLocalNotes] = useState(''); const [localNext, setLocalNext] = useState('');
  const [ownRecords, setOwnRecords] = useState(false);
  const controller = useRef<AbortController | null>(null); const version = useRef(0);
  const refreshStatus = () => { void teacherStatus().then(setStatus).catch(() => setError('AI API 서버에 연결할 수 없습니다. npm run dev:api 실행을 확인하세요.')); };
  useEffect(() => { refreshStatus(); return () => controller.current?.abort(); }, []);
  const change = (update: Partial<typeof form>, nextTask = task) => {
    version.current++; controller.current?.abort(); setBusy(false); setForm(previous => ({ ...previous, ...update }));
    setTask(nextTask); setDraft(null); setResponse(null); setReviewed(false); setAdopted(false); setLocalNext(''); setError('');
  };
  const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => change({ [key]: value });
  const selected = GAMES.find(g => g.type === form.activityId);
  const submit = async () => {
    setError(''); setReviewed(false); setAdopted(false);
    if (task === 'next') { if (!ownRecords) { setError('본인 기록인지 교사가 먼저 확인해 주세요.'); return; } const profile = normalizePlayerProfile(readJsonStorage('physical_player_profile')); setLocalNext(nextChallenge(profile?.recentGames ?? [], form.activityId ?? '')); return; }
    if (!status.authenticated || !consent) { setError('교사 인증과 전송 정보 확인이 필요합니다.'); return; }
    const current = ++version.current; controller.current?.abort(); controller.current = new AbortController(); setBusy(true); setDraft(null); setResponse(null);
    try {
      // Excludes raw notes, profiles, individual histories and classroom identifiers.
      const body: TeacherInput = { ...form, task, consent: true, activityId: ['recommend', 'alternative'].includes(task) ? null : form.activityId, observations: task === 'observation' ? form.observations : [], aggregate: task === 'group' ? form.aggregate : null };
      const res = await fetch('/api/teacher?action=generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.current.signal });
      const data = await res.json(); if (!res.ok) { if (res.status === 401) refreshStatus(); throw new Error(data.error ?? '생성 실패'); }
      if (current === version.current) { setResponse(data); setDraft(data.result); }
    } catch (cause) { if (current === version.current && !(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : '연결을 확인하세요.'); }
    finally { if (current === version.current) setBusy(false); }
  };
  const download = () => {
    if (!draft) return;
    const text = [draft.title, '교사가 검토·수정하여 채택한 수업 초안. 자동 평가나 안전 적합 판정이 아닙니다.', ...draft.recommendations.map(r => `${GAMES.find(g => g.type === r.activityId)?.name}: ${r.reason}`), ...draft.sections.map(s => `${s.heading}${s.minutes === null ? '' : ` (${s.minutes}분)`}\n${s.content}`), '안전 원문', ...draft.safety.map(s => s.quote), '교사 확인', ...draft.teacherChecks, '원문 근거', ...[...draft.recommendations, ...draft.sections].flatMap(item => item.citations.map(c => `${c.activityId}/${c.field}: ${c.quote}`)), `모델 ${response?.model} / 생성 ${response?.generatedAt} / 자료 ${response?.sourceVersion}`].join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = '교사-검토-수업초안.txt'; a.click(); URL.revokeObjectURL(url);
  };
  const edit = (update: Partial<TeacherOutput>) => { if (draft) setDraft({ ...draft, ...update }); setReviewed(false); setAdopted(false); };
  return <main className="teacher-ai">
    <header><Link to="/hub">← 활동 허브</Link><span>교사 수업 준비실</span><button onClick={async () => { await endClassroomSession(); await fetch('/api/teacher?action=logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); setDraft(null); setResponse(null); refreshStatus(); }}>로그아웃</button></header>
    <section className="ai-intro"><p className="ai-eyebrow">땀방울 원정대 · TEACHER STUDIO</p><h1>수업은 선생님이,<br />초안은 AI와 함께.</h1><p>기존 활동 자료를 바탕으로 준비하고, 직접 고쳐서 수업에 사용하세요.</p><div className="ai-status" role="status">{status.aiReady ? 'OpenAI 연결 설정 완료 · 검증 후 결과 표시' : 'AI 연결 준비 필요 · 키가 없으면 결과를 만들어 표시하지 않습니다'}</div></section>
    <details className="ai-privacy"><summary>전송 정보와 개인정보 보호 원칙</summary><p>OpenAI로 활동 자료·학년군·목표·장소·기기·시간·모둠 인원과 선택한 관찰 태그/범주 집계만 전송합니다. 실명·별명·번호·얼굴·연락처·개인 기록·수업방 ID를 전송하지 않습니다.</p><p>관찰 메모 원문과 개인 기록은 기기에서만 처리합니다. 별명·번호도 재식별될 수 있어 개인 기록은 외부 AI를 사용하지 않습니다. AI 입력과 결과를 앱 서버 DB에 저장하지 않으며 새로고침 시 초안이 사라집니다. 내려받은 파일은 교사가 관리합니다.</p><p>OpenAI API는 기본 학습 미사용(계정 공유 설정 별도 확인). store:false를 사용합니다. 남용 감시 로그는 기본 최대 30일, 예외 시 연장될 수 있고 프롬프트 캐시 보관은 별도입니다. 무보관을 보장하지 않습니다. <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">제공자 정책</a></p></details>
    {!status.authenticated && <TeacherLogin onLogin={refreshStatus} />}
    {status.authenticated && status.localSetup && <LocalAiSettings onSave={refreshStatus} />}
    <nav aria-label="수업 보조 기능" className="ai-tabs">{Object.entries(TASKS).map(([key, label]) => <button key={key} aria-pressed={task === key} onClick={() => change({}, key as TeacherTask)}>{label}</button>)}</nav>
    <div className="ai-workspace"><section className="ai-form"><h2>{TASKS[task]}</h2><div className="ai-fields">
      <label>학년군<select value={form.grade} onChange={e => setField('grade', e.target.value as typeof form.grade)}>{['1~2학년', '3~4학년군', '5~6학년군'].map(v => <option key={v} value={v}>{v === '1~2학년' ? '1~2학년군' : v}</option>)}</select></label>
      <label>수업 목표<select value={form.goal} onChange={e => setField('goal', e.target.value as typeof form.goal)}>{GOALS.map(v => <option key={v}>{v}</option>)}</select></label>
      <label>장소<select value={form.place} onChange={e => setField('place', e.target.value as typeof form.place)}>{['교실', '체육관', '운동장', '다목적실', '좁은 실내 공간'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>기기<select value={form.device} onChange={e => setField('device', e.target.value as typeof form.device)}>{['스마트폰', '태블릿 PC', '데스크톱 PC'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>기기 배치<select value={form.deviceCount} onChange={e => setField('deviceCount', e.target.value as typeof form.deviceCount)}>{['교사용 1대', '모둠별 1대', '학생 1인 1기기'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>수업 시간 (분)<input type="number" min={15} max={90} value={form.minutes} onChange={e => setField('minutes', Number(e.target.value))} /></label>
      <label>모둠 인원<input type="number" min={2} max={12} value={form.groupSize} onChange={e => setField('groupSize', Number(e.target.value))} /></label>
      <label>수업 전체 인원<input type="number" min={1} max={60} value={form.classSize} onChange={e => setField('classSize', Number(e.target.value))} /></label>
      {task === 'mission' && <label>협동 활동 시간 (분)<input type="number" min={1} max={30} value={form.activityMinutes} onChange={e => setField('activityMinutes', Number(e.target.value))} /></label>}
      {task === 'alternative' && <label>날씨 제약<select value={form.weather} onChange={e => setField('weather', e.target.value as typeof form.weather)}>{['제약 없음', '비로 실내 전환', '더위로 실내 전환', '추위로 실내 전환'].map(v => <option key={v}>{v}</option>)}</select></label>}
    </div>
    {!['recommend', 'alternative'].includes(task) && <label>선택 활동<select value={form.activityId ?? ''} onChange={e => setField('activityId', e.target.value)}>{GAMES.map(g => <option key={g.type} value={g.type}>{g.name}</option>)}</select></label>}
    {selected && !['recommend', 'alternative'].includes(task) && <p className="ai-source">활동 원문: {selected.desc}</p>}
    {task === 'observation' && <fieldset><legend>관찰 메모와 전송 항목</legend><label>관찰 메모 (기기 내 임시 입력 · 전송 안 함)<textarea value={localNotes} maxLength={2000} placeholder="실명·번호·민감정보 입력 금지. 아래 항목을 선택해 요약합니다." onChange={e => setLocalNotes(e.target.value)} /></label><p>메모를 참고해 항목을 직접 선택하세요. 자동 익명화가 아닙니다.</p>{OBSERVATIONS.map(item => <label className="ai-check" key={item}><input type="checkbox" checked={form.observations.includes(item)} onChange={e => setField('observations', e.target.checked ? [...form.observations, item] : form.observations.filter(i => i !== item))} />{item}</label>)}<button onClick={() => setLocalNotes('')}>메모 지우기</button></fieldset>}
    {task === 'group' && <fieldset><legend>이름 없는 범주 집계</legend><p>모둠당 5명 이상, 전체 3모둠 이상인 결과만 사용합니다. 모둠명·정확한 점수는 입력하지 않습니다. 작은 집단은 요약하지 않습니다.</p><label className="ai-check"><input type="checkbox" checked={!!form.aggregate} onChange={e => setField('aggregate', e.target.checked ? { groups: '3~5모둠', participants: '모둠당 5~8명', completion: '절반 정도 완료', cooperation: '관찰 부족' } : null)} />조건에 맞는 비식별 집계입니다.</label>{form.aggregate && (['groups', 'participants', 'completion', 'cooperation'] as const).map((key, index) => <label key={key}>{['모둠 수', '모둠별 인원', '완료 정도', '협동 관찰'][index]}<select value={form.aggregate![key]} onChange={e => setField('aggregate', { ...form.aggregate!, [key]: e.target.value })}>{[['3~5모둠', '6모둠 이상'], ['모둠당 5~8명', '모둠당 9명 이상'], ['대부분 완료', '절반 정도 완료', '대부분 미완료'], ['고른 참여', '일부 편중', '관찰 부족']][index].map(v => <option key={v}>{v}</option>)}</select></label>)}</fieldset>}
    {task === 'next' ? <p className="ai-notice">AI 기능이 아닙니다. 이 기기의 같은 활동 최근 3회 점수·운동 자각도를 규칙으로 분석합니다. 별명·번호·날짜·기록은 전송하지 않습니다. 공용 기기에서는 다른 학생의 기록이 섞일 수 있으므로 본인 기록인지 교사가 먼저 확인하세요.</p> : <label className="ai-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />학생 개인정보가 없고 학교의 서비스 이용 절차를 확인했습니다.</label>}
    {task === 'next' && <label className="ai-check"><input type="checkbox" checked={ownRecords} onChange={e => { setOwnRecords(e.target.checked); setLocalNext(''); }} />이 기기의 기록이 해당 학생의 기록인지 교사가 확인했습니다.</label>}
    <button className="ai-primary" disabled={busy || (task === 'next' ? !ownRecords : (!status.authenticated || !consent || !status.aiReady))} onClick={() => void submit()}>{busy ? '근거를 확인하며 생성 중…' : task === 'next' ? '기기 내 기록 분석' : 'AI 초안 생성'}</button>
    {busy && <button onClick={() => { version.current++; controller.current?.abort(); setBusy(false); }}>생성 취소</button>}{error && <p role="alert" className="ai-error">{error}</p>}
    </section><section className="ai-result" aria-label="결과와 교사 검토" aria-live="polite"><h2>초안을 검토하고 채택하세요</h2>
    {!draft && !localNext && <div className="ai-empty"><span>✦</span><h3>수업 조건에서 시작합니다</h3><p>추천 활동을 선택하면 난이도와 지도안을 이어서 만들 수 있습니다. 검증을 통과한 실제 AI 결과만 표시합니다.</p></div>}
    {localNext && <article><h3>기기 내 규칙 분석 결과</h3><p>{localNext}</p><p>교사가 수행 과정과 참여 의사를 확인하고 난이도를 결정하세요.</p><button onClick={() => change({}, 'difficulty')}>난이도 조절안 검토</button></article>}
    {draft && <><p className="ai-notice">AI 생성 · 교사 검토용 제안. 인용의 원문 일치만 검증했습니다. 제안의 교육적 타당성과 현장 안전은 교사가 판단합니다.</p><h3>{draft.title}</h3>
      {draft.recommendations.map((item, index) => <article key={item.activityId}><h3>{index + 1}. {GAMES.find(g => g.type === item.activityId)?.name}</h3><label>추천 이유 수정<textarea value={item.reason} onChange={e => edit({ recommendations: draft.recommendations.map((r, i) => i === index ? { ...r, reason: e.target.value } : r) })} /></label><SourceQuotes citations={item.citations} /><div className="ai-actions"><button onClick={() => change({ activityId: item.activityId }, 'difficulty')}>이 활동 난이도 조절</button><button onClick={() => change({ activityId: item.activityId }, 'plan')}>이 활동 지도안</button><Link to={`/play/${item.activityId}`}>기존 활동 열기</Link></div></article>)}
      {draft.sections.map((section, index) => <article key={section.heading}><h3>{section.heading}{section.minutes !== null && ` · ${section.minutes}분`}</h3><label>{section.heading} 초안 수정<textarea value={section.content} onChange={e => edit({ sections: draft.sections.map((s, i) => i === index ? { ...s, content: e.target.value } : s) })} /></label><SourceQuotes citations={section.citations} /></article>)}
      <article><h3>자료에 있는 안전 점검 원문</h3>{draft.safety.length ? <ul>{draft.safety.map((s, i) => <li key={i}>{s.quote}</li>)}</ul> : <p>안전 원문이 부족합니다. 교사의 현장 확인이 필요합니다.</p>}<h3>교사 확인</h3><ul>{draft.teacherChecks.map((s, i) => <li key={i}>{s}</li>)}</ul></article>
      <p className="ai-meta">모델: {response?.model} · 자료 버전: {response?.sourceVersion}<br />{response?.generatedAt && new Date(response.generatedAt).toLocaleString('ko-KR')}</p>
      <label className="ai-check"><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); setAdopted(false); }} />근거·시간·현장 안전·참여 조건을 검토하고 필요한 내용을 수정했습니다.</label>
      <div className="ai-actions"><button disabled={!reviewed} onClick={() => setAdopted(true)}>교사 검토본으로 채택</button><button disabled={!adopted} onClick={download}>채택본 내려받기</button><button onClick={() => { setDraft(null); setResponse(null); setAdopted(false); }}>결과 폐기</button></div>{adopted && <p role="status">이 화면의 교사 검토본으로 채택했습니다. 수업방·미션·점수에 자동 반영하지 않습니다. 협동 미션은 검토본을 내려받고 기존 교사 제어 패널의 미션 편집에서 직접 반영하세요.</p>}
    </>}
    </section></div><footer>기존 활동·수업방·모둠 미션을 유지합니다. <Link to="/privacy">개인정보와 기기 정보 관리 →</Link></footer>
  </main>;
}
function SourceQuotes({ citations }: { citations: TeacherOutput['sections'][number]['citations'] }) { return <details className="ai-quotes"><summary>활동 원문 근거 확인</summary>{citations.map((c, i) => <blockquote key={i}><p>{c.quote}</p><small>{GAMES.find(g => g.type === c.activityId)?.name} · {c.field}</small></blockquote>)}</details>; }
