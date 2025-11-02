# ============================================
# Justice Companion - Secure Token Setup
# ============================================
# This script helps you migrate from .env to system environment variables
# Run as: powershell -ExecutionPolicy Bypass -File setup-secure-tokens.ps1

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Justice Companion - Secure Token Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will set up GitHub and Context7 tokens" -ForegroundColor White
Write-Host "in your system environment (User level)." -ForegroundColor White
Write-Host ""
Write-Host "Benefits:" -ForegroundColor Green
Write-Host "  + Tokens never stored in project files" -ForegroundColor Green
Write-Host "  + Works across all your projects" -ForegroundColor Green
Write-Host "  + No risk of accidental git commit" -ForegroundColor Green
Write-Host "  + MCP servers read automatically" -ForegroundColor Green
Write-Host ""

# Check if running as admin (not needed, but inform user)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "WARNING: Running as Administrator" -ForegroundColor Yellow
    Write-Host "  You don't need admin rights for this script." -ForegroundColor Yellow
    Write-Host "  Tokens will be set system-wide (all users)." -ForegroundColor Yellow
    Write-Host ""
    $scope = "Machine"
} else {
    Write-Host "Running as regular user (recommended)" -ForegroundColor Green
    Write-Host "  Tokens will be set for your user account only." -ForegroundColor Green
    Write-Host ""
    $scope = "User"
}

# Function to validate GitHub token format
function Test-GitHubToken {
    param([string]$token)
    return $token -match '^(gh[ps]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{82})$'
}

# Function to validate Context7 key format
function Test-Context7Key {
    param([string]$key)
    return $key -match '^ctx7sk[_-][a-f0-9\-]{36}$'
}

# ============================================
# STEP 1: GitHub Token
# ============================================
Write-Host ""
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "STEP 1: GitHub Personal Access Token" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""

# Check if token already exists
$existingGitHub = [Environment]::GetEnvironmentVariable("GITHUB_TOKEN", $scope)
if ($existingGitHub) {
    $masked = $existingGitHub.Substring(0, [Math]::Min(7, $existingGitHub.Length)) + "..." +
              $existingGitHub.Substring([Math]::Max(0, $existingGitHub.Length - 4))
    Write-Host "Existing token found: $masked" -ForegroundColor Yellow
    Write-Host ""
    $updateGitHub = Read-Host "  Update GitHub token? (y/N)"
    if ($updateGitHub -ne "y" -and $updateGitHub -ne "Y") {
        Write-Host "  Skipping GitHub token..." -ForegroundColor Gray
        $skipGitHub = $true
    } else {
        $skipGitHub = $false
    }
} else {
    Write-Host "No existing GitHub token found." -ForegroundColor Gray
    $skipGitHub = $false
}

if (-not $skipGitHub) {
    Write-Host ""
    Write-Host "Create a GitHub Personal Access Token:" -ForegroundColor White
    Write-Host "  1. Go to: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "  2. Click 'Generate new token' -> 'Fine-grained token' (recommended)" -ForegroundColor White
    Write-Host "  3. Name: 'Justice Companion MCP'" -ForegroundColor White
    Write-Host "  4. Expiration: 90 days" -ForegroundColor White
    Write-Host "  5. Permissions: Only 'repo' or 'public_repo' if needed" -ForegroundColor White
    Write-Host "  6. Copy the token (starts with 'ghp_' or 'github_pat_')" -ForegroundColor White
    Write-Host ""

    $githubToken = ""
    $validGitHub = $false

    while (-not $validGitHub) {
        $githubToken = Read-Host "  Paste your GitHub token (or 'skip' to skip)"

        if ($githubToken -eq "skip") {
            Write-Host "  Skipping GitHub token..." -ForegroundColor Gray
            break
        }

        if (Test-GitHubToken $githubToken) {
            $validGitHub = $true
        } else {
            Write-Host "  x Invalid token format. Expected: ghp_... or github_pat_..." -ForegroundColor Red
            Write-Host ""
        }
    }

    if ($validGitHub) {
        try {
            [Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $githubToken, $scope)
            Write-Host "  + GitHub token saved to system environment!" -ForegroundColor Green
        } catch {
            Write-Host "  x Failed to set environment variable: $_" -ForegroundColor Red
        }
    }
}

# ============================================
# STEP 2: Context7 API Key
# ============================================
Write-Host ""
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "STEP 2: Context7 API Key" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""

# Check if key already exists
$existingContext7 = [Environment]::GetEnvironmentVariable("CONTEXT7_API_KEY", $scope)
if ($existingContext7) {
    $masked = $existingContext7.Substring(0, [Math]::Min(9, $existingContext7.Length)) + "..." +
              $existingContext7.Substring([Math]::Max(0, $existingContext7.Length - 4))
    Write-Host "Existing key found: $masked" -ForegroundColor Yellow
    Write-Host ""
    $updateContext7 = Read-Host "  Update Context7 key? (y/N)"
    if ($updateContext7 -ne "y" -and $updateContext7 -ne "Y") {
        Write-Host "  Skipping Context7 key..." -ForegroundColor Gray
        $skipContext7 = $true
    } else {
        $skipContext7 = $false
    }
} else {
    Write-Host "No existing Context7 key found." -ForegroundColor Gray
    $skipContext7 = $false
}

if (-not $skipContext7) {
    Write-Host ""
    Write-Host "Get your Context7 API Key:" -ForegroundColor White
    Write-Host "  1. Log into Context7 dashboard" -ForegroundColor White
    Write-Host "  2. Navigate to API Keys section" -ForegroundColor White
    Write-Host "  3. Generate new key (if needed)" -ForegroundColor White
    Write-Host "  4. Copy the key (starts with 'ctx7sk_' or 'ctx7sk-')" -ForegroundColor White
    Write-Host ""

    $context7Key = ""
    $validContext7 = $false

    while (-not $validContext7) {
        $context7Key = Read-Host "  Paste your Context7 key (or 'skip' to skip)"

        if ($context7Key -eq "skip") {
            Write-Host "  Skipping Context7 key..." -ForegroundColor Gray
            break
        }

        if (Test-Context7Key $context7Key) {
            $validContext7 = $true
        } else {
            Write-Host "  x Invalid key format. Expected: ctx7sk_... or ctx7sk-..." -ForegroundColor Red
            Write-Host ""
        }
    }

    if ($validContext7) {
        try {
            [Environment]::SetEnvironmentVariable("CONTEXT7_API_KEY", $context7Key, $scope)
            Write-Host "  + Context7 key saved to system environment!" -ForegroundColor Green
        } catch {
            Write-Host "  x Failed to set environment variable: $_" -ForegroundColor Red
        }
    }
}

# ============================================
# STEP 3: Verification
# ============================================
Write-Host ""
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "STEP 3: Verification" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""

$finalGitHub = [Environment]::GetEnvironmentVariable("GITHUB_TOKEN", $scope)
$finalContext7 = [Environment]::GetEnvironmentVariable("CONTEXT7_API_KEY", $scope)

if ($finalGitHub) {
    $masked = $finalGitHub.Substring(0, [Math]::Min(7, $finalGitHub.Length)) + "..." +
              $finalGitHub.Substring([Math]::Max(0, $finalGitHub.Length - 4))
    Write-Host "+ GITHUB_TOKEN:       $masked" -ForegroundColor Green
} else {
    Write-Host "x GITHUB_TOKEN:       Not set" -ForegroundColor Red
}

if ($finalContext7) {
    $masked = $finalContext7.Substring(0, [Math]::Min(9, $finalContext7.Length)) + "..." +
              $finalContext7.Substring([Math]::Max(0, $finalContext7.Length - 4))
    Write-Host "+ CONTEXT7_API_KEY:   $masked" -ForegroundColor Green
} else {
    Write-Host "x CONTEXT7_API_KEY:   Not set" -ForegroundColor Red
}

# ============================================
# STEP 4: Next Steps
# ============================================
Write-Host ""
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "STEP 4: Next Steps" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""

if ($finalGitHub -or $finalContext7) {
    Write-Host "Environment variables set successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: You must restart your terminal/IDE for changes to take effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To verify:" -ForegroundColor White
    Write-Host "  1. Close this terminal" -ForegroundColor White
    Write-Host "  2. Open a NEW PowerShell window" -ForegroundColor White
    Write-Host '  3. Run: echo $env:GITHUB_TOKEN' -ForegroundColor White
    Write-Host '  4. Run: echo $env:CONTEXT7_API_KEY' -ForegroundColor White
    Write-Host ""
    Write-Host "Then test in Node.js:" -ForegroundColor White
    Write-Host "  cd 'C:\Users\sava6\Desktop\Justice Companion'" -ForegroundColor White
    Write-Host '  node -e "console.log(process.env.GITHUB_TOKEN ? ''GitHub: OK'' : ''GitHub: Missing'')"' -ForegroundColor White
    Write-Host '  node -e "console.log(process.env.CONTEXT7_API_KEY ? ''Context7: OK'' : ''Context7: Missing'')"' -ForegroundColor White
    Write-Host ""
    Write-Host "Update your .env file:" -ForegroundColor White
    Write-Host "  - Remove or comment out GITHUB_TOKEN line" -ForegroundColor White
    Write-Host "  - Remove or comment out CONTEXT7_API_KEY line" -ForegroundColor White
    Write-Host "  - Keep ENCRYPTION_KEY_BASE64 (project-specific)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "No tokens were set. Run this script again when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For more information, see:" -ForegroundColor White
Write-Host "  docs/guides/SECURE_TOKEN_SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Pause to read output
Read-Host "Press Enter to exit"
