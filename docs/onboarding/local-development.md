# Local Development

## Bootstrap

1. Make sure you have Docker plus either `docker-compose` or the `docker compose` plugin.
2. Install host tooling for the repo-native path: Python 3.14 with `uv`, Node 20 with `npm`, and optionally Flutter.
3. Run:

```bash
make setup
```

`make setup` copies missing env files, generates local-only backend secrets when needed, installs backend dependencies with `uv sync --all-groups`, installs frontend dependencies with `npm ci`, and runs `flutter pub get` when Flutter is available.

## Docker Compose Workflow

```bash
make dev-up
make health-check
make dev-down
```

- `make dev-up` calls `./start_servers.sh compose`, which first ensures the env files exist and then starts the full stack.
- Published endpoints:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API docs | `http://localhost:8000/docs` |
| Backend health | `http://localhost:8000/api/v1/system/health/` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

- `make dev-down` intentionally removes compose volumes so you can reset the local stack. If you want to stop compose without deleting data, run `./stop_servers.sh compose` instead.

## Repo-Native Workflow

```bash
make infra-up      # optional Postgres + Redis
./start_servers.sh
make health-check
./stop_servers.sh
```

- `./start_servers.sh` starts the backend with `uv run task start` and the frontend with `npm run dev -- --hostname 0.0.0.0`.
- Native logs land in `logs/backend-dev.log` and `logs/frontend-dev.log`.
- The backend can run without Docker infra because the default local config stays on SQLite when `DEBUG=True`. Start `make infra-up` if you want Postgres/Redis for worker or integration testing.
- Run `make mobile-dev` separately if you need the Flutter app.

## Validation

- Docs: `make docs`
- Backend quality bar: `make backend-lint && make backend-test`
- Frontend quality bar: `make frontend-lint && make frontend-test`
- Mobile quality bar: `make mobile-lint && make mobile-test`
- Running stack: `make health-check`
