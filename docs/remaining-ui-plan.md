# ShiftRelay: Remaining UI Inventory & Implementation Plan

**Date:** 2026-10-22  
**Branch:** `feat/ui-phase-1`  
**Status:** Planning Only — No Code Modifications

---

## 1. Executive Summary

This plan defines the concrete functional boundaries and smallest viable implementations for the remaining three system interfaces:
1. **Worker Schedule**
2. **Manager Schedule**
3. **Owner Settings**

Every capability listed has been verified against active backend endpoints in `server.mjs`.

---

## 2. Schedule Data Streams (Must Never Be Mixed)

To prevent operational ambiguity, three distinct shift concepts must never be conflated in UI or data representation:

| Data Stream | Source Table | Endpoint | Concept & Lifecycle |
|---|---|---|---|
| **Assigned Shifts** | `scheduled_shifts` | `GET /api/calendar?month=YYYY-MM` | Confirmed scheduled work duties assigned to a specific worker. Represents expected labor. |
| **Open Shifts** | `open_shifts` | `GET /api/open-shifts`<br>`POST /api/open-shifts/:id/claim` | Unclaimed coverage opportunities in an internal marketplace. Vacant until claimed or assigned. |
| **Attendance History** | `time_entries` | `GET /api/time-entries?month=YYYY-MM`<br>`POST /api/time-entries/clock-in`<br>`POST /api/time-entries/clock-out` | Historical recorded punch cards (clock-in / clock-out / hours). Represents past actual labor. |

### Date & Time-Zone Handling
- **Server Storage:** UTC `TIMESTAMPTZ` ISO 8601 strings.
- **Query Inputs:** Calendar and time endpoints require `YYYY-MM` format (parsed via Postgres `date_trunc('month', $2::date)`).
- **Client Presentation:** Timestamps must be rendered using `Intl.DateTimeFormat` with the organisation's configured timezone (from `organisation.time_zone` or session) to prevent date-boundary shifting across midnight shifts.
- **Company Isolation:** Strictly filtered by `user.organisation_id` in database queries. Cross-company access is blocked at the session middleware layer.

---

## 3. Screen-by-Screen Capability Audit

### 3.1 Worker Schedule (`schedule` view)
- **Working Backend Endpoints & Supported Actions:**
  - `GET /api/calendar?month=YYYY-MM`: Returns `{ shifts: [...], leave: [...] }` for the organisation. Client filters `s.membership_id === user.id` to show personal confirmed duty roster.
  - `GET /api/open-shifts`: Returns `{ shifts: [...] }` with `status: 'open'` (unassigned coverage opportunities).
  - `POST /api/open-shifts/:id/claim`: Worker claims open coverage slot directly; decrements open slots and creates assigned shift (`status: 'claimed'`).
  - `POST /api/open-shifts/:id/apply`: Worker applies for shift coverage.
  - `GET /api/time-entries?month=YYYY-MM`: Returns actual punch history (`clocked_in_at`, `clocked_out_at`, `hours`, `active`) for the calling worker.
  - `POST /api/time-entries/clock-in`: Real-time clock in (idempotent, blocks concurrent active punch).
  - `POST /api/time-entries/clock-out`: Real-time clock out.
  - `GET /api/leave-requests`: Returns worker's submitted leave requests.
  - `POST /api/leave-requests`: Worker submits leave request (`startsOn`, `endsOn`, `reason`).
- **Missing Backend Capabilities:**
  - No worker shift drop or cancellation endpoint (`scheduled_shifts` cannot be deleted or unassigned by worker).
  - Shift swap requests (`/api/shift-swaps`) return HTTP 501 Not Implemented.
  - Peer-to-peer trade negotiations are unsupported.
- **Smallest Useful UI Supported Today:**
  - Segmented control separating:
    1. **My Shifts:** Monthly/weekly chronological list of confirmed assigned shifts with leave overlays (`approved`, `pending`).
    2. **Open Opportunities:** Marketplace list of open shifts showing date, time, hourly rate, and a direct "Claim Shift" button.
    3. **Attendance History:** Punch card summary showing recorded hours and recent punch history.
  - Inline "Request Leave" modal/form (`startsOn`, `endsOn`, `reason`).

---

### 3.2 Manager Schedule (`schedule` view)
- **Working Backend Endpoints & Supported Actions:**
  - `GET /api/calendar?month=YYYY-MM`: Facility-wide schedule returning all workers' assigned shifts and team leave.
  - `POST /api/calendar/shifts`: Creates a scheduled shift (`membershipId`, `startsAt`, `endsAt`). Strictly restricted to `user.role === 'owner'`.
  - `POST /api/schedule-import`: Bulk CSV schedule importer (`rows: [{ email, startsAt, endsAt }]`). Restricted to `owner` and `workforce_admin`.
  - `GET /api/open-shifts`: Facility-wide open coverage slots with applicant counts.
  - `POST /api/open-shifts`: Posts a new open shift slot (`title`, `startsAt`, `endsAt`, `slots`, `notes`). Restricted to `owner` and `workforce_admin`.
- **Missing Backend Capabilities:**
  - Shift modification and cancellation: No `PUT /api/calendar/shifts/:id` or `DELETE /api/calendar/shifts/:id` exists. Once scheduled, shifts cannot be edited or removed via API.
  - Supervisor permissions: Supervisors receive HTTP 403 Forbidden on `POST /api/calendar/shifts` and `POST /api/open-shifts`.
  - Open shift applicant review: Approving individual applicant applications (`POST /api/open-shifts/:id/assign`) is not implemented.
- **Smallest Useful UI Supported Today:**
  - Team Roster View: Grouped by date or staff member showing confirmed shifts and team leave across the facility.
  - Role-gated controls:
    - **Owner:** Displays "Add Shift" button with worker dropdown (`membershipId`), start time, and end time.
    - **Supervisor:** Read-only duty roster view with an explicit "Read-only team roster (Owner scheduling required)" notice.
  - Open Shift Management: Secondary view showing posted open shifts and remaining open slots.

---

### 3.3 Owner Settings (`settings` view)
- **Working Backend Endpoints & Supported Actions:**
  - `GET /api/organisation/settings`: Returns `{ organisation: { legal_name, trading_name, industry, country, time_zone, preferred_language, settings } }`. (Strictly owner-only; supervisors/workers receive HTTP 403).
  - `PUT /api/organisation/settings`: Updates `{ tradingName, industry, country, timeZone, language, handoverReminderMinutes }`. (Strictly owner-only; writes audit event).
- **Missing Capabilities / Prohibited Inventions:**
  - **No Workflow Builders:** Visual step creators or sequence builders are not supported in settings configuration.
  - **No Audit Log Viewer in Settings:** Audit events table is handled separately; not part of settings configuration.
  - **No Site Management:** Multi-branch creation, facility deletion, or sub-unit management endpoints do not exist.
  - **No Billing / Subscriptions:** Payment and tier endpoints are mock/unmigrated.
- **Smallest Useful UI Supported Today:**
  - Single-card facility settings form for owners:
    - **Facility Identity:** Trading Name, Industry selector, Country.
    - **Localization:** Facility Time Zone dropdown, Preferred Language.
    - **Policy:** Shift handover reminder interval (minutes).
    - Save action with stateful saving indicator, validation, and success notification.
  - Role protection: Hidden from supervisors and workers; direct URL/tab access renders an explicit 403 Access Denied notice.

---

## 4. Assessment of Legacy Onboarding Guidance

### Does suppressing legacy onboarding leave new users without necessary setup guidance?
**No.** Suppressing `first-shift-onboarding.js` does not degrade user setup. Inspection confirms:
1. **Misleading Marketing Content:** The legacy onboarding modal was a static 3-step carousel that advertised disabled or non-existent features (e.g. instant shift swaps and passport reputation badges). Retaining it would actively confuse users.
2. **Setup Happens Elsewhere:**
   - **Owners:** Facility setup is completed during registration (`/api/auth/register`) where company name and industry are established, and refined in Owner Settings.
   - **Workers:** Staff are onboarded by joining via company invite code (`/api/organisation-memberships`) and are guided into their duty roster upon supervisor/owner approval.
3. **Empty States Provide In-Context Guidance:** Clear, context-specific empty states (e.g., "No shifts scheduled for this period", "Ready to start your shift") provide actionable guidance without intrusive, device-locking modal carousels.

---

## 5. Recommended Implementation Order

1. **Step 1: Worker Schedule (Personal Roster, Open Shift Claims, Leave)**
   - Delivers immediate daily utility for frontline workers: viewing assigned shifts, claiming vacant shifts, and clocking attendance.
2. **Step 2: Manager Schedule (Team Roster & Owner Shift Creation)**
   - Gives supervisors operational visibility over team coverage and owners the ability to assign shifts.
3. **Step 3: Owner Settings (Facility Profile, Timezone, Handover Policy)**
   - Completes executive administration without inventing unsupported site/workflow tools.
