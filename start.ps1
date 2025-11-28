# Justice Companion - Development Startup Script
# Starts all 3 services: Backend (FastAPI), Frontend (Vite), AI Service

$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "  Justice Companion - Starting All Services" -ForegroundColor Cyan
Write-Host "  ===========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any zombie processes on our ports FIRST
Write-Host "  [0/3] Cleaning up zombie processes..." -ForegroundColor Yellow
Get-Process python* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "        Done" -ForegroundColor Green

# Check if venv exists
$VenvPath = Join-Path $ProjectRoot ".venv"
$PythonExe = Join-Path $VenvPath "Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "  [ERROR] Python virtual environment not found at $VenvPath" -ForegroundColor Red
    Write-Host "  Run: python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r backend/requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Start Backend (FastAPI on port 8000) - runs from project root
Write-Host "  [1/3] Starting Backend (FastAPI on port 8000)..." -ForegroundColor Green
$BackendCmd = @"
Set-Location '$ProjectRoot'
Write-Host 'Starting FastAPI Backend...' -ForegroundColor Cyan
& '$PythonExe' -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd

# Wait for backend to start
Start-Sleep -Seconds 3

# Start AI Service (on port 8001) - runs from ai-service folder
Write-Host "  [2/3] Starting AI Service (on port 8001)..." -ForegroundColor Green
$AIServiceCmd = @"
Set-Location '$ProjectRoot\ai-service'
Write-Host 'Starting AI Service...' -ForegroundColor Cyan
& '$PythonExe' -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $AIServiceCmd

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend (Vite on port 5176) - runs from project root
Write-Host "  [3/3] Starting Frontend (Vite on port 5176)..." -ForegroundColor Green
$FrontendCmd = @"
Set-Location '$ProjectRoot'
Write-Host 'Starting Vite Frontend...' -ForegroundColor Cyan
pnpm dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd

Write-Host ""
Write-Host "  All services starting in separate windows:" -ForegroundColor Cyan
Write-Host "    - Backend API:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "    - AI Service:   http://127.0.0.1:8001" -ForegroundColor White
Write-Host "    - Frontend UI:  http://localhost:5176" -ForegroundColor White
Write-Host "    - API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C in each window to stop services" -ForegroundColor Yellow
Write-Host ""
