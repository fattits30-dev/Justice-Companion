# Comprehensive fix for electron-ipc-handlers.test.ts TypeScript errors
$filePath = 'src\electron-ipc-handlers.test.ts'
$content = Get-Content $filePath -Raw

Write-Host "Applying comprehensive TypeScript fixes..." -ForegroundColor Cyan

# 1. Remove unused imports
Write-Host "  - Removing unused imports..." -ForegroundColor Yellow
$content = $content -replace ', type Mock', ''
$content = $content -replace '  ModelDownloadStartRequest,\r?\n', ''
$content = $content -replace '  FileViewResponse,\r?\n', ''
$content = $content -replace 'import type \{ CreateCaseInput, UpdateCaseInput, Case \}', 'import type { Case }'
$content = $content -replace 'import type \{ CreateEvidenceInput, UpdateEvidenceInput, Evidence \}', 'import type { Evidence }'

# 2. Comment out mockErrorLogger
$content = $content -replace 'const mockErrorLogger = \{', '// const mockErrorLogger = {'
$content = $content -replace '  logError: vi\.fn\(\),\r?\n\};', '//   logError: vi.fn(),\r\n// };'

# 3. Fix implicit any types - add explicit type to _event parameters
$content = $content -replace 'async \(_,', 'async (_event: any,'

# 4. Fix array type for availableModels
$content = $content -replace 'availableModels: \[\],', 'availableModels: [] as any[],'

# 5. Fix void request types - replace {} with undefined
$content = $content -replace 'const request: CaseGetAllRequest = \{\}', 'const request: CaseGetAllRequest = undefined'
$content = $content -replace 'const request: CaseGetStatisticsRequest = \{\}', 'const request: CaseGetStatisticsRequest = undefined'
$content = $content -replace 'const request: AICheckStatusRequest = \{\}', 'const request: AICheckStatusRequest = undefined'
$content = $content -replace 'const request: ModelGetAvailableRequest = \{\}', 'const request: ModelGetAvailableRequest = undefined'
$content = $content -replace 'const request: ModelGetDownloadedRequest = \{\}', 'const request: ModelGetDownloadedRequest = undefined'
$content = $content -replace 'const request: ProfileGetRequest = \{\}', 'const request: ProfileGetRequest = undefined'
$content = $content -replace 'const request: GDPRExportUserDataRequest = \{\}', 'const request: GDPRExportUserDataRequest = undefined'

Write-Host "Writing fixes..." -ForegroundColor Green
Set-Content $filePath -Value $content -NoNewline

Write-Host "Done! Run TypeScript fixes complete. Now running userId fix script..." -ForegroundColor Green
