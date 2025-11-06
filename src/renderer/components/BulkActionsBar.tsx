import React from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onAction: (action: 'start' | 'stop' | 'restart' | 'enable' | 'disable') => void;
  pending?: boolean;
}

const actionLabels: Record<BulkActionsBarProps['onAction'] extends (action: infer A) => void ? A : never, string> = {
  start: 'Start',
  stop: 'Stop',
  restart: 'Restart',
  enable: 'Enable',
  disable: 'Disable',
};

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ selectedCount, onClear, onAction, pending = false }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 z-40">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedCount}</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">selected</span>
      </div>
      <div className="flex items-center gap-2">
        {(Object.keys(actionLabels) as Array<'start' | 'stop' | 'restart' | 'enable' | 'disable'>).map(action => (
          <button
            key={action}
            onClick={() => onAction(action)}
            disabled={pending}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {actionLabels[action]}
          </button>
        ))}
      </div>
      <button
        onClick={onClear}
        disabled={pending}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
      >
        Clear
      </button>
    </div>
  );
};

export default BulkActionsBar;
