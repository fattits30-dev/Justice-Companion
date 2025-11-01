@echo off
echo Starting Claude Code with bypass permissions mode...
echo.
echo WARNING: This will bypass ALL permission checks!
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

cd /d C:\
claude --permission-mode bypassPermissions

echo.
echo Claude Code has been closed.
pause
