# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

