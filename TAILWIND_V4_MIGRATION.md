# Tailwind CSS v4 Migration Guide

## Changes Made

### ✅ Completed

1. **CSS Configuration Migration**
   - Replaced `@tailwind` directives with `@import "tailwindcss"` in `src/index.css`
   - Migrated custom theme colors to CSS variables using `@theme` directive
   - Removed old `tailwind.config.js` file (no longer needed in v4)

2. **PostCSS Plugin Update**
   - Installed `@tailwindcss/postcss` package
   - Updated `postcss.config.js` to use new `@tailwindcss/postcss` plugin

## Known Tailwind v4 Breaking Changes Affecting Your App

### 1. **Focus Ring Defaults** ⚠️

- **Old (v3):** `ring-3` (3px width)
- **New (v4):** `ring-2` (2px width)
- **Impact:** Focus states may look thinner
- **Files Affected:** 33 components using `ring-` utilities
- **Fix:** If you want thicker rings, explicitly use `ring-3`

### 2. **Container Padding** ⚠️

- **Old (v3):** No padding by default
- **New (v4):** Has padding by default
- **Impact:** Containers may appear narrower
- **Fix:** Use `px-0` to remove padding if needed

### 3. **Shadow Changes** ⚠️

- **Old (v3):** Darker, more prominent shadows
- **New (v4):** Lighter, more subtle shadows
- **Impact:** Depth perception may feel different
- **Fix:** Use larger shadow sizes (`shadow-lg` → `shadow-xl`)

### 4. **Border Color Defaults** ⚠️

- **Old (v3):** `border-gray-200` default
- **New (v4):** `border-gray-300` default (slightly darker)
- **Impact:** Borders may look slightly different
- **Fix:** Explicitly set border colors if needed

### 5. **Space/Gap Utilities** ⚠️

- **Old (v3):** `space-y-*` uses margin
- **New (v4):** `space-y-*` behavior slightly changed
- **Impact:** Vertical spacing in lists may differ
- **Fix:** Consider using `gap-*` with flexbox/grid instead

### 6. **Typography Defaults**

- **Old (v3):** Different default line heights
- **New (v4):** Adjusted line heights for better readability
- **Impact:** Text blocks may have different vertical rhythm
- **Fix:** Explicitly set `leading-*` if needed

## Files Using Potentially Affected Classes

### Ring Utilities (33 files)

- Multiple form inputs and buttons using `ring-*` classes
- Focus states across the application

### Space Utilities (33 files)

- Vertical spacing in lists and panels
- Form field spacing

## Recommended Actions

1. **Visual Inspection**
   - Compare layout before/after screenshots
   - Check spacing around inputs, buttons, and cards
   - Verify focus rings are visible on tab navigation

2. **Specific Areas to Check**
   - Login/Registration forms
   - Settings panel
   - Chat interface
   - Document upload modal
   - Case details view

3. **Quick Fixes**
   - If focus rings too thin: Add `ring-3` to focused elements
   - If containers too narrow: Add `px-0` to containers
   - If shadows too light: Use `shadow-lg` or `shadow-xl`

## Testing Checklist

- [ ] Login screen layout correct
- [ ] Sidebar navigation spacing correct
- [ ] Chat window messages properly spaced
- [ ] Forms inputs have visible focus rings
- [ ] Buttons have proper hover/focus states
- [ ] Modals/dialogs centered correctly
- [ ] Settings panel layout correct
- [ ] Mobile responsive (if applicable)

## If Layout Still Looks Wrong

The most likely culprits are:

1. **Custom CSS conflicts** - Check for any custom CSS overriding Tailwind
2. **Browser cache** - Hard refresh (Ctrl+Shift+R)
3. **Missing utilities** - v4 removed some rarely-used utilities
4. **Third-party components** - UI libraries may need updates

## Rollback Instructions

If needed, revert with:

```bash
git revert HEAD  # Revert the migration commit
pnpm install     # Reinstall old Tailwind v3
```
