import { chromium } from 'playwright';

const BASE = 'http://localhost:4000';

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();

  const findings = [];
  const consoleErrors = [];
  const pageErrors = [];
  const apiErrors = [];

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', async res => {
    const url = res.url();
    if (res.status() >= 400 && url.startsWith(BASE)) {
      let body = '';
      try { body = await res.text(); } catch {}
      apiErrors.push({ status: res.status(), url: url.replace(BASE, ''), body: body.slice(0, 150) });
    }
  });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const initCheck = await page.evaluate(() => ({
    hasShell: Boolean(window.Phase1Shell),
    hasMount: Boolean(window.Phase1Shell?.mount)
  }));
  console.log('Init check:', initCheck, 'Initial pageErrors:', pageErrors);
  if (!initCheck.hasShell) {
    await browser.close();
    process.exit(1);
  }

  const roles = [
    {
      label: 'Worker (Babatunde)',
      id: '00000000-0000-4000-8000-000000000003',
      role: 'worker',
      name: 'Babatunde Adeleke',
      email: 'babatunde@riffmax.tech',
      title: 'Lead Frontend Architect',
      department: 'Frontend Engineering',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701',
      views: ['today', 'handovers', 'schedule', 'earnings', 'rewards', 'timesheets', 'time-away', 'open-shifts', 'assistant', 'me', 'settings']
    },
    {
      label: 'Supervisor (Kelechi)',
      id: '00000000-0000-4000-8000-000000000002',
      role: 'supervisor',
      name: 'Kelechi Nnamdi',
      email: 'kelechi@riffmax.tech',
      title: 'Operations Supervisor',
      department: 'Production Floor A',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701',
      views: ['overview', 'handovers', 'schedule', 'approvals', 'team', 'timesheets', 'open-shifts', 'assistant', 'me', 'settings']
    },
    {
      label: 'Executive (Olaide)',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'owner',
      name: 'Olaide Emmanuela',
      email: 'olaide@riffmax.tech',
      title: 'Chief Operating Officer',
      department: 'Executive Management',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701',
      views: ['analytics', 'compliance', 'payroll', 'overview', 'team', 'settings', 'me']
    }
  ];

  pageErrors.length = 0;

  for (const r of roles) {
    console.log(`\n=== AUDITING ROLE: ${r.label} ===`);
    await page.evaluate((persona) => {
      localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(persona));
      localStorage.setItem('shiftrelay-user-data', JSON.stringify(persona));
      sessionStorage.setItem('shiftrelay-user', persona.id);
      if (window._srState) window._srState.user = persona;
      document.getElementById('sr-login-modal')?.classList.remove('open');
      const entry = document.getElementById('sr-entry');
      if (entry) entry.style.display = 'none';
    }, r);

    for (const v of r.views) {
      const prePageErr = pageErrors.length;
      await page.evaluate(async (view) => {
        await window.Phase1Shell.mount(view);
      }, v);
      await page.waitForTimeout(700);

      const domCheck = await page.evaluate(() => {
        const area = document.getElementById('sr-content-area') || document.body;
        const text = area.innerText || '';
        const htmlLen = area.innerHTML.length;
        const errorBanner = text.includes('Could not load') || text.includes('Cannot access') || text.includes('is not a function') || text.includes('ReferenceError');
        const badLines = text.split('\n').filter(l => /\b(undefined|NaN)\b/.test(l) || l.includes('Could not load') || l.includes('Cannot access'));
        return { htmlLen, emptyContent: htmlLen < 50, errorBanner, badLines, snippet: text.slice(0, 140).replace(/\s+/g, ' ') };
      });

      const newPageErrs = pageErrors.slice(prePageErr);
      const status = (domCheck.errorBanner || domCheck.emptyContent || newPageErrs.length || domCheck.badLines.length) ? 'ISSUE' : 'OK';
      console.log(`  [${status}] ${v} (html=${domCheck.htmlLen})`);
      if (status === 'ISSUE') {
        findings.push({ role: r.label, view: v, domCheck, newPageErrs });
        console.log('    DETAIL:', { domCheck, newPageErrs });
      }
    }
  }

  console.log('\n=== INTERACTIVE FLOWS & DB PERSISTENCE CHECK ===');

  // Test 1: Worker Today task toggle + add + persist on backend
  await page.evaluate(async () => {
    const worker = {
      id: '00000000-0000-4000-8000-000000000003',
      role: 'worker',
      name: 'Babatunde Adeleke',
      email: 'babatunde@riffmax.tech',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701'
    };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(worker));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(worker));
    localStorage.removeItem('sr_custom_tasks_246701_' + new Date().toISOString().slice(0, 10));
    await window.Phase1Shell.mount('today');
  });
  await page.waitForTimeout(800);

  const fabCount = await page.locator('#sr-btn-floating-ai').count();
  console.log('Work Assistant FAB (#sr-btn-floating-ai) count:', fabCount);

  // Toggle task via .sr-custom-check-box label
  const boxLabel = page.locator('.sr-custom-check-box').nth(1);
  const chkInput = page.locator('.sr-task-checkbox').nth(1);
  const beforeChecked = await chkInput.isChecked();
  const [toggleRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/shift-tasks/toggle')),
    boxLabel.click()
  ]);
  const afterChecked = await chkInput.isChecked();
  console.log(`Task checkbox toggled: ${beforeChecked} -> ${afterChecked}, API status: ${toggleRes.status()}`);

  // Add custom task and verify API POST
  const uniqueTask = 'Audit Fuel Pressure Gauge ' + Date.now();
  await page.fill('#sr-input-new-task', uniqueTask);
  const [addRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/shift-tasks/add')),
    page.click('#sr-form-add-task button[type="submit"]')
  ]);
  await page.waitForTimeout(500);
  const customTaskVisible = await page.locator(`text=${uniqueTask}`).count();
  console.log(`Added custom task visible: ${customTaskVisible > 0}, API status: ${addRes.status()}`);

  // Test 2: Worker Profile (CV Export + Edit Modals + Open Settings button)
  await page.evaluate(() => window.Phase1Shell.mount('me'));
  await page.waitForTimeout(800);

  const preMeErrs = pageErrors.length;
  await page.click('#sr-btn-export-cv');
  await page.waitForTimeout(200);
  await page.click('#sr-btn-edit-cv-modal');
  await page.waitForTimeout(200);
  const cvModalOpen = await page.locator('#sr-edit-cv-backdrop').count();
  await page.click('#sr-btn-close-cv');
  await page.waitForTimeout(200);
  await page.click('#sr-profile-settings-btn');
  await page.waitForTimeout(500);
  const inSettings = await page.locator('#sr-settings-industry-select').count();
  console.log(`Profile actions -> CV modal: ${cvModalOpen > 0}, Open Settings navigated: ${inSettings > 0}, new pageErrors: ${pageErrors.length - preMeErrs}`);
  if (pageErrors.length > preMeErrs) {
    findings.push({ view: 'me', type: 'PROFILE_INTERACTION_ERROR', err: pageErrors.slice(preMeErrs) });
  }

  // Test 3: Settings Theme + Industry Protocol Persistence (as Supervisor/Owner)
  await page.evaluate(async () => {
    const owner = {
      id: '00000000-0000-4000-8000-000000000001',
      role: 'owner',
      name: 'Olaide Emmanuela',
      email: 'olaide@riffmax.tech',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701'
    };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(owner));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(owner));
    await window.Phase1Shell.mount('settings');
  });
  await page.waitForTimeout(700);

  const [indRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/organisation/industry')),
    page.selectOption('#sr-settings-industry-select', 'logistics')
  ]);
  await page.waitForTimeout(400);
  console.log(`Industry selector API status: ${indRes.status()}, localStorage: ${await page.evaluate(() => localStorage.getItem('shiftrelay-company-industry'))}`);

  // Reset industry back to manufacturing cleanly
  await page.selectOption('#sr-settings-industry-select', 'manufacturing');
  await page.waitForTimeout(400);

  await page.click('#sr-settings-theme-toggle');
  await page.waitForTimeout(300);
  const themeVal = await page.evaluate(() => localStorage.getItem('shiftrelay-theme'));
  console.log('Theme key after toggle in settings (shiftrelay-theme):', themeVal);
  // Toggle back to daylight
  await page.click('#sr-settings-theme-toggle');

  // Test 4: Earnings 3-tab switcher
  await page.evaluate(() => window.Phase1Shell.mount('earnings'));
  await page.waitForTimeout(700);
  for (const tabBtn of ['#sr-btn-view-salaried', '#sr-btn-view-hourly', '#sr-btn-view-rewards-jump']) {
    const exists = await page.locator(tabBtn).count();
    console.log(`Earnings tab ${tabBtn}: ${exists > 0}`);
    if (exists > 0) await page.click(tabBtn);
  }

  // Test 5: Worker Handovers DB submission & Baton Acknowledge + Screenshot 02
  await page.evaluate(async () => {
    const worker = {
      id: '00000000-0000-4000-8000-000000000003',
      role: 'worker',
      name: 'Babatunde Adeleke',
      email: 'babatunde@riffmax.tech',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701'
    };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(worker));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(worker));
    await window.Phase1Shell.mount('today');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/02-worker-5tab-dashboard.png' });

  await page.evaluate(() => window.Phase1Shell.mount('handovers'));
  await page.waitForTimeout(700);
  const hoNote = 'Line 4 pressure nominal at ' + Date.now();
  await page.fill('#sr-quick-ho-note', hoNote);
  const [hoPostRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/handovers') && r.request().method() === 'POST'),
    page.click('#sr-btn-submit-quick-ho')
  ]);
  await page.waitForTimeout(500);
  const hoVisible = await page.locator(`text=${hoNote}`).count();
  console.log(`Handover submit POST status: ${hoPostRes.status()}, persisted note visible: ${hoVisible > 0}`);

  const ackBtnCount = await page.locator('#sr-btn-ack-baton').count();
  if (ackBtnCount > 0) {
    const [ackRes] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/handovers/') && r.url().includes('/acknowledge')),
      page.click('#sr-btn-ack-baton')
    ]);
    await page.waitForTimeout(400);
    console.log(`Handover baton acknowledge POST status: ${ackRes.status()}`);
  } else {
    console.log('Handover baton acknowledge button already acknowledged.');
  }

  // Test 6: Worker LinkedIn-Style Profile CV Sections Order + Inline Edit/Add/Persist
  await page.evaluate(() => window.Phase1Shell.mount('me'));
  await page.waitForTimeout(800);

  // Verify LinkedIn section order: Summary -> Skills -> Experience -> Education -> Certifications
  const sectionOrder = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.sr-cv-section')).map(s => s.id);
  });
  console.log('LinkedIn CV section order:', sectionOrder);

  // 1) Inline Summary Edit (PATCH /api/profile/cv)
  await page.click('#sr-cv-summary-content');
  await page.fill('#sr-cv-summary-content', 'Staff Shift Operations Lead with 7+ years driving zero lost-context transitions across regulated industrial plants.');
  const [cvSumRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/cv') && r.request().method() === 'PATCH'),
    page.click('#sr-summary-save')
  ]);
  console.log(`Inline Summary PATCH /api/profile/cv status: ${cvSumRes.status()}`);

  // 2) Skills Typeahead Add (PUT /api/profile/skills)
  await page.fill('#sr-skill-typeahead', 'Root Cause Analysis');
  await page.waitForTimeout(200);
  const [skillRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/skills') && r.request().method() === 'PUT'),
    page.press('#sr-skill-typeahead', 'Enter')
  ]);
  console.log(`Skills Typeahead PUT /api/profile/skills status: ${skillRes.status()}`);

  // 3) Add Experience (POST /api/profile/experience)
  await page.click('#sr-btn-add-experience');
  await page.fill('#sr-new-exp-title', 'Senior Shift Coordinator');
  await page.fill('#sr-new-exp-company', 'Riffmax Plant B');
  await page.fill('#sr-new-exp-period', '2024 – Present');
  await page.fill('#sr-new-exp-desc', 'Directed 18 frontline specialists across 3 shifts.');
  const [expAddRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/experience') && r.request().method() === 'POST'),
    page.click('#sr-new-exp-save')
  ]);
  console.log(`Add Experience POST /api/profile/experience status: ${expAddRes.status()}`);

  // 4) Add Education (POST /api/profile/education)
  await page.click('#sr-btn-add-edu');
  await page.fill('#sr-new-edu-degree', 'M.Sc. Industrial Engineering');
  await page.fill('#sr-new-edu-institution', 'Lagos Tech Institute');
  await page.fill('#sr-new-edu-year', '2024');
  const [eduAddRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/education') && r.request().method() === 'POST'),
    page.click('#sr-new-edu-save')
  ]);
  console.log(`Add Education POST /api/profile/education status: ${eduAddRes.status()}`);

  // 5) Add Certification (POST /api/profile/certifications)
  await page.click('#sr-btn-add-cert');
  await page.fill('#sr-new-cert-name', 'NEBOSH International Diploma');
  await page.fill('#sr-new-cert-issuer', 'NEBOSH UK');
  await page.fill('#sr-new-cert-year', '2025');
  const [certAddRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/profile/certifications') && r.request().method() === 'POST'),
    page.click('#sr-new-cert-save')
  ]);
  console.log(`Add Certification POST /api/profile/certifications status: ${certAddRes.status()}`);

  // Reload Profile from backend & verify all edited sections persisted in DOM
  await page.evaluate(() => window.Phase1Shell.mount('me'));
  await page.waitForTimeout(800);
  const persistedCV = await page.evaluate(() => {
    const txt = document.getElementById('sr-content-area')?.innerText || '';
    return {
      summary: txt.includes('zero lost-context transitions across regulated industrial plants'),
      skill: txt.includes('Root Cause Analysis'),
      experience: txt.includes('Senior Shift Coordinator'),
      education: txt.includes('M.Sc. Industrial Engineering'),
      certification: txt.includes('NEBOSH International Diploma')
    };
  });
  console.log('Reloaded Profile CV persistence check:', persistedCV);
  await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/10-worker-digital-id-profile.png', fullPage: true });

  // Test 7: Supervisor Approvals DB Sync (Swap review + Timecard verify)
  await page.evaluate(async () => {
    const sup = {
      id: '00000000-0000-4000-8000-000000000002',
      role: 'supervisor',
      name: 'Kelechi Nnamdi',
      email: 'kelechi@riffmax.tech',
      organisation_name: 'Riffmax Technology Limited',
      company_id: '246701'
    };
    localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(sup));
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(sup));
    await window.Phase1Shell.mount('approvals');
  });
  await page.waitForTimeout(800);

  const approveSwapBtn = page.locator('[data-swap-decision="approved"]').first();
  if (await approveSwapBtn.count() > 0) {
    const [swapRevRes] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/shift-swaps/review')),
      approveSwapBtn.click()
    ]);
    await page.waitForTimeout(400);
    console.log(`Supervisor Swap Approval POST /api/shift-swaps/review status: ${swapRevRes.status()}`);
  } else {
    console.log('Supervisor Swaps: none pending.');
  }

  await page.click('[data-sr-approval-tab="timecards"]');
  await page.waitForTimeout(400);
  const tcApproveBtn = page.locator('[data-tc-approve]').first();
  if (await tcApproveBtn.count() > 0) {
    const [tcRes] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/timesheets/authorize')),
      tcApproveBtn.click()
    ]);
    await page.waitForTimeout(400);
    console.log(`Supervisor Timecard Authorize POST /api/timesheets/authorize status: ${tcRes.status()}`);
  } else {
    console.log('Supervisor Timecards: none pending.');
  }

  console.log('\n=== API ERRORS (>=400) ===', apiErrors.length);
  if (apiErrors.length) console.log(JSON.stringify(apiErrors, null, 2));
  console.log('=== CONSOLE ERRORS ===', consoleErrors.length);
  if (consoleErrors.length) console.log(consoleErrors);
  console.log('=== TOTAL PAGE ERRORS:', pageErrors.length, '===');
  if (pageErrors.length) console.log(pageErrors);
  console.log('=== FINDINGS COUNT:', findings.length, '===');
  if (findings.length) console.log(JSON.stringify(findings, null, 2));

  await browser.close();
}

audit().catch(e => {
  console.error('AUDIT SCRIPT CRASHED:', e);
  process.exit(1);
});
