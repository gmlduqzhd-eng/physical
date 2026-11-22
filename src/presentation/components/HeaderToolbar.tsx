import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { HeaderMoreMenu, HeaderUtilities } from './HeaderUtilities';
import { closeHeaderPopovers } from './HeaderPopover';
import { isStudentRoute } from '../../application/audience';
import './HeaderToolbar.css';

/**
 * 머리말 도구 줄: '화면·소리' 설정 → (선생님 로그인 표시) → 화면마다 다른 단추(뒤로 가기·이용 안내 등) → '⋯ 더보기'(링크 공유·앱 설치).
 * data-audience="student"이면 학생 화면이다(학생 화면에서 줄일 단추는 이 값으로 고른다).
 */
export function HeaderToolbar({ children, className = '', label = '이용 설정', studentMode = false }: {
  children: ReactNode; className?: string; label?: string; studentMode?: boolean;
}) {
  const { pathname, search } = useLocation();
  // studentMode: 학생 화면(입장·모둠 폰·수업방 놀이)에서는 페이지 단추(뒤로·도움말)만 둔다(1학년이 엉뚱한 곳을 누르지 않게).
  if (studentMode) return <nav className={`header-icon-scope icon-toolbar icon-toolbar-student ${className}`} aria-label={label} data-audience="student">{children}</nav>;
  return <nav className={`header-icon-scope icon-toolbar ${className}`} aria-label={label} data-audience={isStudentRoute(pathname, search) ? 'student' : 'teacher'} onClickCapture={event => {
    if ((event.target as Element).closest('.music-trigger,.share-trigger,.app-install-trigger,.icon-toolbar-action')) closeHeaderPopovers(event.target);
  }}>
    <HeaderUtilities/>
    {children}
    {/* 더보기는 화면마다 다른 단추 뒤, 줄의 맨 끝에 둔다. */}
    <HeaderMoreMenu/>
  </nav>;
}
