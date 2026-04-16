#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$REPO_ROOT/logs"
BACKEND_PID_FILE="$LOG_DIR/backend-dev.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend-dev.pid"

usage() {
  cat <<'EOF'
Usage:
  ./start_servers.sh           # repo-native backend + frontend
  ./start_servers.sh native    # same as above
  ./start_servers.sh compose   # Docker Compose stack
EOF
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
}

is_running() {
  local pid_file="$1"
  if [ ! -f "$pid_file" ]; then
    return 1
  fi
  local pid
  pid="$(cat "$pid_file")"
  python3 - "$pid" <<'PY'
import os
import signal
import sys

pid = int(sys.argv[1])
try:
    os.kill(pid, 0)
except OSError:
    raise SystemExit(1)
raise SystemExit(0)
PY
}

start_service() {
  local name="$1"
  local workdir="$2"
  local command="$3"
  local pid_file="$4"
  local log_file="$5"

  mkdir -p "$LOG_DIR"

  if is_running "$pid_file"; then
    echo "$name is already running (PID $(cat "$pid_file"))"
    return 0
  fi

  rm -f "$pid_file"
  : > "$log_file"

  (
    cd "$workdir"
    nohup bash -lc "exec $command" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  sleep 2
  if is_running "$pid_file"; then
    echo "Started $name (PID $(cat "$pid_file"))"
    return 0
  fi

  echo "Failed to start $name. See $log_file" >&2
  rm -f "$pid_file"
  return 1
}

native_up() {
  require_command uv
  require_command npm

  "$REPO_ROOT/scripts/copy_env_templates.sh"
  start_service "backend" "$REPO_ROOT/backend" "uv run task start" "$BACKEND_PID_FILE" "$LOG_DIR/backend-dev.log"
  if ! start_service "frontend" "$REPO_ROOT/frontend" "npm run dev -- --hostname 0.0.0.0" "$FRONTEND_PID_FILE" "$LOG_DIR/frontend-dev.log"; then
    "$REPO_ROOT/stop_servers.sh" native >/dev/null 2>&1 || true
    exit 1
  fi

  echo "Repo-native services started."
  echo "- Frontend: http://localhost:3000"
  echo "- Backend docs: http://localhost:8000/docs"
  echo "- Logs: logs/backend-dev.log, logs/frontend-dev.log"
}

compose_up() {
  "$REPO_ROOT/scripts/copy_env_templates.sh"
  "$REPO_ROOT/scripts/compose.sh" up --build -d db redis backend worker frontend
  "$REPO_ROOT/scripts/compose.sh" ps
  echo "Docker Compose stack started."
  echo "- Frontend: http://localhost:3000"
  echo "- Backend docs: http://localhost:8000/docs"
}

case "${1:-native}" in
  native)
    native_up
    ;;
  compose)
    compose_up
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
