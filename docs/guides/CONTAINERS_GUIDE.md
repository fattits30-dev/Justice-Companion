# Container Setup Guide - Justice Companion

**Last Updated**: 2025-10-09
**Status**: Optional - Containers for dev/testing, NOT for end-user distribution

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [When to Use Containers](#when-to-use-containers)
3. [Setup Options](#setup-options)
4. [Quick Start](#quick-start)
5. [Docker vs Podman](#docker-vs-podman)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Justice Companion is an **Electron desktop application** that users install natively (`.exe`, `.dmg`, `.AppImage`).

**Containers are NOT used for end-user distribution**, but ARE useful for:
- ✅ Development environment consistency
- ✅ CI/CD testing pipelines
- ✅ Optional backend services (Redis, AI)

---

## When to Use Containers

### ✅ Use Containers For:

1. **Development Team Onboarding**
   - New developers get instant setup
   - Consistent Node.js, npm versions
   - All dependencies pre-installed

2. **CI/CD Testing** ⭐ RECOMMENDED
   - GitHub Actions runs tests automatically
   - Same environment every time
   - Catches issues before merging

3. **Backend Services** (When you add them)
   - Redis for API caching
   - LM Studio for local AI
   - Background processing services

### ❌ Don't Use Containers For:

- ❌ Distributing app to end users (use electron-builder)
- ❌ Running SQLite (it's file-based, no need)
- ❌ Single-developer local development (overkill)

---

## Setup Options

### Option 1: Dev Containers (Easiest) ⭐ RECOMMENDED

**Best For**: Team development in VS Code/Cursor

**Prerequisites**:
- Docker Desktop or Podman Desktop installed
- VS Code or Cursor IDE

**Setup**:
1. Open project in Cursor/VS Code
2. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
3. Wait for container to build (3-5 minutes first time)
4. Done! ✅

**What You Get**:
- Node.js 22.x installed
- All npm dependencies installed
- Database migrations run automatically
- Extensions pre-configured
- Ports forwarded (5173, 5555)

**Config File**: `.devcontainer/devcontainer.json`

---

### Option 2: GitHub Actions (Testing) ⭐ ALSO RECOMMENDED

**Best For**: Automated testing on every commit

**Setup**:
1. Commit the `.github/workflows/test.yml` file
2. Push to GitHub
3. Tests run automatically! ✅

**What It Tests**:
- ✅ TypeScript compilation
- ✅ ESLint checks
- ✅ Unit tests (919/990 passing)
- ✅ E2E tests with Playwright
- ✅ Security audit (npm audit)
- ✅ Build verification

**Cost**: FREE for public repos, FREE for private repos (2,000 minutes/month)

**Config File**: `.github/workflows/test.yml`

---

### Option 3: Docker Compose (Optional Services)

**Best For**: When you add Redis, AI services, or background workers

**Start Services**:
```bash
# Start Redis cache
docker-compose up redis -d

# Start all services
docker-compose up -d

# Stop services
docker-compose down
```

**Services Available**:
- `redis` - API response caching (port 6379)
- `localai` - Local AI service (port 1234) - commented out by default

**Config File**: `docker-compose.yml`

---

## Quick Start

### For New Developers (Dev Containers):

```bash
# 1. Install Docker Desktop
# Download: https://www.docker.com/products/docker-desktop/

# 2. Open project in Cursor
cd "Justice Companion"
cursor .

# 3. Reopen in container
# Press Ctrl+Shift+P → "Dev Containers: Reopen in Container"

# 4. Wait for setup (3-5 min first time)

# 5. Start developing!
npm run dev
```

---

### For CI/CD (GitHub Actions):

```bash
# 1. Ensure .github/workflows/test.yml exists (already added)

# 2. Commit and push
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions testing pipeline"
git push

# 3. Check GitHub Actions tab
# https://github.com/<your-repo>/actions

# Tests run automatically on every push!
```

---

### For Backend Services (Docker Compose):

```bash
# 1. Start Redis for API caching
docker-compose up redis -d

# 2. Verify it's running
docker-compose ps

# 3. Connect from your app
# Redis is available at: localhost:6379

# 4. Stop when done
docker-compose down
```

---

## Docker vs Podman

### Docker Desktop ⭐ Recommended for Most Users

**Pros**:
- Most popular, huge community
- Excellent documentation
- VS Code integration is flawless
- Docker Compose included

**Cons**:
- Requires license for large enterprises
- Uses more resources (WSL2 on Windows)

**Install**: https://www.docker.com/products/docker-desktop/

---

### Podman Desktop (Alternative)

**Pros**:
- Fully open source, no licensing
- Rootless containers (more secure)
- Compatible with Docker commands
- Lighter resource usage

**Cons**:
- Smaller community
- Some Docker Compose features missing
- Windows support improving but newer

**Install**: https://podman-desktop.io/

**Make it work like Docker**:
```bash
# On Windows (PowerShell)
Set-Alias -Name docker -Value podman
```

---

## Container Files Reference

### `.devcontainer/devcontainer.json`
- Dev Container configuration
- Node.js 22, extensions, ports
- Runs migrations on startup

### `.github/workflows/test.yml`
- GitHub Actions workflow
- Runs tests, lint, type-check
- Generates test reports

### `Dockerfile.dev`
- Development container image
- Installs Electron dependencies
- Used by dev containers

### `docker-compose.yml`
- Multi-service orchestration
- Redis cache service
- Optional AI service (commented out)

### `.dockerignore`
- Files to exclude from container
- Same pattern as .gitignore

---

## Troubleshooting

### Dev Container Won't Start

**Error**: "Docker daemon not running"
```bash
# Windows: Start Docker Desktop
# Check system tray for Docker icon

# Linux: Start Docker service
sudo systemctl start docker
```

**Error**: "Port 5173 already in use"
```bash
# Stop local dev server first
# Then reopen in container
```

---

### GitHub Actions Failing

**Check Test Results**:
1. Go to GitHub repo → Actions tab
2. Click failing workflow
3. Expand failed step to see error
4. Fix locally, push again

**Common Issues**:
- Database migrations need updating
- New dependencies not in package.json
- Environment variables missing

---

### Docker Compose Issues

**Service won't start**:
```bash
# Check logs
docker-compose logs redis

# Restart service
docker-compose restart redis

# Full reset
docker-compose down -v
docker-compose up -d
```

**Port conflict**:
```bash
# Change port in docker-compose.yml
ports:
  - "6380:6379"  # Use different host port
```

---

## Performance Tips

### Dev Containers:

1. **Use volumes for node_modules**:
   - Mounted automatically in devcontainer.json
   - Speeds up npm install

2. **Allocate more resources**:
   - Docker Desktop → Settings → Resources
   - Increase CPU: 4+ cores
   - Increase RAM: 8+ GB

3. **WSL2 optimization (Windows)**:
   - Store project in WSL2 filesystem
   - Much faster than mounting from Windows

### GitHub Actions:

1. **Cache dependencies**:
   - Already configured in test.yml
   - Uses `actions/setup-node@v4` with cache

2. **Run in parallel**:
   - Matrix strategy for multiple Node versions
   - Separate jobs for tests vs lint

---

## Next Steps

### Recommended Setup Order:

1. **Week 1**: Set up GitHub Actions ✅
   - Automatic testing on every commit
   - Catches issues early
   - Zero local setup needed

2. **Week 2**: Try Dev Containers
   - When you add another developer
   - Instant onboarding
   - Consistent environment

3. **Later**: Add Docker Compose services
   - When you implement Redis caching
   - When you add AI services
   - When you need background workers

---

## Resources

- **Docker Docs**: https://docs.docker.com/
- **Dev Containers**: https://code.visualstudio.com/docs/devcontainers/containers
- **GitHub Actions**: https://docs.github.com/en/actions
- **Podman**: https://podman.io/docs
- **Docker Compose**: https://docs.docker.com/compose/

---

## Related Documentation

- [MASTER_BUILD_GUIDE.md](MASTER_BUILD_GUIDE.md) - Complete build process
- [BUILD_QUICK_REFERENCE.md](BUILD_QUICK_REFERENCE.md) - Quick commands
- [TODO.md](../../TODO.md) - Project roadmap

---

**Need Help?** Check the [GitHub Discussions](https://github.com/your-repo/discussions) or file an issue.
