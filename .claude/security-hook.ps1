$inputData = $input | Out-String
"DEBUG: Input received: $inputData" | Out-File -Append "C:\Users\sava6\Desktop\Justice Companion\hook-debug.log"

try {
    $json = $inputData | ConvertFrom-Json
    $path = $json.tool_input.file_path
    "DEBUG: Path extracted: $path" | Out-File -Append "C:\Users\sava6\Desktop\Justice Companion\hook-debug.log"

    $forbidden = @('legal-docs/', '.env', '.db', 'logs/', 'keys/', 'secrets/', '.pem', '.key')

    foreach ($pattern in $forbidden) {
        if ($path -like "*$pattern*") {
            "DEBUG: BLOCKED - $path matches $pattern" | Out-File -Append "C:\Users\sava6\Desktop\Justice Companion\hook-debug.log"
            Write-Error "BLOCKED: $path matches protected pattern $pattern"
            exit 2
        }
    }

    "DEBUG: ALLOWED - $path" | Out-File -Append "C:\Users\sava6\Desktop\Justice Companion\hook-debug.log"
    exit 0
} catch {
    "DEBUG: ERROR - $_" | Out-File -Append "C:\Users\sava6\Desktop\Justice Companion\hook-debug.log"
    exit 0
}
