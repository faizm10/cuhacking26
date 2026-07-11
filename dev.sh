#!/usr/bin/env bash
# Starts everything for local development:
#   backend  → http://localhost:8080
#   frontend → http://localhost:3000
# Press Ctrl+C to stop both.

set -euo pipefail
cd "$(dirname "$0")"

# First run: install dependencies and create the backend env file.
if [ ! -d backend/node_modules ]; then
  echo "Installing backend dependencies..."
  (cd backend && npm install)
fi
if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env (mock mode — add GEMINI_API_KEY for real generations)"
fi

echo ""
echo "  PlayBox dev"
echo "  backend  → http://localhost:8080"
echo "  frontend → http://localhost:3000"
echo "  Ctrl+C stops both"
echo ""

# Stop both servers when the script exits.
trap 'kill 0' INT TERM

(cd backend && npm run dev 2>&1 | while IFS= read -r line; do
  printf '\033[35m[backend]\033[0m  %s\n' "$line"
done) &

(cd frontend && npm run dev 2>&1 | while IFS= read -r line; do
  printf '\033[36m[frontend]\033[0m %s\n' "$line"
done) &

wait
