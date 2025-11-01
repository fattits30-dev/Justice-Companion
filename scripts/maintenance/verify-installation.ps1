#!/usr/bin/env pwsh
# Verify all packages are installed correctly
# Justice Companion - Installation Verification Script

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFYING INSTALLATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$failed = 0
$missing = @()

# Check Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    if ($nodeVersion -match "v20\.") {
        Write-Host "  [OK] Node.js: $nodeVersion (correct)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Node.js: $nodeVersion (should be v20.x LTS)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] Node.js not found" -ForegroundColor Red
    $failed++
}

# Check pnpm version
Write-Host "Checking pnpm..." -ForegroundColor Cyan
$pnpmVersion = pnpm --version 2>$null
if ($pnpmVersion) {
    Write-Host "  [OK] pnpm: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] pnpm not found" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "Checking critical packages..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

# Critical packages to verify
$packages = @(
    @{ name = "eslint-plugin-import"; display = "ESLint Import Plugin" },
    @{ name = "husky"; display = "Husky" },
    @{ name = "lint-staged"; display = "lint-staged" },
    @{ name = "@types/node"; display = "Node Types" },
    @{ name = "@eslint/js"; display = "ESLint Core" },
    @{ name = "electron"; display = "Electron" },
    @{ name = "better-sqlite3"; display = "better-sqlite3" },
    @{ name = "vite"; display = "Vite" },
    @{ name = "react"; display = "React" },
    @{ name = "typescript"; display = "TypeScript" },
    @{ name = "drizzle-orm"; display = "Drizzle ORM" },
    @{ name = "zod"; display = "Zod" }
)

foreach ($pkg in $packages) {
    $pkgName = $pkg.name
    $pkgDisplay = $pkg.display

    Write-Host "  Checking $pkgDisplay..." -NoNewline
    if (Test-Path "node_modules/$pkgName") {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [MISSING]" -ForegroundColor Red
        $failed++
        $missing += $pkgName
    }
}

# Check if node_modules exists
Write-Host ""
Write-Host "Checking node_modules structure..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

if (Test-Path "node_modules") {
    $itemCount = (Get-ChildItem "node_modules" -Directory | Measure-Object).Count
    Write-Host "  [OK] node_modules exists ($itemCount packages)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] node_modules doesn't exist" -ForegroundColor Red
    $failed++
}

# Check pnpm-lock.yaml
if (Test-Path "pnpm-lock.yaml") {
    Write-Host "  [OK] pnpm-lock.yaml exists" -ForegroundColor Green
} else {
    Write-Host "  [WARN] pnpm-lock.yaml missing (will be created on install)" -ForegroundColor Yellow
}

# Check package.json
if (Test-Path "package.json") {
    Write-Host "  [OK] package.json exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] package.json missing (CRITICAL)" -ForegroundColor Red
    $failed++
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your installation is complete and verified." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run 'pnpm electron:dev' to start the app" -ForegroundColor Gray
    Write-Host "  2. Run 'pnpm test' to run tests" -ForegroundColor Gray
    Write-Host "  3. Run 'pnpm lint' to check code quality" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-Host "[FAILED] Found $failed issue(s)" -ForegroundColor Red
    Write-Host ""

    if ($missing.Count -gt 0) {
        Write-Host "Missing packages:" -ForegroundColor Yellow
        foreach ($pkg in $missing) {
            Write-Host "  - $pkg" -ForegroundColor Gray
        }
        Write-Host ""
    }

    Write-Host "To fix:" -ForegroundColor Yellow
    Write-Host "  1. Try: ./safe-fix-node-modules.ps1" -ForegroundColor Cyan
    Write-Host "  2. If that fails: ./nuclear-fix-node-modules.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
