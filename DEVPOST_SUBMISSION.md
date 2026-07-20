# ShiftRelay

**Category:** Work and productivity

**Tagline:** The calm, accountable handover workspace for teams that never stop.

## Inspiration

Shift work should not depend on scattered WhatsApp messages, rushed verbal updates, or paper notes that disappear before the next person arrives. Teams in healthcare, logistics, retail, hospitality, manufacturing, and facilities work across time zones and need a clear record of what happened, what still needs attention, and who has confirmed it.

We built ShiftRelay to make every handover feel organised, human, and traceable. It gives workers a simple place to begin a shift, relay important context, follow the right checklist, and stay connected with their team.

## What it does

ShiftRelay is a mobile-first workplace portal for shift-based organisations. Organisations create a workspace and receive a unique organisation ID. Workers request access with their work details, then an owner or workforce manager approves them, assigns a role, workflow, and shift schedule.

Workers can clock in and out, view local shift times and work history, create structured handovers, record voice updates, follow incoming-shift checklists, and receive real-time action notifications. Supervisors review handovers before they are passed to the next worker. Workforce managers can approve staff, plan schedules, post open shifts, see the live roster, and track attendance. Teams can also use announcements, channels, and direct messages without mixing work updates with personal chats.

## How we built it

We built ShiftRelay as a responsive web app with a Node.js server, PostgreSQL data storage, and a mobile-first interface designed for daily frontline use. The app includes authentication, organisation membership approval, role-based dashboards, workflow checklists, time tracking, notifications, schedules, open-shift applications, team communication, profile photos, language preferences, and privacy/deletion pages.

GPT-5.6 Sol is used server-side to turn rough shift notes into structured handover briefs. We kept API credentials off the browser and designed the workflow so AI assists the worker while people remain responsible for review and final decisions. Codex accelerated the project by helping us design the database flows, build role-based screens, debug loading issues, improve navigation, and polish the mobile interaction experience.

## Challenges we ran into

The biggest challenge was keeping a feature-rich work app fast and calm on mobile. Early versions rebuilt whole dashboard screens after small actions, which made the product feel slow. We changed the interaction flow so clocking, approvals, acknowledgements, and applications show immediate feedback while the request completes in the background. We also moved the app cache to a network-first strategy so new deployments do not appear stale.

Another challenge was making one workflow work across different industries without forcing every worker into the same checklist. ShiftRelay supports role and workflow assignment at approval time, giving each organisation a foundation to tailor the experience to its own operations.

## Accomplishments that we're proud of

- Built a complete worker, supervisor, workforce-manager, and owner workflow rather than a single dashboard mock-up.
- Made handovers accountable: outgoing worker submits, supervisor reviews, and incoming worker acknowledges a checklist.
- Added practical workforce features including clock-in/out, monthly history, schedules, open shifts, roster visibility, announcements, and direct messages.
- Designed a friendlier mobile experience with quick feedback, profile personalisation, readable layouts, and language preferences.
- Kept the AI feature server-side and positioned it as support for people, not a replacement for workplace judgement.

## What we learned

We learned that frontline productivity is not about adding the most screens. It is about making the next action obvious, fast, and trustworthy. A worker should not wait for a whole page to reload just because they clocked in or acknowledged a handover.

We also learned that the best AI workflow is one that fits into existing responsibility chains. GPT-5.6 Sol is most useful here when it turns unstructured notes into a clear brief that a supervisor can still check before it affects the next shift.

## What's next for ShiftRelay

Next, we will add production email and push-notification delivery, configurable industry checklist templates, richer roster analytics, CSV/HRIS schedule imports, and native Android/iOS store builds. We will also add organisation-level reporting that helps workforce managers spot coverage risks, attendance patterns, and high-performing handover practices without turning employee data into surveillance.

## Built with

`JavaScript` · `Node.js` · `PostgreSQL` · `OpenAI API` · `GPT-5.6 Sol` · `Codex` · `HTML5` · `CSS3` · `Render` · `Service Workers` · `Web App Manifest`

## Try it out

- Repository: `https://github.com/Riffmax2030-hub/ShiftRelay`
- Live demo: add your current Render URL here.
- Demo video: add your public YouTube URL here.

## Video demo outline

1. Introduce the real problem: paper notes and informal chat make shift handovers easy to miss.
2. Show organisation setup and a worker requesting access with the organisation ID.
3. Show the workforce manager approving the worker, assigning role, workflow, and shift.
4. Show the outgoing worker creating a handover with GPT-5.6 Sol, then the supervisor review and incoming-worker checklist.
5. Show clock in/out, the schedule, notifications, and team communication.
6. Explain that Codex accelerated the end-to-end build, debugging, data flow, and mobile experience.
