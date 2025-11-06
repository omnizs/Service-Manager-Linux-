import { useState, useEffect, useCallback } from 'react';

export interface Settings {
  theme: 'light' | 'dark';
  autoUpdate: boolean;
  updateInterval: number;
}

const getPreferredTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
};

const sanitizeTheme = (theme: unknown): 'light' | 'dark' => {
  return theme === 'light' ? 'light' : 'dark';
};

const DEFAULT_SETTINGS: Settings = {
  theme: getPreferredTheme(),
  autoUpdate: true,
  updateInterval: 10,
};

const STORAGE_KEY = 'service-manager-settings';

const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = { ...DEFAULT_SETTINGS, ...parsed } as Settings;
      merged.theme = sanitizeTheme((parsed as Settings).theme);
      return merged;
    }
  } catch (error) {
    console.error('Failed to load settings', error);
  }
  return DEFAULT_SETTINGS;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const isDark = settings.theme === 'dark';

    root.classList.toggle('dark', isDark);
    body.dataset.theme = settings.theme;
    body.style.colorScheme = isDark ? 'dark' : 'light';
  }, [settings.theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings', error);
    }
  }, [settings]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          const merged = { ...DEFAULT_SETTINGS, ...newSettings } as Settings;
          merged.theme = sanitizeTheme((newSettings as Settings).theme);
          setSettings(merged);
        } catch (error) {
          console.error('Failed to sync settings', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial } as Settings;
      if (partial.theme) {
        next.theme = sanitizeTheme(partial.theme);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};

