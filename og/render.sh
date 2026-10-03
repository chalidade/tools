#!/usr/bin/env bash
# Renders og/og.html to public/og.png (1200×630) with headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME=$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser)
PROFILE=$(mktemp -d)
trap 'rm -rf "$PROFILE"' EXIT
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
  --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot="$PWD/public/og.png" "file://$PWD/og/og.html" >/dev/null 2>&1
echo "public/og.png: $(du -h public/og.png | cut -f1)"
