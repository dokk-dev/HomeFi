#!/usr/bin/env bash
# Double-click this on macOS to run the setup wizard.
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

node scripts/setup.mjs
echo ""
read -p "Press Enter to close this window..."
