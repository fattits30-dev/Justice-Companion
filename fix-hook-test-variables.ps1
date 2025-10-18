# Fix uninitialized variable errors in hook test files
# Pattern: let created: Type;  → let created!: Type;
# Pattern: let returned: Type; → let returned!: Type;

$files = @(
    "src/features/facts/hooks/useCaseFacts.test.ts",
    "src/features/facts/hooks/useUserFacts.test.ts",
    "src/features/timeline/hooks/useTimeline.test.ts"
)

foreach ($file in $files) {
    Write-Host "Processing: $file"
    $content = Get-Content $file -Raw

    # Fix: let created: CaseFact; → let created!: CaseFact;
    $content = $content -replace 'let created: CaseFact;', 'let created!: CaseFact;'

    # Fix: let created: UserFact; → let created!: UserFact;
    $content = $content -replace 'let created: UserFact;', 'let created!: UserFact;'

    # Fix: let created: TimelineEvent; → let created!: TimelineEvent;
    $content = $content -replace 'let created: TimelineEvent;', 'let created!: TimelineEvent;'

    # Fix: let returned: CaseFact; → let returned!: CaseFact;
    $content = $content -replace 'let returned: CaseFact;', 'let returned!: CaseFact;'

    # Fix: let returned: UserFact; → let returned!: UserFact;
    $content = $content -replace 'let returned: UserFact;', 'let returned!: UserFact;'

    # Fix: let returned: TimelineEvent; → let returned!: TimelineEvent;
    $content = $content -replace 'let returned: TimelineEvent;', 'let returned!: TimelineEvent;'

    Set-Content $file $content -NoNewline
    Write-Host "  ✓ Fixed: $file"
}

Write-Host ""
Write-Host "All files processed!"
