#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

require_command uv
require_command npm

./scripts/copy_env_templates.sh

echo "Installing backend dependencies..."
(cd backend && uv sync --all-groups)

echo "Installing frontend dependencies..."
(cd frontend && npm ci)

if command -v flutter >/dev/null 2>&1; then
  echo "Installing mobile dependencies..."
  (cd mobile && flutter pub get)
else
  echo "Flutter is not installed; skipping mobile dependency setup."
fi

echo "Slot Booking setup complete."
echo "Next steps:"
echo "  make dev-up          # Docker Compose stack"
echo "  ./start_servers.sh   # Repo-native backend + frontend"
