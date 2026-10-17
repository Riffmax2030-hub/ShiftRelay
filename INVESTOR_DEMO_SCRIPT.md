# ShiftRelay · Investor & Launch Demo Video Script

**Format:** 1080p Screen Recording with Voiceover  
**Target Duration:** ~2 minutes 45 seconds  
**URL:** `http://localhost:4000`  
**Key Persona Flow:** Amina (Outgoing Worker) → David (Supervisor) → Faith (Incoming Worker) → Jordan (Owner / Leadership)

---

## Storyboard & Scene-by-Scene Walkthrough

### ⏱️ Scene 1: The Problem & The Solution (0:00 – 0:25)
- **Screen View:** `http://localhost:4000` — Clean ShiftRelay Landing Page.
- **Action:** Cursor hovers over the landing page headline *"Every shift starts with the full picture"* and points to the workflow line: **Capture → Review → Acknowledge**.
- **Voiceover:**
  > "Over 2.7 billion frontline workers worldwide run operations in hospitals, hotels, warehouses, and factories. Yet today, shift changes are still managed with messy paper notebooks, fragmented WhatsApp chats, and rushed verbal updates.
  >
  > When information falls through the cracks, it causes costly downtime, compliance violations, and preventable accidents.
  >
  > We built **ShiftRelay** — a high-performance, mobile-first productivity platform that turns chaotic shift changes into structured, accountable digital relays."

---

### ⏱️ Scene 2: Multi-Tenant Architecture & Instant Join Code (0:25 – 0:45)
- **Screen View:** Click **"Register your organisation"**, then click **"Join with organisation ID"**.
- **Action:** Show the clean onboarding modal. Enter a 6-digit organization code (e.g. `246701`).
- **Voiceover:**
  > "ShiftRelay is built on an enterprise multi-tenant foundation. Organizations generate a unique 6-digit join code. When frontline staff sign up, they simply punch in their code and are instantly provisioned into their company's encrypted workspace — with strict tenant-level data isolation."

---

### ⏱️ Scene 3: The Shift Handover Hub (Amina · Outgoing Worker) (0:45 – 1:15)
- **Screen View:** Switch to **Amina Otieno (Operations Worker)**. Click **"New handover"**.
- **Action:** 
  1. Show the clean form with the **Shift Status Selector**: click between 🟢 Green, 🟡 Yellow, and 🔴 Red. Select 🟡 **Yellow (Needs Attention)**.
  2. Show the pre-filled notes about cold room temperature and pending pharmacy delivery.
  3. Click **"Generate handover"** (demonstrating AI brief generation).
  4. Scroll down to show structured actions and tasks, then click **"Submit handover"**.
- **Voiceover:**
  > "Before clocking off, outgoing workers log their update in seconds. They set a shift health status — Green, Yellow, or Red — input critical notes or dictate voice memos, and list tasks to relay.
  >
  > Server-side AI structures messy updates into categorized action items, timelines, and risks. The outgoing worker submits with one tap, sending it directly to the review queue."

---

### ⏱️ Scene 4: Supervisor Review & The Pinned Incoming Feed (1:15 – 1:45)
- **Screen View:** Switch role to **David Kariuki (Shift Supervisor)**, approve handover, then switch to **Faith Wanjiku (Incoming Worker)**.
- **Action:** 
  1. As David, view the pending handover and click **Relay**.
  2. Switch to Faith. Show Faith's dashboard.
  3. **Visual Highlight:** Zoom in on the **Digital Handover Feed** pinned at the top with the yellow status badge.
  4. Check off the first task: *"Verify cold-room temperature log reads under 5°C"*. Show the task strikethrough and the live counter update `(1/3 Completed)`.
- **Voiceover:**
  > "Shift supervisors review and approve handovers to ensure accountability before work moves forward.
  >
  > When the incoming worker clocks in, they don't have to scroll through hundreds of group chat messages. At the very top of their dashboard is a **Pinned Digital Handover Feed** with explicit color status, important notes, and an interactive checklist they cross off in real time as they complete their shift duties."

---

### ⏱️ Scene 5: WhatsApp-Style Real-Time Team Channels (1:45 – 2:15)
- **Screen View:** Click on the **"Community"** tab (or **Team** in mobile nav).
- **Action:**
  1. Click through department channels: `# General`, `# Shift Handover`, `# Kitchen Staff`, `# Night Shift`.
  2. Type a quick message in `# Shift Handover`: *"Confirming pharmacy courier just arrived at bay 2."* and press Enter.
  3. Show the instant message append and auto-scroll.
- **Voiceover:**
  > "To keep adoption frictionless, we designed our real-time communication around the familiar WhatsApp experience frontline workers already know.
  >
  > With zero learning curve, staff switch between dedicated department channels — from Kitchen Staff to Night Shift. Messages sync instantly over WebSockets, with zero-latency local caching so the app feels as snappy on a mobile browser as a native app."

---

### ⏱️ Scene 6: Reactive Calendar & Optimistic Shift Claiming (2:15 – 2:35)
- **Screen View:** Click on **"Calendar"** tab (or **Shifts** in mobile nav).
- **Action:**
  1. Show the **Daily Agenda & Live Staff Roster**: point out the green pulsing dot on **🟢 Currently Clocked In** (Alex Rivera), and **🕒 Up Next** (Sarah Chen).
  2. Switch to the **"Open Shifts"** tab (showing badge `2`).
  3. Click **"Claim Shift"** on *"Weekend Night Coverage"*.
  4. Notice the button updates *instantly* to **"Claimed ✓"** (optimistic update), the card highlights green, and the toast confirms: *"Shift claimed! Added to your schedule."*
- **Voiceover:**
  > "Frontline workforce management is fully integrated. Staff can view who is actively on the floor with live pulsing status indicators, who is reporting next, and view open coverage shifts.
  >
  > With optimistic UI updates, workers claim open shifts with a single tap, updating their schedule instantaneously while server synchronization happens seamlessly in the background."

---

### ⏱️ Scene 7: Traction & Investor Closing (2:35 – 2:50)
- **Screen View:** Return to the **Dashboard** or **Jordan Lee (Owner)** view showing workforce analytics.
- **Action:** Smooth zoom out or pan over the clean Linear-inspired UI.
- **Voiceover:**
  > "ShiftRelay bridges the critical gap between frontline communications and enterprise workforce accountability. By combining the speed of WhatsApp with the rigor of modern workflow software, we help frontline organizations eliminate operational errors from Day 1.
  >
  > ShiftRelay: Work moves forward."

---

## 🎬 Tips for Recording

1. **Resolution & Scaling:** Set your browser window to **1920x1080 (100% zoom)**.
2. **Smooth Cursor Movements:** Move your mouse deliberately and pause for 0.5s before clicking important buttons.
3. **No DevTools:** Keep developer console closed for a clean presentation.
4. **Audio:** Use a clean USB microphone or headset in a quiet room. Speak at an upbeat, confident pace.
5. **Retakes:** If you slip on a line, pause for 2 seconds and re-read the sentence; you can easily trim the silence in CapCut, Premiere, or Loom!
