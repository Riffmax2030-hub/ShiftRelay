import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { generateTotpCode } from '../admin-auth.mjs';

const BASE = 'http://localhost:4000';
const ART = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb';
const DEV_PASS = 'ShiftRelay!DevOps2026';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('response', res => {
    if (res.url().includes('/api/admin/') && res.status() >= 400) {
      console.log('[HTTP ERR]', res.status(), res.url());
    }
  });

  try {
    // 1. Pre-auth backend contract verification
    const statusRes = await page.request.get(`${BASE}/api/admin/auth/status`);
    assert.equal(statusRes.status(), 200, 'Expected 200 on /api/admin/auth/status');
    const statusJson = await statusRes.json();
    assert.equal(statusJson.mfaSupported, true, 'Expected mfaSupported=true');

    const legacyRes = await page.request.post(`${BASE}/api/admin/auth`, { data: { key: 'ShiftRelay@Admin2026!' } });
    assert.equal(legacyRes.status(), 410, 'Legacy /api/admin/auth must return 410 Gone');

    const unauthOv = await page.request.get(`${BASE}/api/admin/overview`);
    assert.equal(unauthOv.status(), 401, 'Unauthenticated /api/admin/overview must return 401');
    console.log('[1/7] Backend pre-auth gates OK (status=200, legacy=410, unauth overview=401)');

    // 2. DOM zero-secret inspection & Enterprise login screenshot
    await page.goto(`${BASE}/admin.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const s = document.getElementById('adm-sso-status');
      return s && !s.textContent.includes('Checking corporate');
    }, null, { timeout: 10000 });
    const emailPrefill = await page.inputValue('#adm-email-input');
    const passPrefill = await page.inputValue('#adm-password-input');
    const legacyInputCount = await page.locator('#adm-passcode-input').count();
    const domText = await page.locator('body').innerText();
    assert.equal(emailPrefill, '', 'Email input must start empty');
    assert.equal(passPrefill, '', 'Password input must start empty');
    assert.equal(legacyInputCount, 0, 'Legacy passcode input must be removed');
    assert.ok(!domText.includes('ShiftRelay@Admin2026!'), 'Hardcoded passcode must never appear in DOM');
    assert.ok(!domText.includes(DEV_PASS), 'Dev password must never appear in DOM');
    await page.screenshot({ path: `${ART}/admin-login-enterprise.png` });
    console.log('[2/7] Enterprise login DOM verified zero-secret & screenshot saved');

    // 3. Sign in as partitioned onboarding_admin (Adaeze) & verify RBAC 403 + HttpOnly cookie
    await page.fill('#adm-email-input', 'adaeze@shiftrelay.com');
    await page.fill('#adm-password-input', DEV_PASS);
    await page.click('#adm-login-submit');
    await page.waitForSelector('#console-root.active', { timeout: 8000 });

    const lockedText = await page.textContent('#adm-locked-role-chip');
    assert.ok(lockedText.includes('ONBOARDING_ADMIN'), `Expected locked role chip for onboarding_admin, got: ${lockedText}`);
    const previewDisplay = await page.locator('#adm-owner-preview-bar').evaluate(el => getComputedStyle(el).display);
    assert.equal(previewDisplay, 'none', 'Preview switcher must stay hidden for non-owner admin');

    const jsCookies = await page.evaluate(() => document.cookie);
    assert.ok(!jsCookies.includes('sr_admin_sid'), 'sr_admin_sid cookie must be HttpOnly and hidden from document.cookie');

    const rbacChecks = await page.evaluate(async () => {
      const s = await fetch('/api/admin/staff', { credentials: 'same-origin' });
      const a = await fetch('/api/admin/audit-logs', { credentials: 'same-origin' });
      const d = await fetch('/api/admin/approvals/APPR-901/decide', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVED' })
      });
      return { staff: s.status, audit: a.status, decide: d.status };
    });
    assert.equal(rbacChecks.staff, 403, 'onboarding_admin must get 403 on /api/admin/staff');
    assert.equal(rbacChecks.audit, 403, 'onboarding_admin must get 403 on /api/admin/audit-logs');
    assert.equal(rbacChecks.decide, 403, 'onboarding_admin must get 403 on /api/admin/approvals/:id/decide');

    await page.click('[data-view="owner-vault"]');
    const restrictedVisible = await page.locator('#owner-restricted-banner').isVisible();
    const vaultUnlockedVisible = await page.locator('#owner-vault-unlocked').isVisible();
    assert.equal(restrictedVisible, true, 'Owner Vault restricted banner must be visible to onboarding_admin');
    assert.equal(vaultUnlockedVisible, false, 'Owner Vault unlocked must remain hidden from onboarding_admin');

    await page.click('button[onclick*="logoutAdminConsole"]');
    await page.waitForSelector('#adm-login-form', { state: 'visible', timeout: 5000 });
    console.log('[3/7] Partitioned RBAC (403 checks, HttpOnly cookie, locked Vault UI) verified');

    // 4. Sign in as owner_root & inspect Owner Vault, Staff, Audit Trail
    await page.fill('#adm-email-input', 'owner@shiftrelay.com');
    await page.fill('#adm-password-input', DEV_PASS);
    await page.click('#adm-login-submit');
    await page.waitForSelector('#console-root.active', { timeout: 8000 });
    await page.waitForTimeout(500);

    const previewOwnerDisplay = await page.locator('#adm-owner-preview-bar').evaluate(el => getComputedStyle(el).display);
    assert.notEqual(previewOwnerDisplay, 'none', 'Owner preview switcher should be visible to owner_root');

    await page.click('[data-view="owner-vault"]');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#owner-vault-unlocked').isVisible(), true, 'Owner Vault unlocked must be visible to owner_root');
    const staffRows = await page.locator('#owner-staff-tbody tr').count();
    const approvalRows = await page.locator('#owner-approval-tbody tr').count();
    const auditRows = await page.locator('#owner-audit-tbody tr').count();
    assert.ok(staffRows >= 4, `Expected >=4 admin staff rows, got ${staffRows}`);
    assert.ok(approvalRows >= 1, `Expected >=1 approval rows, got ${approvalRows}`);
    assert.ok(auditRows >= 2, `Expected >=2 audit log rows, got ${auditRows}`);

    // Create a QA admin user via backend API while signed in as owner_root
    const uniqueEmail = `qa-mfa-${Date.now()}@shiftrelay.com`;
    const createStaff = await page.evaluate(async (email) => {
      const r = await fetch('/api/admin/staff', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'QA Security Tester', email, role: 'ops_support_admin' })
      });
      return { status: r.status, body: await r.json() };
    }, uniqueEmail);
    assert.equal(createStaff.status, 201, `Expected 201 creating QA admin staff, got ${createStaff.status}`);
    const qaTempPass = createStaff.body.temporaryPassword;
    assert.ok(qaTempPass && qaTempPass.length >= 12, 'Expected server-generated temporaryPassword for new staff');

    await page.evaluate(() => window.refreshAuditLogs && window.refreshAuditLogs());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${ART}/admin-owner-vault-audit.png`, fullPage: false });
    console.log('[4/7] Owner Root Vault verified (staff=' + staffRows + ', approvals=' + approvalRows + ', audits=' + auditRows + ')');

    await page.click('button[onclick*="logoutAdminConsole"]');
    await page.waitForSelector('#adm-login-form', { state: 'visible', timeout: 5000 });

    // 5. Sign in as QA user, enroll RFC-6238 TOTP MFA, test Step-2 MFA Challenge
    await page.fill('#adm-email-input', uniqueEmail);
    await page.fill('#adm-password-input', qaTempPass);
    await page.click('#adm-login-submit');
    await page.waitForSelector('#console-root.active', { timeout: 8000 });

    await page.click('#sec-btn-mfa-setup');
    await page.waitForSelector('#sec-mfa-enroll-box', { state: 'visible', timeout: 5000 });
    const totpSecret = (await page.textContent('#sec-mfa-secret')).trim();
    assert.ok(totpSecret.length >= 16, 'Expected Base32 TOTP secret during enrollment');

    const enrollCode = generateTotpCode(totpSecret);
    await page.fill('#sec-mfa-verify-code', enrollCode);
    await page.click('button[onclick*="confirmMfaEnrollment"]');
    await page.waitForFunction(() => document.getElementById('sec-mfa-badge')?.textContent?.includes('ACTIVE'), null, { timeout: 5000 });
    console.log('[5/7] 2FA TOTP enrollment + verification succeeded');

    await page.click('button[onclick*="logoutAdminConsole"]');
    await page.waitForSelector('#adm-login-form', { state: 'visible', timeout: 5000 });

    // Sign back in -> must trigger Step-2 MFA challenge
    await page.fill('#adm-email-input', uniqueEmail);
    await page.fill('#adm-password-input', qaTempPass);
    await page.click('#adm-login-submit');
    await page.waitForSelector('#adm-mfa-form', { state: 'visible', timeout: 5000 });

    // Wrong 6-digit code
    const badCode = enrollCode === '000000' ? '111111' : '000000';
    await page.fill('#adm-mfa-code', badCode);
    await page.click('#adm-mfa-form button[type="submit"]');
    await page.waitForSelector('#adm-mfa-err', { state: 'visible', timeout: 5000 });

    // Real TOTP code
    const challengeCode = generateTotpCode(totpSecret);
    await page.fill('#adm-mfa-code', challengeCode);
    await page.click('#adm-mfa-form button[type="submit"]');
    await page.waitForSelector('#console-root.active', { timeout: 8000 });
    console.log('[6/7] Step-2 TOTP MFA Challenge verified (bad code blocked, real TOTP unlocked)');

    await page.click('button[onclick*="logoutAdminConsole"]');
    await page.waitForSelector('#adm-login-form', { state: 'visible', timeout: 5000 });

    // 6. Test brute-force lockout (5 wrong attempts -> 429) on disposable QA account
    let gotLockout = false;
    for (let i = 0; i < 6; i++) {
      const r = await page.request.post(`${BASE}/api/admin/auth/login`, {
        data: { email: uniqueEmail, password: 'WrongPassword#999' }
      });
      if (r.status() === 429) {
        gotLockout = true;
        break;
      }
    }
    assert.equal(gotLockout, true, 'Expected HTTP 429 lockout after repeated failed admin logins');
    console.log('[7/7] Brute-force lockout (HTTP 429) verified cleanly');

    assert.equal(pageErrors.length, 0, `Unexpected browser pageErrors: ${JSON.stringify(pageErrors)}`);
    console.log('ALL ENTERPRISE ADMIN AUTH CHECKS PASSED | pageErrors=0');
  } catch (err) {
    const loginErr = await page.textContent('#adm-login-err').catch(() => '');
    const mfaErr = await page.textContent('#adm-mfa-err').catch(() => '');
    console.error('DEBUG UI STATE:', { loginErr, mfaErr, pageErrors, consoleErrors });
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('QA FAILED:', err);
  process.exit(1);
});
