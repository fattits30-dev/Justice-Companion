// Test if electron can be required properly
try {
  const electron = require('electron');
  console.log('Electron loaded successfully');
  console.log('app:', typeof electron.app);
  console.log('BrowserWindow:', typeof electron.BrowserWindow);
  console.log('ipcMain:', typeof electron.ipcMain);

  if (electron.app) {
    console.log('app.whenReady:', typeof electron.app.whenReady);
    electron.app.quit();
  } else {
    console.log('ERROR: electron.app is undefined!');
  }
} catch (error) {
  console.error('Failed to load electron:', error);
}
