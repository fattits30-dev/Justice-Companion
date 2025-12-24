import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.justice.companion',
  appName: 'Justice Companion',
  webDir: 'dist',
  server: {
    // For local-first mode, we don't need a server URL
    // The app runs entirely from bundled assets
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      // Release build settings
      releaseType: 'APK',
    },
    // Allow local file access for IndexedDB
    allowMixedContent: true,
  },
  plugins: {
    // Keyboard plugin for better input handling
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
