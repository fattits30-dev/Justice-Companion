# Justice Companion - MCP Pre-Installation Script
# Installs all MCP servers before Claude Code startup for faster first launch

Write-Host "Justice Companion - MCP Pre-Installation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$mcps = @(
    "@modelcontextprotocol/server-memory",
    "@modelcontextprotocol/server-filesystem",
    "@modelcontextprotocol/server-github",
    "@modelcontextprotocol/server-git",
    "@modelcontextprotocol/server-sequential-thinking",
    "@modelcontextprotocol/server-fetch"
)

$installed = 0
$failed = 0

foreach ($mcp in $mcps) {
    Write-Host "Installing: $mcp" -ForegroundColor Yellow

    $result = npx -y $mcp --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Installed successfully" -ForegroundColor Green
        $installed++
    } else {
        Write-Host "  X Installation failed" -ForegroundColor Red
        $failed++
    }

    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installation Summary:" -ForegroundColor Cyan
Write-Host "  Installed: $installed/$($mcps.Count)" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  Failed: $failed" -ForegroundColor Red
} else {
    Write-Host "  Failed: $failed" -ForegroundColor Green
}
Write-Host ""

if ($failed -eq 0) {
    Write-Host "OK All MCPs ready! Restart Claude Code to activate." -ForegroundColor Green
} else {
    Write-Host "WARNING Some MCPs failed. Claude Code will retry on startup." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Close Claude Code" -ForegroundColor White
Write-Host "  2. Reopen Claude Code" -ForegroundColor White
Write-Host "  3. MCPs will auto-connect (check with /mcp list)" -ForegroundColor White
