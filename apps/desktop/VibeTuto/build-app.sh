#!/bin/bash
# Build VibeTuto using Xcode for proper code signing
# Uses a custom designated requirement so TCC permissions persist across rebuilds
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="VibeTuto"
BUILD_DIR=".build/debug"
DERIVED_DATA="$SCRIPT_DIR/.build/DerivedData"
TEAM_ID="K28B69CWQ7"

# Regenerate Xcode project from project.yml if xcodegen is available
if command -v xcodegen &> /dev/null; then
    echo "Regenerating Xcode project..."
    xcodegen generate 2>&1
fi

# Find signing identity hash (first Apple Development certificate)
CERT_HASH=$(security find-identity -v -p codesigning 2>/dev/null | grep "Apple Development" | head -1 | awk '{print $2}')

echo "Building $APP_NAME with Xcode..."
if [ -n "$CERT_HASH" ]; then
    echo "Signing with certificate: $CERT_HASH"
    xcodebuild \
        -project "$APP_NAME.xcodeproj" \
        -scheme "$APP_NAME" \
        -configuration Debug \
        -derivedDataPath "$DERIVED_DATA" \
        CODE_SIGN_STYLE=Manual \
        CODE_SIGN_IDENTITY="$CERT_HASH" \
        DEVELOPMENT_TEAM="$TEAM_ID" \
        PROVISIONING_PROFILE_SPECIFIER="" \
        build 2>&1 | tail -5
else
    echo "WARNING: No Apple Development certificate found."
    echo "Permissions won't persist across rebuilds."
    echo "To fix: Open Xcode > Settings > Accounts > Add Apple ID"
    xcodebuild \
        -project "$APP_NAME.xcodeproj" \
        -scheme "$APP_NAME" \
        -configuration Debug \
        -derivedDataPath "$DERIVED_DATA" \
        build 2>&1 | tail -5
fi

# Find the built .app
APP_PATH=$(find "$DERIVED_DATA" -name "$APP_NAME.app" -type d -maxdepth 6 | head -1)

if [ -z "$APP_PATH" ]; then
    echo "ERROR: Build succeeded but app bundle not found"
    exit 1
fi

# Copy to expected location
rm -rf "$BUILD_DIR/$APP_NAME.app"
mkdir -p "$BUILD_DIR"
cp -R "$APP_PATH" "$BUILD_DIR/$APP_NAME.app"

# Re-sign with a custom designated requirement that matches on TeamID + BundleID
# instead of CDHash. This ensures TCC permissions persist across rebuilds.
if [ -n "$CERT_HASH" ]; then
    echo "Re-signing with stable designated requirement..."
    codesign --force --deep --sign "$CERT_HASH" \
        --entitlements VibeTuto.entitlements \
        --requirements "=designated => identifier \"com.vibetuto.recorder\" and anchor apple generic and certificate leaf[subject.OU] = \"$TEAM_ID\"" \
        "$BUILD_DIR/$APP_NAME.app"
fi

echo ""
echo "App bundle created at: $BUILD_DIR/$APP_NAME.app"
echo ""
echo "To run: open $BUILD_DIR/$APP_NAME.app"
echo "To kill: pkill -f VibeTuto.app"
