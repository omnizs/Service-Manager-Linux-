# Service Manager v2.8.5-alpha.1 Release Notes

## 🎯 Alpha Release - Service Notes & Enhanced Shortcuts

Version 2.8.5-alpha.1 is a **pre-release** introducing the new Service Notes feature and enhanced keyboard shortcuts. This alpha release is intended for testing and feedback before the stable 2.9 release.

**⚠️ Alpha Release Notice**: This is a pre-release version. While stable, it's recommended for testing environments. Your feedback is valuable for the stable release.

## 🎯 Highlights

- **Service Notes System**: Document and organize knowledge about services
- **Enhanced Keyboard Shortcuts**: New shortcuts for faster navigation
- **Improved Accessibility**: Better screen reader support and ARIA labels
- **Visual Indicators**: See which services have notes at a glance

## 🆕 New Features

### Service Notes

Keep track of important information about your services with the new integrated notes system:

- **Rich Text Notes**: Document procedures, configurations, or any tribal knowledge
- **Tag System**: Organize notes with tags like `critical`, `monitoring`, `database`
- **Visual Indicators**: Small 📄 icon appears next to services that have notes
- **Persistent Storage**: Notes are stored locally and persist across restarts
- **Integrated UI**: Notes panel built right into the service details view
- **Timestamps**: Automatic tracking of when notes were created and updated
- **Quick Access**: Use `Ctrl/Cmd + N` to instantly edit notes for the selected service

**How to Use:**
1. Select a service from the list
2. Look for the "Service Notes" section in the details panel
3. Click "Add Note" or press `Ctrl/Cmd + N` to start editing
4. Add your notes and tags (press Enter after typing each tag)
5. Click "Save" to store your notes

### Enhanced Keyboard Shortcuts

New shortcuts for power users:

**General Navigation:**
- `Ctrl/Cmd + E` - Quick export services to JSON format
- `Ctrl/Cmd + ,` - Open settings panel
- `Ctrl/Cmd + B` - Open backup manager

**Service-Specific Actions:**
- `Ctrl/Cmd + N` - Add or edit note for selected service
- `Ctrl/Cmd + Shift + F` - Toggle favorite for selected service
- `Ctrl/Cmd + L` - View logs for selected service

**Improved Keyboard Handling:**
- Normalized key detection for consistency across platforms
- Better support for shifted keys (e.g., Shift+F vs F)
- More responsive keyboard event handling

### Accessibility Improvements

- **ARIA Labels**: Enhanced labels for screen readers throughout the notes interface
- **Focus Management**: Automatic focus when editing notes via keyboard shortcut
- **Keyboard Navigation**: Full keyboard support for tag management
- **Visual Feedback**: Clear indicators for interactive elements

## 🔧 Technical Improvements

### Component Architecture
- New `ServiceNotes` component with full CRUD operations
- Enhanced `ServiceDetails` to display notes inline
- Updated `ServiceTable` to show note indicators
- Improved `useUserPreferences` hook for note management

### State Management
- Added `noteEditingTrigger` for programmatic note editing
- Better TypeScript types for service notes and tags
- Optimized note storage and retrieval

### Performance
- Notes are stored efficiently in localStorage
- Minimal re-renders when managing notes
- Fast lookup for note indicators in large service lists

## 📋 Complete Keyboard Shortcuts Reference

### General
- `Ctrl+R` / `Cmd+R` - Refresh service list
- `Ctrl+F` / `Cmd+F` - Focus search input
- `Ctrl+,` / `Cmd+,` - Open settings
- `Ctrl+B` / `Cmd+B` - Open backup manager
- `Ctrl+E` / `Cmd+E` - Quick export services to JSON
- `Escape` - Clear service selection / Close modals

### Service Actions (requires service selection)
- `Ctrl+L` / `Cmd+L` - View logs for selected service
- `Ctrl+N` / `Cmd+N` - Add/edit note for selected service
- `Ctrl+Shift+F` / `Cmd+Shift+F` - Toggle favorite for selected service

## 🔄 Upgrade Notes

This is an alpha pre-release. Features may change before the stable 2.9 release based on feedback.

### Automatic Updates
- Packaged apps with auto-update enabled will **NOT** automatically install this alpha
- Alpha releases are excluded from automatic updates by design

### Manual Installation
```bash
npm install -g @omnizs/service-manager@2.8.5-alpha.1
```

## 📝 No Breaking Changes

This release is fully backward compatible with v2.8.0. All existing features work as before.

## 🐛 Known Issues

None currently. Please report any issues you encounter!

## 💬 Feedback Welcome

As an alpha release, we're eager for your feedback:
- Does the notes feature meet your needs?
- Are there any usability concerns?
- Any bugs or unexpected behavior?
- Suggestions for improvements?

Please open an issue on GitHub with your feedback.

## 🔮 Coming in v2.9 (Stable)

The stable 2.9 release will include:
- Full-text search across service notes
- Note export/import functionality  
- Advanced filtering with multiple criteria
- Service dependency visualization
- Performance metrics dashboard

---

**Full Changelog**: https://github.com/omnizs/Service-Manager/blob/main/CHANGELOG.md

**Documentation**: https://github.com/omnizs/Service-Manager#readme

**Report Issues**: https://github.com/omnizs/Service-Manager/issues
