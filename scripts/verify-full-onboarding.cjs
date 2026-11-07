const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json || data });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing ShiftRelay Riffmax Onboarding & 3-Layer Login ---');

  // Test 1: Company Lookup (Layer 1)
  console.log('\n[1] Testing Company Lookup (Layer 1): code=RIF-2026');
  const l1Res = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/company-lookup?code=RIF-2026',
    method: 'GET'
  });
  console.log('Status:', l1Res.statusCode);
  console.log('Response:', l1Res.body);
  if (!l1Res.body.found || l1Res.body.company.companyId !== 'RIF-2026') {
    throw new Error('Layer 1 company lookup failed');
  }
  console.log('✓ Layer 1 Company Lookup verified!');

  // Test 2: Executive Onboarding via Link (/api/auth/executive-onboard)
  console.log('\n[2] Testing Executive Onboarding via Link: sherif@riffmax.tech');
  const onboardRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/executive-onboard',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    companyId: 'RIF-2026',
    email: 'sherif@riffmax.tech',
    password: 'MasterExecutivePassword2026!',
    confirmPassword: 'MasterExecutivePassword2026!',
    governanceAccepted: true
  });
  console.log('Onboarding Status:', onboardRes.statusCode);
  console.log('Onboard User:', onboardRes.body.user?.name, 'Role:', onboardRes.body.user?.role, 'Company:', onboardRes.body.user?.company_id);
  if (onboardRes.statusCode !== 200 || !onboardRes.body.user) {
    throw new Error('Executive onboarding failed: ' + JSON.stringify(onboardRes.body));
  }
  console.log('✓ Executive Onboarding verified!');

  // Test 3: Executive Sign In with Master Password (3-Layer Login)
  console.log('\n[3] Testing Executive 3-Layer Sign In with Master Password');
  const signInRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/sign-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    companyId: 'RIF-2026',
    email: 'sherif@riffmax.tech',
    password: 'MasterExecutivePassword2026!'
  });
  console.log('Status:', signInRes.statusCode);
  console.log('Response User:', signInRes.body.user?.name, 'Role:', signInRes.body.user?.role, 'Company:', signInRes.body.user?.company_id);
  if (signInRes.statusCode !== 200 || !signInRes.body.user) {
    throw new Error('Executive sign in failed: ' + JSON.stringify(signInRes.body));
  }
  console.log('✓ Executive Sign In verified!');

  const rawCookie = signInRes.headers['set-cookie']?.[0] || '';
  const cookieHeader = rawCookie.split(';')[0];

  // Test 4: Executive 1-Click Employee Invite
  console.log('\n[4] Testing Executive 1-Click Invite for Employee: Babatunde Adeleke');
  const inviteRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/executive/invite-member',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    }
  }, {
    memberId: '00000000-0000-4000-8000-000000000003'
  });
  console.log('Status:', inviteRes.statusCode);
  console.log('Invite Response:', inviteRes.body);
  if (!inviteRes.body.ok || !inviteRes.body.member?.activationToken) {
    throw new Error('Executive invite failed');
  }
  const token = inviteRes.body.member.activationToken;
  console.log('✓ Employee invite dispatched with token:', token);

  // Test 5: Verify Email Engine Outbox Stream
  console.log('\n[5] Verifying Email Outbox Stream');
  const outboxRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/dev/outbox',
    method: 'GET'
  });
  console.log('Outbox total count:', outboxRes.body.total);
  const latestEmail = outboxRes.body.emails?.[0];
  console.log('Latest email recipient:', latestEmail?.to, 'Subject:', latestEmail?.subject);
  if (!latestEmail || latestEmail.to !== 'babatunde@riffmax.tech') {
    throw new Error('Outbox did not record invitation email');
  }
  console.log('✓ Email engine outbox logged invitation perfectly!');

  // Test 6: Employee Activation Info (Token Verification)
  console.log('\n[6] Testing Employee Activation Info (Token Verification)');
  const actInfoRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/auth/activation-info?token=${token}`,
    method: 'GET'
  });
  console.log('Activation Info:', actInfoRes.body);
  if (!actInfoRes.body.ok || actInfoRes.body.email !== 'babatunde@riffmax.tech') {
    throw new Error('Activation info resolution failed');
  }
  console.log('✓ Employee activation token valid & resolved to:', actInfoRes.body.fullName);

  // Test 7: Employee Completes Activation (Sets Password)
  console.log('\n[7] Testing Employee Profile Activation');
  const actSubmitRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/activate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    token,
    newPassword: 'MyNewSecurePassword2026!'
  });
  console.log('Activation Submit Response:', actSubmitRes.body);
  if (!actSubmitRes.body.ok) {
    throw new Error('Employee activation submission failed');
  }
  console.log('✓ Employee successfully activated account and received session!');

  // Test 8: Employee Signs In with their new password
  console.log('\n[8] Testing Employee Sign In with Newly Created Password');
  const workerLoginRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/sign-in',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    companyId: 'RIF-2026',
    email: 'babatunde@riffmax.tech',
    password: 'MyNewSecurePassword2026!'
  });
  console.log('Worker Login Status:', workerLoginRes.statusCode);
  console.log('Worker Details:', workerLoginRes.body.user?.name, 'Title:', workerLoginRes.body.user?.title);
  if (workerLoginRes.statusCode !== 200 || !workerLoginRes.body.user) {
    throw new Error('Newly activated employee failed to sign in');
  }
  console.log('✓ Employee can now sign in seamlessly with their new password!');

  console.log('\n======================================================');
  console.log('🎉 ALL 8 ONBOARDING & AUTH VERIFICATION TESTS PASSED!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
