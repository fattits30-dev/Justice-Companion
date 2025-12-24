#!/bin/bash
# Setup Android SDK in Termux for building APKs

set -e

echo "=== Justice Companion - Android SDK Setup ==="
echo ""

# Install required packages
echo "📦 Installing Java and build tools..."
pkg update -y
pkg install -y openjdk-17 gradle wget unzip

# Set up directories
ANDROID_HOME="$HOME/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

# Download Android command line tools
echo ""
echo "📥 Downloading Android SDK command line tools..."
cd /tmp
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
wget -q --show-progress "$CMDLINE_TOOLS_URL" -O cmdline-tools.zip

echo ""
echo "📂 Extracting..."
unzip -q -o cmdline-tools.zip
mv cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
rm cmdline-tools.zip

# Set environment variables
echo ""
echo "⚙️ Setting up environment variables..."
cat >> ~/.bashrc << 'EOF'

# Android SDK
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/build-tools/34.0.0"
EOF

# Apply to current session
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

# Accept licenses and install required SDK components
echo ""
echo "📦 Installing Android SDK components..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo ""
echo "✅ Android SDK setup complete!"
echo ""
echo "Run: source ~/.bashrc"
echo "Then: ./scripts/build-apk.sh"
