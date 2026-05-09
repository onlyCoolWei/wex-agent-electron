import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProviderContext, type Theme, type ThemeProviderState } from './theme-context';

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children, defaultTheme = 'dark', storageKey = 'wex-agent-theme' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey);
    return isTheme(storedTheme) ? storedTheme : defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
      const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
    }

    applyTheme();
    localStorage.setItem(storageKey, theme);

    if (theme !== 'system') return undefined;

    mediaQuery.addEventListener('change', applyTheme);

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
    };
  }, [storageKey, theme]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      setTheme: setThemeState,
    }),
    [theme],
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}
