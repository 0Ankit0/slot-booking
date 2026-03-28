# Booking Marketplace Implementation Progress

This document tracks execution against the full-scope multi-tenant booking plan.

## Implemented now

### Wave 1 backend domain and contracts
- Added booking domain entities for providers, resources, categories, amenities, locations, availability rules, availability exceptions, slots, bookings, booking-slot joins, reviews, waitlist entries, disputes, refund records, invoices, receipts, payouts, promo codes, pricing rules, and booking audit events.
- Added API groups for `/providers`, `/resources`, `/slots`, `/bookings`, `/reviews`, `/waitlist`, and `/disputes`.
- Added idempotent booking create contract with `Idempotency-Key`, request tracing via `X-Request-Id`, and tenant consistency checks against optional `X-Tenant-Id`.
- Added cursor-based list responses for provider/resource/booking listing endpoints.

### Slot generation, locking, and cancellation policy
- Added timezone-aware slot generation based on availability rules and exception windows.
- Added Redis TTL slot hold support with fallback behavior when Redis is unavailable.
- Added booking cancellation path with policy-based refund math (24h full, 1h half, otherwise none).

### Wave 2 integration baseline
- Extended finance transaction schema with booking context (`booking_id`, `tenant_id`, `provider_id`) and reconciliation metadata.
- Added booking-aware payment verification persistence through `PaymentWebhook` with idempotency-key support.
- Added booking analytics event constants and event emission on booking lifecycle actions.
- Added feature-flagged quote, recurring, and group booking contract endpoints to support Wave 4 advanced scenarios behind runtime toggles.
- Added booking notifications for confirmation/cancellation and reminder task plumbing.

### Operations and RBAC
- Added background task scaffolding for expired hold release and reminder fan-out.
- Extended default RBAC seed permissions for booking marketplace resources and actions.
- Added an Alembic migration baseline for booking tables and finance linkage columns.

### Frontend baseline
- Expanded frontend booking type contracts to cover booking entities and cursor pages.
- Added booking hooks (`useMyBookings`, `useSlots`, `useCreateBooking`, `useCancelBooking`).
- Added user dashboard bookings page and sidebar navigation entry.

## Remaining implementation (next steps)
1. Build provider/admin control-plane web pages (resource management, calendar ops, disputes/refunds, earnings/payout reporting, analytics dashboards).
2. Implement Flutter guest/user booking journeys (discovery, detail, checkout, callback handling, my-bookings, cancellation/reschedule).
3. Add production-grade async jobs for refund retries, payout reconciliation, waitlist promotion automation, and recurring/group booking orchestration.
4. Add end-to-end contract tests for payment callback replay, websocket availability updates, and notification outage fallbacks.
5. Add full security/performance/restore drills required by go-live checklist.
