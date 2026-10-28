import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../application/ThemeContext';
import { HeaderUtilities } from './HeaderUtilities';
import { closeHeaderPopovers } from './HeaderPopover';
import './HeaderToolbar.css';

/** Four shared controls, followed by up to two page-specific icon actions. */
export function HeaderToolbar({ children, className = '', label = '이용 설정' }: {
  children: ReactNode; className?: string; label?: string;
}) {
  const { isDark, toggleTheme } = useTheme();
  const themeLabel = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';
  return <nav className={`header-icon-scope icon-toolbar ${className}`} aria-label={label} onClickCapture={event => {
    if ((event.target as Element).closest('.music-trigger,.share-trigger,.app-install-trigger,.icon-toolbar-action')) closeHeaderPopovers(event.target);
  }}>
    <HeaderUtilities/>
    <button className="icon-toolbar-action" type="button" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
      {isDark ? <Sun aria-hidden="true"/> : <Moon aria-hidden="true"/>}<span>{themeLabel}</span>
    </button>
    {children}
  </nav>;
}
