@echo off
REM Start Simple Orchestrator - No External Claude Instances
REM Justice Companion Automation Framework

echo ============================================================
echo Starting Simple Orchestrator
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to PATH
    pause
    exit /b 1
)

REM Check if .env exists
if not exist "%~dp0.env" (
    echo ERROR: .env file not found
    echo Please create automation/.env from .env.example
    pause
    exit /b 1
)

REM Navigate to automation directory
cd /d "%~dp0"

echo Starting orchestrator...
echo.
echo Press Ctrl+C to stop
echo.

python scripts\simple_orchestrator.py

echo.
echo Orchestrator stopped
pause
