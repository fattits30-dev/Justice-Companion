# Port Manager for Justice Companion
# Usage: .\port-manager.ps1 [command]
# Commands: status, kill, restart

param(
    [Parameter(Position=0)]
    [string]$Command = "status"
)

$ports = @{
    "Frontend" = 5176
    "Backend" = 8000
    "AI Service" = 8001
}

function Get-PortStatus {
    Write-Host "`n=== Justice Companion Port Status ===" -ForegroundColor Cyan
    foreach ($service in $ports.Keys) {
        $port = $ports[$service]
        $connections = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
        
        if ($connections) {
            $pids = @()
            foreach ($conn in $connections) {
                $parts = $conn.ToString().Trim() -split '\s+'
                $pid = $parts[-1]
                if ($pid -and $pid -ne "0" -and $pids -notcontains $pid) {
                    $pids += $pid
                }
            }
            
            if ($pids.Count -gt 1) {
                Write-Host "  $service (port $port): " -NoNewline
                Write-Host "WARNING - $($pids.Count) processes!" -ForegroundColor Red
                foreach ($p in $pids) {
                    try {
                        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                        Write-Host "    PID $p - $($proc.ProcessName)" -ForegroundColor Yellow
                    } catch {
                        Write-Host "    PID $p - (unknown)" -ForegroundColor Yellow
                    }
                }
            } else {
                Write-Host "  $service (port $port): " -NoNewline
                Write-Host "Running (PID $($pids[0]))" -ForegroundColor Green
            }
        } else {
            Write-Host "  $service (port $port): " -NoNewline
            Write-Host "Not running" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

function Kill-Port {
    param([int]$Port)
    
    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    $killed = 0
    
    foreach ($conn in $connections) {
        $parts = $conn.ToString().Trim() -split '\s+'
        $pid = $parts[-1]
        if ($pid -and $pid -ne "0") {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "  Killed PID $pid" -ForegroundColor Yellow
                $killed++
            } catch {
                Write-Host "  Failed to kill PID $pid" -ForegroundColor Red
            }
        }
    }
    return $killed
}

function Kill-AllPorts {
    Write-Host "`n=== Killing All Justice Companion Processes ===" -ForegroundColor Cyan
    foreach ($service in $ports.Keys) {
        $port = $ports[$service]
        Write-Host "$service (port $port):" -ForegroundColor White
        $killed = Kill-Port -Port $port
        if ($killed -eq 0) {
            Write-Host "  No processes found" -ForegroundColor Gray
        }
    }
    Write-Host "`nDone! All ports cleared." -ForegroundColor Green
    Write-Host ""
}

function Kill-SinglePort {
    param([int]$Port)
    Write-Host "`n=== Killing processes on port $Port ===" -ForegroundColor Cyan
    $killed = Kill-Port -Port $Port
    if ($killed -eq 0) {
        Write-Host "  No processes found" -ForegroundColor Gray
    } else {
        Write-Host "  Killed $killed process(es)" -ForegroundColor Green
    }
    Write-Host ""
}

# Main
switch ($Command.ToLower()) {
    "status" { Get-PortStatus }
    "kill" { Kill-AllPorts }
    "kill-frontend" { Kill-SinglePort -Port 5176 }
    "kill-backend" { Kill-SinglePort -Port 8000 }
    "kill-ai" { Kill-SinglePort -Port 8001 }
    default {
        Write-Host "`nUsage: .\port-manager.ps1 [command]" -ForegroundColor Cyan
        Write-Host "Commands:"
        Write-Host "  status        - Show what's running on each port"
        Write-Host "  kill          - Kill ALL Justice Companion processes"
        Write-Host "  kill-frontend - Kill frontend (5176)"
        Write-Host "  kill-backend  - Kill backend (8000)"
        Write-Host "  kill-ai       - Kill AI service (8001)"
        Write-Host ""
    }
}
