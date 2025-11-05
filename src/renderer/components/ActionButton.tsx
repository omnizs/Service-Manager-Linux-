import React, { memo } from 'react';

interface ActionButtonProps {
  action: 'start' | 'stop' | 'restart' | 'enable' | 'disable';
  enabled: boolean;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = memo(({ action, enabled, onClick }) => {
  const labels: Record<ActionButtonProps['action'], string> = {
    start: 'Start',
    stop: 'Stop',
    restart: 'Restart',
    enable: 'Enable',
    disable: 'Disable',
  };

  const tooltips: Record<ActionButtonProps['action'], string> = {
    start: 'Start the service - initiates the service process',
    stop: 'Stop the service - terminates the running service process',
    restart: 'Restart the service - stops and then starts the service',
    enable: 'Enable the service - sets the service to start automatically',
    disable: 'Disable the service - prevents automatic startup',
  };

  const icons: Record<ActionButtonProps['action'], JSX.Element> = {
    start: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.25 5.653v12.694a.75.75 0 001.125.65l11.25-6.347a.75.75 0 000-1.3L6.375 5.003a.75.75 0 00-1.125.65z" />
      </svg>
    ),
    stop: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="1.5" />
      </svg>
    ),
    restart: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.5 12a7.5 7.5 0 0112.948-5.303l1.552 1.553M19.5 12a7.5 7.5 0 01-12.948 5.303L5 15.75M19.5 6.75v4.5h-4.5" />
      </svg>
    ),
    enable: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12.5l4 4 10-10" />
      </svg>
    ),
    disable: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14" />
      </svg>
    ),
  };

  const styles: Record<ActionButtonProps['action'], string> = {
    start: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white',
    stop: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white',
    restart: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white',
    enable: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white',
    disable: 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
        enabled ? `${styles[action]} cursor-pointer` : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
      }`}
      title={enabled ? tooltips[action] : `Cannot ${labels[action].toLowerCase()} - action not available for this service`}
    >
      <span className="flex items-center gap-1.5">
        <span className="flex-shrink-0">{icons[action]}</span>
        <span>{labels[action]}</span>
      </span>
    </button>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;

