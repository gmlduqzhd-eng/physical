import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './presentation/fontFaces.css'
import './presentation/ui.css'
import './presentation/ApplicationPalette.css'
import './presentation/ForestTheme.css'
import App from './App.tsx'
import { claimReloadSlot, currentEntryScript, decideReloadAfterChunkError } from './application/deployCheck'

// 화면 파일을 못 받으면(vite:preloadError) 기본 동작대로 오류를 놀이 오류 화면에 넘긴다.
// 새로 배포되어 예전 파일이 없어진 경우에만(서버의 index.html 시작 스크립트가 바뀜) 한 번 새로고침한다.
// 인터넷이 끊겨 있으면 새로고침하지 않는다. 새로고침하면 브라우저의 '인터넷 없음' 페이지가 되어 버린다.
window.addEventListener('vite:preloadError', () => {
  void decideReloadAfterChunkError({
    online: navigator.onLine !== false,
    current: currentEntryScript(),
    fetchIndex: () => fetch('/index.html', { cache: 'no-store' }).then(r => { if (!r.ok) throw Error(String(r.status)); return r.text(); }),
  }).then(decision => { if (decision === 'reload' && claimReloadSlot()) window.location.reload(); });
});
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { purgeLegacyPersonalData } from './application/browserStorage'
import { getDisplayPrefs } from './application/displayPrefs'
import { startAppRuntime } from './application/appRuntime'
import './presentation/components/DisplayButtons.css'
import './presentation/Readability.css'

purgeLegacyPersonalData();
startAppRuntime(); // 잡히지 않은 오류를 콘솔에 남기고, 처음 받은 화면 파일을 서비스워커에 알려 준다

// 계정 자동 보관: 선생님 로그인 정보가 있을 때만 받는다(학생 휴대폰과 로그인하지 않은 화면은 받지 않는다).
try {
  if (sessionStorage.getItem('physical_supabase_auth') || localStorage.getItem('physical_supabase_auth')) void import('./application/cloudAutoSync').then(m => m.startAutoSync()).catch(() => {});
} catch { /* 저장소가 막혀 있으면 자동 보관 없이 */ }

getDisplayPrefs(); // TV 모드·글씨 크기를 첫 그리기 전에 맞춘다
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
