import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const vaultDir = path.join(rootDir, 'riffmax-brain');

const PASSWORD_HASH = '7b31e66ba6e49c68372e58d0a00829d3:a5e2489fa6f3841ee9c8099bf3425c808ebd1ae72ac18fd7d188eb9a2daf728198fa664db814cbd38b16b81a6ad7f2edf39bf0ecbfd8a4863931aeaf1c35d96a'; // Riffmax2026!
const ORG_ID = '00000000-0000-4000-8000-000000000100';
const SITE_ID = '00000000-0000-4000-8000-000000000101';

export const FULL_ENTERPRISE_ROSTER = [
  // ── 1. EXECUTIVE DIRECTORATE & STRATEGY ──
  {
    staffId: 'RIF-0001',
    name: 'Sherif Akanmu',
    email: 'sherif@riffmax.tech',
    role: 'Managing Director & CEO',
    type: 'human',
    dept: 'Executive Directorate',
    avatar: 'SA',
    bank: 'GTBank',
    account: '0121000001',
    grossPay: 1200000,
    stack: 'Enterprise Strategy, Sovereign Approvals, Cap Table',
    workload: 'Sovereign Governance & Executive Approvals',
    files: ['executive-briefings/', 'roadmap.md'],
    benchmark: 'Strategic Execution 100% · Board Governance Clean'
  },
  {
    staffId: 'RIF-0002',
    name: 'Olaide Emmanuela',
    email: 'olaide@riffmax.tech',
    role: 'Chief Operating Officer & Shift Supervisor',
    type: 'human',
    dept: 'Operations Leadership',
    avatar: 'OE',
    bank: 'GTBank',
    account: '0121000002',
    grossPay: 750000,
    stack: 'Operational Governance, Geofence Enforcement, Queue Clearance',
    workload: 'Shift Governance & Daily Queue Clearance',
    files: ['data/shiftrelay.json', 'compliance-engine.mjs'],
    benchmark: 'Shift Governance Verified · Zero Unverified Punches'
  },

  // ── 2. BRANDING, DESIGN & CREATIVE LAB ──
  {
    staffId: 'RIF-0009',
    name: 'Kelechi Nnamdi',
    email: 'kelechi@riffmax.tech',
    role: 'Lead UI/UX Systems Designer',
    type: 'ai_agent',
    dept: 'Branding & Creative Design',
    avatar: 'KN',
    bank: 'GTBank',
    account: '0121000009',
    grossPay: 520000,
    stack: 'Figma Tokens, WCAG AAA Contrast, Mobile Bento Touchscreens',
    workload: 'Industrial Mobile Touch Tokens & Viewport Ergonomics',
    files: ['theme.css', 'dark-mode.css', 'bento-ui.css'],
    benchmark: 'Contrast Ratio: 7.8:1 (WCAG AAA Sunlight Certified)'
  },
  {
    staffId: 'RIF-0013',
    name: 'Adanna Adeleke',
    email: 'adanna@riffmax.tech',
    role: 'Brand Identity & Visual Director',
    type: 'ai_agent',
    dept: 'Branding & Creative Design',
    avatar: 'AA',
    bank: 'GTBank',
    account: '0121000013',
    grossPay: 540000,
    stack: 'Vector Iconography, Visual Guidelines, App Splash & Badging',
    workload: 'Brand Asset Kit & Vector Symbol Architecture',
    files: ['assets/branding/', 'brand-guidelines.md', 'icons.svg'],
    benchmark: 'Asset Render Speed: < 1.2ms · SVG Optimization: 94%'
  },
  {
    staffId: 'RIF-0014',
    name: 'Simi Balogun',
    email: 'simi@riffmax.tech',
    role: 'Motion Media & Interactive Onboarding Designer',
    type: 'ai_agent',
    dept: 'Branding & Creative Design',
    avatar: 'SB',
    bank: 'GTBank',
    account: '0121000014',
    grossPay: 490000,
    stack: 'CSS Keyframe Physics, Micro-Interactions, Interactive Tour',
    workload: 'First-Shift Onboarding Walkthrough & Handoff Haptics',
    files: ['motion.css', 'onboarding-tour.js', 'walkthrough.json'],
    benchmark: 'Motion FPS: 60FPS Steady · Frame Drops: 0'
  },

  // ── 3. ADVERTISING, GROWTH & MARKETING ──
  {
    staffId: 'RIF-0015',
    name: 'Tunde Bakare',
    email: 'tunde@riffmax.tech',
    role: 'Head of Growth Marketing & Acquisition',
    type: 'ai_agent',
    dept: 'Advertising & Growth Marketing',
    avatar: 'TB',
    bank: 'GTBank',
    account: '0121000015',
    grossPay: 560000,
    stack: 'B2B SaaS Funnels, Conversion Analytics, Paid Media, CAC/LTV',
    workload: 'Enterprise Pilot Acquisition & Landing Page Conversion',
    files: ['landing.html', 'growth-telemetry.js', 'funnel-model.json'],
    benchmark: 'Landing Page Load: 0.8s · Conversion Rate: 14.2%'
  },
  {
    staffId: 'RIF-0016',
    name: 'Amara Okeke',
    email: 'amara@riffmax.tech',
    role: 'Brand Storyteller & Content Marketing Lead',
    type: 'ai_agent',
    dept: 'Advertising & Growth Marketing',
    avatar: 'AO',
    bank: 'GTBank',
    account: '0121000016',
    grossPay: 480000,
    stack: 'Product Case Studies, Frontline Chronicles, SEO Briefs',
    workload: 'Healthcare & Manufacturing Dogfooding Whitepapers',
    files: ['docs/case-studies/', 'press-kit.md', 'blog-manifest.json'],
    benchmark: 'Readability Score: 82 (Grade 8 Flesch) · SEO Index: 100%'
  },
  {
    staffId: 'RIF-0010',
    name: 'Zainab Abubakar',
    email: 'zainab@riffmax.tech',
    role: 'Customer Success & Field Ops Lead',
    type: 'ai_agent',
    dept: 'Advertising & Growth Marketing',
    avatar: 'ZA',
    bank: 'GTBank',
    account: '0121000010',
    grossPay: 480000,
    stack: 'Frontline Field Audits, Worker Feedback, QR Badge Rollout',
    workload: 'Victoria Island Frontline Pilot Audits & Shift Interviews',
    files: ['field-audit-log.json', 'worker-sentiment.md'],
    benchmark: 'Worker CSAT: 96.4% · First-Punch Onboarding: < 90s'
  },

  // ── 4. BUSINESS STRATEGY & INVESTOR RELATIONS ──
  {
    staffId: 'RIF-0017',
    name: 'Femi Otedola-Coker',
    email: 'femi@riffmax.tech',
    role: 'Head of Strategic Finance & Investor Relations',
    type: 'ai_agent',
    dept: 'Business Strategy & Investor Relations',
    avatar: 'FO',
    bank: 'GTBank',
    account: '0121000017',
    grossPay: 620000,
    stack: 'Financial Models, Seed/Series A Pitch Decks, Cap Table, Unit Economics',
    workload: 'Institutional Pitch Deck & SaaS 5-Year Revenue Projection',
    files: ['investor/deck.md', 'investor/financial-model.json', 'cap-table.csv'],
    benchmark: 'Gross Margin Forecast: 84% · Payback Period: 4.8 Months'
  },
  {
    staffId: 'RIF-0018',
    name: 'Chidinma Kalu',
    email: 'kalu@riffmax.tech',
    role: 'Enterprise Commercial & B2B Partnerships Lead',
    type: 'ai_agent',
    dept: 'Business Strategy & Investor Relations',
    avatar: 'CK',
    bank: 'GTBank',
    account: '0121000018',
    grossPay: 550000,
    stack: 'Enterprise Master Service Agreements (MSA), SLA Pricing, B2B Tiers',
    workload: 'Commercial Licensing Framework & Pilot SLA Contracts',
    files: ['contracts/enterprise-sla.md', 'pricing-tiers.json'],
    benchmark: 'Contract Close Cycle: 12 Days · SLA Uptime Guarantee: 99.9%'
  },

  // ── 5. LEGAL, REGULATORY & STATUTORY COMPLIANCE ──
  {
    staffId: 'RIF-0019',
    name: 'Barrister Yetunde Williams',
    email: 'yetunde@riffmax.tech',
    role: 'General Counsel & Data Protection Officer',
    type: 'ai_agent',
    dept: 'Legal & Regulatory Compliance',
    avatar: 'YW',
    bank: 'GTBank',
    account: '0121000019',
    grossPay: 650000,
    stack: 'Nigerian Data Protection Act (NDPA 2023), GDPR, Biometric Gating Laws',
    workload: 'Biometric Consent Safeguards & Data Sovereign Architecture',
    files: ['legal/privacy-policy.md', 'legal/biometric-terms.md', 'legal/ndpa-audit.json'],
    benchmark: 'NDPA 2023 Compliance: 100% · Legal Risk Exposure: Zero'
  },
  {
    staffId: 'RIF-0008',
    name: 'Folake Balogun',
    email: 'folake@riffmax.tech',
    role: 'Product Regulatory & Labor Law Specialist',
    type: 'ai_agent',
    dept: 'Legal & Regulatory Compliance',
    avatar: 'FB',
    bank: 'GTBank',
    account: '0121000008',
    grossPay: 540000,
    stack: 'Nigerian Labor Act, PITA 2011, CRA 2011, Anti-Fatigue Capping',
    workload: 'Statutory Overtime Capping & Shift Rest Interval Enforcer',
    files: ['compliance-engine.mjs', 'ShiftRelay-Statutory-Privacy-and-Lending-Safeguards.md'],
    benchmark: 'Labor Act PITA/CRA: 100% Compliant · Fatigue Score: 0'
  },

  // ── 6. HUMAN RESOURCES & PEOPLE OPERATIONS ──
  {
    staffId: 'RIF-0020',
    name: 'Blessing Nwachukwu',
    email: 'blessing@riffmax.tech',
    role: 'Head of People & Talent Operations',
    type: 'ai_agent',
    dept: 'Human Resources & People Ops',
    avatar: 'BN',
    bank: 'GTBank',
    account: '0121000020',
    grossPay: 520000,
    stack: 'Talent Acquisition, Employee Welfare, Performance Reviews, Onboarding',
    workload: 'Autonomous Agent Performance Metrology & 360 Reviews',
    files: ['hr/staff-handbook.md', 'hr/performance-matrix.json'],
    benchmark: 'Staff Retention Index: 98% · Dispute Resolution: < 24h'
  },
  {
    staffId: 'RIF-0011',
    name: 'Damilola Fashola',
    email: 'damilola@riffmax.tech',
    role: 'Data Platform & Payroll Telemetry Engineer',
    type: 'ai_agent',
    dept: 'Human Resources & People Ops',
    avatar: 'DF',
    bank: 'GTBank',
    account: '0121000011',
    grossPay: 520000,
    stack: 'PenCom PRA 2014, PITA 2011 Tax Brackets, NHF/NSITF Remittance',
    workload: 'Automated Real-Time Monthly Payroll & GTBank NIP Disbursement',
    files: ['server.mjs', 'data/riffmax-payslips.json'],
    benchmark: 'Payroll Precision: 100% · Discrepancies: ₦0.00'
  },

  // ── 7. CORE ENGINEERING & ARCHITECTURE ──
  {
    staffId: 'RIF-0005',
    name: 'Tariq Al-Hassan',
    email: 'tariq@riffmax.tech',
    role: 'Principal Distributed Backend Engineer',
    type: 'ai_agent',
    dept: 'Engineering Core',
    avatar: 'TA',
    bank: 'GTBank',
    account: '0121000005',
    grossPay: 650000,
    stack: 'Node.js 24, PostgreSQL, SHA-256 Idempotency, Scrypt',
    workload: 'Distributed Time-Entries Deduplication & Database Schemas',
    files: ['server.mjs', 'schema.sql'],
    benchmark: 'Idempotency Dedup: < 2ms · Race Conditions: 0'
  },
  {
    staffId: 'RIF-0003',
    name: 'Babatunde Adeleke',
    email: 'babatunde@riffmax.tech',
    role: 'Lead Frontend Systems Engineer',
    type: 'ai_agent',
    dept: 'Engineering Core',
    avatar: 'BA',
    bank: 'GTBank',
    account: '0121000003',
    grossPay: 650000,
    stack: 'Vanilla ES2024, CSS Bento Grid, PWA Offline Service Worker, 60FPS',
    workload: 'Shift Calendar Virtualization & Offline Punches Queue',
    files: ['styles.css', 'app.js', 'bento-ui.css'],
    benchmark: 'Bento UI Paint Time: 4.1ms (60 FPS Locked) · Memory -22%'
  },
  {
    staffId: 'RIF-0004',
    name: 'Chidinma Okonjo',
    email: 'chidinma@riffmax.tech',
    role: 'Lead Mobile Native Engineer',
    type: 'ai_agent',
    dept: 'Engineering Core',
    avatar: 'CO',
    bank: 'GTBank',
    account: '0121000004',
    grossPay: 600000,
    stack: 'Capacitor Android 15 / iOS 18, Native Geofence, Biometrics',
    workload: '120m Victoria Island Perimeter Hardware GPS Bridge',
    files: ['android/app/build.gradle', 'capacitor.config.json', 'mobile-bridge.js'],
    benchmark: 'Geofence Deviation Margin: 3.2m · Offline Queue Sync: 100%'
  },
  {
    staffId: 'RIF-0006',
    name: 'Ngozi Eze',
    email: 'ngozi@riffmax.tech',
    role: 'Lead QA & Security Specialist',
    type: 'ai_agent',
    dept: 'Engineering Core',
    avatar: 'NE',
    bank: 'GTBank',
    account: '0121000006',
    grossPay: 550000,
    stack: 'OWASP Security, Route Penetration Testing, Tenant Isolation',
    workload: 'Automated 48-Route Security Assertion Suite',
    files: ['server.mjs', 'test-batch-2a.mjs', 'test-batch-2b.mjs'],
    benchmark: '48/48 Route Assertions Passed · 0 Security Deficiencies'
  },
  {
    staffId: 'RIF-0007',
    name: 'Farouk Bello',
    email: 'farouk@riffmax.tech',
    role: 'DevOps & Site Reliability Engineer',
    type: 'ai_agent',
    dept: 'Engineering Core',
    avatar: 'FB',
    bank: 'GTBank',
    account: '0121000007',
    grossPay: 580000,
    stack: 'Frankfurt Latency Budgets, PostgreSQL Pool Recycling, Docker',
    workload: 'Connection Pool Resilience & Node Process Memory Profiling',
    files: ['database.mjs', 'docker-compose.yml', 'render.yaml'],
    benchmark: 'Frankfurt Postgres Pool: 18.2ms Median Latency · 0 Pool Starvation'
  },
  {
    staffId: 'RIF-0012',
    name: 'Ibrahim Yusuf',
    email: 'ibrahim@riffmax.tech',
    role: 'Systems Integrations Specialist',
    type: 'ai_agent',
    dept: 'Engineering Core',
    avatar: 'IY',
    bank: 'GTBank',
    account: '0121000012',
    grossPay: 500000,
    stack: 'Enterprise Webhooks, GTBank NIP Rails, Third-Party ERPs',
    workload: 'Resilient Webhook Dispatch with Exponential Retry',
    files: ['server.mjs', 'scripts/setup-riffmax-tenant.cjs'],
    benchmark: 'Webhook Dispatch Reliability: 99.98% · Retries: 3'
  },

  // ── 8. PHYSICAL FACILITIES & WORKPLACE SECURITY (Victoria Island HQ) ──
  {
    staffId: 'RIF-0021',
    name: 'Emeka Obinna',
    email: 'emeka@riffmax.tech',
    role: 'Facilities & Workplace Infrastructure Manager',
    type: 'ai_agent',
    dept: 'Facilities & Workplace Security',
    avatar: 'EO',
    bank: 'GTBank',
    account: '0121000021',
    grossPay: 450000,
    stack: 'Dual-Inverter Power, Dedicated Fiber Redundancy, Server Bay HVAC',
    workload: 'Victoria Island HQ Power & Fiber Uptime (99.99%)',
    files: ['facilities/power-logs.json', 'facilities/hvac-telemetry.json'],
    benchmark: 'Facility Power Uptime: 99.99% · Backup Cutover: < 12ms'
  },
  {
    staffId: 'RIF-0022',
    name: 'Sergeant Musa Danjuma',
    email: 'musa@riffmax.tech',
    role: 'Chief Physical Security Officer & Hub Access Guard',
    type: 'ai_agent',
    dept: 'Facilities & Workplace Security',
    avatar: 'MD',
    bank: 'GTBank',
    account: '0121000022',
    grossPay: 420000,
    stack: 'Physical Perimeter Guarding, Gate QR Badge Scanning, Vehicle Inspection',
    workload: 'Victoria Island Corporate Corridor Gate Access & Shift Punch Gatekeeper',
    files: ['security/visitor-log.json', 'security/gate-punches.json'],
    benchmark: 'Gate Breach Deficit: 0 · Physical Badge Verification: 100%'
  },
  {
    staffId: 'RIF-0023',
    name: 'Suleiman Bello',
    email: 'suleiman@riffmax.tech',
    role: 'Shift Security Guard (Perimeter Patrol)',
    type: 'ai_agent',
    dept: 'Facilities & Workplace Security',
    avatar: 'SB',
    bank: 'GTBank',
    account: '0121000023',
    grossPay: 350000,
    stack: 'Night & Weekend Perimeter Patrol, CCTV Monitoring, Incident Logging',
    workload: 'HQ Perimeter Patrol & Real-Time Incident Reporting',
    files: ['security/patrol-route.json', 'security/incident-log.md'],
    benchmark: 'Patrol Interval: Every 45 Mins · Perimeter Coverage: 100%'
  },
  {
    staffId: 'RIF-0024',
    name: 'Chioma Anyanwu',
    email: 'chioma@riffmax.tech',
    role: 'Office Concierge & Frontline Hospitality Lead',
    type: 'ai_agent',
    dept: 'Facilities & Workplace Security',
    avatar: 'CA',
    bank: 'GTBank',
    account: '0121000024',
    grossPay: 380000,
    stack: 'Visitor Onboarding, Frontline Reception, Executive Hospitality',
    workload: 'Reception Desk Geofence Verification & Visitor Escort',
    files: ['facilities/visitor-badges.json', 'facilities/concierge-log.md'],
    benchmark: 'Visitor Check-In Time: < 45s · Hospitality CSAT: 99%'
  }
];

function calculateNigerianPayroll(gross) {
  // PITA 2011 & CRA: Consolidated Relief Allowance
  const cra = Math.max(200000, 0.01 * gross) + (0.20 * gross);
  const pension = Math.round(gross * 0.08); // 8% Employee
  const nhf = Math.round(gross * 0.025);   // 2.5% NHF
  const nsitf = Math.round(gross * 0.010); // 1.0% NSITF

  const totalReliefs = cra + pension + nhf;
  const taxableAnnual = Math.max(0, (gross * 12) - totalReliefs);

  // Progressive Tax Bands (PITA 2011)
  let annualTax = 0;
  let rem = taxableAnnual;
  const bands = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 }
  ];
  for (const b of bands) {
    if (rem <= 0) break;
    const chunk = Math.min(rem, b.limit);
    annualTax += chunk * b.rate;
    rem -= chunk;
  }
  const monthlyTax = Math.round(annualTax / 12);
  const totalDeductions = monthlyTax + pension + nhf + nsitf;
  const netPay = gross - totalDeductions;

  return { grossPay: gross, payeTax: monthlyTax, pension, nhf, nsitf, totalDeductions, netPay };
}

// ── 1. Update data/shiftrelay.json ──
function syncShiftRelayStore() {
  const storePath = path.join(dataDir, 'shiftrelay.json');
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

  if (!Array.isArray(store.portalUsers)) store.portalUsers = [];
  if (!Array.isArray(store.memberships)) store.memberships = [];
  if (!Array.isArray(store.contracts)) store.contracts = [];

  for (const s of FULL_ENTERPRISE_ROSTER) {
    const num = parseInt(s.staffId.replace('RIF-', ''), 10);
    const userId = `00000000-0000-4000-8000-${String(num).padStart(12, '0')}`;
    const membershipId = `00000000-0000-4000-8000-${String(100 + num).padStart(12, '0')}`;

    // Update portalUsers
    const existingUser = store.portalUsers.find(u => u.email.toLowerCase() === s.email.toLowerCase() || u.id === userId);
    if (existingUser) {
      existingUser.full_name = s.name;
      existingUser.password_hash = PASSWORD_HASH;
      existingUser.status = 'active';
      existingUser.email_verified = true;
    } else {
      store.portalUsers.push({
        id: userId,
        full_name: s.name,
        email: s.email,
        email_verified: true,
        created_at: new Date().toISOString(),
        password_hash: PASSWORD_HASH,
        status: 'active'
      });
    }

    // Update memberships
    const existingMembership = store.memberships.find(m => m.user_id === userId || m.id === membershipId);
    if (existingMembership) {
      existingMembership.title = s.role;
      existingMembership.department = s.dept;
      existingMembership.role = s.type === 'human' ? (s.name.includes('Sherif') ? 'owner' : 'manager') : 'worker';
      existingMembership.status = 'active';
    } else {
      store.memberships.push({
        id: membershipId,
        organisation_id: ORG_ID,
        user_id: userId,
        site_id: SITE_ID,
        role: s.type === 'human' ? (s.name.includes('Sherif') ? 'owner' : 'manager') : 'worker',
        title: s.role,
        department: s.dept,
        shift_name: s.dept.includes('Security') ? 'Perimeter Guard Shift' : 'Core Enterprise Shift',
        status: 'active',
        joined_at: new Date().toISOString()
      });
    }

    // Update contracts
    const existingContract = store.contracts.find(c => c.user_id === userId);
    const pay = calculateNigerianPayroll(s.grossPay);
    if (existingContract) {
      existingContract.base_rate = Math.round(s.grossPay / 173.33);
      existingContract.monthly_salary = s.grossPay;
      existingContract.bank_name = s.bank;
      existingContract.account_number = s.account;
      existingContract.status = 'active';
    } else {
      store.contracts.push({
        id: `00000000-0000-4000-8000-${String(200 + num).padStart(12, '0')}`,
        user_id: userId,
        organisation_id: ORG_ID,
        job_title: s.role,
        department: s.dept,
        rate_type: 'monthly',
        base_rate: Math.round(s.grossPay / 173.33),
        monthly_salary: s.grossPay,
        currency: 'NGN',
        bank_name: s.bank,
        account_number: s.account,
        status: 'active',
        created_at: new Date().toISOString()
      });
    }
  }

  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  console.log(`[ShiftRelay Store] Successfully synchronized ${FULL_ENTERPRISE_ROSTER.length} staff members.`);
}

// ── 2. Update data/riffmax-payslips.json ──
function syncPayslips() {
  const payslipsPath = path.join(dataDir, 'riffmax-payslips.json');
  let totalGross = 0;
  let totalNet = 0;
  let totalTax = 0;
  let totalPension = 0;

  const employees = FULL_ENTERPRISE_ROSTER.map(s => {
    const p = calculateNigerianPayroll(s.grossPay);
    totalGross += p.grossPay;
    totalNet += p.netPay;
    totalTax += p.payeTax;
    totalPension += p.pension;

    return {
      staffId: s.staffId,
      name: s.name,
      email: s.email,
      role: s.role,
      department: s.dept,
      bank: s.bank,
      account: s.account,
      month: '2026-11',
      payPeriod: '2026-11-01 to 2026-11-30',
      completedShifts: s.dept.includes('Security') ? 24 : 21,
      totalHours: s.dept.includes('Security') ? 192 : 179,
      grossPay: p.grossPay,
      payeTax: p.payeTax,
      pension: p.pension,
      nhf: p.nhf,
      nsitf: p.nsitf,
      totalDeductions: p.totalDeductions,
      netPay: p.netPay
    };
  });

  const payrollPayload = {
    tenant: 'RIF-2026',
    companyName: 'Riffmax Technology Limited',
    month: '2026-11',
    generatedAt: new Date().toISOString(),
    employeeCount: employees.length,
    totalGrossPay: totalGross,
    totalNetPay: totalNet,
    totalPayeTax: totalTax,
    totalPension: totalPension,
    currency: 'NGN',
    employees
  };

  fs.writeFileSync(payslipsPath, JSON.stringify(payrollPayload, null, 2), 'utf8');
  console.log(`[Payslips] Generated payroll for ${employees.length} staff. Total Gross: ₦${totalGross.toLocaleString()}`);
}

// ── 3. Update Obsidian Vault ──
function syncObsidianVault() {
  const departmentsDir = path.join(vaultDir, 'departments');
  const staffDir = path.join(vaultDir, 'staff');
  if (!fs.existsSync(departmentsDir)) fs.mkdirSync(departmentsDir, { recursive: true });
  if (!fs.existsSync(staffDir)) fs.mkdirSync(staffDir, { recursive: true });

  for (const s of FULL_ENTERPRISE_ROSTER) {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const agentFolder = path.join(staffDir, slug);
    if (!fs.existsSync(agentFolder)) fs.mkdirSync(agentFolder, { recursive: true });

    const profilePath = path.join(agentFolder, 'profile.md');
    if (!fs.existsSync(profilePath)) {
      const content = `---
title: ${s.name}
staff_id: ${s.staffId}
role: ${s.role}
department: ${s.dept}
type: ${s.type}
email: ${s.email}
bank: ${s.bank} (${s.account})
gross_salary_ngn: ${s.grossPay}
---

# ${s.name}
**${s.role}** · [[${s.dept}]]

## Autonomous Core Capabilities
- **Technical Stack / Discipline:** \`${s.stack}\`
- **Workload Focus:** ${s.workload}
- **Primary Files Touched:** ${(s.files || []).map(f => `\`${f}\``).join(', ')}
- **Benchmark Standard:** \`${s.benchmark}\`

## ShiftRelay Dogfooding Profile
- **Company ID:** \`RIF-2026\`
- **Work Email:** \`${s.email}\`
- **Clock-In Geofence:** Victoria Island Engineering Hub (6.4312° N, 3.4244° E, 120m radius)
- **Shift Duration:** 8 Hours / Daily
`;
      fs.writeFileSync(profilePath, content, 'utf8');
    }
  }
  console.log(`[Obsidian Vault] Synchronized profiles and departments.`);
}

syncShiftRelayStore();
syncPayslips();
syncObsidianVault();
