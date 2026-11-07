const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testExecutiveLiveEmail() {
  console.log('Dispatching Live Executive Onboarding to sherifolaide2030@gmail.com...');
  const res = await post('/api/auth/executive-onboard', {
    companyId: 'RIF-2026',
    email: 'sherifolaide2030@gmail.com',
    fullName: 'Sherif Akanmu',
    password: 'MasterPassword2026!',
    confirmPassword: 'MasterPassword2026!',
    governanceAccepted: true
  });
  console.log('Server response status:', res.status);
  console.log('Response body:', res.data);
}

testExecutiveLiveEmail().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
