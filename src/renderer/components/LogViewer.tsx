import React, { useState, useEffect, useCallback } from 'react';
import type { ServiceLogs } from '../../types/service';
import LoadingSpinner from './LoadingSpinner';

interface LogViewerProps {
  serviceId: string;
  serviceName: string;
  isOpen: boolean;
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ serviceId, serviceName, isOpen, onClose }) => {
  const [logs, setLogs] = useState<ServiceLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineCount, setLineCount] = useState<number>(100);

  const fetchLogs = useCallback(async () => {
    if (!window.serviceAPI || !serviceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await window.serviceAPI.getServiceLogs(serviceId, lineCount);
      if (response.ok && response.data) {
        setLogs(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [serviceId, lineCount]);

  useEffect(() => {
    if (isOpen && serviceId) {
      fetchLogs();
    }
  }, [isOpen, serviceId, fetchLogs]);

  const handleCopyLogs = useCallback(() => {
    if (logs?.logs) {
      navigator.clipboard.writeText(logs.logs).catch(err => {
        console.error('Failed to copy logs:', err);
      });
    }
  }, [logs]);

  const handleDownloadLogs = useCallback(() => {
    if (!logs?.logs) return;

    const blob = new Blob([logs.logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName}-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs, serviceName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Service Logs
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{serviceName}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lineCount}
              onChange={(e) => setLineCount(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={250}>250 lines</option>
              <option value={500}>500 lines</option>
              <option value={1000}>1000 lines</option>
            </select>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && !logs ? (
            <LoadingSpinner text="Loading logs..." />
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">Error loading logs</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : logs ? (
            <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {logs.logs}
              </pre>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No logs available
            </div>
          )}
        </div>

        {logs && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {logs.lines} lines • Last updated: {new Date(logs.timestamp).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleDownloadLogs}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Download Logs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
