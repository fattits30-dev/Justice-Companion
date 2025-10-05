@echo off
REM Installation Script for Dual Claude Orchestration System
REM Justice Companion Automation Framework

echo ========================================
echo Justice Companion Automation Setup
echo ========================================
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11+ from python.org
    pause
    exit /b 1
)

echo [1/5] Python found
echo.

REM Create virtual environment
echo [2/5] Creating Python virtual environment...
if not exist "automation\venv" (
    python -m venv automation\venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)
echo.

REM Activate and install dependencies
echo [3/5] Installing Python dependencies...
call automation\venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r automation\requirements.txt
echo Dependencies installed
echo.

REM Create .env file if not exists
echo [4/5] Configuring environment...
if not exist "automation\.env" (
    copy automation\.env.example automation\.env
    echo Created .env file from template
    echo.
    echo IMPORTANT: Edit automation\.env and add your ANTHROPIC_API_KEY
    echo Get your API key from: https://console.anthropic.com/
) else (
    echo .env file already exists
)
echo.

REM Test state management
echo [5/5] Testing state management...
python automation\scripts\state_manager.py
if errorlevel 1 (
    echo ERROR: State management test failed
    pause
    exit /b 1
)
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit automation\.env and add your ANTHROPIC_API_KEY
echo 2. Run: automation\venv\Scripts\activate.bat
echo 3. Run: python automation\scripts\orchestrator.py
echo.
echo Documentation: automation\README.md
echo.
pause
