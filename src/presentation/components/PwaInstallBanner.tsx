import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  });
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isDismissed || isStandalone) return false;
    return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone;

    if (isDismissed || isStandalone) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-bounce-subtle">
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white border border-cyan-500/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-cyan-400">앱으로 더 빠르게</p>
              <p className="text-sm font-bold text-slate-100">홈 화면에 설치하고 전체화면 플레이</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              설치
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-cyan-400">아이폰 / 아이패드 설치 방법</h3>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              1. 사파리(Safari) 하단의 <span className="font-bold text-white">공유 버튼 (사각형+화살표)</span>을 누릅니다.<br />
              2. 메뉴에서 <span className="font-bold text-white">"홈 화면에 추가"</span>를 선택합니다.<br />
              3. 우측 상단의 <span className="font-bold text-cyan-400">"추가"</span>를 누르면 앱처럼 실행됩니다.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-sm text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
};
