console.log('Starting electron test...');
const { app } = require('electron');

if (!app) {
  console.error('app is undefined!');
  process.exit(1);
}

console.log('app loaded successfully');

app.whenReady().then(() => {
  console.log('App is ready!');
  app.quit();
});
