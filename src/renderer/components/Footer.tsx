import React, { memo } from 'react';

interface FooterProps {
  serviceCount: number;
  totalCount: number;
  lastUpdated: Date | null;
  platform: string;
  loadTime: number | null;
  autoUpdateEnabled: boolean;
  updateInterval: number;
  appVersion?: string;
}

const Footer: React.FC<FooterProps> = memo(({ 
  serviceCount, 
  totalCount,
  lastUpdated, 
  platform, 
  loadTime,
  autoUpdateEnabled,
  updateInterval,
  appVersion
}) => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>
            {lastUpdated 
              ? `Updated: ${lastUpdated.toLocaleTimeString()}` 
              : 'Last updated: —'}
          </span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <span className="font-medium">
            {serviceCount === totalCount 
              ? `${serviceCount} ${serviceCount === 1 ? 'service' : 'services'}`
              : `${serviceCount} of ${totalCount} services`
            }
          </span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <span>{platform}</span>
          {appVersion && (
            <>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span className="text-gray-500 dark:text-gray-500">v{appVersion}</span>
            </>
          )}
          {autoUpdateEnabled && (
            <>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Auto-update: {updateInterval} min</span>
              </span>
            </>
          )}
        </div>
        
        <div>
          <span className="text-gray-500 dark:text-gray-500">
            {loadTime !== null ? `⚡ ${loadTime}ms` : '—'}
          </span>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;

