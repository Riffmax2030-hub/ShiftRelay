/**
 * ShiftRelay Strict Live GPS Guard & Native In-App Location Access
 * Zero-fallback high-accuracy device location enforcement for all attendance punches
 * (Clock-In, Clock-Out, and Peer Staff ID Card Scans).
 */
(function () {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 9500;
  const DEFAULT_MAX_ACCURACY_METERS = 300;
  const LOC_MODAL_ID = 'sr-location-access-modal';

  function makeGpsError(code, message) {
    const err = new Error(message);
    err.code = code;
    err.isStrictGpsError = true;
    return err;
  }

  async function checkPermissionStatus() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return 'unsupported';
    }
    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        const res = await navigator.permissions.query({ name: 'geolocation' });
        return res?.state || 'prompt';
      }
    } catch (_) {
      // Safari / some mobile WebViews may not support permissions.query('geolocation')
    }
    return 'prompt';
  }

  function validateCoords(coords, maxAccuracyMeters = DEFAULT_MAX_ACCURACY_METERS) {
    if (!coords) {
      throw makeGpsError('GPS_UNAVAILABLE', 'Device GPS signal is unavailable. Turn on Location Services on this phone and retry.');
    }
    const lat = Number(coords.latitude);
    const lng = Number(coords.longitude);
    const acc = coords.accuracy === null || coords.accuracy === undefined ? null : Number(coords.accuracy);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw makeGpsError('GPS_INVALID', 'Invalid GPS coordinates received. Refresh Location Services and retry.');
    }
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      throw makeGpsError('GPS_INVALID', 'Location returned empty coordinates. Turn on Precise Location on your phone and retry.');
    }
    if (acc !== null && (!Number.isFinite(acc) || acc < 0 || acc > maxAccuracyMeters)) {
      const shownAcc = Number.isFinite(acc) ? `${Math.round(acc)}m` : 'unknown';
      throw makeGpsError(
        'GPS_LOW_ACCURACY',
        `GPS accuracy (${shownAcc}) is too wide for workplace check-in (limit: ${maxAccuracyMeters}m). Enable Precise Location and retry.`
      );
    }

    return {
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lng.toFixed(7)),
      accuracy: acc !== null ? Math.round(acc * 10) / 10 : null,
      capturedAt: new Date(coords.timestamp || Date.now()).toISOString()
    };
  }

  async function captureStrictLiveGps(options = {}) {
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
    const maxAccuracyMeters = Number(options.maxAccuracyMeters) > 0 ? Number(options.maxAccuracyMeters) : DEFAULT_MAX_ACCURACY_METERS;
    const actionLabel = String(options.actionLabel || 'verify attendance');

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw makeGpsError(
        'GPS_UNSUPPORTED',
        `Location services are turned off on this phone. Turn on Location to ${actionLabel}.`
      );
    }

    const permState = await checkPermissionStatus();
    if (permState === 'denied') {
      throw makeGpsError(
        'GPS_PERMISSION_DENIED',
        `Location access is turned off for ShiftRelay. Enable Location in App Settings to ${actionLabel}.`
      );
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const hardTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(makeGpsError(
          'GPS_TIMEOUT',
          `Could not lock GPS signal within ${Math.round(timeoutMs / 1000)}s. Turn on Precise Location and try again.`
        ));
      }, timeoutMs + 500);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(hardTimer);
          try {
            const validated = validateCoords({
              latitude: pos?.coords?.latitude,
              longitude: pos?.coords?.longitude,
              accuracy: pos?.coords?.accuracy,
              timestamp: pos?.timestamp
            }, maxAccuracyMeters);
            resolve(validated);
          } catch (validationErr) {
            reject(validationErr);
          }
        },
        (geoErr) => {
          if (settled) return;
          settled = true;
          clearTimeout(hardTimer);
          const code = geoErr?.code;
          if (code === 1) {
            reject(makeGpsError(
              'GPS_PERMISSION_DENIED',
              `Location permission is required to ${actionLabel}. Tap Enable Location to allow ShiftRelay.`
            ));
          } else if (code === 3) {
            reject(makeGpsError(
              'GPS_TIMEOUT',
              `GPS lock timed out. Turn on Precise Location on this phone and retry.`
            ));
          } else {
            reject(makeGpsError(
              'GPS_UNAVAILABLE',
              `Phone Location Services appear turned off. Turn on Location to ${actionLabel}.`
            ));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * In-App Native Location Prompt & Settings Sheet (zero "Chrome browser" jargon)
   * - Lets users grant location directly in-app or jump straight to Phone/App Location Settings on Android APK
   * - Auto-retries GPS the moment the user returns to ShiftRelay
   */
  function openLocationPromptModal({ code = 'GPS_PERMISSION_DENIED', reason = '', onRetry = null } = {}) {
    document.getElementById(LOC_MODAL_ID)?.remove();
    const isNative = Boolean(window.ShiftRelayMobile?.isNative?.());
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const wrap = document.createElement('div');
    wrap.id = LOC_MODAL_ID;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Enable Location Access');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147482600;background:rgba(2,12,20,0.74);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:flex-end;justify-content:center;padding:12px;';

    const cardBg = isDark ? '#0d1622' : '#ffffff';
    const textMain = isDark ? '#f8fafc' : '#0f172a';
    const textSub = isDark ? '#94a3b8' : '#475569';
    const borderCol = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.1)';
    const boxBg = isDark ? 'rgba(255,255,255,0.045)' : '#f8fafc';

    wrap.innerHTML = `
      <div style="width:100%;max-width:420px;background:${cardBg};color:${textMain};border:1px solid ${borderCol};border-radius:22px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,0.45);display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="width:38px;height:38px;border-radius:12px;background:rgba(16,185,129,0.16);color:#10b981;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <div>
              <h3 style="margin:0;font-size:15.5px;font-weight:800;letter-spacing:-0.015em;">Location Access Needed</h3>
              <div style="font-size:11.5px;color:${textSub};">Used only at clock-in &amp; clock-out</div>
            </div>
          </div>
          <button type="button" id="sr-loc-close" aria-label="Close" style="width:32px;height:32px;border-radius:50%;border:1px solid ${borderCol};background:transparent;color:${textSub};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <p style="margin:0;font-size:13px;line-height:1.5;color:${textSub};">
          ${String(reason || 'Turn on Location so ShiftRelay can verify you are at your workplace muster point.').replace(/</g, '&lt;')}
        </p>

        <div id="sr-loc-steps" style="display:none;padding:11px 12px;border-radius:12px;background:${boxBg};border:1px solid ${borderCol};font-size:12px;line-height:1.5;color:${textSub};">
          <strong style="display:block;color:${textMain};margin-bottom:4px;">Quick Phone Steps:</strong>
          1. Open <strong>Phone Settings &rarr; Location</strong> and switch Location <strong>ON</strong>.<br/>
          2. Under <strong>App Permissions &rarr; ShiftRelay &rarr; Location</strong>, choose <strong>Allow while using the app</strong> (with <strong>Precise</strong> enabled), then return here.
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          <button type="button" id="sr-loc-enable-btn" class="sr-btn sr-btn-primary" style="width:100%;min-height:44px;border-radius:13px;font-size:13.5px;font-weight:800;">
            Enable Location Now
          </button>
          <button type="button" id="sr-loc-settings-btn" class="sr-btn sr-btn-secondary" style="width:100%;min-height:42px;border-radius:13px;font-size:13px;font-weight:700;">
            ${isNative ? 'Open Phone Location Settings' : 'Location Settings Help'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const ac = new AbortController();
    const close = () => {
      ac.abort();
      wrap.remove();
    };

    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); }, { signal: ac.signal });
    wrap.querySelector('#sr-loc-close')?.addEventListener('click', close, { signal: ac.signal });

    // Auto-retry GPS when user switches back from Phone Settings
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && document.getElementById(LOC_MODAL_ID)) {
        checkPermissionStatus().then((st) => {
          if (st === 'granted') {
            close();
            if (typeof onRetry === 'function') onRetry();
          }
        }).catch(() => {});
      }
    }, { signal: ac.signal });

    wrap.querySelector('#sr-loc-enable-btn')?.addEventListener('click', async () => {
      const btn = wrap.querySelector('#sr-loc-enable-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Requesting Location...'; }
      try {
        await captureStrictLiveGps({ actionLabel: 'verify attendance', timeoutMs: 8000 });
        close();
        if (typeof onRetry === 'function') onRetry();
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Try Again'; }
        const steps = wrap.querySelector('#sr-loc-steps');
        if (steps) steps.style.display = 'block';
        if (isNative && (err?.code === 'GPS_PERMISSION_DENIED' || err?.code === 'GPS_UNAVAILABLE')) {
          window.ShiftRelayMobile.openLocationSettings({ target: err.code === 'GPS_PERMISSION_DENIED' ? 'app' : 'location' });
        }
      }
    }, { signal: ac.signal });

    wrap.querySelector('#sr-loc-settings-btn')?.addEventListener('click', async () => {
      if (isNative && window.ShiftRelayMobile?.openLocationSettings) {
        const target = code === 'GPS_PERMISSION_DENIED' ? 'app' : 'location';
        const opened = await window.ShiftRelayMobile.openLocationSettings({ target });
        if (opened) return;
      }
      const steps = wrap.querySelector('#sr-loc-steps');
      if (steps) steps.style.display = 'block';
    }, { signal: ac.signal });
  }

  window.ShiftRelayGps = {
    captureStrictLiveGps,
    checkPermissionStatus,
    validateCoords,
    openLocationPromptModal
  };
})();
