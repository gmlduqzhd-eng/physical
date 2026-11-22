import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClass, type ButtonLook } from './uiClass';

/** 공통 버튼. `type`을 적지 않으면 button 이다(폼을 실수로 내지 않게). */
export function Button({ variant, size, block, className, type = 'button', ...rest }: ButtonLook & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, size, block, className })} {...rest} />;
}

/** 버튼 모양의 앱 안 링크. */
export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLook & LinkProps) {
  return <Link className={buttonClass({ variant, size, block, className })} {...rest} />;
}

/** 버튼 모양의 바깥 링크(새 창·다른 사이트). */
export function ButtonAnchor({ variant, size, block, className, children, ...rest }: ButtonLook & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClass({ variant, size, block, className })} {...rest}>{children}</a>;
}
