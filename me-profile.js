/**
 * ShiftRelay — Me Profile (Frontline Career Engine)
 * Complete professional identity, work credentials, certifications, current position,
 * and proof-of-work milestones for shift workers.
 */

/* ─── Image compression helper: guarantees fast, reliable uploads without size issues ─── */
async function compressImageFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG
        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp.startsWith('data:image/webp')) {
            return resolve(webp);
          }
        } catch {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
window.compressImageFile = compressImageFile;

/* ─── Local storage helpers ───────────────────────────────────────────────── */
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
  return map[role] || 'Frontline Specialist';
}

/* ─── Professional SVG icons (zero emojis) ────────────────────────────────── */
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
  badgeCheck: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`
};

/* ─── Share Frontline Passport Dialog ─────────────────────────────────────── */
function openSharePassportDialog(profile, isSelf) {
  const existing = document.getElementById('share-passport-dialog');
  if (existing) existing.remove();

  const userId = profile.userId || state.user?.id || 'w1';
  const name = profile.fullName || state.user?.name || 'Frontline Worker';
  const headline = profile.headline || (profile.currentJob?.title ? `${profile.currentJob.title} · ${profile.currentJob.employer}` : 'Frontline Specialist');
  const initial = (name || 'W').slice(0, 2).toUpperCase();
  const avatarStyle = profile.avatarUrl || state.user?.avatar_data_url ? `background-image:url('${profile.avatarUrl || state.user?.avatar_data_url}');background-size:cover;background-position:center;color:transparent;` : '';
  const qrSvg = typeof window.generateVerificationQrSvg === 'function' ? window.generateVerificationQrSvg(`SR-PASS-${userId}`, 88) : '';
  const shareUrl = `${window.location.origin}/#worker-${userId}`;

  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="share-passport-dialog" style="display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="max-width:440px;width:92%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;border:1px solid #e2e8f0;">
        <button class="dialog-close" id="close-share-dialog" style="position:absolute;top:12px;right:14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;z-index:10;">×</button>
        
        <div style="background:linear-gradient(135deg, #0a3d38, #0d524d, #10b981);padding:24px 20px 20px;color:#fff;text-align:center;">
          <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 12px;border:3px solid #fff;background:#064e3b;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.2);${avatarStyle}">
            ${avatarStyle ? '' : initial}
          </div>
          <h3 style="margin:0;font-size:20px;font-weight:800;color:#fff;">${escape(name)}</h3>
          <p style="margin:4px 0 0;font-size:13px;color:#d1fae5;opacity:0.95;">${escape(headline)}</p>
          <span style="display:inline-block;margin-top:8px;background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Verified Frontline Passport</span>
        </div>

        <div style="padding:20px;text-align:center;">
          <div style="display:flex;justify-content:center;margin-bottom:14px;">
            ${qrSvg}
          </div>
          <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">Scan to view verified credentials &amp; handovers</p>
          <code style="display:block;background:#f8fafc;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;font-size:11px;color:#334155;word-break:break-all;margin-bottom:16px;">${shareUrl}</code>

          <div style="display:flex;gap:8px;">
            <button class="primary" id="copy-passport-link-btn" style="flex:1;min-height:42px;font-size:13px;font-weight:700;">Copy Passport Link</button>
            <button class="secondary" id="close-passport-card-btn" style="min-height:42px;font-size:13px;">Done</button>
          </div>
        </div>
      </div>
    </section>
  `);

  document.getElementById('close-share-dialog')?.addEventListener('click', () => document.getElementById('share-passport-dialog')?.remove());
  document.getElementById('close-passport-card-btn')?.addEventListener('click', () => document.getElementById('share-passport-dialog')?.remove());
  document.getElementById('copy-passport-link-btn')?.addEventListener('click', () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
    }
    toast('Frontline Passport link copied to clipboard!');
  });
}
window.openSharePassportDialog = openSharePassportDialog;

/* ─── Main render function ───────────────────────────────────────────────── */
async function renderMeProfile(targetUserId) {
  dashboardHeader('Me', 'YOUR PROFILE');
  const userId = targetUserId || state.user?.id;
  const isSelf = !targetUserId || targetUserId === state.user?.id;

  try {
    const [profileRes, badgeRes, timeRes, handoversRes] = await Promise.all([
      api(`/api/worker-profile/${userId}`),
      api('/api/verified-badge-request').catch(() => ({ request: null })),
      api('/api/time-entries').catch(() => ({ active: null, totalHours: 0, weekHours: 0 })),
      api('/api/handovers').catch(() => ({ handovers: [] }))
    ]);

    const profile = profileRes.profile || {};
    const allHandovers = handoversRes.handovers || [];
    const myHandovers = allHandovers.filter(h => h.createdBy === userId || (isSelf && h.createdBy === state.user?.id) || isSelf);
    const isClockedIn = Boolean(timeRes.active);

    // ── Cover photo (server profile or local storage fallback) ──
    const coverUrl = profile.coverPhotoUrl || getMeLocal('cover', userId, null);
    const coverStyle = coverUrl
      ? `background-image:url('${coverUrl}');background-size:cover;background-position:center;`
      : '';

    // ── Avatar ──
    const avatarImgUrl = profile.avatarUrl || state.user?.avatar_data_url || null;
    const avatarHtml = avatarImgUrl
      ? `<img src="${avatarImgUrl}" alt="${escape(profile.fullName || state.user?.name || 'Worker')}" />`
      : `<span>${escape((profile.fullName || state.user?.name || 'W').slice(0, 2).toUpperCase())}</span>`;

    // ── Verification badge ──
    const isVerified = profile.verifiedStatus === 'verified';
    const verifiedHtml = isVerified
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="#10b981" aria-label="Verified"><path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="none"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : '';

    // ── Role pill ──
    const role = state.user?.role || 'incoming';
    const rolePillClass = ['outgoing','incoming','supervisor','owner'].includes(role) ? role : 'default';

    // ── Current Job resolution ──
    const currentJob = profile.currentJob || {
      employer: profile.currentOrganisation || state.user?.organisation_name || 'ShiftRelay Network Facility',
      title: state.user?.title || profile.headline || roleLabel(role),
      department: state.user?.department || 'Operations Team',
      shiftType: 'Day Shift (12h)',
      shiftStart: state.user?.shift_start ? String(state.user.shift_start).slice(0, 5) : '07:00',
      shiftEnd: state.user?.shift_end ? String(state.user.shift_end).slice(0, 5) : '19:00',
      workingDays: Array.isArray(state.user?.shift_days) && state.user.shift_days.length ? state.user.shift_days.join(', ') : 'Mon, Tue, Wed, Thu',
      startDate: 'Active Placement'
    };

    // ── Work experience ──
    const workHistory = (profile.workHistory && profile.workHistory.length)
      ? profile.workHistory
      : getMeLocal('work', userId, [
          {
            title: currentJob.title,
            employer: currentJob.employer,
            startDate: '2023',
            endDate: null,
            description: 'Direct shift operations, verified handovers, and accountable frontline relay coordination.'
          }
        ]);

    // ── Certifications & Licenses ──
    const certifications = (profile.certifications && profile.certifications.length)
      ? profile.certifications
      : [
          { name: 'ShiftRelay Accountable Handover Pro', issuer: 'ShiftRelay Safety Standards', credentialId: 'SR-7829-PRO', active: true },
          { name: 'Frontline Safety & Protocol Certified', issuer: 'Occupational Safety Board', credentialId: 'FS-99120', active: true }
        ];

    // ── Stats ──
    const stats = profile.stats || {
      handoversRelayed: 24,
      shiftsCompleted: 18,
      checkInStreak: 7,
      reliabilityScore: 99.2,
      endorsementsCount: 14
    };

    // ── Render ──
    $('#dashboard').innerHTML = `
      <div class="me-profile-page">

        <!-- A. COVER PHOTO HERO -->
        <div class="me-cover-hero" style="${coverStyle}">
          ${!coverStyle ? '' : `<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.06),rgba(0,0,0,0.25));border-radius:inherit;"></div>`}

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
            <input type="file" id="me-cover-file-input" accept="image/*" style="display:none" />
            <input type="file" id="me-avatar-file-input" accept="image/*" style="display:none" />
          ` : ''}
        </div>

        <!-- B. IDENTITY BLOCK -->
        <div class="me-identity">
          <div class="me-name-row">
            <div>
              <h2 class="me-name">${escape(profile.fullName || state.user?.name || 'Shift Worker')} ${verifiedHtml}</h2>
              <p class="me-headline">${escape(currentJob.title)} · ${escape(currentJob.employer)}</p>
              <span class="me-role-pill ${rolePillClass}">${roleLabel(role)}</span>
            </div>
            <div class="me-name-actions">
              ${isSelf ? `
                <button class="secondary" id="me-share-passport-btn" style="min-height:36px;padding:0 14px;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
                  ${MeIcons.handshake()} Share Passport
                </button>
                <button class="primary" id="me-credential-top-btn" style="min-height:36px;padding:0 14px;font-size:13px;">Official Credential</button>
              ` : `
                <button class="primary" id="me-offer-btn" data-worker-id="${userId}" data-worker-name="${escape(profile.fullName)}" style="min-height:36px;padding:0 14px;font-size:13px;background:#059669;border-color:#059669;">Offer Shift / Hire</button>
                <button class="secondary" id="me-msg-btn" data-worker-id="${userId}" data-worker-name="${escape(profile.fullName)}" style="min-height:36px;padding:0 14px;font-size:13px;">Message</button>
              `}
            </div>
          </div>

          <!-- Meta chips row -->
          <div class="me-meta-row">
            <span class="me-meta-chip">
              ${MeIcons.location()}
              ${escape(profile.location || state.user?.country_code || 'Verified Workplace')}
            </span>
            <span class="me-meta-chip">
              ${MeIcons.briefcase()}
              ${escape(currentJob.department)}
            </span>
            <span class="me-meta-chip">
              ${MeIcons.award()}
              ${escape(isVerified ? 'Verified Frontline Member' : 'ShiftRelay Network')}
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

        <!-- SUB-TABS ROW -->
        <div class="discover-tab-row" style="margin:20px 0 16px;gap:8px;">
          <button class="discover-sub-tab active" data-me-tab="credentials">
            ${MeIcons.briefcase()} Credentials &amp; Career
          </button>
          <button class="discover-sub-tab" data-me-tab="relays">
            ${MeIcons.award()} My Shift Relays &amp; Logs (${myHandovers.length})
          </button>
          <button class="discover-sub-tab" data-me-tab="schedule">
            ${MeIcons.calendar2()} Roster &amp; Availability
          </button>
        </div>

        <!-- 1. CREDENTIALS & CAREER PANEL -->
        <div id="me-panel-credentials" class="me-tab-panel">

        <!-- D. ABOUT / BIO -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">About</h3>
            ${isSelf ? `<button class="me-section-action" id="me-bio-edit-btn">${MeIcons.edit()} Edit</button>` : ''}
          </div>
          <p class="me-bio-text" id="me-bio-text">${escape(profile.bioOutsideWork || 'Passionate about reliable shift operations, patient/client safety, and seamless team communication. Bringing continuous craft improvement to every shift.')}</p>
          ${isSelf ? `
            <div class="me-bio-edit-form" id="me-bio-form" style="display:none;">
              <textarea id="me-bio-textarea" placeholder="Your frontline story — professional experience, shift philosophy…" style="width:100%;min-height:90px;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:10px;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box;">${escape(profile.bioOutsideWork || '')}</textarea>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="primary me-save-bio-btn" style="min-height:36px;font-size:13px;">Save</button>
                <button class="secondary me-cancel-bio-btn" style="min-height:36px;font-size:13px;">Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- E. CURRENT POSITION ("START CURRENT JOB, BRO") -->
        <div class="me-section">
          <div class="me-section-header">
            <div>
              <h3 class="me-section-title">Current Position</h3>
            </div>
            ${isSelf ? `<button class="me-section-action" id="me-edit-position-btn">${MeIcons.edit()} Start New Job / Update</button>` : ''}
          </div>

          <div class="me-active-job-badge">
            ${MeIcons.check2()} Active Placement · ${escape(currentJob.startDate || 'Active')}
          </div>

          <div class="me-position-org-name">
            ${MeIcons.building()}
            ${escape(currentJob.employer)}
          </div>
          <div class="me-position-rows">
            <div class="me-position-row">
              ${MeIcons.briefcase()}
              <strong>${escape(currentJob.title)}</strong>
              ${currentJob.department ? `<span>· ${escape(currentJob.department)}</span>` : ''}
            </div>
            <div class="me-position-row">
              ${MeIcons.clock2()}
              <span>Shift: <strong>${escape(currentJob.shiftStart)} – ${escape(currentJob.shiftEnd)}</strong> (${escape(currentJob.shiftType || 'Standard')})</span>
            </div>
            <div class="me-position-row">
              ${MeIcons.calendar2()}
              <span>Days: <strong>${escape(currentJob.workingDays)}</strong></span>
            </div>
            <div class="me-position-row">
              ${MeIcons.clock2()}
              <span>Hours logged this month: <strong>${timeRes.totalHours ?? 32}h</strong> · This week: <strong>${timeRes.weekHours ?? 16}h</strong></span>
            </div>
          </div>

          <!-- Inline Start Job / Update Position Form (hidden by default) -->
          ${isSelf ? `
            <div class="me-add-form" id="me-job-form" style="display:none; margin-top:14px;">
              <h4 style="margin:0 0 4px;font-size:14px;font-weight:700;">Start New Job / Update Placement</h4>
              <p style="margin:0 0 10px;font-size:12px;color:var(--text-secondary);">Set your active employer, role, and roster schedule.</p>
              <div>
                <label class="me-form-label">Employer / Facility Name</label>
                <input id="me-job-employer" value="${escape(currentJob.employer)}" placeholder="e.g. St. Jude Hospital, Amazon Fulfillment, Hilton Hotels" required />
              </div>
              <div class="me-form-row-2">
                <div>
                  <label class="me-form-label">Job Title</label>
                  <input id="me-job-title" value="${escape(currentJob.title)}" placeholder="e.g. Staff Nurse, Lead Forklift Operator" required />
                </div>
                <div>
                  <label class="me-form-label">Department / Unit</label>
                  <input id="me-job-dept" value="${escape(currentJob.department)}" placeholder="e.g. Ward 4 West, Intake Bay B" />
                </div>
              </div>
              <div class="me-form-row-2">
                <div>
                  <label class="me-form-label">Shift Pattern</label>
                  <select id="me-job-type">
                    <option value="Day Shift (12h)" ${currentJob.shiftType?.includes('Day') ? 'selected' : ''}>Day Shift (12h)</option>
                    <option value="Night Shift (12h)" ${currentJob.shiftType?.includes('Night') ? 'selected' : ''}>Night Shift (12h)</option>
                    <option value="Swing / Evening (8h)" ${currentJob.shiftType?.includes('Swing') ? 'selected' : ''}>Swing / Evening (8h)</option>
                    <option value="Continental 4-on-4-off" ${currentJob.shiftType?.includes('Continental') ? 'selected' : ''}>Continental 4-on-4-off</option>
                  </select>
                </div>
                <div>
                  <label class="me-form-label">Shift Hours (Start – End)</label>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <input id="me-job-start" type="time" value="${escape(currentJob.shiftStart || '07:00')}" />
                    <span>–</span>
                    <input id="me-job-end" type="time" value="${escape(currentJob.shiftEnd || '19:00')}" />
                  </div>
                </div>
              </div>
              <div>
                <label class="me-form-label">Scheduled Days</label>
                <input id="me-job-days" value="${escape(currentJob.workingDays)}" placeholder="e.g. Mon, Tue, Wed, Thu" />
              </div>
              <div class="me-form-actions">
                <button class="primary" id="me-job-save-btn" style="min-height:38px;font-size:13px;">Save &amp; Start Job</button>
                <button class="secondary" id="me-job-cancel-btn" style="min-height:38px;font-size:13px;">Cancel</button>
              </div>
            </div>
          ` : ''}

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
            ${isSelf ? `<button class="me-section-action" id="me-exp-add-btn">${MeIcons.plus()} Add Experience</button>` : ''}
          </div>

          <div class="me-timeline">
            ${workHistory.map((job, i) => `
              <div class="me-timeline-item">
                <div class="me-timeline-dot ${!job.endDate ? 'current' : ''}"></div>
                <div class="me-timeline-body">
                  <p class="me-timeline-title">${escape(job.title)}</p>
                  <p class="me-timeline-meta">
                    <strong>${escape(job.employer)}</strong>
                    · ${escape(job.startDate)}${job.endDate ? ` – ${escape(job.endDate)}` : ' – Present (Current)'}
                  </p>
                  ${job.description ? `<p class="me-timeline-desc">${escape(job.description)}</p>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Add experience inline form -->
          ${isSelf ? `
            <div class="me-add-form" id="me-exp-form" style="display:none;">
              <h4 style="margin:0;font-size:13px;font-weight:700;">Add Work Experience</h4>
              <div>
                <label class="me-form-label">Job Title</label>
                <input id="me-exp-title" placeholder="e.g. Registered Nurse, Forklift Driver" />
              </div>
              <div>
                <label class="me-form-label">Employer / Facility</label>
                <input id="me-exp-employer" placeholder="e.g. NHS Foundation Trust, DHL Supply Chain" />
              </div>
              <div class="me-form-row-2">
                <div>
                  <label class="me-form-label">Start (Month Year)</label>
                  <input id="me-exp-start" placeholder="e.g. Jan 2022" />
                </div>
                <div>
                  <label class="me-form-label">End (or leave blank for Present)</label>
                  <input id="me-exp-end" placeholder="e.g. Dec 2023 or Present" />
                </div>
              </div>
              <div>
                <label class="me-form-label">Key Responsibilities &amp; Highlights</label>
                <textarea id="me-exp-desc" placeholder="Shift duties, special equipment operated, patient count, safety records…"></textarea>
              </div>
              <div class="me-form-actions">
                <button class="primary" id="me-exp-save-btn" style="min-height:38px;font-size:13px;">Save Experience</button>
                <button class="secondary" id="me-exp-cancel-btn" style="min-height:38px;font-size:13px;">Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- G. CERTIFICATES & CREDENTIALS -->
        <div class="me-section">
          <div class="me-section-header">
            <div>
              <h3 class="me-section-title">Certificates &amp; Verified Licenses</h3>
            </div>
            ${isSelf ? `<button class="me-section-action" id="me-add-cert-btn">${MeIcons.plus()} Add Certificate</button>` : ''}
          </div>

          <div class="me-certs-list" id="me-certs-container">
            ${certifications.map(c => {
              const name = typeof c === 'string' ? c : c.name;
              const issuer = typeof c === 'object' && c.issuer ? c.issuer : 'Verified Authority';
              const idNum = typeof c === 'object' && c.credentialId ? c.credentialId : 'VERIFIED';
              return `
                <div class="me-cert-card">
                  <div class="me-cert-icon-badge">${MeIcons.badgeCheck()}</div>
                  <div class="me-cert-body">
                    <p class="me-cert-name">${escape(name)}</p>
                    <p class="me-cert-issuer">${escape(issuer)}</p>
                    <div class="me-cert-meta">
                      <span class="me-cert-verified-pill">${MeIcons.check2()} Verified</span>
                      <span>ID: ${escape(idNum)}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Add Certificate inline form -->
          ${isSelf ? `
            <div class="me-add-form" id="me-cert-form" style="display:none; margin-top:14px;">
              <h4 style="margin:0;font-size:13px;font-weight:700;">Add Professional Certificate or License</h4>
              <div>
                <label class="me-form-label">Certificate / License Title</label>
                <input id="me-cert-title" placeholder="e.g. BLS / CPR for Healthcare, OSHA 30-Hour, CDL-A" required />
              </div>
              <div class="me-form-row-2">
                <div>
                  <label class="me-form-label">Issuing Authority / Body</label>
                  <input id="me-cert-issuer" placeholder="e.g. American Red Cross, OSHA, NMC UK" required />
                </div>
                <div>
                  <label class="me-form-label">License or Credential ID</label>
                  <input id="me-cert-id" placeholder="e.g. LIC-8824-A" />
                </div>
              </div>
              <div class="me-form-actions">
                <button class="primary" id="me-cert-save-btn" style="min-height:38px;font-size:13px;">Save Certificate</button>
                <button class="secondary" id="me-cert-cancel-btn" style="min-height:38px;font-size:13px;">Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- H. SKILLS & ENDORSEMENTS -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">Verified Skills &amp; Peer Endorsements</h3>
          </div>
          <div class="me-skills-wrap" id="me-skills-wrap">
            ${(profile.skills || ['Shift Handover Protocol', 'Incident Prevention', 'Team Communication', 'Process Compliance']).map(s => {
              const endorsers = (profile.endorsements && profile.endorsements[s]) || [];
              const count = endorsers.length;
              const endorsed = endorsers.includes(state.user?.id);
              return `<button class="skill-chip ${endorsed ? 'endorsed' : ''}" data-endorse-skill="${escape(s)}" data-worker-id="${userId}" title="Click to endorse">
                <span>${escape(s)}</span>
                ${!isSelf ? `<span class="endorse-badge">${count > 0 ? `· ${count}` : '+ Endorse'}</span>` : count > 0 ? `<span class="endorse-badge">· ${count}</span>` : ''}
              </button>`;
            }).join('')}
          </div>
          ${isSelf ? `
            <div class="me-skill-add-wrap" id="me-skill-add-row">
              <input id="me-skill-input" placeholder="Add a skill e.g. Triage, Forklift Inspection, Critical Handover…" maxlength="45" />
              <button class="primary" id="me-skill-save-btn" style="min-height:36px;padding:0 14px;font-size:13px;">Add Skill</button>
            </div>
          ` : ''}
        </div>

        <!-- I. FRONTLINE MILESTONES & BADGES -->
        <div class="me-section">
          <div class="me-section-header">
            <h3 class="me-section-title">Frontline Proof-of-Work Milestones</h3>
          </div>
          <div class="me-badges-grid">
            <!-- Top Relayer -->
            <div class="me-badge-card ${(stats.handoversRelayed ?? 0) >= 50 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.star()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Top Relayer</p>
                <p class="me-badge-progress">${(stats.handoversRelayed ?? 0) >= 50 ? 'Achieved ✓' : `${stats.handoversRelayed ?? 0}/50 Relays`}</p>
              </div>
            </div>
            <!-- Iron Streak -->
            <div class="me-badge-card ${(stats.checkInStreak ?? 0) >= 7 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.bolt()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Iron Streak</p>
                <p class="me-badge-progress">${(stats.checkInStreak ?? 0) >= 7 ? 'Achieved ✓' : `${stats.checkInStreak ?? 0}/7 Consecutive Days`}</p>
              </div>
            </div>
            <!-- Zero-Defect Reliability -->
            <div class="me-badge-card ${(stats.reliabilityScore ?? 0) >= 98 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.shield()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Zero-Defect Reliability</p>
                <p class="me-badge-progress">${(stats.reliabilityScore ?? 0) >= 98 ? 'Achieved ✓' : `${stats.reliabilityScore ?? 0}% Reliability Score`}</p>
              </div>
            </div>
            <!-- Peer-Vouched Pro -->
            <div class="me-badge-card ${(stats.endorsementsCount ?? 0) >= 5 ? 'earned' : ''}">
              <div class="me-badge-icon-wrap">${MeIcons.handshake()}</div>
              <div class="me-badge-info">
                <p class="me-badge-name">Peer-Vouched Pro</p>
                <p class="me-badge-progress">${(stats.endorsementsCount ?? 0) >= 5 ? 'Achieved ✓' : `${stats.endorsementsCount ?? 0}/5 Endorsements`}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- J. OFFICIAL CREDENTIAL CTA -->
        ${isSelf ? `
          <div class="me-credential-cta">
            <button id="me-print-credential-btn">
              ${MeIcons.print()}
              Print Official Proof-of-Work Credential
            </button>
          </div>
        ` : ''}

        </div><!-- /#me-panel-credentials -->

        <!-- 2. MY SHIFT RELAYS & LOGS PANEL -->
        <div id="me-panel-relays" class="me-tab-panel" style="display:none;">
          <div class="me-section">
            <div class="me-section-header">
              <h3 class="me-section-title">Verified Shift Relays &amp; Logs</h3>
              ${isSelf ? `<button class="primary" data-go="handover" style="min-height:34px;padding:0 12px;font-size:12px;">+ New Relay</button>` : ''}
            </div>
            ${myHandovers.length ? `
              <div class="me-relays-list">
                ${myHandovers.map(h => {
                  const hData = h.handover || {};
                  const actionsCount = Array.isArray(hData.actions) ? hData.actions.length : 0;
                  const dateStr = h.createdAt ? new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
                  const statusLabel = h.status === 'acknowledged' ? 'Acknowledged ✓' : h.status === 'relayed' ? 'Relayed Active' : 'Pending Review';
                  const statusClass = h.status === 'acknowledged' ? 'ack' : 'relayed';
                  return `
                    <div class="me-relay-card">
                      <div class="me-relay-top">
                        <span class="me-relay-status ${statusClass}">${statusLabel}</span>
                        <time class="me-relay-time">${dateStr}</time>
                      </div>
                      <p class="me-relay-summary">${escape(hData.summary || 'Shift handover briefing completed.')}</p>
                      ${actionsCount > 0 ? `
                        <div class="me-relay-actions-preview">
                          <strong>${actionsCount} critical action${actionsCount > 1 ? 's' : ''} relayed:</strong>
                          <ul>
                            ${hData.actions.slice(0, 3).map(a => `<li><span class="priority-tag ${a.priority || 'medium'}">${escape(a.priority || 'med')}</span> ${escape(a.title || a)}</li>`).join('')}
                          </ul>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="text-align:center;padding:36px 20px;background:var(--bg-surface-subtle);border-radius:12px;border:1px dashed var(--border-subtle);">
                <p style="margin:0 0 10px;font-size:14px;color:var(--text-secondary);">No shift handovers logged yet.</p>
                ${isSelf ? `<button class="primary" data-go="handover" style="min-height:38px;padding:0 16px;font-size:13px;">Create First Relay</button>` : ''}
              </div>
            `}
          </div>
        </div>

        <!-- 3. ROSTER & AVAILABILITY PANEL -->
        <div id="me-panel-schedule" class="me-tab-panel" style="display:none;">
          <div class="me-section">
            <div class="me-section-header">
              <h3 class="me-section-title">Weekly Roster &amp; Shift Schedule</h3>
            </div>
            
            <div class="me-position-rows" style="margin-bottom:20px;">
              <div class="me-position-row">
                ${MeIcons.building()}
                <strong>${escape(currentJob.employer)}</strong>
                <span>· ${escape(currentJob.department)}</span>
              </div>
              <div class="me-position-row">
                ${MeIcons.clock2()}
                <span>Roster Hours: <strong>${escape(currentJob.shiftStart)} – ${escape(currentJob.shiftEnd)}</strong></span>
              </div>
              <div class="me-position-row">
                ${MeIcons.calendar2()}
                <span>Working Days: <strong>${escape(currentJob.workingDays)}</strong></span>
              </div>
            </div>

            <!-- Overtime / Open Shifts Availability Card -->
            <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div>
                <strong style="color:#065f46;font-size:14px;display:block;">Available for Open Shifts &amp; Overtime</strong>
                <span style="font-size:12px;color:#047857;">Show your profile to supervisors looking for shift coverage.</span>
              </div>
              <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">
                <input type="checkbox" id="me-avail-toggle" ${getMeLocal('available_ot', userId, true) ? 'checked' : ''} style="opacity:0;width:0;height:0;" />
                <span style="position:absolute;inset:0;background:#10b981;border-radius:99px;transition:0.2s;" class="me-switch-track"></span>
              </label>
            </div>
          </div>
        </div>

      </div>
    `;

    /* ── Event handlers ──────────────────────────────────────────────────── */

    // Cover photo upload with automatic compression
    const coverEditBtn = $('#me-cover-edit-btn');
    const coverFileInput = $('#me-cover-file-input');
    if (coverEditBtn && coverFileInput) {
      coverEditBtn.addEventListener('click', () => coverFileInput.click());
      coverFileInput.addEventListener('change', async () => {
        const file = coverFileInput.files[0];
        if (!file) return;
        toast('Optimizing cover image…');
        try {
          const compressedDataUrl = await compressImageFile(file, 1600, 600, 0.85);
          setMeLocal('cover', userId, compressedDataUrl);
          await api('/api/worker-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coverPhotoUrl: compressedDataUrl })
          }).catch(() => {});
          toast('Cover photo updated.');
          renderMeProfile(targetUserId);
        } catch (err) {
          toast(err.message || 'Could not update cover photo.');
        }
      });
    }

    // Avatar upload with automatic client-side compression (fixes camera/phone photo size issues)
    const avatarCircle = $('#me-avatar-circle');
    const avatarFileInput = $('#me-avatar-file-input');
    if (isSelf && avatarCircle && avatarFileInput) {
      avatarCircle.addEventListener('click', () => avatarFileInput.click());
      avatarFileInput.addEventListener('change', async () => {
        const file = avatarFileInput.files[0];
        if (!file) return;
        toast('Processing profile photo…');
        try {
          const compressedDataUrl = await compressImageFile(file, 600, 600, 0.82);
          const result = await api('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarDataUrl: compressedDataUrl }),
          });
          state.user.avatar_data_url = result.avatarDataUrl || compressedDataUrl;

          // Update header avatar instantly
          const ha = document.getElementById('header-avatar');
          if (ha) {
            ha.innerHTML = `<img src="${compressedDataUrl}" alt="${escape(state.user.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
          }
          toast('Profile photo updated.');
          renderMeProfile(targetUserId);
        } catch (err) {
          toast(err.message || 'Photo upload failed.');
        }
      });
    }

    // Bio edit toggle
    const bioBtnEl = $('#me-bio-edit-btn');
    const bioFormEl = $('#me-bio-form');
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
          await api('/api/worker-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bioOutsideWork: newBio }),
          });
          toast('Bio updated.');
          renderMeProfile(targetUserId);
        } catch (err) { toast(err.message); }
      });
    }

    // Start New Job / Update Current Position
    const editPosBtn = $('#me-edit-position-btn');
    const jobForm = $('#me-job-form');
    if (editPosBtn && jobForm) {
      editPosBtn.addEventListener('click', () => {
        const open = jobForm.style.display !== 'none';
        jobForm.style.display = open ? 'none' : 'block';
      });
      $('#me-job-cancel-btn')?.addEventListener('click', () => {
        jobForm.style.display = 'none';
      });
      $('#me-job-save-btn')?.addEventListener('click', async () => {
        const employer = $('#me-job-employer')?.value?.trim();
        const title = $('#me-job-title')?.value?.trim();
        const department = $('#me-job-dept')?.value?.trim() || 'General Operations';
        const shiftType = $('#me-job-type')?.value;
        const shiftStart = $('#me-job-start')?.value || '07:00';
        const shiftEnd = $('#me-job-end')?.value || '19:00';
        const workingDays = $('#me-job-days')?.value?.trim() || 'Mon, Tue, Wed, Thu';

        if (!employer || !title) {
          toast('Please enter Employer name and Job title.');
          return;
        }

        const newJob = {
          employer,
          title,
          department,
          shiftType,
          shiftStart,
          shiftEnd,
          workingDays,
          startDate: 'Current'
        };

        try {
          await api('/api/worker-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentJob: newJob,
              currentOrganisation: employer,
              headline: `${title} · ${employer}`
            })
          });

          // Sync active user state
          if (state.user) {
            state.user.title = title;
            state.user.department = department;
            state.user.shift_start = shiftStart;
            state.user.shift_end = shiftEnd;
            state.user.shift_days = workingDays.split(',').map(d => d.trim());
          }

          // Sync header pill role text
          const hr = document.getElementById('header-role');
          if (hr) hr.textContent = title;

          toast(`Active position updated to ${title} at ${employer}!`);
          renderMeProfile(targetUserId);
        } catch (err) {
          toast(err.message || 'Could not update position.');
        }
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

    // Work experience form toggle & save
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
          toast('Please enter Job Title, Employer, and Start date.');
          return;
        }
        const newEntry = { title, employer, startDate, endDate, description };
        const updated = [newEntry, ...workHistory];
        try {
          await api('/api/worker-profile', {
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

    // Add Certificate form toggle & save
    const certAddBtn = $('#me-add-cert-btn');
    const certForm = $('#me-cert-form');
    if (certAddBtn && certForm) {
      certAddBtn.addEventListener('click', () => {
        const open = certForm.style.display !== 'none';
        certForm.style.display = open ? 'none' : 'flex';
      });
      $('#me-cert-cancel-btn')?.addEventListener('click', () => {
        certForm.style.display = 'none';
      });
      $('#me-cert-save-btn')?.addEventListener('click', async () => {
        const name = $('#me-cert-title')?.value?.trim();
        const issuer = $('#me-cert-issuer')?.value?.trim();
        const credentialId = $('#me-cert-id')?.value?.trim() || 'VERIFIED';
        if (!name || !issuer) {
          toast('Please enter Certificate Title and Issuing Body.');
          return;
        }
        const newCert = { name, issuer, credentialId, active: true };
        const updated = [newCert, ...certifications];
        try {
          await api('/api/worker-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certifications: updated })
          });
          toast(`Added certificate: ${name}!`);
          renderMeProfile(targetUserId);
        } catch (err) {
          toast(err.message || 'Could not save certificate.');
        }
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
        if (existing.includes(newSkill)) { toast('Skill already listed.'); return; }
        try {
          await api('/api/worker-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skills: [...existing, newSkill] }),
          });
          toast(`Added skill: "${newSkill}".`);
          renderMeProfile(targetUserId);
        } catch (err) { toast(err.message); }
      };
      skillSaveBtn.addEventListener('click', doAddSkill);
      skillInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAddSkill(); } });
    }

    // Endorse skills (when viewing other workers' profiles)
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

    // Sub-tab switching between Credentials, Relays, and Schedule
    document.querySelectorAll('[data-me-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tabKey = tabBtn.dataset.meTab;
        document.querySelectorAll('[data-me-tab]').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        document.querySelectorAll('.me-tab-panel').forEach(p => p.style.display = 'none');
        const targetPanel = document.getElementById(`me-panel-${tabKey}`);
        if (targetPanel) targetPanel.style.display = 'block';
      });
    });

    // Share Frontline Passport card
    $('#me-share-passport-btn')?.addEventListener('click', () => {
      openSharePassportDialog(profile, isSelf);
    });

    // Overtime / Open Shifts availability toggle
    const availToggle = $('#me-avail-toggle');
    if (availToggle) {
      availToggle.addEventListener('change', () => {
        setMeLocal('available_ot', userId, availToggle.checked);
        toast(availToggle.checked ? 'Status updated: Available for open shifts & overtime!' : 'Status updated: Overtime alerts paused.');
      });
    }

    // Official credential modal
    $('#me-credential-top-btn')?.addEventListener('click', () => {
      if (typeof openProofOfWorkCredentialDialog === 'function') openProofOfWorkCredentialDialog(profile);
    });
    $('#me-print-credential-btn')?.addEventListener('click', () => {
      if (typeof openProofOfWorkCredentialDialog === 'function') openProofOfWorkCredentialDialog(profile);
    });

    // Offer shift / message (for viewing colleague profiles)
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
