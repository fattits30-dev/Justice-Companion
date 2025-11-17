# Generate placeholder PNG icons for PWA
Add-Type -AssemblyName System.Drawing

# Function to create colored placeholder
function Create-PlaceholderIcon {
    param (
        [int]$Width,
        [int]$Height,
        [string]$OutputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Background color (#0B1120)
    $bgColor = [System.Drawing.Color]::FromArgb(11, 17, 32)
    $graphics.Clear($bgColor)

    # Draw "JC" text in center
    $font = New-Object System.Drawing.Font("Arial", ($Width / 4), [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(59, 130, 246))
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF(0, 0, $Width, $Height)
    $graphics.DrawString("JC", $font, $brush, $rect, $format)

    # Save
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $font.Dispose()
    $brush.Dispose()
    $format.Dispose()
    $graphics.Dispose()
    $bmp.Dispose()

    Write-Host "Created: $OutputPath"
}

# Generate icons
$publicDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Create-PlaceholderIcon -Width 192 -Height 192 -OutputPath "$publicDir\pwa-192x192.png"
Create-PlaceholderIcon -Width 512 -Height 512 -OutputPath "$publicDir\pwa-512x512.png"
Create-PlaceholderIcon -Width 180 -Height 180 -OutputPath "$publicDir\apple-touch-icon.png"

Write-Host "`nPlaceholder icons generated successfully!"
Write-Host "For production-quality icons, open icon-generator.html in a browser."
