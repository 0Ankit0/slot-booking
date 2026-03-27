# Slot Booking Documentation

This `docs/` directory now contains the slot booking system documentation that previously lived in the separate `Slot Booking System/` folder, alongside the existing project onboarding and template-operating guides that still apply to this repository.

## Documentation Structure

- `requirements/` defines the slot booking scope, actors, and user stories.
- `analysis/` captures use cases, workflows, business rules, and domain events.
- `high-level-design/` explains the booking architecture, data flow, and system interactions.
- `detailed-design/` covers API design, components, data models, and runtime behavior.
- `infrastructure/` documents deployment, networking, and cloud topology.
- `edge-cases/` records booking-specific operational, payment, notification, and availability scenarios.
- `implementation/` gives code-level guidance, architecture views, and implementation sequencing.
- `onboarding/` keeps the repository-specific setup and template transition guidance for this codebase.

## Key Features

- End-to-end slot booking coverage across requirements, analysis, design, infrastructure, and implementation.
- Booking-specific edge case documentation for slot availability, payments, cancellations, notifications, and operations.
- Mermaid-based diagrams for use cases, flows, architecture, deployment, and component structure.
- Repository onboarding guides that still help teams run, configure, and evolve this project safely.

## Getting Started

1. Read `requirements/requirements.md`.
2. Continue with `analysis/use-case-diagram.md` and `analysis/use-case-descriptions.md`.
3. Review `high-level-design/architecture-diagram.md` and `high-level-design/domain-model.md`.
4. Check `detailed-design/api-design.md` and `detailed-design/erd-database-schema.md`.
5. Use `implementation/implementation-playbook.md` for execution planning.
6. Follow `onboarding/local-setup.md` if you need to run the repository locally.
7. Validate the documentation with `python3 scripts/validate_documentation.py`.

## Documentation Status

- Slot booking design documents have been merged into the main `docs/` tree.
- The duplicate `Slot Booking System/` documentation folder has been removed.
- Repository onboarding and template transition docs are still present because they remain relevant to this codebase.
