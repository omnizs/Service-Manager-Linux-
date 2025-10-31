const state = {
  services: [],
  filtered: [],
  selectedId: null,
  loading: false,
  pollInterval: 5000,
  pollTimer: null,
  lastUpdated: null,
};

const dom = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  bindEvents();
  refreshServices({ showLoader: true });
  startPolling();
  window.addEventListener('beforeunload', stopPolling);
});

function cacheDom() {
  dom.tableBody = document.getElementById('servicesTableBody');
  dom.searchInput = document.getElementById('searchInput');
  dom.statusFilter = document.getElementById('statusFilter');
  dom.lastUpdated = document.getElementById('lastUpdated');
  dom.serviceCount = document.getElementById('serviceCount');
  dom.detailsPane = document.getElementById('detailsPane');
  dom.refreshButton = document.getElementById('refreshButton');
  dom.statusText = document.getElementById('statusText');
  dom.indicatorDot = document.getElementById('indicatorDot');
  dom.toastContainer = document.getElementById('toastContainer');
}

function bindEvents() {
  const debouncedFilter = debounce(applyFilters, 180);
  dom.searchInput.addEventListener('input', debouncedFilter);
  dom.statusFilter.addEventListener('change', applyFilters);
  dom.refreshButton.addEventListener('click', () => refreshServices({ showLoader: true }));
}

function startPolling() {
  stopPolling();
  state.pollTimer = setInterval(() => refreshServices({ showLoader: false }), state.pollInterval);
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function refreshServices({ showLoader }) {
  if (state.loading) return;

  setLoading(true, showLoader);
  try {
    const response = await window.serviceAPI.listServices({
      search: dom.searchInput.value.trim() || undefined,
      status: dom.statusFilter.value,
    });

    if (!response || !response.ok) {
      throw response && response.error ? new Error(response.error.message || 'Failed to load services') : new Error('Unexpected response');
    }

    state.services = Array.isArray(response.data) ? response.data : [];
    state.lastUpdated = new Date();
    applyFilters();
  } catch (error) {
    console.error('Failed to refresh services', error);
    showToast(error.message || 'Unable to load services', 'error');
  } finally {
    setLoading(false, showLoader);
  }
}

function applyFilters() {
  const search = dom.searchInput.value.trim().toLowerCase();
  const status = dom.statusFilter.value;

  let filtered = state.services.slice();

  if (search) {
    filtered = filtered.filter((item) => {
      return (
        item.name.toLowerCase().includes(search) ||
        (item.description && item.description.toLowerCase().includes(search)) ||
        (item.executable && item.executable.toLowerCase().includes(search))
      );
    });
  }

  if (status && status !== 'all') {
    const target = status.toLowerCase();
    filtered = filtered.filter((item) => (item.status || '').toLowerCase() === target);
  }

  state.filtered = filtered;
  renderTable();
  updateFooter();

  if (state.selectedId) {
    const current = state.filtered.find((item) => item.id === state.selectedId);
    if (!current) {
      state.selectedId = null;
      renderDetails(null);
    } else {
      renderDetails(current);
    }
  }
}

function renderTable() {
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

    row.addEventListener('click', () => selectService(service));

    row.appendChild(createCell(service.name, 'cell-name'));
    row.appendChild(createStatusCell(service));
    row.appendChild(createCell(formatStartupType(service.startupType), 'cell-startup'));
    row.appendChild(createCell(service.executable || '—', 'cell-executable', true));
    row.appendChild(createCell(service.description || '—', 'cell-description'));
    row.appendChild(createActionsCell(service));

    dom.tableBody.appendChild(row);
  });
}

function createCell(content, className = '', monospace = false) {
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

function createStatusCell(service) {
  const cell = document.createElement('td');
  cell.className = 'cell-status';

  const badge = document.createElement('span');
  badge.className = `status-badge status-${service.status || 'unknown'}`;
  badge.textContent = service.statusLabel || service.status || 'unknown';
  cell.appendChild(badge);

  return cell;
}

function createActionsCell(service) {
  const cell = document.createElement('td');
  cell.className = 'cell-actions';

  const startBtn = createActionButton('Start', 'start', service.canStart);
  const stopBtn = createActionButton('Stop', 'stop', service.canStop);
  const restartBtn = createActionButton('Restart', 'restart', service.canRestart);

  startBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    handleAction('start', service);
  });

  stopBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    handleAction('stop', service);
  });

  restartBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    handleAction('restart', service);
  });

  cell.appendChild(startBtn);
  cell.appendChild(stopBtn);
  cell.appendChild(restartBtn);

  return cell;
}

function createActionButton(label, action, enabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `action-button action-${action}`;
  button.textContent = label;
  button.disabled = !enabled;
  return button;
}

async function selectService(service) {
  state.selectedId = service.id;
  renderTable();
  renderDetails(service);

  try {
    const response = await window.serviceAPI.getServiceDetails(service.id);
    if (response && response.ok && response.data) {
      const updatedService = {
        ...service,
        ...response.data,
      };
      renderDetails(updatedService);
    }
  } catch (error) {
    console.warn('Failed to load service details', error);
  }
}

function renderDetails(service) {
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
            handler: () => window.serviceAPI.openPath(service.unitFile),
          },
        }
      : undefined
  );

  dom.detailsPane.appendChild(list);
}

function appendDetail(list, label, value, options = undefined) {
  let valueClass = '';
  let action = null;

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

function updateFooter() {
  const count = state.filtered.length;
  dom.serviceCount.textContent = `${count} ${count === 1 ? 'service' : 'services'}`;
  dom.lastUpdated.textContent = state.lastUpdated
    ? `Last updated: ${state.lastUpdated.toLocaleTimeString()}`
    : 'Last updated: —';
}

function setLoading(isLoading, showIndicator) {
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

async function handleAction(action, service) {
  try {
    const response = await window.serviceAPI.controlService(service.id, action);
    if (!response || !response.ok) {
      const message = response && response.error ? response.error.message : 'Action failed';
      throw new Error(message);
    }
    showToast(`${capitalize(action)} requested for ${service.name}`, 'success');
    await refreshServices({ showLoader: false });
  } catch (error) {
    console.error(`Failed to ${action} service`, error);
    showToast(error.message || `Unable to ${action} service`, 'error');
  }
}

function formatStartupType(value) {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function debounce(fn, wait) {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function showToast(message, type = 'info') {
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
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3200);
}

