@echo off
REM Local Cerberus Guardian Runner for Justice Companion
REM Usage: guardian-local.bat [scan|file|continuous]

SET GUARDIAN_DIR=C:\Users\sava6\Desktop\codebase-guardian
SET PROJECT_DIR=%~dp0

echo.
echo 🐺 Cerberus Guardian - Local Runner
echo ===================================
echo.

REM Check if Guardian directory exists
if not exist "%GUARDIAN_DIR%" (
    echo ❌ ERROR: Guardian directory not found at %GUARDIAN_DIR%
    echo.
    echo Please ensure Cerberus Guardian is installed at:
    echo C:\Users\sava6\Desktop\codebase-guardian
    exit /b 1
)

REM Check if Python environment exists
if not exist "%GUARDIAN_DIR%\.venv\" (
    echo ⚠️  Python virtual environment not found
    echo 📦 Installing Guardian...
    cd "%GUARDIAN_DIR%"
    call install.ps1
    cd "%PROJECT_DIR%"
)

REM Activate Guardian environment
call "%GUARDIAN_DIR%\.venv\Scripts\activate.bat"

REM Set project-specific config
set GUARDIAN_CONFIG=%PROJECT_DIR%\.guardian\config.yaml

echo 📁 Project: Justice Companion
echo 📂 Location: %PROJECT_DIR%
echo ⚙️  Config: %GUARDIAN_CONFIG%
echo.

REM Run Guardian based on command
if "%1"=="" (
    echo Running quick scan...
    python "%GUARDIAN_DIR%\guardian.py" scan --directory "%PROJECT_DIR%" --config "%GUARDIAN_CONFIG%"
) else if "%1"=="scan" (
    echo Running full scan...
    python "%GUARDIAN_DIR%\guardian.py" scan --directory "%PROJECT_DIR%" --config "%GUARDIAN_CONFIG%"
) else if "%1"=="file" (
    echo Scanning single file: %2
    python "%GUARDIAN_DIR%\guardian.py" file --file "%2" --config "%GUARDIAN_CONFIG%"
) else if "%1"=="continuous" (
    echo Starting continuous monitoring...
    python "%GUARDIAN_DIR%\guardian.py" continuous --directory "%PROJECT_DIR%" --config "%GUARDIAN_CONFIG%"
) else if "%1"=="fix" (
    echo Running auto-fix on: %2
    python "%GUARDIAN_DIR%\guardian.py" fix --file "%2" --config "%GUARDIAN_CONFIG%"
) else (
    echo Unknown command: %1
    echo.
    echo Usage:
    echo   guardian-local.bat              - Quick scan
    echo   guardian-local.bat scan         - Full scan
    echo   guardian-local.bat file [path]  - Scan single file
    echo   guardian-local.bat continuous   - Monitor for changes
    echo   guardian-local.bat fix [path]   - Auto-fix file
    exit /b 1
)

echo.
echo ✅ Guardian scan complete!
echo 📊 Report saved to: .guardian\reports\
echo.

pause
