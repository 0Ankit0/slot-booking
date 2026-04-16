#!/usr/bin/env python3
"""Verify that the slot-booking stack is reachable after startup."""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


@dataclass(frozen=True)
class HealthCheck:
    path: str
    expected_keys: tuple[str, ...]


BACKEND_CHECKS = (
    HealthCheck("/api/v1/system/health/", ("status", "service")),
    HealthCheck("/api/v1/system/ready/", ("ready", "project")),
    HealthCheck("/api/v1/system/capabilities/", ("modules", "active_providers")),
    HealthCheck("/api/v1/system/providers/", ("providers",)),
    HealthCheck("/api/v1/system/general-settings/", tuple()),
)


def fetch_json(url: str, timeout: float) -> object:
    with urlopen(url, timeout=timeout) as response:  # noqa: S310 - local operator health check
        return json.loads(response.read().decode("utf-8"))


def fetch_text(url: str, timeout: float) -> str:
    with urlopen(url, timeout=timeout) as response:  # noqa: S310 - local operator health check
        return response.read().decode("utf-8", errors="replace")


def collect_errors(*, backend_url: str, frontend_url: str, skip_frontend: bool, timeout: float) -> list[str]:
    errors: list[str] = []

    for check in BACKEND_CHECKS:
        try:
            payload = fetch_json(f"{backend_url.rstrip('/')}{check.path}", timeout)
        except HTTPError as exc:
            errors.append(f"{check.path} returned HTTP {exc.code}")
            continue
        except URLError as exc:
            errors.append(f"{check.path} could not be reached: {exc.reason}")
            continue

        if check.path.endswith("/general-settings/"):
            if not isinstance(payload, list):
                errors.append(f"{check.path} should return a list")
            continue

        if not isinstance(payload, dict):
            errors.append(f"{check.path} returned an unexpected payload shape")
            continue

        missing = [key for key in check.expected_keys if key not in payload]
        if missing:
            errors.append(f"{check.path} missing keys: {', '.join(missing)}")

    if not skip_frontend:
        try:
            html = fetch_text(frontend_url, timeout)
        except HTTPError as exc:
            errors.append(f"frontend returned HTTP {exc.code}")
        except URLError as exc:
            errors.append(f"frontend could not be reached: {exc.reason}")
        else:
            lowered = html.lower()
            if "<html" not in lowered and "<!doctype html" not in lowered:
                errors.append("frontend did not return HTML")

    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-url", default="http://localhost:8000")
    parser.add_argument("--frontend-url", default="http://localhost:3000")
    parser.add_argument("--skip-frontend", action="store_true")
    parser.add_argument("--retries", type=int, default=10)
    parser.add_argument("--delay", type=float, default=3.0)
    parser.add_argument("--timeout", type=float, default=5.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    last_errors: list[str] = []

    for attempt in range(1, args.retries + 1):
        last_errors = collect_errors(
            backend_url=args.backend_url,
            frontend_url=args.frontend_url,
            skip_frontend=args.skip_frontend,
            timeout=args.timeout,
        )
        if not last_errors:
            print("Slot Booking health check passed.")
            return 0
        if attempt < args.retries:
            time.sleep(args.delay)

    print("Slot Booking health check failed:")
    for error in last_errors:
        print(f"- {error}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
