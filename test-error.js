// Quick test to verify error logger catches real errors
const { errorLogger } = require('./dist-electron/main.js');

// This will be caught by error logger
throw new Error('TEST ERROR - Error logger is working!');
