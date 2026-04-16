# Slot Booking

Slot Booking is a full-stack reservation platform with a FastAPI backend, Next.js frontend, Flutter mobile app, and a large architecture/design set under `docs/`.

## Quick Start

```bash
make setup
make dev-up
make health-check
make dev-down
```

## Canonical Workflows

### Docker Compose

- `make dev-up` bootstraps env files and starts Postgres, Redis, backend, worker, and frontend.
- `make health-check` verifies the backend system endpoints plus the frontend shell.
- `make dev-down` tears the compose stack down and removes compose volumes.
- `./stop_servers.sh compose` stops the compose stack without removing volumes.

### Repo-native

- `make infra-up` starts only Postgres and Redis.
- `./start_servers.sh` starts backend and frontend on the host and writes logs to `logs/`.
- `./stop_servers.sh` stops the host-run backend and frontend processes.
- Start the Flutter app separately with `make mobile-dev` when Flutter is installed.

## Documentation

- Docs index: [docs/README.md](docs/README.md)
- Orientation: [docs/onboarding/project-orientation.md](docs/onboarding/project-orientation.md)
- Local development: [docs/onboarding/local-development.md](docs/onboarding/local-development.md)
- Deployment runbook: [docs/onboarding/deployment.md](docs/onboarding/deployment.md)

## Validation

- Docs: `make docs`
- Backend: `make backend-lint && make backend-test`
- Frontend: `make frontend-lint && make frontend-test`
- Mobile: `make mobile-lint && make mobile-test`
- Stack health: `make health-check`
