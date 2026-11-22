/** 공통 버튼·카드의 클래스 이름. 모양은 src/presentation/ui.css 가 정한다. */

/** 버튼 종류: 주 버튼(한 화면에 하나) · 보조 · 위험(끝내기·지우기). */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';
/** 크기: 기본 48px · 큰 버튼 64px(학생 화면·TV). */
export type ButtonSize = 'md' | 'lg';

export interface ButtonLook { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string }

export function buttonClass({ variant = 'secondary', size = 'md', block = false, className = '' }: ButtonLook = {}): string {
  return ['ui-btn', `ui-btn--${variant}`, size === 'lg' ? 'ui-btn--lg' : '', block ? 'ui-btn--block' : '', className].filter(Boolean).join(' ');
}

/** `focus`는 화면에서 가장 먼저 볼 카드(굵은 초록 테두리). */
export function cardClass({ focus = false, className = '' }: { focus?: boolean; className?: string } = {}): string {
  return ['ui-card', focus ? 'ui-card--focus' : '', className].filter(Boolean).join(' ');
}
