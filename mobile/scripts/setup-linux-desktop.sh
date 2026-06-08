#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-shot setup for running the patient app as a Linux DESKTOP window.
#
#   cd mobile && ./scripts/setup-linux-desktop.sh
#   flutter run -d linux --dart-define=API_BASE_URL=http://localhost:8080
#
# Installs the GTK/clang toolchain Flutter desktop needs, enables the linux
# desktop target, generates the linux/ scaffold, and fetches packages. The app
# code is already desktop-safe (mobile-only permission plugins are skipped on
# Linux; token storage degrades gracefully without a keyring).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."   # → mobile/

echo "▸ Installing desktop build dependencies…"
if command -v dnf >/dev/null 2>&1; then
  # Fedora / RHEL
  sudo dnf install -y \
    clang cmake ninja-build pkgconf-pkg-config \
    gtk3-devel xz-devel libsecret-devel \
    mesa-libGL-devel
elif command -v apt-get >/dev/null 2>&1; then
  # Debian / Ubuntu
  sudo apt-get update
  sudo apt-get install -y \
    clang cmake ninja-build pkg-config \
    libgtk-3-dev liblzma-dev libsecret-1-dev libsecret-1-0
else
  echo "  ! Unknown package manager — install manually: clang cmake ninja"
  echo "    pkg-config gtk3-devel xz-devel libsecret-devel" >&2
fi

if ! command -v flutter >/dev/null 2>&1; then
  cat >&2 <<'EOF'

  ! Flutter SDK not found on PATH. Install it first, then re-run this script:

      git clone --depth 1 -b stable https://github.com/flutter/flutter.git ~/flutter
      echo 'export PATH="$HOME/flutter/bin:$PATH"' >> ~/.zshrc
      exec zsh           # reload PATH

  (or download the stable Linux tarball from https://docs.flutter.dev/get-started/install/linux)
EOF
  exit 1
fi

echo "▸ Enabling the Linux desktop target…"
flutter config --enable-linux-desktop

echo "▸ Generating the linux/ desktop scaffold (preserves lib/ and pubspec.yaml)…"
flutter create --platforms=linux --org com.irt42 --project-name telemed_mobile .

echo "▸ Fetching packages…"
flutter pub get

cat <<'EOF'

✓ Done. Make sure the backend stack is up (docker compose up -d), then run:

    flutter run -d linux --dart-define=API_BASE_URL=http://localhost:8080

A native window opens. It behaves like the mobile app (the UI is the same).
Notes:
  • No CORS to worry about — desktop apps make direct HTTP calls.
  • Camera/mic in a call use your host webcam directly (no permission popup on
    Linux). Video via flutter_webrtc on Linux is experimental; if it can't
    connect, the call degrades to chat-only by design.
  • For a phone-like aspect ratio, just resize the window narrow.
EOF
