const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const dataFilePath = path.join(rootDir, 'data', 'shiftrelay.json');
const payslipsFilePath = path.join(rootDir, 'data', 'riffmax-payslips.json');

// Exact 24 Staff Roster specified in prompt
const ROSTER = [
  // Dept 1: Executive Directorate & Operations Leadership
  { num: 1, staffId: 'RIF-0001', name: 'Sherif Akanmu', email: 'sherif@riffmax.tech', role: 'owner', title: 'Managing Director & CEO', dept: 'Executive Directorate', salary: 1200000, bank: 'GTBank', account: '0121000001' },
  { num: 2, staffId: 'RIF-0002', name: 'Olaide Emmanuela', email: 'olaide@riffmax.tech', role: 'supervisor', title: 'Chief Operating Officer & Shift Supervisor', dept: 'Operations Leadership', salary: 750000, bank: 'GTBank', account: '0121000002' },

  // Dept 2: Core Engineering & Infrastructure
  { num: 5, staffId: 'RIF-0005', name: 'Tariq Al-Hassan', email: 'tariq@riffmax.tech', role: 'worker', title: 'Principal Distributed Backend Engineer', dept: 'Core Engineering & Infrastructure', salary: 650000, bank: 'GTBank', account: '0121000005' },
  { num: 3, staffId: 'RIF-0003', name: 'Babatunde Adeleke', email: 'babatunde@riffmax.tech', role: 'worker', title: 'Lead Frontend Systems Engineer', dept: 'Core Engineering & Infrastructure', salary: 650000, bank: 'GTBank', account: '0121000003' },
  { num: 4, staffId: 'RIF-0004', name: 'Chidinma Okonjo', email: 'chidinma@riffmax.tech', role: 'worker', title: 'Lead Mobile Native Engineer', dept: 'Core Engineering & Infrastructure', salary: 600000, bank: 'GTBank', account: '0121000004' },
  { num: 6, staffId: 'RIF-0006', name: 'Ngozi Eze', email: 'ngozi@riffmax.tech', role: 'worker', title: 'Lead QA & Security Specialist', dept: 'Core Engineering & Infrastructure', salary: 550000, bank: 'GTBank', account: '0121000006' },
  { num: 7, staffId: 'RIF-0007', name: 'Farouk Bello', email: 'farouk@riffmax.tech', role: 'worker', title: 'DevOps & Site Reliability Engineer', dept: 'Core Engineering & Infrastructure', salary: 580000, bank: 'GTBank', account: '0121000007' },
  { num: 12, staffId: 'RIF-0012', name: 'Ibrahim Yusuf', email: 'ibrahim@riffmax.tech', role: 'worker', title: 'Systems Integrations Specialist', dept: 'Core Engineering & Infrastructure', salary: 500000, bank: 'GTBank', account: '0121000012' },

  // Dept 3: Branding, Design & Creative Lab
  { num: 9, staffId: 'RIF-0009', name: 'Kelechi Nnamdi', email: 'kelechi@riffmax.tech', role: 'worker', title: 'Lead UI/UX Systems Designer', dept: 'Branding, Design & Creative Lab', salary: 520000, bank: 'GTBank', account: '0121000009' },
  { num: 13, staffId: 'RIF-0013', name: 'Adanna Adeleke', email: 'adanna@riffmax.tech', role: 'worker', title: 'Brand Identity & Visual Director', dept: 'Branding, Design & Creative Lab', salary: 540000, bank: 'GTBank', account: '0121000013' },
  { num: 14, staffId: 'RIF-0014', name: 'Simi Balogun', email: 'simi@riffmax.tech', role: 'worker', title: 'Motion Media & Interactive Onboarding Designer', dept: 'Branding, Design & Creative Lab', salary: 490000, bank: 'GTBank', account: '0121000014' },

  // Dept 4: Advertising, Growth & Marketing
  { num: 15, staffId: 'RIF-0015', name: 'Tunde Bakare', email: 'tunde@riffmax.tech', role: 'worker', title: 'Head of Growth Marketing & Acquisition', dept: 'Advertising, Growth & Marketing', salary: 560000, bank: 'GTBank', account: '0121000015' },
  { num: 16, staffId: 'RIF-0016', name: 'Amara Okeke', email: 'amara@riffmax.tech', role: 'worker', title: 'Brand Storyteller & Content Marketing Lead', dept: 'Advertising, Growth & Marketing', salary: 480000, bank: 'GTBank', account: '0121000016' },
  { num: 10, staffId: 'RIF-0010', name: 'Zainab Abubakar', email: 'zainab@riffmax.tech', role: 'worker', title: 'Customer Success & Field Ops Lead', dept: 'Advertising, Growth & Marketing', salary: 480000, bank: 'GTBank', account: '0121000010' },

  // Dept 5: Business Strategy & Investor Relations
  { num: 17, staffId: 'RIF-0017', name: 'Femi Otedola-Coker', email: 'femi@riffmax.tech', role: 'worker', title: 'Head of Strategic Finance & Investor Relations', dept: 'Business Strategy & Investor Relations', salary: 620000, bank: 'GTBank', account: '0121000017' },
  { num: 18, staffId: 'RIF-0018', name: 'Chidinma Kalu', email: 'kalu@riffmax.tech', role: 'worker', title: 'Enterprise Commercial & B2B Partnerships Lead', dept: 'Business Strategy & Investor Relations', salary: 550000, bank: 'GTBank', account: '0121000018' },

  // Dept 6: Legal, Regulatory & Labor Compliance
  { num: 19, staffId: 'RIF-0019', name: 'Barrister Yetunde Williams', email: 'yetunde@riffmax.tech', role: 'worker', title: 'General Counsel & Data Protection Officer', dept: 'Legal, Regulatory & Labor Compliance', salary: 650000, bank: 'GTBank', account: '0121000019' },
  { num: 8, staffId: 'RIF-0008', name: 'Folake Balogun', email: 'folake@riffmax.tech', role: 'worker', title: 'Product Regulatory & Labor Law Specialist', dept: 'Legal, Regulatory & Labor Compliance', salary: 540000, bank: 'GTBank', account: '0121000008' },

  // Dept 7: Human Resources & People Operations
  { num: 20, staffId: 'RIF-0020', name: 'Blessing Nwachukwu', email: 'blessing@riffmax.tech', role: 'worker', title: 'Head of People & Talent Operations', dept: 'Human Resources & People Operations', salary: 520000, bank: 'GTBank', account: '0121000020' },
  { num: 11, staffId: 'RIF-0011', name: 'Damilola Fashola', email: 'damilola@riffmax.tech', role: 'worker', title: 'Data Platform & Payroll Telemetry Engineer', dept: 'Human Resources & People Operations', salary: 520000, bank: 'GTBank', account: '0121000011' },

  // Dept 8: Facilities & Physical Workplace Security
  { num: 21, staffId: 'RIF-0021', name: 'Emeka Obinna', email: 'emeka@riffmax.tech', role: 'worker', title: 'Facilities & Workplace Infrastructure Manager', dept: 'Facilities & Physical Workplace Security', salary: 450000, bank: 'GTBank', account: '0121000021' },
  { num: 22, staffId: 'RIF-0022', name: 'Sergeant Musa Danjuma', email: 'musa@riffmax.tech', role: 'worker', title: 'Chief Physical Security Officer & Hub Access Guard', dept: 'Facilities & Physical Workplace Security', salary: 420000, bank: 'GTBank', account: '0121000022' },
  { num: 23, staffId: 'RIF-0023', name: 'Suleiman Bello', email: 'suleiman@riffmax.tech', role: 'worker', title: 'Shift Security Guard (Perimeter Patrol)', dept: 'Facilities & Physical Workplace Security', salary: 350000, bank: 'GTBank', account: '0121000023' },
  { num: 24, staffId: 'RIF-0024', name: 'Chioma Anyanwu', email: 'chioma@riffmax.tech', role: 'worker', title: 'Office Concierge & Frontline Hospitality Lead', dept: 'Facilities & Physical Workplace Security', salary: 380000, bank: 'GTBank', account: '0121000024' }
];

// Universal Password Hash for Riffmax2026!
const UNIVERSAL_PW_HASH = '7b31e66ba6e49c68372e58d0a00829d3:a5e2489fa6f3841ee9c8099bf3425c808ebd1ae72ac18fd7d188eb9a2daf728198fa664db814cbd38b16b81a6ad7f2edf39bf0ecbfd8a4863931aeaf1c35d96a';
const ORG_ID = '00000000-0000-4000-8000-000000000100';
const SITE_ID = '00000000-0000-4000-8000-000000000101';

function syncDataStore() {
  const store = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

  // 1. Synchronize Organization Details
  store.organisations = [
    {
      id: ORG_ID,
      organisation_code: 'RIF-2026',
      aliases: ['RIF-2026', 'RIFFMAX', 'RIFFMAX-01', 'RIF-01'],
      legal_name: 'Riffmax Technology Limited',
      trading_name: 'Riffmax Technology',
      work_email: 'sherif@riffmax.tech',
      industry: 'Enterprise SaaS & Workforce DeepTech',
      country: 'Nigeria',
      currency: 'NGN',
      time_zone: 'Africa/Lagos',
      hub_name: 'Riffmax Software Engineering Hub',
      address: 'Plot 12, Victoria Island Corporate Corridor, Lagos State, Nigeria',
      hub_lat: 6.4312,
      hub_lng: 3.4244,
      hub_perimeter: 120,
      subscription_tier: 'enterprise_founding_partner',
      verification_status: 'verified',
      onboarding_fee_paid: true,
      monthly_fee_ngn: 500000,
      pepm_ngn: 5000
    }
  ];

  // 2. Synchronize Portal Users
  store.portalUsers = ROSTER.map(s => {
    const id = `00000000-0000-4000-8000-${String(s.num).padStart(12, '0')}`;
    return {
      id,
      tenant_id: ORG_ID,
      organisation_id: ORG_ID,
      full_name: s.name,
      email: s.email,
      email_verified: true,
      password_hash: UNIVERSAL_PW_HASH,
      status: 'active',
      created_at: new Date().toISOString()
    };
  });

  // Also retain user's personal admin email if present
  store.portalUsers.push({
    id: '00000000-0000-4000-8000-000000000099',
    tenant_id: ORG_ID,
    organisation_id: ORG_ID,
    full_name: 'Sherif Akanmu (Founder Admin)',
    email: 'sherifolaide2030@gmail.com',
    email_verified: true,
    password_hash: UNIVERSAL_PW_HASH,
    status: 'active',
    created_at: new Date().toISOString()
  });

  // 3. Synchronize Memberships
  store.memberships = ROSTER.map(s => {
    const userId = `00000000-0000-4000-8000-${String(s.num).padStart(12, '0')}`;
    return {
      id: userId,
      organisation_id: ORG_ID,
      user_id: userId,
      site_id: SITE_ID,
      role: s.role,
      title: s.title,
      department: s.dept,
      status: 'active',
      shift_start: '08:00',
      shift_end: '17:00',
      shift_days: 'Mon-Fri'
    };
  });

  // 4. Synchronize Exactly 24 Contracts (Total Gross: ₦13,550,000)
  let totalGross = 0;
  store.contracts = ROSTER.map(s => {
    const userId = `00000000-0000-4000-8000-${String(s.num).padStart(12, '0')}`;
    totalGross += s.salary;
    return {
      id: `00000000-0000-4000-8000-${String(200 + s.num).padStart(12, '0')}`,
      userId,
      user_id: userId,
      tenant_id: ORG_ID,
      organisation_id: ORG_ID,
      userName: s.name,
      staffId: s.staffId,
      role: s.title,
      department: s.dept,
      compensation_type: 'fixed_monthly',
      monthly_rate: s.salary,
      monthly_salary: s.salary,
      hourly_rate: Math.round(s.salary / 160),
      currency: 'NGN',
      bank_name: s.bank + ' (Guaranty Trust Bank)',
      account_number: s.account,
      account_name: s.name,
      status: 'active'
    };
  });

  fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
  console.log(`✓ Synchronized ${ROSTER.length} staff members and contracts.`);
  console.log(`✓ Total Monthly Payroll Gross: ₦${totalGross.toLocaleString()}`);
}

syncDataStore();
