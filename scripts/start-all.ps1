# Justice Companion - Start All Services
# ========================================
# Starts Frontend, Backend, and AI Service
#
# Usage:
#   .\start-all.ps1           # Start all services
#   .\start-all.ps1 -StopAll  # Stop all services
#   .\start-all.ps1 -Status   # Check service status
#
param(
    [switch]$StopAll,
    [switch]$Status,
    [switch]$AIOnly,
    [switch]$NoAI
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Stop-AllServices {
    Write-Host "`n🛑 Stopping all services..." -ForegroundColor Yellow

    $ports = @(5173, 5174, 5175, 5176, 5177, 8000, 8001)
    foreach ($port in $ports) {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conn) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Stopped process on port $port" -ForegroundColor Green
        }
    }

    Write-Host "`n✅ All services stopped`n" -ForegroundColor Green
}

function Show-Status {
    Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────" -ForegroundColor DarkGray

    $services = @(
        @{ Name = "Frontend (React)"; Port = 5176; Emoji = "⚛️" },
        @{ Name = "Backend (FastAPI)"; Port = 8000; Emoji = "🐍" },
        @{ Name = "AI Service (HuggingFace)"; Port = 8001; Emoji = "🤖" }
    )

    foreach ($svc in $services) {
        $conn = Get-NetTCPConnection -LocalPort $svc.Port -ErrorAction SilentlyContinue
        if ($conn) {
            Write-Host "  $($svc.Emoji) $($svc.Name): " -NoNewline
            Write-Host "Running" -ForegroundColor Green -NoNewline
            Write-Host " on http://localhost:$($svc.Port)" -ForegroundColor DarkGray
        } else {
            Write-Host "  $($svc.Emoji) $($svc.Name): " -NoNewline
            Write-Host "Not running" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Test-ServiceHealth {
    param([int]$Port, [string]$Endpoint = "/health")
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port$Endpoint" -TimeoutSec 2 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Handle flags
if ($StopAll) {
    Stop-AllServices
    exit 0
}

if ($Status) {
    Show-Status
    exit 0
}

# Banner
Write-Host @"

   ⚖️  JUSTICE COMPANION
   ═══════════════════════════════════════
   Privacy-First Legal Case Management

"@ -ForegroundColor Cyan

# Stop any existing services first
Stop-AllServices

# Start Backend (FastAPI)
Write-Host "🐍 Starting Backend (FastAPI)..." -ForegroundColor Yellow
$backendEnv = @{
    PYTHONPATH = $ProjectRoot
}
$env:PYTHONPATH = $ProjectRoot
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -WorkingDirectory $ProjectRoot -WindowStyle Hidden
Write-Host "   ✓ Backend starting on http://localhost:8000" -ForegroundColor Green

# Start AI Service (if not disabled)
if (-not $NoAI) {
    Write-Host "🤖 Starting AI Service (HuggingFace)..." -ForegroundColor Yellow
    Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8001" -WorkingDirectory "$ProjectRoot\ai-service" -WindowStyle Hidden
    Write-Host "   ✓ AI Service starting on http://localhost:8001" -ForegroundColor Green
} else {
    Write-Host "🤖 AI Service: " -NoNewline -ForegroundColor Yellow
    Write-Host "Skipped (--NoAI flag)" -ForegroundColor DarkGray
}

# Start Frontend (Vite) - unless AI only mode
if (-not $AIOnly) {
    Write-Host "⚛️  Starting Frontend (Vite + React)..." -ForegroundColor Yellow
    Start-Process -FilePath "pnpm" -ArgumentList "run", "dev" -WorkingDirectory $ProjectRoot -WindowStyle Hidden
    Write-Host "   ✓ Frontend starting on http://localhost:5176" -ForegroundColor Green
}

# Wait for services to be ready
Write-Host "`n⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Health check
Write-Host "`n🔍 Health Checks:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────" -ForegroundColor DarkGray

$backendHealthy = Test-ServiceHealth -Port 8000 -Endpoint "/health"
Write-Host "   Backend:    " -NoNewline
if ($backendHealthy) { Write-Host "✓ Healthy" -ForegroundColor Green } 
else { Write-Host "⏳ Starting..." -ForegroundColor Yellow }

if (-not $NoAI) {
    $aiHealthy = Test-ServiceHealth -Port 8001 -Endpoint "/health"
    Write-Host "   AI Service: " -NoNewline
    if ($aiHealthy) { Write-Host "✓ Healthy" -ForegroundColor Green }
    else { Write-Host "⏳ Starting..." -ForegroundColor Yellow }
}

# Final message
Write-Host @"

═══════════════════════════════════════════════════════
  🚀 Justice Companion is ready!
  
  Frontend:   http://localhost:5176
  Backend:    http://localhost:8000
  AI Service: http://localhost:8001
  
  To stop all services: .\scripts\start-all.ps1 -StopAll
═══════════════════════════════════════════════════════

"@ -ForegroundColor Cyan
