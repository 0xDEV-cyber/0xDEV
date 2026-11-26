import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  getThemeDefinition,
  normalizeStoredThemeId,
  ThemeDefinition,
  ThemeId,
  THEMES,
} from '../data/themes';

export type { ThemeDefinition, ThemeId };

const STORAGE_KEY = '0xdev_theme';
const LAST_LIGHT_KEY = '0xdev_theme_last_light';
const LAST_DARK_KEY = '0xdev_theme_last_dark';

interface ThemeContextValue {
  theme: ThemeId;
  themeDefinition: ThemeDefinition;
  themes: ThemeDefinition[];
  isDark: boolean;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
  pickRandomTheme: () => ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_LIGHT_THEME_ID;
  try {
    const stored = normalizeStoredThemeId(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
    if (document.documentElement.classList.contains('dark')) {
      return DEFAULT_DARK_THEME_ID;
    }
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return DEFAULT_DARK_THEME_ID;
    }
  } catch {
    // Ignore storage access errors
  }
  return DEFAULT_LIGHT_THEME_ID;
}

function applyThemeToDocument(definition: ThemeDefinition) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = definition.mode === 'dark';
  const isCustom =
    definition.id !== DEFAULT_LIGHT_THEME_ID && definition.id !== DEFAULT_DARK_THEME_ID;

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', definition.id);
  root.setAttribute('data-theme-mode', definition.mode);
  root.setAttribute('data-theme-custom', isCustom ? 'true' : 'false');
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const t = definition.tokens;
  root.style.setProperty('--brand-navy', t.primary);
  root.style.setProperty('--brand-navy-deep', t.primaryDeep);
  root.style.setProperty('--brand-navy-muted', t.primaryMuted);
  root.style.setProperty('--brand-red', t.accent);
  root.style.setProperty('--brand-red-hover', t.accentHover);
  root.style.setProperty('--brand-bg', t.bg);
  root.style.setProperty('--brand-surface', t.surface);
  root.style.setProperty('--brand-text-heading', t.textHeading);
  root.style.setProperty('--brand-text-body', t.textBody);
  root.style.setProperty('--brand-text-muted', t.textMuted);
  root.style.setProperty('--brand-border', t.border);

  root.style.setProperty('--theme-card', t.card);
  root.style.setProperty('--theme-inset', t.inset);
  root.style.setProperty('--theme-elevated', t.elevated);
  root.style.setProperty('--theme-border-strong', t.borderStrong);
  root.style.setProperty('--theme-primary-fill', t.primaryFill);
  root.style.setProperty('--theme-primary-fill-hover', t.primaryFillHover);
  root.style.setProperty('--theme-accent-soft', t.accentSoft);
  root.style.setProperty('--theme-link-soft', t.linkSoft);
  root.style.setProperty('--theme-dark-hero', t.darkHero);
  root.style.setProperty('--theme-dark-hero-deep', t.darkHeroDeep);

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', t.themeColorMeta);
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(getInitialThemeId);

  const themeDefinition = useMemo(() => getThemeDefinition(theme), [theme]);

  useEffect(() => {
    applyThemeToDocument(themeDefinition);
  }, [themeDefinition]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      try {
        const stored = normalizeStoredThemeId(window.localStorage.getItem(STORAGE_KEY));
        if (stored) return;
      } catch {
        // Ignore storage errors
      }
      setThemeState(e.matches ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID);
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  const persistThemeSelection = useCallback((nextId: ThemeId) => {
    const def = getThemeDefinition(nextId);
    try {
      window.localStorage.setItem(STORAGE_KEY, def.id);
      window.localStorage.setItem(
        def.mode === 'dark' ? LAST_DARK_KEY : LAST_LIGHT_KEY,
        def.id
      );
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const setTheme = useCallback(
    (nextTheme: ThemeId) => {
      const def = getThemeDefinition(nextTheme);
      setThemeState(def.id);
      persistThemeSelection(def.id);
    },
    [persistThemeSelection]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const prevDef = getThemeDefinition(prev);
      const wantDark = prevDef.mode === 'light';
      let nextId: ThemeId = wantDark ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
      try {
        const remembered = normalizeStoredThemeId(
          window.localStorage.getItem(wantDark ? LAST_DARK_KEY : LAST_LIGHT_KEY)
        );
        if (remembered) {
          const rememberedDef = getThemeDefinition(remembered);
          if (rememberedDef.mode === (wantDark ? 'dark' : 'light')) {
            nextId = rememberedDef.id;
          }
        }
      } catch {
        // Ignore storage errors
      }
      persistThemeSelection(nextId);
      return nextId;
    });
  }, [persistThemeSelection]);

  const pickRandomTheme = useCallback(() => {
    const candidates = THEMES.filter((item) => item.id !== theme);
    const chosen =
      candidates[Math.floor(Math.random() * candidates.length)] || THEMES[0];
    setThemeState(chosen.id);
    persistThemeSelection(chosen.id);
    return chosen;
  }, [theme, persistThemeSelection]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeDefinition,
        themes: THEMES,
        isDark: themeDefinition.mode === 'dark',
        setTheme,
        toggleTheme,
        pickRandomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
