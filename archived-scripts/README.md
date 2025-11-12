# Archived Scripts

These scripts were used during development and debugging but are no longer needed.
They have been archived for reference purposes.

## Launcher Scripts
- **electron-launcher.js** - Workaround for Electron 39.x module resolution issue
- **electron-launcher-v2.js** - Workaround for Electron 25
- **electron-launcher-npm.js** - Simple spawn approach, replaced by npm scripts
- **electron-main.js** - Simple loader, not needed as package.json points directly to dist

## Test Scripts
Various one-off test scripts used for debugging specific issues.

## Why Archived?
- The Electron module resolution issues have been resolved in current version (33+)
- Package.json now uses standard electron commands
- Test scripts were for specific debugging sessions

## Current Launch Method
Use the npm scripts defined in package.json:
- `npm run electron:dev` - Development mode with hot reload
- `npm run build:electron` - Build for production

Archived on: 2025-11-12T17:34:52.481Z
