# Batch 2C: SSE Broadcast Isolation & Event Routing Matrix

## 1. Overview
Batch 2C establishes strict company-scoped event isolation for Server-Sent Events (`/api/events`), eliminates global broadcasts, scopes individual notifications to specific recipients, and implements instantaneous session/context eviction alongside active heartbeat checks for database membership status changes.

---

## 2. Event Scope & Recipient Matrix

| Event Name | Scope Derivation | Recipient Constraints | Permitted Payload Fields | Cross-Company Leak Prevention |
| :--- | :--- | :--- | :--- | :--- |
| `ready` | Authenticated session (`user.organisation_id`) | Connected client only | `userId`, `name`, `role`, `organisationId`, `membershipId` | Sent only over the authenticated client socket upon initial handshake |
| `handover-submitted` | DB write / `user.organisation_id` | All active members of the company | `handover` item (scoped to company) | Client socket filtering: `client.organisationId === event.organisationId` |
| `handover-relayed` | DB write / `user.organisation_id` | All active members of the company | `handover` item | Filtered by company `organisationId` |
| `handover-acknowledged` | DB write / `user.organisation_id` | All active members of the company | `handover` item | Filtered by company `organisationId` |
| `handover-updated` | DB write / `user.organisation_id` | All active members of the company | `handoverId`, `task` | Filtered by company `organisationId` |
| `schedule-updated` | Shift claim / `user.organisation_id` | All active members of the company | None (signal only) | Filtered by company `organisationId` |
| `team-message` | Channel lookup / `user.organisation_id` | Active members in company | `message` (channel_id, author, body) | Enforced channel ownership & company scope |
| `private-message` | Sender/recipient membership validation | Specific recipient membership (`recipientMembershipId`) & sender | `id`, `body`, sender/recipient IDs | `client.membershipId === recipientMembershipId \|\| client.membershipId === senderMembershipId` |
| `notification-added` | `notifyMembership` / company DB record | Specific recipient membership (`recipientMembershipId`) | `id`, `message` | Delivered exclusively to client whose `membershipId` matches recipient |
| `session-invalidated` | Internal eviction triggers | Targeted session / membership | `reason` ('logged_out', 'context_switched', 'membership_revoked') | Targeted directly by `client.sessionId` or `client.membershipId` |

---

## 3. Disconnection & Eviction Mechanisms

| Trigger Event | Mechanism | Enforcement Delay | Description |
| :--- | :--- | :--- | :--- |
| **Sign-out** (`POST /api/auth/sign-out`) | `evictSessionClients(sessionId, 'logged_out')` | **0 ms** (Synchronous) | Immediately terminates response stream and deletes client from event listener set before completing request. |
| **Context Switch** (`POST /api/user/active-membership`) | `evictSessionClients(sessionId, 'context_switched')` | **0 ms** (Synchronous) | Immediately closes the SSE stream associated with the prior company context so client cannot receive stale events while reconnecting. |
| **Membership Deactivation / Expiry** | Background DB heartbeat (every 5,000 ms) | **&le; 5,000 ms** (Heartbeat interval) | Queries PostgreSQL for all connected session tokens. If session expired or membership `status != 'active'`, sends `session-invalidated` and destroys the socket. |
| **Socket Drop / Network Disconnect** | Stream `close` / `error` handlers | **0 ms** | Automatically unregisters the socket from `eventClients` set. |

---

## 4. Retained & Disabled Routes Isolation Status

- **Retained & Verified Isolated:**
  - Handovers (`/api/handovers`, `/api/handovers/:id/relay`, `/api/handovers/:id/acknowledge`)
  - Team Community Messages (`/api/community/messages`)
  - Direct Messages (`/api/community/direct-messages`)
  - Schedule Claiming (`/api/open-shifts/:id/claim`)
  - In-app Notifications (`/api/notifications`, `/api/notifications/read`)
- **Server-Side Disabled (HTTP 501 Not Implemented):**
  - Unsafe pilot social/emergency features (`/api/feed/posts`, `/api/upload`, `/api/verified-badge-request`, `/api/shift-swaps`, `/api/incidents`) remain disabled server-side. Unscoped emergency/social broadcast code paths cannot be triggered in production.
