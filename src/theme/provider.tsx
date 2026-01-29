import React, { useEffect, createContext, useContext } from 'react';
import { useProfileStore } from '../store/profile';
import { logger } from '../services/logging';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme: setProfileTheme } = useProfileStore();
  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>('light');

  // Detect system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const newTheme =
        theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme;

      setEffectiveTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      // Also toggle class for broad compatibility
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      logger.debug(`Theme applied: ${newTheme}`);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  const value: ThemeContextType = {
    theme: theme as ThemeType,
    effectiveTheme,
    setTheme: (newTheme: ThemeType) => {
      setProfileTheme(newTheme);
      logger.info(`🌜 Theme changed to: ${newTheme}`);
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
