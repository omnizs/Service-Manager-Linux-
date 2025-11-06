import React, { memo } from 'react';
import type { CriticalityLevel } from '../utils/serviceCriticality';

interface CriticalityIconProps {
  level: CriticalityLevel;
}

const CriticalityIcon: React.FC<CriticalityIconProps> = memo(({ level }) => {
  switch (level) {
    case 'critical':
      return (
        <svg 
          className="w-3.5 h-3.5 text-red-600 dark:text-red-400" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
          aria-label="Critical service"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    case 'important':
      return (
        <svg 
          className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
          aria-label="Important service"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    case 'normal':
      return null;
  }
});

CriticalityIcon.displayName = 'CriticalityIcon';

export default CriticalityIcon;
