# Batch 4: Idempotency & Concurrent Operations — Evidence

## Confirmed Enabled Endpoints (Verified Against `server.mjs`)

| Endpoint | Route Pattern | Operation Slug | Concurrency & Idempotency Controls |
|---|---|---|---|
| Clock-in | `POST /api/time-entries/clock-in` | `clock-in` | `withIdempotency`, `SELECT FOR UPDATE`, partial unique index `idx_time_entries_active_clock_in` |
| Clock-out | `POST /api/time-entries/clock-out` | `clock-out` | `withIdempotency`, `SELECT FOR UPDATE`, atomic state transition |
| Create Handover | `POST /api/handovers` | `create-handover` | `withIdempotency`, transaction-bound insert with single notification & event broadcast |
| Relay Handover | `POST /api/handovers/:id/relay` | `handover-relay` | `withIdempotency`, role guard (`supervisor`/`owner`), atomic status update |
| Acknowledge Handover | `POST /api/handovers/:id/acknowledge` | `handover-acknowledge` | `withIdempotency`, assignee guard (`assignedTo`/`owner`), atomic status update |
| Review Membership | `POST /api/memberships/:id/review` | `membership-review` | `withIdempotency`, role guard (`supervisor`/`owner`), atomic status transition (`pending_approval` -> `active`/`rejected`) |
| Review Leave | `POST /api/leave-requests/review` | `leave-review` | `withIdempotency`, owner guard, `SELECT FOR UPDATE` on pending leave requests |

*(Disabled routes remain strictly disabled with HTTP 501: `shift-swaps`, `shift-swaps/review`, `feed/posts`, `upload`, `verified-badge-request`, `discover/workers`).*

## Database Migrations
- Added `idempotency_keys` table to `database.mjs`:
  ```sql
  create table if not exists idempotency_keys (
    id uuid primary key default gen_random_uuid(),
    membership_id uuid not null references memberships(id) on delete cascade,
    organisation_id uuid not null references organisations(id) on delete cascade,
    operation varchar(128) not null,
    client_key varchar(256) not null,
    request_fingerprint text not null,
    status_code integer not null,
    response_body text not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '24 hours'),
    unique(membership_id, organisation_id, operation, client_key)
  );
  create index if not exists idx_idempotency_keys_lookup on idempotency_keys(membership_id, organisation_id, operation, client_key);
  create index if not exists idx_idempotency_keys_expiry on idempotency_keys(expires_at);
  ```

## Key Invariants & Behavioral Enforcement
1. **Scoped Isolation**: Primary/unique constraint on `(membership_id, organisation_id, operation, client_key)` guarantees cross-company and cross-user key isolation.
2. **Request Fingerprinting**: Canonical sorted-key JSON serialization of incoming request body. Identical key with mismatched request content is rejected with HTTP 422 (`Idempotency key reused with different request content`).
3. **Atomic Business Mutations**: Handled via `withIdempotency` inside serializable transactions. Business mutation and idempotency record are committed together.
4. **Auth-Before-Replay**: Every incoming request undergoes full authentication and route-level authorization before any idempotency cache lookup or replay.
5. **Business Rules Independent of Keys**: Concurrent duplicate requests with different keys or no keys are rejected by row locks and conditional status updates (`SELECT FOR UPDATE`, returning 409 Conflict).
6. **Side-Effect Isolation**: Notification creation and SSE broadcast triggers are tied strictly to initial execution; idempotent replays return the recorded response with `X-Idempotent-Replayed: true` without duplicating notifications or broadcasts.
7. **Offline Queue Sync Now & Sign Out**: Guaranteed queue drain before logout; failure to sync retains session and unsent items.

## Verification & Test Results
- **Batch 4 Concurrency & Idempotency Suite (`test-batch-4.mjs`)**: 30 Passed, 0 Failed, 0 Skipped.
  - Test 1: Idempotency Replay (Clock-in) — 201 replayed with `X-Idempotent-Replayed: true`.
  - Test 2: Different-Content Key Reuse — rejected with HTTP 422.
  - Test 3: Cross-Company Key Isolation — Company B cannot replay Company A key.
  - Test 4: Parallel Burst Concurrency — 5 concurrent requests yield exactly 1 active clock-in, remaining requests cleanly resolved.
  - Test 5: Different-Key Duplicate Clock-In — second rejected with HTTP 409 by business rule.
  - Test 6: Handover Relay State Transition & Replay — transition executed & replayed.
  - Test 7: Membership Review Idempotency — approval replayed cleanly.
  - Test 8: Leave-Request Duplicate Review — second attempt with different key rejected with HTTP 409.
  - Test 9: Sync-Now Sign-Out (Success Path) — session terminated cleanly after sync.
  - Test 10: Sync-Now Sign-Out (Failure Path) — session and queue retained on sync failure.
- **Regression Suites**:
  - `test-batch-2a.mjs`: 27 Passed, 0 Failed.
  - `test-batch-2b.mjs`: 39 Passed, 0 Failed.
  - `test-batch-2c.mjs`: 15 Passed, 0 Failed.
  - `test-batch-3.mjs`: 21 Passed, 0 Failed.
