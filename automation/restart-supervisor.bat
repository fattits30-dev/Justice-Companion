@echo off
echo Killing all agent processes...
taskkill /F /FI "WINDOWTITLE eq JUSTICE COMPANION*" 2>nul
timeout /t 2 /nobreak >nul

echo Restarting supervisor...
cd /d "%~dp0.."
start "JUSTICE COMPANION - SUPERVISOR" cmd /k "python automation\scripts\supervisor.py"

echo Done! Check the new window.
