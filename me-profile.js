/**
 * ShiftRelay — Me Profile
 * The worker's full professional identity page.
 * Sections: Cover · Avatar · Bio · Current Position · Experience · Milestones · Skills · Gallery
 */

/* ─── Local storage keys ─────────────────────────────────────────────────── */
function meProfileKey(type, userId) {
  return `sr_${type}_${userId}`;
}

function getMeLocal(type, userId, fallback) {
  try {
    const raw = localStorage.getItem(meProfileKey(type, userId));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setMeLocal(type, userId, value) {
  try { localStorage.setItem(meProfileKey(type, userId), JSON.stringify(value)); } catch {}
}

/* ─── Role label helper ──────────────────────────────────────────────────── */
function roleLabel(role) {
  const map = {
    outgoing: 'Outgoing Worker',
    incoming: 'Incoming Worker',
    supervisor: 'Supervisor',
    owner: 'Organisation Owner',
    workforce_admin: 'Workforce Manager',
  };
  return map[role] || 'Frontline Worker';
}

/* ─── Badge SVG icons ─────────────────────────────────────────────────────── */
const MeIcons = {
  star: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bolt: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  shield: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>`,
  handshake: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  camera: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  building: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21V10M16 21V10M2 10h20M8 6h.01M12 6h.01M16 6h.01"/></svg>`,
  clock2: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  calendar2: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  location: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  edit: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  plus: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  award: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  briefcase: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>`,
  check2: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  print: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
};

/* ─── Main render function ───────────────────────────────────────────────── */
async function renderMeProfile(targetUserId) {
  dashboardHeader('Me', 'YOUR PROFILE');
  const userId = targetUserId || state.user?.id;
  const isSelf = !targetUserId || targetUserId === state.user?.id;

  try {
    const [profileRes, badgeRes, timeRes] = await Promise.all([
      api(`/api/worker-profile/${userId}`),
      api('/api/verified-badge-request').catch(() => ({ request: null })),
      api('/api/time-entries').catch(() => ({ active: null, totalHours: 0, weekHours: 0 })),
    ]);

    const profile = profileRes.profile;
    const badgeStatus = badgeRes.request?.status;
    const isClockedIn = Boolean(timeRes.active);

    // — Cover photo (persisted locally) —
    const coverUrl = getMeLocal('cover', userId, null);
    const coverStyle = coverUrl
      ? `background-image:url('${coverUrl}');background-size:cover;background-position:center;`
      : '';

    // — Avatar —
    const avatarHtml = profile.avatarUrl
      ? `<img src="${profile.avatarUrl}" alt="${escape(profile.fullName)}" />`
      : `<span>${escape((profile.fullName || 'W').slice(0, 2).toUpperCase())}</span>`;

    // — Verification badge —
    const verifiedHtml = profile.verifiedStatus === 'verified'
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="#10b981" aria-label="Verified"><path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="none"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : '';

    // — Role pill —
    const role = state.user?.role || 'incoming';
    const rolePillClass = ['outgoing','incoming','supervisor','owner'].includes(role) ? role : 'default';

    // — Work experience (try profile.workHistory then local storage) —
    const workHistory = profile.workHistory?.length
      ? profile.workHistory
      : getMeLocal('work', userId, []);

    // — Stats —
    const stats = profile.stats || {};

    // — Current org —
    const orgName = profile.currentOrganisation || state.user?.department || 'ShiftRelay Network';
    const shiftStart = state.user?.shift_start ? String(state.user.shift_start).slice(0, 5) : null;
    const shiftEnd = state.user?.shift_end ? String(state.user.shift_end).slice(0, 5) : null;
    const shiftDays = Array.isArray(state.user?.shift_days) && state.user.shift_days.length
      ? state.user.shift_days.join(', ')
      : null;

    // ── Render ────────────────────────────────────────────────────────────
    $('#dashboard').innerHTML = `
      <div class="me-profile-page">

        <!-- A. COVER PHOTO HERO -->
        <div class="me-cover-hero" style="${coverStyle}">
          ${!coverStyle ? '' : `<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.08),rgba(0,0,0,0.22));border-radius:inherit;"></div>`}

          <!-- Avatar overlapping cover -->
          <div class="me-avatar-wrap">
            <div class="me-avatar" id="me-avatar-circle" title="${isSelf ? 'Tap to change photo' : ''}">
              ${avatarHtml}
              ${isSelf ? `<div class="me-avatar-edit-overlay">${MeIcons.camera()}</div>` : ''}
            </div>
          </div>

          <!-- Cover edit button -->
          ${isSelf ? `
            <button class="me-cover-edit-btn" id="me-cover-edit-btn" type="button">
              ${MeIcons.camera()} Change cover
            </button>
            <input type="file" id="me-cover-file-input" accept="image/png,image/jpeg,image/webp" class="hidden" style="display:none" />
            <input type="file" id="me-avatar-file-input" accept="image/png,image/jpeg,image/webp" class="hidden" style="display:none" />
          ` : ''}
        </div>

        <!-- B. IDENTITY BLOCK -->
        <div class="me-identity">
          <div class="me-name-row">
            <div>
              <h2 class="me-name">${escape(profile.fullName)} ${verifiedHtml}</h2>
              <p class="me-headline">${escape(profile.headline || roleLabel(role))}</p>
              <span class="me-role-pill ${rolePillClass}">${roleLabel(role)}</span>
            </div>
            <div class="me-name-actions">
              ${isSelf ? `
                <button class="secondary" id="me-edit-profile-btn" style="min-height:36px;padding:0 14px;font-size:13px;">Edit Profile</button>
                <button class="primary" id="me-credential-top-btn" style="min-height:36px;padding:0 14px;font-size:13px;">Official Credential</button>
              ` : `
                <button class="primary" id="me-offer-btn" data-worker-id="${userId}" data-worker-name="${escape(profile.fullName)}" style="min-height:36px;padding:0 14px;font-size:13px;background:#059669;border-color:#059669;">Offer Shift / Hire</button>
                <button class="secondary" id="me-msg-btn" data-worker-id="${userId}" data-worker-name="${escape(profile.fullName)}" style="min-height:36px;padding:0 14px;font-size:13px;">Message</button>
              `}
            </div>
          </div>

          <!-- Meta chips row -->
          <div class="me-meta-row">
            ${profile.location || state.user?.country_code ? `
              <span class="me-meta-chip">
                ${MeIcons.location()}
                ${escape(profile.location || state.user?.country_code || 'Global')}
              </span>` : ''}
            <span class="me-meta-chip">
              ${MeIcons.briefcase()}
              ${escape(state.user?.department || 'Frontline Operations')}
            </span>
            <span class="me-meta-chip">
              ${MeIcons.award()}
              ${escape(profile.verifiedStatus === 'verified' ? 'Verified Worker' : 'ShiftRelay Member')}
            </span>
          </div>
        </div>

        <!-- C. QUICK STATS STRIP -->
        <div class="me-stats-strip">
          <div class="me-stat-card">
            <strong>${stats.handoversRelayed ?? 0}</strong>
            <span>Relays</span>
          </div>
          <div class="me-stat-card">
            <strong>${stats.shiftsCompleted ?? 0}</strong>
            <span>Shifts</span>
          </div>
          <div class="me-stat-card">
            <strong>${stats.checkInStreak ?? 0}<small style="font-size:14px;font-weight:600;">d</small></strong>
            <span>Streak</span>
          </div>
          <div class="me-stat-card">
            <strong>${stats.reliabilityScore ?? 0}<small style="font-size:14px;font-weight:600;">%</small></strong>
            <span>Reliability</span>
          </div>
        </div>

        <!-- D. ABOUT / BIO -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">About</h3>
            ${isSelf ? `<button class="me-section-action" id="me-bio-edit-btn">${MeIcons.edit()} Edit</button>` : ''}
          </div>
          <p class="me-bio-text" id="me-bio-text">${escape(profile.bioOutsideWork || 'No bio added yet. Tell your frontline story.')}</p>
          ${isSelf ? `
            <div class="me-bio-edit-form" id="me-bio-form" style="display:none;">
              <textarea id="me-bio-textarea" placeholder="Your frontline story — experience, passions, shift work philosophy…" style="width:100%;min-height:90px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:10px;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box;">${escape(profile.bioOutsideWork || '')}</textarea>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="primary me-save-bio-btn" style="min-height:36px;font-size:13px;">Save</button>
                <button class="secondary me-cancel-bio-btn" style="min-height:36px;font-size:13px;">Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- E. CURRENT POSITION -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">Current Position</h3>
          </div>
          <div class="me-position-org-name">
            ${MeIcons.building()}
            ${escape(orgName)}
          </div>
          <div class="me-position-rows">
            <div class="me-position-row">
              ${MeIcons.briefcase()}
              <strong>${escape(state.user?.title || roleLabel(role))}</strong>
              ${state.user?.department ? `<span>· ${escape(state.user.department)}</span>` : ''}
            </div>
            ${shiftStart && shiftEnd ? `
              <div class="me-position-row">
                ${MeIcons.clock2()}
                <span>Shift: <strong>${escape(shiftStart)} – ${escape(shiftEnd)}</strong></span>
              </div>` : ''}
            ${shiftDays ? `
              <div class="me-position-row">
                ${MeIcons.calendar2()}
                <span>${escape(shiftDays)}</span>
              </div>` : ''}
            <div class="me-position-row">
              ${MeIcons.clock2()}
              <span>Hours this month: <strong>${timeRes.totalHours ?? 0}h</strong> · This week: <strong>${timeRes.weekHours ?? 0}h</strong></span>
            </div>
          </div>
          ${isSelf ? `
            <div class="me-clock-bar">
              <span class="me-clock-status-pill ${isClockedIn ? 'active' : 'inactive'}">
                ${isClockedIn ? 'Clocked In' : 'Off Duty'}
              </span>
              <button class="${isClockedIn ? 'secondary' : 'primary'}" id="me-clock-btn" style="min-height:38px;padding:0 18px;font-size:13px;">
                ${isClockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          ` : ''}
        </div>

        <!-- F. WORK EXPERIENCE TIMELINE -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">Work Experience</h3>
            ${isSelf ? `<button class="me-section-action" id="me-exp-add-btn">${MeIcons.plus()} Add</button>` : ''}
          </div>

          ${workHistory.length === 0 ? `
            <div class="me-experience-empty">
              ${MeIcons.briefcase()}
              <p>Add your work history to build your frontline career profile.</p>
            </div>
          ` : `
            <div class="me-timeline">
              ${workHistory.map((job, i) => `
                <div class="me-timeline-item">
                  <div class="me-timeline-dot ${!job.endDate ? 'current' : ''}"></div>
                  <div class="me-timeline-body">
                    <p class="me-timeline-title">${escape(job.title)}</p>
                    <p class="me-timeline-meta">
                      ${escape(job.employer)}
                      · ${escape(job.startDate)}${job.endDate ? ` – ${escape(job.endDate)}` : ' – Present'}
                    </p>
                    ${job.description ? `<p class="me-timeline-desc">${escape(job.description)}</p>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}

          <!-- Add experience inline form (hidden by default) -->
          ${isSelf ? `
            <div class="me-add-form" id="me-exp-form" style="display:none;">
              <div>
                <label class="me-form-label">Job Title</label>
                <input id="me-exp-title" placeholder="e.g. Night Shift Nurse" />
              </div>
              <div>
                <label class="me-form-label">Employer / Organisation</label>
                <input id="me-exp-employer" placeholder="e.g. NHS London Trust" />
              </div>
              <div class="me-form-row-2">
                <div>
                  <label class="me-form-label">Start (Month Year)</label>
                  <input id="me-exp-start" placeholder="Jan 2022" />
                </div>
                <div>
                  <label class="me-form-label">End</label>
                  <input id="me-exp-end" placeholder="Dec 2023 or blank for Present" />
                </div>
              </div>
              <div>
                <label class="me-form-label">Brief Description</label>
                <textarea id="me-exp-desc" placeholder="What you did, key responsibilities…"></textarea>
              </div>
              <div class="me-form-actions">
                <button class="primary" id="me-exp-save-btn" style="min-height:38px;font-size:13px;">Save Experience</button>
                <button class="secondary" id="me-exp-cancel-btn" style="min-height:38px;font-size:13px;">Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- G. SKILLS & CERTIFICATIONS -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">Skills &amp; Certifications</h3>
          </div>
          <div class="me-skills-wrap" id="me-skills-wrap">
            ${(profile.skills || []).map(s => {
              const endorsers = (profile.endorsements && profile.endorsements[s]) || [];
              const count = endorsers.length;
              const endorsed = endorsers.includes(state.user?.id);
              return `<button class="skill-chip ${endorsed ? 'endorsed' : ''}" data-endorse-skill="${escape(s)}" data-worker-id="${userId}">
                <span>${escape(s)}</span>
                ${!isSelf ? `<span class="endorse-badge">${count > 0 ? `· ${count}` : '+ Endorse'}</span>` : count > 0 ? `<span class="endorse-badge">· ${count}</span>` : ''}
              </button>`;
            }).join('')}
            ${(profile.certifications || []).map(c => `
              <span class="skill-chip cert">${MeIcons.check2()} ${escape(c)}</span>
            `).join('')}
            ${(profile.skills || []).length === 0 && (profile.certifications || []).length === 0
              ? '<p style="font-size:13px;color:var(--text-secondary);margin:0;">No skills added yet.</p>'
              : ''}
          </div>
          ${isSelf ? `
            <div class="me-skill-add-wrap" id="me-skill-add-row">
              <input id="me-skill-input" placeholder="Add a skill e.g. Healthcare, Night Shifts…" maxlength="40" />
              <button class="primary" id="me-skill-save-btn" style="min-height:36px;padding:0 14px;font-size:13px;">Add</button>
            </div>
          ` : ''}
        </div>

        <!-- H. FRONTLINE MILESTONES & BADGES -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">Milestones &amp; Recognition</h3>
          </div>
          <div class="me-badges-grid">
            <!-- Top Relayer -->
            <div class="me-badge-card ${(stats.handoversRelayed ?? 0) >= 50 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.star()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Top Relayer</p>
                <p class="me-badge-progress">${(stats.handoversRelayed ?? 0) >= 50 ? 'Achieved' : `${stats.handoversRelayed ?? 0}/50 relays`}</p>
              </div>
            </div>
            <!-- Iron Streak -->
            <div class="me-badge-card ${(stats.checkInStreak ?? 0) >= 7 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.bolt()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Iron Streak</p>
                <p class="me-badge-progress">${(stats.checkInStreak ?? 0) >= 7 ? 'Achieved' : `${stats.checkInStreak ?? 0}/7 days`}</p>
              </div>
            </div>
            <!-- Zero-Defect Reliability -->
            <div class="me-badge-card ${(stats.reliabilityScore ?? 0) >= 98 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.shield()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Zero-Defect</p>
                <p class="me-badge-progress">${(stats.reliabilityScore ?? 0) >= 98 ? 'Achieved' : `${stats.reliabilityScore ?? 0}% reliability`}</p>
              </div>
            </div>
            <!-- Peer-Vouched Pro -->
            <div class="me-badge-card ${(stats.endorsementsCount ?? 0) >= 5 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.handshake()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Peer-Vouched</p>
                <p class="me-badge-progress">${(stats.endorsementsCount ?? 0) >= 5 ? 'Achieved' : `${stats.endorsementsCount ?? 0}/5 endorsements`}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- I. SHIFT MOMENTS GALLERY -->
        ${profile.gallery?.length ? `
          <div class="me-section">
            <div class="me-section-header">
              <h3 class="me-section-title">Shift Moments</h3>
            </div>
            <div class="me-gallery-grid">
              ${profile.gallery.map(g => `
                <div class="me-gallery-item">
                  <img src="${escape(g.url)}" alt="Shift moment" loading="lazy" />
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- J. OFFICIAL CREDENTIAL CTA -->
        ${isSelf ? `
          <div class="me-credential-cta">
            <button id="me-print-credential-btn">
              ${MeIcons.print()}
              Print Official Proof-of-Work Credential
            </button>
          </div>
        ` : ''}

      </div>
    `;

    /* ── Event handlers ──────────────────────────────────────────────────── */

    // Cover photo upload
    const coverEditBtn = $('#me-cover-edit-btn');
    const coverFileInput = $('#me-cover-file-input');
    if (coverEditBtn && coverFileInput) {
      coverEditBtn.addEventListener('click', () => coverFileInput.click());
      coverFileInput.addEventListener('change', async () => {
        const file = coverFileInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast('Cover photo must be under 5 MB.'); return; }
        const reader = new FileReader();
        reader.onload = () => {
          setMeLocal('cover', userId, reader.result);
          toast('Cover photo updated.');
          renderMeProfile(targetUserId);
        };
        reader.readAsDataURL(file);
      });
    }

    // Avatar upload
    const avatarCircle = $('#me-avatar-circle');
    const avatarFileInput = $('#me-avatar-file-input');
    if (isSelf && avatarCircle && avatarFileInput) {
      avatarCircle.addEventListener('click', () => avatarFileInput.click());
      avatarFileInput.addEventListener('change', async () => {
        const file = avatarFileInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast('Profile photo must be under 5 MB.'); return; }
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result;
          try {
            const result = await api('/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatarDataUrl: dataUrl }),
            });
            state.user.avatar_data_url = result.avatarDataUrl || dataUrl;
            // Update header pill avatar
            const ha = document.getElementById('header-avatar');
            if (ha) {
              ha.innerHTML = `<img src="${dataUrl}" alt="${escape(state.user.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
            }
            toast('Profile photo updated.');
            renderMeProfile(targetUserId);
          } catch (err) {
            toast(err.message || 'Photo upload failed.');
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Edit Profile → open existing passport dialog
    $('#me-edit-profile-btn')?.addEventListener('click', () => {
      if (typeof openPassportEditDialog === 'function') openPassportEditDialog(profile);
    });

    // Bio edit toggle
    const bioBtnEl = $('#me-bio-edit-btn');
    const bioFormEl = $('#me-bio-form');
    const bioTextEl = $('#me-bio-text');
    if (bioBtnEl && bioFormEl) {
      bioBtnEl.addEventListener('click', () => {
        const open = bioFormEl.style.display !== 'none';
        bioFormEl.style.display = open ? 'none' : 'block';
        bioBtnEl.textContent = open ? 'Edit' : 'Cancel';
      });
      bioFormEl.querySelector('.me-cancel-bio-btn')?.addEventListener('click', () => {
        bioFormEl.style.display = 'none';
        bioBtnEl.innerHTML = `${MeIcons.edit()} Edit`;
      });
      bioFormEl.querySelector('.me-save-bio-btn')?.addEventListener('click', async () => {
        const newBio = $('#me-bio-textarea')?.value?.trim() || '';
        try {
          await api('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bioOutsideWork: newBio }),
          });
          toast('Bio updated.');
          renderMeProfile(targetUserId);
        } catch (err) { toast(err.message); }
      });
    }

    // Clock in / out
    $('#me-clock-btn')?.addEventListener('click', async () => {
      const btn = $('#me-clock-btn');
      const wasClockedIn = btn.textContent.trim() === 'Clock Out';
      btn.disabled = true;
      btn.textContent = wasClockedIn ? 'Clocking out…' : 'Clocking in…';
      try {
        await api(wasClockedIn ? '/api/time-entries/clock-out' : '/api/time-entries/clock-in', { method: 'POST' });
        toast(wasClockedIn ? 'Clocked out. Great shift!' : 'Clocked in. Work moves forward.');
        renderMeProfile(targetUserId);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = wasClockedIn ? 'Clock Out' : 'Clock In';
        toast(err.message);
      }
    });

    // Work experience: show/hide add form
    const expAddBtn = $('#me-exp-add-btn');
    const expForm = $('#me-exp-form');
    if (expAddBtn && expForm) {
      expAddBtn.addEventListener('click', () => {
        const open = expForm.style.display !== 'none';
        expForm.style.display = open ? 'none' : 'flex';
      });
      $('#me-exp-cancel-btn')?.addEventListener('click', () => {
        expForm.style.display = 'none';
      });
      $('#me-exp-save-btn')?.addEventListener('click', async () => {
        const title = $('#me-exp-title')?.value?.trim();
        const employer = $('#me-exp-employer')?.value?.trim();
        const startDate = $('#me-exp-start')?.value?.trim();
        const endDate = $('#me-exp-end')?.value?.trim() || null;
        const description = $('#me-exp-desc')?.value?.trim() || '';
        if (!title || !employer || !startDate) {
          toast('Please fill in Job Title, Employer, and Start date.');
          return;
        }
        const newEntry = { title, employer, startDate, endDate, description };
        const existing = getMeLocal('work', userId, []);
        const updated = [newEntry, ...existing];
        // Try save to server, fallback to local
        try {
          await api('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workHistory: updated }),
          });
        } catch {
          setMeLocal('work', userId, updated);
        }
        toast('Experience added.');
        renderMeProfile(targetUserId);
      });
    }

    // Add skill
    const skillSaveBtn = $('#me-skill-save-btn');
    const skillInput = $('#me-skill-input');
    if (skillSaveBtn && skillInput) {
      const doAddSkill = async () => {
        const newSkill = skillInput.value.trim();
        if (!newSkill) return;
        const existing = profile.skills || [];
        if (existing.includes(newSkill)) { toast('Skill already added.'); return; }
        try {
          await api('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skills: [...existing, newSkill] }),
          });
          toast(`"${newSkill}" added to your profile.`);
          renderMeProfile(targetUserId);
        } catch (err) { toast(err.message); }
      };
      skillSaveBtn.addEventListener('click', doAddSkill);
      skillInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAddSkill(); } });
    }

    // Endorse skills (for viewing other workers' profiles)
    document.querySelectorAll('[data-endorse-skill]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (isSelf) return;
        btn.disabled = true;
        const skill = btn.dataset.endorseSkill;
        const wid = btn.dataset.workerId;
        try {
          const res = await api(`/api/worker-profile/${wid}/endorse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill }),
          });
          btn.classList.toggle('endorsed', res.endorsed);
          const badge = btn.querySelector('.endorse-badge');
          if (badge) badge.textContent = res.count > 0 ? `· ${res.count}` : '+ Endorse';
          toast(res.endorsed ? `Endorsed ${skill}` : `Removed endorsement`);
        } catch (err) { toast(err.message); }
        finally { btn.disabled = false; }
      });
    });

    // Official credential
    $('#me-credential-top-btn')?.addEventListener('click', () => {
      if (typeof openProofOfWorkCredentialDialog === 'function') openProofOfWorkCredentialDialog(profile);
    });
    $('#me-print-credential-btn')?.addEventListener('click', () => {
      if (typeof openProofOfWorkCredentialDialog === 'function') openProofOfWorkCredentialDialog(profile);
    });

    // Offer shift / message (viewing other profiles)
    $('#me-offer-btn')?.addEventListener('click', (e) => {
      if (typeof openShiftOfferDialog === 'function')
        openShiftOfferDialog(e.currentTarget.dataset.workerId, e.currentTarget.dataset.workerName);
    });
    $('#me-msg-btn')?.addEventListener('click', (e) => {
      if (typeof openDirectMessageDialog === 'function')
        openDirectMessageDialog(e.currentTarget.dataset.workerId, e.currentTarget.dataset.workerName);
    });

    bindNavigation();

  } catch (err) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(err.message || 'Unable to load profile.')}</p>`;
  }
}

/* ── Alias — all existing renderWorkerPassport() calls now show the Me page ── */
window.renderWorkerPassport = renderMeProfile;
window.renderMeProfile = renderMeProfile;
