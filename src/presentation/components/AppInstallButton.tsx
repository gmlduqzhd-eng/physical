import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { useModalDialog } from '../../application/useModalDialog';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppInstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState(false);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const dialogRef = useModalDialog(guide, () => setGuide(false));

  useEffect(() => {
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); setGuide(false); };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  async function install() {
    if (busy || installed) return;
    if (!prompt) { setGuide(true); return; }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch { setGuide(true); }
    finally { setPrompt(null); setBusy(false); }
  }

  return <>
    <button className="app-install-trigger" type="button" title={installed ? '설치됨' : busy ? '설치 중' : '앱 설치'} onClick={event => { event.currentTarget.focus({ preventScroll: true }); void install(); }} disabled={busy || installed}>
      <Download aria-hidden="true"/><span>{installed ? '설치됨' : busy ? '설치 중' : '앱 설치'}</span>
    </button>
    {guide && createPortal(<div className="header-icon-scope header-modal-layer"><div className="install-backdrop"><div ref={dialogRef} className="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" tabIndex={-1}>
      <div className="install-heading"><Download className="install-icon" aria-hidden="true"/><button className="install-close" type="button" aria-label="설치 안내 닫기" onClick={() => setGuide(false)}><X aria-hidden="true"/></button></div>
      <h2 id="install-title">앱으로 더 간편하게</h2>
      <p>기기의 브라우저에서 홈 화면에 추가하면 더 빠르게 접속할 수 있어요.</p>
      <ul><li><strong>아이폰·아이패드</strong><br/>Safari에서 공유 → 홈 화면에 추가</li><li><strong>안드로이드</strong><br/>Chrome 메뉴 → 앱 설치 또는 홈 화면에 추가</li><li><strong>PC</strong><br/>Chrome·Edge 주소창의 설치 아이콘 또는 브라우저 메뉴에서 설치</li></ul>
      <p>설치 메뉴가 보이지 않으면 지원 브라우저에서 다시 열어 주세요. 카카오톡 등 앱 안에서는 외부 브라우저로 열어 주세요.</p>
      <button className="install-confirm" type="button" onClick={() => setGuide(false)}>확인했어요</button>
    </div></div></div>, document.body)}
  </>;
}
