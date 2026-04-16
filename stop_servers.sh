#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$REPO_ROOT/logs"
BACKEND_PID_FILE="$LOG_DIR/backend-dev.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend-dev.pid"
MODE="native"
REMOVE_VOLUMES="false"

usage() {
  cat <<'EOF'
Usage:
  ./stop_servers.sh                   # stop repo-native backend + frontend
  ./stop_servers.sh native            # same as above
  ./stop_servers.sh compose           # stop Docker Compose stack, keep volumes
  ./stop_servers.sh compose --volumes # stop Docker Compose stack and remove volumes
  ./stop_servers.sh all --volumes     # stop native services and compose stack
EOF
}

pid_is_running() {
  local pid="$1"
  python3 - "$pid" <<'PY'
import os
import sys

pid = int(sys.argv[1])
try:
    os.kill(pid, 0)
except OSError:
    raise SystemExit(1)
raise SystemExit(0)
PY
}

stop_service() {
  local name="$1"
  local pid_file="$2"

  if [ ! -f "$pid_file" ]; then
    echo "$name is not running."
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if ! pid_is_running "$pid"; then
    rm -f "$pid_file"
    echo "$name is not running."
    return 0
  fi

  python3 - "$pid" <<'PY'
import os
import signal
import sys

os.kill(int(sys.argv[1]), signal.SIGTERM)
PY

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! pid_is_running "$pid"; then
      rm -f "$pid_file"
      echo "Stopped $name."
      return 0
    fi
    sleep 1
  done

  python3 - "$pid" <<'PY'
import os
import signal
import sys

try:
    os.kill(int(sys.argv[1]), signal.SIGKILL)
except OSError:
    pass
PY
  rm -f "$pid_file"
  echo "Stopped $name (forced)."
}

compose_down() {
  if [ "$REMOVE_VOLUMES" = "true" ]; then
    "$REPO_ROOT/scripts/compose.sh" down --remove-orphans -v
  else
    "$REPO_ROOT/scripts/compose.sh" down --remove-orphans
  fi
}

for arg in "$@"; do
  case "$arg" in
    native|compose|all)
      MODE="$arg"
      ;;
    --volumes)
      REMOVE_VOLUMES="true"
      ;;
    help|-h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
done

case "$MODE" in
  native)
    stop_service "backend" "$BACKEND_PID_FILE"
    stop_service "frontend" "$FRONTEND_PID_FILE"
    ;;
  compose)
    compose_down
    ;;
  all)
    stop_service "backend" "$BACKEND_PID_FILE"
    stop_service "frontend" "$FRONTEND_PID_FILE"
    compose_down
    ;;
esac
