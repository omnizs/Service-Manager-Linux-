const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const EXEC_OPTIONS = {
  maxBuffer: 1024 * 1024 * 24,
  env: {
    ...process.env,
    LANG: 'C',
    LC_ALL: 'C',
  },
};

const SUPPORTED_ACTIONS = new Set(['start', 'stop', 'restart']);

async function listServices({ search, status } = {}) {
  const showArgs = [
    'show',
    '--type=service',
    '--all',
    '--no-pager',
    '--property=Id,Description,ExecStart,UnitFileState,ActiveState,SubState,FragmentPath,MainPID',
  ];

  let stdout;
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

async function controlService(serviceId, action) {
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

async function getServiceDetails(serviceId) {
  const unit = normalizeServiceId(serviceId);
  const args = [
    'show',
    unit,
    '--no-pager',
    '--property=Id,Description,ExecStart,UnitFileState,ActiveState,SubState,FragmentPath,MainPID,LoadState',
  ];

  let stdout;
  try {
    ({ stdout } = await execFileAsync('systemctl', args, EXEC_OPTIONS));
  } catch (error) {
    handleSystemctlError(error);
    throw error;
  }
  const [service] = parseSystemctlShow(stdout, { single: true });
  return service || null;
}

function shouldRetryWithPkexec(error) {
  if (!error) return false;
  if (error.code === 'EACCES') return true;
  if (!error.stderr) return false;
  const message = error.stderr.toString();
  return (
    message.includes('Access denied') ||
    message.includes('access denied') ||
    message.includes('authentication is required') ||
    message.includes('Authentication is required') ||
    message.includes('interactive authentication required')
  );
}

function handleSystemctlError(error) {
  if (!error || !error.stderr) return;
  const text = error.stderr.toString();
  if (text.includes('System has not been booted with systemd')) {
    const friendly = new Error('Systemd is not available on this system.');
    friendly.code = 'NO_SYSTEMD';
    throw friendly;
  }
}

function normalizeServiceId(value) {
  if (!value.endsWith('.service')) {
    return `${value}.service`;
  }
  return value;
}

function parseSystemctlShow(output, { single = false } = {}) {
  const chunks = output
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const results = [];

  for (const block of chunks) {
    const parsed = {};
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

    results.push({
      id: parsed.Id,
      name: parsed.Id.replace(/\.service$/, ''),
      description: parsed.Description || '',
      status,
      statusLabel: buildStatusLabel(parsed.ActiveState, parsed.SubState),
      startupType: parsed.UnitFileState || 'disabled',
      executable: execPath,
      unitFile: parsed.FragmentPath || null,
      pid: parsed.MainPID ? Number.parseInt(parsed.MainPID, 10) || null : null,
      provider: 'systemd',
      loadState: parsed.LoadState || null,
      raw: parsed,
      canStart: status !== 'active',
      canStop: status === 'active',
      canRestart: true,
    });
  }

  if (single) {
    return results.slice(0, 1);
  }

  return results;
}

function normaliseStatus(activeState, subState) {
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
  return normalised;
}

function buildStatusLabel(activeState, subState) {
  const primary = activeState ? activeState.toLowerCase() : 'unknown';
  const secondary = subState ? subState.toLowerCase() : '';
  if (secondary && secondary !== primary) {
    return `${primary} (${secondary})`;
  }
  return primary;
}

function extractExecutable(execStartValue) {
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

module.exports = {
  listServices,
  controlService,
  getServiceDetails,
};

