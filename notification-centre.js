/**
 * ShiftRelay Notification Centre
 * Renders a full notification list page with unread/read state,
 * mark-all-read, grouped by Today / Earlier, and type icons.
 */

async function renderNotificationCentre() {
  const dash = document.getElementById('dashboard');
  if (!dash) return;

  dash.innerHTML = `
    <div class="notif-centre-wrap">
      <div class="notif-header-row">
        <div>
          <p class="eyebrow">ALERTS</p>
          <h2 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Notifications</h2>
        </div>
        <button class="secondary" id="btn-mark-all-read" style="font-size:12px;padding:7px 14px;border-radius:8px;">
          ${Icons.checkCheck(14)} Mark all read
        </button>
      </div>
      <div id="notif-list-container">
        <div class="skeleton-post-card" style="margin-bottom:10px;">
          <div style="display:flex;gap:12px;align-items:center;">
            <div class="skeleton-avatar" style="width:40px;height:40px;border-radius:12px;flex-shrink:0;"></div>
            <div style="flex:1;"><div class="skeleton-line medium"></div><div class="skeleton-line short" style="margin-top:6px;"></div></div>
          </div>
        </div>
        <div class="skeleton-post-card" style="margin-bottom:10px;">
          <div style="display:flex;gap:12px;align-items:center;">
            <div class="skeleton-avatar" style="width:40px;height:40px;border-radius:12px;flex-shrink:0;"></div>
            <div style="flex:1;"><div class="skeleton-line full"></div><div class="skeleton-line short" style="margin-top:6px;"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Mark all read button
  document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
    try {
      await api('/api/notifications/read', { method: 'POST' });
      // Re-render to show all as read
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      document.getElementById('notification-count')?.setAttribute('data-count', '0');
      const countEl = document.getElementById('notification-count');
      if (countEl) { countEl.textContent = '0'; countEl.style.display = 'none'; }
      // Remove dock badge
      document.querySelectorAll('.dock-tab[data-go="notifications"] .dock-badge').forEach(b => b.remove());
      toast('All notifications marked as read.');
    } catch (err) {
      toast(err.message);
    }
  });

  // Load notifications
  try {
    const { notifications = [] } = await api('/api/notifications');
    const container = document.getElementById('notif-list-container');
    if (!container) return;

    if (!notifications.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:#94a3b8;">
          ${Icons.bell(32)}
          <p style="margin:14px 0 4px;font-size:15px;font-weight:600;color:#64748b;">All caught up</p>
          <p style="font-size:13px;color:#94a3b8;">No notifications yet. Shifts, approvals, and mentions will appear here.</p>
        </div>
      `;
      return;
    }

    // Categorise by date
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayItems = notifications.filter(n => new Date(n.createdAt || n.created_at) >= todayStart);
    const earlierItems = notifications.filter(n => new Date(n.createdAt || n.created_at) < todayStart);

    function getNotifIcon(msg) {
      const m = (msg || '').toLowerCase();
      if (m.includes('handover') || m.includes('relay')) return Icons.layers(18);
      if (m.includes('swap')) return Icons.repost(18);
      if (m.includes('incident') || m.includes('hazard') || m.includes('safety')) return Icons.shield(18);
      if (m.includes('message') || m.includes('chat') || m.includes('mention')) return Icons.messageSquare(18);
      if (m.includes('joined') || m.includes('approved') || m.includes('access')) return Icons.badgeCheck(18);
      if (m.includes('clock') || m.includes('shift')) return Icons.clock(18);
      return Icons.bell(18);
    }

    function getNotifAccent(msg) {
      const m = (msg || '').toLowerCase();
      if (m.includes('incident') || m.includes('hazard')) return '#ef4444';
      if (m.includes('swap')) return '#f59e0b';
      if (m.includes('approved') || m.includes('joined')) return '#10b981';
      if (m.includes('message') || m.includes('mention')) return '#3b82f6';
      return '#0d524d';
    }

    function formatRelTime(dateStr) {
      const d = new Date(dateStr);
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function renderGroup(items, label) {
      if (!items.length) return '';
      return `
        <p class="notif-section-label">${label}</p>
        ${items.map(n => {
          const msg = n.message || '';
          const accent = getNotifAccent(msg);
          const icon = getNotifIcon(msg);
          const unread = !n.read;
          return `
            <div class="notif-item${unread ? ' unread' : ''}" data-notif-id="${n.id}">
              <div class="notif-icon-wrap" style="background:${accent}18;color:${accent};">
                ${icon}
              </div>
              <div class="notif-item-content">
                <p class="notif-item-body">${escape(msg)}</p>
                <p class="notif-item-meta">${formatRelTime(n.createdAt || n.created_at)}</p>
              </div>
              ${unread ? '<span class="notif-unread-dot"></span>' : ''}
            </div>
          `;
        }).join('')}
      `;
    }

    container.innerHTML = renderGroup(todayItems, 'Today') + renderGroup(earlierItems, 'Earlier');

    // Tap to mark individual as read
    container.querySelectorAll('.notif-item.unread').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.remove('unread');
        el.querySelector('.notif-unread-dot')?.remove();
      });
    });

  } catch (err) {
    const container = document.getElementById('notif-list-container');
    if (container) container.innerHTML = `<p class="muted" style="text-align:center;padding:32px;">Could not load notifications.</p>`;
  }
}

window.renderNotificationCentre = renderNotificationCentre;
