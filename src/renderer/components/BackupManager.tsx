import React, { useState, useEffect } from 'react';
import type { ServiceBackup } from '../../types/service';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupCreated: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ isOpen, onClose, onBackupCreated }) => {
  const [backups, setBackups] = useState<ServiceBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBackups = async () => {
    if (!window.serviceAPI) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await window.serviceAPI.listBackups();
      if (response.ok && response.data) {
        setBackups(response.data);
      } else {
        setError(response.error?.message || 'Failed to load backups');
      }
    } catch (err) {
      setError('Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const handleCreateBackup = async () => {
    if (!window.serviceAPI) return;
    
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await window.serviceAPI.createBackup();
      if (response.ok) {
        setSuccess('Backup created successfully');
        await loadBackups();
        onBackupCreated();
      } else {
        setError(response.error?.message || 'Failed to create backup');
      }
    } catch (err) {
      setError('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    if (!window.serviceAPI) return;
    
    if (!confirm('Are you sure you want to restore this backup? This will change the state of your services.')) {
      return;
    }
    
    setRestoring(id);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await window.serviceAPI.restoreBackup(id);
      if (response.ok && response.data) {
        const { success: successCount, failed, errors } = response.data;
        if (failed > 0) {
          setError(`Restored with ${failed} failures: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
        } else {
          setSuccess(`Successfully restored ${successCount} services`);
        }
        onBackupCreated();
      } else {
        setError(response.error?.message || 'Failed to restore backup');
      }
    } catch (err) {
      setError('Failed to restore backup');
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.serviceAPI) return;
    
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }
    
    setDeleting(id);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await window.serviceAPI.deleteBackup(id);
      if (response.ok) {
        setSuccess('Backup deleted successfully');
        await loadBackups();
      } else {
        setError(response.error?.message || 'Failed to delete backup');
      }
    } catch (err) {
      setError('Failed to delete backup');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'win32': return 'Windows';
      case 'darwin': return 'macOS';
      case 'linux': return 'Linux';
      default: return platform;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-normal text-gray-900 dark:text-white">
            Backup Manager
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 text-sm">
              {success}
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-80 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create New Backup'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No backups found. Create your first backup to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-gray-200 dark:border-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(backup.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {backup.totalServices} services • {getPlatformLabel(backup.platform)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleRestoreBackup(backup.id)}
                        disabled={restoring === backup.id || deleting === backup.id}
                        className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                      >
                        {restoring === backup.id ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        disabled={restoring === backup.id || deleting === backup.id}
                        className="px-3 py-1 text-xs border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {deleting === backup.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {backup.platform !== process.platform && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ⚠ Platform mismatch: This backup is from {getPlatformLabel(backup.platform)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
