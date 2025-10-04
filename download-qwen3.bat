@echo off
echo ========================================
echo  Qwen 3 8B Q4_K_M Model Downloader
echo ========================================
echo.
echo This will download the Qwen 3 8B model (~5GB)
echo to: %APPDATA%\justice-companion\models\
echo.
pause

cd /d "%APPDATA%\justice-companion\models"

echo.
echo Starting download...
echo.

hf download bartowski/Qwen_Qwen3-8B-GGUF Qwen_Qwen3-8B-Q4_K_M.gguf --local-dir .

echo.
echo ========================================
echo  Download Complete!
echo ========================================
echo.
echo Model saved to: %APPDATA%\justice-companion\models\
echo File: Qwen_Qwen3-8B-Q4_K_M.gguf
echo.
echo You can now run Justice Companion and it will
echo automatically use the integrated AI with your
echo AMD Radeon RX 6600 GPU acceleration!
echo.
pause
