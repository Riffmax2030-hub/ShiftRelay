import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const workspace = 'c:/Users/DATA ENG. OLA/Documents/openAI build week';
const visualsDir = path.join(workspace, 'visuals');
const artifactDir = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb';

fs.mkdirSync(visualsDir, { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

async function saveShot(page, name) {
  const p1 = path.join(visualsDir, name);
  const p2 = path.join(artifactDir, name);
  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  console.log(`Captured ${name}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 1.5,
});

const page = await context.newPage();

// 1. Capture Executive Push to Finance with Consolidated Non-Duplicate Schedules
await page.goto('http://localhost:4000', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const exec = {
    id: '00000000-0000-4000-8000-000000000001',
    role: 'owner',
    name: 'Executive Board',
    email: 'board@riffmax.tech',
    title: 'Managing Director / Corporate Owner',
    department: 'Corporate Governance',
    organisation_name: 'Riffmax Technology Limited',
    company_id: '246701'
  };
  localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(exec));
  localStorage.setItem('shiftrelay-user-data', JSON.stringify(exec));
  sessionStorage.setItem('shiftrelay-user', exec.id);
  if (window._srState) window._srState.user = exec;
  document.getElementById('sr-login-modal')?.classList.remove('open');
  const entry = document.getElementById('sr-entry');
  if (entry) entry.style.display = 'none';
  window.Phase1Shell.mount('payroll');
});
await page.waitForTimeout(1800);
await saveShot(page, '12-executive-payroll-hydrated.png');

// 2. Capture Worker "When I am out" Clean Screen (No Duplicate GPS Punch, Dynamic Off-Duty Header Dot)
await page.evaluate(() => {
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
  sessionStorage.setItem('shiftrelay-user', worker.id);
  if (window._srState) window._srState.user = worker;
  window.Phase1Shell.mount('today');
});
await page.waitForTimeout(1800);
await saveShot(page, '02-worker-5tab-dashboard.png');

// 3. Capture Supervisor Live Floor (Shift Attendance Audit CSV, Zero Floor Payroll Duplication)
await page.evaluate(() => {
  const sup = {
    id: '00000000-0000-4000-8000-000000000002',
    role: 'supervisor',
    name: 'Olaide Emmanuela',
    email: 'olaide@riffmax.tech',
    title: 'Operations Lead & Shift Supervisor',
    department: 'Operations & Delivery',
    organisation_name: 'Riffmax Technology Limited',
    company_id: '246701'
  };
  localStorage.setItem('sr_supervisor_mode', 'supervisor');
  localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(sup));
  localStorage.setItem('shiftrelay-user-data', JSON.stringify(sup));
  sessionStorage.setItem('shiftrelay-user', sup.id);
  if (window._srState) window._srState.user = sup;
  window.Phase1Shell.mount('overview');
});
await page.waitForTimeout(1800);
await saveShot(page, '03-supervisor-active-duty-mode.png');

await browser.close();
console.log('Deduplication visual verification complete!');
