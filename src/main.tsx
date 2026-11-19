import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './presentation/fontFaces.css'
import './presentation/ApplicationPalette.css'
import './presentation/ForestTheme.css'
import App from './App.tsx'

// 새 버전이 배포된 뒤 열려 있던 탭이 예전 화면 파일을 찾지 못하면, 한 번만 새로고침해 새 버전을 받는다.
window.addEventListener('vite:preloadError', event => {
  try {
    const key = 'physical_reloaded_for_update', last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch { /* 저장소를 못 쓰면 그냥 새로고침한다. */ }
  event.preventDefault();
  window.location.reload();
});
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { purgeLegacyPersonalData } from './application/browserStorage'

purgeLegacyPersonalData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
