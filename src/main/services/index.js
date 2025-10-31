const os = require('os');

function loadProvider() {
  switch (process.platform) {
    case 'win32':
      return require('./windows');
    case 'darwin':
      return require('./macos');
    case 'linux':
    default:
      return require('./linux');
  }
}

const provider = loadProvider();

async function listServices(options = {}) {
  return provider.listServices(options);
}

async function controlService(serviceId, action) {
  if (!provider.controlService) {
    throw new Error(`Service control is not available on ${os.type()}`);
  }
  return provider.controlService(serviceId, action);
}

async function getServiceDetails(serviceId) {
  if (provider.getServiceDetails) {
    return provider.getServiceDetails(serviceId);
  }

  const services = await provider.listServices({ serviceId });
  return services.find((item) => item.id === serviceId || item.name === serviceId) || null;
}

module.exports = {
  listServices,
  controlService,
  getServiceDetails,
};

