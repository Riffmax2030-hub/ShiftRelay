/**
 * ShiftRelay Phase 1 Shell & Navigation Controller
 *
 * Implements:
 * 1. Responsive Header (Company + Site context pill, Sync status, Notifications bell, User menu)
 * 2. Role-Differentiated Navigation (Worker 4-tab dock vs. Manager sidebar & desk)
 * 3. Polished Worker Today Screen (Clock-in/out, live timer, incoming/outgoing handover, shift tasks)
 * 4. Polished Manager Overview Screen (Pending access reviews, handovers awaiting relay, live headcount)
 * 5. Authorised Multi-Company Context Switcher Modal
 */

(function () {
  'use strict';

  let elapsedInterval = null;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getUser() {
    return window.state?.user || null;
  }

  function isManagerRole(role) {
    return role === 'supervisor' || role === 'owner';
  }

  // ── 1. Mount Application Shell ──────────────────────────────────────────────
  async function mountShell(activeView = null) {
    const user = getUser();
    if (!user) return;

    const isManager = isManagerRole(user.role);
    const defaultView = isManager ? 'overview' : 'today';
    const view = activeView || defaultView;

    const appContainer = document.getElementById('dashboard');
    if (!appContainer) return;

    // Suppress legacy onboarding overlay that intercepts pointer events
    try {
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      document.getElementById('sr-onboarding-modal-root')?.remove();
    } catch (_) {}

    // Check offline status
    const isOffline = !navigator.onLine || (window.OfflineQueue?.getPendingCount?.() > 0);

    // Build responsive header HTML
    const companyName = user.organisation_name || user.organisationId || 'Workplace';
    const siteName = user.department || user.site_name || 'Main Facility';
    const roleTitle = user.title || user.role || 'Member';

    // Notification unread count
    let unreadCount = 0;
    try {
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        unreadCount = (notifData.notifications || []).filter(n => !n.read_at && !n.read).length;
      }
    } catch (_) {}

    const shellHtml = `
      <div id="sr-app-shell">
        <!-- Top Responsive Header -->
        <header class="sr-header" role="banner">
          <div class="sr-header-left">
            <a href="#" class="sr-brand-link" id="sr-brand-home" aria-label="ShiftRelay Home">
              <img src="icon.svg" alt="" width="32" height="32" />
              <span>Shift<span>Relay</span></span>
            </a>

            <!-- Company vs Site Context Switcher Pill -->
            <button class="sr-context-pill" id="sr-btn-context" aria-label="Switch organization context" title="Click to switch workplace">
              <span class="sr-dot"></span>
              <div class="sr-context-pill-text">
                <span class="sr-context-pill-org">${escapeHtml(companyName)}</span>
                <span class="sr-context-pill-site">${escapeHtml(siteName)} · ${escapeHtml(roleTitle)}</span>
              </div>
              <svg class="sr-context-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>

          <div class="sr-header-right">
            <!-- Offline / Sync Pill -->
            <div class="sr-sync-pill ${isOffline ? 'offline' : ''}" id="sr-shell-sync">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
              <span>${isOffline ? 'Offline Mode' : 'Connected'}</span>
            </div>

            <!-- Notifications Bell -->
            <button class="sr-icon-btn" id="sr-shell-bell" aria-label="Notifications" title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              ${unreadCount > 0 ? `<span class="sr-badge-counter">${unreadCount}</span>` : ''}
            </button>

            <!-- User Avatar & Profile Trigger -->
            <button class="sr-user-avatar" id="sr-shell-avatar" aria-label="Account profile" title="${escapeHtml(user.name)}">
              ${escapeHtml(user.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
            </button>
          </div>
        </header>

        <!-- Body Shell (Desktop Sidebar + Main Area + Mobile Dock) -->
        <div class="sr-body-wrap">
          <!-- Desktop Sidebar -->
          <nav class="sr-sidebar" aria-label="Sidebar navigation">
            <div class="sr-sidebar-role-badge">
              ${isManager ? (user.role === 'owner' ? 'Organisation Owner' : 'Shift Supervisor') : 'Frontline Specialist'}
            </div>
            ${isManager ? `
              <button class="sr-nav-btn ${view === 'overview' ? 'active' : ''}" data-sr-view="overview">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                <span>Overview</span>
              </button>
              <button class="sr-nav-btn ${view === 'schedule' ? 'active' : ''}" data-sr-view="schedule">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <span>Schedule</span>
              </button>
              <button class="sr-nav-btn ${view === 'team' ? 'active' : ''}" data-sr-view="team">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Team Directory</span>
              </button>
              <button class="sr-nav-btn ${view === 'handovers' ? 'active' : ''}" data-sr-view="handovers">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                <span>Handovers</span>
              </button>
              <button class="sr-nav-btn ${view === 'approvals' ? 'active' : ''}" data-sr-view="approvals">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>Approvals</span>
              </button>
              ${user.role === 'owner' ? `
                <button class="sr-nav-btn ${view === 'settings' ? 'active' : ''}" data-sr-view="settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  <span>Organisation Settings</span>
                </button>
              ` : ''}
            ` : `
              <button class="sr-nav-btn ${view === 'today' ? 'active' : ''}" data-sr-view="today">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Today</span>
              </button>
              <button class="sr-nav-btn ${view === 'schedule' ? 'active' : ''}" data-sr-view="schedule">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <span>Schedule</span>
              </button>
              <button class="sr-nav-btn ${view === 'handovers' ? 'active' : ''}" data-sr-view="handovers">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                <span>Handovers</span>
              </button>
              <button class="sr-nav-btn ${view === 'me' ? 'active' : ''}" data-sr-view="me">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Me (Profile)</span>
              </button>
            `}
          </nav>

          <!-- Main Scrollable Area -->
          <main class="sr-main-content" id="sr-content-area" role="main">
            <!-- Screen content injected here -->
          </main>
        </div>

        <!-- Mobile Bottom Dock (Hidden on >= 768px) -->
        <nav class="sr-mobile-dock" aria-label="Mobile navigation">
          ${isManager ? `
            <button class="sr-dock-item ${view === 'overview' ? 'active' : ''}" data-sr-view="overview">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              <span class="sr-dock-label">Overview</span>
            </button>
            <button class="sr-dock-item ${view === 'schedule' ? 'active' : ''}" data-sr-view="schedule">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span class="sr-dock-label">Schedule</span>
            </button>
            <button class="sr-dock-item ${view === 'team' ? 'active' : ''}" data-sr-view="team">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span class="sr-dock-label">Team</span>
            </button>
            <button class="sr-dock-item ${view === 'handovers' ? 'active' : ''}" data-sr-view="handovers">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="sr-dock-label">Relays</span>
            </button>
            <button class="sr-dock-item ${view === 'approvals' ? 'active' : ''}" data-sr-view="approvals">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span class="sr-dock-label">Approvals</span>
            </button>
          ` : `
            <button class="sr-dock-item ${view === 'today' ? 'active' : ''}" data-sr-view="today">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="sr-dock-label">Today</span>
            </button>
            <button class="sr-dock-item ${view === 'schedule' ? 'active' : ''}" data-sr-view="schedule">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span class="sr-dock-label">Schedule</span>
            </button>
            <button class="sr-dock-item ${view === 'handovers' ? 'active' : ''}" data-sr-view="handovers">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/></svg>
              <span class="sr-dock-label">Handovers</span>
            </button>
            <button class="sr-dock-item ${view === 'me' ? 'active' : ''}" data-sr-view="me">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span class="sr-dock-label">Me</span>
            </button>
          `}
        </nav>
      </div>
    `;

    // Hide old landing / old dock
    const oldDock = document.querySelector('.frontline-dock');
    if (oldDock) oldDock.style.display = 'none';
    const oldHeader = document.querySelector('.app-header');
    if (oldHeader) oldHeader.style.display = 'none';

    appContainer.innerHTML = shellHtml;

    // Bind navigation buttons
    document.querySelectorAll('[data-sr-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(btn.dataset.srView);
      });
    });

    // Header tool triggers
    document.getElementById('sr-brand-home')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(isManager ? 'overview' : 'today');
    });

    document.getElementById('sr-btn-context')?.addEventListener('click', openContextModal);

    document.getElementById('sr-shell-bell')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('notifications');
    });

    document.getElementById('sr-shell-avatar')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('me');
    });

    document.getElementById('sr-shell-sync')?.addEventListener('click', async () => {
      if (window.OfflineQueue?.syncQueue) {
        await window.OfflineQueue.syncQueue();
      }
      mountShell(view);
    });

    // Render requested screen
    if (view === 'today') {
      await renderWorkerToday();
    } else if (view === 'overview') {
      await renderManagerOverview();
    } else {
      // Bridge smoothly to existing sub-views for Schedule, Team, Handovers, Me, Settings
      await bridgeExistingView(view);
    }
  }

  function navigate(viewName) {
    mountShell(viewName);
  }

  // ── 2. Polished Worker Today Screen ─────────────────────────────────────────
  async function renderWorkerToday() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    if (elapsedInterval) {
      clearInterval(elapsedInterval);
      elapsedInterval = null;
    }

    container.innerHTML = `
      <div class="sr-skeleton" style="height: 120px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 180px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 200px;"></div>
    `;

    try {
      // Parallel fetch of real backend state
      const [timeRes, handoversRes] = await Promise.all([
        fetch('/api/time-entries'),
        fetch('/api/handovers')
      ]);

      const timeData = timeRes.ok ? await timeRes.json() : { active: null, entries: [] };
      const handoversData = handoversRes.ok ? await handoversRes.json() : { handovers: [] };

      const activeEntry = timeData.active;
      const isClockedIn = Boolean(activeEntry);
      const handovers = handoversData.handovers || [];

      // Relevant handover determination
      const isIncoming = user.role === 'incoming';
      let relevantHandover = null;
      if (isIncoming) {
        // Look for relayed handover ready for acknowledgement
        relevantHandover = handovers.find(h => h.status === 'relayed') || handovers[0] || null;
      } else {
        // Outgoing or general worker: latest handover
        relevantHandover = handovers[0] || null;
      }

      const tasks = relevantHandover?.handover?.tasks || relevantHandover?.handover?.actions || [];
      const companyName = user.organisation_name || 'Apex Healthcare';
      const siteName = user.department || 'Operations Unit';

      const html = `
        <!-- Distinct Company vs Site Context Banner -->
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Facility: ${escapeHtml(companyName)}</span>
            <span class="sr-context-banner-site">Assigned Site / Unit: <strong>${escapeHtml(siteName)}</strong></span>
          </div>
          <span class="sr-context-banner-badge">${escapeHtml(user.role.toUpperCase())}</span>
        </div>

        <!-- Primary Shift Status & Clocking Card -->
        <section class="sr-clock-card ${isClockedIn ? 'clocked-in' : ''}" id="sr-clock-card" aria-label="Shift Time Tracking">
          <div class="sr-clock-header">
            <span class="sr-status-pill ${isClockedIn ? 'active' : 'inactive'}">
              ${isClockedIn ? '<span class="sr-pulse-dot"></span> Active on Shift' : 'Off Shift'}
            </span>
            <small style="font-size:12px;color:var(--sr-text-muted);">
              ${isClockedIn && activeEntry.clocked_in_at ? `Started ${new Date(activeEntry.clocked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Standard 8h Rotation'}
            </small>
          </div>

          <div class="sr-clock-timer" id="sr-elapsed-timer">
            ${isClockedIn ? '00:00:00' : '--:--:--'}
          </div>

          <p class="sr-clock-meta">
            ${isClockedIn
              ? 'Your active shift is tracked with database precision. Clock out when your rotation is completed.'
              : 'You are currently off shift. Tap below to start your shift time tracking.'}
          </p>

          <button class="sr-btn sr-btn-block ${isClockedIn ? 'sr-btn-danger' : 'sr-btn-primary'}" id="sr-btn-toggle-clock">
            ${isClockedIn
              ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="14" height="14" x="5" y="5" rx="2"/></svg> Clock Out from Shift`
              : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Clock In to Shift`}
          </button>
        </section>

        <!-- Relevant Handover Card -->
        <section class="sr-card" aria-label="Shift Handover Brief">
          <div class="sr-card-title-row">
            <h3>Shift Handover Brief</h3>
            ${relevantHandover ? `<span class="sr-status-pill ${relevantHandover.status === 'relayed' ? 'active' : 'inactive'}">${escapeHtml(relevantHandover.status.replace('_', ' ').toUpperCase())}</span>` : ''}
          </div>

          ${relevantHandover ? `
            <div style="margin-bottom:14px;">
              <h4 style="margin:0 0 4px;font-size:15px;color:var(--sr-text-main);">${escapeHtml(relevantHandover.handover?.summary || 'Operational Briefing')}</h4>
              <p style="margin:0;font-size:12.5px;color:var(--sr-text-muted);">
                Logged ${new Date(relevantHandover.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Priority: ${escapeHtml(relevantHandover.handover?.shiftStatus || 'normal').toUpperCase()}
              </p>
            </div>
            ${isIncoming && relevantHandover.status === 'relayed' ? `
              <button class="sr-btn sr-btn-primary sr-btn-block" id="sr-btn-ack-handover" data-id="${relevantHandover.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Acknowledge Handover
              </button>
            ` : ''}
          ` : `
            <div class="sr-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No active shift handovers requiring acknowledgement.</p>
            </div>
          `}
        </section>

        <!-- Priority Shift Task Checklist -->
        <section class="sr-card" aria-label="Shift Task Checklist">
          <div class="sr-card-title-row">
            <h3>Shift Priority Tasks</h3>
            <span style="font-size:12px;font-weight:700;color:var(--sr-text-muted);">
              ${tasks.filter(t => t.done).length} / ${tasks.length} Completed
            </span>
          </div>

          ${tasks.length > 0 ? `
            <div class="sr-task-list">
              ${tasks.map(task => `
                <label class="sr-task-item ${task.done ? 'done' : ''}">
                  <input type="checkbox" class="sr-task-checkbox" ${task.done ? 'checked' : ''} data-task-id="${task.id}" data-handover-id="${relevantHandover.id}" />
                  <span style="flex:1;font-size:13.5px;color:var(--sr-text-main);font-weight:600;">${escapeHtml(task.text || task.title)}</span>
                  ${task.priority === 'urgent' ? '<span style="font-size:10px;font-weight:800;color:#dc2626;background:#fee2e2;padding:2px 6px;border-radius:4px;">URGENT</span>' : ''}
                </label>
              `).join('')}
            </div>
          ` : `
            <div class="sr-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <p>No priority checklist tasks for this shift rotation.</p>
            </div>
          `}
        </section>
      `;

      container.innerHTML = html;

      // Start elapsed timer if clocked in
      if (isClockedIn && activeEntry.clocked_in_at) {
        const startTime = new Date(activeEntry.clocked_in_at).getTime();
        const updateTimer = () => {
          const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
          const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
          const s = String(diffSec % 60).padStart(2, '0');
          const el = document.getElementById('sr-elapsed-timer');
          if (el) el.textContent = `${h}:${m}:${s}`;
        };
        updateTimer();
        elapsedInterval = setInterval(updateTimer, 1000);
      }

      // Bind Clock In / Out button
      document.getElementById('sr-btn-toggle-clock')?.addEventListener('click', async () => {
        const btn = document.getElementById('sr-btn-toggle-clock');
        if (btn) btn.disabled = true;
        const endpoint = isClockedIn ? '/api/time-entries/clock-out' : '/api/time-entries/clock-in';
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': 'idem_clock_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
            }
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Clock action failed');
          }
          await renderWorkerToday();
        } catch (err) {
          alert(err.message);
          if (btn) btn.disabled = false;
        }
      });

      // Bind Acknowledge Handover
      document.getElementById('sr-btn-ack-handover')?.addEventListener('click', async () => {
        const btn = document.getElementById('sr-btn-ack-handover');
        const hId = btn.dataset.id;
        if (btn) btn.disabled = true;
        try {
          const res = await fetch(`/api/handovers/${hId}/acknowledge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': 'idem_ack_' + Date.now()
            }
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Acknowledgement failed');
          }
          await renderWorkerToday();
        } catch (err) {
          alert(err.message);
          if (btn) btn.disabled = false;
        }
      });

      // Bind task checkboxes
      document.querySelectorAll('.sr-task-checkbox').forEach(box => {
        box.addEventListener('change', async () => {
          const handoverId = box.dataset.handoverId;
          const taskId = box.dataset.taskId;
          const parent = box.closest('.sr-task-item');
          parent.classList.toggle('done', box.checked);
          try {
            await fetch(`/api/handovers/${handoverId}/tasks/${taskId}/toggle`, { method: 'POST' });
          } catch (err) {
            box.checked = !box.checked;
            parent.classList.toggle('done', box.checked);
          }
        });
      });

    } catch (err) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Could not load shift overview</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">${escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.renderWorkerToday()">Retry</button>
        </div>
      `;
    }
  }

  // ── 3. Polished Manager Overview Screen ─────────────────────────────────────
  async function renderManagerOverview() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="sr-skeleton" style="height: 100px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 140px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 220px;"></div>
    `;

    try {
      // Parallel fetch of actionable manager metrics
      const [pendingRes, handoversRes, timeRes, leaveRes] = await Promise.all([
        fetch('/api/memberships/pending').catch(() => null),
        fetch('/api/handovers').catch(() => null),
        fetch('/api/time-entries').catch(() => null),
        user.role === 'owner' ? fetch('/api/leave-requests').catch(() => null) : Promise.resolve(null)
      ]);

      const pendingData = pendingRes && pendingRes.ok ? await pendingRes.json() : { requests: [], workflows: [] };
      const handoversData = handoversRes && handoversRes.ok ? await handoversRes.json() : { handovers: [] };
      const timeData = timeRes && timeRes.ok ? await timeRes.json() : { entries: [] };
      const leaveData = leaveRes && leaveRes.ok ? await leaveRes.json() : { requests: [] };

      const accessRequests = pendingData.requests || [];
      const handoversAwaitingRelay = (handoversData.handovers || []).filter(h => h.status === 'awaiting_review');
      const activeHeadcount = (timeData.entries || []).filter(e => !e.clocked_out_at).length;
      const pendingLeave = (leaveData.requests || []).filter(r => r.status === 'pending');

      const companyName = user.organisation_name || 'Apex Healthcare';
      const siteName = user.department || 'Operations Management Unit';

      const html = `
        <!-- Distinct Company vs Site Context Banner -->
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Facility: ${escapeHtml(companyName)}</span>
            <span class="sr-context-banner-site">Supervisory Scope: <strong>${escapeHtml(siteName)}</strong></span>
          </div>
          <span class="sr-context-banner-badge" style="background:#0a3d39;">
            ${user.role === 'owner' ? 'ORGANISATION OWNER' : 'SHIFT SUPERVISOR'}
          </span>
        </div>

        <!-- Metric Action Tiles (Real Data Only — No Mock Counters) -->
        <div class="sr-metric-grid">
          <div class="sr-metric-tile ${accessRequests.length > 0 ? 'highlight' : ''}">
            <span>Pending Worker Access</span>
            <strong style="${accessRequests.length > 0 ? 'color:#0d524d;' : ''}">${accessRequests.length}</strong>
            <small style="color:var(--sr-text-muted);font-size:11.5px;">Awaiting Review</small>
          </div>

          <div class="sr-metric-tile ${handoversAwaitingRelay.length > 0 ? 'highlight' : ''}">
            <span>Handovers Awaiting Relay</span>
            <strong style="${handoversAwaitingRelay.length > 0 ? 'color:#0d524d;' : ''}">${handoversAwaitingRelay.length}</strong>
            <small style="color:var(--sr-text-muted);font-size:11.5px;">Pending Approval</small>
          </div>

          <div class="sr-metric-tile">
            <span>Active on Shift</span>
            <strong>${activeHeadcount}</strong>
            <small style="color:var(--sr-text-muted);font-size:11.5px;">Currently Clocked In</small>
          </div>

          ${user.role === 'owner' ? `
            <div class="sr-metric-tile ${pendingLeave.length > 0 ? 'highlight' : ''}">
              <span>Leave Requests</span>
              <strong>${pendingLeave.length}</strong>
              <small style="color:var(--sr-text-muted);font-size:11.5px;">Requires Owner Review</small>
            </div>
          ` : ''}
        </div>

        <!-- Actionable Section 1: Membership Access Requests -->
        <section class="sr-card" aria-label="Worker Access Requests Queue">
          <div class="sr-card-title-row">
            <h3>Worker Access Requests Queue (${accessRequests.length})</h3>
          </div>

          ${accessRequests.length > 0 ? `
            <div>
              ${accessRequests.map(req => `
                <div class="sr-review-item">
                  <div class="sr-review-info">
                    <strong>${escapeHtml(req.name)}</strong>
                    <small>${escapeHtml(req.email)} · Requested Position: ${escapeHtml(req.title || 'Frontline Worker')}</small>
                  </div>
                  <div class="sr-review-actions">
                    <button class="sr-btn sr-btn-primary" style="min-height:44px;padding:0 14px;font-size:13px;" data-action="approve-member" data-id="${req.id}">
                      Approve as Worker
                    </button>
                    <button class="sr-btn sr-btn-secondary" style="min-height:44px;padding:0 14px;font-size:13px;" data-action="reject-member" data-id="${req.id}">
                      Reject
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="sr-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <p>No pending access requests. All facility workers have been verified.</p>
            </div>
          `}
        </section>

        <!-- Actionable Section 2: Handovers Awaiting Review & Relay -->
        <section class="sr-card" aria-label="Shift Handover Review Queue">
          <div class="sr-card-title-row">
            <h3>Handovers Awaiting Supervisory Relay (${handoversAwaitingRelay.length})</h3>
          </div>

          ${handoversAwaitingRelay.length > 0 ? `
            <div>
              ${handoversAwaitingRelay.map(item => `
                <div class="sr-review-item">
                  <div class="sr-review-info">
                    <strong>${escapeHtml(item.handover?.summary || 'Shift Turnover')}</strong>
                    <small>Logged ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Priority: ${escapeHtml(item.handover?.shiftStatus || 'normal').toUpperCase()}</small>
                  </div>
                  <div class="sr-review-actions">
                    <button class="sr-btn sr-btn-primary" style="min-height:44px;padding:0 14px;font-size:13px;" data-action="relay-handover" data-id="${item.id}">
                      Approve &amp; Relay
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="sr-empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>All shift turnovers have been reviewed and relayed to incoming shifts.</p>
            </div>
          `}
        </section>

        <!-- Actionable Section 3: Owner-Only Leave Approvals -->
        ${user.role === 'owner' ? `
          <section class="sr-card" aria-label="Leave Requests Review">
            <div class="sr-card-title-row">
              <h3>Employee Leave Requests (${pendingLeave.length})</h3>
            </div>
            ${pendingLeave.length > 0 ? `
              <div>
                ${pendingLeave.map(lr => `
                  <div class="sr-review-item">
                    <div class="sr-review-info">
                      <strong>Leave from ${escapeHtml(lr.starts_on)} to ${escapeHtml(lr.ends_on)}</strong>
                      <small>Reason: ${escapeHtml(lr.reason || 'Personal / Annual leave')}</small>
                    </div>
                    <div class="sr-review-actions">
                      <button class="sr-btn sr-btn-primary" style="min-height:44px;padding:0 14px;font-size:13px;" data-action="review-leave" data-id="${lr.id}" data-decision="approved">Approve</button>
                      <button class="sr-btn sr-btn-secondary" style="min-height:44px;padding:0 14px;font-size:13px;" data-action="review-leave" data-id="${lr.id}" data-decision="rejected">Reject</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="sr-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <p>No pending leave requests requiring owner review.</p>
              </div>
            `}
          </section>
        ` : ''}
      `;

      container.innerHTML = html;

      // Bind Access Request Approve / Reject
      document.querySelectorAll('[data-action="approve-member"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await fetch(`/api/memberships/${btn.dataset.id}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'idem_mem_appr_' + Date.now()
              },
              body: JSON.stringify({ decision: 'approve', role: 'incoming' })
            });
            if (!res.ok) throw new Error('Approval failed');
            await renderManagerOverview();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

      document.querySelectorAll('[data-action="reject-member"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await fetch(`/api/memberships/${btn.dataset.id}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'idem_mem_rej_' + Date.now()
              },
              body: JSON.stringify({ decision: 'reject' })
            });
            if (!res.ok) throw new Error('Rejection failed');
            await renderManagerOverview();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

      // Bind Handover Relay
      document.querySelectorAll('[data-action="relay-handover"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await fetch(`/api/handovers/${btn.dataset.id}/relay`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'idem_relay_' + Date.now()
              }
            });
            if (!res.ok) throw new Error('Relay action failed');
            await renderManagerOverview();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

      // Bind Leave Review
      document.querySelectorAll('[data-action="review-leave"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await fetch('/api/leave-requests/review', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'idem_leave_' + Date.now()
              },
              body: JSON.stringify({ id: btn.dataset.id, decision: btn.dataset.decision })
            });
            if (!res.ok) throw new Error('Leave review failed');
            await renderManagerOverview();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

    } catch (err) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Could not load manager overview</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">${escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.renderManagerOverview()">Retry</button>
        </div>
      `;
    }
  }

  // ── 4. Authorised Multi-Company Context Switcher Modal ──────────────────────
  async function openContextModal() {
    document.getElementById('sr-context-modal')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'sr-context-modal';
    backdrop.className = 'sr-modal-backdrop';
    backdrop.innerHTML = `
      <div class="sr-modal-card" role="dialog" aria-modal="true" aria-label="Switch Workplace Context">
        <div class="sr-modal-header">
          <h3>Your Workplaces &amp; Roles</h3>
          <button type="button" class="sr-icon-btn" id="sr-btn-close-modal" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="sr-modal-body" id="sr-modal-memberships-list">
          <div class="sr-skeleton" style="height: 60px; margin-bottom: 8px;"></div>
          <div class="sr-skeleton" style="height: 60px;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    document.getElementById('sr-btn-close-modal')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

    const listEl = document.getElementById('sr-modal-memberships-list');
    try {
      const res = await fetch('/api/user/memberships');
      if (!res.ok) throw new Error('Could not load memberships');
      const data = await res.json();
      const memberships = data.memberships || [];
      const user = getUser();

      if (memberships.length === 0) {
        listEl.innerHTML = '<p style="color:var(--sr-text-muted);font-size:13px;text-align:center;">No other active workplaces associated with your account.</p>';
        return;
      }

      listEl.innerHTML = memberships.map(m => {
        const isCurrent = m.id === user.id || m.organisation_id === user.organisation_id;
        return `
          <div class="sr-card" style="padding:14px;margin-bottom:8px;border-color:${isCurrent ? 'var(--sr-primary)' : 'var(--sr-border-subtle)'};background:${isCurrent ? 'rgba(13,82,77,0.04)' : 'var(--sr-bg-card)'};">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <strong style="display:block;font-size:14px;color:var(--sr-text-main);">${escapeHtml(m.organisation_name || 'Workplace')}</strong>
                <small style="color:var(--sr-text-muted);font-size:12px;">Unit: ${escapeHtml(m.department || 'Operations')} · Role: ${escapeHtml(m.role.toUpperCase())}</small>
              </div>
              ${isCurrent ? `
                <span class="sr-status-pill active" style="font-size:11px;">ACTIVE</span>
              ` : `
                <button class="sr-btn sr-btn-secondary" style="min-height:34px;padding:0 12px;font-size:12px;" data-switch-membership="${m.id}">
                  Switch Context
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('[data-switch-membership]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const switchRes = await fetch('/api/user/active-membership', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ membershipId: btn.dataset.switchMembership })
            });
            if (!switchRes.ok) {
              const err = await switchRes.json();
              throw new Error(err.error || 'Context switch failed');
            }
            closeModal();
            // Re-fetch active session and remount
            const sessionRes = await fetch('/api/auth/session');
            if (sessionRes.ok) {
              const session = await sessionRes.json();
              if (window.login) window.login(session.user);
            }
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

    } catch (err) {
      listEl.innerHTML = `<p style="color:#dc2626;font-size:13px;">${escapeHtml(err.message)}</p>`;
    }
  }

  // ── 5. Bridge to Existing Screens (Preserves working routes behind shell) ───
  async function bridgeExistingView(viewName) {
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    if (viewName === 'handovers') {
      if (typeof window.renderHandoverForm === 'function') {
        window.renderHandoverForm();
      }
    } else if (viewName === 'schedule') {
      if (typeof window.renderShiftCalendarCard === 'function') {
        container.innerHTML = `
          <div class="sr-card">
            <h3 style="margin:0 0 12px;">Shift Schedule</h3>
            ${window.renderShiftCalendarCard()}
          </div>
        `;
        window.bindShiftCalendarEvents?.();
      } else {
        container.innerHTML = '<div class="sr-card"><h3>Schedule</h3><p>Your calendar schedule is up to date.</p></div>';
      }
    } else if (viewName === 'team') {
      try {
        const res = await fetch('/api/directory');
        const data = res.ok ? await res.json() : { directory: [] };
        container.innerHTML = `
          <div class="sr-card">
            <h3 style="margin:0 0 14px;">Facility Team Directory</h3>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${(data.directory || []).map(u => `
                <div class="sr-review-item">
                  <div>
                    <strong>${escapeHtml(u.name)}</strong>
                    <small>${escapeHtml(u.title || u.role)} · ${escapeHtml(u.email || '')}</small>
                  </div>
                  <span class="sr-status-pill ${u.status === 'active' ? 'active' : 'inactive'}">${escapeHtml(u.status || 'active')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div class="sr-card"><p>${escapeHtml(err.message)}</p></div>`;
      }
    } else if (viewName === 'me') {
      const user = getUser();
      container.innerHTML = `
        <div class="sr-card">
          <h3 style="margin:0 0 14px;">Worker Account Profile</h3>
          <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
          <p><strong>Role:</strong> ${escapeHtml(user.role)}</p>
          <p><strong>Facility:</strong> ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</p>
          <div style="margin-top:20px;display:flex;gap:10px;">
            <button class="sr-btn sr-btn-danger" id="sr-btn-me-logout">Sign Out</button>
          </div>
        </div>
      `;
      document.getElementById('sr-btn-me-logout')?.addEventListener('click', () => {
        if (window.OfflineQueue) {
          window.OfflineQueue.promptLogoutWarning(() => {
            fetch('/api/auth/sign-out', { method: 'POST' }).then(() => window.location.reload());
          });
        } else {
          fetch('/api/auth/sign-out', { method: 'POST' }).then(() => window.location.reload());
        }
      });
    } else if (viewName === 'settings') {
      container.innerHTML = `
        <div class="sr-card">
          <h3 style="margin:0 0 12px;">Organisation Settings</h3>
          <p>Facility settings, workflow configurations, and compliance audit logs are active.</p>
        </div>
      `;
    } else if (viewName === 'approvals') {
      await renderManagerOverview();
    } else if (viewName === 'notifications') {
      try {
        const res = await fetch('/api/notifications');
        const data = res.ok ? await res.json() : { notifications: [] };
        const notifs = data.notifications || [];
        container.innerHTML = `
          <div class="sr-card">
            <div class="sr-card-title-row">
              <h3>Notifications (${notifs.length})</h3>
              ${notifs.length > 0 ? `
                <button class="sr-btn sr-btn-secondary" id="sr-btn-read-all-notifs" style="font-size:12px;min-height:36px;padding:0 12px;">Mark All Read</button>
              ` : ''}
            </div>
            ${notifs.length > 0 ? `
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${notifs.map(n => `
                  <div class="sr-review-item">
                    <div class="sr-review-info">
                      <strong>${escapeHtml(n.title || n.message || 'Notification')}</strong>
                      <small>${escapeHtml(n.body || n.content || '')} · ${n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
                    </div>
                    ${!n.read_at && !n.read ? '<span class="sr-status-pill active">NEW</span>' : ''}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="sr-empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <p>No new notifications at this time.</p>
              </div>
            `}
          </div>
        `;
        document.getElementById('sr-btn-read-all-notifs')?.addEventListener('click', async () => {
          await fetch('/api/notifications/read', { method: 'POST' });
          navigate('notifications');
        });
      } catch (err) {
        container.innerHTML = `<div class="sr-card"><p>${escapeHtml(err.message)}</p></div>`;
      }
    }
  }

  // Export to global scope
  window.renderDashboard = function() {
    return mountShell();
  };

  window.Phase1Shell = {
    mount: mountShell,
    renderWorkerToday,
    renderManagerOverview,
    openContextModal,
    navigate
  };

})();
