# ShiftRelay

> **The Frontline Productivity Engine & Global Professional Network for 2.7 Billion Shift Workers**  
> *"LinkedIn + Facebook for Frontline Teams"* — built for the OpenAI Build Week Challenge.

---

## 🚀 Hackathon Category
**Work & Productivity** — Transforming shift handovers, team coordination, worker proof-of-work, and coverage marketplace across healthcare, manufacturing, logistics, hospitality, and energy.

---

## 🌟 What ShiftRelay Solves
2.7 billion frontline workers operate in shifts, yet critical operational context is lost daily at shift handover. ShiftRelay replaces messy paper logs, fragmented WhatsApp chats, and rushed verbal notes with an **AI-powered handover relay** and an **enterprise frontline social network**.

### Core Pillars
1. **AI-Powered Shift Relay (GPT-5.6 Sol)**:
   - Outgoing workers speak or type unstructured operational updates.
   - AI extracts safety risks, prioritized action items, owners, deadlines, and flags missing operational context before departure.
   - Accountable human-in-the-loop relay: Outgoing Worker &rarr; Shift Supervisor Review &rarr; Incoming Worker Acknowledgement.
2. **Frontline Social Network & Shift Lounge**:
   - A dedicated professional community for shift workers to share wins, shift updates, and site announcements.
   - **Zero Emoji Action Controls**: Custom engineered SVG vector icons for **Like, Comment, Repost, Save, and Share**.
   - **Workplace Confidentiality Shield**: Mandatory policy verification certifying that no proprietary patient, customer, or facility data is disclosed publicly.
   - Direct coworker messaging modal for fast peer handovers.
3. **Worker Passport & Proof-of-Work Reliability**:
   - Verified worker badges, live on-time shift completion rates, and daily check-in streaks.
   - Clean `2/2` shift task tracking compliance (e.g. `2/2` instead of verbose formats).
   - Interactive peer skill endorsements with real-time counters to prove real frontline competence to future employers.
4. **Shift Coverage Marketplace**:
   - Instant open-shift broadcasting, quick-claim workflows, and peer shift swapping.
5. **Native Mobile & Offline Resilience**:
   - Built on Capacitor 8 for native **Android** and **iOS** deployment with camera, haptics, and status bar integration.
   - PWA Service Worker caching for seamless offline operation on spotty industrial connectivity.

---

## 🛠️ Tech Stack & Architecture

- **Backend Runtime**: Node.js 20+ (ES Modules), HTTP 206 Byte-Range streaming for video demos, Server-Sent Events (SSE) for real-time live feed & handover updates.
- **AI Core**: OpenAI GPT-5.6 Sol & Whisper Voice Transcription API.
- **Database & Datacenter**:
  - PostgreSQL 16 with PgBouncer connection pooling (configured for 5,000+ concurrent frontline connections).
  - Scalable data model for organisations, sites, memberships, handovers, feed posts, direct messages, and audit logs.
  - Automatic fallback to high-concurrency local storage when running in standalone mode.
- **Frontend**: Clean Vanilla JavaScript, Bento Grid UI, modern Glassmorphism, Zero-Emoji SVG iconography, responsive mobile-first layouts.
- **Mobile Toolchain**: Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/network`, `@capacitor/status-bar`).
- **DevOps & Containers**: Docker, Docker Compose, Kubernetes manifests (`k8s/`), and GitHub Actions CI/CD workflows.

---

## ⚡ Quick Start (Local Run)

ShiftRelay strictly runs on **Port 4000**.

### 1. Prerequisites
- Node.js 18+ (Node 20+ recommended)
- Git

### 2. Clone and Install
```bash
git clone https://github.com/Riffmax2030-hub/ShiftRelay.git
cd ShiftRelay
npm install
```

### 3. Run Development Server
```bash
npm start
```

Open **`http://localhost:4000`** in your browser.  
Health check endpoint: **`http://localhost:4000/health`** (returns `{"status":"ok"}`).

---

## 🎯 Judge & Investor Quick Start

No credentials required! ShiftRelay includes an interactive **Guided Investor Tour** and one-click **Role Preview**:

1. **Launch Tour**: Click **"Start 60-Second Investor Tour"** on the landing page for a step-by-step interactive walkthrough.
2. **Switch Roles**:
   - **Amina Otieno (Operations Worker)**: Draft an AI-assisted handover, clock in with attendance streak tracking, or post in the Shift Lounge.
   - **David Kariuki (Shift Supervisor)**: Review, edit risk ratings, and relay pending outgoing handovers.
   - **Faith Wanjiku (Incoming Worker)**: Acknowledge the relayed handover and complete incoming tasks (`2/2`).
   - **Jordan Lee (Organisation Owner)**: Review enterprise-wide workforce analytics, site compliance, and audit logs.
3. **Explore the Shift Lounge**: Click **"Shift Lounge"** to see live video/image sharing, peer skill endorsements, and zero-emoji interaction controls.
4. **Toggle Operational Modes**: Use the header mode switcher to toggle between **Investor Demo Mode** (seeded data & instant role switches) and **Clean Production Mode** (real worker sign-ups with zero mock accounts).

---

## 📱 Mobile App (Android & iOS)

To build and run the mobile apps:

```bash
# 1. Package static assets into www/
npm run build:mobile

# 2. Synchronize native platforms with Capacitor plugins
npm run cap:sync

# 3. Open in Android Studio or Xcode
npm run cap:android  # Launches Android Studio
npm run cap:ios      # Launches Xcode (macOS)
```

---

## 🐳 Docker & Datacenter Deployment

Run the complete multi-tier enterprise stack (ShiftRelay Engine + PgBouncer + PostgreSQL + Redis):

```bash
docker-compose up -d
```

The database initializes automatically using [`schema.sql`](schema.sql).

### Kubernetes
Enterprise deployment and service manifests are located in [`k8s/deployment.yaml`](k8s/deployment.yaml) with automated rolling updates and readiness/liveness health probes.

---

## 🌐 Cloud Deployment (Render / Cloud Run)

The repository includes [`render.yaml`](render.yaml) for zero-config deployment:
1. Connect `Riffmax2030-hub/ShiftRelay` in Render.
2. Set Environment Variables:
   - `PORT=4000`
   - `DATABASE_URL` (Managed Postgres connection string)
   - `OPENAI_API_KEY` (For live GPT-5.6 Sol handover synthesis)
3. Deploy!

---

## 🔒 Confidentiality & Security
Frontline workers deal with sensitive operational environments (healthcare patients, industrial equipment, proprietary logistics). ShiftRelay enforces:
- Strict **Workplace Confidentiality Shield** requiring certification prior to posting.
- Server-side OpenAI API key isolation (keys are never exposed to browser or client devices).
- Granular Role-Based Access Control (RBAC) and immutable audit event logging.

---

## 📄 License
MIT License. Built for the OpenAI Build Week Challenge.
