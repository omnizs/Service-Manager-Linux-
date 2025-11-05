/**
 * Service Criticality Utility
 * Determines the criticality level of system services
 */

export type CriticalityLevel = 'critical' | 'important' | 'normal';

export interface ServiceCriticalityInfo {
  level: CriticalityLevel;
  description: string;
  warning?: string;
}

/**
 * List of critical services by platform
 */
const CRITICAL_SERVICES = {
  // Windows critical services
  windows: [
    'eventlog',           // Windows Event Log
    'rpcss',              // Remote Procedure Call (RPC)
    'lsm',                // Local Session Manager
    'lsass',              // Local Security Authority Subsystem
    'csrss',              // Client/Server Runtime Subsystem
    'services',           // Services Control Manager
    'smss',               // Session Manager Subsystem
    'winlogon',           // Windows Logon Process
    'system',             // System Process
    'dnscache',           // DNS Client
    'dhcp',               // DHCP Client
    'bfe',                // Base Filtering Engine
    'mpssvc',             // Windows Defender Firewall
  ],
  // Linux critical services (systemd)
  linux: [
    'systemd',            // System and Service Manager
    'systemd-journald',   // Journal Service
    'systemd-logind',     // Login Service
    'systemd-udevd',      // Device Manager
    'dbus',               // D-Bus System Message Bus
    'NetworkManager',     // Network Manager
    'sshd',               // SSH Daemon
    'firewalld',          // Firewall Service
    'chronyd',            // NTP Time Sync
    'systemd-resolved',   // Network Name Resolution
  ],
  // macOS critical services (launchd)
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

/**
 * List of important but non-critical services
 */
const IMPORTANT_SERVICES = {
  windows: [
    'wuauserv',           // Windows Update
    'spoolsv',            // Print Spooler
    'audiosrv',           // Windows Audio
    'bits',               // Background Intelligent Transfer
    'cryptsvc',           // Cryptographic Services
    'lanmanserver',       // Server (SMB)
    'lanmanworkstation',  // Workstation (SMB Client)
    'netman',             // Network Connections
    'nsi',                // Network Store Interface
    'schedule',           // Task Scheduler
    'themes',             // Themes Service
    'winmgmt',            // Windows Management Instrumentation
    'wscsvc',             // Security Center
  ],
  linux: [
    'bluetooth',          // Bluetooth Service
    'cups',               // Printing Service
    'avahi-daemon',       // Avahi mDNS/DNS-SD
    'accounts-daemon',    // User Accounts Service
    'bluetooth',          // Bluetooth
    'polkit',             // Policy Kit
    'udisks2',            // Disk Manager
    'rtkit-daemon',       // Real-time Kit
    'colord',             // Color Management
  ],
  macos: [
    'com.apple.audio.coreaudiod',
    'com.apple.bluetoothd',
    'com.apple.printd',
  ],
};

/**
 * Detect platform based on service name patterns
 */
function detectPlatform(serviceName: string, serviceId: string): 'windows' | 'linux' | 'macos' {
  // macOS services typically use reverse domain notation
  if (serviceName.startsWith('com.apple.') || serviceId.includes('com.apple')) {
    return 'macos';
  }
  
  // Linux systemd services often have .service suffix or specific naming
  if (serviceName.includes('systemd') || serviceId.endsWith('.service')) {
    return 'linux';
  }
  
  // Default to Windows (or could be based on process.platform)
  return 'windows';
}

/**
 * Normalize service name for comparison
 */
function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.service$/, '')   // Remove .service suffix
    .replace(/^com\.apple\./, '') // Remove com.apple. prefix
    .trim();
}

/**
 * Get criticality information for a service
 */
export function getServiceCriticality(
  serviceName: string,
  serviceId: string,
  description?: string
): ServiceCriticalityInfo {
  const normalizedName = normalizeServiceName(serviceName);
  const normalizedId = normalizeServiceName(serviceId);
  const platform = detectPlatform(serviceName, serviceId);
  
  // Check if critical
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
  
  // Check if important
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
  
  // Default to normal
  return {
    level: 'normal',
    description: 'Standard service',
  };
}

/**
 * Get criticality badge color classes
 */
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

/**
 * Get criticality icon
 */
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
