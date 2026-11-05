#!/bin/bash

# defensive error handling
set -euo pipefail

# move into the folder of this script
cd "$(dirname "$0")"

mkdir -p apps/backend/.vercel/output/functions/api.func/
# Copy the portable production deployment, including its self-contained dependencies.
cp -RP apps/deployment/. apps/backend-copy/
# `shopt` includes dot-files in the `mv` operation
(shopt -s dotglob && mv apps/backend-copy/* apps/backend/.vercel/output/functions/api.func/)
cp -RP apps/backend/.vercel/output/functions/api.func/_dot_vercel_copy/output apps/backend/.vercel/
node --input-type=module -e 'await import("./apps/backend/.vercel/output/functions/api.func/app.js")'
mkdir -p apps/backend/.vercel/output/functions/api
for route in gist pin top-langs wakatime; do
  ln -s ../api.func "apps/backend/.vercel/output/functions/api/$route.func"
done
rm -rf apps/deployment
pnpm install
pnpm build:frontend
# serve the built site under `/frontend` (wizard) and `/frontend/docs` (docs),
# matching the Astro `base` paths used by their assets.
mkdir -p apps/backend/.vercel/output/static/frontend/
cp -RP apps/frontend/build/. apps/backend/.vercel/output/static/frontend/
