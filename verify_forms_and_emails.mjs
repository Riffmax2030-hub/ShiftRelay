import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  console.log('--- 1. Launching Local Server ---');
  const serverProc = spawn('node', ['server.mjs'], {
    env: { ...process.env, PORT: '4005', ALLOW_DEV_FALLBACK: 'true', ALLOW_DEV_DEMO_AUTH: 'true' },
    stdio: 'inherit'
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('--- 2. Starting Chromium Browser ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Capture Terms of Service Document Page
    console.log('Capturing Terms of Service Report Page...');
    await page.goto('http://127.0.0.1:4005/api/reports/terms-of-service');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-terms-of-service-doc.png', fullPage: true });

    // 2. Capture Executive Statutory Payroll & Remittance Ledger
    console.log('Capturing Executive Statutory Payroll Ledger...');
    await page.goto('http://127.0.0.1:4005/api/reports/payroll-ledger');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-executive-payroll-ledger.png', fullPage: true });

    // 3. Capture Worker Verified CV Dossier
    console.log('Capturing Worker CV Dossier...');
    await page.goto('http://127.0.0.1:4005/api/reports/worker-cv');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-worker-cv-dossier.png', fullPage: true });

    // 4. Capture Email Preview (Weekly Automated Progress Newsletter)
    console.log('Capturing Email Preview (Weekly Newsletter)...');
    await page.goto('http://127.0.0.1:4005/api/emails/preview?type=newsletter');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-email-newsletter-preview.png', fullPage: true });

    // 5. Capture Email Preview (Account Activation with Single CTA & Unbroken link)
    console.log('Capturing Email Preview (Account Activation)...');
    await page.goto('http://127.0.0.1:4005/api/emails/preview?type=activation');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-email-activation-preview.png', fullPage: true });

    // 6. Test In-App Flow & Modals
    console.log('Logging in as Worker to test In-App Terms & CV Modals...');
    await page.goto('http://127.0.0.1:4005', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Step 1: Company ID
    await page.waitForSelector('#sr-step-company-id');
    await page.fill('#sr-step-company-id', 'RIF-2026');
    await page.click('#sr-step1-continue');

    // Wait for Step 2 to become visible
    await page.waitForSelector('#sr-step-email', { state: 'visible', timeout: 5000 });
    await page.fill('#sr-step-email', 'tariq@riffmax.tech');
    await page.click('#sr-step2-continue');

    // Wait for Step 3 to become visible
    await page.waitForSelector('#sr-step-password', { state: 'visible', timeout: 5000 });
    await page.fill('#sr-step-password', 'Riffmax2026!');
    await page.click('#sr-step3-login');
    await page.waitForTimeout(2000);
    const msg = await page.textContent('#sr-sheet-msg');
    console.log('Waiting for app shell to mount...');
    await page.waitForSelector('button[data-sr-view="me"]', { timeout: 15000 });

    // Navigate to Profile tab
    console.log('Navigating to Profile Tab...');
    await page.click('button[data-sr-view="me"]:visible');
    await page.waitForTimeout(1000);

    // Capture Restructured Profile Page
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-profile-with-forms.png', fullPage: true });

    // Open In-App Terms of Service Modal
    console.log('Opening In-App Terms of Service Modal...');
    await page.click('#sr-btn-profile-view-terms');
    await page.waitForSelector('#sr-terms-modal', { state: 'visible', timeout: 6000 });
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-inapp-terms-modal.png' });
    await page.click('#sr-btn-close-terms');
    await page.waitForTimeout(500);

    // Test Export Dossier (CV Modal)
    console.log('Opening In-App CV Dossier Modal...');
    await page.click('#sr-btn-export-cv');
    await page.waitForSelector('#sr-cv-modal', { state: 'visible', timeout: 6000 });
    await page.screenshot({ path: 'C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/af65195c-f6f5-4f1b-843a-e3eb86a344fb/qa-inapp-cv-modal.png' });
    await page.click('#sr-btn-close-cv');
    await page.waitForTimeout(500);

    console.log('✔ All QA screenshots successfully generated!');
  } finally {
    await browser.close();
    serverProc.kill();
  }
}

run().catch(err => {
  console.error('[QA FAILED]', err);
  process.exit(1);
});
