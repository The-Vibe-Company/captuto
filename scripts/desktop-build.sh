#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# desktop-build.sh — Build, run, and manage the CapTuto desktop app
#
# Usage: ./scripts/desktop-build.sh              Build & launch the app
#        ./scripts/desktop-build.sh --stop       Kill running instance
#        ./scripts/desktop-build.sh --status     Check if running
#        ./scripts/desktop-build.sh --rebuild    Force kill + rebuild + launch
#        ./scripts/desktop-build.sh --logs       Tail xcodebuild logs
#
# Idempotent: if the app is already running, it won't rebuild unless --rebuild.
# =============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/apps/desktop/VibeTuto"
BUILD_DIR="$DESKTOP_DIR/.build/debug"
DERIVED_DATA="$DESKTOP_DIR/.build/DerivedData"
PROJECT_NAME="VibeTuto"
SCHEME_NAME="VibeTuto"
APP_NAME="CapTuto"
BUNDLE_ID="com.vibetuto.recorder"
TEAM_ID="K28B69CWQ7"
LOG_FILE="$ROOT_DIR/.desktop-build.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
step()  { echo -e "${CYAN}[→]${NC} $*"; }
die()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

# --------------- helpers ---------------

is_app_running() {
  pgrep -f "$APP_NAME.app" &>/dev/null
}

get_app_pid() {
  pgrep -f "$APP_NAME.app" 2>/dev/null | head -1
}

kill_app() {
  if is_app_running; then
    local pid
    pid=$(get_app_pid)
    kill "$pid" 2>/dev/null || true
    # Wait for graceful shutdown
    local waited=0
    while is_app_running && [ $waited -lt 5 ]; do
      sleep 1
      waited=$((waited + 1))
    done
    # Force kill if still running
    if is_app_running; then
      kill -9 "$(get_app_pid)" 2>/dev/null || true
    fi
  fi
}

check_xcode_tools() {
  command -v xcodebuild &>/dev/null || die "Xcode command line tools not found. Install with: xcode-select --install"
}

find_signing_cert() {
  security find-identity -v -p codesigning 2>/dev/null | grep "Apple Development" | head -1 | awk '{print $2}'
}

do_build() {
  cd "$DESKTOP_DIR"

  # Regenerate Xcode project if xcodegen available
  if command -v xcodegen &>/dev/null; then
    step "Regenerating Xcode project..."
    xcodegen generate 2>&1 | tail -2
  fi

  local cert_hash
  cert_hash=$(find_signing_cert)

  step "Building $APP_NAME..."
  if [ -n "$cert_hash" ]; then
    xcodebuild \
      -project "$PROJECT_NAME.xcodeproj" \
      -scheme "$SCHEME_NAME" \
      -configuration Debug \
      -derivedDataPath "$DERIVED_DATA" \
      CODE_SIGN_STYLE=Manual \
      CODE_SIGN_IDENTITY="$cert_hash" \
      DEVELOPMENT_TEAM="$TEAM_ID" \
      PROVISIONING_PROFILE_SPECIFIER="" \
      build > "$LOG_FILE" 2>&1
  else
    warn "No Apple Development certificate found — permissions won't persist across rebuilds"
    xcodebuild \
      -project "$PROJECT_NAME.xcodeproj" \
      -scheme "$SCHEME_NAME" \
      -configuration Debug \
      -derivedDataPath "$DERIVED_DATA" \
      build > "$LOG_FILE" 2>&1
  fi

  if [ $? -ne 0 ]; then
    die "Build failed. Run: ./scripts/desktop-build.sh --logs"
  fi

  # Find and copy the built app
  local app_path
  app_path=$(find "$DERIVED_DATA" -name "$APP_NAME.app" -type d -maxdepth 6 | head -1)
  [ -n "$app_path" ] || die "Build succeeded but app bundle not found"

  rm -rf "$BUILD_DIR/$APP_NAME.app"
  mkdir -p "$BUILD_DIR"
  cp -R "$app_path" "$BUILD_DIR/$APP_NAME.app"

  # Re-sign with stable designated requirement for persistent TCC permissions
  if [ -n "$cert_hash" ]; then
    step "Signing with stable designated requirement..."
    codesign --force --deep --sign "$cert_hash" \
      --entitlements VibeTuto.entitlements \
      --requirements "=designated => identifier \"$BUNDLE_ID\" and anchor apple generic and certificate leaf[subject.OU] = \"$TEAM_ID\"" \
      "$BUILD_DIR/$APP_NAME.app" 2>/dev/null
  fi

  info "Build complete: $BUILD_DIR/$APP_NAME.app"
}

# --------------- commands ---------------

cmd_stop() {
  if is_app_running; then
    kill_app
    info "$APP_NAME stopped"
  else
    info "$APP_NAME is not running"
  fi
}

cmd_status() {
  if is_app_running; then
    info "$APP_NAME is running (PID: $(get_app_pid))"
    return 0
  else
    warn "$APP_NAME is not running"
    if [ -d "$BUILD_DIR/$APP_NAME.app" ]; then
      info "Last build exists at $BUILD_DIR/$APP_NAME.app"
    else
      warn "No build found — run: ./scripts/desktop-build.sh"
    fi
    return 1
  fi
}

cmd_logs() {
  if [ -f "$LOG_FILE" ]; then
    tail -50 "$LOG_FILE"
  else
    warn "No build log found"
  fi
}

cmd_start() {
  check_xcode_tools

  # If already running, don't rebuild
  if is_app_running; then
    info "$APP_NAME already running (PID: $(get_app_pid))"
    exit 0
  fi

  do_build
  step "Launching $APP_NAME..."
  open "$BUILD_DIR/$APP_NAME.app"
  sleep 1

  if is_app_running; then
    info "$APP_NAME launched (PID: $(get_app_pid))"
  else
    die "App failed to launch. Check Console.app for crash logs."
  fi
}

cmd_rebuild() {
  check_xcode_tools

  if is_app_running; then
    step "Stopping running instance..."
    kill_app
  fi

  do_build
  step "Launching $APP_NAME..."
  open "$BUILD_DIR/$APP_NAME.app"
  sleep 1

  if is_app_running; then
    info "$APP_NAME rebuilt and launched (PID: $(get_app_pid))"
  else
    die "App failed to launch after rebuild. Check Console.app for crash logs."
  fi
}

# --------------- main ---------------

case "${1:-}" in
  --stop)    cmd_stop    ;;
  --status)  cmd_status  ;;
  --rebuild) cmd_rebuild ;;
  --logs)    cmd_logs    ;;
  *)         cmd_start   ;;
esac
