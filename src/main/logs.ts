import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ServiceLogs } from '../types/service';

const execAsync = promisify(exec);

export async function getServiceLogs(
  serviceId: string,
  serviceName: string,
  provider: 'systemd' | 'win32-service' | 'launchd',
  lines: number = 100
): Promise<ServiceLogs> {
  const timestamp = Date.now();
  let logs = '';

  try {
    if (provider === 'systemd') {
      const { stdout } = await execAsync(
        `journalctl -u ${serviceId} -n ${lines} --no-pager`,
        { timeout: 10000 }
      );
      logs = stdout.trim();
    } else if (provider === 'win32-service') {
      const { stdout } = await execAsync(
        `powershell -Command "Get-EventLog -LogName System -Source '${serviceName}' -Newest ${lines} | Format-Table -AutoSize | Out-String -Width 4096"`,
        { timeout: 10000 }
      );
      logs = stdout.trim();
    } else if (provider === 'launchd') {
      const logPaths = [
        `/var/log/${serviceName}.log`,
        `/Library/Logs/${serviceName}.log`,
        `~/Library/Logs/${serviceName}.log`,
      ];

      let found = false;
      for (const logPath of logPaths) {
        try {
          const { stdout } = await execAsync(`tail -n ${lines} ${logPath}`, { timeout: 5000 });
          logs = stdout.trim();
          found = true;
          break;
        } catch {
          continue;
        }
      }

      if (!found) {
        try {
          const { stdout } = await execAsync(
            `log show --predicate 'processImagePath contains "${serviceName}"' --last 1h --style syslog | tail -n ${lines}`,
            { timeout: 10000 }
          );
          logs = stdout.trim();
        } catch {
          logs = 'No logs found for this service';
        }
      }
    }

    if (!logs) {
      logs = 'No logs available for this service';
    }

    return {
      serviceId,
      serviceName,
      logs,
      lines: logs.split('\n').length,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      serviceId,
      serviceName,
      logs: `Error retrieving logs: ${errorMessage}`,
      lines: 1,
      timestamp,
    };
  }
}
