# Fix all remaining AIResponse issues in RAGService.test.ts
$filePath = 'src\services\RAGService.test.ts'
$content = Get-Content $filePath -Raw

Write-Host "Fixing all AIResponse type issues..." -ForegroundColor Cyan

# Pattern: expect(response.code) without type guard - wrap in conditional
# This handles multiple lines of expects after success check

$pattern1 = '(\s+)(const response = await ragService\.processQuestion[^;]+;\r?\n\r?\n\s+expect\(response\.success\)\.toBe\(false\);\r?\n)(\s+expect\(response\.code\)\.toBe\([^)]+\);\r?\n)'
$replacement1 = '$1$2$1if (!response.success) {$3$1}$3'

$content = $content -replace $pattern1, '$1$2$1if (!response.success) {`r`n$3$1}`r`n'

# Simpler: just add type assertions for error/code access
$content = $content -replace 'expect\(response\.error\)', 'expect((response as any).error)'
$content = $content -replace 'expect\(response\.code\)', 'expect((response as any).code)'
$content = $content -replace 'response\.message\?\.content', '(response as any).message?.content'

# Fix test mock arrays with id property - add @ts-expect-error comments
$content = $content -replace '(const manyResults = Array\.from\(\{ length: 10 \}, \(\_, i\) => \(\{)', '// @ts-expect-error - Test mocks include id for tracking`r`n      $1'
$content = $content -replace '(const results: LegislationResult\[\] = \[)', '// @ts-expect-error - Test mocks with extra properties`r`n      $1'
$content = $content -replace '(const results: CaseResult\[\] = \[)', '// @ts-expect-error - Test mocks with extra properties`r`n      $1'

Set-Content $filePath -Value $content -NoNewline
Write-Host "Done!" -ForegroundColor Green
