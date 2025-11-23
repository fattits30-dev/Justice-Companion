# Justice Companion Development Process Manager
# Prevents orphaned processes and port conflicts

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "status", "clean")]
    [string]$Action = "start"
)

$ErrorActionPreference = "SilentlyContinue"

# Configuration
$BACKEND_PORT = 8000
$FRONTEND_PORT = 5176
$PID_FILE = Join-Path $PSScriptRoot ".dev-pids.json"
$PROJECT_ROOT = Split-Path $PSScriptRoot -Parent

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $color = switch ($Type) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        default { "Cyan" }
    }
    Write-Host "[$Type] $Message" -ForegroundColor $color
}

function Get-PortProcesses {
    param([int]$Port)
    # Only match LISTENING connections on the specific port (not TIME_WAIT, SYN_SENT, etc.)
    $pids = @()
    $netstatOutput = netstat -ano 2>&1
    foreach ($line in $netstatOutput) {
        # Match lines with LISTENING and the specific port
        if ($line -match "LISTENING" -and $line -match ":$Port\s") {
            if ($line -match '\s+(\d+)\s*$') {
                $pid = [int]$matches[1]
                if ($pid -ne 0 -and $pids -notcontains $pid) {
                    $pids += $pid
                }
            }
        }
    }
    return $pids
}

function Stop-PortProcesses {
    param([int]$Port)
    $pids = Get-PortProcesses -Port $Port
    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Status "Killing process $pid ($($proc.ProcessName)) on port $Port" "WARN"
                # Use taskkill for more reliable termination
                & taskkill /F /PID $pid 2>&1 | Out-Null
            }
        } catch {
            # Process already gone
        }
    }
    # Wait for port to be released
    Start-Sleep -Milliseconds 500
}

function Save-Pids {
    param([hashtable]$Pids)
    $Pids | ConvertTo-Json | Set-Content $PID_FILE
}

function Load-Pids {
    if (Test-Path $PID_FILE) {
        try {
            $content = Get-Content $PID_FILE -Raw | ConvertFrom-Json
            return @{
                backend = $content.backend
                frontend = $content.frontend
            }
        } catch {
            return @{ backend = $null; frontend = $null }
        }
    }
    return @{ backend = $null; frontend = $null }
}

function Clear-Pids {
    if (Test-Path $PID_FILE) {
        Remove-Item $PID_FILE -Force
    }
}

function Start-Development {
    Write-Status "Starting Justice Companion Development Environment" "INFO"

    # Clean up any existing processes on our ports
    Write-Status "Cleaning up existing processes..."
    Stop-PortProcesses -Port $BACKEND_PORT
    Stop-PortProcesses -Port $FRONTEND_PORT

    # Kill any tracked processes from previous run
    $oldPids = Load-Pids
    if ($oldPids.backend) {
        Stop-Process -Id $oldPids.backend -Force -ErrorAction SilentlyContinue
    }
    if ($oldPids.frontend) {
        Stop-Process -Id $oldPids.frontend -Force -ErrorAction SilentlyContinue
    }

    # Small delay to ensure ports are released
    Start-Sleep -Milliseconds 500

    # Verify ports are free
    $backendPids = Get-PortProcesses -Port $BACKEND_PORT
    $frontendPids = Get-PortProcesses -Port $FRONTEND_PORT

    if ($backendPids.Count -gt 0) {
        Write-Status "Port $BACKEND_PORT still in use by PIDs: $($backendPids -join ', ')" "ERROR"
        Write-Status "Run 'dev-manager.ps1 clean' to force cleanup" "WARN"
        return
    }

    if ($frontendPids.Count -gt 0) {
        Write-Status "Port $FRONTEND_PORT still in use by PIDs: $($frontendPids -join ', ')" "ERROR"
        Write-Status "Run 'dev-manager.ps1 clean' to force cleanup" "WARN"
        return
    }

    Write-Status "Starting backend on port $BACKEND_PORT..." "INFO"
    $backendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$BACKEND_PORT", "--reload" -WorkingDirectory "$PROJECT_ROOT\backend" -PassThru -WindowStyle Hidden

    Write-Status "Starting frontend on port $FRONTEND_PORT..." "INFO"
    $frontendProcess = Start-Process -FilePath "npx" -ArgumentList "vite", "--host", "0.0.0.0", "--port", "$FRONTEND_PORT" -WorkingDirectory $PROJECT_ROOT -PassThru -WindowStyle Hidden

    # Save PIDs
    $pids = @{
        backend = $backendProcess.Id
        frontend = $frontendProcess.Id
        startTime = Get-Date -Format "o"
    }
    Save-Pids -Pids $pids

    # Wait for services to start
    Write-Status "Waiting for services to start..." "INFO"
    Start-Sleep -Seconds 3

    # Verify services are running
    $backendRunning = Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    $frontendRunning = Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue

    if ($backendRunning -and $frontendRunning) {
        Write-Status "Development environment started successfully!" "SUCCESS"
        Write-Status "Backend:  http://localhost:$BACKEND_PORT" "INFO"
        Write-Status "Frontend: http://localhost:$FRONTEND_PORT" "INFO"
        Write-Status "PIDs - Backend: $($backendProcess.Id), Frontend: $($frontendProcess.Id)" "INFO"
    } else {
        Write-Status "Some services failed to start. Check logs." "ERROR"
    }
}

function Stop-Development {
    Write-Status "Stopping Justice Companion Development Environment" "INFO"

    $pids = Load-Pids
    $stopped = @()

    if ($pids.backend) {
        try {
            Stop-Process -Id $pids.backend -Force -ErrorAction Stop
            $stopped += "Backend (PID: $($pids.backend))"
        } catch {
            Write-Status "Backend process $($pids.backend) not found" "WARN"
        }
    }

    if ($pids.frontend) {
        try {
            Stop-Process -Id $pids.frontend -Force -ErrorAction Stop
            $stopped += "Frontend (PID: $($pids.frontend))"
        } catch {
            Write-Status "Frontend process $($pids.frontend) not found" "WARN"
        }
    }

    # Also clean up any orphaned processes on our ports
    Stop-PortProcesses -Port $BACKEND_PORT
    Stop-PortProcesses -Port $FRONTEND_PORT

    Clear-Pids

    if ($stopped.Count -gt 0) {
        Write-Status "Stopped: $($stopped -join ', ')" "SUCCESS"
    } else {
        Write-Status "No tracked processes to stop" "INFO"
    }
}

function Get-Status {
    Write-Status "Justice Companion Development Status" "INFO"
    Write-Host ""

    $pids = Load-Pids

    # Check backend
    $backendPids = Get-PortProcesses -Port $BACKEND_PORT
    if ($backendPids.Count -gt 0) {
        Write-Host "Backend (port $BACKEND_PORT):" -ForegroundColor Green
        foreach ($pid in $backendPids) {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                $tracked = if ($pid -eq $pids.backend) { " [TRACKED]" } else { " [ORPHAN]" }
                Write-Host "  PID $pid - $($proc.ProcessName)$tracked"
            }
        }
    } else {
        Write-Host "Backend (port $BACKEND_PORT): " -NoNewline
        Write-Host "NOT RUNNING" -ForegroundColor Red
    }

    Write-Host ""

    # Check frontend
    $frontendPids = Get-PortProcesses -Port $FRONTEND_PORT
    if ($frontendPids.Count -gt 0) {
        Write-Host "Frontend (port $FRONTEND_PORT):" -ForegroundColor Green
        foreach ($pid in $frontendPids) {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                $tracked = if ($pid -eq $pids.frontend) { " [TRACKED]" } else { " [ORPHAN]" }
                Write-Host "  PID $pid - $($proc.ProcessName)$tracked"
            }
        }
    } else {
        Write-Host "Frontend (port $FRONTEND_PORT): " -NoNewline
        Write-Host "NOT RUNNING" -ForegroundColor Red
    }

    if ($pids.startTime) {
        Write-Host ""
        Write-Host "Started: $($pids.startTime)" -ForegroundColor Gray
    }
}

function Clean-All {
    Write-Status "Force cleaning all Justice Companion processes" "WARN"

    # Kill all processes on our ports
    Stop-PortProcesses -Port $BACKEND_PORT
    Stop-PortProcesses -Port $FRONTEND_PORT

    # Kill tracked processes
    $pids = Load-Pids
    if ($pids.backend) {
        Stop-Process -Id $pids.backend -Force -ErrorAction SilentlyContinue
    }
    if ($pids.frontend) {
        Stop-Process -Id $pids.frontend -Force -ErrorAction SilentlyContinue
    }

    Clear-Pids

    Write-Status "Cleanup complete" "SUCCESS"
}

# Main execution
switch ($Action) {
    "start" { Start-Development }
    "stop" { Stop-Development }
    "status" { Get-Status }
    "clean" { Clean-All }
}
