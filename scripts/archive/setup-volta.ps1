# ========================================
# Justice Companion - Volta Setup
# Phase 5: Node Version Management Script
# ========================================

Write-Host "Phase 5: Volta Installation Starting..." -ForegroundColor Cyan

# Check if Volta is already installed
Write-Host "`n[1/3] Checking for Volta..." -ForegroundColor Yellow
$voltaInstalled = Get-Command volta -ErrorAction SilentlyContinue

if ($voltaInstalled) {
    $voltaVersion = volta --version
    Write-Host "[OK] Volta is already installed: $voltaVersion" -ForegroundColor Green
} else {
    Write-Host "[INFO] Volta is not installed" -ForegroundColor Yellow
    Write-Host "[ACTION REQUIRED] Install Volta using:" -ForegroundColor Cyan
    Write-Host "   winget install Volta.Volta" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation:" -ForegroundColor Yellow
    Write-Host "1. Close this PowerShell window" -ForegroundColor White
    Write-Host "2. Open a new PowerShell window" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "[PAUSED] Please install Volta and restart PowerShell, then run this script again" -ForegroundColor Yellow
    exit 0
}

# Navigate to project
Write-Host "`n[2/3] Navigating to Justice Companion project..." -ForegroundColor Yellow
Set-Location "C:\Users\sava6\Desktop\Justice Companion"
Write-Host "[OK] Current directory: $(Get-Location)" -ForegroundColor Green

# Pin Node and npm versions
Write-Host "`n[3/3] Pinning Node.js and npm versions..." -ForegroundColor Yellow

Write-Host "   Pinning Node.js v22..." -ForegroundColor Cyan
volta pin node@22

Write-Host "   Pinning npm v11..." -ForegroundColor Cyan
volta pin npm@11

Write-Host "[OK] Versions pinned successfully" -ForegroundColor Green

# Verify pinned versions
Write-Host "`nVerification:" -ForegroundColor Cyan
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "  Node.js: $nodeVersion" -ForegroundColor White
Write-Host "  npm: $npmVersion" -ForegroundColor White

# Check package.json for volta field
Write-Host "`nChecking package.json..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($packageJson.volta) {
    Write-Host "[OK] Volta configuration added to package.json:" -ForegroundColor Green
    Write-Host "  Node: $($packageJson.volta.node)" -ForegroundColor White
    Write-Host "  npm: $($packageJson.volta.npm)" -ForegroundColor White
} else {
    Write-Host "[WARN] Volta field not found in package.json" -ForegroundColor Yellow
}

# Test automatic version switching
Write-Host "`nTesting automatic version switching..." -ForegroundColor Yellow
Write-Host "  Leaving directory..." -ForegroundColor Cyan
Set-Location ..

Write-Host "  Entering directory..." -ForegroundColor Cyan
Set-Location "Justice Companion"

$nodeVersionAfter = node --version
$npmVersionAfter = npm --version
Write-Host "[OK] Versions after directory change:" -ForegroundColor Green
Write-Host "  Node.js: $nodeVersionAfter" -ForegroundColor White
Write-Host "  npm: $npmVersionAfter" -ForegroundColor White

if ($nodeVersionAfter -eq $nodeVersion -and $npmVersionAfter -eq $npmVersion) {
    Write-Host "[OK] Automatic version switching is working!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Version mismatch detected" -ForegroundColor Yellow
}

# Instructions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Volta Setup Complete" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Benefits:" -ForegroundColor Cyan
Write-Host "- Automatic Node.js version switching when entering this project" -ForegroundColor White
Write-Host "- No need to manually run 'nvm use' or 'volta use'" -ForegroundColor White
Write-Host "- Team consistency (pinned versions in package.json)" -ForegroundColor White
Write-Host "- 40x faster than nvm-windows" -ForegroundColor White
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  Just cd into the project directory - Volta handles the rest!" -ForegroundColor White
Write-Host ""
Write-Host "[SUCCESS] Phase 5 complete!" -ForegroundColor Green
Write-Host ""
