# ShiftRelay: Remaining UI Inventory & Implementation Plan

**Date:** 2026-10-22  
**Branch:** `feat/ui-phase-1`  
**Scope:** Strict capability assessment of remaining screens and components. No code modifications performed during this audit.

---

## 1. Inventory Matrix

| Area | Current Functionality & Supported Endpoints | UI Redesign Needed | Missing Backend Capabilities | Recommendation |
|---|---|---|---|---|
| **Worker Schedule** | `GET /api/calendar?month=YYYY-MM` (returns assigned shifts & leave); `GET /api/leave-requests`; `POST /api/leave-requests` | Build personal schedule view in `phase1-shell.js`: assigned shift roster list, leave request form, and request status history. Distinguish assigned shifts from open-shift opportunities. | Shift swap requests (`/api/shift-swaps`) are disabled (HTTP 501). Worker shift cancellation/drop endpoint does not exist. | **Build now** (assigned shifts + leave requests only) |
| **Worker Me (Profile)** | `GET /api/auth/session` (identity, role, facility); `PUT /api/profile` (avatar base64); `POST /api/auth/sign-out` | Build profile screen in `phase1-shell.js`: user details, facility/unit info, dark mode toggle, session sign-out with offline check. Strip mock reputation badges and endorsed skills. | Passport verification badge requests (`/api/verified-badge-request`) disabled (501). Endorsement persistence unmigrated. | **Build now** (account info, preferences, sign-out) |
| **Manager Schedule** | `GET /api/calendar` (facility-wide roster & leave); `POST /api/calendar/shifts` (Owner only); `POST /api/schedule-import` (Owner/Workforce admin) | Build team roster calendar/card view in `phase1-shell.js`. Add shift modal for owners. Distinct open-shift review section. | Supervisors cannot schedule shifts (`POST /api/calendar/shifts` requires `owner` role, returns 403). Shift update/delete endpoints do not exist. | **Build now** (team roster view; owner shift creation; supervisor read-only) |
| **Notifications** | `GET /api/notifications` (scoped unread list); `POST /api/notifications/read` (mark all read); `POST /api/notifications/:id/read` | Build flyout/panel triggered by header bell: unread list, read timestamp, mark-all-read button, empty state. | Notification category filtering. Web Push subscriptions (mock/local only). | **Build now** (header dropdown/panel using existing endpoints) |
| **Owner Settings** | `GET /api/organisation/settings`; `PUT /api/organisation/settings`; `GET /api/workflow-templates`; `GET /api/audit-events` | Build settings screen in `phase1-shell.js`: facility profile form (name, timezone, reminder interval), audit log viewer, workflow template viewer. Hidden from supervisors. | Multi-site facility deletion/management endpoints unmigrated. Billing/subscription endpoints mock only. | **Build now** (profile settings, audit log, workflows; owner-only) |
| **Onboarding & Company Switcher** | `GET /api/user/memberships`; `POST /api/user/active-membership`; `POST /api/organisation-memberships` | Modal switcher already implemented in `phase1-shell.js` (`openContextModal`). Polish active pill & error handling. Keep intrusive walkthrough modal disabled. | Site-level context switching within single organization (unwired in session token). Invite links. | **Polish switcher; Defer walkthrough** |
| **Brand & Logo** | `icon.svg` vector exists; brand variables defined (`#0d524d`, `#10b981`, `#0f172a`) | Align header `#sr-brand-home` to render vector `icon.svg` uniformly across worker and manager shells. Ensure PWA manifest icons align. | Custom facility logo upload (`/api/upload` is disabled 501 for cross-company isolation). System brand + text used. | **Build now** (pure SVG/CSS alignment in header) |

---

## 2. Shift Data Distinction

- **Assigned Scheduled Shifts (`scheduled_shifts` table via `/api/calendar`)**:
  - Official working schedule assigned to a specific membership ID.
  - Workers view their own roster; managers view facility-wide roster.
  - Leave requests overlay this calendar.
- **Open Shift Opportunities (`open_shifts` table via `/api/open-shifts`)**:
  - Unclaimed coverage slots/marketplace opportunities requiring applications (`/api/open-shifts/:id/apply`).
  - Must remain visually and functionally separated from the assigned duty roster.

---

## 3. Recommended Smallest Implementation Sequence

1. **Step 1: Header Notifications Flyout & Brand Logo**
   - Wire `#sr-shell-bell` to a lightweight flyout using `GET /api/notifications` and `POST /api/notifications/read`.
   - Embed inline `icon.svg` into `#sr-brand-home` for consistent brand appearance across all screens.
2. **Step 2: Worker Schedule & Worker Me**
   - Implements remaining worker navigation tabs (`schedule`, `me`).
   - Completes a fully coherent 4-tab frontline worker experience (`today`, `schedule`, `handovers`, `me`).
3. **Step 3: Manager Schedule & Owner Settings**
   - Implements team schedule view (read-only for supervisor, shift creation for owner).
   - Implements Owner Settings (strictly hidden from supervisors).
   - Completes the manager navigation suite (`overview`, `schedule`, `handovers`, `team`, `approvals`, `settings`).
4. **Step 4: Regression & Cross-Company Audit**
   - End-to-end browser audit across mobile and desktop for all newly integrated screens.
