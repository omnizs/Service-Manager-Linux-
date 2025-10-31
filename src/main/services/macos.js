const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const SUPPORTED_ACTIONS = new Set(['start', 'stop', 'restart']);

async function listServices({ search, status } = {}) {
  const { stdout } = await execFileAsync('launchctl', ['list'], {
    maxBuffer: 1024 * 1024 * 16,
    env: process.env,
  });

  const baseServices = parseLaunchctlList(stdout);

  const servicesWithMetadata = await mapWithConcurrency(baseServices, 6, async (service) => {
    const meta = await readServiceMetadata(service.id);
    return {
      ...service,
      startupType: meta && typeof meta.disabled === 'boolean' ? (meta.disabled ? 'disabled' : 'enabled') : service.startupType,
      executable: meta && meta.program ? meta.program : service.executable,
      description: meta && meta.comment ? meta.comment : service.description,
      domain: meta && meta.domain ? meta.domain : service.domain,
      raw: meta ? meta.raw : service.raw,
    };
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

async function controlService(serviceId, action) {
  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const candidates = buildDomainCandidates(serviceId);
  let lastError = null;

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

async function getServiceDetails(serviceId) {
  const meta = await readServiceMetadata(serviceId);
  if (!meta) return null;

  return {
    id: serviceId,
    name: serviceId,
    description: meta.comment || '',
    status: meta.status || 'unknown',
    statusLabel: meta.statusLabel || meta.status || 'unknown',
    startupType: typeof meta.disabled === 'boolean' ? (meta.disabled ? 'disabled' : 'enabled') : 'unknown',
    executable: meta.program || '',
    pid: meta.pid || null,
    provider: 'launchd',
    domain: meta.domain,
    raw: meta.raw,
  };
}

function parseLaunchctlList(output) {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('PID'));

  const services = [];

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
      status: isRunning ? 'active' : statusCode === 0 ? 'inactive' : 'failed',
      statusLabel: isRunning ? `running (pid ${pid})` : statusCode === 0 ? 'inactive' : `exit ${statusCode}`,
      startupType: 'unknown',
      executable: '',
      pid,
      provider: 'launchd',
      domain: null,
      canStart: !isRunning,
      canStop: isRunning,
      canRestart: true,
      raw: { pid, status: statusCode, label },
    });
  }

  return services;
}

async function readServiceMetadata(serviceId) {
  const domains = buildDomainCandidates(serviceId);

  for (const domain of domains) {
    try {
      const { stdout } = await execFileAsync('launchctl', ['print', domain], {
        maxBuffer: 1024 * 1024 * 4,
      });
      return parseLaunchctlPrint(stdout, domain);
    } catch (error) {
      continue; // try next domain
    }
  }

  return null;
}

async function executeActionForDomain(domain, action) {
  if (action === 'start') {
    await execFileAsync('launchctl', ['kickstart', domain], { maxBuffer: 1024 * 1024 });
    return;
  }

  if (action === 'restart') {
    await execFileAsync('launchctl', ['kickstart', '-k', domain], { maxBuffer: 1024 * 1024 });
    return;
  }

  if (action === 'stop') {
    await execFileAsync('launchctl', ['kill', 'SIGTERM', domain], { maxBuffer: 1024 * 1024 });
    return;
  }

  throw new Error(`Unsupported action: ${action}`);
}

function parseLaunchctlPrint(output, domain) {
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

function buildDomainCandidates(serviceId) {
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const domains = [`system/${serviceId}`];

  if (uid !== null && Number.isFinite(uid)) {
    domains.push(`gui/${uid}/${serviceId}`);
    domains.push(`user/${uid}/${serviceId}`);
  }

  domains.push(serviceId);
  return domains;
}

async function mapWithConcurrency(items, limit, mapper) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const concurrency = Math.max(1, Math.min(limit, items.length));
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      } catch (error) {
        results[currentIndex] = items[currentIndex];
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

module.exports = {
  listServices,
  controlService,
  getServiceDetails,
};

