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
**Recommended:** Right-click the application and select "Run as administrator"
- The application will show a warning on startup if not running with administrator privileges
- Some service operations will fail without elevation

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

### Version 1.5.2 (Latest)

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


