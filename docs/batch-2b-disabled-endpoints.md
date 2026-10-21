# Batch 2B: Disabled Endpoints & Client Impact Documentation

## 1. Overview
As part of the Batch 2B security and tenant-isolation remediation, unsafe pilot routes, in-memory local-storage features, and mock services were disabled server-side with `HTTP 501 Not Implemented`.

## 2. Disabled Endpoints Matrix

| Route | Method | Previous Implementation | Reason for Disabling | Client Impact & Fallback |
|---|---|---|---|---|
| `/api/shift-swaps` | GET | Local JSON / in-memory | Unscoped, unmigrated mock storage | Handover cards and dashboard shift swap widgets will receive HTTP 501 if called. Client should treat shift swaps as temporarily unavailable during the pilot. |
| `/api/shift-swaps` | POST | Local JSON / in-memory | Lacks DB backing and tenant scoping | Swap request modal returns 501. The pilot relies on direct supervisor/incoming shift handover flow instead. |
| `/api/shift-swaps/review` | POST | Local JSON / in-memory | Missing role checks and cross-company isolation | Prevents unauthorized approvals. |
| `/api/feed/posts` | GET, POST | In-memory `store.feedPosts` | Unscoped social feed; risk of leaking data across companies | Shift Lounge social feed disabled. Core handover and relay operations remain fully functional. |
| `/api/feed/posts/:id/like` | POST | In-memory | Mock social interaction | Disabled. |
| `/api/feed/posts/:id/comments` | POST | In-memory | Mock social interaction | Disabled. |
| `/api/upload` | POST | Local disk (`/uploads`) | Lacks company scoping, authentication checks, and storage controls | Prevents unisolated file uploads on shared servers. |
| `/api/verified-badge-request` | GET, POST | In-memory | Static simulated compliance claims | Removed unverified compliance badge requests. |
| `/api/discover/workers` | GET | In-memory mock list | Leaks external worker cards outside company boundaries | Discovery tab disabled; worker directory is restricted to verified same-company staff via `/api/directory`. |

## 3. Retained Core Endpoints (Production-Safe & Isolated)
- `POST /api/organisations`: Public organisation registration.
- `POST /api/organisation-memberships`: Public worker enrolment (forced to non-privileged `incoming` role, `pending_approval` status, identity protection).
- `GET /api/memberships/pending`: Manager-only pending membership review (scoped to company).
- `POST /api/memberships/:id/review`: Manager-only approval/rejection (privilege escalation blocked).
- `GET /api/user/memberships`: Multi-company membership listing (active only).
- `POST /api/user/active-membership`: Validated multi-company active context switching.
- `GET /api/workflow-templates` & `POST /api/workflow-templates`: Company-scoped workflow templates.
- `GET /api/handovers`, `POST /api/handovers`: Scoped shift handovers.
- `POST /api/handovers/:id/relay`: Supervisor/owner relay only, state transition enforced.
- `POST /api/handovers/:id/acknowledge`: Assigned worker/owner acknowledge only, state transition enforced.
- `GET /api/directory`: Active company staff directory only.
- `GET /api/time-entries`, `POST /api/time-entries/clock-in`, `/clock-out`: Member time tracking.
- `GET /api/analytics`, `GET /api/attendance/today`, `GET /api/audit-events`: Manager-scoped reporting.
- `GET /api/notifications`, `POST /api/notifications/read`: Scoped notifications.
