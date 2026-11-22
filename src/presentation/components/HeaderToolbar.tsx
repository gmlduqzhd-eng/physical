import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../application/ThemeContext';
import { HeaderUtilities } from './HeaderUtilities';
import { AppInstallButton } from './AppInstallButton';
import { closeHeaderPopovers } from './HeaderPopover';
import './HeaderToolbar.css';

/** Shared controls, up to two page-specific icon actions, then the app install button at the far right.
 * studentMode: 학생 화면(입장·모둠 폰·수업방 놀이)에서는 페이지 버튼(뒤로·도움말)만 두고
 * 음악·화면 보기·공유·테마·설치는 숨긴다(1학년이 엉뚱한 곳을 누르지 않게). */
export function HeaderToolbar({ children, className = '', label = '이용 설정', studentMode = false }: {
  children: ReactNode; className?: string; label?: string; studentMode?: boolean;
}) {
  const { isDark, toggleTheme } = useTheme();
  const themeLabel = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';
  if (studentMode) return <nav className={`header-icon-scope icon-toolbar icon-toolbar-student ${className}`} aria-label={label}>{children}</nav>;
  return <nav className={`header-icon-scope icon-toolbar ${className}`} aria-label={label} onClickCapture={event => {
    if ((event.target as Element).closest('.music-trigger,.share-trigger,.app-install-trigger,.icon-toolbar-action')) closeHeaderPopovers(event.target);
  }}>
    <HeaderUtilities/>
    <button className="icon-toolbar-action" type="button" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
      {isDark ? <Sun aria-hidden="true"/> : <Moon aria-hidden="true"/>}<span>{themeLabel}</span>
    </button>
    {children}
    {/* The install button closes the row, after the page's own actions. */}
    <AppInstallButton/>
  </nav>;
}
