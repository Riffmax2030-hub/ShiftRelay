# Batch 2B Implementation Plan: Company Isolation & API Permissions

## 1. Context & Objectives
Batch 2A secured authentication against header-based spoofing and session fallthrough. Batch 2B establishes **multi-tenant authorization and role boundaries**. Every operation on a protected route must be scoped to the authenticated user's active company membership, verify resource ownership, enforce strict role permissions, and reject unauthorized state transitions.

---

## 2. Worker Enrolment Vulnerability & Remediation

### Current Vulnerability
`POST /api/organisation-memberships` allows anyone with a company code to supply arbitrary `body.role` (e.g., `'owner'`, `'supervisor'`) and immediately grants `status: 'active'`.

### Remediation
1. **Public Enrolment Restricted**:
   - `body.role` is ignored and forced to default worker role (`'worker'` or `'incoming'`).
   - Newly created memberships must be given `status: 'pending_approval'`.
   - Access to company data remains blocked until reviewed.
2. **Owner / Supervisor Review**:
   - Existing endpoints `GET /api/memberships/pending` and `POST /api/memberships/:id/review` (or `/api/memberships/review`) are restricted to `owner` and `supervisor` within the same organisation.
   - Approval transitions status to `'active'`, rejection to `'rejected'`.
3. **Optional Secure Invitations**:
   - Privileged roles (`supervisor`, `workforce_admin`) or instant-active worker memberships can only be provisioned via single-use, cryptographically signed invitation tokens created by an existing company owner.

---

## 3. Multi-Company User Context

### Current Vulnerability
`POST /api/auth/sign-in` queries `portal_users` joined to `memberships` with `LIMIT 1` sorted by `m.created_at DESC`, arbitrarily selecting the latest membership with no ability for multi-company users to switch or validate their active context.

### Remediation
1. **Company Selection / Switching**:
   - Add endpoint `GET /api/user/memberships` to list active memberships (`status = 'active'`) for the authenticated portal user.
   - Add endpoint `POST /api/user/active-membership` (`{ membershipId }`): verifies that the requested `membershipId` belongs to `portal_user.id` and has `status = 'active'`, then issues a new session cookie pointing to that `membership_id`.
2. **Strict Invariant**:
   - Requests never accept `organisation_id` or `membership_id` from client headers or query parameters to determine context; context is determined exclusively from the active session's server-side `membership.organisation_id`.

---

## 4. Route & Permission Matrix

| Route | Method | Data Store | Required Role(s) | Ownership / Tenant Isolation Constraint | Permitted State Transitions | Pilot Recommendation |
|---|---|---|---|---|---|---|
| `/api/auth/session` | GET | SQL | Any active | Returns user membership profile from active session | N/A | Retain |
| `/api/user/memberships` | GET | SQL | Any active | `where user_id = user.portal_user_id and status = 'active'` | N/A | Add for multi-company |
| `/api/organisations` | POST | SQL | Public | Creates new company + owner | N/A | Retain |
| `/api/organisation-memberships` | POST | SQL | Public | Enforces `status = 'pending_approval'`, role forced to worker | N/A | Remediate |
| `/api/memberships/pending` | GET | SQL | `owner`, `supervisor` | Scoped to `where organisation_id = user.organisation_id` | N/A | Retain |
| `/api/memberships/:id/review` | POST | SQL | `owner` | Verified `organisation_id = user.organisation_id` | `pending_approval` -> `active` / `rejected` | Retain |
| `/api/workflow-templates` | GET | SQL | Any active | `where organisation_id = user.organisation_id` | N/A | Retain |
| `/api/workflow-templates` | POST | SQL | `owner` | `organisation_id = user.organisation_id` | N/A | Retain |
| `/api/handovers` | GET | SQL | Any active | `organisation_id = user.organisation_id AND (role IN ('owner','supervisor') OR created_by = user.id OR assigned_to = user.id)` | N/A | Retain |
| `/api/handovers` | POST | SQL | `outgoing`, `supervisor` | `organisation_id = user.organisation_id`, target worker must be active member in same org | New -> `awaiting_review` (or `relayed` if supervisor) | Retain |
| `/api/handovers/:id/relay` | POST | SQL | `supervisor`, `owner` | Verified `id` and `organisation_id`; cannot re-relay | `awaiting_review` -> `relayed` | Retain |
| `/api/handovers/:id/acknowledge`| POST | SQL | `incoming`, `owner` | Verified `id`, `organisation_id`, must be assigned worker or owner | `relayed` -> `acknowledged` | Retain |
| `/api/shift-swaps` | GET | SQL (migrate) | Any active | Filter `where organisation_id = user.organisation_id` | N/A | Migrate from JSON to SQL |
| `/api/shift-swaps` | POST | SQL (migrate) | Any active | `organisation_id = user.organisation_id`; target must be in same org | Creates `pending` swap | Migrate from JSON to SQL |
| `/api/shift-swaps/review` | POST | SQL (migrate) | `supervisor`, `owner` | Verified `organisation_id = user.organisation_id`; workers forbidden | `pending` -> `approved` / `rejected` | Migrate & add role check |
| `/api/time-entries` | GET | SQL | Any active | `where organisation_id = user.organisation_id and membership_id = user.id` | N/A | Retain |
| `/api/time-entries/clock-in` | POST | SQL | Any active | `organisation_id = user.organisation_id`, `membership_id = user.id` | No open entry -> `clocked_in` | Retain |
| `/api/time-entries/clock-out`| POST | SQL | Any active | `organisation_id = user.organisation_id`, `membership_id = user.id` | Active entry -> `clocked_out` | Retain |
| `/api/analytics` | GET | SQL | `owner`, `supervisor` | Scoped to `user.organisation_id` | N/A | Retain |
| `/api/attendance/today` | GET | SQL | `owner`, `supervisor` | Scoped to `user.organisation_id` | N/A | Retain |
| `/api/directory` | GET | SQL | Any active | Scoped to active members of `user.organisation_id` | N/A | Retain |
| `/api/incidents` | GET, POST | SQL | Any active | Scoped to `user.organisation_id` | N/A | Retain |
| `/api/audit-events` | GET | SQL | `owner` | Scoped to `user.organisation_id` | N/A | Retain |
| `/api/notifications` | GET, POST | SQL | Any active | Scoped to `organisation_id = user.organisation_id and recipient_id = user.id` | N/A | Retain |
| `/api/events` (SSE) | GET | SQL session | Any active | Authenticated session check maintained (broadcast isolation in 2C) | N/A | Retain guard |
| `/api/feed/*` (Social posts) | ALL | In-memory | N/A | Unscoped mock social feed | N/A | **Disable for pilot (501 / 404)** |
| `/api/upload` (File upload) | POST | In-memory | N/A | Lacks company scoping & auth | N/A | **Disable for pilot (501)** |
| `/api/verified-badge-request`| ALL | In-memory | N/A | Mock static compliance | N/A | **Disable for pilot (404)** |

---

## 5. Verification & Test Plan

Tests will run against a real PostgreSQL instance using two fictional organisations:
- **Company A** (`org_a`): Alice (Owner), Adam (Supervisor), Bob (Incoming Worker).
- **Company B** (`org_b`): Carol (Owner), Dan (Worker).

### Scenarios Tested
1. **Cross-Company Read Isolation**:
   - Bob (Company A) requests `/api/handovers`, `/api/directory`, `/api/workflow-templates`, `/api/time-entries`.
   - Bob cannot see or query any records belonging to Company B (`Carol`/`Dan`).
2. **Cross-Company Write Isolation**:
   - Bob (Company A) attempts to acknowledge, relay, or swap a shift item in Company B.
   - Must fail with HTTP 404 or 403 (zero cross-tenant mutation).
3. **Role & State Transition Enforcement**:
   - Bob (Worker in Company A) attempts to review a shift swap (`POST /api/shift-swaps/review`) or relay a handover.
   - Must return HTTP 403 Forbidden.
   - Adam (Supervisor) approves; Bob acknowledges; repeated approval or invalid transitions fail.
4. **Worker Enrolment Hardening**:
   - Public submission to `/api/organisation-memberships` with `{ role: 'owner' }` is forced to worker role and set to `pending_approval`.
   - Enrolled user cannot access any protected endpoint until Alice approves via `/api/memberships/:id/review`.
5. **Multi-Company Context Validation**:
   - User with memberships in both Company A and B can switch active membership only to an active membership they own; cannot switch to another user's or non-existent membership.

---

## 6. Implementation Steps
1. Create table `shift_swaps` in `database.mjs` with `organisation_id`, `requester_membership_id`, `target_membership_id`, `status`.
2. Update `POST /api/organisation-memberships` to ignore client-requested `role` and set `status = 'pending_approval'`.
3. Add company-scoped database handlers for `/api/shift-swaps` and `/api/shift-swaps/review`, enforcing supervisor/owner role checks.
4. Disable unsafe pilot endpoints server-side (`/api/feed/*`, `/api/upload`, `/api/verified-badge-request`).
5. Add `GET /api/user/memberships` and `POST /api/user/active-membership` for verified multi-company context switching.
6. Build and execute `test-batch-2b.mjs` verifying all cross-company and role boundary test scenarios.

---

## 7. Unresolved Decisions
1. **Pending Enrolment Notification**: Should pending worker enrolments generate an in-app notification to all company owners/supervisors, or will owners rely on checking `/api/memberships/pending`?
2. **Shift Swap Assignment Storage**: Should approved shift swaps automatically mutate `work_items.assigned_to_membership_id` in PostgreSQL, or record the approved swap record for pilot visibility?
