import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

async function main() {
  const port = 4008;
  console.log('--- 1. Launching Local Server on Port ' + port + ' ---');
  const srv = spawn('node', ['server.mjs'], {
    env: { ...process.env, PORT: String(port), DATABASE_URL: '', ALLOW_DEV_FALLBACK: 'true', ALLOW_DEV_DEMO_AUTH: 'true' },
    stdio: 'inherit'
  });

  await new Promise(r => setTimeout(r, 2500));

  console.log('--- 2. Starting Chromium Browser ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  async function loginAs(email) {
    await context.clearCookies();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.waitForSelector('#sr-step-company-id', { timeout: 10000 });
    await page.fill('#sr-step-company-id', 'RIF-2026');
    await page.click('#sr-step1-continue');
    await page.waitForSelector('#sr-step-email', { timeout: 6000 });
    await page.fill('#sr-step-email', email);
    await page.click('#sr-step2-continue');
    await page.waitForSelector('#sr-step-password', { timeout: 6000 });
    await page.fill('#sr-step-password', 'Riffmax2026!');
    console.log('Submitting login form for', email);
    await page.click('#sr-step3-login');
    await page.waitForTimeout(1500);

    const sheetMsg = await page.locator('#sr-sheet-msg').textContent().catch(() => '');
    if (sheetMsg) console.log('Login sheet message:', sheetMsg);

    await page.waitForSelector('button[data-sr-view]:visible', { timeout: 15000 });
    await page.waitForTimeout(1000);
  }

  const brainDir = 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb';

  try {
    console.log('--- Worker Cockpit Tabs ---');
    await loginAs('tariq@riffmax.tech');
    
    // Tab 1: Today
    console.log('Capturing Worker Today...');
    await page.click('button.sr-nav-btn[data-sr-view="today"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-worker-1-today.png`, fullPage: false });

    // Tab 2: Handovers
    console.log('Capturing Worker Handovers...');
    await page.click('button.sr-nav-btn[data-sr-view="handovers"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-worker-2-handovers.png`, fullPage: false });

    // Tab 3: Schedule
    console.log('Capturing Worker Schedule...');
    await page.click('button.sr-nav-btn[data-sr-view="schedule"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-worker-3-schedule.png`, fullPage: false });

    // Tab 4: Earnings - Monthly Salary
    console.log('Capturing Worker Earnings (Salary)...');
    await page.click('button.sr-nav-btn[data-sr-view="earnings"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-worker-4a-salary.png`, fullPage: false });

    // Tab 4: Earnings - Rewards subpage
    console.log('Capturing Worker Earnings (Rewards)...');
    const rewardsSubTab = page.locator('#sr-tab-rewards-subpage, button:has-text("Rewards")').first();
    if (await rewardsSubTab.count() > 0) {
      await rewardsSubTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${brainDir}/audit-worker-4b-rewards.png`, fullPage: false });
    }

    // Tab 5: Profile
    console.log('Capturing Worker Profile...');
    await page.click('button.sr-nav-btn[data-sr-view="me"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-worker-5-profile.png`, fullPage: false });

    console.log('--- Supervisor Cockpit Tabs ---');
    await loginAs('olaide@riffmax.tech');

    // Supervisor Live Floor
    console.log('Capturing Supervisor Live Floor...');
    await page.click('button.sr-nav-btn[data-sr-view="overview"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-supervisor-1-overview.png`, fullPage: false });

    // Supervisor Approvals
    console.log('Capturing Supervisor Approvals...');
    await page.click('button.sr-nav-btn[data-sr-view="approvals"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-supervisor-2-approvals.png`, fullPage: false });

    // Supervisor Team
    console.log('Capturing Supervisor Team...');
    await page.click('button.sr-nav-btn[data-sr-view="team"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-supervisor-3-team.png`, fullPage: false });

    console.log('--- Executive Cockpit Tabs ---');
    await loginAs('sherif@riffmax.tech');

    // Executive Pulse
    console.log('Capturing Executive Pulse...');
    await page.click('button.sr-nav-btn[data-sr-view="analytics"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-executive-1-pulse.png`, fullPage: false });

    // Executive Payroll
    console.log('Capturing Executive Payroll...');
    await page.click('button.sr-nav-btn[data-sr-view="payroll"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-executive-2-payroll.png`, fullPage: false });

    // Executive Governance
    console.log('Capturing Executive Governance...');
    await page.click('button.sr-nav-btn[data-sr-view="compliance"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${brainDir}/audit-executive-3-governance.png`, fullPage: false });

    console.log('✔ All tab audits captured successfully!');
  } finally {
    await browser.close();
    srv.kill();
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
