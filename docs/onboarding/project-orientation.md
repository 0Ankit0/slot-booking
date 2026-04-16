# Project Orientation

## Repository Layout

- `backend/` contains the FastAPI API, Alembic migrations, Celery worker entrypoints, and the canonical backend env template.
- `frontend/` contains the Next.js web app, its Docker build, and the browser-safe env template used by both host and compose workflows.
- `mobile/` contains the Flutter client and a non-secret `.env.example` for local startup defaults.
- `docs/` holds the domain, architecture, implementation, and onboarding documentation.
- `scripts/`, `start_servers.sh`, and `stop_servers.sh` hold the repo-native and Docker Compose helper flows.

## Canonical Workflows

- **Docker Compose** is the canonical local deployment path. It starts Postgres, Redis, backend, worker, and frontend with one command and mirrors the service boundaries described in the infrastructure docs.
- **Repo-native** is the fastest host-tooling path. It runs backend and frontend on your machine, keeps logs under `logs/`, and can optionally pair with `make infra-up` when you want Postgres and Redis alongside the host-run apps.
- **Mobile** stays opt-in. The Flutter app is not part of the compose stack; run it separately with `make mobile-dev` after bootstrapping the repo.

## Environment Files

- `backend/.env` is created from `backend/.env.example`. The copy step generates local-only values for `SECRET_KEY`, `PASSWORD_PEPPER`, and `POSTGRES_PASSWORD` if placeholders are still present.
- `frontend/.env.local` is created from `frontend/.env.local.example`. It uses `backend.localhost` so the web app can talk to the API both from the host and from inside the compose frontend container.
- `mobile/.env` is created from `mobile/.env.example` and should contain only startup-safe, non-secret defaults.
- Generated env files are local artifacts. Do not commit them.

## What To Read Next

- [local-development.md](local-development.md) for bootstrap steps and day-to-day commands.
- [deployment.md](deployment.md) for the compose and repo-native deployment runbooks.
- [../README.md](../README.md) when you need the full docs map.
