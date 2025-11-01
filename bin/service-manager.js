#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the electron executable
const electron = require('electron');

// Get the path to the main entry point
const appPath = path.join(__dirname, '..', 'dist', 'main', 'main.js');

// Launch Electron with the app
const child = spawn(electron, [appPath], {
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code);
});

