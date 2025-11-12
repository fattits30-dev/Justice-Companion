console.log('Debug: Starting...');
console.log('Debug: process.versions:', process.versions);

try {
  console.log('Debug: About to require electron...');
  const electron = require('electron');
  console.log('Debug: electron loaded, type:', typeof electron);
  console.log('Debug: electron keys:', Object.keys(electron || {}));
  
  if (electron && electron.app) {
    console.log('Debug: app found!');
    electron.app.quit();
  } else {
    console.log('Debug: app NOT found');
    console.log('Debug: electron value:', electron);
  }
} catch (error) {
  console.error('Debug: Error loading electron:', error);
}
