import type { HTMLAttributes } from 'react';
import { cardClass } from './uiClass';

type CardProps = { focus?: boolean; as?: 'div' | 'section' | 'article' | 'li' } & HTMLAttributes<HTMLElement>;

/** 공통 카드. 모양은 ui.css 의 .ui-card 가 정한다. */
export function Card({ focus, as: Tag = 'div', className, ...rest }: CardProps) {
  return <Tag className={cardClass({ focus, className })} {...rest} />;
}
