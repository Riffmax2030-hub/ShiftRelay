import { createServer } from 'node:http';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
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
const port = Number(process.env.PORT || 3000);
const publicDirectory = process.cwd();
const dataDirectory = join(publicDirectory, 'data');
const dataPath = join(dataDirectory, 'shiftrelay.json');
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const users = demoMembers;
let databaseReady = false;
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

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function readBuffer(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function sessionId(request) { return request.headers.cookie?.match(/(?:^|;\s*)shiftrelay_session=([^;]+)/)?.[1] || null; }
function sessionCookie(value, maxAge = 60 * 60 * 24 * 7) { return `shiftrelay_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }
async function getUser(request) {
  const token = sessionId(request);
  if (databaseReady && token) {
    const result = await query(`select m.id, u.full_name as name, u.email, u.time_zone, u.country_code, u.avatar_data_url, m.role, m.title, m.department, m.shift_start, m.shift_end, m.shift_days, m.status, m.organisation_id from user_sessions s join memberships m on m.id = s.membership_id join portal_users u on u.id = s.user_id where s.id = $1 and s.expires_at > now()`, [token]);
    if (result.rows[0]?.status === 'active') return result.rows[0];
  }
  return users.find((user) => user.id === request.headers['x-shiftrelay-user']) || null;
}

async function hashPassword(password) { const salt = randomBytes(16).toString('hex'); const hash = await scrypt(password, salt, 64); return `${salt}:${Buffer.from(hash).toString('hex')}`; }
async function passwordMatches(password, stored) { if (!stored) return false; const [salt, expected] = stored.split(':'); if (!salt || !expected) return false; const actual = Buffer.from(await scrypt(password, salt, 64)); const expectedBuffer = Buffer.from(expected, 'hex'); return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer); }
async function createSession(userId, membershipId) { const id = crypto.randomUUID(); await query('insert into user_sessions (id, user_id, membership_id, expires_at) values ($1,$2,$3,now() + interval \'7 days\')', [id, userId, membershipId]); return id; }

function notify(store, recipientId, handoverId, message) {
  store.notifications.unshift({ id: crypto.randomUUID(), recipientId, handoverId, message, read: false, createdAt: new Date().toISOString() });
}

async function databaseHandovers(user) {
  const result = await query(`select wi.id, wi.status, wi.payload, wi.created_at, wi.updated_at, wi.acknowledged_at, wi.created_by_membership_id, wi.assigned_to_membership_id, reviewer.full_name as reviewer_name from work_items wi left join portal_users reviewer on reviewer.id = wi.created_by_membership_id where wi.organisation_id = $1 and ($2 in ('supervisor', 'owner') or wi.created_by_membership_id = $3 or wi.assigned_to_membership_id = $3) order by wi.created_at desc`, [demoOrganisation.id, user.role, user.id]);
  return result.rows.map((row) => ({ id: row.id, createdBy: row.created_by_membership_id, assignedTo: row.assigned_to_membership_id, handover: row.payload, status: row.status, acknowledgement: row.acknowledged_at ? { by: row.assigned_to_membership_id, at: row.acknowledged_at } : null, createdAt: row.created_at, updatedAt: row.updated_at, reviewedBy: row.reviewer_name }));
}

async function createDatabaseHandover(user, body) {
  const runId = crypto.randomUUID();
  const workItemId = crypto.randomUUID();
  const supervisor = demoMembers.find((member) => member.role === 'supervisor');
  const incomingWorker = demoMembers.find((member) => member.role === 'incoming');
  const assignedTo = demoMembers.some((member) => member.id === body.assignedTo) ? body.assignedTo : incomingWorker.id;
  await query('insert into workflow_runs (id, organisation_id, created_by_membership_id, status, priority) values ($1, $2, $3, $4, $5)', [runId, demoOrganisation.id, user.id, 'in_progress', 'normal']);
  await query('insert into work_items (id, workflow_run_id, organisation_id, assigned_to_membership_id, created_by_membership_id, item_type, title, status, priority, payload) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)', [workItemId, runId, demoOrganisation.id, assignedTo, user.id, 'handover', body.handover.summary, 'awaiting_review', 'normal', JSON.stringify(body.handover)]);
  await query('insert into work_events (id, organisation_id, workflow_run_id, work_item_id, actor_membership_id, event_type, message) values ($1, $2, $3, $4, $5, $6, $7)', [crypto.randomUUID(), demoOrganisation.id, runId, workItemId, user.id, 'submitted', `${user.name} submitted a handover for review.`]);
  await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), demoOrganisation.id, supervisor.id, workItemId, `${user.name} created a handover for review.`]);
  return (await databaseHandovers(user)).find((item) => item.id === workItemId);
}

async function updateDatabaseHandover(user, id, action) {
  const item = (await query('select * from work_items where id = $1 and organisation_id = $2', [id, demoOrganisation.id])).rows[0];
  if (!item) throw new Error('Handover not found.');
  if (action === 'relay') {
    if (user.role !== 'supervisor') throw new Error('Only a supervisor can approve and relay this handover.');
    await query('update work_items set status = $1, updated_at = now() where id = $2', ['relayed', id]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), demoOrganisation.id, item.assigned_to_membership_id, id, 'A supervisor approved a handover for your shift.']);
  } else {
    if (user.id !== item.assigned_to_membership_id) throw new Error('This handover is assigned to another worker.');
    await query('update work_items set status = $1, acknowledged_at = now(), updated_at = now() where id = $2', ['acknowledged', id]);
    await query('insert into notifications (id, organisation_id, recipient_membership_id, work_item_id, message) values ($1, $2, $3, $4, $5)', [crypto.randomUUID(), demoOrganisation.id, item.created_by_membership_id, id, `${user.name} acknowledged the handover.`]);
  }
  return (await databaseHandovers(user)).find((handover) => handover.id === id);
}

function organisationCode() {
  return `SR-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function registerOrganisation(body) {
  const organisationId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const code = organisationCode();
  await query('insert into organisations (id, organisation_code, legal_name, trading_name, work_email, phone, industry, country, time_zone, preferred_language, verification_status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [organisationId, code, body.legalName, body.tradingName || body.legalName, body.workEmail, body.phone || null, body.industry || 'Other', body.country || 'Global', body.timeZone || 'UTC', body.language || 'en', 'pending']);
  await query('insert into portal_users (id, full_name, email, phone, password_hash, country_code, time_zone, employee_reference) values ($1,$2,$3,$4,$5,$6,$7,$8)', [ownerId, body.ownerName, body.workEmail.toLowerCase(), body.phone || null, await hashPassword(body.password), body.countryCode || null, body.timeZone || 'UTC', body.employeeReference || null]);
  await query('insert into memberships (id, organisation_id, user_id, role, title, department, status) values ($1,$2,$1,$3,$4,$5,$6)', [ownerId, organisationId, 'owner', 'Organisation owner', 'Leadership', 'active']);
  const workflowId = crypto.randomUUID();
  await query('insert into workflow_templates (id, organisation_id, name, description) values ($1,$2,$3,$4)', [workflowId, organisationId, 'Standard shift handover', 'Outgoing worker submits, supervisor reviews, incoming worker acknowledges.']);
  await query('insert into workflow_steps (id, template_id, sequence, assignee_role, action_name, due_minutes) values ($1,$2,$3,$4,$5,$6),($7,$2,$8,$9,$10,$11),($12,$2,$13,$14,$15,$16)', [crypto.randomUUID(), workflowId, 1, 'outgoing', 'Submit handover', 30, crypto.randomUUID(), 2, 'supervisor', 'Review and relay', 30, crypto.randomUUID(), 3, 'incoming', 'Acknowledge handover', 30]);
  return { organisationId, organisationCode: code, ownerMembershipId: ownerId, verificationStatus: 'pending' };
}

async function enrolWorker(body) {
  const organisation = (await query('select id, legal_name from organisations where organisation_code = $1', [body.organisationCode.toUpperCase()])).rows[0];
  if (!organisation) throw new Error('Organisation code not found.');
  const userId = crypto.randomUUID();
  await query('insert into portal_users (id, full_name, email, phone, password_hash, country_code, time_zone, employee_reference) values ($1,$2,$3,$4,$5,$6,$7,$8)', [userId, body.fullName, body.email.toLowerCase(), body.phone || null, await hashPassword(body.password), body.countryCode || null, body.timeZone || 'UTC', body.employeeReference || null]);
  await query('insert into memberships (id, organisation_id, user_id, role, title, department, status) values ($1,$2,$1,$3,$4,$5,$6)', [userId, organisation.id, body.role || 'worker', body.position, body.department || null, 'pending_approval']);
  const owners = await query('select id from memberships where organisation_id = $1 and role in ($2,$3)', [organisation.id, 'owner', 'supervisor']);
  for (const owner of owners.rows) await query('insert into notifications (id, organisation_id, recipient_membership_id, message) values ($1,$2,$3,$4)', [crypto.randomUUID(), organisation.id, owner.id, `${body.fullName} requested access as ${body.position}.`]);
  return { organisationName: organisation.legal_name, membershipId: userId, status: 'pending_approval' };
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
  const allowedRoles = ['outgoing', 'incoming', 'supervisor'];
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

async function organisationAnalytics(organisationId) {
  const [members, handovers, hours, incidents] = await Promise.all([
    query("select count(*)::int as total, count(*) filter (where status = 'active')::int as active from memberships where organisation_id = $1", [organisationId]),
    query("select count(*)::int as total, count(*) filter (where status = 'acknowledged')::int as complete, count(*) filter (where status = 'awaiting_review')::int as waiting from work_items where organisation_id = $1", [organisationId]),
    query("select coalesce(sum(extract(epoch from (coalesce(clocked_out_at, now()) - clocked_in_at))/3600),0) as total from time_entries where organisation_id = $1 and clocked_in_at >= date_trunc('month', now())", [organisationId]),
    query("select count(*)::int as open from incidents where organisation_id = $1 and status = 'open'", [organisationId])
  ]);
  return { members: members.rows[0], handovers: handovers.rows[0], monthlyHours: Math.round(Number(hours.rows[0].total) * 10) / 10, openIncidents: incidents.rows[0].open };
}

async function signIn(body) {
  const result = await query(`select u.id as user_id, u.password_hash, u.time_zone, u.country_code, u.avatar_data_url, m.id, u.full_name as name, u.email, m.role, m.title, m.department, m.shift_start, m.shift_end, m.shift_days, m.status, m.organisation_id from portal_users u join memberships m on m.user_id = u.id where lower(u.email) = lower($1) order by m.created_at desc limit 1`, [body.email]);
  const member = result.rows[0];
  if (!member || !(await passwordMatches(body.password, member.password_hash))) throw new Error('Invalid email or password.');
  if (member.status !== 'active') throw new Error('Your workplace access is waiting for approval.');
  return { sessionId: await createSession(member.user_id, member.id), user: { id: member.id, name: member.name, email: member.email, role: member.role, title: member.title, department: member.department, avatar_data_url: member.avatar_data_url, time_zone: member.time_zone, country_code: member.country_code, shift_start: member.shift_start, shift_end: member.shift_end, shift_days: member.shift_days, organisation_id: member.organisation_id } };
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
  if (url.pathname === '/api/users' && request.method === 'GET') return sendJson(response, 200, { users });
  if (url.pathname === '/api/config' && request.method === 'GET') return sendJson(response, 200, { aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL), assistantConfigured: Boolean((process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) || process.env.GEMINI_API_KEY), transcriptionConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_TRANSCRIPTION_MODEL), databaseReady });
  if (url.pathname === '/api/auth/session' && request.method === 'GET') return user ? sendJson(response, 200, { user }) : sendJson(response, 401, { error: 'Sign in to continue.' });
  if (url.pathname === '/api/auth/sign-in' && request.method === 'POST') {
    try { const session = await signIn(await readJson(request)); response.setHeader('Set-Cookie', sessionCookie(session.sessionId)); return sendJson(response, 200, { user: session.user }); }
    catch (error) { return sendJson(response, 401, { error: error.message }); }
  }
  if (url.pathname === '/api/auth/sign-out' && request.method === 'POST') {
    const token = sessionId(request); if (token && databaseReady) await query('delete from user_sessions where id = $1', [token]); response.setHeader('Set-Cookie', sessionCookie('', 0)); return sendJson(response, 200, { ok: true });
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
    const body = await readJson(request); const avatar = body.avatarDataUrl || null; if (avatar && (!/^data:image\/(png|jpeg|webp);base64,/.test(avatar) || avatar.length > 2_000_000)) return sendJson(response, 400, { error: 'Use a PNG, JPEG, or WebP image smaller than 1.5 MB.' }); await query('update portal_users set avatar_data_url = $1 where id = (select user_id from memberships where id = $2)', [avatar, user.id]); return sendJson(response, 200, { avatarDataUrl: avatar });
  }

  if (url.pathname === '/api/analytics' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view analytics.' });
    return sendJson(response, 200, await organisationAnalytics(user.organisation_id));
  }
  if (url.pathname === '/api/workflow-templates' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Workflow templates require an organisation account.' });
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
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7); const start = `${month}-01`;
    const shifts = await query(`select s.id, s.starts_at, s.ends_at, s.status, m.id as membership_id, u.full_name as worker_name from scheduled_shifts s join memberships m on m.id = s.membership_id join portal_users u on u.id = m.user_id where s.organisation_id = $1 and s.starts_at >= date_trunc('month',$2::date) and s.starts_at < date_trunc('month',$2::date) + interval '1 month' order by s.starts_at`, [user.organisation_id, start]);
    const leave = await query(`select l.*, u.full_name as worker_name from leave_requests l join memberships m on m.id = l.membership_id join portal_users u on u.id = m.user_id where l.organisation_id = $1 and l.starts_on < date_trunc('month',$2::date) + interval '1 month' and l.ends_on >= date_trunc('month',$2::date) order by l.starts_on`, [user.organisation_id, start]);
    return sendJson(response, 200, { shifts: shifts.rows, leave: leave.rows });
  }
  if (url.pathname === '/api/calendar/shifts' && request.method === 'POST') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can schedule shifts.' }); const body = await readJson(request); if (!body.membershipId || !body.startsAt || !body.endsAt) return sendJson(response, 400, { error: 'Worker, shift start, and shift end are required.' }); const id = crypto.randomUUID(); await query('insert into scheduled_shifts (id, organisation_id, membership_id, starts_at, ends_at) values ($1,$2,$3,$4,$5)', [id, user.organisation_id, body.membershipId, body.startsAt, body.endsAt]); await audit(user.organisation_id, user.id, 'shift_scheduled', 'scheduled_shift', id, 'Shift added to calendar.'); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/leave-requests' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Leave requests require an organisation account.' }); const where = user.role === 'owner' ? 'organisation_id = $1' : 'organisation_id = $1 and membership_id = $2'; const values = user.role === 'owner' ? [user.organisation_id] : [user.organisation_id, user.id]; const requests = await query(`select * from leave_requests where ${where} order by created_at desc`, values); return sendJson(response, 200, { requests: requests.rows });
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
    const organisation = (await query('select legal_name, trading_name, industry, country, time_zone, preferred_language, settings from organisations where id = $1', [user.organisation_id])).rows[0];
    return sendJson(response, 200, { organisation });
  }
  if (url.pathname === '/api/organisation/settings' && request.method === 'PUT') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can update settings.' });
    const body = await readJson(request); await query('update organisations set trading_name = $1, industry = $2, country = $3, time_zone = $4, preferred_language = $5, settings = $6::jsonb where id = $7', [body.tradingName || null, body.industry || 'Other', body.country || 'Global', body.timeZone || 'UTC', body.language || 'en', JSON.stringify({ handoverReminderMinutes: Number(body.handoverReminderMinutes) || 30 }), user.organisation_id]); await audit(user.organisation_id, user.id, 'settings_updated', 'organisation', user.organisation_id, 'Organisation settings updated.'); return sendJson(response, 200, { ok: true });
  }
  if (url.pathname === '/api/directory' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Directory is available for authenticated organisation accounts.' });
    const members = await query(`select m.id, u.full_name as name, u.email, u.time_zone, m.role, m.title, m.department, m.status, m.shift_start, m.shift_end from memberships m join portal_users u on u.id = m.user_id where m.organisation_id = $1 order by u.full_name`, [user.organisation_id]); return sendJson(response, 200, { members: members.rows });
  }
  if (url.pathname === '/api/incidents' && request.method === 'GET') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Incident reporting is available for authenticated organisation accounts.' });
    const incidents = await query('select i.*, u.full_name as reporter_name from incidents i join memberships m on m.id = i.reported_by_membership_id join portal_users u on u.id = m.user_id where i.organisation_id = $1 order by i.created_at desc limit 30', [user.organisation_id]); return sendJson(response, 200, { incidents: incidents.rows });
  }
  if (url.pathname === '/api/incidents' && request.method === 'POST') {
    if (!user.organisation_id) return sendJson(response, 400, { error: 'Incident reporting is available for authenticated organisation accounts.' });
    const body = await readJson(request); if (!body.category || !body.severity || !body.description) return sendJson(response, 400, { error: 'Category, severity, and description are required.' }); const id = crypto.randomUUID(); await query('insert into incidents (id, organisation_id, reported_by_membership_id, category, severity, description) values ($1,$2,$3,$4,$5,$6)', [id, user.organisation_id, user.id, body.category, body.severity, body.description]); await audit(user.organisation_id, user.id, 'incident_reported', 'incident', id, `${body.severity} ${body.category} incident reported.`); await notifyOrganisationOwners(user.organisation_id, `${user.name} reported a ${body.severity} ${body.category} incident.`); return sendJson(response, 201, { id });
  }
  if (url.pathname === '/api/audit-events' && request.method === 'GET') {
    if (user.role !== 'owner' || !user.organisation_id) return sendJson(response, 403, { error: 'Only organisation owners can view audit history.' }); const events = await query('select a.*, u.full_name as actor_name from audit_events a left join memberships m on m.id = a.actor_membership_id left join portal_users u on u.id = m.user_id where a.organisation_id = $1 order by a.created_at desc limit 50', [user.organisation_id]); return sendJson(response, 200, { events: events.rows });
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
    const existing = (await query('select id from time_entries where membership_id = $1 and clocked_out_at is null', [user.id])).rows[0];
    if (existing) return sendJson(response, 409, { error: 'You are already clocked in.' });
    await query('insert into time_entries (id, organisation_id, membership_id, clocked_in_at) values ($1,$2,$3,now())', [crypto.randomUUID(), user.organisation_id, user.id]);
    return sendJson(response, 201, await timeSummary(user));
  }
  if (url.pathname === '/api/time-entries/clock-out' && request.method === 'POST') {
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
    const { notes, handover, assignedTo = 'faith' } = await readJson(request);
    if (!handover?.summary || !Array.isArray(handover.actions)) return sendJson(response, 400, { error: 'Generate a handover before saving.' });
    if (databaseReady) return sendJson(response, 201, { handover: await createDatabaseHandover(user, { notes, handover, assignedTo }) });
    const store = await getStore();
    const record = { id: crypto.randomUUID(), createdBy: user.id, assignedTo, notes, handover, status: user.role === 'supervisor' ? 'relayed' : 'awaiting_review', acknowledgement: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    store.handovers.unshift(record);
    notify(store, 'david', record.id, `${user.name} created a handover for review.`);
    if (record.status === 'relayed') notify(store, assignedTo, record.id, 'A reviewed handover is ready for your shift.');
    await saveStore(store);
    return sendJson(response, 201, { handover: record });
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
      const result = await query('select id, message, read_at, created_at from notifications where organisation_id = $1 and recipient_membership_id = $2 order by created_at desc limit 8', [demoOrganisation.id, user.id]);
      return sendJson(response, 200, { notifications: result.rows.map((row) => ({ id: row.id, message: row.message, read: Boolean(row.read_at), createdAt: row.created_at })) });
    }
    const store = await getStore();
    return sendJson(response, 200, { notifications: store.notifications.filter((notification) => notification.recipientId === user.id).slice(0, 8) });
  }

  if (url.pathname === '/api/notifications/read' && request.method === 'POST') {
    if (databaseReady) {
      await query('update notifications set read_at = now() where organisation_id = $1 and recipient_membership_id = $2 and read_at is null', [demoOrganisation.id, user.id]);
      return sendJson(response, 200, { ok: true });
    }
    const store = await getStore();
    store.notifications.filter((notification) => notification.recipientId === user.id).forEach((notification) => { notification.read = true; });
    await saveStore(store);
    return sendJson(response, 200, { ok: true });
  }

  return sendJson(response, 404, { error: 'Not found.' });
}

async function serveStatic(response, url) {
  const requestedPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const safePath = normalize(requestedPath).replace(/^([.]{2}[\\/])+/, '');
  try {
    const filePath = join(publicDirectory, safePath);
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': `${mimeTypes[extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(content);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/health') return sendJson(response, 200, { status: 'ok' });
  if (url.pathname.startsWith('/api/')) return handleApi(request, response, url);
  return serveStatic(response, url);
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
