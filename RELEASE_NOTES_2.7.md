# Service Manager v2.7.0 Release Notes

## 🎉 New Features

### 📊 Service Log Viewer
- **View service logs in real-time** with the new integrated log viewer
- Support for systemd journal (Linux), Windows Event Viewer, and macOS system logs
- Configurable line count (50, 100, 250, 500, 1000 lines)
- Copy logs to clipboard or download as text files
- Keyboard shortcut: `Ctrl/Cmd+L` to open logs for selected service

### ⭐ Favorite Services
- **Pin important services** to the top of your service list
- Click the star icon next to any service to mark it as a favorite
- Favorites are automatically sorted to the top for quick access
- Preferences are saved locally and persist across sessions

### 📤 Export Service Data
- **Export your services** to multiple formats:
  - **CSV** - For spreadsheets and data analysis
  - **JSON** - For programmatic access and backups
  - **Markdown** - For documentation and reports
- Access via the new "Export" dropdown in the header
- Exports respect current filters (search and status)
- Automatic filename generation with timestamps

### 🎯 Bulk Actions (Coming Soon)
- Select multiple services with checkboxes
- Perform actions on multiple services simultaneously
- Clear and intuitive bulk action bar
- Support for Start, Stop, Restart, Enable, and Disable operations

## 🔧 Improvements

### Performance Optimizations
- Enhanced service filtering with favorites prioritization
- Improved caching for better responsiveness
- Optimized log retrieval with configurable timeouts

### User Experience
- Better error messages for export and log operations
- Toast notifications for all new features
- Keyboard shortcuts for quick access to new features
- Responsive design improvements

## 🐛 Bug Fixes
- Fixed service selection state persistence after refresh
- Improved error handling for log retrieval failures
- Enhanced validation for export operations

## 📝 API Changes

### New IPC Handlers
- `logs:get` - Retrieve service logs
- `services:export` - Export services to various formats

### New TypeScript Interfaces
- `ServiceLogs` - Log data structure
- `ExportFormat` - Export format types
- `ExportResult` - Export operation results
- `ServiceNote` - User notes for services
- `UserPreferences` - Favorites and notes storage

## 🚀 Technical Details

### New Backend Modules
- `src/main/logs.ts` - Cross-platform log retrieval
- `src/main/export.ts` - Service export functionality

### New Frontend Components
- `LogViewer` - Modal log viewer with search and download
- `BulkActionsBar` - Floating action bar for bulk operations

### New Hooks
- `useUserPreferences` - Manage favorites and notes with localStorage

## 📦 Installation

```bash
npm install -g @omnizs/service-manager@2.7.0
```

Or download the platform-specific binary from the releases page.

## 🔮 Coming in Future Releases

- Service notes and tags
- Advanced filtering with multiple criteria
- Service dependency visualization
- Performance metrics and monitoring
- Custom service groups/categories
- Service history timeline

## 💝 Thank You

Thank you to all users for your continued support and feedback!

---

**Full Changelog**: https://github.com/omnizs/Service-Manager/compare/v2.6.5...v2.7.0
