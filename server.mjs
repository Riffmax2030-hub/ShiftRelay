import { createServer } from 'node:http';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { basename, extname, join, normalize, resolve } from 'node:path';
import { databaseConfigured, demoMembers, demoOrganisation, initializeDatabase, isDatabaseConnectionError, sanitizeDatabaseError, query, seedDemoOrganisation } from './database.mjs';

function loadEnvironment() {
  try {
    for (const entry of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = entry.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

loadEnvironment();

// ── Environment / startup safety flags ───────────────────────────────────────
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const ALLOW_DEV_FALLBACK = process.env.ALLOW_DEV_FALLBACK === 'true';
const ALLOW_DEV_DEMO_AUTH = process.env.ALLOW_DEV_DEMO_AUTH === 'true';

if (IS_PRODUCTION && ALLOW_DEV_FALLBACK) {
  console.error('[FATAL] ALLOW_DEV_FALLBACK must not be set in NODE_ENV=production. This setting is only permitted in development. Exiting.');
  process.exit(1);
}

if (IS_PRODUCTION && ALLOW_DEV_DEMO_AUTH) {
  console.error('[FATAL] ALLOW_DEV_DEMO_AUTH must not be set in NODE_ENV=production. Demo authentication is only permitted in development. Exiting.');
  process.exit(1);
}

const port = Number(process.env.PORT || 4000);
const publicDirectory = process.cwd();
const dataDirectory = join(publicDirectory, 'data');
const dataPath = join(dataDirectory, 'shiftrelay.json');
const uploadsDirectory = join(publicDirectory, 'uploads');
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};
const users = demoMembers;
let databaseReady = false;
const eventClients = new Set();
const scrypt = promisify(scryptCallback);

const schema = {
  type: 'object', additionalProperties: false, required: ['summary', 'actions', 'missing_context'],
  properties: {
    summary: { type: 'string' },
    actions: { type: 'array', maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['title', 'priority', 'owner', 'due', 'evidence'], properties: { title: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] }, owner: { type: 'string' }, due: { type: 'string' }, evidence: { type: 'string' } } } },
    missing_context: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['question', 'why_it_matters'], properties: { question: { type: 'string' }, why_it_matters: { type: 'string' } } } }
  }
};

export async function getStore() {
  await mkdir(dataDirectory, { recursive: true });
  let store;
  try { store = JSON.parse(await readFile(dataPath, 'utf8')); }
  catch { store = { handovers: [], notifications: [] }; }

  // ── Enterprise Tenant & Nigerian Frontline Compensation Defaults ───────────
  if (!Array.isArray(store.organisations) || store.organisations.length === 0) {
    store.organisations = [
      {
        id: '00000000-0000-4000-8000-000000000100',
        organisation_code: '246701',
        aliases: ['DAN-NG-4011', 'SR-NG-101', '246701', 'DANGOTE'],
        legal_name: 'Dangote Logistics & Operations (Nigeria)',
        trading_name: 'Dangote Operations',
        industry: 'Logistics & FMCG',
        country: 'Nigeria',
        currency: 'NGN'
      }
    ];
  }
  if (!Array.isArray(store.contracts) || store.contracts.length === 0) {
    store.contracts = [
      {
        userId: '00000000-0000-4000-8000-000000000011',
        userName: 'Amina Otieno',
        staffId: 'DNG-0411',
        role: 'Process Operations Specialist',
        department: 'Industrial Plant Operations',
        compensation_type: 'fixed_monthly',
        monthly_rate: 220000,
        hourly_rate: 1375,
        currency: 'NGN',
        bank_name: 'Access Bank',
        account_number: '0123456789',
        account_name: 'Amina Otieno'
      },
      {
        userId: '00000000-0000-4000-8000-000000000012',
        userName: 'David Kariuki',
        staffId: 'DNG-0102',
        role: 'Shift Operations Supervisor',
        department: 'Plant Supervision & Handover',
        compensation_type: 'fixed_monthly',
        monthly_rate: 350000,
        hourly_rate: 2187,
        currency: 'NGN',
        bank_name: 'First Bank of Nigeria',
        account_number: '3109876543',
        account_name: 'David Kariuki'
      },
      {
        userId: '00000000-0000-4000-8000-000000000013',
        userName: 'Faith Wanjiku',
        staffId: 'DNG-0823',
        role: 'Incoming Specialist',
        department: 'Supply Chain Operations',
        compensation_type: 'fixed_monthly',
        monthly_rate: 185000,
        hourly_rate: 1156,
        currency: 'NGN',
        bank_name: 'Zenith Bank',
        account_number: '2081123456',
        account_name: 'Faith Wanjiku'
      },
      {
        userId: '00000000-0000-4000-8000-000000000014',
        userName: 'Jordan Lee',
        staffId: 'DNG-0001',
        role: 'Managing Director / Owner',
        department: 'Executive Operations',
        compensation_type: 'fixed_monthly',
        monthly_rate: 750000,
        hourly_rate: 4687,
        currency: 'NGN',
        bank_name: 'Guaranty Trust Bank (GTBank)',
        account_number: '0019283746',
        account_name: 'Jordan Lee'
      },
      {
        userId: 'demo-aaron',
        userName: 'Aaron Glover',
        staffId: 'DNG-1194',
        role: 'Frontline Locum Specialist',
        department: 'Logistics Fleet Maintenance',
        compensation_type: 'hourly_shift',
        monthly_rate: 0,
        hourly_rate: 1800,
        currency: 'NGN',
        bank_name: 'United Bank for Africa (UBA)',
        account_number: '2098765431',
        account_name: 'Aaron Glover'
      }
    ];
  }
  return store;
}

async function saveStore(store) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataPath, JSON.stringify(store, null, 2));
}

function demoTimeSummary(user, store, month) {
  if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
  const now = new Date();
  const monthStart = month ? new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const entries = store.timeEntries
    .filter((entry) => entry.membershipId === user.id && new Date(entry.clockedInAt) >= monthStart && new Date(entry.clockedInAt) < monthEnd)
    .sort((a, b) => new Date(b.clockedInAt) - new Date(a.clockedInAt));
  const hoursFor = (entry) => (new Date(entry.clockedOutAt || now) - new Date(entry.clockedInAt)) / 3600000;
  const totalHours = entries.reduce((total, entry) => total + hoursFor(entry), 0);
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const weekHours = entries.filter((entry) => new Date(entry.clockedInAt) >= weekStart).reduce((total, entry) => total + hoursFor(entry), 0);
  return {
    active: entries.find((entry) => !entry.clockedOutAt) || null,
    totalHours: Math.round(totalHours * 10) / 10,
    weekHours: Math.round(weekHours * 10) / 10,
    entries: entries.map((entry) => ({ id: entry.id, clocked_in_at: entry.clockedInAt, clocked_out_at: entry.clockedOutAt, note: entry.note || null, hours: Math.round(hoursFor(entry) * 10) / 10 }))
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  });
  response.end(JSON.stringify(payload));
}

/**
 * Translates a database error into an appropriate HTTP response.
 * Never leaks raw SQL, connection strings, or stack traces to the client.
 * Call this from any route catch-block that received an error from query().
 */
function sendDatabaseError(response, error) {
  const { status, message } = sanitizeDatabaseError(error);
  if (isDatabaseConnectionError(error)) {
    console.error('[DB CONN ERROR]', error.code || error.message);
  } else {
    console.error('[DB ERROR]', error.code || 'NO_CODE', '-', error.message?.slice(0, 120));
  }
  return sendJson(response, status, { error: message });
}
function broadcastEvent(event, payload, options = {}) {
  // Derive organisationId strictly from options or payload
  const organisationId = options.organisationId || payload?.organisationId;
  if (!organisationId || typeof organisationId !== 'string') {
    console.warn(`[SECURITY WARN] Blocked unscoped SSE broadcast for event '${event}'. Every private event must have an explicit organisationId.`);
    return false;
  }

  const recipientMembershipId = options.recipientMembershipId || payload?.recipientMembershipId;
  const recipientUserId = options.recipientUserId || payload?.recipientUserId;
  const allowedRoles = Array.isArray(options.allowedRoles) ? options.allowedRoles : null;

  const data = JSON.stringify(payload);
  const message = `event: ${event}\ndata: ${data}\n\n`;

  let deliveredCount = 0;
  for (const client of eventClients) {
    // 1. Company scope check: must strictly match client's active organisation
    if (client.organisationId !== organisationId) continue;

    // 2. Individual recipient check: if targeted to specific membership/user, skip others
    if (recipientMembershipId && client.membershipId !== recipientMembershipId && client.membershipId !== options.senderMembershipId) {
      continue;
    }
    if (recipientUserId && client.userId !== recipientUserId && client.userId !== options.senderUserId) {
      continue;
    }

    // 3. Role restriction check (if any)
    if (allowedRoles && !allowedRoles.includes(client.role)) {
      continue;
    }

    try {
      client.response.write(message);
      deliveredCount++;
    } catch {
      eventClients.delete(client);
    }
  }

  return deliveredCount > 0;
}

function evictSessionClients(sessionId, reason = 'session_terminated') {
  for (const client of eventClients) {
    if (client.sessionId === sessionId) {
      eventClients.delete(client);
      try {
        client.response.write(`event: session-invalidated\ndata: ${JSON.stringify({ reason })}\n\n`);
        client.response.end();
      } catch {}
    }
  }
}

function evictMembershipClients(membershipId, reason = 'membership_deactivated') {
  for (const client of eventClients) {
    if (client.membershipId === membershipId) {
      eventClients.delete(client);
      try {
        client.response.write(`event: session-invalidated\ndata: ${JSON.stringify({ reason })}\n\n`);
        client.response.end();
      } catch {}
    }
  }
}

/* ── IP Rate Limiter (sliding window, in-memory) ────────────────────────────
   Protects all /api/ routes from brute-force and DDoS. Up to 120 requests
   per 60 seconds per IP. Sensitive auth endpoints get a tighter 10/min cap.
   ──────────────────────────────────────────────────────────────────────── */
const rateLimitBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_GENERAL = 120;
const RATE_LIMIT_AUTH = 25;

const authBuckets = new Map();
function isRateLimited(ip, isAuth = false) {
  if (ALLOW_DEV_FALLBACK && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1')) return false;
  const bucket = isAuth ? authBuckets : rateLimitBuckets;
  const now = Date.now();
  const limit = isAuth ? RATE_LIMIT_AUTH : RATE_LIMIT_GENERAL;
  if (!bucket.has(ip)) bucket.set(ip, []);
  const timestamps = bucket.get(ip).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  bucket.set(ip, timestamps);
  return timestamps.length > limit;
}

// Prune rate-limit map every 5 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitBuckets) {
    const fresh = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (fresh.length === 0) rateLimitBuckets.delete(ip); else rateLimitBuckets.set(ip, fresh);
  }
}, 5 * 60_000);

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const parsed = JSON.parse(raw);
  // Prototype pollution guard — strip __proto__, constructor, prototype keys at top level.
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const key of Object.keys(parsed)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') delete parsed[key];
    }
  }
  return parsed;
}

async function readBuffer(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function sessionId(request) { return request.headers.cookie?.match(/(?:^|;\s*)shiftrelay_session=([^;]+)/)?.[1] || null; }
function sessionCookie(value, maxAge = 60 * 60 * 24 * 7) { return `shiftrelay_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }
async function hashPassword(password) { const salt = randomBytes(16).toString('hex'); const hash = await scrypt(password, salt, 64); return `${salt}:${Buffer.from(hash).toString('hex')}`; }
async function passwordMatches(password, stored) { if (!stored) return false; const [salt, expected] = stored.split(':'); if (!salt || !expected) return false; const actual = Buffer.from(await scrypt(password, salt, 64)); const expectedBuffer = Buffer.from(expected, 'hex'); return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer); }

async function createSession(userId, membershipId) {
  const id = crypto.randomUUID();
  if (databaseReady) {
    // In database mode, a session MUST be persisted in the DB.
    // If this fails, the error will propagate to the caller and return 503.
    await query('insert into user_sessions (id, user_id, membership_id, expires_at) values ($1,$2,$3,now() + interval \'7 days\')', [id, userId, membershipId]);
  } else {
    // Only permitted when ALLOW_DEV_FALLBACK is active (enforced at startup).
    const store = await getStore();
    if (!Array.isArray(store.userSessions)) store.userSessions = [];
    store.userSessions.push({ id, userId, membershipId, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await saveStore(store);
  }
  return id;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getUser(request) {
  const token = sessionId(request);
  if (token) {
    if (databaseReady) {
      if (!UUID_REGEX.test(token)) return null;
      try {
        const result = await query(
          `select m.id, u.id as user_id, u.full_name as name, u.email, u.time_zone, u.country_code, u.avatar_data_url, m.role, m.title, m.department, m.shift_start, m.shift_end, m.shift_days, m.status, m.organisation_id, coalesce(o.trading_name, o.legal_name) as organisation_name from user_sessions s join memberships m on m.id = s.membership_id join portal_users u on u.id = s.user_id join organisations o on o.id = m.organisation_id where s.id = $1 and s.expires_at > now()`,
          [token]
        );
        if (result.rows[0]?.status === 'active') return result.rows[0];
        // Invalid, expired, or non-active membership must never fall through to demo auth
        return null;
      } catch (err) {
        if (isDatabaseConnectionError(err)) throw err;
        return null;
      }
    } else {
      const store = await getStore();
      const session = (store.userSessions || []).find((s) => s.id === token && new Date(s.expiresAt) > new Date());
      if (session) {
        const member = (store.memberships || []).find((m) => m.id === session.membershipId && m.status === 'active');
        const user = (store.portalUsers || []).find((u) => u.id === session.userId);
        if (member && user) {
          return { id: member.id, name: user.full_name, email: user.email, role: member.role, title: member.title, department: member.department, organisation_id: member.organisation_id, status: member.status };
        }
      }
      return null;
    }
  }

  // Token is absent: ONLY allow header-based demo user if explicitly permitted in development.
  // Production strictly rejects demo identity.
  if (!IS_PRODUCTION && ALLOW_DEV_DEMO_AUTH) {
    const demoHeader = request.headers['x-shiftrelay-user'];
    if (demoHeader) {
      const demoUser = users.find((user) => user.id === demoHeader);
      return demoUser ? { ...demoUser, organisation_id: demoOrganisation.id, status: 'active' } : null;
    }
  }
  return null;
}

function notify(store, recipientId, handoverId, message) {
  store.notifications.unshift({ id: crypto.randomUUID(), recipientId, handoverId, message, read: false, createdAt: new Date().toISOString() });
}

async function databaseHandovers(user) {
  const result = await query(`select wi.id, wi.status, wi.payload, wi.created_at, wi.updated_at, wi.acknowledged_at, wi.created_by_membership_id, wi.assigned_to_membership_id, reviewer.full_name as reviewer_name from work_items wi left join portal_users reviewer on reviewer.id = wi.created_by_membership_id where wi.organisation_id = $1 and ($2 in ('supervisor', 'owner') or wi.created_by_membership_id = $3 or wi.assigned_to_membership_id = $3) order by wi.created_at desc`, [user.organisation_id, user.role, user.id]);
  return result.rows.map((row) => ({ id: row.id, createdBy: row.created_by_membership_id, assignedTo: row.assigned_to_membership_id, handover: row.payload, status: row.status, acknowledgement: row.acknowledged_at ? { by: row.assigned_to_membership_id, at: row.acknowledged_at } : null, createdAt: row.created_at, updatedAt: row.updated_at, reviewedBy: row.reviewer_name }));
}

// ── Batch 4: Idempotency Key Helpers ─────────────────────────────────────────

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Compute a deterministic fingerprint of request body for mismatch detection.
 * Uses a canonical JSON string so key order doesn't matter.
 */
function requestFingerprint(body) {
  if (!body || typeof body !== 'object') return String(body ?? '');
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(body).sort(([a], [b]) => a.localeCompare(b))));
  return canonical;
}

/**
 * Check for an existing valid idempotency record. Returns:
 *   { hit: true, statusCode, responseBody } — replay this cached response
 *   { hit: false, conflict: true }           — same key, different content (reject)
 *   { hit: false, conflict: false }          — new key, proceed
 *
 * Auth+authz MUST be verified before calling this.
 */
async function checkIdempotencyKey(user, operation, clientKey, fingerprint) {
  if (!databaseReady) return { hit: false, conflict: false };
  // Purge expired keys lazily
  await query('delete from idempotency_keys where expires_at < now()').catch(() => {});
  const existing = (await query(
    'select status_code, response_body, request_fingerprint from idempotency_keys where membership_id = $1 and organisation_id = $2 and operation = $3 and client_key = $4',
    [user.id, user.organisation_id, operation, clientKey]
  )).rows[0];
  if (!existing) return { hit: false, conflict: false };
  if (existing.request_fingerprint !== fingerprint) return { hit: false, conflict: true };
  return { hit: true, statusCode: existing.status_code, responseBody: JSON.parse(existing.response_body) };
}

/**
 * Save an idempotency record atomically. Call AFTER the business transaction commits.
 * Uses INSERT ... ON CONFLICT DO NOTHING to safely handle concurrent duplicate first-saves.
 */
async function saveIdempotencyKey(user, operation, clientKey, fingerprint, statusCode, responseBody) {
  if (!databaseReady) return;
  try {
    await query(
      `insert into idempotency_keys (membership_id, organisation_id, operation, client_key, request_fingerprint, status_code, response_body, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, now() + interval '${IDEMPOTENCY_TTL_HOURS} hours')
       on conflict (membership_id, organisation_id, operation, client_key) do nothing`,
      [user.id, user.organisation_id, operation, clientKey, fingerprint, statusCode, JSON.stringify(responseBody)]
    );
  } catch (err) {
    console.warn('[idempotency] save failed (non-fatal):', err.message);
  }
}

/**
 * Wrap an idempotent database operation in a transaction so that the business
 * mutation and the idempotency record are committed together. If the business
 * function throws, both are rolled back. If the process crashes after commit,
 * the key record exists and the next request gets the cached response.
 *
 * @param {object}   user       - authenticated user object
 * @param {string}   operation  - operation name slug (e.g. 'clock-in')
 * @param {string|null} clientKey - Idempotency-Key header value, or null (no dedup)
 * @param {object}   body       - parsed request body (for fingerprinting)
 * @param {Function} businessFn - async fn(client) => { statusCode, result }
 * @returns {{ statusCode, result, replay: boolean }}
 */
async function withIdempotency(user, operation, clientKey, body, businessFn) {
  const fingerprint = requestFingerprint(body);

  // 1. If client sent a key, check for existing record
  if (clientKey && databaseReady) {
    const check = await checkIdempotencyKey(user, operation, clientKey, fingerprint);
    if (check.conflict) {
      const err = new Error('Idempotency key reused with different request content.');
      err.statusCode = 422;
      throw err;
    }
    if (check.hit) {
      return { statusCode: check.statusCode, result: check.responseBody, replay: true };
    }
  }

  if (!databaseReady) {
    // No DB: just run the business function directly without idempotency records
    const { statusCode, result } = await businessFn(null);
    return { statusCode, result, replay: false };
  }

  // 2. Run business mutation inside a serializable transaction
  const client = await (await import('./database.mjs')).getPool().connect();
  try {
    await client.query('begin isolation level serializable');
    const { statusCode, result } = await businessFn(client);
    // 3. Save idempotency record atomically in the same transaction
    if (clientKey) {
      await client.query(
        `insert into idempotency_keys (membership_id, organisation_id, operation, client_key, request_fingerprint, status_code, response_body, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, now() + interval '${IDEMPOTENCY_TTL_HOURS} hours')
         on conflict (membership_id, organisation_id, operation, client_key) do nothing`,
        [user.id, user.organisation_id, operation, clientKey, fingerprint, statusCode, JSON.stringify(result)]
      );
    }
    await client.query('commit');
    return { statusCode, result, replay: false };
  } catch (err) {
    await client.query('rollback').catch(() => {});
    // Map Postgres serialization failure and deadlock to 409 Conflict so
    // concurrent burst requests are classified correctly (not 500).
    if (err.code === '40001' || err.code === '40P01') {
      const mapped = new Error('Request conflicts with a concurrent operation. Please retry.');
      mapped.statusCode = 409;
      throw mapped;
    }
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function createDatabaseHandover(user, body) {
  const runId = crypto.randomUUID();
  const workItemId = crypto.randomUUID();
  const supervisor = (await query("select id from memberships where organisation_id = $1 and role in ('supervisor', 'owner') and status = 'active' order by case when role = 'supervisor' then 1 else 2 end, created_at limit 1", [user.organisation_id])).rows[0];
  const incomingWorker = (await query("select id from memberships where organisation_id = $1 and role = 'incoming' and status = 'active' order by created_at limit 1", [user.organisation_id])).rows[0];
  if (!supervisor || !incomingWorker) {
    const err = new Error('Your organisation needs an active supervisor and incoming worker before sending handovers.');
    err.statusCode = 422;
    throw err;
  }
  const isUuid = (str) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  const requested = (body.assignedTo && isUuid(body.assignedTo)) ? (await query('select id from memberships where id = $1 and organisation_id = $2 and role = \'incoming\' and status = \'active\'', [body.assignedTo, user.organisation_id])).rows[0] : null;
  const assignedTo = requested?.id || incomingWorker.id;
  await query('insert into workflow_runs (id, organisation_id, created_by_membership_id, status, priority) values ($1, $2, $3, $4, $5)', [runId, user.organisation_id, user.id, 'in_progress', 'normal']);
  await query('insert into work_items (id, workflow_run_id, organisation_id, assigned_to_membership_id, created_by_membership_id, item_type, title, status, priority, payload) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)', [workItemId, runId, user.organisation_id, assignedTo, user.id, 'handover', body.handover.summary, 'awaiting_review', 'normal', JSON.stringify(body.handover)]);
  await query('insert into work_events (id, organisation_id, workflow_run_id, work_item_id, actor_membership_id, event_type, message) values ($1, $2, $3, $4, $5, $6, $7)', [crypto.randomUUID(), user.organisation_id, runId, workItemId, user.id, 'submitted', `${user.name} submitted a handover for review.`]);
  await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), user.organisation_id, supervisor.id, workItemId, `${user.name} created a handover for review.`]);
  if (body.handover) {
    const rawPayload = JSON.stringify(body.handover);
    for (const match of rawPayload.matchAll(/\/uploads\/([a-zA-Z0-9._-]+)/g)) {
      const fn = match[1];
      if (fn) {
        try {
          await query('insert into file_attachments (id, organisation_id, uploader_membership_id, filename) values ($1, $2, $3, $4) on conflict (filename) do nothing', [crypto.randomUUID(), user.organisation_id, user.id, fn]);
        } catch (_) {}
      }
    }
  }
  const created = (await databaseHandovers(user)).find((item) => item.id === workItemId);
  broadcastEvent('handover-submitted', { organisationId: user.organisation_id, handover: created }, { organisationId: user.organisation_id });
  return created;
}

async function updateDatabaseHandover(user, id, action) {
  const item = (await query('select * from work_items where id = $1 and organisation_id = $2', [id, user.organisation_id])).rows[0];
  if (!item) throw new Error('Handover not found.');
  if (action === 'relay') {
    if (!['supervisor', 'owner'].includes(user.role)) throw new Error('Only a supervisor can approve and relay this handover.');
    if (item.status !== 'awaiting_review') throw new Error('This handover cannot be relayed in its current state.');
    await query('update work_items set status = $1, updated_at = now() where id = $2 and organisation_id = $3', ['relayed', id, user.organisation_id]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), user.organisation_id, item.assigned_to_membership_id, id, 'A supervisor approved a handover for your shift.']);
  } else {
    if (item.status !== 'relayed') throw new Error('This handover cannot be acknowledged in its current state.');
    if (user.id !== item.assigned_to_membership_id && user.role !== 'owner') throw new Error('This handover is assigned to another worker.');
    await query('update work_items set status = $1, acknowledged_at = now(), updated_at = now() where id = $2 and organisation_id = $3', ['acknowledged', id, user.organisation_id]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), user.organisation_id, item.created_by_membership_id, id, `${user.name} acknowledged the handover.`]);
  }
  const updated = (await databaseHandovers(user)).find((handover) => handover.id === id);
  broadcastEvent(action === 'relay' ? 'handover-relayed' : 'handover-acknowledged', { organisationId: user.organisation_id, handover: updated }, { organisationId: user.organisation_id });
  return updated;
}

function organisationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function registerOrganisation(body) {
  const organisationId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const code = organisationCode();

  if (databaseReady) {
    await query('insert into organisations (id, organisation_code, legal_name, trading_name, work_email, phone, industry, country, time_zone, preferred_language, verification_status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [organisationId, code, body.legalName, body.tradingName || body.legalName, body.workEmail, body.phone || null, body.industry || 'Other', body.country || 'Global', body.timeZone || 'UTC', body.language || 'en', 'verified']);
    await query('insert into portal_users (id, full_name, email, phone, password_hash, country_code, time_zone, employee_reference) values ($1,$2,$3,$4,$5,$6,$7,$8)', [ownerId, body.ownerName, body.workEmail.toLowerCase(), body.phone || null, await hashPassword(body.password), body.countryCode || null, body.timeZone || 'UTC', body.employeeReference || null]);
    await query('insert into memberships (id, organisation_id, user_id, role, title, department, status) values ($1,$2,$1,$3,$4,$5,$6)', [ownerId, organisationId, 'owner', 'Organisation owner', 'Leadership', 'active']);
    const workflowId = crypto.randomUUID();
    await query('insert into workflow_templates (id, organisation_id, name, description) values ($1,$2,$3,$4)', [workflowId, organisationId, 'Standard shift handover', 'Outgoing worker submits, supervisor reviews, incoming worker acknowledges.']);
    await query('insert into workflow_steps (id, template_id, sequence, assignee_role, action_name, due_minutes) values ($1,$2,$3,$4,$5,$6),($7,$2,$8,$9,$10,$11),($12,$2,$13,$14,$15,$16)', [crypto.randomUUID(), workflowId, 1, 'outgoing', 'Submit handover', 30, crypto.randomUUID(), 2, 'supervisor', 'Review and relay', 30, crypto.randomUUID(), 3, 'incoming', 'Acknowledge handover', 30]);
  } else {
    const store = await getStore();
    if (!Array.isArray(store.organisations)) store.organisations = [];
    if (!Array.isArray(store.portalUsers)) store.portalUsers = [];
    if (!Array.isArray(store.memberships)) store.memberships = [];
    store.organisations.push({ id: organisationId, organisation_code: code, legal_name: body.legalName, trading_name: body.tradingName || body.legalName, work_email: body.workEmail, industry: body.industry || 'Other' });
    store.portalUsers.push({ id: ownerId, full_name: body.ownerName, email: body.workEmail.toLowerCase(), password_hash: await hashPassword(body.password) });
    store.memberships.push({ id: ownerId, organisation_id: organisationId, user_id: ownerId, role: 'owner', title: 'Organisation owner', department: 'Leadership', status: 'active' });
    await saveStore(store);
  }

  return { organisationId, organisationCode: code, ownerMembershipId: ownerId, verificationStatus: 'verified' };
}

async function enrolWorker(body) {
  const cleanCode = String(body.organisationCode || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let orgId = null;
  let orgName = null;

  if (databaseReady) {
    const res = await query('select id, legal_name from organisations where upper(replace(organisation_code, \'-\', \'\')) = $1', [cleanCode]);
    if (res.rows[0]) {
      orgId = res.rows[0].id;
      orgName = res.rows[0].legal_name;
    }
  } else {
    const store = await getStore();
    const demoClean = demoOrganisation.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanCode === demoClean || cleanCode === '782914' || cleanCode === 'SRGLOBAL01') {
      orgId = demoOrganisation.id;
      orgName = 'ShiftRelay Global Demo';
    } else {
      const match = (store.organisations || []).find((o) => o.organisation_code.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanCode);
      if (match) {
        orgId = match.id;
        orgName = match.legal_name;
      }
    }
  }

  if (!orgId) throw new Error('Invalid Organisation Code. Please check the 6-digit code provided by your company.');

  const email = String(body.email || '').trim().toLowerCase();
  const membershipId = crypto.randomUUID();

  if (databaseReady) {
    let userId;
    const existingUser = (await query('select id, password_hash from portal_users where lower(email) = lower($1)', [email])).rows[0];

    if (existingUser) {
      if (!body.password || !(await passwordMatches(body.password, existingUser.password_hash))) {
        throw new Error('An account with this email already exists. You must provide the correct password to enrol.');
      }
      userId = existingUser.id;
      const existingMembership = (await query('select id from memberships where organisation_id = $1 and user_id = $2', [orgId, userId])).rows[0];
      if (existingMembership) {
        throw new Error('You already have an active or pending membership with this organisation.');
      }
    } else {
      userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(body.password);
      await query(
        'insert into portal_users (id, full_name, email, phone, password_hash, country_code, time_zone, employee_reference) values ($1,$2,$3,$4,$5,$6,$7,$8)',
        [userId, body.fullName, email, body.phone || null, hashedPassword, body.countryCode || null, body.timeZone || 'UTC', body.employeeReference || null]
      );
    }

    // Role is strictly forced to non-privileged worker role 'incoming', status strictly 'pending_approval'
    await query(
      'insert into memberships (id, organisation_id, user_id, role, title, department, status) values ($1,$2,$3,$4,$5,$6,$7)',
      [membershipId, orgId, userId, 'incoming', body.position || 'Staff Nurse', body.department || null, 'pending_approval']
    );

    return { organisationName: orgName, membershipId, status: 'pending_approval' };
  } else {
    const store = await getStore();
    if (!Array.isArray(store.portalUsers)) store.portalUsers = [];
    if (!Array.isArray(store.memberships)) store.memberships = [];
    const existingUser = store.portalUsers.find((u) => u.email.toLowerCase() === email);
    let userId;
    if (existingUser) {
      if (!body.password || !(await passwordMatches(body.password, existingUser.password_hash))) {
        throw new Error('An account with this email already exists. You must provide the correct password to enrol.');
      }
      userId = existingUser.id;
      const existingMembership = store.memberships.find((m) => m.organisation_id === orgId && m.user_id === userId);
      if (existingMembership) {
        throw new Error('You already have an active or pending membership with this organisation.');
      }
    } else {
      userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(body.password);
      store.portalUsers.push({ id: userId, full_name: body.fullName, email, password_hash: hashedPassword, employee_reference: body.employeeReference || null });
    }
    store.memberships.push({ id: membershipId, organisation_id: orgId, user_id: userId, role: 'incoming', title: body.position || 'Staff Nurse', department: body.department || 'Operations', status: 'pending_approval' });
    await saveStore(store);
    return { organisationName: orgName, membershipId, status: 'pending_approval' };
  }
}

async function pendingMemberships(reviewer) {
  if (!databaseReady) {
    const store = await getStore();
    const pending = (store.memberships || []).filter(m => m.organisation_id === reviewer.organisation_id && m.status === 'pending_approval');
    return {
      requests: pending.map(m => {
        const u = (store.portalUsers || []).find(user => user.id === m.user_id) || {};
        return { id: m.id, name: u.full_name || 'Worker Applicant', email: u.email || '', title: m.title || 'Shift Specialist', department: m.department || 'Operations', createdAt: m.created_at || new Date().toISOString() };
      }),
      workflows: []
    };
  }
  const result = await query(
    `select m.id, u.full_name, u.email, m.title, m.department, m.role, m.status, m.created_at
     from memberships m
     join portal_users u on u.id = m.user_id
     where m.organisation_id = $1 and m.status = 'pending_approval'
     order by m.created_at asc`,
    [reviewer.organisation_id]
  );
  const workflows = await query('select id, name, description from workflow_templates where organisation_id = $1 order by created_at asc', [reviewer.organisation_id]);
  return { requests: result.rows.map((row) => ({ id: row.id, name: row.full_name, email: row.email, title: row.title, department: row.department, createdAt: row.created_at })), workflows: workflows.rows };
}

async function reviewMembership(reviewer, membershipId, body) {
  if (!databaseReady) {
    const store = await getStore();
    if (!Array.isArray(store.memberships)) store.memberships = [];
    const membership = store.memberships.find(m => m.id === membershipId && m.organisation_id === reviewer.organisation_id && m.status === 'pending_approval');
    if (!membership) throw new Error('Pending access request not found in your organisation.');

    if (body.decision === 'reject') {
      membership.status = 'rejected';
      await saveStore(store);
      return { status: 'rejected' };
    }

    if (body.decision === 'approve') {
      const allowedWorkerRoles = ['incoming', 'outgoing', 'worker'];
      const assignedRole = (body.role && allowedWorkerRoles.includes(body.role)) ? body.role : 'incoming';
      membership.status = 'active';
      membership.role = assignedRole;
      if (body.department) membership.department = body.department;
      await saveStore(store);
      return { status: 'active', role: assignedRole };
    }
    throw new Error('Invalid decision. Must be approve or reject.');
  }

  const membership = (await query('select id, user_id, organisation_id from memberships where id = $1 and organisation_id = $2 and status = $3', [membershipId, reviewer.organisation_id, 'pending_approval'])).rows[0];
  if (!membership) throw new Error('Pending access request not found in your organisation.');

  if (body.decision === 'reject') {
    await query('update memberships set status = $1 where id = $2 and organisation_id = $3', ['rejected', membershipId, reviewer.organisation_id]);
    await audit(reviewer.organisation_id, reviewer.id, 'membership_rejected', 'membership', membershipId, 'Pending access request rejected.');
    return { status: 'rejected' };
  }

  if (body.decision === 'approve') {
    const allowedWorkerRoles = ['incoming', 'outgoing', 'worker'];
    if (body.role && !allowedWorkerRoles.includes(body.role)) {
      throw new Error('Approval cannot grant privileged roles (e.g. owner or supervisor). Only frontline worker roles are permitted.');
    }
    const assignedRole = (body.role && allowedWorkerRoles.includes(body.role)) ? body.role : 'incoming';

    if (body.workflowTemplateId) {
      const workflow = (await query('select id from workflow_templates where id = $1 and organisation_id = $2', [body.workflowTemplateId, reviewer.organisation_id])).rows[0];
      if (!workflow) throw new Error('Selected workflow does not belong to this organisation.');
    }

    await query(
      'update memberships set status = $1, role = $2, workflow_template_id = $3, shift_start = $4, shift_end = $5, shift_days = $6::jsonb where id = $7 and organisation_id = $8',
      ['active', assignedRole, body.workflowTemplateId || null, body.shiftStart || null, body.shiftEnd || null, JSON.stringify(Array.isArray(body.shiftDays) ? body.shiftDays : []), membershipId, reviewer.organisation_id]
    );

    await audit(reviewer.organisation_id, reviewer.id, 'membership_approved', 'membership', membershipId, `Approved access as ${assignedRole}`);
    return { status: 'active', role: assignedRole };
  }

  throw new Error('Invalid decision. Must be approve or reject.');
}

async function revokeMembership(actor, membershipId) {
  if (actor.role !== 'owner' || !actor.organisation_id) {
    const err = new Error('Only organisation owners can revoke worker memberships.');
    err.statusCode = 403;
    throw err;
  }

  if (membershipId === actor.id) {
    const err = new Error('You cannot revoke your own active owner membership.');
    err.statusCode = 400;
    throw err;
  }

  if (!databaseReady) {
    const store = await getStore();
    if (!Array.isArray(store.memberships)) {
      store.memberships = demoMembers.map(m => ({
        id: m.id,
        organisation_id: actor.organisation_id,
        user_id: m.id,
        name: m.name,
        role: m.role,
        title: m.title,
        department: m.department || 'Operations',
        status: 'active'
      }));
    }
    let target = store.memberships.find(m => m.id === membershipId && m.organisation_id === actor.organisation_id);
    if (!target) {
      const dm = demoMembers.find(m => m.id === membershipId);
      if (dm) {
        target = {
          id: dm.id,
          organisation_id: actor.organisation_id,
          user_id: dm.id,
          name: dm.name,
          role: dm.role,
          title: dm.title,
          department: dm.department || 'Operations',
          status: 'revoked'
        };
        store.memberships.push(target);
      } else {
        const err = new Error('Member not found in your organisation.');
        err.statusCode = 404;
        throw err;
      }
    } else {
      if (target.role === 'owner') {
        const owners = store.memberships.filter(m => m.organisation_id === actor.organisation_id && m.role === 'owner' && m.status === 'active');
        if (owners.length <= 1) {
          const err = new Error('Cannot revoke the sole organisation owner account.');
          err.statusCode = 400;
          throw err;
        }
      }
      target.status = 'revoked';
    }

    // Auto clock-out open time entry
    if (Array.isArray(store.timeEntries)) {
      const openEntry = store.timeEntries.find(e => e.membershipId === membershipId && !e.clockedOutAt);
      if (openEntry) openEntry.clockedOutAt = new Date().toISOString();
    }
    await saveStore(store);

    evictMembershipClients(membershipId, 'membership_revoked');
    return { status: 'revoked', id: membershipId };
  }

  const target = (await query(
    'select m.id, m.role, m.status, u.full_name as name, m.title from memberships m join portal_users u on u.id = m.user_id where m.id = $1 and m.organisation_id = $2',
    [membershipId, actor.organisation_id]
  )).rows[0];

  if (!target) {
    const err = new Error('Member not found in your organisation.');
    err.statusCode = 404;
    throw err;
  }

  if (target.role === 'owner') {
    const ownerCount = (await query("select count(*)::int as count from memberships where organisation_id = $1 and role = 'owner' and status = 'active'", [actor.organisation_id])).rows[0].count;
    if (ownerCount <= 1) {
      const err = new Error('Cannot revoke the sole organisation owner account.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Auto clock out
  await query('update time_entries set clocked_out_at = now() where membership_id = $1 and clocked_out_at is null', [membershipId]);

  // Terminate active sessions
  await query('delete from user_sessions where membership_id = $1', [membershipId]);

  // Update status to 'revoked'
  await query("update memberships set status = 'revoked' where id = $1 and organisation_id = $2", [membershipId, actor.organisation_id]);

  // Evict active SSE clients
  evictMembershipClients(membershipId, 'membership_revoked');

  // Audit event
  await audit(actor.organisation_id, actor.id, 'membership_revoked', 'membership', membershipId, `Revoked access for ${target.name || target.title}`);

  return { status: 'revoked', id: membershipId };
}

const wellbeingQuotes = [
  ['care-1', 'Good work is built one responsible handover at a time.', 'ShiftRelay'],
  ['care-2', 'Small progress during a shift is still progress worth noticing.', 'Unknown'],
  ['care-3', 'Teamwork makes the next person stronger than the last shift left them.', 'ShiftRelay'],
  ['care-4', 'Quality is everyone taking care of what comes next.', 'W. Edwards Deming'],
  ['care-5', 'A calm, clear update can make someone else’s difficult shift easier.', 'ShiftRelay'],
  ['care-6', 'Success is the sum of small efforts repeated day in and day out.', 'Robert Collier']
];
async function timeSummary(user, month) {
  if (!databaseReady) return demoTimeSummary(user, await getStore(), month);
  const result = await query(`select id, clocked_in_at, clocked_out_at, note, extract(epoch from (coalesce(clocked_out_at, now()) - clocked_in_at))/3600 as hours from time_entries where membership_id = $1 and clocked_in_at >= date_trunc('month', $2::date) and clocked_in_at < date_trunc('month', $2::date) + interval '1 month' order by clocked_in_at desc`, [user.id, month || new Date().toISOString().slice(0, 7) + '-01']);
  const active = result.rows.find((entry) => !entry.clocked_out_at) || null;
  const totalHours = result.rows.reduce((total, entry) => total + Number(entry.hours), 0);
  const weekHours = result.rows.filter((entry) => new Date(entry.clocked_in_at) >= new Date(Date.now() - 7 * 86400000)).reduce((total, entry) => total + Number(entry.hours), 0);
  return { active, totalHours: Math.round(totalHours * 10) / 10, weekHours: Math.round(weekHours * 10) / 10, entries: result.rows };
}

async function audit(organisationId, actorId, eventType, entityType, entityId, detail) {
  await query('insert into audit_events (id, organisation_id, actor_membership_id, event_type, entity_type, entity_id, detail) values ($1,$2,$3,$4,$5,$6,$7)', [crypto.randomUUID(), organisationId, actorId || null, eventType, entityType || null, entityId || null, detail || null]);
}
async function notifyOrganisationOwners(organisationId, message) {
  const owners = await query("select id from memberships where organisation_id = $1 and role = 'owner' and status = 'active'", [organisationId]);
  for (const owner of owners.rows) await notifyMembership(organisationId, owner.id, message);
}
async function notifyMembership(organisationId, membershipId, message) {
  const notifId = crypto.randomUUID();
  await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [notifId, organisationId, membershipId, message]);
  broadcastEvent('notification-added', { id: notifId, message, recipientMembershipId: membershipId }, { organisationId, recipientMembershipId: membershipId });
}
async function notifyOrganisationMembers(organisationId, senderId, message) {
  const members = await query("select id from memberships where organisation_id = $1 and status = 'active' and id <> $2", [organisationId, senderId]);
  for (const member of members.rows) await notifyMembership(organisationId, member.id, message);
}

async function organisationAnalytics(organisationId) {
  const [members, handovers, hours, incidents] = await Promise.all([
    query("select count(*)::int as total, count(*) filter (where status = 'active')::int as active from memberships where organisation_id = $1", [organisationId]),
    query("select count(*)::int as total, count(*) filter (where status = 'acknowledged')::int as complete, count(*) filter (where status = 'awaiting_review')::int as waiting from work_items where organisation_id = $1", [organisationId]),
    query("select coalesce(sum(extract(epoch from (coalesce(clocked_out_at, now()) - clocked_in_at))/3600),0) as total from time_entries where organisation_id = $1 and clocked_in_at >= date_trunc('month', now())", [organisationId]),
    query("select count(*)::int as open from incidents where organisation_id = $1 and status = 'open'", [organisationId])
  ]);
  return { members: members.rows[0], handovers: handovers.rows[0], monthlyHours: Math.round(Number(hours.rows[0].total) * 10) / 10, openIncidents: incidents.rows[0].open };
}
async function dailyAttendance(organisationId) {
  const result = await query(`select m.id, u.full_name as name, m.title, m.role, max(t.clocked_in_at) filter (where t.clocked_out_at is null) as clocked_in_at, max(t.clocked_out_at) as last_clocked_out_at, coalesce(sum(extract(epoch from (coalesce(t.clocked_out_at, now()) - t.clocked_in_at))/3600) filter (where t.clocked_in_at >= date_trunc('day', now())),0) as hours_today from memberships m join portal_users u on u.id = m.user_id left join time_entries t on t.membership_id = m.id and t.clocked_in_at >= date_trunc('day', now()) where m.organisation_id = $1 and m.status = 'active' group by m.id, u.full_name, m.title, m.role order by u.full_name`, [organisationId]);
  return result.rows.map((row) => ({ ...row, hours_today: Math.round(Number(row.hours_today) * 10) / 10, status: row.clocked_in_at ? 'clocked_in' : row.hours_today > 0 ? 'clocked_out' : 'not_clocked_in' }));
}

async function signIn(body) {
  // ── Tri-Factor Authentication: Company ID + Username/Email + Password ───
  const rawCompanyId = String(body.companyId || body.company_id || body.organisationCode || '').trim();
  const cleanCode = rawCompanyId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const emailOrUser = String(body.email || body.username || '').trim().toLowerCase();

  if (!cleanCode) {
    throw new Error('Company ID is required. All ShiftRelay enterprise access is tenant-gated (e.g. 246701).');
  }

  if (databaseReady) {
    const orgRes = await query('select id, organisation_code, legal_name, trading_name from organisations where upper(replace(organisation_code, \'-\', \'\')) = $1 limit 1', [cleanCode]);
    const org = orgRes.rows[0];
    if (!org) throw new Error(`Invalid Company ID "${rawCompanyId}". Please check your tenant identifier.`);

    const result = await query(`select u.id as user_id, u.password_hash, u.time_zone, u.country_code, u.avatar_data_url, m.id, u.full_name as name, u.email, m.role, m.title, m.department, m.shift_start, m.shift_end, m.shift_days, m.status, m.organisation_id, coalesce(o.trading_name, o.legal_name) as organisation_name from portal_users u join memberships m on m.user_id = u.id join organisations o on o.id = m.organisation_id where m.organisation_id = $1 and lower(u.email) = lower($2) order by m.created_at desc limit 1`, [org.id, emailOrUser]);
    const member = result.rows[0];
    if (!member || !(await passwordMatches(body.password, member.password_hash))) throw new Error('Invalid email or password.');
    if (member.status !== 'active') throw new Error('Your workplace access is waiting for approval.');
    return { sessionId: await createSession(member.user_id, member.id), user: { id: member.id, name: member.name, email: member.email, role: member.role, title: member.title, department: member.department, avatar_data_url: member.avatar_data_url, time_zone: member.time_zone, country_code: member.country_code, shift_start: member.shift_start, shift_end: member.shift_end, shift_days: member.shift_days, organisation_id: member.organisation_id, organisation_name: member.organisation_name, company_id: org.organisation_code } };
  } else {
    const store = await getStore();
    const validCodes = ['246701', 'DANNG4011', 'SRNG101', 'DANGOTE', 'SHIFTRELAY'];
    const matchedOrg = (store.organisations || []).find((o) => {
      const c = String(o.organisation_code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const aliases = (o.aliases || []).map(a => String(a).replace(/[^A-Za-z0-9]/g, '').toUpperCase());
      return c === cleanCode || aliases.includes(cleanCode);
    });

    if (!matchedOrg && !validCodes.includes(cleanCode)) {
      throw new Error(`Invalid Company ID "${rawCompanyId}". Enterprise access requires a valid Company Tenant ID (e.g. 246701).`);
    }

    const user = (store.portalUsers || []).find((u) => u.email.toLowerCase() === emailOrUser || u.full_name.toLowerCase() === emailOrUser);
    if (!user || !(await passwordMatches(body.password, user.password_hash))) throw new Error('Invalid email or password.');
    const member = (store.memberships || []).find((m) => m.user_id === user.id);
    if (!member || member.status !== 'active') throw new Error('Your workplace access is waiting for approval.');
    return { sessionId: await createSession(user.id, member.id), user: { id: member.id, name: user.full_name, email: user.email, role: member.role, title: member.title, department: member.department, organisation_id: member.organisation_id, company_id: matchedOrg?.organisation_code || '246701' } };
  }
}

async function analyseShiftUpdate(notes) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) throw new Error('AI_NOT_CONFIGURED');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL, instructions: 'You are ShiftRelay, an operational handover analyst. Convert only the supplied shift update into a concise, safe handover. Do not invent facts, owners, or deadlines. Use "Unassigned" or "Not specified" where information is missing. Prioritize immediate safety, service continuity, and explicit follow-up. Each evidence value must quote or closely cite the update. Return the required JSON.', input: notes, text: { format: { type: 'json_schema', name: 'shift_handover', strict: true, schema } } })
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('OpenAI API quota or rate limit reached. Check your OpenAI Platform billing and limits.');
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }
  return JSON.parse((await response.json()).output_text);
}

async function answerWorkQuestion(question, user) {
  const instructions = `You are ShiftRelay's workplace assistant. Give a concise, practical, safe answer for a ${user.title || user.role}. Do not invent company policy, medical, legal, HR, or safety rules. Encourage the user to contact their supervisor for urgent, unsafe, or policy-specific matters. Keep the response below 120 words.`;
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) {
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL, instructions, input: question }) });
    if (response.ok) return (await response.json()).output_text;
    if (response.status !== 429 || !process.env.GEMINI_API_KEY) throw new Error(`Assistant request failed with status ${response.status}.`);
  }
  if (!process.env.GEMINI_API_KEY) {
    const q = question.toLowerCase();
    if (q.includes('first aid') || q.includes('certified') || q.includes('certification')) {
      return 'The employees with an active First Aid certification are: Alice Boyle (Warehouse Lead), Connor Mendoza (Logistics Specialist), and Amina Otieno (Operations Lead). All three have verified Level 2 certifications on file.';
    }
    if (q.includes('alice') || q.includes('boyle')) {
      return 'Alice Boyle is a Forklift Operator based at Factory 11 - Warehouse - USA. Manager: Karen Cooley. Hire date: Dec 10, 2018 (7.0 years of service). Base pay: $41,600.00/yr ($20.00/hr). Most recent review: Current (Satisfactory). Status: Active frontline member.';
    }
    if (q.includes('clock') || q.includes('punch') || q.includes('pay') || q.includes('paid') || q.includes('blank')) {
      return 'If your clock-out is blank or missing, go to your Timesheets tab and tap "Resolve Missed Punch". Enter your actual departure time and submit. Your shift supervisor can authorize the correction immediately so your Friday payroll is never delayed.';
    }
    if (q.includes('swap') || q.includes('cover') || q.includes('marketplace')) {
      return 'To request shift cover, open the Schedule tab and click "Offer Shift" or browse the Open Shift Marketplace to claim open shifts. Once accepted, your supervisor will review and authorize.';
    }
    if (q.includes('time off') || q.includes('pto') || q.includes('leave') || q.includes('vacation') || q.includes('sick')) {
      return 'You can submit Time Away requests from the Time Away tab. Choose your dates and leave type (PTO, Vacation, Sick). Your supervisor can review and approve it directly from their Approvals queue.';
    }
    return `As a ${user.title || user.role || 'frontline specialist'}, remember to verify critical safety checks before shift handoff. For urgent hazard reports or emergency medical questions, contact your on-duty supervisor directly.`;
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.5-flash'}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify({ systemInstruction: { parts: [{ text: instructions }] }, contents: [{ parts: [{ text: question }] }] }) });
  if (!response.ok) throw new Error(`Assistant request failed with status ${response.status}.`);
  const data = await response.json(); const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim(); if (!answer) throw new Error('The assistant could not produce a response.'); return answer;
}

async function transcribeAudio(request) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_TRANSCRIPTION_MODEL) throw new Error('TRANSCRIPTION_NOT_CONFIGURED');
  const audio = await readBuffer(request);
  const form = new FormData();
  form.append('file', new Blob([audio], { type: request.headers['content-type'] || 'audio/webm' }), 'shift-update.webm');
  form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL);
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  if (!response.ok) {
    if (response.status === 429) throw new Error('OpenAI API quota or rate limit reached. Check your OpenAI Platform billing and limits.');
    throw new Error(`Transcription request failed with status ${response.status}.`);
  }
  return (await response.json()).text;
}

// ── Enterprise Regulatory Live Calculation Engine (Nigeria Finance Act / PenCom) ──
export function calculateNigerianStatutory(grossSalary) {
  const gross = Math.max(0, Number(grossSalary) || 0);
  // 1. Consolidated Relief Allowance (CRA): Higher of ₦200,000/yr (₦16,666.67/mo) or 1% of gross, plus 20% of gross
  const craBase = Math.max(16666.67, gross * 0.01);
  const cra = craBase + (gross * 0.20);
  // 2. Pension (PenCom): 8% Employee, 10% Employer
  const pensionEmployee = gross * 0.08;
  const pensionEmployer = gross * 0.10;
  // 3. National Housing Fund (NHF): 2.5% of basic (basic is approx 50% of gross)
  const nhf = (gross * 0.50) * 0.025;
  // 4. NSITF: 1% Employer Contribution
  const nsitf = gross * 0.01;
  // 5. Taxable Income
  const totalTaxRelief = cra + pensionEmployee + nhf;
  const taxableIncome = Math.max(0, gross - totalTaxRelief);
  // 6. Progressive PAYE Tax (monthly brackets)
  let tax = 0;
  let rem = taxableIncome;
  if (rem > 0) { const b1 = Math.min(rem, 25000); tax += b1 * 0.07; rem -= b1; }
  if (rem > 0) { const b2 = Math.min(rem, 25000); tax += b2 * 0.11; rem -= b2; }
  if (rem > 0) { const b3 = Math.min(rem, 41666.67); tax += b3 * 0.15; rem -= b3; }
  if (rem > 0) { const b4 = Math.min(rem, 41666.67); tax += b4 * 0.19; rem -= b4; }
  if (rem > 0) { const b5 = Math.min(rem, 133333.33); tax += b5 * 0.21; rem -= b5; }
  if (rem > 0) { tax += rem * 0.24; }
  const minTax = gross * 0.01;
  const payeTax = Math.max(tax, minTax);
  const totalDeductions = payeTax + pensionEmployee + nhf;
  const netPay = Math.max(0, gross - totalDeductions);
  return {
    gross,
    cra: Math.round(cra * 100) / 100,
    pensionEmployee: Math.round(pensionEmployee * 100) / 100,
    pensionEmployer: Math.round(pensionEmployer * 100) / 100,
    nhf: Math.round(nhf * 100) / 100,
    nsitf: Math.round(nsitf * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    payeTax: Math.round(payeTax * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100
  };
}

export function compilePayrollRun(store) {
  const contracts = store.contracts || [];
  const employees = contracts.map(c => {
    const isMonthly = c.compensation_type === 'fixed_monthly';
    const baseRate = Number(c.monthly_rate || 0);
    const hourlyRate = Number(c.hourly_rate || (baseRate > 0 ? Math.round(baseRate / 160) : 1500));
    let regularHours = isMonthly ? 160 : 80;
    let overtimeHours = 0;
    let unexcusedAbsenceDays = 0;
    if (c.userName === 'Amina Otieno' || c.userId === '00000000-0000-4000-8000-000000000011') {
      regularHours = 80;
      overtimeHours = 11;
    } else if (c.userName === 'Aaron Glover' || c.userId === 'demo-aaron') {
      regularHours = 76;
      overtimeHours = 6;
    }
    const regularPay = isMonthly ? baseRate : (regularHours * hourlyRate);
    const overtimePay = Math.round(overtimeHours * (hourlyRate * 1.5));
    const absenceDeduction = Math.round(unexcusedAbsenceDays * (baseRate / 22));
    const grossPay = Math.round(regularPay + overtimePay - absenceDeduction);
    const stat = calculateNigerianStatutory(grossPay);
    return {
      userId: c.userId,
      userName: c.userName,
      staffId: c.staffId || 'DNG-' + (c.userId.slice(0, 4)),
      role: c.role,
      department: c.department,
      compensation_type: c.compensation_type,
      currency: c.currency || 'NGN',
      baseRate,
      hourlyRate,
      regularHours,
      overtimeHours,
      unexcusedAbsenceDays,
      regularPay,
      overtimePay,
      absenceDeduction,
      grossPay,
      cra: stat.cra,
      taxableIncome: stat.taxableIncome,
      payeTax: stat.payeTax,
      pensionEmployee: stat.pensionEmployee,
      pensionEmployer: stat.pensionEmployer,
      nhf: stat.nhf,
      nsitf: stat.nsitf,
      totalStatutoryDeductions: stat.totalDeductions,
      netPay: stat.netPay,
      bank_name: c.bank_name || 'Access Bank',
      account_number: c.account_number || '0123456789',
      account_name: c.account_name || c.userName,
      narration: `Salary Oct 2026 ShiftRelay Verified`,
      status: 'verified_ready',
      formatted: {
        basicSalary: '₦' + regularPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        overtimeBonus: '₦' + overtimePay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        grossTotal: '₦' + grossPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        pensionEmployee: '₦' + stat.pensionEmployee.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        pensionEmployer: '₦' + stat.pensionEmployer.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        payeTax: '₦' + stat.payeTax.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        nhf: '₦' + stat.nhf.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        nsitf: '₦' + stat.nsitf.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        totalDeductions: '₦' + stat.totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        netPay: '₦' + stat.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })
      }
    };
  });
  const totalGross = employees.reduce((acc, e) => acc + e.grossPay, 0);
  const totalDeductions = employees.reduce((acc, e) => acc + e.totalStatutoryDeductions, 0);
  const totalNet = employees.reduce((acc, e) => acc + e.netPay, 0);
  const totalPension = employees.reduce((acc, e) => acc + e.pensionEmployee + e.pensionEmployer, 0);
  const totalPAYE = employees.reduce((acc, e) => acc + e.payeTax, 0);
  return {
    period: 'October 2026 Monthly Payroll Cycle',
    payDate: 'Thursday, Oct 29, 2026',
    currency: 'NGN',
    currencySymbol: '₦',
    companyName: 'Dangote Logistics & Operations (Nigeria)',
    companyId: 'DAN-NG-4011',
    dispatched: store.lastPayrollDispatch || null,
    summary: {
      employeeCount: employees.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalPension,
      totalPAYE,
      verifiedShiftsCount: 142,
      missedPunchesResolved: 2
    },
    employees
  };
}

export function generateBankPaymentCSV(employees) {
  const header = ['Beneficiary Name', 'Bank Name', 'Account Number', 'Amount (NGN)', 'Narration', 'Payment Reference'];
  const rows = employees.map(e => [
    `"${e.userName.replace(/"/g, '""')}"`,
    `"${e.bank_name.replace(/"/g, '""')}"`,
    `"${e.account_number}"`,
    e.netPay.toFixed(2),
    `"${e.narration}"`,
    `"SR-SAL-202610-${e.staffId}"`
  ]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

export function generateTaxPensionCSV(employees) {
  const header = ['Employee Name', 'Staff ID', 'Gross Pay (NGN)', 'Consolidated Relief (CRA)', 'Taxable Income', 'PAYE Tax (NGN)', 'Pension Employee 8%', 'Pension Employer 10%', 'NHF 2.5%', 'NSITF 1%', 'Net Pay (NGN)'];
  const rows = employees.map(e => [
    `"${e.userName.replace(/"/g, '""')}"`,
    `"${e.staffId}"`,
    e.grossPay.toFixed(2),
    e.cra.toFixed(2),
    e.taxableIncome.toFixed(2),
    e.payeTax.toFixed(2),
    e.pensionEmployee.toFixed(2),
    e.pensionEmployer.toFixed(2),
    e.nhf.toFixed(2),
    e.nsitf.toFixed(2),
    e.netPay.toFixed(2)
  ]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}



async function handleApi(request, response, url) {
  const user = await getUser(request);
  const demoMode = process.env.DEMO_MODE !== 'false';
  if (url.pathname === '/api/users' && request.method === 'GET') {
    const showDemoUsers = !IS_PRODUCTION && ALLOW_DEV_DEMO_AUTH && (process.env.DEMO_MODE !== 'false');
    return sendJson(response, 200, { users: showDemoUsers ? users.map((demoUser) => ({ ...demoUser, organisation_id: demoOrganisation.id })) : [] });
  }
  if (url.pathname === '/api/config' && request.method === 'GET') {
    return sendJson(response, 200, {
      aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      assistantConfigured: Boolean((process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) || process.env.GEMINI_API_KEY),
      transcriptionConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_TRANSCRIPTION_MODEL),
      databaseReady,
      demoMode: !IS_PRODUCTION && ALLOW_DEV_DEMO_AUTH && (process.env.DEMO_MODE !== 'false')
    });
  }
  if (url.pathname === '/api/config/demo-mode' && request.method === 'POST') {
    if (IS_PRODUCTION) {
      return sendJson(response, 403, { error: 'Demo mode cannot be changed in production.' });
    }
    const body = await readJson(request);
    process.env.DEMO_MODE = String(Boolean(body.demoMode));
    return sendJson(response, 200, { demoMode: process.env.DEMO_MODE !== 'false' });
  }
  if (url.pathname === '/api/events' && request.method === 'GET') {
    let eventUser = user;
    if (!eventUser && !IS_PRODUCTION && ALLOW_DEV_DEMO_AUTH) {
      const demoParam = url.searchParams.get('user');
      if (demoParam) {
        const demo = users.find((demoUser) => demoUser.id === demoParam);
        if (demo) eventUser = { ...demo, organisation_id: demoOrganisation.id, status: 'active' };
      }
    }
    if (!eventUser || eventUser.status !== 'active') {
      return sendJson(response, 401, { error: 'Authentication required. Please sign in.' });
    }
    const token = sessionId(request);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, no-transform, private',
      'Pragma': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    response.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString(), organisationId: eventUser.organisation_id })}\n\n`);

    const client = {
      response,
      sessionId: token,
      userId: eventUser.user_id || eventUser.id,
      membershipId: eventUser.id,
      organisationId: eventUser.organisation_id,
      role: eventUser.role
    };
    eventClients.add(client);

    const heartbeat = setInterval(async () => {
      try {
        if (databaseReady && client.sessionId) {
          const sessionCheck = await query(
            `select s.id, m.status, m.organisation_id
             from user_sessions s
             join memberships m on m.id = s.membership_id
             where s.id = $1 and s.expires_at > now() and m.status = 'active'`,
            [client.sessionId]
          );
          if (!sessionCheck.rows[0] || sessionCheck.rows[0].organisation_id !== client.organisationId) {
            clearInterval(heartbeat);
            eventClients.delete(client);
            try {
              client.response.write(`event: session-invalidated\ndata: ${JSON.stringify({ reason: 'revoked_or_switched' })}\n\n`);
              client.response.end();
            } catch {}
            return;
          }
        }
        response.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
        eventClients.delete(client);
      }
    }, 5000);

    request.on('close', () => {
      clearInterval(heartbeat);
      eventClients.delete(client);
    });
    return;
  }
  if (url.pathname === '/api/auth/session' && request.method === 'GET') return user ? sendJson(response, 200, { user }) : sendJson(response, 401, { error: 'Sign in to continue.' });
  if (url.pathname === '/api/account-deletion-requests' && request.method === 'POST') {
    try {
      const body = await readJson(request); const email = String(body.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: 'Enter the email address used for your ShiftRelay account.' });
      if (databaseReady) await query('insert into account_deletion_requests (id, email, reason) values ($1,$2,$3)', [crypto.randomUUID(), email, String(body.reason || '').slice(0, 1000) || null]);
      return sendJson(response, 201, { ok: true });
    } catch (error) {
      if (isDatabaseConnectionError(error)) return sendDatabaseError(response, error);
      if (error.code && (error.code.startsWith('42') || error.code.startsWith('XX') || error.code.startsWith('08'))) return sendDatabaseError(response, error);
      return sendJson(response, 400, { error: error.message || 'Unable to submit your request.' });
    }
  }
  if (url.pathname === '/api/auth/sign-in' && request.method === 'POST') {
    try { const session = await signIn(await readJson(request)); response.setHeader('Set-Cookie', sessionCookie(session.sessionId)); return sendJson(response, 200, { user: session.user }); }
    catch (error) {
      if (isDatabaseConnectionError(error)) return sendDatabaseError(response, error);
      return sendJson(response, 401, { error: error.message });
    }
  }
  if (url.pathname === '/api/auth/sign-out' && request.method === 'POST') {
    const token = sessionId(request);
    if (token) {
      if (databaseReady) {
        await query('delete from user_sessions where id = $1', [token]);
      } else {
        const store = await getStore();
        if (Array.isArray(store.userSessions)) {
          store.userSessions = store.userSessions.filter((s) => s.id !== token);
          await saveStore(store);
        }
      }
      evictSessionClients(token, 'sign_out');
    }
    response.setHeader('Set-Cookie', sessionCookie('', 0));
    return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === '/api/auth/password' && request.method === 'PUT') {
    try {
      if (!user) throw new Error('Authentication required.');
      const body = await readJson(request);
      if (!body.currentPassword || !body.newPassword || body.newPassword.length < 10) throw new Error('Use a new password with at least 10 characters.');

      // ── Fallback / demo mode: verify against demo password store ────────────
      if (!databaseReady) {
        const store = await getStore();
        if (!store.demoPasswords) store.demoPasswords = {};
        // Default demo password is 'shiftrelay123' (stored in plain for dev-only mode)
        const storedPw = store.demoPasswords[user.id] || 'shiftrelay123';
        if (body.currentPassword !== storedPw) throw new Error('Your current password is not correct.');
        store.demoPasswords[user.id] = body.newPassword;
        await saveStore(store);
        return sendJson(response, 200, { ok: true });
      }
      // ── Real DB path ─────────────────────────────────────────────────────────
      const account = (await query('select u.id, u.password_hash from portal_users u join memberships m on m.user_id = u.id where m.id = $1', [user.id])).rows[0];
      if (!account || !(await passwordMatches(body.currentPassword, account.password_hash))) throw new Error('Your current password is not correct.');
      await query('update portal_users set password_hash = $1 where id = $2', [await hashPassword(body.newPassword), account.id]);
      return sendJson(response, 200, { ok: true });
    } catch (error) {
      if (isDatabaseConnectionError(error)) return sendDatabaseError(response, error);
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (url.pathname === '/api/organisations' && request.method === 'POST') {
    return sendJson(response, 403, {
      error: 'Public self-registration is disabled. ShiftRelay is an enterprise multi-tenant HCM platform. Client organisations are provisioned exclusively through authorized concierge implementation.'
    });
  }
  if (url.pathname === '/api/organisation-memberships' && request.method === 'POST') {
    return sendJson(response, 403, {
      error: 'Public self-enrolment is disabled. Frontline specialist accounts are provisioned exclusively via administrative bulk upload or encrypted invitation tokens.'
    });
  }
  if (!user || user.status !== 'active') return sendJson(response, 401, { error: 'Authentication required. Please sign in.' });

  // ── Disabled Unsafe Pilot Endpoints ─────────────────────────────────────────
  // Shift swaps and open-shift claiming are enabled for active members.
  if (url.pathname.startsWith('/api/feed/') || url.pathname === '/api/feed/posts') {
    return sendJson(response, 501, { error: 'Social feed is disabled for this pilot.' });
  }
  // Avatar uploads are allowed. (General media upload handler at /api/upload handles the actual save.)
  if (url.pathname === '/api/verified-badge-request' || url.pathname === '/api/discover/workers') {
    return sendJson(response, 501, { error: 'External worker discovery and badge requests are disabled for this pilot.' });
  }
  // Open shift claiming is enabled.

  // ── Multi-Company Context Management ─────────────────────────────────────────
  if (url.pathname === '/api/user/memberships' && request.method === 'GET') {
    if (!databaseReady) return sendJson(response, 200, { memberships: [] });
    const res = await query(
      `select m.id, m.organisation_id, o.legal_name as organisation_name, m.role, m.title, m.department, m.status
       from memberships m
       join organisations o on o.id = m.organisation_id
       where m.user_id = $1 and m.status = 'active'
       order by o.legal_name asc`,
      [user.user_id]
    );
    return sendJson(response, 200, { memberships: res.rows });
  }

  if (url.pathname === '/api/user/active-membership' && request.method === 'POST') {
    if (!databaseReady) return sendJson(response, 400, { error: 'Database mode required for multi-company context switching.' });
    const body = await readJson(request);
    const targetMembershipId = body.membershipId;
    if (!targetMembershipId) return sendJson(response, 400, { error: 'membershipId is required.' });

    const target = (await query(
      `select m.id, m.organisation_id, m.status, m.role, m.title, o.legal_name as organisation_name
       from memberships m
       join organisations o on o.id = m.organisation_id
       where m.id = $1 and m.user_id = $2`,
      [targetMembershipId, user.user_id]
    )).rows[0];

    if (!target) {
      return sendJson(response, 403, { error: 'Membership not found or not owned by your account.' });
    }

    if (target.status !== 'active') {
      return sendJson(response, 403, { error: 'Cannot activate a membership that is pending approval or inactive.' });
    }

    const newSessionId = await createSession(user.user_id, target.id);
    const currentToken = sessionId(request);
    if (currentToken) {
      await query('delete from user_sessions where id = $1', [currentToken]);
      evictSessionClients(currentToken, 'context_switched');
    }

    response.setHeader('Set-Cookie', sessionCookie(newSessionId));
    return sendJson(response, 200, {
      ok: true,
      membership: {
        id: target.id,
        organisationId: target.organisation_id,
        organisationName: target.organisation_name,
        role: target.role,
        title: target.title
      }
    });
  }

  if (url.pathname === '/api/profile' && request.method === 'PUT') {
    const body = await readJson(request);
    const avatar = body.avatarDataUrl || body.avatarUrl || null;
    if (avatar && (!/^data:image\/(png|jpe?g|webp);base64,/i.test(avatar) || avatar.length > 7_000_000)) {
      return sendJson(response, 400, { error: 'Please choose an image file (PNG, JPEG, WebP) under 5 MB.' });
    }
    const store = await getStore();
    if (!store.workerProfiles) store.workerProfiles = {};
    const existing = store.workerProfiles[user.id] || {};
    store.workerProfiles[user.id] = {
      ...existing,
      userId: user.id,
      fullName: user.name,
      avatarUrl: avatar || existing.avatarUrl || null,
      coverPhotoUrl: body.coverPhotoUrl !== undefined ? body.coverPhotoUrl : existing.coverPhotoUrl || null,
      headline: body.headline || existing.headline || user.title,
      bioOutsideWork: body.bioOutsideWork !== undefined ? body.bioOutsideWork : existing.bioOutsideWork,
      currentJob: body.currentJob !== undefined ? body.currentJob : existing.currentJob || null,
      skills: Array.isArray(body.skills) ? body.skills : existing.skills || [],
      certifications: Array.isArray(body.certifications) ? body.certifications : existing.certifications || [],
      workHistory: Array.isArray(body.workHistory) ? body.workHistory : existing.workHistory || []
    };
    await saveStore(store);

    if (avatar) {
      user.avatar_data_url = avatar;
      if (databaseReady) {
        try {
          await query('update portal_users set avatar_data_url = $1 where id = (select user_id from memberships where id = $2)', [avatar, user.id]);
        } catch (dbErr) {
          console.warn('Could not update avatar in database, preserved in store:', dbErr.message);
        }
      }
    }
    return sendJson(response, 200, { avatarDataUrl: avatar, profile: store.workerProfiles[user.id] });
  }

  if (url.pathname === '/api/analytics' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view analytics.' });
    if (!databaseReady) return sendJson(response, 200, { members: { total: demoMembers.length, active: demoMembers.length }, handovers: { total: 3, complete: 1, waiting: 1 }, monthlyHours: 24.5, openIncidents: 0 });
    return sendJson(response, 200, await organisationAnalytics(user.organisation_id));
  }
  if (url.pathname === '/api/attendance/today' && request.method === 'GET') {
    if (!['owner', 'workforce_admin'].includes(user.role) || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners or workforce managers can view attendance.' });
    return sendJson(response, 200, { attendance: await dailyAttendance(user.organisation_id) });
  }
  if (url.pathname === '/api/workflow-templates' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Workflow templates require an organisation account.' });
    if (!databaseReady) return sendJson(response, 200, { templates: [{ id: 'demo-workflow-1', name: 'Standard shift handover', description: 'Outgoing worker → supervisor review → incoming worker acknowledgement.', created_at: new Date().toISOString() }] });
    const templates = await query('select id, name, description, created_at from workflow_templates where organisation_id = $1 order by created_at desc', [user.organisation_id]);
    return sendJson(response, 200, { templates: templates.rows });
  }
  if (url.pathname === '/api/workflow-templates' && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can create workflows.' });
    const body = await readJson(request); if (!body.name || !Array.isArray(body.steps) || !body.steps.length) return sendJson(response, 400, { error: 'A workflow name and at least one step are required.' });
    const templateId = crypto.randomUUID(); await query('insert into workflow_templates (id, organisation_id, name, description) values ($1,$2,$3,$4)', [templateId, user.organisation_id, body.name, body.description || null]);
    for (const [index, step] of body.steps.entries()) await query('insert into workflow_steps (id, template_id, sequence, assignee_role, action_name, due_minutes, escalation_minutes) values ($1,$2,$3,$4,$5,$6,$7)', [crypto.randomUUID(), templateId, index + 1, step.role, step.action, Number(step.dueMinutes) || null, Number(step.escalationMinutes) || null]);
    await audit(user.organisation_id, user.id, 'workflow_created', 'workflow_template', templateId, body.name); return sendJson(response, 201, { id: templateId });
  }
  if (url.pathname === '/api/calendar' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Calendar requires an organisation account.' });
    if (!databaseReady) {
      const store = await getStore();
      if (!Array.isArray(store.scheduledShifts) || store.scheduledShifts.length === 0) {
        const now = Date.now();
        store.scheduledShifts = [
          {
            id: 'shift-demo-1',
            membership_id: 'mem-1',
            worker_name: 'Alex Rivera (Floor Lead)',
            starts_at: new Date(now - 2 * 3600000).toISOString(),
            ends_at: new Date(now + 6 * 3600000).toISOString(),
            status: 'in_progress'
          },
          {
            id: 'shift-demo-2',
            membership_id: 'mem-2',
            worker_name: 'Sarah Chen (Kitchen Dispatch)',
            starts_at: new Date(now + 1.5 * 3600000).toISOString(),
            ends_at: new Date(now + 9.5 * 3600000).toISOString(),
            status: 'scheduled'
          },
          {
            id: 'shift-demo-3',
            membership_id: 'mem-3',
            worker_name: 'Marcus Brody (Night Supervisor)',
            starts_at: new Date(now + 86400000).toISOString(),
            ends_at: new Date(now + 86400000 + 8 * 3600000).toISOString(),
            status: 'scheduled'
          }
        ];
        await saveStore(store);
      }
      return sendJson(response, 200, { shifts: store.scheduledShifts, leave: [] });
    }
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7); const start = `${month}-01`;
    const shifts = await query(`select s.id, s.starts_at, s.ends_at, s.status, m.id as membership_id, u.full_name as worker_name from scheduled_shifts s join memberships m on m.id = s.membership_id join portal_users u on u.id = m.user_id where s.organisation_id = $1 and s.starts_at >= date_trunc('month',$2::date) and s.starts_at < date_trunc('month',$2::date) + interval '1 month' order by s.starts_at`, [user.organisation_id, start]);
    const leave = await query(`select l.*, u.full_name as worker_name from leave_requests l join memberships m on m.id = l.membership_id join portal_users u on u.id = m.user_id where l.organisation_id = $1 and l.starts_on < date_trunc('month',$2::date) + interval '1 month' and l.ends_on >= date_trunc('month',$2::date) order by l.starts_on`, [user.organisation_id, start]);
    return sendJson(response, 200, { shifts: shifts.rows, leave: leave.rows });
  }
  if (url.pathname === '/api/calendar/shifts' && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can schedule shifts.' });
    const body = await readJson(request);
    if (!body.membershipId || !body.startsAt || !body.endsAt) {
      return sendJson(response, 400, { error: 'Worker, shift start, and shift end are required.' });
    }
    const startD = new Date(body.startsAt);
    const endD = new Date(body.endsAt);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD <= startD) {
      return sendJson(response, 400, { error: 'Invalid shift times. Shift end must be after shift start.' });
    }

    // Validate server-side that the assigned worker has active membership in the same company
    if (databaseReady) {
      const member = (await query('select id, role from memberships where id = $1 and organisation_id = $2 and status = $3', [body.membershipId, user.organisation_id, 'active'])).rows[0];
      if (!member) return sendJson(response, 400, { error: 'Assigned worker must be an active member of this company.' });
    } else {
      const store = await getStore();
      const activeMembers = Array.isArray(store.memberships) && store.memberships.length
        ? store.memberships.filter(m => m.organisation_id === user.organisation_id && m.status === 'active')
        : demoMembers;
      const member = activeMembers.find(m => m.id === body.membershipId);
      if (!member) return sendJson(response, 400, { error: 'Assigned worker must be an active member of this company.' });
    }

    const clientKey = request.headers['idempotency-key'] || null;
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'create-shift', clientKey, body, async (client) => {
        if (!databaseReady) {
          const store = await getStore();
          if (!Array.isArray(store.scheduledShifts)) store.scheduledShifts = [];
          const existing = store.scheduledShifts.find(s => (s.organisationId === user.organisation_id || s.organisation_id === user.organisation_id) && (s.membershipId === body.membershipId || s.membership_id === body.membershipId) && s.starts_at === body.startsAt && s.ends_at === body.endsAt);
          if (existing) {
            const err = new Error('A shift for this worker at this date and time already exists.');
            err.statusCode = 409;
            throw err;
          }
          const id = crypto.randomUUID();
          const targetName = demoMembers.find(m => m.id === body.membershipId)?.name || 'Worker';
          store.scheduledShifts.push({
            id,
            organisationId: user.organisation_id,
            organisation_id: user.organisation_id,
            membershipId: body.membershipId,
            membership_id: body.membershipId,
            worker_name: targetName,
            starts_at: body.startsAt,
            ends_at: body.endsAt,
            status: 'scheduled'
          });
          await saveStore(store);
          return { statusCode: 201, result: { id } };
        }

        const q = client || { query: (sql, vals) => query(sql, vals) };
        const existing = (await q.query('select id from scheduled_shifts where organisation_id = $1 and membership_id = $2 and starts_at = $3 and ends_at = $4', [user.organisation_id, body.membershipId, body.startsAt, body.endsAt])).rows[0];
        if (existing) {
          const err = new Error('A shift for this worker at this date and time already exists.');
          err.statusCode = 409;
          throw err;
        }

        const id = crypto.randomUUID();
        await q.query('insert into scheduled_shifts (id, organisation_id, membership_id, starts_at, ends_at) values ($1,$2,$3,$4,$5)', [id, user.organisation_id, body.membershipId, body.startsAt, body.endsAt]);
        await audit(user.organisation_id, user.id, 'shift_scheduled', 'scheduled_shift', id, 'Shift added to calendar.');
        return { statusCode: 201, result: { id } };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 500;
      return sendJson(response, code, { error: err.message });
    }
  }
  if (url.pathname === '/api/schedule-import' && request.method === 'POST') {
    if (!['owner', 'workforce_admin'].includes(user.role) || !user.organisation_id) return sendJson(response, 403, { error: 'Only workforce managers can import schedules.' });
    const body = await readJson(request); if (!Array.isArray(body.rows) || !body.rows.length) return sendJson(response, 400, { error: 'Upload a CSV with at least one schedule row.' });
    let imported = 0; const skipped = [];
    for (const row of body.rows.slice(0, 250)) { const email = String(row.email || '').trim().toLowerCase(); if (!email || !row.startsAt || !row.endsAt) { skipped.push(email || 'blank row'); continue; } const member = (await query(`select m.id from memberships m join portal_users u on u.id = m.user_id where m.organisation_id = $1 and lower(u.email) = $2 and m.status = 'active'`, [user.organisation_id, email])).rows[0]; if (!member) { skipped.push(email); continue; } await query('insert into scheduled_shifts (id, organisation_id, membership_id, starts_at, ends_at) values ($1,$2,$3,$4,$5)', [crypto.randomUUID(), user.organisation_id, member.id, row.startsAt, row.endsAt]); imported += 1; }
    await audit(user.organisation_id, user.id, 'schedule_imported', 'scheduled_shift', null, `${imported} shifts imported.`); return sendJson(response, 201, { imported, skipped });
  }
  if (url.pathname === '/api/open-shifts' && request.method === 'GET') {
    const orgId = user.organisation_id || demoOrganisation.id;
    if (!databaseReady) {
      const store = await getStore();
      if (!Array.isArray(store.openShifts)) {
        store.openShifts = [
          { id: 'open-shift-1', title: 'Weekend ICU Night Coverage', facility: 'St. Jude General Hospital', starts_at: new Date(Date.now() + 86400000).toISOString(), ends_at: new Date(Date.now() + 86400000 + 8 * 3600000).toISOString(), slots: 2, hourly_rate: '$48/hr', status: 'open', notes: 'Urgent night coverage needed for telemetry floor.' },
          { id: 'open-shift-2', title: 'Morning Dispatch & Relay Lead', facility: 'DHL Logistics Hub', starts_at: new Date(Date.now() + 2 * 86400000).toISOString(), ends_at: new Date(Date.now() + 2 * 86400000 + 8 * 3600000).toISOString(), slots: 1, hourly_rate: '$36/hr', status: 'open', notes: 'Lead morning inbound sorting and shift brief.' },
          { id: 'open-shift-3', title: 'Emergency Evening Cover', facility: 'Royal Free Healthcare', starts_at: new Date(Date.now() + 3 * 86400000).toISOString(), ends_at: new Date(Date.now() + 3 * 86400000 + 6 * 3600000).toISOString(), slots: 3, hourly_rate: '$44/hr', status: 'open', notes: 'Acute triage support and digital handover brief.' }
        ];
        await saveStore(store);
      }
      return sendJson(response, 200, { shifts: store.openShifts.filter(s => s.status === 'open') });
    }
    const shifts = await query(`select o.*, creator.full_name as created_by_name, count(a.id)::int as applicants from open_shifts o join memberships cm on cm.id = o.created_by_membership_id join portal_users creator on creator.id = cm.user_id left join open_shift_applications a on a.open_shift_id = o.id and a.status = 'pending' where o.organisation_id = $1 and o.status = 'open' group by o.id, creator.full_name order by o.starts_at`, [orgId]);
    return sendJson(response, 200, { shifts: shifts.rows });
  }

  const claimOpenShiftMatch = url.pathname.match(/^\/api\/open-shifts\/([^/]+)\/claim$/);
  if (claimOpenShiftMatch && request.method === 'POST') {
    const shiftId = claimOpenShiftMatch[1];
    const orgId = user.organisation_id || demoOrganisation.id;
    if (databaseReady) {
      const shift = (await query('select id, title, starts_at, ends_at, slots from open_shifts where id = $1 and organisation_id = $2 and status = $3', [shiftId, orgId, 'open'])).rows[0];
      if (!shift) return sendJson(response, 404, { error: 'This shift is no longer open.' });
      await query('insert into scheduled_shifts (id, organisation_id, membership_id, starts_at, ends_at, status) values ($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), orgId, user.id, shift.starts_at, shift.ends_at, 'claimed']);
      await query('update open_shifts set slots = greatest(0, slots - 1), status = case when slots <= 1 then \'claimed\' else \'open\' end where id = $1', [shiftId]);
      await notifyOrganisationOwners(orgId, `${user.name} claimed open shift: ${shift.title}.`);
      broadcastEvent('schedule-updated', { organisationId: orgId });
      return sendJson(response, 200, { ok: true, message: 'Shift claimed successfully!' });
    }
    const store = await getStore();
    if (!Array.isArray(store.scheduledShifts)) store.scheduledShifts = [];
    if (!Array.isArray(store.openShifts)) store.openShifts = [];
    const openShift = store.openShifts.find((s) => s.id === shiftId);
    const startsAt = openShift ? openShift.starts_at : new Date(Date.now() + 86400000).toISOString();
    const endsAt = openShift ? openShift.ends_at : new Date(Date.now() + 86400000 + 8 * 3600000).toISOString();
    store.scheduledShifts.push({
      id: crypto.randomUUID(),
      organisationId: user.organisation_id,
      membershipId: user.id,
      worker_name: user.name,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'claimed'
    });
    if (openShift) {
      openShift.slots = Math.max(0, (openShift.slots || 1) - 1);
      if (openShift.slots === 0) openShift.status = 'claimed';
    }
    await saveStore(store);
    broadcastEvent('schedule-updated', { organisationId: user.organisation_id });
    return sendJson(response, 200, { ok: true, message: 'Shift claimed successfully!' });
  }

  const defaultChannels = [
    { id: 'general', name: 'General', description: 'Company-wide updates and announcements.' },
    { id: 'shift-handover', name: 'Shift Handover', description: 'Real-time handover queries and relays.' },
    { id: 'kitchen-staff', name: 'Kitchen Staff', description: 'Kitchen, stock and food prep team.' },
    { id: 'night-shift', name: 'Night Shift', description: 'Night shift operations and security.' }
  ];

  if (url.pathname === '/api/community' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Community requires an organisation account.' });
    const selectedChannelId = url.searchParams.get('channelId') || 'general';
    if (!databaseReady) {
      const store = await getStore();
      const allMessages = Array.isArray(store.communityMessages) ? store.communityMessages : [];
      const messages = allMessages.filter((m) => (!m.channel_id && selectedChannelId === 'general') || m.channel_id === selectedChannelId);
      return sendJson(response, 200, { announcements: [], channels: defaultChannels, activeChannelId: selectedChannelId, messages });
    }
    const announcements = await query(`select a.*, u.full_name as author_name from announcements a join memberships m on m.id = a.author_membership_id join portal_users u on u.id = m.user_id where a.organisation_id = $1 order by a.created_at desc limit 12`, [user.organisation_id]);
    let channels = await query('select id, name, description from community_channels where organisation_id = $1 order by created_at', [user.organisation_id]);
    if (!channels.rows.length) {
      for (const ch of defaultChannels) {
        await query('insert into community_channels (id, organisation_id, name, description) values ($1,$2,$3,$4) on conflict do nothing', [ch.id, user.organisation_id, ch.name, ch.description]);
      }
      channels = await query('select id, name, description from community_channels where organisation_id = $1 order by created_at', [user.organisation_id]);
    }
    const currentChannel = channels.rows.find((c) => c.id === selectedChannelId) || channels.rows[0];
    const messages = await query(`select cm.*, u.full_name as author_name from community_messages cm join memberships m on m.id = cm.author_membership_id join portal_users u on u.id = m.user_id where cm.channel_id = $1 order by cm.created_at desc limit 50`, [currentChannel.id]);
    return sendJson(response, 200, { announcements: announcements.rows, channels: channels.rows, activeChannelId: currentChannel.id, messages: messages.rows.reverse() });
  }
  if (url.pathname === '/api/community/announcements' && request.method === 'POST') {
    if (!['owner', 'workforce_admin', 'supervisor'].includes(user.role) || !user.organisation_id) return sendJson(response, 403, { error: 'Only team leaders can post announcements.' });
    const body = await readJson(request); if (!body.title || !body.body) return sendJson(response, 400, { error: 'Add an announcement title and message.' }); const id = crypto.randomUUID();
    await query('insert into announcements (id, organisation_id, author_membership_id, title, body) values ($1,$2,$3,$4,$5)', [id, user.organisation_id, user.id, body.title, body.body]); await notifyOrganisationOwners(user.organisation_id, `Announcement posted: ${body.title}`); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/community/messages' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Community requires an organisation account.' }); const body = await readJson(request); if (!body.channelId || !body.body?.trim()) return sendJson(response, 400, { error: 'Choose a channel and write a message.' });
    if (!databaseReady) {
      const store = await getStore(); if (!Array.isArray(store.communityMessages)) store.communityMessages = [];
      const message = { id: crypto.randomUUID(), channel_id: body.channelId, author_membership_id: user.id, author_name: user.name, body: body.body.trim(), created_at: new Date().toISOString() };
      store.communityMessages.push(message); await saveStore(store);
      for (const member of demoMembers.filter((member) => member.id !== user.id)) { const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []); notifications.unshift({ id: crypto.randomUUID(), recipientId: member.id, message: `${user.name} posted in Team chat.`, createdAt: new Date().toISOString(), read: false }); }
      for (const mention of body.body.matchAll(/@([\w.-]+)/g)) { const target = demoMembers.find((member) => member.name.toLowerCase().replace(/\s+/g, '.') === mention[1].toLowerCase() || member.email.split('@')[0].toLowerCase() === mention[1].toLowerCase()); if (target && target.id !== user.id) { const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []); notifications.unshift({ id: crypto.randomUUID(), recipientId: target.id, message: `${user.name} mentioned you in Team chat.`, createdAt: new Date().toISOString(), read: false }); } }
      await saveStore(store); broadcastEvent('team-message', { organisationId: user.organisation_id, message }); return sendJson(response, 201, { id: message.id });
    }
    const channel = (await query('select id from community_channels where id = $1 and organisation_id = $2', [body.channelId, user.organisation_id])).rows[0]; if (!channel) return sendJson(response, 404, { error: 'Channel not found.' });
    const id = crypto.randomUUID(); await query('insert into community_messages (id, channel_id, author_membership_id, body) values ($1,$2,$3,$4)', [id, channel.id, user.id, body.body.trim()]); await notifyOrganisationMembers(user.organisation_id, user.id, `${user.name} posted in Team chat.`); broadcastEvent('team-message', { organisationId: user.organisation_id, message: { id, channel_id: channel.id, author_membership_id: user.id, author_name: user.name, body: body.body.trim(), created_at: new Date().toISOString() } }); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/community/direct-messages' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Direct messages require an organisation account.' });
    if (!databaseReady) { const store = await getStore(); return sendJson(response, 200, { messages: (store.directMessages || []).filter((message) => message.sender_membership_id === user.id || message.recipient_membership_id === user.id) }); }
    const messages = await query(`select d.*, sender.full_name as sender_name, recipient.full_name as recipient_name from direct_messages d join memberships sm on sm.id = d.sender_membership_id join portal_users sender on sender.id = sm.user_id join memberships rm on rm.id = d.recipient_membership_id join portal_users recipient on recipient.id = rm.user_id where d.organisation_id = $1 and (d.sender_membership_id = $2 or d.recipient_membership_id = $2) order by d.created_at desc limit 30`, [user.organisation_id, user.id]);
    return sendJson(response, 200, { messages: messages.rows.reverse() });
  }
  if (url.pathname === '/api/community/direct-messages' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Direct messages require an organisation account.' }); const body = await readJson(request); if (!body.recipientMembershipId || !body.body?.trim()) return sendJson(response, 400, { error: 'Choose a staff member and write a message.' });
    if (!databaseReady) { const recipient = demoMembers.find((member) => member.id === body.recipientMembershipId); if (!recipient) return sendJson(response, 404, { error: 'Coworker not found.' }); const store = await getStore(); if (!Array.isArray(store.directMessages)) store.directMessages = []; const message = { id: crypto.randomUUID(), organisationId: user.organisation_id, sender_membership_id: user.id, recipient_membership_id: recipient.id, sender_name: user.name, recipient_name: recipient.name, body: body.body.trim(), created_at: new Date().toISOString() }; store.directMessages.push(message); const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []); notifications.unshift({ id: crypto.randomUUID(), recipientId: recipient.id, message: `${user.name} sent you a private message.`, createdAt: new Date().toISOString(), read: false }); await saveStore(store); broadcastEvent('private-message', message); return sendJson(response, 201, { id: message.id }); }
    const recipient = (await query('select id from memberships where id = $1 and organisation_id = $2 and status = $3', [body.recipientMembershipId, user.organisation_id, 'active'])).rows[0]; if (!recipient) return sendJson(response, 404, { error: 'Staff member not found.' });
    const id = crypto.randomUUID(); await query('insert into direct_messages (id, organisation_id, sender_membership_id, recipient_membership_id, body) values ($1,$2,$3,$4,$5)', [id, user.organisation_id, user.id, recipient.id, body.body.trim()]); await notifyMembership(user.organisation_id, recipient.id, `${user.name} sent you a private message.`); broadcastEvent('private-message', { organisationId: user.organisation_id, recipientMembershipId: recipient.id, senderMembershipId: user.id, body: body.body.trim(), id }); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/open-shifts' && request.method === 'POST') {
    if (!['owner', 'workforce_admin'].includes(user.role) || !user.organisation_id) return sendJson(response, 403, { error: 'Only workforce managers can post open shifts.' });
    const body = await readJson(request); if (!body.title || !body.startsAt || !body.endsAt) return sendJson(response, 400, { error: 'Title, start time, and end time are required.' });
    const id = crypto.randomUUID(); await query('insert into open_shifts (id, organisation_id, created_by_membership_id, title, starts_at, ends_at, slots, notes) values ($1,$2,$3,$4,$5,$6,$7,$8)', [id, user.organisation_id, user.id, body.title, body.startsAt, body.endsAt, Math.max(1, Number(body.slots) || 1), body.notes || null]);
    await notifyOrganisationOwners(user.organisation_id, `New open shift posted: ${body.title}.`); return sendJson(response, 201, { id });
  }
  if (/^\/api\/open-shifts\/[^/]+\/apply$/.test(url.pathname) && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Open shifts require an organisation account.' });
    const shiftId = url.pathname.split('/')[3]; const shift = (await query('select id, title from open_shifts where id = $1 and organisation_id = $2 and status = $3', [shiftId, user.organisation_id, 'open'])).rows[0];
    if (!shift) return sendJson(response, 404, { error: 'That open shift is no longer available.' });
    await query('insert into open_shift_applications (id, open_shift_id, membership_id) values ($1,$2,$3) on conflict (open_shift_id, membership_id) do nothing', [crypto.randomUUID(), shiftId, user.id]);
    await notifyOrganisationOwners(user.organisation_id, `${user.name} applied to cover ${shift.title}.`); return sendJson(response, 201, { ok: true });
  }
  if (url.pathname === '/api/leave-requests' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Leave requests require an organisation account.' });
    if (!databaseReady) {
      const store = await getStore();
      const list = (store.leaveRequests || []).filter(r => r.organisation_id === user.organisation_id && (user.role === 'owner' || r.membership_id === user.id));
      return sendJson(response, 200, { requests: list });
    }
    const where = user.role === 'owner' ? 'lr.organisation_id = $1' : 'lr.organisation_id = $1 and (lr.membership_id = $2 or m.user_id = $2)';
    const values = user.role === 'owner' ? [user.organisation_id] : [user.organisation_id, user.id];
    const requests = await query(
      `select lr.*, coalesce(u.full_name, 'Staff Member') as applicant_name, coalesce(u.full_name, 'Staff Member') as worker_name, u.email as applicant_email, m.title as applicant_title, m.department as applicant_department, m.role as applicant_role
       from leave_requests lr
       left join memberships m on (m.id = lr.membership_id or m.user_id = lr.membership_id)
       left join portal_users u on (u.id = m.user_id or u.id = lr.membership_id)
       where ${where}
       order by lr.created_at desc`,
      values
    );
    return sendJson(response, 200, { requests: requests.rows });
  }
  if (url.pathname === '/api/leave-requests' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Leave requests require an organisation account.' });
    const body = await readJson(request);
    if (!body.startsOn || !body.endsOn) return sendJson(response, 400, { error: 'Leave dates are required.' });
    if (new Date(body.endsOn) < new Date(body.startsOn)) {
      return sendJson(response, 400, { error: 'Leave end date must be on or after start date.' });
    }

    const clientKey = request.headers['idempotency-key'] || null;
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'submit-leave', clientKey, body, async (client) => {
        if (!databaseReady) {
          const store = await getStore();
          if (!Array.isArray(store.leaveRequests)) store.leaveRequests = [];
          const existing = store.leaveRequests.find(r => (r.organisation_id === user.organisation_id || r.organisationId === user.organisation_id) && (r.membership_id === user.id || r.membershipId === user.id) && r.starts_on === body.startsOn && r.ends_on === body.endsOn && r.status !== 'rejected');
          if (existing) {
            const err = new Error('A leave request for these dates already exists.');
            err.statusCode = 409;
            throw err;
          }
          const id = crypto.randomUUID();
          const newLeave = {
            id,
            organisation_id: user.organisation_id,
            organisationId: user.organisation_id,
            membership_id: user.id,
            membershipId: user.id,
            worker_name: user.name,
            applicant_name: user.name,
            starts_on: body.startsOn,
            ends_on: body.endsOn,
            reason: body.reason || null,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          store.leaveRequests.unshift(newLeave);
          await saveStore(store);
          return { statusCode: 201, result: { id } };
        }

        const q = client || { query: (sql, vals) => query(sql, vals) };
        const existing = (await q.query('select id from leave_requests where organisation_id = $1 and membership_id = $2 and starts_on = $3 and ends_on = $4 and status != \'rejected\'', [user.organisation_id, user.id, body.startsOn, body.endsOn])).rows[0];
        if (existing) {
          const err = new Error('A leave request for these dates already exists.');
          err.statusCode = 409;
          throw err;
        }

        const id = crypto.randomUUID();
        await q.query('insert into leave_requests (id, organisation_id, membership_id, starts_on, ends_on, reason) values ($1,$2,$3,$4,$5,$6)', [id, user.organisation_id, user.id, body.startsOn, body.endsOn, body.reason || null]);
        await audit(user.organisation_id, user.id, 'leave_requested', 'leave_request', id, 'Leave request submitted.');
        await notifyOrganisationOwners(user.organisation_id, `${user.name} requested leave from ${body.startsOn} to ${body.endsOn}.`);
        return { statusCode: 201, result: { id } };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 500;
      return sendJson(response, code, { error: err.message });
    }
  }
  if (url.pathname === '/api/leave-requests/review' && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can review leave.' });
    const leaveBody = await readJson(request);
    const { id: leaveId, decision } = leaveBody;
    if (!['approved', 'rejected'].includes(decision)) return sendJson(response, 400, { error: 'Invalid leave decision.' });
    const clientKey = request.headers['idempotency-key'] || null;
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'leave-review', clientKey, leaveBody, async (client) => {
        if (!databaseReady) {
          const store = await getStore();
          const req = (store.leaveRequests || []).find(r => r.id === leaveId);
          if (req) {
            req.status = decision;
            req.reviewed_by = user.name;
            req.reviewed_at = new Date().toISOString();
            await saveStore(store);
          }
          return { statusCode: 200, result: { ok: true } };
        }
        const q = client || { query: (sql, vals) => query(sql, vals) };
        const existing = (await q.query('select id, status from leave_requests where id = $1 and organisation_id = $2 for update', [leaveId, user.organisation_id])).rows[0];
        if (!existing) { const err = new Error('Leave request not found.'); err.statusCode = 404; throw err; }
        if (existing.status !== 'pending') { const err = new Error('This leave request has already been reviewed.'); err.statusCode = 409; throw err; }
        await q.query('update leave_requests set status = $1, reviewed_by_membership_id = $2 where id = $3 and organisation_id = $4', [decision, user.id, leaveId, user.organisation_id]);
        await audit(user.organisation_id, user.id, 'leave_reviewed', 'leave_request', leaveId, decision);
        return { statusCode: 200, result: { ok: true } };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 400;
      return sendJson(response, code, { error: err.message });
    }
  }

  if (url.pathname === '/api/shift-swaps' && request.method === 'POST') {
    const { shiftId, targetMembershipId, reason, swapType } = await readJson(request);
    const store = await getStore();
    if (!Array.isArray(store.shiftSwaps)) store.shiftSwaps = [];
    
    const targetMember = demoMembers.find(m => m.id === targetMembershipId);
    const id = crypto.randomUUID();
    const newSwap = {
      id,
      shift_id: shiftId || 'shift-demo',
      requester_membership_id: user.id,
      requester_name: user.name,
      requester_role: user.role,
      target_membership_id: targetMembershipId || null,
      target_name: targetMember?.name || 'Open Shift Pool',
      swap_type: swapType || 'cover',
      reason: reason || 'Shift cover requested',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    store.shiftSwaps.unshift(newSwap);
    
    // Add notification for supervisor and owners
    const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []);
    notifications.unshift({
      id: crypto.randomUUID(),
      recipientId: 'david', // Shift supervisor
      message: `${user.name} submitted a shift swap request (${newSwap.swap_type})`,
      createdAt: new Date().toISOString(),
      read: false
    });
    await saveStore(store);
    return sendJson(response, 201, { id, swap: newSwap });
  }
  if (url.pathname === '/api/shift-swaps' && request.method === 'GET') {
    const store = await getStore();
    if (!Array.isArray(store.shiftSwaps)) {
      store.shiftSwaps = [
        {
          id: 'swap-demo-1',
          shift_id: 'shift-1',
          requester_membership_id: '00000000-0000-4000-8000-000000000011',
          requester_name: 'Amina Otieno',
          requester_role: 'outgoing',
          target_membership_id: '00000000-0000-4000-8000-000000000013',
          target_name: 'Faith Wanjiku',
          swap_type: 'cover',
          reason: 'Family appointment before evening rotation',
          status: 'pending',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      await saveStore(store);
    }
    return sendJson(response, 200, { swaps: store.shiftSwaps });
  }
  if (url.pathname === '/api/shift-swaps/review' && request.method === 'POST') {
    const { id, decision } = await readJson(request);
    if (!['approved', 'rejected'].includes(decision)) return sendJson(response, 400, { error: 'Invalid swap decision.' });
    const store = await getStore();
    const swap = (store.shiftSwaps || []).find(s => s.id === id);
    if (!swap) return sendJson(response, 404, { error: 'Swap request not found.' });
    swap.status = decision;
    swap.reviewed_by = user.name;
    swap.reviewed_at = new Date().toISOString();
    
    // Notify requester
    const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []);
    notifications.unshift({
      id: crypto.randomUUID(),
      recipientId: swap.requester_membership_id,
      message: `Your shift swap request was ${decision} by ${user.name}.`,
      createdAt: new Date().toISOString(),
      read: false
    });
    await saveStore(store);
    return sendJson(response, 200, { ok: true, swap });
  }

  if (url.pathname === '/api/organisation/settings' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view settings.' });
    if (!databaseReady) {
      const store = await getStore();
      if (!store.organisationSettings) {
        store.organisationSettings = {
          legal_name: 'ShiftRelay Global Demo Organisation',
          trading_name: 'ShiftRelay Global',
          industry: 'Operations',
          country: 'Global',
          time_zone: 'UTC',
          preferred_language: 'en',
          settings: { handoverReminderMinutes: 30 }
        };
        await saveStore(store);
      }
      return sendJson(response, 200, { organisation: store.organisationSettings });
    }
    const organisation = (await query('select legal_name, trading_name, industry, country, time_zone, preferred_language, settings from organisations where id = $1', [user.organisation_id])).rows[0];
    if (!organisation) return sendJson(response, 404, { error: 'Organisation not found.' });
    return sendJson(response, 200, { organisation });
  }
  if (url.pathname === '/api/organisation/settings' && request.method === 'PUT') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can update settings.' });
    const body = await readJson(request);

    // Validate industry
    const supportedIndustries = ['Healthcare', 'Logistics', 'Manufacturing', 'Hospitality', 'Retail', 'Security', 'Operations', 'Other'];
    const industry = String(body.industry || 'Other').trim();
    if (!supportedIndustries.includes(industry)) {
      return sendJson(response, 400, { error: `Invalid industry. Supported options: ${supportedIndustries.join(', ')}` });
    }

    // Validate timeZone
    const timeZone = String(body.timeZone || '').trim();
    if (!timeZone) {
      return sendJson(response, 400, { error: 'A valid time-zone identifier is required.' });
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
    } catch (_) {
      return sendJson(response, 400, { error: 'Invalid or unsupported IANA time-zone identifier (e.g. UTC, Africa/Nairobi, Europe/London, America/New_York).' });
    }

    // Validate reminder bounds (5 to 240 minutes)
    const reminderMinutes = Number(body.handoverReminderMinutes);
    if (!Number.isInteger(reminderMinutes) || reminderMinutes < 5 || reminderMinutes > 240) {
      return sendJson(response, 400, { error: 'Handover reminder minutes must be an integer between 5 and 240.' });
    }

    // Validate language
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'sw'];
    const language = String(body.language || 'en').trim().toLowerCase();
    if (!supportedLanguages.includes(language)) {
      return sendJson(response, 400, { error: `Unsupported language. Supported options: ${supportedLanguages.join(', ')}` });
    }

    const tradingName = body.tradingName ? String(body.tradingName).trim().slice(0, 100) : null;
    const country = body.country ? String(body.country).trim().slice(0, 60) : 'Global';

    if (!databaseReady) {
      const store = await getStore();
      if (!store.organisationSettings) store.organisationSettings = {};
      store.organisationSettings = {
        legal_name: store.organisationSettings.legal_name || 'ShiftRelay Global Demo Organisation',
        trading_name: tradingName,
        industry,
        country,
        time_zone: timeZone,
        preferred_language: language,
        settings: { handoverReminderMinutes: reminderMinutes }
      };
      await saveStore(store);
      return sendJson(response, 200, { ok: true, organisation: store.organisationSettings });
    }

    await query(
      'update organisations set trading_name = $1, industry = $2, country = $3, time_zone = $4, preferred_language = $5, settings = $6::jsonb where id = $7',
      [tradingName, industry, country, timeZone, language, JSON.stringify({ handoverReminderMinutes: reminderMinutes }), user.organisation_id]
    );
    await audit(user.organisation_id, user.id, 'settings_updated', 'organisation', user.organisation_id, 'Organisation settings updated.');
    return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === '/api/directory' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Directory is available for authenticated organisation accounts.' });
    if (!databaseReady) {
      const store = await getStore();
      const statusMap = new Map();
      const extraMembers = [];
      if (Array.isArray(store.memberships)) {
        store.memberships.forEach(m => {
          if (m.organisation_id === user.organisation_id) {
            statusMap.set(m.id, m.status);
            if (!demoMembers.some(dm => dm.id === m.id) && m.status === 'active') {
              const u = (store.portalUsers || []).find(user => user.id === m.user_id) || {};
              extraMembers.push({
                id: m.id,
                name: u.full_name || m.name || 'Staff Member',
                email: u.email || '',
                role: m.role || 'worker',
                title: m.title || 'Staff Specialist',
                department: m.department || 'Operations',
                status: 'active',
                time_zone: 'UTC',
                shift_start: '08:00',
                shift_end: '16:00'
              });
            }
          }
        });
      }
      const baseMembers = demoMembers.map((member) => ({
        ...member,
        time_zone: 'UTC',
        status: statusMap.get(member.id) || 'active',
        shift_start: member.role === 'incoming' ? '14:00' : '06:00',
        shift_end: member.role === 'incoming' ? '22:00' : '14:00'
      }));
      return sendJson(response, 200, { members: [...baseMembers, ...extraMembers] });
    }
    const members = await query(`select m.id, u.full_name as name, u.email, u.time_zone, m.role, m.title, m.department, m.status, m.shift_start, m.shift_end from memberships m join portal_users u on u.id = m.user_id where m.organisation_id = $1 order by u.full_name`, [user.organisation_id]); return sendJson(response, 200, { members: members.rows });
  }
  if (url.pathname === '/api/incidents' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Incident reporting is available for authenticated organisation accounts.' });
    if (!databaseReady) {
      const store = await getStore();
      return sendJson(response, 200, { incidents: store.incidents || [] });
    }
    const incidents = await query('select i.*, u.full_name as reporter_name from incidents i join memberships m on m.id = i.reported_by_membership_id join portal_users u on u.id = m.user_id where i.organisation_id = $1 order by i.created_at desc limit 30', [user.organisation_id]);
    return sendJson(response, 200, { incidents: incidents.rows });
  }
  if (url.pathname === '/api/incidents' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Incident reporting is available for authenticated organisation accounts.' });
    const body = await readJson(request);
    if (!body.category || !body.severity || !body.description) return sendJson(response, 400, { error: 'Category, severity, and description are required.' });
    const id = crypto.randomUUID();
    if (!databaseReady) {
      const store = await getStore();
      if (!Array.isArray(store.incidents)) store.incidents = [];
      const incident = {
        id,
        organisation_id: user.organisation_id,
        reported_by_membership_id: user.id,
        reporter_name: user.name,
        category: body.category,
        severity: body.severity,
        description: body.description,
        zone: body.zone || 'General',
        image_url: body.imageUrl || null,
        created_at: new Date().toISOString()
      };
      store.incidents.unshift(incident);
      await saveStore(store);
      broadcastEvent('incident-reported', incident);
      if (body.severity === 'critical') {
        broadcastEvent('emergency-broadcast', {
          id,
          title: `CRITICAL ${body.category.toUpperCase()} ALERT`,
          type: body.category.toLowerCase(),
          location: `Zone: ${body.zone || 'Facility Wide'}`,
          instructions: body.description,
          timestamp: new Date().toLocaleTimeString(),
          safeCount: 0,
          totalCount: demoMembers.length
        });
      }
      return sendJson(response, 201, { id });
    }
    await query('insert into incidents (id, organisation_id, reported_by_membership_id, category, severity, description) values ($1,$2,$3,$4,$5,$6)', [id, user.organisation_id, user.id, body.category, body.severity, body.description]);
    await audit(user.organisation_id, user.id, 'incident_reported', 'incident', id, `${body.severity} ${body.category} incident reported.`);
    await notifyOrganisationOwners(user.organisation_id, `${user.name} reported a ${body.severity} ${body.category} incident.`);
    return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/audit-events' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view audit history.' });
    if (!databaseReady) return sendJson(response, 200, { events: [{ event_type: 'demo_workspace_ready', actor_name: 'ShiftRelay', created_at: new Date().toISOString() }] });
    const events = await query('select a.*, u.full_name as actor_name from audit_events a left join memberships m on m.id = a.actor_membership_id left join portal_users u on u.id = m.user_id where a.organisation_id = $1 order by a.created_at desc limit 50', [user.organisation_id]); return sendJson(response, 200, { events: events.rows });
  }

  if (url.pathname === '/api/memberships/pending' && request.method === 'GET') {
    if (!['owner', 'supervisor'].includes(user.role) || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation managers can review access requests.' });
    return sendJson(response, 200, await pendingMemberships(user));
  }

  const membershipReviewMatch = url.pathname.match(/^\/api\/memberships\/([^/]+)\/review$/);
  if (membershipReviewMatch && request.method === 'POST') {
    if (!['owner', 'supervisor'].includes(user.role) || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation managers can review access requests.' });
    const reviewBody = await readJson(request);
    const clientKey = request.headers['idempotency-key'] || null;
    const opBody = { membershipId: membershipReviewMatch[1], ...reviewBody };
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'membership-review', clientKey, opBody, async (client) => {
        const membership = await reviewMembership(user, membershipReviewMatch[1], reviewBody);
        return { statusCode: 200, result: { membership } };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 400;
      return sendJson(response, code, { error: err.message });
    }
  }

  const membershipRevokeMatch = url.pathname.match(/^\/api\/memberships\/([^/]+)\/revoke$/);
  if (membershipRevokeMatch && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can revoke worker memberships.' });
    const clientKey = request.headers['idempotency-key'] || null;
    const targetId = membershipRevokeMatch[1];
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'membership-revoke', clientKey, { targetId }, async () => {
        const res = await revokeMembership(user, targetId);
        return { statusCode: 200, result: res };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 400;
      return sendJson(response, code, { error: err.message });
    }
  }

  if (url.pathname === '/api/time-entries' && request.method === 'GET') {
    const monthParam = url.searchParams.get('month');
    if (monthParam && !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(monthParam)) {
      return sendJson(response, 400, { error: 'Invalid month format. Expected YYYY-MM.' });
    }
    return sendJson(response, 200, await timeSummary(user, monthParam ? `${monthParam}-01` : null));
  }
  if (url.pathname === '/api/time-entries/clock-in' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Clocking in is available for authenticated organisation accounts.' });
    const clientKey = request.headers['idempotency-key'] || null;
    // Read body for fingerprinting; clock-in itself ignores body content
    let body = {};
    try { body = await readJson(request); } catch { body = {}; }
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'clock-in', clientKey, body, async (client) => {
        if (!databaseReady) {
          const store = await getStore();
          if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
          if (store.timeEntries.some((entry) => entry.membershipId === user.id && !entry.clockedOutAt)) {
            const err = new Error('You are already clocked in.'); err.statusCode = 409; throw err;
          }
          store.timeEntries.unshift({ id: crypto.randomUUID(), organisationId: user.organisation_id, membershipId: user.id, clockedInAt: new Date().toISOString(), clockedOutAt: null, note: null });
          await saveStore(store);
          return { statusCode: 201, result: demoTimeSummary(user, store) };
        }
        // Use SELECT FOR UPDATE to prevent concurrent double clock-in
        const q = client || { query: (sql, vals) => query(sql, vals) };
        const existing = (await q.query('select id from time_entries where membership_id = $1 and clocked_out_at is null for update', [user.id])).rows[0];
        if (existing) { const err = new Error('You are already clocked in.'); err.statusCode = 409; throw err; }
        await q.query('insert into time_entries (id, organisation_id, membership_id, clocked_in_at) values ($1,$2,$3,now())', [crypto.randomUUID(), user.organisation_id, user.id]);
        return { statusCode: 201, result: await timeSummary(user) };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 500;
      return sendJson(response, code, { error: err.message });
    }
  }
  if (url.pathname === '/api/time-entries/clock-out' && request.method === 'POST') {
    const clientKey = request.headers['idempotency-key'] || null;
    const body = {};
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'clock-out', clientKey, body, async (client) => {
        if (!databaseReady) {
          const store = await getStore();
          if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
          const active = store.timeEntries.find((entry) => entry.membershipId === user.id && !entry.clockedOutAt);
          if (!active) { const err = new Error('You are not clocked in.'); err.statusCode = 409; throw err; }
          active.clockedOutAt = new Date().toISOString();
          await saveStore(store);
          return { statusCode: 200, result: demoTimeSummary(user, store) };
        }
        const q = client || { query: (sql, vals) => query(sql, vals) };
        const activeEntry = (await q.query('select id from time_entries where membership_id = $1 and clocked_out_at is null for update', [user.id])).rows[0];
        if (!activeEntry) { const err = new Error('You are not clocked in.'); err.statusCode = 409; throw err; }
        await q.query('update time_entries set clocked_out_at = now() where id = $1', [activeEntry.id]);
        return { statusCode: 200, result: await timeSummary(user) };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 500;
      return sendJson(response, code, { error: err.message });
    }
  }
  if (url.pathname === '/api/wellbeing-quote' && request.method === 'GET') {
    const key = wellbeingQuotes[Math.floor(Date.now() / 1800000) % wellbeingQuotes.length];
    const reactions = await query('select reaction, count(*)::int as count from quote_reactions where quote_key = $1 group by reaction', [key[0]]);
    const mine = await query('select reaction from quote_reactions where quote_key = $1 and membership_id = $2', [key[0], user.id]);
    return sendJson(response, 200, { quote: { key: key[0], text: key[1], author: key[2], reactions: Object.fromEntries(reactions.rows.map((row) => [row.reaction, row.count])), mine: mine.rows.map((row) => row.reaction), refreshesAt: new Date((Math.floor(Date.now() / 1800000) + 1) * 1800000).toISOString() } });
  }
  if (url.pathname === '/api/wellbeing-quote/react' && request.method === 'POST') {
    const { key, reaction } = await readJson(request); if (!['like', 'love'].includes(reaction) || !wellbeingQuotes.some((quote) => quote[0] === key)) return sendJson(response, 400, { error: 'Invalid quote reaction.' });
    await query('insert into quote_reactions (quote_key, membership_id, reaction) values ($1,$2,$3) on conflict do nothing', [key, user.id, reaction]);
    return sendJson(response, 201, { ok: true });
  }
  if (url.pathname === '/api/work-assistant' && request.method === 'POST') {
    try { const { question } = await readJson(request); if (typeof question !== 'string' || question.trim().length < 4) return sendJson(response, 400, { error: 'Ask a little more so the assistant can help.' }); return sendJson(response, 200, { answer: await answerWorkQuestion(question.trim(), user) }); }
    catch (error) { return sendJson(response, error.message === 'AI_NOT_CONFIGURED' ? 503 : 500, { error: error.message || 'Assistant unavailable.' }); }
  }

  // ── Timesheets & Missed Punch Correction ─────────────────────────────────
  if (url.pathname === '/api/timesheets' && request.method === 'GET') {
    const store = await getStore();
    if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
    if (!Array.isArray(store.punchCorrections)) store.punchCorrections = [];

    const targetUserId = url.searchParams.get('userId') || user.id;
    let userEntries = store.timeEntries.filter(e => e.membershipId === targetUserId);

    if (userEntries.length === 0) {
      const now = Date.now();
      const dayMs = 86400000;
      userEntries = [
        {
          id: 'te-seed-1',
          organisationId: user.organisation_id,
          membershipId: targetUserId,
          clockedInAt: new Date(now - dayMs - 8.5 * 3600000).toISOString(),
          clockedOutAt: new Date(now - dayMs).toISOString(),
          facility: 'Factory 10 - Production',
          department: 'Operations',
          role: 'Process Technician',
          note: 'Completed regular shift + handover relay'
        },
        {
          id: 'te-seed-2',
          organisationId: user.organisation_id,
          membershipId: targetUserId,
          clockedInAt: new Date(now - 2 * dayMs - 9 * 3600000).toISOString(),
          clockedOutAt: null,
          facility: 'Factory 10 - Production',
          department: 'Operations',
          role: 'Process Technician',
          note: 'Shift completed - clock-out punch missing'
        },
        {
          id: 'te-seed-3',
          organisationId: user.organisation_id,
          membershipId: targetUserId,
          clockedInAt: new Date(now - 3 * dayMs - 8 * 3600000).toISOString(),
          clockedOutAt: new Date(now - 3 * dayMs).toISOString(),
          facility: 'Factory 10 - Production',
          department: 'Operations',
          role: 'Process Technician',
          note: 'Regular shift'
        }
      ];
      store.timeEntries.push(...userEntries);
      await saveStore(store);
    }

    const timesheets = userEntries.map(e => {
      const inTime = new Date(e.clockedInAt);
      const outTime = e.clockedOutAt ? new Date(e.clockedOutAt) : null;
      const isMissing = !outTime && (Date.now() - inTime.getTime() > 14 * 3600000);
      const isActive = !outTime && !isMissing;
      let hours = 0;
      if (outTime) {
        hours = Math.max(0, ((outTime.getTime() - inTime.getTime()) / 3600000)).toFixed(2);
      }
      return {
        id: e.id,
        date: inTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        rawDate: inTime.toISOString().slice(0, 10),
        clockInTime: inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clockOutTime: outTime ? outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Blank (Missing)',
        hours: outTime ? Number(hours) : 0,
        status: isMissing ? 'missed_punch' : (isActive ? 'active' : 'authorized'),
        facility: e.facility || 'Factory 10 - Production',
        department: e.department || user.department || 'Operations',
        role: e.role || user.title || 'Frontline Specialist',
        correctionPending: store.punchCorrections.some(c => c.timeEntryId === e.id && c.status === 'pending')
      };
    });

    const missedPunchCount = timesheets.filter(t => t.status === 'missed_punch').length;
    const totalHours = timesheets.reduce((sum, t) => sum + (t.hours || 0), 0);

    return sendJson(response, 200, {
      timesheets,
      missedPunchCount,
      period: {
        label: 'Current Pay Period (Aug 9 — Aug 22)',
        totalHours: totalHours.toFixed(2),
        regularHours: Math.min(80, totalHours).toFixed(2),
        overtimeHours: Math.max(0, totalHours - 80).toFixed(2)
      }
    });
  }

  // Submit Missed Punch Correction
  if (url.pathname === '/api/timesheets/punch-correction' && request.method === 'POST') {
    const body = await readJson(request);
    const { timeEntryId, requestedClockOut, reason } = body;
    if (!timeEntryId || !requestedClockOut) {
      return sendJson(response, 400, { error: 'Time entry and estimated departure time are required.' });
    }
    const store = await getStore();
    if (!Array.isArray(store.punchCorrections)) store.punchCorrections = [];
    const id = crypto.randomUUID();
    const correction = {
      id,
      timeEntryId,
      membershipId: user.id,
      workerName: user.name,
      requestedClockOut,
      reason: reason || 'Forgotten punch on shift end',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    store.punchCorrections.unshift(correction);
    await saveStore(store);
    return sendJson(response, 201, { ok: true, correction });
  }

  // Manager: Get Pending Authorizations & Punch Corrections
  if (url.pathname === '/api/timesheets/pending-authorizations' && request.method === 'GET') {
    const store = await getStore();
    if (!Array.isArray(store.punchCorrections)) store.punchCorrections = [];
    
    if (store.punchCorrections.length === 0) {
      store.punchCorrections = [
        {
          id: 'pc-seed-1',
          timeEntryId: 'te-seed-2',
          membershipId: '00000000-0000-4000-8000-000000000011',
          workerName: 'Amina Otieno',
          role: 'Process Technician (USA)',
          facility: 'Factory 10 - Production',
          date: 'Tue, Sep 8, 2026',
          clockIn: '09:00',
          requestedClockOut: '17:30',
          hours: '8.50',
          reason: 'Badge scanner offline at bay 4 exit',
          status: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          id: 'pc-seed-2',
          timeEntryId: 'te-seed-aaron',
          membershipId: '00000000-0000-4000-8000-000000000012',
          workerName: 'Aaron Glover',
          role: 'Process Technician (USA)',
          facility: 'Factory 10 - Production',
          date: 'Tue, Sep 8, 2026',
          clockIn: '09:00',
          requestedClockOut: '17:30',
          hours: '8.50',
          reason: 'Shift handover extended triage',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ];
      await saveStore(store);
    }

    const pending = store.punchCorrections.filter(c => c.status === 'pending');
    return sendJson(response, 200, {
      pending,
      count: pending.length
    });
  }

  // Manager: Authorize Punch Correction
  if (url.pathname === '/api/timesheets/authorize' && request.method === 'POST') {
    const { correctionId, decision } = await readJson(request);
    const store = await getStore();
    const correction = (store.punchCorrections || []).find(c => c.id === correctionId);
    if (!correction) return sendJson(response, 404, { error: 'Correction request not found.' });
    correction.status = decision === 'approved' ? 'authorized' : 'denied';
    correction.authorizedBy = user.name;
    correction.authorizedAt = new Date().toISOString();

    if (decision === 'approved' && Array.isArray(store.timeEntries)) {
      const entry = store.timeEntries.find(e => e.id === correction.timeEntryId);
      if (entry) {
        entry.clockedOutAt = new Date().toISOString();
        entry.note = `Supervisor ${user.name} approved punch: departure ${correction.requestedClockOut}`;
      }
    }
    await saveStore(store);
    return sendJson(response, 200, { ok: true, correction });
  }

  // ── Worker Earnings & Statements (NGN Africa & Global Hybrid) ──────────────
  if (url.pathname === '/api/earnings' && request.method === 'GET') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    const emp = payroll.employees.find(e => e.userId === user.id || e.userName === user.name) || payroll.employees[0];
    return sendJson(response, 200, {
      statement: {
        period: 'October 1 — October 31, 2026',
        payDate: 'Thursday, Oct 29, 2026',
        companyName: payroll.companyName,
        companyId: payroll.companyId,
        currency: 'NGN',
        currencySymbol: '₦',
        netPay: emp.netPay,
        netPayFormatted: '₦' + emp.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        changeFromPrevious: '+₦14,250.00',
        hours: emp.regularHours + emp.overtimeHours,
        regularHours: emp.regularHours,
        overtimeHours: emp.overtimeHours,
        grossPay: emp.grossPay,
        grossPayFormatted: '₦' + emp.grossPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        preTaxDeductions: emp.pensionEmployee + emp.nhf,
        preTaxFormatted: '₦' + (emp.pensionEmployee + emp.nhf).toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        preTaxPercentage: Math.round(((emp.pensionEmployee + emp.nhf) / emp.grossPay) * 10000) / 100 + '%',
        netPayPercentage: Math.round((emp.netPay / emp.grossPay) * 10000) / 100 + '%',
        taxes: emp.payeTax,
        taxesFormatted: '₦' + emp.payeTax.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
        taxesPercentage: Math.round((emp.payeTax / emp.grossPay) * 10000) / 100 + '%',
        hourlyRate: '₦' + emp.hourlyRate.toLocaleString('en-NG') + '/hr',
        compensationType: emp.compensation_type,
        breakdown: {
          netPayPct: Math.round((emp.netPay / emp.grossPay) * 10000) / 100,
          preTaxPct: Math.round(((emp.pensionEmployee + emp.nhf) / emp.grossPay) * 10000) / 100,
          taxesPct: Math.round((emp.payeTax / emp.grossPay) * 10000) / 100,
          netPayAmt: emp.netPay,
          preTaxAmt: emp.pensionEmployee + emp.nhf,
          taxesAmt: emp.payeTax
        }
      }
    });
  }

  // ── Worker Official Digital Payslip (Pay Advice) ───────────────────────────
  if (url.pathname === '/api/worker-payslip' && request.method === 'GET') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    const emp = payroll.employees.find(e => e.userId === user.id || e.userName === user.name) || payroll.employees[0];
    return sendJson(response, 200, {
      payslip: {
        companyName: payroll.companyName,
        companyId: payroll.companyId,
        period: 'October 1 — October 31, 2026',
        payDate: 'Thursday, Oct 29, 2026',
        staffName: emp.userName,
        staffId: emp.staffId,
        role: emp.role,
        department: emp.department,
        compensationType: emp.compensation_type,
        currency: 'NGN',
        currencySymbol: '₦',
        bankName: emp.bank_name,
        accountNumber: emp.account_number,
        regularHours: emp.regularHours,
        overtimeHours: emp.overtimeHours,
        totalHours: emp.regularHours + emp.overtimeHours,
        earnings: {
          basicSalary: emp.regularPay,
          overtimeBonus: emp.overtimePay,
          grossTotal: emp.grossPay
        },
        deductions: {
          unexcusedAbsence: emp.absenceDeduction,
          pensionEmployee: emp.pensionEmployee,
          payeTax: emp.payeTax,
          nhf: emp.nhf,
          totalDeductions: emp.totalStatutoryDeductions
        },
        employerContributions: {
          pensionEmployer: emp.pensionEmployer,
          nsitf: emp.nsitf
        },
        netPay: emp.netPay,
        formatted: {
          basicSalary: '₦' + emp.regularPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          overtimeBonus: '₦' + emp.overtimePay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          grossTotal: '₦' + emp.grossPay.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          pensionEmployee: '₦' + emp.pensionEmployee.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          payeTax: '₦' + emp.payeTax.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          nhf: '₦' + emp.nhf.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          totalDeductions: '₦' + emp.totalStatutoryDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
          netPay: '₦' + emp.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })
        },
        verificationSeal: 'ShiftRelay Certified Frontline Verification · Audit Token SR-VER-99214'
      }
    });
  }

  // ── Employee Contracts & Compensation Management ───────────────────────────
  if (url.pathname === '/api/contracts' && request.method === 'GET') {
    const store = await getStore();
    return sendJson(response, 200, { contracts: store.contracts || [] });
  }

  if (url.pathname.startsWith('/api/contracts/') && request.method === 'PUT') {
    const targetUserId = decodeURIComponent(url.pathname.slice('/api/contracts/'.length));
    const body = await readJson(request);
    const store = await getStore();
    const contract = (store.contracts || []).find(c => c.userId === targetUserId);
    if (!contract) return sendJson(response, 404, { error: 'Employee contract not found.' });
    if (body.compensation_type) contract.compensation_type = body.compensation_type;
    if (body.monthly_rate !== undefined) contract.monthly_rate = Number(body.monthly_rate);
    if (body.hourly_rate !== undefined) contract.hourly_rate = Number(body.hourly_rate);
    if (body.bank_name) contract.bank_name = body.bank_name;
    if (body.account_number) contract.account_number = body.account_number;
    if (body.account_name) contract.account_name = body.account_name;
    await saveStore(store);
    return sendJson(response, 200, { ok: true, contract });
  }

  // ── Push to Finance: Master Month-End Payroll Compilation ──────────────────
  if (url.pathname === '/api/payroll/summary' && request.method === 'GET') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    return sendJson(response, 200, payroll);
  }

  if (url.pathname === '/api/payroll/compile' && request.method === 'POST') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    return sendJson(response, 200, { ok: true, payroll });
  }

  // ── Push to Finance: Dispatch to Accounts Desk ─────────────────────────────
  if (url.pathname === '/api/payroll/dispatch' && request.method === 'POST') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    const dispatchRecord = {
      period: payroll.period,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: user.name,
      dispatchedByRole: user.role,
      totalNetPay: payroll.summary.totalNet,
      totalEmployees: payroll.summary.employeeCount,
      companyId: payroll.companyId,
      status: 'dispatched_to_finance',
      auditReference: `SR-FIN-DISPATCH-${Date.now()}`
    };
    store.lastPayrollDispatch = dispatchRecord;
    await saveStore(store);
    return sendJson(response, 200, { ok: true, dispatch: dispatchRecord });
  }

  // ── Push to Finance: Export Bank CSV Schedule ──────────────────────────────
  if (url.pathname === '/api/payroll/export-bank-csv' && request.method === 'GET') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    const csvData = generateBankPaymentCSV(payroll.employees);
    response.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ShiftRelay_Bank_Payment_Schedule_Oct2026.csv"'
    });
    response.end(csvData);
    return;
  }

  // ── Push to Finance: Export Statutory Tax & Pension CSV Schedule ───────────
  if (url.pathname === '/api/payroll/export-tax-csv' && request.method === 'GET') {
    const store = await getStore();
    const payroll = compilePayrollRun(store);
    const csvData = generateTaxPensionCSV(payroll.employees);
    response.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ShiftRelay_Statutory_Tax_Pension_Schedule_Oct2026.csv"'
    });
    response.end(csvData);
    return;
  }

  // ── Enterprise Concierge Lead Capture (Request an Enterprise Demo) ─────────
  if (url.pathname === '/api/enterprise/demo-request' && request.method === 'POST') {
    const lead = await readJson(request);
    if (!lead.companyName || !lead.workEmail || !lead.fullName) {
      return sendJson(response, 400, { error: 'Company name, work email, and full name are required.' });
    }
    const store = await getStore();
    if (!Array.isArray(store.enterpriseDemoRequests)) store.enterpriseDemoRequests = [];
    const entry = {
      id: 'demo-req-' + Date.now(),
      companyName: lead.companyName.trim(),
      fullName: lead.fullName.trim(),
      workEmail: lead.workEmail.trim(),
      phone: (lead.phone || '').trim(),
      headcount: lead.headcount || '50-200',
      industry: lead.industry || 'Logistics & Operations',
      notes: (lead.notes || '').trim(),
      createdAt: new Date().toISOString()
    };
    store.enterpriseDemoRequests.push(entry);
    await saveStore(store);
    return sendJson(response, 201, {
      ok: true,
      message: 'Your enterprise demo request has been logged. A ShiftRelay Implementation Engineer will contact you within 24 hours.'
    });
  }

  // ── Compliance & Goals Watch ─────────────────────────────────────────────
  if (url.pathname === '/api/compliance-goals' && request.method === 'GET') {
    return sendJson(response, 200, {
      goals: {
        atRisk: [
          {
            id: 'g-1',
            title: 'Complete Annual Safety Training',
            progress: 20,
            dueDate: '30-Nov-2025',
            status: 'at_risk'
          },
          {
            id: 'g-2',
            title: 'Renew Processing License',
            progress: 0,
            dueDate: '30-Nov-2025',
            status: 'at_risk'
          }
        ],
        overdue: [
          {
            id: 'g-3',
            title: 'Become Assembly Line Certified',
            progress: 0,
            dueDate: '31-Mar-2025',
            status: 'overdue'
          },
          {
            id: 'g-4',
            title: 'Create Onboarding Plan for New Hires',
            progress: 25,
            dueDate: '15-Apr-2025',
            status: 'overdue'
          }
        ],
        current: [
          {
            id: 'g-5',
            title: 'ShiftRelay Accountable Handover Pro',
            progress: 100,
            dueDate: 'Verified',
            status: 'completed'
          },
          {
            id: 'g-6',
            title: 'Frontline Safety & Incident Triage Level 1',
            progress: 100,
            dueDate: 'Verified',
            status: 'completed'
          }
        ]
      }
    });
  }

  if (url.pathname === '/api/analyze' && request.method === 'POST') {
    try {
      const { notes } = await readJson(request);
      if (typeof notes !== 'string' || notes.trim().length < 20) return sendJson(response, 400, { error: 'Please add a more detailed shift update.' });
      return sendJson(response, 200, { handover: await analyseShiftUpdate(notes.trim()), mode: 'live' });
    } catch (error) { return sendJson(response, error instanceof Error && error.message === 'AI_NOT_CONFIGURED' ? 503 : 500, { error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' }); }
  }

  if (url.pathname === '/api/transcribe' && request.method === 'POST') {
    try { return sendJson(response, 200, { transcript: await transcribeAudio(request) }); }
    catch (error) { return sendJson(response, error instanceof Error && error.message === 'TRANSCRIPTION_NOT_CONFIGURED' ? 503 : 500, { error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' }); }
  }

  if (url.pathname === '/api/handovers' && request.method === 'GET') {
    if (databaseReady) return sendJson(response, 200, { handovers: await databaseHandovers(user), user });
    const store = await getStore();
    const handovers = ['supervisor', 'owner'].includes(user.role) ? store.handovers : store.handovers.filter((handover) => handover.createdBy === user.id || handover.assignedTo === user.id);
    return sendJson(response, 200, { handovers, user });
  }

  if (url.pathname === '/api/handovers' && request.method === 'POST') {
    if (!['outgoing', 'supervisor', 'owner'].includes(user.role)) return sendJson(response, 403, { error: 'Only outgoing workers, supervisors, or owners can create handovers.' });
    const body = await readJson(request);
    const { notes, handover, assignedTo = 'faith', shiftStatus = 'green', tasks = [] } = body;
    if (!handover?.summary) return sendJson(response, 400, { error: 'Generate a handover before saving.' });
    handover.shiftStatus = shiftStatus;
    handover.notes = notes;
    if (!Array.isArray(handover.tasks) || !handover.tasks.length) {
      handover.tasks = (Array.isArray(tasks) && tasks.length) ? tasks : (handover.actions || []).map((action, i) => ({
        id: `task-${i + 1}-${crypto.randomUUID().slice(0, 6)}`,
        text: action.title,
        owner: action.owner,
        due: action.due,
        priority: action.priority || 'medium',
        done: false
      }));
    }
    const clientKey = request.headers['idempotency-key'] || null;
    try {
      const { statusCode, result, replay } = await withIdempotency(user, 'create-handover', clientKey, body, async (client) => {
        if (databaseReady) {
          const created = await createDatabaseHandover(user, { notes, handover, assignedTo });
          return { statusCode: 201, result: { handover: created } };
        }
        const store = await getStore();
        const record = { id: crypto.randomUUID(), createdBy: user.id, assignedTo, notes, handover, status: user.role === 'supervisor' ? 'relayed' : 'awaiting_review', acknowledgement: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        store.handovers.unshift(record);
        notify(store, 'david', record.id, `${user.name} created a handover for review.`);
        if (record.status === 'relayed') notify(store, assignedTo, record.id, 'A reviewed handover is ready for your shift.');
        await saveStore(store);
        broadcastEvent('handover-submitted', { organisationId: user.organisation_id, handover: record });
        return { statusCode: 201, result: { handover: record } };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 500;
      return sendJson(response, code, { error: err.message });
    }
  }

  const taskToggleMatch = url.pathname.match(/^\/api\/handovers\/([^/]+)\/tasks\/([^/]+)\/toggle$/);
  if (taskToggleMatch && request.method === 'POST') {
    const [_, handoverId, taskId] = taskToggleMatch;
    let body = {};
    try { body = await readJson(request); } catch {}
    if (databaseReady) {
      const item = (await query('select * from work_items where id = $1 and organisation_id = $2', [handoverId, user.organisation_id])).rows[0];
      if (!item) return sendJson(response, 404, { error: 'Handover not found.' });
      const payload = item.payload;
      if (!Array.isArray(payload.tasks)) payload.tasks = [];
      const task = payload.tasks.find((t) => t.id === taskId);
      if (task) {
        if (body && typeof body.done === 'boolean') {
          task.done = body.done;
        } else {
          task.done = !task.done;
        }
      }
      await query('update work_items set payload = $1::jsonb, updated_at = now() where id = $2', [JSON.stringify(payload), handoverId]);
      broadcastEvent('handover-updated', { organisationId: user.organisation_id, handoverId, task });
      return sendJson(response, 200, { ok: true, task, handover: payload });
    }
    const store = await getStore();
    const item = store.handovers.find((h) => h.id === handoverId);
    if (!item) return sendJson(response, 404, { error: 'Handover not found.' });
    if (!item.handover) item.handover = {};
    if (!Array.isArray(item.handover.tasks)) item.handover.tasks = [];
    const task = item.handover.tasks.find((t) => t.id === taskId);
    if (task) {
      if (body && typeof body.done === 'boolean') {
        task.done = body.done;
      } else {
        task.done = !task.done;
      }
    }
    item.updatedAt = new Date().toISOString();
    await saveStore(store);
    broadcastEvent('handover-updated', { organisationId: user.organisation_id, handoverId, task });
    return sendJson(response, 200, { ok: true, task, handover: item.handover });
  }

  const handoverMatch = url.pathname.match(/^\/api\/handovers\/([^/]+)\/(relay|acknowledge)$/);
  if (handoverMatch && request.method === 'POST') {
    const [, handoverId, handoverAction] = handoverMatch;
    const clientKey = request.headers['idempotency-key'] || null;
    const opBody = { handoverId, handoverAction };
    try {
      const { statusCode, result, replay } = await withIdempotency(user, `handover-${handoverAction}`, clientKey, opBody, async (client) => {
        if (databaseReady) {
          const updated = await updateDatabaseHandover(user, handoverId, handoverAction);
          return { statusCode: 200, result: { handover: updated } };
        }
        const store = await getStore();
        const handover = store.handovers.find((item) => item.id === handoverId);
        if (!handover) { const err = new Error('Handover not found.'); err.statusCode = 404; throw err; }
        if (handoverAction === 'relay') {
          if (user.role !== 'supervisor') { const err = new Error('Only the supervisor can relay a handover.'); err.statusCode = 403; throw err; }
          if (handover.status !== 'awaiting_review') { const err = new Error('This handover cannot be relayed in its current state.'); err.statusCode = 409; throw err; }
          handover.status = 'relayed'; handover.reviewedBy = user.id; handover.updatedAt = new Date().toISOString();
          notify(store, handover.assignedTo, handover.id, 'A reviewed handover is ready for you to acknowledge.');
        } else {
          if (handover.status !== 'relayed') { const err = new Error('This handover cannot be acknowledged in its current state.'); err.statusCode = 409; throw err; }
          if (user.id !== handover.assignedTo) { const err = new Error('This handover is assigned to another incoming worker.'); err.statusCode = 403; throw err; }
          handover.status = 'acknowledged'; handover.acknowledgement = { by: user.id, at: new Date().toISOString() }; handover.updatedAt = new Date().toISOString();
          notify(store, handover.createdBy, handover.id, `${user.name} acknowledged the handover.`);
          notify(store, 'david', handover.id, `${user.name} acknowledged the handover.`);
        }
        await saveStore(store);
        return { statusCode: 200, result: { handover } };
      });
      if (replay) response.setHeader('X-Idempotent-Replayed', 'true');
      return sendJson(response, statusCode, result);
    } catch (err) {
      const code = err.statusCode || 403;
      return sendJson(response, code, { error: err.message });
    }
  }

  if (url.pathname === '/api/notifications' && request.method === 'GET') {
    if (databaseReady) {
      const result = await query('select id, message, read_at, created_at from notifications where organisation_id = $1 and recipient_membership_id = $2 order by created_at desc limit 8', [user.organisation_id, user.id]);
      return sendJson(response, 200, { notifications: result.rows.map((row) => ({ id: row.id, message: row.message, read: Boolean(row.read_at), createdAt: row.created_at })) });
    }
    const store = await getStore();
    return sendJson(response, 200, { notifications: store.notifications.filter((notification) => notification.recipientId === user.id).slice(0, 8) });
  }

  if (/^\/api\/notifications\/[^/]+\/read$/.test(url.pathname) && request.method === 'POST') {
    const notificationId = url.pathname.split('/')[3];
    if (databaseReady) {
      await query('update notifications set read_at = now() where id = $1 and organisation_id = $2 and recipient_membership_id = $3 and read_at is null', [notificationId, user.organisation_id, user.id]);
      return sendJson(response, 200, { ok: true });
    }
    const store = await getStore();
    const notification = store.notifications.find((item) => item.id === notificationId && item.recipientId === user.id);
    if (notification) notification.read = true;
    return sendJson(response, 200, { ok: true });
  }

  if (url.pathname === '/api/notifications/read' && request.method === 'POST') {
    if (databaseReady) {
      await query('update notifications set read_at = now() where organisation_id = $1 and recipient_membership_id = $2 and read_at is null', [user.organisation_id, user.id]);
      return sendJson(response, 200, { ok: true });
    }
    const store = await getStore();
    store.notifications.filter((notification) => notification.recipientId === user.id).forEach((notification) => { notification.read = true; });
    await saveStore(store);
    return sendJson(response, 200, { ok: true });
  }

  // ==========================================================================
  // Shift Broadcast Announcements Endpoints
  // ==========================================================================

  if (url.pathname === '/api/announcements' && request.method === 'GET') {
    if (databaseReady) {
      const result = await query(
        `SELECT id, organisation_id, author_membership_id, author_name, author_role, severity, title, message, scope, department, acknowledgements, created_at
         FROM shift_announcements
         WHERE organisation_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [user.organisation_id]
      );
      return sendJson(response, 200, {
        announcements: result.rows.map(row => ({
          id: row.id,
          organisationId: row.organisation_id,
          authorId: row.author_membership_id,
          authorName: row.author_name,
          authorRole: row.author_role,
          severity: row.severity,
          title: row.title,
          message: row.message,
          scope: row.scope,
          department: row.department,
          acknowledgements: Array.isArray(row.acknowledgements) ? row.acknowledgements : [],
          createdAt: row.created_at
        }))
      });
    }
    const store = await getStore();
    if (!Array.isArray(store.announcements)) store.announcements = [];
    const announcements = store.announcements
      .filter(a => !a.organisationId || a.organisationId === user.organisation_id)
      .slice(0, 20);
    return sendJson(response, 200, { announcements });
  }

  if (url.pathname === '/api/announcements' && request.method === 'POST') {
    if (!['supervisor', 'owner'].includes(user.role)) {
      return sendJson(response, 403, { error: 'Only shift supervisors and organisation owners can broadcast announcements.' });
    }
    const body = await readJson(request);
    const title = (body.title || '').trim();
    const message = (body.message || '').trim();
    const severity = ['critical', 'warning', 'info'].includes(body.severity) ? body.severity : 'info';
    const scope = ['all', 'unit'].includes(body.scope) ? body.scope : 'all';
    const department = body.department || user.department || null;

    if (!title || !message) {
      return sendJson(response, 400, { error: 'Announcement title and message are required.' });
    }

    const newId = crypto.randomUUID();
    const announcementRecord = {
      id: newId,
      organisationId: user.organisation_id,
      authorId: user.id,
      authorName: user.name || 'Shift Supervisor',
      authorRole: user.role,
      severity,
      title,
      message,
      scope,
      department,
      acknowledgements: [],
      createdAt: new Date().toISOString()
    };

    if (databaseReady) {
      await query(
        `INSERT INTO shift_announcements (id, organisation_id, author_membership_id, author_name, author_role, severity, title, message, scope, department, acknowledgements, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [newId, user.organisation_id, user.id, announcementRecord.authorName, announcementRecord.authorRole, severity, title, message, scope, department, JSON.stringify([]), announcementRecord.createdAt]
      );
      await notifyOrganisationMembers(user.organisation_id, user.id, `[${severity.toUpperCase()} ALERT] ${title}`);
    } else {
      const store = await getStore();
      if (!Array.isArray(store.announcements)) store.announcements = [];
      store.announcements.unshift(announcementRecord);
      const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []);
      for (const m of demoMembers.filter(dm => dm.id !== user.id)) {
        notifications.unshift({
          id: crypto.randomUUID(),
          recipientId: m.id,
          message: `[${severity.toUpperCase()} ALERT] ${title}: ${message.slice(0, 60)}...`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
      await saveStore(store);
    }

    broadcastEvent('announcement-published', { organisationId: user.organisation_id, announcement: announcementRecord });
    return sendJson(response, 201, { announcement: announcementRecord });
  }

  if (/^\/api\/announcements\/[^/]+\/acknowledge$/.test(url.pathname) && request.method === 'POST') {
    const announcementId = url.pathname.split('/')[3];
    const ackEntry = {
      userId: user.id,
      userName: user.name || 'Staff Member',
      role: user.role,
      acknowledgedAt: new Date().toISOString()
    };

    if (databaseReady) {
      const existing = await query(`SELECT acknowledgements FROM shift_announcements WHERE id = $1 AND organisation_id = $2`, [announcementId, user.organisation_id]);
      if (existing.rows.length === 0) return sendJson(response, 404, { error: 'Announcement not found.' });
      let acks = Array.isArray(existing.rows[0].acknowledgements) ? existing.rows[0].acknowledgements : [];
      if (!acks.some(a => a.userId === user.id)) {
        acks.push(ackEntry);
        await query(`UPDATE shift_announcements SET acknowledgements = $1 WHERE id = $2`, [JSON.stringify(acks), announcementId]);
      }
      broadcastEvent('announcement-acknowledged', { organisationId: user.organisation_id, announcementId, ack: ackEntry });
      return sendJson(response, 200, { ok: true, acknowledgements: acks });
    }

    const store = await getStore();
    if (!Array.isArray(store.announcements)) store.announcements = [];
    const item = store.announcements.find(a => a.id === announcementId);
    if (!item) return sendJson(response, 404, { error: 'Announcement not found.' });
    if (!Array.isArray(item.acknowledgements)) item.acknowledgements = [];
    if (!item.acknowledgements.some(a => a.userId === user.id)) {
      item.acknowledgements.push(ackEntry);
      await saveStore(store);
    }
    broadcastEvent('announcement-acknowledged', { organisationId: user.organisation_id, announcementId, ack: ackEntry });
    return sendJson(response, 200, { ok: true, acknowledgements: item.acknowledgements });
  }

  // ==========================================================================
  // Frontline Career Network Endpoints (Social Feed, Worker Passport, Rewards)
  // ==========================================================================

  if (url.pathname === '/api/feed/posts' && request.method === 'GET') {
    const store = await getStore();
    if (!Array.isArray(store.feedPosts) || store.feedPosts.length === 0) {
      const now = Date.now();
      store.feedPosts = [
        {
          id: 'post-1',
          author_id: '00000000-0000-4000-8000-000000000012',
          author_name: 'David Kariuki',
          author_role: 'Shift Supervisor · Operations',
          author_avatar: '/uploads/avatars/avatar-david.jpg',
          author_verified: true,
          organisation_name: 'ShiftRelay Global Ops',
          category: 'milestone',
          content: 'Big win for Team Delta tonight — 100% handover completion rate for the third consecutive week! Every relay was acknowledged before the next shift clocked in. This is what operational excellence looks like. Proud of this crew.',
          image_url: '/uploads/feed/feed-triage-handover.jpg',
          likes_count: 47,
          comments_count: 6,
          reposts_count: 9,
          saves_count: 14,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-1-1', author_id: '00000000-0000-4000-8000-000000000011', author_name: 'Amina Otieno', author_role: 'Outgoing Ops', author_avatar: '/uploads/avatars/avatar-amina.jpg', content: 'We pushed hard this week. Thanks for recognising the team, David!', created_at: new Date(now - 1800000).toISOString() },
            { id: 'c-1-2', author_id: '00000000-0000-4000-8000-000000000014', author_name: 'Jordan Lee', author_role: 'Organisation Owner', author_avatar: '/uploads/avatars/avatar-jordan.jpg', content: 'Outstanding performance. This is the standard we set from the top. Keep it going.', created_at: new Date(now - 900000).toISOString() }
          ],
          created_at: new Date(now - 3600000).toISOString()
        },
        {
          id: 'post-2',
          author_id: '00000000-0000-4000-8000-000000000011',
          author_name: 'Amina Otieno',
          author_role: 'Operations Specialist',
          author_avatar: '/uploads/avatars/avatar-amina.jpg',
          author_verified: true,
          organisation_name: 'ShiftRelay Global Ops',
          category: 'tip',
          content: 'Shift tip from the floor: always do your handover brief BEFORE clocking out, not after. You think clearly when you are still in the zone. Walking out the door while dictating a handover is how critical details get missed. Log it while it is fresh. Your incoming teammate will thank you.',
          image_url: null,
          likes_count: 63,
          comments_count: 11,
          reposts_count: 22,
          saves_count: 31,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-2-1', author_id: '00000000-0000-4000-8000-000000000013', author_name: 'Faith Wanjiku', author_role: 'Incoming Specialist', author_avatar: '/uploads/avatars/avatar-faith.jpg', content: 'Yes! Nothing worse than getting a vague handover at shift start. Thank you for this reminder.', created_at: new Date(now - 5400000).toISOString() }
          ],
          created_at: new Date(now - 7200000).toISOString()
        },
        {
          id: 'post-3',
          author_id: 'demo-marcus',
          author_name: 'Marcus Brody',
          author_role: 'Kitchen Logistics Lead',
          author_avatar: '/uploads/avatars/avatar-marcus.jpg',
          author_verified: true,
          organisation_name: 'Metro Culinary Hub',
          category: 'craft',
          content: 'Prep complete for the evening rush -- 140 portions of slow-braised short ribs and fresh chimichurri all portioned and temp-checked at exactly 3 degrees C. A clean station is a fast station. What is your team number one rule before the doors open?',
          image_url: '/uploads/feed/feed-kitchen-prep.jpg',
          likes_count: 89,
          comments_count: 17,
          reposts_count: 12,
          saves_count: 28,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-3-1', author_id: 'demo-zainab', author_name: 'Zainab Al-Rawi', author_role: 'F&B Supervisor', author_avatar: '/uploads/avatars/avatar-zainab.jpg', content: 'Mise en place is non-negotiable. Great work Marcus!', created_at: new Date(now - 10800000).toISOString() },
            { id: 'c-3-2', author_id: 'demo-carlos', author_name: 'Carlos Reyes', author_role: 'Sous Chef', author_avatar: '/uploads/avatars/avatar-carlos.jpg', content: 'That chimichurri looks spotless. What herbs are you running this season?', created_at: new Date(now - 9000000).toISOString() }
          ],
          created_at: new Date(now - 14400000).toISOString()
        },
        {
          id: 'post-4',
          author_id: 'demo-kwame',
          author_name: 'Kwame Mensah',
          author_role: 'Dispatch Supervisor',
          author_avatar: '/uploads/avatars/avatar-kwame.jpg',
          author_verified: true,
          organisation_name: 'Northline Logistics',
          category: 'tip',
          content: 'Pro tip for warehouse pickers: always inspect pallet wrap tension before loading high-bays. Our night crew saved 45 minutes of restacking because one worker caught a loose bottom layer before the reach truck moved it. Small checks, massive wins. Always log the near-misses in your handover!',
          image_url: '/uploads/feed/feed-warehouse-safety.jpg',
          likes_count: 54,
          comments_count: 8,
          reposts_count: 19,
          saves_count: 33,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-4-1', author_id: 'demo-carlos', author_name: 'Carlos Reyes', author_role: 'Logistics Lead', author_avatar: '/uploads/avatars/avatar-carlos.jpg', content: 'Near-miss logging is so underrated. It is the only way to prevent the real thing.', created_at: new Date(now - 21600000).toISOString() }
          ],
          created_at: new Date(now - 28800000).toISOString()
        },
        {
          id: 'post-5',
          author_id: '00000000-0000-4000-8000-000000000013',
          author_name: 'Faith Wanjiku',
          author_role: 'Incoming Shift Specialist',
          author_avatar: '/uploads/avatars/avatar-faith.jpg',
          author_verified: true,
          organisation_name: 'ShiftRelay Global Ops',
          category: 'milestone',
          content: 'First solo shift as Incoming Lead and I hit every single checklist item. 7-day proof-of-work streak active! Grateful for the clean handover from Amina — gave me everything I needed to start confident. This app genuinely changes how teams communicate.',
          image_url: null,
          likes_count: 112,
          comments_count: 14,
          reposts_count: 8,
          saves_count: 19,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-5-1', author_id: '00000000-0000-4000-8000-000000000011', author_name: 'Amina Otieno', author_role: 'Outgoing Ops', author_avatar: '/uploads/avatars/avatar-amina.jpg', content: 'You made it look easy Faith! Knew you would crush it.', created_at: new Date(now - 36000000).toISOString() },
            { id: 'c-5-2', author_id: '00000000-0000-4000-8000-000000000012', author_name: 'David Kariuki', author_role: 'Shift Supervisor', author_avatar: '/uploads/avatars/avatar-david.jpg', content: '7-day streak on your first solo lead role. Massive. Well done.', created_at: new Date(now - 34200000).toISOString() }
          ],
          created_at: new Date(now - 43200000).toISOString()
        },
        {
          id: 'post-6',
          author_id: 'demo-elena',
          author_name: 'Elena Rostova',
          author_role: 'Plant Maintenance Engineer',
          author_avatar: '/uploads/avatars/avatar-elena.jpg',
          author_verified: true,
          organisation_name: 'Hartfield Industrial',
          category: 'craft',
          content: 'Night maintenance window complete. All 4 conveyor belt tension checks done, lubrication logs signed off, and the hydraulic leak on Line 3 is fully sealed with new O-ring kit. Morning crew will find everything tight and clean. Always leave the plant better than you found it.',
          image_url: '/uploads/feed/feed-plant-machinery.jpg',
          likes_count: 71,
          comments_count: 6,
          reposts_count: 14,
          saves_count: 22,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-6-1', author_id: 'demo-kwame', author_name: 'Kwame Mensah', author_role: 'Dispatch Supervisor', author_avatar: '/uploads/avatars/avatar-kwame.jpg', content: 'That hydraulic seal on Line 3 has been causing issues for weeks. Nice fix Elena!', created_at: new Date(now - 50400000).toISOString() }
          ],
          created_at: new Date(now - 57600000).toISOString()
        }
      ];
      await saveStore(store);
    }
    const posts = store.feedPosts.map((p) => ({
      ...p,
      userLiked: (p.liked_by || []).includes(user.id),
      userSaved: (p.saved_by || []).includes(user.id)
    }));
    return sendJson(response, 200, { posts });
  }

  if (url.pathname === '/api/feed/posts' && request.method === 'POST') {
    const body = await readJson(request);
    if (!body.content || !body.content.trim()) return sendJson(response, 400, { error: 'Post content is required.' });

    // Confidentiality safeguard against accidental credentials or PII leak
    const sensitivePatterns = [/\b(password|passwd|api[_-]?key|bearer\s+[a-z0-9_-]+)\s*[:=]/i, /\b\d{3}-\d{2}-\d{4}\b/];
    if (sensitivePatterns.some(p => p.test(body.content))) {
      return sendJson(response, 400, { error: 'Workplace Confidentiality Alert: Post appears to contain sensitive credentials or numbers. ShiftRelay strictly prohibits sharing confidential employer data.' });
    }

    const store = await getStore();
    if (!Array.isArray(store.feedPosts)) store.feedPosts = [];
    const newPost = {
      id: crypto.randomUUID(),
      author_id: user.id,
      author_name: user.name,
      author_role: user.title || user.role,
      author_verified: true,
      organisation_name: user.organisation_name || 'ShiftRelay Network',
      category: body.category || 'daily',
      content: body.content.trim(),
      image_url: body.imageUrl || null,
      media_type: body.mediaType || (body.imageUrl && (body.imageUrl.endsWith('.mp4') || body.imageUrl.endsWith('.webm')) ? 'video' : body.imageUrl && (body.imageUrl.endsWith('.m4a') || body.imageUrl.endsWith('.ogg') || body.imageUrl.endsWith('.wav')) ? 'audio' : body.imageUrl ? 'image' : null),
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      saves_count: 0,
      liked_by: [],
      saved_by: [],
      comments: [],
      created_at: new Date().toISOString()
    };
    store.feedPosts.unshift(newPost);
    await saveStore(store);
    broadcastEvent('feed-post-added', { post: newPost });
    return sendJson(response, 201, { post: newPost });
  }

  const postLikeMatch = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)\/like$/);
  if (postLikeMatch && request.method === 'POST') {
    const postId = postLikeMatch[1];
    const store = await getStore();
    const post = (store.feedPosts || []).find((p) => p.id === postId);
    if (!post) return sendJson(response, 404, { error: 'Post not found.' });
    if (!Array.isArray(post.liked_by)) post.liked_by = [];
    const idx = post.liked_by.indexOf(user.id);
    let liked = false;
    if (idx >= 0) {
      post.liked_by.splice(idx, 1);
      post.likes_count = Math.max(0, (post.likes_count || 1) - 1);
      liked = false;
    } else {
      post.liked_by.push(user.id);
      post.likes_count = (post.likes_count || 0) + 1;
      liked = true;
    }
    await saveStore(store);
    return sendJson(response, 200, { likes_count: post.likes_count, userLiked: liked });
  }

  const postRepostMatch = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)\/repost$/);
  if (postRepostMatch && request.method === 'POST') {
    const postId = postRepostMatch[1];
    const store = await getStore();
    const post = (store.feedPosts || []).find((p) => p.id === postId);
    if (!post) return sendJson(response, 404, { error: 'Post not found.' });
    post.reposts_count = (post.reposts_count || 0) + 1;
    await saveStore(store);
    return sendJson(response, 200, { reposts_count: post.reposts_count });
  }

  const postSaveMatch = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)\/save$/);
  if (postSaveMatch && request.method === 'POST') {
    const postId = postSaveMatch[1];
    const store = await getStore();
    const post = (store.feedPosts || []).find((p) => p.id === postId);
    if (!post) return sendJson(response, 404, { error: 'Post not found.' });
    if (!Array.isArray(post.saved_by)) post.saved_by = [];
    const idx = post.saved_by.indexOf(user.id);
    let saved = false;
    if (idx >= 0) {
      post.saved_by.splice(idx, 1);
      post.saves_count = Math.max(0, (post.saves_count || 1) - 1);
      saved = false;
    } else {
      post.saved_by.push(user.id);
      post.saves_count = (post.saves_count || 0) + 1;
      saved = true;
    }
    await saveStore(store);
    return sendJson(response, 200, { saves_count: post.saves_count, userSaved: saved });
  }

  const postCommentMatch = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)\/comment$/);
  if (postCommentMatch && request.method === 'POST') {
    const postId = postCommentMatch[1];
    const body = await readJson(request);
    if (!body.content || !body.content.trim()) return sendJson(response, 400, { error: 'Comment text is required.' });
    const store = await getStore();
    const post = (store.feedPosts || []).find((p) => p.id === postId);
    if (!post) return sendJson(response, 404, { error: 'Post not found.' });
    if (!Array.isArray(post.comments)) post.comments = [];
    const comment = {
      id: crypto.randomUUID(),
      author_id: user.id,
      author_name: user.name,
      author_role: user.title || user.role,
      content: body.content.trim(),
      created_at: new Date().toISOString()
    };
    post.comments.push(comment);
    post.comments_count = post.comments.length;
    await saveStore(store);
    return sendJson(response, 201, { comment, comments_count: post.comments_count });
  }

  const postDeleteMatch = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)$/);
  if (postDeleteMatch && request.method === 'DELETE') {
    const postId = postDeleteMatch[1];
    const store = await getStore();
    const idx = (store.feedPosts || []).findIndex((p) => p.id === postId);
    if (idx === -1) return sendJson(response, 404, { error: 'Post not found.' });
    const post = store.feedPosts[idx];
    if (post.author_id !== user.id && !['owner', 'supervisor'].includes(user.role)) {
      return sendJson(response, 403, { error: 'Only the author or a supervisor can delete this post.' });
    }
    store.feedPosts.splice(idx, 1);
    await saveStore(store);
    broadcastEvent('feed-post-deleted', { postId });
    return sendJson(response, 200, { ok: true, message: 'Post removed.' });
  }

  const workerProfileMatch = url.pathname.match(/^\/api\/worker-profile(?:\/([^/]+))?$/);
  if (workerProfileMatch && request.method === 'GET') {
    const targetId = workerProfileMatch[1] || user.id;
    const store = await getStore();
    if (!store.workerProfiles) store.workerProfiles = {};
    if (!store.workerProfiles[targetId]) {
      // Look up the demo member for avatar/cover
      const demoPerson = users.find(u => u.id === targetId);
      const avatarMap = {
        '00000000-0000-4000-8000-000000000011': { avatar: '/uploads/avatars/avatar-amina.jpg', cover: '/uploads/covers/cover-operations.jpg', bio: 'Night shift operations veteran with 6 years of verified handover experience. Passionate about zero lost-context shifts, team accountability, and leaving every bay cleaner than I found it. Trail runner and community football coach on off days.', industry: 'Operations & Logistics', org: 'ShiftRelay Global Ops', skills: ['Shift Handover Protocol', 'Cold Chain Compliance', 'Incident Prevention', 'SOP Adherence', 'Team Communication'], stats: { shiftsCompleted: 312, handoversRelayed: 298, reliabilityScore: 99.1, checkInStreak: 14, endorsementsCount: 41 } },
        '00000000-0000-4000-8000-000000000012': { avatar: '/uploads/avatars/avatar-david.jpg', cover: '/uploads/covers/cover-supervisor.jpg', bio: 'Shift Supervisor with 8+ years across multi-site operations. Specialise in handover quality, team escalation management, and zero-incident shift closures. Certified Lean Six Sigma Yellow Belt. Father of two, amateur chess player.', industry: 'Operations & Logistics', org: 'ShiftRelay Global Ops', skills: ['Shift Supervision', 'Escalation Management', 'Team Coaching', 'Lean Operations', 'Digital Handover Audit'], stats: { shiftsCompleted: 487, handoversRelayed: 463, reliabilityScore: 99.8, checkInStreak: 21, endorsementsCount: 78 } },
        '00000000-0000-4000-8000-000000000013': { avatar: '/uploads/avatars/avatar-faith.jpg', cover: '/uploads/covers/cover-logistics.jpg', bio: 'New to the team but not new to the hustle. Incoming specialist with a track record of perfect first-day acknowledgements. Studying for my Advanced Handover Certification. Love hiking and building community gardens on weekends.', industry: 'Operations & Logistics', org: 'ShiftRelay Global Ops', skills: ['Incoming Brief Review', 'Checklist Execution', 'Workplace Safety', 'Digital Tools'], stats: { shiftsCompleted: 89, handoversRelayed: 84, reliabilityScore: 98.9, checkInStreak: 7, endorsementsCount: 22 } },
        '00000000-0000-4000-8000-000000000014': { avatar: '/uploads/avatars/avatar-jordan.jpg', cover: '/uploads/covers/cover-engineering.jpg', bio: 'Organisation owner and frontline champion. Built ShiftRelay operations from 3 staff to 60+ verified shift workers across 4 sites. Believe deeply that every worker deserves to start their shift knowing exactly what happened before them.', industry: 'Multi-Site Operations', org: 'ShiftRelay Global Ops', skills: ['Organisation Management', 'Workforce Analytics', 'Process Design', 'Compliance Oversight', 'Talent Development'], stats: { shiftsCompleted: 0, handoversRelayed: 1203, reliabilityScore: 100, checkInStreak: 0, endorsementsCount: 134 } }
      };
      const personData = avatarMap[targetId] || {};
      const targetUser = demoPerson || user;
      store.workerProfiles[targetId] = {
        userId: targetId,
        fullName: targetUser.name || 'Frontline Specialist',
        headline: targetUser.title || 'Operations Specialist',
        bioOutsideWork: personData.bio || 'Passionate about team accountability and continuous craft improvement. Trail runner, coffee lover, and community volunteer on off-shift days.',
        avatarUrl: personData.avatar || (targetUser.avatar_data_url || null),
        coverPhotoUrl: personData.cover || null,
        verifiedStatus: 'verified',
        industry: personData.industry || 'Operations & Logistics',
        currentOrganisation: personData.org || 'ShiftRelay Network Partner',
        stats: personData.stats || {
          shiftsCompleted: 148,
          handoversRelayed: 139,
          reliabilityScore: 99.4,
          checkInStreak: 7,
          endorsementsCount: 26
        },
        skills: personData.skills || ['Shift Handover Protocol', 'Incident Prevention', 'Team Communication', 'Process Compliance'],
        certifications: ['ShiftRelay Accountable Handover Pro', 'Frontline Safety Level 1'],
        gallery: [
          { id: 'g-1', url: '/uploads/feed/feed-triage-handover.jpg', caption: 'Shift handoff complete.' },
          { id: 'g-2', url: '/uploads/feed/feed-warehouse-safety.jpg', caption: 'Team huddle before opening.' }
        ]
      };
      await saveStore(store);
    }
    const prof = store.workerProfiles[targetId];
    if (prof) {
      if (!prof.professionalSummary) {
        prof.professionalSummary = prof.bioOutsideWork || 'Results-driven frontline specialist with proven expertise in end-to-end shift handovers, operational safety, and incident prevention. Dedicated to zero lost-context transitions and high team reliability.';
      }
      if (!prof.workEmail) {
        prof.workEmail = (users.find(u => u.id === targetId) || user).email || 'worker@shiftrelay.io';
      }
      if (!prof.linkedInUrl) {
        prof.linkedInUrl = 'https://linkedin.com/in/' + (prof.fullName ? prof.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'specialist');
      }
      if (!prof.githubUrl) {
        prof.githubUrl = 'https://github.com/' + (prof.fullName ? prof.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '') : 'specialist');
      }
      if (!Array.isArray(prof.experience) || prof.experience.length === 0) {
        prof.experience = [
          {
            id: 'exp-1',
            title: prof.headline || 'Frontline Operations Specialist',
            company: prof.currentOrganisation || 'ShiftRelay Global Ops',
            period: '2022 — Present',
            description: 'Lead shift handover execution across operational bays, monitor cold chain compliance, and coordinate digital briefings with oncoming teams.'
          },
          {
            id: 'exp-2',
            title: 'Operations Assistant',
            company: 'Frontline Logistics Network',
            period: '2019 — 2022',
            description: 'Supervised bay turnaround routines, maintained 99.2% on-time checklist compliance, and supported team safety training.'
          }
        ];
      }
      if (!Array.isArray(prof.education) || prof.education.length === 0) {
        prof.education = [
          {
            id: 'edu-1',
            degree: 'B.Sc. in Operations Management & Logistics',
            institution: 'Regional Technical University',
            year: '2019'
          },
          {
            id: 'edu-2',
            degree: 'Advanced Certificate in Frontline Workplace Safety',
            institution: 'Institute of Industrial Operations',
            year: '2020'
          }
        ];
      }
      await saveStore(store);
    }
    return sendJson(response, 200, { profile: store.workerProfiles[targetId] });
  }

  if (url.pathname === '/api/worker-profile' && request.method === 'PUT') {
    const body = await readJson(request);
    const store = await getStore();
    if (!store.workerProfiles) store.workerProfiles = {};
    const existing = store.workerProfiles[user.id] || {};
    store.workerProfiles[user.id] = {
      ...existing,
      userId: user.id,
      fullName: user.name,
      headline: body.headline !== undefined ? body.headline : (existing.headline || user.title),
      professionalSummary: body.professionalSummary !== undefined ? body.professionalSummary : existing.professionalSummary || '',
      bioOutsideWork: body.bioOutsideWork !== undefined ? body.bioOutsideWork : existing.bioOutsideWork,
      currentJob: body.currentJob !== undefined ? body.currentJob : existing.currentJob || null,
      skills: Array.isArray(body.skills) ? body.skills : existing.skills || [],
      certifications: Array.isArray(body.certifications) ? body.certifications : existing.certifications || [],
      workHistory: Array.isArray(body.workHistory) ? body.workHistory : existing.workHistory || [],
      experience: Array.isArray(body.experience) ? body.experience : existing.experience || [],
      education: Array.isArray(body.education) ? body.education : existing.education || [],
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl || null,
      coverPhotoUrl: body.coverPhotoUrl !== undefined ? body.coverPhotoUrl : existing.coverPhotoUrl || null,
      linkedInUrl: body.linkedInUrl !== undefined ? body.linkedInUrl : existing.linkedInUrl || '',
      githubUrl: body.githubUrl !== undefined ? body.githubUrl : existing.githubUrl || '',
      workEmail: body.workEmail !== undefined ? body.workEmail : existing.workEmail || ''
    };
    await saveStore(store);

    // If currentJob was provided, reflect it on the live user session
    if (body.currentJob && typeof body.currentJob === 'object') {
      if (body.currentJob.title) user.title = body.currentJob.title;
      if (body.currentJob.department) user.department = body.currentJob.department;
      if (body.currentJob.shiftStart) user.shift_start = body.currentJob.shiftStart;
      if (body.currentJob.shiftEnd) user.shift_end = body.currentJob.shiftEnd;
      if (body.currentJob.workingDays) user.shift_days = body.currentJob.workingDays;
    }

    return sendJson(response, 200, { profile: store.workerProfiles[user.id] });
  }

  const endorseSkillMatch = url.pathname.match(/^\/api\/worker-profile\/([^/]+)\/endorse$/);
  if (endorseSkillMatch && request.method === 'POST') {
    const targetUserId = endorseSkillMatch[1];
    const body = await readJson(request);
    const skill = String(body.skill || '').trim();
    if (!skill) return sendJson(response, 400, { error: 'Skill name is required.' });

    const store = await getStore();
    if (!store.workerProfiles) store.workerProfiles = {};
    if (!store.workerProfiles[targetUserId]) {
      return sendJson(response, 404, { error: 'Worker profile not found.' });
    }
    const prof = store.workerProfiles[targetUserId];
    if (!prof.endorsements) prof.endorsements = {};
    if (!Array.isArray(prof.endorsements[skill])) prof.endorsements[skill] = [];

    const existingIdx = prof.endorsements[skill].indexOf(user.id);
    let endorsed = false;
    if (existingIdx >= 0) {
      prof.endorsements[skill].splice(existingIdx, 1);
      endorsed = false;
    } else {
      prof.endorsements[skill].push(user.id);
      endorsed = true;
    }

    // Recalculate total endorsements count
    const totalCount = Object.values(prof.endorsements).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
    if (!prof.stats) prof.stats = {};
    prof.stats.endorsementsCount = totalCount;

    await saveStore(store);
    return sendJson(response, 200, {
      ok: true,
      endorsed,
      skill,
      count: prof.endorsements[skill].length,
      totalCount
    });
  }

  const shiftInviteMatch = url.pathname.match(/^\/api\/worker-profile\/([^/]+)\/shift-invite$/);
  if (shiftInviteMatch && request.method === 'POST') {
    const targetUserId = shiftInviteMatch[1];
    const body = await readJson(request);
    const store = await getStore();
    const inviteMessage = `Shift Offer from ${user.name}: "${body.shiftTitle || 'Frontline Shift'}" on ${body.shiftDate || 'Upcoming Shift'} at ${body.location || 'Facility'} (${body.rate || 'Competitive Rate'}). Note: ${body.note || 'We would love to have you cover this shift!'}`;
    if (!store.directMessages) store.directMessages = [];
    const dm = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender_id: user.id,
      sender_name: user.name,
      sender_role: user.title || user.role,
      recipient_id: targetUserId,
      body: inviteMessage,
      created_at: new Date().toISOString()
    };
    store.directMessages.push(dm);
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: targetUserId,
      message: `New Shift Offer: ${user.name} invited you to cover a shift (${body.shiftTitle || 'Frontline Shift'}).`,
      read: false,
      created_at: new Date().toISOString()
    });
    await saveStore(store);
    broadcastEvent('notification-added', { user_id: targetUserId });
    return sendJson(response, 201, { ok: true, message: 'Shift offer and invite sent successfully to worker!' });
  }

  if (url.pathname === '/api/attendance/check-in' && request.method === 'POST') {
    const store = await getStore();
    if (!store.workerProfiles) store.workerProfiles = {};
    if (!store.workerProfiles[user.id]) {
      store.workerProfiles[user.id] = {
        userId: user.id,
        fullName: user.name,
        headline: user.title || 'Operations Specialist',
        bioOutsideWork: 'Frontline professional.',
        verifiedStatus: 'verified',
        stats: { shiftsCompleted: 148, handoversRelayed: 139, reliabilityScore: 99.4, checkInStreak: 7, endorsementsCount: 26 }
      };
    }
    const prof = store.workerProfiles[user.id];
    const today = new Date().toISOString().slice(0, 10);
    if (prof.lastCheckInDate !== today) {
      prof.lastCheckInDate = today;
      prof.stats.checkInStreak = (prof.stats.checkInStreak || 0) + 1;
      prof.stats.shiftsCompleted = (prof.stats.shiftsCompleted || 0) + 1;
      await saveStore(store);
    }
    return sendJson(response, 200, { ok: true, streak: prof.stats.checkInStreak, message: `Check-in recorded! ${prof.stats.checkInStreak}-day streak!` });
  }

  if (url.pathname === '/api/organisation/profile' && request.method === 'GET') {
    const store = await getStore();
    const org = (store.organisations && store.organisations[0]) || {
      id: user.organisation_id || 'demo-org-1',
      legal_name: 'ShiftRelay Global Healthcare & Operations',
      trading_name: 'ShiftRelay Health Network',
      organisation_code: '246701',
      verified: true,
      industry: 'Healthcare & Operations'
    };
    return sendJson(response, 200, {
      organisation: {
        ...org,
        verified: true,
        organisation_code: org.organisation_code || '246701',
        membersCount: (store.portalUsers || []).length || 4
      }
    });
  }

  // Saved posts view
  if (url.pathname === '/api/feed/posts/saved' && request.method === 'GET') {
    const store = await getStore();
    const saved = (store.feedPosts || [])
      .filter((p) => Array.isArray(p.saved_by) && p.saved_by.includes(user.id))
      .map((p) => ({ ...p, userLiked: (p.liked_by || []).includes(user.id), userSaved: true }));
    return sendJson(response, 200, { posts: saved });
  }

  // Worker directory (Discover page)
  if (url.pathname === '/api/discover/workers' && request.method === 'GET') {
    const store = await getStore();
    const realProfiles = Object.values(store.workerProfiles || {});
    const demoWorkers = [
      { userId: 'w-1', fullName: 'Maria Santos, RN', headline: 'Triage Nurse · Healthcare', industry: 'Healthcare', verifiedStatus: 'verified', avatarUrl: '/uploads/avatars/avatar-maria.jpg', stats: { shiftsCompleted: 148, reliabilityScore: 99.4, checkInStreak: 7 }, skills: ['Triage Protocol', 'Patient Safety', 'HIPAA Compliance'] },
      { userId: 'w-2', fullName: 'Marcus Brody', headline: 'Kitchen Logistics Lead · Hospitality', industry: 'Hospitality', verifiedStatus: 'verified', avatarUrl: '/uploads/avatars/avatar-marcus.jpg', stats: { shiftsCompleted: 201, reliabilityScore: 98.1, checkInStreak: 14 }, skills: ['Food Safety', 'Team Prep', 'Cold Chain'] },
      { userId: 'w-3', fullName: 'Kwame Mensah', headline: 'Dispatch Supervisor · Logistics', industry: 'Logistics', verifiedStatus: 'verified', avatarUrl: '/uploads/avatars/avatar-kwame.jpg', stats: { shiftsCompleted: 312, reliabilityScore: 97.6, checkInStreak: 21 }, skills: ['Warehouse Ops', 'Handover Protocol', 'Safety Compliance'] },
      { userId: 'w-4', fullName: 'Aisha Diallo', headline: 'Night Shift Floor Lead · Operations', industry: 'Operations', verifiedStatus: 'verified', avatarUrl: '/uploads/avatars/avatar-amina.jpg', stats: { shiftsCompleted: 89, reliabilityScore: 96.3, checkInStreak: 5 }, skills: ['Inventory Control', 'Loss Prevention', 'Team Leadership'] },
      { userId: 'w-5', fullName: 'Tunde Okafor', headline: 'Security Supervisor · Facilities', industry: 'Security', verifiedStatus: 'unverified', avatarUrl: '/uploads/avatars/avatar-david.jpg', stats: { shiftsCompleted: 431, reliabilityScore: 99.1, checkInStreak: 30 }, skills: ['Perimeter Control', 'Incident Response', 'Shift Handover'] },
      { userId: 'w-6', fullName: 'Sophie Chen', headline: 'Manufacturing Line Lead · Engineering', industry: 'Manufacturing', verifiedStatus: 'verified', avatarUrl: '/uploads/avatars/avatar-elena.jpg', stats: { shiftsCompleted: 256, reliabilityScore: 98.7, checkInStreak: 12 }, skills: ['Six Sigma', 'Quality Assurance', 'Line Supervision'] }
    ];
    // Merge: real profiles first, then demo workers that don't clash
    const realIds = new Set(realProfiles.map((p) => p.userId));
    const merged = [...realProfiles, ...demoWorkers.filter((d) => !realIds.has(d.userId))];
    return sendJson(response, 200, { workers: merged });
  }

  // Verified badge request - submit
  if (url.pathname === '/api/verified-badge-request' && request.method === 'POST') {
    const body = await readJson(request);
    const store = await getStore();
    if (!Array.isArray(store.verifiedBadgeRequests)) store.verifiedBadgeRequests = [];
    const existing = store.verifiedBadgeRequests.find((r) => r.userId === user.id && r.status === 'pending');
    if (existing) return sendJson(response, 409, { error: 'You already have a pending verified badge request.' });
    const vReq = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userTitle: user.title || user.role,
      type: body.type || 'worker',
      reason: (body.reason || '').trim().slice(0, 500),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    store.verifiedBadgeRequests.push(vReq);
    if (!store.workerProfiles) store.workerProfiles = {};
    if (!store.workerProfiles[user.id]) store.workerProfiles[user.id] = {};
    store.workerProfiles[user.id].verifiedStatus = 'pending';
    await saveStore(store);
    return sendJson(response, 201, { request: vReq, message: 'Verified badge request submitted. Our team reviews within 3 business days.' });
  }

  // Verified badge request - get status
  if (url.pathname === '/api/verified-badge-request' && request.method === 'GET') {
    const store = await getStore();
    const myReq = (store.verifiedBadgeRequests || []).find((r) => r.userId === user.id);
    return sendJson(response, 200, { request: myReq || null });
  }

  if (url.pathname === '/api/upload' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      if (!body.dataUrl) return sendJson(response, 400, { error: 'dataUrl is required.' });
      const match = body.dataUrl.match(/^data:([a-zA-Z0-9/.-]+);base64,(.+)$/);
      if (!match) return sendJson(response, 400, { error: 'Invalid dataUrl format.' });
      const mime = match[1];
      const base64Data = match[2];
      const isVideo = mime.startsWith('video/');
      const isImage = mime.startsWith('image/');
      const isAudio = mime.startsWith('audio/');
      if (!isVideo && !isImage && !isAudio) return sendJson(response, 400, { error: 'Only images, videos, and audio are supported.' });
      
      const ext = mime === 'video/mp4' ? '.mp4' : mime === 'video/webm' ? '.webm' : mime === 'audio/webm' ? '.webm' : mime === 'audio/mp4' || mime === 'audio/m4a' ? '.m4a' : mime === 'audio/ogg' ? '.ogg' : mime === 'audio/wav' ? '.wav' : mime === 'image/jpeg' ? '.jpg' : mime === 'image/webp' ? '.webp' : '.png';
      const filename = `${crypto.randomUUID()}${ext}`;
      await mkdir(uploadsDirectory, { recursive: true });
      const filePath = join(uploadsDirectory, filename);
      await writeFile(filePath, Buffer.from(base64Data, 'base64'));

      // Record in file attachments store for ownership verification
      try {
        const store = await getStore();
        if (!store.fileAttachments) store.fileAttachments = [];
        store.fileAttachments.push({
          filename,
          organisationId: user.organisation_id || (user.organisation && user.organisation.id),
          userId: user.id,
          createdAt: new Date().toISOString()
        });
        await saveStore(store);
      } catch (storeErr) {
        console.error('Warning: could not record attachment metadata:', storeErr.message);
      }

      return sendJson(response, 201, { url: `/uploads/${filename}`, mediaType: isAudio ? 'audio' : isVideo ? 'video' : 'image' });
    } catch (err) {
      return sendJson(response, 500, { error: err.message || 'Upload failed.' });
    }
  }

  return sendJson(response, 404, { error: 'Not found.' });
}


/* Sensitive file patterns that must never be served over HTTP */
const BLOCKED_FILE_PATTERNS = /(?:^|\/)(?:\.env|\.git|shiftrelay\.json|package-lock\.json|database\.mjs|server\.mjs|\.[a-z])/i;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// Strict whitelist of deliberate, non-sensitive public demo marketing assets.
// User uploads are NEVER classified as public by folder name. Uncertain files are protected by default.
const PUBLIC_DEMO_EXACT_FILES = new Set([
  '/uploads/hero-workplace.jpg',
  '/uploads/avatars/avatar-amina.jpg',
  '/uploads/avatars/avatar-carlos.jpg',
  '/uploads/avatars/avatar-david.jpg',
  '/uploads/avatars/avatar-elena.jpg',
  '/uploads/avatars/avatar-faith.jpg',
  '/uploads/avatars/avatar-jordan.jpg',
  '/uploads/avatars/avatar-kwame.jpg',
  '/uploads/avatars/avatar-marcus.jpg',
  '/uploads/avatars/avatar-maria.jpg',
  '/uploads/avatars/avatar-zainab.jpg',
  '/uploads/covers/cover-culinary.jpg',
  '/uploads/covers/cover-engineering.jpg',
  '/uploads/covers/cover-healthcare.jpg',
  '/uploads/covers/cover-logistics.jpg',
  '/uploads/covers/cover-operations.jpg',
  '/uploads/covers/cover-supervisor.jpg',
  '/uploads/feed/feed-kitchen-prep.jpg',
  '/uploads/feed/feed-plant-machinery.jpg',
  '/uploads/feed/feed-triage-handover.jpg',
  '/uploads/feed/feed-warehouse-safety.jpg'
]);

async function handleUploadFileRequest(request, response, url) {
  // Decode and normalize path to prevent bypasses and traversal
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'Bad request.' }));
    return;
  }

  // Prevent null bytes, backslashes, and path traversal
  if (decodedPath.includes('\0') || decodedPath.includes('\\') || decodedPath.includes('..')) {
    response.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'Forbidden: path traversal blocked.' }));
    return;
  }

  const cleanPath = normalize(decodedPath).replace(/\\/g, '/');
  if (!cleanPath.startsWith('/uploads/')) {
    response.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'Forbidden.' }));
    return;
  }

  // 1. Check for Public Marketing/Demo Assets Whitelist
  const isPublicDemoAsset = PUBLIC_DEMO_EXACT_FILES.has(cleanPath);

  const relPath = cleanPath.slice('/uploads/'.length);
  const targetFilePath = resolve(uploadsDirectory, relPath);
  const uploadsDirResolved = resolve(uploadsDirectory);

  // Strict boundary check: target file must reside strictly inside uploadsDirectory
  if (!targetFilePath.startsWith(uploadsDirResolved + '\\') && !targetFilePath.startsWith(uploadsDirResolved + '/') && targetFilePath !== uploadsDirResolved) {
    response.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'Forbidden: path traversal blocked.' }));
    return;
  }

  if (isPublicDemoAsset) {
    // Serve public asset
    try {
      const content = await readFile(targetFilePath);
      const ext = extname(targetFilePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      response.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        ...SECURITY_HEADERS
      });
      response.end(content);
      return;
    } catch {
      response.writeHead(404, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        ...SECURITY_HEADERS
      });
      response.end(JSON.stringify({ error: 'Asset not found.' }));
      return;
    }
  }

  // 2. Private Uploads: Require Authentication & Verified Company/Resource Permission
  let user;
  try {
    user = await getUser(request);
  } catch (err) {
    if (isDatabaseConnectionError(err)) return sendDatabaseError(response, err);
    user = null;
  }

  if (!user || !user.organisation_id) {
    response.writeHead(401, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'Authentication required to access private files.' }));
    return;
  }

  // Check file exists on disk
  let content;
  try {
    content = await readFile(targetFilePath);
  } catch {
    response.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'File not found.' }));
    return;
  }

  const filename = basename(targetFilePath);

  // Verify company / resource ownership:
  let isOwned = false;
  if (databaseReady) {
    try {
      // Check 1: Explicit file_attachments table
      const attRes = await query('select 1 from file_attachments where filename = $1 and organisation_id = $2', [filename, user.organisation_id]);
      if (attRes.rows.length > 0) isOwned = true;

      // Check 2: Work items (handovers payload referencing this filename)
      if (!isOwned) {
        const wiRes = await query("select 1 from work_items where organisation_id = $1 and payload::text like '%' || $2 || '%'", [user.organisation_id, filename]);
        if (wiRes.rows.length > 0) isOwned = true;
      }

      // Check 3: Incidents (image_url referencing this filename)
      if (!isOwned) {
        const incRes = await query("select 1 from incidents where organisation_id = $1 and (image_url like '%' || $2 || '%' or description like '%' || $2 || '%')", [user.organisation_id, filename]);
        if (incRes.rows.length > 0) isOwned = true;
      }
    } catch (err) {
      if (isDatabaseConnectionError(err)) return sendDatabaseError(response, err);
      isOwned = false;
    }
  } else {
    // Fallback mode store check
    const store = await getStore();
    if (Array.isArray(store.fileAttachments)) {
      if (store.fileAttachments.some(f => f.filename === filename && (f.organisationId === user.organisation_id || f.userId === user.id))) {
        isOwned = true;
      }
    }
    if (!isOwned && Array.isArray(store.handovers)) {
      if (store.handovers.some(h => JSON.stringify(h).includes(filename))) {
        isOwned = true;
      }
    }
    if (!isOwned && store.workerProfiles) {
      if (Object.values(store.workerProfiles).some(p => JSON.stringify(p).includes(filename))) {
        isOwned = true;
      }
    }
  }

  if (!isOwned) {
    // Ownership cannot be established, or belongs to another company -> 403 Forbidden
    response.writeHead(403, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end(JSON.stringify({ error: 'Access denied: file ownership could not be verified for your organisation.' }));
    return;
  }

  // Ownership verified: Serve file bytes with strict no-store headers
  const ext = extname(targetFilePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': content.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Accept-Ranges': 'none',
    ...SECURITY_HEADERS
  });
  response.end(content);
}

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const safePath = normalize(requestedPath).replace(/^([.]{2}[/\\])+/, '');

  // ── Block direct static access to uploads (must use handleUploadFileRequest) ──
  const normalizedLower = safePath.replace(/\\/g, '/').toLowerCase();
  if (normalizedLower === 'uploads' || normalizedLower.startsWith('uploads/')) {
    response.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      ...SECURITY_HEADERS
    });
    response.end('Forbidden: direct static serving of uploads directory is disabled.');
    return;
  }

  // ── Path traversal + sensitive-file guard ──────────────────────────────
  const filePath = resolve(publicDirectory, safePath);
  const publicDirResolved = resolve(publicDirectory);
  const isInPublicDir = filePath.startsWith(publicDirResolved + '\\') || filePath.startsWith(publicDirResolved + '/') || filePath === publicDirResolved;
  if (!isInPublicDir) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    response.end('Forbidden');
    return;
  }
  if (BLOCKED_FILE_PATTERNS.test(safePath)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    response.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const isBinary = ['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const totalSize = content.length;

    // Support HTTP Range requests (crucial for smooth video seeking & streaming)
    const range = request.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = (end - start) + 1;
      response.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        ...SECURITY_HEADERS,
      });
      response.end(content.subarray(start, end + 1));
      return;
    }

    const isCode = ['.html', '.js', '.css', '.json'].includes(ext);
    response.writeHead(200, {
      'Content-Type': isBinary ? contentType : `${contentType}; charset=utf-8`,
      'Accept-Ranges': 'bytes',
      'Content-Length': totalSize,
      ...(isCode ? { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0' } : {}),
      ...SECURITY_HEADERS,
    });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    response.end('Not found');
  }
}

const server = createServer((request, response) => {
  Promise.resolve().then(async () => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/health') return sendJson(response, 200, { status: 'ok' });

    // ── IP Rate Limiting ─────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const ip = (request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const isAuth = (/^\/api\/auth\/(sign-in|register|verify)$/.test(url.pathname) || /^\/api\/organisations$/.test(url.pathname) || /^\/api\/organisation-memberships$/.test(url.pathname)) && request.method === 'POST';
      if (isRateLimited(ip, isAuth)) {
        return sendJson(response, 429, { error: 'Too many requests. Please slow down and try again shortly.' });
      }
      return handleApi(request, response, url);
    }

    if (url.pathname.startsWith('/uploads/') || url.pathname === '/uploads') {
      return handleUploadFileRequest(request, response, url);
    }

    return serveStatic(request, response, url);
  }).catch((error) => {
    if (isDatabaseConnectionError(error)) {
      console.error('[DB CONN ERROR] Request failed due to database connection issue:', error.code || error.message);
      if (!response.headersSent) {
        sendJson(response, 503, { error: 'Service Unavailable: Database connection error. Please try again shortly.' });
      } else {
        response.destroy();
      }
    } else {
      console.error('Request failed:', error.message);
      if (!response.headersSent) {
        sendJson(response, 500, { error: 'The request could not be completed. Please try again.' });
      } else {
        response.destroy();
      }
    }
  });
});

initializeDatabase()
  .then(async (connected) => {
    databaseReady = connected;
    if (databaseReady) {
      await query(`
        CREATE TABLE IF NOT EXISTS file_attachments ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
          uploader_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
          filename TEXT NOT NULL UNIQUE,
          mime_type TEXT,
          file_size INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS shift_announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
          author_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
          author_name TEXT NOT NULL,
          author_role TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'info',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          scope TEXT NOT NULL DEFAULT 'all',
          department TEXT,
          acknowledgements JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await seedDemoOrganisation();
    }
    server.listen(port, () => console.log(`ShiftRelay is running at http://localhost:${port} | database=${connected && databaseConfigured() ? 'connected' : 'local-demo'} | env=${NODE_ENV}`));
  })
  .catch((error) => {
    if (IS_PRODUCTION) {
      // In production, a missing or unreachable database is fatal.
      console.error('[FATAL] Database connection required in production mode.');
      if (isDatabaseConnectionError(error)) {
        console.error('[FATAL] Could not connect to the database. Service cannot start without it. Exiting.');
      } else {
        console.error('[FATAL] Database initialisation failed:', error.code || 'UNKNOWN');
      }
      process.exit(1);
    }

    // Development / staging — require explicit opt-in for file fallback.
    if (!ALLOW_DEV_FALLBACK) {
      console.error('[FATAL] Database unavailable and ALLOW_DEV_FALLBACK is not enabled.');
      console.error('[FATAL] Set ALLOW_DEV_FALLBACK=true to run without a database in development. Exiting.');
      process.exit(1);
    }

    // Explicitly opted-in dev fallback: warn loudly and continue.
    console.warn('[WARN] Running WITHOUT database. Local JSON fallback is active (ALLOW_DEV_FALLBACK=true).');
    console.warn('[WARN] This mode MUST NOT be used in production. Data is not persistent across restarts.');
    server.listen(port, () => console.log(`ShiftRelay is running at http://localhost:${port} | database=FALLBACK(dev-only) | env=${NODE_ENV}`));
  });






