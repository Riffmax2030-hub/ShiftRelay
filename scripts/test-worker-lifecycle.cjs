const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Starting Verification of Worker Approval & Revocation Lifecycle ---');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // 1. Sign in as Organisation Owner (Jordan Lee)
  await page.click('#entry-btn-signin');
  await page.waitForTimeout(400);
  await page.click('[data-tab="demo"]');
  await page.waitForTimeout(400);

  const ownerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000014"]');
  if (!ownerBtn) throw new Error('Owner login button not found');
  await ownerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  console.log('✓ Signed in as Organisation Owner');

  // 2. Submit a new pending join request to test the approval workflow
  const testEmail = `applicant.${Date.now()}@example.com`;
  const enrolRes = await page.evaluate(async (email) => {
    const res = await fetch('/api/organisation-memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organisationCode: 'SR-GLOBAL-01',
        fullName: 'Morgan Blake',
        email,
        password: 'Password123!Safe',
        position: 'Triage Nurse Specialist',
        department: 'Emergency Care Unit'
      })
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  }, testEmail);
  console.log('Enrolment submission result:', enrolRes.status, enrolRes.data);

  // 3. Navigate to Team Directory
  await page.evaluate(() => window.Phase1Shell.navigate('team'));
  await page.waitForTimeout(1000);

  // Verify Pending Requests banner appears
  const pendingSection = await page.$('[aria-label="Pending Worker Access Requests"]');
  console.log('Pending requests section visible:', !!pendingSection);
  if (!pendingSection) throw new Error('Pending join requests section not displayed');

  const applicantText = await page.evaluate(() => document.querySelector('.sr-pending-item')?.textContent || '');
  console.log('Applicant preview:', applicantText.replace(/\s+/g, ' ').trim());
  if (!applicantText.includes('Morgan Blake')) throw new Error('Applicant Morgan Blake not listed');

  // Capture screenshot of Team Directory with Pending Request
  const artifactDir = 'c:\\Users\\DATA ENG. OLA\\.gemini\\antigravity\\brain\\8c57bcf0-5ed6-4457-bd3b-82f404ed97c9';
  await page.screenshot({ path: path.join(artifactDir, 'checkpoint-c-owner-team-with-pending-approval.png'), fullPage: true });
  console.log('✓ Captured screenshot: checkpoint-c-owner-team-with-pending-approval.png');

  // 4. Test "Approve Worker"
  const approveBtn = await page.$('.sr-btn-approve-request[data-name="Morgan Blake"]');
  if (!approveBtn) throw new Error('Approve button not found for Morgan Blake');
  console.log('Clicking "Approve Worker"...');
  await approveBtn.click();
  await page.waitForTimeout(1500);

  // Verify applicant is now in the active roster
  const staffNames = await page.evaluate(() => Array.from(document.querySelectorAll('.sr-team-name')).map(el => el.textContent.trim()));
  console.log('Staff members after approval:', staffNames);
  if (!staffNames.includes('Morgan Blake')) throw new Error('Morgan Blake was not added to active staff');
  console.log('✓ Worker approval workflow verified successfully!');

  // 5. Test "Revoke Access" (Deactivation Lifecycle)
  // Find a revoke button on another worker
  const revokeBtn = await page.$('.sr-btn-revoke-member');
  if (!revokeBtn) throw new Error('Revoke Access button not found on worker cards');

  const targetWorkerName = await page.evaluate((btn) => btn.dataset.name, revokeBtn);
  const targetWorkerId = await page.evaluate((btn) => btn.dataset.id, revokeBtn);
  console.log(`Testing deactivation on worker: ${targetWorkerName} (${targetWorkerId})`);

  // Click revoke button to open confirmation modal
  await revokeBtn.click();
  await page.waitForTimeout(600);

  const modal = await page.$('#sr-revoke-modal-wrap');
  if (!modal) throw new Error('Revocation confirmation modal did not open');

  const modalTitle = await page.evaluate(() => document.getElementById('sr-revoke-modal-title')?.textContent.trim());
  console.log('Modal title:', modalTitle);

  // Capture screenshot of Revocation Confirmation Modal
  await page.screenshot({ path: path.join(artifactDir, 'checkpoint-c-revoke-worker-confirmation-modal.png'), fullPage: true });
  console.log('✓ Captured screenshot: checkpoint-c-revoke-worker-confirmation-modal.png');

  // Confirm Deactivation
  const confirmBtn = await page.$('#sr-revoke-modal-confirm');
  if (!confirmBtn) throw new Error('Confirm Deactivation button not found in modal');
  console.log('Clicking "Confirm Deactivation"...');
  await confirmBtn.click();
  await page.waitForTimeout(1500);

  // Verify modal is closed
  const modalAfter = await page.$('#sr-revoke-modal-wrap');
  console.log('Modal closed after confirmation:', !modalAfter);

  // Verify target worker card now shows "Deactivated" / "Access Revoked"
  const targetCardStatus = await page.evaluate((id) => {
    const card = document.querySelector(`article[data-member-id="${id}"]`);
    return card ? card.textContent.replace(/\s+/g, ' ').trim() : null;
  }, targetWorkerId);
  console.log('Target card after revocation:', targetCardStatus);

  if (!targetCardStatus || (!targetCardStatus.includes('Revoked') && !targetCardStatus.includes('Deactivated'))) {
    throw new Error('Worker card does not reflect revoked status');
  }

  // Capture final screenshot showing revoked card in directory
  await page.screenshot({ path: path.join(artifactDir, 'checkpoint-c-worker-revoked-in-directory.png'), fullPage: true });
  console.log('✓ Captured screenshot: checkpoint-c-worker-revoked-in-directory.png');

  // 6. Test Safety Guardrail: Prevent Sole Owner Lockout
  const selfRevokeAttempt = await page.evaluate(async (ownerId) => {
    const res = await fetch(`/api/memberships/${ownerId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  }, '00000000-0000-4000-8000-000000000014');
  console.log('Self-revoke attempt (should fail 400):', selfRevokeAttempt.status, selfRevokeAttempt.data);
  if (selfRevokeAttempt.status !== 400) throw new Error('Expected 400 on sole owner self-revocation');
  console.log('✓ Lockout guardrail verified: Sole owner self-revocation blocked cleanly with 400');

  console.log('--- ALL WORKER LIFECYCLE REQUIREMENTS (1, 2, 3, 4) VERIFIED 100% ---');
  await browser.close();
})().catch(e => {
  console.error('Lifecycle test failed:', e);
  process.exit(1);
});
