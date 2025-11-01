import type { ServiceAction, ServiceInfo, ServiceListFilters } from '../types/service';

type ToastType = 'info' | 'success' | 'error';

interface AppState {
  services: ServiceInfo[];
  filtered: ServiceInfo[];
  selectedId: string | null;
  loading: boolean;
  pollInterval: number;
  pollTimer: ReturnType<typeof setInterval> | null;
  lastUpdated: Date | null;
}

interface DetailAction {
  label?: string;
  handler: () => void;
}

type AppendDetailOptions =
  | string
  | {
      valueClass?: string;
      action?: DetailAction | null;
    }
  | undefined;

interface DomRefs {
  tableBody: HTMLTableSectionElement;
  searchInput: HTMLInputElement;
  statusFilter: HTMLSelectElement;
  lastUpdated: HTMLElement;
  serviceCount: HTMLElement;
  detailsPane: HTMLElement;
  refreshButton: HTMLButtonElement;
  statusText: HTMLElement;
  indicatorDot: HTMLElement;
  toastContainer: HTMLElement;
}

const state: AppState = {
  services: [],
  filtered: [],
  selectedId: null,
  loading: false,
  pollInterval: 5000,
  pollTimer: null,
  lastUpdated: null,
};

const dom = {} as DomRefs;

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  bindEvents();
  void refreshServices({ showLoader: true });
  startPolling();
  window.addEventListener('beforeunload', stopPolling);
});

function cacheDom(): void {
  dom.tableBody = getElement<HTMLTableSectionElement>('servicesTableBody');
  dom.searchInput = getElement<HTMLInputElement>('searchInput');
  dom.statusFilter = getElement<HTMLSelectElement>('statusFilter');
  dom.lastUpdated = getElement<HTMLElement>('lastUpdated');
  dom.serviceCount = getElement<HTMLElement>('serviceCount');
  dom.detailsPane = getElement<HTMLElement>('detailsPane');
  dom.refreshButton = getElement<HTMLButtonElement>('refreshButton');
  dom.statusText = getElement<HTMLElement>('statusText');
  dom.indicatorDot = getElement<HTMLElement>('indicatorDot');
  dom.toastContainer = getElement<HTMLElement>('toastContainer');
}

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
}

function bindEvents(): void {
  const debouncedFilter = debounce(applyFilters, 180);
  dom.searchInput.addEventListener('input', debouncedFilter);
  dom.statusFilter.addEventListener('change', applyFilters);
  dom.refreshButton.addEventListener('click', () => void refreshServices({ showLoader: true }));
}

function startPolling(): void {
  stopPolling();
  state.pollTimer = setInterval(() => {
    void refreshServices({ showLoader: false });
  }, state.pollInterval);
}

function stopPolling(): void {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function refreshServices({ showLoader }: { showLoader: boolean }): Promise<void> {
  if (state.loading) return;

  setLoading(true, showLoader);
  try {
    const response = await window.serviceAPI.listServices({
      search: dom.searchInput.value.trim() || undefined,
      status: dom.statusFilter.value,
    } satisfies ServiceListFilters);

    if (!response || !response.ok) {
      const message = response?.error?.message ?? 'Failed to load services';
      throw new Error(message);
    }

    state.services = Array.isArray(response.data) ? response.data : [];
    state.lastUpdated = new Date();
    applyFilters();
  } catch (error) {
    console.error('Failed to refresh services', error);
    const message = error instanceof Error ? error.message : 'Unable to load services';
    showToast(message, 'error');
  } finally {
    setLoading(false, showLoader);
  }
}

function applyFilters(): void {
  const search = dom.searchInput.value.trim().toLowerCase();
  const status = dom.statusFilter.value;

  let filtered = state.services.slice();

  if (search) {
    filtered = filtered.filter((item) =>
      item.name.toLowerCase().includes(search) ||
      (item.description && item.description.toLowerCase().includes(search)) ||
      (item.executable && item.executable.toLowerCase().includes(search))
    );
  }

  if (status && status !== 'all') {
    const target = status.toLowerCase();
    filtered = filtered.filter((item) => (item.status || '').toLowerCase() === target);
  }

  state.filtered = filtered;
  renderTable();
  updateFooter();

  if (state.selectedId) {
    const current = state.filtered.find((item) => item.id === state.selectedId) ?? null;
    if (!current) {
      state.selectedId = null;
      renderDetails(null);
    } else {
      renderDetails(current);
    }
  }
}

function renderTable(): void {
  dom.tableBody.innerHTML = '';

  if (!state.filtered.length) {
    const row = document.createElement('tr');
    row.className = 'empty';
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No services found matching the current filters';
    row.appendChild(cell);
    dom.tableBody.appendChild(row);
    return;
  }

  state.filtered.forEach((service) => {
    const row = document.createElement('tr');
    row.dataset.serviceId = service.id;
    if (state.selectedId === service.id) {
      row.classList.add('selected');
    }

    row.addEventListener('click', () => void selectService(service));

    row.appendChild(createCell(service.name, 'cell-name'));
    row.appendChild(createStatusCell(service));
    row.appendChild(createCell(formatStartupType(service.startupType), 'cell-startup'));
    row.appendChild(createCell(service.executable || '—', 'cell-executable', true));
    row.appendChild(createCell(service.description || '—', 'cell-description'));
    row.appendChild(createActionsCell(service));

    dom.tableBody.appendChild(row);
  });
}

function createCell(content: string, className = '', monospace = false): HTMLTableCellElement {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  if (monospace) {
    const span = document.createElement('span');
    span.className = 'monospace';
    span.textContent = content;
    cell.appendChild(span);
  } else {
    cell.textContent = content;
  }
  return cell;
}

function createStatusCell(service: ServiceInfo): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = 'cell-status';

  const badge = document.createElement('span');
  badge.className = `status-badge status-${service.status || 'unknown'}`;
  badge.textContent = service.statusLabel || service.status || 'unknown';
  cell.appendChild(badge);

  return cell;
}

function createActionsCell(service: ServiceInfo): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = 'cell-actions';

  const startBtn = createActionButton('Start', 'start', service.canStart);
  const stopBtn = createActionButton('Stop', 'stop', service.canStop);
  const restartBtn = createActionButton('Restart', 'restart', service.canRestart);
  const enableBtn = createActionButton('Enable', 'enable', service.canEnable);
  const disableBtn = createActionButton('Disable', 'disable', service.canDisable);

  startBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    void handleAction('start', service);
  });

  stopBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    void handleAction('stop', service);
  });

  restartBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    void handleAction('restart', service);
  });

  enableBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    void handleAction('enable', service);
  });

  disableBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    void handleAction('disable', service);
  });

  cell.appendChild(startBtn);
  cell.appendChild(stopBtn);
  cell.appendChild(restartBtn);
  cell.appendChild(enableBtn);
  cell.appendChild(disableBtn);

  return cell;
}

function createActionButton(label: string, action: ServiceAction, enabled: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `action-button action-${action}`;
  button.textContent = label;
  button.disabled = !enabled;
  return button;
}

async function selectService(service: ServiceInfo): Promise<void> {
  state.selectedId = service.id;
  renderTable();
  renderDetails(service);

  try {
    const response = await window.serviceAPI.getServiceDetails(service.id);
    if (response && response.ok && response.data) {
      const updatedService: ServiceInfo = {
        ...service,
        ...response.data,
      };
      renderDetails(updatedService);
    }
  } catch (error) {
    console.warn('Failed to load service details', error);
  }
}

function renderDetails(service: ServiceInfo | null): void {
  dom.detailsPane.innerHTML = '';

  if (!service) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Select a service to view details';
    dom.detailsPane.appendChild(empty);
    return;
  }

  const list = document.createElement('dl');

  appendDetail(list, 'Name', service.name || service.id);
  appendDetail(list, 'Identifier', service.id);
  appendDetail(list, 'Status', service.statusLabel || service.status || 'unknown');
  appendDetail(list, 'Startup Type', formatStartupType(service.startupType));
  appendDetail(list, 'Executable', service.executable || '—', service.executable ? 'monospace' : '');
  appendDetail(list, 'PID', service.pid ? String(service.pid) : '—');
  appendDetail(list, 'Description', service.description || '—');

  appendDetail(
    list,
    'Unit File',
    service.unitFile || '—',
    service.unitFile
      ? {
          valueClass: 'monospace',
          action: {
            label: 'Show in File Browser',
            handler: () => window.serviceAPI.openPath(service.unitFile as string),
          },
        }
      : undefined
  );

  dom.detailsPane.appendChild(list);
}

function appendDetail(list: HTMLDListElement, label: string, value: string, options?: AppendDetailOptions): void {
  let valueClass = '';
  let action: DetailAction | null = null;

  if (typeof options === 'string') {
    valueClass = options;
  } else if (options && typeof options === 'object') {
    valueClass = options.valueClass || '';
    action = options.action || null;
  }

  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  const valueNode = document.createElement('span');
  if (valueClass) valueNode.className = valueClass;
  valueNode.textContent = value;

  if (action && typeof action.handler === 'function') {
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-value-with-action';
    wrapper.appendChild(valueNode);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inline-button';
    button.textContent = action.label || 'Open';
    button.addEventListener('click', action.handler);

    wrapper.appendChild(button);
    dd.appendChild(wrapper);
  } else {
    dd.appendChild(valueNode);
  }

  list.appendChild(dt);
  list.appendChild(dd);
}

function updateFooter(): void {
  const count = state.filtered.length;
  dom.serviceCount.textContent = `${count} ${count === 1 ? 'service' : 'services'}`;
  dom.lastUpdated.textContent = state.lastUpdated
    ? `Last updated: ${state.lastUpdated.toLocaleTimeString()}`
    : 'Last updated: —';
}

function setLoading(isLoading: boolean, showIndicator: boolean): void {
  state.loading = isLoading;
  if (!showIndicator) return;

  if (isLoading) {
    dom.statusText.textContent = 'Refreshing…';
    dom.indicatorDot.classList.add('active');
  } else {
    dom.statusText.textContent = 'Idle';
    dom.indicatorDot.classList.remove('active');
  }
}

async function handleAction(action: ServiceAction, service: ServiceInfo): Promise<void> {
  try {
    const response = await window.serviceAPI.controlService(service.id, action);
    if (!response || !response.ok) {
      const message = response?.error?.message ?? 'Action failed';
      throw new Error(message);
    }
    showToast(`${capitalize(action)} requested for ${service.name}`, 'success');
    await refreshServices({ showLoader: false });
  } catch (error) {
    console.error(`Failed to ${action} service`, error);
    const message = error instanceof Error ? error.message : `Unable to ${action} service`;
    showToast(message, 'error');
  }
}

function formatStartupType(value: string | undefined): string {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function showToast(message: string, type: ToastType = 'info'): void {
  if (!dom.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  dom.toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

