# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.5-alpha.1] - 2025-11-19

### Added

- **Service Notes Feature**: Add, edit, and delete notes for individual services
  - Rich text area for detailed service documentation
  - Tag support for organizing notes (press Enter to add tags)
  - Visual indicator (📄 icon) in service table for services with notes
  - Notes persist across sessions via localStorage
  - Automatic timestamps for created/updated times
  - Integrated into service details panel
- **Enhanced Keyboard Shortcuts**:
  - `Ctrl/Cmd + N` - Add or edit note for selected service
  - `Ctrl/Cmd + E` - Quick export services to JSON
  - `Ctrl/Cmd + Shift + F` - Toggle favorite for selected service
  - Improved keyboard navigation with normalized key handling
- **Better Accessibility**:
  - Enhanced ARIA labels for note editing controls
  - Improved screen reader support for note indicators
  - Better focus management when editing notes
  - Keyboard-friendly tag management

### Changed

- Keyboard shortcut handling now uses normalized key names for consistency
- ServiceDetails component now displays service notes inline
- ServiceTable component shows note indicators for quick identification

### Technical

- Added `ServiceNotes` component with full CRUD operations for service notes
- Enhanced `useUserPreferences` hook integration for note management
- Added `noteEditingTrigger` state for programmatic note editing
- Improved component props with optional note-related handlers
- Better TypeScript types for service notes and tags

## [2.8.0] - 2025-11-15

### Performance Improvements

- **Enhanced Cache Management**: Increased cache TTL from 500ms to 5000ms for better hit rates
  - Increased MAX_SIZE from 10 to 50 entries for OrderedCache
  - Periodic cleanup of expired cache entries every 2 minutes
- **Memory Optimizations**: Added memory optimization flags for Chromium
  - Implemented `disable-http-cache`, `max-old-space-size=512`, and `renderer-process-limit=1`
  - Added backgroundThrottling and enablePreferredSizeMode to BrowserWindow
  - Explicit garbage collection calls on window close and periodic cleanup when idle
- **React Performance Optimizations**:
  - Replaced state-based loading with ref-based loading state to prevent unnecessary re-renders
  - Optimized callback dependencies to use stable references
  - Improved filtering with useMemo computed values instead of separate state
  - Added search debouncing (300ms) to reduce filtering frequency
- **Pagination Optimization**: Reduced ITEMS_PER_PAGE from 100 to 50 for better performance
- **Service Criticality Detection**: Optimized with Set-based O(1) lookup instead of array.some()
- **Detail Loading**: Implemented lazy loading of service details using requestIdleCallback
- **Auto-refresh**: Increased default interval from 5 to 10 minutes to reduce overhead
- **Toast Queue**: Limited to 5 toasts maximum to prevent memory buildup

### Fixed

- **Callback Stability**: Fixed infinite re-render loops caused by unstable callback dependencies
- **Memory Leaks**: Resolved memory leaks from Set/Map object dependencies in useCallback
- **State Instability**: Fixed issues with loading state causing unnecessary component updates
- **Optional Chaining**: Added proper optional chaining for nested properties to prevent crashes

### Technical

- Improved React hooks implementation with refs for non-render state
- Enhanced useUserPreferences hook to prevent Set reference instability
- Optimized service criticality lookup with Set-based data structures
- Better dependency management in useCallback and useMemo hooks
- Reduced bundle size and improved startup time

## [2.7.0] - 2025-11-10

### Added

- **Log Viewer Modal** powered by the new `logs:get` IPC handler
  - Cross-platform log capture for systemd, launchd, and Windows Service Control Manager
  - Configure the number of lines (50-1000) and refresh on demand
  - Copy logs to clipboard or download as a text file straight from the UI
  - Keyboard shortcut: `Ctrl/Cmd + L` to open the log viewer for the active service
- **Favorite Services** via the new `useUserPreferences` hook
  - Star any service to keep it pinned to the top of the list
  - Favorite state persists locally across restarts thanks to localStorage backing
  - Visual star toggle within the service table plus quick sorting of pinned items
- **Service Export Utility** built on the `services:export` IPC
  - Export filtered services as CSV, JSON, or Markdown from the new header dropdown
  - Filenames include automatic timestamps for easy archival
  - Inline toast feedback for success/failure

### Changed

- **Service Table Enhancements**
  - Integrated favorite toggle and “View Logs” quick action into each row
  - Favorites float to the top after filtering without reloading the dataset
  - Row styling and widths adjusted for the new controls
- **Header UI** received an export dropdown with outside-click dismissal handling

### Technical

- Added `src/main/logs.ts` for secure log retrieval with platform-aware fallbacks
- Added `src/main/export.ts` for format-safe exporting and filename generation
- Extended preload API (and `ServiceAPI` typings) to surface `getServiceLogs` and `exportServices`
- Introduced `useUserPreferences` hook (favorites + notes scaffolding) in the renderer
- Added `LogViewer` component with rich UX and download helpers

## [2.6.5] - 2025-11-06

### Added

- **Service Criticality Indicators**: Visual indicators for critical and important system services
  - Critical services (⚠️): System-essential services with warnings about stability risks
  - Important services (⚡): Services affecting functionality with caution notes
  - Platform-aware detection for Windows, Linux (systemd), and macOS (launchd)
  - Comprehensive tooltips with criticality information, status, startup type, and description
- **Enhanced Action Button Tooltips**: More descriptive tooltips explaining what each action does
  - Detailed descriptions for start, stop, restart, enable, and disable actions
  - Context-aware disabled state tooltips

### Changed

- **Application Icon Redesign**: Modern, vibrant icon with improved visual clarity
  - New gradient-based design with blue and green accents
  - Service grid representation with active indicator
  - Enhanced shadow effects and depth
  - Consistent design across all platforms and sizes

### Technical

- Created `src/renderer/utils/serviceCriticality.ts`: Service criticality detection utility (201 lines)
- Enhanced `src/renderer/components/ServiceTable.tsx`: Added criticality indicators and enriched tooltips
- Updated `src/renderer/components/ActionButton.tsx`: Improved tooltip descriptions
- Redesigned `build/generate-icons.js`: New icon design with modern SVG elements

## [2.6.1] - 2025-11-04

### Added

- Restored light theme support with refined toggles in settings and quick switch in header
- Dynamic version metadata surfaced in settings and build via `__APP_VERSION__`
- Improved auto-update notification workflow with restart control and download state indicators

### Changed

- Update overlay redesigned with modern styling, progress indicator, and restart prompt
- Theme preferences now honor OS settings and persist across sessions and tabs
- Header and settings panels updated with additional accessibility cues and visual polish

### Fixed

- Auto-updater now consistently installs downloads on relaunch and surfaces errors in UI
- Version label in settings reflects the actual app version instead of outdated value

## [2.6.0] - 2025-11-04

### Added

- **Comprehensive Auto-Update System**: Intelligent update detection and management
  - Smart installation method detection (npm, packaged, or source)
  - For npm installations: Non-intrusive notification with one-click command copy
  - For packaged apps: Automatic background downloads with progress indicator
  - Auto-install on app close or immediate restart option
- **UpdateNotification Component**: Beautiful React notification UI with progress tracking
- **Update API**: New IPC handlers and event listeners for update management
  - `checkForUpdates()`: Programmatic update checking
  - `manualUpdateCheck()`: Manual check with UI dialogs
  - `onUpdateAvailable()`, `onUpdateProgress()`, `onUpdateError()` event listeners
- **Version Comparison**: Semantic versioning comparison for accurate update detection
- **Release Notes Display**: Direct links to GitHub release notes

### Changed

- Update checking now happens automatically 3 seconds after app startup
- Preload bridge enhanced with update-related APIs
- TypeScript types extended with `UpdateInfo` and `UpdateProgress` interfaces

### Technical

- Created `src/main/updater.ts`: Core update detection and management (313 lines)
- Created `src/renderer/components/UpdateNotification.tsx`: UI component (147 lines)
- Enhanced `src/preload.ts` with update event listeners
- Added IPC handlers in `src/main/main.ts` for update operations

## [2.5.1] - 2025-11-04

### Fixed

- **bin/service-manager.js**: Removed invalid `windowsHide` property from Unix process spawn options which was causing potential issues on Linux/macOS
- **bin/service-manager.js**: Improved `process.getuid` check to use `typeof` for better type safety
- **src/utils/errorHandler.ts**: Fixed overly aggressive path sanitization regex that was incorrectly replacing legitimate text in error messages
- **src/main/services/macos.ts**: Replaced unsafe type casting in `mapWithConcurrency` error handler with a proper fallback mechanism
- **src/main/main.ts**: Implemented proper LRU cache eviction with `OrderedCache` class to ensure oldest entries are removed based on insertion order
- **GitHub Actions**: Removed non-existent `npm run webpack` step from CI workflow
- **GitHub Actions**: Updated Node.js version matrix to only test against versions compatible with Vite 7.x (20.x, 22.x, 24.x)

### Changed

- **src/main/services/macos.ts**: Enhanced `mapWithConcurrency` function to accept optional fallback handler for more robust error handling
- **package.json**: Updated Node.js engine requirement from `>=18.0.0` to `>=20.19.0` to align with Vite 7.x requirements

## [2.5.0] - Previous Release

Initial release with core service management functionality.

