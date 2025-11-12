// Simple launcher script for Electron
// This runs in Node.js context, not Electron context

const { spawn } = require('child_process');
const path = require('path');

// Get electron executable path
const electron = require('electron');

// Launch electron with our main script
const child = spawn(electron, [path.join(__dirname, 'dist/electron/electron/main.js')], {
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code);
});
