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

// 1. Capture Entry Screen with New Woven Brand Logo & Sign-In Sheet
await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await saveShot(page, '01-signin-and-brand-logo.png');

// 2. Capture Worker Dashboard with New Header Logo & Highly Reactive Checklist (Checkboxes in front, Progress bar, Industry Badge)
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
  window.Phase1Shell.mount('today');
});
await page.waitForTimeout(1600);
await saveShot(page, '02-worker-5tab-dashboard.png');

// 3. Capture Workplace Settings showing Industry Sector & Operational Protocols selector
await page.evaluate(() => {
  window.Phase1Shell.mount('settings');
});
await page.waitForTimeout(1600);
await saveShot(page, '15-settings-screen-and-logout.png');

await browser.close();
console.log('Visual capture of brand logo, splash and reactive tasks complete!');
