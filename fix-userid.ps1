# Add userId to all Case and ConversationCreateRequest objects
$filePath = 'src\electron-ipc-handlers.test.ts'
$lines = Get-Content $filePath

Write-Host "Adding userId fields..." -ForegroundColor Cyan

for ($i = 0; $i -lt $lines.Count; $i++) {
    # Pattern 1: const mockCase: Case = { followed by id: on next line
    if ($lines[$i] -match 'const mockCase: Case = \{' -and $lines[$i+1] -match '^\s+id: \d+,$') {
        # Check if userId already exists on next lines
        if ($lines[$i+2] -notmatch '^\s+userId:') {
            # Insert userId after id
            $indent = $lines[$i+1] -replace '^(\s+).*', '$1'
            $lines = $lines[0..$($i+1)] + "$indent`userId: 1," + $lines[($i+2)..($lines.Count-1)]
            $i++ # Skip the line we just added
        }
    }
    # Pattern 2: const mockCases: Case[] = [ with objects inside
    elseif ($lines[$i] -match 'id: \d+,$' -and $i -gt 0 -and $lines[$i-1] -match '^\s*\{$') {
        # Check if this is inside a Case array and userId doesn't exist
        if ($lines[$i+1] -notmatch '^\s+userId:') {
            $indent = $lines[$i] -replace '^(\s+).*', '$1'
            $lines = $lines[0..$i] + "$indent`userId: 1," + $lines[($i+1)..($lines.Count-1)]
            $i++
        }
    }
    # Pattern 3: input: { followed by title: (for ConversationCreateRequest)
    elseif ($lines[$i] -match '^\s+input: \{$' -and $lines[$i+1] -match '^\s+title:') {
        # Check if userId already exists
        if ($lines[$i+1] -notmatch '^\s+userId:') {
            # Check if there's a caseId first
            if ($lines[$i+1] -notmatch 'caseId') {
                # No caseId, insert userId before title
                $indent = $lines[$i+1] -replace '^(\s+).*', '$1'
                $lines = $lines[0..$i] + "$indent`userId: 1," + $lines[($i+1)..($lines.Count-1)]
                $i++
            }
        }
    }
}

Set-Content $filePath -Value $lines
Write-Host "userId fields added successfully!" -ForegroundColor Green
