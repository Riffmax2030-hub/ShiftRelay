import { createServer } from 'node:http';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { databaseConfigured, demoMembers, demoOrganisation, initializeDatabase, query, seedDemoOrganisation } from './database.mjs';

function loadEnvironment() {
  try {
    for (const entry of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = entry.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

loadEnvironment();
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

async function getStore() {
  await mkdir(dataDirectory, { recursive: true });
  try { return JSON.parse(await readFile(dataPath, 'utf8')); }
  catch { return { handovers: [], notifications: [] }; }
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
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  });
  response.end(JSON.stringify(payload));
}
function broadcastEvent(event, payload) { const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`; for (const client of eventClients) { if (payload.organisationId && client.organisationId !== payload.organisationId) continue; try { client.response.write(message); } catch { eventClients.delete(client); } } }

/* ── IP Rate Limiter (sliding window, in-memory) ────────────────────────────
   Protects all /api/ routes from brute-force and DDoS. Up to 120 requests
   per 60 seconds per IP. Sensitive auth endpoints get a tighter 10/min cap.
   ──────────────────────────────────────────────────────────────────────── */
const rateLimitBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_GENERAL = 120;
const RATE_LIMIT_AUTH = 10;

function isRateLimited(ip, isAuth = false) {
  const now = Date.now();
  const limit = isAuth ? RATE_LIMIT_AUTH : RATE_LIMIT_GENERAL;
  if (!rateLimitBuckets.has(ip)) rateLimitBuckets.set(ip, []);
  const timestamps = rateLimitBuckets.get(ip).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  rateLimitBuckets.set(ip, timestamps);
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
    await query('insert into user_sessions (id, user_id, membership_id, expires_at) values ($1,$2,$3,now() + interval \'7 days\')', [id, userId, membershipId]);
  } else {
    const store = await getStore();
    if (!Array.isArray(store.userSessions)) store.userSessions = [];
    store.userSessions.push({ id, userId, membershipId, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await saveStore(store);
  }
  return id;
}

async function getUser(request) {
  const token = sessionId(request);
  if (token) {
    if (databaseReady) {
      const result = await query(`select m.id, u.full_name as name, u.email, u.time_zone, u.country_code, u.avatar_data_url, m.role, m.title, m.department, m.shift_start, m.shift_end, m.shift_days, m.status, m.organisation_id from user_sessions s join memberships m on m.id = s.membership_id join portal_users u on u.id = s.user_id where s.id = $1 and s.expires_at > now()`, [token]);
      if (result.rows[0]?.status === 'active') return result.rows[0];
    } else {
      const store = await getStore();
      const session = (store.userSessions || []).find((s) => s.id === token && new Date(s.expiresAt) > new Date());
      if (session) {
        const member = (store.memberships || []).find((m) => m.id === session.membershipId);
        const user = (store.portalUsers || []).find((u) => u.id === session.userId);
        if (member && user) {
          return { id: member.id, name: user.full_name, email: user.email, role: member.role, title: member.title, department: member.department, organisation_id: member.organisation_id, status: member.status };
        }
      }
    }
  }
  const demoUser = users.find((user) => user.id === request.headers['x-shiftrelay-user']);
  return demoUser ? { ...demoUser, organisation_id: demoOrganisation.id } : null;
}

function notify(store, recipientId, handoverId, message) {
  store.notifications.unshift({ id: crypto.randomUUID(), recipientId, handoverId, message, read: false, createdAt: new Date().toISOString() });
}

async function databaseHandovers(user) {
  const result = await query(`select wi.id, wi.status, wi.payload, wi.created_at, wi.updated_at, wi.acknowledged_at, wi.created_by_membership_id, wi.assigned_to_membership_id, reviewer.full_name as reviewer_name from work_items wi left join portal_users reviewer on reviewer.id = wi.created_by_membership_id where wi.organisation_id = $1 and ($2 in ('supervisor', 'owner') or wi.created_by_membership_id = $3 or wi.assigned_to_membership_id = $3) order by wi.created_at desc`, [user.organisation_id, user.role, user.id]);
  return result.rows.map((row) => ({ id: row.id, createdBy: row.created_by_membership_id, assignedTo: row.assigned_to_membership_id, handover: row.payload, status: row.status, acknowledgement: row.acknowledged_at ? { by: row.assigned_to_membership_id, at: row.acknowledged_at } : null, createdAt: row.created_at, updatedAt: row.updated_at, reviewedBy: row.reviewer_name }));
}

async function createDatabaseHandover(user, body) {
  const runId = crypto.randomUUID();
  const workItemId = crypto.randomUUID();
  const supervisor = (await query("select id from memberships where organisation_id = $1 and role = 'supervisor' and status = 'active' order by created_at limit 1", [user.organisation_id])).rows[0];
  const incomingWorker = (await query("select id from memberships where organisation_id = $1 and role = 'incoming' and status = 'active' order by created_at limit 1", [user.organisation_id])).rows[0];
  if (!supervisor || !incomingWorker) throw new Error('Your organisation needs an active supervisor and incoming worker before sending handovers.');
  const requested = body.assignedTo ? (await query('select id from memberships where id = $1 and organisation_id = $2 and role = \'incoming\' and status = \'active\'', [body.assignedTo, user.organisation_id])).rows[0] : null;
  const assignedTo = requested?.id || incomingWorker.id;
  await query('insert into workflow_runs (id, organisation_id, created_by_membership_id, status, priority) values ($1, $2, $3, $4, $5)', [runId, user.organisation_id, user.id, 'in_progress', 'normal']);
  await query('insert into work_items (id, workflow_run_id, organisation_id, assigned_to_membership_id, created_by_membership_id, item_type, title, status, priority, payload) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)', [workItemId, runId, user.organisation_id, assignedTo, user.id, 'handover', body.handover.summary, 'awaiting_review', 'normal', JSON.stringify(body.handover)]);
  await query('insert into work_events (id, organisation_id, workflow_run_id, work_item_id, actor_membership_id, event_type, message) values ($1, $2, $3, $4, $5, $6, $7)', [crypto.randomUUID(), user.organisation_id, runId, workItemId, user.id, 'submitted', `${user.name} submitted a handover for review.`]);
  await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), user.organisation_id, supervisor.id, workItemId, `${user.name} created a handover for review.`]);
  return (await databaseHandovers(user)).find((item) => item.id === workItemId);
}

async function updateDatabaseHandover(user, id, action) {
  const item = (await query('select * from work_items where id = $1 and organisation_id = $2', [id, user.organisation_id])).rows[0];
  if (!item) throw new Error('Handover not found.');
  if (action === 'relay') {
    if (user.role !== 'supervisor') throw new Error('Only a supervisor can approve and relay this handover.');
    await query('update work_items set status = $1, updated_at = now() where id = $2', ['relayed', id]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), user.organisation_id, item.assigned_to_membership_id, id, 'A supervisor approved a handover for your shift.']);
  } else {
    if (user.id !== item.assigned_to_membership_id) throw new Error('This handover is assigned to another worker.');
    await query('update work_items set status = $1, acknowledged_at = now(), updated_at = now() where id = $2', ['acknowledged', id]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), user.organisation_id, item.created_by_membership_id, id, `${user.name} acknowledged the handover.`]);
  }
  return (await databaseHandovers(user)).find((handover) => handover.id === id);
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

  const userId = crypto.randomUUID();
  const hashedPassword = await hashPassword(body.password);

  if (databaseReady) {
    await query('insert into portal_users (id, full_name, email, phone, password_hash, country_code, time_zone, employee_reference) values ($1,$2,$3,$4,$5,$6,$7,$8)', [userId, body.fullName, body.email.toLowerCase(), body.phone || null, hashedPassword, body.countryCode || null, body.timeZone || 'UTC', body.employeeReference || null]);
    await query('insert into memberships (id, organisation_id, user_id, role, title, department, status) values ($1,$2,$1,$3,$4,$5,$6)', [userId, orgId, body.role || 'worker', body.position, body.department || null, 'active']);
    const owners = await query('select id from memberships where organisation_id = $1 and role in ($2,$3)', [orgId, 'owner', 'supervisor']);
    for (const owner of owners.rows) await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [crypto.randomUUID(), orgId, owner.id, `${body.fullName} joined your workplace as ${body.position}.`]);
  } else {
    const store = await getStore();
    if (!Array.isArray(store.portalUsers)) store.portalUsers = [];
    if (!Array.isArray(store.memberships)) store.memberships = [];
    store.portalUsers.push({ id: userId, full_name: body.fullName, email: body.email.toLowerCase(), password_hash: hashedPassword, employee_reference: body.employeeReference || null });
    store.memberships.push({ id: userId, organisation_id: orgId, user_id: userId, role: body.role || 'incoming', title: body.position, department: body.department || 'Operations', status: 'active' });
    const notifications = Array.isArray(store.notifications) ? store.notifications : (store.notifications = []);
    notifications.unshift({ id: crypto.randomUUID(), recipientId: 'david', message: `${body.fullName} joined your organisation as ${body.position}.`, createdAt: new Date().toISOString(), read: false });
    await saveStore(store);
  }

  return { organisationName: orgName, membershipId: userId, status: 'active' };
}

async function pendingMemberships(owner) {
  const result = await query(`select m.id, u.full_name, u.email, m.title, m.department, m.created_at from memberships m join portal_users u on u.id = m.user_id where m.organisation_id = $1 and m.status = 'pending_approval' order by m.created_at asc`, [owner.organisation_id]);
  const workflows = await query('select id, name, description from workflow_templates where organisation_id = $1 order by created_at asc', [owner.organisation_id]);
  return { requests: result.rows.map((row) => ({ id: row.id, name: row.full_name, email: row.email, title: row.title, department: row.department, createdAt: row.created_at })), workflows: workflows.rows };
}

async function reviewMembership(owner, membershipId, body) {
  const membership = (await query('select id, user_id, organisation_id from memberships where id = $1 and organisation_id = $2 and status = $3', [membershipId, owner.organisation_id, 'pending_approval'])).rows[0];
  if (!membership) throw new Error('Pending access request not found.');
  if (body.decision === 'reject') {
    await query('update memberships set status = $1 where id = $2', ['rejected', membershipId]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [crypto.randomUUID(), owner.organisation_id, membershipId, 'Your ShiftRelay access request was not approved. Contact your organisation administrator for details.']);
    return { status: 'rejected' };
  }
  const allowedRoles = ['outgoing', 'incoming', 'supervisor', 'workforce_admin'];
  if (!allowedRoles.includes(body.role)) throw new Error('Select an approved workplace role.');
  if (body.workflowTemplateId) {
    const workflow = (await query('select id from workflow_templates where id = $1 and organisation_id = $2', [body.workflowTemplateId, owner.organisation_id])).rows[0];
    if (!workflow) throw new Error('Selected workflow does not belong to this organisation.');
  }
  await query('update memberships set status = $1, role = $2, workflow_template_id = $3, shift_start = $4, shift_end = $5, shift_days = $6::jsonb where id = $7', ['active', body.role, body.workflowTemplateId || null, body.shiftStart || null, body.shiftEnd || null, JSON.stringify(Array.isArray(body.shiftDays) ? body.shiftDays : []), membershipId]);
  await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [crypto.randomUUID(), owner.organisation_id, membershipId, `Your access is approved. You are assigned as ${body.role}.`]);
  return { status: 'active', role: body.role };
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
  for (const owner of owners.rows) await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [crypto.randomUUID(), organisationId, owner.id, message]);
}
async function notifyMembership(organisationId, membershipId, message) {
  await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [crypto.randomUUID(), organisationId, membershipId, message]);
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
  if (databaseReady) {
    const result = await query(`select u.id as user_id, u.password_hash, u.time_zone, u.country_code, u.avatar_data_url, m.id, u.full_name as name, u.email, m.role, m.title, m.department, m.shift_start, m.shift_end, m.shift_days, m.status, m.organisation_id from portal_users u join memberships m on m.user_id = u.id where lower(u.email) = lower($1) order by m.created_at desc limit 1`, [body.email]);
    const member = result.rows[0];
    if (!member || !(await passwordMatches(body.password, member.password_hash))) throw new Error('Invalid email or password.');
    if (member.status !== 'active') throw new Error('Your workplace access is waiting for approval.');
    return { sessionId: await createSession(member.user_id, member.id), user: { id: member.id, name: member.name, email: member.email, role: member.role, title: member.title, department: member.department, avatar_data_url: member.avatar_data_url, time_zone: member.time_zone, country_code: member.country_code, shift_start: member.shift_start, shift_end: member.shift_end, shift_days: member.shift_days, organisation_id: member.organisation_id } };
  } else {
    const store = await getStore();
    const user = (store.portalUsers || []).find((u) => u.email.toLowerCase() === body.email.toLowerCase());
    if (!user || !(await passwordMatches(body.password, user.password_hash))) throw new Error('Invalid email or password.');
    const member = (store.memberships || []).find((m) => m.user_id === user.id);
    if (!member || member.status !== 'active') throw new Error('Your workplace access is waiting for approval.');
    return { sessionId: await createSession(user.id, member.id), user: { id: member.id, name: user.full_name, email: user.email, role: member.role, title: member.title, department: member.department, organisation_id: member.organisation_id } };
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
  if (!process.env.GEMINI_API_KEY) throw new Error('AI_NOT_CONFIGURED');
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

async function handleApi(request, response, url) {
  const user = await getUser(request);
  const demoMode = process.env.DEMO_MODE !== 'false';
  if (url.pathname === '/api/users' && request.method === 'GET') {
    return sendJson(response, 200, { users: demoMode ? users.map((demoUser) => ({ ...demoUser, organisation_id: demoOrganisation.id })) : [] });
  }
  if (url.pathname === '/api/config' && request.method === 'GET') {
    return sendJson(response, 200, {
      aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      assistantConfigured: Boolean((process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) || process.env.GEMINI_API_KEY),
      transcriptionConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_TRANSCRIPTION_MODEL),
      databaseReady,
      demoMode
    });
  }
  if (url.pathname === '/api/config/demo-mode' && request.method === 'POST') {
    const body = await readJson(request);
    process.env.DEMO_MODE = String(Boolean(body.demoMode));
    return sendJson(response, 200, { demoMode: process.env.DEMO_MODE !== 'false' });
  }
  if (url.pathname === '/api/events' && request.method === 'GET') { const eventUser = user || (url.searchParams.get('user') ? { ...users.find((demoUser) => demoUser.id === url.searchParams.get('user')), organisation_id: demoOrganisation.id } : null); if (!eventUser?.id) return sendJson(response, 401, { error: 'Select a ShiftRelay role to continue.' }); response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }); response.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`); const client = { response, userId: eventUser.id, organisationId: eventUser.organisation_id }; eventClients.add(client); const heartbeat = setInterval(() => { try { response.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); eventClients.delete(client); } }, 25000); request.on('close', () => { clearInterval(heartbeat); eventClients.delete(client); }); return; }
  if (url.pathname === '/api/auth/session' && request.method === 'GET') return user ? sendJson(response, 200, { user }) : sendJson(response, 401, { error: 'Sign in to continue.' });
  if (url.pathname === '/api/account-deletion-requests' && request.method === 'POST') {
    try {
      const body = await readJson(request); const email = String(body.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: 'Enter the email address used for your ShiftRelay account.' });
      if (databaseReady) await query('insert into account_deletion_requests (id, email, reason) values ($1,$2,$3)', [crypto.randomUUID(), email, String(body.reason || '').slice(0, 1000) || null]);
      return sendJson(response, 201, { ok: true });
    } catch (error) { return sendJson(response, 400, { error: error.message || 'Unable to submit your request.' }); }
  }
  if (url.pathname === '/api/auth/sign-in' && request.method === 'POST') {
    try { const session = await signIn(await readJson(request)); response.setHeader('Set-Cookie', sessionCookie(session.sessionId)); return sendJson(response, 200, { user: session.user }); }
    catch (error) { return sendJson(response, 401, { error: error.message }); }
  }
  if (url.pathname === '/api/auth/sign-out' && request.method === 'POST') {
    const token = sessionId(request); if (token && databaseReady) await query('delete from user_sessions where id = $1', [token]); response.setHeader('Set-Cookie', sessionCookie('', 0)); return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === '/api/auth/password' && request.method === 'PUT') {
    try {
      if (!user || !databaseReady) throw new Error('Password changes require a signed-in organisation account.');
      const body = await readJson(request);
      if (!body.currentPassword || !body.newPassword || body.newPassword.length < 10) throw new Error('Use a new password with at least 10 characters.');
      const account = (await query('select u.id, u.password_hash from portal_users u join memberships m on m.user_id = u.id where m.id = $1', [user.id])).rows[0];
      if (!account || !(await passwordMatches(body.currentPassword, account.password_hash))) throw new Error('Your current password is not correct.');
      await query('update portal_users set password_hash = $1 where id = $2', [await hashPassword(body.newPassword), account.id]);
      return sendJson(response, 200, { ok: true });
    } catch (error) { return sendJson(response, 400, { error: error.message }); }
  }
  if (url.pathname === '/api/organisations' && request.method === 'POST') {
    try { const body = await readJson(request); if (!body.legalName || !body.workEmail || !body.ownerName || typeof body.password !== 'string' || body.password.length < 10) return sendJson(response, 400, { error: 'Organisation name, owner name, work email, and a password of at least 10 characters are required.' }); const organisation = await registerOrganisation(body); const session = await createSession(organisation.ownerMembershipId, organisation.ownerMembershipId); response.setHeader('Set-Cookie', sessionCookie(session)); return sendJson(response, 201, { organisation, user: { id: organisation.ownerMembershipId, name: body.ownerName, email: body.workEmail, role: 'owner', title: 'Organisation owner', department: 'Leadership', organisationId: organisation.organisationId } }); }
    catch (error) { return sendJson(response, 500, { error: error.message }); }
  }
  if (url.pathname === '/api/organisation-memberships' && request.method === 'POST') {
    try { const body = await readJson(request); if (!body.organisationCode || !body.fullName || !body.email || !body.position || typeof body.password !== 'string' || body.password.length < 10) return sendJson(response, 400, { error: 'Organisation code, name, position, and a password of at least 10 characters are required.' }); return sendJson(response, 201, { membership: await enrolWorker(body) }); }
    catch (error) { return sendJson(response, 400, { error: error.message }); }
  }
  if (!user) return sendJson(response, 401, { error: 'Select a ShiftRelay role to continue.' });

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
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can schedule shifts.' }); const body = await readJson(request); if (!body.membershipId || !body.startsAt || !body.endsAt) return sendJson(response, 400, { error: 'Worker, shift start, and shift end are required.' }); const id = crypto.randomUUID(); await query('insert into scheduled_shifts (id, organisation_id, membership_id, starts_at, ends_at) values ($1,$2,$3,$4,$5)', [id, user.organisation_id, body.membershipId, body.startsAt, body.endsAt]); await audit(user.organisation_id, user.id, 'shift_scheduled', 'scheduled_shift', id, 'Shift added to calendar.'); return sendJson(response, 201, { id });
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
    if (!databaseReady) return sendJson(response, 200, { requests: [] }); const where = user.role === 'owner' ? 'organisation_id = $1' : 'organisation_id = $1 and membership_id = $2'; const values = user.role === 'owner' ? [user.organisation_id] : [user.organisation_id, user.id]; const requests = await query(`select * from leave_requests where ${where} order by created_at desc`, values); return sendJson(response, 200, { requests: requests.rows });
  }
  if (url.pathname === '/api/leave-requests' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Leave requests require an organisation account.' }); const body = await readJson(request); if (!body.startsOn || !body.endsOn) return sendJson(response, 400, { error: 'Leave dates are required.' }); const id = crypto.randomUUID(); await query('insert into leave_requests (id, organisation_id, membership_id, starts_on, ends_on, reason) values ($1,$2,$3,$4,$5,$6)', [id, user.organisation_id, user.id, body.startsOn, body.endsOn, body.reason || null]); await audit(user.organisation_id, user.id, 'leave_requested', 'leave_request', id, 'Leave request submitted.'); await notifyOrganisationOwners(user.organisation_id, `${user.name} requested leave from ${body.startsOn} to ${body.endsOn}.`); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/leave-requests/review' && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can review leave.' }); const { id, decision } = await readJson(request); if (!['approved', 'rejected'].includes(decision)) return sendJson(response, 400, { error: 'Invalid leave decision.' }); await query('update leave_requests set status = $1, reviewed_by_membership_id = $2 where id = $3 and organisation_id = $4', [decision, user.id, id, user.organisation_id]); await audit(user.organisation_id, user.id, 'leave_reviewed', 'leave_request', id, decision); return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === '/api/shift-swaps' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Shift swaps require an organisation account.' }); const { shiftId, targetMembershipId } = await readJson(request); const shift = (await query('select id from scheduled_shifts where id = $1 and membership_id = $2 and organisation_id = $3', [shiftId, user.id, user.organisation_id])).rows[0]; if (!shift) return sendJson(response, 404, { error: 'Your scheduled shift was not found.' }); const id = crypto.randomUUID(); await query('insert into shift_swap_requests (id, organisation_id, shift_id, requester_membership_id, target_membership_id) values ($1,$2,$3,$4,$5)', [id, user.organisation_id, shiftId, user.id, targetMembershipId || null]); await audit(user.organisation_id, user.id, 'shift_swap_requested', 'shift_swap', id, 'Shift swap requested.'); await notifyOrganisationOwners(user.organisation_id, `${user.name} requested a shift swap.`); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/shift-swaps' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can review shift swaps.' }); const swaps = await query(`select r.*, requester.full_name as requester_name, target.full_name as target_name, s.starts_at, s.ends_at from shift_swap_requests r join portal_users requester on requester.id = (select user_id from memberships where id = r.requester_membership_id) left join portal_users target on target.id = (select user_id from memberships where id = r.target_membership_id) join scheduled_shifts s on s.id = r.shift_id where r.organisation_id = $1 order by r.created_at desc`, [user.organisation_id]); return sendJson(response, 200, { swaps: swaps.rows });
  }
  if (url.pathname === '/api/shift-swaps/review' && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can review shift swaps.' }); const { id, decision, targetMembershipId } = await readJson(request); if (!['approved', 'rejected'].includes(decision)) return sendJson(response, 400, { error: 'Invalid swap decision.' }); const swap = (await query('select * from shift_swap_requests where id = $1 and organisation_id = $2 and status = $3', [id, user.organisation_id, 'pending'])).rows[0]; if (!swap) return sendJson(response, 404, { error: 'Pending shift swap not found.' }); const target = targetMembershipId || swap.target_membership_id; if (decision === 'approved' && !target) return sendJson(response, 400, { error: 'Select a worker to take this shift.' }); if (decision === 'approved') await query('update scheduled_shifts set membership_id = $1 where id = $2', [target, swap.shift_id]); await query('update shift_swap_requests set status = $1, target_membership_id = $2 where id = $3', [decision, target || null, id]); await audit(user.organisation_id, user.id, 'shift_swap_reviewed', 'shift_swap', id, decision); return sendJson(response, 200, { ok: true });
  }

  if (url.pathname === '/api/organisation/settings' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view settings.' });
    if (!databaseReady) return sendJson(response, 200, { organisation: { legal_name: 'ShiftRelay Global Demo Organisation', trading_name: 'ShiftRelay Global', industry: 'Operations', country: 'Global', time_zone: 'UTC', preferred_language: 'en' } });
    const organisation = (await query('select legal_name, trading_name, industry, country, time_zone, preferred_language, settings from organisations where id = $1', [user.organisation_id])).rows[0];
    return sendJson(response, 200, { organisation });
  }
  if (url.pathname === '/api/organisation/settings' && request.method === 'PUT') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can update settings.' });
    const body = await readJson(request); await query('update organisations set trading_name = $1, industry = $2, country = $3, time_zone = $4, preferred_language = $5, settings = $6::jsonb where id = $7', [body.tradingName || null, body.industry || 'Other', body.country || 'Global', body.timeZone || 'UTC', body.language || 'en', JSON.stringify({ handoverReminderMinutes: Number(body.handoverReminderMinutes) || 30 }), user.organisation_id]); await audit(user.organisation_id, user.id, 'settings_updated', 'organisation', user.organisation_id, 'Organisation settings updated.'); return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === '/api/directory' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Directory is available for authenticated organisation accounts.' });
    if (!databaseReady) return sendJson(response, 200, { members: demoMembers.map((member) => ({ ...member, time_zone: 'UTC', status: 'active', shift_start: member.role === 'incoming' ? '14:00' : '06:00', shift_end: member.role === 'incoming' ? '22:00' : '14:00' })) });
    const members = await query(`select m.id, u.full_name as name, u.email, u.time_zone, m.role, m.title, m.department, m.status, m.shift_start, m.shift_end from memberships m join portal_users u on u.id = m.user_id where m.organisation_id = $1 order by u.full_name`, [user.organisation_id]); return sendJson(response, 200, { members: members.rows });
  }
  if (url.pathname === '/api/incidents' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Incident reporting is available for authenticated organisation accounts.' });
    if (!databaseReady) return sendJson(response, 200, { incidents: [] });
    const incidents = await query('select i.*, u.full_name as reporter_name from incidents i join memberships m on m.id = i.reported_by_membership_id join portal_users u on u.id = m.user_id where i.organisation_id = $1 order by i.created_at desc limit 30', [user.organisation_id]); return sendJson(response, 200, { incidents: incidents.rows });
  }
  if (url.pathname === '/api/incidents' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Incident reporting is available for authenticated organisation accounts.' });
    const body = await readJson(request); if (!body.category || !body.severity || !body.description) return sendJson(response, 400, { error: 'Category, severity, and description are required.' }); const id = crypto.randomUUID(); await query('insert into incidents (id, organisation_id, reported_by_membership_id, category, severity, description) values ($1,$2,$3,$4,$5,$6)', [id, user.organisation_id, user.id, body.category, body.severity, body.description]); await audit(user.organisation_id, user.id, 'incident_reported', 'incident', id, `${body.severity} ${body.category} incident reported.`); await notifyOrganisationOwners(user.organisation_id, `${user.name} reported a ${body.severity} ${body.category} incident.`); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/audit-events' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view audit history.' });
    if (!databaseReady) return sendJson(response, 200, { events: [{ event_type: 'demo_workspace_ready', actor_name: 'ShiftRelay', created_at: new Date().toISOString() }] });
    const events = await query('select a.*, u.full_name as actor_name from audit_events a left join memberships m on m.id = a.actor_membership_id left join portal_users u on u.id = m.user_id where a.organisation_id = $1 order by a.created_at desc limit 50', [user.organisation_id]); return sendJson(response, 200, { events: events.rows });
  }

  if (url.pathname === '/api/memberships/pending' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can review access requests.' });
    return sendJson(response, 200, await pendingMemberships(user));
  }

  const membershipReviewMatch = url.pathname.match(/^\/api\/memberships\/([^/]+)\/review$/);
  if (membershipReviewMatch && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can review access requests.' });
    try { return sendJson(response, 200, { membership: await reviewMembership(user, membershipReviewMatch[1], await readJson(request)) }); }
    catch (error) { return sendJson(response, 400, { error: error.message }); }
  }

  if (url.pathname === '/api/time-entries' && request.method === 'GET') return sendJson(response, 200, await timeSummary(user, url.searchParams.get('month') ? `${url.searchParams.get('month')}-01` : null));
  if (url.pathname === '/api/time-entries/clock-in' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Clocking in is available for authenticated organisation accounts.' });
    if (!databaseReady) {
      const store = await getStore();
      if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
      if (store.timeEntries.some((entry) => entry.membershipId === user.id && !entry.clockedOutAt)) return sendJson(response, 409, { error: 'You are already clocked in.' });
      store.timeEntries.unshift({ id: crypto.randomUUID(), organisationId: user.organisation_id, membershipId: user.id, clockedInAt: new Date().toISOString(), clockedOutAt: null, note: null });
      await saveStore(store);
      return sendJson(response, 201, demoTimeSummary(user, store));
    }
    const existing = (await query('select id from time_entries where membership_id = $1 and clocked_out_at is null', [user.id])).rows[0];
    if (existing) return sendJson(response, 409, { error: 'You are already clocked in.' });
    await query('insert into time_entries (id, organisation_id, membership_id, clocked_in_at) values ($1,$2,$3,now())', [crypto.randomUUID(), user.organisation_id, user.id]);
    return sendJson(response, 201, await timeSummary(user));
  }
  if (url.pathname === '/api/time-entries/clock-out' && request.method === 'POST') {
    if (!databaseReady) {
      const store = await getStore();
      if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
      const active = store.timeEntries.find((entry) => entry.membershipId === user.id && !entry.clockedOutAt);
      if (!active) return sendJson(response, 409, { error: 'You are not clocked in.' });
      active.clockedOutAt = new Date().toISOString();
      await saveStore(store);
      return sendJson(response, 200, demoTimeSummary(user, store));
    }
    const active = (await query('select id from time_entries where membership_id = $1 and clocked_out_at is null', [user.id])).rows[0];
    if (!active) return sendJson(response, 409, { error: 'You are not clocked in.' });
    await query('update time_entries set clocked_out_at = now() where id = $1', [active.id]);
    return sendJson(response, 200, await timeSummary(user));
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
    const handovers = user.role === 'supervisor' ? store.handovers : store.handovers.filter((handover) => handover.createdBy === user.id || handover.assignedTo === user.id);
    return sendJson(response, 200, { handovers, user });
  }

  if (url.pathname === '/api/handovers' && request.method === 'POST') {
    if (!['outgoing', 'supervisor'].includes(user.role)) return sendJson(response, 403, { error: 'Only outgoing workers or supervisors can create handovers.' });
    const { notes, handover, assignedTo = 'faith', shiftStatus = 'green', tasks = [] } = await readJson(request);
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
    if (databaseReady) return sendJson(response, 201, { handover: await createDatabaseHandover(user, { notes, handover, assignedTo }) });
    const store = await getStore();
    const record = { id: crypto.randomUUID(), createdBy: user.id, assignedTo, notes, handover, status: user.role === 'supervisor' ? 'relayed' : 'awaiting_review', acknowledgement: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    store.handovers.unshift(record);
    notify(store, 'david', record.id, `${user.name} created a handover for review.`);
    if (record.status === 'relayed') notify(store, assignedTo, record.id, 'A reviewed handover is ready for your shift.');
    await saveStore(store);
    broadcastEvent('handover-submitted', { organisationId: user.organisation_id, handover: record });
    return sendJson(response, 201, { handover: record });
  }

  const taskToggleMatch = url.pathname.match(/^\/api\/handovers\/([^/]+)\/tasks\/([^/]+)\/toggle$/);
  if (taskToggleMatch && request.method === 'POST') {
    const [_, handoverId, taskId] = taskToggleMatch;
    if (databaseReady) {
      const item = (await query('select * from work_items where id = $1 and organisation_id = $2', [handoverId, user.organisation_id])).rows[0];
      if (!item) return sendJson(response, 404, { error: 'Handover not found.' });
      const payload = item.payload;
      if (!Array.isArray(payload.tasks)) payload.tasks = [];
      const task = payload.tasks.find((t) => t.id === taskId);
      if (task) task.done = !task.done;
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
    if (task) task.done = !task.done;
    item.updatedAt = new Date().toISOString();
    await saveStore(store);
    broadcastEvent('handover-updated', { organisationId: user.organisation_id, handoverId, task });
    return sendJson(response, 200, { ok: true, task, handover: item.handover });
  }

  const handoverMatch = url.pathname.match(/^\/api\/handovers\/([^/]+)\/(relay|acknowledge)$/);
  if (handoverMatch && request.method === 'POST') {
    if (databaseReady) {
      try { return sendJson(response, 200, { handover: await updateDatabaseHandover(user, handoverMatch[1], handoverMatch[2]) }); }
      catch (error) { return sendJson(response, 403, { error: error.message }); }
    }
    const store = await getStore();
    const handover = store.handovers.find((item) => item.id === handoverMatch[1]);
    if (!handover) return sendJson(response, 404, { error: 'Handover not found.' });
    if (handoverMatch[2] === 'relay') {
      if (user.role !== 'supervisor') return sendJson(response, 403, { error: 'Only the supervisor can relay a handover.' });
      handover.status = 'relayed'; handover.reviewedBy = user.id; handover.updatedAt = new Date().toISOString();
      notify(store, handover.assignedTo, handover.id, 'A reviewed handover is ready for you to acknowledge.');
    } else {
      if (user.id !== handover.assignedTo) return sendJson(response, 403, { error: 'This handover is assigned to another incoming worker.' });
      handover.status = 'acknowledged'; handover.acknowledgement = { by: user.id, at: new Date().toISOString() }; handover.updatedAt = new Date().toISOString();
      notify(store, handover.createdBy, handover.id, `${user.name} acknowledged the handover.`);
      notify(store, 'david', handover.id, `${user.name} acknowledged the handover.`);
    }
    await saveStore(store);
    return sendJson(response, 200, { handover });
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
  // Frontline Career Network Endpoints (Social Feed, Worker Passport, Rewards)
  // ==========================================================================

  if (url.pathname === '/api/feed/posts' && request.method === 'GET') {
    const store = await getStore();
    if (!Array.isArray(store.feedPosts) || store.feedPosts.length === 0) {
      const now = Date.now();
      store.feedPosts = [
        {
          id: 'post-1',
          author_id: 'mem-nurse',
          author_name: 'Maria Santos, RN',
          author_role: 'Triage Nurse',
          author_verified: true,
          organisation_name: 'St. Jude Healthcare',
          category: 'milestone',
          content: 'Night shift handover complete! All patient vital charts updated and triage bays fully disinfected. Special shoutout to our outgoing nursing team for keeping cold chain meds at exact 3.5°C throughout the storm. 3/3 shift goals hit! Stay safe out there team.',
          image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
          likes_count: 28,
          comments_count: 5,
          reposts_count: 3,
          saves_count: 7,
          liked_by: [],
          saved_by: [],
          comments: [
            { id: 'c-1', author_name: 'David Kariuki', author_role: 'Supervisor', content: 'Incredible work on the cold-chain response Maria!', created_at: new Date(now - 3600000).toISOString() }
          ],
          created_at: new Date(now - 7200000).toISOString()
        },
        {
          id: 'post-2',
          author_id: 'mem-chef',
          author_name: 'Marcus Brody',
          author_role: 'Kitchen Logistics Lead',
          author_verified: true,
          organisation_name: 'Metro Culinary Hub',
          category: 'craft',
          content: 'Prep ready for the evening rush: 140 portions of slow-braised short ribs and fresh chimichurri portioned and temp-checked. A clean station is a fast station. What is your team number one prep rule before doors open?',
          image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80',
          likes_count: 45,
          comments_count: 12,
          reposts_count: 8,
          saves_count: 19,
          liked_by: [],
          saved_by: [],
          comments: [],
          created_at: new Date(now - 14400000).toISOString()
        },
        {
          id: 'post-3',
          author_id: 'mem-kwame',
          author_name: 'Kwame Mensah',
          author_role: 'Dispatch Supervisor',
          author_verified: true,
          organisation_name: 'Northline Logistics',
          category: 'tip',
          content: 'Pro tip for warehouse pickers: always inspect your pallet wrap tension before loading high-bays. Saved our night team 45 minutes of restacking yesterday. Work smart, lift with your knees, and always log your handovers!',
          likes_count: 34,
          comments_count: 8,
          reposts_count: 14,
          saves_count: 22,
          liked_by: [],
          saved_by: [],
          comments: [],
          created_at: new Date(now - 28800000).toISOString()
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
      const isNurse = user.name.toLowerCase().includes('maria') || user.title?.toLowerCase().includes('nurse');
      const isChef = user.name.toLowerCase().includes('marcus') || user.title?.toLowerCase().includes('cook');
      store.workerProfiles[targetId] = {
        userId: targetId,
        fullName: user.id === targetId ? user.name : 'Frontline Specialist',
        headline: user.id === targetId ? (user.title || 'Operations Specialist') : 'Operations Specialist',
        bioOutsideWork: 'Passionate about team accountability and continuous craft improvement. Trail runner, coffee lover, and community volunteer on off-shift days.',
        avatarUrl: null,
        verifiedStatus: 'verified',
        industry: isNurse ? 'Healthcare' : isChef ? 'Hospitality' : 'Operations & Logistics',
        currentOrganisation: 'ShiftRelay Network Partner',
        stats: {
          shiftsCompleted: 148,
          handoversRelayed: 139,
          reliabilityScore: 99.4,
          checkInStreak: 7,
          endorsementsCount: 26
        },
        skills: ['Shift Handover Protocol', 'Incident Prevention', 'Team Communication', 'Process Compliance'],
        certifications: ['Frontline Safety Level 1', 'Accountable Handover Specialist'],
        gallery: [
          { id: 'g-1', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80', caption: 'Shift handoff complete.' },
          { id: 'g-2', url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=80', caption: 'Team huddle before opening.' }
        ]
      };
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
      headline: body.headline || existing.headline || user.title,
      bioOutsideWork: body.bioOutsideWork !== undefined ? body.bioOutsideWork : existing.bioOutsideWork,
      currentJob: body.currentJob !== undefined ? body.currentJob : existing.currentJob || null,
      skills: Array.isArray(body.skills) ? body.skills : existing.skills || [],
      certifications: Array.isArray(body.certifications) ? body.certifications : existing.certifications || [],
      workHistory: Array.isArray(body.workHistory) ? body.workHistory : existing.workHistory || [],
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl || null,
      coverPhotoUrl: body.coverPhotoUrl !== undefined ? body.coverPhotoUrl : existing.coverPhotoUrl || null
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
      { userId: 'w-1', fullName: 'Maria Santos, RN', headline: 'Triage Nurse · Healthcare', industry: 'Healthcare', verifiedStatus: 'verified', avatarUrl: null, stats: { shiftsCompleted: 148, reliabilityScore: 99.4, checkInStreak: 7 }, skills: ['Triage Protocol', 'Patient Safety', 'HIPAA Compliance'] },
      { userId: 'w-2', fullName: 'Marcus Brody', headline: 'Kitchen Logistics Lead · Hospitality', industry: 'Hospitality', verifiedStatus: 'verified', avatarUrl: null, stats: { shiftsCompleted: 201, reliabilityScore: 98.1, checkInStreak: 14 }, skills: ['Food Safety', 'Team Prep', 'Cold Chain'] },
      { userId: 'w-3', fullName: 'Kwame Mensah', headline: 'Dispatch Supervisor · Logistics', industry: 'Logistics', verifiedStatus: 'verified', avatarUrl: null, stats: { shiftsCompleted: 312, reliabilityScore: 97.6, checkInStreak: 21 }, skills: ['Warehouse Ops', 'Handover Protocol', 'Safety Compliance'] },
      { userId: 'w-4', fullName: 'Aisha Diallo', headline: 'Night Shift Floor Lead · Retail', industry: 'Retail', verifiedStatus: 'verified', avatarUrl: null, stats: { shiftsCompleted: 89, reliabilityScore: 96.3, checkInStreak: 5 }, skills: ['Inventory Control', 'Loss Prevention', 'Team Leadership'] },
      { userId: 'w-5', fullName: 'Tunde Okafor', headline: 'Security Supervisor · Facilities', industry: 'Security', verifiedStatus: 'unverified', avatarUrl: null, stats: { shiftsCompleted: 431, reliabilityScore: 99.1, checkInStreak: 30 }, skills: ['Perimeter Control', 'Incident Response', 'Shift Handover'] },
      { userId: 'w-6', fullName: 'Sophie Chen', headline: 'Manufacturing Line Lead · Auto', industry: 'Manufacturing', verifiedStatus: 'verified', avatarUrl: null, stats: { shiftsCompleted: 256, reliabilityScore: 98.7, checkInStreak: 12 }, skills: ['Six Sigma', 'Quality Assurance', 'Line Supervision'] }
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

async function serveStatic(request, response, url) {
  const requestedPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const safePath = normalize(requestedPath).replace(/^([.]{2}[/\\])+/, '');

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

    response.writeHead(200, {
      'Content-Type': isBinary ? contentType : `${contentType}; charset=utf-8`,
      'Accept-Ranges': 'bytes',
      'Content-Length': totalSize,
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
      const isAuth = /^\/api\/auth\/|^\/api\/organisations$|^\/api\/organisation-memberships$/.test(url.pathname);
      if (isRateLimited(ip, isAuth)) {
        return sendJson(response, 429, { error: 'Too many requests. Please slow down and try again shortly.' });
      }
      return handleApi(request, response, url);
    }

    return serveStatic(request, response, url);
  }).catch((error) => {
    console.error('Request failed:', error.message);
    if (databaseReady && /DATABASE|relation .* does not exist|connection|timeout|ECONN/i.test(error.message || '')) databaseReady = false;
    if (!response.headersSent) sendJson(response, 500, { error: 'The request could not be completed. Please try again.' });
    else response.destroy();
  });
});

initializeDatabase()
  .then(async (connected) => {
    databaseReady = connected;
    if (databaseReady) await seedDemoOrganisation();
    server.listen(port, () => console.log(`ShiftRelay is running at http://localhost:${port} | database=${connected && databaseConfigured() ? 'connected' : 'local-demo'}`));
  })
  .catch((error) => {
    console.error('ShiftRelay could not initialise the database. Running without database.', error.message);
    server.listen(port, () => console.log(`ShiftRelay is running at http://localhost:${port} | database=unavailable`));
  });
