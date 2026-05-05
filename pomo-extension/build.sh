#!/usr/bin/env bash
# Build the Chrome extension into dist/ — sideload that directory as unpacked.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

# Static files
cp src/manifest.json dist/
cp src/options.html  dist/
cp src/options.css   dist/

# Bundle TypeScript
npx esbuild src/service-worker.ts \
  --bundle --format=esm --target=chrome120 \
  --outfile=dist/service-worker.js

npx esbuild src/options.ts \
  --bundle --format=iife --target=chrome120 \
  --outfile=dist/options.js

echo ""
echo "✓ Built to dist/  — load dist/ as an unpacked extension in chrome://extensions"
