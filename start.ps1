# Start Claude Code in ClaudeHome with full permissions
$env:AI_HOME = "C:\Users\sava6\ClaudeHome"
Set-Location $env:AI_HOME

# MCP Efficiency Configuration
$env:MCP_TIMEOUT = "30000"
$env:MAX_MCP_OUTPUT_TOKENS = "50000"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host ""
Write-Host "  Starting Claude Code in ClaudeHome..." -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  MCP Efficiency: Enabled" -ForegroundColor Green
Write-Host "    - MCP_TIMEOUT: $env:MCP_TIMEOUT ms" -ForegroundColor Gray
Write-Host "    - MAX_MCP_OUTPUT_TOKENS: $env:MAX_MCP_OUTPUT_TOKENS" -ForegroundColor Gray
Write-Host ""

# Launch Claude Code with permissions bypass
claude --dangerously-skip-permissions
