/**
 * ShiftRelay Live Dock Badge System
 * Polls /api/notifications every 30s and updates red badge pips on dock tabs.
 * Also shows a badge on the bell icon in the app header.
 */

(function () {
  let badgeInterval = null;
  let lastUnreadCount = 0;

  async function refreshBadges() {
    try {
      const { notifications = [] } = await api('/api/notifications').catch(() => ({ notifications: [] }));
      const unread = notifications.filter(n => !n.read).length;

      // -- Bell badge in header --
      const countEl = document.getElementById('notification-count');
      if (countEl) {
        countEl.textContent = unread > 99 ? '99+' : String(unread);
        countEl.style.display = unread > 0 ? '' : 'none';
      }

      // -- Dock tab badge on "notifications" tab (if it exists in dock) --
      updateDockBadge('notifications', unread);

      // -- Vibrate on new notification (mobile) --
      if (unread > lastUnreadCount && lastUnreadCount !== null && navigator.vibrate) {
        navigator.vibrate([30, 20, 30]);
      }
      lastUnreadCount = unread;

    } catch (_) { /* silent fail */ }
  }

  function updateDockBadge(tabKey, count) {
    // Find the dock tab by data-go attribute
    const tab = document.querySelector(`.frontline-dock [data-go="${tabKey}"], .dock-tab[data-go="${tabKey}"]`);
    if (!tab) return;

    let badge = tab.querySelector('.dock-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'dock-badge';
        tab.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = '';
    } else {
      badge?.remove();
    }
  }

  // Also expose so other modules can trigger a refresh (e.g. after posting)
  window.refreshDockBadges = refreshBadges;
  window.updateDockBadge = updateDockBadge;

  // Start polling after a short delay (let app initialise first)
  window.addEventListener('load', () => {
    // Initial fetch
    setTimeout(refreshBadges, 1500);
    // Then every 30 seconds
    badgeInterval = setInterval(refreshBadges, 30000);
  });

  // Refresh immediately when user returns to the tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshBadges();
  });
})();
