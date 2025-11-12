// Main entry point for Electron
// When running under Electron, the electron module is already available

console.log("Starting Justice Companion...");

// Load the compiled main file
require('./dist/electron/electron/main.js');