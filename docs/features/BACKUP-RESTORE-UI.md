# Backup & Restore UI - Feature Documentation

## Overview

The Backup & Restore UI provides a comprehensive interface for managing database backups in Justice Companion. Users can create manual backups, schedule automatic backups, view backup history, and restore from previous backup points.

## Location

- **Main Component**: `src/views/settings/BackupSettings.tsx`
- **Integration**: Settings View > Backup & Restore tab
- **Type Definitions**: `src/types/window.d.ts` (Backup, AutoBackupSettings interfaces)
- **Tests**: `src/views/settings/BackupSettings.test.tsx`
- **Utilities**: `src/utils/formatters.ts` (formatRelativeTime, formatFileSize)

## Features

### 1. Status Overview

Displays key backup metrics at a glance:
- **Last Backup**: Relative time since last backup (e.g., "2 hours ago")
- **Status**: Health indicator (Healthy/Warning badge)
- **Total Storage**: Total size of all backups and count

### 2. Manual Backup

- Create instant backup with single button click
- Shows loading state during backup creation
- Displays creation progress
- Updates backup history automatically

### 3. Automatic Backups

**Configuration Options:**
- **Enable/Disable Toggle**: Master switch for auto-backups
- **Frequency**: Daily (recommended), Weekly, or Monthly
- **Backup Time**: Specific time of day to run backups (default: 03:00)
- **Keep Count**: Number of backups to retain (1-30, default: 7)

**Features:**
- Collapsible settings panel (shown only when enabled)
- Range slider for intuitive keep count selection
- Visual feedback on save (success message)

### 4. Backup History

**List View:**
- Chronological list of all backups (newest first)
- File metadata: filename, size, creation time, record count
- Status badges (Valid/Invalid)
- Hover effects for better UX

**Expandable Details:**
- Version information
- Record count
- Creation timestamp
- File size
- Table list (if available)
- Restore warning

**Actions:**
- **Restore**: Replace current database with backup
- **Export**: Save backup to external location
- **Delete**: Remove backup permanently
- **Expand/Collapse**: Toggle detailed view

### 5. Confirmations & Warnings

- Restore confirmation dialog with data loss warning
- Delete confirmation dialog
- Inline warning in expanded backup view

## UI Components Used

- **Card**: Glassmorphism cards for sections
- **Button**: Primary/secondary/ghost variants with loading states
- **Badge**: Status indicators with glow effects
- **Motion**: Smooth expand/collapse animations
- **Icons**: Lucide React icons for visual clarity

## Data Flow

```
User Action → BackupSettings Component → IPC Call → Main Process → Database
                                                                         ↓
User Feedback ← Component State Update ← IPC Response ← Backup Service ← Database
```

## Mock Data (Development)

The component currently uses mock data for demonstration:
- 3 sample backups with realistic metadata
- Simulated creation delay (2 seconds)
- Local state management

## Integration Points (To Be Implemented)

### IPC Methods (window.justiceAPI.db)

```typescript
// Create backup
createBackup(): Promise<IPCResponse<Backup>>

// List all backups
listBackups(): Promise<IPCResponse<Backup[]>>

// Restore from backup
restoreBackup(backupId: number): Promise<IPCResponse<void>>

// Export backup to external location
exportBackup(backupId: number): Promise<IPCResponse<{ path: string }>>

// Delete backup
deleteBackup(backupId: number): Promise<IPCResponse<void>>

// Get auto-backup settings
getBackupSettings(): Promise<IPCResponse<AutoBackupSettings>>

// Update auto-backup settings
updateBackupSettings(settings: AutoBackupSettings): Promise<IPCResponse<void>>
```

### Backend Integration

When backend is ready, replace mock implementations:

1. **Load Backups**: Replace mock data with `window.justiceAPI.db.listBackups()`
2. **Create Backup**: Call `window.justiceAPI.db.createBackup()`
3. **Restore**: Call `window.justiceAPI.db.restoreBackup(backupId)`
4. **Export**: Call `window.justiceAPI.db.exportBackup(backupId)`
5. **Delete**: Call `window.justiceAPI.db.deleteBackup(backupId)`
6. **Settings**: Load/save via `getBackupSettings()` and `updateBackupSettings()`

## Type Definitions

### Backup Interface

```typescript
interface Backup {
  id: number;
  filename: string;
  path: string;
  size: number; // bytes
  created_at: string; // ISO date string
  is_valid: boolean;
  metadata?: {
    version: string;
    record_count: number;
    tables?: string[];
  };
}
```

### AutoBackupSettings Interface

```typescript
interface AutoBackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  keepCount: number; // 1-30
  time?: string; // HH:mm format
}
```

## Accessibility

- **Keyboard Navigation**: All interactive elements keyboard accessible
- **ARIA Labels**: Proper labels for screen readers
- **Focus Indicators**: Visible focus states
- **Toggle Switch**: Standard checkbox with visual enhancement
- **Semantic HTML**: Proper use of labels, buttons, and headings

## User Experience

### Visual Feedback

- Loading spinners during async operations
- Success messages after saves
- Badge indicators for status
- Smooth expand/collapse animations
- Hover effects on interactive elements

### Error Handling

- Toast notifications for errors (to be implemented)
- Confirmation dialogs for destructive actions
- Inline warnings for data loss risks

### Responsive Design

- Grid layouts adapt to screen size
- Mobile-friendly (though desktop-first)
- Collapsible sections save space
- Scrollable history list

## Testing

### Unit Tests (`BackupSettings.test.tsx`)

- Renders all UI sections
- Displays backup status overview
- Shows create backup button
- Handles auto-backup toggle
- Displays backup settings when enabled
- Shows backup history with mock data
- Handles frequency selection
- Handles keep count slider
- Displays file sizes correctly
- Shows relative time formatting
- Renders badges and status indicators
- Handles save settings
- Shows loading states

### Accessibility Tests

- ARIA labels for interactive elements
- Proper checkbox states
- Keyboard accessibility

### Integration Tests

- Expand/collapse backup details
- Update frequency in UI
- Settings persistence (when backend ready)

## Future Enhancements

1. **Backup Verification**: Automated integrity checks
2. **Backup Compression**: Reduce storage footprint
3. **Cloud Backup**: Export to cloud storage (Dropbox, Google Drive)
4. **Scheduled Restore**: Restore to specific point in time
5. **Backup Encryption**: Encrypt backups at rest
6. **Incremental Backups**: Only backup changes
7. **Backup Preview**: View backup contents without restoring
8. **Restore Dry Run**: Preview restore changes
9. **Backup Notes**: Add custom notes to backups
10. **Email Notifications**: Alert on backup success/failure

## Design System

### Colors

- Primary: Purple gradient (`from-purple-500 to-pink-500`)
- Success: Green (`success-400`)
- Warning: Yellow (`warning-400`)
- Danger: Red (`danger-400`)
- Background: Blue-900 with transparency (`bg-blue-900/30`)
- Borders: White with low opacity (`border-white/10`)

### Typography

- Headings: `text-2xl font-bold text-white`
- Subheadings: `text-lg font-semibold text-white`
- Body: `text-white/60`
- Small text: `text-sm text-white/60`

### Spacing

- Section gaps: `space-y-6`
- Card padding: `p-6`
- Grid gaps: `gap-4` or `gap-6`

## Performance Considerations

- Lazy loading for large backup lists (future)
- Debounced search/filter (future)
- Virtualized list for 100+ backups (future)
- Memoized components for expensive renders
- Optimistic UI updates

## Security

- Confirmation dialogs prevent accidental deletions
- Warning messages for data loss operations
- Read-only display of backup metadata
- Secure IPC communication with main process
- No direct file system access from renderer

## Browser Compatibility

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Electron 33.2.1+ required
- No IE11 support

## Dependencies

- React 18.3
- Framer Motion (animations)
- Lucide React (icons)
- clsx (class merging)
- TailwindCSS 3.4 (styling)

## Related Files

- `src/views/SettingsView.tsx` - Parent settings container
- `src/components/ui/Card.tsx` - Card component
- `src/components/ui/Button.tsx` - Button component
- `src/components/ui/Badge.tsx` - Badge component
- `src/types/window.d.ts` - Type definitions
- `src/utils/formatters.ts` - Formatting utilities

## Changelog

### Version 1.0.0 (2025-10-25)

- Initial implementation
- Manual backup creation
- Auto-backup configuration
- Backup history view
- Restore, export, delete actions
- Expandable backup details
- Mock data for development
- Comprehensive test suite
- Accessibility features
