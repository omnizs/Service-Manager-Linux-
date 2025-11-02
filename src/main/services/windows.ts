import { execFile, type ExecFileOptions } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
} from '../../types/service';
import { isValidServiceId } from '../../utils/validation';

interface RawWindowsService {
  Name: string;
  DisplayName?: string;
  State?: string;
  StartMode?: string;
  PathName?: string;
  Description?: string;
  ProcessId?: number;
}

type ExecFileAsync = (
  file: string,
  args: ReadonlyArray<string>,
  options?: ExecFileOptions & { encoding?: BufferEncoding }
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile) as ExecFileAsync;

const POWERSHELL = 'powershell.exe';
const SUPPORTED_ACTIONS: ReadonlySet<ServiceAction> = new Set(['start', 'stop', 'restart', 'enable', 'disable']);

export async function listServices({ search, status }: ServiceListFilters = {}): Promise<ServiceInfo[]> {
  const ps = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;",
    'Get-CimInstance -ClassName Win32_Service',
    '| Select-Object Name, DisplayName, State, StartMode, PathName, Description, ProcessId',
    '| ConvertTo-Json -Depth 2',
  ].join(' ');

  const { stdout } = await execFileAsync(POWERSHELL, ['-NoProfile', '-Command', ps], {
    maxBuffer: 1024 * 1024 * 32,
    windowsHide: true,
    env: process.env,
    encoding: 'utf8',
  });

  const raw = parseJson<RawWindowsService | RawWindowsService[]>(stdout);
  let services: RawWindowsService[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const normalized = services.map(mapWindowsService);

  let filtered = normalized;

  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  }

  if (status && status !== 'all') {
    const target = status.toLowerCase();
    filtered = filtered.filter((item) => item.status === target);
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export async function controlService(
  serviceId: string,
  action: ServiceAction
): Promise<ServiceControlResult> {
  // Validate service ID
  if (!isValidServiceId(serviceId)) {
    throw new Error(`Invalid service identifier: ${serviceId}`);
  }

  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const command = buildControlCommand(serviceId, action);

  try {
    const { stdout, stderr } = await execFileAsync(POWERSHELL, ['-NoProfile', '-Command', command], {
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
      env: process.env,
      encoding: 'utf8',
    });

    return {
      action,
      serviceId,
      stdout,
      stderr,
    };
  } catch (error) {
    // Provide friendly error messages for common Windows service errors
    if (error && typeof error === 'object' && 'stderr' in error) {
      const stderr = String((error as { stderr?: string | Buffer }).stderr || '');
      
      if (stderr.includes('Cannot find any service') || stderr.includes('does not exist')) {
        throw new Error(`Service '${serviceId}' not found on this system.`);
      }
      if (stderr.includes('Access is denied') || stderr.includes('Access denied')) {
        throw new Error(`Access denied. Please run the application as Administrator to manage this service.`);
      }
      if (stderr.includes('service has not been started') && action === 'stop') {
        throw new Error(`Service '${serviceId}' is not running.`);
      }
      if (stderr.includes('service is already running') && action === 'start') {
        throw new Error(`Service '${serviceId}' is already running.`);
      }
      if (stderr.includes('depends on') || stderr.includes('dependency')) {
        throw new Error(`Cannot ${action} service '${serviceId}' due to service dependencies. Check dependent services.`);
      }
    }
    throw error;
  }
}

export async function getServiceDetails(serviceId: string): Promise<ServiceInfo | null> {
  // Validate service ID
  if (!isValidServiceId(serviceId)) {
    throw new Error(`Invalid service identifier: ${serviceId}`);
  }

  const ps = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;",
    `Get-CimInstance -ClassName Win32_Service -Filter "Name = '${escapePSString(serviceId)}'"`,
    '| ConvertTo-Json -Depth 3',
  ].join(' ');

  const { stdout } = await execFileAsync(POWERSHELL, ['-NoProfile', '-Command', ps], {
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
    encoding: 'utf8',
  });

  const raw = parseJson<RawWindowsService>(stdout);
  if (!raw) return null;

  return mapWindowsService(raw);
}

function mapWindowsService(service: RawWindowsService): ServiceInfo {
  const normalizedStatus = (service.State || '').toLowerCase();
  const startMode = (service.StartMode || '').toLowerCase();
  const isAutomatic = startMode === 'auto' || startMode === 'automatic';
  const isDisabled = startMode === 'disabled';

  return {
    id: service.Name,
    name: service.DisplayName || service.Name,
    description: service.Description || '',
    status: (normalizedStatus || 'unknown') as ServiceInfo['status'],
    statusLabel: normalizedStatus || 'unknown',
    startupType: service.StartMode || '',
    executable: normalizePath(service.PathName || '') || null,
    pid: typeof service.ProcessId === 'number' ? service.ProcessId : null,
    provider: 'win32-service',
    raw: service,
    canStart: normalizedStatus !== 'running',
    canStop: normalizedStatus === 'running',
    canRestart: true,
    canEnable: isDisabled,
    canDisable: isAutomatic,
  };
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    const cleaned = value
      .split('\n')
      .filter((line) => !line.startsWith('ConvertTo-Json'))
      .join('\n');
    return cleaned ? (JSON.parse(cleaned) as T) : null;
  }
}

function normalizePath(input: string): string {
  if (!input) return '';
  return input.replace(/^"|"$/g, '').trim();
}

function buildControlCommand(serviceId: string, action: ServiceAction): string {
  const escaped = escapePSString(serviceId);
  switch (action) {
    case 'start':
      return `Start-Service -Name '${escaped}'`;
    case 'stop':
      return `Stop-Service -Name '${escaped}' -Force`;
    case 'restart':
      return `Restart-Service -Name '${escaped}' -Force`;
    case 'enable':
      return `Set-Service -Name '${escaped}' -StartupType Automatic`;
    case 'disable':
      return `Set-Service -Name '${escaped}' -StartupType Disabled`;
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

function escapePSString(value: string): string {
  // Escape single quotes (PowerShell string escaping)
  let escaped = value.replace(/'/g, "''");
  
  // Additional escaping for PowerShell metacharacters
  // Escape backticks, dollar signs, and other special characters
  escaped = escaped
    .replace(/`/g, '``')     // Backtick escape character
    .replace(/\$/g, '`$')    // Variable expansion
    .replace(/\n/g, '`n')    // Newlines
    .replace(/\r/g, '`r')    // Carriage returns
    .replace(/\t/g, '`t');   // Tabs
  
  return escaped;
}

