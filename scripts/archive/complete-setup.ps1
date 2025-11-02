# ========================================
# Justice Companion - Complete Setup Script
# Phases 4 & 5: PowerShell + Volta
# ========================================

param(
    [switch]$SkipPhase4,
    [switch]$SkipPhase5,
    [switch]$InstallTools
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Justice Companion - Complete Setup" -ForegroundColor Yellow
Write-Host " Phases 4 & 5" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check current directory
$currentDir = Get-Location
if ($currentDir.Path -notlike "*Justice Companion*") {
    Write-Host "[WARN] Not in Justice Companion directory" -ForegroundColor Yellow
    Write-Host "   Current: $currentDir" -ForegroundColor White
    Write-Host "   Navigating to Justice Companion..." -ForegroundColor Cyan
    Set-Location "C:\Users\sava6\Desktop\Justice Companion"
}

Write-Host "[INFO] Current directory: $(Get-Location)" -ForegroundColor White
Write-Host ""

# Phase 4: PowerShell Enhancement
if (-not $SkipPhase4) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Phase 4: PowerShell Enhancement" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if ($InstallTools) {
        Write-Host "[STEP 1] Installing Phase 4 tools..." -ForegroundColor Yellow
        & ".\scripts\install-phase4-tools.ps1"
        Write-Host ""
    } else {
        Write-Host "[SKIP] Tool installation (use -InstallTools to install)" -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Host "[STEP 2] Setting up PowerShell profile..." -ForegroundColor Yellow
    & ".\scripts\setup-powershell-profile.ps1"
    Write-Host ""
} else {
    Write-Host "[SKIP] Phase 4: PowerShell Enhancement" -ForegroundColor Yellow
    Write-Host ""
}

# Phase 5: Volta
if (-not $SkipPhase5) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Phase 5: Volta Installation" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "[STEP 1] Checking for Volta..." -ForegroundColor Yellow
    $voltaInstalled = Get-Command volta -ErrorAction SilentlyContinue

    if ($voltaInstalled) {
        Write-Host "[OK] Volta is installed" -ForegroundColor Green
        Write-Host ""
        Write-Host "[STEP 2] Configuring Volta for Justice Companion..." -ForegroundColor Yellow
        & ".\scripts\setup-volta.ps1"
        Write-Host ""
    } else {
        Write-Host "[INFO] Volta is not installed" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To install Volta:" -ForegroundColor Cyan
        Write-Host "1. Run: winget install Volta.Volta" -ForegroundColor White
        Write-Host "2. Restart PowerShell" -ForegroundColor White
        Write-Host "3. Run: .\scripts\setup-volta.ps1" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "[SKIP] Phase 5: Volta Installation" -ForegroundColor Yellow
    Write-Host ""
}

# Final Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Setup Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "What was done:" -ForegroundColor Cyan
if (-not $SkipPhase4) {
    Write-Host "[OK] Phase 4: PowerShell profile created" -ForegroundColor Green
    if ($InstallTools) {
        Write-Host "[OK] Phase 4: Tools installed (Oh My Posh, PSReadLine, Terminal-Icons)" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Phase 4: Tool installation (use -InstallTools)" -ForegroundColor Yellow
    }
}
if (-not $SkipPhase5) {
    $voltaInstalled = Get-Command volta -ErrorAction SilentlyContinue
    if ($voltaInstalled) {
        Write-Host "[OK] Phase 5: Volta configured" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Phase 5: Volta not installed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Manual steps remaining:" -ForegroundColor Cyan

if (-not $SkipPhase4) {
    if (-not $InstallTools) {
        Write-Host "1. Install Phase 4 tools: .\scripts\install-phase4-tools.ps1" -ForegroundColor White
    }
    Write-Host "2. Install Cascadia Code Nerd Font: winget install Microsoft.CascadiaCode" -ForegroundColor White
    Write-Host "3. Edit PowerShell profile to enable features: code `$PROFILE" -ForegroundColor White
    Write-Host "   (Uncomment Oh My Posh and Terminal-Icons lines)" -ForegroundColor Yellow
}

if (-not $SkipPhase5) {
    $voltaInstalled = Get-Command volta -ErrorAction SilentlyContinue
    if (-not $voltaInstalled) {
        Write-Host "4. Install Volta: winget install Volta.Volta" -ForegroundColor White
        Write-Host "5. Restart PowerShell and run: .\scripts\setup-volta.ps1" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "4. Restart PowerShell to apply all changes" -ForegroundColor White
Write-Host ""

Write-Host "[SUCCESS] Setup script complete!" -ForegroundColor Green
Write-Host ""
