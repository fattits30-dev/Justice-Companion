# Justice Companion - Start All Services
# =======================================
# Launches Frontend, Backend, and AI Service

param(
    [switch]$DevMode = $true,
    [switch]$SkipAI = $false
)

$ErrorActionPreference = "Continue"

# Colors
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "
╔═══════════════════════════════════════════════════════════════╗
║           JUSTICE COMPANION - SERVICE LAUNCHER                 ║
║                 Three-Service Architecture                     ║
╚═══════════════════════════════════════════════════════════════╝
"

# Project root
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $ProjectRoot

Write-Output "Project Root: $ProjectRoot"
Write-Output ""

# Service ports
$FRONTEND_PORT = 5176
$BACKEND_PORT = 8000
$AI_SERVICE_PORT = 8001

# Track PIDs
$pids = @{}

# Function to start a service
function Start-Service {
    param(
        [string]$Name,
        [string]$Directory,
        [string]$Command,
        [int]$Port
    )
    
    Write-ColorOutput Yellow "Starting $Name on port $Port..."
    
    $fullPath = Join-Path $ProjectRoot $Directory
    
    if (-not (Test-Path $fullPath)) {
        Write-ColorOutput Red "Directory not found: $fullPath"
        return $null
    }
    
    $process = Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$fullPath'; $Command"
    ) -PassThru -WindowStyle Normal
    
    Start-Sleep -Seconds 2
    
    if ($process -and -not $process.HasExited) {
        Write-ColorOutput Green "✓ $Name started (PID: $($process.Id))"
        return $process.Id
    } else {
        Write-ColorOutput Red "✗ $Name failed to start"
        return $null
    }
}

