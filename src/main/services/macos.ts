import { execFile, type ExecFileOptions } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  ServiceAction,
  ServiceControlResult,
  ServiceInfo,
  ServiceListFilters,
} from '../../types/service';

type LaunchdService = ServiceInfo & { domain: string | null };

interface LaunchctlMetadata {
  program: string;
  disabled?: boolean;
  comment?: string;
  pid: number | null;
  status?: string;
  statusLabel?: string;
  domain: string;
  raw: string;
}

type ExecFileAsync = (
  file: string,
  args: ReadonlyArray<string>,
  options?: ExecFileOptions & { encoding?: BufferEncoding }
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile) as ExecFileAsync;

const SUPPORTED_ACTIONS: ReadonlySet<ServiceAction> = new Set(['start', 'stop', 'restart', 'enable', 'disable']);

export async function listServices({ search, status }: ServiceListFilters = {}): Promise<ServiceInfo[]> {
  const { stdout } = await execFileAsync('launchctl', ['list'], {
    maxBuffer: 1024 * 1024 * 16,
    env: process.env,
    encoding: 'utf8',
  });

  const baseServices = parseLaunchctlList(stdout);

  const servicesWithMetadata = await mapWithConcurrency(baseServices, 6, async (service) => {
    const meta = await readServiceMetadata(service.id);
    if (!meta) return service;

    const isDisabled = typeof meta.disabled === 'boolean' ? meta.disabled : false;
    const isEnabled = typeof meta.disabled === 'boolean' ? !meta.disabled : false;

    return {
      ...service,
      startupType: typeof meta.disabled === 'boolean' ? (meta.disabled ? 'disabled' : 'enabled') : service.startupType,
      executable: meta.program || service.executable,
      description: meta.comment || service.description,
      domain: meta.domain,
      raw: meta.raw,
      status: (meta.status || service.status) as ServiceInfo['status'],
      statusLabel: meta.statusLabel || service.statusLabel,
      canEnable: isDisabled,
      canDisable: isEnabled,
    } satisfies LaunchdService;
  });

  let filtered = servicesWithMetadata;

  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
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
  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const candidates = buildDomainCandidates(serviceId);
  let lastError: unknown = null;

  for (const domain of candidates) {
    try {
      await executeActionForDomain(domain, action);
      return { action, serviceId, domain };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Unable to execute action '${action}' for ${serviceId}`);
}

export async function getServiceDetails(serviceId: string): Promise<ServiceInfo | null> {
  const meta = await readServiceMetadata(serviceId);
  if (!meta) return null;

  const isDisabled = typeof meta.disabled === 'boolean' ? meta.disabled : false;
  const isEnabled = typeof meta.disabled === 'boolean' ? !meta.disabled : false;

  return {
    id: serviceId,
    name: serviceId,
    description: meta.comment || '',
    status: (meta.status || 'unknown') as ServiceInfo['status'],
    statusLabel: meta.statusLabel || meta.status || 'unknown',
    startupType: typeof meta.disabled === 'boolean' ? (meta.disabled ? 'disabled' : 'enabled') : 'unknown',
    executable: meta.program || '',
    pid: meta.pid,
    provider: 'launchd',
    domain: meta.domain,
    raw: meta.raw,
    canStart: !meta.pid,
    canStop: Boolean(meta.pid),
    canRestart: true,
    canEnable: isDisabled,
    canDisable: isEnabled,
  } satisfies LaunchdService;
}

function parseLaunchctlList(output: string): LaunchdService[] {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('PID'));

  const services: LaunchdService[] = [];

  for (const line of lines) {
    const match = line.match(/^(\-?|\d+)\s+(-?\d+)\s+(.+)$/);
    if (!match) continue;

    const [, pidPart, statusPart, label] = match;
    const pid = pidPart === '-' ? null : Number.parseInt(pidPart, 10) || null;
    const statusCode = Number.parseInt(statusPart, 10);
    const isRunning = pid !== null && pid > 0;

    services.push({
      id: label,
      name: label,
      description: '',
      status: (isRunning ? 'active' : statusCode === 0 ? 'inactive' : 'failed') as ServiceInfo['status'],
      statusLabel: isRunning ? `running (pid ${pid})` : statusCode === 0 ? 'inactive' : `exit ${statusCode}`,
      startupType: 'unknown',
      executable: '',
      pid,
      provider: 'launchd',
      domain: null,
      canStart: !isRunning,
      canStop: isRunning,
      canRestart: true,
      canEnable: false,
      canDisable: false,
      raw: { pid, status: statusCode, label },
    });
  }

  return services;
}

async function readServiceMetadata(serviceId: string): Promise<LaunchctlMetadata | null> {
  const domains = buildDomainCandidates(serviceId);

  for (const domain of domains) {
    try {
      const { stdout } = await execFileAsync('launchctl', ['print', domain], {
        maxBuffer: 1024 * 1024 * 4,
        encoding: 'utf8',
      });
      return parseLaunchctlPrint(stdout, domain);
    } catch (error) {
      continue; // try next domain
    }
  }

  return null;
}

async function executeActionForDomain(domain: string, action: ServiceAction): Promise<void> {
  if (action === 'start') {
    await execFileAsync('launchctl', ['kickstart', domain], { maxBuffer: 1024 * 1024, encoding: 'utf8' });
    return;
  }

  if (action === 'restart') {
    await execFileAsync('launchctl', ['kickstart', '-k', domain], { maxBuffer: 1024 * 1024, encoding: 'utf8' });
    return;
  }

  if (action === 'stop') {
    await execFileAsync('launchctl', ['kill', 'SIGTERM', domain], { maxBuffer: 1024 * 1024, encoding: 'utf8' });
    return;
  }

  if (action === 'enable') {
    await execFileAsync('launchctl', ['enable', domain], { maxBuffer: 1024 * 1024, encoding: 'utf8' });
    return;
  }

  if (action === 'disable') {
    await execFileAsync('launchctl', ['disable', domain], { maxBuffer: 1024 * 1024, encoding: 'utf8' });
    return;
  }

  throw new Error(`Unsupported action: ${action}`);
}

function parseLaunchctlPrint(output: string, domain: string): LaunchctlMetadata {
  const programMatch = output.match(/"?program"?\s*=\s*"([^"\n]+)"/);
  const progArgsMatch = output.match(/"?program arguments"?\s*=\s*\(([^)]+)\)/);
  const disabledMatch = output.match(/"?disabled"?\s*=\s*(true|false)/i);
  const commentMatch = output.match(/"?comment"?\s*=\s*"([^"\n]+)"/);
  const pidMatch = output.match(/"?pid"?\s*=\s*(\d+)/);
  const statusMatch = output.match(/"?state"?\s*=\s*"([^"\n]+)"/);

  let program = programMatch ? programMatch[1] : '';
  if (!program && progArgsMatch) {
    const args = progArgsMatch[1]
      .split(',')
      .map((part) => part.replace(/"/g, '').trim())
      .filter(Boolean);
    if (args.length > 0) {
      program = args[0];
    }
  }

  const disabled = disabledMatch ? disabledMatch[1].toLowerCase() === 'true' : undefined;
  const pid = pidMatch ? Number.parseInt(pidMatch[1], 10) : null;
  const status = statusMatch ? statusMatch[1].toLowerCase() : undefined;

  return {
    program,
    disabled,
    comment: commentMatch ? commentMatch[1] : '',
    pid,
    status,
    statusLabel: statusMatch ? statusMatch[1] : undefined,
    domain,
    raw: output,
  };
}

function buildDomainCandidates(serviceId: string): string[] {
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const domains = [`system/${serviceId}`];

  if (uid !== null && Number.isFinite(uid)) {
    domains.push(`gui/${uid}/${serviceId}`);
    domains.push(`user/${uid}/${serviceId}`);
  }

  domains.push(serviceId);
  return domains;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const concurrency = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      } catch (error) {
        results[currentIndex] = items[currentIndex] as unknown as R;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

