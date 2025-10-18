# Fix electron-ipc-handlers.test.ts TypeScript errors - Direct approach
$file = "F:\Justice Companion take 2\src\electron-ipc-handlers.test.ts"
$lines = Get-Content $file

Write-Host "Fixing 30 TypeScript errors..." -ForegroundColor Cyan

# Fix unused 'request' parameters (prefix with _)
Write-Host "  Fixing unused 'request' parameters..." -ForegroundColor Yellow
$lines[206] = $lines[206] -replace ', request:', ', _request:'
$lines[258] = $lines[258] -replace ', request:', ', _request:'
$lines[349] = $lines[349] -replace ', request:', ', _request:'
$lines[390] = $lines[390] -replace ', request:', ', _request:'
$lines[416] = $lines[416] -replace ', request:', ', _request:'
$lines[429] = $lines[429] -replace ', request:', ', _request:'
$lines[639] = $lines[639] -replace ', request:', ', _request:'
$lines[775] = $lines[775] -replace ', request:', ', _request:'
$lines[847] = $lines[847] -replace ', request:', ', _request:'

# Fix unused 'profile' variable (line 644)
Write-Host "  Fixing unused 'profile' variable..." -ForegroundColor Yellow
$lines[643] = $lines[643] -replace 'const profile =', 'const _profile ='

# Fix unused 'mockDb' variable (line 728)
Write-Host "  Fixing unused 'mockDb' variable..." -ForegroundColor Yellow
$lines[727] = $lines[727] -replace 'const mockDb =', 'const _mockDb ='

# Fix unused 'event' parameter with type annotation (line 861)
Write-Host "  Fixing unused 'event' parameter..." -ForegroundColor Yellow
$lines[860] = $lines[860] -replace '\(event\)', '(_event: any)'

# Fix unused 'mockFs' variables (lines 2457, 2477, 2538)
Write-Host "  Fixing unused 'mockFs' variables..." -ForegroundColor Yellow
$lines[2456] = $lines[2456] -replace 'const mockFs =', 'const _mockFs ='
$lines[2476] = $lines[2476] -replace 'const mockFs =', 'const _mockFs ='
$lines[2537] = $lines[2537] -replace 'const mockFs =', 'const _mockFs ='

# Fix unused 'mockStreamId' variable (line 2645)
Write-Host "  Fixing unused 'mockStreamId' variable..." -ForegroundColor Yellow
$lines[2644] = $lines[2644] -replace 'const mockStreamId =', 'const _mockStreamId ='

# Fix unused 'mockEvent' variable (line 2684)
Write-Host "  Fixing unused 'mockEvent' variable..." -ForegroundColor Yellow
$lines[2683] = $lines[2683] -replace 'const mockEvent =', 'const _mockEvent ='

# Fix userId property errors - Remove userId from CreateCaseInput
Write-Host "  Removing incorrect userId properties..." -ForegroundColor Yellow
$lines[896] = ''  # Remove userId line from CreateCaseInput (line 897)
$lines[917] = ''  # Line 918
$lines[936] = ''  # Line 937
$lines[1059] = ''  # Line 1060 (UpdateCaseInput)
$lines[1245] = ''  # Line 1246 (Evidence)
$lines[1270] = ''  # Line 1271
$lines[1297] = ''  # Line 1298
$lines[1339] = ''  # Line 1340 (UpdateEvidenceInput)
$lines[1740] = ''  # Line 1741
$lines[1795] = ''  # Line 1796
$lines[1903] = ''  # Line 1904

# Add userId to CreateConversationInput (line 1991)
Write-Host "  Adding required userId to CreateConversationInput..." -ForegroundColor Yellow
$lines[1991] = $lines[1991] -replace '(caseId: 1,)', 'userId: 1,`n            $1'

# Write back to file
$lines | Set-Content $file

Write-Host "`nComplete! Running type check..." -ForegroundColor Green
