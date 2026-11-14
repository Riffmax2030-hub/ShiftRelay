/**
 * ShiftRelay Attendance Security & Anti-Bypass Engine
 * Shared cryptographic Staff ID card verification, strict live GPS geofencing,
 * and auto clock-out presence verification rules.
 */
import crypto from 'node:crypto';

const CARD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let cachedSigningSecret = process.env.CARD_SIGNING_SECRET || process.env.SESSION_SECRET || '';

function encodeHmacDigestToCardCode(digest, length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CARD_ALPHABET[digest[i] % CARD_ALPHABET.length];
  }
  return code;
}

export function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function ensureCardSigningSecret(store = null) {
  if (process.env.CARD_SIGNING_SECRET) {
    cachedSigningSecret = process.env.CARD_SIGNING_SECRET;
    return cachedSigningSecret;
  }
  if (process.env.SESSION_SECRET) {
    cachedSigningSecret = process.env.SESSION_SECRET;
    return cachedSigningSecret;
  }
  if (store && typeof store.cardSigningSecret === 'string' && store.cardSigningSecret.length >= 32) {
    cachedSigningSecret = store.cardSigningSecret;
    return cachedSigningSecret;
  }
  if (!cachedSigningSecret) {
    cachedSigningSecret = crypto.randomBytes(32).toString('hex');
  }
  if (store && !store.cardSigningSecret) {
    store.cardSigningSecret = cachedSigningSecret;
  }
  return cachedSigningSecret;
}

function resolveSigningSecretArg(storeOrSecret = null) {
  return typeof storeOrSecret === 'string'
    ? storeOrSecret
    : ensureCardSigningSecret(storeOrSecret);
}

function timingSafeCodeMatch(expected, candidate) {
  const a = String(expected || '').trim().toUpperCase();
  const b = String(candidate || '').trim().toUpperCase();
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export function computeStaffCardSecurityCode(orgCode, staffId, storeOrSecret = null) {
  const secret = resolveSigningSecretArg(storeOrSecret);
  const cleanOrg = String(orgCode || 'RIF-2026').trim().toUpperCase();
  const cleanStaff = String(staffId || '').trim().toUpperCase();
  if (!cleanStaff) return '';
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`SHIFTRELAY-CARD-V1::${cleanOrg}::${cleanStaff}`)
    .digest();
  return encodeHmacDigestToCardCode(digest, 6);
}

export function buildStaffCardCredentials(orgCode, staffId, storeOrSecret = null) {
  const cleanOrg = String(orgCode || 'RIF-2026').trim().toUpperCase();
  const cleanStaff = String(staffId || '').trim().toUpperCase();
  const cardVerifyCode = computeStaffCardSecurityCode(cleanOrg, cleanStaff, storeOrSecret);
  return {
    staffId: cleanStaff,
    cardVerifyCode,
    cardQrPayload: cleanStaff ? `SHIFTRELAY:ID:${cleanOrg}:${cleanStaff}:${cardVerifyCode}` : ''
  };
}

export function parseStaffCardPayload(rawPayload, explicitSecurityCode = '') {
  const trimmed = String(rawPayload || '').trim();
  const cleanExplicit = String(explicitSecurityCode || '').trim().toUpperCase();
  if (!trimmed) {
    return { mode: 'physical_card', orgCode: '', staffId: '', securityCode: cleanExplicit, isSignedQr: false };
  }
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((s) => s.trim()).filter(Boolean);
    // Supported physical Staff ID card formats:
    // SHIFTRELAY:ID:<ORG_CODE>:<STAFF_ID>:<VERIFY_CODE>
    // SHIFTRELAY:ID:<ORG_CODE>:<STAFF_ID>
    // SR:STAFF:<STAFF_ID>:<VERIFY_CODE>
    if (parts.length >= 5 && parts[0].toUpperCase() === 'SHIFTRELAY' && parts[1].toUpperCase() === 'ID') {
      return {
        mode: 'physical_card',
        orgCode: parts[2].toUpperCase(),
        staffId: parts[3].toUpperCase(),
        securityCode: cleanExplicit || parts[4].toUpperCase(),
        isSignedQr: true
      };
    }
    if (parts.length === 4 && parts[0].toUpperCase() === 'SHIFTRELAY' && parts[1].toUpperCase() === 'ID') {
      return {
        mode: 'physical_card',
        orgCode: parts[2].toUpperCase(),
        staffId: parts[3].toUpperCase(),
        securityCode: cleanExplicit,
        isSignedQr: false
      };
    }
    if (parts.length >= 4 && parts[0].toUpperCase() === 'SR') {
      return {
        mode: 'physical_card',
        orgCode: '',
        staffId: parts[2].toUpperCase(),
        securityCode: cleanExplicit || parts[3].toUpperCase(),
        isSignedQr: Boolean(cleanExplicit || parts[3])
      };
    }
    return {
      mode: 'physical_card',
      orgCode: '',
      staffId: parts[parts.length - 1].toUpperCase(),
      securityCode: cleanExplicit,
      isSignedQr: false
    };
  }
  return {
    mode: 'physical_card',
    orgCode: '',
    staffId: trimmed.toUpperCase(),
    securityCode: cleanExplicit,
    isSignedQr: false
  };
}

export function verifyStaffCardSecurityCode({ orgCode, staffId, providedCode, storeOrSecret = null }) {
  const expected = computeStaffCardSecurityCode(orgCode, staffId, storeOrSecret);
  return timingSafeCodeMatch(expected, providedCode);
}

export function sanitizeScanPhotoDataUrl(rawPhoto) {
  if (typeof rawPhoto !== 'string') return null;
  const trimmed = rawPhoto.trim();
  if (!trimmed || trimmed.length > 130_000) return null;
  if (!/^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return null;
  return trimmed;
}

export const sanitizeFacialPhotoDataUrl = sanitizeScanPhotoDataUrl;

export function resolveOrgGeofenceConfig(org = {}, profile = null) {
  const settingsGeo = org?.settings?.geofence || {};
  const rawLat = org?.hub_lat ?? settingsGeo.hubLat ?? settingsGeo.latitude;
  const rawLng = org?.hub_lng ?? settingsGeo.hubLng ?? settingsGeo.longitude;
  const rawPerim = org?.hub_perimeter ?? settingsGeo.perimeterMeters ?? settingsGeo.radiusMeters;
  const hubLat = Number.isFinite(Number(rawLat)) ? Number(rawLat) : 6.4312;
  const hubLng = Number.isFinite(Number(rawLng)) ? Number(rawLng) : 3.4244;
  const perimeterMeters = Math.max(25, Number.isFinite(Number(rawPerim)) ? Number(rawPerim) : 250);
  const hubName = org?.hub_name || settingsGeo.hubName || (org?.state ? `${org.state} Operations Hub` : (profile?.defaultHubName || 'Main Operations Hub'));
  return { hubLat, hubLng, perimeterMeters, hubName };
}

export function verifyStrictLiveGps(org = {}, profile = null, body = {}, options = {}) {
  const actionLabel = String(options.actionLabel || 'complete attendance verification');
  const maxAccuracyMeters = Number(options.maxAccuracyMeters) > 0 ? Number(options.maxAccuracyMeters) : 300;
  const maxAgeMs = options.allowOfflineCaptured && body?.offlineQueued
    ? 8 * 3600 * 1000
    : (Number(options.maxAgeMs) > 0 ? Number(options.maxAgeMs) : 180 * 1000);

  const coords = body?.coords || body?.location || null;
  if (!coords || typeof coords !== 'object') {
    const err = new Error(`Live GPS location is required. Enable device location services before you can ${actionLabel}.`);
    err.statusCode = 400;
    err.errorCode = 'GPS_REQUIRED';
    throw err;
  }

  let effectiveLat = Number(coords.latitude);
  let effectiveLng = Number(coords.longitude);
  const accuracy = (coords.accuracy === null || coords.accuracy === undefined) ? null : Number(coords.accuracy);

  const validateLatLng = (lat, lng, msgPrefix = 'Invalid GPS reading') => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      const err = new Error(`${msgPrefix}: malformed GPS coordinates. Enable high-accuracy location and retry.`);
      err.statusCode = 400;
      err.errorCode = 'GPS_INVALID';
      throw err;
    }
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      const err = new Error(`${msgPrefix}: zeroed GPS reading (0, 0) rejected. Enable high-accuracy location and retry.`);
      err.statusCode = 400;
      err.errorCode = 'GPS_INVALID';
      throw err;
    }
  };

  validateLatLng(effectiveLat, effectiveLng);

  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > maxAccuracyMeters)) {
    const accLabel = Number.isFinite(accuracy) ? `${Math.round(accuracy)}m` : 'unknown';
    const err = new Error(`GPS signal accuracy (${accLabel}) exceeds the ${maxAccuracyMeters}m verification limit. Enable Precise Location and retry.`);
    err.statusCode = 400;
    err.errorCode = 'GPS_LOW_ACCURACY';
    throw err;
  }

  const rawTs = coords.capturedAt || coords.timestamp || null;
  if (rawTs) {
    const parsedTs = typeof rawTs === 'number' ? rawTs : Date.parse(rawTs);
    if (!Number.isFinite(parsedTs)) {
      const err = new Error('Invalid GPS timestamp received from device.');
      err.statusCode = 400;
      err.errorCode = 'GPS_INVALID_TIMESTAMP';
      throw err;
    }
    const deltaMs = Date.now() - parsedTs;
    if (deltaMs < -60_000) {
      const err = new Error('Device GPS timestamp is skewed in the future. Sync device clock and retry.');
      err.statusCode = 400;
      err.errorCode = 'GPS_CLOCK_SKEW';
      throw err;
    }
    if (deltaMs > maxAgeMs) {
      const err = new Error('Cached/stale GPS fix rejected. Acquire a fresh live GPS reading at the workplace and retry.');
      err.statusCode = 400;
      err.errorCode = 'GPS_STALE';
      throw err;
    }
  }

  const { hubLat, hubLng, perimeterMeters, hubName } = resolveOrgGeofenceConfig(org, profile);

  if (Array.isArray(body?.coordsSamples) && body.coordsSamples.length >= 3) {
    const lats = [];
    const lngs = [];
    for (const s of body.coordsSamples) {
      const sLat = Number(s?.latitude);
      const sLng = Number(s?.longitude);
      validateLatLng(sLat, sLng, 'Multi-sample GPS anomaly');
      lats.push(sLat);
      lngs.push(sLng);
    }
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spreadMeters = calculateHaversineDistanceMeters(minLat, minLng, maxLat, maxLng);
    if (spreadMeters > Math.max(200, perimeterMeters)) {
      const err = new Error(`GPS spoofing/drift anomaly detected (${spreadMeters}m jump across samples). Hold steady on site and retry.`);
      err.statusCode = 400;
      err.errorCode = 'GPS_ANOMALY_SPREAD';
      throw err;
    }
    lats.sort((a, b) => a - b);
    lngs.sort((a, b) => a - b);
    effectiveLat = lats[Math.floor(lats.length / 2)];
    effectiveLng = lngs[Math.floor(lngs.length / 2)];
  }

  const distanceMeters = calculateHaversineDistanceMeters(effectiveLat, effectiveLng, hubLat, hubLng);
  if (distanceMeters > perimeterMeters) {
    const distStr = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters}m`;
    const err = new Error(`Location check failed: you are ${distStr} outside ${hubName} (allowed radius: ${perimeterMeters}m). You must be physically on site to ${actionLabel}.`);
    err.statusCode = 403;
    err.errorCode = 'OUTSIDE_GEOFENCE';
    err.distanceMeters = distanceMeters;
    err.perimeterMeters = perimeterMeters;
    err.hubName = hubName;
    throw err;
  }

  return {
    effectiveLat,
    effectiveLng,
    accuracy,
    distanceMeters,
    perimeterMeters,
    hubName,
    capturedAt: rawTs ? new Date(typeof rawTs === 'number' ? rawTs : Date.parse(rawTs)).toISOString() : new Date().toISOString(),
    verificationDetails: `Strict GPS Verified (${distanceMeters}m from ${hubName})`
  };
}

export function applyAutoShiftEndClosure(entry, scheduledEndMs, options = {}) {
  const endMs = Number(scheduledEndMs);
  entry.clockedOutAt = new Date(endMs).toISOString();
  entry.clockOutVerificationMode = 'auto_shift_end';

  const isCardScan = entry.verificationMode === 'colleague_card_scan';
  const gpsVerifiedAtClose = Boolean(options.gpsVerifiedAtClose);
  const offSiteAtClose = Boolean(options.offSiteAtClose);

  if (isCardScan) {
    entry.clockOutVerificationMode = 'auto_shift_end_unverified_card';
    entry.presenceVerificationStatus = 'pending_supervisor_confirm';
    entry.attendanceIntegrityFlag = 'CARD_AUTO_OUT_NO_EXIT_SCAN';
    entry.clockOutDetails = 'Auto Clock-Out at Shift End (No On-Site Card Exit Scan · Supervisor Confirm Required)';
  } else if (gpsVerifiedAtClose) {
    entry.clockOutGeofenceStatus = 'within_geofence';
    entry.presenceVerificationStatus = 'verified_on_site_shift_end';
    entry.clockOutDetails = options.gpsDetails || 'Auto Clock-Out Verified On-Site at Scheduled Shift End';
  } else {
    entry.clockOutGeofenceStatus = offSiteAtClose ? 'outside_geofence_auto_out' : 'unverified_auto_out';
    entry.presenceVerificationStatus = 'pending_supervisor_confirm';
    entry.attendanceIntegrityFlag = offSiteAtClose ? 'AUTO_OUT_OFFSITE_DETECTED' : 'AUTO_OUT_NO_EXIT_GPS';
    entry.clockOutDetails = offSiteAtClose
      ? 'Auto Clock-Out at Shift End (Device Detected Outside Perimeter · Review Required)'
      : 'Auto Clock-Out at Scheduled Shift End (Exit GPS Unverified · Review Required)';
  }
  return entry;
}
