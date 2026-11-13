/**
 * ShiftRelay Strict Live GPS Guard
 * Zero-fallback high-accuracy device location enforcement for all attendance punches
 * (Clock-In, Clock-Out, and Colleague Staff ID Card Scans).
 */
(function () {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 9500;
  const DEFAULT_MAX_ACCURACY_METERS = 300;

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
      // Safari / older WebViews may not support permissions.query('geolocation')
    }
    return 'prompt';
  }

  function validateCoords(coords, maxAccuracyMeters = DEFAULT_MAX_ACCURACY_METERS) {
    if (!coords) {
      throw makeGpsError('GPS_UNAVAILABLE', 'Device GPS signal is unavailable. Turn on Location Services and stay at the workplace to continue.');
    }
    const lat = Number(coords.latitude);
    const lng = Number(coords.longitude);
    const acc = coords.accuracy === null || coords.accuracy === undefined ? null : Number(coords.accuracy);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw makeGpsError('GPS_INVALID', 'Invalid GPS coordinates received from device. Refresh location services and retry.');
    }
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      throw makeGpsError('GPS_INVALID', 'Location read returned zero coordinates (0, 0). Enable high-accuracy device GPS and retry.');
    }
    if (acc !== null && (!Number.isFinite(acc) || acc < 0 || acc > maxAccuracyMeters)) {
      const shownAcc = Number.isFinite(acc) ? `${Math.round(acc)}m` : 'unknown';
      throw makeGpsError(
        'GPS_LOW_ACCURACY',
        `GPS accuracy (${shownAcc}) is too coarse for workplace verification (limit: ${maxAccuracyMeters}m). Enable High-Accuracy GPS and try again.`
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
        `Location services are unsupported or disabled on this device. Strict live GPS access is required to ${actionLabel}.`
      );
    }

    const permState = await checkPermissionStatus();
    if (permState === 'denied') {
      throw makeGpsError(
        'GPS_PERMISSION_DENIED',
        `Location access is blocked. Allow device location permissions for ShiftRelay in browser or phone settings to ${actionLabel}.`
      );
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const hardTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(makeGpsError(
          'GPS_TIMEOUT',
          `Timed out acquiring live GPS fix (${Math.round(timeoutMs / 1000)}s). Move closer to an open area, enable Precise Location, and try again.`
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
              `Location permission denied. Every device must grant live GPS access to ${actionLabel}.`
            ));
          } else if (code === 3) {
            reject(makeGpsError(
              'GPS_TIMEOUT',
              `Live GPS fix timed out. Turn on High-Accuracy / Precise Location and retry to ${actionLabel}.`
            ));
          } else {
            reject(makeGpsError(
              'GPS_UNAVAILABLE',
              `Live location is currently unavailable on this device. Enable GPS / Location Services before you can ${actionLabel}.`
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

  window.ShiftRelayGps = {
    captureStrictLiveGps,
    checkPermissionStatus,
    validateCoords
  };
})();
