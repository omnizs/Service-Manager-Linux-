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
  currentPage: number;
  itemsPerPage: number;
  isRefreshing: boolean;
  isWindowFocused: boolean;
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
  platformInfo: HTMLElement;
  performanceInfo: HTMLElement;
}

const state: AppState = {
  services: [],
  filtered: [],
  selectedId: null,
  loading: false,
  pollInterval: 5000,
  pollTimer: null,
  lastUpdated: null,
  currentPage: 1,
  itemsPerPage: 100,
  isRefreshing: false,
  isWindowFocused: true,
};

const dom = {} as DomRefs;

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  bindEvents();
  bindKeyboardShortcuts();
  bindWindowEvents();
  void refreshServices({ showLoader: true });
  startPolling();
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
  dom.platformInfo = getElement<HTMLElement>('platformInfo');
  dom.performanceInfo = getElement<HTMLElement>('performanceInfo');
  
  // Set platform info
  const platform = navigator.platform || 'Unknown';
  const os = platform.includes('Win') ? 'Windows' : platform.includes('Mac') ? 'macOS' : 'Linux';
  dom.platformInfo.textContent = os;
}

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
}

function bindEvents(): void {
  const debouncedFilter = debounce(applyFilters, 150); // Reduced from 180ms to 150ms for better responsiveness
  dom.searchInput.addEventListener('input', debouncedFilter);
  dom.statusFilter.addEventListener('change', applyFilters);
  dom.refreshButton.addEventListener('click', () => void refreshServices({ showLoader: true }));
}

function bindKeyboardShortcuts(): void {
  document.addEventListener('keydown', (event) => {
    // Ctrl+R or Cmd+R to refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      void refreshServices({ showLoader: true });
    }
    
    // Escape to clear selection
    if (event.key === 'Escape' && state.selectedId) {
      event.preventDefault();
      state.selectedId = null;
      renderTable();
      renderDetails(null);
    }
    
    // Ctrl+F or Cmd+F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      dom.searchInput.focus();
      dom.searchInput.select();
    }
  });
}

function bindWindowEvents(): void {
  // Pause polling when window loses focus to save resources
  window.addEventListener('focus', () => {
    state.isWindowFocused = true;
    startPolling();
  });

  window.addEventListener('blur', () => {
    state.isWindowFocused = false;
    // Don't stop polling entirely, just let it continue at normal rate
  });

  // Cleanup on beforeunload
  window.addEventListener('beforeunload', () => {
    stopPolling();
  });

  // Handle visibility change (tab switching, window minimization)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.isWindowFocused = false;
    } else {
      state.isWindowFocused = true;
      void refreshServices({ showLoader: false });
    }
  });
}

function startPolling(): void {
  stopPolling();
  state.pollTimer = setInterval(() => {
    // Only auto-refresh if window is focused/visible
    if (state.isWindowFocused && !document.hidden) {
      void refreshServices({ showLoader: false });
    }
  }, state.pollInterval);
}

function stopPolling(): void {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function refreshServices({ showLoader }: { showLoader: boolean }): Promise<void> {
  // Prevent concurrent refreshes
  if (state.loading || state.isRefreshing) return;

  state.isRefreshing = true;
  const startTime = performance.now();
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
    
    const endTime = performance.now();
    const loadTime = Math.round(endTime - startTime);
    dom.performanceInfo.textContent = `Loaded in ${loadTime}ms`;
    
    applyFilters();
  } catch (error) {
    console.error('Failed to refresh services', error);
    const message = error instanceof Error ? error.message : 'Unable to load services';
    showToast(message, 'error');
    dom.performanceInfo.textContent = 'Load failed';
  } finally {
    setLoading(false, showLoader);
    state.isRefreshing = false;
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
  state.currentPage = 1; // Reset to first page when filters change
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
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  if (!state.filtered.length) {
    const row = document.createElement('tr');
    row.className = 'empty';
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No services found matching the current filters';
    row.appendChild(cell);
    fragment.appendChild(row);
    dom.tableBody.innerHTML = '';
    dom.tableBody.appendChild(fragment);
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(state.filtered.length / state.itemsPerPage);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = Math.min(startIndex + state.itemsPerPage, state.filtered.length);
  const pageItems = state.filtered.slice(startIndex, endIndex);

  // Render only the current page of services using DocumentFragment
  pageItems.forEach((service) => {
    const row = document.createElement('tr');
    row.dataset.serviceId = service.id;
    if (state.selectedId === service.id) {
      row.classList.add('selected');
    }

    // Use event delegation-friendly approach or bind here
    row.addEventListener('click', () => void selectService(service));

    row.appendChild(createCell(service.name, 'cell-name', false, service.name));
    row.appendChild(createStatusCell(service));
    row.appendChild(createCell(formatStartupType(service.startupType), 'cell-startup', false, formatStartupType(service.startupType)));
    row.appendChild(createCell(service.executable || '—', 'cell-executable', true, service.executable || ''));
    row.appendChild(createCell(service.description || '—', 'cell-description', false, service.description || ''));
    row.appendChild(createActionsCell(service));

    fragment.appendChild(row);
  });

  // Clear and append in one operation
  dom.tableBody.innerHTML = '';
  dom.tableBody.appendChild(fragment);

  // Show pagination info if there are multiple pages
  if (totalPages > 1) {
    const paginationRow = document.createElement('tr');
    paginationRow.className = 'pagination-row';
    const paginationCell = document.createElement('td');
    paginationCell.colSpan = 6;
    paginationCell.className = 'pagination-cell';
    
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${state.filtered.length}`;
    
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.className = 'pagination-button';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
        updateFooter();
      }
    });
    
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'pagination-button';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
        updateFooter();
      }
    });
    
    paginationControls.appendChild(prevBtn);
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(nextBtn);
    
    paginationCell.appendChild(paginationInfo);
    paginationCell.appendChild(paginationControls);
    paginationRow.appendChild(paginationCell);
    dom.tableBody.appendChild(paginationRow);
  }
}

function createCell(content: string, className = '', monospace = false, tooltip = ''): HTMLTableCellElement {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  
  // Add tooltip if content is provided and not just a dash
  if (tooltip && tooltip !== '—') {
    cell.title = tooltip;
  }
  
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

  const normalizedStatus = normalizeStatus(service.status);
  const badge = document.createElement('span');
  badge.className = `status-badge status-${normalizedStatus}`;
  badge.textContent = formatStatusLabel(service.statusLabel || service.status || 'unknown');
  cell.appendChild(badge);

  return cell;
}

function normalizeStatus(status: string | undefined): string {
  if (!status) return 'unknown';
  const lower = status.toLowerCase();
  
  // Map various status strings to normalized values
  // Check inactive BEFORE active (since "inactive" contains "active")
  if (lower.includes('inactive') || lower.includes('dead') || lower.includes('stopped')) return 'inactive';
  if (lower.includes('active') || lower.includes('running')) return 'active';
  if (lower.includes('failed')) return 'failed';
  if (lower.includes('activating')) return 'activating';
  if (lower.includes('deactivating')) return 'deactivating';
  
  return lower;
}

function formatStatusLabel(label: string): string {
  if (!label) return 'Unknown';
  
  // Remove parenthetical descriptions like (dead), (running), etc.
  const cleaned = label.replace(/\s*\([^)]*\)/g, '').trim();
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
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
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM24 40C15.18 40 8 32.82 8 24C8 15.18 15.18 8 24 8C32.82 8 40 15.18 40 24C40 32.82 32.82 40 24 40ZM22 22V14H26V22H22ZM22 34V26H26V34H22Z" fill="currentColor" opacity="0.3"/>
      </svg>
      <p>Select a service to view details</p>
    `;
    dom.detailsPane.appendChild(emptyState);
    return;
  }

  const list = document.createElement('dl');

  appendDetail(list, 'Name', service.name || service.id);
  appendDetail(list, 'Identifier', service.id);
  appendDetail(list, 'Status', formatStatusLabel(service.statusLabel || service.status || 'unknown'));
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

// Cleanup function to be called on unload
function cleanup(): void {
  stopPolling();
  // Clear any pending timeouts/intervals
  state.pollTimer = null;
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

