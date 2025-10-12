# Check if better-sqlite3 binary is locked by any process
# Helps diagnose E2E test setup issues on Windows

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  better-sqlite3 Binary Lock Checker" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# Path to the binary
$binaryPath = Join-Path $PSScriptRoot "..\node_modules\.pnpm\better-sqlite3@12.4.1\node_modules\better-sqlite3\build\Release\better_sqlite3.node"

# Check if binary exists
if (Test-Path $binaryPath) {
    Write-Host "✓ Binary file found:" -ForegroundColor Green
    Write-Host "  $binaryPath" -ForegroundColor Gray
    
    $fileInfo = Get-Item $binaryPath
    Write-Host ""
    Write-Host "File Information:" -ForegroundColor Yellow
    Write-Host "  Size: $([math]::Round($fileInfo.Length/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "  Last Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✗ Binary file not found at expected location" -ForegroundColor Red
    Write-Host "  Expected: $binaryPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "This is normal if you haven't built the project yet." -ForegroundColor Yellow
    Write-Host "Run: pnpm install" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# Check for processes that might be locking the file
Write-Host "Checking for processes that might lock the binary..." -ForegroundColor Yellow
Write-Host ""

# Check Electron processes
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    Write-Host "⚠️  Found $($electronProcesses.Count) Electron process(es):" -ForegroundColor Yellow
    foreach ($proc in $electronProcesses) {
        Write-Host "   PID: $($proc.Id) | Memory: $([math]::Round($proc.WS/1MB, 2)) MB | Started: $($proc.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "   Recommendation: Close Electron (stop dev server)" -ForegroundColor Cyan
    Write-Host "   Command: Get-Process -Name 'electron' | Stop-Process -Force" -ForegroundColor DarkGray
    Write-Host ""
} else {
    Write-Host "✓ No Electron processes found" -ForegroundColor Green
    Write-Host ""
}

# Check Node.js processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "ℹ️  Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    
    $currentPID = $PID
    $parentPID = (Get-WmiObject Win32_Process -Filter "ProcessId=$currentPID").ParentProcessId
    
    foreach ($proc in $nodeProcesses) {
        if ($proc.Id -eq $currentPID -or $proc.Id -eq $parentPID) {
            Write-Host "   PID: $($proc.Id) | Memory: $([math]::Round($proc.WS/1MB, 2)) MB | (Current session - safe)" -ForegroundColor Green
        } else {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)").CommandLine
            Write-Host "   PID: $($proc.Id) | Memory: $([math]::Round($proc.WS/1MB, 2)) MB" -ForegroundColor Gray
            
            if ($cmdLine -match "playwright|test|vitest") {
                Write-Host "      → Test-related process" -ForegroundColor Yellow
            } elseif ($cmdLine -match "vite|dev|electron") {
                Write-Host "      → Dev server process" -ForegroundColor Yellow
            }
        }
    }
    Write-Host ""
    
    $otherNodeProcesses = $nodeProcesses | Where-Object { $_.Id -ne $currentPID -and $_.Id -ne $parentPID }
    if ($otherNodeProcesses) {
        Write-Host "   Recommendation: Close other Node.js processes if rebuild fails" -ForegroundColor Cyan
        Write-Host "   Command: Get-Process -Name 'node' | Where-Object { `$_.Id -ne $PID } | Stop-Process -Force" -ForegroundColor DarkGray
        Write-Host ""
    }
} else {
    Write-Host "✓ No Node.js processes found (except current session)" -ForegroundColor Green
    Write-Host ""
}

# Try to open the file to check if it's locked
Write-Host "Testing file lock status..." -ForegroundColor Yellow
try {
    $fileStream = [System.IO.File]::Open($binaryPath, 'Open', 'Read', 'None')
    $fileStream.Close()
    Write-Host "✓ Binary file is NOT locked - safe to rebuild" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Binary file IS LOCKED - cannot rebuild" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  This means a process is currently using the file." -ForegroundColor Yellow
    Write-Host "  You must close that process before rebuilding." -ForegroundColor Yellow
    Write-Host ""
}

# Summary and recommendations
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

if ($electronProcesses -or ($nodeProcesses -and $nodeProcesses.Count -gt 2)) {
    Write-Host "⚠️  Action Required:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Run the cleanup script:" -ForegroundColor White
    Write-Host "   pnpm run test:e2e:cleanup" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Or manually close processes:" -ForegroundColor White
    if ($electronProcesses) {
        Write-Host "   Get-Process -Name 'electron' | Stop-Process -Force" -ForegroundColor Cyan
    }
    if ($nodeProcesses -and $nodeProcesses.Count -gt 2) {
        Write-Host "   Get-Process -Name 'node' | Where-Object { `$_.Id -ne $PID } | Stop-Process -Force" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "3. Then rebuild:" -ForegroundColor White
    Write-Host "   pnpm rebuild:node" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "✓ System looks good - safe to rebuild" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: pnpm rebuild:node" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "📖 Full troubleshooting guide:" -ForegroundColor White
Write-Host "   docs/troubleshooting/E2E_TEST_SETUP.md" -ForegroundColor Cyan
Write-Host ""

