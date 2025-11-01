#!/usr/bin/env pwsh
# Pre-Deployment Verification Script
# Runs all critical checks before production deployment

param(
    [switch]$Verbose,
    [switch]$SkipBuild,
    [switch]$SkipTests
)

$ErrorActionPreference = "SilentlyContinue"
$failed = 0
$warnings = 0

# Colors
$ColorCyan = "Cyan"
$ColorGreen = "Green"
$ColorYellow = "Yellow"
$ColorRed = "Red"

# Banner
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $ColorCyan
Write-Host "  🚀 JUSTICE COMPANION - PRE-DEPLOYMENT VERIFICATION" -ForegroundColor $ColorCyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $ColorCyan
Write-Host ""

# Function to run a check
function Run-Check {
    param(
        [string]$Name,
        [scriptblock]$Command,
        [bool]$Critical = $true
    )

    Write-Host "[$Name]" -NoNewline -ForegroundColor White
    Write-Host " Running..." -NoNewline

    $output = & $Command 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host "`r[$Name] " -NoNewline -ForegroundColor White
        Write-Host "✓ PASS" -ForegroundColor $ColorGreen
        if ($Verbose) {
            Write-Host $output -ForegroundColor Gray
        }
        return $true
    } else {
        if ($Critical) {
            Write-Host "`r[$Name] " -NoNewline -ForegroundColor White
            Write-Host "✗ FAIL" -ForegroundColor $ColorRed
            $script:failed++
        } else {
            Write-Host "`r[$Name] " -NoNewline -ForegroundColor White
            Write-Host "⚠ WARN" -ForegroundColor $ColorYellow
            $script:warnings++
        }

        if ($Verbose -or $Critical) {
            Write-Host $output -ForegroundColor Gray
        }
        return $false
    }
}

# 1. CODE QUALITY CHECKS
Write-Host "━━━ CODE QUALITY ━━━" -ForegroundColor $ColorCyan

Run-Check "ESLint" {
    pnpm lint 2>&1
} -Critical $true

Run-Check "TypeScript Type Check" {
    pnpm type-check 2>&1
} -Critical $true

Run-Check "Prettier Format Check" {
    pnpm format:check 2>&1
} -Critical $false

# Check for console.log in source (excluding tests)
Run-Check "No Console.log in Production" {
    $consoleLogs = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse |
        Select-String -Pattern "console\.log" |
        Where-Object { $_.Path -notmatch "test|spec" }

    if ($consoleLogs) {
        Write-Output "Found console.log statements:"
        $consoleLogs | ForEach-Object { Write-Output $_.Line }
        exit 1
    }
    exit 0
} -Critical $false

# 2. BUILD VERIFICATION
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "━━━ BUILD VERIFICATION ━━━" -ForegroundColor $ColorCyan

    Run-Check "Vite Build" {
        pnpm build 2>&1
    } -Critical $true

    Run-Check "Electron Preload Build" {
        # Check if preload was built
        if (Test-Path "dist-electron/preload.js") {
            Write-Output "Preload built successfully"
            exit 0
        } else {
            Write-Output "Preload build failed - file not found"
            exit 1
        }
    } -Critical $true

    # Check build output size
    Run-Check "Build Size Check" {
        if (Test-Path "dist") {
            $size = (Get-ChildItem -Path dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Output ("Build size: {0:N2} MB" -f $size)

            if ($size -gt 50) {
                Write-Output "Warning: Build size exceeds 50MB"
                exit 1
            }
            exit 0
        } else {
            Write-Output "dist/ directory not found"
            exit 1
        }
    } -Critical $false
} else {
    Write-Host ""
    Write-Host "━━━ BUILD VERIFICATION (SKIPPED) ━━━" -ForegroundColor $ColorYellow
}

# 3. TESTING
if (-not $SkipTests) {
    Write-Host ""
    Write-Host "━━━ TESTING ━━━" -ForegroundColor $ColorCyan

    Run-Check "Unit Tests" {
        pnpm test --run --silent 2>&1
    } -Critical $true

    Run-Check "Test Coverage" {
        pnpm test:coverage --run --silent 2>&1 | Out-Null

        # Check coverage report
        if (Test-Path "coverage/coverage-summary.json") {
            $coverage = Get-Content "coverage/coverage-summary.json" | ConvertFrom-Json
            $total = $coverage.total.lines.pct
            Write-Output ("Code coverage: {0:N2}%" -f $total)

            if ($total -lt 75) {
                Write-Output "Warning: Coverage below 75% threshold"
                exit 1
            }
            exit 0
        } else {
            Write-Output "Coverage report not found"
            exit 1
        }
    } -Critical $false
} else {
    Write-Host ""
    Write-Host "━━━ TESTING (SKIPPED) ━━━" -ForegroundColor $ColorYellow
}

# 4. SECURITY CHECKS
Write-Host ""
Write-Host "━━━ SECURITY ━━━" -ForegroundColor $ColorCyan

Run-Check "Dependency Audit" {
    pnpm audit --audit-level=high 2>&1
} -Critical $false

Run-Check "No Plaintext Encryption Keys" {
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "ENCRYPTION_KEY_BASE64=.+") {
            Write-Output "WARNING: Encryption key found in .env file"
            Write-Output "Ensure KeyManager is configured for production"
            exit 1
        }
    }
    Write-Output "No plaintext encryption keys in .env"
    exit 0
} -Critical $false

Run-Check "No Hardcoded Secrets" {
    $secrets = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse |
        Select-String -Pattern "API_KEY\s*=\s*['\"][^'\"]+['\"]|SECRET\s*=\s*['\"][^'\"]+['\"]|PASSWORD\s*=\s*['\"][^'\"]+"

    if ($secrets) {
        Write-Output "Found potential hardcoded secrets:"
        $secrets | ForEach-Object { Write-Output $_.Line }
        exit 1
    }
    Write-Output "No hardcoded secrets found"
    exit 0
} -Critical $true

# 5. DEPENDENCY HEALTH
Write-Host ""
Write-Host "━━━ DEPENDENCIES ━━━" -ForegroundColor $ColorCyan

Run-Check "All Packages Installed" {
    if (Test-Path "node_modules") {
        Write-Output "node_modules exists"
        exit 0
    } else {
        Write-Output "node_modules not found - run pnpm install"
        exit 1
    }
} -Critical $true

Run-Check "better-sqlite3 Rebuild" {
    # Check if better-sqlite3 is built for Electron
    $sqlitePath = "node_modules/better-sqlite3/build/Release/better_sqlite3.node"
    if (Test-Path $sqlitePath) {
        Write-Output "better-sqlite3 is built"
        exit 0
    } else {
        Write-Output "better-sqlite3 not built - run pnpm rebuild:electron"
        exit 1
    }
} -Critical $true

# 6. GIT HYGIENE
Write-Host ""
Write-Host "━━━ GIT HYGIENE ━━━" -ForegroundColor $ColorCyan

Run-Check "Clean Working Tree" {
    $status = git status --porcelain 2>&1
    if ($status) {
        Write-Output "Uncommitted changes found:"
        Write-Output $status
        exit 1
    } else {
        Write-Output "Working tree clean"
        exit 0
    }
} -Critical $false

Run-Check "On Main Branch" {
    $branch = git branch --show-current 2>&1
    if ($branch -eq "main" -or $branch -eq "master") {
        Write-Output "On branch: $branch"
        exit 0
    } else {
        Write-Output "Not on main/master branch (current: $branch)"
        exit 1
    }
} -Critical $false

Run-Check "No node_modules in Git" {
    $nodeModulesInGit = git ls-files | Select-String -Pattern "node_modules"
    if ($nodeModulesInGit) {
        Write-Output "node_modules found in git:"
        Write-Output $nodeModulesInGit
        exit 1
    } else {
        Write-Output "No node_modules in git"
        exit 0
    }
} -Critical $true

# 7. CONFIGURATION CHECKS
Write-Host ""
Write-Host "━━━ CONFIGURATION ━━━" -ForegroundColor $ColorCyan

Run-Check "Package.json Version" {
    if (Test-Path "package.json") {
        $pkg = Get-Content "package.json" | ConvertFrom-Json
        Write-Output ("Version: " + $pkg.version)
        exit 0
    } else {
        Write-Output "package.json not found"
        exit 1
    }
} -Critical $true

Run-Check "TSX Import Extensions" {
    # Check for imports without extensions
    $missingExtensions = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse |
        Select-String -Pattern "from ['\"]\.\.*/[^'\"]*[^.ts|.js|.json]['\"]" |
        Where-Object { $_.Line -notmatch "\.ts|\.js|\.json" }

    if ($missingExtensions) {
        Write-Output "Found imports without extensions:"
        $missingExtensions | Select-Object -First 5 | ForEach-Object { Write-Output $_.Line }
        exit 1
    } else {
        Write-Output "All imports have proper extensions"
        exit 0
    }
} -Critical $true

Run-Check "ESLint Import Rules Configured" {
    if (Test-Path "eslint.config.js") {
        $eslintConfig = Get-Content "eslint.config.js" -Raw
        if ($eslintConfig -match "extensions") {
            Write-Output "ESLint import rules configured"
            exit 0
        } else {
            Write-Output "ESLint import rules not found"
            exit 1
        }
    } else {
        Write-Output "eslint.config.js not found"
        exit 1
    }
} -Critical $true

Run-Check "Husky Pre-Commit Hook" {
    if (Test-Path ".husky/pre-commit") {
        Write-Output "Husky pre-commit hook configured"
        exit 0
    } else {
        Write-Output "Husky pre-commit hook not found"
        exit 1
    }
} -Critical $false

# SUMMARY
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $ColorCyan
Write-Host "  VERIFICATION SUMMARY" -ForegroundColor $ColorCyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor $ColorCyan
Write-Host ""

if ($failed -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED" -ForegroundColor $ColorGreen
    Write-Host "   Ready for production deployment" -ForegroundColor $ColorGreen
    Write-Host ""
    exit 0
} elseif ($failed -eq 0) {
    Write-Host "⚠️  $warnings WARNING(S)" -ForegroundColor $ColorYellow
    Write-Host "   Review warnings before deployment" -ForegroundColor $ColorYellow
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ $failed CRITICAL FAILURE(S)" -ForegroundColor $ColorRed
    if ($warnings -gt 0) {
        Write-Host "⚠️  $warnings WARNING(S)" -ForegroundColor $ColorYellow
    }
    Write-Host "   Fix issues before deployment" -ForegroundColor $ColorRed
    Write-Host ""
    Write-Host "Run with -Verbose flag for detailed output" -ForegroundColor Gray
    exit 1
}
