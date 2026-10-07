import { useState, useLayoutEffect, createContext, useContext, type ReactNode } from 'react';
import { readStorage, writeStorage } from './browserStorage';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readStorage('physical_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // 첫 페인트 전에 .dark 클래스를 적용해 dark: 변형의 깜빡임을 방지
  useLayoutEffect(() => {
    writeStorage('physical_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme', 'dark');
    } else {
      root.classList.add('dark-theme', 'dark');
      root.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
