# Final fix for electron-ipc-handlers.test.ts - Remove unused variables
$file = "F:\Justice Companion take 2\src\electron-ipc-handlers.test.ts"
$content = Get-Content $file -Raw

Write-Host "Applying final fixes..." -ForegroundColor Cyan

# Fix line 861: event parameter (change from 'event' to '_event: any')
Write-Host "  Fixing event parameter on line 861..." -ForegroundColor Yellow
$content = $content -replace '(?m)CHANNELS\.AI_STREAM_START,\s+async\s+\(event,\s+request:', 'CHANNELS.AI_STREAM_START, async (_event: any, request:'

# Remove unused variable declarations by commenting them out
Write-Host "  Commenting out unused variables..." -ForegroundColor Yellow

# Line 644: _profile (just remove the const declaration line)
$content = $content -replace '(?m)^\s+const _profile = mockUserProfileService\.getProfile\(\);\s*$\r?\n', ''

# Line 728: _mockDb (remove the const declaration)
$content = $content -replace '(?m)^\s+const _mockDb = database\.getDb\(\);\s*$\r?\n', ''

# Lines 2458, 2478, 2539: _mockFs (remove all three)
$content = $content -replace '(?m)^\s+const _mockFs = require\([''"]fs[''"].*?\);\s*$\r?\n', ''

# Line 2646: _mockStreamId
$content = $content -replace '(?m)^\s+const _mockStreamId = [''"]test-stream-[0-9]+-[0-9]+[''"];\s*$\r?\n', ''

# Line 2685: _mockEvent
$content = $content -replace '(?m)^\s+const _mockEvent = \{.*?mainWebContents.*?\};\s*$\r?\n', ''

# Write fixed content
Set-Content $file $content -NoNewline

Write-Host "Complete! Running type check..." -ForegroundColor Green
