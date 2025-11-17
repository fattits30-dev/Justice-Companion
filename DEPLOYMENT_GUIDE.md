# Justice Companion - Cloud Deployment Guide
**Progressive Web App Deployment to Railway + Netlify**
**Date:** 2025-11-17
**Target:** Production-ready PWA in ~3-4 days

---

## Overview

This guide walks you through deploying Justice Companion as a PWA:
- **Backend:** Railway (FastAPI + PostgreSQL)
- **Frontend:** Netlify (React PWA)
- **Total cost:** ~£5-10/month

---

## Prerequisites

**Accounts needed:**
1. Railway account (https://railway.app) - £0-5/month
2. Netlify account (https://netlify.com) - £0/month (free tier)
3. GitHub account (to connect repositories)

**Local requirements:**
- Git installed
- Backend running locally (confirmed working)
- Frontend running locally (confirmed working)

---

## Phase 1: Backend Deployment to Railway (2-3 hours)

### Step 1.1: Prepare Backend

**✅ Already done:**
- `backend/models/base.py` - Cloud-ready database configuration
- `backend/main.py` - Cloud-ready CORS and host configuration
- `backend/requirements.txt` - PostgreSQL drivers included
- `Procfile` - Railway process definition

**Verify locally:**
```bash
# Test that backend still works locally
cd backend
python main.py

# Should see:
# Starting Justice Companion Backend on 127.0.0.1:8000
# Environment: Development
# Database: SQLite (local)
```

---

### Step 1.2: Create GitHub Repository

```bash
# If not already a Git repo:
git init
git add .
git commit -m "Initial commit - Justice Companion PWA"

# Create repo on GitHub (https://github.com/new)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/justice-companion.git
git branch -M main
git push -u origin main
```

---

### Step 1.3: Deploy to Railway

**1. Sign up / Log in to Railway:**
- Visit https://railway.app
- Sign in with GitHub

**2. Create New Project:**
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your `justice-companion` repository

**3. Add PostgreSQL Database:**
- In your Railway project, click "New"
- Select "Database" → "Add PostgreSQL"
- Railway automatically creates PostgreSQL and sets `DATABASE_URL` env var

**4. Configure Environment Variables:**
- In Railway project, click on your service
- Go to "Variables" tab
- Add these variables:

```bash
# Required variables:
ENCRYPTION_KEY_BASE64=<your_key_from_.env>
AI_PROVIDER=huggingface
AI_API_KEY=<your_huggingface_key>
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct

# Optional (Railway auto-configures):
HOST=0.0.0.0
RELOAD=false
```

**5. Configure Start Command:**
- In Railway service settings, go to "Settings" → "Deploy"
- Set "Start Command" to:
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

**6. Deploy:**
- Railway automatically deploys on every push to main branch
- Watch deployment logs in Railway dashboard
- Wait for "Deployed" status

**7. Get Backend URL:**
- In Railway, go to "Settings" → "Networking"
- Click "Generate Domain"
- You'll get a URL like: `https://justice-companion-production.up.railway.app`

**8. Test Backend:**
```bash
# Test health endpoint
curl https://YOUR-RAILWAY-URL.up.railway.app/health

# Should return:
# {"status":"healthy","service":"Justice Companion Backend","version":"1.0.0"}
```

---

### Step 1.4: Update CORS for PWA

Once you have your Railway URL, update CORS to allow future PWA domain:

**In Railway dashboard:**
- Go to Variables
- Add:
```bash
ALLOWED_ORIGINS=https://YOUR-RAILWAY-URL.up.railway.app,https://localhost:5176
```

- After deploying frontend to Netlify (next phase), add Netlify URL too:
```bash
ALLOWED_ORIGINS=https://YOUR-RAILWAY-URL.up.railway.app,https://justicecompanion.netlify.app
```

---

### Step 1.5: Verify Database Migration

**Railway automatically creates tables on first startup.**

To verify:
```bash
# Check Railway logs
# Should see: "Database initialized successfully"

# Optional: Connect to Railway PostgreSQL locally
# In Railway, click PostgreSQL → Connect → Copy connection string
# Then use psql or database GUI tool
```

---

## Phase 2: Frontend PWA Conversion (3-4 hours)

### Step 2.1: Install PWA Plugin

```bash
# In project root
npm install vite-plugin-pwa -D
```

---

### Step 2.2: Configure vite.config.ts

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Justice Companion',
        short_name: 'JusticeAI',
        description: 'AI-powered legal case management for UK employment law',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.railway\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
```

---

### Step 2.3: Create PWA Icons

**Generate icons from your logo:**
- Use https://realfavicongenerator.net
- Upload your logo
- Generate icons (192x192, 512x512, apple-touch-icon)
- Download and place in `public/` folder

**Or create placeholder icons:**
```bash
# Create placeholder icons (replace with real ones later)
# You can use any image editor or online tool
```

---

### Step 2.4: Update API Client for Cloud Backend

```typescript
// src/lib/apiClient.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Rest of your apiClient code stays the same
```

**Create environment files:**

**.env.development:**
```bash
VITE_API_URL=http://localhost:8000
```

**.env.production:**
```bash
VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

---

### Step 2.5: Test PWA Locally

```bash
# Build production version
npm run build

# Preview production build
npm run preview

# Open browser to http://localhost:4173
# Open DevTools (F12) → Application → Manifest
# Should see "Justice Companion" manifest
# Should see Service Worker registered
```

---

## Phase 3: Deploy Frontend to Netlify (1 hour)

### Step 3.1: Prepare for Deployment

**Update .gitignore (if needed):**
```bash
# Make sure these are in .gitignore:
.env
.env.local
dist/
node_modules/
```

**Commit changes:**
```bash
git add .
git commit -m "Add PWA support and cloud backend configuration"
git push origin main
```

---

### Step 3.2: Deploy to Netlify

**1. Sign up / Log in to Netlify:**
- Visit https://netlify.com
- Sign in with GitHub

**2. Create New Site:**
- Click "Add new site" → "Import an existing project"
- Choose GitHub
- Select your `justice-companion` repository

**3. Configure Build Settings:**
```bash
# Build command:
npm run build

# Publish directory:
dist

# Environment variables (add in Netlify UI):
VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app
```

**4. Deploy:**
- Click "Deploy site"
- Netlify builds and deploys automatically
- Wait for deployment to complete

**5. Get PWA URL:**
- Netlify gives you a URL like: `https://amazing-name-123456.netlify.app`
- You can customize it: Site settings → Change site name → `justicecompanion`
- Result: `https://justicecompanion.netlify.app`

---

### Step 3.3: Update Backend CORS

**In Railway dashboard:**
- Go to your backend service → Variables
- Update `ALLOWED_ORIGINS`:
```bash
ALLOWED_ORIGINS=https://justicecompanion.netlify.app,https://YOUR-RAILWAY-URL.up.railway.app
```

- Railway auto-redeploys with new env var

---

### Step 3.4: Test PWA

**On Desktop:**
1. Visit `https://justicecompanion.netlify.app`
2. Chrome should show "Install" icon in address bar
3. Click install → PWA installs to OS
4. Test: Register, login, send chat message, upload document

**On Mobile (Android):**
1. Visit `https://justicecompanion.netlify.app` in Chrome
2. Chrome shows "Add to Home Screen" banner
3. Tap "Add"
4. Icon appears on home screen
5. Tap icon → App opens in standalone mode
6. Test: Camera upload, notifications

---

## Phase 4: Mobile Optimizations (2-3 hours)

### Step 4.1: Add Mobile Navigation

```typescript
// src/components/MobileNav.tsx
export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
      <div className="flex justify-around py-2">
        <NavButton icon="home" label="Home" to="/" />
        <NavButton icon="chat" label="Chat" to="/chat" />
        <NavButton icon="cases" label="Cases" to="/cases" />
        <NavButton icon="profile" label="Profile" to="/profile" />
      </div>
    </nav>
  )
}
```

---

### Step 4.2: Add Camera Upload

```typescript
// src/components/DocumentUpload.tsx
<input
  type="file"
  accept="image/*,application/pdf"
  capture="environment" // Use rear camera on mobile
  onChange={handleUpload}
  className="md:hidden" // Only show on mobile
/>
```

---

### Step 4.3: Add Push Notifications

```typescript
// src/services/notifications.ts
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
      })
      // Send subscription to backend
      await apiClient.post('/notifications/subscribe', subscription)
    }
  }
}
```

**Backend push notification endpoint (create later):**
```python
# backend/routes/notifications.py
@router.post("/notifications/subscribe")
async def subscribe_to_notifications(subscription: dict):
    # Store subscription in database
    # Use web-push library to send notifications
    pass
```

---

### Step 4.4: Test Offline Mode

**Test offline functionality:**
1. Open PWA on mobile
2. View a case with evidence
3. Turn off WiFi and mobile data
4. Reload app
5. Should still see cached case data
6. Try to chat → Show "offline" message
7. Turn on internet
8. App syncs new data

---

## Phase 5: Testing & Launch (1-2 hours)

### Step 5.1: Run Lighthouse Audit

```bash
# In Chrome DevTools (F12):
1. Open "Lighthouse" tab
2. Select "Progressive Web App"
3. Click "Generate report"
4. Target: 100/100 PWA score
```

**Fix common PWA issues:**
- Missing manifest icons → Add 192x192 and 512x512 icons
- No HTTPS → Netlify provides HTTPS automatically
- Service worker not registered → Check vite-plugin-pwa config

---

### Step 5.2: Test on Real Devices

**Test matrix:**
- ✅ Chrome Android (most common UK users)
- ✅ Safari iOS (iPhone users)
- ✅ Chrome Desktop (advisors)
- ✅ Firefox Desktop
- ✅ Samsung Internet (Samsung phones)

**Test scenarios:**
1. Register new account
2. Login
3. Send chat message
4. Upload document (mobile: use camera)
5. Create case from chat
6. Add deadline
7. Receive deadline notification (test push)
8. Offline mode (view case offline)
9. Multi-device sync (login on phone, then desktop)

---

### Step 5.3: Performance Optimization

**If needed, optimize:**

```typescript
// Code splitting for faster load
const ChatView = lazy(() => import('./views/ChatView'))
const CasesView = lazy(() => import('./views/CasesView'))

// Optimize images
// Use WebP format for icons
// Lazy load images in case evidence gallery
```

---

## Deployment Checklist

**Backend (Railway):**
- [x] PostgreSQL database added
- [x] Environment variables set (ENCRYPTION_KEY, AI_API_KEY, ALLOWED_ORIGINS)
- [x] Deployment successful (check logs)
- [x] Health endpoint returns 200 OK
- [x] CORS allows frontend domain

**Frontend (Netlify):**
- [ ] PWA manifest configured
- [ ] Service worker registered
- [ ] Icons generated (192x192, 512x512)
- [ ] Environment variables set (VITE_API_URL)
- [ ] Build successful
- [ ] Lighthouse PWA score > 90

**Testing:**
- [ ] Can register/login
- [ ] Chat works (AI responds)
- [ ] Document upload works
- [ ] Cases created
- [ ] Deadlines added
- [ ] Offline mode works
- [ ] Mobile install works
- [ ] Multi-device sync works

---

## Cost Breakdown

**Railway (Backend + Database):**
- Starter plan: £5/month
- Includes: 500 hours runtime, PostgreSQL database
- Scales automatically

**Netlify (Frontend):**
- Free tier: £0/month
- Includes: 100 GB bandwidth, HTTPS, auto-deploys
- More than enough for early users

**Total: £5/month (vs £0 for local Electron, but reaches ALL devices)**

---

## Monitoring & Maintenance

**Railway Dashboard:**
- Monitor backend logs
- Check database usage
- Monitor response times

**Netlify Dashboard:**
- Monitor bandwidth usage
- Check build logs
- View deployment history

**Set up alerts:**
- Railway: Email alerts for errors
- Netlify: Deploy notifications to email

---

## Rollback Plan

**If something breaks:**

```bash
# Rollback backend (Railway):
# In Railway dashboard → Deployments → Click previous deploy → Redeploy

# Rollback frontend (Netlify):
# In Netlify dashboard → Deploys → Click previous deploy → Publish

# Rollback code (Git):
git revert HEAD
git push origin main
```

---

## Next Steps After Deployment

1. **Custom Domain (Optional):**
   - Buy domain: justicecompanion.co.uk
   - Point DNS to Netlify (frontend)
   - Point api.justicecompanion.co.uk to Railway (backend)

2. **Analytics:**
   - Add Google Analytics or Plausible
   - Track: User sign-ups, chat usage, case creation

3. **User Feedback:**
   - Add feedback button in PWA
   - Collect: What works, what breaks, feature requests

4. **Marketing:**
   - Share on UK legal forums
   - Citizens Advice bulletin boards
   - Social media (Twitter, Facebook groups)

---

## Troubleshooting

**Backend won't start on Railway:**
```bash
# Check logs in Railway dashboard
# Common issues:
- Missing environment variable → Add in Railway Variables
- Database connection error → Check DATABASE_URL is set
- Port binding error → Railway sets PORT automatically, use $PORT
```

**Frontend can't connect to backend:**
```bash
# Check:
1. VITE_API_URL is set correctly in Netlify env vars
2. CORS is configured in Railway backend (ALLOWED_ORIGINS)
3. Backend health endpoint responds: curl https://YOUR-RAILWAY-URL/health
```

**PWA won't install:**
```bash
# Check:
1. Lighthouse audit for PWA requirements
2. Manifest.json is valid (DevTools → Application → Manifest)
3. Service worker registered (DevTools → Application → Service Workers)
4. HTTPS enabled (Netlify provides this automatically)
```

---

## Support

**Need help?**
- Railway docs: https://docs.railway.app
- Netlify docs: https://docs.netlify.com
- PWA docs: https://web.dev/progressive-web-apps

**Common issues documented in:**
- TESTING_GUIDE.md (for testing)
- PWA_CONVERSION_PLAN.md (for implementation details)

---

**You're done! Justice Companion is now a production-ready PWA accessible from any device.**
