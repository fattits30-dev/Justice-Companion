# Cleanup Test Processes Script
# Safely kills Playwright/Electron test processes without affecting the current session

Write-Host "Justice Companion - Test Process Cleanup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Get current process ID to avoid killing ourselves
$currentPID = $PID
$parentPID = (Get-WmiObject Win32_Process -Filter "ProcessId=$currentPID").ParentProcessId

Write-Host "Current PowerShell PID: $currentPID" -ForegroundColor Yellow
Write-Host "Parent Process PID: $parentPID" -ForegroundColor Yellow
Write-Host ""

# Find Electron processes
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue

if ($electronProcesses) {
    Write-Host "Found $($electronProcesses.Count) Electron process(es):" -ForegroundColor Yellow
    foreach ($proc in $electronProcesses) {
        Write-Host "  PID: $($proc.Id) - Memory: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
    }

    $confirm = Read-Host "Kill all Electron processes? (y/n)"
    if ($confirm -eq "y") {
        $electronProcesses | Stop-Process -Force
        Write-Host "✓ Killed Electron processes" -ForegroundColor Green
    } else {
        Write-Host "Skipped Electron processes" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "No Electron processes found" -ForegroundColor Green
    Write-Host ""
}

# Find Playwright test processes (node processes with high memory usage, likely tests)
$allNodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object { $_.Id -ne $currentPID -and $_.Id -ne $parentPID }

if ($allNodeProcesses) {
    # Separate likely test processes (high memory usage > 100MB)
    $testProcesses = $allNodeProcesses | Where-Object { $_.WS -gt 100MB }

    if ($testProcesses) {
        Write-Host "Found $($testProcesses.Count) likely test process(es) (>100MB memory):" -ForegroundColor Yellow
        foreach ($proc in $testProcesses) {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)").CommandLine
            Write-Host "  PID: $($proc.Id) - Memory: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
            if ($cmdLine -match "playwright|test|vitest") {
                Write-Host "    -> Test-related: $($cmdLine.Substring(0, [Math]::Min(80, $cmdLine.Length)))" -ForegroundColor DarkGray
            }
        }

        $confirm = Read-Host "Kill likely test processes? (y/n)"
        if ($confirm -eq "y") {
            $testProcesses | Stop-Process -Force
            Write-Host "✓ Killed $($testProcesses.Count) test process(es)" -ForegroundColor Green
        } else {
            Write-Host "Skipped test processes" -ForegroundColor Gray
        }
    } else {
        Write-Host "No high-memory test processes found" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Total node.exe processes: $($allNodeProcesses.Count)" -ForegroundColor Cyan
    Write-Host "(Protected current session from cleanup)" -ForegroundColor Green
} else {
    Write-Host "No node processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
