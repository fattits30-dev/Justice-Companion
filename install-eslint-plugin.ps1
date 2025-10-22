# Script to install eslint-plugin-import after closing all node processes
# This workaround is needed because the electron module is locked

Write-Host "Stopping all Node.js and Electron processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*electron*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Waiting for processes to fully terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Installing eslint-plugin-import..." -ForegroundColor Cyan
pnpm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Installation successful!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Installation failed. Please try manually:" -ForegroundColor Red
    Write-Host "  pnpm install" -ForegroundColor Yellow
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
