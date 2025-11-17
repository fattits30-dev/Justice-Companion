# Justice Companion PWA - Testing Guide
**Comprehensive testing for Progressive Web App features**
**Date:** 2025-11-17

---

## Why PWA Testing is Better

**Electron limitations:**
- Desktop only (can't test mobile)
- Slow restart cycle
- Limited debugging tools
- Can't test camera/notifications on real devices

**PWA advantages:**
- Test on ANY device with browser
- Instant reload (no restart)
- Powerful browser DevTools
- Real mobile device testing
- Automated Lighthouse audits

---

## Test Environment Setup

### Desktop Testing (Chrome)

```bash
# 1. Open PWA
Visit: https://justicecompanion.netlify.app
# Or localhost: http://localhost:5176 (development)

# 2. Open DevTools (F12)
- Console: Error logging
- Network: API calls, offline simulation
- Application: PWA manifest, service worker, cache
- Lighthouse: PWA compliance audit
- Performance: Load time profiling
```

### Mobile Testing (Android)

```bash
# 1. Open PWA on phone
Chrome Android → https://justicecompanion.netlify.app

# 2. Install to home screen
Chrome menu → "Add to Home Screen"

# 3. Remote debugging (see mobile console on desktop)
Desktop Chrome → chrome://inspect
Connect phone via USB
See mobile console/network in desktop DevTools
```

### Mobile Testing (iOS)

```bash
# 1. Open PWA on iPhone
Safari → https://justicecompanion.netlify.app

# 2. Install to home screen
Share button → "Add to Home Screen"

# 3. Remote debugging (Mac only)
Safari on Mac → Develop menu → [Your iPhone]
See mobile console in desktop Safari
```

---

## Test Checklist: Core Features

### ✅ Test 1: Authentication

**Steps:**
1. Open PWA
2. Click "Register"
3. Fill: email, password
4. Submit

**Expected:**
- User registered successfully
- Redirected to dashboard
- Session persisted (reload page → still logged in)

**Check DevTools:**
```bash
# Network tab:
POST /auth/register → Status 200
Response: {"success": true, "data": {...}}

# Application → Storage → Local Storage:
auth_token: "..." (JWT token stored)
```

---

### ✅ Test 2: Chat with AI

**Steps:**
1. Navigate to Chat
2. Type: "Can they fire me for being sick?"
3. Send

**Expected:**
- Message sent
- AI responds with UK legal advice
- Response streams word-by-word
- Sources cited
- Conversation saved

**Check DevTools:**
```bash
# Network tab:
POST /chat/stream → Status 200
Type: text/event-stream (SSE)
Response: data: {"type":"token","data":"In the UK...",...}

# Console:
No errors
Token streaming logs (if enabled)
```

---

### ✅ Test 3: Document Upload

**Desktop:**
1. Click upload button (paperclip icon)
2. Select PDF/DOCX file
3. Upload

**Mobile:**
1. Click upload button
2. Choose "Camera" (Android) or "Take Photo" (iOS)
3. Take photo of document
4. Upload

**Expected:**
- Upload progress shown
- AI analyzes document
- AI extracts: employer name, dates, key facts
- Document added to evidence

**Check DevTools:**
```bash
# Network tab:
POST /chat/upload-document → Status 200
Request payload: FormData with file
Response: {"success": true, "data": {"message": "...", "analysis": {...}}}
```

---

### ✅ Test 4: Case Management

**Steps:**
1. From chat, AI suggests: "Create case from this conversation?"
2. Click "Create Case"
3. Fill case details
4. Save

**Expected:**
- Case created
- Conversation linked to case
- Uploaded documents linked to case
- Case appears in dashboard

---

### ✅ Test 5: Offline Mode

**Steps:**
1. Load a case with evidence
2. DevTools → Network → Check "Offline"
3. Reload page
4. Try to view case

**Expected:**
- Page loads from cache
- Can view cached case data
- Can view cached evidence
- Chat shows "offline" message
- Uncheck "Offline" → App reconnects

**Check DevTools:**
```bash
# Application → Service Workers:
Status: activated
Source: sw.js

# Application → Cache Storage:
api-cache: (contains cached API responses)
workbox-precache-v2: (contains app assets)

# Network tab (while offline):
Requests served from service worker (not network)
```

---

### ✅ Test 6: PWA Installation

**Desktop (Chrome):**
1. Visit PWA URL
2. Chrome shows "Install" icon in address bar
3. Click install
4. PWA opens in standalone window (no browser UI)

**Mobile (Android):**
1. Visit PWA URL in Chrome
2. Chrome shows "Add to Home Screen" banner
3. Tap "Add"
4. Icon appears on home screen
5. Tap icon → App opens in fullscreen (no browser UI)

**Expected:**
- App looks like native app
- No browser address bar
- App icon on OS
- Splash screen on startup

**Check DevTools:**
```bash
# Application → Manifest:
{
  "name": "Justice Companion",
  "short_name": "JusticeAI",
  "display": "standalone",
  "icons": [...] (192x192, 512x512)
}

# Installability:
Manifest: Valid ✓
Service Worker: Registered ✓
HTTPS: Yes ✓
```

---

### ✅ Test 7: Push Notifications

**Setup:**
1. PWA prompts: "Enable notifications for deadline reminders?"
2. Click "Allow"

**Test:**
1. Create deadline (e.g., ET1 due in 7 days)
2. Backend sends push notification
3. Phone shows notification

**Expected:**
- Notification appears on phone/desktop
- Notification shows: "ET1 due in 7 days - tap to view"
- Tap notification → Opens case in PWA

**Check DevTools:**
```bash
# Application → Service Workers → Push Messaging:
Subscription: {...} (push subscription details)

# Test push notification manually:
# In backend, trigger push via web-push library
```

---

## Advanced Testing

### 🔍 Network Throttling

**Simulate slow mobile network:**
```bash
# DevTools → Network → Throttling:
Select: "Slow 3G"

# Test:
1. Load chat
2. Send message
3. Upload document

# Expected:
- Loading indicators shown
- Graceful degradation (app still works)
- No timeout errors
```

---

### 🔍 Lighthouse Audit

**Run automated PWA compliance test:**
```bash
# DevTools → Lighthouse:
1. Select "Progressive Web App"
2. Click "Generate report"

# Target scores:
- PWA: 100/100
- Performance: 90+/100
- Accessibility: 90+/100
- Best Practices: 100/100
- SEO: 100/100

# Fix common issues:
- Missing 192x192 icon → Add icon
- No theme_color → Add to manifest
- Not on HTTPS → Deploy to Netlify (auto-HTTPS)
```

---

### 🔍 Multi-Device Sync

**Test data sync across devices:**
```bash
# Device 1 (Desktop):
1. Login
2. Create case "Test Case 1"
3. Add deadline

# Device 2 (Mobile):
1. Login (same account)
2. Navigate to cases
3. Should see "Test Case 1"
4. Edit deadline

# Device 1 (Desktop):
1. Reload
2. Should see updated deadline

# Expected:
- Data syncs via backend
- Changes reflected on all devices
- No conflicts (last write wins)
```

---

### 🔍 Service Worker Updates

**Test app updates:**
```bash
# Scenario: You deployed new version to Netlify

# User's device:
1. PWA already installed
2. Service worker checks for updates
3. New service worker downloads in background
4. User sees notification: "Update available"
5. User clicks "Update"
6. App refreshes with new version

# Test manually:
# DevTools → Application → Service Workers:
- Click "Update" button
- Click "skipWaiting" (forces update)
- Reload page → New version loaded
```

---

## Performance Testing

### ⚡ Page Load Time

```bash
# DevTools → Performance:
1. Click "Record"
2. Reload page
3. Click "Stop"

# Analyze:
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s

# If slow:
- Optimize images (use WebP)
- Code split (lazy load routes)
- Reduce JavaScript bundle size
```

---

### ⚡ API Response Time

```bash
# DevTools → Network:
- Sort by "Time" column
- Check API endpoints

# Target response times:
- GET /cases: < 500ms
- POST /chat/stream: < 1000ms (first token)
- POST /chat/upload-document: < 2000ms

# If slow:
- Add database indexes
- Optimize SQL queries
- Add caching (Redis)
```

---

## Browser Compatibility Testing

### Test Matrix

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| **Chrome** | ✅ | ✅ | Best PWA support |
| **Edge** | ✅ | ✅ | Chromium-based, same as Chrome |
| **Safari** | ✅ | ✅ | iOS PWA support |
| **Firefox** | ✅ | ✅ | Good PWA support |
| **Samsung Internet** | ❌ | ✅ | Popular on Samsung phones |

**Test on:**
- Chrome 120+ (most UK users)
- Safari iOS 16+ (iPhone users)
- Samsung Internet 20+ (Samsung phone users)

---

## Testing Workflow: Daily Development

**When making code changes:**

```bash
# 1. Make change locally
# Edit src/views/ChatView.tsx

# 2. Test locally
npm run dev
# Visit http://localhost:5176
# Test feature
# Check console for errors

# 3. Test PWA features locally
npm run build
npm run preview
# Visit http://localhost:4173
# F12 → Application → Check manifest, service worker
# DevTools → Lighthouse → Run audit

# 4. Deploy to Netlify (auto-deploy on push)
git add .
git commit -m "Add feature X"
git push origin main

# 5. Test on production
# Visit https://justicecompanion.netlify.app
# Test feature on real URL
# Test on mobile device (Android/iPhone)

# 6. Run Lighthouse on production
# DevTools → Lighthouse → Generate report
# Ensure PWA score is still 100

# 7. Test on real users (beta testers)
# Share URL with test users
# Collect feedback
```

---

## Bug Reporting Template

**When you find a bug:**

```markdown
## Bug Report

**Environment:**
- Device: [iPhone 14 / Samsung Galaxy / Desktop]
- Browser: [Chrome 120 / Safari 16 / Firefox 121]
- OS: [iOS 17 / Android 13 / Windows 11]
- PWA Version: [Check footer or /about page]

**Steps to Reproduce:**
1. Open Chat
2. Send message "Can they fire me?"
3. Click upload button

**Expected:**
- Upload dialog opens

**Actual:**
- Nothing happens

**Console Errors:**
[Paste from DevTools → Console]

**Network Errors:**
[Paste from DevTools → Network]

**Screenshots:**
[Attach screenshot]
```

---

## Automated Testing (Optional)

**Set up Playwright for E2E testing:**

```bash
# Install Playwright
npm install -D @playwright/test

# Create test file: tests/chat.spec.ts
import { test, expect } from '@playwright/test'

test('send chat message', async ({ page }) => {
  await page.goto('https://justicecompanion.netlify.app')

  // Login
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Navigate to chat
  await page.click('a[href="/chat"]')

  // Send message
  await page.fill('[name="message"]', 'Can they fire me?')
  await page.click('button:has-text("Send")')

  // Wait for AI response
  await expect(page.locator('.ai-message')).toBeVisible()
  await expect(page.locator('.ai-message')).toContainText('UK')
})

# Run tests
npx playwright test
```

---

## Testing Checklist: Before Launch

**Pre-launch checklist:**

- [ ] All core features work on desktop Chrome
- [ ] All core features work on mobile Chrome (Android)
- [ ] All core features work on mobile Safari (iOS)
- [ ] PWA installs on Android
- [ ] PWA installs on iOS
- [ ] Offline mode works (cached content visible)
- [ ] Service worker registered successfully
- [ ] Push notifications work (if implemented)
- [ ] Camera upload works on mobile
- [ ] Lighthouse PWA score: 100/100
- [ ] Lighthouse Performance score: 90+/100
- [ ] No console errors
- [ ] No network errors (500/404)
- [ ] Multi-device sync works
- [ ] HTTPS enabled (Netlify auto-provides)
- [ ] CORS configured correctly (backend accepts frontend)
- [ ] Environment variables set (Netlify)
- [ ] Backend health check returns 200 OK
- [ ] Database connected (Railway PostgreSQL)

---

## Next Steps

**After Phase 1 testing (backend cloud-ready):**
1. Deploy backend to Railway
2. Test backend health endpoint
3. Test API endpoints via curl/Postman

**After Phase 2 testing (PWA features added):**
1. Test PWA manifest
2. Test service worker
3. Test offline mode
4. Run Lighthouse audit

**After Phase 3 testing (mobile optimizations):**
1. Test on real Android phone
2. Test on real iPhone
3. Test camera upload
4. Test push notifications

**Launch when all checkboxes checked!**

---

**PWA testing is easier, faster, and more comprehensive than Electron testing.**
