import type { ServiceInfo, ExportFormat, ExportResult } from '../types/service';

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

function exportToCSV(services: ServiceInfo[]): string {
  const headers = ['Name', 'Status', 'Startup Type', 'Description', 'Executable', 'PID', 'Provider'];
  const rows = services.map(service => [
    escapeCSV(service.name),
    escapeCSV(service.statusLabel || service.status),
    escapeCSV(service.startupType),
    escapeCSV(service.description),
    escapeCSV(service.executable),
    escapeCSV(service.pid?.toString()),
    escapeCSV(service.provider),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function exportToJSON(services: ServiceInfo[]): string {
  const exportData = services.map(service => ({
    id: service.id,
    name: service.name,
    status: service.status,
    statusLabel: service.statusLabel,
    startupType: service.startupType,
    description: service.description,
    executable: service.executable,
    pid: service.pid,
    provider: service.provider,
    unitFile: service.unitFile,
    loadState: service.loadState,
    domain: service.domain,
  }));

  return JSON.stringify(exportData, null, 2);
}

function exportToMarkdown(services: ServiceInfo[]): string {
  let markdown = '# Service Manager Export\n\n';
  markdown += `Total Services: ${services.length}\n\n`;
  markdown += '| Name | Status | Startup Type | Description | Provider |\n';
  markdown += '|------|--------|--------------|-------------|----------|\n';

  services.forEach(service => {
    const name = service.name.replace(/\|/g, '\\|');
    const status = (service.statusLabel || service.status).replace(/\|/g, '\\|');
    const startupType = (service.startupType || '').replace(/\|/g, '\\|');
    const description = (service.description || '').replace(/\|/g, '\\|').substring(0, 100);
    const provider = service.provider.replace(/\|/g, '\\|');

    markdown += `| ${name} | ${status} | ${startupType} | ${description} | ${provider} |\n`;
  });

  return markdown;
}

export async function exportServices(
  format: ExportFormat,
  services: ServiceInfo[]
): Promise<ExportResult> {
  const timestamp = new Date().toISOString().split('T')[0];
  let content: string;
  let filename: string;

  switch (format) {
    case 'csv':
      content = exportToCSV(services);
      filename = `services-export-${timestamp}.csv`;
      break;
    case 'json':
      content = exportToJSON(services);
      filename = `services-export-${timestamp}.json`;
      break;
    case 'markdown':
      content = exportToMarkdown(services);
      filename = `services-export-${timestamp}.md`;
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  return {
    format,
    content,
    filename,
  };
}
