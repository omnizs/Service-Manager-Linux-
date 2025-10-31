const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const POWERSHELL = 'powershell.exe';
const SUPPORTED_ACTIONS = new Set(['start', 'stop', 'restart']);

async function listServices({ search, status } = {}) {
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
  });

  const raw = parseJson(stdout);
  let services = Array.isArray(raw) ? raw : raw ? [raw] : [];

  services = services.map((service) => {
    const normalizedStatus = (service.State || '').toLowerCase();
    const startMode = service.StartMode || '';
    return {
      id: service.Name,
      name: service.DisplayName || service.Name,
      description: service.Description || '',
      status: normalizedStatus,
      statusLabel: normalizedStatus,
      startupType: startMode,
      executable: normalizePath(service.PathName || ''),
      pid: typeof service.ProcessId === 'number' ? service.ProcessId : null,
      provider: 'win32-service',
      raw: service,
      canStart: normalizedStatus !== 'running',
      canStop: normalizedStatus === 'running',
      canRestart: true,
    };
  });

  if (search) {
    const query = search.toLowerCase();
    services = services.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  }

  if (status && status !== 'all') {
    const target = status.toLowerCase();
    services = services.filter((item) => item.status === target);
  }

  return services.sort((a, b) => a.name.localeCompare(b.name));
}

async function controlService(serviceId, action) {
  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const command = buildControlCommand(serviceId, action);

  const { stdout, stderr } = await execFileAsync(POWERSHELL, ['-NoProfile', '-Command', command], {
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
    env: process.env,
  });

  return {
    action,
    serviceId,
    stdout,
    stderr,
  };
}

async function getServiceDetails(serviceId) {
  const ps = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;",
    `Get-CimInstance -ClassName Win32_Service -Filter "Name = '${escapePSString(serviceId)}'"`,
    '| ConvertTo-Json -Depth 3',
  ].join(' ');

  const { stdout } = await execFileAsync(POWERSHELL, ['-NoProfile', '-Command', ps], {
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true,
  });

  const raw = parseJson(stdout);
  if (!raw) return null;

  return {
    id: raw.Name,
    name: raw.DisplayName || raw.Name,
    description: raw.Description || '',
    status: (raw.State || '').toLowerCase(),
    statusLabel: raw.State || '',
    startupType: raw.StartMode || '',
    executable: normalizePath(raw.PathName || ''),
    pid: typeof raw.ProcessId === 'number' ? raw.ProcessId : null,
    provider: 'win32-service',
    raw,
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    const cleaned = value
      .split('\n')
      .filter((line) => !line.startsWith('ConvertTo-Json'))
      .join('\n');
    return cleaned ? JSON.parse(cleaned) : null;
  }
}

function normalizePath(input) {
  if (!input) return '';
  return input.replace(/^"|"$/g, '').trim();
}

function buildControlCommand(serviceId, action) {
  const escaped = escapePSString(serviceId);
  switch (action) {
    case 'start':
      return `Start-Service -Name '${escaped}'`;
    case 'stop':
      return `Stop-Service -Name '${escaped}' -Force`;
    case 'restart':
      return `Restart-Service -Name '${escaped}' -Force`;
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

function escapePSString(value) {
  return value.replace(/'/g, "''");
}

module.exports = {
  listServices,
  controlService,
  getServiceDetails,
};

