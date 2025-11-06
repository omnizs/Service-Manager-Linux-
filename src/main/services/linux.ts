import { execFile, type ExecFileOptions } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
} from '../../types/service';
import { isValidServiceId } from '../../utils/validation';

type ExecError = NodeJS.ErrnoException & {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
};

interface ParseOptions {
  single?: boolean;
}

type ExecFileAsync = (
  file: string,
  args: ReadonlyArray<string>,
  options?: ExecFileOptions & { encoding?: BufferEncoding }
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile) as ExecFileAsync;

const EXEC_OPTIONS = {
  maxBuffer: 1024 * 1024 * 24,
  encoding: 'utf8' as const,
  env: {
    ...process.env,
    LANG: 'C',
    LC_ALL: 'C',
  },
};

const SUPPORTED_ACTIONS: ReadonlySet<ServiceAction> = new Set(['start', 'stop', 'restart', 'enable', 'disable']);

export async function listServices({ search, status }: ServiceListFilters = {}): Promise<ServiceInfo[]> {
  const showArgs = [
    'show',
    '--type=service',
    '--all',
    '--no-pager',
    '--property=Id,Description,ExecStart,UnitFileState,ActiveState,SubState,FragmentPath,MainPID',
  ];

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync('systemctl', showArgs, EXEC_OPTIONS));
  } catch (error) {
    handleSystemctlError(error);
    throw error;
  }
  const services = parseSystemctlShow(stdout);

  let filtered = services;

  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  }

  if (status && status !== 'all') {
    const normalized = status.toLowerCase();
    filtered = filtered.filter((item) => item.status === normalized);
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export async function controlService(serviceId: string, action: ServiceAction): Promise<ServiceControlResult> {
  if (!isValidServiceId(serviceId)) {
    throw new Error(`Invalid service identifier: ${serviceId}`);
  }

  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const unit = normalizeServiceId(serviceId);
  try {
    await execFileAsync('systemctl', [action, unit], EXEC_OPTIONS);
    return { action, serviceId: unit };
  } catch (error) {
    if (shouldRetryWithPkexec(error)) {
      try {
        await execFileAsync('pkexec', ['systemctl', action, unit], EXEC_OPTIONS);
        return { action, serviceId: unit, elevated: true };
      } catch (pkexecError) {
        throw pkexecError;
      }
    }
    throw error;
  }
}

export async function getServiceDetails(serviceId: string): Promise<ServiceInfo | null> {
  if (!isValidServiceId(serviceId)) {
    throw new Error(`Invalid service identifier: ${serviceId}`);
  }

  const unit = normalizeServiceId(serviceId);
  const args = [
    'show',
    unit,
    '--no-pager',
    '--property=Id,Description,ExecStart,UnitFileState,ActiveState,SubState,FragmentPath,MainPID,LoadState',
  ];

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync('systemctl', args, EXEC_OPTIONS));
  } catch (error) {
    handleSystemctlError(error);
    throw error;
  }
  const [service] = parseSystemctlShow(stdout, { single: true });
  return service || null;
}

function shouldRetryWithPkexec(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as ExecError;
  if (err.code === 'EACCES') return true;
  if (!err.stderr) return false;
  const message = err.stderr.toString();
  return (
    message.includes('Access denied') ||
    message.includes('access denied') ||
    message.includes('authentication is required') ||
    message.includes('Authentication is required') ||
    message.includes('interactive authentication required')
  );
}

function handleSystemctlError(error: unknown): void {
  if (!error || typeof error !== 'object') return;
  const err = error as ExecError;
  if (!err.stderr) return;
  const text = err.stderr.toString();
  
  if (text.includes('System has not been booted with systemd')) {
    const friendly = new Error('Systemd is not available on this system. This application requires systemd to manage services on Linux.');
    (friendly as NodeJS.ErrnoException).code = 'NO_SYSTEMD';
    throw friendly;
  }
  
  if (text.includes('Failed to connect to bus') || text.includes('Failed to get D-Bus connection')) {
    const friendly = new Error('Unable to connect to systemd. Please ensure systemd is running properly.');
    (friendly as NodeJS.ErrnoException).code = 'DBUS_ERROR';
    throw friendly;
  }
  
  if (text.includes('Unit') && text.includes('not found')) {
    const friendly = new Error('Service not found. It may have been removed or disabled.');
    (friendly as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw friendly;
  }
}

function normalizeServiceId(value: string): string {
  if (value.includes('/') || value.includes('\\')) {
    throw new Error('Invalid service identifier: contains path separators');
  }

  if (!value.endsWith('.service')) {
    return `${value}.service`;
  }
  return value;
}

function parseSystemctlShow(output: string, { single = false }: ParseOptions = {}): ServiceInfo[] {
  const chunks = output
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const results: ServiceInfo[] = [];

  for (const block of chunks) {
    const parsed: Record<string, string> = {};
    for (const line of block.split('\n')) {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1).trim();
      parsed[key] = value;
    }

    if (!parsed.Id || !parsed.Id.endsWith('.service')) {
      continue;
    }

    const status = normaliseStatus(parsed.ActiveState, parsed.SubState);
    const execPath = extractExecutable(parsed.ExecStart);

    const unitFileState = parsed.UnitFileState || 'disabled';
    const isEnabled = unitFileState === 'enabled' || unitFileState === 'static';
    const canBeDisabled = unitFileState !== 'static' && unitFileState !== 'masked';

    results.push({
      id: parsed.Id,
      name: parsed.Id.replace(/\.service$/, ''),
      description: parsed.Description || '',
      status,
      statusLabel: buildStatusLabel(parsed.ActiveState, parsed.SubState),
      startupType: unitFileState,
      executable: execPath,
      unitFile: parsed.FragmentPath || null,
      pid: parsed.MainPID ? Number.parseInt(parsed.MainPID, 10) || null : null,
      provider: 'systemd',
      loadState: parsed.LoadState || null,
      raw: parsed,
      canStart: status !== 'active',
      canStop: status === 'active',
      canRestart: true,
      canEnable: !isEnabled && canBeDisabled,
      canDisable: isEnabled && canBeDisabled,
    });
  }

  if (single) {
    return results.slice(0, 1);
  }

  return results;
}

function normaliseStatus(activeState?: string, subState?: string): ServiceInfo['status'] {
  const normalised = (activeState || '').toLowerCase();
  if (!normalised) return 'unknown';
  if (normalised === 'active') {
    if (subState) {
      const sub = subState.toLowerCase();
      if (sub === 'running' || sub === 'listening') return 'active';
    }
    return 'active';
  }
  if (normalised === 'inactive') return 'inactive';
  if (normalised === 'failed') return 'failed';
  if (normalised === 'activating') return 'activating';
  if (normalised === 'deactivating') return 'deactivating';
  return normalised as ServiceInfo['status'];
}

function buildStatusLabel(activeState?: string, subState?: string): string {
  const primary = activeState ? activeState.toLowerCase() : 'unknown';
  const secondary = subState ? subState.toLowerCase() : '';
  if (secondary && secondary !== primary) {
    return `${primary} (${secondary})`;
  }
  return primary;
}

function extractExecutable(execStartValue?: string): string | null {
  if (!execStartValue) return null;

  if (execStartValue.startsWith('{')) {
    const match = execStartValue.match(/path=([^;\s]+)[;\s]/);
    if (match && match[1]) {
      return match[1];
    }
  }

  const cleaned = execStartValue.replace(/^"|"$/g, '').trim();

  if (!cleaned) return null;

  if (cleaned.startsWith('/')) {
    const spaceIndex = cleaned.indexOf(' ');
    return spaceIndex === -1 ? cleaned : cleaned.slice(0, spaceIndex);
  }

  const match = cleaned.match(/([^\s"']+)/);
  return match ? match[1] : cleaned;
}

