import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

function loadEnvironment() {
  try {
    const entries = readFileSync('.env', 'utf8').split(/\r?\n/);
    for (const entry of entries) {
      const match = entry.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

loadEnvironment();
const port = Number(process.env.PORT || 3000);
const publicDirectory = process.cwd();
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'actions', 'missing_context'],
  properties: {
    summary: { type: 'string' },
    actions: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'priority', 'owner', 'due', 'evidence'],
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          owner: { type: 'string' },
          due: { type: 'string' },
          evidence: { type: 'string' }
        }
      }
    },
    missing_context: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'why_it_matters'],
        properties: {
          question: { type: 'string' },
          why_it_matters: { type: 'string' }
        }
      }
    }
  }
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function analyseShiftUpdate(notes) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      instructions: 'You are ShiftRelay, an operational handover analyst. Convert only the supplied shift update into a concise, safe handover. Do not invent facts, owners, or deadlines. Use "Unassigned" or "Not specified" where information is missing. Prioritize immediate safety, service continuity, and explicit follow-up. Each evidence value must quote or closely cite the update. Return the required JSON.',
      input: notes,
      text: { format: { type: 'json_schema', name: 'shift_handover', strict: true, schema } }
    })
  });

  if (!response.ok) {
    throw new Error(`OPENAI_${response.status}`);
  }

  const payload = await response.json();
  return JSON.parse(payload.output_text);
}

async function serveStatic(request, response) {
  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const safePath = normalize(requestedPath).replace(/^([.]{2}[\\/])+/, '');
  const filePath = join(publicDirectory, safePath);
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': `${mimeTypes[extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/analyze') {
    try {
      const { notes } = await readBody(request);
      if (typeof notes !== 'string' || notes.trim().length < 20) {
        sendJson(response, 400, { error: 'Please add a more detailed shift update.' });
        return;
      }
      sendJson(response, 200, { handover: await analyseShiftUpdate(notes.trim()), mode: 'live' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      sendJson(response, message === 'AI_NOT_CONFIGURED' ? 503 : 500, { error: message });
    }
    return;
  }
  serveStatic(request, response);
}).listen(port, () => console.log(`ShiftRelay is running at http://localhost:${port}`));
