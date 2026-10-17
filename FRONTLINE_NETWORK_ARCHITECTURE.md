# ShiftRelay · Frontline Career Network & Productivity Architecture

## Executive Overview
ShiftRelay is evolving from a shift handover utility into the **Global Professional Network for Frontline Workers** ("LinkedIn for the Deskless Workforce"). It combines high-speed shift productivity tools inside work with a portable, verified career passport and community outside work.

---

## 1. Core System Architecture

### A. The Frontline Worker Passport (Portable Career Identity)
Frontline workers (nurses, baristas, chefs, logistics drivers, security guards) change jobs frequently but have had no way to carry proof of reliability.
* **Proof-of-Work Reputation Metrics**:
  * **Verified Reliability Score**: Calculated from completed handovers, on-time relays, and supervisor endorsements (e.g. `99.2% Reliability`).
  * **Shift Milestones**: Total verified shifts completed (e.g. `240 Shifts Completed`).
  * **Daily Check-in Streak**: Rewarding consistent attendance (`🔥 14-Day Streak`).
  * **Task Completion Ratio**: Displayed in clean `2/2` notation.
* **Personal & Professional Bio**:
  * Role & Primary Industry (e.g. `Triage Lead · Healthcare`).
  * "Life Outside Shift" (bio, passions, sports, hobbies).
  * Skills & Certifications (e.g. `HACCP Certified`, `CPR/BLS`, `Forklift Level 2`).
  * Photo Gallery: Real moments from work and craft.

### B. The Shift Lounge (Global & Org Social Feed)
A friendly, clean feed inspired by LinkedIn and X, engineered specifically for shift workers.
* **Vector-First Social Actions (Strictly Zero Emojis for Controls)**:
  * **Like**: Handled with a crisp SVG heart icon.
  * **Comment**: Handled with an SVG conversation bubble.
  * **Repost**: Handled with an SVG reciprocal circulation arrow icon.
  * **Save**: Handled with an SVG bookmark ribbon icon.
  * **Share**: Handled with an SVG outbound sharing node icon.
* **Content Types**:
  * Shift milestones, craft photos, safety tips, gear recommendations, and daily celebrations.
  * Filterable by **Company Only** or **Worldwide Global Feed**.

### C. Daily Rewards & Check-in Streaks
* Workers earn streak points and reputation score increments for:
  1. Clocking in on time.
  2. Submitting or acknowledging handovers before shift conclusion.
  3. Completing all relay tasks (`2/2`).
* Gives prospective employers verifiable proof that the candidate is dependable and proven.

### D. The Verified Organization Portal
* **Verified Employer Badge**: Blue/green verified checkmark for registered organizations.
* **Instant 6-Digit Join Code**: `ORG CODE: XXXXXX` with one-tap clipboard copy for rapid staff onboarding.
* **Executive Metrics**:
  * Active Workforce Count
  * Handover Relay Completion Rate
  * Total Monthly Hours
  * Pending Worker Access Requests

---

## 2. Data Models

```typescript
interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  headline: string;
  bioOutsideWork: string;
  avatarUrl: string;
  coverImageUrl: string;
  verifiedStatus: 'verified' | 'unverified';
  industry: string;
  currentOrganisation: string;
  stats: {
    shiftsCompleted: number;
    handoversRelayed: number;
    reliabilityScore: number; // e.g. 99.4
    checkInStreak: number;     // e.g. 12
    endorsementsCount: number;
  };
  skills: string[];
  certifications: string[];
  gallery: Array<{ id: string; url: string; caption: string }>;
}

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string;
  authorVerified: boolean;
  organisationName: string;
  content: string;
  imageUrl?: string;
  category: 'tip' | 'milestone' | 'craft' | 'daily';
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  savesCount: number;
  userLiked?: boolean;
  userSaved?: boolean;
  createdAt: string;
}
```

---

## 3. Implementation Roadmap
1. **SVG Vector System**: Standalone SVG library for clean icon controls (no emoji dependencies for actions).
2. **Backend API Endpoints**:
   - `GET /api/feed/posts` & `POST /api/feed/posts`
   - `POST /api/feed/posts/:id/like`
   - `POST /api/feed/posts/:id/comment`
   - `POST /api/feed/posts/:id/repost`
   - `POST /api/feed/posts/:id/save`
   - `GET /api/profile/:id` & `PUT /api/profile`
   - `POST /api/attendance/check-in`
3. **User Dashboard Overhaul**:
   - Verified worker status banner
   - Daily streak badge & `2/2` progress counter
   - Direct tab to Shift Lounge community
4. **Organization Dashboard Overhaul**:
   - Verified employer badge
   - 6-digit Join Code card with 1-click copy
   - Pending approvals and live staff roster
5. **Worker Passport & Community View**:
   - Interactive profile modal & feed component with SVG actions.
