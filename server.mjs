import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

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
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };
const users = [
  { id: 'amina', name: 'Amina Otieno', role: 'outgoing', title: 'Outgoing nurse' },
  { id: 'david', name: 'David Kariuki', role: 'supervisor', title: 'Shift supervisor' },
  { id: 'faith', name: 'Faith Wanjiku', role: 'incoming', title: 'Incoming nurse' }
];

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

function getUser(request) {
  return users.find((user) => user.id === request.headers['x-shiftrelay-user']) || null;
}

function notify(store, recipientId, handoverId, message) {
  store.notifications.unshift({ id: crypto.randomUUID(), recipientId, handoverId, message, read: false, createdAt: new Date().toISOString() });
}

async function analyseShiftUpdate(notes) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) throw new Error('AI_NOT_CONFIGURED');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL, instructions: 'You are ShiftRelay, an operational handover analyst. Convert only the supplied shift update into a concise, safe handover. Do not invent facts, owners, or deadlines. Use "Unassigned" or "Not specified" where information is missing. Prioritize immediate safety, service continuity, and explicit follow-up. Each evidence value must quote or closely cite the update. Return the required JSON.', input: notes, text: { format: { type: 'json_schema', name: 'shift_handover', strict: true, schema } } })
  });
  if (!response.ok) throw new Error(`OPENAI_${response.status}`);
  return JSON.parse((await response.json()).output_text);
}

async function transcribeAudio(request) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_TRANSCRIPTION_MODEL) throw new Error('TRANSCRIPTION_NOT_CONFIGURED');
  const audio = await readBuffer(request);
  const form = new FormData();
  form.append('file', new Blob([audio], { type: request.headers['content-type'] || 'audio/webm' }), 'shift-update.webm');
  form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL);
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  if (!response.ok) throw new Error(`TRANSCRIPTION_${response.status}`);
  return (await response.json()).text;
}

async function handleApi(request, response, url) {
  const user = getUser(request);
  if (url.pathname === '/api/users' && request.method === 'GET') return sendJson(response, 200, { users });
  if (!user) return sendJson(response, 401, { error: 'Select a ShiftRelay role to continue.' });

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
    const store = await getStore();
    const handovers = user.role === 'supervisor' ? store.handovers : store.handovers.filter((handover) => handover.createdBy === user.id || handover.assignedTo === user.id);
    return sendJson(response, 200, { handovers, user });
  }

  if (url.pathname === '/api/handovers' && request.method === 'POST') {
    if (!['outgoing', 'supervisor'].includes(user.role)) return sendJson(response, 403, { error: 'Only outgoing workers or supervisors can create handovers.' });
    const { notes, handover, assignedTo = 'faith' } = await readJson(request);
    if (!handover?.summary || !Array.isArray(handover.actions)) return sendJson(response, 400, { error: 'Generate a handover before saving.' });
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
    const store = await getStore();
    return sendJson(response, 200, { notifications: store.notifications.filter((notification) => notification.recipientId === user.id).slice(0, 8) });
  }

  if (url.pathname === '/api/notifications/read' && request.method === 'POST') {
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

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/health') return sendJson(response, 200, { status: 'ok' });
  if (url.pathname.startsWith('/api/')) return handleApi(request, response, url);
  return serveStatic(response, url);
}).listen(port, () => console.log(`ShiftRelay is running at http://localhost:${port}`));
