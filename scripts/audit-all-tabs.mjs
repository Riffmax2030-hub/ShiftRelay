import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('visual-inspections/deep-audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://localhost:4000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  async function mountAndCapture(user, tabId, fileName, supMode = null) {
    await page.evaluate(async ({ user, tabId, supMode }) => {
      if (supMode) localStorage.setItem('sr_supervisor_mode', supMode);
      localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(user));
      localStorage.setItem('shiftrelay-user-data', JSON.stringify(user));
      sessionStorage.setItem('shiftrelay-user', user.id);
      if (window._srState) window._srState.user = user;
      document.getElementById('sr-login-modal')?.classList.remove('open');
      const entry = document.getElementById('sr-entry');
      if (entry) entry.style.display = 'none';
      await window.Phase1Shell.mount(tabId);
    }, { user, tabId, supMode });
    await page.waitForTimeout(1000);
    const filePath = path.join(OUT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
  }

  const worker = {
    id: '00000000-0000-4000-8000-000000000003',
    role: 'outgoing',
    name: 'Babatunde Adeleke',
    email: 'babatunde@riffmax.tech',
    title: 'Lead Frontend Architect',
    department: 'Frontend Engineering',
    organisation_name: 'Riffmax Technology Limited',
    company_id: '246701'
  };

  await mountAndCapture(worker, 'handovers', 'worker-2-handovers-actual.png');
  await mountAndCapture(worker, 'earnings', 'worker-4-earnings-actual.png');
  await mountAndCapture(worker, 'me', 'worker-5-me-actual.png');

  const exec = {
    id: '00000000-0000-4000-8000-000000000001',
    role: 'owner',
    name: 'Sherif Akanmu',
    email: 'sherif@riffmax.tech',
    title: 'Managing Director & CEO',
    department: 'Executive Directorate',
    organisation_name: 'Riffmax Technology Limited',
    company_id: '246701'
  };

  await mountAndCapture(exec, 'compliance', 'exec-5-compliance-actual.png');

  await browser.close();
  console.log('Page errors:', errors);
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
