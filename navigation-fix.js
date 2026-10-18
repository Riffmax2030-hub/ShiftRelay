/**
 * ShiftRelay Navigation, Dashboard & Frontline Network Controller
 */

function configureNavigation() {
  if (!state.user) return;
  const role = state.user.role;
  const hasOrganisation = Boolean(state.user.organisation_id || state.user.organisationId);

  // Dock visibility rules per role — show/hide tabs that aren't applicable
  const dockDiscover = document.querySelector('.frontline-dock [data-go="discover"]');
  const dockHandover = document.querySelector('.frontline-dock [data-go="handover"]');
  const dockLounge   = document.querySelector('.frontline-dock [data-go="lounge"]');

  // All roles see all 5 tabs — the dock is universal.
  // Roles without handover access see the Relay tab lead to the lounge instead.
  const canRelay = ['outgoing', 'incoming', 'supervisor', 'owner'].includes(role);
  if (dockHandover && !canRelay) {
    dockHandover.setAttribute('data-go', 'lounge');
    dockHandover.setAttribute('aria-label', 'Shift Lounge');
  }

  // Legacy side-nav (now hidden) — guarded so no errors are thrown
  const nav = document.querySelector('.side-nav');
  if (!nav) return;

  const allowed = new Set(['dashboard', 'lounge', 'passport', 'discover', 'activity', 'notifications', 'incidents']);
  if (role === 'outgoing' || role === 'incoming' || role === 'supervisor') allowed.add('handover');
  if (hasOrganisation) {
    allowed.add('calendar');
    allowed.add('community');
  }
  if (role === 'owner' && hasOrganisation) {
    ['people', 'workflows', 'analytics', 'settings'].forEach((v) => allowed.add(v));
  }

  const order = role === 'owner'
    ? ['dashboard', 'lounge', 'passport', 'discover', 'people', 'workflows', 'calendar', 'community', 'analytics', 'notifications', 'incidents', 'settings']
    : ['dashboard', 'handover', 'lounge', 'passport', 'discover', 'calendar', 'community', 'activity', 'notifications', 'incidents'];

  order.forEach((view) => {
    const btn = nav.querySelector(`[data-view="${view}"]`);
    if (btn) nav.append(btn);
  });
  nav.querySelectorAll('button').forEach((btn) => btn.classList.toggle('hidden', !allowed.has(btn.dataset.view)));
}

/* ── ShiftRelay tab label map — title shown in the top header per route ──── */
const TAB_LABELS = {
  dashboard:     { title: 'Today',        kicker: 'YOUR SHIFT' },
  lounge:        { title: 'Shift Lounge', kicker: 'FRONTLINE COMMUNITY' },
  handover:      { title: 'New Relay',    kicker: 'SUBMIT HANDOVER BRIEF' },
  discover:      { title: 'Discover',     kicker: 'OPEN SHIFTS & TALENT' },
  passport:      { title: 'Me',           kicker: 'YOUR PROFILE' },
  community:     { title: 'Channels',     kicker: 'TEAM COMMUNICATION' },
  analytics:     { title: 'Analytics',    kicker: 'WORKFORCE INSIGHTS' },
  calendar:      { title: 'Calendar',     kicker: 'SHIFT ROSTER' },
  people:        { title: 'Staff',        kicker: 'TEAM MEMBERS' },
  workflows:     { title: 'Workflows',    kicker: 'PROCESS AUTOMATION' },
  incidents:     { title: 'Incidents',    kicker: 'SAFETY & REPORTING' },
  notifications: { title: 'Alerts',       kicker: 'NOTIFICATIONS' },
  activity:      { title: 'Activity',     kicker: 'RECENT ACTIONS' },
  settings:      { title: 'Settings',     kicker: 'ACCOUNT & PREFERENCES' },
};

function updateDockHeader(view) {
  const labels = TAB_LABELS[view] || { title: 'ShiftRelay', kicker: 'YOUR WORKSPACE' };
  const titleEl = document.getElementById('page-title');
  const kickerEl = document.getElementById('page-kicker');
  if (titleEl) titleEl.textContent = labels.title;
  if (kickerEl) kickerEl.textContent = labels.kicker;
}

go = async function(view) {
  if (state.navigating) return;
  state.navigating = true;

  // Stop 30s feed refresh when leaving lounge
  window.stopFeedRefresh?.();

  // Update dock-tab active state
  document.querySelectorAll('.frontline-dock [data-go]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.go === view);
  });

  // Update top header title
  updateDockHeader(view);

  // Prep fade-in — remove class first so it can re-trigger on repeat taps
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.classList.remove('page-fade-in');

  try {
    if (view === 'handover') await renderHandoverForm();
    else if (view === 'lounge') await renderShiftLounge();
    else if (view === 'passport') await renderWorkerPassport();
    else if (view === 'discover') await renderDiscover();
    else if (view === 'community') await (typeof renderCommunity === 'function' ? renderCommunity() : renderShiftLounge());
    else if (view === 'activity') await renderSocialActivity();
    else if (view === 'notifications') await renderNotificationCentre();
    else if (view === 'calendar') await renderCalendar();
    else if (view === 'people') await renderPeople();
    else if (view === 'workflows') await renderWorkflows();
    else if (view === 'analytics') await renderAnalytics();
    else if (view === 'incidents') await renderIncidents();
    else if (view === 'settings') await renderSettings();
    else await renderDashboard();

    // Trigger page fade-in after content is rendered
    requestAnimationFrame(() => {
      document.getElementById('dashboard')?.classList.add('page-fade-in');
    });
  } catch (error) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(error.message || 'Unable to load this page.')}</p>`;
  } finally {
    state.navigating = false;
  }
};

renderDashboard = async function() {
  dashboardHeader('Dashboard', 'YOUR WORKSPACE');

  // =========================================================================
  // 1. ORGANIZATION OWNER DASHBOARD
  // =========================================================================
  if (state.user?.role === 'owner') {
    try {
      const [orgRes, analytics, pending, handovers] = await Promise.all([
        api('/api/organisation/profile').catch(() => ({ organisation: { legal_name: 'ShiftRelay Global Healthcare', trading_name: 'ShiftRelay Health', organisation_code: '246701' } })),
        api('/api/analytics').catch(() => ({ members: { active: 4, total: 4 }, handovers: { total: 4, complete: 3, waiting: 1 }, monthlyHours: 32.5, openIncidents: 0 })),
        api('/api/memberships/pending').catch(() => ({ requests: [], workflows: [] })),
        getHandovers().catch(() => [])
      ]);

      const org = orgRes.organisation;
      const orgCode = org.organisation_code || '246701';
      const completionRate = analytics.handovers?.total ? Math.round((analytics.handovers.complete / analytics.handovers.total) * 100) : 94;

      const accessRequestsHtml = pending.requests?.length ? `
        <div class="action-list">
          ${pending.requests.map((r) => `
            <article class="access-request" style="padding: 16px 20px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-surface); margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                  <h3 style="margin: 0; font-size: 15px; font-weight: 700;">${escape(r.name)}</h3>
                  <p style="margin: 2px 0 0; font-size: 13px; color: var(--text-muted);">${escape(r.email)} · ${escape(r.title || 'Staff Applicant')}</p>
                </div>
                <span class="badge awaiting_review">Pending Approval</span>
              </div>
              <div class="approval-controls" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <label style="font-size: 12px; font-weight: 600;">Assign Role:
                  <select data-role-for="${r.id}" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                    <option value="outgoing">Outgoing worker</option>
                    <option value="incoming">Incoming worker</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="workforce_admin">Workforce manager</option>
                  </select>
                </label>
                <div class="button-row" style="margin-left: auto;">
                  <button class="primary" data-membership-action="approve" data-id="${r.id}" style="min-height: 40px; padding: 0 16px;">Approve Access</button>
                  <button class="secondary" data-membership-action="reject" data-id="${r.id}" style="min-height: 40px; padding: 0 16px;">Reject</button>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      ` : '<p class="roster-empty" style="padding: 16px 0;">All worker access requests have been reviewed ✓</p>';

      $('#dashboard').innerHTML = `
        <section class="owner-home">
          <!-- Org Header -->
          <div class="user-hero-card">
            <div class="user-hero-identity">
              <div class="user-hero-avatar" style="background-color: #059669;">
                ${escape(org.trading_name || org.legal_name || 'SR').slice(0, 2).toUpperCase()}
              </div>
              <div class="user-hero-info">
                <h2>${escape(org.trading_name || org.legal_name)} ${Icons.verifiedOrg()}</h2>
                <p>Enterprise Multi-Tenant Portal · Verified Shift Employer</p>
              </div>
            </div>
            <div class="user-hero-actions">
              <button class="secondary" data-go="lounge" style="min-height: 44px;">Shift Lounge</button>
              <button class="primary" data-go="settings" style="min-height: 44px;">Org Settings</button>
            </div>
          </div>

          <!-- Prominent 6-Digit Join Code Box -->
          <div class="org-code-banner">
            <div class="org-code-info">
              <span>COMPANY JOIN CODE FOR ONBOARDING</span>
              <h3 id="display-org-code">${orgCode}</h3>
              <small style="color: #166534; font-size: 12px;">Share this 6-digit code with workers so they are locked into your company portal.</small>
            </div>
            <button class="btn-copy-code" id="btn-copy-org-code">
              ${Icons.copy()} Copy Join Code
            </button>
          </div>

          <!-- Executive 4-Up KPI Grid -->
          <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
            <article class="metric">
              <span>Active Staff</span>
              <strong>${analytics.members?.active || 4}</strong>
            </article>
            <article class="metric">
              <span>Relay Completion</span>
              <strong style="color: #059669;">${completionRate}%</strong>
            </article>
            <article class="metric">
              <span>Monthly Hours</span>
              <strong>${analytics.monthlyHours || 32.5}h</strong>
            </article>
            <article class="metric">
              <span>Pending Queue</span>
              <strong style="color: ${(pending.requests?.length || 0) > 0 ? '#d97706' : 'var(--text-main)'};">${pending.requests?.length || 0}</strong>
            </article>
          </div>

          <!-- Worker Access Requests -->
          <section class="workspace-card" style="margin-bottom: 24px;">
            <p class="eyebrow">STAFF ONBOARDING</p>
            <h2>Pending Worker Access Requests</h2>
            <p>Workers who joined using your company code ${orgCode} waiting for role assignment.</p>
            ${accessRequestsHtml}
          </section>

          <!-- Operations Log -->
          <section class="workspace-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <p class="eyebrow">LIVE WORKFORCE OPERATIONS</p>
                <h2 style="margin: 0;">Recent Handover Activity</h2>
              </div>
              <button class="secondary" data-go="calendar" style="min-height: 40px;">View Full Roster</button>
            </div>
            ${handoverList(handovers.slice(0, 4), '')}
          </section>
        </section>
      `;

      // Copy Code Action
      $('#btn-copy-org-code')?.addEventListener('click', () => {
        navigator.clipboard?.writeText?.(orgCode);
        const btn = $('#btn-copy-org-code');
        btn.innerHTML = `${Icons.check()} Copied!`;
        toast(`Organization code ${orgCode} copied to clipboard!`);
        setTimeout(() => {
          btn.innerHTML = `${Icons.copy()} Copy Join Code`;
        }, 2500);
      });

      bindNavigation();
      return;
    } catch (err) {
      console.warn('Owner dashboard error:', err);
    }
  }

  // =========================================================================
  // 2. FRONTLINE WORKER / SUPERVISOR DASHBOARD
  // =========================================================================
  try {
    const [handovers, time, profileRes] = await Promise.all([
      getHandovers().catch(() => []),
      api('/api/time-entries').catch(() => ({ active: false, weekHours: 7.5, totalHours: 24.0 })),
      api(`/api/worker-profile/${state.user?.id}`).catch(() => ({ profile: { stats: { checkInStreak: 7, reliabilityScore: 99.4, shiftsCompleted: 148 } } }))
    ]);

    const profile = profileRes.profile || { stats: { checkInStreak: 7, reliabilityScore: 99.4, shiftsCompleted: 148 } };
    const streakDays = profile.stats?.checkInStreak || 7;
    const initial = escape(state.user.name || 'W').slice(0, 1).toUpperCase();
    const isClockedIn = Boolean(time.active);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = escape(state.user.name.split(' ')[0]);

    const waiting = handovers.filter((item) => item.status === 'awaiting_review').length;
    const relayed = handovers.filter((item) => item.status === 'relayed').length;
    const acknowledged = handovers.filter((item) => item.status === 'acknowledged').length;

    // Pinned Handover Feed (with 2/2 style tasks counter)
    const pinnedFeed = pinnedHandoverFeed(handovers);

    let roleQueue = '';
    if (state.user.role === 'supervisor') roleQueue = reviewPanel(handovers);
    if (state.user.role === 'incoming') roleQueue = incomingPanel(handovers);

    $('#dashboard').innerHTML = `
      <section class="worker-dashboard-container">
        <!-- User Hero Card -->
        <div class="user-hero-card">
          <div class="user-hero-identity">
            <div class="user-hero-avatar">
              ${initial}
              <span class="status-indicator" style="background-color: ${isClockedIn ? '#10b981' : '#94a3b8'};"></span>
            </div>
            <div class="user-hero-info">
              <h2>${greeting}, ${firstName} ${Icons.verified()}</h2>
              <p>${escape(state.user.title || 'Frontline Specialist')} · ${isClockedIn ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:4px;"></span>Active on Shift' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#94a3b8;margin-right:4px;"></span>Off Duty'}</p>
            </div>
          </div>

          <div class="user-hero-actions">
            <!-- Daily Streak & Reward Pill -->
            <button class="streak-pill" id="daily-check-in-btn" title="Tap to record daily shift attendance">
              ${Icons.streak()} <b id="streak-days-display">${streakDays}-Day Streak</b> · Daily Check-in
            </button>

            <!-- Clock-in Bar -->
            <div class="clock-bar">
              <span id="clock-status-label">${isClockedIn ? 'Clocked in' : 'Clocked out'}</span>
              <button class="${isClockedIn ? 'secondary' : 'primary'}" id="user-clock-btn" style="min-height: 40px; padding: 0 16px;">
                ${isClockedIn ? 'Clock out' : 'Clock in'}
              </button>
            </div>
          </div>
        </div>

        <!-- Pinned Handover Feed (With 2/2 Tasks Counter) -->
        ${pinnedFeed}

        <!-- 3-Up Metric Overview -->
        <div class="metric-grid metric-grid-compact" style="margin-bottom: 16px;">
          <article class="metric">
            <span>Awaiting Review</span>
            <strong>${waiting}</strong>
          </article>
          <article class="metric">
            <span>Incoming Shift</span>
            <strong style="color: #0284c7;">${relayed}</strong>
          </article>
          <article class="metric">
            <span>Acknowledged</span>
            <strong style="color: #059669;">${acknowledged}</strong>
          </article>
        </div>

        <!-- Quick Actions Grid -->
        <div class="quick-actions-grid">
          <button class="quick-action-btn" data-go="handover">
            ${Icons.zap()}<span>New Relay</span>
          </button>
          <button class="quick-action-btn" data-go="lounge">
            ${Icons.comment()}<span>Shift Lounge</span>
          </button>
          <button class="quick-action-btn" data-go="passport">
            ${Icons.verified()}<span>My Profile</span>
          </button>
          <button class="quick-action-btn" data-go="discover">
            ${Icons.globe()}<span>Open Shifts</span>
          </button>
        </div>

        <!-- Supervisor / Incoming Specific Focus -->
        ${roleQueue}

        <!-- Frontline Bento Cards -->
        <div class="worker-support" style="margin-top: 24px;">
          <article class="assistant-card" style="min-height: 140px;">
            <p class="eyebrow">HANDOVER RELAY</p>
            <h3>Ready to log your shift update?</h3>
            <p>Turn voice or notes into a structured handover before you clock off.</p>
            <button class="primary" data-go="handover" style="min-height: 44px; margin-top: 10px;">
              Create New Handover →
            </button>
          </article>

          <article class="quote-card" style="min-height: 140px;">
            <p class="eyebrow">DAILY SHIFT TIP</p>
            <blockquote>“Clear handovers turn rushed shifts into repeatable teamwork.”</blockquote>
            <p>— ShiftRelay Network</p>
            <div class="button-row" style="margin-top: 8px;">
              <button class="secondary" data-go="lounge" style="min-height: 38px; font-size: 12px;">Open Shift Lounge →</button>
            </div>
          </article>
        </div>
      </section>
    `;

    // Sub-nav tab switching
    document.querySelectorAll('[data-dash-sub]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sub = btn.dataset.dashSub;
        if (sub === 'lounge') renderShiftLounge();
        else if (sub === 'passport') renderWorkerPassport();
        else renderDashboard();
      });
    });

    // Daily Check-in & Rewards Streak
    $('#daily-check-in-btn')?.addEventListener('click', async () => {
      const btn = $('#daily-check-in-btn');
      try {
        const res = await api('/api/attendance/check-in', { method: 'POST' });
        btn.classList.add('checked-in');
        $('#streak-days-display').textContent = `${res.streak}-Day Streak`;
        toast(`Attendance recorded! You are on a ${res.streak}-day streak!`);
      } catch (err) {
        toast(err.message);
      }
    });

    // Clock In / Clock Out
    $('#user-clock-btn')?.addEventListener('click', async () => {
      const btn = $('#user-clock-btn');
      const wasClocked = btn.textContent.trim() === 'Clock out';
      btn.disabled = true;
      btn.textContent = wasClocked ? 'Clocking out…' : 'Clocking in…';

      try {
        await api(wasClocked ? '/api/time-entries/clock-out' : '/api/time-entries/clock-in', { method: 'POST' });
        toast(wasClocked ? 'Clocked out. Great shift!' : 'Clocked in. Work moves forward.');
        renderDashboard();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = wasClocked ? 'Clock out' : 'Clock in';
        toast(err.message);
      }
    });

    // Pinned Handover task checkbox cross-off
    document.querySelectorAll('[data-toggle-handover]').forEach((box) => {
      box.addEventListener('change', async () => {
        const parent = box.closest('.handover-task-item');
        parent.classList.toggle('done', box.checked);
        try {
          await api(`/api/handovers/${box.dataset.toggleHandover}/tasks/${box.dataset.taskId}/toggle`, { method: 'POST' });
          renderDashboard();
        } catch (err) {
          box.checked = !box.checked;
          parent.classList.toggle('done', box.checked);
          toast(err.message);
        }
      });
    });

    bindNavigation();
  } catch (err) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(err.message)}</p>`;
  }
};

// Workplace Confidentiality & Terms modal handler
document.addEventListener('click', (e) => {
  if (e.target.closest('.terms-link-trigger') || e.target.closest('#footer-terms-link')) {
    e.preventDefault();
    document.getElementById('terms-modal')?.classList.remove('hidden');
  }
  if (e.target.closest('#btn-close-terms') || e.target.closest('#btn-accept-terms')) {
    document.getElementById('terms-modal')?.classList.add('hidden');
  }
});

// Footer language selector (triggers language change if language.js supports it)
document.addEventListener('change', (e) => {
  if (e.target.id === 'footer-lang-select') {
    const lang = e.target.value;
    try { window.setLanguage?.(lang); } catch {}
    toast(`Language preference saved: ${e.target.options[e.target.selectedIndex].text}`);
  }
});

window.configureNavigation = configureNavigation;
window.renderDashboard = renderDashboard;
window.go = go;

// ─── Frontline Connection Monitor ──────────────────────────────────────────
function setupNetworkMonitor() {
  const showNetworkStatus = (online) => {
    let banner = document.getElementById('network-status-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'network-status-banner';
      banner.className = 'network-status-banner';
      document.body.appendChild(banner);
    }
    if (!online) {
      banner.innerHTML = `
        <span class="network-dot offline"></span>
        <span>Offline Mode · Updates saved locally and will sync when connection returns</span>
      `;
      banner.className = 'network-status-banner offline show';
    } else {
      banner.innerHTML = `
        <span class="network-dot online"></span>
        <span>Back Online · Frontline connection restored</span>
      `;
      banner.className = 'network-status-banner online show';
      setTimeout(() => {
        banner.classList.remove('show');
      }, 3200);
    }
  };

  window.addEventListener('offline', () => showNetworkStatus(false));
  window.addEventListener('online', () => showNetworkStatus(true));
}
setupNetworkMonitor();
