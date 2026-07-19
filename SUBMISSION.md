# ShiftRelay submission kit

## Devpost description

ShiftRelay prevents critical operational context from disappearing when one frontline shift ends and another begins. Workers can paste or record their update; ShiftRelay turns it into a concise, evidence-grounded handover with prioritized actions, owners, deadlines, and missing-context prompts.

The outgoing worker saves the handover for review, the supervisor relays it, and the incoming worker acknowledges it. Each step creates a visible audit trail and in-app notification so teams can see that critical context was received.

## Problem and impact

Shift handovers are often rushed, verbal, and undocumented. That leaves incoming teams reconstructing what happened, which items are urgent, and who owns the next action. In clinical, retail, logistics, security, and field-service settings, this can create safety risks, missed customer commitments, and duplicated work.

ShiftRelay gives an incoming worker one accountable brief instead of a scattered collection of messages and memory. The MVP uses a clinical scenario, but the workflow is intentionally industry-neutral.

## How GPT-5.6 Sol is used

GPT-5.6 Sol performs the product's core reasoning task: it transforms unstructured shift updates into a structured handover while preserving evidence, surfacing uncertainty, and refusing to invent missing facts. The model output is constrained to an explicit JSON contract containing a summary, actions, priorities, owners, deadlines, evidence, and missing-context questions.

Voice updates use the server-side Transcriptions API before the transcript is sent to the Sol analysis endpoint. API keys never reach the browser.

## How Codex accelerated the work

Codex accelerated the end-to-end implementation: product scoping, responsive UI construction, the server-side structured-output contract, persistence and workflow state transitions, voice-capture integration, validation, and the project documentation. Key design decisions were to keep AI evidence-grounded, make human review mandatory before relay, and provide a credential-free demo mode for evaluators.

## Three-minute demo outline

1. **0:00–0:25 — Problem:** Explain that critical shift context is lost in verbal updates and chat messages.
2. **0:25–1:05 — Capture:** Record a short voice update or paste the supplied shift note. Generate the GPT-5.6 Sol handover.
3. **1:05–1:40 — Review:** Show priorities, evidence, owners, and the missing-detail prompt. Download the brief.
4. **1:40–2:15 — Accountability:** Save as the outgoing worker, switch to the supervisor to review and relay, then switch to the incoming worker to acknowledge.
5. **2:15–2:45 — Technical implementation:** Explain the server-side Sol call, structured JSON, transcription endpoint, and local persistence.
6. **2:45–3:00 — Impact:** Close with the outcome: every incoming shift knows what matters and who owns it.

## Reviewer setup

1. Use Node.js 18 or newer.
2. Copy `.env.example` to `.env` and configure API values for live analysis, or omit the file to use the built-in demo handover.
3. Run `npm start` and open `http://localhost:3000`.
