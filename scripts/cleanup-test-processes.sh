#!/bin/bash
# Cleanup Test Processes Script (Bash version)
# Safely kills Playwright/Electron test processes

echo "Justice Companion - Test Process Cleanup"
echo "========================================="
echo ""

# Find and kill Electron processes
if pgrep -x "electron" > /dev/null; then
    echo "Found Electron processes:"
    ps aux | grep -i electron | grep -v grep
    echo ""
    read -p "Kill all Electron processes? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        pkill -9 electron 2>/dev/null || echo "No Electron processes to kill"
        echo "✓ Killed Electron processes"
    else
        echo "Skipped Electron processes"
    fi
else
    echo "No Electron processes found"
fi

echo ""
echo "Cleanup complete!"
