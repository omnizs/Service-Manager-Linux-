
export type CriticalityLevel = 'critical' | 'important' | 'normal';

export interface ServiceCriticalityInfo {
  level: CriticalityLevel;
  description: string;
  warning?: string;
}

const CRITICAL_SERVICES = {
  windows: [
    'eventlog',
    'rpcss',
    'lsm',
    'lsass',
    'csrss',
    'services',
    'smss',
    'winlogon',
    'system',
    'dnscache',
    'dhcp',
    'bfe',
    'mpssvc',
  ],
  linux: [
    'systemd',
    'systemd-journald',
    'systemd-logind',
    'systemd-udevd',
    'dbus',
    'NetworkManager',
    'sshd',
    'firewalld',
    'chronyd',
    'systemd-resolved',
  ],
  macos: [
    'com.apple.SystemUIServer',
    'com.apple.WindowServer',
    'com.apple.networkd',
    'com.apple.mDNSResponder',
    'com.apple.securityd',
    'com.apple.logd',
    'com.apple.configd',
  ],
};

const IMPORTANT_SERVICES = {
  windows: [
    'wuauserv',
    'spoolsv',
    'audiosrv',
    'bits',
    'cryptsvc',
    'lanmanserver',
    'lanmanworkstation',
    'netman',
    'nsi',
    'schedule',
    'themes',
    'winmgmt',
    'wscsvc',
  ],
  linux: [
    'bluetooth',
    'cups',
    'avahi-daemon',
    'accounts-daemon',
    'polkit',
    'udisks2',
    'rtkit-daemon',
    'colord',
  ],
  macos: [
    'com.apple.audio.coreaudiod',
    'com.apple.bluetoothd',
    'com.apple.printd',
  ],
};

function normalizeIdentifier(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.service$/, '')
    .replace(/^com\.apple\./, '')
    .trim();
}

const CRITICAL_SERVICES_NORMALIZED = {
  windows: CRITICAL_SERVICES.windows.map(normalizeIdentifier),
  linux: CRITICAL_SERVICES.linux.map(normalizeIdentifier),
  macos: CRITICAL_SERVICES.macos.map(normalizeIdentifier),
} as const;

const IMPORTANT_SERVICES_NORMALIZED = {
  windows: IMPORTANT_SERVICES.windows.map(normalizeIdentifier),
  linux: IMPORTANT_SERVICES.linux.map(normalizeIdentifier),
  macos: IMPORTANT_SERVICES.macos.map(normalizeIdentifier),
} as const;

const CRITICAL_SERVICES_SET = {
  windows: new Set(CRITICAL_SERVICES_NORMALIZED.windows),
  linux: new Set(CRITICAL_SERVICES_NORMALIZED.linux),
  macos: new Set(CRITICAL_SERVICES_NORMALIZED.macos),
} as const;

const IMPORTANT_SERVICES_SET = {
  windows: new Set(IMPORTANT_SERVICES_NORMALIZED.windows),
  linux: new Set(IMPORTANT_SERVICES_NORMALIZED.linux),
  macos: new Set(IMPORTANT_SERVICES_NORMALIZED.macos),
} as const;

function detectPlatform(serviceName: string, serviceId: string): 'windows' | 'linux' | 'macos' {
  if (serviceName.startsWith('com.apple.') || serviceId.includes('com.apple')) {
    return 'macos';
  }
  
  if (serviceName.includes('systemd') || serviceId.endsWith('.service')) {
    return 'linux';
  }
  
  return 'windows';
}

export function getServiceCriticality(
  serviceName: string,
  serviceId: string,
  description?: string
): ServiceCriticalityInfo {
  const normalizedName = normalizeIdentifier(serviceName);
  const normalizedId = normalizeIdentifier(serviceId);
  const platform = detectPlatform(serviceName, serviceId);
  
  const criticalSet = CRITICAL_SERVICES_SET[platform];
  const importantSet = IMPORTANT_SERVICES_SET[platform];
  
  const isCritical = criticalSet.has(normalizedName) || criticalSet.has(normalizedId) ||
    Array.from(criticalSet).some(critical => 
      normalizedName.includes(critical) || normalizedId.includes(critical)
    );
  
  if (isCritical) {
    return {
      level: 'critical',
      description: 'Critical system service - exercise extreme caution',
      warning: 'Stopping this service may cause system instability or prevent normal operation',
    };
  }
  
  const isImportant = importantSet.has(normalizedName) || importantSet.has(normalizedId) ||
    Array.from(importantSet).some(important => 
      normalizedName.includes(important) || normalizedId.includes(important)
    );
  
  if (isImportant) {
    return {
      level: 'important',
      description: 'Important service - may affect functionality',
      warning: 'Stopping this service may disable certain features',
    };
  }
  
  return {
    level: 'normal',
    description: 'Standard service',
  };
}

export function getCriticalityBadgeClasses(level: CriticalityLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800';
    case 'important':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-800';
    case 'normal':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700';
  }
}
