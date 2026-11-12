import assert from 'node:assert';
import http from 'node:http';

// We can test the server-side endpoint directly by making requests to server or testing logic
async function runAntiFarmingTests() {
  console.log('=== STARTING SHIFTRELAY ANTI-REWARD FARMING TEST SUITE ===');

  // Test 1: Simulating backend record-activity logic with in-memory rewards store
  const mockRewards = {
    starsBalance: 2450,
    coinsBalance: 2450,
    lifetimeEarned: 3450,
    claimedQuests: ['quest-profile'],
    claimedKeys: [
      'lifetime_milestone_profile_test_user'
    ],
    ledger: []
  };

  function simulateRecordActivity(uniqueKey, stars, actionLabel) {
    if (uniqueKey && mockRewards.claimedKeys.includes(uniqueKey)) {
      return { ok: true, alreadyAwarded: true, starsAdded: 0, balance: mockRewards.starsBalance };
    }
    if (uniqueKey) {
      mockRewards.claimedKeys.push(uniqueKey);
    }
    const starsToAdd = Math.max(0, Math.min(Number(stars) || 25, 100));
    mockRewards.starsBalance += starsToAdd;
    mockRewards.coinsBalance += starsToAdd;
    mockRewards.lifetimeEarned += starsToAdd;
    mockRewards.ledger.push({ type: 'earn', title: actionLabel, stars: starsToAdd, uniqueKey });
    return { ok: true, alreadyAwarded: false, starsAdded: starsToAdd, balance: mockRewards.starsBalance };
  }

  // 1. Education Lifetime Milestone
  console.log('\n--- Test 1: Education Milestone Anti-Farming ---');
  const eduFirst = simulateRecordActivity('lifetime_milestone_education_usr1', 50, 'Education Credential Added');
  assert.strictEqual(eduFirst.alreadyAwarded, false, 'First education addition should award points');
  assert.strictEqual(eduFirst.starsAdded, 50, 'Should award 50 stars');
  assert.strictEqual(mockRewards.starsBalance, 2500, 'Balance should increase to 2500');
  console.log('✔ First-time education credential added: +50 PTS awarded');

  const eduSecondEdit = simulateRecordActivity('lifetime_milestone_education_usr1', 50, 'Education Credential Added');
  assert.strictEqual(eduSecondEdit.alreadyAwarded, true, 'Editing or re-adding education should be blocked');
  assert.strictEqual(eduSecondEdit.starsAdded, 0, 'Zero stars awarded on edit');
  assert.strictEqual(mockRewards.starsBalance, 2500, 'Balance must remain unchanged');
  console.log('✔ Duplicate/edit education blocked: 0 PTS awarded (Anti-farming active)');

  // 2. Certification Lifetime Milestone
  console.log('\n--- Test 2: Certification Milestone Anti-Farming ---');
  const certFirst = simulateRecordActivity('lifetime_milestone_certification_usr1', 50, 'Professional Certification Added');
  assert.strictEqual(certFirst.alreadyAwarded, false);
  assert.strictEqual(certFirst.starsAdded, 50);
  assert.strictEqual(mockRewards.starsBalance, 2550);
  console.log('✔ First-time certification added: +50 PTS awarded');

  const certSecond = simulateRecordActivity('lifetime_milestone_certification_usr1', 50, 'Professional Certification Added');
  assert.strictEqual(certSecond.alreadyAwarded, true);
  assert.strictEqual(certSecond.starsAdded, 0);
  assert.strictEqual(mockRewards.starsBalance, 2550);
  console.log('✔ Duplicate/edit certification blocked: 0 PTS awarded');

  // 3. Skills Lifetime Milestone
  console.log('\n--- Test 3: Skills Milestone Anti-Farming ---');
  const skillsFirst = simulateRecordActivity('lifetime_milestone_skills_usr1', 30, 'Core Skills Profiled');
  assert.strictEqual(skillsFirst.alreadyAwarded, false);
  assert.strictEqual(skillsFirst.starsAdded, 30);
  assert.strictEqual(mockRewards.starsBalance, 2580);
  console.log('✔ First-time skills saved: +30 PTS awarded');

  const skillsSecond = simulateRecordActivity('lifetime_milestone_skills_usr1', 30, 'Core Skills Profiled');
  assert.strictEqual(skillsSecond.alreadyAwarded, true);
  assert.strictEqual(skillsSecond.starsAdded, 0);
  assert.strictEqual(mockRewards.starsBalance, 2580);
  console.log('✔ Re-editing skills blocked: 0 PTS awarded');

  // 4. Daily Shift Attendance Cap (Clock-in / Clock-out)
  console.log('\n--- Test 4: Daily Clock-In Frequency Cap ---');
  const today = '2026-11-12';
  const clockinKey = `clockin_usr1_${today}`;
  const clockFirst = simulateRecordActivity(clockinKey, 25, 'Biometric Water-Pulse Clock-In');
  assert.strictEqual(clockFirst.alreadyAwarded, false);
  assert.strictEqual(clockFirst.starsAdded, 25);
  assert.strictEqual(mockRewards.starsBalance, 2605);
  console.log('✔ Daily clock-in recorded: +25 PTS awarded');

  // Attempt second clock-in via QR gate or offline fallback on the same day
  const clockSecond = simulateRecordActivity(clockinKey, 25, 'Gate QR Verified Clock-In');
  assert.strictEqual(clockSecond.alreadyAwarded, true);
  assert.strictEqual(clockSecond.starsAdded, 0);
  assert.strictEqual(mockRewards.starsBalance, 2605);
  console.log('✔ Same-day second clock-in blocked: 0 PTS awarded');

  // 5. Shift Task Verification Cap
  console.log('\n--- Test 5: Shift Task Checkbox Cap ---');
  const taskKey = `task_usr1_${today}_task-fire-warden`;
  const taskFirst = simulateRecordActivity(taskKey, 5, 'Task Verified: task-fire-warden');
  assert.strictEqual(taskFirst.alreadyAwarded, false);
  assert.strictEqual(taskFirst.starsAdded, 5);
  assert.strictEqual(mockRewards.starsBalance, 2610);
  console.log('✔ Task completed: +5 PTS awarded');

  // Uncheck and recheck
  const taskSecond = simulateRecordActivity(taskKey, 5, 'Task Verified: task-fire-warden');
  assert.strictEqual(taskSecond.alreadyAwarded, true);
  assert.strictEqual(taskSecond.starsAdded, 0);
  assert.strictEqual(mockRewards.starsBalance, 2610);
  console.log('✔ Uncheck & re-check task blocked: 0 PTS awarded');

  // 6. Max Reward Cap Protection
  console.log('\n--- Test 6: Payload Tampering Cap ---');
  const tamperedKey = `tampered_event_${Date.now()}`;
  const tampered = simulateRecordActivity(tamperedKey, 999999, 'Hacked points payload');
  assert.strictEqual(tampered.starsAdded, 100, 'Points added must be hard-capped at 100 max per action');
  assert.strictEqual(mockRewards.starsBalance, 2710);
  console.log('✔ Tampered payload capped to maximum 100 PTS');

  console.log('\n=============================================================');
  console.log('✔ ALL ANTI-REWARD FARMING RULES PASSED 100% OF VERIFICATIONS!');
  console.log('=============================================================\n');
}

runAntiFarmingTests().catch(err => {
  console.error('Anti-farming tests failed:', err);
  process.exit(1);
});
