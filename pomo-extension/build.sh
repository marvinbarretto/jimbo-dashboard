#!/usr/bin/env bash
# Build the Chrome extension into dist/ — sideload that directory as unpacked.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

# Static files
cp src/manifest.json dist/
cp src/popup.html   dist/
cp src/options.html dist/
cp src/popup.css    dist/
cp src/options.css  dist/

# Bundle TypeScript → JS
npx esbuild src/service-worker.ts \
  --bundle --format=esm --target=chrome120 \
  --outfile=dist/service-worker.js

npx esbuild src/popup.ts src/options.ts \
  --bundle --format=iife --target=chrome120 \
  --outdir=dist

echo ""
echo "✓ Built to dist/  — load dist/ as an unpacked extension in chrome://extensions"
