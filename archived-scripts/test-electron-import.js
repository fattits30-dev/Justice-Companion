// Test electron import when running inside electron
console.log('Testing electron import...');

// Check if we're running in electron
if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
  console.log('Running in Electron version:', process.versions.electron);
  
  try {
    // Try different ways to get electron
    console.log('Method 1: require("electron")');
    const e1 = require('electron');
    console.log('  Result type:', typeof e1);
    console.log('  Has app?:', e1 && typeof e1.app);
    
    if (e1 && e1.app) {
      console.log('SUCCESS! Electron loaded correctly.');
      e1.app.whenReady().then(() => {
        console.log('App is ready!');
        e1.app.quit();
      });
    } else {
      console.log('FAILED: electron.app is not available');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
} else {
  console.log('Not running in Electron');
  process.exit(1);
}
