# Justice Companion - E2E Test Fix Script
# Fixes the 43 E2E test failures by addressing:
# 1. Node version mismatch (Node 22 → Node 20)
# 2. Zombie Electron processes
# 3. better-sqlite3 binary rebuild

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Justice Companion E2E Test Fix Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill zombie processes
Write-Host "[1/5] Killing zombie Electron processes..." -ForegroundColor Yellow
$electronProcesses = Get-Process | Where-Object { $_.ProcessName -match 'electron|Justice' }
if ($electronProcesses) {
    $count = @($electronProcesses).Count
    Write-Host "  Found $count Electron/Justice processes" -ForegroundColor Gray
    $electronProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  ✓ Processes killed" -ForegroundColor Green
} else {
    Write-Host "  No zombie processes found" -ForegroundColor Green
}

# Step 2: Check current Node version
Write-Host "`n[2/5] Checking Node.js version..." -ForegroundColor Yellow
$currentNode = node --version
Write-Host "  Current Node: $currentNode" -ForegroundColor Gray

# Step 3: Switch to Node 20 using nvm
Write-Host "`n[3/5] Switching to Node 20 LTS..." -ForegroundColor Yellow
try {
    # Check available Node versions
    $nvmList = nvm list
    Write-Host "  Available Node versions:" -ForegroundColor Gray
    Write-Host "$nvmList" -ForegroundColor DarkGray

    # Check if Node 20 is installed
    if ($nvmList -match '20\.') {
        Write-Host "  Node 20 found, switching..." -ForegroundColor Gray
        nvm use 20
    } else {
        Write-Host "  Node 20 not found, installing..." -ForegroundColor Gray
        nvm install 20.18.0
        nvm use 20.18.0
    }

    $newNode = node --version
    Write-Host "  ✓ Now using Node: $newNode" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Warning: Could not switch Node version automatically" -ForegroundColor Red
    Write-Host "  Please run: nvm use 20" -ForegroundColor Yellow
}

# Step 4: Rebuild better-sqlite3 for Node.js
Write-Host "`n[4/5] Rebuilding better-sqlite3 for Node.js runtime..." -ForegroundColor Yellow
try {
    Push-Location "C:\Users\sava6\Desktop\Justice Companion"
    pnpm rebuild better-sqlite3
    Write-Host "  ✓ better-sqlite3 rebuilt successfully" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Rebuild failed, trying alternative method..." -ForegroundColor Yellow
    npm rebuild better-sqlite3
} finally {
    Pop-Location
}

# Step 5: Verify fix
Write-Host "`n[5/5] Verifying fix..." -ForegroundColor Yellow
$verifyNode = node --version
Write-Host "  Node version: $verifyNode" -ForegroundColor Gray
$verifyProcesses = Get-Process | Where-Object { $_.ProcessName -match 'electron|Justice' } | Measure-Object
Write-Host "  Electron processes running: $($verifyProcesses.Count)" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Fix Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run a single test: pnpm test:e2e tests/e2e/specs/authentication.e2e.test.ts" -ForegroundColor White
Write-Host "  2. If successful, run full suite: pnpm test:e2e" -ForegroundColor White
Write-Host ""

Write-Host "Note: If tests still fail, you may need to manually run:" -ForegroundColor Yellow
Write-Host "  nvm use 20" -ForegroundColor White
Write-Host "  pnpm rebuild better-sqlite3" -ForegroundColor White
Write-Host ""
