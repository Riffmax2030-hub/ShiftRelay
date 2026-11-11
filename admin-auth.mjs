import crypto, { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { query } from './database.mjs';

const scrypt = promisify(scryptCallback);

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SESSION_COOKIE_NAME = 'sr_admin_sid';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;
const MFA_CHALLENGE_MS = 5 * 60 * 1000;

export const ADMIN_ROLE_DEFS = {
  owner_root: {
    badge: 'OWNER ROOT',
    title: 'FOUNDER / SOVEREIGN OWNER (ROOT ACCESS)',
    desc: 'Full authority over Admin Governance, Master Approvals, SaaS Treasury, and Audit Logs.',
    modules: 'Full Platform Control + Approvals + Treasury + Security Vault',
    restriction: 'None (Root Authority)'
  },
  onboarding_admin: {
    badge: 'DEPT 01 // ONBOARDING',
    title: 'TENANT ONBOARDING ADMIN (PARTITIONED)',
    desc: 'Authorized for Enterprise Tenant Onboarding, Bulk CSV Roster Imports, and Gate QR/NFC.',
    modules: 'Tenant Onboarding Wizard + Bulk CSV Import + Gate Posters',
    restriction: 'Blocked from Owner Vault, Staff Governance & Audit Logs'
  },
  ops_support_admin: {
    badge: 'DEPT 02 // SUPPORT',
    title: 'OPERATIONS SUPPORT & RECTIFICATION ADMIN (PARTITIONED)',
    desc: 'Authorized for Rectification Receipts, Inbound Leads, and Email Auto-Station.',
    modules: 'Rectification Receipts + Email Station + Inbound Leads',
    restriction: 'Escalations route to Owner Root; Blocked from Tenant/Vault Control'
  },
  finance_admin: {
    badge: 'DEPT 03 // FINANCE',
    title: 'STATUTORY FINANCE AUDITOR (PARTITIONED)',
    desc: 'Authorized for Payroll Runs, PenCom/PAYE Statutory Schedules, and Audit Exports.',
    modules: 'Statutory Payroll Audit + PenCom/PAYE CSV Exports',
    restriction: 'Payout release requires Owner Root sign-off'
  }
};

export function hashToken(raw) {
  return createHash('sha256').update(String(raw || '')).digest('hex');
}

export async function hashAdminPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${Buffer.from(derived).toString('hex')}`;
}

export async function verifyAdminPassword(password, storedHash) {
  if (!storedHash || !String(storedHash).includes(':')) return false;
  const [salt, hex] = String(storedHash).split(':');
  if (!salt || !hex) return false;
  const actual = Buffer.from(await scrypt(String(password), salt, 64));
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ── RFC 6238 TOTP (HMAC-SHA1, 30s period, 6 digits) ────────────────────────
export function generateBase32Secret(byteLen = 20) {
  const bytes = randomBytes(byteLen);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function decodeBase32(secret) {
  const clean = String(secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret, stepOffset = 0, timestampMs = Date.now()) {
  const key = decodeBase32(secret);
  const counter = Math.floor(timestampMs / 1000 / 30) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(codeInt % 1000000).padStart(6, '0');
}

export function verifyTotpCode(secret, code, windowSteps = 1) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean) || !secret) return false;
  const providedBuf = Buffer.from(clean, 'utf8');
  const now = Date.now();
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const expected = generateTotpCode(secret, offset, now);
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf)) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri({ email, secret, issuer = 'ShiftRelay Admin' }) {
  const label = `${issuer}:${email}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ── Cookie & Request Metadata Helpers ────────────────────────────────────────
export function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function getUserAgent(req) {
  return String(req.headers['user-agent'] || '').slice(0, 240);
}

export function extractAdminToken(req) {
  const cookieHeader = String(req.headers.cookie || '');
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)sr_admin_sid=([^;]+)/);
  if (cookieMatch && cookieMatch[1]) {
    try {
      return decodeURIComponent(cookieMatch[1].trim());
    } catch {
      return cookieMatch[1].trim();
    }
  }
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) {
    const tok = auth.slice(7).trim();
    if (tok && tok.startsWith('sr-adm-')) return tok;
  }
  return null;
}

export function adminSessionCookie(rawToken, isProduction = false) {
  const secure = isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}; HttpOnly; Path=/; Max-Age=${Math.floor(SESSION_MAX_MS / 1000)}; SameSite=Strict${secure}`;
}

export function clearAdminSessionCookie(isProduction = false) {
  const secure = isProduction ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure}`;
}

// ── Initial Enterprise Staff Seed (Hashed Passwords Only) ───────────────────
const DEFAULT_BOOTSTRAP_ACCOUNTS = [
  {
    id: '00000000-0000-4000-8000-00000000a001',
    email: 'owner@shiftrelay.com',
    fullName: 'Founder / Sovereign Owner',
    role: 'owner_root',
    title: 'Chief Executive & Root Security Officer',
    department: 'Executive Sovereignty'
  },
  {
    id: '00000000-0000-4000-8000-00000000a002',
    email: 'adaeze@shiftrelay.com',
    fullName: 'Adaeze Obi',
    role: 'onboarding_admin',
    title: 'Enterprise Onboarding Lead',
    department: 'Client Implementation'
  },
  {
    id: '00000000-0000-4000-8000-00000000a003',
    email: 'tunde@shiftrelay.com',
    fullName: 'Tunde Bakare',
    role: 'ops_support_admin',
    title: 'Operations Support & Rectification Officer',
    department: 'Support Desk'
  },
  {
    id: '00000000-0000-4000-8000-00000000a004',
    email: 'chukwudi@shiftrelay.com',
    fullName: 'Chukwudi Eze',
    role: 'finance_admin',
    title: 'Statutory Finance Auditor',
    department: 'Finance & Statutory Compliance'
  }
];

function getDefaultApprovalsSeed() {
  return [
    {
      id: 'APPR-901',
      requestedByName: 'Adaeze Obi (Onboarding)',
      summary: 'Approve Newly Provisioned Enterprise Tenant & Gate Tablet Key Activation',
      impact: 'New Enterprise Contract',
      status: 'PENDING OWNER SIGN-OFF',
      createdAt: new Date(Date.now() - 7200 * 1000).toISOString()
    },
    {
      id: 'APPR-902',
      requestedByName: 'Chukwudi Eze (Finance)',
      summary: 'Authorize Monthly Statutory PenCom (18%) & LIRS PAYE Schedule Release',
      impact: 'Treasury Payroll Verification',
      status: 'PENDING OWNER SIGN-OFF',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
    }
  ];
}

function getDefaultRectificationsSeed() {
  return [
    {
      id: 'SR-REC-482109',
      workerName: 'Kemi Adebayo',
      workerEmail: 'kemi.adebayo@dangote.com',
      category: 'Wrong Bank Account / PenCom RSA PIN',
      details: 'GTBank NUBAN digit typo and updated Stanbic IBTC RSA PIN for May statutory remittance.',
      status: 'ESCALATED TO OWNER VAULT',
      createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 72000 * 1000).toISOString()
    },
    {
      id: 'SR-REC-482990',
      workerName: 'Blessing Okafor',
      workerEmail: 'b.okafor@ekoatlantic.com',
      category: 'Missing or Incorrect Shift Hours',
      details: 'Completed 4hr coworker shift swap on Sunday; requesting attendance log sync before payday.',
      status: 'OPEN FOR SUPPORT AUDIT',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000).toISOString()
    }
  ];
}

export async function ensureAdminSeeded(store, databaseReady, isProduction = false) {
  const bootstrapPassword =
    process.env.SHIFTRELAY_ADMIN_BOOTSTRAP_PASS ||
    (isProduction ? '' : 'ShiftRelay!DevOps2026');

  if (databaseReady) {
    const existing = await query('SELECT count(*)::int AS cnt FROM admin_users');
    if ((existing.rows[0]?.cnt || 0) === 0) {
      if (!bootstrapPassword) {
        console.warn('[ADMIN INIT] No admin users exist and SHIFTRELAY_ADMIN_BOOTSTRAP_PASS is unset in production.');
      } else {
        const pwHash = await hashAdminPassword(bootstrapPassword);
        for (const acc of DEFAULT_BOOTSTRAP_ACCOUNTS) {
          const def = ADMIN_ROLE_DEFS[acc.role] || ADMIN_ROLE_DEFS.ops_support_admin;
          await query(
            `INSERT INTO admin_users (id, email, full_name, role, title, department, modules, restriction, password_hash, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE')
             ON CONFLICT (email) DO NOTHING`,
            [acc.id, acc.email, acc.fullName, acc.role, acc.title, acc.department, def.modules, def.restriction, pwHash]
          );
        }
        console.log('[ADMIN INIT] Seeded enterprise RBAC admin accounts in PostgreSQL.');
      }
    }

    const apCnt = await query('SELECT count(*)::int AS cnt FROM admin_approvals');
    if ((apCnt.rows[0]?.cnt || 0) === 0) {
      for (const ap of getDefaultApprovalsSeed()) {
        await query(
          `INSERT INTO admin_approvals (id, requested_by_name, summary, impact, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [ap.id, ap.requestedByName, ap.summary, ap.impact, ap.status, ap.createdAt]
        );
      }
    }

    const recCnt = await query('SELECT count(*)::int AS cnt FROM rectification_receipts');
    if ((recCnt.rows[0]?.cnt || 0) === 0) {
      for (const r of getDefaultRectificationsSeed()) {
        await query(
          `INSERT INTO rectification_receipts (id, worker_name, worker_email, category, details, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [r.id, r.workerName, r.workerEmail, r.category, r.details, r.status, r.createdAt, r.updatedAt]
        );
      }
    }
    return false;
  }

  let mutated = false;
  if (!Array.isArray(store.adminUsers) || store.adminUsers.length === 0) {
    if (bootstrapPassword) {
      const pwHash = await hashAdminPassword(bootstrapPassword);
      store.adminUsers = DEFAULT_BOOTSTRAP_ACCOUNTS.map((acc) => {
        const def = ADMIN_ROLE_DEFS[acc.role] || ADMIN_ROLE_DEFS.ops_support_admin;
        return {
          id: acc.id,
          email: acc.email,
          fullName: acc.fullName,
          role: acc.role,
          title: acc.title,
          department: acc.department,
          modules: def.modules,
          restriction: def.restriction,
          passwordHash: pwHash,
          mfaEnabled: false,
          mfaSecret: null,
          mfaRecoveryHashes: [],
          status: 'ACTIVE',
          failedAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          createdAt: new Date().toISOString()
        };
      });
      mutated = true;
    } else {
      store.adminUsers = [];
    }
  }
  if (!Array.isArray(store.adminSessions)) { store.adminSessions = []; mutated = true; }
  if (!Array.isArray(store.adminMfaChallenges)) { store.adminMfaChallenges = []; mutated = true; }
  if (!Array.isArray(store.adminAuditLogs)) { store.adminAuditLogs = []; mutated = true; }
  if (!Array.isArray(store.adminApprovals) || store.adminApprovals.length === 0) {
    store.adminApprovals = getDefaultApprovalsSeed();
    mutated = true;
  }
  if (!Array.isArray(store.rectificationReceipts) || store.rectificationReceipts.length === 0) {
    store.rectificationReceipts = getDefaultRectificationsSeed();
    mutated = true;
  }
  return mutated;
}

// ── Repository Functions (DB-first, store fallback) ──────────────────────────
export function sanitizeAdminUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name || u.fullName,
    role: u.role,
    title: u.title || '',
    department: u.department || '',
    modules: u.modules || (ADMIN_ROLE_DEFS[u.role]?.modules || ''),
    restriction: u.restriction || (ADMIN_ROLE_DEFS[u.role]?.restriction || ''),
    mfaEnabled: Boolean(u.mfa_enabled ?? u.mfaEnabled),
    status: u.status || 'ACTIVE',
    lastLoginAt: u.last_login_at || u.lastLoginAt || null,
    createdAt: u.created_at || u.createdAt || null
  };
}

export async function findAdminUserByEmail(email, store, databaseReady) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;
  if (databaseReady) {
    const res = await query('SELECT * FROM admin_users WHERE lower(email) = $1 LIMIT 1', [cleanEmail]);
    return res.rows[0] || null;
  }
  return (store.adminUsers || []).find((u) => String(u.email || '').toLowerCase() === cleanEmail) || null;
}

export async function findAdminUserById(id, store, databaseReady) {
  if (!id) return null;
  if (databaseReady) {
    const res = await query('SELECT * FROM admin_users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }
  return (store.adminUsers || []).find((u) => u.id === id) || null;
}

export async function listAdminUsers(store, databaseReady) {
  if (databaseReady) {
    const res = await query('SELECT * FROM admin_users ORDER BY created_at ASC');
    return res.rows.map(sanitizeAdminUser);
  }
  return (store.adminUsers || []).map(sanitizeAdminUser);
}

export async function appendAdminAuditLog({
  store,
  databaseReady,
  actorId = null,
  actorEmail = 'anonymous',
  actorRole = 'unauthenticated',
  eventType,
  targetType = null,
  targetId = null,
  ipAddress = 'unknown',
  userAgent = '',
  outcome = 'SUCCESS',
  details = {}
}) {
  if (databaseReady) {
    await query(
      `INSERT INTO admin_audit_logs (actor_admin_id, actor_email, actor_role, event_type, target_type, target_id, ip_address, user_agent, outcome, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [actorId, actorEmail, actorRole, eventType, targetType, targetId ? String(targetId) : null, ipAddress, userAgent, outcome, JSON.stringify(details || {})]
    );
    return;
  }
  if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
  store.adminAuditLogs.unshift({
    id: crypto.randomUUID(),
    actorAdminId: actorId,
    actorEmail,
    actorRole,
    eventType,
    targetType,
    targetId: targetId ? String(targetId) : null,
    ipAddress,
    userAgent,
    outcome,
    details: details || {},
    createdAt: new Date().toISOString()
  });
  if (store.adminAuditLogs.length > 500) store.adminAuditLogs.length = 500;
}

export async function recordFailedAdminAttempt(adminUser, store, databaseReady) {
  const nextCount = Number(adminUser.failed_attempts ?? adminUser.failedAttempts ?? 0) + 1;
  const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null;
  if (databaseReady) {
    await query(
      'UPDATE admin_users SET failed_attempts = $1, locked_until = $2 WHERE id = $3',
      [nextCount, lockedUntil, adminUser.id]
    );
  } else {
    adminUser.failedAttempts = nextCount;
    if (lockedUntil) adminUser.lockedUntil = lockedUntil;
  }
  return { failedAttempts: nextCount, lockedUntil };
}

export async function resetAdminFailures(adminUser, store, databaseReady) {
  const nowIso = new Date().toISOString();
  if (databaseReady) {
    await query(
      'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = $1 WHERE id = $2',
      [nowIso, adminUser.id]
    );
  } else {
    adminUser.failedAttempts = 0;
    adminUser.lockedUntil = null;
    adminUser.lastLoginAt = nowIso;
  }
}

export async function createMfaChallenge(adminUserId, store, databaseReady) {
  const rawChallenge = 'sr-mfa-' + randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + MFA_CHALLENGE_MS).toISOString();
  const cHash = hashToken(rawChallenge);
  if (databaseReady) {
    await query(
      'INSERT INTO admin_mfa_challenges (challenge_id, admin_user_id, expires_at) VALUES ($1,$2,$3)',
      [cHash, adminUserId, expiresAt]
    );
  } else {
    if (!Array.isArray(store.adminMfaChallenges)) store.adminMfaChallenges = [];
    store.adminMfaChallenges.push({ challengeHash: cHash, adminUserId, expiresAt });
  }
  return rawChallenge;
}

export async function peekMfaChallenge(rawChallenge, store, databaseReady) {
  if (!rawChallenge) return null;
  const cHash = hashToken(rawChallenge);
  if (databaseReady) {
    const res = await query(
      'SELECT admin_user_id FROM admin_mfa_challenges WHERE challenge_id = $1 AND expires_at > NOW() LIMIT 1',
      [cHash]
    );
    return res.rows[0]?.admin_user_id || null;
  }
  const list = store.adminMfaChallenges || [];
  const item = list.find((c) => c.challengeHash === cHash && new Date(c.expiresAt) > new Date());
  return item ? item.adminUserId : null;
}

export async function consumeMfaChallenge(rawChallenge, store, databaseReady) {
  if (!rawChallenge) return null;
  const cHash = hashToken(rawChallenge);
  if (databaseReady) {
    const res = await query(
      'DELETE FROM admin_mfa_challenges WHERE challenge_id = $1 AND expires_at > NOW() RETURNING admin_user_id',
      [cHash]
    );
    return res.rows[0]?.admin_user_id || null;
  }
  const list = store.adminMfaChallenges || [];
  const idx = list.findIndex((c) => c.challengeHash === cHash && new Date(c.expiresAt) > new Date());
  if (idx === -1) return null;
  const [item] = list.splice(idx, 1);
  return item.adminUserId;
}

export async function createAdminSessionRecord({ adminUser, mfaVerified, req, store, databaseReady }) {
  const rawToken = 'sr-adm-' + randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_MAX_MS).toISOString();
  const idleExpiresAt = new Date(now + SESSION_IDLE_MS).toISOString();
  const ipAddress = getRequestIp(req);
  const userAgent = getUserAgent(req);

  if (databaseReady) {
    await query(
      `INSERT INTO admin_sessions (token_hash, admin_user_id, role, mfa_verified, ip_address, user_agent, expires_at, idle_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [tokenHash, adminUser.id, adminUser.role, Boolean(mfaVerified), ipAddress, userAgent, expiresAt, idleExpiresAt]
    );
  } else {
    if (!Array.isArray(store.adminSessions)) store.adminSessions = [];
    store.adminSessions.push({
      tokenHash,
      adminUserId: adminUser.id,
      role: adminUser.role,
      mfaVerified: Boolean(mfaVerified),
      ipAddress,
      userAgent,
      expiresAt,
      idleExpiresAt,
      revokedAt: null,
      createdAt: new Date(now).toISOString()
    });
  }
  return { rawToken, expiresAt, idleExpiresAt };
}

export async function authenticateAdminRequest(req, store, databaseReady) {
  const rawToken = extractAdminToken(req);
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const nextIdle = new Date(now.getTime() + SESSION_IDLE_MS).toISOString();

  if (databaseReady) {
    const res = await query(
      `SELECT s.*, u.email, u.full_name, u.title, u.department, u.mfa_enabled, u.status AS user_status
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.admin_user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND s.idle_expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    const row = res.rows[0];
    if (!row || row.user_status !== 'ACTIVE') return null;
    await query('UPDATE admin_sessions SET idle_expires_at = $1 WHERE token_hash = $2', [nextIdle, tokenHash]);
    return {
      tokenHash,
      adminUser: sanitizeAdminUser({
        id: row.admin_user_id,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        title: row.title,
        department: row.department,
        mfa_enabled: row.mfa_enabled,
        status: row.user_status
      }),
      role: row.role,
      mfaVerified: Boolean(row.mfa_verified)
    };
  }

  const sess = (store.adminSessions || []).find(
    (s) =>
      s.tokenHash === tokenHash &&
      !s.revokedAt &&
      new Date(s.expiresAt) > now &&
      new Date(s.idleExpiresAt) > now
  );
  if (!sess) return null;
  const user = (store.adminUsers || []).find((u) => u.id === sess.adminUserId);
  if (!user || user.status !== 'ACTIVE') return null;
  sess.idleExpiresAt = nextIdle;
  return {
    tokenHash,
    adminUser: sanitizeAdminUser(user),
    role: user.role,
    mfaVerified: Boolean(sess.mfaVerified)
  };
}

export async function revokeAdminSessionByToken(rawToken, store, databaseReady) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();
  if (databaseReady) {
    await query('UPDATE admin_sessions SET revoked_at = $1 WHERE token_hash = $2', [nowIso, tokenHash]);
  } else {
    for (const s of store.adminSessions || []) {
      if (s.tokenHash === tokenHash) s.revokedAt = nowIso;
    }
  }
}

export async function revokeAllSessionsForAdmin(targetUserId, store, databaseReady) {
  const nowIso = new Date().toISOString();
  if (databaseReady) {
    if (targetUserId) {
      await query('UPDATE admin_sessions SET revoked_at = $1 WHERE admin_user_id = $2 AND revoked_at IS NULL', [nowIso, targetUserId]);
    } else {
      await query('UPDATE admin_sessions SET revoked_at = $1 WHERE revoked_at IS NULL', [nowIso]);
    }
    return;
  }
  for (const s of store.adminSessions || []) {
    if (!targetUserId || s.adminUserId === targetUserId) s.revokedAt = nowIso;
  }
}

export async function listAuditLogs(limit, store, databaseReady) {
  const cap = Math.min(200, Math.max(10, Number(limit) || 100));
  if (databaseReady) {
    const res = await query(
      `SELECT id, actor_admin_id, actor_email, actor_role, event_type, target_type, target_id, ip_address, outcome, details, created_at
       FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1`,
      [cap]
    );
    return res.rows.map((r) => ({
      id: r.id,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      eventType: r.event_type,
      targetType: r.target_type,
      targetId: r.target_id,
      ipAddress: r.ip_address,
      outcome: r.outcome,
      details: r.details || {},
      createdAt: r.created_at
    }));
  }
  return (store.adminAuditLogs || []).slice(0, cap);
}

export async function listAdminApprovals(store, databaseReady) {
  if (databaseReady) {
    const res = await query('SELECT * FROM admin_approvals ORDER BY created_at DESC');
    return res.rows.map((r) => ({
      id: r.id,
      by: r.requested_by_name,
      summary: r.summary,
      impact: r.impact,
      status: r.status,
      decidedAt: r.decided_at,
      createdAt: r.created_at
    }));
  }
  return (store.adminApprovals || []).map((a) => ({
    id: a.id,
    by: a.requestedByName || a.by,
    summary: a.summary,
    impact: a.impact,
    status: a.status,
    decidedAt: a.decidedAt || null,
    createdAt: a.createdAt
  }));
}

export async function createAdminApproval({ requestedByName, requestedByAdminId = null, summary, impact }, store, databaseReady) {
  const id = 'APPR-' + Math.floor(1000 + Math.random() * 8999);
  const item = {
    id,
    requestedByAdminId,
    requestedByName,
    summary,
    impact: impact || 'Standard Admin Action',
    status: 'PENDING OWNER SIGN-OFF',
    decidedAt: null,
    createdAt: new Date().toISOString()
  };
  if (databaseReady) {
    await query(
      `INSERT INTO admin_approvals (id, requested_by_admin_id, requested_by_name, summary, impact, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [item.id, item.requestedByAdminId, item.requestedByName, item.summary, item.impact, item.status, item.createdAt]
    );
  } else {
    if (!Array.isArray(store.adminApprovals)) store.adminApprovals = [];
    store.adminApprovals.unshift(item);
  }
  return item;
}

export async function decideAdminApproval(approvalId, decision, ownerAdminId, store, databaseReady) {
  const nowIso = new Date().toISOString();
  if (databaseReady) {
    const res = await query(
      `UPDATE admin_approvals SET status = $1, decided_by_admin_id = $2, decided_at = $3
       WHERE id = $4 RETURNING *`,
      [decision, ownerAdminId, nowIso, approvalId]
    );
    return res.rows[0] || null;
  }
  const item = (store.adminApprovals || []).find((a) => a.id === approvalId);
  if (!item) return null;
  item.status = decision;
  item.decidedByAdminId = ownerAdminId;
  item.decidedAt = nowIso;
  return item;
}

export async function listRectifications(store, databaseReady) {
  if (databaseReady) {
    const res = await query('SELECT * FROM rectification_receipts ORDER BY created_at DESC');
    return res.rows.map((r) => ({
      id: r.id,
      name: r.worker_name,
      email: r.worker_email,
      category: r.category,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }
  return (store.rectificationReceipts || []).map((r) => ({
    id: r.id,
    name: r.workerName || r.name,
    email: r.workerEmail || r.email,
    category: r.category,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));
}

export async function updateRectificationStatus(recId, status, adminId, store, databaseReady) {
  const nowIso = new Date().toISOString();
  if (databaseReady) {
    const res = await query(
      `UPDATE rectification_receipts SET status = $1, updated_by_admin_id = $2, updated_at = $3
       WHERE id = $4 RETURNING *`,
      [status, adminId, nowIso, recId]
    );
    const r = res.rows[0];
    return r ? { id: r.id, name: r.worker_name, email: r.worker_email, category: r.category, details: r.details, status: r.status } : null;
  }
  const item = (store.rectificationReceipts || []).find((r) => r.id === recId);
  if (!item) return null;
  item.status = status;
  item.updatedAt = nowIso;
  return { id: item.id, name: item.workerName || item.name, email: item.workerEmail || item.email, category: item.category, details: item.details, status: item.status };
}
