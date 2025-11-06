
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

function detectPlatform(serviceName: string, serviceId: string): 'windows' | 'linux' | 'macos' {
  if (serviceName.startsWith('com.apple.') || serviceId.includes('com.apple')) {
    return 'macos';
  }
  
  if (serviceName.includes('systemd') || serviceId.endsWith('.service')) {
    return 'linux';
  }
  
  return 'windows';
}

function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.service$/, '')
    .replace(/^com\.apple\./, '')
    .trim();
}

export function getServiceCriticality(
  serviceName: string,
  serviceId: string,
  description?: string
): ServiceCriticalityInfo {
  const normalizedName = normalizeServiceName(serviceName);
  const normalizedId = normalizeServiceName(serviceId);
  const platform = detectPlatform(serviceName, serviceId);
  
  const isCritical = CRITICAL_SERVICES[platform].some(
    critical => 
      normalizedName.includes(critical.toLowerCase()) ||
      normalizedId.includes(critical.toLowerCase())
  );
  
  if (isCritical) {
    return {
      level: 'critical',
      description: 'Critical system service - exercise extreme caution',
      warning: 'Stopping this service may cause system instability or prevent normal operation',
    };
  }
  
  const isImportant = IMPORTANT_SERVICES[platform].some(
    important => 
      normalizedName.includes(important.toLowerCase()) ||
      normalizedId.includes(important.toLowerCase())
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

export function getCriticalityIcon(level: CriticalityLevel): string {
  switch (level) {
    case 'critical':
      return '⚠️';
    case 'important':
      return '⚡';
    case 'normal':
      return '';
  }
}
