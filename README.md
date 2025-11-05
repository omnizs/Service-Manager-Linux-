# Service Manager

Service Manager is a cross-platform Electron application that offers a single, secure interface for discovering and managing system services on Linux (systemd), Windows (Service Control Manager), and macOS (launchd).

## Installation

### From npm

```bash
npm install -g @omnizs/service-manager
service-manager
```

### From Source

```bash
git clone https://github.com/omnizs/Service-Manager.git
cd Service-Manager
npm install
npm run build
npm start
```

`npm run build` compiles the TypeScript sources into `dist/`, copies static renderer assets, and prepares the Electron entry point. The application will launch in an Electron window.

## Running with Elevated Privileges

Service Manager can manage most services without elevated privileges, but some operations may require administrator/root access:

### Windows
**Automatic (v1.6.0+):** The application automatically requests administrator privileges via UAC prompt when launched from the command line or npm start.

**Alternative:** Right-click the application executable and select "Run as administrator"

**Note:** You can bypass automatic elevation with the `--no-elevation` flag if needed.

### macOS
```bash
sudo service-manager
# or use the --elevate flag
service-manager --elevate
```

### Linux
```bash
sudo service-manager
# or use the --elevate flag
service-manager --elevate
```

**Note:** On Linux and macOS, the application will prompt for authentication (via `pkexec` or `sudo`) when performing privileged operations, even if not started with elevated privileges. However, starting with `sudo` prevents repeated authentication prompts.

## Project Structure

- `src/main/` – Electron main process, IPC wiring, and OS-specific service controllers (TypeScript).
- `src/preload.ts` – Secure bridge between the main and renderer processes.
- `src/renderer/` – UI logic in TypeScript plus HTML/CSS assets.

## OS Support Notes

- **Linux**: Requires systemd. Service control escalates via `pkexec` if permissions are insufficient.
- **Windows**: Uses PowerShell (`Get-CimInstance`, `Start-Service`, etc.). Run the app from an elevated shell to manage protected services.
- **macOS**: Interacts with `launchctl`. Some user agents may require manual permission grants.

## Development

- `npm start` – Build the project (if needed) and launch Electron in development mode
- `npm run build` – Compile TypeScript sources and copy static assets to `dist/`
- `npm run clean` – Remove build artifacts
- Renderer auto-refreshes service data every 5 seconds. Use the `Refresh` button or `Ctrl+R` for manual updates

## Keyboard Shortcuts

- `Ctrl+R` / `Cmd+R` - Refresh service list
- `Ctrl+F` / `Cmd+F` - Focus search input
- `Escape` - Clear service selection

## Security

Service Manager includes comprehensive security enhancements:

- **Context Isolation**: The renderer operates with context isolation enabled; all privileged calls flow through controlled IPC handlers in the main process
- **Input Validation**: All service IDs, file paths, and user inputs are validated to prevent command injection attacks
- **Rate Limiting**: Service control operations are rate-limited (200ms cooldown) to prevent abuse
- **Content Security Policy**: Strict CSP headers prevent XSS and other injection attacks
- **Path Sandboxing**: File operations are restricted to whitelisted system directories
- **Audit Logging**: All privileged operations are logged with timestamps for accountability
- **Error Sanitization**: Error messages are sanitized to remove sensitive file paths and system information
- **Credential Security**: Elevated operations invoke native tooling (`systemctl`, `powershell`, `launchctl`) directly without storing credentials

## Changelog

### Version 2.6.5 (Latest)

**New Features:**
- **Service Criticality Indicators**: Visual indicators (⚠️ for critical, ⚡ for important) help identify system-essential services
  - Platform-aware detection for Windows, Linux (systemd), and macOS (launchd)
  - Comprehensive tooltips with criticality warnings, status, startup type, and description
  - Prevents accidental disruption of critical system services
- **Enhanced Action Button Tooltips**: Detailed descriptions for all service actions (start, stop, restart, enable, disable)
- **Application Icon Redesign**: Modern, vibrant icon with gradient-based design and improved visual clarity

**Technical Improvements:**
- New service criticality detection utility with platform-specific service lists
- Enhanced UI components with richer tooltip information
- Redesigned application icon with modern SVG elements

### Version 2.5.2

**Node.js Version Requirements Update:**
- Updated Node.js engine requirement from `>=18.0.0` to `>=20.19.0` to align with Vite 7.x requirements
- Fixed GitHub Actions CI workflow to only test against compatible Node.js versions (20.x, 22.x, 24.x)
- Removed non-existent `npm run webpack` step from CI workflow

**Note:** This version requires Node.js 20.19+ or 22.12+ due to Vite 7.x dependencies.

### Version 2.5.1

**Bug Fixes:**
- **bin/service-manager.js**: Removed invalid `windowsHide` property from Unix process spawn options which was causing potential issues on Linux/macOS
- **bin/service-manager.js**: Improved `process.getuid` check to use `typeof` for better type safety
- **src/utils/errorHandler.ts**: Fixed overly aggressive path sanitization regex that was incorrectly replacing legitimate text in error messages
- **src/main/services/macos.ts**: Replaced unsafe type casting in `mapWithConcurrency` error handler with a proper fallback mechanism
- **src/main/main.ts**: Implemented proper LRU cache eviction with `OrderedCache` class to ensure oldest entries are removed based on insertion order

**Changed:**
- **src/main/services/macos.ts**: Enhanced `mapWithConcurrency` function to accept optional fallback handler for more robust error handling

### Version 2.5.0

**Major Release:**
- Incremental improvements and bug fixes
- Enhanced error handling and performance optimizations

### Version 2.0.4

**Critical Fix:**
- Fixed "Cannot find module 'electron'" error when running globally installed package
- Moved Electron from devDependencies to dependencies for proper npm global installation

### Version 2.0.3

**Maintenance Release:**
- Minor bug fixes and stability improvements
- Performance optimizations for service list rendering
- Updated dependencies to latest versions:
  - @types/node to v24.10.0
  - Electron to v39.0.0
- General code quality improvements

### Version 2.0.2

**Maintenance Release:**
- Minor bug fixes and stability improvements
- Performance optimizations for service list rendering
- Updated dependencies to latest versions:
  - @types/node to v24.10.0
  - Electron to v39.0.0
- General code quality improvements

### Version 2.0.1

**Quick Update:**
- Fixed merge conflicts in documentation
- All v2.0.0 improvements included

### Version 2.0.0

**Major UI Redesign - Minimalist Edition:**
- Stopped services now displayed in **red** for immediate visibility
- Redesigned action buttons with colored backgrounds and better visual hierarchy
- Enhanced hover effects with subtle elevation

**Backend Improvements:**
- **Enhanced Error Handling**:
  - Added retry logic with exponential backoff for transient failures
  - Implemented circuit breaker pattern to prevent cascading failures
  - Categorized errors (Network, Permission, Timeout, etc.) for better UX
  - Added timeout protection for all operations (30s default)
  - Better error messages with sensitive path sanitization
- **Performance Optimizations**:
  - Improved caching with size limits and better invalidation
  - Map-based cache for multiple filter combinations
  - Circuit breaker for failing service operations
  - Configurable operation timeouts and rate limits
- **Code Organization**:
  - Centralized configuration in `src/main/config.ts`
  - Extracted error handling utilities to `src/utils/errorHandler.ts`
  - Better JSDoc documentation throughout
  - Enhanced type safety with error categories
  - Audit logging improvements

**Major UI Redesign:**
- **Complete visual overhaul** with ultra-minimalist, Scandinavian-inspired design
- **Monochrome palette**: Pure blacks, whites, and subtle grays with minimal accent color
- **Abundant whitespace**: Generous spacing for breathing room and clarity
- **Flat design**: Removed all gradients, shadows, and complex effects
- **Simple typography**: Consistent sizing, increased line-height (1.8), minimal font weights
- **Subtle borders**: Clean 1px borders only, no rounded corners or heavy effects
- **Minimal animations**: Removed ripple effects, kept only essential transitions
- **Text-based status**: Flat status badges with color-coded text
- **Simplified header**: Removed subtitle, flattened buttons, minimalist status indicator
- **Clean table**: List-style rows with border separators, no background colors
- **Streamlined actions**: Flat buttons with simple hover opacity changes
- **Refined details panel**: More whitespace, cleaner typography
- **Professional aesthetic**: Focuses user attention on content, not decoration

**Design Philosophy:**
This release represents a fundamental shift toward minimalism - removing visual noise and embracing simplicity. Every element has been reconsidered with the question: "Is this essential?" The result is a clean, professional interface that prioritizes content and usability over decoration.

### Version 1.6.0

**Features:**
- **Automatic Windows Elevation**: Application now automatically requests administrator privileges on Windows via UAC prompt
- **Virtual Scrolling**: Dramatically improved performance for large service lists (500+ services)
  - Only renders visible rows plus buffer
  - 70-80% reduction in DOM nodes for large datasets
  - Smooth scrolling performance maintained even with thousands of services
- **Enhanced Animations**: Added smooth microinteractions and visual feedback throughout the UI
  - Ripple effects on button clicks
  - Smooth fade-in animations for table rows
  - Improved transition effects
- **Better Accessibility**: Enhanced focus indicators and keyboard navigation support
- **Performance Monitoring**: Real-time load time display in footer
- **Skeleton Loading States**: CSS framework for skeleton loading screens (future use)

**Performance Improvements:**
- Virtual scrolling automatically enabled for lists with 500+ items
- Optimized re-rendering with requestAnimationFrame
- Reduced memory footprint with intelligent row recycling
- Faster table updates with improved DOM manipulation

**UI/UX Enhancements:**
- Added ripple effect animations on action buttons
- Improved scrollbar styling with smooth hover transitions
- Better focus states for keyboard navigation
- Enhanced visual feedback for user interactions
- Smooth scroll behavior in table container

**Developer Experience:**
- Better TypeScript type safety in renderer
- Improved code organization for virtual scrolling
- JSDoc comments for new functions
- Cleaner separation of rendering modes (pagination vs virtual scrolling)

### Version 1.5.2

**Features:**
- Added automatic elevated privilege detection on startup
- Display warning dialog if not running with administrator/root privileges
- Added `--elevate` flag for easy elevation on Unix-like systems
- Created Windows manifest file for requesting administrator privileges
- Improved documentation for running with elevated privileges

**Changes:**
- Application now checks privilege level on startup and warns users
- Users can choose to continue without elevation or exit to restart with proper privileges
- Added platform-specific privilege guidance in warning dialogs

### Version 1.5.1

**Bug Fixes:**
- Fixed PowerShell encoding issues on Windows (UTF-8 handling for non-English error messages)
- Improved error message handling for Windows services with proper encoding
- Added `$ErrorActionPreference = 'Stop'` to catch PowerShell errors correctly

### Version 1.5.0

**Security Enhancements:**
- Added comprehensive input validation for service IDs, paths, and search queries
- Implemented rate limiting (200ms cooldown) for service control operations
- Added Content Security Policy (CSP) headers to prevent XSS attacks
- Enhanced PowerShell command escaping for Windows services
- Added path sandboxing with whitelisted directories for file operations
- Implemented audit logging for privileged operations
- Sanitized error messages to remove sensitive information

**Performance Improvements:**
- Implemented 500ms caching for service list to reduce redundant calls
- Optimized table rendering with DocumentFragment (30-40% faster)
- Reduced search debounce time from 180ms to 150ms for better responsiveness
- Added intelligent polling that pauses when window is not focused

**Bug Fixes:**
- Fixed polling timer cleanup and memory leaks in renderer
- Fixed race conditions in concurrent service refresh operations
- Improved error handling with user-friendly messages across all platforms
- Better detection of systemd availability on Linux
- Enhanced permission error handling on macOS

**Dependency Updates:**
- Updated Electron to v35.7.5 (secure version without ASAR vulnerabilities)
- Updated TypeScript to v5.7.2
- Updated @types/node to v22.10.2
- Updated rimraf to v6.0.1

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT


