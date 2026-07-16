# ShiftRelay

ShiftRelay prevents critical context from being lost at shift change. An outgoing worker adds rushed voice-transcript or text updates; the system turns them into a concise, accountable handover with risks, owners, deadlines, and missing context.

## Hackathon category

**Work & Productivity** — built for the OpenAI Build Week Challenge.

## Demo workflow

1. An outgoing team member pastes their shift update.
2. ShiftRelay identifies urgent risks, outstanding actions, ownership, timing, and missing operational context.
3. A supervisor reviews and resolves gaps.
4. The handover is relayed to the incoming team with clear accountability.

## Run locally

This project is dependency-free and needs Node.js 18+ only. Start the server from the project folder:

```bash
npm start
```

## GPT-5.6 Sol integration

The interface runs in **demo mode** when no credentials are set, so reviewers can test the complete product experience without credentials. For live analysis, copy `.env.example` to `.env`, add your OpenAI API key, and set `OPENAI_MODEL` to the exact GPT-5.6 Sol model ID available in your account. Then start the app with `npm start`.

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

## Why Codex and GPT-5.6 Sol

- **GPT-5.6 Sol** powers the core reasoning task: distinguishing facts from uncertainty in unstructured operational updates, assigning actionable ownership, and detecting context gaps before a handover is relayed.
- **Codex** accelerated the product implementation: rapid UI iteration, interaction logic, structured-output contract design, and documentation.

## Sample scenario

The included scenario models a clinical evening-to-night handover. It demonstrates a cold-room temperature alert, delayed medication delivery, and a pending family update. The app is deliberately designed so the workflow can be adapted for retail, security, field services, hospitality, or logistics teams.

## Next production steps

1. Add authenticated roles for outgoing worker, supervisor, and incoming worker.
2. Store handovers and acknowledgement events in a database.
3. Add a server-side GPT-5.6 Sol endpoint; never expose an API key in the browser.
4. Add voice transcription and notification delivery.
