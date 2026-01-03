#!/bin/bash
# Build Justice Companion APK (Flutter)

set -e

echo "=== Justice Companion - APK Builder ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check for Flutter
if ! command -v flutter &>/dev/null; then
  echo "❌ Flutter not found! Install Flutter and ensure it is on PATH."
  exit 1
fi

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

cd "$PROJECT_ROOT"

BUILD_MODE="${BUILD_MODE:-debug}"
case "$BUILD_MODE" in
  debug|release|profile) ;;
  *)
    echo "❌ Invalid BUILD_MODE: $BUILD_MODE (use debug|release|profile)"
    exit 1
    ;;
esac

echo ""
echo "🏗️ Building APK ($BUILD_MODE)..."
flutter build apk "--$BUILD_MODE"

APK_PATH="build/app/outputs/flutter-apk/app-${BUILD_MODE}.apk"

if [ -f "$APK_PATH" ]; then
  OUTPUT_APK="justice-companion-${BUILD_MODE}.apk"
  cp "$APK_PATH" "$OUTPUT_APK"

  echo ""
  echo "✅ APK built successfully!"
  echo ""
  echo "📍 APK location: $PROJECT_ROOT/$OUTPUT_APK"
  echo "📦 Size: $(du -h "$OUTPUT_APK" | cut -f1)"
  echo ""
  echo "To install: pm install $OUTPUT_APK"
  echo "Or: adb install $OUTPUT_APK"
else
  echo "❌ APK build failed"
  exit 1
fi
