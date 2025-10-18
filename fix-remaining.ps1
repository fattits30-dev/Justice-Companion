$content = Get-Content 'src\electron-ipc-handlers.test.ts' -Raw

# Fix unused request parameters - change 'request:' to '_request:' when not used
$content = $content -replace 'CASE_GET_ALL, async \(_: unknown, request: CaseGetAllRequest\)', 'CASE_GET_ALL, async (_: unknown, _request: CaseGetAllRequest)'
$content = $content -replace 'CASE_GET_STATISTICS, async \(_: unknown, request: CaseGetStatisticsRequest\)', 'CASE_GET_STATISTICS, async (_: unknown, _request: CaseGetStatisticsRequest)'
$content = $content -replace 'AI_CHECK_STATUS, async \(_: unknown, request: AICheckStatusRequest\)', 'AI_CHECK_STATUS, async (_: unknown, _request: AICheckStatusRequest)'
$content = $content -replace 'PROFILE_GET, async \(_: unknown, request: ProfileGetRequest\)', 'PROFILE_GET, async (_: unknown, _request: ProfileGetRequest)'
$content = $content -replace 'MODEL_GET_AVAILABLE, async \(_: unknown, request: ModelGetAvailableRequest\)', 'MODEL_GET_AVAILABLE, async (_: unknown, _request: ModelGetAvailableRequest)'
$content = $content -replace 'MODEL_GET_DOWNLOADED, async \(_: unknown, request: ModelGetDownloadedRequest\)', 'MODEL_GET_DOWNLOADED, async (_: unknown, _request: ModelGetDownloadedRequest)'
$content = $content -replace 'GDPR_EXPORT_USER_DATA, async \(_: unknown, request: GDPRExportUserDataRequest\)', 'GDPR_EXPORT_USER_DATA, async (_: unknown, _request: GDPRExportUserDataRequest)'

# Fix remaining _ without types
$content = $content -replace '\(_, ', '(_: unknown, '

# Fix unused variables - prefix with underscore
$content = $content -replace 'const profile = ', 'const _profile = '
$content = $content -replace 'const mockDb = ', 'const _mockDb = '
$content = $content -replace 'const mockFs = ', 'const _mockFs = '
$content = $content -replace 'const mockStreamId = ', 'const _mockStreamId = '
$content = $content -replace 'const mockEvent = ', 'const _mockEvent = '

# Fix void type issues - change {} to undefined for void returns
$content = $content -replace 'mockCaseService\.deleteCase\(request\.id\);\s+return \{ success: true \};', 'mockCaseService.deleteCase(request.id);'
$content = $content -replace 'mockEvidenceRepository\.delete\(request\.id\);\s+return \{ success: true \};', 'mockEvidenceRepository.delete(request.id);'
$content = $content -replace 'mockConversationRepository\.delete\(request\.id\);\s+return \{ success: true \};', 'mockConversationRepository.delete(request.id);'

Set-Content 'src\electron-ipc-handlers.test.ts' -Value $content -NoNewline
