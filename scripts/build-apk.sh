#!/bin/bash
# Build Justice Companion APK

set -e

echo "=== Justice Companion - APK Builder ==="
echo ""

# Check for Android SDK
if [ -z "$ANDROID_HOME" ]; then
  export ANDROID_HOME="$HOME/android-sdk"
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
  export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
  export PATH="$PATH:$ANDROID_HOME/platform-tools"
  export PATH="$PATH:$ANDROID_HOME/build-tools/34.0.0"
fi

if [ ! -d "$ANDROID_HOME/platform-tools" ]; then
  echo "❌ Android SDK not found!"
  echo "Run: ./scripts/setup-android-sdk.sh first"
  exit 1
fi

cd /data/data/com.termux/files/home/Justice-Companion

# Step 1: Build web app
echo "🔨 Building web app..."
CAPACITOR_BUILD=true VITE_LOCAL_MODE=true npm run build 2>&1 | grep -v "error during build" || true

# Step 2: Sync to Android
echo ""
echo "📱 Syncing to Android project..."
npx cap sync android

# Step 3: Build APK
echo ""
echo "🏗️ Building APK (this may take a few minutes)..."
cd android

# Use gradle wrapper
chmod +x gradlew

# Build debug APK (faster, good for testing)
./gradlew assembleDebug --no-daemon

# Output location
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
  # Copy to more accessible location
  cp "$APK_PATH" ../justice-companion.apk

  echo ""
  echo "✅ APK built successfully!"
  echo ""
  echo "📍 APK location: $(pwd)/../justice-companion.apk"
  echo "📦 Size: $(du -h ../justice-companion.apk | cut -f1)"
  echo ""
  echo "To install: pm install ../justice-companion.apk"
  echo "Or: adb install ../justice-companion.apk"
else
  echo "❌ APK build failed"
  exit 1
fi
