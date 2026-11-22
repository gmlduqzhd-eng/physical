import { Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { lazyWithRetry } from '../application/lazyWithRetry';
import './ChecksPage.css';

const DeviceCheck = lazyWithRetry(() => import('./DeviceCheck'), m => m.DeviceCheck);
const SoundCheckPage = lazyWithRetry(() => import('./SoundCheckPage'), m => m.SoundCheckPage);
const DisplayCheckPage = lazyWithRetry(() => import('./DisplayCheckPage'), m => m.DisplayCheckPage);

const CHECK_TABS = [
  { id: 'device', label: '기기·연결', emoji: '📶' },
  { id: 'sound', label: '소리', emoji: '🔈' },
  { id: 'display', label: '화면', emoji: '👀' },
] as const;
type CheckTab = typeof CHECK_TABS[number]['id'];
const parseCheckTab = (raw: string | null): CheckTab => CHECK_TABS.find(tab => tab.id === raw)?.id ?? 'device';

/**
 * 수업 전 확인 한 곳: 기기·연결 / 소리 / 화면을 위쪽 갈래에서 고른다.
 * 예전 주소(/device-check, /sound-check, /display-check)는 여기의 맞는 갈래로 이어진다.
 * 세 화면의 내용은 각자의 파일 그대로 쓰고, 여기서는 고르는 줄만 얹는다.
 */
export function ChecksPage() {
  const [params] = useSearchParams();
  const tab = parseCheckTab(params.get('tab'));
  const href = (id: CheckTab) => { const next = new URLSearchParams(params); next.set('tab', id); return `/checks?${next}`; };
  return <div className="checks-page" data-check-tab={tab}>
    <nav className="checks-tabs" aria-label="수업 전 확인 고르기">
      <span className="checks-tabs-title">수업 전 확인</span>
      {CHECK_TABS.map(item => <Link key={item.id} to={href(item.id)} replace aria-current={tab === item.id ? 'page' : undefined} data-check-tab-link={item.id}><span aria-hidden="true">{item.emoji}</span> {item.label}</Link>)}
    </nav>
    <Suspense fallback={<p className="checks-loading" role="status">확인 화면을 준비하고 있어요…</p>}>
      {tab === 'sound' ? <SoundCheckPage /> : tab === 'display' ? <DisplayCheckPage /> : <DeviceCheck />}
    </Suspense>
  </div>;
}
