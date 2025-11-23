# Justice Companion - Start All Services
param(
    [switch]$StopAll,
    [switch]$StatusOnly
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Stop-AllServices {
    Write-Host "`nStopping all services..." -ForegroundColor Yellow

    # Kill by port
    $ports = @(5173, 5174, 5175, 5176, 5177, 8000, 8001)
    foreach ($port in $ports) {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conn) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped process on port $port" -ForegroundColor Green
        }
    }

    Write-Host "`nAll services stopped`n" -ForegroundColor Green
}

function Show-Status {
    Write-Host "`nService Status:" -ForegroundColor Cyan

    $services = @(
        @{ Name = "Frontend"; Port = 5173 },
        @{ Name = "Backend"; Port = 8000 },
        @{ Name = "AI Service"; Port = 8001 }
    )

    foreach ($svc in $services) {
        $conn = Get-NetTCPConnection -LocalPort $svc.Port -ErrorAction SilentlyContinue
        if ($conn) {
            Write-Host "  [OK] $($svc.Name): Running on port $($svc.Port)" -ForegroundColor Green
        } else {
            Write-Host "  [--] $($svc.Name): Not running" -ForegroundColor Red
        }
    }
    Write-Host ""
}

if ($StopAll) {
    Stop-AllServices
    exit 0
}

if ($StatusOnly) {
    Show-Status
    exit 0
}

# Start all services
Write-Host "`nStarting Justice Companion Services...`n" -ForegroundColor Cyan

# Stop any existing services first
Stop-AllServices

# Start Backend (FastAPI)
Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process -FilePath "py" -ArgumentList "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000" -WorkingDirectory $ProjectRoot -WindowStyle Hidden
Write-Host "  Backend started on http://localhost:8000" -ForegroundColor Green

# Start AI Service (FastAPI)
Write-Host "Starting AI Service..." -ForegroundColor Yellow
Start-Process -FilePath "py" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", "8001" -WorkingDirectory "$ProjectRoot\ai-service" -WindowStyle Hidden
Write-Host "  AI Service started on http://localhost:8001" -ForegroundColor Green

# Start Frontend (Vite)
Write-Host "Starting Frontend (Vite)..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $ProjectRoot -WindowStyle Hidden
Write-Host "  Frontend starting on http://localhost:5173" -ForegroundColor Green

# Wait for services to be ready
Write-Host "`nWaiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`nAll services started!" -ForegroundColor Green
Write-Host "Access your app at: http://localhost:5173`n" -ForegroundColor Cyan

# Show status
Show-Status
