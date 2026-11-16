/**
 * ShiftRelay Mobile Native Bridge
 * Enables seamless API calls from iOS / Android Capacitor WebView
 * to your cloud backend with cookies and credentials.
 */
(function() {
  'use strict';

  // Fallback production URL if packaged as native app without origin server
  const DEFAULT_REMOTE_BACKEND = 'https://app.shiftrelayos.com';

  function getBackendBase() {
    const metaBase = document.querySelector('meta[name="shiftrelay-api-base"]')?.getAttribute('content') || '';
    return (localStorage.getItem('sr_remote_api_base') || window.SR_REMOTE_API_BASE || metaBase || DEFAULT_REMOTE_BACKEND).replace(/\/+$/, '');
  }

  function toNotificationId(rawId) {
    if (typeof rawId === 'number' && Number.isFinite(rawId) && rawId > 0) {
      return Math.floor(rawId) % 2147483647 || 1;
    }
    const str = String(rawId || '').trim();
    if (!str) return Math.floor(1 + Math.random() * 1000000);
    if (/^\d+$/.test(str)) return (parseInt(str, 10) % 2147483647) || 1;
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash & 0x7fffffff) || 1;
  }

  window.ShiftRelayMobile = {
    getBackendBase,
    setBackendBase(url) {
      if (url) localStorage.setItem('sr_remote_api_base', url.replace(/\/+$/, ''));
      else localStorage.removeItem('sr_remote_api_base');
    },
    isNative() {
      return Boolean(window.Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:' || (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port));
    },
    async scheduleLocalReminder({ id, title, body, scheduleAt }) {
      try {
        const plugin = window.Capacitor?.Plugins?.LocalNotifications;
        if (!plugin || !this.isNative()) return false;
        let perm = typeof plugin.checkPermissions === 'function' ? await plugin.checkPermissions() : null;
        if (perm?.display !== 'granted') {
          perm = await plugin.requestPermissions();
        }
        if (perm?.display !== 'granted') return false;
        const when = scheduleAt ? new Date(scheduleAt) : new Date(Date.now() + 1000);
        await plugin.schedule({
          notifications: [{
            id: toNotificationId(id),
            title: String(title || 'ShiftRelay OS Shift Reminder'),
            body: String(body || 'Check in via GPS or Staff ID badge.'),
            schedule: { at: when > new Date() ? when : new Date(Date.now() + 1000) }
          }]
        });
        return true;
      } catch {
        return false;
      }
    }
  };

  // Only intercept relative /api routes if running inside native app wrapper
  if (window.ShiftRelayMobile.isNative()) {
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string' && input.startsWith('/')) {
        input = getBackendBase() + input;
        init = init || {};
        if (!init.credentials) init.credentials = 'include';
      }
      return origFetch.call(this, input, init);
    };
    console.log('[ShiftRelay Mobile Bridge] Active. Routing native calls to:', getBackendBase());
  }
})();
