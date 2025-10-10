# ========================================
# Justice Companion - Complete PowerShell Upgrade
# Installs PowerShell 7, updates all tools, configures everything
# ========================================

param(
    [switch]$SkipPowerShell7,
    [switch]$SkipOhMyPosh,
    [switch]$SkipVolta
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Complete PowerShell Upgrade" -ForegroundColor Yellow
Write-Host " Justice Companion Environment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$upgrades = @()
$errors = @()

# ========================================
# 1. Install PowerShell 7
# ========================================
if (-not $SkipPowerShell7) {
    Write-Host "[1/7] Installing PowerShell 7..." -ForegroundColor Yellow

    # Check if already installed
    $pwsh7 = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh7) {
        $version = & pwsh --version
        Write-Host "[OK] PowerShell 7 already installed: $version" -ForegroundColor Green
        $upgrades += "PowerShell 7: Already installed ($version)"
    } else {
        Write-Host "   Downloading and installing PowerShell 7..." -ForegroundColor Cyan

        # Download and install PowerShell 7
        $url = "https://github.com/PowerShell/PowerShell/releases/download/v7.4.6/PowerShell-7.4.6-win-x64.msi"
        $output = "$env:TEMP\PowerShell-7.4.6-win-x64.msi"

        try {
            Write-Host "   Downloading from GitHub..." -ForegroundColor Cyan
            Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing

            Write-Host "   Installing (this may take a minute)..." -ForegroundColor Cyan
            Start-Process msiexec.exe -Wait -ArgumentList "/i `"$output`" /quiet ADD_EXPLORER_CONTEXT_MENU_OPENPOWERSHELL=1 ADD_FILE_CONTEXT_MENU_RUNPOWERSHELL=1 ENABLE_PSREMOTING=1 REGISTER_MANIFEST=1"

            Remove-Item $output -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] PowerShell 7 installed successfully!" -ForegroundColor Green
            $upgrades += "PowerShell 7: Installed v7.4.6"
        } catch {
            Write-Host "[ERROR] Failed to install PowerShell 7: $_" -ForegroundColor Red
            $errors += "PowerShell 7 installation failed"
        }
    }
} else {
    Write-Host "[1/7] Skipping PowerShell 7 installation" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# 2. Install Oh My Posh
# ========================================
if (-not $SkipOhMyPosh) {
    Write-Host "[2/7] Installing Oh My Posh..." -ForegroundColor Yellow

    $ohMyPoshInstalled = Get-Command oh-my-posh -ErrorAction SilentlyContinue
    if ($ohMyPoshInstalled) {
        Write-Host "[OK] Oh My Posh is already installed" -ForegroundColor Green
        $upgrades += "Oh My Posh: Already installed"
    } else {
        try {
            Write-Host "   Downloading Oh My Posh installer..." -ForegroundColor Cyan

            # Use the official installer
            $installer = "$env:TEMP\install-oh-my-posh.ps1"
            Invoke-WebRequest -Uri "https://ohmyposh.dev/install.ps1" -OutFile $installer -UseBasicParsing

            Write-Host "   Running installer..." -ForegroundColor Cyan
            & $installer -Scope CurrentUser

            Remove-Item $installer -Force -ErrorAction SilentlyContinue

            # Add to PATH for current session
            $ohMyPoshPath = "$env:LOCALAPPDATA\Programs\oh-my-posh\bin"
            if (Test-Path $ohMyPoshPath) {
                $env:Path += ";$ohMyPoshPath"
            }

            Write-Host "[OK] Oh My Posh installed successfully!" -ForegroundColor Green
            $upgrades += "Oh My Posh: Installed"
        } catch {
            Write-Host "[WARN] Oh My Posh installation failed: $_" -ForegroundColor Yellow
            Write-Host "   You can install manually later with: winget install JanDeDobbeleer.OhMyPosh" -ForegroundColor Yellow
            $errors += "Oh My Posh installation failed (optional)"
        }
    }
} else {
    Write-Host "[2/7] Skipping Oh My Posh installation" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# 3. Install Cascadia Code Nerd Font
# ========================================
Write-Host "[3/7] Installing Cascadia Code Nerd Font..." -ForegroundColor Yellow

try {
    # Download Cascadia Code Nerd Font
    $fontUrl = "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/CascadiaCode.zip"
    $fontZip = "$env:TEMP\CascadiaCode.zip"
    $fontExtract = "$env:TEMP\CascadiaCode"

    Write-Host "   Downloading Cascadia Code Nerd Font..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $fontUrl -OutFile $fontZip -UseBasicParsing

    Write-Host "   Extracting fonts..." -ForegroundColor Cyan
    Expand-Archive -Path $fontZip -DestinationPath $fontExtract -Force

    Write-Host "   Installing fonts..." -ForegroundColor Cyan
    $fonts = Get-ChildItem -Path $fontExtract -Filter "*.ttf"
    $installedCount = 0

    $FONTS = 0x14
    $fontFolder = (New-Object -ComObject Shell.Application).Namespace($FONTS)

    foreach ($font in $fonts) {
        if ($font.Name -like "*Mono*") {  # Only install Mono variants for terminal
            try {
                $fontFolder.CopyHere($font.FullName, 0x10)
                $installedCount++
            } catch {
                # Font might already be installed
            }
        }
    }

    # Cleanup
    Remove-Item $fontZip -Force -ErrorAction SilentlyContinue
    Remove-Item $fontExtract -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "[OK] Installed $installedCount Cascadia Code Nerd Font variants" -ForegroundColor Green
    $upgrades += "Cascadia Code Nerd Font: Installed"
} catch {
    Write-Host "[WARN] Font installation failed: $_" -ForegroundColor Yellow
    Write-Host "   You can download manually from: https://www.nerdfonts.com/font-downloads" -ForegroundColor Yellow
    $errors += "Font installation failed (optional)"
}

Write-Host ""

# ========================================
# 4. Update Terminal-Icons (if needed)
# ========================================
Write-Host "[4/7] Updating Terminal-Icons..." -ForegroundColor Yellow

$terminalIcons = Get-Module -ListAvailable -Name Terminal-Icons
if ($terminalIcons) {
    Write-Host "[OK] Terminal-Icons is already installed" -ForegroundColor Green
    $upgrades += "Terminal-Icons: Already installed"
} else {
    try {
        Install-Module -Name Terminal-Icons -Repository PSGallery -Scope CurrentUser -Force
        Write-Host "[OK] Terminal-Icons installed" -ForegroundColor Green
        $upgrades += "Terminal-Icons: Installed"
    } catch {
        Write-Host "[WARN] Terminal-Icons installation failed: $_" -ForegroundColor Yellow
        $errors += "Terminal-Icons installation failed (optional)"
    }
}

Write-Host ""

# ========================================
# 5. Update posh-git (if needed)
# ========================================
Write-Host "[5/7] Updating posh-git..." -ForegroundColor Yellow

$poshGit = Get-Module -ListAvailable -Name posh-git
if ($poshGit) {
    Write-Host "[OK] posh-git is already installed" -ForegroundColor Green
    $upgrades += "posh-git: Already installed"
} else {
    try {
        Install-Module posh-git -Scope CurrentUser -Force
        Write-Host "[OK] posh-git installed" -ForegroundColor Green
        $upgrades += "posh-git: Installed"
    } catch {
        Write-Host "[WARN] posh-git installation failed: $_" -ForegroundColor Yellow
        $errors += "posh-git installation failed (optional)"
    }
}

Write-Host ""

# ========================================
# 6. Install Volta (optional)
# ========================================
if (-not $SkipVolta) {
    Write-Host "[6/7] Installing Volta..." -ForegroundColor Yellow

    $voltaInstalled = Get-Command volta -ErrorAction SilentlyContinue
    if ($voltaInstalled) {
        $voltaVersion = volta --version
        Write-Host "[OK] Volta already installed: $voltaVersion" -ForegroundColor Green
        $upgrades += "Volta: Already installed ($voltaVersion)"
    } else {
        try {
            Write-Host "   Downloading Volta installer..." -ForegroundColor Cyan

            $voltaInstaller = "$env:TEMP\install-volta.ps1"
            Invoke-WebRequest -Uri "https://get.volta.sh" -OutFile $voltaInstaller -UseBasicParsing

            Write-Host "   Running Volta installer..." -ForegroundColor Cyan
            & $voltaInstaller

            Remove-Item $voltaInstaller -Force -ErrorAction SilentlyContinue

            Write-Host "[OK] Volta installed successfully!" -ForegroundColor Green
            $upgrades += "Volta: Installed"
        } catch {
            Write-Host "[WARN] Volta installation failed: $_" -ForegroundColor Yellow
            Write-Host "   You can install manually later from: https://volta.sh" -ForegroundColor Yellow
            $errors += "Volta installation failed (optional)"
        }
    }
} else {
    Write-Host "[6/7] Skipping Volta installation" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# 7. Create PowerShell 7 Profile
# ========================================
Write-Host "[7/7] Creating PowerShell 7 profile..." -ForegroundColor Yellow

# Check if PowerShell 7 is installed
$pwsh7 = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwsh7) {
    # Copy the profile to PowerShell 7 location
    $ps5Profile = "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
    $ps7ProfileDir = "$env:USERPROFILE\Documents\PowerShell"
    $ps7Profile = "$ps7ProfileDir\Microsoft.PowerShell_profile.ps1"

    if (!(Test-Path $ps7ProfileDir)) {
        New-Item -ItemType Directory -Path $ps7ProfileDir -Force | Out-Null
    }

    if (Test-Path $ps5Profile) {
        Copy-Item -Path $ps5Profile -Destination $ps7Profile -Force
        Write-Host "[OK] Profile copied to PowerShell 7 location" -ForegroundColor Green
        $upgrades += "PowerShell 7 Profile: Created"
    } else {
        Write-Host "[WARN] PowerShell 5 profile not found, skipping copy" -ForegroundColor Yellow
    }

    # Update the profile to enable Oh My Posh if installed
    if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
        Write-Host "   Enabling Oh My Posh in PowerShell 7 profile..." -ForegroundColor Cyan

        $profileContent = Get-Content $ps7Profile -Raw

        # Uncomment Oh My Posh line
        $profileContent = $profileContent -replace '# oh-my-posh init', 'oh-my-posh init'

        # Uncomment Terminal-Icons
        $profileContent = $profileContent -replace '# Import-Module -Name Terminal-Icons', 'Import-Module -Name Terminal-Icons'

        # Uncomment posh-git
        $profileContent = $profileContent -replace '# Import-Module posh-git', 'Import-Module posh-git'

        Set-Content -Path $ps7Profile -Value $profileContent -Force
        Write-Host "[OK] Oh My Posh and modules enabled in profile" -ForegroundColor Green
    }
} else {
    Write-Host "[SKIP] PowerShell 7 not installed, skipping profile creation" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# Summary
# ========================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Upgrade Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($upgrades.Count -gt 0) {
    Write-Host "Successfully completed:" -ForegroundColor Green
    foreach ($upgrade in $upgrades) {
        Write-Host "  ✓ $upgrade" -ForegroundColor White
    }
    Write-Host ""
}

if ($errors.Count -gt 0) {
    Write-Host "Issues encountered (optional items):" -ForegroundColor Yellow
    foreach ($error in $errors) {
        Write-Host "  ! $error" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Next Steps" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipPowerShell7 -and (Get-Command pwsh -ErrorAction SilentlyContinue)) {
    Write-Host "1. Close this PowerShell window" -ForegroundColor White
    Write-Host "2. Open PowerShell 7 (search for 'pwsh' in Start menu)" -ForegroundColor White
    Write-Host "3. Set PowerShell 7 as default in Windows Terminal:" -ForegroundColor White
    Write-Host "   - Open Windows Terminal settings (Ctrl+,)" -ForegroundColor Cyan
    Write-Host "   - Set 'Default profile' to 'PowerShell'" -ForegroundColor Cyan
    Write-Host "   - Set font to 'CaskaydiaCove Nerd Font Mono'" -ForegroundColor Cyan
    Write-Host ""
}

if (Get-Command volta -ErrorAction SilentlyContinue) {
    Write-Host "4. Configure Volta for Justice Companion:" -ForegroundColor White
    Write-Host "   pwsh -File .\scripts\setup-volta.ps1" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "5. Restart your computer for all changes to take effect" -ForegroundColor White
Write-Host ""

Write-Host "[SUCCESS] Upgrade complete!" -ForegroundColor Green
Write-Host ""
