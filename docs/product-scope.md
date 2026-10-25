# ShiftRelay — Product Scope & Capability Backlog

**Document Status:** Living Product Inventory  
**Branch:** `feat/ui-phase-1`  
**Last Updated:** 2026-10-25

---

## 1. Executive Summary

This backlog maintains the clear operational boundary between genuinely implemented capabilities, partially implemented capabilities, and proposed future roadmap features. 

> [!IMPORTANT]
> The existence of an interface or navigation tab does not imply that the full enterprise product lifecycle is complete. Proposed capabilities must never be presented as implemented without agreed backend endpoints, idempotency protection, and automated regression coverage.

---

## 2. Capability Matrix

### 2.1 Implemented Capabilities (Verified Production & Dev-Fallback)

| Feature / Domain | Supported Actions & Endpoints | Security & Isolation Guarantee | Presentation Tier |
|---|---|---|---|
| **Worker Operations (Today)** | Real-time clock in/out (`POST /api/time-entries/clock-in`, `POST /api/time-entries/clock-out`), active shift timer, incoming handover acknowledgement (`POST /api/handovers/:id/acknowledge`), shift task checklist toggle (`POST /api/handovers/:id/tasks/:taskId/toggle`). | Scoped strictly to authenticated worker membership and active company ID. Idempotent punch protection. | Worker Dock (`today`) |
| **Worker Schedule** | Chronological assigned shifts (`GET /api/calendar`), attendance punch log (`GET /api/time-entries`), leave request submission & status list (`GET/POST /api/leave-requests`). | Blocked claiming route (`POST /api/open-shifts/:id/claim` returns HTTP 501). Timezone display via company `time_zone`. Real database assignments only. | Worker Dock (`schedule`) |
| **Worker Handovers** | Submit operational handover (`POST /api/handovers`), inspect past handover briefs with full detail, acknowledgement audit trail. | Role-gated creation (`outgoing` / `worker`). Zero cross-company leakage. | Worker Dock (`handovers`) |
| **Worker Profile (Me)** | View profile details, update title/department (`PUT /api/profile`), theme toggling (dark/light), password updates (`PUT /api/auth/password`), safe logout with offline sync queue warning. | Scoped to calling user. Password length enforced (>=10 chars). | Worker Dock (`me`) |
| **Manager Overview** | Pending worker access review queue (`GET /api/memberships/pending`, `POST /api/memberships/:id/review`), handover review & relay queue (`POST /api/handovers/:id/relay`), live headcount from daily attendance. | Supervisor and Owner access only. Workers receive HTTP 403. Idempotent relay and membership review. | Manager Sidebar & Dock (`overview`) |
| **Manager Schedule** | Company-wide team roster with date and staff member filters. Owner shift assignment modal (`POST /api/calendar/shifts`). | Read-only for supervisors (HTTP 403 on creation). Server verifies assigned staff has active membership in the same company. Server duplicate protection. | Manager Sidebar & Dock (`schedule`) |
| **Manager Team Directory** | Searchable staff directory (`GET /api/directory`), role badges, department listing. | Strictly scoped to active company memberships. Cross-tenant directory leaks prevented. | Manager Sidebar & Dock (`team`) |
| **Manager Handovers** | Filter handovers by status (`awaiting_review`, `relayed`, `acknowledged`). Supervisor approve & relay workflow. | Handover state machine enforced (cannot acknowledge un-relayed, cannot re-relay). | Manager Sidebar & Dock (`handovers`) |
| **Manager Approvals** | Unified decision desk: worker access requests (`/api/memberships/pending`) and leave requests (`GET /api/leave-requests`). | Owner-only leave decisions; supervisor access-request approval only. Idempotency keys on all reviews. | Manager Sidebar & Dock (`approvals`) |
| **Owner Settings** | Company profile configuration (`GET/PUT /api/organisation/settings`): trading name, industry presentation, country, IANA time zone, preferred language, handover reminder minutes (5–240 min). | Owner role strictly enforced server-side. Unsaved change warning banner. Shifts stored at UTC instant; changing time zone updates display formatting only. | Owner Navigation (`settings`) |
| **Multi-Company Context Switcher** | Multi-company membership modal (`GET /api/user/memberships`), context switching (`POST /api/user/active-membership`). | Immediately terminates previous SSE stream, purges notifications cache, re-scopes session to new company ID. | Header Context Pill |
| **Notifications & SSE** | Real-time event streaming (`GET /api/events`), in-app notification flyout, unread counter badge, mark-all-read (`POST /api/notifications/read`). | Company-scoped broadcast isolation (Batch 2C). Immediate eviction on logout, context switch, or membership revocation. | Header Bell & Panel |
| **Entry & Access Portal** | Responsive entry screen, bottom-sheet modal with Sign In, Join Workplace (`POST /api/organisation-memberships`), Register Company (`POST /api/organisations`), and demo roles. | Minimum 10-char password validation. Join requests created with `pending_approval` status. | Entry & Bottom Sheet |

---

### 2.2 Partially Implemented Capabilities (Deliberately Constrained)

| Feature | Current Working Behavior | Missing Scope / Known Boundary |
|---|---|---|
| **Industry Selection** | Stored in organisation settings and profile. Adapts presentation labels (e.g. ward vs warehouse terminology). | **No sector-specific workflow rules** or regulatory compliance engines (e.g. HIPAA audit forms, OSHA checklists). |
| **Preferred Language** | Language preferences stored in database (`en`, `es`, `fr`, `de`, `sw`). | **Interface is English-only.** Live translation engine is not active in production. |
| **Handover Reminder Setting** | Stored in organisation settings (5–240 minutes). | **Automated background push/SMS reminder delivery is not implemented.** Setting represents a stored operational preference only. |
| **Offline Sync Queue** | Local action queue buffers offline operations and prompts warning before logout. | Partial background sync; conflict resolution strategy is optimistic last-write-wins. |

---

### 2.3 Proposed Capabilities (Backlog — Do Not Build Without Agreed Spec)

1. **Shift Swap Marketplace (`/api/shift-swaps`)**:
   - *Status:* Disabled (HTTP 501 Not Implemented).
   - *Requirements Needed:* Worker proposal flow, supervisor approval state machine, peer acceptance window, roster conflict checking.
2. **Shift Drop / Cancellation**:
   - *Status:* Unimplemented.
   - *Requirements Needed:* Worker cancellation window, supervisor reassignment logic, penalty rules.
3. **Open Shifts Instant Claiming (`/api/open-shifts/:id/claim`)**:
   - *Status:* Disabled server-side (HTTP 501) for pilot safety.
   - *Requirements Needed:* Overtime calculation, credential/qualification checks, manager sign-off requirement.
4. **Site & Zone Hierarchy**:
   - *Status:* Replaced with unified "Company" context.
   - *Requirements Needed:* Multi-site nested permissions, site-level supervisor scoping, facility geofencing.
5. **Workflow Automation & Form Builder**:
   - *Status:* Unimplemented (mock templates removed).
   - *Requirements Needed:* Visual workflow designer, condition engine, step assignments.
6. **Billing, Subscription & Invoicing**:
   - *Status:* Unimplemented.
   - *Requirements Needed:* Payment gateway integration, seat-based licensing, plan limits.
7. **Compliance Audit Log Viewer**:
   - *Status:* Backend audit events table exists; dedicated enterprise UI viewer not built.
   - *Requirements Needed:* Export to CSV/PDF, retention policies, filtered search by actor and entity.
