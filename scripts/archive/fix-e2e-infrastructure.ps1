#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix E2E Test Infrastructure Issues (P0 Critical Fixes)

.DESCRIPTION
    Resolves critical infrastructure failures blocking all 43 E2E tests:
    1. Kill zombie Electron processes (36 processes locking binary)
    2. Move playwright.config.ts to root directory
    3. Verify Python setup (distutils module)
    4. Rebuild better-sqlite3 for Node.js runtime

.NOTES
    Author: Justice Companion Development Team
    Date: 2025-10-14
    Time: ~5 minutes
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " E2E Infrastructure Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill zombie Electron processes
Write-Host "[1/5] Killing zombie Electron processes..." -ForegroundColor Yellow
try {
    $processCount = (Get-Process -Name "electron" -ErrorAction SilentlyContinue).Count
    if ($processCount -gt 0) {
        Write-Host "      Found $processCount Electron processes" -ForegroundColor Gray
        Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "      ✓ Killed $processCount processes" -ForegroundColor Green
    } else {
        Write-Host "      ✓ No zombie processes found" -ForegroundColor Green
    }
} catch {
    Write-Host "      ⚠ Could not kill all processes (non-critical)" -ForegroundColor Yellow
}

# Wait for file locks to release (Windows file system delay)
Write-Host "      Waiting 3 seconds for file locks to release..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Step 2: Move playwright.config.ts to root
Write-Host "[2/5] Moving playwright.config.ts to root..." -ForegroundColor Yellow
$sourceConfig = "tests\e2e\playwright.config.ts"
$targetConfig = "playwright.config.ts"

if (Test-Path $sourceConfig) {
    if (Test-Path $targetConfig) {
        Write-Host "      ⚠ playwright.config.ts already exists in root" -ForegroundColor Yellow
        Write-Host "      Creating backup: playwright.config.ts.bak" -ForegroundColor Gray
        Copy-Item $targetConfig "${targetConfig}.bak" -Force
    }
    Copy-Item $sourceConfig $targetConfig -Force
    Write-Host "      ✓ Config moved to root" -ForegroundColor Green
} else {
    Write-Host "      ⚠ Source config not found: $sourceConfig" -ForegroundColor Yellow
}

# Step 3: Verify Python setup
Write-Host "[3/5] Checking Python setup..." -ForegroundColor Yellow
try {
    $pythonVersion = (python --version 2>&1).ToString().Trim()
    Write-Host "      Python version: $pythonVersion" -ForegroundColor Gray

    # Check if distutils is available (via setuptools)
    $distutilsCheck = (python -c "from distutils.version import StrictVersion; print('OK')" 2>&1)
    if ($distutilsCheck -match "OK") {
        Write-Host "      ✓ distutils module available" -ForegroundColor Green
    } else {
        Write-Host "      ⚠ distutils module missing" -ForegroundColor Yellow
        Write-Host "      Installing setuptools..." -ForegroundColor Gray
        python -m pip install setuptools --quiet --disable-pip-version-check 2>&1 | Out-Null
        Write-Host "      ✓ setuptools installed" -ForegroundColor Green
    }
} catch {
    Write-Host "      ⚠ Python check failed: $_" -ForegroundColor Yellow
    Write-Host "      You may need to install Python 3.11 or setuptools manually" -ForegroundColor Yellow
}

# Step 4: Rebuild better-sqlite3 for Node.js
Write-Host "[4/5] Rebuilding better-sqlite3 for Node.js..." -ForegroundColor Yellow
try {
    $rebuildOutput = (pnpm rebuild:node 2>&1)
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✓ better-sqlite3 rebuilt successfully" -ForegroundColor Green
    } else {
        Write-Host "      ✗ Rebuild failed" -ForegroundColor Red
        Write-Host "      Output: $rebuildOutput" -ForegroundColor Gray
        throw "better-sqlite3 rebuild failed"
    }
} catch {
    Write-Host "      ✗ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual fix required:" -ForegroundColor Yellow
    Write-Host "  1. Ensure Python 3.11 is installed (not 3.14)" -ForegroundColor Gray
    Write-Host "  2. Run: python -m pip install setuptools" -ForegroundColor Gray
    Write-Host "  3. Run: pnpm rebuild:node" -ForegroundColor Gray
    exit 1
}

# Step 5: Verify process cleanup
Write-Host "[5/5] Verifying process cleanup..." -ForegroundColor Yellow
$remainingProcesses = (Get-Process -Name "electron" -ErrorAction SilentlyContinue).Count
if ($remainingProcesses -eq 0) {
    Write-Host "      ✓ No remaining Electron processes" -ForegroundColor Green
} else {
    Write-Host "      ⚠ $remainingProcesses Electron processes still running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Infrastructure Fixes Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run E2E tests: pnpm test:e2e --headed" -ForegroundColor Gray
Write-Host "  2. Review report: E2E_INFRASTRUCTURE_AUDIT_REPORT.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected outcome: Tests should now start executing!" -ForegroundColor Green
Write-Host ""
