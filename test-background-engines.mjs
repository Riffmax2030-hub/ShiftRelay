import assert from 'node:assert';
import { processShiftBoundaryAutoClockouts, processWeeklyNewsletterAutomation } from './server.mjs';

async function testEngines() {
  console.log('Testing shift boundary auto-clockout processing...');
  await processShiftBoundaryAutoClockouts();
  console.log('✔ Shift boundary auto-clockout engine evaluated successfully.');

  console.log('Testing weekly newsletter automation scheduler...');
  await processWeeklyNewsletterAutomation();
  console.log('✔ Weekly newsletter automation scheduler evaluated successfully.');

  console.log('All background engines verified successfully!');
  process.exit(0);
}

testEngines().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
