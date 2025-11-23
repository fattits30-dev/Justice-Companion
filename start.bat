@echo off
title Justice Companion - All Services
echo.
echo ========================================
echo   Justice Companion - Starting Services
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"

pause
