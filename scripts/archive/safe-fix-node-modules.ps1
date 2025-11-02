#!/usr/bin/env pwsh
# Safe option: Try gentle fixes first, escalate only if needed
# Justice Companion - Safe Node Modules Fix Script

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🛡️ SAFE NODE_MODULES FIX" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Trying gentle fixes first..." -ForegroundColor Gray
Write-Host ""

# Step 1: Try pnpm install first
Write-Host "Attempt 1: Try pnpm install..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
pnpm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! pnpm install worked" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run './verify-installation.ps1' to verify" -ForegroundColor Cyan
    exit 0
}
Write-Host "❌ Failed" -ForegroundColor Yellow

# Step 2: Kill processes and retry
Write-Host ""
Write-Host "Attempt 2: Kill processes and retry..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*electron*" }
if ($nodeProcesses) {
    Write-Host "Found processes:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object { Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray }

    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Killed processes" -ForegroundColor Gray
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Gray
}

pnpm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Killing processes fixed it" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run './verify-installation.ps1' to verify" -ForegroundColor Cyan
    exit 0
}
Write-Host "❌ Failed" -ForegroundColor Yellow

# Step 3: Delete .pnpm-store cache
Write-Host ""
Write-Host "Attempt 3: Clear pnpm cache..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
pnpm store prune
Write-Host "Cache cleared" -ForegroundColor Gray

pnpm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Clearing cache fixed it" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run './verify-installation.ps1' to verify" -ForegroundColor Cyan
    exit 0
}
Write-Host "❌ Failed" -ForegroundColor Yellow

# Step 4: Delete pnpm-lock.yaml
Write-Host ""
Write-Host "Attempt 4: Delete pnpm-lock.yaml..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
if (Test-Path "pnpm-lock.yaml") {
    Remove-Item pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
    Write-Host "Deleted pnpm-lock.yaml" -ForegroundColor Gray
} else {
    Write-Host "pnpm-lock.yaml doesn't exist" -ForegroundColor Gray
}

pnpm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Deleting lockfile fixed it" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run './verify-installation.ps1' to verify" -ForegroundColor Cyan
    exit 0
}
Write-Host "❌ Failed" -ForegroundColor Yellow

# Step 5: Nuclear option required
Write-Host ""
Write-Host "============================================" -ForegroundColor Red
Write-Host "All safe options failed" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""
Write-Host "You need to use the nuclear option:" -ForegroundColor Yellow
Write-Host "  ./nuclear-fix-node-modules.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  - Delete node_modules directory" -ForegroundColor Yellow
Write-Host "  - Delete pnpm-lock.yaml" -ForegroundColor Yellow
Write-Host "  - Clear all caches" -ForegroundColor Yellow
Write-Host "  - Reinstall from scratch" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Run nuclear option now? (y/N)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    Write-Host ""
    Write-Host "Launching nuclear option..." -ForegroundColor Cyan
    & "$PSScriptRoot/nuclear-fix-node-modules.ps1"
    exit $LASTEXITCODE
} else {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 1
}
