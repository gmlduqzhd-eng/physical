import { nextTextScale, setTextScale, toggleTvMode, useDisplayPrefs, type TextScale } from '../../application/displayPrefs';
import './DisplayButtons.css';

const SCALE_LABEL: Record<TextScale, string> = { normal: '보통', large: '크게', xlarge: '더 크게' };

/** 교실 TV 모드 켜기·끄기. 진행 화면 어디에나 둘 수 있다. */
export function TvModeButton({ className = '' }: { className?: string }) {
  const { tvMode } = useDisplayPrefs();
  return <button type="button" className={`display-btn ${className}`.trim()} aria-pressed={tvMode} onClick={toggleTvMode}>
    <span aria-hidden="true">📺</span> TV 모드 {tvMode ? '끄기' : '켜기'}
  </button>;
}

/** 글씨 크기: 보통 → 크게 → 더 크게. */
export function TextScaleButton({ className = '' }: { className?: string }) {
  const { textScale } = useDisplayPrefs();
  return <button type="button" className={`display-btn ${className}`.trim()} aria-label={`글씨 크기: ${SCALE_LABEL[textScale]}. 눌러서 바꿔요`} onClick={() => setTextScale(nextTextScale(textScale))}>
    <span aria-hidden="true">가</span> 글씨 {SCALE_LABEL[textScale]}
  </button>;
}
