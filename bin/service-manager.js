#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const os = require('os');

// Get the electron executable
const electron = require('electron');

// Get the path to the main entry point
const appPath = path.join(__dirname, '..', 'dist', 'main', 'main.js');

/**
 * Check if running with administrator privileges on Windows
 */
function isWindowsAdmin(callback) {
  if (process.platform !== 'win32') {
    callback(false);
    return;
  }

  // Run 'net session' command which requires admin rights
  exec('net session 2>&1', (error, stdout, stderr) => {
    // If no error and output doesn't contain access denied, we have admin rights
    const isAdmin = !error && 
                    !stdout.includes('Access is denied') && 
                    !stdout.includes('system error');
    callback(isAdmin);
  });
}

/**
 * Elevate the process on Windows using PowerShell
 */
function elevateWindows() {
  console.log('Service Manager requires administrator privileges.');
  console.log('Requesting elevation...\n');

  // Get the path to the current script and node executable
  const scriptPath = path.resolve(__filename);
  const nodePath = process.execPath;

  // Build PowerShell command to elevate
  // Use Start-Process with -Verb RunAs to trigger UAC
  const psCommand = [
    `Start-Process`,
    `-FilePath "${nodePath}"`,
    `-ArgumentList '"${scriptPath}"'`,
    `-Verb RunAs`,
    `-WindowStyle Hidden`
  ].join(' ');

  // Execute PowerShell command
  const child = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', psCommand
  ], {
    stdio: 'inherit',
    windowsHide: true,
    detached: true
  });

  child.on('error', (err) => {
    console.error('Failed to elevate process:', err.message);
    console.error('Please run this application as Administrator manually.');
    process.exit(1);
  });

  child.on('close', (code) => {
    // Original process exits after launching elevated version
    process.exit(code || 0);
  });

  // Unref so parent can exit
  child.unref();
}

/**
 * Launch the Electron application
 */
function launchApp() {
  const child = spawn(electron, [appPath], {
    stdio: 'inherit',
    windowsHide: false
  });

  child.on('error', (err) => {
    console.error('Failed to launch Service Manager:', err.message);
    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

// Main execution logic
const hasElevateFlag = process.argv.includes('--elevate');
const skipElevation = process.argv.includes('--no-elevation');

if (process.platform === 'win32' && !skipElevation) {
  // Windows: Check for admin and auto-elevate if needed
  isWindowsAdmin((isAdmin) => {
    if (!isAdmin) {
      elevateWindows();
    } else {
      launchApp();
    }
  });
} else if (process.platform !== 'win32' && hasElevateFlag) {
  // Unix-like: Elevate with sudo if --elevate flag provided
  const shouldElevate = typeof process.getuid === 'function' && process.getuid() !== 0;
  
  if (shouldElevate) {
    console.log('Attempting to run with elevated privileges...');
    const args = [process.execPath, ...process.argv.slice(1).filter(arg => arg !== '--elevate')];
    const child = spawn('sudo', args, {
      stdio: 'inherit',
    });
    
    child.on('close', (code) => {
      process.exit(code);
    });
  } else {
    launchApp();
  }
} else {
  // Launch without elevation
  launchApp();
}

