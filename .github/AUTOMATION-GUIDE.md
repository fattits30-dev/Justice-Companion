# CI/CD Automation Implementation Guide

**Project**: Justice Companion
**Target**: Level 4 CI/CD Maturity
**Timeline**: 4-6 weeks

---

## Quick Start: High-Priority Improvements

### 1. Pre-Commit Hooks Setup (1-2 hours)

**Benefits**:
- Reduce CI failures by ~30%
- Auto-format code before commit
- Catch errors locally before push

**Installation**:

```bash
# Install dependencies
pnpm add -D husky lint-staged

# Initialize Husky
npx husky-init
chmod +x .husky/pre-commit
```

**Configuration**:

**File**: `.husky/pre-commit`
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run lint-staged
pnpm exec lint-staged

# Quick type check
echo "📝 Type checking..."
pnpm type-check

echo "✅ Pre-commit checks passed!"
```

**File**: `package.json` (add to existing)
```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

**Testing**:
```bash
# Test pre-commit hook
git add .
git commit -m "test: pre-commit hook"

# Expected output:
# 🔍 Running pre-commit checks...
# ✔ Preparing lint-staged...
# ✔ Running tasks for staged files...
# ✔ Applying modifications from tasks...
# ✔ Cleaning up temporary files...
# 📝 Type checking...
# ✅ Pre-commit checks passed!
```

---

### 2. Performance Regression Detection (4-6 hours)

**Benefits**:
- Prevent performance degradation
- Historical performance tracking
- Automated alerts on slowdowns

**Step 1**: Create Benchmark Comparison Script

**File**: `scripts/compare-performance.js`
```javascript
#!/usr/bin/env node
const fs = require('fs');

const REGRESSION_THRESHOLD = 0.15; // 15% tolerance
const IMPROVEMENT_THRESHOLD = -0.05; // 5% improvement

function parseMetrics(content) {
  const metrics = {};

  // Database metrics
  const insertMatch = content.match(/Inserted 1000 records: ([\d.]+)ms/);
  const queryMatch = content.match(/Queried \d+ records: ([\d.]+)ms/);
  const pageMatch = content.match(/Paginated query.*?: ([\d.]+)ms/);

  // Encryption metrics
  const encryptMatch = content.match(/(\d+) encryptions: ([\d.]+)ms/);

  // Bundle size
  const bundleMatch = content.match(/\*\*Total\*\* \| \*\*(.+?)\*\*/);

  if (insertMatch) {
    metrics.insert = parseFloat(insertMatch[1]);
  }
  if (queryMatch) {
    metrics.query = parseFloat(queryMatch[1]);
  }
  if (pageMatch) {
    metrics.pagination = parseFloat(pageMatch[1]);
  }
  if (encryptMatch) {
    metrics.encryption = parseFloat(encryptMatch[2]);
  }
  if (bundleMatch) {
    metrics.bundleSize = bundleMatch[1];
  }

  return metrics;
}

function formatSize(sizeStr) {
  const num = parseFloat(sizeStr);
  const unit = sizeStr.replace(/[0-9.]/g, '').trim();
  return unit === 'MB' ? num : num / 1024; // Convert to MB
}

function compareMetrics(baseline, current) {
  let hasRegression = false;
  let hasImprovement = false;

  console.log('\n📊 Performance Comparison\n');
  console.log('─'.repeat(70));

  for (const [metric, baseValue] of Object.entries(baseline)) {
    const currentValue = current[metric];
    if (!currentValue) {
      console.log(`⚠️  ${metric}: No current value found`);
      continue;
    }

    let change, symbol, status;

    if (metric === 'bundleSize') {
      const baseSize = formatSize(baseValue);
      const currSize = formatSize(currentValue);
      change = (currSize - baseSize) / baseSize;
      symbol = change > 0 ? '📈' : '📉';
      status = change > REGRESSION_THRESHOLD ? '❌ REGRESSION' :
               change < IMPROVEMENT_THRESHOLD ? '✅ IMPROVEMENT' : '✅ STABLE';

      console.log(`\n${symbol} ${metric}:`);
      console.log(`   Baseline: ${baseValue}`);
      console.log(`   Current:  ${currentValue}`);
      console.log(`   Change:   ${(change * 100).toFixed(2)}%`);
      console.log(`   ${status}`);
    } else {
      change = (currentValue - baseValue) / baseValue;
      symbol = change > 0 ? '📈' : '📉';
      status = change > REGRESSION_THRESHOLD ? '❌ REGRESSION' :
               change < IMPROVEMENT_THRESHOLD ? '✅ IMPROVEMENT' : '✅ STABLE';

      console.log(`\n${symbol} ${metric}:`);
      console.log(`   Baseline: ${baseValue.toFixed(2)}ms`);
      console.log(`   Current:  ${currentValue.toFixed(2)}ms`);
      console.log(`   Change:   ${(change * 100).toFixed(2)}%`);
      console.log(`   ${status}`);
    }

    if (change > REGRESSION_THRESHOLD) {
      hasRegression = true;
    } else if (change < IMPROVEMENT_THRESHOLD) {
      hasImprovement = true;
    }
  }

  console.log('\n' + '─'.repeat(70));

  if (hasRegression) {
    console.error('\n❌ Performance regression detected. Please investigate.');
    console.error(`   Threshold: ${REGRESSION_THRESHOLD * 100}%`);
    process.exit(1);
  }

  if (hasImprovement) {
    console.log('\n🎉 Performance improvements detected!');
  } else {
    console.log('\n✅ No performance regressions detected.');
  }

  process.exit(0);
}

// Main execution
try {
  const baselineContent = fs.readFileSync('baseline/benchmark-report.md', 'utf8');
  const currentContent = fs.readFileSync('benchmark-report.md', 'utf8');

  const baselineMetrics = parseMetrics(baselineContent);
  const currentMetrics = parseMetrics(currentContent);

  if (Object.keys(baselineMetrics).length === 0) {
    console.log('⚠️  No baseline metrics found. Creating initial baseline...');
    fs.mkdirSync('baseline', { recursive: true });
    fs.copyFileSync('benchmark-report.md', 'baseline/benchmark-report.md');
    console.log('✅ Baseline created. Future runs will compare against this.');
    process.exit(0);
  }

  compareMetrics(baselineMetrics, currentMetrics);
} catch (error) {
  if (error.code === 'ENOENT' && error.path.includes('baseline')) {
    console.log('⚠️  No baseline found. Creating initial baseline...');
    fs.mkdirSync('baseline', { recursive: true });
    fs.copyFileSync('benchmark-report.md', 'baseline/benchmark-report.md');
    console.log('✅ Baseline created. Future runs will compare against this.');
    process.exit(0);
  }
  console.error('❌ Error comparing performance:', error.message);
  process.exit(1);
}
```

**Step 2**: Update Performance Workflow

**File**: `.github/workflows/performance.yml` (add after benchmarks)
```yaml
      # Add after benchmark generation
      - name: Download baseline
        uses: dawidd6/action-download-artifact@v2
        continue-on-error: true
        with:
          workflow: performance.yml
          name: performance-baseline
          path: baseline/
          branch: main

      - name: Compare with baseline
        run: node scripts/compare-performance.js

      - name: Upload new baseline
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        uses: actions/upload-artifact@v4
        with:
          name: performance-baseline
          path: benchmark-report.md
          retention-days: 90

      - name: Comment PR with comparison
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('benchmark-report.md', 'utf8');

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## 🚀 Performance Benchmark Results\n\n${report}`
            });
```

**Testing**:
```bash
# Run locally
pnpm install
node scripts/compare-performance.js
```

---

### 3. Auto-Update Server Setup (8-16 hours)

**Option A: electron-updater + GitHub Releases (Recommended)**

**Step 1**: Install Dependencies

```bash
pnpm add electron-updater
pnpm add -D @electron/notarize
```

**Step 2**: Configure electron-builder

**File**: `package.json` (update build config)
```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "your-org",
        "repo": "justice-companion",
        "releaseType": "release"
      }
    ],
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

**Step 3**: Create Entitlements File (macOS)

**File**: `build/entitlements.mac.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

**Step 4**: Create Notarization Script

**File**: `scripts/notarize.js`
```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return; // Only notarize macOS builds
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.warn('⚠️ Notarization skipped: Apple credentials not configured');
    console.warn('   Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`🔒 Notarizing ${appName}...`);

  try {
    await notarize({
      appBundleId: 'com.justicecompanion.app',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    });
    console.log('✅ Notarization complete');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
```

**Step 5**: Update Main Process

**File**: `electron/main.ts` (add auto-updater logic)
```typescript
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configure auto-updater
autoUpdater.autoDownload = false; // Ask user before downloading
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);

  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available.`,
    detail: 'Would you like to download it now? The update will be installed when you restart the application.',
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
      mainWindow?.webContents.send('update-download-started');
    }
  });
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info.version);
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`Download progress: ${progressObj.percent.toFixed(2)}%`);
  mainWindow?.webContents.send('update-download-progress', {
    percent: progressObj.percent,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);

  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Update has been downloaded.',
    detail: 'The application will restart to install the update.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    }
  });
});

autoUpdater.on('error', (error) => {
  log.error('Update error:', error);
  dialog.showErrorBox('Update Error', `Failed to check for updates: ${error.message}`);
});

// IPC handlers for manual update checks
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    log.error('Manual update check failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Check for updates on app start (after 5-second delay)
app.whenReady().then(() => {
  // Create main window first
  createMainWindow();

  // Check for updates after delay
  setTimeout(() => {
    if (!process.env.VITE_DEV_SERVER_URL) {
      // Only check in production builds
      autoUpdater.checkForUpdates();
    }
  }, 5000);
});
```

**Step 6**: Add Renderer IPC

**File**: `electron/preload.ts` (add to existing window object)
```typescript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // ... existing methods ...

  // Auto-updater methods
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Update event listeners
  onUpdateDownloadStarted: (callback: () => void) => {
    ipcRenderer.on('update-download-started', callback);
  },
  onUpdateDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress));
  }
});
```

**Step 7**: Update Release Workflow

**File**: `.github/workflows/release.yml` (update build-release job)
```yaml
      - name: Build Electron app for ${{ matrix.platform }}
        run: pnpm build:${{ matrix.platform }} --publish always
        env:
          CI: true
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ matrix.platform == 'win' && 'certificate.pfx' || '' }}
          CSC_KEY_PASSWORD: ${{ matrix.platform == 'win' && secrets.WINDOWS_CERTIFICATE_PASSWORD || '' }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

**Step 8**: Test Auto-Update (Staging)

```bash
# 1. Create test release
git tag v1.0.1-beta
git push origin v1.0.1-beta

# 2. Wait for CI to build and publish

# 3. Install v1.0.0 locally
# 4. Run app, check for updates in settings
# 5. Verify update download and installation
```

---

### 4. Code Signing Setup

#### Windows Code Signing

**Step 1**: Obtain Certificate

1. Purchase code signing certificate from:
   - DigiCert (recommended)
   - Sectigo
   - GlobalSign

2. Export certificate as `.pfx` file
3. Convert to Base64:

```powershell
# Windows PowerShell
$pfxBytes = [System.IO.File]::ReadAllBytes("certificate.pfx")
$base64 = [System.Convert]::ToBase64String($pfxBytes)
$base64 | Out-File -FilePath "certificate-base64.txt"
```

**Step 2**: Add GitHub Secrets

Navigate to: `Settings → Secrets and variables → Actions → New repository secret`

Add:
- `WINDOWS_CERTIFICATE`: Content of `certificate-base64.txt`
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

**Step 3**: Verify Configuration

**File**: `.github/workflows/release.yml` (already configured)
```yaml
      - name: Setup Code Signing (Windows)
        if: matrix.platform == 'win'
        env:
          WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
          WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
        run: |
          if ($env:WINDOWS_CERTIFICATE) {
            Write-Host "✅ Code signing configured"
          } else {
            Write-Host "⚠️ No code signing certificate configured"
          }
```

#### macOS Code Signing

**Step 1**: Enroll in Apple Developer Program

1. Visit: https://developer.apple.com/programs/
2. Enroll ($99/year)
3. Wait for approval (1-2 days)

**Step 2**: Create Certificate

1. Open Keychain Access
2. Certificate Assistant → Request a Certificate from a Certificate Authority
3. Save request to disk
4. Upload to Apple Developer portal
5. Download "Developer ID Application" certificate
6. Import into Keychain

**Step 3**: Export Certificate

```bash
# Export as P12
# 1. Open Keychain Access
# 2. Find "Developer ID Application: Your Name"
# 3. Right-click → Export
# 4. Save as certificate.p12
# 5. Set password

# Convert to Base64
base64 -i certificate.p12 -o certificate-base64.txt
```

**Step 4**: Add GitHub Secrets

Add:
- `MACOS_CERTIFICATE`: Content of `certificate-base64.txt`
- `MACOS_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_ID`: Your Apple ID email
- `APPLE_ID_PASSWORD`: App-specific password (generate at appleid.apple.com)
- `APPLE_TEAM_ID`: Team ID (found in Apple Developer portal)

**Step 5**: Verify Configuration

**File**: `.github/workflows/release.yml` (already configured)
```yaml
      - name: Import Code Signing Certificate (macOS)
        if: matrix.platform == 'mac'
        env:
          CERTIFICATE_BASE64: ${{ secrets.MACOS_CERTIFICATE }}
          CERTIFICATE_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}
        run: |
          if [ -n "$CERTIFICATE_BASE64" ]; then
            echo "✅ Code signing configured"
          else
            echo "⚠️ No code signing certificate configured"
          fi
```

---

## Advanced Automation

### 5. Deployment Monitoring (Sentry Integration)

**Step 1**: Install Sentry SDK

```bash
pnpm add @sentry/electron
```

**Step 2**: Configure Sentry

**File**: `electron/main.ts` (add at top)
```typescript
import * as Sentry from '@sentry/electron/main';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: app.getVersion(),
    beforeSend(event) {
      // Don't send events in development
      if (process.env.VITE_DEV_SERVER_URL) {
        return null;
      }
      return event;
    }
  });
}
```

**File**: `src/main.tsx` (renderer process)
```typescript
import * as Sentry from '@sentry/electron/renderer';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN
  });
}
```

**Step 3**: Add Sentry DSN to Secrets

```bash
# Add to GitHub Secrets
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**Step 4**: Update Release Workflow

**File**: `.github/workflows/release.yml` (add after create-release)
```yaml
      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.ref_name }}
```

---

### 6. E2E Test Expansion

**File**: `tests/e2e/specs/settings.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    // Launch Electron app and login
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Navigate to settings
    await page.click('[data-testid="settings-link"]');
  });

  test('User can update profile settings', async ({ page }) => {
    await page.click('[data-testid="profile-settings-tab"]');

    const nameInput = page.locator('[data-testid="profile-name"]');
    await nameInput.fill('John Doe');

    const emailInput = page.locator('[data-testid="profile-email"]');
    await emailInput.fill('john@example.com');

    await page.click('[data-testid="save-profile"]');

    // Verify success toast
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Profile updated');

    // Reload and verify persistence
    await page.reload();
    await expect(nameInput).toHaveValue('John Doe');
    await expect(emailInput).toHaveValue('john@example.com');
  });

  test('User can configure AI settings', async ({ page }) => {
    await page.click('[data-testid="ai-settings-tab"]');

    // Change AI provider
    await page.selectOption('[data-testid="ai-provider"]', 'openai');

    // Update API key
    await page.fill('[data-testid="openai-api-key"]', 'sk-test-key');

    // Update temperature
    await page.fill('[data-testid="temperature"]', '0.7');

    await page.click('[data-testid="save-ai-settings"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('User can manage consent settings', async ({ page }) => {
    await page.click('[data-testid="consent-settings-tab"]');

    // Toggle chat history consent
    const chatHistoryCheckbox = page.locator('[data-testid="chat-history-consent"]');
    const initialState = await chatHistoryCheckbox.isChecked();

    await chatHistoryCheckbox.click();

    await page.click('[data-testid="save-consent"]');

    // Verify state changed
    await page.reload();
    await expect(chatHistoryCheckbox).toHaveAttribute('checked', initialState ? null : '');
  });

  test('User can export data (GDPR compliance)', async ({ page }) => {
    await page.click('[data-testid="data-privacy-tab"]');

    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-data-button"]');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/justice-companion-export-.*\.json/);

    // Verify file is valid JSON
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf8');
    const data = JSON.parse(content);

    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('exportDate');
    expect(data).toHaveProperty('cases');
    expect(data).toHaveProperty('evidence');
  });
});
```

---

### 7. Automated Rollback

**File**: `.github/workflows/rollback.yml`
```yaml
name: Rollback Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to (e.g., 1.0.0)'
        required: true
        type: string
      reason:
        description: 'Reason for rollback'
        required: true
        type: string

env:
  NODE_VERSION: '20.18.0'
  PNPM_VERSION: '9.15.0'

jobs:
  validate-rollback:
    name: Validate Rollback
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Validate version exists
        run: |
          VERSION="v${{ inputs.version }}"
          echo "Validating release $VERSION..."

          RELEASE_URL="https://api.github.com/repos/${{ github.repository }}/releases/tags/$VERSION"
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $RELEASE_URL)

          if [ "$RESPONSE" -ne 200 ]; then
            echo "❌ Release $VERSION not found"
            exit 1
          fi

          echo "✅ Release $VERSION found"

      - name: Create rollback issue
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🚨 Rollback to v${{ inputs.version }}`,
              body: `## Rollback Initiated\n\n**Target Version**: v${{ inputs.version }}\n**Reason**: ${{ inputs.reason }}\n**Initiated by**: @${{ github.actor }}\n**Timestamp**: ${new Date().toISOString()}\n\n## Actions Taken\n\n1. Release v${{ inputs.version }} re-published\n2. Auto-update server updated\n3. Monitoring active\n\n## Next Steps\n\n- [ ] Monitor error rates\n- [ ] Verify user updates\n- [ ] Investigate root cause\n- [ ] Prepare fix for next release`,
              labels: ['rollback', 'critical']
            });

  rollback-release:
    name: Execute Rollback
    runs-on: ubuntu-latest
    needs: [validate-rollback]

    steps:
      - name: Re-publish previous release
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const version = 'v${{ inputs.version }}';

            // Get release
            const { data: release } = await github.rest.repos.getReleaseByTag({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag: version
            });

            // Update release to mark as latest
            await github.rest.repos.updateRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              release_id: release.id,
              draft: false,
              prerelease: false,
              make_latest: 'true'
            });

            console.log(`✅ Release ${version} re-published as latest`);

      - name: Notify team
        run: |
          echo "🚨 Rollback completed to v${{ inputs.version }}"
          echo "Reason: ${{ inputs.reason }}"
```

**Usage**:
```bash
# Trigger manually via GitHub Actions UI
# Or via gh CLI:
gh workflow run rollback.yml -f version=1.0.0 -f reason="Critical security vulnerability"
```

---

## Testing Checklist

### Pre-Deployment Testing

**Pre-Commit Hooks**:
- [ ] Hook triggers on commit
- [ ] Auto-formats code
- [ ] Runs type check
- [ ] Prevents commit on error

**Performance Regression**:
- [ ] Baseline created on first run
- [ ] Detects >15% regression
- [ ] Posts PR comment with results
- [ ] Updates baseline on main branch

**Auto-Update**:
- [ ] Check for updates works
- [ ] Download progress shows
- [ ] Update installs on restart
- [ ] Notification dialogs appear

**Code Signing**:
- [ ] Windows installer signed
- [ ] macOS app notarized
- [ ] No security warnings on install
- [ ] Signature verifiable

**E2E Tests**:
- [ ] All settings tests pass
- [ ] Data export/import works
- [ ] User flows complete successfully
- [ ] Accessibility verified

**Rollback**:
- [ ] Rollback workflow triggers
- [ ] Previous version re-published
- [ ] Issue created automatically
- [ ] Team notified

---

## Monitoring & Maintenance

### Weekly Tasks
- [ ] Review security scan results
- [ ] Check dependency updates
- [ ] Monitor performance benchmarks
- [ ] Review error logs (Sentry)

### Monthly Tasks
- [ ] Review code signing certificates (expiration)
- [ ] Update baseline performance metrics
- [ ] Clean up old release artifacts
- [ ] Review and close rollback issues

### Quarterly Tasks
- [ ] Audit CI/CD pipeline performance
- [ ] Review and update workflows
- [ ] Update dependencies (major versions)
- [ ] Security compliance audit

---

## Troubleshooting

### Common Issues

**Issue**: Pre-commit hook not running
**Solution**:
```bash
# Reinstall hooks
rm -rf .husky
npx husky-init
chmod +x .husky/pre-commit
```

**Issue**: Performance comparison fails
**Solution**:
```bash
# Reset baseline
rm -rf baseline/
node scripts/compare-performance.js
```

**Issue**: Auto-update not working
**Solution**:
```bash
# Check electron-updater logs
# In dev tools console:
window.electron.getAppVersion()
```

**Issue**: Code signing fails
**Solution**:
```bash
# Verify certificate
openssl pkcs12 -info -in certificate.pfx
# Check GitHub secrets are set correctly
```

---

## Next Steps

1. **Week 1**: Implement pre-commit hooks + performance regression
2. **Week 2**: Set up auto-update server
3. **Week 3**: Configure code signing (Windows + macOS)
4. **Week 4**: Expand E2E tests + deployment monitoring
5. **Week 5**: Implement rollback automation
6. **Week 6**: Testing and validation

**Target Completion**: 6 weeks
**Expected Maturity**: Level 4 (9.0/10)

---

**Guide Version**: 1.0.0
**Last Updated**: 2025-10-18
**Maintainer**: DevOps Team
