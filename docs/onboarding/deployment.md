# Deployment Paths

## Docker Compose Deployment

The compose stack is the canonical local deployment path for this repository.

```bash
make setup
make dev-up
make health-check
```

It brings up:

- `db` (`postgres:16-alpine`)
- `redis` (`redis:7-alpine`)
- `backend` (FastAPI + Alembic migrations on startup)
- `worker` (Celery worker)
- `frontend` (Next.js production build)

The frontend env defaults point at `http://backend.localhost:8000/api/v1` and `ws://backend.localhost:8000`. `backend.localhost` resolves to `127.0.0.1` on the host, and the compose frontend container maps that hostname back to the Docker host so browser and server-side requests use the same base URL.

## Repo-Native Services

Use the repo-native path when you want host tooling, faster iteration, or a local dev server instead of the production-style frontend container.

```bash
make infra-up      # optional
./start_servers.sh
make health-check
./stop_servers.sh
```

- The backend and frontend run in the background and keep their logs under `logs/`.
- `make infra-up` is optional for the native path, but useful when you want Postgres, Redis, or the worker service to behave more like the compose stack.
- The mobile app stays separate: run `make mobile-dev` when Flutter is installed.

## Environment Files and Secrets

- `scripts/copy_env_templates.sh` copies missing env files without overwriting existing local changes.
- `backend/.env.example` contains placeholders, not checked-in secrets. The first copy step replaces placeholder values for `SECRET_KEY`, `PASSWORD_PEPPER`, and `POSTGRES_PASSWORD` inside the generated `backend/.env`.
- Provider credentials stay blank or disabled in the examples. Turn integrations on only after you supply local or deployment-specific secrets outside the repository.
- Never commit generated `.env`, `.env.local`, or mobile `.env` files.

## Health Checks and Shutdown

- `make health-check` verifies backend JSON health endpoints and the frontend shell.
- `./scripts/compose.sh ps` and `./scripts/compose.sh logs <service>` are the portable compose inspection commands.
- `make dev-down` removes the compose stack and volumes.
- `./stop_servers.sh compose` stops the compose stack without deleting volumes.
- `./stop_servers.sh` stops the repo-native backend/frontend pair and cleans up the PID files.
