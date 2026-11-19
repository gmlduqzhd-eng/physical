import { useState, useLayoutEffect, createContext, useContext, type ReactNode } from 'react';

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

const themeKey = 'physical_theme_tab_v1';
function readTabTheme(): Theme {
  try { return window.sessionStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Every fresh visit starts in daylight; a manual change lasts for this tab, including reloads.
  const [theme, setTheme] = useState<Theme>(readTabTheme);

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
    try { window.sessionStorage.setItem(themeKey, theme); } catch { /* 저장소를 못 쓰면 이번 화면에서만 유지한다. */ }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
