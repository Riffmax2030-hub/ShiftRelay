// ==============================================================================
// SHIFTRELAY OS — NIGERIAN BANKING, BULK CSV PROFILES, ROSTER IMPORT & GATE KIT
// Table-driven CBN bank code directory, formula-injection-safe CSV serializer,
// multi-bank bulk-payment profiles, pre-flight payroll export readiness checks,
// standardized 14-column roster onboarding CSV template + validator, and
// bilingual Nigerian gate poster copy.
// ==============================================================================

import { formatMonthMeta } from './attendance-policy-engine.mjs';

export const NIGERIAN_BANKS = Object.freeze([
  { code: '058', name: 'GTBank', fullName: 'Guaranty Trust Bank Plc', aliases: ['gtbank', 'gt bank', 'gtb', 'guaranty trust', 'guaranty trust bank', 'gtco'] },
  { code: '044', name: 'Access Bank', fullName: 'Access Bank Plc', aliases: ['access', 'access bank', 'access bank plc', 'diamond', 'diamond bank'] },
  { code: '057', name: 'Zenith Bank', fullName: 'Zenith Bank Plc', aliases: ['zenith', 'zenith bank', 'zenith bank plc'] },
  { code: '033', name: 'UBA', fullName: 'United Bank for Africa Plc', aliases: ['uba', 'united bank for africa', 'uba plc'] },
  { code: '011', name: 'First Bank', fullName: 'First Bank of Nigeria Limited', aliases: ['first bank', 'firstbank', 'fbn', 'first bank of nigeria'] },
  { code: '070', name: 'Fidelity Bank', fullName: 'Fidelity Bank Plc', aliases: ['fidelity', 'fidelity bank'] },
  { code: '221', name: 'Stanbic IBTC', fullName: 'Stanbic IBTC Bank Plc', aliases: ['stanbic', 'stanbic ibtc', 'ibtc'] },
  { code: '232', name: 'Sterling Bank', fullName: 'Sterling Bank Plc', aliases: ['sterling', 'sterling bank'] },
  { code: '035', name: 'Wema Bank', fullName: 'Wema Bank Plc', aliases: ['wema', 'wema bank', 'alat'] },
  { code: '032', name: 'Union Bank', fullName: 'Union Bank of Nigeria Plc', aliases: ['union', 'union bank'] },
  { code: '214', name: 'FCMB', fullName: 'First City Monument Bank Limited', aliases: ['fcmb', 'first city monument', 'first city monument bank'] },
  { code: '050', name: 'Ecobank', fullName: 'Ecobank Nigeria Limited', aliases: ['ecobank', 'eco bank'] },
  { code: '076', name: 'Polaris Bank', fullName: 'Polaris Bank Limited', aliases: ['polaris', 'polaris bank', 'skye', 'skye bank'] },
  { code: '082', name: 'Keystone Bank', fullName: 'Keystone Bank Limited', aliases: ['keystone', 'keystone bank'] }
]);

const BANK_BY_CODE = new Map(NIGERIAN_BANKS.map(b => [b.code, b]));
const BANK_ALIAS_MAP = new Map();
for (const b of NIGERIAN_BANKS) {
  BANK_ALIAS_MAP.set(b.name.toLowerCase(), b);
  BANK_ALIAS_MAP.set(b.fullName.toLowerCase(), b);
  for (const a of b.aliases) BANK_ALIAS_MAP.set(a.toLowerCase(), b);
}

export function resolveCbnBank(bankName = '', explicitCode = '') {
  const codeClean = String(explicitCode || '').trim().padStart(3, '0').slice(0, 3);
  if (/^\d{3}$/.test(String(explicitCode || '').trim()) && BANK_BY_CODE.has(codeClean)) {
    const bank = BANK_BY_CODE.get(codeClean);
    return { code: bank.code, name: bank.name, fullName: bank.fullName, matched: true };
  }
  const rawName = String(bankName || '').trim().toLowerCase();
  if (!rawName) return { code: /^\d{3}$/.test(String(explicitCode || '').trim()) ? codeClean : '', name: String(bankName || ''), fullName: String(bankName || ''), matched: BANK_BY_CODE.has(codeClean) };
  if (BANK_ALIAS_MAP.has(rawName)) {
    const b = BANK_ALIAS_MAP.get(rawName);
    return { code: b.code, name: b.name, fullName: b.fullName, matched: true };
  }
  for (const [alias, b] of BANK_ALIAS_MAP.entries()) {
    if (rawName.includes(alias) || alias.includes(rawName)) {
      return { code: b.code, name: b.name, fullName: b.fullName, matched: true };
    }
  }
  if (/^\d{3}$/.test(String(explicitCode || '').trim())) {
    return { code: codeClean, name: String(bankName || ''), fullName: String(bankName || ''), matched: true };
  }
  return { code: '', name: String(bankName || ''), fullName: String(bankName || ''), matched: false };
}

/**
 * Neutralizes Excel/Google Sheets CSV formula injection (OWASP: leading =, +, -, @, tab, CR)
 * and safely double-quotes text cells. Numeric literals are preserved verbatim.
 */
export function sanitizeCsvText(value) {
  const str = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!str) return '';
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function escapeCsvCell(value, { numeric = false } = {}) {
  if (numeric) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  }
  const safe = sanitizeCsvText(value).replace(/"/g, '""');
  return `"${safe}"`;
}

export function serializeCsvRows(headers, rows, { withBom = false } = {}) {
  const headerLine = headers.map(h => escapeCsvCell(h)).join(',');
  const bodyLines = rows.map(row => row.join(','));
  const content = [headerLine, ...bodyLines].join('\r\n');
  return withBom ? `\uFEFF${content}` : content;
}

function buildPayrollRef(monthCompact, staffId) {
  const cleanStaff = String(staffId || 'STAFF').replace(/[^A-Za-z0-9_-]/g, '');
  return `SR-SAL-${monthCompact}-${cleanStaff}`;
}

export const BANK_CSV_PROFILES = Object.freeze({
  generic: {
    id: 'generic',
    label: 'Generic ShiftRelay Bank CSV (Universal)',
    filenamePrefix: 'ShiftRelayOS_Bank_Payment_Schedule',
    headers: ['Beneficiary Name', 'Bank Name', 'Account Number', 'Amount (NGN)', 'Narration', 'Payment Reference'],
    mapRow: (e, monthCompact) => [
      escapeCsvCell(e.userName),
      escapeCsvCell(e.bank_name || ''),
      escapeCsvCell(e.account_number || ''),
      escapeCsvCell(e.netPay, { numeric: true }),
      escapeCsvCell(e.narration || ''),
      escapeCsvCell(buildPayrollRef(monthCompact, e.staffId))
    ]
  },
  gtbank_gaps: {
    id: 'gtbank_gaps',
    label: 'GTBank GAPS Bulk Upload',
    filenamePrefix: 'GTBank_GAPS_Payroll_Schedule',
    headers: ['Beneficiary Name', 'Account Number', 'Bank Sort Code', 'Amount', 'Payment Narration', 'Reference', 'Email'],
    mapRow: (e, monthCompact) => {
      const bank = resolveCbnBank(e.bank_name, e.cbn_bank_code);
      return [
        escapeCsvCell(e.userName),
        escapeCsvCell(e.account_number || ''),
        escapeCsvCell(bank.code || ''),
        escapeCsvCell(e.netPay, { numeric: true }),
        escapeCsvCell(e.narration || ''),
        escapeCsvCell(buildPayrollRef(monthCompact, e.staffId)),
        escapeCsvCell(e.email || '')
      ];
    }
  },
  access_bank: {
    id: 'access_bank',
    label: 'Access Bank AccessPay Bulk Salary',
    filenamePrefix: 'AccessPay_Bulk_Salary_Schedule',
    headers: ['Beneficiary Name', 'NUBAN Account Number', 'Destination Bank Code', 'Bank Name', 'Amount (NGN)', 'Remark', 'Transaction Reference'],
    mapRow: (e, monthCompact) => {
      const bank = resolveCbnBank(e.bank_name, e.cbn_bank_code);
      return [
        escapeCsvCell(e.userName),
        escapeCsvCell(e.account_number || ''),
        escapeCsvCell(bank.code || ''),
        escapeCsvCell(bank.name || e.bank_name || ''),
        escapeCsvCell(e.netPay, { numeric: true }),
        escapeCsvCell(e.narration || ''),
        escapeCsvCell(buildPayrollRef(monthCompact, e.staffId))
      ];
    }
  },
  zenith_bank: {
    id: 'zenith_bank',
    label: 'Zenith Bank Corporate Internet Banking',
    filenamePrefix: 'Zenith_Corporate_Payroll_Schedule',
    headers: ['Beneficiary Name', 'Account Number', 'CBN Bank Code', 'Salary Amount', 'Narration', 'Payment Ref'],
    mapRow: (e, monthCompact) => {
      const bank = resolveCbnBank(e.bank_name, e.cbn_bank_code);
      return [
        escapeCsvCell(e.userName),
        escapeCsvCell(e.account_number || ''),
        escapeCsvCell(bank.code || ''),
        escapeCsvCell(e.netPay, { numeric: true }),
        escapeCsvCell(e.narration || ''),
        escapeCsvCell(buildPayrollRef(monthCompact, e.staffId))
      ];
    }
  },
  nibss: {
    id: 'nibss',
    label: 'NIBSS e-BillsPay / NIP Bulk Schedule',
    filenamePrefix: 'NIBSS_NIP_Bulk_Salary_Schedule',
    headers: ['Batch Reference', 'Beneficiary Name', 'Beneficiary Account (NUBAN)', 'Beneficiary Bank CBN Code', 'Amount (NGN)', 'Narration', 'Staff ID'],
    mapRow: (e, monthCompact) => {
      const bank = resolveCbnBank(e.bank_name, e.cbn_bank_code);
      return [
        escapeCsvCell(buildPayrollRef(monthCompact, e.staffId)),
        escapeCsvCell(e.userName),
        escapeCsvCell(e.account_number || ''),
        escapeCsvCell(bank.code || ''),
        escapeCsvCell(e.netPay, { numeric: true }),
        escapeCsvCell(e.narration || ''),
        escapeCsvCell(e.staffId || '')
      ];
    }
  }
});

export function normalizeBankFormat(format) {
  const key = String(format || 'generic').trim().toLowerCase();
  return BANK_CSV_PROFILES[key] ? key : 'generic';
}

export function generateBankPaymentCSV(employees, monthCompact = null, format = 'generic') {
  const refMonth = monthCompact || formatMonthMeta().monthCompact;
  const profileKey = normalizeBankFormat(format);
  const profile = BANK_CSV_PROFILES[profileKey];
  const rows = (Array.isArray(employees) ? employees : []).map(e => profile.mapRow(e, refMonth));
  return serializeCsvRows(profile.headers, rows, { withBom: false });
}

export function validatePayrollExportReadiness(employees = [], { month = null, format = 'generic' } = {}) {
  const list = Array.isArray(employees) ? employees : [];
  const profileKey = normalizeBankFormat(format);
  const profile = BANK_CSV_PROFILES[profileKey];
  const requiresCbnCode = profileKey !== 'generic';
  const blockingIssues = [];
  const warnings = [];
  let readyEmployees = 0;

  for (const emp of list) {
    const empErrors = [];
    const empWarnings = [];
    const nuban = String(emp.account_number || '').trim();
    const netPay = Number(emp.netPay || 0);
    const bankInfo = resolveCbnBank(emp.bank_name, emp.cbn_bank_code);
    const pencomPin = String(emp.pencom_rsa_pin || emp.pencomRsaPin || '').trim();

    if (!/^\d{10}$/.test(nuban)) {
      empErrors.push({
        code: 'INVALID_NUBAN',
        field: 'account_number',
        message: 'Account number must be a valid 10-digit Nigerian NUBAN.'
      });
    }
    if (!bankInfo.code) {
      const issue = {
        code: 'UNKNOWN_BANK_CODE',
        field: 'cbn_bank_code',
        message: `Unrecognized bank "${emp.bank_name || 'Not set'}" — set a valid 3-digit CBN bank code.`
      };
      if (requiresCbnCode) empErrors.push(issue);
      else empWarnings.push(issue);
    }
    if (!(netPay > 0)) {
      empErrors.push({
        code: 'NON_POSITIVE_NET_PAY',
        field: 'netPay',
        message: `Net pay is NGN ${netPay.toFixed(2)} — verify contract rate or attendance deductions.`
      });
    }
    if (!pencomPin || !/^PEN\d{12}$/i.test(pencomPin)) {
      empWarnings.push({
        code: 'MISSING_PENCOM_RSA_PIN',
        field: 'pencom_rsa_pin',
        message: 'PenCom RSA PIN missing or not in PEN + 12-digit format (required for statutory PFA schedule).'
      });
    }

    if (empErrors.length === 0) readyEmployees += 1;
    for (const err of empErrors) blockingIssues.push({ userId: emp.userId, staffId: emp.staffId, name: emp.userName, ...err });
    for (const warn of empWarnings) warnings.push({ userId: emp.userId, staffId: emp.staffId, name: emp.userName, ...warn });
  }

  return {
    ok: true,
    month: month || formatMonthMeta().month,
    format: profileKey,
    formatLabel: profile.label,
    totalEmployees: list.length,
    readyEmployees,
    blockedEmployees: list.length - readyEmployees,
    exportReady: list.length > 0 && blockingIssues.length === 0,
    blockingCount: blockingIssues.length,
    warningCount: warnings.length,
    blockingIssues,
    warnings,
    supportedProfiles: Object.values(BANK_CSV_PROFILES).map(p => ({ id: p.id, label: p.label }))
  };
}

// ==============================================================================
// STANDARDIZED 14-COLUMN ROSTER ONBOARDING CSV TEMPLATE & VALIDATION
// ==============================================================================
export const ROSTER_CSV_HEADERS = Object.freeze([
  'staff_id',
  'full_name',
  'email',
  'phone_e164',
  'department',
  'site_name',
  'role',
  'pay_basis',
  'base_rate_ngn',
  'pencom_rsa_pin',
  'bank_name',
  'cbn_bank_code',
  'nuban_account_number',
  'tin'
]);

export function generateRosterTemplateCsv(orgDefaults = {}) {
  const defaultSite = sanitizeCsvText(orgDefaults.siteName || 'Lagos Victoria Island Gate A');
  const sampleRow = [
    escapeCsvCell('EMP-1042'),
    escapeCsvCell('Chukwuemeka Okafor'),
    escapeCsvCell('chukwuemeka.okafor@company.ng'),
    escapeCsvCell('+2348035550194'),
    escapeCsvCell('Plant Operations'),
    escapeCsvCell(defaultSite),
    escapeCsvCell('worker'),
    escapeCsvCell('monthly'),
    escapeCsvCell('280000'),
    escapeCsvCell('PEN100482910384'),
    escapeCsvCell('GTBank'),
    escapeCsvCell('058'),
    escapeCsvCell('0149283746'),
    escapeCsvCell('20491827-0001')
  ];
  return serializeCsvRows(ROSTER_CSV_HEADERS, [sampleRow], { withBom: true });
}

export function parseCsvMatrix(csvText) {
  const clean = String(csvText || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r') {
      if (clean[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some(v => v !== '')) rows.push(row);
  }
  return rows;
}

const VALID_ROSTER_ROLES = new Set(['worker', 'supervisor', 'executive']);
const ROSTER_ROLE_ALIASES = Object.freeze({
  employee: 'worker',
  staff: 'worker',
  manager: 'supervisor',
  lead: 'supervisor',
  owner: 'executive',
  admin: 'executive',
  finance_admin: 'executive',
  workforce_admin: 'supervisor'
});
const VALID_PAY_BASES = new Set(['monthly', 'hourly']);

export function validateAndNormalizeRosterRows(csvOrRows, existingMembers = []) {
  let rawObjects = [];
  if (typeof csvOrRows === 'string') {
    const matrix = parseCsvMatrix(csvOrRows);
    if (matrix.length < 2) {
      return {
        ok: false,
        error: 'CSV must contain a header row plus at least one employee row.',
        totalRows: 0,
        validCount: 0,
        errorCount: 1,
        rows: [],
        validRows: [],
        errors: [{ rowNumber: 1, errors: ['No employee data rows detected.'] }]
      };
    }
    const headers = matrix[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    for (let idx = 1; idx < matrix.length; idx++) {
      const cells = matrix[idx];
      const obj = {};
      headers.forEach((h, cIdx) => {
        if (h) obj[h] = cells[cIdx] ?? '';
      });
      obj.__rowNumber = idx + 1;
      rawObjects.push(obj);
    }
  } else if (Array.isArray(csvOrRows)) {
    rawObjects = csvOrRows.map((r, idx) => ({ ...r, __rowNumber: idx + 2 }));
  }

  const existingEmails = new Set((existingMembers || []).map(m => String(m.email || '').trim().toLowerCase()).filter(Boolean));
  const existingStaffIds = new Set((existingMembers || []).map(m => String(m.staff_id || m.staffId || '').trim().toUpperCase()).filter(Boolean));
  const seenEmails = new Set();
  const seenStaffIds = new Set();

  const evaluatedRows = [];
  const validRows = [];
  const errors = [];

  for (const raw of rawObjects) {
    const rowNumber = raw.__rowNumber || evaluatedRows.length + 2;
    const rowErrors = [];
    const rowWarnings = [];

    const staffId = String(raw.staff_id || raw.staffId || '').trim().replace(/^'/, '');
    const fullName = String(raw.full_name || raw.fullName || raw.name || '').trim().replace(/^'/, '');
    const email = String(raw.email || '').trim().toLowerCase().replace(/^'/, '');
    const phoneE164 = String(raw.phone_e164 || raw.phone || '').trim().replace(/^'/, '');
    const department = String(raw.department || 'Operations').trim().replace(/^'/, '') || 'Operations';
    const siteName = String(raw.site_name || raw.site || '').trim().replace(/^'/, '');
    const roleRawInput = String(raw.role || 'worker').trim().toLowerCase();
    const roleRaw = ROSTER_ROLE_ALIASES[roleRawInput] || roleRawInput;
    const payBasisRaw = String(raw.pay_basis || 'monthly').trim().toLowerCase();
    const baseRateNgn = Number(String(raw.base_rate_ngn ?? raw.base_rate ?? raw.salary ?? '0').replace(/[^0-9.]/g, ''));
    const pencomRsaPin = String(raw.pencom_rsa_pin || '').trim().toUpperCase().replace(/^'/, '');
    const bankNameRaw = String(raw.bank_name || '').trim().replace(/^'/, '');
    const explicitBankCode = String(raw.cbn_bank_code || '').trim().replace(/^'/, '');
    const nuban = String(raw.nuban_account_number || raw.account_number || '').trim().replace(/^'/, '');
    const tin = String(raw.tin || '').trim().replace(/^'/, '');

    if (!staffId) rowErrors.push('Missing staff_id');
    else if (seenStaffIds.has(staffId.toUpperCase())) rowErrors.push(`Duplicate staff_id "${staffId}" inside upload batch`);
    else if (existingStaffIds.has(staffId.toUpperCase())) rowErrors.push(`staff_id "${staffId}" already exists in organisation`);

    if (!fullName || fullName.length < 2) rowErrors.push('Missing or too short full_name');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push('Invalid email address');
    else if (seenEmails.has(email)) rowErrors.push(`Duplicate email "${email}" inside upload batch`);
    else if (existingEmails.has(email)) rowErrors.push(`Email "${email}" already exists in organisation`);

    if (!VALID_ROSTER_ROLES.has(roleRaw)) rowErrors.push(`Invalid role "${roleRaw}" (must be worker, supervisor, or executive)`);
    if (!VALID_PAY_BASES.has(payBasisRaw)) rowErrors.push(`Invalid pay_basis "${payBasisRaw}" (must be monthly or hourly)`);
    if (!Number.isFinite(baseRateNgn) || baseRateNgn <= 0) rowErrors.push('base_rate_ngn must be a positive number');

    if (phoneE164 && !/^\+234[789]\d{9}$/.test(phoneE164) && !/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
      rowErrors.push(`Invalid E.164 phone "${phoneE164}" (expected +234XXXXXXXXXX)`);
    } else if (!phoneE164) {
      rowWarnings.push('No +234 phone_e164 provided (WhatsApp/SMS clock-in reminders skipped)');
    }

    if (nuban && !/^\d{10}$/.test(nuban)) {
      rowErrors.push(`Invalid NUBAN "${nuban}" (must be exactly 10 digits)`);
    } else if (!nuban) {
      rowWarnings.push('NUBAN account missing — required before bank payment export');
    }

    const bankResolved = resolveCbnBank(bankNameRaw, explicitBankCode);
    if (explicitBankCode && !/^\d{3}$/.test(explicitBankCode)) {
      rowErrors.push(`Invalid cbn_bank_code "${explicitBankCode}" (expected 3-digit CBN code e.g. 058)`);
    } else if ((bankNameRaw || explicitBankCode) && !bankResolved.code) {
      rowErrors.push(`Unknown Nigerian bank "${bankNameRaw}" — provide 3-digit cbn_bank_code`);
    }

    if (pencomRsaPin && !/^PEN\d{12}$/.test(pencomRsaPin)) {
      rowErrors.push(`Invalid PenCom RSA PIN "${pencomRsaPin}" (expected PEN followed by 12 digits)`);
    }

    if (staffId) seenStaffIds.add(staffId.toUpperCase());
    if (email) seenEmails.add(email);

    const roleMapped = roleRaw === 'executive' ? 'finance_admin' : roleRaw;
    const normalized = {
      rowNumber,
      staffId,
      fullName,
      email,
      phoneE164,
      department,
      siteName,
      role: roleRaw,
      membershipRole: roleMapped,
      payBasis: payBasisRaw,
      baseRateNgn,
      pencomRsaPin,
      bankName: bankResolved.name || bankNameRaw,
      cbnBankCode: bankResolved.code,
      nuban,
      tin,
      valid: rowErrors.length === 0,
      errors: rowErrors,
      warnings: rowWarnings
    };

    evaluatedRows.push(normalized);
    if (normalized.valid) validRows.push(normalized);
    else errors.push({ rowNumber, staffId, email, errors: rowErrors });
  }

  return {
    ok: errors.length === 0,
    totalRows: evaluatedRows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    rows: evaluatedRows,
    validRows,
    errors
  };
}

// ==============================================================================
// MULTILINGUAL NIGERIAN GATE POSTER TRANSLATIONS (Print-Ready Rollout Kit)
// ==============================================================================
export const GATE_POSTER_TRANSLATIONS = Object.freeze({
  en: {
    code: 'en',
    label: 'English (Standard)',
    headline: 'VERIFIED SHIFT CLOCK-IN & HANDOVER GATE',
    subtitle: 'Complete your gate punch inside the marked facility perimeter before shift starts.',
    steps: [
      'Open ShiftRelay OS on your phone or ask a peer/supervisor with the Peer ID Scanner.',
      'Scan this Gate QR code (or capture your Staff ID badge + live camera frame on-site).',
      'Confirm handover safety checklist items and tap Clock In.'
    ],
    ndpaNote: 'NDPA 2023 Privacy Guarantee: Location is captured ONLY at the moment of gate clock-in/out. Zero off-shift tracking.',
    contactLabel: 'Shift Supervisor / HR Desk'
  },
  pcm: {
    code: 'pcm',
    label: 'Nigerian Pidgin',
    headline: 'GATE CLOCK-IN & SHIFT HANDOVER POINT',
    subtitle: 'Abeg run your gate clock-in inside compound before shift time start.',
    steps: [
      'Open ShiftRelay OS for your phone, or meet supervisor/colleague wey get Peer ID Scanner.',
      'Scan dis Gate QR code (or show your Staff ID card + snap live face inside compound).',
      'Tick safety handover checklist finish, then press Clock In make your salary record enter.'
    ],
    ndpaNote: 'NDPA 2023 Privacy Promise: GPS location dey check ONLY wen you press Clock In or Clock Out for gate. No tracking after work.',
    contactLabel: 'Supervisor / HR Support Line'
  },
  yo: {
    code: 'yo',
    label: 'Yoruba (Yorùbá)',
    headline: 'IBÙDÓ ÌBẸ̀RẸ̀ IṢẸ́ ÀTI ÌFỌWỌ́SOWỌ́PỌ̀',
    subtitle: 'Jọ̀wọ́ parí ìforúkọsílẹ̀ wíwọlé rẹ ní àgbàlá iṣẹ́ kí àkókò iṣẹ́ tó bẹ̀rẹ̀.',
    steps: [
      'Ṣí ShiftRelay OS lórí fóònù rẹ tàbí lo Peer ID Scanner lọ́dọ̀ alábòójútó rẹ.',
      'Ṣe àyẹ̀wò Gate QR code yìí tàbí ṣe àyẹ̀wò káàdì ID rẹ pẹ̀lú fọ́tò ojú ní ibùdó iṣẹ́.',
      'Jẹ́rìísí àwọn àṣàyàn ààbò iṣẹ́, lẹ́yìn náà tẹ Clock In.'
    ],
    ndpaNote: 'Ààbò Ìpamọ́ NDPA 2023: Ibùdó GPS rẹ ni a ń yẹ̀ wò NÌKAN ní àsìkò wíwọlé tàbí jáde lẹ́nu iṣẹ́.',
    contactLabel: 'Olùdarí Iṣẹ́ / Ẹ̀ka HR'
  },
  ha: {
    code: 'ha',
    label: 'Hausa',
    headline: 'WURIN SHIGA AIKI DA MIKA RAGAMAR AIKI',
    subtitle: 'Da fatan za a kammala rajistar shiga aiki a harabar wurin aiki kafin lokaci ya cika.',
    steps: [
      'Bude manhajar ShiftRelay OS a wayarka ko amfani da Peer ID Scanner wurin shugaban aiki.',
      'Duba wannan Gate QR code ko dauki hoton katin Staff ID tare da fuskarka a wurin aiki.',
      'Tabbatar da jerin matakan tsaro na aiki sannan ka danna Clock In.'
    ],
    ndpaNote: 'Tsarin Sirri na NDPA 2023: Ana duba wurin GPS NE KAWAI lokacin shiga ko fita aiki. Babu bibiya bayan aiki.',
    contactLabel: 'Shugaban Aiki / Sashen HR'
  },
  ig: {
    code: 'ig',
    label: 'Igbo',
    headline: 'EBE NBATA ỌRỤ NA NNYEFE OZI',
    subtitle: 'Biko mee nbata ọrụ gị n’ime ogige ọrụ tupu oge ọrụ ebido.',
    steps: [
      'Mepee ShiftRelay OS n’ekwentị gị ma ọ bụ jiri Peer ID Scanner n’aka onye nlekọta gị.',
      'Nyochaa Gate QR code a ma ọ bụ gosi Staff ID kaadị gị na foto ihu dị ndụ n’ebe ọrụ.',
      'Kwenye ndepụta nchekwa ọrụ, wee pịa Clock In.'
    ],
    ndpaNote: 'Nchekwa Nzuzo NDPA 2023: A na-ele GPS ebe ị nọ NAANỊ mgbe ị na-abata ma ọ bụ na-apụ n’ọrụ.',
    contactLabel: 'Onye Nlekọta / Ngalaba HR'
  }
});

export function getGatePosterTranslation(langCode = 'en') {
  const key = String(langCode || 'en').trim().toLowerCase();
  return GATE_POSTER_TRANSLATIONS[key] || GATE_POSTER_TRANSLATIONS.en;
}
