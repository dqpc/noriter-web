#!/bin/sh
# Cloudflare Workers Builds 전용. main 만 2048, 그 외(develop)는 512 로 빌드.
set -e
if [ "${WORKERS_CI_BRANCH:-}" = "main" ]; then
  export VITE_WIN_TILE=2048
else
  export VITE_WIN_TILE=512
fi
echo "branch=${WORKERS_CI_BRANCH:-local} VITE_WIN_TILE=$VITE_WIN_TILE"
npm run build
