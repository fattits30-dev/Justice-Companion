@echo off
echo ============================================================
echo Justice Companion - Orchestrator Startup
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    exit /b 1
)

REM Check if .env exists
if not exist "automation\.env" (
    echo ERROR: automation\.env not found
    echo Please copy automation\.env.example to automation\.env and configure
    exit /b 1
)

REM Check if state directory exists
if not exist "automation\state" (
    echo Creating state directory...
    mkdir automation\state
)

REM Check if logs directory exists
if not exist "automation\logs" (
    echo Creating logs directory...
    mkdir automation\logs
)

echo Starting orchestrator...
echo Press Ctrl+C to stop
echo.
cd automation
python scripts/orchestrator.py
