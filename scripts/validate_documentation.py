#!/usr/bin/env python3
"""Validate slot-booking documentation structure and stale-link hygiene."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_ROOT = REPO_ROOT / "docs"
REQUIRED_ROOT_DOCS = ["README.md", "traceability-matrix.md"]
REQUIRED_FILES = {
    "requirements": ["requirements-document.md", "user-stories.md"],
    "analysis": [
        "use-case-diagram.md",
        "use-case-descriptions.md",
        "system-context-diagram.md",
        "activity-diagram.md",
        "bpmn-swimlane-diagram.md",
        "data-dictionary.md",
        "business-rules.md",
        "event-catalog.md",
    ],
    "high-level-design": [
        "system-sequence-diagram.md",
        "domain-model.md",
        "data-flow-diagram.md",
        "architecture-diagram.md",
        "c4-context-container.md",
    ],
    "detailed-design": [
        "class-diagram.md",
        "sequence-diagram.md",
        "state-machine-diagram.md",
        "erd-database-schema.md",
        "component-diagram.md",
        "api-design.md",
        "c4-component.md",
    ],
    "infrastructure": [
        "deployment-diagram.md",
        "network-infrastructure.md",
        "cloud-architecture.md",
        "booking-runtime-patterns.md",
    ],
    "implementation": [
        "code-guidelines.md",
        "c4-code-diagram.md",
        "implementation-playbook.md",
        "booking-marketplace-wave-plan.md",
    ],
    "edge-cases": [
        "README.md",
        "slot-availability.md",
        "booking-and-payments.md",
        "cancellations-and-refunds.md",
        "notifications.md",
        "api-and-ui.md",
        "security-and-compliance.md",
        "operations.md",
    ],
    "onboarding": [
        "project-orientation.md",
        "local-development.md",
        "deployment.md",
    ],
}
REQUIRED_HEADINGS = {
    "README.md": ["Quick Start", "Canonical Workflows", "Documentation", "Validation"],
    "docs/README.md": [
        "Getting Started",
        "Onboarding & Deployment",
        "Documentation Map",
        "Validation",
    ],
    "docs/onboarding/project-orientation.md": [
        "Repository Layout",
        "Canonical Workflows",
        "Environment Files",
    ],
    "docs/onboarding/local-development.md": [
        "Bootstrap",
        "Docker Compose Workflow",
        "Repo-Native Workflow",
        "Validation",
    ],
    "docs/onboarding/deployment.md": [
        "Docker Compose Deployment",
        "Repo-Native Services",
        "Environment Files and Secrets",
        "Health Checks and Shutdown",
    ],
}
STALE_MARKERS = (
    "FastAPI Template",
    "fastapi_template",
    "/Users/ankit/Projects/Python/fastapi/fastapi_template",
)
ABSOLUTE_PATH_LINK = re.compile(r"\]\((/Users/[^)]+)\)")


def is_empty(path: Path) -> bool:
    return not path.exists() or not path.read_text(encoding="utf-8").strip()


def markdown_files() -> list[Path]:
    return [REPO_ROOT / "README.md", *sorted(DOCS_ROOT.rglob("*.md"))]


def diagram_file(path: Path) -> bool:
    return "diagram" in path.name or path.name.startswith("c4-")


def validate_headings(path: Path, headings: list[str], errors: list[str]) -> None:
    if not path.exists():
        errors.append(f"Missing file required for heading validation: {path.relative_to(REPO_ROOT)}")
        return
    text = path.read_text(encoding="utf-8")
    for heading in headings:
        if f"## {heading}" not in text:
            errors.append(f"{path.relative_to(REPO_ROOT)} missing heading: {heading}")


def main() -> int:
    errors: list[str] = []

    for filename in REQUIRED_ROOT_DOCS:
        path = DOCS_ROOT / filename
        if is_empty(path):
            errors.append(f"Missing or empty file: docs/{filename}")

    for directory, filenames in REQUIRED_FILES.items():
        dir_path = DOCS_ROOT / directory
        if not dir_path.exists():
            errors.append(f"Missing directory: docs/{directory}")
            continue
        for filename in filenames:
            path = dir_path / filename
            if is_empty(path):
                errors.append(f"Missing or empty file: docs/{directory}/{filename}")
                continue
            if diagram_file(path) and "```mermaid" not in path.read_text(encoding="utf-8"):
                errors.append(f"Diagram file missing Mermaid content: docs/{directory}/{filename}")

    for relative_path, headings in REQUIRED_HEADINGS.items():
        validate_headings(REPO_ROOT / relative_path, headings, errors)

    for path in markdown_files():
        text = path.read_text(encoding="utf-8")
        if ABSOLUTE_PATH_LINK.search(text):
            errors.append(f"{path.relative_to(REPO_ROOT)} contains an absolute local file-system link")
        for marker in STALE_MARKERS:
            if marker in text:
                errors.append(f"{path.relative_to(REPO_ROOT)} contains stale template marker: {marker}")

    if errors:
        print("Documentation validation failed:")
        for error in sorted(set(errors)):
            print(f"- {error}")
        return 1

    print("Documentation validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
