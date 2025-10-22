#!/usr/bin/env pwsh
# Nuclear option: Stop all processes, delete node_modules, reinstall
# Justice Companion - Emergency Node Modules Fix Script

Write-Host "============================================" -ForegroundColor Red
Write-Host "🚨 NUCLEAR NODE_MODULES FIX" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Kill all Node.js and Electron processes" -ForegroundColor Yellow
Write-Host "  2. Delete node_modules directory" -ForegroundColor Yellow
Write-Host "  3. Delete pnpm-lock.yaml" -ForegroundColor Yellow
Write-Host "  4. Clear pnpm cache" -ForegroundColor Yellow
Write-Host "  5. Run pnpm install" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  WARNING: This will terminate all running Node.js applications!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Step 1: Killing Node.js processes..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*electron*" }
if ($nodeProcesses) {
    Write-Host "Found processes:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object { Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray }

    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✓ Processes terminated" -ForegroundColor Green
} else {
    Write-Host "⚠ No Node.js processes found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Step 2: Deleting node_modules..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if (Test-Path "node_modules") {
    $itemCount = (Get-ChildItem "node_modules" -Recurse | Measure-Object).Count
    Write-Host "Found $itemCount items in node_modules" -ForegroundColor Gray
    Write-Host "Deleting... (this may take a minute)" -ForegroundColor Gray

    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    if (Test-Path "node_modules") {
        Write-Host "❌ Failed to delete node_modules (still locked)" -ForegroundColor Red
        Write-Host "Try closing VS Code and running again" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✓ node_modules deleted" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules doesn't exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Step 3: Deleting pnpm-lock.yaml..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if (Test-Path "pnpm-lock.yaml") {
    Remove-Item pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
    Write-Host "✓ pnpm-lock.yaml deleted" -ForegroundColor Green
} else {
    Write-Host "⚠ pnpm-lock.yaml doesn't exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Step 4: Clearing pnpm cache..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

pnpm store prune
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ pnpm cache cleared" -ForegroundColor Green
} else {
    Write-Host "⚠ Failed to clear pnpm cache (non-critical)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Step 5: Running pnpm install..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "This will take several minutes..." -ForegroundColor Gray
Write-Host ""

pnpm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✅ SUCCESS! Dependencies installed" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run './verify-installation.ps1' to verify" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "❌ FAILED! pnpm install failed" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the errors above for details" -ForegroundColor Yellow
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Wrong Node.js version (need 20.18.0 LTS)" -ForegroundColor Yellow
    Write-Host "  - Network connectivity issues" -ForegroundColor Yellow
    Write-Host "  - Disk space issues" -ForegroundColor Yellow
    exit 1
}
