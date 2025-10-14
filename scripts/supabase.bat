@echo off
REM Supabase CLI wrapper for Windows
REM Usage: .\scripts\supabase.bat [command] [args...]
REM Example: .\scripts\supabase.bat db push

npx -y supabase@latest %*
