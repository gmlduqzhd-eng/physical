import { Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { HeaderToolbar } from './components/HeaderToolbar';
import { useEffect, useState, type MouseEvent } from 'react';
import { STUDIO_ORIGIN, openStudioWithHandoff, studioUrl } from '../application/studioHandoff';
import './TeacherAi.css';

export function TeacherStudioEntry() {
  const [opening, setOpening] = useState(false);
  // 뒤로 가기로 이 화면에 돌아오면(브라우저가 저장해 둔 화면) '여는 중…'을 풀어 준다.
  useEffect(() => {
    const reset = () => setOpening(false);
    window.addEventListener('pageshow', reset); window.addEventListener('focus', reset);
    return () => { window.removeEventListener('pageshow', reset); window.removeEventListener('focus', reset); };
  }, []);
  useEffect(() => { if (!opening) return; const timer = window.setTimeout(() => setOpening(false), 4000); return () => window.clearTimeout(timer); }, [opening]);
  // 새 탭으로 수업 준비실을 열고, 이 탭에서 Google로 로그인한 선생님이면 로그인 상태를 창끼리 직접 넘긴다(주소에는 싣지 않음).
  // 가운데 클릭·Ctrl+클릭은 넘기지 않고 일반 주소로 연다. 팝업이 막히면 같은 탭에서 일반 주소로 연다.
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (opening) return;
    setOpening(true);
    if (!openStudioWithHandoff()) location.assign(studioUrl(false));
  };
  return <main className="teacher-ai">
    <header><strong>교사 수업 준비실</strong><HeaderToolbar><Link className="icon-toolbar-action" to="/hub" title="활동 탐색으로 돌아가기"><ArrowLeft aria-hidden="true"/><span>활동 탐색으로 돌아가기</span></Link><Link className="icon-toolbar-action" to="/manual" title="이용 안내"><CircleHelp aria-hidden="true"/><span>이용 안내</span></Link></HeaderToolbar></header>
    <section className="ai-intro">
      <p className="ai-eyebrow">땀방울 원정대 · GEMINI TEACHER STUDIO</p>
      <h1>교사 전용 AI 도구에서<br/>수업 준비를 이어가세요</h1>
      <p>활동 추천·난이도 조절·지도안과 성찰 질문은 별도 교사 도구에서 생성합니다.</p>
    </section>
    <section className="ai-form" aria-labelledby="studio-entry-title">
      <h2 id="studio-entry-title">Gemini 교사 수업 준비실</h2>
      <p className="ai-notice">여기서 Google로 로그인했다면 수업 준비실에서 다시 로그인하지 않아도 돼요. 수업 준비실은 새 탭으로 열려요. 새 화면에서 수업 조건을 고르고 개인정보 전송 안내를 확인하면 만들 수 있어요.</p>
      <a className="inline-flex items-center justify-center rounded-xl bg-[var(--ui-action,var(--forest-accent,#566d4d))] text-[color:var(--ui-on-action,var(--forest-on,#fff))] px-5 py-4 font-bold min-h-12" href={STUDIO_ORIGIN + '/'} target="_blank" rel="noreferrer" aria-busy={opening} onClick={open}>{opening ? '수업 준비실 여는 중…' : '수업 준비실 열기 →'}</a>
      <p className="ai-notice">학생 앱의 기록·메모와 여기서 선택했던 조건은 자동 전송하지 않습니다. 학생에게 교사 도구 주소나 교사 계정을 공유하지 마세요.</p>
    </section>
  </main>;
}
