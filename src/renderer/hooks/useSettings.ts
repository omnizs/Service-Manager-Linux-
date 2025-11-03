import { useState, useEffect, useCallback } from 'react';

export interface Settings {
  theme: 'light' | 'dark';
  autoUpdate: boolean;
  updateInterval: number; // in minutes
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  autoUpdate: true,
  updateInterval: 5,
};

const STORAGE_KEY = 'service-manager-settings';

// Helper function to load settings from localStorage
const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, theme: 'dark' };
    }
  } catch (error) {
    console.error('Failed to load settings', error);
  }
  return DEFAULT_SETTINGS;
};

export const useSettings = () => {
  // React 19 optimization: Lazy initialization
  const [settings, setSettings] = useState<Settings>(loadSettings);

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const isDark = settings.theme === 'dark';

    root.classList.toggle('dark', isDark);
    body.dataset.theme = settings.theme;
    body.style.colorScheme = isDark ? 'dark' : 'light';
  }, [settings.theme]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings', error);
    }
  }, [settings]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...newSettings, theme: 'dark' });
        } catch (error) {
          console.error('Failed to sync settings', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Memoized update function - React 19 optimization
  const updateSettings = useCallback((partial: Partial<Settings>) => {
    const safePartial = { ...partial };
    if (safePartial.theme && safePartial.theme !== 'dark') {
      safePartial.theme = 'dark';
    }

    setSettings(prev => ({ ...prev, ...safePartial, theme: 'dark' }));
  }, []);

  // Memoized reset function - React 19 optimization
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};

