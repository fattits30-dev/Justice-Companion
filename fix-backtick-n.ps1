# Fix remaining AIResponse property accesses in RAGService.test.ts
$filePath = 'src\services\RAGService.test.ts'
$lines = Get-Content $filePath

Write-Host "Fixing AIResponse type narrowing..." -ForegroundColor Cyan

for ($i = 0; $i -lt $lines.Count; $i++) {
    # Pattern: expect(response.code).toBe(...) without type guard
    if ($lines[$i] -match '^\s+expect\(response\.code\)\.toBe' -and 
        $lines[$i-1] -notmatch 'if \(!response\.success\)' -and
        $lines[$i-2] -notmatch 'expect\(response\.success\)\.toBe\(false\)') {
        
        # Look backwards for the expect(response.success).toBe(false)
        $successCheckLine = -1
        for ($j = $i - 1; $j -ge ($i - 10) -and $j -ge 0; $j--) {
            if ($lines[$j] -match 'expect\(response\.success\)\.toBe\(false\)') {
                $successCheckLine = $j
                break
            }
        }
        
        if ($successCheckLine -gt 0) {
            # Add type guard after success check
            $indent = $lines[$successCheckLine] -replace '^(\s+).*', '$1'
            $lines = $lines[0..$successCheckLine] + 
                     "$indent`if (!response.success) {" +
                     $lines[($successCheckLine+1)..($i)] +
                     "$indent`}" +
                     $lines[($i+1)..($lines.Count-1)]
            $i += 2 # Skip the lines we just added
        }
    }
}

Set-Content $filePath -Value $lines
Write-Host "Done!" -ForegroundColor Green
