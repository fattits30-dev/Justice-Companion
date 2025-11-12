// Fix electron module resolution for compiled main.js
// When running with electron.exe, override require to use built-in electron

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'electron') {
    // Use the built-in electron module, not the npm package
    // In electron runtime, 'electron' is a built-in module
    return originalRequire.apply(this, ['electron']);
  }
  return originalRequire.apply(this, arguments);
};

// Now require the compiled main.js
require('./dist/electron/electron/main.js');
