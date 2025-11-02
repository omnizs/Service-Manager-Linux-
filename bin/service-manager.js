#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the electron executable
const electron = require('electron');

// Get the path to the main entry point
const appPath = path.join(__dirname, '..', 'dist', 'main', 'main.js');

// Check if we should attempt to elevate on Unix-like systems
const shouldElevate = process.platform !== 'win32' && process.getuid && process.getuid() !== 0;
const hasElevateFlag = process.argv.includes('--elevate');

if (shouldElevate && hasElevateFlag) {
  // Try to run with sudo if --elevate flag is provided
  console.log('Attempting to run with elevated privileges...');
  const args = [process.execPath, ...process.argv.slice(1).filter(arg => arg !== '--elevate')];
  const child = spawn('sudo', args, {
    stdio: 'inherit',
    windowsHide: false,
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
} else {
  // Launch Electron with the app
  const child = spawn(electron, [appPath], {
    stdio: 'inherit',
    windowsHide: false
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

