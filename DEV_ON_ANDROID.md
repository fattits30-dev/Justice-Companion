# Developing Justice Companion on Android/Termux

This guide covers setting up a development environment on Android using Termux.

## Prerequisites

- Install [Termux](https://f-droid.org/en/packages/com.termux/) from F-Droid (the Play Store version is outdated).
- Ensure you have enough storage (Flutter + backend deps are large).

## Initial Termux Setup

```bash
# Update packages
pkg update && pkg upgrade -y

# Install essential tools
pkg install -y git python3 openssh

# Optional utilities
pkg install -y vim neovim which curl wget

# Set up storage access (for accessing files from other apps)
termux-setup-storage
```

## Clone the Repository

```bash
cd ~
git clone https://github.com/fattits30-dev/Justice-Companion.git
cd Justice-Companion
```

## Install Flutter (Frontend)

Flutter on Termux can be limited. If Flutter setup fails on-device, use a desktop
for the Flutter frontend and keep Termux for backend work.

If you do have Flutter installed:
```bash
flutter pub get
```

## Backend (Python) - Optional

The backend requires Python and several ML libraries. Some may be challenging on Termux.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If ML/torch installs fail on Android, use GitHub Actions or a desktop for full backend tests.

## Running the Development Server

```bash
# Frontend only (Flutter)
./scripts/dev.sh frontend

# Backend only
./scripts/dev.sh backend

# Full stack (backend + Flutter)
./scripts/dev.sh full
```

For web on-device, set `FLUTTER_DEVICE=chrome`:
```bash
FLUTTER_DEVICE=chrome ./scripts/dev.sh frontend
```

## Running Tests

```bash
./scripts/test.sh frontend
./scripts/test.sh backend
./scripts/test.sh all
```

## Linting and Formatting

```bash
./scripts/lint.sh
./scripts/lint.sh fix
```

## Building for Production

```bash
./scripts/build.sh web   # Flutter web build
./scripts/build.sh apk   # Android APK (if supported)
```

## Common Issues and Fixes

### Flutter/Dart Not Found

Ensure Flutter is installed and on PATH:
```bash
flutter --version
dart --version
```

### Python/pip Issues

**Error: `externally-managed-environment`**

Use a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### OCR Requirements

OCR needs the Tesseract binary:
```bash
pkg install -y tesseract
```

If Tesseract isn't available on Termux, skip OCR locally and rely on desktop/CI.

### Git Issues

**Error: `Permission denied (publickey)`**

Set up SSH keys:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add this key to GitHub Settings > SSH Keys
```

## Recommended Workflow

1. Develop locally on Termux (frontend or backend as available).
2. Push to GitHub and let CI handle full test/build jobs.
3. Review CI results for any failures.
