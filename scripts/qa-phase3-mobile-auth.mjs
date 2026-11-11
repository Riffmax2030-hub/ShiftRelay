import { chromium } from 'playwright';

const BASE = 'http://localhost:4000';
const ART = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb';

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. Desktop Admin Login Capture + Zero-Secret DOM Inspection ──
  const admCtx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const admPage = await admCtx.newPage();
  await admPage.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
  await admPage.waitForFunction(() => {
    const s = document.getElementById('adm-sso-status');
    return s && !s.textContent.includes('Checking corporate');
  }, null, { timeout: 10000 });
  const admEmailVal = await admPage.inputValue('#adm-email-input');
  const admPwdVal = await admPage.inputValue('#adm-password-input');
  const hasLegacyPasscode = await admPage.locator('#adm-passcode-input').count();
  console.log('[ADMIN] Email prefill:', admEmailVal || 'EMPTY', '| Password prefill:', admPwdVal ? 'PRESENT' : 'EMPTY', '| Legacy passcode input count:', hasLegacyPasscode);
  await admPage.screenshot({ path: `${ART}/admin-login-current.png` });
  await admCtx.close();

  // ── 2. Mobile Viewport (390x844) QA ─────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // A. Test Executive Onboarding Flow (?companyId=RIF-2026&onboard=true) or fallback URL
  await page.goto(BASE + '/?companyId=RIF-2026&email=sherif@riffmax.tech&onboard=executive', { waitUntil: 'load' });
  await page.waitForTimeout(800);

  // Open Login Sheet and inspect Layer 1 Company Lookup + Layer 2/3 real sign-in
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const signInSheetVisible = await page.locator('#sr-login-modal').evaluate(el => getComputedStyle(el).display !== 'none' || el.classList.contains('open'));
  console.log('[AUTH] Login entry loaded, sheet visible:', signInSheetVisible);

  // Test company lookup API directly in page context
  const lookupRes = await page.evaluate(async () => {
    const r = await fetch('/api/auth/company-lookup?code=246701');
    return { status: r.status, data: await r.json() };
  });
  console.log('[AUTH] Company lookup 246701:', lookupRes.status, lookupRes.data?.found, lookupRes.data?.company?.tradingName);

  // Test real executive onboard + sign-in flow via API/session cookie
  const onboardRes = await page.evaluate(async () => {
    const r = await fetch('/api/auth/executive-onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: '246701',
        email: 'exec-qa@riffmax.tech',
        fullName: 'QA Executive',
        password: 'TestExec#2026',
        confirmPassword: 'TestExec#2026',
        governanceAccepted: true
      })
    });
    return { status: r.status, body: await r.json() };
  });
  console.log('[AUTH] POST /api/auth/executive-onboard:', onboardRes.status, onboardRes.body?.user?.role);

  const signInRes = await page.evaluate(async () => {
    const r = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: '246701',
        email: 'exec-qa@riffmax.tech',
        password: 'TestExec#2026'
      })
    });
    return { status: r.status, ok: r.ok };
  });
  console.log('[AUTH] POST /api/auth/sign-in:', signInRes.status, signInRes.ok);

  // B. Mobile UI Overflow + CV Edit/Delete Audit
  const checkOverflow = async (label) => {
    const res = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const area = document.getElementById('sr-content-area');
      const areaW = area ? area.scrollWidth : docW;
      return { winW, docW, areaW, overflowPx: Math.max(0, docW - winW) };
    });
    console.log(`[MOBILE ${label}] win=${res.winW}px doc=${res.docW}px area=${res.areaW}px overflow=${res.overflowPx}px`);
    return res;
  };

  // Switch to Worker Babatunde for mobile worker views + CV Edit/Delete test
  await page.evaluate(async () => {
    const worker = {
      id: '00000000-0000-4000-8000-000000000003',
      role: 'worker',
      name: 'Babatunde Adeleke',
      email: 'babatunde@riffmax.tech',
      title: 'Lead Frontend Architect',
      department: 'Frontend Engineering',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701'
    };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(worker));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(worker));
    document.getElementById('sr-login-modal')?.classList.remove('open');
    const entry = document.getElementById('sr-entry');
    if (entry) entry.style.display = 'none';
    await window.Phase1Shell.mount('me');
  });
  await page.waitForTimeout(800);
  await checkOverflow('me');
  await page.screenshot({ path: `${ART}/mobile-cv-profile.png`, fullPage: true });

  // Test CV EDIT + DELETE + SKILL REMOVE on Profile page
  // 1) Skill chip removal (×) on 'Root Cause Analysis' if present, or add temp skill and remove it
  const tempSkill = 'Hazmat Audit QA';
  await page.fill('#sr-skill-typeahead', tempSkill);
  await page.waitForTimeout(150);
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/skills') && r.request().method() === 'PUT'),
    page.press('#sr-skill-typeahead', 'Enter')
  ]);
  const removeBtn = page.locator(`.sr-cv-skill-tag[data-skill="${tempSkill}"] .sr-skill-remove`);
  const [skillRemRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/skills') && r.request().method() === 'PUT'),
    removeBtn.click()
  ]);
  const skillStillVisible = await page.locator(`.sr-cv-skill-tag[data-skill="${tempSkill}"]`).count();
  console.log(`[CV SKILL REMOVE] PUT status=${skillRemRes.status()}, removedFromDOM=${skillStillVisible === 0}`);

  // 2) Edit first Experience inline + Save (PATCH /api/profile/experience) + then Add & Delete a temp Experience
  const firstExpEditBtn = page.locator('#sr-cv-experience-list [data-exp-edit]').first();
  const firstExpId = await firstExpEditBtn.getAttribute('data-exp-edit');
  await firstExpEditBtn.click();
  await page.waitForTimeout(200);
  const expForm = page.locator(`#sr-exp-edit-${firstExpId}`);
  const origExpTitle = await expForm.locator('input[name="title"]').inputValue();
  const editedTitle = origExpTitle.includes('(Verified)') ? origExpTitle : origExpTitle + ' (Verified)';
  await expForm.locator('input[name="title"]').fill(editedTitle);
  const [expPatchRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/experience') && r.request().method() === 'PATCH'),
    expForm.locator('.sr-cv-exp-save').click()
  ]);
  console.log(`[CV EXP EDIT] id=${firstExpId} PATCH status=${expPatchRes.status()}`);

  // Add & Delete temp Certification (POST -> Edit PATCH -> Delete DELETE)
  await page.click('#sr-btn-add-cert');
  await page.fill('#sr-new-cert-name', 'Temp QA Cert');
  await page.fill('#sr-new-cert-issuer', 'QA Board');
  await page.fill('#sr-new-cert-year', '2026');
  const [certPostRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/certifications') && r.request().method() === 'POST'),
    page.click('#sr-new-cert-save')
  ]);
  const certPostData = await certPostRes.json();
  const tempCertId = certPostData.id;

  await page.click(`[data-cert-edit="${tempCertId}"]`);
  const certForm = page.locator(`#sr-cert-edit-${tempCertId}`);
  await certForm.locator('input[name="cert-name"]').fill('Temp QA Cert Updated');
  const [certPatchRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/certifications') && r.request().method() === 'PATCH'),
    certForm.locator('.sr-cert-save').click()
  ]);

  page.once('dialog', d => d.accept());
  await page.click(`[data-cert-edit="${tempCertId}"]`);
  const [certDelRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/certifications/') && r.request().method() === 'DELETE'),
    certForm.locator('.sr-cert-delete').click()
  ]);
  const certCountAfterDel = await page.locator(`[data-cert-id="${tempCertId}"]`).count();
  console.log(`[CV CERT LIFECYCLE] POST=${certPostRes.status()} PATCH=${certPatchRes.status()} DELETE=${certDelRes.status()} removed=${certCountAfterDel === 0}`);

  // Test Education Edit & Delete on temp entry
  await page.click('#sr-btn-add-edu');
  await page.fill('#sr-new-edu-degree', 'Temp QA Diploma');
  await page.fill('#sr-new-edu-institution', 'QA Polytechnic');
  await page.fill('#sr-new-edu-year', '2025');
  const [eduPostRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/education') && r.request().method() === 'POST'),
    page.click('#sr-new-edu-save')
  ]);
  const eduPostData = await eduPostRes.json();
  const tempEduId = eduPostData.id;
  await page.click(`[data-edu-edit="${tempEduId}"]`);
  const eduForm = page.locator(`#sr-edu-edit-${tempEduId}`);
  await eduForm.locator('input[name="edu-name"]').fill('Temp QA Diploma v2');
  const [eduPatchRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/education') && r.request().method() === 'PATCH'),
    eduForm.locator('.sr-edu-save').click()
  ]);
  page.once('dialog', d => d.accept());
  await page.click(`[data-edu-edit="${tempEduId}"]`);
  const [eduDelRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/education/') && r.request().method() === 'DELETE'),
    eduForm.locator('.sr-edu-delete').click()
  ]);
  const eduCountAfterDel = await page.locator(`[data-edu-id="${tempEduId}"]`).count();
  console.log(`[CV EDU LIFECYCLE] POST=${eduPostRes.status()} PATCH=${eduPatchRes.status()} DELETE=${eduDelRes.status()} removed=${eduCountAfterDel === 0}`);

  // Mobile Rewards + Payslip + Supervisor Approvals + Executive Payroll screenshots & overflow checks
  await page.evaluate(() => window.Phase1Shell.mount('rewards'));
  await page.waitForTimeout(700);
  await checkOverflow('rewards');
  await page.screenshot({ path: `${ART}/mobile-rewards-center.png` });

  await page.evaluate(() => window.Phase1Shell.mount('earnings'));
  await page.waitForTimeout(700);
  await checkOverflow('earnings');

  await page.evaluate(async () => {
    const sup = { id: '00000000-0000-4000-8000-000000000002', role: 'supervisor', name: 'Kelechi Nnamdi', organisation_name: 'Riffmax Technology Limited', company_id: '246701' };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(sup));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(sup));
    await window.Phase1Shell.mount('approvals');
  });
  await page.waitForTimeout(700);
  await checkOverflow('approvals');
  await page.screenshot({ path: `${ART}/mobile-approvals.png` });

  await page.evaluate(async () => {
    const exec = { id: '00000000-0000-4000-8000-000000000001', role: 'owner', name: 'Olaide Emmanuela', organisation_name: 'Riffmax Technology Limited', company_id: '246701' };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(exec));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(exec));
    await window.Phase1Shell.mount('payroll');
  });
  await page.waitForTimeout(800);
  await checkOverflow('payroll');
  await page.screenshot({ path: `${ART}/mobile-executive-payroll.png` });

  console.log('Total Mobile QA pageErrors:', pageErrors.length, pageErrors);
  await ctx.close();
  await browser.close();
}

run().catch(e => {
  console.error('QA SCRIPT FAILED:', e);
  process.exit(1);
});
