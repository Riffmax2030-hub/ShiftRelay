const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.mjs');
let code = fs.readFileSync(serverPath, 'utf8');

// 1. Replace fallback store.organisations and store.contracts in getStore()
const getStoreTargetRegex = /\/\/ ── Enterprise Tenants: Dangote[\s\S]*?if \(!Array\.isArray\(store\.contracts\) \|\| store\.contracts\.length === 0\) \{[\s\S]*?store\.contracts = \[[\s\S]*?\];\s*\}/;

const riffmaxGetStoreReplacement = `  // ── Premier Enterprise Tenant: Riffmax Technology Limited ──
  if (!Array.isArray(store.organisations) || store.organisations.length === 0) {
    store.organisations = [
      {
        id: '00000000-0000-4000-8000-000000000100',
        organisation_code: 'RIF-2026',
        aliases: ['RIF-2026', 'RIFFMAX', 'RIFFMAX-01', 'RIF-01', '246701'],
        legal_name: 'Riffmax Technology Limited',
        trading_name: 'Riffmax Technology',
        work_email: 'sherif@riffmax.tech',
        industry: 'Enterprise SaaS & Workforce DeepTech',
        country: 'Nigeria',
        state: 'Lagos',
        currency: 'NGN',
        time_zone: 'Africa/Lagos',
        hub_name: 'Riffmax Software Engineering Hub',
        address: 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria',
        hub_lat: 6.4312,
        hub_lng: 3.4244,
        hub_perimeter: 120,
        subscription_tier: 'enterprise_founding_partner',
        verification_status: 'verified',
        onboarding_fee_paid: true,
        monthly_fee_ngn: 500000,
        pepm_ngn: 5000,
        created_at: new Date().toISOString()
      }
    ];
  }

  if (!Array.isArray(store.contracts) || store.contracts.length === 0) {
    const riffmaxStaff = [
      { id: '00000000-0000-4000-8000-000000000001', name: 'Sherif Akanmu', role: 'Managing Director & CEO', dept: 'Executive Operations', salary: 1200000 },
      { id: '00000000-0000-4000-8000-000000000002', name: 'Olaide Emmanuela', role: 'Operations Lead & Shift Supervisor', dept: 'Operations Leadership', salary: 750000 },
      { id: '00000000-0000-4000-8000-000000000003', name: 'Babatunde Adeleke', role: 'Lead Frontend Systems Engineer', dept: 'Engineering Core', salary: 650000 },
      { id: '00000000-0000-4000-8000-000000000004', name: 'Chidinma Okonjo', role: 'Lead Mobile Native Engineer', dept: 'Mobile Engineering', salary: 600000 },
      { id: '00000000-0000-4000-8000-000000000005', name: 'Tariq Al-Hassan', role: 'Principal Distributed Backend Engineer', dept: 'Cloud & Infrastructure', salary: 650000 },
      { id: '00000000-0000-4000-8000-000000000006', name: 'Ngozi Eze', role: 'Lead QA & Security Specialist', dept: 'Quality & Security', salary: 550000 },
      { id: '00000000-0000-4000-8000-000000000007', name: 'Farouk Bello', role: 'DevOps & Site Reliability Engineer', dept: 'Cloud & Infrastructure', salary: 580000 },
      { id: '00000000-0000-4000-8000-000000000008', name: 'Folake Balogun', role: 'Product Operations & Compliance Lead', dept: 'Product & Regulatory', salary: 540000 },
      { id: '00000000-0000-4000-8000-000000000009', name: 'Kelechi Nnamdi', role: 'Lead UI/UX Systems Designer', dept: 'Design & Experience', salary: 520000 },
      { id: '00000000-0000-4000-8000-000000000010', name: 'Zainab Abubakar', role: 'Customer Success & Field Ops Lead', dept: 'Customer Operations', salary: 480000 },
      { id: '00000000-0000-4000-8000-000000000011', name: 'Damilola Fashola', role: 'Data Platform & Analytics Engineer', dept: 'Engineering Core', salary: 520000 },
      { id: '00000000-0000-4000-8000-000000000012', name: 'Ibrahim Yusuf', role: 'Systems Integrations Specialist', dept: 'Integrations & API', salary: 500000 }
    ];
    store.contracts = riffmaxStaff.map((staff, i) => ({
      userId: staff.id,
      tenant_id: '00000000-0000-4000-8000-000000000100',
      userName: staff.name,
      staffId: \`RIF-\${String(i + 1).padStart(4, '0')}\`,
      role: staff.role,
      department: staff.dept,
      compensation_type: 'fixed_monthly',
      monthly_rate: staff.salary,
      hourly_rate: Math.round(staff.salary / 160),
      currency: 'NGN',
      bank_name: 'Guaranty Trust Bank (GTBank)',
      account_number: '012' + String(1000000 + i),
      account_name: staff.name
    }));
  }`;

if (getStoreTargetRegex.test(code)) {
  code = code.replace(getStoreTargetRegex, riffmaxGetStoreReplacement);
  console.log('✓ Replaced store.organisations and store.contracts with Riffmax Technology');
} else {
  console.log('⚠ Could not match getStoreTargetRegex exactly, checking sub-blocks');
}

// 2. Add Email Engine helper function if not present
if (!code.includes('async function sendShiftRelayEmail')) {
  const emailHelperBlock = `
// ── ShiftRelay Enterprise Email Delivery Engine ───────────────────────────
export async function sendShiftRelayEmail({ to, subject, html, text, source = 'ShiftRelay Engine' }) {
  const store = await getStore();
  if (!Array.isArray(store.emailStation)) store.emailStation = [];

  const emailId = 'eml_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const from = process.env.FROM_EMAIL || 'notifications@shiftrelay.tech';

  const emailRecord = {
    id: emailId,
    time: timeStr,
    timestamp: now.toISOString(),
    from,
    to,
    subject,
    html: html || text,
    text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
    source,
    status: 'DELIVERED'
  };

  store.emailStation.unshift(emailRecord);
  if (store.emailStation.length > 500) store.emailStation.pop();
  await saveStore(store);

  // Extract link if present in email text or html
  const urlMatch = (html || text || '').match(/https?:\\/\\/[^\\s"'>]+/);
  const clickableUrl = urlMatch ? urlMatch[0] : null;

  console.log('\\n' + '╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ ✉ SHIFTRELAY EMAIL ENGINE DISPATCH                                            ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Recipient: ' + to.padEnd(65) + '║');
  console.log('║ Subject:   ' + subject.slice(0, 65).padEnd(65) + '║');
  console.log('║ Source:    ' + source.padEnd(65) + '║');
  if (clickableUrl) {
    console.log('║ Action Link: ' + clickableUrl.slice(0, 63).padEnd(63) + '║');
  }
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\\n');

  // Optional: If RESEND_API_KEY is configured in .env, dispatch live transactional email
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to, subject, html, text })
      });
      console.log('✓ Dispatched to real inbox via Resend API');
    } catch (e) {
      console.warn('Resend dispatch failed (fallback to mock station):', e.message);
    }
  }

  return emailRecord;
}
`;
  code = emailHelperBlock + '\n' + code;
  console.log('✓ Injected sendShiftRelayEmail engine');
}

fs.writeFileSync(serverPath, code, 'utf8');
console.log('✓ Finished patch-server-full');
