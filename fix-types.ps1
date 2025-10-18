# Comprehensive TypeScript fixes for electron-ipc-handlers.test.ts
$filePath = 'src\electron-ipc-handlers.test.ts'
$content = Get-Content $filePath -Raw

Write-Host "Applying comprehensive TypeScript fixes..." -ForegroundColor Cyan

# 1. Fix Type '{}' not assignable to void - replace .mockReturnValue({}) with .mockReturnValue(undefined)
$content = $content -replace '\.mockReturnValue\(\{\}\)', '.mockReturnValue(undefined)'

# 2. Prefix unused variables with underscore
$content = $content -replace '(const|let)\s+profile\s+=', '$1 _profile ='
$content = $content -replace '(const|let)\s+mockDb\s+=', '$1 _mockDb ='
$content = $content -replace '(const|let)\s+mockFs\s+=', '$1 _mockFs ='
$content = $content -replace '(const|let)\s+mockStreamId\s+=', '$1 _mockStreamId ='
$content = $content -replace '(const|let)\s+mockEvent\s+=', '$1 _mockEvent ='

Write-Host "Writing fixed content..." -ForegroundColor Green
Set-Content $filePath -Value $content -NoNewline

Write-Host "Done! Fixes applied successfully." -ForegroundColor Green
