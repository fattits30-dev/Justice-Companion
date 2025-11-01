@echo off
REM Nuclear option: Stop all processes, delete node_modules, reinstall
REM Justice Companion - Emergency Node Modules Fix Script

echo ============================================
echo NUCLEAR NODE_MODULES FIX
echo ============================================
echo.
echo This will:
echo   1. Kill all Node.js and Electron processes
echo   2. Delete node_modules directory
echo   3. Delete pnpm-lock.yaml
echo   4. Clear pnpm cache
echo   5. Run pnpm install
echo.
echo WARNING: This will terminate all running Node.js applications!
echo.

set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Cancelled
    exit /b 0
)

echo.
echo ============================================
echo Step 1: Killing processes...
echo ============================================
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo Killed node.exe processes
) else (
    echo No node.exe processes found
)

taskkill /F /IM electron.exe /T >nul 2>&1
if %errorlevel% equ 0 (
    echo Killed electron.exe processes
) else (
    echo No electron.exe processes found
)

timeout /t 2 /nobreak >nul
echo Done

echo.
echo ============================================
echo Step 2: Deleting node_modules...
echo ============================================
if exist node_modules (
    echo Deleting... (this may take a minute)
    rmdir /s /q node_modules 2>nul
    timeout /t 2 /nobreak >nul

    if exist node_modules (
        echo FAILED! node_modules still locked
        echo Try closing VS Code and running again
        exit /b 1
    )

    echo Done
) else (
    echo node_modules doesn't exist
)

echo.
echo ============================================
echo Step 3: Deleting pnpm-lock.yaml...
echo ============================================
if exist pnpm-lock.yaml (
    del pnpm-lock.yaml 2>nul
    echo Done
) else (
    echo pnpm-lock.yaml doesn't exist
)

echo.
echo ============================================
echo Step 4: Clearing pnpm cache...
echo ============================================
pnpm store prune
echo Done

echo.
echo ============================================
echo Step 5: Running pnpm install...
echo ============================================
echo This will take several minutes...
echo.

pnpm install

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo SUCCESS! Dependencies installed
    echo ============================================
    echo.
    echo Run 'verify-installation.ps1' to verify
    exit /b 0
) else (
    echo.
    echo ============================================
    echo FAILED! pnpm install failed
    echo ============================================
    echo.
    echo Check the errors above for details
    echo Common issues:
    echo   - Wrong Node.js version (need 20.18.0 LTS)
    echo   - Network connectivity issues
    echo   - Disk space issues
    exit /b 1
)
