.PHONY: copy-env setup docs docs-check backend-lint backend-test backend-dev backend-migrate \
	frontend-lint frontend-test frontend-dev mobile-lint mobile-test mobile-dev \
	dev-up infra-up dev-down infra-down start stop health-check lint test dev ci

copy-env:
	./scripts/copy_env_templates.sh

setup:
	./scripts/setup_template.sh

docs:
	python3 scripts/validate_documentation.py

docs-check: docs

backend-lint:
	cd backend && uv run ruff check src tests

backend-test:
	cd backend && uv run --group test pytest

backend-dev:
	cd backend && uv run task start

backend-migrate:
	cd backend && uv run task migrate

frontend-lint:
	cd frontend && npm run lint

frontend-test:
	cd frontend && npm run typecheck && npm run test && npm run build

frontend-dev:
	cd frontend && npm run dev -- --hostname 0.0.0.0

mobile-lint:
	cd mobile && flutter analyze

mobile-test:
	cd mobile && flutter test

mobile-dev:
	cd mobile && flutter run

dev-up:
	./start_servers.sh compose

infra-up:
	./scripts/compose.sh up -d db redis

dev-down:
	./stop_servers.sh compose --volumes

infra-down:
	./stop_servers.sh compose --volumes

start:
	./start_servers.sh

stop:
	./stop_servers.sh

health-check:
	python3 scripts/check_template_health.py

lint: backend-lint frontend-lint mobile-lint

test: backend-test frontend-test mobile-test

dev:
	@echo "Canonical local workflows:"
	@echo "  make dev-up        # Docker Compose stack"
	@echo "  ./start_servers.sh # Repo-native backend + frontend"
	@echo "  make mobile-dev    # Optional Flutter app"

ci: docs lint test
