#!/bin/bash
set -e

echo "=== HUMI Web Build ==="
echo ""

echo "Step 1: Running Expo export..."
npx expo export --platform web --clear

echo ""
echo "Step 2: Copying PWA files from public/ to dist/..."
cp public/manifest.json dist/manifest.json
cp public/service-worker.js dist/service-worker.js

echo ""
echo "Step 3: Generating build version..."
BUILD_TIMESTAMP=$(date +%s)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_VERSION_STR="build-${BUILD_TIMESTAMP}"
echo "  Version: ${BUILD_VERSION_STR}"
echo "  Date: ${BUILD_DATE}"

echo ""
echo "Step 4: Injecting version into service worker..."
sed -i "s/__HUMI_BUILD_VERSION__/${BUILD_VERSION_STR}/g" dist/service-worker.js
echo "  Service worker updated with cache version: ${BUILD_VERSION_STR}"

echo ""
echo "Step 5: Updating version.json..."
cat > dist/version.json << EOF
{
  "version": "${BUILD_VERSION_STR}",
  "buildTime": "${BUILD_DATE}"
}
EOF
echo "  version.json updated"

echo ""
echo "Step 6: Verifying build..."
if grep -q "__HUMI_BUILD_VERSION__" dist/service-worker.js; then
  echo "ERROR: BUILD_VERSION placeholder was not replaced in service worker!"
  exit 1
fi
echo "  Verification passed - no unresolved placeholders"

echo ""
echo "=== Build Complete ==="
echo "Cache busting version: ${BUILD_VERSION_STR}"
echo "Users will get the latest version on next visit."
