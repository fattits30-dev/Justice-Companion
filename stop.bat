@echo off
title Justice Companion - Stop Services
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1" -StopAll
