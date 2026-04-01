#!/bin/sh
set -e

echo "Building Uptime Kuma Bridge API..."
npm ci --only=production

echo "Build completed successfully!"
