// ==============================================================================
// SHIFTRELAY OS — CENTRALIZED ENTERPRISE LEGAL & ENTITY CONFIGURATION
// Single source of truth consumed across emails, PDF/HTML reports, Trust Center,
// legal acceptance audit logs, and statutory disclosures.
// ==============================================================================

export const POLICY_VERSIONS = Object.freeze({
  terms: '2026.11-TOS',
  privacy: '2026.11-NDPA',
  dpa: '2026.11-DPA',
  sla: '2026.11-SLA',
  acceptableUse: '2026.11-AUP',
  cookies: '2026.11-COOKIES',
  attendancePolicy: '2026.11-ATTENDANCE'
});

export const LEGAL_ENTITY = Object.freeze({
  brandName: 'ShiftRelay OS',
  companyLegalName: 'Riffmax Technology Limited',
  platformOperatorName: 'SHIFTRELAY TECHNOLOGIES LIMITED',
  rcNumber: process.env.COMPANY_RC_NUMBER || 'RC 7392819',
  headquarters: 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria',
  primaryDomain: 'shiftrelayos.com',
  appOrigin: process.env.APP_URL || 'https://app.shiftrelayos.com',
  websiteOrigin: process.env.WEBSITE_URL || 'https://shiftrelayos.com',
  adminOrigin: process.env.ADMIN_URL || 'https://admin.shiftrelayos.com',
  supportEmail: 'support@shiftrelayos.com',
  onboardingEmail: 'onboarding@shiftrelayos.com',
  securityEmail: 'security@shiftrelayos.com',
  financeEmail: 'finance@shiftrelayos.com',
  dpoEmail: 'dpo@shiftrelayos.com',
  legalEmail: 'legal@shiftrelayos.com',
  securityPostureClaim: 'ISO/IEC 27001 Security Controls Aligned',
  governingStatutes: [
    'Nigeria Data Protection Act (NDPA) 2023',
    'Nigerian Labour Act (Cap L1 LFN 2004)',
    'Personal Income Tax Act (PITA 2011) & Finance Acts',
    'Pension Reform Act (PRA) 2014 (PenCom 8% / 10%)',
    'National Housing Fund (NHF) Act & NSITF ECA 2010'
  ],
  subProcessors: [
    {
      name: 'Cloudflare, Inc.',
      role: 'Edge TLS 1.3 Termination, WAF & DDoS Mitigation',
      region: 'Global Edge / EU-Africa PoPs (Lagos PoP routing)',
      safeguard: 'NDPA 2023 Cross-Border Standard Contractual Safeguards'
    },
    {
      name: 'Managed PostgreSQL Infrastructure (TLS Encrypted)',
      role: 'Isolated Multi-Tenant Relational Ledger & Audit Persistence',
      region: 'EU / West Africa Low-Latency Encrypted Cluster',
      safeguard: 'AES-256 at rest, TLS 1.3 in transit, Row-level organisation_id isolation'
    },
    {
      name: 'Transactional SMTP / Resend Relay (mail.shiftrelayos.com)',
      role: 'Verified SPF/DKIM/DMARC Workforce & Statutory Dispatch',
      region: 'Dedicated Authenticated Relay',
      safeguard: 'Zero ad-tech sharing; RFC 8058 tokenized unsubscribe headers'
    },
    {
      name: 'Termii Nigeria / Meta WhatsApp Cloud API (Optional Tenant-Enabled)',
      role: 'Clock-In Reminders & Supervisor Escalation Notifications',
      region: 'Nigeria Telecom Routes / Meta Cloud',
      safeguard: 'Opt-in only; NDPA worker opt-out enforced prior to dispatch'
    }
  ]
});

export function getWhatsAppDeskConfig() {
  const raw = String(process.env.WHATSAPP_DESK_NUMBER || '2348007443873').replace(/[^\d]/g, '');
  const e164 = raw.startsWith('234') ? `+${raw}` : raw.startsWith('0') ? `+234${raw.slice(1)}` : (raw ? `+${raw}` : '');
  const waDigits = e164.replace(/[^\d]/g, '');
  return {
    configured: Boolean(waDigits.length >= 10),
    isDefaultPlaceholder: !process.env.WHATSAPP_DESK_NUMBER,
    e164,
    waDigits,
    waBaseUrl: waDigits ? `https://wa.me/${waDigits}` : ''
  };
}

export function buildPublicLegalSnapshot() {
  return {
    brandName: LEGAL_ENTITY.brandName,
    companyLegalName: LEGAL_ENTITY.companyLegalName,
    platformOperatorName: LEGAL_ENTITY.platformOperatorName,
    rcNumber: LEGAL_ENTITY.rcNumber,
    headquarters: LEGAL_ENTITY.headquarters,
    securityPostureClaim: LEGAL_ENTITY.securityPostureClaim,
    versions: { ...POLICY_VERSIONS },
    contacts: {
      support: LEGAL_ENTITY.supportEmail,
      onboarding: LEGAL_ENTITY.onboardingEmail,
      security: LEGAL_ENTITY.securityEmail,
      finance: LEGAL_ENTITY.financeEmail,
      dpo: LEGAL_ENTITY.dpoEmail,
      legal: LEGAL_ENTITY.legalEmail
    },
    subProcessors: LEGAL_ENTITY.subProcessors
  };
}
