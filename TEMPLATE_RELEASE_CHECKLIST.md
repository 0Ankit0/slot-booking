# Release Checklist

Use this checklist when you are preparing Slot Booking for a new environment or a formal release.

## Identity

- Review `PROJECT_NAME` and `APP_INSTANCE_NAME` in [backend/.env.example](backend/.env.example).
- Set `NEXT_PUBLIC_APP_NAME` in [frontend/.env.local.example](frontend/.env.local.example).
- Set `PROJECT_NAME` in [mobile/.env.example](mobile/.env.example).
- Review package and app identifiers in [backend/pyproject.toml](backend/pyproject.toml), [frontend/package.json](frontend/package.json), and [mobile/pubspec.yaml](mobile/pubspec.yaml).

## Product Shape

- Choose which `FEATURE_*` modules remain enabled.
- Remove routes, pages, and docs for modules your project will never ship.
- Choose your primary providers for email, push, SMS, analytics, maps, and payments.

## Security And Operations

- Move secrets into your deployment secret manager.
- Review trusted hosts, proxy trust, cookies, rate limits, and suspicious-activity thresholds.
- Choose `local` or `s3` storage intentionally and verify media URLs.

## Validation

- Run `make setup`
- Run `make infra-up`
- Run `make backend-migrate`
- Run `make health-check`
- Run `make ci`

## Reading Path

- Read [docs/onboarding/project-orientation.md](docs/onboarding/project-orientation.md)
- Read [docs/onboarding/local-development.md](docs/onboarding/local-development.md)
- Read [docs/onboarding/deployment.md](docs/onboarding/deployment.md)
