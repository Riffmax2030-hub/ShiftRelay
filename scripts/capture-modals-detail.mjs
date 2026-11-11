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

await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

// Setup Worker Persona
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
  localStorage.setItem('shiftrelay-company-industry', 'manufacturing');
  localStorage.setItem('shiftrelay-demo-persona', JSON.stringify(worker));
  localStorage.setItem('shiftrelay-user-data', JSON.stringify(worker));
  sessionStorage.setItem('shiftrelay-user', worker.id);
  if (window._srState) window._srState.user = worker;
  document.getElementById('sr-login-modal')?.classList.remove('open');
  const entry = document.getElementById('sr-entry');
  if (entry) entry.style.display = 'none';
});

// 1. Mount Rewards Center & Click Merit Badges tab (#sr-tab-btn-badges)
await page.evaluate(() => {
  window.Phase1Shell.mount('rewards');
});
await page.waitForTimeout(1000);

await page.click('#sr-tab-btn-badges');
await page.waitForTimeout(600);
await saveShot(page, '19-rewards-merit-badges-showcase.png');

// 2. Mount Worker Earnings & Open Official Payslip Modal
await page.evaluate(() => {
  window.Phase1Shell.mount('earnings');
});
await page.waitForTimeout(1000);

await page.evaluate(() => {
  const modal = document.getElementById('sr-payslip-modal-backdrop');
  if (modal) modal.style.display = 'flex';
});
await page.waitForTimeout(600);
await saveShot(page, '14-worker-earnings-payslip-modal.png');

await browser.close();
console.log('All modal and subtab visual checkpoints captured successfully!');
