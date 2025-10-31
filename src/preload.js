const { contextBridge, ipcRenderer } = require('electron');

const api = {
  listServices: (filters) => ipcRenderer.invoke('services:list', filters || {}),
  controlService: (serviceId, action) =>
    ipcRenderer.invoke('services:control', { serviceId, action }),
  getServiceDetails: (serviceId) => ipcRenderer.invoke('services:details', serviceId),
  openPath: (targetPath) => ipcRenderer.send('app:openPath', targetPath),
  showError: (message) => ipcRenderer.invoke('app:showErrorDialog', message),
  onServiceEvent: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('services:event', listener);
    return () => ipcRenderer.removeListener('services:event', listener);
  },
};

contextBridge.exposeInMainWorld('serviceAPI', api);

