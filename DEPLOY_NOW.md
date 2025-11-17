# Justice Companion - Quick Deployment Checklist
**Created:** 2025-11-17 18:56 UTC
**Status:** Code ready on GitHub - Awaiting cloud deployment

---

## Pre-Deployment Status

**✅ COMPLETED:**
- Code pushed to GitHub (commit ffe0a73)
- PWA fully tested locally (9/9 tests passing)
- Backend tested and working (user registration successful)
- Frontend build successful (1.6 MB, 26 precached entries)
- Service worker configured and ready
- Database supports both SQLite (local) and PostgreSQL (cloud)
- CORS configured for environment-based origins
- All secrets redacted from code

**GitHub Repository:** https://github.com/fattits30-dev/Justice-Companion

---

## Phase 1: Railway Backend Deployment (15-20 minutes)

### Step 1: Create Railway Account
1. Open https://railway.app
2. Click "Sign in" (top right)
3. Choose "Sign in with GitHub"
4. Authorize Railway to access your GitHub

### Step 2: Create New Project
1. Click "New Project" (or "Start a New Project")
2. Select "Deploy from GitHub repo"
3. Choose repository: `Justice-Companion`
4. Railway will detect the project and start deploying

### Step 3: Add PostgreSQL Database
1. In your Railway project dashboard, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will create the database and automatically set `DATABASE_URL` environment variable

### Step 4: Configure Environment Variables
1. Click on your backend service (in the project dashboard)
2. Go to "Variables" tab
3. Add these variables one by one:

```bash
# Required AI Configuration
AI_PROVIDER=huggingface
AI_API_KEY=<your_huggingface_api_key>
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct

# Required Security Key (generate if you don't have one)
ENCRYPTION_KEY_BASE64=<your_base64_encoded_32_byte_key>

# CORS Configuration (we'll update this after Netlify deployment)
ALLOWED_ORIGINS=http://localhost:5176,https://your-app.netlify.app

# Host Configuration (Railway auto-configures, but include for safety)
HOST=0.0.0.0
PORT=${{PORT}}
```

**To generate encryption key:**
```bash
# Run this command to generate a secure key:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 5: Verify Deployment
1. Wait for Railway to finish deploying (watch the build logs)
2. Once deployed, Railway will provide a public URL (e.g., `https://justice-companion-production.up.railway.app`)
3. Test the health endpoint:
   ```bash
   curl https://your-railway-url.up.railway.app/health
   ```
4. Expected response:
   ```json
   {
     "status": "healthy",
     "service": "Justice Companion Backend",
     "version": "1.0.0"
   }
   ```

**Copy your Railway URL - you'll need it for Netlify deployment!**

---

## Phase 2: Netlify Frontend Deployment (10-15 minutes)

### Step 1: Update Production Environment
**BEFORE deploying to Netlify**, update the production environment file:

1. Edit `.env.production` and replace the API URL:
   ```bash
   # Replace this line:
   VITE_API_URL=http://172.26.160.1:8000

   # With your Railway URL:
   VITE_API_URL=https://your-railway-url.up.railway.app
   ```

2. Commit and push this change:
   ```bash
   git add .env.production
   git commit -m "chore: update production API URL to Railway"
   git push origin main
   ```

### Step 2: Create Netlify Account
1. Open https://www.netlify.com
2. Click "Sign up" (or "Log in" if you have an account)
3. Choose "Sign up with GitHub"
4. Authorize Netlify to access your GitHub

### Step 3: Deploy Site from GitHub
1. Click "Add new site" → "Import an existing project"
2. Choose "Deploy with GitHub"
3. Select repository: `Justice-Companion`
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/renderer`
   - **Base directory:** (leave empty)

5. Add environment variable:
   - Click "Show advanced" → "New variable"
   - Key: `VITE_API_URL`
   - Value: `https://your-railway-url.up.railway.app` (your Railway URL)

6. Click "Deploy site"

### Step 4: Wait for Build
1. Netlify will build your app (takes 2-3 minutes)
2. Watch the build logs for any errors
3. Once deployed, Netlify provides a URL (e.g., `https://random-name-123456.netlify.app`)

### Step 5: Configure Custom Domain (Optional)
1. In Netlify dashboard, go to "Domain settings"
2. Click "Options" → "Edit site name"
3. Change to something memorable (e.g., `justice-companion`)
4. Your app will be at `https://justice-companion.netlify.app`

---

## Phase 3: Update Railway CORS

**IMPORTANT:** Now that you have the Netlify URL, update Railway's CORS configuration:

1. Go back to Railway project dashboard
2. Click on your backend service
3. Go to "Variables" tab
4. Update `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=https://your-app.netlify.app,http://localhost:5176
   ```
5. Railway will automatically redeploy with new CORS settings

---

## Phase 4: Test Live PWA (5-10 minutes)

### Manual Testing
1. Open your Netlify URL in a browser: `https://your-app.netlify.app`
2. You should see the login page
3. Click "Create account" and register a new user
4. Expected result: HTTP 201 Created, user account created

### PWA Installation Test
1. On Chrome/Edge, look for the install icon in the address bar
2. Click to install the PWA
3. The app should install as a standalone application
4. Test offline mode: Turn off Wi-Fi, app should still load (cached version)

### Service Worker Verification
1. Open DevTools (F12)
2. Go to "Application" tab → "Service Workers"
3. You should see the service worker registered and active
4. Status should be "Activated and is running"

---

## Expected Results

**Backend (Railway):**
- URL: `https://your-app.up.railway.app`
- Health check: ✅ Returns 200 OK
- Database: PostgreSQL (managed by Railway)
- Environment: Production

**Frontend (Netlify):**
- URL: `https://your-app.netlify.app`
- PWA: ✅ Installable
- Service Worker: ✅ Active (HTTPS required)
- Offline: ✅ Works (cached app shell)
- Build: ✅ 1.6 MB precached

**Integration:**
- CORS: ✅ Netlify → Railway communication
- User Registration: ✅ Works end-to-end
- Chat: ✅ Streaming responses work

---

## Troubleshooting

### Issue: Railway build fails
**Solution:**
- Check build logs in Railway dashboard
- Ensure `requirements.txt` includes all dependencies
- Verify `Procfile` is correct: `web: python -m backend.main`

### Issue: Netlify build fails
**Solution:**
- Check build logs in Netlify dashboard
- Ensure `VITE_API_URL` environment variable is set
- Verify build command: `npm run build`
- Verify publish directory: `dist/renderer`

### Issue: CORS errors in browser
**Solution:**
- Verify Railway `ALLOWED_ORIGINS` includes your Netlify URL
- Check Railway environment variables in dashboard
- Railway auto-redeploys when env vars change (wait 1-2 minutes)

### Issue: Service worker not registering
**Solution:**
- HTTPS is required (Netlify provides this automatically)
- Check browser console for errors
- Go to Chrome DevTools → Application → Service Workers
- Click "Update" to force re-registration

### Issue: Database connection errors
**Solution:**
- Verify PostgreSQL plugin is added in Railway
- Check `DATABASE_URL` is automatically set by Railway
- Railway provides this - you don't need to set it manually

---

## Estimated Timeline

| Phase | Time | Status |
|-------|------|--------|
| Railway Account Setup | 2 min | Pending |
| Railway Deployment | 10 min | Pending |
| Update .env.production | 1 min | Pending |
| Netlify Account Setup | 2 min | Pending |
| Netlify Deployment | 5 min | Pending |
| Update Railway CORS | 2 min | Pending |
| Testing | 5 min | Pending |
| **Total** | **~30 minutes** | Ready to start |

---

## Post-Deployment Tasks (Optional)

1. **Replace PWA Icons:**
   - Use `public/icon-generator.html` to create professional icons
   - Replace `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`
   - Push to GitHub, Netlify auto-deploys

2. **Run Lighthouse Audit:**
   - Open Chrome DevTools → Lighthouse
   - Run PWA audit
   - Target score: 100/100

3. **Test on Real Devices:**
   - Android phone: Install PWA from Chrome
   - iPhone: Add to Home Screen from Safari
   - Verify offline mode works

4. **Monitor Costs:**
   - Railway: ~£5/month (includes PostgreSQL)
   - Netlify: £0/month (free tier is sufficient)

---

## Environment Variables Quick Reference

**Railway Backend:**
```bash
AI_PROVIDER=huggingface
AI_API_KEY=<your_huggingface_key>
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
ENCRYPTION_KEY_BASE64=<generate_with_crypto>
ALLOWED_ORIGINS=https://your-app.netlify.app,http://localhost:5176
HOST=0.0.0.0
```

**Netlify Frontend:**
```bash
VITE_API_URL=https://your-railway-url.up.railway.app
```

---

## Success Criteria

**Deployment is successful when:**
- ✅ Railway backend returns 200 OK on `/health`
- ✅ Netlify frontend loads without errors
- ✅ User can register a new account (HTTP 201)
- ✅ Service worker is active (check DevTools)
- ✅ PWA install prompt appears (Chrome/Edge)
- ✅ App works offline (turn off Wi-Fi, reload)

---

**Ready to deploy? Follow the steps above in order. Estimated time: 30 minutes.**

**Questions or issues? Check the troubleshooting section or review the full deployment guide: DEPLOYMENT_GUIDE.md**
