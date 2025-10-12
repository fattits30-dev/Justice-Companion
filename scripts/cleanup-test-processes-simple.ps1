# Simple Test Process Cleanup Script
# Kills Electron and Node.js test processes

Write-Host ""
Write-Host "Justice Companion - Test Process Cleanup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Find Electron processes
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue

if ($electronProcesses) {
    Write-Host "Found $($electronProcesses.Count) Electron process(es)" -ForegroundColor Yellow
    foreach ($proc in $electronProcesses) {
        Write-Host "  PID: $($proc.Id) - Memory: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
    }
    Write-Host ""
    
    $electronProcesses | Stop-Process -Force
    Write-Host "Killed all Electron processes" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "No Electron processes found" -ForegroundColor Green
    Write-Host ""
}

# Find Node.js processes (excluding current session)
$currentPID = $PID
$parentPID = (Get-WmiObject Win32_Process -Filter "ProcessId=$currentPID").ParentProcessId

$allNodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPID -and $_.Id -ne $parentPID }

if ($allNodeProcesses) {
    Write-Host "Found $($allNodeProcesses.Count) Node.js process(es) (excluding current session)" -ForegroundColor Yellow
    foreach ($proc in $allNodeProcesses) {
        Write-Host "  PID: $($proc.Id) - Memory: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
    }
    Write-Host ""
    
    $allNodeProcesses | Stop-Process -Force
    Write-Host "Killed all Node.js processes" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "No Node.js processes found (excluding current session)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""

