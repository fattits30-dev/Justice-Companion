# ========================================
# Justice Companion - Phase 4 Tools Installation
# Install Oh My Posh, PSReadLine, Terminal-Icons
# ========================================

Write-Host "Installing Phase 4 PowerShell Enhancement Tools..." -ForegroundColor Cyan
Write-Host ""

$errorOccurred = $false

# 1. Install Oh My Posh
Write-Host "[1/4] Installing Oh My Posh..." -ForegroundColor Yellow
try {
    $ohMyPoshInstalled = Get-Command oh-my-posh -ErrorAction SilentlyContinue
    if ($ohMyPoshInstalled) {
        Write-Host "[OK] Oh My Posh is already installed" -ForegroundColor Green
    } else {
        Write-Host "   Running: winget install JanDeDobbeleer.OhMyPosh -e" -ForegroundColor Cyan
        winget install JanDeDobbeleer.OhMyPosh -e --silent
        Write-Host "[OK] Oh My Posh installed successfully" -ForegroundColor Green
        Write-Host "[INFO] You may need to restart PowerShell for Oh My Posh to be available" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to install Oh My Posh: $_" -ForegroundColor Red
    $errorOccurred = $true
}

# 2. Install/Update PSReadLine
Write-Host "`n[2/4] Installing PSReadLine..." -ForegroundColor Yellow
try {
    $psReadLineVersion = (Get-Module PSReadLine -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1).Version
    if ($psReadLineVersion) {
        Write-Host "[OK] PSReadLine $psReadLineVersion is already installed" -ForegroundColor Green
    }

    Write-Host "   Updating to latest version..." -ForegroundColor Cyan
    Install-Module PSReadLine -AllowPrerelease -Scope CurrentUser -Force -SkipPublisherCheck
    Write-Host "[OK] PSReadLine updated successfully" -ForegroundColor Green
} catch {
    Write-Host "[WARN] PSReadLine update failed (may already be latest): $_" -ForegroundColor Yellow
}

# 3. Install Terminal-Icons
Write-Host "`n[3/4] Installing Terminal-Icons..." -ForegroundColor Yellow
try {
    $terminalIconsInstalled = Get-Module -ListAvailable -Name Terminal-Icons
    if ($terminalIconsInstalled) {
        Write-Host "[OK] Terminal-Icons is already installed" -ForegroundColor Green
    } else {
        Write-Host "   Running: Install-Module -Name Terminal-Icons..." -ForegroundColor Cyan
        Install-Module -Name Terminal-Icons -Repository PSGallery -Scope CurrentUser -Force
        Write-Host "[OK] Terminal-Icons installed successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Failed to install Terminal-Icons: $_" -ForegroundColor Red
    $errorOccurred = $true
}

# 4. Install posh-git (optional)
Write-Host "`n[4/4] Installing posh-git (optional)..." -ForegroundColor Yellow
try {
    $poshGitInstalled = Get-Module -ListAvailable -Name posh-git
    if ($poshGitInstalled) {
        Write-Host "[OK] posh-git is already installed" -ForegroundColor Green
    } else {
        Write-Host "   Running: Install-Module posh-git..." -ForegroundColor Cyan
        Install-Module posh-git -Scope CurrentUser -Force
        Write-Host "[OK] posh-git installed successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] posh-git installation failed (optional): $_" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Installation Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($errorOccurred) {
    Write-Host "[WARN] Some installations encountered errors" -ForegroundColor Yellow
} else {
    Write-Host "[OK] All tools installed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install Cascadia Code Nerd Font:" -ForegroundColor White
Write-Host "   winget install Microsoft.CascadiaCode" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Run the PowerShell profile setup:" -ForegroundColor White
Write-Host "   .\scripts\setup-powershell-profile.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Edit your PowerShell profile to enable features:" -ForegroundColor White
Write-Host "   code `$PROFILE" -ForegroundColor Cyan
Write-Host "   (Uncomment the Oh My Posh and Terminal-Icons lines)" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Restart PowerShell to see the changes" -ForegroundColor White
Write-Host ""
