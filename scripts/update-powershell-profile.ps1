# ========================================
# Update PowerShell Profile for Compatibility
# Fix PSReadLine version compatibility issues
# ========================================

Write-Host "Updating PowerShell profile for compatibility..." -ForegroundColor Cyan

$profilePath = $PROFILE

if (!(Test-Path $profilePath)) {
    Write-Host "[ERROR] Profile not found at: $profilePath" -ForegroundColor Red
    exit 1
}

# Backup existing profile
$backupPath = "$profilePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path $profilePath -Destination $backupPath
Write-Host "[OK] Backup created: $backupPath" -ForegroundColor Green

# Read current profile
$profileContent = Get-Content $profilePath -Raw

# Update PSReadLine section with version detection
$newPSReadLineSection = @'
# ========================================
# PSReadLine Configuration
# ========================================
# Enhanced command-line editing experience
if (Get-Module -ListAvailable -Name PSReadLine) {
    Import-Module PSReadLine

    # Get PSReadLine version
    $psReadLineVersion = (Get-Module PSReadLine).Version

    # Predictive IntelliSense (only PSReadLine 2.1.0+)
    if ($psReadLineVersion -ge [version]"2.1.0") {
        try {
            Set-PSReadLineOption -PredictionSource HistoryAndPlugin -ErrorAction Stop
            Set-PSReadLineOption -PredictionViewStyle ListView -ErrorAction Stop
        } catch {
            # Fallback for versions that don't support these parameters
            Write-Host "[INFO] PSReadLine prediction features not available (requires v2.1.0+)" -ForegroundColor Yellow
        }
    }

    # Editing mode (works on all versions)
    Set-PSReadLineOption -EditMode Windows

    # Key bindings (works on all versions)
    Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
    Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
    Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward

    # Colors (only set colors that exist in this version)
    try {
        Set-PSReadLineOption -Colors @{
            Command   = 'Yellow'
            Parameter = 'Green'
            Operator  = 'Magenta'
            Variable  = 'White'
            String    = 'Cyan'
            Number    = 'Blue'
            Type      = 'Gray'
            Comment   = 'DarkGray'
        } -ErrorAction Stop
    } catch {
        # Ignore color errors on older versions
    }
}
'@

# Replace the PSReadLine section
$pattern = '(?s)# ========================================\r?\n# PSReadLine Configuration\r?\n# ========================================.*?(?=\r?\n# ========================================)'
$profileContent = $profileContent -replace $pattern, $newPSReadLineSection

# Write updated profile
Set-Content -Path $profilePath -Value $profileContent -Force
Write-Host "[OK] Profile updated with compatibility fixes" -ForegroundColor Green

# Test the profile
Write-Host "`nTesting updated profile..." -ForegroundColor Yellow
try {
    . $profilePath
    Write-Host "[OK] Profile loaded successfully without errors!" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Profile loaded with warnings: $_" -ForegroundColor Yellow
}

Write-Host "`n[SUCCESS] Profile update complete!" -ForegroundColor Green
Write-Host "Restart PowerShell to apply changes" -ForegroundColor Yellow
