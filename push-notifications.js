/**
 * ShiftRelay Web Push & Shift Turnover Alerts
 * Handles browser and native mobile notification permissions
 * for real-time shift swaps, handover receipts, and safety alerts.
 * Zero emojis - 100% clean SVG vector icons.
 */

(function () {
  async function requestPushPermission() {
    if (!('Notification' in window)) {
      toast('Notifications are not supported on this browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('sr_push_enabled', '1');
        toast('Shift push alerts enabled.');
        renderPushBanner(); // Updates or removes banner

        // Show welcome push
        showSystemNotification('ShiftRelay Alerts Active', {
          body: 'You will receive immediate alerts for handover handoffs and shift swap requests.',
          icon: '/icon.svg'
        });
        return true;
      } else {
        toast('Notification permission declined.');
        return false;
      }
    } catch (err) {
      toast('Error requesting notification permission: ' + err.message);
      return false;
    }
  }

  function showSystemNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [100, 50, 100],
            ...options
          });
        });
      } else {
        new Notification(title, {
          icon: '/icon.svg',
          ...options
        });
      }
      window.SoundEngine?.play?.('confirm');
    } catch (_) {
      /* Fallback silent */
    }
  }

  function renderPushBanner() {
    // If already granted or dismissed, do not render
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || localStorage.getItem('sr_push_dismissed') === '1') {
      document.getElementById('sr-push-optin-banner')?.remove();
      return;
    }

    const commandGlass = document.querySelector('.today-command-glass');
    if (!commandGlass || document.getElementById('sr-push-optin-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sr-push-optin-banner';
    banner.className = 'push-optin-card';
    banner.innerHTML = `
      <div class="push-optin-icon">${Icons.bell(18)}</div>
      <div class="push-optin-content">
        <strong>Enable Shift Turnover Alerts</strong>
        <p>Get notified when handovers are approved, a teammate needs coverage, or an urgent hazard is flagged.</p>
      </div>
      <div class="push-optin-actions">
        <button type="button" class="push-btn-dismiss" id="btn-dismiss-push" aria-label="Dismiss">${Icons.close(14)}</button>
        <button type="button" class="primary push-btn-enable" id="btn-enable-push">Turn On</button>
      </div>
    `;

    commandGlass.insertAdjacentElement('afterend', banner);

    document.getElementById('btn-enable-push')?.addEventListener('click', requestPushPermission);
    document.getElementById('btn-dismiss-push')?.addEventListener('click', () => {
      localStorage.setItem('sr_push_dismissed', '1');
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 200);
    });
  }

  window.requestPushPermission = requestPushPermission;
  window.showSystemNotification = showSystemNotification;
  window.renderPushBanner = renderPushBanner;

  // Auto-check on dashboard load
  window.addEventListener('load', () => {
    setTimeout(renderPushBanner, 1800);
  });
})();
