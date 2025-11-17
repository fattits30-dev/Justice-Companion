# PWA Icon Generation Instructions

## Quick Method (Using Online Tool)

1. Visit: https://realfavicongenerator.net/
2. Upload the `icon-template.svg` file from this directory
3. Download the generated package
4. Extract and copy:
   - `android-chrome-192x192.png` → rename to `pwa-192x192.png`
   - `android-chrome-512x512.png` → rename to `pwa-512x512.png`
   - `apple-touch-icon.png` → keep as is
5. Place all files in the `public/` directory

## Alternative: Browser-based Generation

1. Open `icon-generator.html` in a web browser
2. The page will automatically generate PNG files
3. Right-click each canvas and "Save image as..."
4. Save as:
   - `pwa-192x192.png` (192x192 canvas)
   - `pwa-512x512.png` (512x512 canvas)
   - `apple-touch-icon.png` (180x180 canvas)

## Temporary Placeholders

For development testing, placeholder 1x1 pixel PNGs have been created.
Replace these with proper icons before production deployment.

## Icon Requirements

- **192x192px**: Android Chrome, standard PWA icon
- **512x512px**: Android Chrome, high-res icon, also used for maskable
- **180x180px**: Apple touch icon for iOS devices

## Design Notes

The template uses:
- Background: `#0B1120` (dark blue-black)
- Primary: `#1e40af` (blue-800)
- Accent: `#3b82f6` (blue-500)
- Light: `#60a5fa` (blue-400)

The icon features:
- Justice scales symbol (legal reference)
- "JC" text (Justice Companion branding)
- Clean, professional design suitable for legal application
