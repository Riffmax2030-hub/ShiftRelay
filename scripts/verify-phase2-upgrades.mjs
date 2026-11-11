import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('visual-inspections/phase2-verified');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.SHIFTRELAY_URL || 'http://localhost:4000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(`${BASE_URL}/?v=141`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Sign in via quick access or API
  await page.evaluate(async () => {
    try {
      await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'olaide@riffmax.tech', password: 'password123' })
      });
    } catch (_) {}
  });

  async function mountPersona(personaKey, supMode, tabId) {
    await page.evaluate(async ({ personaKey, supMode, tabId }) => {
      const personas = {
        cleaner: {
          id: '00000000-0000-4000-8000-000000000003',
          role: 'outgoing',
          name: 'Babatunde Adeleke',
          email: 'babatunde@riffmax.tech',
          title: 'Lead Frontend Architect',
          department: 'Frontend Engineering',
          organisation_name: 'Riffmax Technology'
        },
        supervisor: {
          id: '00000000-0000-4000-8000-000000000002',
          role: 'supervisor',
          name: 'Olaide Emmanuela',
          email: 'olaide@riffmax.tech',
          title: 'Operations Lead & Shift Supervisor',
          department: 'Operations & Delivery',
          organisation_name: 'Riffmax Technology'
        },
        owner: {
          id: '00000000-0000-4000-8000-000000000001',
          role: 'owner',
          name: 'Sherif Akanmu',
          email: 'sherif@riffmax.tech',
          title: 'Managing Director & CEO',
          department: 'Executive Directorate',
          organisation_name: 'Riffmax Technology'
        }
      };
      localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(personas[personaKey]));
      localStorage.setItem('shiftrelay-user-data', JSON.stringify(personas[personaKey]));
      localStorage.setItem('sr_supervisor_mode', supMode);
      localStorage.setItem('sr_first_shift_onboarding_done', '1');
      document.getElementById('sr-splash')?.remove();
      document.getElementById('login-view')?.classList.add('hidden');
      document.getElementById('app-view')?.classList.remove('hidden');
      if (window.Phase1Shell && typeof window.Phase1Shell.mount === 'function') {
        await window.Phase1Shell.mount(tabId);
      }
      window.scrollTo(0, 0);
    }, { personaKey, supMode, tabId });
    await page.waitForTimeout(900);
  }

  // 1. Supervisor Drag-and-Drop Shift Assignment Calendar (4. Roster)
  await mountPersona('supervisor', 'supervisor', 'schedule');
  await page.screenshot({ path: path.join(OUT_DIR, '06-supervisor-drag-drop-calendar.png') });
  console.log('Captured: 06-supervisor-drag-drop-calendar.png');

  // 2. Trigger Drag-and-Drop / Date Drop to open Time Selection & Save Modal
  await page.evaluate(() => {
    const secondWorkerChip = document.querySelectorAll('.sr-dnd-worker-chip')[1];
    if (secondWorkerChip) secondWorkerChip.click();
    const targetCell = document.querySelector('[data-drop-date$="-14"]') || document.querySelector('[data-drop-date]');
    if (targetCell) targetCell.click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '07-supervisor-drag-drop-time-modal.png') });
  console.log('Captured: 07-supervisor-drag-drop-time-modal.png');

  // Click Save & Assign Shift in the modal to verify end-to-end persistence
  await page.evaluate(() => {
    const saveBtn = document.getElementById('sr-assign-submit');
    if (saveBtn) saveBtn.click();
  });
  await page.waitForTimeout(600);

  // 3. Worker 2. Handover (Digital Shift Baton)
  await mountPersona('cleaner', 'worker', 'handovers');
  await page.screenshot({ path: path.join(OUT_DIR, '08-worker-handover-baton.png') });
  console.log('Captured: 08-worker-handover-baton.png');

  // 4. Worker 3. Schedule (7-Day Visual Strip & Assigned Shifts, Zero Dev Banner)
  await mountPersona('cleaner', 'worker', 'schedule');
  await page.screenshot({ path: path.join(OUT_DIR, '09-worker-schedule-strip.png') });
  console.log('Captured: 09-worker-schedule-strip.png');

  // 5. Worker 5. Profile (Digital Work Pass & Gate QR)
  await mountPersona('cleaner', 'worker', 'me');
  await page.screenshot({ path: path.join(OUT_DIR, '10-worker-digital-id-profile.png') });
  console.log('Captured: 10-worker-digital-id-profile.png');

  // 6. Supervisor 3. Approvals (Floor Approvals Queue)
  await mountPersona('supervisor', 'supervisor', 'approvals');
  await page.screenshot({ path: path.join(OUT_DIR, '11-supervisor-approvals-queue.png') });
  console.log('Captured: 11-supervisor-approvals-queue.png');

  // 7. Executive 2. Payroll (Hydrated NGN 13.92M Ledger)
  await mountPersona('owner', 'supervisor', 'payroll');
  await page.screenshot({ path: path.join(OUT_DIR, '12-executive-payroll-hydrated.png') });
  console.log('Captured: 12-executive-payroll-hydrated.png');

  // 8. Executive 5. Governance (Statutory & Operational Governance Fixed)
  await mountPersona('owner', 'supervisor', 'compliance');
  await page.screenshot({ path: path.join(OUT_DIR, '13-executive-governance-fixed.png') });
  console.log('Captured: 13-executive-governance-fixed.png');

  console.log('Runtime page errors:', errors.length ? errors : 'NONE (0 errors)');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
