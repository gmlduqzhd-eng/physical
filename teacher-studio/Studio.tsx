import { useEffect, useRef, useState } from 'react';

import { GAMES } from '../src/domain/gamesData';
import { GOALS, type AiResponse, type TeacherOutput, type TeacherTask } from '../src/domain/teacherAi';
import { STUDIO_TASKS, type StudioInput } from './domain';
import '../src/presentation/TeacherAi.css';
import './studio.css';
import { AdvancedControls, LocalChallenge } from './AdvancedControls';
export type StudioForm = Omit<StudioInput, 'task'> & { task: TeacherTask };

const initial: StudioForm = { activityMinutes: 10, weather: '제약 없음', observations: [], aggregate: null, task: 'recommend', activityId: null, grade: '3~4학년군', goal: '협동과 소통', place: '체육관', device: '태블릿 PC', deviceCount: '모둠별 1대', minutes: 40, groupSize: 6, classSize: 24, consent: true, adultTeacher: true };
async function request(action: string, body?: unknown) {
  const res = await fetch('/api/studio?action=' + action, body === undefined ? { signal: AbortSignal.timeout(105000) } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(105000) });
  const data = await res.json(); if (!res.ok) throw new Error(data.error ?? '연결 실패'); return data;
}
export function Studio() {
  const [status, setStatus] = useState({ authenticated: false, configured: false, aiReady: false, model: '' });
  const [code, setCode] = useState(''); const [adult, setAdult] = useState(false);
  const [key, setKey] = useState(''); const [publicData, setPublicData] = useState(false); const [freeProject, setFreeProject] = useState(false);
  const [keyError, setKeyError] = useState(''); const [keyMessage, setKeyMessage] = useState(''); const [savingKey, setSavingKey] = useState(false);
  const [consent, setConsent] = useState(false); const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AiResponse | null>(null); const [draft, setDraft] = useState<TeacherOutput | null>(null);
  const [reviewed, setReviewed] = useState(false); const [adopted, setAdopted] = useState(false);
  const version = useRef(0);
  const refresh = async () => setStatus(await request('status'));
  useEffect(() => { void request('status').then(setStatus).catch(() => setError('교사 API 서버를 실행하세요: npm run dev:studio:api')); }, []);
  const change = (patch: Partial<StudioForm>) => { version.current++; setForm(previous => ({ ...previous, ...patch })); setDraft(null); setResponse(null); setReviewed(false); setAdopted(false); setError(''); };
  const edit = (patch: Partial<TeacherOutput>) => { if (draft) setDraft({ ...draft, ...patch }); setReviewed(false); setAdopted(false); };
  const download = () => {
    if (!draft || !adopted) return;
    const text = [draft.title, '성인 교사가 검토·수정하여 채택한 수업 준비 초안', ...draft.recommendations.map(r => `${GAMES.find(g => g.type === r.activityId)?.name}\n${r.reason}`), ...draft.sections.map(s => `${s.heading}${s.minutes === null ? '' : ` · ${s.minutes}분`}\n${s.content}`), '안전 원문', ...draft.safety.map(s => s.quote), '교사 확인', ...draft.teacherChecks, '활동 원문 근거', ...[...draft.recommendations, ...draft.sections].flatMap(s => s.citations.map(c => `${c.activityId}/${c.field}: ${c.quote}`)), `모델 ${response?.model} / ${response?.generatedAt} / 자료 ${response?.sourceVersion}`].join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = '교사-수업준비-검토본.txt'; a.click(); URL.revokeObjectURL(url);
  };
  return <main className="teacher-ai">
    <header><strong>교사 수업 준비실</strong><span>성인 교사 전용 · 로컬 시험</span>{status.authenticated && <button onClick={() => { version.current++; setDraft(null); setResponse(null); setKey(''); void request('logout', {}).then(refresh); }}>로그아웃</button>}</header>
    <section className="ai-intro"><p className="ai-eyebrow">GEMINI · PUBLIC MATERIALS ONLY</p><h1>공개 활동으로 준비하는<br/>우리 반 체육 수업.</h1><p>학생 앱과 분리된 교사용 준비 도구입니다. 학생에게 이 화면과 접근 코드를 공유하지 마세요.</p><div role="status" className="ai-status">{status.aiReady ? `Gemini 설정 저장됨 · ${status.model} · 실제 호출 성공 여부는 생성 후 확인` : 'Gemini 키 설정 필요 · 가짜 결과를 표시하지 않습니다'}</div></section>
    <details className="ai-privacy"><summary>무료 API 전송 정보·학습 이용·보관 안내</summary><p>전송: 공개 활동 설명·원문 안전 자료와 선택한 학년군·목표·장소·기기·수업 시간·일반 인원 조건. 학생 실명·별명·번호·사진·연락처·개인 이력·관찰 메모 원문은 전송하지 않습니다. 7번은 교사가 선택한 일반 관찰 태그만, 8번은 충분히 큰 집단의 거친 범주 집계만 전송합니다. 6번 기록은 이 화면 메모리에서만 처리합니다.</p><p>무료 Gemini 입력과 출력은 Google 제품·모델 개선 및 사람 검토에 사용될 수 있습니다. 무료 서비스 전체의 고정 보관 일수는 이용 조건에서 명시적으로 보장하지 않으므로 무보관으로 안내하지 않습니다. 민감·기밀 자료를 넣지 마세요. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google 이용 조건</a></p><p>이 도구는 검색·파일 업로드·대화 이력·명시적 캐시를 사용하지 않습니다. 앱 서버와 브라우저 저장소에 입력·출력을 보관하지 않고 새로고침 시 초안을 지웁니다. 교사가 내려받은 파일은 직접 관리합니다. 키는 서버의 Git 제외 파일에만 저장합니다.</p><p>무료·유료 여부는 Google 프로젝트 결제 연결 상태에 따라 정해집니다. 이 도구가 요금제를 확인하거나 자동 변경하지 않습니다. 유료 전환 전 데이터 처리 조건과 학교 절차를 다시 확인하세요.</p></details>
    {!status.authenticated ? <section className="ai-form"><h2>성인 교사 인증</h2><p>기존 교사 접근 코드를 사용합니다. API 키와 다른 비밀번호입니다.</p>{!status.configured && <p role="alert">먼저 터미널에서 npm run teacher:setup으로 접근 코드를 설정하세요.</p>}<form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await request('login', { code, adultTeacher: adult }); setCode(''); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : '인증 실패'); } finally { setBusy(false); } }}><label>교사 접근 코드<input type="password" autoComplete="current-password" minLength={12} maxLength={128} value={code} required onChange={e => setCode(e.target.value)}/></label><label className="ai-check"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)}/>만 18세 이상 교사이며 학생에게 이 도구를 제공하지 않습니다.</label><button disabled={busy || !adult || !status.configured}>교사 인증하기</button></form></section> : <>
      <details className="ai-privacy" open={!status.aiReady || !!keyError || !!keyMessage}><summary>Gemini API 키 저장·교체</summary>
        <p><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio에서 키 만들기</a> → 실제 키 전체를 복사해 아래에 붙여 넣으세요. 키는 채팅에 보내지 마세요.</p>
        <form noValidate onSubmit={async e => {
          e.preventDefault(); setKeyError(''); setKeyMessage('');
          const cleanKey = key.trim();
          if (cleanKey.length < 20 || cleanKey.length > 4096 || /\s/.test(cleanKey)) { setKeyError('AI Studio에서 실제 API 키 전체를 복사해 붙여 넣어 주세요. 공백이나 줄바꿈이 들어가면 안 됩니다.'); return; }
          if (!publicData || !freeProject) { setKeyError('아래 두 확인 항목을 모두 체크해 주세요.'); return; }
          setSavingKey(true); setBusy(true); setError(''); setMessage(''); setKeyMessage('서버에 저장 중…');
          try { await request('configure', { apiKey: cleanKey, publicDataReviewed: publicData, freeProjectConfirmed: freeProject }); setKey(''); await refresh(); setKeyMessage('키를 서버에 저장했습니다. 아래에서 실제 생성을 시험하세요.'); }
          catch (cause) { setKeyMessage(''); setKeyError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 서버 연결을 확인하세요.'); }
          finally { setSavingKey(false); setBusy(false); }
        }}>
          <label>Gemini API 키<input type="password" autoComplete="off" value={key} maxLength={4096} aria-describedby="gemini-key-help" aria-invalid={!!keyError} onChange={e => { setKey(e.target.value); setKeyError(''); setKeyMessage(''); }}/></label>
          <p id="gemini-key-help">새 인증 키도 사용할 수 있습니다. 키 전체를 붙여 넣으세요.</p>
          <label className="ai-check"><input type="checkbox" checked={publicData} onChange={e => setPublicData(e.target.checked)}/>공개 자료만 사용하며 무료 입력·출력의 제품 개선 및 사람 검토 조건을 확인했습니다.</label>
          <label className="ai-check"><input type="checkbox" checked={freeProject} onChange={e => setFreeProject(e.target.checked)}/>AI Studio에서 이 키의 프로젝트가 무료 등급인지 확인했습니다.</label>
          <button disabled={busy}>{savingKey ? '키 저장 중…' : 'Gemini 키 저장'}</button>
          {keyError && <p role="alert" className="ai-error">{keyError}</p>}
          {keyMessage && <p role="status">{keyMessage}</p>}
        </form>
      </details>
      <nav className="ai-tabs" aria-label="교사 준비 기능">{Object.entries(STUDIO_TASKS).map(([task, label]) => <button key={task} disabled={busy} aria-pressed={form.task === task} onClick={() => change({ task: task as TeacherTask, observations: [], aggregate: null, activityId: ['recommend','alternative'].includes(task) ? null : form.activityId ?? 'space-occupier' })}>{label}</button>)}</nav>
      <div className="ai-workspace"><section className="ai-form"><h2>{STUDIO_TASKS[form.task]}</h2><div className="ai-fields">
        {(['grade', 'goal', 'place', 'device', 'deviceCount'] as const).map((field, index) => <label key={field}>{['학년군', '수업 목표', '장소', '기기', '기기 배치'][index]}<select disabled={busy} value={form[field]} onChange={e => change({ [field]: e.target.value })}>{[['1~2학년', '3~4학년군', '5~6학년군'], GOALS, ['교실', '체육관', '운동장', '다목적실', '좁은 실내 공간'], ['스마트폰', '태블릿 PC', '데스크톱 PC'], ['교사용 1대', '모둠별 1대', '학생 1인 1기기']][index].map(value => <option key={value}>{value}</option>)}</select></label>)}
        {(['minutes', 'groupSize', 'classSize'] as const).map((field, index) => <label key={field}>{['수업 시간 (분)', '모둠 인원', '수업 전체 인원'][index]}<input disabled={busy} type="number" min={[15, 2, 1][index]} max={[90, 12, 60][index]} value={form[field]} onChange={e => change({ [field]: Number(e.target.value) })}/></label>)}
      </div>{!['recommend','alternative'].includes(form.task) && <label>선택 활동<select disabled={busy} value={form.activityId ?? ''} onChange={e => change({ activityId: e.target.value })}>{GAMES.map(g => <option key={g.type} value={g.type}>{g.name}</option>)}</select></label>}
      <AdvancedControls form={form} change={change}/>{form.task === 'next' ? <LocalChallenge key={form.activityId} activityId={form.activityId ?? ''}/> : <><label className="ai-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>전송 조건에 학생 개인정보가 없고 학교의 서비스 이용 절차를 확인했습니다.</label><button className="ai-primary" disabled={busy || !consent || !status.aiReady} onClick={async () => { const current = ++version.current; setBusy(true); setError(''); setDraft(null); setReviewed(false); setAdopted(false); try { const data = await request('generate', { ...form, observations: form.task === 'observation' ? form.observations : [], aggregate: form.task === 'group' ? form.aggregate : null }) as AiResponse; if (current === version.current) { setResponse(data); setDraft(data.result); } } catch (cause) { if (current === version.current) setError(cause instanceof Error ? cause.message : '생성 실패'); } finally { setBusy(false); } }}>{busy ? 'Gemini 생성·근거 검증 중…' : 'Gemini AI 초안 생성'}</button>{error && <p role="alert" className="ai-error">{error}</p>}</>}</section>
      <section className="ai-result" aria-label="결과와 교사 검토" aria-live="polite"><h2>검토하고 직접 고쳐 쓰세요</h2>{!draft && <p>원문 근거 검증을 통과한 실제 AI 결과가 여기에 표시됩니다.</p>}{draft && <><p className="ai-notice">AI 제안입니다. 7·8번의 첫 요약은 입력 항목 확인이며 AI 생성 부분과 구분합니다. 원문 인용·구조·시간 합계를 검사하지만 교육적 타당성과 모든 사실을 보장하지 않습니다. 교사가 현장 안전을 판단하세요.</p><h3>{draft.title}</h3>{draft.recommendations.map((r, index) => <article key={r.activityId}><h3>{GAMES.find(g => g.type === r.activityId)?.name}</h3><label>추천 이유 수정<textarea value={r.reason} onChange={e => edit({ recommendations: draft.recommendations.map((item, i) => i === index ? { ...item, reason: e.target.value } : item) })}/></label><Quotes citations={r.citations}/><div className="ai-actions"><button disabled={busy} onClick={() => change({ task: 'difficulty', activityId: r.activityId })}>이 활동 난이도 조절</button><button disabled={busy} onClick={() => change({ task: 'plan', activityId: r.activityId })}>이 활동 지도안</button></div></article>)}{draft.sections.map((s, index) => <article key={s.heading}><h3>{s.heading}{s.minutes !== null && ` · ${s.minutes}분`}</h3><label>{s.heading} 초안 수정<textarea value={s.content} onChange={e => edit({ sections: draft.sections.map((item, i) => i === index ? { ...item, content: e.target.value } : item) })}/></label><Quotes citations={s.citations}/></article>)}<article><h3>원문 안전 항목</h3>{draft.safety.length ? <ul>{draft.safety.map((s, i) => <li key={i}>{s.quote}</li>)}</ul> : <p>이 초안에는 안전 원문이 포함되지 않았습니다. 활동 원자료와 현장을 교사가 확인하세요.</p>}<h3>교사 확인</h3><ul>{draft.teacherChecks.map((check, i) => <li key={i}>{check}</li>)}</ul></article><p className="ai-meta">{response?.model} · {response?.generatedAt} · 자료 {response?.sourceVersion}</p><label className="ai-check"><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); setAdopted(false); }}/>근거·시간·참여 조건·현장 안전을 확인하고 수정했습니다.</label><div className="ai-actions"><button disabled={!reviewed} onClick={() => setAdopted(true)}>교사 검토본으로 채택</button><button disabled={!adopted} onClick={download}>채택본 내려받기</button><button onClick={() => { setDraft(null); setResponse(null); setReviewed(false); setAdopted(false); }}>결과 폐기</button></div>{adopted && <p role="status">이 화면의 검토본으로 채택했습니다. 학생 앱이나 수업방에는 자동 게시하지 않습니다.</p>}</>}</section></div>
    </>}{!status.authenticated && error && <p role="alert" className="ai-error">{error}</p>}{message && <p role="status">{message}</p>}<footer>성인 교사의 전문적 수업 준비용 · 학생 DB와 자동 연결하지 않습니다.</footer>
  </main>;
}
function Quotes({ citations }: { citations: TeacherOutput['sections'][number]['citations'] }) { return <details className="ai-quotes"><summary>활동 원문 근거</summary>{citations.map((c, i) => <blockquote key={i}><p>{c.quote}</p><small>{c.activityId} · {c.field}</small></blockquote>)}</details>; }
