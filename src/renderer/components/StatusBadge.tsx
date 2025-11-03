import React, { memo } from 'react';

interface StatusBadgeProps {
  status: string | undefined;
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = memo(({ status, label }) => {
  const normalizeStatus = (s: string | undefined): string => {
    if (!s) return 'unknown';
    const lower = s.toLowerCase();
    
    if (lower.includes('inactive') || lower.includes('dead') || lower.includes('stopped')) return 'inactive';
    if (lower.includes('active') || lower.includes('running')) return 'active';
    if (lower.includes('failed')) return 'failed';
    if (lower.includes('activating')) return 'activating';
    if (lower.includes('deactivating')) return 'deactivating';
    
    return lower;
  };

  const formatLabel = (l: string | undefined): string => {
    if (!l) return 'Unknown';
    const cleaned = l.replace(/\s*\([^)]*\)/g, '').trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  const normalizedStatus = normalizeStatus(status);
  const displayLabel = formatLabel(label || status);

  const statusStyles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
    inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
    activating: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    deactivating: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    unknown: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[normalizedStatus] || statusStyles.unknown}`}>
      {displayLabel}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;

