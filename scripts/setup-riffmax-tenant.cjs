const fs = require('fs');
const path = require('path');

console.log('── Setting up Riffmax Technology Tenant & Clean Slate ──');

// ── 1. Create Clean data/shiftrelay.json ──
const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'shiftrelay.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const riffmaxOrgId = '00000000-0000-4000-8000-000000000100';
const riffmaxSiteId = '00000000-0000-4000-8000-000000000101';

const riffmaxStaff = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Sherif Akanmu',
    email: 'sherif@riffmax.tech',
    role: 'owner',
    title: 'Managing Director & Organisation Owner',
    department: 'Executive Directorate',
    shift: 'Executive Oversight',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Olaide Emmanuela',
    email: 'olaide@riffmax.tech',
    role: 'supervisor',
    title: 'Operations Lead & Shift Supervisor',
    department: 'Operations & Delivery',
    shift: 'Morning Operations (07:00 - 15:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Babatunde Adeleke',
    email: 'babatunde@riffmax.tech',
    role: 'worker',
    title: 'Lead Frontend Architect',
    department: 'Frontend Engineering',
    shift: 'Morning (08:00 - 16:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Chidinma Okonjo',
    email: 'chidinma@riffmax.tech',
    role: 'worker',
    title: 'Mobile Native Lead (Android/iOS)',
    department: 'Mobile Engineering',
    shift: 'Morning (08:00 - 16:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Tariq Al-Hassan',
    email: 'tariq@riffmax.tech',
    role: 'worker',
    title: 'Senior Distributed Systems Engineer',
    department: 'Backend Infrastructure',
    shift: 'Evening (15:00 - 23:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Ngozi Eze',
    email: 'ngozi@riffmax.tech',
    role: 'worker',
    title: 'Lead Security & QA Auditor',
    department: 'Quality & Security',
    shift: 'Morning (08:00 - 16:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    name: 'Farouk Bello',
    email: 'farouk@riffmax.tech',
    role: 'worker',
    title: 'DevOps & Cloud Infrastructure Engineer',
    department: 'Cloud Infrastructure',
    shift: 'Night (23:00 - 07:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    name: 'Folake Balogun',
    email: 'folake@riffmax.tech',
    role: 'worker',
    title: 'Product Operations Specialist',
    department: 'Product Operations',
    shift: 'Morning (08:00 - 16:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    name: 'Kelechi Nnamdi',
    email: 'kelechi@riffmax.tech',
    role: 'worker',
    title: 'Compliance & Statutory Tax Analyst',
    department: 'Finance & Compliance',
    shift: 'Morning (08:00 - 16:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Zainab Abubakar',
    email: 'zainab@riffmax.tech',
    role: 'worker',
    title: 'UI/UX Systems & Brand Designer',
    department: 'Design Systems',
    shift: 'Morning (08:00 - 16:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    name: 'Damilola Fashola',
    email: 'damilola@riffmax.tech',
    role: 'worker',
    title: 'Field Operations & QA Specialist',
    department: 'Field Operations',
    shift: 'Evening (15:00 - 23:30)',
    status: 'active'
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    name: 'Ibrahim Yusuf',
    email: 'ibrahim@riffmax.tech',
    role: 'worker',
    title: 'Technical Support & Reliability Lead',
    department: 'Site Reliability',
    shift: 'Night (23:00 - 07:30)',
    status: 'active'
  }
];

const freshStore = {
  organisations: [
    {
      id: riffmaxOrgId,
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
      address: 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria',
      hub_lat: 6.4312,
      hub_lng: 3.4244,
      hub_perimeter: 120,
      subscription_tier: 'enterprise_founding_partner',
      verification_status: 'verified',
      onboarding_fee_paid: true,
      monthly_fee_ngn: 500000,
      pepm_ngn: 5000
    }
  ],
  portalUsers: riffmaxStaff.map(s => ({
    id: s.id,
    full_name: s.name,
    email: s.email,
    email_verified: true,
    created_at: new Date().toISOString()
  })),
  memberships: riffmaxStaff.map(s => ({
    id: s.id,
    organisation_id: riffmaxOrgId,
    user_id: s.id,
    site_id: riffmaxSiteId,
    role: s.role,
    title: s.title,
    department: s.department,
    shift_name: s.shift,
    status: s.status,
    joined_at: new Date().toISOString()
  })),
  scheduledShifts: riffmaxStaff.filter(s => s.role !== 'owner').map((s, idx) => ({
    id: 'shift_riffmax_' + (idx + 1),
    organisation_id: riffmaxOrgId,
    membership_id: s.id,
    worker_name: s.name,
    role: s.title,
    department: s.department,
    shift_date: new Date().toISOString().slice(0, 10),
    shift_type: s.shift.startsWith('Morning') ? 'morning' : (s.shift.startsWith('Evening') ? 'afternoon' : 'night'),
    shift_start: s.shift.includes('07:00') ? '07:00' : (s.shift.includes('08:00') ? '08:00' : (s.shift.includes('15:00') ? '15:00' : '23:00')),
    shift_end: s.shift.includes('15:30') ? '15:30' : (s.shift.includes('16:30') ? '16:30' : (s.shift.includes('23:30') ? '23:30' : '07:30')),
    status: 'scheduled'
  })),
  handovers: [],
  notifications: [
    {
      id: 'notif_welcome_01',
      recipientId: riffmaxStaff[0].id,
      title: 'Welcome to ShiftRelay Enterprise',
      message: 'Riffmax Technology workspace successfully provisioned with Lagos Victoria Island Geofence.',
      category: 'all',
      createdAt: new Date().toISOString(),
      read: false
    }
  ],
  contracts: [],
  timeEntries: [],
  punchCorrections: [],
  workerProfiles: [],
  rewards: [],
  assistantInteractions: [],
  shiftSwaps: [],
  openShifts: [],
  adminSessions: [],
  rewardLiquidations: [],
  announcements: [
    {
      id: 'ann_riffmax_01',
      organisation_id: riffmaxOrgId,
      author_id: riffmaxStaff[0].id,
      author_name: 'Sherif Akanmu',
      author_title: 'Managing Director & CEO',
      title: 'Welcome Riffmax Engineering & Operations Team',
      body: 'ShiftRelay live production operations have officially commenced for Riffmax Technology.',
      created_at: new Date().toISOString()
    }
  ]
};

fs.writeFileSync(dataFile, JSON.stringify(freshStore, null, 2), 'utf8');
console.log('✓ Successfully wrote fresh Riffmax Technology data store to data/shiftrelay.json');

// ── 2. Update database.mjs demoOrganisation and demoMembers ──
const dbFilePath = path.join(__dirname, '..', 'database.mjs');
let dbCode = fs.readFileSync(dbFilePath, 'utf8');

const oldDemoOrgBlock = `export const demoOrganisation = {
  id: '00000000-0000-4000-8000-000000000100',
  code: 'SR-GLOBAL-01',
  siteId: '00000000-0000-4000-8000-000000000101'
};`;

const newDemoOrgBlock = `export const demoOrganisation = {
  id: '00000000-0000-4000-8000-000000000100',
  code: 'RIF-2026',
  siteId: '00000000-0000-4000-8000-000000000101'
};`;

if (dbCode.includes(oldDemoOrgBlock)) {
  dbCode = dbCode.replace(oldDemoOrgBlock, newDemoOrgBlock);
  console.log('✓ Updated demoOrganisation in database.mjs');
}

const oldDemoMembersBlock = `export const demoMembers = [
  { id: '00000000-0000-4000-8000-000000000011', name: 'Amina Otieno', email: 'amina@shiftrelay.demo', role: 'outgoing', title: 'Operations worker', department: 'Operations', avatar_data_url: '/uploads/avatars/avatar-amina.jpg', cover_photo_url: '/uploads/covers/cover-operations.jpg' },
  { id: '00000000-0000-4000-8000-000000000012', name: 'David Kariuki', email: 'david@shiftrelay.demo', role: 'supervisor', title: 'Shift supervisor', department: 'Operations', avatar_data_url: '/uploads/avatars/avatar-david.jpg', cover_photo_url: '/uploads/covers/cover-supervisor.jpg' },
  { id: '00000000-0000-4000-8000-000000000013', name: 'Faith Wanjiku', email: 'faith@shiftrelay.demo', role: 'incoming', title: 'Incoming worker', department: 'Operations', avatar_data_url: '/uploads/avatars/avatar-faith.jpg', cover_photo_url: '/uploads/covers/cover-logistics.jpg' },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Jordan Lee', email: 'jordan@shiftrelay.demo', role: 'owner', title: 'Organisation owner', department: 'Leadership', avatar_data_url: '/uploads/avatars/avatar-jordan.jpg', cover_photo_url: '/uploads/covers/cover-engineering.jpg' }
];`;

const newDemoMembersBlock = `export const demoMembers = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Sherif Akanmu', email: 'sherif@riffmax.tech', role: 'owner', title: 'Managing Director & CEO', department: 'Executive Directorate' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Olaide Emmanuela', email: 'olaide@riffmax.tech', role: 'supervisor', title: 'Operations Lead & Shift Supervisor', department: 'Operations & Delivery' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Babatunde Adeleke', email: 'babatunde@riffmax.tech', role: 'outgoing', title: 'Lead Frontend Architect', department: 'Frontend Engineering' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Chidinma Okonjo', email: 'chidinma@riffmax.tech', role: 'incoming', title: 'Mobile Native Lead', department: 'Mobile Engineering' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Tariq Al-Hassan', email: 'tariq@riffmax.tech', role: 'worker', title: 'Senior Distributed Systems Engineer', department: 'Backend Infrastructure' }
];`;

if (dbCode.includes(oldDemoMembersBlock)) {
  dbCode = dbCode.replace(oldDemoMembersBlock, newDemoMembersBlock);
  console.log('✓ Updated demoMembers in database.mjs');
}

fs.writeFileSync(dbFilePath, dbCode, 'utf8');

// ── 3. Update phase1-shell.js Personas & Normalization ──
const shellFilePath = path.join(__dirname, '..', 'phase1-shell.js');
let shellCode = fs.readFileSync(shellFilePath, 'utf8');

const oldShellPersonas = `  const ROLE_DEMO_PERSONAS = {
    cleaner: {
      id: 'usr_cleaner_demo',
      name: 'Amara Okafor',
      email: 'amara@cleanpro.ng',
      role: 'worker',
      title: 'Senior Cleaner',
      organisation_name: 'CleanPro Facilities',
      site_name: 'Eko Atlantic Tower A',
      company_id: 'CP-4482',
      stars: 950
    },
    supervisor: {
      id: 'usr_supervisor_demo',
      name: 'David Kariuki',
      email: 'david@cleanpro.ng',
      role: 'supervisor',
      title: 'Shift Supervisor',
      organisation_name: 'CleanPro Facilities',
      site_name: 'Eko Atlantic Complex',
      company_id: 'CP-4482',
      stars: 2400
    },
    owner: {
      id: 'usr_owner_demo',
      name: 'Jordan Lee',
      email: 'jordan@cleanpro.ng',
      role: 'owner',
      title: 'Managing Director & Facility Owner',
      organisation_name: 'CleanPro Facilities',
      site_name: 'Corporate HQ',
      company_id: 'CP-4482',
      stars: 5000
    }
  };`;

const newShellPersonas = `  const ROLE_DEMO_PERSONAS = {
    cleaner: {
      id: 'usr_cleaner_demo',
      name: 'Babatunde Adeleke',
      email: 'babatunde@riffmax.tech',
      role: 'worker',
      title: 'Lead Frontend Architect',
      organisation_name: 'Riffmax Technology',
      site_name: 'Victoria Island Engineering Hub',
      company_id: 'RIF-2026',
      stars: 1200
    },
    supervisor: {
      id: 'usr_supervisor_demo',
      name: 'Olaide Emmanuela',
      email: 'olaide@riffmax.tech',
      role: 'supervisor',
      title: 'Operations Lead & Shift Supervisor',
      organisation_name: 'Riffmax Technology',
      site_name: 'Victoria Island Engineering Hub',
      company_id: 'RIF-2026',
      stars: 2800
    },
    owner: {
      id: 'usr_owner_demo',
      name: 'Sherif Akanmu',
      email: 'sherif@riffmax.tech',
      role: 'owner',
      title: 'Managing Director & CEO',
      organisation_name: 'Riffmax Technology',
      site_name: 'Corporate HQ (Lagos)',
      company_id: 'RIF-2026',
      stars: 5000
    }
  };`;

if (shellCode.includes(oldShellPersonas)) {
  shellCode = shellCode.replace(oldShellPersonas, newShellPersonas);
  console.log('✓ Updated ROLE_DEMO_PERSONAS in phase1-shell.js');
}

// Update normalizeDemoUser
const oldNormalizeTarget = `    if (copy.id === 'usr_cleaner_demo' || (copy.role === 'worker' && !copy.id?.startsWith('00000000-'))) {
      copy.id = '00000000-0000-4000-8000-000000000011';
      copy.role = 'outgoing';
      copy.name = copy.name || 'Amina Otieno';
      copy.email = copy.email || 'amina@shiftrelay.demo';
      copy.title = copy.title || 'Senior Cleaner & Operations Specialist';
      copy.department = copy.department || 'Operations';
      copy.organisation_name = copy.organisation_name || 'CleanPro Facilities';
    } else if (copy.id === 'usr_supervisor_demo' || (copy.role === 'supervisor' && !copy.id?.startsWith('00000000-'))) {
      copy.id = '00000000-0000-4000-8000-000000000012';
      copy.role = 'supervisor';
      copy.name = copy.name || 'David Kariuki';
      copy.email = copy.email || 'david@shiftrelay.demo';
      copy.title = copy.title || 'Shift Supervisor';
      copy.department = copy.department || 'Operations';
      copy.organisation_name = copy.organisation_name || 'CleanPro Facilities';
    } else if (copy.id === 'usr_owner_demo' || (copy.role === 'owner' && !copy.id?.startsWith('00000000-'))) {
      copy.id = '00000000-0000-4000-8000-000000000014';
      copy.role = 'owner';
      copy.name = copy.name || 'Jordan Lee';
      copy.email = copy.email || 'jordan@shiftrelay.demo';
      copy.title = copy.title || 'Managing Director & Facility Owner';
      copy.department = copy.department || 'Leadership';
      copy.organisation_name = copy.organisation_name || 'CleanPro Facilities';
    }`;

const newNormalizeTarget = `    if (copy.id === 'usr_cleaner_demo' || (copy.role === 'worker' && !copy.id?.startsWith('00000000-'))) {
      copy.id = '00000000-0000-4000-8000-000000000003';
      copy.role = 'outgoing';
      copy.name = copy.name || 'Babatunde Adeleke';
      copy.email = copy.email || 'babatunde@riffmax.tech';
      copy.title = copy.title || 'Lead Frontend Architect';
      copy.department = copy.department || 'Frontend Engineering';
      copy.organisation_name = copy.organisation_name || 'Riffmax Technology';
    } else if (copy.id === 'usr_supervisor_demo' || (copy.role === 'supervisor' && !copy.id?.startsWith('00000000-'))) {
      copy.id = '00000000-0000-4000-8000-000000000002';
      copy.role = 'supervisor';
      copy.name = copy.name || 'Olaide Emmanuela';
      copy.email = copy.email || 'olaide@riffmax.tech';
      copy.title = copy.title || 'Operations Lead & Shift Supervisor';
      copy.department = copy.department || 'Operations & Delivery';
      copy.organisation_name = copy.organisation_name || 'Riffmax Technology';
    } else if (copy.id === 'usr_owner_demo' || (copy.role === 'owner' && !copy.id?.startsWith('00000000-'))) {
      copy.id = '00000000-0000-4000-8000-000000000001';
      copy.role = 'owner';
      copy.name = copy.name || 'Sherif Akanmu';
      copy.email = copy.email || 'sherif@riffmax.tech';
      copy.title = copy.title || 'Managing Director & CEO';
      copy.department = copy.department || 'Executive Directorate';
      copy.organisation_name = copy.organisation_name || 'Riffmax Technology';
    }`;

if (shellCode.includes(oldNormalizeTarget)) {
  shellCode = shellCode.replace(oldNormalizeTarget, newNormalizeTarget);
  console.log('✓ Updated normalizeDemoUser in phase1-shell.js');
}

// Update header default company info
shellCode = shellCode.replace(/ID: \${escapeHtml\(user\.company_id \|\| '246701'\)}/g, "ID: ${escapeHtml(user.company_id || 'RIF-2026')}");
shellCode = shellCode.replace(/user\.organisation_name \|\| 'Apex Healthcare'/g, "user.organisation_name || 'Riffmax Technology'");
shellCode = shellCode.replace(/user\.organisation_name \|\| user\.organisationId \|\| 'Workplace'/g, "user.organisation_name || user.organisationId || 'Riffmax Technology'");

fs.writeFileSync(shellFilePath, shellCode, 'utf8');

// ── 4. Update app.js default prefilled company code ──
const appFilePath = path.join(__dirname, '..', 'app.js');
let appCode = fs.readFileSync(appFilePath, 'utf8');

appCode = appCode.replace(/value="246701"/g, 'value="RIF-2026"');
appCode = appCode.replace(/placeholder="e\.g\. DAN-NG-4011 or 246701"/g, 'placeholder="e.g. RIF-2026"');

fs.writeFileSync(appFilePath, appCode, 'utf8');
console.log('✓ Updated app.js prefilled code to RIF-2026');

console.log('── Setup Complete: Riffmax Technology (RIF-2026) is now the primary live tenant! ──');
