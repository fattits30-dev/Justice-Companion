@echo off
REM Multi-Agent Launcher - Justice Companion
REM Starts each agent in a separate window so you can monitor them

echo ============================================================
echo Justice Companion Multi-Agent System
echo ============================================================
echo.
echo Starting agents in separate windows...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not installed
    pause
    exit /b 1
)

cd /d "%~dp0"

REM Start File Monitor Agent (Terminal 1)
echo [1/2] Starting File Monitor Agent...
start "File Monitor Agent" cmd /k "python agents\file_monitor_agent.py"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start Test Runner Agent (Terminal 2)
echo [2/3] Starting Test Runner Agent...
start "Test Runner Agent" cmd /k "python agents\test_runner_agent.py"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start Fix Suggester Agent (Terminal 3) - OPTIONAL
echo [3/3] Starting Fix Suggester Agent (AI-powered)...
start "Fix Suggester Agent" cmd /k "python agents\fix_suggester_agent.py"

echo.
echo ============================================================
echo Multi-Agent System Started!
echo ============================================================
echo.
echo You should now see 3 terminal windows:
echo   1. File Monitor Agent     - Watches for file changes
echo   2. Test Runner Agent      - Runs tests when files change
echo   3. Fix Suggester Agent    - AI-powered fix analysis (requires approval)
echo.
echo Each agent shows its own output - you can monitor them independently!
echo.
echo NOTE: Fix Suggester Agent requires 'claude' CLI to be installed
echo If not available, close that window - other agents work independently
echo.
echo To stop: Close each terminal window or press Ctrl+C in each
echo.
pause
