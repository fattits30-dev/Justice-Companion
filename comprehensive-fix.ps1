# Read file
$content = Get-Content 'src\electron-ipc-handlers.test.ts' -Raw

# 1. Fix imports
$content = $content -replace ', type Mock', ''
$content = $content -replace '  ModelDownloadStartRequest,\r?\n', ''
$content = $content -replace '  FileViewResponse,\r?\n', ''
$content = $content -replace 'import type \{ CreateCaseInput, UpdateCaseInput, Case \}', 'import type { Case }'
$content = $content -replace 'import type \{ CreateEvidenceInput, UpdateEvidenceInput, Evidence \}', 'import type { Evidence }'

# 2. Remove unused mockErrorLogger
$content = $content -replace 'const mockErrorLogger = \{\r?\n  logError: vi\.fn\(\),\r?\n\};\r?\n\r?\n', ''

# 3. Fix all async (_, to async (_: unknown,
$content = $content -replace 'async \(_, request:', 'async (_: unknown, request:'
$content = $content -replace '\(_, \{', '(_: unknown, {'

# 4. Fix unused request parameters
$content = $content -replace 'CASE_GET_ALL, async \(_: unknown, request: CaseGetAllRequest\)', 'CASE_GET_ALL, async (_: unknown, _request: CaseGetAllRequest)'
$content = $content -replace 'CASE_GET_STATISTICS, async \(_: unknown, request: CaseGetStatisticsRequest\)', 'CASE_GET_STATISTICS, async (_: unknown, _request: CaseGetStatisticsRequest)'
$content = $content -replace 'AI_CHECK_STATUS, async \(_: unknown, request: AICheckStatusRequest\)', 'AI_CHECK_STATUS, async (_: unknown, _request: AICheckStatusRequest)'
$content = $content -replace 'PROFILE_GET, async \(_: unknown, request: ProfileGetRequest\)', 'PROFILE_GET, async (_: unknown, _request: ProfileGetRequest)'
$content = $content -replace 'MODEL_GET_AVAILABLE, async \(_: unknown, request: ModelGetAvailableRequest\)', 'MODEL_GET_AVAILABLE, async (_: unknown, _request: ModelGetAvailableRequest)'
$content = $content -replace 'MODEL_GET_DOWNLOADED, async \(_: unknown, request: ModelGetDownloadedRequest\)', 'MODEL_GET_DOWNLOADED, async (_: unknown, _request: ModelGetDownloadedRequest)'
$content = $content -replace 'GDPR_EXPORT_USER_DATA, async \(_: unknown, request: GDPRExportUserDataRequest\)', 'GDPR_EXPORT_USER_DATA, async (_: unknown, _request: GDPRExportUserDataRequest)'

# 5. Fix unused variables
$content = $content -replace 'const mockDb = ', 'const _mockDb = '
$content = $content -replace 'const mockFs = ', 'const _mockFs = '
$content = $content -replace 'const mockStreamId = ', 'const _mockStreamId = '
$content = $content -replace 'const mockEvent = ', 'const _mockEvent = '

# 6. Add userId: 1 to all Case objects - use proper newlines
# For "const mockCase: Case = {" objects
$content = $content -replace '(\s+description: ''[^'']+''or "[^"]+"),(\r?\n\s+createdAt:)', '$1,`r`n          userId: 1$2'

# For array elements
$content = $content -replace '(\s+description: ''[^'']+''or "[^"]+"),(\r?\n\s+createdAt:)', '$1,`r`n            userId: 1$2'

# 7. Add userId to CreateConversationInput
$content = $content -replace '(createInput: \{)(\r?\n\s+caseId:)', '$1`r`n          userId: 1,$2'
$content = $content -replace '(createInput: \{)(\r?\n\s+title:)', '$1`r`n          userId: 1,$2'

# Write back
Set-Content 'src\electron-ipc-handlers.test.ts' -Value $content -NoNewline
