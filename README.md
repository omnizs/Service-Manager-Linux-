# Service Manager

Service Manager is a cross-platform Electron application that offers a single, secure interface for discovering and managing system services on Linux (systemd), Windows (Service Control Manager), and macOS (launchd).

## Features

- 🔍 **Real-time service overview** with name, status, startup type, executable, and description
- 🔎 **Search and filter** by name, description, or status
- ⚡ **Service control** - start, stop, restart services with automatic privilege elevation
- 🔧 **Startup management** - enable/disable services to control boot behavior
- 📊 **Pagination support** - efficiently handle systems with hundreds of services
- 🎨 **Responsive UI** - adaptive layout with text truncation and tooltips for long paths
- 🔄 **Intelligent polling** - automatic updates every 5 seconds (pauses when window not focused)
- 📁 **File browser integration** - open service/unit definition files directly
- ⌨️ **Keyboard shortcuts** - Ctrl+R to refresh, Ctrl+F to search, Escape to clear selection
- 🔒 **Enhanced security** - Input validation, rate limiting, and command injection prevention

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

`npm run build` compiles the TypeScript sources into `dist/`, copies static renderer assets, and prepares the Electron entry point. The application will launch in an Electron window. Actions that require elevated privileges may prompt for authentication through the operating system (e.g. `pkexec` on Linux; administrative PowerShell on Windows; `launchctl` permissions on macOS).

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

Service Manager v1.5.0 includes comprehensive security enhancements:

- **Context Isolation**: The renderer operates with context isolation enabled; all privileged calls flow through controlled IPC handlers in the main process
- **Input Validation**: All service IDs, file paths, and user inputs are validated to prevent command injection attacks
- **Rate Limiting**: Service control operations are rate-limited (200ms cooldown) to prevent abuse
- **Content Security Policy**: Strict CSP headers prevent XSS and other injection attacks
- **Path Sandboxing**: File operations are restricted to whitelisted system directories
- **Audit Logging**: All privileged operations are logged with timestamps for accountability
- **Error Sanitization**: Error messages are sanitized to remove sensitive file paths and system information
- **Credential Security**: Elevated operations invoke native tooling (`systemctl`, `powershell`, `launchctl`) directly without storing credentials

## Changelog

### Version 1.5.0 (Latest)

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


