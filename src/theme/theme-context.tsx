import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import { colors as lightColors, darkColors } from './tokens';

export type AppThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'smart-money-tracker:appearance';

type ThemeContextValue = {
  mode: AppThemeMode;
  ready: boolean;
  setMode: (mode: AppThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedMode) => {
      const nextMode: AppThemeMode = storedMode === 'dark' ? 'dark' : 'light';
      if (!active) return;
      setModeState(nextMode);
      if (Platform.OS !== 'web') Appearance.setColorScheme(nextMode);
    }).catch(() => {
      if (active && Platform.OS !== 'web') Appearance.setColorScheme('light');
    }).finally(() => {
      if (active) setReady(true);
    });

    return () => { active = false; };
  }, []);

  const setMode = useCallback(async (nextMode: AppThemeMode) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    setModeState(nextMode);
    if (Platform.OS !== 'web') Appearance.setColorScheme(nextMode);
  }, []);

  const value = useMemo(() => ({ mode, ready, setMode }), [mode, ready, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider.');
  return context;
}

export function useThemeColors() {
  const { mode } = useAppTheme();
  return mode === 'dark' ? darkColors : lightColors;
}
