# Slot Booking Documentation

This folder combines practical contributor runbooks with the deeper product, architecture, and implementation documentation for the slot-booking platform.

## Getting Started

1. Read [onboarding/project-orientation.md](onboarding/project-orientation.md) for the repo layout and supported workflows.
2. Follow [onboarding/local-development.md](onboarding/local-development.md) to bootstrap env files, install dependencies, and choose a local run path.
3. Use [onboarding/deployment.md](onboarding/deployment.md) when you want the canonical Docker Compose stack or the repo-native background-service flow.
4. Run `make docs` after changing documentation so the structure and key headings stay aligned with the repository.

## Onboarding & Deployment

| Path | Purpose |
| --- | --- |
| `onboarding/project-orientation.md` | Repository map, service boundaries, and the supported development/deployment paths |
| `onboarding/local-development.md` | Bootstrap steps, compose workflow, repo-native workflow, and validation commands |
| `onboarding/deployment.md` | Local deployment runbook, secrets guidance, health checks, and shutdown procedures |

## Documentation Map

### Requirements & analysis

- `requirements/requirements-document.md`
- `requirements/user-stories.md`
- `analysis/use-case-diagram.md`
- `analysis/use-case-descriptions.md`
- `analysis/system-context-diagram.md`
- `analysis/activity-diagram.md`
- `analysis/bpmn-swimlane-diagram.md`
- `analysis/data-dictionary.md`
- `analysis/business-rules.md`
- `analysis/event-catalog.md`

### Architecture & detailed design

- `high-level-design/system-sequence-diagram.md`
- `high-level-design/domain-model.md`
- `high-level-design/data-flow-diagram.md`
- `high-level-design/architecture-diagram.md`
- `high-level-design/c4-context-container.md`
- `detailed-design/class-diagram.md`
- `detailed-design/sequence-diagram.md`
- `detailed-design/state-machine-diagram.md`
- `detailed-design/erd-database-schema.md`
- `detailed-design/component-diagram.md`
- `detailed-design/api-design.md`
- `detailed-design/c4-component.md`

### Infrastructure, implementation, and edge cases

- `infrastructure/deployment-diagram.md`
- `infrastructure/network-infrastructure.md`
- `infrastructure/cloud-architecture.md`
- `infrastructure/booking-runtime-patterns.md`
- `implementation/code-guidelines.md`
- `implementation/c4-code-diagram.md`
- `implementation/implementation-playbook.md`
- `implementation/booking-marketplace-wave-plan.md`
- `edge-cases/README.md`
- `edge-cases/slot-availability.md`
- `edge-cases/booking-and-payments.md`
- `edge-cases/cancellations-and-refunds.md`
- `edge-cases/notifications.md`
- `edge-cases/api-and-ui.md`
- `edge-cases/security-and-compliance.md`
- `edge-cases/operations.md`
- `traceability-matrix.md`

## Validation

- `python3 scripts/validate_documentation.py` verifies the expected docs tree, required headings, Mermaid-bearing diagram files, and stale local-path references.
- `python3 scripts/check_template_health.py` verifies the local backend endpoints and, by default, the frontend shell.
