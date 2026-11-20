import { useEffect, useId, useRef, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { HeaderPopover } from './HeaderPopover';

/** 학생이 쓰는 화면에서는 선생님 로그인 상태를 묻지 않는다. */
const STUDENT_PATHS = /^\/(join|lobby|fun-remote|solo|student|q\/)/;
const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const FRESH_MS = 60_000;
let cached: { at: number; authenticated: boolean } | null = null;
let inflight: Promise<boolean> | null = null;

async function loadStatus(force = false): Promise<boolean> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return cached.authenticated;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/teacher?action=status', { credentials: 'same-origin', cache: 'no-store' });
      const data = res.ok ? await res.json() as { authenticated?: unknown } : null;
      const authenticated = data?.authenticated === true;
      cached = { at: Date.now(), authenticated };
      return authenticated;
    } catch { cached = { at: Date.now(), authenticated: false }; return false; }
    finally { inflight = null; }
  })();
  return inflight;
}

/** 머리말의 작은 표시: "선생님 로그인됨" + 로그아웃. 로그인하지 않았으면 아무것도 보이지 않는다. */
export function TeacherStatusChip() {
  const { pathname } = useLocation();
  const skip = !hasSupabase || STUDENT_PATHS.test(pathname);
  const [authenticated, setAuthenticated] = useState(() => !skip && cached?.authenticated === true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (skip) return;
    let active = true;
    const check = () => { if (!document.hidden) void loadStatus().then(v => { if (active) setAuthenticated(v); }); };
    check();
    document.addEventListener('visibilitychange', check);
    return () => { active = false; document.removeEventListener('visibilitychange', check); };
  }, [skip]);
  if (skip || !authenticated) return null;
  const logout = async () => {
    setBusy(true);
    try { await fetch('/api/teacher?action=logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }); } catch { /* 아래에서 다시 확인한다. */ }
    try { const { supabase } = await import('../../data/supabase'); await supabase.auth.signOut({ scope: 'local' }); } catch { /* 저장된 연결이 없으면 할 일이 없다. */ }
    cached = null;
    const still = await loadStatus(true);
    setBusy(false); setOpen(false); setAuthenticated(still);
    if (!still && /^\/(teacher|admin|remote)(\/|$)/.test(pathname)) location.assign('/teacher');
  };
  return <div className="home-tools">
    <button ref={trigger} type="button" className="icon-toolbar-action teacher-status-chip" title="선생님 로그인됨" aria-label="선생님 로그인됨 (로그아웃 메뉴)" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
      <UserCheck aria-hidden="true"/><span>선생님 로그인됨</span>
    </button>
    <HeaderPopover open={open} onClose={() => setOpen(false)} anchor={trigger} id={id} label="선생님 로그인" className="header-teacher-popover">
      <div className="header-teacher-panel"><p>이 기기에서 선생님으로 로그인되어 있어요. 함께 쓰는 컴퓨터라면 수업이 끝난 뒤 로그아웃해 주세요.</p>
        <button type="button" disabled={busy} onClick={() => void logout()}>{busy ? '로그아웃하는 중…' : '로그아웃'}</button></div>
    </HeaderPopover>
  </div>;
}
