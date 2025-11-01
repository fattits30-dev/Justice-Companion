# Script to update all Settings components to use shared SettingsComponents module
# This removes duplicated helper components and imports from the shared module

$files = @(
    "src/features/settings/components/ConsentSettings.tsx",
    "src/features/settings/components/DataPrivacySettings.tsx",
    "src/features/settings/components/NotificationSettings.tsx",
    "src/features/settings/components/AppearanceSettings.tsx",
    "src/features/settings/components/AIConfigurationSettings.tsx",
    "src/features/settings/components/CaseManagementSettings.tsx",
    "src/features/settings/components/SettingsView.tsx"
)

foreach ($file in $files) {
    Write-Host "Processing: $file"

    $content = Get-Content $file -Raw

    # Add import for shared components (after other imports)
    if ($content -match "import.*from 'lucide-react';") {
        $content = $content -replace "(import.*from 'lucide-react';)", "`$1`nimport { SettingsSection, SettingItem, ToggleSetting, SelectSetting } from '@/components/ui/SettingsComponents';"
    }

    # Remove SettingsSectionProps interface and SettingsSection function
    $content = $content -replace "(?s)\/\*\*\s*\n\s*\*\sProps for SettingsSection.*?\n\s*\*\/\s*\ninterface SettingsSectionProps \{[^}]+\}\s*\n\s*\n\/\*\*.*?\*\/\s*\nfunction SettingsSection\([^{]+\{[^}]+\}\s*\n", ""

    # Remove SettingItemProps interface and SettingItem function
    $content = $content -replace "(?s)\/\*\*\s*\n\s*\*\sProps for SettingItem.*?\n\s*\*\/\s*\ninterface SettingItemProps \{[^}]+\}\s*\n\s*\n\/\*\*.*?\*\/\s*\nfunction SettingItem\([^{]+\{[\s\S]*?\n\}\s*\n", ""

    # Remove ToggleSettingProps interface and ToggleSetting function
    $content = $content -replace "(?s)\/\*\*\s*\n\s*\*\sProps for ToggleSetting.*?\n\s*\*\/\s*\ninterface ToggleSettingProps \{[^}]+\}\s*\n\s*\n\/\*\*.*?\*\/\s*\nfunction ToggleSetting\([^{]+\{[\s\S]*?\n\}\s*\n", ""

    # Remove SelectSettingProps interface and SelectSetting function
    $content = $content -replace "(?s)\/\*\*\s*\n\s*\*\sProps for SelectSetting.*?\n\s*\*\/\s*\ninterface SelectSettingProps \{[^}]+\}\s*\n\s*\n\/\*\*.*?\*\/\s*\nfunction SelectSetting\([^{]+\{[\s\S]*?\n\}\s*\n", ""

    # Save updated content
    Set-Content -Path $file -Value $content -NoNewline
    Write-Host "✓ Updated: $file"
}

Write-Host "`n✅ All files updated successfully!"
