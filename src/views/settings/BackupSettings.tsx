import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  HardDrive,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileDown,
  Calendar,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Badge } from '../../components/ui/Badge.tsx';

export interface Backup {
  id: number;
  filename: string;
  path: string;
  size: number;
  created_at: string;
  is_valid: boolean;
  metadata?: {
    version: string;
    record_count: number;
    tables?: string[];
  };
}

export function BackupSettingsTab() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [keepCount, setKeepCount] = useState(7);
  const [backupTime, setBackupTime] = useState('03:00');
  const [expandedBackup, setExpandedBackup] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load backups on mount
  useEffect(() => {
    loadBackups();
    loadSettings();
  }, []);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual IPC call when backend is ready
      // const result = await window.justiceAPI.db.listBackups();
      // if (result.success) {
      //   setBackups(result.data);
      // }

      // Mock data for demonstration
      const mockBackups: Backup[] = [
        {
          id: 1,
          filename: 'backup_2025-10-25_15-30.db',
          path: 'F:\\Justice Companion\\backups\\backup_2025-10-25_15-30.db',
          size: 2411520,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_valid: true,
          metadata: {
            version: '1.0.0',
            record_count: 1247,
            tables: ['users', 'cases', 'evidence', 'deadlines'],
          },
        },
        {
          id: 2,
          filename: 'backup_2025-10-24_03-00.db',
          path: 'F:\\Justice Companion\\backups\\backup_2025-10-24_03-00.db',
          size: 2201600,
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          is_valid: true,
          metadata: {
            version: '1.0.0',
            record_count: 1189,
          },
        },
        {
          id: 3,
          filename: 'backup_2025-10-23_03-00.db',
          path: 'F:\\Justice Companion\\backups\\backup_2025-10-23_03-00.db',
          size: 2097152,
          created_at: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
          is_valid: true,
          metadata: {
            version: '1.0.0',
            record_count: 1156,
          },
        },
      ];
      setBackups(mockBackups);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      // TODO: Replace with actual IPC call when backend is ready
      // const result = await window.justiceAPI.db.getBackupSettings();
      // if (result.success) {
      //   setAutoBackupEnabled(result.data.enabled);
      //   setFrequency(result.data.frequency);
      //   setKeepCount(result.data.keepCount);
      // }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      // TODO: Replace with actual IPC call when backend is ready
      // const result = await window.justiceAPI.db.createBackup();
      // if (result.success) {
      //   showSuccess('Backup created successfully');
      //   await loadBackups();
      // } else {
      //   showError(result.error);
      // }

      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await loadBackups();
      showToast('Backup created successfully', 'success');
    } catch (error) {
      showToast('Failed to create backup', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backup: Backup) => {
    const confirmed = await showConfirmDialog({
      title: 'Restore Database',
      message: `This will replace your current database with the backup from ${formatRelativeTime(backup.created_at)}. Are you sure?`,
      confirmText: 'Restore',
    });

    if (confirmed) {
      try {
        // TODO: Replace with actual IPC call when backend is ready
        // const result = await window.justiceAPI.db.restoreBackup(backup.id);
        // if (result.success) {
        //   showSuccess('Database restored successfully');
        //   window.location.reload();
        // } else {
        //   showError(result.error);
        // }

        showToast('Restore functionality will be available soon', 'info');
      } catch (error) {
        showToast('Failed to restore backup', 'error');
      }
    }
  };

  const handleExport = async (backup: Backup) => {
    try {
      // TODO: Replace with actual IPC call when backend is ready
      // const result = await window.justiceAPI.db.exportBackup(backup.id);
      // if (result.success) {
      //   showSuccess(`Backup exported to ${result.data.path}`);
      // } else {
      //   showError(result.error);
      // }

      showToast(`Exported ${backup.filename} to Downloads`, 'success');
    } catch (error) {
      showToast('Failed to export backup', 'error');
    }
  };

  const handleDelete = async (backupId: number) => {
    const confirmed = await showConfirmDialog({
      title: 'Delete Backup',
      message: 'This cannot be undone. Are you sure?',
      confirmText: 'Delete',
    });

    if (confirmed) {
      try {
        // TODO: Replace with actual IPC call when backend is ready
        // const result = await window.justiceAPI.db.deleteBackup(backupId);
        // if (result.success) {
        //   showSuccess('Backup deleted');
        //   await loadBackups();
        // } else {
        //   showError(result.error);
        // }

        setBackups((prev) => prev.filter((b) => b.id !== backupId));
        showToast('Backup deleted', 'success');
      } catch (error) {
        showToast('Failed to delete backup', 'error');
      }
    }
  };

  const handleSaveAutoBackup = async () => {
    try {
      // TODO: Replace with actual IPC call when backend is ready
      // const result = await window.justiceAPI.db.updateBackupSettings({
      //   enabled: autoBackupEnabled,
      //   frequency,
      //   keepCount,
      //   time: backupTime,
      // });

      // if (result.success) {
      //   setSaveSuccess(true);
      //   setTimeout(() => setSaveSuccess(false), 3000);
      // } else {
      //   showError(result.error);
      // }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showToast('Auto-backup settings saved', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    }
  };

  // Helper functions
  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {return 'Just now';}
    if (diffMins < 60) {return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;}
    if (diffHours < 24) {return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;}
    if (diffDays < 7) {return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;}
    return date.toLocaleDateString();
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {return `${bytes} B`;}
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function showConfirmDialog(options: {
    title: string;
    message: string;
    confirmText: string;
  }): Promise<boolean> {
    // TODO: Implement proper modal dialog
    return window.confirm(`${options.title}\n\n${options.message}`);
  }

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    // TODO: Implement proper toast notification
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  const latestBackup = backups[0];
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Backup & Restore</h2>
        <p className="text-white/60">Create backups and restore your database to a previous state</p>
      </div>

      {/* Status Overview */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Last Backup */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-white/60">Last Backup</span>
              </div>
              <p className="text-xl font-semibold text-white">
                {latestBackup ? formatRelativeTime(latestBackup.created_at) : 'Never'}
              </p>
            </div>

            {/* Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-sm text-white/60">Status</span>
              </div>
              <Badge variant={latestBackup?.is_valid ? 'success' : 'warning'} glow>
                {latestBackup?.is_valid ? 'Healthy' : 'No backups'}
              </Badge>
            </div>

            {/* Total Backups */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-white/60">Total Storage</span>
              </div>
              <p className="text-xl font-semibold text-white">
                {formatFileSize(totalSize)} ({backups.length} backups)
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Manual Backup */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Manual Backup</h3>
              <p className="text-sm text-white/60">Create a snapshot of your database right now</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateBackup}
              loading={isCreating}
              variant="primary"
              icon={<RefreshCw />}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isCreating ? 'Creating Backup...' : 'Create Backup Now'}
            </Button>

            {latestBackup && (
              <span className="text-sm text-white/60">
                Last backup: {formatRelativeTime(latestBackup.created_at)}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Automatic Backups */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Automatic Backups</h3>
              <p className="text-sm text-white/60">Schedule regular automated backups</p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h4 className="text-white font-medium">Enable Automatic Backups</h4>
              <p className="text-sm text-white/60">Create backups on a schedule</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                className="sr-only peer"
                aria-label="Enable automatic backups"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
            </label>
          </div>

          {/* Settings (shown when enabled) */}
          <AnimatePresence>
            {autoBackupEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Frequency */}
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-white mb-2">
                    Backup Frequency
                  </label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    aria-label="Backup frequency"
                  >
                    <option value="daily">Daily (Recommended)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Time */}
                <div>
                  <label htmlFor="backup-time" className="block text-sm font-medium text-white mb-2">
                    Backup Time
                  </label>
                  <input
                    id="backup-time"
                    type="time"
                    value={backupTime}
                    onChange={(e) => setBackupTime(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    aria-label="Backup time"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    Backups will run automatically at this time
                  </p>
                </div>

                {/* Keep Count */}
                <div>
                  <label htmlFor="keep-count" className="block text-sm font-medium text-white mb-2">
                    Keep Last {keepCount} Backups
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      id="keep-count"
                      type="range"
                      min="1"
                      max="30"
                      value={keepCount}
                      onChange={(e) => setKeepCount(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-blue-950/50 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      aria-label="Number of backups to keep"
                    />
                    <span className="text-white font-medium w-12 text-center">{keepCount}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    Older backups will be automatically deleted
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    onClick={handleSaveAutoBackup}
                    variant="primary"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Save Settings
                  </Button>

                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-green-400"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Backup History */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Backup History</h3>
              <p className="text-sm text-white/60 mt-1">{backups.length} backups available</p>
            </div>
            <Button
              onClick={loadBackups}
              variant="ghost"
              size="sm"
              icon={<RefreshCw />}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No backups found</p>
              <p className="text-sm text-white/40 mt-2">Create your first backup above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <BackupListItem
                  key={backup.id}
                  backup={backup}
                  isExpanded={expandedBackup === backup.id}
                  onToggle={() => setExpandedBackup(expandedBackup === backup.id ? null : backup.id)}
                  onRestore={() => handleRestore(backup)}
                  onExport={() => handleExport(backup)}
                  onDelete={() => handleDelete(backup.id)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

interface BackupListItemProps {
  backup: Backup;
  isExpanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onExport: () => void;
  onDelete: () => void;
}

function BackupListItem({ backup, isExpanded, onToggle, onRestore, onExport, onDelete }: BackupListItemProps) {
  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {return 'Just now';}
    if (diffMins < 60) {return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;}
    if (diffHours < 24) {return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;}
    if (diffDays < 7) {return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;}
    return date.toLocaleDateString();
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {return `${bytes} B`;}
    if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <motion.div
      layout
      className="rounded-lg bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 transition-colors"
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <Database className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <p className="font-medium text-white truncate">{backup.filename}</p>
              {backup.is_valid && (
                <Badge variant="success" size="sm" dot>
                  Valid
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>{formatFileSize(backup.size)}</span>
              <span>•</span>
              <span>{formatRelativeTime(backup.created_at)}</span>
              {backup.metadata?.record_count && (
                <>
                  <span>•</span>
                  <span>{backup.metadata.record_count.toLocaleString()} records</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onRestore} variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4" />
              Restore
            </Button>
            <Button onClick={onExport} variant="ghost" size="sm">
              <FileDown className="w-4 h-4" />
              Export
            </Button>
            <Button onClick={onDelete} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
            </Button>
            <button
              onClick={onToggle}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && backup.metadata && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 bg-white/5 p-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-white/60">Version</span>
                <p className="text-white font-medium">{backup.metadata.version}</p>
              </div>
              <div>
                <span className="text-white/60">Records</span>
                <p className="text-white font-medium">{backup.metadata.record_count.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-white/60">Created</span>
                <p className="text-white font-medium">{new Date(backup.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-white/60">File Size</span>
                <p className="text-white font-medium">{formatFileSize(backup.size)}</p>
              </div>
            </div>

            {backup.metadata.tables && (
              <div className="mt-4">
                <span className="text-white/60 text-sm">Tables</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {backup.metadata.tables.map((table) => (
                    <Badge key={table} variant="neutral" size="sm">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200">
                  <strong>Restore Warning:</strong> Restoring this backup will replace your current database.
                  All data created after {formatRelativeTime(backup.created_at)} will be lost.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
