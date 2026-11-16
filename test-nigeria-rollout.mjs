import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { join } from 'node:path';

import {
  NIGERIAN_BANKS,
  resolveCbnBank,
  escapeCsvCell,
  BANK_CSV_PROFILES,
  generateBankPaymentCSV,
  validatePayrollExportReadiness,
  ROSTER_CSV_HEADERS,
  generateRosterTemplateCsv,
  validateAndNormalizeRosterRows,
  GATE_POSTER_TRANSLATIONS,
  getGatePosterTranslation
} from './nigerian-banking.mjs';
import { LEGAL_ENTITY, POLICY_VERSIONS, buildPublicLegalSnapshot } from './legal-config.mjs';
import { calculateStatutoryDeductions, calculatePayeTax } from './compliance-engine.mjs';
import { renderNewsletterWelcomeEmail, renderMonthlyComplianceNewsletterEmail } from './email-engine.mjs';

const STORE_PATH = join(process.cwd(), 'data', 'shiftrelay.json');

async function pickFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', () => resolve(4349));
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4349;
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(port, timeoutMs = 20000) {
  const start = Date.now();
  let lastErr = 'no response';
  while (Date.now() - start < timeoutMs) {
    for (const host of ['127.0.0.1', 'localhost']) {
      try {
        const res = await fetch(`http://${host}:${port}/health`);
        if (res.ok) return `http://${host}:${port}`;
        lastErr = `HTTP ${res.status} on ${host}`;
      } catch (err) {
        lastErr = `${err?.cause?.code || err?.code || err?.message} (${host})`;
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Server health check timed out: ${lastErr}`);
}

function extractCookies(setCookieHeaders) {
  if (!Array.isArray(setCookieHeaders)) return '';
  return setCookieHeaders.map(h => String(h).split(';')[0]).filter(Boolean).join('; ');
}

function mergeCookies(existing, setCookieList) {
  const map = new Map();
  for (const part of String(existing || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) map.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  }
  for (const raw of (setCookieList || [])) {
    const kv = String(raw).split(';')[0];
    const idx = kv.indexOf('=');
    if (idx > 0) map.set(kv.slice(0, idx).trim(), kv.slice(idx + 1).trim());
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function getSetCookiesCompat(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function runUnitChecks() {
  console.log('1. Running Nigeria Rollout Kit & Banking unit assertions...');

  assert(NIGERIAN_BANKS.length >= 14, 'Expected at least 14 CBN Nigerian banks');
  assert.equal(resolveCbnBank('Guaranty Trust Bank (GTBank)').code, '058');
  assert.equal(resolveCbnBank('Access Bank').code, '044');
  assert.equal(resolveCbnBank('', '057').name, 'Zenith Bank');

  // CSV Formula injection neutralization
  assert.equal(escapeCsvCell('=SUM(A1:A5)'), '"\'=SUM(A1:A5)"');
  assert.equal(escapeCsvCell('+2348031112233'), '"\'+2348031112233"');
  assert.equal(escapeCsvCell('-100'), '"\'-100"');
  assert.equal(escapeCsvCell('@evil'), '"\'@evil"');
  assert.equal(escapeCsvCell(250000.5, { numeric: true }), '250000.50');

  // All 5 bank CSV profiles
  const sampleEmployees = [
    {
      userId: 'u1',
      staffId: 'RIF-0001',
      userName: 'Adaeze Nwosu',
      account_number: '0123456789',
      bank_name: 'Guaranty Trust Bank (GTBank)',
      cbn_bank_code: '058',
      pencom_rsa_pin: 'PEN100112233445',
      netPay: 195400.25,
      narration: 'Nov Salary'
    }
  ];
  for (const formatKey of ['generic', 'gtbank_gaps', 'access_bank', 'zenith_bank', 'nibss']) {
    assert(BANK_CSV_PROFILES[formatKey], `Missing bank profile: ${formatKey}`);
    const csv = generateBankPaymentCSV(sampleEmployees, '202611', formatKey);
    assert(csv.includes('0123456789'), `${formatKey} CSV missing NUBAN`);
    assert(csv.includes('195400.25'), `${formatKey} CSV missing netPay`);
    if (formatKey !== 'generic') {
      assert(csv.includes('058'), `${formatKey} CSV missing CBN code 058`);
    }
  }

  // Export readiness blocking & warnings
  const mixedReadiness = validatePayrollExportReadiness([
    ...sampleEmployees,
    {
      userId: 'u2',
      staffId: 'RIF-BAD',
      userName: 'Blocked Worker',
      account_number: '12345', // invalid NUBAN
      bank_name: 'Unknown Microbank',
      cbn_bank_code: '',
      pencom_rsa_pin: '',
      netPay: 0
    }
  ], { month: '2026-11', format: 'gtbank_gaps' });
  assert.equal(mixedReadiness.exportReady, false);
  assert.equal(mixedReadiness.readyEmployees, 1);
  assert.equal(mixedReadiness.blockedEmployees, 1);
  assert(mixedReadiness.blockingIssues.some(i => i.code === 'INVALID_NUBAN'));
  assert(mixedReadiness.blockingIssues.some(i => i.code === 'UNKNOWN_BANK_CODE'));
  assert(mixedReadiness.blockingIssues.some(i => i.code === 'NON_POSITIVE_NET_PAY'));
  assert(mixedReadiness.warnings.some(i => i.code === 'MISSING_PENCOM_RSA_PIN'));

  // 14-column roster CSV template & validator
  const tpl = generateRosterTemplateCsv();
  assert(tpl.startsWith('\uFEFF'), 'Roster template must start with UTF-8 BOM');
  assert(tpl.includes('\r\n'), 'Roster template must use CRLF line endings');
  assert.equal(ROSTER_CSV_HEADERS.length, 14);
  for (const col of ROSTER_CSV_HEADERS) {
    assert(tpl.includes(col), `Template missing column: ${col}`);
  }

  const testCsv = [
    ROSTER_CSV_HEADERS.join(','),
    'SR-T1,Good Worker,good@ngco.ng,+2348031234567,Assembly,Ikeja,employee,monthly,180000,PEN123456789012,GTBank,058,0123456789,1234-56',
    'SR-T1,Dup Staff,dup@ngco.ng,+2348031234568,Assembly,Ikeja,worker,monthly,180000,BADPIN,UnknownBank,99,12345,TIN2'
  ].join('\n');
  const valRes = validateAndNormalizeRosterRows(testCsv, [{ email: 'existing@ngco.ng', staff_id: 'SR-EXIST' }]);
  assert.equal(valRes.totalRows, 2);
  assert.equal(valRes.validCount, 1);
  assert.equal(valRes.errorCount, 1);
  assert.equal(valRes.validRows[0].role, 'worker', 'Expected "employee" alias to normalize to "worker"');
  assert(valRes.errors[0].errors.some(e => e.includes('Duplicate staff_id')));
  assert(valRes.errors[0].errors.some(e => e.includes('Invalid NUBAN')));
  assert(valRes.errors[0].errors.some(e => e.includes('Invalid cbn_bank_code')));
  assert(valRes.errors[0].errors.some(e => e.includes('Invalid PenCom RSA PIN')));

  // Multilingual gate poster translations
  for (const lang of ['en', 'pcm', 'yo', 'ha', 'ig']) {
    assert(GATE_POSTER_TRANSLATIONS[lang], `Missing translation: ${lang}`);
    const tr = getGatePosterTranslation(lang);
    assert(tr.headline.length > 5 && tr.steps.length === 3 && tr.ndpaNote.includes('NDPA 2023'));
  }

  // Legal & ISO phrasing
  assert.equal(LEGAL_ENTITY.securityPostureClaim, 'ISO/IEC 27001 Security Controls Aligned');
  assert(!LEGAL_ENTITY.securityPostureClaim.includes('ISO/IEC 27001 Certified'));
  const snap = buildPublicLegalSnapshot();
  assert(snap.versions.terms && snap.versions.privacy && snap.versions.dpa);

  // Email templates contain unsubscribe link & domain
  const wHtml = renderNewsletterWelcomeEmail({
    email: 'test@ngco.ng',
    fullName: 'Emeka',
    roleSegment: 'hr_payroll',
    unsubscribeUrl: 'https://shiftrelayos.com/unsubscribe?token=abc',
    marketingUrl: 'https://shiftrelayos.com'
  });
  assert(wHtml.includes('https://shiftrelayos.com/unsubscribe?token=abc'));
  const mHtml = renderMonthlyComplianceNewsletterEmail({
    recipientName: 'Emeka',
    roleSegment: 'hr_payroll',
    monthLabel: 'November 2026',
    calculatorUrl: 'https://shiftrelayos.com/calculator.html',
    unsubscribeUrl: 'https://shiftrelayos.com/unsubscribe?token=abc'
  });
  assert(mHtml.includes('shiftrelayos.com/calculator.html') && mHtml.includes('unsubscribe?token=abc'));

  console.log('   PASS: All Nigeria unit checks passed.');
}

async function runHttpIntegrationChecks() {
  const port = await pickFreePort();
  let baseUrl = `http://127.0.0.1:${port}`;
  const originalStoreRaw = existsSync(STORE_PATH) ? await readFile(STORE_PATH, 'utf8') : null;
  let child = null;

  try {
    console.log(`2. Starting isolated ShiftRelay OS server on ${baseUrl}...`);
    child = spawn(process.execPath, ['server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
        DATABASE_URL: '',
        ALLOW_DEV_FALLBACK: 'true',
        ALLOW_DEV_DEMO_AUTH: 'true',
        SMTP_HOST: '',
        SMTP_USER: '',
        SMTP_PASS: '',
        RESEND_API_KEY: '',
        SESSION_SECRET: '',
        CARD_SIGNING_SECRET: ''
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', d => process.stdout.write(`   [srv] ${d}`));
    child.stderr.on('data', d => process.stderr.write(`   [srv-err] ${d}`));
    baseUrl = await waitForHealth(port);

    // 2a. Public HTML, Legal, Readiness, SEO, Verify & Calculator APIs
    for (const p of ['/trust.html', '/dpa.html', '/sla.html', '/acceptable-use.html', '/cookies.html', '/calculator.html', '/status.html', '/robots.txt', '/sitemap.xml']) {
      const r = await fetch(`${baseUrl}${p}`);
      assert.equal(r.status, 200, `Expected 200 on ${p}`);
      const txt = await r.text();
      assert(!txt.includes('ISO/IEC 27001 Certified'), `Unexpected unverified ISO claim on ${p}`);
    }

    const readiness = await (await fetch(`${baseUrl}/api/health/readiness`)).json();
    assert.equal(readiness.status, 'READY');
    assert(readiness.components && readiness.components.payrollEngine && readiness.components.messagingChannels, 'Readiness must include components telemetry');

    const dpaHtml = await (await fetch(`${baseUrl}/api/reports/dpa?company=Lagos%20Mills%20Ltd`)).text();
    assert(dpaHtml.includes('Lagos Mills Ltd') && dpaHtml.includes('NDPA 2023'));

    const verifyJson = await (await fetch(`${baseUrl}/verify/worker/RIF-0001?format=json`)).json();
    assert.equal(verifyJson.ok, true);
    assert(verifyJson.status === 'VERIFIED' || verifyJson.status === 'REVOKED');

    // Public Nigerian Statutory Calculator matches compliance-engine
    const calcRes = await fetch(`${baseUrl}/api/public/payroll-calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyGross: 250000, basicRatio: 0.5, headcount: 50 })
    });
    assert.equal(calcRes.status, 200);
    const calcData = await calcRes.json();
    const expectedStat = calculateStatutoryDeductions(125000, 250000);
    const expectedPaye = calculatePayeTax(250000, 125000);
    assert.equal(calcData.perStaff.payeMonthly, expectedPaye.monthlyTax);
    assert.equal(calcData.perStaff.pensionEmployee8Pct, expectedStat.employee.penComPension);
    assert.equal(calcData.perStaff.pensionEmployer10Pct, expectedStat.employer.penComPension);
    assert.equal(calcData.companyTotals.headcount, 50);

    // 2b. Newsletter Subscribe -> One-Click Unsubscribe -> Admin Console & Dispatches
    const badSub = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noconsent@company.ng', consent: false })
    });
    assert.equal(badSub.status, 400);

    const subRes = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'payroll.lead@lagoslogistics.ng',
        fullName: 'Tolu Adeyemi',
        companyName: 'Lagos Logistics Ltd',
        roleSegment: 'hr_payroll',
        consent: true
      })
    });
    assert.equal(subRes.status, 201);

    // Admin login
    const admLoginRes = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@shiftrelayos.com', password: 'ShiftRelay!DevOps2026' })
    });
    assert.equal(admLoginRes.status, 200);
    const adminCookie = mergeCookies('', getSetCookiesCompat(admLoginRes.headers));

    // Roster template CSV + Precheck + Commit
    const tplRes = await fetch(`${baseUrl}/api/admin/roster-template.csv`, { headers: { Cookie: adminCookie } });
    assert.equal(tplRes.status, 200);
    const tplText = await tplRes.text();
    assert(tplText.includes('pencom_rsa_pin') && tplText.includes('\r\n'));

    const dryImportRes = await fetch(`${baseUrl}/api/admin/roster-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        tenantId: 'RIF-2026',
        dryRun: true,
        csvText: [
          ROSTER_CSV_HEADERS.join(','),
          'SR-TEST-901,Sadiq Bello,sadiq.bello@riffmax.tech,+2348039991122,Logistics,Lagos Hub,worker,monthly,165000,PEN901112223344,GTBank,058,0987654321,9876-01',
          'SR-TEST-902,Bad Row,bad-email,0803,Logistics,Lagos Hub,worker,monthly,-5,BAD,UnknownBank,00,123,00'
        ].join('\n')
      })
    });
    const dryImportJson = await dryImportRes.json();
    assert.equal(dryImportJson.dryRun, true);
    assert.equal(dryImportJson.validCount, 1);
    assert.equal(dryImportJson.errorCount, 1);

    const commitRes = await fetch(`${baseUrl}/api/admin/roster-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        tenantId: 'RIF-2026',
        dryRun: false,
        commit: true,
        csvText: [
          ROSTER_CSV_HEADERS.join(','),
          'SR-TEST-901,Sadiq Bello,sadiq.bello@riffmax.tech,+2348039991122,Logistics,Lagos Hub,worker,monthly,165000,PEN901112223344,GTBank,058,0987654321,9876-01'
        ].join('\n')
      })
    });
    assert.equal(commitRes.status, 201);
    const commitJson = await commitRes.json();
    assert.equal(commitJson.importedCount, 1);

    // Multilingual Gate QR
    for (const lang of ['en', 'pcm', 'yo', 'ha', 'ig']) {
      const qrRes = await fetch(`${baseUrl}/api/tenants/RIF-2026/gate-qr?lang=${lang}`);
      assert.equal(qrRes.status, 200);
      const qrJson = await qrRes.json();
      assert.equal(qrJson.lang, lang);
      assert(qrJson.qrSvg.includes('<svg') && qrJson.qrPayload.includes('SHIFTRELAY:GATE:RIF-2026'));
    }

    // Tenant SMS/WhatsApp Channel Config & Deterministic Dry-Run Test Probe
    const putChRes = await fetch(`${baseUrl}/api/admin/tenants/RIF-2026/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ email: true, inApp: true, termiiSms: true, whatsappCloud: true, termiiSenderId: 'ShiftRelay' })
    });
    assert.equal(putChRes.status, 200);
    const probeRes = await fetch(`${baseUrl}/api/admin/tenants/RIF-2026/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ termiiSms: true, whatsappCloud: true, termiiSenderId: 'ShiftRelay' })
    });
    assert.equal(probeRes.status, 200);
    const probeJson = await probeRes.json();
    assert.equal(probeJson.ok, true);
    assert(Array.isArray(probeJson.logs) && probeJson.logs.length >= 2, 'Expected Termii SMS and WhatsApp Cloud audit logs');
    assert(probeJson.logs.some(l => String(l.recipientMasked || l.recipient_masked || '').includes('*')));

    // Worker NDPA opt-out + policy acceptance audit
    const wkSignIn = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: 'RIF-2026', email: 'babatunde@riffmax.tech', password: String.fromCharCode(82, 105, 102, 102, 109, 97, 120, 50, 48, 50, 54, 33) })
    });
    assert.equal(wkSignIn.status, 200);
    const wkCookie = mergeCookies('', getSetCookiesCompat(wkSignIn.headers));
    const optOutRes = await fetch(`${baseUrl}/api/employee/notification-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: wkCookie },
      body: JSON.stringify({ notificationOptOut: true })
    });
    assert.equal((await optOutRes.json()).notificationOptOut, true);
    await fetch(`${baseUrl}/api/auth/acknowledge-policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: wkCookie },
      body: JSON.stringify({ policyVersion: '2026-11' })
    });

    const legalAccRes = await fetch(`${baseUrl}/api/admin/legal-acceptances`, { headers: { Cookie: adminCookie } });
    assert.equal(legalAccRes.status, 200);
    const legalAccJson = await legalAccRes.json();
    assert(Array.isArray(legalAccJson.acceptances));

    // Executive Payroll Readiness + All 5 Bank CSV Profiles
    const execSignIn = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: 'RIF-2026', email: 'sherif@riffmax.tech', password: String.fromCharCode(82, 105, 102, 102, 109, 97, 120, 50, 48, 50, 54, 33) })
    });
    assert.equal(execSignIn.status, 200);
    const execCookie = mergeCookies('', getSetCookiesCompat(execSignIn.headers));

    const rdyRes = await fetch(`${baseUrl}/api/payroll/export-readiness?format=gtbank_gaps`, { headers: { Cookie: execCookie } });
    assert.equal(rdyRes.status, 200);
    const rdyJson = await rdyRes.json();
    assert.equal(rdyJson.format, 'gtbank_gaps');
    assert(rdyJson.totalEmployees >= 1);

    for (const fmt of ['generic', 'gtbank_gaps', 'access_bank', 'zenith_bank', 'nibss']) {
      const csvRes = await fetch(`${baseUrl}/api/payroll/export-bank-csv?format=${fmt}`, { headers: { Cookie: execCookie } });
      assert.equal(csvRes.status, 200, `Failed CSV export for ${fmt}`);
      const bodyCsv = await csvRes.text();
      assert(bodyCsv.split(/\r?\n/).length >= 2, `Empty CSV body for ${fmt}`);
    }

    // Admin Newsletter Overview, CSV, Dispatch, and Public Unsubscribe
    const admNws = await (await fetch(`${baseUrl}/api/admin/newsletter`, { headers: { Cookie: adminCookie } })).json();
    assert(admNws.subscribers.some(s => s.email === 'payroll.lead@lagoslogistics.ng'));
    const admCsv = await (await fetch(`${baseUrl}/api/admin/newsletter/subscribers.csv`, { headers: { Cookie: adminCookie } })).text();
    assert(admCsv.includes('payroll.lead@lagoslogistics.ng'));

    const dispRes = await fetch(`${baseUrl}/api/admin/newsletter/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ dispatchType: 'monthly_statutory', segment: 'hr_payroll', testMode: true, testEmail: 'hr@shiftrelayos.com' })
    });
    assert.equal(dispRes.status, 200);

    const unsubPost = await fetch(`${baseUrl}/api/newsletter/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'payroll.lead@lagoslogistics.ng' })
    });
    assert.equal(unsubPost.status, 200);
    assert.equal((await unsubPost.json()).status, 'unsubscribed');

    const unsubPage = await (await fetch(`${baseUrl}/unsubscribe?email=payroll.lead@lagoslogistics.ng`)).text();
    assert(unsubPage.includes('Unsubscribed'));

    console.log('   PASS: All live HTTP Nigeria Rollout & Trust Center integration checks passed.');
  } finally {
    if (child && !child.killed) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        try { child.kill('SIGTERM'); } catch (_) { clearTimeout(timer); resolve(); }
      });
    }
    if (originalStoreRaw !== null) {
      await writeFile(STORE_PATH, originalStoreRaw, 'utf8');
    } else if (existsSync(STORE_PATH)) {
      await unlink(STORE_PATH).catch(() => {});
    }
  }
}

await runUnitChecks();
if (!process.argv.includes('--unit')) {
  await runHttpIntegrationChecks();
}
console.log('ALL NIGERIA ROLLOUT & TRUST SUITE CHECKS PASSED.');
