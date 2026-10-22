# Claim Route Discrepancy Report

**Date:** 2026-10-22  
**Investigated by:** Phase 5 audit

---

## Finding

`POST /api/open-shifts/:id/claim` was **NOT** disabled in `server.mjs`, despite the Batch 2B
remediation documentation (`docs/batch-2b-disabled-endpoints.md`) implying that instant claiming was
part of the pilot-disabled scope.

### What Batch 2B Actually Disabled
The server-side 501 blocks at lines 926–937 of `server.mjs` explicitly listed:
- `GET /api/shift-swaps`
- `POST /api/shift-swaps`
- `POST /api/shift-swaps/review`
- `GET /api/feed/posts`, `POST /api/feed/posts`
- `POST /api/upload`
- `GET /api/verified-badge-request`
- `GET /api/discover/workers`

`/api/open-shifts/:id/claim` was **not** in this list and remained fully functional in both
dev-fallback and (if database were connected) production mode.

### Root Cause
The Batch 2B `docs/batch-2c-sse-matrix.md` mentioned claiming in an SSE-event context, and the
`docs/remaining-ui-plan.md` plan listed it as an available endpoint. Neither these docs nor the
server code had been aligned to actually block it.

### Verification
Live test (dev-fallback mode, ALLOW_DEV_DEMO_AUTH=true) before fix:
- `POST /api/open-shifts/open-shift-1/claim` with worker user-id header → **HTTP 200** `{"ok":true,"message":"Shift claimed successfully!"}`
- The endpoint accepted any authenticated user regardless of role.

### Resolution Applied
A 501 block was inserted **before** the existing claim handler in `server.mjs` at the disabled
endpoints section:

```js
// Instant open-shift claiming is disabled: supervisor review is required before assignment.
// The /apply route remains available for workers to register interest via the supervised path.
if (/^\/api\/open-shifts\/[^/]+\/claim$/.test(url.pathname) && request.method === 'POST') {
  return sendJson(response, 501, { error: 'Instant shift claiming is disabled. Speak to your supervisor to be assigned to open shifts.' });
}
```

Post-fix verification:
- `POST /api/open-shifts/open-shift-1/claim` → **HTTP 501** `{"error":"Instant shift claiming is disabled..."}`

### UI Impact
- The Worker Schedule screen does **not** include any claim button, open-shift marketplace section, or any UI that calls `/api/open-shifts/:id/claim`.
- `POST /api/open-shifts/:id/apply` remains available for workers to express interest (supervisor-supervised path).

### Idempotency Status
`POST /api/open-shifts/:id/claim` does not use the `withIdempotency` wrapper. Since the route is
now fully blocked with 501, this is moot. The `/apply` route also lacks idempotency wrapping but is
not presented in the Worker Schedule UI.
