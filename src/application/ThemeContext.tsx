import { useState, useEffect, useLayoutEffect, createContext, useContext, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

/** 직접 고른 밝기. 이 기기에 남는다(새 탭·다음 방문에도). */
const themeKey = 'physical_theme_v1';
/** 예전에는 탭마다만 기억했고 처음 열 때 'light'를 저절로 적었다. 직접 고른 게 분명한 'dark'만 이어받는다. */
const legacyTabKey = 'physical_theme_tab_v1';
const darkQuery = '(prefers-color-scheme: dark)';
const asTheme = (value: string | null): Theme | null => value === 'dark' || value === 'light' ? value : null;
function readSaved(): Theme | null {
  try { return asTheme(window.localStorage.getItem(themeKey)) ?? (window.sessionStorage.getItem(legacyTabKey) === 'dark' ? 'dark' : null); } catch { return null; }
}
const systemTheme = (): Theme => { try { return window.matchMedia?.(darkQuery).matches ? 'dark' : 'light'; } catch { return 'light'; } };

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // 처음 오면 기기 설정(밝게·어둡게)을 따르고, 직접 바꾸면 그 선택을 이 기기에 기억한다.
  const [chosen, setChosen] = useState<Theme | null>(readSaved);
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = chosen ?? system;

  // 직접 고르지 않았으면 기기 설정이 바뀔 때(저녁에 어둡게 등) 함께 바뀐다.
  useEffect(() => {
    if (chosen) return;
    const media = window.matchMedia?.(darkQuery);
    if (!media) return;
    const follow = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener?.('change', follow);
    return () => media.removeEventListener?.('change', follow);
  }, [chosen]);
  // '기기 정보 지우기'를 누르면 직접 고른 밝기도 지워지니 다시 기기 설정을 따른다.
  useEffect(() => {
    const cleared = () => setChosen(null);
    window.addEventListener?.('physical-device-cleared', cleared);
    return () => window.removeEventListener?.('physical-device-cleared', cleared);
  }, []);

  // 다른 탭에서 밝기를 바꾸면 이 탭도 따라간다.
  useEffect(() => {
    const synced = (event: StorageEvent) => { if (event.key === null || event.key === themeKey) setChosen(readSaved()); };
    window.addEventListener?.('storage', synced);
    return () => window.removeEventListener?.('storage', synced);
  }, []);

  // 첫 페인트 전에 .dark 클래스를 적용해 dark: 변형의 깜빡임을 방지
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme', 'dark');
    } else {
      root.classList.add('dark-theme', 'dark');
      root.classList.remove('light-theme');
    }
    const background = getComputedStyle(root).getPropertyValue('--forest-bg').trim();
    if (background) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setChosen(next);
    try { window.localStorage.setItem(themeKey, next); window.sessionStorage.removeItem(legacyTabKey); } catch { /* 저장소를 못 쓰면 이번 화면에서만 유지한다. */ }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
