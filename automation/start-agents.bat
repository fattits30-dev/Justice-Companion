@echo off
echo ============================================================
echo JUSTICE COMPANION - AGENT SUPERVISOR
echo Auto-restart enabled
echo ============================================================
echo.

cd /d "%~dp0.."
python automation\scripts\supervisor.py

pause
