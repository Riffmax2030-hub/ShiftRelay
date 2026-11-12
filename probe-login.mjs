import { spawn } from 'node:child_process';

const port = 4009;
const srv = spawn('node', ['server.mjs'], {
  env: { ...process.env, PORT: String(port), DATABASE_URL: '', ALLOW_DEV_FALLBACK: 'true', ALLOW_DEV_DEMO_AUTH: 'true' },
  stdio: 'inherit'
});

await new Promise(r => setTimeout(r, 2000));

try {
  console.log('--- Probing Company Lookup ---');
  const compRes = await fetch(`http://127.0.0.1:${port}/api/auth/company-lookup?code=RIF-2026`);
  console.log('Company Lookup Status:', compRes.status, await compRes.json());

  console.log('--- Probing Sign-In ---');
  const signRes = await fetch(`http://127.0.0.1:${port}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId: 'RIF-2026', email: 'tariq@riffmax.tech', password: 'Riffmax2026!' })
  });
  console.log('Sign-In Status:', signRes.status, await signRes.json());
} finally {
  srv.kill();
  process.exit(0);
}
