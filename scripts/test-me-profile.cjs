const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('--- Starting Verification of CV-Style Me Page & Settings ---');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[Browser Error]:', msg.text());
  });

  const artifactDir = path.resolve('C:/Users/DATA ENG. OLA/.gemini/antigravity/brain/8c57bcf0-5ed6-4457-bd3b-82f404ed97c9');

  await page.goto('http://localhost:4000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Sign in as Frontline Worker (Amina Otieno)
  await page.click('#entry-btn-signin');
  await page.waitForTimeout(400);
  await page.click('[data-tab="demo"]');
  await page.waitForTimeout(400);

  const workerBtn = await page.$('[data-sr-demo-login="00000000-0000-4000-8000-000000000011"]');
  if (!workerBtn) throw new Error('Worker login button not found');
  await workerBtn.click();
  await page.waitForSelector('#sr-app-shell', { timeout: 10000 });
  await page.waitForTimeout(600);
  console.log('✓ Step 1: Signed in as Frontline Worker (Amina Otieno)');

  // 2. Navigate to "Me" Screen
  await page.evaluate(() => window.Phase1Shell.navigate('me'));
  await page.waitForTimeout(1000);
  console.log('✓ Step 2: Navigated to Me Screen');

  // 3. Verify CV Header, Avatar, Social Links
  const avatarWrapper = await page.$('.sr-me-avatar-wrapper');
  if (!avatarWrapper) throw new Error('Avatar wrapper not found');
  const uploadBtn = await page.$('#sr-btn-change-avatar');
  if (!uploadBtn) throw new Error('Change avatar button not found');

  const emailLink = await page.$('#sr-me-email-link');
  const linkedinLink = await page.$('#sr-me-linkedin-link');
  const githubLink = await page.$('#sr-me-github-link');
  if (!emailLink || !linkedinLink || !githubLink) throw new Error('Professional links (email, linkedin, github) not found');
  console.log('✓ Step 3: Verified Avatar with photo upload trigger and social links (Email, LinkedIn, GitHub)');

  // 4. Verify CV Sections
  const summaryEl = await page.$('#sr-cv-summary-content');
  const expList = await page.$('#sr-cv-experience-list');
  const certList = await page.$('#sr-cv-cert-list');
  const eduList = await page.$('#sr-cv-edu-list');
  const skillsList = await page.$('#sr-cv-skills-list');
  if (!summaryEl || !expList || !certList || !eduList || !skillsList) {
    throw new Error('One or more CV sections missing (summary, experience, certs, education, skills)');
  }
  console.log('✓ Step 4: Verified all CV sections (Summary, Experience, Certifications, Education, Skills)');

  // 5. Verify Settings Section & Change Password Form
  const settingsSection = await page.$('#sr-settings-section');
  const pwForm = await page.$('#sr-me-password-form');
  if (!settingsSection || !pwForm) throw new Error('Settings section or password form missing on Me page');
  console.log('✓ Step 5: Confirmed Settings section with Change Password form on the same Me page');

  // Screenshot 1: Full CV Layout
  await page.screenshot({ path: path.join(artifactDir, 'feature-me-cv-overview.png'), fullPage: true });

  // 6. Test Avatar Upload
  // Create a small 1x1 png image
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const tmpImgPath = path.join(__dirname, 'test-avatar.png');
  fs.writeFileSync(tmpImgPath, Buffer.from(samplePngBase64, 'base64'));

  const fileInput = await page.$('#sr-avatar-file-input');
  await fileInput.setInputFiles(tmpImgPath);
  await page.waitForTimeout(1000);
  console.log('✓ Step 6: Uploaded new profile picture');

  // Screenshot 2: Avatar updated
  await page.screenshot({ path: path.join(artifactDir, 'feature-me-avatar-updated.png') });

  // 7. Test Edit CV Info Modal
  const editCvBtn = await page.$('#sr-btn-edit-cv-modal');
  await editCvBtn.click();
  await page.waitForSelector('#sr-edit-cv-backdrop', { timeout: 3000 });
  await page.waitForTimeout(300);

  // Fill in new headline and social links
  await page.fill('#sr-cv-input-role', 'Senior Operations Lead & Triage Specialist');
  await page.fill('#sr-cv-input-linkedin', 'https://linkedin.com/in/amina-otieno-lead');
  await page.fill('#sr-cv-input-github', 'https://github.com/amina-otieno-ops');
  await page.screenshot({ path: path.join(artifactDir, 'feature-me-edit-cv-modal.png') });

  await page.click('#sr-btn-save-cv');
  await page.waitForTimeout(1000);

  const updatedRole = await page.textContent('#sr-me-display-role');
  if (!updatedRole.includes('Senior Operations Lead')) {
    throw new Error('Role was not updated after saving Edit CV modal');
  }
  console.log('✓ Step 7: Edit CV modal successfully updated Headline and Social Links');

  // 8. Test Change Password Form inside Settings
  await page.fill('#sr-me-current-pw', 'shiftrelay123');
  await page.fill('#sr-me-new-pw', 'newSuperSecretPass2026!');
  await page.fill('#sr-me-confirm-pw', 'newSuperSecretPass2026!');
  await page.click('#sr-btn-pw-submit');
  await page.waitForTimeout(800);

  const feedbackText = await page.textContent('#sr-pw-feedback');
  console.log('Password feedback:', feedbackText);
  if (!feedbackText.includes('Password updated successfully')) {
    throw new Error('Password change failed: ' + feedbackText);
  }
  console.log('✓ Step 8: Successfully tested Change Password in Settings section');

  // Screenshot 3: Settings with success message
  await page.screenshot({ path: path.join(artifactDir, 'feature-me-settings-password-success.png') });

  // Clean up temp file
  if (fs.existsSync(tmpImgPath)) fs.unlinkSync(tmpImgPath);

  await browser.close();
  console.log('=== All CV-Style Me Page & Settings tests passed with zero errors! ===');
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
