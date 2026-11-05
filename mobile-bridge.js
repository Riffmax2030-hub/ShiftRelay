/**
 * ShiftRelay Mobile Native Bridge
 * Enables seamless API calls from iOS / Android Capacitor WebView
 * to your cloud backend with cookies and credentials.
 */
(function() {
  'use strict';

  // Fallback production URL if packaged as native app without origin server
  const DEFAULT_REMOTE_BACKEND = 'https://shiftrelay.up.railway.app';
  
  function getBackendBase() {
    return (localStorage.getItem('sr_remote_api_base') || window.SR_REMOTE_API_BASE || DEFAULT_REMOTE_BACKEND).replace(/\/+$/, '');
  }

  window.ShiftRelayMobile = {
    getBackendBase,
    setBackendBase(url) {
      if (url) localStorage.setItem('sr_remote_api_base', url.replace(/\/+$/, ''));
      else localStorage.removeItem('sr_remote_api_base');
    },
    isNative() {
      return Boolean(window.Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:' || (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port));
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
