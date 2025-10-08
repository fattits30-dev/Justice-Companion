@echo off
echo Stopping orchestrator...

REM Read PID from state file
python -c "import json; state=json.load(open('automation/state/app_state.json')); print(state['processes']['orchestrator']['pid'])" > temp_pid.txt 2>nul
set /p PID=<temp_pid.txt
del temp_pid.txt

if "%PID%"=="None" (
    echo Orchestrator is not running
    exit /b 0
)

echo Killing process %PID%...
taskkill /F /PID %PID%

echo Orchestrator stopped
