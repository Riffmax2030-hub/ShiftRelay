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

  // Intercept fetch to automatically supply the active user demo header for all /api calls
  const _origFetch = window.fetch;
  window.fetch = function (input, init) {
    const user = getUser();
    if (user?.id) {
      const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url.startsWith('/api/') || url.includes('/api/')) {
        init = init ? { ...init } : {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has('x-shiftrelay-user')) init.headers.set('x-shiftrelay-user', user.id);
        } else if (Array.isArray(init.headers)) {
          if (!init.headers.some(([k]) => k.toLowerCase() === 'x-shiftrelay-user')) {
            init.headers = [...init.headers, ['x-shiftrelay-user', user.id]];
          }
        } else {
          init.headers = {
            'x-shiftrelay-user': user.id,
            ...(init.headers || {})
          };
        }
      }
    }
    return _origFetch.call(this, input, init);
  };

  function isManagerRole(role) {
    return role === 'supervisor' || role === 'owner';
  }

  function isAuthorizedView(viewName, isManager, role) {
    const userRole = role || getUser()?.role;
    const allowedWorker = ['today', 'handovers', 'me', 'schedule'];
    const allowedManager = ['overview', 'schedule', 'handovers', 'team', 'approvals', 'me'];
    if (userRole === 'owner') allowedManager.push('settings');
    return isManager ? allowedManager.includes(viewName) : allowedWorker.includes(viewName);
  }

  // ── Notifications State & Accessible Panel Manager (UI Phase 4) ────────────
  let cachedNotifications = [];

  function updateBellBadge(count) {
    const badge = document.getElementById('sr-shell-bell-badge');
    const panelBadge = document.getElementById('sr-notif-panel-badge');
    const markAllBtn = document.getElementById('sr-notif-mark-all-btn');

    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = 'inline-flex';
      } else {
        badge.textContent = '0';
        badge.style.display = 'none';
      }
    }

    if (panelBadge) {
      if (count > 0) {
        panelBadge.textContent = String(count);
        panelBadge.style.display = 'inline-flex';
      } else {
        panelBadge.style.display = 'none';
      }
    }

    if (markAllBtn) {
      markAllBtn.disabled = count === 0;
    }
  }

  function clearNotificationState() {
    cachedNotifications = [];
    updateBellBadge(0);
    const listEl = document.getElementById('sr-notif-list');
    if (listEl) {
      listEl.innerHTML = `
        <div class="sr-notif-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <h4>All caught up</h4>
          <p>No notifications for this organisation.</p>
        </div>
      `;
    }
  }

  function formatRelativeTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const now = Date.now();
    const diffSec = Math.floor((now - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function resolveNotificationDestination(msg, isManager) {
    const lower = (msg || '').toLowerCase();
    if (lower.includes('handover') || lower.includes('brief') || lower.includes('task') || lower.includes('relay')) {
      return 'handovers';
    }
    if (lower.includes('leave') || lower.includes('access') || lower.includes('applicant') || lower.includes('approval') || lower.includes('membership')) {
      return isManager ? 'approvals' : 'today';
    }
    if (lower.includes('team') || lower.includes('channel') || lower.includes('staff')) {
      return isManager ? 'team' : 'today';
    }
    if (lower.includes('shift') || lower.includes('schedule') || lower.includes('clock') || lower.includes('attendance')) {
      return isManager ? 'overview' : 'today';
    }
    return isManager ? 'overview' : 'today';
  }

  function renderNotificationItems(notifications) {
    const listEl = document.getElementById('sr-notif-list');
    if (!listEl) return;

    if (notifications.length === 0) {
      listEl.innerHTML = `
        <div class="sr-notif-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <h4>All caught up</h4>
          <p>No new notifications at this time.</p>
        </div>
      `;
      return;
    }

    const user = getUser();
    const isManager = isManagerRole(user ? user.role : '');

    listEl.innerHTML = notifications.map(n => {
      const isUnread = !n.read && !n.read_at;
      const rawDest = resolveNotificationDestination(n.message, isManager);
      const dest = isAuthorizedView(rawDest, isManager) ? rawDest : (isManager ? 'overview' : 'today');
      return `
        <div class="sr-notif-item ${isUnread ? 'unread' : 'read'}" data-notif-id="${escapeHtml(n.id)}" data-dest="${dest}" role="button" tabindex="0" aria-label="${escapeHtml(n.message)} (${isUnread ? 'Unread' : 'Read'})">
          <div class="sr-notif-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div class="sr-notif-item-content">
            <p class="sr-notif-item-msg">${escapeHtml(n.message)}</p>
            <span class="sr-notif-item-time">${formatRelativeTimestamp(n.createdAt)}</span>
          </div>
          ${isUnread ? `
            <button type="button" class="sr-notif-mark-single" data-mark-id="${escapeHtml(n.id)}" title="Mark as read" aria-label="Mark as read">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    // Single item mark read
    listEl.querySelectorAll('[data-mark-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const notifId = btn.dataset.markId;
        btn.disabled = true;
        try {
          await fetch(`/api/notifications/${encodeURIComponent(notifId)}/read`, { method: 'POST' });
          const item = cachedNotifications.find(n => n.id === notifId);
          if (item) {
            item.read = true;
            item.read_at = new Date().toISOString();
          }
          const unreadCount = cachedNotifications.filter(n => !n.read && !n.read_at).length;
          updateBellBadge(unreadCount);
          renderNotificationItems(cachedNotifications);
        } catch (_) {
          btn.disabled = false;
        }
      });
    });

    // Item click navigation
    listEl.querySelectorAll('.sr-notif-item').forEach(itemEl => {
      const handleActivate = async () => {
        const notifId = itemEl.dataset.notifId;
        const dest = itemEl.dataset.dest;

        if (itemEl.classList.contains('unread')) {
          fetch(`/api/notifications/${encodeURIComponent(notifId)}/read`, { method: 'POST' }).catch(() => {});
          const item = cachedNotifications.find(n => n.id === notifId);
          if (item) {
            item.read = true;
            item.read_at = new Date().toISOString();
          }
          const unreadCount = cachedNotifications.filter(n => !n.read && !n.read_at).length;
          updateBellBadge(unreadCount);
        }

        closeNotificationPanel(false);

        const targetView = isAuthorizedView(dest, isManager) ? dest : (isManager ? 'overview' : 'today');
        navigate(targetView);
      };

      itemEl.addEventListener('click', handleActivate);
      itemEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      });
    });
  }

  async function loadAndRenderNotifications() {
    const listEl = document.getElementById('sr-notif-list');
    if (!listEl) return;

    listEl.innerHTML = `
      <div class="sr-skeleton" style="height: 52px; margin-bottom: 8px; border-radius: 10px;"></div>
      <div class="sr-skeleton" style="height: 52px; margin-bottom: 8px; border-radius: 10px;"></div>
      <div class="sr-skeleton" style="height: 52px; border-radius: 10px;"></div>
    `;

    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load notifications');
      }
      const data = await res.json();
      cachedNotifications = data.notifications || [];
      const unreadCount = cachedNotifications.filter(n => !n.read && !n.read_at).length;
      updateBellBadge(unreadCount);
      renderNotificationItems(cachedNotifications);
    } catch (err) {
      listEl.innerHTML = `
        <div class="sr-notif-error">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>${escapeHtml(err.message)}</p>
          <button type="button" class="sr-btn sr-btn-secondary" id="sr-notif-retry-btn" style="min-height:32px;font-size:12px;padding:0 12px;">Retry</button>
        </div>
      `;
      document.getElementById('sr-notif-retry-btn')?.addEventListener('click', () => {
        loadAndRenderNotifications();
      });
    }
  }

  function openNotificationPanel() {
    const wrap = document.getElementById('sr-notif-panel-wrap');
    const bell = document.getElementById('sr-shell-bell');
    if (!wrap) return;

    wrap.classList.remove('hidden');
    wrap.removeAttribute('aria-hidden');
    requestAnimationFrame(() => {
      wrap.classList.add('open');
    });
    if (bell) bell.setAttribute('aria-expanded', 'true');

    loadAndRenderNotifications();
    setTimeout(() => {
      document.getElementById('sr-notif-close-btn')?.focus();
    }, 100);
  }

  function closeNotificationPanel(restoreFocus = true) {
    const wrap = document.getElementById('sr-notif-panel-wrap');
    const bell = document.getElementById('sr-shell-bell');
    if (!wrap) return;

    wrap.classList.remove('open');
    wrap.setAttribute('aria-hidden', 'true');
    if (bell) bell.setAttribute('aria-expanded', 'false');

    setTimeout(() => {
      wrap.classList.add('hidden');
    }, 220);

    if (restoreFocus && bell) {
      bell.focus();
    }
  }

  function toggleNotificationPanel(forceOpen = null) {
    const wrap = document.getElementById('sr-notif-panel-wrap');
    if (!wrap) return;
    const isOpen = wrap.classList.contains('open');
    const shouldOpen = forceOpen !== null ? forceOpen : !isOpen;
    if (shouldOpen) {
      openNotificationPanel();
    } else {
      closeNotificationPanel(true);
    }
  }

  window.refreshShellNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        cachedNotifications = data.notifications || [];
        const unreadCount = cachedNotifications.filter(n => !n.read && !n.read_at).length;
        updateBellBadge(unreadCount);
        const wrap = document.getElementById('sr-notif-panel-wrap');
        if (wrap && wrap.classList.contains('open')) {
          renderNotificationItems(cachedNotifications);
        }
      }
    } catch (_) {}
  };

  // Keyboard accessibility: Escape closes panel and restores focus
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const wrap = document.getElementById('sr-notif-panel-wrap');
      if (wrap && wrap.classList.contains('open')) {
        e.preventDefault();
        closeNotificationPanel(true);
      }
    }
  });

  // ── Theme State Management ──────────────────────────────────────────────────
  function updateThemeUI(theme) {
    const active = theme || document.documentElement.getAttribute('data-theme') || document.documentElement.dataset.theme || 'light';
    const isDark = active === 'dark';

    const headerBtn = document.getElementById('sr-shell-theme-toggle');
    if (headerBtn) {
      headerBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      headerBtn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      headerBtn.innerHTML = isDark
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    }

    const themeSwitch = document.getElementById('sr-theme-switch');
    const themeStatusDesc = document.getElementById('sr-theme-status-desc');
    if (themeSwitch) {
      themeSwitch.checked = isDark;
    }
    if (themeStatusDesc) {
      themeStatusDesc.textContent = isDark ? 'Dark theme is active' : 'Light theme is active';
    }
  }

  function setThemeAction(nextTheme) {
    const active = nextTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = active;
    document.documentElement.setAttribute('data-theme', active);
    if (document.body) {
      document.body.dataset.theme = active;
      document.body.setAttribute('data-theme', active);
    }
    try { localStorage.setItem('shiftrelay-theme', active); } catch (_) {}
    if (typeof window.applyTheme === 'function') {
      window.applyTheme(active, false);
    }
    updateThemeUI(active);
  }

  function toggleThemeAction() {
    const current = (document.documentElement.getAttribute('data-theme') || document.documentElement.dataset.theme) === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setThemeAction(next);
  }

  window.addEventListener('shiftrelay-theme-changed', (e) => {
    updateThemeUI(e.detail?.theme);
  });

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
        cachedNotifications = notifData.notifications || [];
        unreadCount = cachedNotifications.filter(n => !n.read_at && !n.read).length;
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

            <!-- Theme Toggle Button (Light / Dark) -->
            <button class="sr-icon-btn theme-toggle-btn" id="sr-shell-theme-toggle" aria-label="Toggle dark/light mode" title="Toggle dark/light mode">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            </button>

            <!-- Notifications Bell -->
            <button class="sr-icon-btn" id="sr-shell-bell" aria-label="Notifications" title="Notifications" aria-haspopup="dialog" aria-expanded="false" aria-controls="sr-notif-panel">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span class="sr-badge-counter" id="sr-shell-bell-badge" style="${unreadCount > 0 ? '' : 'display:none;'}">${unreadCount > 99 ? '99+' : unreadCount}</span>
            </button>

            <!-- User Avatar & Profile Trigger -->
            <button class="sr-user-avatar" id="sr-shell-avatar" aria-label="Account profile" title="${escapeHtml(user.name)}">
              ${escapeHtml(user.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
            </button>
          </div>
        </header>

        <!-- Notifications Panel (Desktop Flyout & Mobile Sheet) -->
        <div id="sr-notif-panel-wrap" class="sr-notif-panel-wrap hidden" aria-hidden="true">
          <div id="sr-notif-backdrop" class="sr-notif-backdrop" aria-hidden="true"></div>
          <div id="sr-notif-panel" class="sr-notif-panel" role="dialog" aria-modal="true" aria-label="Notifications" tabindex="-1">
            <div class="sr-sheet-handle-bar"><div class="sr-sheet-handle"></div></div>
            <div class="sr-notif-header">
              <div class="sr-notif-header-title">
                <h3>Notifications</h3>
                <span class="sr-notif-count-badge" id="sr-notif-panel-badge" style="${unreadCount > 0 ? '' : 'display:none;'}">${unreadCount}</span>
              </div>
              <div class="sr-notif-header-actions">
                <button type="button" class="sr-notif-mark-all" id="sr-notif-mark-all-btn" ${unreadCount === 0 ? 'disabled' : ''}>Mark all read</button>
                <button type="button" class="sr-icon-btn" id="sr-notif-close-btn" aria-label="Close notifications panel">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div class="sr-notif-body" id="sr-notif-list" role="region" aria-live="polite">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>

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

    // Theme toggle button
    document.getElementById('sr-shell-theme-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleThemeAction();
    });
    updateThemeUI();

    // Notifications panel triggers
    document.getElementById('sr-shell-bell')?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleNotificationPanel();
    });

    document.getElementById('sr-notif-close-btn')?.addEventListener('click', () => {
      closeNotificationPanel(true);
    });

    document.getElementById('sr-notif-backdrop')?.addEventListener('click', () => {
      closeNotificationPanel(true);
    });

    document.getElementById('sr-notif-mark-all-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('sr-notif-mark-all-btn');
      if (btn) btn.disabled = true;
      try {
        await fetch('/api/notifications/read', { method: 'POST' });
        cachedNotifications.forEach(n => { n.read = true; n.read_at = new Date().toISOString(); });
        updateBellBadge(0);
        renderNotificationItems(cachedNotifications);
      } catch (_) {
        if (btn) btn.disabled = false;
      }
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
    } else if (view === 'me') {
      await renderWorkerMe();
    } else if (view === 'schedule') {
      if (isManager) {
        await renderManagerSchedule();
      } else {
        await renderWorkerSchedule();
      }
    } else if (view === 'settings') {
      await renderOwnerSettings();
    } else if (view === 'notifications') {
      await (isManager ? renderManagerOverview() : renderWorkerToday());
      toggleNotificationPanel(true);
    } else {
      // Bridge smoothly to existing sub-views for Schedule, Settings
      await bridgeExistingView(view);
    }
  }

  async function navigate(viewName) {
    return await mountShell(viewName);
  }

  // ── 2. Polished Worker Today Screen ─────────────────────────────────────────
  async function renderWorkerToday(skipSkeleton = false) {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    if (elapsedInterval) {
      clearInterval(elapsedInterval);
      elapsedInterval = null;
    }

    if (!skipSkeleton) {
      container.innerHTML = `
        <div class="sr-skeleton" style="height: 120px; margin-bottom: 16px;"></div>
        <div class="sr-skeleton" style="height: 180px; margin-bottom: 16px;"></div>
        <div class="sr-skeleton" style="height: 200px;"></div>
      `;
    }

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
      const clockedInTime = activeEntry ? (activeEntry.clocked_in_at || activeEntry.clockedInAt) : null;
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
            <span class="sr-context-banner-company">Company: ${escapeHtml(companyName)}</span>
            <span class="sr-context-banner-site">Assigned Site / Unit: <strong>${escapeHtml(siteName)}</strong></span>
          </div>
          <span class="sr-context-banner-badge">${escapeHtml(user.role.toUpperCase())}</span>
        </div>

        <!-- Primary Shift Status & Clocking Card -->
        <section class="sr-clock-card ${isClockedIn ? 'clocked-in' : ''}" id="sr-clock-card" aria-label="Shift Time Tracking">
          <div class="sr-clock-header">
            <span class="sr-status-pill ${isClockedIn ? 'active' : 'inactive'}" id="sr-today-shift-status">
              ${isClockedIn ? '<span class="sr-pulse-dot"></span> Active on Shift' : 'Off Shift'}
            </span>
            <small style="font-size:12px;color:var(--sr-text-muted);">
              ${isClockedIn && clockedInTime ? `Started ${new Date(clockedInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Standard 8h Rotation'}
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
      if (isClockedIn && clockedInTime) {
        const startTime = new Date(clockedInTime).getTime();
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

      // Bind Clock In / Out button (smooth in-place transition without page reload flash)
      document.getElementById('sr-btn-toggle-clock')?.addEventListener('click', async () => {
        const btn = document.getElementById('sr-btn-toggle-clock');
        if (btn) {
          btn.disabled = true;
          btn.style.opacity = '0.7';
          btn.textContent = isClockedIn ? 'Clocking out...' : 'Clocking in...';
        }
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
          await renderWorkerToday(true); // Smooth update without wiping container with skeletons!
        } catch (err) {
          alert(err.message);
          if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
          }
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
            <span class="sr-context-banner-company">Company: ${escapeHtml(companyName)}</span>
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
            // Clear previous-company notifications immediately during company switching
            clearNotificationState();
            closeNotificationPanel(false);

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
            <span class="sr-context-banner-company">Company: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
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
            <span class="sr-context-banner-company">Company: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
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

  // ── 6a. Worker Schedule Screen ────────────────────────────────────────────
  let scheduleTab = 'shifts'; // 'shifts' | 'leave' | 'attendance'
  let scheduleMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let leaveSubmitting = false;
  let leaveIdempotencyKey = null;

  function formatScheduleDate(isoStr, tz) {
    if (!isoStr) return '\u2014';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', timeZone: tz || 'UTC',
        hour12: false
      }).format(new Date(isoStr));
    } catch (_) {
      return isoStr;
    }
  }

  function formatDateOnly(isoStr, tz) {
    if (!isoStr) return '\u2014';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        timeZone: tz || 'UTC'
      }).format(new Date(isoStr));
    } catch (_) {
      return isoStr;
    }
  }

  function formatDuration(startIso, endIso) {
    if (!startIso || !endIso) return '';
    const diff = (new Date(endIso) - new Date(startIso)) / 3600000;
    if (diff <= 0) return '';
    const h = Math.floor(diff);
    const m = Math.round((diff - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function formatHours(h) {
    if (h === null || h === undefined) return '0h';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  function shiftStatusPill(status) {
    const map = {
      scheduled: { label: 'Scheduled', cls: 'sr-status-pill active' },
      in_progress: { label: 'In Progress', cls: 'sr-status-pill active' },
      claimed: { label: 'Claimed', cls: 'sr-status-pill pending' },
      completed: { label: 'Completed', cls: 'sr-status-pill inactive' }
    };
    const s = map[status] || { label: escapeHtml(status || 'Unknown'), cls: 'sr-status-pill inactive' };
    return `<span class="${s.cls}">${s.label}</span>`;
  }

  function leaveStatusPill(status) {
    const map = {
      pending: { label: 'Pending', cls: 'sr-status-pill pending' },
      approved: { label: 'Approved', cls: 'sr-status-pill active' },
      rejected: { label: 'Rejected', cls: 'sr-status-pill inactive' }
    };
    const s = map[status] || { label: escapeHtml(status || 'Pending'), cls: 'sr-status-pill pending' };
    return `<span class="${s.cls}">${s.label}</span>`;
  }

  function renderShiftsTab(shifts, myId, tz) {
    // Filter to only this worker's assignments — server returns company-wide data
    const mine = shifts.filter(s =>
      s.membership_id === myId || s.membershipId === myId
    );
    if (mine.length === 0) {
      return `
        <div style="text-align:center;padding:48px 24px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <p style="color:var(--sr-text-muted,#64748b);margin:0;font-size:14px;font-weight:600;">No shifts scheduled this month</p>
          <p style="color:var(--sr-text-muted,#64748b);margin:6px 0 0;font-size:12px;">Your company roster updates when your supervisor assigns you a shift.</p>
        </div>`;
    }
    return mine.map(s => {
      const duration = formatDuration(s.starts_at, s.ends_at);
      const start = formatScheduleDate(s.starts_at, tz);
      const end = formatScheduleDate(s.ends_at, tz);
      // Detect overnight: start and end on different calendar days
      const startDay = s.starts_at ? new Date(s.starts_at).toDateString() : '';
      const endDay = s.ends_at ? new Date(s.ends_at).toDateString() : '';
      const overnight = startDay && endDay && startDay !== endDay;
      return `
        <div class="sr-review-item" style="align-items:flex-start;gap:12px;padding:14px 16px;">
          <div style="width:42px;height:42px;border-radius:10px;background:var(--sr-primary,#0d524d);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              ${shiftStatusPill(s.status)}
              ${overnight ? '<span style="font-size:11px;font-weight:600;color:#b45309;background:#fef3c7;padding:2px 7px;border-radius:4px;border:1px solid #fde68a;">Overnight</span>' : ''}
            </div>
            <div style="font-size:13.5px;color:var(--sr-text,#0f172a);font-weight:600;margin-bottom:3px;">${start}</div>
            <div style="font-size:12.5px;color:var(--sr-text-muted,#64748b);">until ${end}${duration ? ` &bull; ${duration}` : ''}</div>
          </div>
        </div>`;
    }).join('');
  }

  function renderLeaveTab(requests, tz) {
    const listHtml = requests.length === 0
      ? `<div style="text-align:center;padding:32px 24px 16px;">
          <p style="color:var(--sr-text-muted,#64748b);margin:0;font-size:14px;">No leave requests on record.</p>
         </div>`
      : requests.map(r => `
        <div class="sr-review-item" style="align-items:flex-start;padding:14px 16px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
              ${leaveStatusPill(r.status)}
              <span style="font-size:12px;color:var(--sr-text-muted,#64748b);">${formatDateOnly(r.starts_on, tz)} &ndash; ${formatDateOnly(r.ends_on, tz)}</span>
            </div>
            ${r.reason ? `<div style="font-size:13px;color:var(--sr-text,#0f172a);">${escapeHtml(r.reason)}</div>` : ''}
          </div>
        </div>`).join('');

    return `
      ${listHtml}
      <div style="padding:16px;border-top:1px solid var(--sr-border,#e2e8f0);margin-top:4px;">
        <div style="font-size:13px;font-weight:700;color:var(--sr-text,#0f172a);margin-bottom:12px;">Request Leave</div>
        <form id="sr-leave-form" novalidate>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--sr-text-muted,#64748b);">
              From
              <input type="date" id="sr-leave-start" name="startsOn" required
                style="padding:9px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;font-size:13px;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);"
              />
            </label>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--sr-text-muted,#64748b);">
              To
              <input type="date" id="sr-leave-end" name="endsOn" required
                style="padding:9px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;font-size:13px;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);"
              />
            </label>
          </div>
          <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--sr-text-muted,#64748b);margin-bottom:10px;">
            Reason (optional)
            <textarea id="sr-leave-reason" name="reason" rows="2" placeholder="e.g. Medical appointment"
              style="padding:9px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;font-size:13px;resize:vertical;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);font-family:inherit;"
            ></textarea>
          </label>
          <div id="sr-leave-error" role="alert" aria-live="polite" style="display:none;font-size:12.5px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;margin-bottom:8px;"></div>
          <button type="submit" id="sr-leave-submit" class="sr-btn sr-btn-primary" style="width:100%;">
            Submit Leave Request
          </button>
        </form>
      </div>`;
  }

  function renderAttendanceTab(summary, tz) {
    const { active, totalHours, weekHours, entries } = summary || {};
    const entryList = Array.isArray(entries) && entries.length > 0
      ? entries.map(e => {
          const clockIn = formatScheduleDate(e.clocked_in_at, tz);
          const clockOut = e.clocked_out_at ? formatScheduleDate(e.clocked_out_at, tz) : null;
          const hrs = e.hours != null ? formatHours(Number(e.hours)) : null;
          return `
            <div class="sr-review-item" style="align-items:flex-start;padding:14px 16px;">
              <div style="width:36px;height:36px;border-radius:8px;background:#f0fdf4;border:1px solid #a7f3d0;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13.5px;color:var(--sr-text,#0f172a);font-weight:600;margin-bottom:2px;">Clocked in: ${clockIn}</div>
                ${clockOut
                  ? `<div style="font-size:12.5px;color:var(--sr-text-muted,#64748b);">Clocked out: ${clockOut}${hrs ? ` &bull; ${hrs}` : ''}</div>`
                  : `<div style="font-size:12.5px;color:#059669;font-weight:600;">Currently clocked in</div>`}
                ${e.note ? `<div style="font-size:12px;color:var(--sr-text-muted,#64748b);margin-top:3px;font-style:italic;">${escapeHtml(e.note)}</div>` : ''}
              </div>
            </div>`;
        }).join('')
      : `<div style="text-align:center;padding:32px 24px;">
          <p style="color:var(--sr-text-muted,#64748b);margin:0;font-size:14px;font-weight:600;">No recorded clock-in/out history this month</p>
          <p style="color:var(--sr-text-muted,#64748b);margin:6px 0 0;font-size:12px;">Attendance records appear here after clocking in from the Today screen.</p>
         </div>`;

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 16px 6px;">
        <div style="background:#f8fafc;border:1px solid var(--sr-border,#e2e8f0);border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--sr-text-muted,#64748b);margin-bottom:4px;">This Week</div>
          <div style="font-size:22px;font-weight:800;color:var(--sr-primary,#0d524d);font-variant-numeric:tabular-nums;">${formatHours(weekHours)}</div>
          <div style="font-size:11px;color:var(--sr-text-muted,#64748b);margin-top:2px;">recorded hours</div>
        </div>
        <div style="background:#f8fafc;border:1px solid var(--sr-border,#e2e8f0);border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--sr-text-muted,#64748b);margin-bottom:4px;">This Month</div>
          <div style="font-size:22px;font-weight:800;color:var(--sr-text,#0f172a);font-variant-numeric:tabular-nums;">${formatHours(totalHours)}</div>
          <div style="font-size:11px;color:var(--sr-text-muted,#64748b);margin-top:2px;">recorded hours</div>
        </div>
      </div>
      <div style="padding:4px 16px 10px;">
        <div style="font-size:11.5px;color:var(--sr-text-muted,#64748b);padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;">
          <strong style="color:#92400e;">Note:</strong> Attendance records reflect actual clock-in/out times, not scheduled shift hours.
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0;">${entryList}</div>`;
  }

  async function renderWorkerSchedule() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;
    if (!user) {
      container.innerHTML = `<div class="sr-card"><p style="color:#b91c1c;">Session expired. Please sign in again.</p></div>`;
      return;
    }

    // Resolve timezone: prefer session-stored value, fall back to browser locale, then UTC
    const tz = user.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const [year, mon] = scheduleMonth.split('-').map(Number);
    const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(year, mon - 1, 1));

    // Render chrome immediately (tabs + month nav); panel shows loading skeleton
    container.innerHTML = `
      <div class="sr-card" style="padding:0;overflow:hidden;">
        <div style="padding:16px 16px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <div>
              <h2 style="margin:0 0 3px;font-size:18px;font-weight:800;color:var(--sr-text,#0f172a);">My Schedule</h2>
              <div style="font-size:12px;color:var(--sr-text-muted,#64748b);">Your assignments from the company roster &bull; Timezone: <strong>${escapeHtml(tz)}</strong></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;" aria-label="Month navigation">
              <button id="sr-sched-prev" aria-label="Previous month" style="padding:6px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;background:var(--sr-bg-surface,#fff);cursor:pointer;font-size:14px;color:var(--sr-text,#0f172a);">&#8249;</button>
              <span style="font-size:13px;font-weight:600;color:var(--sr-text,#0f172a);min-width:110px;text-align:center;">${escapeHtml(monthLabel)}</span>
              <button id="sr-sched-next" aria-label="Next month" style="padding:6px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;background:var(--sr-bg-surface,#fff);cursor:pointer;font-size:14px;color:var(--sr-text,#0f172a);">&#8250;</button>
            </div>
          </div>

          <div role="tablist" style="display:flex;gap:0;border-bottom:2px solid var(--sr-border,#e2e8f0);margin-bottom:0;">
            ${['shifts', 'leave', 'attendance'].map(t => {
              const labels = { shifts: 'My Shifts', leave: 'Leave', attendance: 'Attendance' };
              const isActive = scheduleTab === t;
              return `<button role="tab" aria-selected="${isActive}" id="sr-sched-tab-${t}" data-sched-tab="${t}"
                style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13.5px;font-weight:700;
                color:${isActive ? 'var(--sr-primary,#0d524d)' : 'var(--sr-text-muted,#64748b)'};
                border-bottom:${isActive ? '2px solid var(--sr-primary,#0d524d)' : '2px solid transparent'};
                margin-bottom:-2px;transition:color .15s ease;">${escapeHtml(labels[t])}</button>`;
            }).join('')}
          </div>
        </div>

        <div id="sr-sched-panel" role="tabpanel" aria-live="polite" style="min-height:180px;padding-bottom:8px;">
          <div style="padding:32px;text-align:center;color:var(--sr-text-muted,#64748b);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:sr-spin 1s linear infinite;display:inline-block;margin-bottom:8px;vertical-align:middle;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <p style="margin:4px 0 0;font-size:13px;display:inline;"> Loading...</p>
          </div>
        </div>
      </div>`;

    // Bind month navigation
    document.getElementById('sr-sched-prev')?.addEventListener('click', () => {
      const [y, m] = scheduleMonth.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      scheduleMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      renderWorkerSchedule();
    });
    document.getElementById('sr-sched-next')?.addEventListener('click', () => {
      const [y, m] = scheduleMonth.split('-').map(Number);
      const d = new Date(y, m, 1);
      scheduleMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      renderWorkerSchedule();
    });

    // Bind tab switcher
    document.querySelectorAll('[data-sched-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        scheduleTab = btn.dataset.schedTab;
        renderWorkerSchedule();
      });
    });

    const panel = document.getElementById('sr-sched-panel');
    if (!panel) return;

    try {
      if (scheduleTab === 'shifts') {
        const res = await fetch(`/api/calendar?month=${encodeURIComponent(scheduleMonth)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }
        const data = await res.json();
        const shifts = Array.isArray(data.shifts) ? data.shifts : [];
        // Flag demo-generated shifts so developer can tell they are not real assignments
        const hasDemo = shifts.some(s => s.id?.startsWith('shift-demo'));
        panel.innerHTML = `
          ${hasDemo ? `<div style="padding:8px 16px;background:#fefce8;border-bottom:1px solid #fde68a;font-size:12px;color:#854d0e;">
            <strong>Dev mode:</strong> Showing demo shifts. In production, only supervisor-assigned shifts appear.
          </div>` : ''}
          <div style="display:flex;flex-direction:column;gap:0;">
            ${renderShiftsTab(shifts, user.id, tz)}
          </div>`;

      } else if (scheduleTab === 'leave') {
        const res = await fetch('/api/leave-requests');
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }
        const data = await res.json();
        panel.innerHTML = renderLeaveTab(Array.isArray(data.requests) ? data.requests : [], tz);
        bindLeaveForm(panel);

      } else if (scheduleTab === 'attendance') {
        const res = await fetch(`/api/time-entries?month=${encodeURIComponent(scheduleMonth)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }
        const summary = await res.json();
        panel.innerHTML = renderAttendanceTab(summary, tz);
      }
    } catch (err) {
      const isOffline = !navigator.onLine;
      panel.innerHTML = `
        <div style="padding:20px 16px;text-align:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;">
            ${isOffline
              ? '<path d="m1 1 22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/>'
              : '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'}
          </svg>
          <p style="color:var(--sr-text,#0f172a);font-weight:600;font-size:14px;margin:0 0 4px;">${isOffline ? 'You are offline' : 'Could not load data'}</p>
          <p style="color:var(--sr-text-muted,#64748b);font-size:13px;margin:0 0 16px;">${isOffline ? 'Schedule data will reload when your connection is restored.' : escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.renderWorkerSchedule()">Retry</button>
        </div>`;
    }
  }

  function bindLeaveForm(panel) {
    const form = panel.querySelector('#sr-leave-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (leaveSubmitting) return; // duplicate-submission protection

      const startVal = form.querySelector('#sr-leave-start')?.value?.trim();
      const endVal = form.querySelector('#sr-leave-end')?.value?.trim();
      const reason = form.querySelector('#sr-leave-reason')?.value?.trim() || '';
      const errBox = form.querySelector('#sr-leave-error');
      const submitBtn = form.querySelector('#sr-leave-submit');

      const showErr = (msg) => { if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; } };
      const clearErr = () => { if (errBox) errBox.style.display = 'none'; };
      clearErr();

      if (!startVal) { showErr('Please select a start date.'); return; }
      if (!endVal) { showErr('Please select an end date.'); return; }
      if (new Date(endVal) < new Date(startVal)) { showErr('End date must be on or after the start date.'); return; }

      // Generate idempotency key once per unique submission; stable on retry
      if (!leaveIdempotencyKey) {
        leaveIdempotencyKey = `leave-${startVal}-${endVal}-${Date.now()}`;
      }

      leaveSubmitting = true;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

      try {
        const res = await fetch('/api/leave-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': leaveIdempotencyKey
          },
          body: JSON.stringify({ startsOn: startVal, endsOn: endVal, reason: reason || undefined })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Server error ${res.status}`);
        }
        // On success, reset state and reload leave tab to show the new request
        leaveIdempotencyKey = null;
        leaveSubmitting = false;
        scheduleTab = 'leave';
        await renderWorkerSchedule();
      } catch (err) {
        leaveSubmitting = false;
        leaveIdempotencyKey = null; // allow fresh retry
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Leave Request'; }
        showErr(err.message || 'Could not submit leave request. Please try again.');
      }
    });
  }

  // ── 6b. Manager Schedule Screen ───────────────────────────────────────────
  let managerScheduleMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let managerStaffFilter = 'all';
  let managerScheduleTab = 'shifts'; // 'shifts' | 'leave'
  let assignShiftSubmitting = false;
  let assignShiftIdempotencyKey = null;

  async function renderManagerSchedule() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;
    if (!user) {
      container.innerHTML = `<div class="sr-card"><p style="color:#b91c1c;">Session expired. Please sign in again.</p></div>`;
      return;
    }

    const isOwner = user.role === 'owner';
    const tz = user.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const [year, mon] = managerScheduleMonth.split('-').map(Number);
    const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(year, mon - 1, 1));

    // Render chrome immediately with loading skeleton
    container.innerHTML = `
      <div class="sr-card" style="padding:0;overflow:hidden;">
        <div style="padding:16px 16px 0;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">
                <h2 style="margin:0;font-size:18px;font-weight:800;color:var(--sr-text,#0f172a);">Team Schedule</h2>
                ${isOwner
                  ? '<span class="sr-status-pill active" style="font-size:11px;">Owner Scheduling Active</span>'
                  : '<span class="sr-status-pill pending" style="font-size:11px;background:#f1f5f9;color:#475569;border-color:#cbd5e1;">Read-Only &bull; Owner scheduling required</span>'}
              </div>
              <div style="font-size:12px;color:var(--sr-text-muted,#64748b);">Company-wide duty roster and leave &bull; Timezone: <strong>${escapeHtml(tz)}</strong></div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              ${isOwner ? `
                <button id="sr-btn-open-assign-modal" class="sr-btn sr-btn-primary" style="padding:7px 14px;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Assign Shift</span>
                </button>
              ` : ''}

              <div style="display:flex;align-items:center;gap:4px;" aria-label="Month navigation">
                <button id="sr-mgr-sched-prev" aria-label="Previous month" style="padding:6px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;background:var(--sr-bg-surface,#fff);cursor:pointer;font-size:14px;color:var(--sr-text,#0f172a);">&#8249;</button>
                <span style="font-size:13px;font-weight:600;color:var(--sr-text,#0f172a);min-width:110px;text-align:center;">${escapeHtml(monthLabel)}</span>
                <button id="sr-mgr-sched-next" aria-label="Next month" style="padding:6px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;background:var(--sr-bg-surface,#fff);cursor:pointer;font-size:14px;color:var(--sr-text,#0f172a);">&#8250;</button>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--sr-border,#e2e8f0);flex-wrap:wrap;gap:8px;">
            <div role="tablist" style="display:flex;gap:0;">
              <button role="tab" aria-selected="${managerScheduleTab === 'shifts'}" id="sr-mgr-tab-shifts" data-mgr-sched-tab="shifts"
                style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13.5px;font-weight:700;
                color:${managerScheduleTab === 'shifts' ? 'var(--sr-primary,#0d524d)' : 'var(--sr-text-muted,#64748b)'};
                border-bottom:${managerScheduleTab === 'shifts' ? '2px solid var(--sr-primary,#0d524d)' : '2px solid transparent'};
                margin-bottom:-2px;transition:color .15s ease;">Assigned Shifts</button>
              <button role="tab" aria-selected="${managerScheduleTab === 'leave'}" id="sr-mgr-tab-leave" data-mgr-sched-tab="leave"
                style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:13.5px;font-weight:700;
                color:${managerScheduleTab === 'leave' ? 'var(--sr-primary,#0d524d)' : 'var(--sr-text-muted,#64748b)'};
                border-bottom:${managerScheduleTab === 'leave' ? '2px solid var(--sr-primary,#0d524d)' : '2px solid transparent'};
                margin-bottom:-2px;transition:color .15s ease;">Company Leave</button>
            </div>

            <div style="padding-bottom:6px;display:flex;align-items:center;gap:6px;">
              <label for="sr-mgr-staff-filter" style="font-size:12px;font-weight:600;color:var(--sr-text-muted,#64748b);">Staff:</label>
              <select id="sr-mgr-staff-filter" style="padding:5px 8px;font-size:12.5px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);">
                <option value="all">All Staff</option>
              </select>
            </div>
          </div>
        </div>

        <div id="sr-mgr-sched-panel" role="tabpanel" aria-live="polite" style="min-height:200px;padding-bottom:12px;">
          <div style="padding:36px;text-align:center;color:var(--sr-text-muted,#64748b);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:sr-spin 1s linear infinite;display:inline-block;vertical-align:middle;margin-bottom:8px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <p style="margin:4px 0 0;font-size:13px;display:inline;"> Loading team roster...</p>
          </div>
        </div>
      </div>
      <div id="sr-assign-shift-modal-container"></div>
    `;

    // Month Navigation listeners
    document.getElementById('sr-mgr-sched-prev')?.addEventListener('click', () => {
      const [y, m] = managerScheduleMonth.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      managerScheduleMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      renderManagerSchedule();
    });
    document.getElementById('sr-mgr-sched-next')?.addEventListener('click', () => {
      const [y, m] = managerScheduleMonth.split('-').map(Number);
      const d = new Date(y, m, 1);
      managerScheduleMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      renderManagerSchedule();
    });

    // Tab buttons
    document.querySelectorAll('[data-mgr-sched-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        managerScheduleTab = btn.dataset.mgrSchedTab;
        renderManagerSchedule();
      });
    });

    // Open Assign Shift Modal (Owner only)
    if (isOwner) {
      document.getElementById('sr-btn-open-assign-modal')?.addEventListener('click', () => {
        openAssignShiftModal(tz);
      });
    }

    const panel = document.getElementById('sr-mgr-sched-panel');
    if (!panel) return;

    try {
      // Parallel fetch of calendar and company directory
      const [calRes, dirRes] = await Promise.all([
        fetch(`/api/calendar?month=${encodeURIComponent(managerScheduleMonth)}`),
        fetch('/api/directory')
      ]);

      if (!calRes.ok) {
        const err = await calRes.json().catch(() => ({}));
        throw new Error(err.error || `Calendar error (${calRes.status})`);
      }

      const calData = await calRes.json();
      const dirData = dirRes.ok ? await dirRes.json().catch(() => ({ members: [] })) : { members: [] };
      const directoryMembers = Array.isArray(dirData.members) ? dirData.members : [];

      // Populate staff filter dropdown
      const staffFilterSelect = document.getElementById('sr-mgr-staff-filter');
      if (staffFilterSelect) {
        const optionsHtml = [
          `<option value="all"${managerStaffFilter === 'all' ? ' selected' : ''}>All Staff (${directoryMembers.length})</option>`,
          ...directoryMembers.map(m =>
            `<option value="${escapeHtml(m.id)}"${managerStaffFilter === m.id ? ' selected' : ''}>${escapeHtml(m.name || m.full_name || 'Worker')} (${escapeHtml(m.title || m.role || 'Staff')})</option>`
          )
        ].join('');
        staffFilterSelect.innerHTML = optionsHtml;
        staffFilterSelect.addEventListener('change', (e) => {
          managerStaffFilter = e.target.value;
          renderManagerSchedule();
        });
      }

      const allShifts = Array.isArray(calData.shifts) ? calData.shifts : [];
      const allLeave = Array.isArray(calData.leave) ? calData.leave : [];

      if (managerScheduleTab === 'shifts') {
        const filteredShifts = managerStaffFilter === 'all'
          ? allShifts
          : allShifts.filter(s => s.membership_id === managerStaffFilter || s.membershipId === managerStaffFilter);

        if (filteredShifts.length === 0) {
          panel.innerHTML = `
            <div style="text-align:center;padding:48px 24px;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <p style="color:var(--sr-text,#0f172a);margin:0;font-size:14px;font-weight:600;">No shifts scheduled</p>
              <p style="color:var(--sr-text-muted,#64748b);margin:6px 0 0;font-size:12.5px;">${managerStaffFilter === 'all' ? 'No company shifts found for ' + escapeHtml(monthLabel) + '.' : 'No shifts assigned to the selected staff member in ' + escapeHtml(monthLabel) + '.'}</p>
              ${isOwner ? '<button class="sr-btn sr-btn-primary" style="margin-top:16px;" onclick="document.getElementById(\'sr-btn-open-assign-modal\')?.click()">+ Assign First Shift</button>' : ''}
            </div>
          `;
        } else {
          panel.innerHTML = `
            <div style="padding:10px 16px 4px;font-size:12px;color:var(--sr-text-muted,#64748b);display:flex;justify-content:space-between;align-items:center;">
              <span>Showing <strong>${filteredShifts.length}</strong> assigned shift${filteredShifts.length === 1 ? '' : 's'}</span>
              <span>All times in <strong>${escapeHtml(tz)}</strong></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:0;">
              ${filteredShifts.map(s => {
                const duration = formatDuration(s.starts_at, s.ends_at);
                const start = formatScheduleDate(s.starts_at, tz);
                const end = formatScheduleDate(s.ends_at, tz);
                const startDay = s.starts_at ? new Date(s.starts_at).toDateString() : '';
                const endDay = s.ends_at ? new Date(s.ends_at).toDateString() : '';
                const overnight = startDay && endDay && startDay !== endDay;
                const workerName = s.worker_name || 'Assigned Staff';

                return `
                  <div class="sr-review-item" style="align-items:flex-start;gap:12px;padding:14px 16px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:var(--sr-primary,#0d524d);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;">
                      ${escapeHtml(workerName.slice(0, 2).toUpperCase())}
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;flex-wrap:wrap;">
                        <span style="font-size:14px;font-weight:700;color:var(--sr-text,#0f172a);">${escapeHtml(workerName)}</span>
                        <div style="display:flex;align-items:center;gap:6px;">
                          ${shiftStatusPill(s.status)}
                          ${overnight ? '<span style="font-size:11px;font-weight:600;color:#b45309;background:#fef3c7;padding:2px 7px;border-radius:4px;border:1px solid #fde68a;">Overnight</span>' : ''}
                        </div>
                      </div>
                      <div style="font-size:13px;color:var(--sr-text,#0f172a);font-weight:600;">${start} &ndash; ${end}</div>
                      ${duration ? `<div style="font-size:12px;color:var(--sr-text-muted,#64748b);margin-top:2px;">Scheduled duration: ${duration}</div>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
      } else if (managerScheduleTab === 'leave') {
        const filteredLeave = managerStaffFilter === 'all'
          ? allLeave
          : allLeave.filter(l => l.membership_id === managerStaffFilter || l.membershipId === managerStaffFilter);

        if (filteredLeave.length === 0) {
          panel.innerHTML = `
            <div style="text-align:center;padding:48px 24px;">
              <p style="color:var(--sr-text-muted,#64748b);margin:0;font-size:14px;">No company leave requests recorded for ${escapeHtml(monthLabel)}.</p>
            </div>
          `;
        } else {
          panel.innerHTML = `
            <div style="padding:10px 16px 4px;font-size:12px;color:var(--sr-text-muted,#64748b);">
              Showing <strong>${filteredLeave.length}</strong> leave request${filteredLeave.length === 1 ? '' : 's'}
            </div>
            <div style="display:flex;flex-direction:column;gap:0;">
              ${filteredLeave.map(l => `
                <div class="sr-review-item" style="align-items:flex-start;padding:14px 16px;">
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;flex-wrap:wrap;">
                      <span style="font-size:14px;font-weight:700;color:var(--sr-text,#0f172a);">${escapeHtml(l.worker_name || 'Staff Member')}</span>
                      ${leaveStatusPill(l.status)}
                    </div>
                    <div style="font-size:12.5px;color:var(--sr-text-muted,#64748b);margin-bottom:2px;">
                      ${formatDateOnly(l.starts_on, tz)} &ndash; ${formatDateOnly(l.ends_on, tz)}
                    </div>
                    ${l.reason ? `<div style="font-size:13px;color:var(--sr-text,#0f172a);">${escapeHtml(l.reason)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    } catch (err) {
      const isOffline = !navigator.onLine;
      panel.innerHTML = `
        <div style="padding:28px 16px;text-align:center;">
          <p style="color:var(--sr-text,#0f172a);font-weight:600;font-size:14px;margin:0 0 4px;">${isOffline ? 'You are offline' : 'Could not load team schedule'}</p>
          <p style="color:var(--sr-text-muted,#64748b);font-size:13px;margin:0 0 16px;">${isOffline ? 'Roster will reload when connection is restored.' : escapeHtml(err.message)}</p>
          <button class="sr-btn sr-btn-secondary" onclick="window.Phase1Shell.renderManagerSchedule()">Retry</button>
        </div>
      `;
    }
  }

  // Owner Assign Shift Modal Controller
  async function openAssignShiftModal(tz) {
    const modalContainer = document.getElementById('sr-assign-shift-modal-container');
    if (!modalContainer) return;

    let directory = [];
    try {
      const res = await fetch('/api/directory');
      if (res.ok) {
        const data = await res.json();
        directory = Array.isArray(data.members) ? data.members : [];
      }
    } catch (_) {}

    // Default shift: tomorrow 08:00 to 16:00 in local inputs
    const tomorrow = new Date(Date.now() + 86400000);
    const startStr = `${tomorrow.toISOString().slice(0, 10)}T08:00`;
    const endStr = `${tomorrow.toISOString().slice(0, 10)}T16:00`;

    modalContainer.innerHTML = `
      <div class="sr-modal-backdrop" id="sr-assign-shift-backdrop" role="dialog" aria-modal="true" aria-labelledby="sr-assign-shift-title">
        <div class="sr-modal-card" style="padding:22px;max-width:440px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 id="sr-assign-shift-title" style="margin:0;font-size:17px;font-weight:800;color:var(--sr-text,#0f172a);">Assign Shift</h3>
            <button id="sr-btn-close-assign-modal" aria-label="Close" style="background:transparent;border:none;cursor:pointer;color:var(--sr-text-muted,#64748b);font-size:20px;line-height:1;">&times;</button>
          </div>

          <form id="sr-assign-shift-form" novalidate>
            <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--sr-text,#0f172a);margin-bottom:12px;">
              Worker (Active Company Staff)
              <select id="sr-assign-worker-id" name="membershipId" required style="padding:9px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;font-size:13px;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);">
                <option value="">Select a worker...</option>
                ${directory.map(m => `
                  <option value="${escapeHtml(m.id)}">${escapeHtml(m.name || m.full_name || 'Staff')} &ndash; ${escapeHtml(m.title || m.role || 'Worker')}</option>
                `).join('')}
              </select>
            </label>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
              <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--sr-text,#0f172a);">
                Starts At
                <input type="datetime-local" id="sr-assign-starts-at" name="startsAt" value="${startStr}" required
                  style="padding:9px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;font-size:12.5px;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);"
                />
              </label>

              <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--sr-text,#0f172a);">
                Ends At
                <input type="datetime-local" id="sr-assign-ends-at" name="endsAt" value="${endStr}" required
                  style="padding:9px 10px;border:1.5px solid var(--sr-border,#e2e8f0);border-radius:8px;font-size:12.5px;background:var(--sr-bg-surface,#fff);color:var(--sr-text,#0f172a);"
                />
              </label>
            </div>

            <div style="font-size:11.5px;color:var(--sr-text-muted,#64748b);margin-bottom:14px;">
              Timezone: <strong>${escapeHtml(tz)}</strong>. Shifts spanning midnight will automatically be flagged as Overnight.
            </div>

            <div id="sr-assign-error" role="alert" aria-live="polite" style="display:none;font-size:12.5px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:8px 10px;margin-bottom:12px;"></div>

            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button type="button" id="sr-btn-cancel-assign" class="sr-btn sr-btn-secondary" style="flex:1;">Cancel</button>
              <button type="submit" id="sr-btn-submit-assign" class="sr-btn sr-btn-primary" style="flex:2;">Confirm Shift</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => {
      modalContainer.innerHTML = '';
      assignShiftIdempotencyKey = null;
    };

    document.getElementById('sr-btn-close-assign-modal')?.addEventListener('click', closeModal);
    document.getElementById('sr-btn-cancel-assign')?.addEventListener('click', closeModal);
    document.getElementById('sr-assign-shift-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'sr-assign-shift-backdrop') closeModal();
    });

    const form = document.getElementById('sr-assign-shift-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (assignShiftSubmitting) return; // Prevent duplicate clicks

      const workerId = form.querySelector('#sr-assign-worker-id')?.value;
      const startsAtVal = form.querySelector('#sr-assign-starts-at')?.value;
      const endsAtVal = form.querySelector('#sr-assign-ends-at')?.value;
      const errBox = document.getElementById('sr-assign-error');
      const submitBtn = document.getElementById('sr-btn-submit-assign');

      const showErr = (msg) => { if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; } };
      const clearErr = () => { if (errBox) errBox.style.display = 'none'; };
      clearErr();

      if (!workerId) { showErr('Please choose an active worker to assign.'); return; }
      if (!startsAtVal) { showErr('Please specify shift start time.'); return; }
      if (!endsAtVal) { showErr('Please specify shift end time.'); return; }

      const startDate = new Date(startsAtVal);
      const endDate = new Date(endsAtVal);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        showErr('Invalid date or time provided.');
        return;
      }
      if (endDate <= startDate) {
        showErr('Shift end time must be strictly after shift start time.');
        return;
      }

      // Convert to UTC ISO string
      const startsAtIso = startDate.toISOString();
      const endsAtIso = endDate.toISOString();

      if (!assignShiftIdempotencyKey) {
        assignShiftIdempotencyKey = `create-shift-${workerId}-${startsAtIso}-${endsAtIso}-${Date.now()}`;
      }

      assignShiftSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Assigning...';
      }

      try {
        const res = await fetch('/api/calendar/shifts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': assignShiftIdempotencyKey
          },
          body: JSON.stringify({
            membershipId: workerId,
            startsAt: startsAtIso,
            endsAt: endsAtIso
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Server error ${res.status}`);
        }

        // Successfully created: close modal and refresh team schedule
        closeModal();
        assignShiftSubmitting = false;
        await renderManagerSchedule();
      } catch (err) {
        assignShiftSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Shift';
        }
        showErr(err.message || 'Could not assign shift. Please try again.');
      }
    });
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
      await renderWorkerMe();
    } else if (viewName === 'settings') {
      await renderOwnerSettings();
    } else if (viewName === 'approvals') {
      await renderApprovalsScreen();
    } else if (viewName === 'team') {
      await renderTeamScreen();
    } else if (viewName === 'notifications') {
      toggleNotificationPanel(true);
    }
  }

  // ── 7. Polished Team Directory Screen (UI Phase 3) ────────────────────────
  let teamSearchQuery = '';

  function openRevokeModal(memberId, memberName, memberTitle, onCompleted) {
    const existingModal = document.getElementById('sr-revoke-modal-wrap');
    if (existingModal) existingModal.remove();

    const modalRoot = document.createElement('div');
    modalRoot.id = 'sr-revoke-modal-wrap';
    modalRoot.innerHTML = `
      <div class="sr-modal-backdrop" id="sr-revoke-backdrop">
        <div class="sr-modal" role="dialog" aria-modal="true" aria-labelledby="sr-revoke-modal-title">
          <div class="sr-modal-header">
            <h2 id="sr-revoke-modal-title" style="color: var(--p-red); display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              Revoke Worker Access
            </h2>
            <button type="button" class="sr-icon-btn" id="sr-revoke-modal-close" aria-label="Close dialog">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="sr-modal-body">
            <p style="margin: 0 0 12px; font-size: 14px; color: var(--p-text); line-height: 1.5;">
              Are you sure you want to deactivate and revoke ShiftRelay access for <strong>${escapeHtml(memberName)}</strong> (${escapeHtml(memberTitle)})?
            </p>
            <div style="background: var(--p-red-bg); border: 1px solid var(--p-red-border); border-radius: var(--p-radius-md); padding: 12px 14px; font-size: 12.5px; color: var(--p-text); line-height: 1.5;">
              <strong style="color: var(--p-red);">Operational Security Safeguards:</strong>
              <ul style="margin: 6px 0 0; padding-left: 18px;">
                <li>Terminates all active login sessions immediately.</li>
                <li>Automatically clocks out any active shift currently in progress.</li>
                <li>Cuts active live alert streams to prevent internal data leakage.</li>
                <li>Preserves historical handovers, checklist items, and timesheets for compliance audits.</li>
              </ul>
            </div>
            <div id="sr-revoke-modal-error" style="display:none; color: var(--p-red); font-size: 12.5px; margin-top: 10px;" role="alert"></div>
          </div>
          <div class="sr-modal-footer">
            <button type="button" class="sr-btn sr-btn-secondary" id="sr-revoke-modal-cancel">Cancel</button>
            <button type="button" class="sr-btn sr-btn-danger" id="sr-revoke-modal-confirm">Confirm Deactivation</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalRoot);

    const closeModal = () => modalRoot.remove();
    document.getElementById('sr-revoke-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'sr-revoke-backdrop') closeModal();
    });
    document.getElementById('sr-revoke-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('sr-revoke-modal-cancel')?.addEventListener('click', closeModal);

    const confirmBtn = document.getElementById('sr-revoke-modal-confirm');
    const errBox = document.getElementById('sr-revoke-modal-error');

    confirmBtn?.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Revoking...';
      if (errBox) errBox.style.display = 'none';

      try {
        const res = await fetch(`/api/memberships/${memberId}/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'idem_revoke_' + memberId + '_' + Date.now()
          }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to revoke worker membership');
        }

        closeModal();
        if (typeof window.toast === 'function') {
          window.toast(`Access revoked for ${memberName}`);
        }
        if (typeof onCompleted === 'function') onCompleted();
      } catch (err) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Deactivation';
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
      }
    });
  }

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
      const isOwner = user.role === 'owner';
      const isManager = isManagerRole(user.role);

      const [dirRes, pendingRes] = await Promise.all([
        fetch('/api/directory'),
        isManager ? fetch('/api/memberships/pending').catch(() => null) : Promise.resolve(null)
      ]);

      if (!dirRes.ok) {
        const err = await dirRes.json().catch(() => ({}));
        throw new Error(err.error || 'Could not load team directory');
      }
      const data = await dirRes.json();
      const allMembers = data.members || [];

      let pendingRequests = [];
      if (pendingRes && pendingRes.ok) {
        const pData = await pendingRes.json();
        pendingRequests = pData.requests || [];
      }

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

          const isRevoked = m.status === 'revoked';
          const statusClass = (m.status || 'active').toLowerCase();
          const statusText = m.status === 'pending_approval' ? 'Pending Approval' : (isRevoked ? 'Revoked' : (m.status || 'Active'));

          const shiftTime = (m.shift_start && m.shift_end)
            ? `${m.shift_start} – ${m.shift_end}`
            : 'Standard Shift';

          return `
            <article class="sr-team-card ${isRevoked ? 'sr-team-card-revoked' : ''}" data-member-id="${m.id}" style="${isRevoked ? 'opacity: 0.7; filter: grayscale(0.5);' : ''}">
              <div class="sr-team-card-header">
                <div class="sr-team-avatar" aria-hidden="true" style="${isRevoked ? 'background: #64748b;' : ''}">${escapeHtml(initials)}</div>
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

              ${isOwner ? `
                <div class="sr-team-card-footer" style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--p-border); display: flex; justify-content: space-between; align-items: center;">
                  ${m.id === user.id ? `
                    <span style="font-size: 11.5px; color: var(--p-teal); font-weight: 600;">Active Account (You)</span>
                    <span class="sr-badge sr-badge-info" style="font-size: 11px;">Sole Primary Owner</span>
                  ` : isRevoked ? `
                    <span style="font-size: 11.5px; color: var(--p-text-3);">Access Revoked</span>
                    <span class="sr-badge sr-badge-neutral" style="font-size: 11px;">Deactivated</span>
                  ` : `
                    <span style="font-size: 11.5px; color: var(--p-text-3);">Frontline Access</span>
                    <button type="button" class="sr-btn sr-btn-danger sr-btn-revoke-member" data-id="${m.id}" data-name="${escapeHtml(m.name)}" data-title="${escapeHtml(m.title || roleLabel)}" style="min-height: 28px; padding: 0 10px; font-size: 11.5px; background: transparent; color: var(--p-red); border: 1px solid var(--p-red-border);">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      Revoke Access
                    </button>
                  `}
                </div>
              ` : ''}
            </article>
          `;
        }).join('');

        // Bind revoke buttons
        listContainer.querySelectorAll('.sr-btn-revoke-member').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const memberId = btn.dataset.id;
            const memberName = btn.dataset.name;
            const memberTitle = btn.dataset.title;
            openRevokeModal(memberId, memberName, memberTitle, () => renderTeamScreen());
          });
        });
      }

      container.innerHTML = `
        <div class="sr-context-banner">
          <div class="sr-context-banner-text">
            <span class="sr-context-banner-company">Company: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
            <span class="sr-context-banner-site">Team Directory: <strong>${escapeHtml(user.department || 'Operations')}</strong></span>
          </div>
          <span class="sr-context-banner-badge">${allMembers.length} Members</span>
        </div>

        ${pendingRequests.length > 0 ? `
          <section class="sr-card" style="border-left: 4px solid var(--p-amber); margin-bottom: 20px;" aria-label="Pending Worker Access Requests">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="sr-badge sr-badge-warning" style="font-weight: 700;">${pendingRequests.length} Pending Approval</span>
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--sr-text-main);">Worker Join Requests</h3>
              </div>
              <span style="font-size: 12px; color: var(--sr-text-muted);">Awaiting company onboarding review</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${pendingRequests.map(req => `
                <div class="sr-pending-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--p-surface-alt); border-radius: var(--p-radius-md); border: 1px solid var(--p-border); flex-wrap: wrap; gap: 10px;">
                  <div>
                    <div style="font-weight: 600; color: var(--p-text); font-size: 13.5px;">${escapeHtml(req.name)} <span style="font-weight: normal; font-size: 12px; color: var(--p-text-3);">&lt;${escapeHtml(req.email)}&gt;</span></div>
                    <div style="font-size: 12px; color: var(--p-text-2); margin-top: 2px;">Applied as <strong>${escapeHtml(req.title || 'Shift Specialist')}</strong> · Unit: ${escapeHtml(req.department || 'Operations')}</div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="sr-btn sr-btn-primary sr-btn-approve-request" data-id="${req.id}" data-name="${escapeHtml(req.name)}" style="min-height: 32px; padding: 0 14px; font-size: 12px;">
                      Approve Worker
                    </button>
                    <button type="button" class="sr-btn sr-btn-danger sr-btn-decline-request" data-id="${req.id}" data-name="${escapeHtml(req.name)}" style="min-height: 32px; padding: 0 12px; font-size: 12px; background: transparent; color: var(--p-red); border: 1px solid var(--p-red-border);">
                      Decline
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        ` : ''}

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

      // Bind search input
      const searchInput = document.getElementById('sr-team-search');
      searchInput?.addEventListener('input', (e) => {
        teamSearchQuery = e.target.value;
        filterAndRender(teamSearchQuery);
      });

      // Bind pending requests actions
      container.querySelectorAll('.sr-btn-approve-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const reqId = btn.dataset.id;
          const reqName = btn.dataset.name;
          btn.disabled = true;
          btn.textContent = 'Approving...';
          try {
            const res = await fetch(`/api/memberships/${reqId}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'idem_appr_' + reqId + '_' + Date.now()
              },
              body: JSON.stringify({ decision: 'approve', role: 'worker' })
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Failed to approve request');
            if (typeof window.toast === 'function') {
              window.toast(`Approved ${reqName} for frontline duty`);
            }
            await renderTeamScreen();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = 'Approve Worker';
          }
        });
      });

      container.querySelectorAll('.sr-btn-decline-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const reqId = btn.dataset.id;
          const reqName = btn.dataset.name;
          if (!confirm(`Decline access request from ${reqName}?`)) return;
          btn.disabled = true;
          btn.textContent = 'Declining...';
          try {
            const res = await fetch(`/api/memberships/${reqId}/review`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'idem_decl_' + reqId + '_' + Date.now()
              },
              body: JSON.stringify({ decision: 'reject' })
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Failed to decline request');
            if (typeof window.toast === 'function') {
              window.toast(`Declined request from ${reqName}`);
            }
            await renderTeamScreen();
          } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = 'Decline';
          }
        });
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
            <span class="sr-context-banner-company">Company: ${escapeHtml(user.organisation_name || 'Apex Healthcare')}</span>
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

  // ── 9. Polished Worker Me (Profile) Screen (UI Phase 4) ───────────────────
  async function renderWorkerMe() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container || !user) return;

    const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const isDark = currentTheme === 'dark';
    const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'U';
    const roleDisplay = user.title || user.role || 'Frontline Specialist';
    const orgName = user.organisation_name || 'Workplace';
    const deptName = user.department || 'Operations';

    container.innerHTML = `
      <div class="sr-me-container">
        <!-- Profile Hero Card -->
        <div class="sr-me-hero-card">
          <div class="sr-me-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
          <div class="sr-me-hero-info">
            <h2 class="sr-me-hero-name">${escapeHtml(user.name)}</h2>
            <div class="sr-me-hero-meta">
              <span class="sr-me-role-badge">${escapeHtml(roleDisplay)}</span>
              <span class="sr-status-pill active">Active Member</span>
            </div>
            <p class="sr-me-hero-sub">${escapeHtml(user.email)} · ${escapeHtml(orgName)} (${escapeHtml(deptName)})</p>
          </div>
        </div>

        <div class="sr-me-grid">
          <!-- Membership & Facility Details -->
          <div class="sr-me-card">
            <div class="sr-me-card-header">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                Workplace Membership
              </h4>
            </div>
            <div class="sr-me-info-list">
              <div class="sr-me-info-row">
                <span class="sr-me-info-label">Facility / Organisation</span>
                <span class="sr-me-info-val">${escapeHtml(orgName)}</span>
              </div>
              <div class="sr-me-info-row">
                <span class="sr-me-info-label">Assigned Unit</span>
                <span class="sr-me-info-val">${escapeHtml(deptName)}</span>
              </div>
              <div class="sr-me-info-row">
                <span class="sr-me-info-label">System Role</span>
                <span class="sr-me-info-val" style="text-transform:capitalize;">${escapeHtml(user.role)}</span>
              </div>
              <div class="sr-me-info-row">
                <span class="sr-me-info-label">Account Email</span>
                <span class="sr-me-info-val">${escapeHtml(user.email)}</span>
              </div>
              <div class="sr-me-info-row">
                <span class="sr-me-info-label">Membership Status</span>
                <span class="sr-me-info-val" style="color:var(--sr-primary);">Active</span>
              </div>
            </div>
          </div>

          <!-- Preferences & Session Actions -->
          <div class="sr-me-card">
            <div class="sr-me-card-header">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                Preferences
              </h4>
            </div>
            <div class="sr-me-toggle-row">
              <div>
                <strong style="font-size:13.5px;color:var(--sr-text-main);">Dark Mode Theme</strong>
                <p class="sr-me-toggle-desc" id="sr-theme-status-desc">${isDark ? 'Dark theme is active' : 'Light theme is active'}</p>
              </div>
              <label class="sr-switch" for="sr-theme-switch">
                <input type="checkbox" id="sr-theme-switch" ${isDark ? 'checked' : ''} aria-label="Toggle dark mode theme" />
                <span class="sr-slider"></span>
              </label>
            </div>
            <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--sr-border-subtle);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="font-size:13px;color:var(--sr-text-main);">Account Session</strong>
                <p style="margin:2px 0 0;font-size:11.5px;color:var(--sr-text-muted);">Shared-device safe sign-out</p>
              </div>
              <button type="button" class="sr-btn sr-btn-danger" id="sr-btn-me-signout" style="min-height:36px;padding:0 14px;font-size:12.5px;">
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <!-- Password Change Section (Verified PUT /api/auth/password) -->
        <div class="sr-me-card">
          <div class="sr-me-card-header">
            <h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Security &amp; Password
            </h4>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:var(--sr-text-muted);">
            Update your account login password. Passwords must be at least 10 characters in length.
          </p>

          <form id="sr-me-password-form" class="sr-me-form" autocomplete="off">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
              <div class="sr-form-group">
                <label for="sr-me-current-pw" class="sr-form-label">Current Password</label>
                <input type="password" id="sr-me-current-pw" class="sr-form-input" required placeholder="Enter current password" autocomplete="current-password" />
              </div>
              <div class="sr-form-group">
                <label for="sr-me-new-pw" class="sr-form-label">New Password</label>
                <input type="password" id="sr-me-new-pw" class="sr-form-input" minlength="10" required placeholder="Min. 10 characters" autocomplete="new-password" />
              </div>
              <div class="sr-form-group">
                <label for="sr-me-confirm-pw" class="sr-form-label">Confirm New Password</label>
                <input type="password" id="sr-me-confirm-pw" class="sr-form-input" minlength="10" required placeholder="Re-type new password" autocomplete="new-password" />
              </div>
            </div>
            <div class="sr-form-feedback" id="sr-pw-feedback" role="alert"></div>
            <div style="display:flex;justify-content:flex-end;margin-top:14px;">
              <button type="submit" class="sr-btn sr-btn-primary" id="sr-btn-pw-submit" style="min-height:38px;padding:0 18px;font-size:13px;">
                Update Password
              </button>
            </div>
          </form>
        </div>

        <!-- Frontline Assistance & Guidance -->
        <div class="sr-me-card">
          <div class="sr-me-card-header">
            <h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Frontline Help &amp; Guidance
            </h4>
          </div>
          <div class="sr-accordion">
            <div class="sr-accordion-item">
              <button type="button" class="sr-accordion-header" aria-expanded="false">
                <span>Offline Mode &amp; Local Queuing</span>
                <svg class="sr-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="sr-accordion-body">
                ShiftRelay is built for unreliable connectivity. Clock-ins, handovers, and checklist items are safely saved locally when disconnected. When back online, tap the connection pill in the header or perform a sync before logging out.
              </div>
            </div>
            <div class="sr-accordion-item">
              <button type="button" class="sr-accordion-header" aria-expanded="false">
                <span>Shift Handover Protocol</span>
                <svg class="sr-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="sr-accordion-body">
                End each shift by filling out the handover brief under the Handovers tab. Complete all critical safety checklist items and verify equipment condition before marking the handover as submitted.
              </div>
            </div>
            <div class="sr-accordion-item">
              <button type="button" class="sr-accordion-header" aria-expanded="false">
                <span>Urgent Facility Escalation</span>
                <svg class="sr-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="sr-accordion-body">
                For immediate clinical or operational safety emergencies, contact your on-duty supervisor or unit coordinator directly. Never rely solely on digital notes for critical life-safety hazards.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Theme Switch
    const themeSwitch = document.getElementById('sr-theme-switch');
    themeSwitch?.addEventListener('change', () => {
      setThemeAction(themeSwitch.checked ? 'dark' : 'light');
    });
    updateThemeUI();

    // Bind Accordion Toggles
    container.querySelectorAll('.sr-accordion-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.sr-accordion-item');
        const isOpen = item.classList.contains('open');
        item.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });

    // Bind Password Change Form
    const pwForm = document.getElementById('sr-me-password-form');
    const feedbackEl = document.getElementById('sr-pw-feedback');
    const pwSubmitBtn = document.getElementById('sr-btn-pw-submit');

    pwForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (feedbackEl) {
        feedbackEl.className = 'sr-form-feedback';
        feedbackEl.style.display = 'none';
        feedbackEl.textContent = '';
      }

      const cur = document.getElementById('sr-me-current-pw')?.value || '';
      const nxt = document.getElementById('sr-me-new-pw')?.value || '';
      const conf = document.getElementById('sr-me-confirm-pw')?.value || '';

      if (!cur) {
        showPwFeedback('Please enter your current password.', false);
        return;
      }
      if (nxt.length < 10) {
        showPwFeedback('New password must be at least 10 characters long.', false);
        return;
      }
      if (nxt !== conf) {
        showPwFeedback('New passwords do not match. Please verify.', false);
        return;
      }

      if (pwSubmitBtn) {
        pwSubmitBtn.disabled = true;
        pwSubmitBtn.textContent = 'Updating Password...';
      }

      try {
        const res = await fetch('/api/auth/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: cur, newPassword: nxt })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Password update failed.');
        }
        showPwFeedback('Password updated successfully.', true);
        pwForm.reset();
      } catch (err) {
        showPwFeedback(err.message, false);
      } finally {
        if (pwSubmitBtn) {
          pwSubmitBtn.disabled = false;
          pwSubmitBtn.textContent = 'Update Password';
        }
      }
    });

    function showPwFeedback(msg, isSuccess) {
      if (!feedbackEl) return;
      feedbackEl.textContent = msg;
      feedbackEl.className = `sr-form-feedback ${isSuccess ? 'success' : 'error'}`;
      feedbackEl.style.display = 'block';
    }

    // Bind Safe Logout
    document.getElementById('sr-btn-me-signout')?.addEventListener('click', () => {
      handleSafeSignOut();
    });
  }

  // ── Owner Settings Screen ──────────────────────────────────────────────────────
  async function renderOwnerSettings() {
    const user = getUser();
    const container = document.getElementById('sr-content-area');
    if (!container) return;

    // Access guard — owner only; supervisors and workers receive a 403 card
    if (!user || user.role !== 'owner') {
      container.innerHTML = `
        <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;max-width:520px;margin:24px auto;">
          <h3 style="color:#b91c1c;margin:0 0 8px;font-size:16px;">Access Denied</h3>
          <p style="color:#7f1d1d;font-size:13.5px;margin:0;line-height:1.5;">
            Only company owners can view or modify company settings.
          </p>
        </div>`;
      return;
    }

    // Loading skeleton
    container.innerHTML = `
      <div style="max-width:620px;margin:0 auto;padding:20px 16px 48px;">
        <h2 style="font-size:20px;font-weight:700;color:var(--sr-text);margin:0 0 4px;">Company Settings</h2>
        <p style="font-size:13px;color:var(--sr-text-muted);margin:0 0 24px;">
          Configure your organisation profile. Changes apply immediately to all staff.
        </p>
        <div id="sr-settings-banner" style="display:none;padding:10px 14px;border-radius:8px;font-size:13.5px;margin-bottom:16px;"></div>
        <div id="sr-settings-dirty-warn" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;background:#fffbeb;border:1px solid #fcd34d;color:#78350f;margin-bottom:16px;">
          You have unsaved changes.
        </div>
        <div id="sr-settings-form-wrap">
          <div style="text-align:center;padding:40px 0;color:var(--sr-text-muted);font-size:14px;">
            <div style="width:28px;height:28px;border:3px solid var(--sr-primary-light);border-top-color:transparent;border-radius:50%;animation:sr-spin 0.8s linear infinite;margin:0 auto 12px;"></div>
            Loading settings...
          </div>
        </div>
      </div>`;

    let loadedSettings = null;

    async function loadSettings() {
      const wrap = document.getElementById('sr-settings-form-wrap');
      if (!wrap) return;
      try {
        const res = await fetch('/api/organisation/settings');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server error ${res.status}`);
        }
        const data = await res.json();
        loadedSettings = data.organisation;
        renderForm(loadedSettings);
      } catch (err) {
        wrap.innerHTML = `
          <div class="sr-card" style="border-color:#fecaca;background:#fff5f5;">
            <p style="color:#b91c1c;font-size:14px;margin:0 0 12px;">${escapeHtml(err.message)}</p>
            <button class="sr-btn sr-btn-secondary" id="sr-settings-retry">Retry</button>
          </div>`;
        document.getElementById('sr-settings-retry')?.addEventListener('click', loadSettings);
      }
    }

    function renderForm(org) {
      const wrap = document.getElementById('sr-settings-form-wrap');
      if (!wrap) return;

      const tz = org.time_zone || 'UTC';
      const reminder = org.settings?.handoverReminderMinutes ?? 30;

      wrap.innerHTML = `
        <form id="sr-settings-form" novalidate>
          <div class="sr-card" style="padding:20px 20px 4px;margin-bottom:16px;">
            <h3 style="font-size:14px;font-weight:700;color:var(--sr-text);margin:0 0 16px;text-transform:uppercase;letter-spacing:.04em;opacity:.65;">Organisation Profile</h3>

            <div style="margin-bottom:16px;">
              <label for="sr-set-trading-name" style="display:block;font-size:13px;font-weight:600;color:var(--sr-text);margin-bottom:5px;">Trading Name</label>
              <input id="sr-set-trading-name" class="sr-input" type="text" maxlength="100"
                value="${escapeHtml(org.trading_name || '')}"
                placeholder="e.g. ShiftRelay Global"
                style="width:100%;box-sizing:border-box;" />
            </div>

            <div style="margin-bottom:16px;">
              <label for="sr-set-industry" style="display:block;font-size:13px;font-weight:600;color:var(--sr-text);margin-bottom:5px;">Industry</label>
              <select id="sr-set-industry" class="sr-input" style="width:100%;box-sizing:border-box;">
                ${['Healthcare','Logistics','Manufacturing','Hospitality','Retail','Security','Operations','Other']
                  .map(i => `<option value="${i}"${org.industry === i ? ' selected' : ''}>${i}</option>`).join('')}
              </select>
              <p style="font-size:12px;color:var(--sr-text-muted);margin:4px 0 0;line-height:1.4;">
                Affects how your roster is labelled. Does not change workflow rules.
              </p>
            </div>

            <div style="margin-bottom:16px;">
              <label for="sr-set-country" style="display:block;font-size:13px;font-weight:600;color:var(--sr-text);margin-bottom:5px;">Country</label>
              <input id="sr-set-country" class="sr-input" type="text" maxlength="60"
                value="${escapeHtml(org.country || '')}"
                placeholder="e.g. Kenya"
                style="width:100%;box-sizing:border-box;" />
            </div>
          </div>

          <div class="sr-card" style="padding:20px 20px 4px;margin-bottom:16px;">
            <h3 style="font-size:14px;font-weight:700;color:var(--sr-text);margin:0 0 16px;text-transform:uppercase;letter-spacing:.04em;opacity:.65;">Time and Language</h3>

            <div style="margin-bottom:16px;">
              <label for="sr-set-timezone" style="display:block;font-size:13px;font-weight:600;color:var(--sr-text);margin-bottom:5px;">Time Zone</label>
              <input id="sr-set-timezone" class="sr-input" type="text"
                value="${escapeHtml(tz)}"
                placeholder="e.g. UTC, Africa/Nairobi, Europe/London"
                style="width:100%;box-sizing:border-box;" />
              <p style="font-size:12px;color:var(--sr-text-muted);margin:4px 0 0;line-height:1.4;">
                IANA timezone identifier. Changing this affects how all scheduled shift times display to staff.
                Existing shifts remain at the same UTC instant — only the display timezone changes.
              </p>
            </div>

            <div style="margin-bottom:16px;">
              <label for="sr-set-language" style="display:block;font-size:13px;font-weight:600;color:var(--sr-text);margin-bottom:5px;">Preferred Language</label>
              <select id="sr-set-language" class="sr-input" style="width:100%;box-sizing:border-box;">
                ${[['en','English'],['es','Spanish'],['fr','French'],['de','German'],['sw','Swahili']]
                  .map(([v,l]) => `<option value="${v}"${org.preferred_language === v ? ' selected' : ''}>${l} (${v})</option>`).join('')}
              </select>
              <p style="font-size:12px;color:var(--sr-text-muted);margin:4px 0 0;line-height:1.4;">
                Stored for future use. The interface currently displays in English only.
              </p>
            </div>
          </div>

          <div class="sr-card" style="padding:20px 20px 4px;margin-bottom:24px;">
            <h3 style="font-size:14px;font-weight:700;color:var(--sr-text);margin:0 0 16px;text-transform:uppercase;letter-spacing:.04em;opacity:.65;">Handover Settings</h3>

            <div style="margin-bottom:16px;">
              <label for="sr-set-reminder" style="display:block;font-size:13px;font-weight:600;color:var(--sr-text);margin-bottom:5px;">Reminder Minutes Before Handover</label>
              <input id="sr-set-reminder" class="sr-input" type="number" min="5" max="240"
                value="${reminder}"
                style="width:140px;box-sizing:border-box;" />
              <p style="font-size:12px;color:var(--sr-text-muted);margin:4px 0 0;line-height:1.4;">
                Must be between 5 and 240 minutes. Stored preference only — automated reminder delivery is not yet implemented.
              </p>
            </div>
          </div>

          <div id="sr-settings-field-err" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;background:#fff5f5;border:1px solid #fecaca;color:#b91c1c;margin-bottom:16px;"></div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="submit" class="sr-btn sr-btn-primary" id="sr-settings-save">Save Settings</button>
            <button type="button" class="sr-btn sr-btn-secondary" id="sr-settings-cancel">Cancel</button>
          </div>
        </form>`;

      // Track dirty state
      let isDirty = false;
      const dirtyWarn = document.getElementById('sr-settings-dirty-warn');
      function markDirty() {
        if (!isDirty) {
          isDirty = true;
          if (dirtyWarn) dirtyWarn.style.display = 'block';
        }
      }
      function clearDirty() {
        isDirty = false;
        if (dirtyWarn) dirtyWarn.style.display = 'none';
      }

      ['sr-set-trading-name','sr-set-industry','sr-set-country','sr-set-timezone','sr-set-language','sr-set-reminder']
        .forEach(id => document.getElementById(id)?.addEventListener('input', markDirty));
      ['sr-set-industry','sr-set-language']
        .forEach(id => document.getElementById(id)?.addEventListener('change', markDirty));

      // Cancel — restore loaded values
      document.getElementById('sr-settings-cancel')?.addEventListener('click', () => {
        clearDirty();
        hideBanner();
        hideFieldErr();
        renderForm(loadedSettings);
      });

      // Submit
      document.getElementById('sr-settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFieldErr();
        hideBanner();

        const saveBtn = document.getElementById('sr-settings-save');
        const cancelBtn = document.getElementById('sr-settings-cancel');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
        if (cancelBtn) cancelBtn.disabled = true;

        const payload = {
          tradingName: (document.getElementById('sr-set-trading-name')?.value || '').trim(),
          industry: document.getElementById('sr-set-industry')?.value || 'Other',
          country: (document.getElementById('sr-set-country')?.value || '').trim(),
          timeZone: (document.getElementById('sr-set-timezone')?.value || '').trim(),
          language: document.getElementById('sr-set-language')?.value || 'en',
          handoverReminderMinutes: parseInt(document.getElementById('sr-set-reminder')?.value || '30', 10)
        };

        try {
          const res = await fetch('/api/organisation/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            showFieldErr(data.error || `Save failed (${res.status})`);
            return;
          }
          loadedSettings = data.organisation || loadedSettings;
          clearDirty();
          showBanner('Settings saved successfully.', true);
          setTimeout(hideBanner, 3500);
        } catch (err) {
          showFieldErr(err.message || 'Network error. Please try again.');
        } finally {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Settings'; }
          if (cancelBtn) cancelBtn.disabled = false;
        }
      });
    }

    function showBanner(msg, isSuccess) {
      const el = document.getElementById('sr-settings-banner');
      if (!el) return;
      el.textContent = msg;
      el.style.display = 'block';
      el.style.background = isSuccess ? '#f0fdf4' : '#fff5f5';
      el.style.border = `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`;
      el.style.color = isSuccess ? '#15803d' : '#b91c1c';
    }
    function hideBanner() {
      const el = document.getElementById('sr-settings-banner');
      if (el) el.style.display = 'none';
    }
    function showFieldErr(msg) {
      const el = document.getElementById('sr-settings-field-err');
      if (!el) return;
      el.textContent = msg;
      el.style.display = 'block';
    }
    function hideFieldErr() {
      const el = document.getElementById('sr-settings-field-err');
      if (el) el.style.display = 'none';
    }

    await loadSettings();
  }

  async function handleSafeSignOut() {
    const proceedSignOut = async () => {
      try {
        await fetch('/api/auth/sign-out', { method: 'POST' });
      } catch (_) {}
      try {
        localStorage.removeItem('shiftrelay-user-data');
      } catch (_) {}
      if (window._srState) window._srState.user = null;
      window.location.reload();
    };

    if (window.OfflineQueue?.promptLogoutWarning) {
      window.OfflineQueue.promptLogoutWarning(proceedSignOut);
    } else {
      await proceedSignOut();
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
    renderWorkerMe,
    renderWorkerSchedule,
    renderManagerSchedule,
    renderOwnerSettings,
    openContextModal,
    toggleNotificationPanel,
    openNotificationPanel,
    closeNotificationPanel,
    clearNotificationState,
    navigate
  };

  // If an active session is already established on script execution, mount the shell
  if (getUser()) {
    mountShell();
  }

})();
