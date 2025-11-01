# Service Manager

<p align="center">
  <img src="assets/icons/icon-256.png" alt="Service Manager Icon" width="128" height="128">
</p>

Service Manager is a cross-platform Electron application that offers a single, secure interface for discovering and managing system services on Linux (systemd), Windows (Service Control Manager), and macOS (launchd).

## Features

- 🔍 **Real-time service overview** with name, status, startup type, executable, and description
- 🔎 **Search and filter** by name, description, or status
- ⚡ **Service control** - start, stop, restart services with automatic privilege elevation
- 🔧 **Startup management** - enable/disable services to control boot behavior
- 📊 **Pagination support** - efficiently handle systems with hundreds of services
- 🎨 **Responsive UI** - adaptive layout with text truncation and tooltips for long paths
- 🔄 **Live polling** - automatic updates every 5 seconds
- 📁 **File browser integration** - open service/unit definition files directly
- ⌨️ **Keyboard shortcuts** - Ctrl+R to refresh, Ctrl+F to search, Escape to clear selection

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

The renderer operates with context isolation enabled; all privileged calls flow through controlled IPC handlers in the main process. Elevated operations invoke the native tooling (`systemctl`, `powershell`, `launchctl`) directly without storing credentials.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT


