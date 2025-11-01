# Cerberus Guardian - PowerShell Runner for Justice Companion
# Usage: .\guardian-local.ps1 [command] [options]

param(
    [Parameter(Position=0)]
    [ValidateSet("scan", "file", "continuous", "fix", "status", "install")]
    [string]$Command = "scan",

    [Parameter(Position=1)]
    [string]$FilePath = "",

    [switch]$DryRun,
    [switch]$VerboseOutput
)

$GuardianDir = "C:\Users\sava6\Desktop\codebase-guardian"
$ProjectDir = $PSScriptRoot
$ConfigFile = Join-Path $ProjectDir ".guardian\config.yaml"

Write-Host ""
Write-Host "Cerberus Guardian - Local Runner" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if Guardian directory exists
if (-not (Test-Path $GuardianDir)) {
    Write-Host "ERROR: Guardian directory not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected location: $GuardianDir" -ForegroundColor Yellow
    Write-Host "Please clone Cerberus Guardian first:" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/fattits30-dev/cerberus-code-guardian.git $GuardianDir" -ForegroundColor Gray
    exit 1
}

# Check and install Guardian if needed
$VenvPath = Join-Path $GuardianDir ".venv"
if (-not (Test-Path $VenvPath)) {
    Write-Host "Guardian not installed" -ForegroundColor Yellow
    Write-Host "Installing..." -ForegroundColor Cyan
    Push-Location $GuardianDir
    & .\install.ps1
    Pop-Location
}

# Activate virtual environment
Write-Host "Activating Guardian environment..." -ForegroundColor Gray
$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
& $ActivateScript

# Set environment variables
$env:GUARDIAN_CONFIG = $ConfigFile
$env:PROJECT_DIR = $ProjectDir

Write-Host "Project: Justice Companion" -ForegroundColor Green
Write-Host "Location: $ProjectDir" -ForegroundColor Gray
Write-Host "Config: $ConfigFile" -ForegroundColor Gray
Write-Host ""

# Build command arguments
$GuardianScript = Join-Path $GuardianDir "guardian.py"
$Args = @()

switch ($Command) {
    "scan" {
        Write-Host "Running full codebase scan..." -ForegroundColor Cyan
        $Args += "scan"
        $Args += "--directory", $ProjectDir
        $Args += "--config", $ConfigFile
        if ($VerboseOutput) { $Args += "--verbose" }
    }

    "file" {
        if (-not $FilePath) {
            Write-Host "ERROR: File path required for 'file' command" -ForegroundColor Red
            Write-Host "Usage: .\guardian-local.ps1 file PATH" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Scanning file: $FilePath" -ForegroundColor Cyan
        $Args += "file"
        $Args += "--file", $FilePath
        $Args += "--config", $ConfigFile
    }

    "continuous" {
        Write-Host "Starting continuous monitoring..." -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        $Args += "continuous"
        $Args += "--directory", $ProjectDir
        $Args += "--config", $ConfigFile
    }

    "fix" {
        if (-not $FilePath) {
            Write-Host "ERROR: File path required for 'fix' command" -ForegroundColor Red
            Write-Host "Usage: .\guardian-local.ps1 fix PATH" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Auto-fixing file: $FilePath" -ForegroundColor Cyan
        $Args += "fix"
        $Args += "--file", $FilePath
        $Args += "--config", $ConfigFile
        if ($DryRun) {
            Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
            $Args += "--dry-run"
        }
    }

    "status" {
        Write-Host "Guardian Status" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Guardian Directory:" -ForegroundColor Gray
        Write-Host "  $GuardianDir" -ForegroundColor White
        Write-Host ""
        Write-Host "Virtual Environment:" -ForegroundColor Gray
        if (Test-Path $VenvPath) {
            Write-Host "  Installed at $VenvPath" -ForegroundColor Green
        } else {
            Write-Host "  Not installed" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Configuration:" -ForegroundColor Gray
        if (Test-Path $ConfigFile) {
            Write-Host "  Found at $ConfigFile" -ForegroundColor Green
        } else {
            Write-Host "  Not found" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Recent Reports:" -ForegroundColor Gray
        $ReportsDir = Join-Path $ProjectDir ".guardian\reports"
        if (Test-Path $ReportsDir) {
            $Reports = Get-ChildItem $ReportsDir -Filter "*.md" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
            if ($Reports) {
                foreach ($Report in $Reports) {
                    Write-Host "  $($Report.Name)" -ForegroundColor White
                    Write-Host "     Modified: $($Report.LastWriteTime)" -ForegroundColor Gray
                }
            } else {
                Write-Host "  No reports found" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Reports directory not found" -ForegroundColor Yellow
        }
        exit 0
    }

    "install" {
        Write-Host "Installing/Updating Guardian..." -ForegroundColor Cyan
        Push-Location $GuardianDir
        & .\install.ps1
        Pop-Location
        Write-Host ""
        Write-Host "Guardian installed successfully!" -ForegroundColor Green
        exit 0
    }
}

# Run Guardian
try {
    Write-Host ""
    & python $GuardianScript @Args

    Write-Host ""
    Write-Host "Guardian scan complete!" -ForegroundColor Green
    Write-Host "Report saved to: .guardian\reports\" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "Guardian encountered an error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Deactivate virtual environment
deactivate
