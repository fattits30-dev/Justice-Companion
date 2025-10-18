# Fix all 30 TypeScript errors in electron-ipc-handlers.test.ts
$filePath = "F:\Justice Companion take 2\src\electron-ipc-handlers.test.ts"
$content = Get-Content $filePath -Raw

Write-Host "Fixing electron-ipc-handlers.test.ts errors..." -ForegroundColor Cyan

# Category 1: Remove incorrect userId properties (11 fixes)
Write-Host "  Removing incorrect userId properties from test data..." -ForegroundColor Yellow

# Lines 897, 918, 937, 1741, 1796, 1904: Remove userId from CreateCaseInput
$content = $content -replace '(?m)^(\s+)userId:\s+1,\s*\r?\n(\s+title:\s+[''"].*?[''"],\s*\r?\n\s+caseType:\s+[''"]employment[''"])', '$1title: $2'
$content = $content -replace '(?m)(\s+input:\s+\{)\s*\r?\n\s+userId:\s+1,\s*\r?\n', '$1' + "`r`n"

# Simpler approach: Direct line-by-line removal of userId in CreateCaseInput contexts
$content = $content -replace '(?m)^\s+userId:\s+1,\s*$\r?\n(?=\s+title:\s+[''"].*?Test)', ''

# Line 1060: Remove userId from UpdateCaseInput
$content = $content -replace '(?m)^\s+userId:\s+1,\s*$\r?\n(?=\s+title:\s+[''"].*?Updated)', ''

# Lines 1246, 1271, 1298: Remove userId from Evidence
$content = $content -replace '(?m)^\s+userId:\s+1,\s*$\r?\n(?=\s+caseId:)', ''

# Line 1340: Remove userId from UpdateEvidenceInput
$content = $content -replace '(?m)^\s+userId:\s+1,\s*$\r?\n(?=\s+title:\s+[''"].*?Updated)', ''

# Category 2: Add missing userId to CreateConversationInput (1 fix)
Write-Host "  Adding required userId to CreateConversationInput..." -ForegroundColor Yellow

# Line 1991: Add userId to CreateConversationInput
$content = $content -replace '(?m)(input:\s+\{\s*\r?\n)(\s+caseId:\s+1,\s*\r?\n\s+title:\s+[''"]Case Discussion[''"])', '$1            userId: 1,' + "`r`n" + '$2'

# Category 3: Prefix unused variables with underscore (17 fixes)
Write-Host "  Prefixing unused variables with underscore..." -ForegroundColor Yellow

# Fix unused 'request' parameters (11 instances)
$content = $content -replace '\((\w+Event:\s+any),\s+request:', '($1, _request:'

# Fix unused 'profile' variable (line 644)
$content = $content -replace '(?m)^(\s+)const\s+profile\s+=', '$1const _profile ='

# Fix unused 'mockDb' variable (line 728)
$content = $content -replace '(?m)^(\s+)const\s+mockDb\s+=', '$1const _mockDb ='

# Fix unused 'event' parameter with implicit any (line 861)
$content = $content -replace '\.on\(EncryptionEvents\.SECURE_WIPE_COMPLETED,\s+\(event\)', '.on(EncryptionEvents.SECURE_WIPE_COMPLETED, (_event: any)'

# Fix unused 'mockFs' variables (lines 2457, 2477, 2538)
$content = $content -replace '(?m)^(\s+)const\s+mockFs\s+=', '$1const _mockFs ='

# Fix unused 'mockStreamId' variable (line 2645)
$content = $content -replace '(?m)^(\s+)const\s+mockStreamId\s+=', '$1const _mockStreamId ='

# Fix unused 'mockEvent' variable (line 2684)
$content = $content -replace '(?m)^(\s+)const\s+mockEvent\s+=', '$1const _mockEvent ='

# Write the fixed content back
Set-Content $filePath $content -NoNewline

Write-Host "`nCompleted! Running type check..." -ForegroundColor Green
