#!/usr/bin/env bash
# Double-click this on macOS to start MyFi.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not installed."
  echo "Download it from https://nodejs.org (LTS version)."
  read -p "Press Enter to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first run, this takes a minute)..."
  npm install || { echo "npm install failed."; read -p "Press Enter to close..."; exit 1; }
fi

if [ ! -f ".env.local" ]; then
  echo ".env.local not found — running setup wizard first..."
  node scripts/setup.mjs || { read -p "Press Enter to close..."; exit 1; }
fi

# Open the browser once the server is responding.
URL="http://localhost:3000"
(
  for i in $(seq 1 60); do
    if curl -sSf -o /dev/null "$URL" 2>/dev/null; then
      open "$URL"
      exit 0
    fi
    sleep 1
  done
) &

echo ""
echo "Starting MyFi at $URL"
echo "Press Ctrl+C in this window to stop the server."
echo ""
npm run dev
