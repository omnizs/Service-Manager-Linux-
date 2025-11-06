import React, { memo, useEffect } from 'react';
import type { Settings as SettingsType } from '../hooks/useSettings';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onUpdateSettings: (settings: Partial<SettingsType>) => void;
}

const Settings: React.FC<SettingsProps> = memo(({ isOpen, onClose, settings, onUpdateSettings }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const versionLabel = __APP_VERSION__ || '2.6.1';

  const handleAutoUpdateToggle = () => {
    onUpdateSettings({ autoUpdate: !settings.autoUpdate });
  };

  const handleIntervalChange = (interval: number) => {
    onUpdateSettings({ updateInterval: interval });
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    if (theme !== settings.theme) {
      onUpdateSettings({ theme });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/60 z-40 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme Settings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Appearance
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  settings.theme === 'light'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400/70 dark:bg-blue-500/10 dark:text-blue-100'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400/50 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">Light theme</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Bright interface suited for well-lit environments.</p>
                </div>
                <span
                  className={`h-3 w-3 rounded-full border-2 transition-colors ${
                    settings.theme === 'light'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  settings.theme === 'dark'
                    ? 'border-blue-500 bg-blue-900/20 text-blue-100'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400/50 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">Dark theme</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Low-light optimized colors with improved contrast.</p>
                </div>
                <span
                  className={`h-3 w-3 rounded-full border-2 transition-colors ${
                    settings.theme === 'dark'
                      ? 'border-blue-400 bg-blue-400'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Auto-Update Settings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Automatic Updates
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg select-none">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Auto-refresh services</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Automatically update service list</div>
                </div>
                <button
                  onClick={handleAutoUpdateToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.autoUpdate ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoUpdate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              {settings.autoUpdate && (
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <label className="block">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Update Interval</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{settings.updateInterval} min</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={settings.updateInterval}
                      onChange={(e) => handleIntervalChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1 min</span>
                      <span>30 min</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>Version:</strong> {versionLabel}</p>
              <p><strong>Framework:</strong> React 19 + Tailwind CSS 4</p>
              <p><strong>Build Tool:</strong> Vite 7</p>
              <p><strong>License:</strong> MIT</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

Settings.displayName = 'Settings';

export default Settings;

