# Justice Companion Process Manager (PowerShell)
#
# A diagnostic and process management utility for Justice Companion
#
# Usage:
#   .\scripts\process-manager.ps1 [command]
#
# Commands:
#   monitor   - Live monitoring (default)
#   list      - List processes once
#   kill      - Gracefully kill all processes
#   force     - Force kill all processes
#   status    - Quick status check

param(
    [Parameter(Position=0)]
    [ValidateSet("monitor", "list", "kill", "force", "status", "help")]
    [string]$Command = "monitor"
)

# Configuration
$AppName = "Justice Companion"
$ProcessNames = @("electron")
$GracePeriodSeconds = 5

# Colors
function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color -NoNewline
}

function Write-ColorLine {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

# Get all Justice Companion processes
function Get-JCProcesses {
    $allProcesses = @()

    foreach ($processName in $ProcessNames) {
        try {
            $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue

            foreach ($proc in $processes) {
                # Check if it's a Justice Companion process
                $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine

                $isJC = $false
                if ($cmdLine) {
                    $isJC = $cmdLine -match "justice|companion|electron\\main" -or $processName -eq "electron"
                }

                if ($isJC) {
                    # Determine process type
                    $type = "Main Process"
                    if ($cmdLine -match "--type=renderer") {
                        $type = "Renderer"
                    } elseif ($cmdLine -match "--type=gpu-process") {
                        $type = "GPU Process"
                    } elseif ($cmdLine -match "--type=utility") {
                        $type = "Utility"
                    }

                    $allProcesses += [PSCustomObject]@{
                        PID = $proc.Id
                        Name = $proc.Name
                        Memory = $proc.WorkingSet64
                        CPU = $proc.CPU
                        Status = if ($proc.Responding) { "Running" } else { "Not Responding" }
                        Type = $type
                        StartTime = $proc.StartTime
                    }
                }
            }
        } catch {
            # Process not found, continue
        }
    }

    return $allProcesses
}

# Format bytes to human-readable
function Format-Bytes {
    param([long]$Bytes)

    $kb = $Bytes / 1KB
    if ($kb -lt 1024) {
        return "{0:N0} KB" -f $kb
    }
    $mb = $kb / 1024
    return "{0:N1} MB" -f $mb
}

# Display process table
function Show-Processes {
    param($Processes)

    if ($Processes.Count -eq 0) {
        Write-ColorLine "No Justice Companion processes found." "Yellow"
        return
    }

    Write-ColorLine "════════════════════════════════════════════════════════════════════" "Cyan"
    Write-ColorLine "  $AppName - Active Processes" "White"
    Write-ColorLine "════════════════════════════════════════════════════════════════════" "Cyan"
    Write-Host ""

    Write-ColorLine "  PID      Memory      Status          Type" "White"
    Write-ColorLine "  ────────────────────────────────────────────────────────────────" "Cyan"

    # Group by type
    $mainProcs = $Processes | Where-Object { $_.Type -eq "Main Process" }
    $rendererProcs = $Processes | Where-Object { $_.Type -eq "Renderer" }
    $gpuProcs = $Processes | Where-Object { $_.Type -eq "GPU Process" }
    $utilityProcs = $Processes | Where-Object { $_.Type -eq "Utility" }

    # Display each type
    foreach ($p in $mainProcs) {
        $pidStr = $p.PID.ToString().PadRight(8)
        $memStr = (Format-Bytes $p.Memory).PadRight(11)
        $statusColor = if ($p.Status -eq "Running") { "Green" } else { "Red" }

        Write-ColorText "  $pidStr $memStr " "White"
        Write-ColorText $p.Status.PadRight(15) $statusColor
        Write-ColorLine " Magenta"
        Write-ColorText "" "White"
        Write-ColorLine $p.Type "Magenta"
    }

    foreach ($p in $rendererProcs) {
        $pidStr = $p.PID.ToString().PadRight(8)
        $memStr = (Format-Bytes $p.Memory).PadRight(11)
        $statusColor = if ($p.Status -eq "Running") { "Green" } else { "Red" }

        Write-ColorText "  $pidStr $memStr " "White"
        Write-ColorText $p.Status.PadRight(15) $statusColor
        Write-ColorLine " Blue"
        Write-ColorText "" "White"
        Write-ColorLine $p.Type "Blue"
    }

    foreach ($p in $gpuProcs) {
        $pidStr = $p.PID.ToString().PadRight(8)
        $memStr = (Format-Bytes $p.Memory).PadRight(11)
        $statusColor = if ($p.Status -eq "Running") { "Green" } else { "Red" }

        Write-ColorText "  $pidStr $memStr " "White"
        Write-ColorText $p.Status.PadRight(15) $statusColor
        Write-ColorLine " Green"
        Write-ColorText "" "White"
        Write-ColorLine $p.Type "Green"
    }

    foreach ($p in $utilityProcs) {
        $pidStr = $p.PID.ToString().PadRight(8)
        $memStr = (Format-Bytes $p.Memory).PadRight(11)
        $statusColor = if ($p.Status -eq "Running") { "Green" } else { "Red" }

        Write-ColorText "  $pidStr $memStr " "White"
        Write-ColorText $p.Status.PadRight(15) $statusColor
        Write-ColorLine " Cyan"
        Write-ColorText "" "White"
        Write-ColorLine $p.Type "Cyan"
    }

    Write-ColorLine "  ────────────────────────────────────────────────────────────────" "Cyan"

    # Summary
    $totalMemory = ($Processes | Measure-Object -Property Memory -Sum).Sum
    Write-Host ""
    Write-ColorText "  Total Processes: " "White"
    Write-ColorLine $Processes.Count "Yellow"
    Write-ColorText "  Total Memory:    " "White"
    Write-ColorLine (Format-Bytes $totalMemory) "Yellow"
    Write-ColorText "  Main:            " "White"
    Write-ColorLine $mainProcs.Count "White"
    Write-ColorText "  Renderer:        " "White"
    Write-ColorLine $rendererProcs.Count "White"
    Write-ColorText "  GPU:             " "White"
    Write-ColorLine $gpuProcs.Count "White"
    Write-ColorText "  Utility:         " "White"
    Write-ColorLine $utilityProcs.Count "White"

    Write-ColorLine "`n════════════════════════════════════════════════════════════════════" "Cyan"
    Write-Host ""
}

# Kill processes
function Stop-JCProcesses {
    param(
        [bool]$Force = $false,
        [bool]$Confirm = $true
    )

    $processes = Get-JCProcesses

    if ($processes.Count -eq 0) {
        Write-ColorLine "No processes to kill." "Yellow"
        return
    }

    if ($Confirm) {
        Write-ColorLine "`nFound $($processes.Count) Justice Companion process(es)`n" "Yellow"
        Show-Processes $processes

        $response = Read-Host "`nKill all processes? (yes/no)"
        if ($response -ne "yes" -and $response -ne "y") {
            Write-ColorLine "Kill cancelled." "Yellow"
            return
        }
    }

    Write-ColorLine "`n$( if ($Force) { 'Force killing' } else { 'Gracefully terminating' }) $($processes.Count) process(es)...`n" "Yellow"

    foreach ($proc in $processes) {
        try {
            if ($Force) {
                Stop-Process -Id $proc.PID -Force -ErrorAction Stop
            } else {
                Stop-Process -Id $proc.PID -ErrorAction Stop
            }
            Write-ColorLine "  ✓ Killed process $($proc.PID)" "Green"
        } catch {
            Write-ColorLine "  ✗ Failed to kill process $($proc.PID)" "Red"
        }
    }

    # Check for survivors if graceful
    if (-not $Force) {
        Write-ColorLine "`nWaiting $GracePeriodSeconds seconds for processes to exit..." "Cyan"
        Start-Sleep -Seconds $GracePeriodSeconds

        $survivors = Get-JCProcesses
        if ($survivors.Count -gt 0) {
            Write-ColorLine "`n$($survivors.Count) process(es) still running.`n" "Yellow"
            Show-Processes $survivors

            $response = Read-Host "`nForce kill remaining processes? (yes/no)"
            if ($response -eq "yes" -or $response -eq "y") {
                Stop-JCProcesses -Force $true -Confirm $false
            }
        } else {
            Write-ColorLine "`nAll processes terminated successfully." "Green"
        }
    }
}

# Monitor processes
function Start-Monitor {
    Write-ColorLine "Starting live process monitor..." "Cyan"
    Write-ColorLine "Press Ctrl+C to stop monitoring`n" "Yellow"

    try {
        while ($true) {
            Clear-Host

            Write-ColorLine "Justice Companion Process Monitor" "Cyan"
            Write-ColorLine "Last Update: $(Get-Date -Format 'HH:mm:ss')" "Cyan"
            Write-ColorLine "Refresh: Every 2 seconds`n" "Cyan"

            $processes = Get-JCProcesses
            Show-Processes $processes

            Write-ColorLine "Commands: Ctrl+C to exit" "Yellow"

            Start-Sleep -Seconds 2
        }
    } catch {
        Write-ColorLine "`n`nMonitor stopped." "Green"
    }
}

# Status check
function Show-Status {
    $processes = Get-JCProcesses

    if ($processes.Count -eq 0) {
        Write-ColorLine "Status: Not Running" "Yellow"
        Write-Host "No Justice Companion processes detected.`n"
        return
    }

    $totalMemory = ($processes | Measure-Object -Property Memory -Sum).Sum

    Write-ColorLine "Status: Running" "Green"
    Write-Host "Processes: $($processes.Count)"
    Write-Host "Memory: $(Format-Bytes $totalMemory)"
    Write-Host "PIDs: $($processes.PID -join ', ')`n"
}

# Display help
function Show-Help {
    Write-ColorLine "Justice Companion Process Manager (PowerShell)`n" "Cyan"
    Write-ColorLine "Usage:" "White"
    Write-Host "  .\scripts\process-manager.ps1 [command]`n"
    Write-ColorLine "Commands:" "White"
    Write-Host "  monitor   Live monitoring of all processes (refreshes every 2s)"
    Write-Host "  list      List all processes once"
    Write-Host "  status    Quick status check"
    Write-Host "  kill      Gracefully terminate all processes (with confirmation)"
    Write-Host "  force     Force kill all processes (with confirmation)"
    Write-Host "  help      Display this help message`n"
    Write-ColorLine "Examples:" "White"
    Write-Host "  .\scripts\process-manager.ps1 monitor"
    Write-Host "  .\scripts\process-manager.ps1 kill"
    Write-Host "  pnpm process:monitor`n"
}

# Main switch
switch ($Command) {
    "monitor" {
        Start-Monitor
    }
    "list" {
        $processes = Get-JCProcesses
        Show-Processes $processes
    }
    "status" {
        Show-Status
    }
    "kill" {
        Stop-JCProcesses -Force $false -Confirm $true
    }
    "force" {
        $processes = Get-JCProcesses
        if ($processes.Count -eq 0) {
            Write-ColorLine "No processes to kill." "Yellow"
        } else {
            Write-ColorLine "Force killing all processes...`n" "Red"
            Stop-JCProcesses -Force $true -Confirm $true
        }
    }
    "help" {
        Show-Help
    }
    default {
        Write-ColorLine "Unknown command: $Command`n" "Red"
        Show-Help
    }
}
