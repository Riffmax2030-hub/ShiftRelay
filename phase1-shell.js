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
    if (window._srState?.user) return window._srState.user;
    try {
      const stored = localStorage.getItem('shiftrelay-user-data');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return null;
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
    document.getElementById('app-view')?.classList.remove('hidden');
    document.getElementById('login-view')?.classList.add('hidden');

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
    } else if (view === 'handovers') {
      if (isManager) {
        await renderManagerHandovers();
      } else {
        await renderWorkerHandovers();
      }
    } else if (view === 'team') {
      await renderTeamScreen();
    } else if (view === 'approvals') {
      await renderApprovalsScreen();
    } else {
      // Bridge smoothly to existing sub-views for Schedule, Me, Settings
      await bridgeExistingView(view);
    }
  }

  async function navigate(viewName) {
    return await mountShell(viewName);
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

      // Bind Access Request Approve / Reject (reuses idempotency key on retry)
      document.querySelectorAll('[data-action="approve-member"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.dataset.idempotencyKey = btn.dataset.idempotencyKey || ('idem_mem_appr_' + btn.dataset.id + '_' + Date.now());
          try {
            const res = await fetch(`/api/memberships/${btn.dataset.id}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': btn.dataset.idempotencyKey
              },
              body: JSON.stringify({ decision: 'approve', role: 'incoming' })
            });
            if (!res.ok) throw new Error('Approval failed');
            delete btn.dataset.idempotencyKey;
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
          btn.dataset.idempotencyKey = btn.dataset.idempotencyKey || ('idem_mem_rej_' + btn.dataset.id + '_' + Date.now());
          try {
            const res = await fetch(`/api/memberships/${btn.dataset.id}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': btn.dataset.idempotencyKey
              },
              body: JSON.stringify({ decision: 'reject' })
            });
            if (!res.ok) throw new Error('Rejection failed');
            delete btn.dataset.idempotencyKey;
            await renderManagerOverview();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

      // Bind Handover Relay (reuses idempotency key on retry)
      document.querySelectorAll('[data-action="relay-handover"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.dataset.idempotencyKey = btn.dataset.idempotencyKey || ('idem_relay_' + btn.dataset.id + '_' + Date.now());
          try {
            const res = await fetch(`/api/handovers/${btn.dataset.id}/relay`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': btn.dataset.idempotencyKey
              }
            });
            if (!res.ok) throw new Error('Relay action failed');
            delete btn.dataset.idempotencyKey;
            await renderManagerOverview();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
          }
        });
      });

      // Bind Leave Review (reuses idempotency key on retry)
      document.querySelectorAll('[data-action="review-leave"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.dataset.idempotencyKey = btn.dataset.idempotencyKey || ('idem_leave_' + btn.dataset.id + '_' + btn.dataset.decision + '_' + Date.now());
          try {
            const res = await fetch('/api/leave-requests/review', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': btn.dataset.idempotencyKey
              },
              body: JSON.stringify({ id: btn.dataset.id, decision: btn.dataset.decision })
            });
            if (!res.ok) throw new Error('Leave review failed');
            delete btn.dataset.idempotencyKey;
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

  // ── 5. Polished Worker Handovers Screen (UI Phase 2) ──────────────────────
  let workerHandoversTab = 'actions'; // 'actions' | 'history' | 'create'

  async function renderWorkerHandovers() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="sr-skeleton" style="height: 48px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 160px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 160px;"></div>
    `;

    try {
      const res = await fetch('/api/handovers');
      const data = res.ok ? await res.json() : { handovers: [] };
      const handovers = data.handovers || [];
      console.log('GET /api/handovers data:', JSON.stringify(data));

      // Determine canCreate according to verified backend permissions
      const canCreate = ['outgoing', 'supervisor', 'owner'].includes(user.role);

      // "Needs my action" items:
      // For incoming worker: items with status === 'relayed' assigned to this worker (requiring acknowledgement)
      const needsAction = handovers.filter(h => {
        if (user.role === 'incoming') {
          return h.status === 'relayed' && (h.assignedTo === user.id || user.role === 'owner');
        }
        return false;
      });

      // Handover history:
      // For outgoing workers: show all their submitted shift handovers with their current lifecycle state
      // For incoming workers: show handovers that are not pending action
      const historyItems = user.role === 'outgoing'
        ? handovers
        : handovers.filter(h => !needsAction.some(na => na.id === h.id));

      const html = `
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Facility: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
            <span class="sr-context-banner-site">Handover Management Scope: <strong>${escapeHtml(user.department || 'Operations')}</strong></span>
          </div>
          <span class="sr-context-banner-badge">${escapeHtml(user.role.toUpperCase())}</span>
        </div>

        <div class="sr-tabs-header">
          <button class="sr-tab-btn ${workerHandoversTab === 'actions' ? 'active' : ''}" data-sr-tab="actions">
            <span>Needs My Action</span>
            ${needsAction.length > 0 ? `<span class="sr-tab-badge">${needsAction.length}</span>` : ''}
          </button>
          <button class="sr-tab-btn ${workerHandoversTab === 'history' ? 'active' : ''}" data-sr-tab="history">
            <span>Handover History</span>
          </button>
          ${canCreate ? `
            <button class="sr-tab-btn ${workerHandoversTab === 'create' ? 'active' : ''}" data-sr-tab="create">
              <span>+ Create Handover</span>
            </button>
          ` : ''}
        </div>

        <div id="sr-worker-handovers-panel"></div>
      `;

      container.innerHTML = html;

      // Tab switcher bindings
      document.querySelectorAll('[data-sr-tab]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          workerHandoversTab = btn.dataset.srTab;
          await renderWorkerHandovers();
        });
      });

      const panel = document.getElementById('sr-worker-handovers-panel');

      if (workerHandoversTab === 'create' && canCreate) {
        renderWorkerHandoverCreateForm(panel, user);
      } else if (workerHandoversTab === 'history') {
        renderHandoverList(panel, historyItems, false, user);
      } else {
        renderHandoverList(panel, needsAction, true, user);
      }

    } catch (err) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Could not load handovers</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">${escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.renderWorkerHandovers()">Retry</button>
        </div>
      `;
    }
  }

  // Helper: Render Handover List (Shared for Worker & Manager)
  function renderHandoverList(container, items, isActionTab, user) {
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="sr-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>${isActionTab ? 'All caught up! No handovers require your action right now.' : 'No handover records found in history.'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const h = item.handover || {};
      const tasks = h.tasks || h.actions || [];
      const status = item.status || 'awaiting_review';
      const statusLabels = {
        awaiting_review: 'Awaiting Review',
        relayed: 'Relayed / Ready for Inflow',
        acknowledged: 'Acknowledged'
      };

      const canAcknowledge = status === 'relayed' && (user.role === 'incoming' || user.role === 'owner');
      const canRelay = status === 'awaiting_review' && ['supervisor', 'owner'].includes(user.role);

      return `
        <article class="sr-handover-card status-${status}" data-handover-id="${item.id}">
          <div class="sr-handover-header">
            <div class="sr-handover-meta">
              <h4 class="sr-handover-summary">${escapeHtml(h.summary || 'Shift Handover')}</h4>
              <span class="sr-handover-submeta">
                Created by <strong>${escapeHtml(item.reviewedBy || item.createdBy || 'Staff')}</strong>
                · ${item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
              </span>
            </div>
            <span class="sr-badge-status ${status}">${escapeHtml(statusLabels[status] || status)}</span>
          </div>

          ${h.notes ? `
            <div class="sr-handover-body">
              <strong>Notes:</strong> ${escapeHtml(h.notes)}
            </div>
          ` : ''}

          ${tasks.length > 0 ? `
            <div class="sr-handover-tasks-section">
              <div class="sr-handover-tasks-title">Assigned Shift Tasks (${tasks.filter(t => t.done).length}/${tasks.length} Completed)</div>
              <div class="sr-task-list">
                ${tasks.map(t => `
                  <label class="sr-task-item ${t.done ? 'done' : ''}">
                    <input type="checkbox" class="sr-task-checkbox" ${t.done ? 'checked' : ''} data-task-id="${t.id}" data-handover-id="${item.id}" />
                    <span style="flex:1;font-size:13px;font-weight:600;color:var(--sr-text-main);">${escapeHtml(t.text || t.title)}</span>
                    ${t.priority === 'urgent' ? '<span style="font-size:10px;font-weight:800;color:#dc2626;background:#fee2e2;padding:2px 6px;border-radius:4px;">URGENT</span>' : ''}
                  </label>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <div style="font-size:12px;color:var(--sr-text-muted);">
              ${item.acknowledgement ? `Acknowledged at ${new Date(item.acknowledgement.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </div>
            <div style="display:flex;gap:8px;">
              ${canAcknowledge ? `
                <button class="sr-btn sr-btn-primary" style="min-height:44px;padding:0 16px;font-size:13px;" data-action="ack-handover" data-id="${item.id}">
                  Acknowledge Shift Brief
                </button>
              ` : ''}
              ${canRelay ? `
                <button class="sr-btn sr-btn-primary" style="min-height:44px;padding:0 16px;font-size:13px;" data-action="relay-handover" data-id="${item.id}">
                  Approve &amp; Relay Handover
                </button>
              ` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Bind task toggling (explicit desired state prevents accidental inversion on retries)
    container.querySelectorAll('.sr-task-checkbox').forEach(box => {
      box.addEventListener('change', async () => {
        const hId = box.dataset.handoverId;
        const tId = box.dataset.taskId;
        const desiredState = box.checked;
        box.disabled = true;
        try {
          const res = await fetch(`/api/handovers/${hId}/tasks/${tId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ done: desiredState })
          });
          if (!res.ok) throw new Error('Task toggle failed');
          const row = box.closest('.sr-task-item');
          if (row) row.classList.toggle('done', box.checked);
        } catch (err) {
          box.checked = !box.checked;
          alert(err.message);
        } finally {
          box.disabled = false;
        }
      });
    });

    // Bind Acknowledge (reuses idempotency key on retries)
    container.querySelectorAll('[data-action="ack-handover"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Acknowledging...';
        btn.dataset.idempotencyKey = btn.dataset.idempotencyKey || ('idem_ack_' + btn.dataset.id + '_' + Date.now());
        try {
          const res = await fetch(`/api/handovers/${btn.dataset.id}/acknowledge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': btn.dataset.idempotencyKey
            }
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Acknowledgement failed');
          }
          delete btn.dataset.idempotencyKey;
          if (user.role === 'supervisor' || user.role === 'owner') {
            await renderManagerHandovers();
          } else {
            await renderWorkerHandovers();
          }
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
          btn.textContent = 'Acknowledge Shift Brief';
        }
      });
    });

    // Bind Relay (reuses idempotency key on retries)
    container.querySelectorAll('[data-action="relay-handover"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Relaying...';
        btn.dataset.idempotencyKey = btn.dataset.idempotencyKey || ('idem_relay_' + btn.dataset.id + '_' + Date.now());
        try {
          const res = await fetch(`/api/handovers/${btn.dataset.id}/relay`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': btn.dataset.idempotencyKey
            }
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Relay failed');
          }
          delete btn.dataset.idempotencyKey;
          if (user.role === 'supervisor' || user.role === 'owner') {
            await renderManagerHandovers();
          } else {
            await renderWorkerHandovers();
          }
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
          btn.textContent = 'Approve & Relay Handover';
        }
      });
    });
  }

  // Helper: Create Handover Form for Worker / Outgoing
  function renderWorkerHandoverCreateForm(container, user) {
    let selectedTone = 'green';

    container.innerHTML = `
      <section class="sr-card" aria-label="Create Shift Handover Form">
        <h3 style="margin:0 0 16px;">Log Outgoing Shift Handover</h3>

        <div id="sr-handover-form-feedback"></div>

        <div class="sr-form-group">
          <label class="sr-form-label">Shift Status Tone</label>
          <div class="sr-tone-selector">
            <button type="button" class="sr-tone-option selected-green" data-tone="green">
              <strong>Green</strong>
              <small>Normal Ops</small>
            </button>
            <button type="button" class="sr-tone-option" data-tone="yellow">
              <strong>Yellow</strong>
              <small>Needs Attention</small>
            </button>
            <button type="button" class="sr-tone-option" data-tone="red">
              <strong>Red</strong>
              <small>Critical Issues</small>
            </button>
          </div>
        </div>

        <div class="sr-form-group">
          <label class="sr-form-label" for="sr-handover-summary">Shift Summary *</label>
          <input type="text" id="sr-handover-summary" class="sr-form-input" placeholder="e.g. Day Shift Handover - Emergency Triage Bay 1-4" required />
        </div>

        <div class="sr-form-group">
          <label class="sr-form-label" for="sr-handover-notes">Shift Operational Notes *</label>
          <textarea id="sr-handover-notes" class="sr-form-textarea" placeholder="Detail ongoing patient status, critical tasks, machine downtime, or handover points..." required></textarea>
        </div>

        <div class="sr-form-group">
          <label class="sr-form-label" for="sr-handover-tasks">Priority Shift Tasks (one per line)</label>
          <textarea id="sr-handover-tasks" class="sr-form-textarea" style="min-height:70px;" placeholder="Confirm blood bank cross-match for Bay 4&#10;Restock trauma airway cart in Resus 2"></textarea>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px;">
          <button type="button" class="sr-btn sr-btn-secondary" id="sr-btn-cancel-create" style="flex:1;">Cancel</button>
          <button type="button" class="sr-btn sr-btn-primary" id="sr-btn-submit-handover" style="flex:2;">Submit Handover for Review</button>
        </div>
      </section>
    `;

    // Tone selector
    container.querySelectorAll('.sr-tone-option').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedTone = btn.dataset.tone;
        container.querySelectorAll('.sr-tone-option').forEach(b => {
          b.className = 'sr-tone-option' + (b.dataset.tone === selectedTone ? ` selected-${selectedTone}` : '');
        });
      });
    });

    // Cancel
    container.querySelector('#sr-btn-cancel-create')?.addEventListener('click', () => {
      workerHandoversTab = 'actions';
      renderWorkerHandovers();
    });

    // Submit with Idempotency
    container.querySelector('#sr-btn-submit-handover')?.addEventListener('click', async () => {
      console.log('SUBMIT HANDOVER BUTTON CLICKED');
      const submitBtn = document.getElementById('sr-btn-submit-handover');
      const feedback = document.getElementById('sr-handover-form-feedback');
      const summary = document.getElementById('sr-handover-summary')?.value.trim();
      const notes = document.getElementById('sr-handover-notes')?.value.trim();
      const rawTasks = document.getElementById('sr-handover-tasks')?.value.trim();

      console.log('SUBMIT HANDOVER VALUES:', { summary, notes, rawTasks });

      if (!summary || !notes) {
        feedback.innerHTML = `<div class="sr-state-feedback error">Please provide both a summary and shift notes.</div>`;
        return;
      }

      const tasks = rawTasks ? rawTasks.split('\n').filter(t => t.trim().length > 0).map((t, i) => ({
        id: `task-${i + 1}-${Date.now().toString(36)}`,
        text: t.trim(),
        done: false,
        priority: selectedTone === 'red' ? 'urgent' : 'normal'
      })) : [];

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Handover...';
      feedback.innerHTML = '';

      // Reuse original action's idempotency key across retries
      submitBtn.dataset.idempotencyKey = submitBtn.dataset.idempotencyKey || ('idem_create_h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
      const idempotencyKey = submitBtn.dataset.idempotencyKey;

      try {
        const res = await fetch('/api/handovers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            notes,
            shiftStatus: selectedTone,
            handover: {
              summary,
              notes,
              shiftStatus: selectedTone,
              tasks
            },
            tasks
          })
        });

        const data = await res.json();
        console.log('POST /api/handovers status:', res.status, 'data:', JSON.stringify(data));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit handover');
        }

        delete submitBtn.dataset.idempotencyKey;
        feedback.innerHTML = `<div class="sr-state-feedback success">Handover submitted successfully! Awaiting supervisor review.</div>`;
        setTimeout(async () => {
          workerHandoversTab = 'history';
          await renderWorkerHandovers();
        }, 400);
      } catch (err) {
        console.error('SUBMIT HANDOVER CATCH ERROR:', err);
        feedback.innerHTML = `<div class="sr-state-feedback error">${escapeHtml(err.message)}</div>`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Handover for Review';
      }
    });
  }

  // ── 6. Polished Manager Handovers Screen (UI Phase 2) ──────────────────────
  let managerHandoversTab = 'pending'; // 'pending' | 'completed'

  async function renderManagerHandovers() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="sr-skeleton" style="height: 48px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 160px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 160px;"></div>
    `;

    try {
      const res = await fetch('/api/handovers');
      const data = res.ok ? await res.json() : { handovers: [] };
      const handovers = data.handovers || [];
      console.log('GET /api/handovers data:', JSON.stringify(data));

      // Separate pending (awaiting_review) from completed (relayed or acknowledged)
      const pendingItems = handovers.filter(h => h.status === 'awaiting_review');
      const completedItems = handovers.filter(h => h.status !== 'awaiting_review');

      const html = `
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Facility: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
            <span class="sr-context-banner-site">Handover Relay Oversight: <strong>${escapeHtml(user.department || 'Operations Leadership')}</strong></span>
          </div>
          <span class="sr-context-banner-badge" style="background:#0a3d39;">${escapeHtml(user.role.toUpperCase())}</span>
        </div>

        <div class="sr-tabs-header">
          <button class="sr-tab-btn ${managerHandoversTab === 'pending' ? 'active' : ''}" data-sr-mgr-tab="pending">
            <span>Awaiting Supervisor Relay</span>
            ${pendingItems.length > 0 ? `<span class="sr-tab-badge">${pendingItems.length}</span>` : ''}
          </button>
          <button class="sr-tab-btn ${managerHandoversTab === 'completed' ? 'active' : ''}" data-sr-mgr-tab="completed">
            <span>Relayed &amp; Completed (${completedItems.length})</span>
          </button>
        </div>

        <div id="sr-mgr-handovers-panel"></div>
      `;

      container.innerHTML = html;

      document.querySelectorAll('[data-sr-mgr-tab]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          managerHandoversTab = btn.dataset.srMgrTab;
          await renderManagerHandovers();
        });
      });

      const panel = document.getElementById('sr-mgr-handovers-panel');
      if (managerHandoversTab === 'pending') {
        renderHandoverList(panel, pendingItems, true, user);
      } else {
        renderHandoverList(panel, completedItems, false, user);
      }

    } catch (err) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Could not load handovers oversight</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">${escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.renderManagerHandovers()">Retry</button>
        </div>
      `;
    }
  }

  // ── 7. Bridge to Existing Screens (Preserves working routes behind shell) ───
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
      await renderApprovalsScreen();
    } else if (viewName === 'team') {
      await renderTeamScreen();
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

  // ── 7. Polished Team Directory Screen (UI Phase 3) ────────────────────────
  let teamSearchQuery = '';

  async function renderTeamScreen() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="sr-skeleton" style="height: 48px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 120px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 200px;"></div>
    `;

    try {
      const res = await fetch('/api/directory');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not load team directory');
      }
      const data = await res.json();
      const allMembers = data.members || [];

      function filterAndRender(query) {
        const q = (query || '').toLowerCase().trim();
        const filtered = allMembers.filter(m => {
          if (!q) return true;
          return (m.name && m.name.toLowerCase().includes(q)) ||
                 (m.title && m.title.toLowerCase().includes(q)) ||
                 (m.department && m.department.toLowerCase().includes(q)) ||
                 (m.role && m.role.toLowerCase().includes(q)) ||
                 (m.email && m.email.toLowerCase().includes(q));
        });

        const listContainer = document.getElementById('sr-team-list-container');
        const countEl = document.getElementById('sr-team-count');
        if (countEl) countEl.textContent = `${filtered.length} of ${allMembers.length} staff`;

        if (!listContainer) return;

        if (filtered.length === 0) {
          listContainer.innerHTML = `
            <div class="sr-empty-state" style="grid-column: 1 / -1;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
              <p>${q ? `No staff members found matching "${escapeHtml(q)}".` : 'No team members found for this organisation.'}</p>
            </div>
          `;
          return;
        }

        listContainer.innerHTML = filtered.map(m => {
          const initials = (m.name || 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
          const roleLabel = {
            owner: 'Organisation Owner',
            supervisor: 'Shift Supervisor',
            outgoing: 'Outgoing Specialist',
            incoming: 'Incoming Specialist',
            worker: 'Frontline Worker'
          }[m.role] || (m.role ? m.role.toUpperCase() : 'Staff');

          const statusClass = (m.status || 'active').toLowerCase();
          const statusText = m.status === 'pending_approval' ? 'Pending Approval' : (m.status || 'Active');

          const shiftTime = (m.shift_start && m.shift_end)
            ? `${m.shift_start} – ${m.shift_end}`
            : 'Standard Shift';

          return `
            <article class="sr-team-card" data-member-id="${m.id}">
              <div class="sr-team-card-header">
                <div class="sr-team-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
                <div class="sr-team-info">
                  <h4 class="sr-team-name">${escapeHtml(m.name || 'Team Member')}</h4>
                  <p class="sr-team-title">${escapeHtml(m.title || roleLabel)}</p>
                </div>
              </div>
              <div class="sr-team-details">
                <div class="sr-team-row">
                  <span class="sr-team-row-label">Role</span>
                  <span class="sr-team-row-val">${escapeHtml(roleLabel)}</span>
                </div>
                <div class="sr-team-row">
                  <span class="sr-team-row-label">Department / Unit</span>
                  <span class="sr-team-row-val">${escapeHtml(m.department || user.department || 'Operations')}</span>
                </div>
                <div class="sr-team-row">
                  <span class="sr-team-row-label">Shift Hours</span>
                  <span class="sr-team-row-val">${escapeHtml(shiftTime)}</span>
                </div>
                <div class="sr-team-row">
                  <span class="sr-team-row-label">Membership Status</span>
                  <span class="sr-status-pill ${statusClass}">${escapeHtml(statusText)}</span>
                </div>
              </div>
            </article>
          `;
        }).join('');
      }

      container.innerHTML = `
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Facility: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
            <span class="sr-context-banner-site">Team Directory: <strong>${escapeHtml(user.department || 'Operations')}</strong></span>
          </div>
          <span class="sr-context-banner-badge">${allMembers.length} Members</span>
        </div>

        <section class="sr-card" aria-label="Team Directory">
          <div class="sr-search-bar">
            <div class="sr-search-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" id="sr-team-search" class="sr-search-input" placeholder="Search by name, role, title, or department..." value="${escapeHtml(teamSearchQuery)}" aria-label="Search team members" />
            </div>
            <span class="sr-search-count" id="sr-team-count">${allMembers.length} staff</span>
          </div>

          <div class="sr-team-grid" id="sr-team-list-container"></div>
        </section>
      `;

      filterAndRender(teamSearchQuery);

      const searchInput = document.getElementById('sr-team-search');
      searchInput?.addEventListener('input', (e) => {
        teamSearchQuery = e.target.value;
        filterAndRender(teamSearchQuery);
      });

    } catch (err) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Could not load team directory</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">${escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.navigate('team')">Retry</button>
        </div>
      `;
    }
  }

  // ── 8. Polished Approvals Screen (UI Phase 3) ─────────────────────────────
  let approvalsTab = 'access'; // 'access' | 'leave'

  async function renderApprovalsScreen() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    // Check manager authority: must be supervisor or owner
    const isManager = isManagerRole(user.role);
    if (!isManager) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Access Restricted</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">Approvals require a shift supervisor or organisation owner role.</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.navigate('today')">Return to Today</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="sr-skeleton" style="height: 48px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 140px; margin-bottom: 16px;"></div>
      <div class="sr-skeleton" style="height: 200px;"></div>
    `;

    try {
      // Supervisors MUST NOT see or execute owner-only actions (leave reviews)
      const isOwner = user.role === 'owner';

      const [pendingRes, leaveRes] = await Promise.all([
        fetch('/api/memberships/pending'),
        isOwner ? fetch('/api/leave-requests') : Promise.resolve(null)
      ]);

      if (!pendingRes.ok) {
        const err = await pendingRes.json().catch(() => ({}));
        throw new Error(err.error || 'Could not load pending access requests');
      }

      const pendingData = await pendingRes.json();
      const accessRequests = pendingData.requests || [];

      let leaveRequests = [];
      if (isOwner && leaveRes && leaveRes.ok) {
        const leaveData = await leaveRes.json();
        leaveRequests = (leaveData.requests || []).filter(r => r.status === 'pending');
      }

      // If supervisor, strictly clamp tab to 'access'
      if (!isOwner) {
        approvalsTab = 'access';
      }

      container.innerHTML = `
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Facility: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
            <span class="sr-context-banner-site">Authorisations Queue: <strong>${escapeHtml(user.department || 'Operations')}</strong></span>
          </div>
          <span class="sr-context-banner-badge">${escapeHtml(user.role.toUpperCase())}</span>
        </div>

        <div class="sr-tabs-header">
          <button class="sr-tab-btn ${approvalsTab === 'access' ? 'active' : ''}" data-sr-approval-tab="access">
            <span>Worker Access Requests</span>
            ${accessRequests.length > 0 ? `<span class="sr-tab-badge">${accessRequests.length}</span>` : ''}
          </button>
          ${isOwner ? `
            <button class="sr-tab-btn ${approvalsTab === 'leave' ? 'active' : ''}" data-sr-approval-tab="leave">
              <span>Leave Reviews (Owner)</span>
              ${leaveRequests.length > 0 ? `<span class="sr-tab-badge">${leaveRequests.length}</span>` : ''}
            </button>
          ` : ''}
        </div>

        <div id="sr-approval-feedback"></div>
        <div id="sr-approvals-panel"></div>
      `;

      // Tab switcher
      container.querySelectorAll('[data-sr-approval-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          approvalsTab = btn.dataset.srApprovalTab;
          renderApprovalsScreen();
        });
      });

      const panel = document.getElementById('sr-approvals-panel');

      if (approvalsTab === 'leave' && isOwner) {
        renderLeaveApprovalsList(panel, leaveRequests, user);
      } else {
        renderWorkerAccessList(panel, accessRequests, user);
      }

    } catch (err) {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
          <h3 style="color:#b91c1c;margin:0 0 6px;">Could not load approvals queue</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0 0 14px;">${escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.navigate('approvals')">Retry</button>
        </div>
      `;
    }
  }

  // Helper: Render Worker Access List
  function renderWorkerAccessList(container, requests, user) {
    if (!requests || requests.length === 0) {
      container.innerHTML = `
        <div class="sr-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          <p>All caught up! No pending worker access requests awaiting authorisation.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(r => {
      const initials = (r.name || 'W').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recently';

      return `
        <article class="sr-approval-card" data-request-id="${r.id}">
          <div class="sr-approval-header">
            <div class="sr-approval-applicant">
              <div class="sr-approval-avatar">${escapeHtml(initials)}</div>
              <div>
                <h4 class="sr-approval-applicant-name">${escapeHtml(r.name || 'Worker Applicant')}</h4>
                <p class="sr-approval-applicant-meta">${escapeHtml(r.email || '')} · Applied: ${escapeHtml(dateStr)}</p>
              </div>
            </div>
            <span class="sr-status-pill pending_approval">PENDING APPROVAL</span>
          </div>

          <div class="sr-approval-body">
            <strong>Requested Unit:</strong> ${escapeHtml(r.department || 'Operations')}<br>
            <strong>Position Title:</strong> ${escapeHtml(r.title || 'Frontline Specialist')}
          </div>

          <div class="sr-approval-actions">
            <button class="sr-btn-reject" data-action="open-reject-access" data-id="${r.id}" data-name="${escapeHtml(r.name || 'Applicant')}">
              Reject Access
            </button>
            <button class="sr-btn-approve" data-action="open-approve-access" data-id="${r.id}" data-name="${escapeHtml(r.name || 'Applicant')}">
              Approve Access
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Bind Consequential Action Triggers
    container.querySelectorAll('[data-action="open-approve-access"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        openConsequentialModal({
          title: 'Authorise Worker Access',
          bodyHtml: `
            <p style="margin:0 0 12px;font-size:14px;color:var(--sr-text-main);">
              Are you sure you want to approve <strong>${escapeHtml(name)}</strong> into this facility workspace?
            </p>
            <div class="sr-form-group" style="margin-bottom:14px;">
              <label class="sr-form-label" for="sr-access-role-select">Assign Worker Role</label>
              <select id="sr-access-role-select" class="sr-form-input">
                <option value="incoming" selected>Incoming Shift Specialist</option>
                <option value="outgoing">Outgoing Shift Specialist</option>
                <option value="worker">Frontline General Worker</option>
              </select>
            </div>
            <small style="color:var(--sr-text-muted);display:block;margin-top:4px;">
              Consequential action: Grants access to shift handovers, attendance reporting, and internal team directory.
            </small>
          `,
          confirmLabel: 'Approve & Grant Access',
          confirmBtnClass: 'sr-btn-approve',
          onConfirm: async (modalEl, confirmBtn) => {
            const roleSelect = modalEl.querySelector('#sr-access-role-select');
            const role = roleSelect ? roleSelect.value : 'incoming';
            confirmBtn.dataset.idempotencyKey = confirmBtn.dataset.idempotencyKey || ('idem_mem_appr_' + id + '_' + Date.now());

            const res = await fetch(`/api/memberships/${id}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': confirmBtn.dataset.idempotencyKey
              },
              body: JSON.stringify({ decision: 'approve', role })
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Approval failed');
            }

            modalEl.remove();
            showApprovalFeedback(`Worker access granted for ${name}.`, 'success');
            await renderApprovalsScreen();
          }
        });
      });
    });

    container.querySelectorAll('[data-action="open-reject-access"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        openConsequentialModal({
          title: 'Reject Access Request',
          bodyHtml: `
            <p style="margin:0 0 12px;font-size:14px;color:var(--sr-text-main);">
              Are you sure you want to reject the access request for <strong>${escapeHtml(name)}</strong>?
            </p>
            <small style="color:var(--sr-text-muted);display:block;">
              Consequential action: The applicant will be blocked from accessing facility data.
            </small>
          `,
          confirmLabel: 'Confirm Rejection',
          confirmBtnClass: 'sr-btn-reject',
          onConfirm: async (modalEl, confirmBtn) => {
            confirmBtn.dataset.idempotencyKey = confirmBtn.dataset.idempotencyKey || ('idem_mem_rej_' + id + '_' + Date.now());

            const res = await fetch(`/api/memberships/${id}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': confirmBtn.dataset.idempotencyKey
              },
              body: JSON.stringify({ decision: 'reject' })
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Rejection failed');
            }

            modalEl.remove();
            showApprovalFeedback(`Access request for ${name} rejected.`, 'success');
            await renderApprovalsScreen();
          }
        });
      });
    });
  }

  // Helper: Render Leave Approvals List (Owner Only)
  function renderLeaveApprovalsList(container, requests, user) {
    if (!requests || requests.length === 0) {
      container.innerHTML = `
        <div class="sr-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <p>No pending employee leave requests requiring owner review.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(lr => {
      const applicantName = lr.applicant_name || 'Staff Member';
      const initials = applicantName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
      const dateStr = lr.created_at ? new Date(lr.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';

      return `
        <article class="sr-approval-card" data-leave-id="${lr.id}">
          <div class="sr-approval-header">
            <div class="sr-approval-applicant">
              <div class="sr-approval-avatar">${escapeHtml(initials)}</div>
              <div>
                <h4 class="sr-approval-applicant-name">${escapeHtml(applicantName)}</h4>
                <p class="sr-approval-applicant-meta">${escapeHtml(lr.applicant_department || 'Operations')} · Submitted: ${escapeHtml(dateStr)}</p>
              </div>
            </div>
            <span class="sr-status-pill pending">PENDING REVIEW</span>
          </div>

          <div class="sr-approval-body">
            <strong>Requested Leave Duration:</strong> ${escapeHtml(lr.starts_on)} to ${escapeHtml(lr.ends_on)}<br>
            <strong>Reason:</strong> ${escapeHtml(lr.reason || 'Personal / General Leave')}
          </div>

          <div class="sr-approval-actions">
            <button class="sr-btn-reject" data-action="open-reject-leave" data-id="${lr.id}" data-name="${escapeHtml(applicantName)}">
              Reject Leave
            </button>
            <button class="sr-btn-approve" data-action="open-approve-leave" data-id="${lr.id}" data-name="${escapeHtml(applicantName)}">
              Approve Leave
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Bind Leave Consequential Action Modals
    container.querySelectorAll('[data-action="open-approve-leave"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        openConsequentialModal({
          title: 'Authorise Leave Request',
          bodyHtml: `
            <p style="margin:0 0 12px;font-size:14px;color:var(--sr-text-main);">
              Are you sure you want to approve leave for <strong>${escapeHtml(name)}</strong>?
            </p>
            <small style="color:var(--sr-text-muted);display:block;">
              Consequential action: Notifies the employee and updates facility scheduling coverage.
            </small>
          `,
          confirmLabel: 'Confirm & Approve Leave',
          confirmBtnClass: 'sr-btn-approve',
          onConfirm: async (modalEl, confirmBtn) => {
            confirmBtn.dataset.idempotencyKey = confirmBtn.dataset.idempotencyKey || ('idem_leave_' + id + '_appr_' + Date.now());

            const res = await fetch('/api/leave-requests/review', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': confirmBtn.dataset.idempotencyKey
              },
              body: JSON.stringify({ id, decision: 'approved' })
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Leave approval failed');
            }

            modalEl.remove();
            showApprovalFeedback(`Leave approved for ${name}.`, 'success');
            await renderApprovalsScreen();
          }
        });
      });
    });

    container.querySelectorAll('[data-action="open-reject-leave"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        openConsequentialModal({
          title: 'Reject Leave Request',
          bodyHtml: `
            <p style="margin:0 0 12px;font-size:14px;color:var(--sr-text-main);">
              Are you sure you want to reject the leave request for <strong>${escapeHtml(name)}</strong>?
            </p>
            <small style="color:var(--sr-text-muted);display:block;">
              Consequential action: The employee will be notified that leave was not approved.
            </small>
          `,
          confirmLabel: 'Confirm Rejection',
          confirmBtnClass: 'sr-btn-reject',
          onConfirm: async (modalEl, confirmBtn) => {
            confirmBtn.dataset.idempotencyKey = confirmBtn.dataset.idempotencyKey || ('idem_leave_' + id + '_rej_' + Date.now());

            const res = await fetch('/api/leave-requests/review', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': confirmBtn.dataset.idempotencyKey
              },
              body: JSON.stringify({ id, decision: 'rejected' })
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Leave rejection failed');
            }

            modalEl.remove();
            showApprovalFeedback(`Leave request for ${name} rejected.`, 'success');
            await renderApprovalsScreen();
          }
        });
      });
    });
  }

  // Reusable Consequential Action Modal with Duplicate Submission Prevention
  function openConsequentialModal({ title, bodyHtml, confirmLabel, confirmBtnClass, onConfirm }) {
    document.getElementById('sr-consequential-modal-root')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'sr-consequential-modal-root';
    backdrop.className = 'sr-modal-backdrop';
    backdrop.innerHTML = `
      <div class="sr-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sr-confirm-modal-title">
        <h3 id="sr-confirm-modal-title" class="sr-confirm-title">${escapeHtml(title)}</h3>
        <div class="sr-confirm-text">${bodyHtml}</div>
        <div id="sr-confirm-modal-error"></div>
        <div class="sr-confirm-actions">
          <button type="button" class="sr-btn sr-btn-secondary" id="sr-btn-confirm-cancel">Cancel</button>
          <button type="button" class="${confirmBtnClass || 'sr-btn-approve'}" id="sr-btn-confirm-ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeModal = () => backdrop.remove();
    backdrop.querySelector('#sr-btn-confirm-cancel')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

    const confirmBtn = backdrop.querySelector('#sr-btn-confirm-ok');
    const cancelBtn = backdrop.querySelector('#sr-btn-confirm-cancel');
    const errorEl = backdrop.querySelector('#sr-confirm-modal-error');

    confirmBtn?.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      const origText = confirmBtn.textContent;
      confirmBtn.textContent = 'Processing...';
      if (errorEl) errorEl.innerHTML = '';

      try {
        await onConfirm(backdrop, confirmBtn);
      } catch (err) {
        if (errorEl) {
          errorEl.innerHTML = `<div class="sr-state-feedback error" style="margin-bottom:12px;">${escapeHtml(err.message)}</div>`;
        }
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = origText;
      }
    });

    // Focus confirm button
    setTimeout(() => confirmBtn?.focus(), 50);
  }

  function showApprovalFeedback(message, type = 'success') {
    const feedbackEl = document.getElementById('sr-approval-feedback');
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div class="sr-state-feedback ${type}">${escapeHtml(message)}</div>`;
      setTimeout(() => { if (feedbackEl) feedbackEl.innerHTML = ''; }, 4000);
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
    renderWorkerHandovers,
    renderManagerHandovers,
    renderTeamScreen,
    renderApprovalsScreen,
    openContextModal,
    navigate
  };

  // If an active session is already established on script execution, mount the shell
  if (getUser()) {
    mountShell();
  }

})();
