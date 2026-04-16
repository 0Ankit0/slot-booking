#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  if [ -f "$target_file" ]; then
    echo "Keeping existing $target_file"
    return
  fi

  cp "$source_file" "$target_file"
  echo "Created $target_file from $source_file"
}

seed_backend_env() {
  local target_file="$1"
  python3 - "$target_file" <<'PY'
from pathlib import Path
import secrets
import sys

path = Path(sys.argv[1])
original = path.read_text(encoding="utf-8")
updated = original
replacements = {
    "__AUTO_GENERATE_SECRET_KEY__": secrets.token_urlsafe(48),
    "__AUTO_GENERATE_PASSWORD_PEPPER__": secrets.token_urlsafe(48),
    "__AUTO_GENERATE_POSTGRES_PASSWORD__": secrets.token_urlsafe(24),
}
for marker, value in replacements.items():
    if marker in updated:
        updated = updated.replace(marker, value)
if updated != original:
    path.write_text(updated, encoding="utf-8")
    print(f"Generated local-only secrets in {path}")
PY
}

copy_if_missing "backend/.env.example" "backend/.env"
copy_if_missing "frontend/.env.local.example" "frontend/.env.local"
copy_if_missing "mobile/.env.example" "mobile/.env"
seed_backend_env "backend/.env"
