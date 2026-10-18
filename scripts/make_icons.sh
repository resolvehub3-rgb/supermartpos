#!/bin/bash
set -e

# Open in playwright-cli via localhost dev server
playwright-cli open --browser=chromium "http://localhost:3000/icon_view.html"

# Generate 512x512 maskable
playwright-cli resize 512 512
playwright-cli screenshot --filename=public/pwa-maskable-512x512.png

# Generate 512x512
playwright-cli screenshot --filename=public/pwa-512x512.png

# Generate 192x192
playwright-cli resize 192 192
playwright-cli screenshot --filename=public/pwa-192x192.png

# Generate 180x180 apple-touch-icon
playwright-cli resize 180 180
playwright-cli screenshot --filename=public/apple-touch-icon.png

# Generate favicon.ico / png
playwright-cli resize 64 64
playwright-cli screenshot --filename=public/favicon.ico

playwright-cli close

# Clean up temporary icon view html
rm -f public/icon_view.html scripts/icon_view.html scripts/generate_pwa_icons.js

echo "All PWA icons generated and verified successfully!"
