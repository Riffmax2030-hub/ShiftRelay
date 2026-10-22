# Remediation Progress

## Summary of Remediations

| Batch | Description | Status | Verification Details |
|---|---|---|---|
| **Batch 1** | Database Safety & Recovery | Complete | Disposable PG, schema backups, connection resilience verified. |
| **Batch 2A** | Authentication Bypass Remediation | Complete | Route-level authentication enforced, session cookies hardened (`test-batch-2a.mjs`: 27/27 passed). |
| **Batch 2B** | Company Isolation & Hardened Enrolment | Complete | Public enrolment creates pending-only worker memberships; cross-company resource isolation verified (`test-batch-2b.mjs`: 39/39 passed). |
| **Batch 2C** | SSE Broadcast & Recipient Isolation | Complete | Scoped company events, auth-verified streams, immediate context disconnects verified (`test-batch-2c.mjs`: 15/15 passed). |
| **Batch 3** | Private File Protection & Shared-Device Cleanup | Complete (HTTP & Browser) / Unverified (Native) | Private file auth and `no-store` headers verified (`test-batch-3.mjs`: 21/21 passed). Browser shared-device logout, back-nav, cache isolation, and offline queue purge verified (`test-browser-batch3.mjs`: 13/13 passed). **Native-device storage (Capacitor/native preferences) remains unverified**. |
| **Batch 4** | Server-Enforced Idempotency & Concurrent Operations | Complete | Atomic serializable idempotency, request fingerprinting, cross-company isolation, state races, and replay tests verified (`test-batch-4.mjs`: 30/30 passed). |

## Batch 3 Shared-Device Offline Queue Hardening
- Retaining offline queues across logout is disabled to prevent leaking queued actions to subsequent device users on shared devices.
- Logout prompts users with explicit choices:
  - **Sync Now & Sign Out**: Attempts immediate network flush of pending items before destroying session.
  - **Cancel (Stay Signed In)**: Aborts logout, allowing user to continue working.
  - **Discard Unsent Work & Sign Out**: Purges account offline queues and completes logout.
- Namespacing is backed by guaranteed key removal (`localStorage.removeItem`) on queue drain/discard.
