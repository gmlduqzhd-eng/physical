import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Smartphone, AlertTriangle } from 'lucide-react';

export const KakaoInAppNotice: React.FC = () => {
  const [isKakao, setIsKakao] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (/KAKAOTALK/i.test(ua)) {
      setIsKakao(true);
    }
  }, []);

  if (!isKakao || dismissed) return null;

  const openInExternalBrowser = () => {
    const currentUrl = window.location.href;
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
      // 안드로이드: 카카오톡 외부 브라우저 스키마 및 크롬 인텐트 시도
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    } else {
      // iOS: 카카오톡 외부 브라우저 스키마 (사파리 호출)
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    }
  };

  return (
    <aside aria-label="브라우저 전환 안내" className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-slate-950 px-4 py-3 shadow-xl border-b-2 border-amber-600 animate-in fade-in slide-in-from-top duration-300">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm font-semibold">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-950 shrink-0 animate-bounce" />
          <span>
            <strong>카카오톡 인앱 브라우저 안내:</strong> 체육 센서 측정(점프·스쿼트 등) 및 원활한 플레이를 위해 <strong>외부 브라우저</strong>를 권장합니다.
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={openInExternalBrowser}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white hover:bg-slate-800 rounded-lg font-bold text-xs transition-colors shadow-sm active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>크롬/사파리로 열기</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-amber-600/30 rounded-lg text-amber-950 transition-colors"
            title="닫기"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="mt-1 text-[11px] text-amber-900/90 text-center sm:text-left flex items-center justify-center sm:justify-start gap-1">
        <Smartphone className="w-3 h-3" />
        <span>화면 오른쪽 상단(또는 하단) <strong>[···]</strong> 버튼 {'>'} <strong>[다른 브라우저로 열기]</strong>를 누르셔도 됩니다.</span>
      </div>
    </aside>
  );
};
