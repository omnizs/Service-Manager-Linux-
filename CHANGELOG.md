# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

