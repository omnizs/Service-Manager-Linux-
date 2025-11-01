# Service Manager

Service Manager is a cross-platform Electron application that offers a single, secure interface for discovering and managing system services on Linux (systemd), Windows (Service Control Manager), and macOS (launchd).

## Features

- Real-time service overview with name, status, startup type, executable, and description.
- Search by name or description and filter by common status values.
- Start, stop, and restart services with automatic privilege elevation via `pkexec` on Linux when required.
- Enable and disable services (control startup behavior on boot).
- Responsive interface with live polling and detail panel for per-service metadata.
- Native file browser integration for opening the corresponding unit/service definitions.

## Getting Started

```bash
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

- `npm start` – Build the project (if needed) and launch Electron in development mode.
- `npm run build` – Compile TypeScript sources and copy static assets to `dist/`.
- Renderer auto-refreshes service data every 5 seconds. Use the `Refresh` button for manual updates.

## Security

The renderer operates with context isolation enabled; all privileged calls flow through controlled IPC handlers in the main process. Elevated operations invoke the native tooling (`systemctl`, `powershell`, `launchctl`) directly without storing credentials.

## License

MIT


