# Developing Justice Companion on Android/Termux

This guide covers setting up a development environment on Android using Termux.

## Prerequisites

Install [Termux](https://f-droid.org/en/packages/com.termux/) from F-Droid (not Google Play - that version is outdated).

## Initial Termux Setup

```bash
# Update packages
pkg update && pkg upgrade -y

# Install essential tools
pkg install -y git nodejs-lts python openssh

# Optional but recommended
pkg install -y vim neovim which curl wget

# Set up storage access (for accessing files from other apps)
termux-setup-storage
```

## Clone the Repository

```bash
# Navigate to home directory
cd ~

# Clone the repo
git clone https://github.com/fattits30-dev/Justice-Companion.git
cd Justice-Companion

# Or if you have SSH keys set up:
# git clone git@github.com:fattits30-dev/Justice-Companion.git
```

## Install Dependencies

### Frontend (Node.js)

```bash
# Install frontend dependencies
npm ci

# Or with pnpm (faster, smaller disk usage):
npm install -g pnpm
pnpm install
```

### Backend (Python) - Optional

The backend requires Python and several ML libraries. Some may be challenging on Termux.

```bash
# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate

# Install basic dependencies
pip install --upgrade pip
pip install fastapi uvicorn sqlalchemy python-dotenv

# Note: torch and ML libraries may fail on ARM Android
# For full backend, use GitHub Actions CI instead
```

## Running the Development Server

Use the cross-platform scripts:

```bash
# Frontend only (recommended for Termux)
./scripts/dev.sh frontend

# Backend only
./scripts/dev.sh backend

# Full stack
./scripts/dev.sh full
```

The frontend dev server will be available at `http://localhost:5173`

**Tip:** Access from other devices on the same network using your phone's IP address.

## Running Tests

```bash
# Frontend unit tests
./scripts/test.sh frontend

# Backend tests (if Python deps installed)
./scripts/test.sh backend

# All tests
./scripts/test.sh all
```

**Note:** Playwright e2e tests don't work on Termux (no browser support). Use GitHub Actions for e2e testing.

## Linting and Formatting

```bash
# Check all linting
./scripts/lint.sh

# Auto-fix issues
./scripts/lint.sh fix
```

## Building for Production

```bash
./scripts/build.sh
```

The build output will be in the `dist/` directory.

## Common Issues and Fixes

### Node.js/npm Issues

**Error: `ENOSPC: System limit for number of file watchers reached`**

```bash
# Termux uses Android's inotify limits. Reduce watchers:
echo 'fs.inotify.max_user_watches=524288' >> ~/.profile
```

Alternatively, use polling mode:
```bash
CHOKIDAR_USEPOLLING=true npm run dev
```

**Error: `node-gyp rebuild failed`**

Some native modules (like `better-sqlite3`) require build tools:
```bash
pkg install -y build-essential python
```

If still failing, the CI will handle builds with native deps.

### Python/pip Issues

**Error: `externally-managed-environment`**

Use a virtual environment:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Error: Installing `torch` fails**

PyTorch doesn't have official ARM Android builds. Options:
1. Skip backend development on Termux
2. Use a mock/stub for torch-dependent features
3. Run backend tests via GitHub Actions

### Git Issues

**Error: `Permission denied (publickey)`**

Set up SSH keys:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add this key to GitHub Settings > SSH Keys
```

### Build Fails with Service Worker Error

If the build completes JS/CSS but fails on service worker:

```
error during build: Unable to write the service worker file
```

This is a terser/workbox memory issue on Termux. The core build completes successfully. Options:
1. Use GitHub Actions for production builds (recommended)
2. The `dist/` folder will contain the built app without PWA features

### Port Already in Use

```bash
# Find process using port 5173
lsof -i :5173

# Kill it
pkill -f vite

# Or use a different port
VITE_PORT=3000 npm run dev
```

### Storage/Permission Issues

If you can't access files:
```bash
termux-setup-storage
# Grant storage permission when prompted
```

## Recommended Workflow

Since some operations (e2e tests, full backend testing, native module builds) are challenging on Termux:

1. **Develop locally on Termux**: Edit code, run frontend, run unit tests
2. **Push to GitHub**: Let CI handle full test suite and builds
3. **Review CI results**: Check GitHub Actions for any failures

```bash
# Typical workflow
git pull origin main
./scripts/dev.sh frontend    # Start developing
# ... make changes ...
./scripts/lint.sh fix        # Fix any lint issues
./scripts/test.sh frontend   # Run quick tests
git add . && git commit -m "feat: your changes"
git push origin your-branch
# Check CI at https://github.com/fattits30-dev/Justice-Companion/actions
```

## Useful Termux Shortcuts

- **Volume Down + C**: Send Ctrl+C (stop running process)
- **Volume Down + L**: Clear terminal
- **Volume Down + W**: Send Ctrl+W (delete word)

## External Keyboard

If using a Bluetooth keyboard, most shortcuts work normally:
- `Ctrl+C`: Stop process
- `Ctrl+Z`: Suspend process
- `Tab`: Autocomplete

## Resources

- [Termux Wiki](https://wiki.termux.com/)
- [Termux Packages](https://github.com/termux/termux-packages)
- [Node.js in Termux](https://wiki.termux.com/wiki/Node.js)
