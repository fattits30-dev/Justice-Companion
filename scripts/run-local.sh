#!/bin/bash
# Run Justice Companion in local-first mode for testing

cd /data/data/com.termux/files/home/Justice-Companion

# Ensure local mode is enabled
if [ ! -f .env.local ]; then
  echo "VITE_LOCAL_MODE=true" > .env.local
  echo "Created .env.local with local mode enabled"
fi

echo "Starting Justice Companion in LOCAL-FIRST mode..."
echo "Access at: http://localhost:5173"
echo "Press Ctrl+C to stop"
echo ""

npm run dev -- --host
