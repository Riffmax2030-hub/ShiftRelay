# ShiftRelay

ShiftRelay prevents critical context from being lost at shift change. An outgoing worker adds rushed voice-transcript or text updates; the system turns them into a concise, accountable handover with risks, owners, deadlines, and missing context.

## Hackathon category

**Work & Productivity** — built for the OpenAI Build Week Challenge.

## Product workflow

1. An outgoing worker submits a written or recorded shift update.
2. GPT-5.6 Sol identifies urgent risks, open actions, ownership, timing, and missing operational context.
3. The outgoing worker saves the generated handover to the supervisor’s review queue.
4. A supervisor reviews and relays it to the incoming worker.
5. The incoming worker acknowledges receipt; both the creator and supervisor receive an in-app notification.

## Run locally

This project needs Node.js 18+ and PostgreSQL. Copy `.env.example` to `.env`, set `DATABASE_URL`, then start the server:

```bash
npm start
```

## Deploy on Render

The repository includes `render.yaml` for a Node.js web service. In Render, create a new **Blueprint**, connect `Riffmax2030-hub/ShiftRelay`, and deploy the detected Blueprint. Render uses `npm install`, starts the app with `npm start`, and checks `/health`.

The app works in demo mode without environment variables. To enable live GPT-5.6 Sol analysis and voice transcription, add these environment variables in the Render dashboard:

- `DATABASE_URL` (required for accounts, schedules, time tracking, and notifications)
- `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_TRANSCRIPTION_MODEL` (optional live AI and voice features)
- `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` (optional; enable email when a verified domain is available)

## GPT-5.6 Sol integration

The interface runs in **demo mode** when no credentials are set, so reviewers can test the complete product experience without credentials. For live analysis, copy `.env.example` to `.env`, add your OpenAI API key, and set `OPENAI_MODEL` to the exact GPT-5.6 Sol model ID available in your account. Set `OPENAI_TRANSCRIPTION_MODEL` to the transcription model available in your account for voice notes. Then start the app with `npm start`.

```powershell
Copy-Item .env.example .env
```

The server calls the Responses API server-side and returns structured JSON:

```json
{
  "summary": "...",
  "actions": [{ "title": "...", "priority": "high", "owner": "...", "due": "...", "evidence": "..." }],
  "risks": [{ "title": "...", "reason": "...", "escalation": "..." }],
  "missing_context": [{ "question": "...", "why_it_matters": "..." }]
}
```

The model prompt should require evidence from the submitted update, preserve uncertainty rather than invent facts, and prioritize safety-critical issues.

## Roles, storage, and notifications

ShiftRelay includes secure password sign-in, organisation registration, worker approval, role assignment, shift scheduling, clock-in/out history, calendar leave/swap requests, in-app notifications, incident reporting, analytics, audit history, and installable PWA support. PostgreSQL persists these records.

For a production deployment, replace the demo identity selector with a real authentication provider and move the JSON store to a managed database. The API permission checks and handover state machine are already separated from the interface to make that migration straightforward.

## Voice updates

Click **Record voice update**, allow microphone access, and stop recording. ShiftRelay sends the audio directly to its server-side transcription endpoint; the browser never receives or stores your OpenAI API key. The transcript is appended to the shift update and can then be analysed into a handover.

## Why Codex and GPT-5.6 Sol

- **GPT-5.6 Sol** powers the core reasoning task: distinguishing facts from uncertainty in unstructured operational updates, assigning actionable ownership, and detecting context gaps before a handover is relayed.
- **Codex** accelerated the product implementation: rapid UI iteration, interaction logic, structured-output contract design, and documentation.

## Sample scenario

The included scenario models a clinical evening-to-night handover. It demonstrates a cold-room temperature alert, delayed medication delivery, and a pending family update. The app is deliberately designed so the workflow can be adapted for retail, security, field services, hospitality, or logistics teams.

## Security

Never commit `.env` or any API key. If a key was ever committed or pasted into a tracked file, revoke it in the provider dashboard and create a replacement before deployment.
