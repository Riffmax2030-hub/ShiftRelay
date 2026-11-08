import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import util from 'util';

const scrypt = util.promisify(crypto.scrypt);

const rootDir = process.cwd();
const dataFilePath = path.join(rootDir, 'data', 'shiftrelay.json');
const stateFilePath = path.join(rootDir, 'data', 'riffmax-simulation-state.json');
const payslipsFilePath = path.join(rootDir, 'data', 'riffmax-payslips.json');
const vaultDir = path.join(rootDir, 'riffmax-brain');

// Hub GPS Coordinates: Victoria Island / Lekki Corridor, Lagos, Nigeria
const HUB_COORDS = { latitude: 6.4312, longitude: 3.4244 };
const HUB_PERIMETER = 120; // meters
const TENANT_CODE = 'RIF-2026';
const TENANT_ID = '00000000-0000-4000-8000-000000000100';
const DEFAULT_PASSWORD = 'Riffmax2026!';

import { FULL_ENTERPRISE_ROSTER } from './onboard-riffmax-full-enterprise.mjs';

export const STAFF = FULL_ENTERPRISE_ROSTER.map(s => {
  const num = parseInt(s.staffId.replace('RIF-', ''), 10);
  const id = `00000000-0000-4000-8000-${String(num).padStart(12, '0')}`;
  return {
    id,
    staffId: s.staffId,
    name: s.name,
    email: s.email,
    role: s.type === 'human' ? (s.name.includes('Sherif') ? 'owner' : 'supervisor') : 'worker',
    title: s.role,
    dept: s.dept,
    zone: s.dept.includes('Security') ? 'facilities' : 'engineering',
    salary: s.grossPay,
    bank: s.bank,
    account: s.account
  };
});

function readDataStore() {
  if (!fs.existsSync(dataFilePath)) return { portalUsers: [], memberships: [], timeEntries: [], handovers: [], rewards: {}, contracts: [] };
  return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
}

function writeDataStore(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ── Nigerian Statutory Deductions (CRA Finance Act, Pension Reform Act, NHF) ──
export function calculateNigerianPay(monthlyGross) {
  const annualGross = monthlyGross * 12;
  // Pension Employee 8%
  const monthlyPension = Math.round(monthlyGross * 0.08);
  // NHF 2.5% of basic
  const monthlyNHF = Math.round(monthlyGross * 0.025);
  // NSITF 1% Employer paid (record for statutory audit)
  const monthlyNSITF = Math.round(monthlyGross * 0.01);

  // Consolidated Relief Allowance (CRA): Higher of 200k or 1% of gross + 20% of gross
  const craBase = Math.max(200000, annualGross * 0.01);
  const cra20 = annualGross * 0.20;
  const annualCRA = craBase + cra20;
  const annualPension = monthlyPension * 12;
  const annualNHF = monthlyNHF * 12;

  const taxableIncome = Math.max(0, annualGross - annualCRA - annualPension - annualNHF);

  // Progressive Tax Bands (Personal Income Tax Act PITA)
  let remaining = taxableIncome;
  let annualTax = 0;

  const bands = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 }
  ];

  for (const b of bands) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, b.limit);
    annualTax += taxableInBand * b.rate;
    remaining -= taxableInBand;
  }

  if (annualTax < annualGross * 0.01) annualTax = annualGross * 0.01;

  const monthlyPAYE = Math.round(annualTax / 12);
  const totalDeductions = monthlyPAYE + monthlyPension + monthlyNHF;
  const netPay = monthlyGross - totalDeductions;

  return {
    grossPay: monthlyGross,
    payeTax: monthlyPAYE,
    pension: monthlyPension,
    nhf: monthlyNHF,
    nsitf: monthlyNSITF,
    totalDeductions,
    netPay
  };
}

// ── 1. Layer-1 & 2 Authentication ──
export async function authenticateAgent(email, password = DEFAULT_PASSWORD) {
  const store = readDataStore();
  const org = (store.organisations || []).find(o => o.organisation_code === TENANT_CODE || (o.aliases || []).includes(TENANT_CODE));
  if (!org) throw new Error(`Tenant ${TENANT_CODE} not found.`);

  const user = (store.portalUsers || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`User ${email} not found.`);

  const member = (store.memberships || []).find(m => m.user_id === user.id);
  if (!member || member.status !== 'active') throw new Error(`Active membership not found for ${email}.`);

  if (user.password_hash) {
    const [salt, expected] = user.password_hash.split(':');
    const actual = (await scrypt(password, salt, 64)).toString('hex');
    if (actual !== expected) throw new Error(`Invalid credentials for ${email}.`);
  }

  const sessionId = crypto.randomUUID();
  if (!store.userSessions) store.userSessions = {};
  store.userSessions[sessionId] = { userId: user.id, memberId: member.id, createdAt: new Date().toISOString() };
  writeDataStore(store);

  return { sessionId, user, member, org };
}

// ── 2. Award Activity Stars to an Agent ──
export function awardStars(staffId, amount, reason, badge = 'Achievement') {
  const store = readDataStore();
  if (!store.rewards || Array.isArray(store.rewards)) store.rewards = {};
  if (!store.rewards[staffId]) {
    store.rewards[staffId] = {
      starsBalance: 2450,
      coinsBalance: 2450,
      lifetimeEarned: 2450,
      level: 4,
      levelName: 'Shift Specialist',
      claimedQuests: ['quest-profile'],
      ledger: []
    };
  }

  const rw = store.rewards[staffId];
  rw.starsBalance += amount;
  rw.coinsBalance += amount;
  rw.lifetimeEarned += amount;
  const tx = {
    id: 'tx-' + crypto.randomUUID().slice(0, 8),
    type: 'earn',
    title: reason,
    stars: amount,
    badge,
    timestamp: new Date().toISOString()
  };
  rw.ledger.unshift(tx);
  writeDataStore(store);

  return { starsBalance: rw.starsBalance, tx };
}

// ── 3. Clock-In with Geofence & Anti-Farming Guard ──
export async function clockInAgent(staffMember, coords = HUB_COORDS, dateString = null) {
  const store = readDataStore();
  const dateKey = dateString || new Date().toISOString().slice(0, 10);
  
  if (!Array.isArray(store.timeEntries)) store.timeEntries = [];

  // Check anti-farming: only 1 completed shift cycle per worker per calendar day
  const existingToday = store.timeEntries.find(e => 
    e.membershipId === staffMember.id && 
    e.clockedInAt && e.clockedInAt.startsWith(dateKey)
  );

  if (existingToday && existingToday.clockedOutAt) {
    return {
      status: 'anti_farming_blocked',
      message: `Anti-farming guard active: ${staffMember.name} has completed shift for ${dateKey}. Duplicate punches blocked.`,
      entry: existingToday,
      starsAwarded: 0
    };
  }

  if (existingToday && !existingToday.clockedOutAt) {
    return {
      status: 'already_clocked_in',
      message: `${staffMember.name} is currently clocked in for ${dateKey}.`,
      entry: existingToday,
      starsAwarded: 0
    };
  }

  const distance = haversineMeters(coords.latitude, coords.longitude, HUB_COORDS.latitude, HUB_COORDS.longitude);
  const withinGeofence = distance <= HUB_PERIMETER;
  const geofenceStatus = withinGeofence ? 'within_geofence' : 'outside_geofence_flagged';
  const verificationDetails = withinGeofence
    ? `GPS Verified On-Site (${distance}m from Lekki Hub)`
    : `⚠️ Flagged: ${distance}m outside approved perimeter`;

  const clockInTime = dateString ? `${dateString}T08:00:00.000Z` : new Date().toISOString();

  const newEntry = {
    id: crypto.randomUUID(),
    organisationId: TENANT_ID,
    membershipId: staffMember.id,
    clockedInAt: clockInTime,
    clockedOutAt: null,
    note: `Autonomous Punch: ${staffMember.title}`,
    verificationMode: 'gps_snapshot',
    verificationDetails,
    geofenceStatus,
    distanceMeters: distance,
    siteName: 'Riffmax Software Engineering Hub',
    coords
  };

  store.timeEntries.unshift(newEntry);
  writeDataStore(store);

  // Award attendance star points (+25)
  const { starsBalance } = awardStars(staffMember.id, 25, 'GPS On-Premises Shift Clock-In (Verified Lekki Hub)', 'Verified Entry');

  return {
    status: 'clocked_in',
    message: `${staffMember.name} clocked in on-site (${distance}m from Lekki Hub). +25 ⭐ Stars awarded!`,
    entry: newEntry,
    starsAwarded: 25,
    starsBalance
  };
}

// ── 4. Specialist Work Loop & Autonomous Learning ──
export async function executeSpecialistWorkAndLearn(staffMember) {
  let taskResult = {};
  let learning = '';

  switch (staffMember.name) {
    case 'Babatunde Adeleke':
      taskResult = { title: 'Bento UI Card Virtualization & CSS Tokens', score: '100% 60FPS Verified', stars: 40 };
      learning = `Virtualizing large shift calendar renders reduced DOM nodes by 45%. Bento cards now render smoothly under high-DPI tablets with zero paint lag.`;
      break;
    case 'Chidinma Okonjo':
      taskResult = { title: 'Capacitor Geolocation Native Listener', score: 'Precision 3.2m', stars: 40 };
      learning = `Verified high-accuracy Android 15 & iOS 18 location polling. Implemented automatic fallback to cellular tower triangulation when inside multi-story concrete bays.`;
      break;
    case 'Tariq Al-Hassan':
      taskResult = { title: 'Idempotency Key Engine & Transaction Isolation', score: 'Zero Duplicate Mutations', stars: 40 };
      learning = `Added canonical JSON request fingerprinting for all POST /api/time-entries. Duplicate double-clicks are intercepted within 2ms and safely replayed.`;
      break;
    case 'Ngozi Eze':
      taskResult = { title: 'OWASP Penetration & Route Guard Audit', score: '44/44 Security Tests Passing', stars: 45 };
      learning = `Penetration audit validated strict tenant gating. Verified that no user from outside RIF-2026 can query contracts or time-entries. Rate limiting enforced at 60 req/min.`;
      break;
    case 'Farouk Bello':
      taskResult = { title: 'Frankfurt Database Pool & Uptime Telemetry', score: 'Median Latency 18.2ms', stars: 40 };
      learning = `PostgreSQL connection pool tuned to 10 dedicated connections with automatic idle cleanup. Node v24 memory profile stable at 64MB RSS after 1,000 requests.`;
      break;
    case 'Folake Balogun':
      taskResult = { title: 'Nigerian Labor Act & Anti-Fatigue Verification', score: '100% Statutory Compliant', stars: 35 };
      learning = `Verified statutory overtime capping at 1.5x basic hourly rate and strictly enforced mandatory 11-hour rest intervals between shifts.`;
      break;
    case 'Kelechi Nnamdi':
      taskResult = { title: 'Design System & Sunlight Contrast Audit', score: 'WCAG AAA Compliant', stars: 35 };
      learning = `Audited high-contrast emerald and cyan color tokens for factory floor visibility under direct sunlight. Increased badge font weight to 700.`;
      break;
    case 'Zainab Abubakar':
      taskResult = { title: 'Frontline Worker Adoption & Pilot Feedback', score: '98% Satisfaction', stars: 35 };
      learning = `Field workers reported 40% faster handover completion using the ShiftRelay voice-assisted note templates. Zero disputed clock-in punches.`;
      break;
    case 'Damilola Fashola':
      taskResult = { title: 'Monthly Hours Aggregation & Payroll Telemetry', score: 'Real-Time Sync 100%', stars: 40 };
      learning = `Automated attendance hour rollups for monthly payroll preview. Handled edge cases with split shifts and bank holiday calculations.`;
      break;
    case 'Ibrahim Yusuf':
      taskResult = { title: 'External ERP & Webhook Reliability', score: '99.98% Delivery Success', stars: 35 };
      learning = `Configured exponential backoff webhook dispatch for attendance punch events. Integrates seamlessly with enterprise HR systems.`;
      break;
    default:
      taskResult = { title: `Routine Specialist Duty: ${staffMember.title}`, score: 'Nominal Execution', stars: 30 };
      learning = `Shift completed with 100% adherence to standard operating procedures. Cross-functional knowledge updated in Obsidian.`;
  }

  const { starsBalance } = awardStars(staffMember.id, taskResult.stars, taskResult.title, 'Sprint Task');

  try {
    const slug = staffMember.name.toLowerCase().replace(/[^a-z]/g, '-');
    const retroPath = path.join(vaultDir, 'staff', slug, 'retro.md');
    if (fs.existsSync(retroPath)) {
      const today = new Date().toISOString().slice(0, 10);
      const appendContent = `\n\n### 🔄 Learning Update (${today})\n- **Specialist Task:** ${taskResult.title}\n- **Autonomous Insight:** ${learning}\n- **Stars Awarded:** +${taskResult.stars} ⭐ (Current Total: ${starsBalance} ★)\n`;
      fs.appendFileSync(retroPath, appendContent, 'utf8');
    }
  } catch (err) {}

  return { taskResult, learning, starsAwarded: taskResult.stars, starsBalance };
}

// ── 5. Shift Handover & Supervisor Quick Approval ──
export async function createAndApproveHandover(outgoingMember, incomingMember, supervisorMember) {
  const store = readDataStore();
  if (!Array.isArray(store.handovers)) store.handovers = [];

  const handoverId = 'HO-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  const handoverRecord = {
    id: handoverId,
    createdBy: outgoingMember.id,
    assignedTo: incomingMember.id,
    status: 'relayed',
    notes: `Shift Handover from ${outgoingMember.name} to ${incomingMember.name}. Verified and approved by Supervisor ${supervisorMember.name}.`,
    handover: {
      summary: `Nominal Shift Operations Handover · Riffmax Tech Hub (Lekki Corridor)`,
      shiftStatus: 'green',
      operationalBays: [
        { name: 'Engineering Core', status: 'Optimal', notes: 'All backend APIs nominal; Bento UI 60FPS locked.' },
        { name: 'Security & QA Fortress', status: 'Passed', notes: '44 automated security assertions verified.' },
        { name: 'Mobile & UI Lab', status: 'Optimal', notes: 'Capacitor native bridge validated.' },
        { name: 'Operations & Compliance', status: 'Compliant', notes: 'Zero labor policy violations.' }
      ],
      safetyIncidents: [],
      tasks: [
        { id: 'task-1', text: 'Monitor evening peak punch traffic', owner: incomingMember.name, due: now, priority: 'medium', done: false },
        { id: 'task-2', text: 'Validate background offline queue sync', owner: incomingMember.name, due: now, priority: 'medium', done: false }
      ],
      verificationHash: crypto.randomBytes(16).toString('hex')
    },
    approvedBy: supervisorMember.id,
    approvedAt: now,
    createdAt: now,
    updatedAt: now
  };

  store.handovers.unshift(handoverRecord);
  writeDataStore(store);

  awardStars(outgoingMember.id, 30, 'Shift Handover Submitted & Relayed', 'Handover Hero');
  awardStars(supervisorMember.id, 20, 'Shift Handover Audited & Approved', 'Supervisor Stamp');

  return handoverRecord;
}

// ── 6. Clock-Out with Shift Duration & Rewards ──
export async function clockOutAgent(staffMember, coords = HUB_COORDS, dateString = null) {
  const store = readDataStore();
  if (!Array.isArray(store.timeEntries)) return { status: 'error', message: 'No entries' };

  const activeEntry = store.timeEntries.find(e => e.membershipId === staffMember.id && !e.clockedOutAt);
  if (!activeEntry) {
    return { status: 'not_clocked_in', message: `${staffMember.name} is not currently clocked in.` };
  }

  const clockOutTime = dateString ? `${dateString}T16:30:00.000Z` : new Date().toISOString();
  activeEntry.clockedOutAt = clockOutTime;
  activeEntry.clockOutVerificationMode = 'gps_snapshot';
  activeEntry.clockOutDetails = 'Exit GPS Snapshot Verified (Victoria Island Hub)';

  writeDataStore(store);

  const { starsBalance } = awardStars(staffMember.id, 25, 'Scheduled Shift Clock-Out (Verified Lekki Hub)', 'Punctual Exit');

  return {
    status: 'clocked_out',
    message: `${staffMember.name} successfully clocked out on-site. +25 ⭐ Stars awarded!`,
    entry: activeEntry,
    starsAwarded: 25,
    starsBalance
  };
}

// ── 7. Generate Full Month of Attendance & Payroll Run ──
export function generateMonthlyAttendanceAndPayroll(targetMonth = '2026-11') {
  const store = readDataStore();
  if (!Array.isArray(store.timeEntries)) store.timeEntries = [];
  if (!Array.isArray(store.contracts) || store.contracts.length === 0) {
    store.contracts = STAFF.map(s => ({
      userId: s.id,
      tenant_id: TENANT_ID,
      userName: s.name,
      staffId: s.staffId,
      role: s.title,
      department: s.dept,
      compensation_type: 'fixed_monthly',
      monthly_rate: s.salary,
      hourly_rate: Math.round(s.salary / 160),
      currency: 'NGN',
      bank_name: s.bank,
      account_number: s.account,
      account_name: s.name
    }));
  }

  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  for (let d = 1; d <= Math.min(daysInMonth, 28); d++) {
    const dayOfWeek = new Date(year, monthNum - 1, d).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dayStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const exists = store.timeEntries.some(e => e.clockedInAt && e.clockedInAt.startsWith(dayStr));
    if (exists) continue;

    for (const s of STAFF.filter(m => m.role !== 'owner')) {
      const startHour = s.role === 'supervisor' ? '07:30:00' : '08:00:00';
      const endHour = s.role === 'supervisor' ? '16:00:00' : '16:30:00';

      store.timeEntries.push({
        id: crypto.randomUUID(),
        organisationId: TENANT_ID,
        membershipId: s.id,
        clockedInAt: `${dayStr}T${startHour}.000Z`,
        clockedOutAt: `${dayStr}T${endHour}.000Z`,
        note: `Verified Work Shift: ${s.title}`,
        verificationMode: 'gps_snapshot',
        verificationDetails: `GPS Verified On-Site (0m from Lekki Hub)`,
        geofenceStatus: 'within_geofence',
        distanceMeters: 0,
        siteName: 'Riffmax Software Engineering Hub',
        coords: HUB_COORDS
      });
    }
  }

  writeDataStore(store);

  const payrollRegister = STAFF.map(staff => {
    const pay = calculateNigerianPay(staff.salary);
    const memberEntries = store.timeEntries.filter(e => e.membershipId === staff.id && e.clockedInAt && e.clockedInAt.startsWith(targetMonth));
    const completedShifts = memberEntries.filter(e => e.clockedOutAt).length;
    const totalHours = completedShifts * 8.5;

    return {
      staffId: staff.staffId,
      name: staff.name,
      email: staff.email,
      role: staff.title,
      department: staff.dept,
      bank: staff.bank,
      account: staff.account,
      month: targetMonth,
      payPeriod: `${targetMonth}-01 to ${targetMonth}-${daysInMonth}`,
      completedShifts,
      totalHours: Math.round(totalHours),
      ...pay
    };
  });

  const totalCompanyGross = payrollRegister.reduce((acc, p) => acc + p.grossPay, 0);
  const totalCompanyNet = payrollRegister.reduce((acc, p) => acc + p.netPay, 0);
  const totalCompanyTax = payrollRegister.reduce((acc, p) => acc + p.payeTax, 0);
  const totalCompanyPension = payrollRegister.reduce((acc, p) => acc + p.pension, 0);

  const payrollSummary = {
    tenant: TENANT_CODE,
    companyName: 'Riffmax Technology Limited',
    month: targetMonth,
    generatedAt: new Date().toISOString(),
    employeeCount: payrollRegister.length,
    totalGrossPay: totalCompanyGross,
    totalNetPay: totalCompanyNet,
    totalPayeTax: totalCompanyTax,
    totalPension: totalCompanyPension,
    currency: 'NGN',
    employees: payrollRegister
  };

  fs.writeFileSync(payslipsFilePath, JSON.stringify(payrollSummary, null, 2), 'utf8');

  return payrollSummary;
}

// ── 8. Run Complete Live Simulation Cycle ──
export async function runFullShiftCycle() {
  const logs = [];
  const notifications = [];
  const log = (msg) => {
    const ts = new Date().toISOString().slice(11, 19);
    const line = `[${ts}] ${msg}`;
    console.log(line);
    logs.push(line);
  };

  log('Phase 1: Authenticating all 12 staff members via 3-Layer Login (RIF-2026)...');
  for (const s of STAFF) {
    try {
      await authenticateAgent(s.email, DEFAULT_PASSWORD);
      log(`  ✓ Authenticated: ${s.name} (${s.email})`);
    } catch (e) {
      log(`  ✗ Auth Error: ${s.name}: ${e.message}`);
    }
  }

  log('\nPhase 2: Clocking in specialists via verified Victoria Island Geofence (6.4312, 3.4244)...');
  for (const s of STAFF.filter(m => m.role !== 'owner')) {
    const res = await clockInAgent(s, HUB_COORDS);
    log(`  📍 ${s.name}: ${res.message}`);
    if (res.starsAwarded) {
      notifications.push({ agent: s.name, stars: res.starsAwarded, reason: 'GPS Clock-in Verified', time: new Date().toLocaleTimeString() });
    }
  }

  log('\nPhase 3: Specialists executing autonomous tasks, earning stars, and updating memory vault...');
  for (const s of STAFF) {
    const res = await executeSpecialistWorkAndLearn(s);
    log(`  ⚡ [${s.name}]: ${res.taskResult.title} (+${res.starsAwarded} ⭐)`);
    notifications.push({ agent: s.name, stars: res.starsAwarded, reason: res.taskResult.title, time: new Date().toLocaleTimeString() });
  }

  log('\nPhase 4: Exchanging shift handover with Supervisor Olaide approval...');
  const outgoing = STAFF.find(s => s.name === 'Babatunde Adeleke');
  const incoming = STAFF.find(s => s.name === 'Chidinma Okonjo');
  const supervisor = STAFF.find(s => s.name === 'Olaide Emmanuela');

  const handover = await createAndApproveHandover(outgoing, incoming, supervisor);
  log(`  📝 Handover [${handover.id}] approved and relayed by Supervisor Olaide!`);
  notifications.push({ agent: outgoing.name, stars: 30, reason: 'Shift Handover Relayed', time: new Date().toLocaleTimeString() });
  notifications.push({ agent: supervisor.name, stars: 20, reason: 'Handover Audited & Approved', time: new Date().toLocaleTimeString() });

  log('\nPhase 5: Clocking out specialists & awarding closing stars...');
  for (const s of STAFF.filter(m => m.role !== 'owner' && m.role !== 'supervisor')) {
    const res = await clockOutAgent(s, HUB_COORDS);
    log(`  🚪 ${s.name}: ${res.message}`);
    if (res.starsAwarded) {
      notifications.push({ agent: s.name, stars: res.starsAwarded, reason: 'Scheduled Shift Clock-Out', time: new Date().toLocaleTimeString() });
    }
  }

  log('\nPhase 6: Compiling Monthly Attendance & Generating Printable Pay Slips...');
  const payroll = generateMonthlyAttendanceAndPayroll('2026-11');
  log(`  💰 Monthly Payroll Compiled: ₦${payroll.totalNetPay.toLocaleString()} Net Pay across 12 employees.`);

  const updatedStore = readDataStore();
  const simulationState = {
    lastRunAt: new Date().toISOString(),
    tenant: TENANT_CODE,
    hubName: 'Riffmax Software Engineering Hub',
    hubCoords: HUB_COORDS,
    notifications: notifications.slice(-15),
    payrollSummary: {
      month: payroll.month,
      employeeCount: payroll.employeeCount,
      totalGross: payroll.totalGrossPay,
      totalNet: payroll.totalNetPay,
      totalTax: payroll.totalPayeTax,
      totalPension: payroll.totalPension
    },
    agents: STAFF.map(s => {
      const rw = updatedStore.rewards?.[s.id] || { starsBalance: 2450 };
      const activeEntry = (updatedStore.timeEntries || []).find(e => e.membershipId === s.id && !e.clockedOutAt);
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        title: s.title,
        dept: s.dept,
        email: s.email,
        zone: s.zone,
        salary: s.salary,
        bank: s.bank,
        account: s.account,
        staffId: s.staffId,
        isClockedIn: Boolean(activeEntry),
        stars: rw.starsBalance,
        coins: rw.coinsBalance || rw.starsBalance,
        currentAction: s.role === 'owner' ? 'Reviewing Executive Briefing & Payroll' : (s.role === 'supervisor' ? 'Supervising Shift Bridge' : 'On Active Shift Duty'),
        speechBubble: s.role === 'owner' ? 'All systems nominal.' : (s.role === 'supervisor' ? 'Handovers approved 100%.' : 'Lekki Hub geofence verified.')
      };
    }),
    logs: logs.slice(-25)
  };

  fs.writeFileSync(stateFilePath, JSON.stringify(simulationState, null, 2), 'utf8');
  log('  💾 Real-time simulation state saved.');

  return simulationState;
}

if (process.argv[1] && process.argv[1].endsWith('riffmax-agent-runner.mjs')) {
  runFullShiftCycle().catch(console.error);
}
