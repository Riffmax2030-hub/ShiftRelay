/**
 * ShiftRelay Enterprise Email HTML Template & Dispatch Engine
 * Tier-1 Fintech / Enterprise SaaS Email Design System (Stripe / Paystack / Linear / Apple Standard)
 * Zero-Emoji · Bulletproof Outlook (VML), Gmail, Apple Mail & Mobile Responsive
 * Branded: ShiftRelay OS · Powered by Riffmax Technology Limited
 */

import { LEGAL_ENTITY } from './legal-config.mjs';

const BRAND_NAME = LEGAL_ENTITY.brandName;
const COMPANY_LEGAL = LEGAL_ENTITY.companyLegalName;
const COMPANY_RC = LEGAL_ENTITY.rcNumber;
const HEADQUARTERS = LEGAL_ENTITY.headquarters;
const SUPPORT_EMAIL = LEGAL_ENTITY.supportEmail;

export const EMAIL_TEMPLATE_CATALOG = [
  { key: 'onboarding-invite', category: 'Onboarding', label: 'Stage 1: Company Onboarding Form Invite', description: 'Shareable intake form invite sent to prospects to collect company details & worker headcount.' },
  { key: 'billing-payment-link', category: 'Billing & Paystack', label: 'Stage 2: Paystack Setup / Monthly Payment Link', description: 'Itemized Paystack Checkout invoice email for One-Time Setup or Combined Monthly Subscription.' },
  { key: 'billing-annual-link', category: 'Billing & Paystack', label: 'Stage 2: Paystack Annual (12-Month) Bundle Link', description: 'Full-year 12-month + Setup itemized Paystack settlement invoice email.' },
  { key: 'official-receipt', category: 'Billing & Paystack', label: 'Stage 3: Official Payment Receipt (Riffmax)', description: 'Automated PAID receipt branded ShiftRelay · Powered by Riffmax Technology Limited with roster unlock link.' },
  { key: 'activation', category: 'Workforce Access', label: 'Staff Account Activation & Welcome Invite', description: 'New employee profile activation link with Company Code, Staff ID, Role, and verification hint.' },
  { key: 'reset', category: 'Security', label: 'Password Reset & Credential Rotation', description: 'Single-use 30-minute security password reset link with IP & audit trace.' },
  { key: 'handover', category: 'Shift Operations', label: 'Shift Handover & Escalation Brief', description: 'Outgoing-to-incoming shift handover checklist certification sent to supervisors.' },
  { key: 'attendance-reminder', category: 'Shift Operations', label: 'Attendance Watchdog Reminder / Escalation', description: 'Pre-shift clock-in reminder or missed-punch escalation with transparent grace window policy.' },
  { key: 'payroll', category: 'Finance & Payroll', label: 'Executive Statutory Payroll & Remittance Digest', description: 'Monthly gross, NTA 2025 PAYE, PenCom (8%/10%), net bank disbursal & ₦0.00 variance digest.' },
  { key: 'support-ticket', category: 'Customer Care', label: 'Customer Care Ticket & Resolution Update', description: 'Branded confirmation, agent reply, and resolution email for worker/executive support tickets.' },
  { key: 'newsletter', category: 'Automated Briefs', label: 'Weekly Operational Progress Dispatch', description: 'Automated weekly KPI summary covering verified shifts, hours, punctuality, and variance.' },
  { key: 'monthly-compliance', category: 'Automated Briefs', label: 'Monthly Nigeria Statutory Compliance Brief', description: 'NDPA 2023 / NTA 2025 / PenCom PRA 2014 advisory newsletter with RFC 8058 one-click unsubscribe.' }
];

export function getEmailPlatformBaseUrl() {
  const raw = (
    process.env.APP_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.PUBLIC_URL ||
    'https://app.shiftrelayos.com'
  ).trim();
  return (raw || 'https://app.shiftrelayos.com').replace(/\/+$/, '');
}

export function getEmailMarketingBaseUrl() {
  const raw = (process.env.WEBSITE_URL || 'https://shiftrelayos.com').trim();
  return (raw || 'https://shiftrelayos.com').replace(/\/+$/, '');
}

export function getEmailLogoUrl() {
  const explicit = String(process.env.EMAIL_LOGO_URL || '').trim();
  if (explicit) return explicit;
  // Live HTTPS origin so Gmail, Apple Mail (iPhone), and Outlook always render the crisp ShiftRelay logo PNG
  return 'https://shiftrelay-vjkf.onrender.com/icon-192.png';
}

const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace";

function renderKeyValueRows(rows = []) {
  const valid = rows.filter((r) => r && r.label && r.value !== undefined && r.value !== null && r.value !== '');
  return valid.map((r, idx) => {
    const borderTop = idx === 0 ? 'none' : '1px solid #f1f5f9';
    const valColor = r.color || '#0f172a';
    const valFont = r.mono ? FONT_MONO : FONT_SANS;
    const valWeight = r.bold === false ? '500' : '600';
    return `
      <tr>
        <td style="padding:10px 0;border-top:${borderTop};font-family:${FONT_SANS};font-size:13px;color:#64748b;vertical-align:top;width:42%;">${escapeHtml(r.label)}</td>
        <td align="right" style="padding:10px 0;border-top:${borderTop};font-family:${valFont};font-size:13px;font-weight:${valWeight};color:${valColor};vertical-align:top;text-align:right;word-break:break-word;">${r.rawHtml ? r.value : escapeHtml(String(r.value))}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Universal Tier-1 Fintech / Enterprise SaaS Email Envelope
 * Clean #f6f8fa outer canvas · Single crisp #ffffff 580px sheet · 3px emerald brand top bar
 * Minimalist white corporate letterhead with real ShiftRelay Logo PNG + subtle right-aligned badge
 * Generous whitespace · Bulletproof VML + CSS CTA · Quiet audit trace · Off-card legal footer
 */
export function wrapEnterpriseEmail({
  title,
  preheader,
  recipientName,
  deliveryReason,
  bodyHtml,
  primaryCtaText,
  primaryCtaUrl,
  secondaryNote,
  securityMetadata = {},
  unsubUrl,
  badgeLabel = 'VERIFIED DISPATCH',
  badgeTone = 'emerald',
  hideGreeting = false
}) {
  const currentYear = new Date().getFullYear();
  const watTime = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short'
  }) + ' WAT';

  const tonePalette = {
    emerald: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', accent: '#059669' },
    amber:   { bg: '#fffbeb', border: '#fde68a', text: '#b45309', accent: '#d97706' },
    red:     { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', accent: '#dc2626' },
    sky:     { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', accent: '#0284c7' },
    slate:   { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', accent: '#059669' }
  }[badgeTone] || { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', accent: '#059669' };

  const preheaderFiller = '&zwnj;&nbsp;'.repeat(42);
  const metaEntries = [
    ['Dispatched', watTime],
    ...Object.entries(securityMetadata).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ];

  const metaRowsHtml = metaEntries.map(([k, v]) => `
    <tr>
      <td style="padding:3px 0;font-family:${FONT_SANS};font-size:11.5px;color:#94a3b8;width:44%;vertical-align:top;">${escapeHtml(k)}</td>
      <td align="right" style="padding:3px 0;font-family:${FONT_MONO};font-size:11px;color:#475569;text-align:right;vertical-align:top;word-break:break-word;">${escapeHtml(String(v))}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f6f8fa !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .sr-outer-pad { padding: 14px 10px 32px !important; }
      .sr-card { width: 100% !important; border-radius: 12px !important; }
      .sr-hdr-pad { padding: 20px 20px 18px !important; }
      .sr-body-pad { padding: 24px 20px 22px !important; }
      .sr-audit-pad { padding: 18px 20px 20px !important; }
      .sr-cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 18px !important; }
      .sr-hero-num { font-size: 32px !important; }
      .sr-stack-col { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-bottom: 10px !important; }
      .sr-stack-gap { display: none !important; }
      .sr-badge-cell { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f6f8fa;color:#0f172a;font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;">
  <!-- Inbox Preheader Snippet (Hidden in body, clean in Gmail & iOS Mail preview) -->
  <div style="display:none;font-size:1px;color:#f6f8fa;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader || title)} &mdash; ShiftRelay OS by ${escapeHtml(COMPANY_LEGAL)}${preheaderFiller}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f8fa;table-layout:fixed;">
    <tr>
      <td align="center" class="sr-outer-pad" style="padding:32px 14px 48px;">
        <!--[if mso]>
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" class="sr-card" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.04),0 12px 28px rgba(15,23,42,0.04);">

          <!-- 3px Precision Brand Top Accent -->
          <tr>
            <td style="height:3px;background-color:${tonePalette.accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Minimalist Stripe/Paystack-Grade Corporate Letterhead -->
          <tr>
            <td class="sr-hdr-pad" style="padding:24px 36px 20px;border-bottom:1px solid #f1f5f9;background-color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:11px;">
                          <img src="${escapeHtml(getEmailLogoUrl())}" width="38" height="38" alt="ShiftRelay" style="display:block;width:38px;height:38px;border-radius:9px;background-color:#06231a;" />
                        </td>
                        <td valign="middle">
                          <div style="font-family:${FONT_SANS};font-size:19px;font-weight:800;letter-spacing:-0.03em;color:#0f172a;line-height:1.1;">
                            Shift<span style="color:#059669;">Relay</span>
                          </div>
                          <div style="font-family:${FONT_SANS};font-size:11px;font-weight:500;color:#64748b;letter-spacing:0.005em;margin-top:2px;">
                            Powered by ${escapeHtml(COMPANY_LEGAL)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" class="sr-badge-cell">
                    <span style="display:inline-block;padding:4px 10px;background-color:${tonePalette.bg};border:1px solid ${tonePalette.border};border-radius:999px;font-family:${FONT_MONO};font-size:10px;font-weight:700;color:${tonePalette.text};letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap;">
                      ${escapeHtml(badgeLabel)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pristine Main Reading Surface -->
          <tr>
            <td class="sr-body-pad" style="padding:32px 36px 28px;background-color:#ffffff;">
              ${(!hideGreeting && recipientName) ? `
                <p style="margin:0 0 14px;font-family:${FONT_SANS};font-size:15.5px;font-weight:700;color:#0f172a;line-height:1.4;">
                  Hi ${escapeHtml(recipientName)},
                </p>
              ` : ''}

              <div style="font-family:${FONT_SANS};font-size:14.5px;line-height:1.65;color:#334155;">
                ${bodyHtml}
              </div>

              <!-- Single Unmistakable Primary Action Button (Bulletproof VML + CSS) -->
              ${primaryCtaText && primaryCtaUrl ? `
                <div style="margin:28px 0 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${primaryCtaUrl}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="20%" stroke="f" fillcolor="#059669">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:14.5px;font-weight:bold;">${escapeHtml(primaryCtaText)}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${primaryCtaUrl}" class="sr-cta-btn" style="display:inline-block;padding:13px 28px;background-color:#059669;color:#ffffff;font-family:${FONT_SANS};font-size:14.5px;font-weight:700;letter-spacing:-0.01em;text-decoration:none;border-radius:9px;text-align:center;">
                    ${escapeHtml(primaryCtaText)} &rarr;
                  </a>
                  <!--<![endif]-->
                </div>

                <!-- Quiet Fallback Link (Stripe/Linear style — zero bulky box) -->
                <p style="margin:14px 0 0;font-family:${FONT_SANS};font-size:12px;color:#94a3b8;line-height:1.55;">
                  If the button doesn&rsquo;t open, paste this link into your browser:<br>
                  <a href="${primaryCtaUrl}" style="color:#059669;text-decoration:underline;font-family:${FONT_MONO};font-size:11px;word-break:break-all;">${primaryCtaUrl}</a>
                </p>
              ` : ''}

              ${secondaryNote ? `
                <p style="margin:18px 0 0;font-family:${FONT_SANS};font-size:12.5px;color:#64748b;line-height:1.55;">
                  ${secondaryNote}
                </p>
              ` : ''}
            </td>
          </tr>

          <!-- Quiet Verification & Audit Footer Inside Card -->
          <tr>
            <td class="sr-audit-pad" style="padding:20px 36px 24px;background-color:#fafbfc;border-top:1px solid #f1f5f9;">
              <div style="font-family:${FONT_MONO};font-size:10px;font-weight:700;color:#64748b;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">
                Enterprise Security &amp; Audit Trace
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${metaRowsHtml}
              </table>
              ${deliveryReason ? `
                <p style="margin:12px 0 0;padding-top:10px;border-top:1px solid #eef2f6;font-family:${FONT_SANS};font-size:11.5px;color:#64748b;line-height:1.5;">
                  <strong style="color:#475569;">Why you received this:</strong> ${escapeHtml(deliveryReason)}
                </p>
              ` : ''}
              <p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:11px;color:#94a3b8;line-height:1.5;">
                Security reminder: ShiftRelay will never request your password, PIN, or BVN via email or phone. Questions? Reply or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#059669;font-weight:600;">${SUPPORT_EMAIL}</a>.
              </p>
            </td>
          </tr>

        </table>

        <!-- Airy Off-Card Corporate Legal Footer (Stripe / Apple / Wise Signature) -->
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;">
          <tr>
            <td align="center" style="padding:24px 16px 0;text-align:center;">
              <p style="margin:0 0 6px;font-family:${FONT_SANS};font-size:12px;font-weight:600;color:#64748b;">
                ${escapeHtml(BRAND_NAME)} by ${escapeHtml(COMPANY_LEGAL)} &middot; ${escapeHtml(COMPANY_RC)}
              </p>
              <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:11.5px;color:#94a3b8;line-height:1.5;">
                ${escapeHtml(HEADQUARTERS)}
              </p>
              <p style="margin:0 0 10px;font-family:${FONT_SANS};font-size:11.5px;color:#64748b;">
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/terms.html" style="color:#64748b;text-decoration:none;margin:0 6px;">Terms</a> &middot;
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/privacy.html" style="color:#64748b;text-decoration:none;margin:0 6px;">Privacy</a> &middot;
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/trust.html" style="color:#64748b;text-decoration:none;margin:0 6px;">Trust Center</a> &middot;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#64748b;text-decoration:none;margin:0 6px;">Support</a>
                ${unsubUrl ? `&middot; <a href="${escapeHtml(unsubUrl)}" style="color:#059669;text-decoration:none;margin:0 6px;font-weight:600;">Unsubscribe</a>` : ''}
              </p>
              <p style="margin:0;font-family:${FONT_SANS};font-size:11px;color:#94a3b8;">
                &copy; ${currentYear} ${escapeHtml(BRAND_NAME)} by ${escapeHtml(COMPANY_LEGAL)}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Account Activation & Workplace Invitation Email
 */
export function renderAccountActivationEmail({
  recipientName,
  workerName,
  recipientEmail = '',
  orgName,
  companyName,
  orgCode,
  companyCode,
  roleTitle = 'Verified Specialist',
  department = 'Operations Core',
  staffId = '',
  verificationHint = '',
  activationUrl,
  expiresHours = 48
}) {
  const safeName = recipientName || workerName || 'Team Member';
  const safeOrg = orgName || companyName || COMPANY_LEGAL;
  const safeCode = orgCode || companyCode || 'SR-ORG';

  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-family:${FONT_SANS};font-size:22px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      You&rsquo;re invited to ${escapeHtml(safeOrg)}
    </h1>
    <p style="margin:0 0 22px;color:#475569;">
      Your workplace profile has been provisioned on <strong>ShiftRelay</strong>. Activate your account to set your password and unlock your live shift schedule, digital CR80 Staff ID card, and verified attendance tracker.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 20px;">
      ${renderKeyValueRows([
        { label: 'Organisation', value: safeOrg },
        { label: 'Company Code', value: safeCode, mono: true, color: '#059669' },
        ...(staffId ? [{ label: 'Staff ID', value: staffId, mono: true }] : []),
        { label: 'Assigned Role', value: roleTitle },
        { label: 'Department', value: department || 'Operations Core', bold: false },
        ...(verificationHint ? [{ label: 'Verification Key', value: verificationHint, mono: true, color: '#0284c7' }] : []),
        { label: 'Link Expires In', value: `${expiresHours} Hours`, color: '#b45309' }
      ])}
    </table>

    <p style="margin:0;font-size:13.5px;color:#475569;">
      Once activated, sign in anytime with Company Code <strong style="font-family:${FONT_MONO};color:#059669;">${escapeHtml(safeCode)}</strong> and your work email.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `Activate your ShiftRelay Profile — ${safeOrg}`,
    preheader: `You're invited to ${safeOrg} on ShiftRelay — activate your profile within ${expiresHours} hours`,
    recipientName: safeName,
    deliveryReason: `Your work profile was authorized by ${safeOrg} management.`,
    bodyHtml,
    primaryCtaText: 'Activate My Workplace Profile',
    primaryCtaUrl: activationUrl,
    secondaryNote: `Not expecting this invitation? You can safely ignore this email — the link expires automatically in ${expiresHours} hours.`,
    badgeLabel: 'WORKPLACE INVITE',
    badgeTone: 'emerald',
    securityMetadata: {
      'Provisioned Account': recipientEmail || safeName,
      'Organization Code': safeCode,
      'Role Classification': roleTitle,
      'Action': 'PROFILE_ACTIVATION'
    }
  });
}

/**
 * 2. Security Password Reset & Credential Rotation Email
 */
export function renderPasswordResetEmail({
  recipientName,
  recipientEmail,
  resetUrl,
  requestIp = '102.89.34.12 (Lagos, NG)',
  expiresMinutes = 30
}) {
  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-family:${FONT_SANS};font-size:22px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      Reset your ShiftRelay password
    </h1>
    <p style="margin:0 0 18px;color:#475569;">
      We received a request to reset the password for <strong>${escapeHtml(recipientEmail)}</strong>. Use the secure button below to choose a new password.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 6px;">
      ${renderKeyValueRows([
        { label: 'Account', value: recipientEmail, mono: true },
        { label: 'Valid Window', value: `${expiresMinutes} Minutes (Single-Use)`, color: '#b45309' },
        { label: 'Request Origin', value: requestIp, mono: true, bold: false }
      ])}
    </table>
  `;

  return wrapEnterpriseEmail({
    title: 'ShiftRelay Security: Reset Your Account Password',
    preheader: `Single-use password reset link valid for ${expiresMinutes} minutes`,
    recipientName,
    deliveryReason: 'A password reset was requested from the ShiftRelay portal.',
    bodyHtml,
    primaryCtaText: 'Reset ShiftRelay Password',
    primaryCtaUrl: resetUrl,
    secondaryNote: 'If you did not request a password reset, no action is needed — your existing password remains encrypted and unchanged.',
    badgeLabel: 'SECURITY',
    badgeTone: 'amber',
    securityMetadata: {
      'Authorized Account': recipientEmail,
      'Requesting IP': requestIp,
      'Token Expiration': `${expiresMinutes} Minutes`,
      'Protocol': 'PASSWORD_CREDENTIAL_ROTATION'
    }
  });
}

/**
 * 3. Shift Handover & Escalation Alert Email
 */
export function renderShiftHandoverEmail({
  supervisorName,
  outgoingWorkerName,
  incomingWorkerName,
  shiftTitle,
  facilityName,
  checklistCompleted = 8,
  checklistTotal = 8,
  priority = 'NORMAL',
  handoverSummary,
  reviewUrl
}) {
  const priorityColor = priority === 'CRITICAL' ? '#dc2626' : priority === 'HIGH' ? '#d97706' : '#059669';
  const tone = priority === 'CRITICAL' ? 'red' : priority === 'HIGH' ? 'amber' : 'emerald';

  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-family:${FONT_SANS};font-size:21px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      Shift handover ready for sign-off
    </h1>
    <p style="margin:0 0 20px;color:#475569;">
      <strong>${escapeHtml(outgoingWorkerName)}</strong> submitted a verified changeover brief for <strong>${escapeHtml(shiftTitle)}</strong> at <strong>${escapeHtml(facilityName)}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 20px;">
      ${renderKeyValueRows([
        { label: 'Outgoing Specialist', value: outgoingWorkerName },
        { label: 'Incoming Reliever', value: incomingWorkerName || 'Designated Shift Reliever', bold: false },
        { label: 'Checklist Status', value: `${checklistCompleted} of ${checklistTotal} Tasks Certified`, color: '#059669' },
        { label: 'Priority', value: priority, color: priorityColor }
      ])}
    </table>

    <div style="border-left:3px solid #059669;padding:2px 0 2px 14px;margin:0 0 6px;">
      <div style="font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Handover Summary</div>
      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">${escapeHtml(handoverSummary)}</p>
    </div>
  `;

  return wrapEnterpriseEmail({
    title: `Shift Handover Brief: ${shiftTitle} (${outgoingWorkerName})`,
    preheader: `${outgoingWorkerName} completed ${checklistCompleted}/${checklistTotal} checks at ${facilityName}`,
    recipientName: supervisorName,
    deliveryReason: 'You are the registered shift supervisor for this operational unit.',
    bodyHtml,
    primaryCtaText: 'Review & Authorize Handover',
    primaryCtaUrl: reviewUrl,
    badgeLabel: 'SHIFT HANDOVER',
    badgeTone: tone,
    securityMetadata: {
      'Facility': facilityName,
      'Shift Window': shiftTitle,
      'Checksum': 'SHA256-' + Math.random().toString(36).slice(2, 10).toUpperCase()
    }
  });
}

/**
 * 4. Executive Statutory Payroll & Remittance Digest Email
 */
export function renderExecutivePayrollDigestEmail({
  executiveName,
  orgName,
  period = 'November 2026',
  employeeCount = 142,
  totalGrossNgn = 13920000,
  netPayableNgn = 9445200,
  penComRemittanceNgn = 2505600,
  payeTaxNgn = 1842000,
  varianceNgn = 0,
  reportDownloadUrl
}) {
  const fmtMoney = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const bodyHtml = `
    <div style="margin:0 0 22px;padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
      <div style="font-family:${FONT_MONO};font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
        Net Bank Disbursement &middot; ${escapeHtml(period)}
      </div>
      <div class="sr-hero-num" style="font-family:${FONT_SANS};font-size:34px;font-weight:800;letter-spacing:-0.035em;color:#0f172a;line-height:1.1;font-variant-numeric:tabular-nums;">
        ${fmtMoney(netPayableNgn)}
      </div>
      <div style="margin-top:8px;font-size:13px;color:#059669;font-weight:700;">
        Variance: ₦${Number(varianceNgn).toFixed(2)} (100% RECONCILED)
      </div>
    </div>

    <p style="margin:0 0 18px;color:#475569;">
      The monthly statutory payroll run for <strong>${escapeHtml(orgName)}</strong> has been compiled directly from verified attendance punches and is ready for executive review.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 6px;">
      ${renderKeyValueRows([
        { label: 'Verified Headcount', value: `${employeeCount} Specialists` },
        { label: 'Total Gross Payroll', value: fmtMoney(totalGrossNgn), mono: true },
        { label: 'PenCom Remittance (8% + 10%)', value: fmtMoney(penComRemittanceNgn), mono: true, color: '#0369a1' },
        { label: 'PAYE Tax Withheld (NTA 2025)', value: fmtMoney(payeTaxNgn), mono: true, color: '#0369a1' },
        { label: 'Net Bank Disbursement', value: fmtMoney(netPayableNgn), mono: true, color: '#0f172a' },
        { label: 'Payroll Variance Check', value: `₦${Number(varianceNgn).toFixed(2)} (100% RECONCILED)`, color: '#059669' }
      ])}
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `Executive Payroll & Remittance Digest — ${period}`,
    preheader: `${orgName}: ${fmtMoney(netPayableNgn)} net disbursement compiled with ₦0.00 variance`,
    recipientName: executiveName,
    deliveryReason: 'You are listed as an Executive Director or Payroll Officer for this organisation.',
    bodyHtml,
    primaryCtaText: 'Download Statutory Payroll Ledger',
    primaryCtaUrl: reportDownloadUrl,
    badgeLabel: 'PAYROLL DIGEST',
    badgeTone: 'emerald',
    securityMetadata: {
      'Corporate Entity': orgName,
      'Statutory Period': period,
      'Reconciliation': 'ZERO_VARIANCE_CERTIFIED'
    }
  });
}

/**
 * 5. Automated Weekly Operational Newsletter & Progress Digest
 */
export function renderWeeklyProgressNewsletterEmail({
  recipientName,
  orgName = LEGAL_ENTITY.companyLegalName,
  weekNumber = 46,
  year = 2026,
  stats = {
    totalShiftsAccounted: 142,
    verifiedHoursLogged: 1420,
    punctualityRate: '99.4%',
    safetyIncidents: 0,
    variance: '₦0.00'
  },
  topPractices = [
    { title: 'Sub-Second Muster Scans', desc: 'Average gate check-in dropped to 0.4 seconds across all active site lanes.' },
    { title: 'Zero Overtime Disputes', desc: 'Supervisor real-time shift authorization prevented 100% of retroactive claim delays.' },
    { title: 'CR80 Corporate Staff ID Cards', desc: 'Print-ready and digital ISO QR staff badges power instant offline & peer-assisted clock-in.' }
  ],
  platformUrl = getEmailPlatformBaseUrl(),
  unsubUrl = `${getEmailMarketingBaseUrl()}/unsubscribe`
}) {
  const practicesHtml = topPractices.map((p, idx) => `
    <tr>
      <td style="padding:12px 0;border-top:${idx === 0 ? '1px solid #e2e8f0' : '1px solid #f1f5f9'};">
        <div style="font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(p.title)}</div>
        <div style="font-size:13px;color:#64748b;line-height:1.5;margin-top:3px;">${escapeHtml(p.desc)}</div>
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-family:${FONT_SANS};font-size:21px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      ShiftRelay Weekly Operational Dispatch
    </h1>
    <p style="margin:0 0 22px;color:#475569;">
      Week ${weekNumber}, ${year} performance summary for <strong>${escapeHtml(orgName)}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
      <tr>
        <td class="sr-stack-col" width="48%" style="padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;vertical-align:top;">
          <div style="font-family:${FONT_MONO};font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Shifts Accounted</div>
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:#0f172a;margin-top:4px;font-variant-numeric:tabular-nums;">${stats.totalShiftsAccounted}</div>
          <div style="font-size:11.5px;color:#059669;font-weight:600;margin-top:2px;">100% Verified Handovers</div>
        </td>
        <td class="sr-stack-gap" width="4%">&nbsp;</td>
        <td class="sr-stack-col" width="48%" style="padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;vertical-align:top;">
          <div style="font-family:${FONT_MONO};font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Punctuality Score</div>
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:#0f172a;margin-top:4px;font-variant-numeric:tabular-nums;">${stats.punctualityRate}</div>
          <div style="font-size:11.5px;color:#0369a1;font-weight:600;margin-top:2px;">On-Time Gate Arrival</div>
        </td>
      </tr>
      <tr><td height="10" colspan="3" style="font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td class="sr-stack-col" width="48%" style="padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;vertical-align:top;">
          <div style="font-family:${FONT_MONO};font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Verified Hours</div>
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:#0f172a;margin-top:4px;font-variant-numeric:tabular-nums;">${Number(stats.verifiedHoursLogged).toLocaleString()} hrs</div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px;">GPS + Peer Authenticated</div>
        </td>
        <td class="sr-stack-gap" width="4%">&nbsp;</td>
        <td class="sr-stack-col" width="48%" style="padding:16px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;vertical-align:top;">
          <div style="font-family:${FONT_MONO};font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Payroll Variance</div>
          <div style="font-size:26px;font-weight:800;letter-spacing:-0.03em;color:#059669;margin-top:4px;font-variant-numeric:tabular-nums;">${stats.variance}</div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Zero Leakage Reconciled</div>
        </td>
      </tr>
    </table>

    <div style="font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">
      Operational Highlights
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #e2e8f0;">
      ${practicesHtml}
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `ShiftRelay Weekly Operational Dispatch — Week ${weekNumber}`,
    preheader: `Week ${weekNumber}: ${stats.totalShiftsAccounted} shifts verified · ${stats.punctualityRate} punctuality · ${stats.variance} variance`,
    recipientName,
    deliveryReason: 'You are subscribed to the weekly workforce operations digest.',
    bodyHtml,
    primaryCtaText: 'Open Operational Cockpit',
    primaryCtaUrl: platformUrl,
    secondaryNote: 'Use the one-click Unsubscribe link below anytime to stop receiving weekly digest emails.',
    badgeLabel: 'WEEKLY DISPATCH',
    badgeTone: 'slate',
    securityMetadata: {
      'Reporting Week': `W${weekNumber}-${year}`,
      'Safety Incidents': `${stats.safetyIncidents} Logged`
    },
    unsubUrl
  });
}

/**
 * 6. Automated Attendance Reminder & Missed Clock-In Escalation Email
 */
export function renderAttendanceReminderEmail({
  recipientName,
  orgName = 'Riffmax Technology Limited',
  stageLabel = 'Clock-In Reminder',
  urgency = 'REMINDER',
  headline = 'Your shift is starting soon',
  message = 'Open ShiftRelay OS to clock in via verified GPS or colleague ID scan.',
  shiftWindow = '08:00 – 16:00',
  graceMinutes = 10,
  actionUrl = `${getEmailPlatformBaseUrl()}/#today`
}) {
  const isEsc = urgency === 'ESCALATION';
  const accent = isEsc ? '#dc2626' : urgency === 'ACTION_REQUIRED' ? '#d97706' : '#059669';
  const tone = isEsc ? 'red' : urgency === 'ACTION_REQUIRED' ? 'amber' : 'emerald';

  const bodyHtml = `
    <div style="border-left:3px solid ${accent};padding:2px 0 2px 14px;margin:0 0 20px;">
      <div style="font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.06em;">
        ${escapeHtml(stageLabel)} &middot; ${escapeHtml(urgency)}
      </div>
      <h1 style="margin:4px 0 6px;font-family:${FONT_SANS};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#0f172a;line-height:1.25;">
        ${escapeHtml(headline)}
      </h1>
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.55;">
        ${escapeHtml(message)}
      </p>
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 6px;">
      ${renderKeyValueRows([
        { label: 'Employer', value: orgName },
        { label: 'Scheduled Shift', value: shiftWindow, mono: true, color: '#0369a1' },
        { label: 'Grace Policy', value: `${Number(graceMinutes)} minutes (within grace = zero pay deduction)`, color: '#059669' }
      ])}
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `${stageLabel} — ${orgName}`,
    preheader: `${headline}: ${message}`,
    recipientName,
    deliveryReason: `Automated ShiftRelay OS attendance watchdog for ${orgName}.`,
    bodyHtml,
    primaryCtaText: isEsc ? 'Review Attendance Exception' : 'Open ShiftRelay OS Clock-In',
    primaryCtaUrl: actionUrl,
    secondaryNote: 'Phone battery low or offline? Any verified on-site colleague can scan your physical CR80 Staff ID card inside ShiftRelay OS.',
    badgeLabel: isEsc ? 'ESCALATION' : 'ATTENDANCE',
    badgeTone: tone,
    securityMetadata: {
      'Organisation': orgName,
      'Stage': stageLabel,
      'Grace Window': `${Number(graceMinutes)} Minutes`
    }
  });
}

/**
 * 7. Public Newsletter Signup Confirmation / Welcome Email (NDPA 2023 Opt-In)
 */
export function renderNewsletterWelcomeEmail({
  email,
  fullName = 'Workforce Leader',
  roleSegment = 'general',
  unsubscribeUrl,
  marketingUrl = getEmailMarketingBaseUrl()
}) {
  const segmentLabels = {
    hr_payroll: 'HR, Payroll & PenCom Compliance',
    operations: 'Shift Operations & Site Supervision',
    executive: 'Executive & Finance Leadership',
    general: 'Workforce & Statutory Brief'
  };
  const segLabel = segmentLabels[roleSegment] || segmentLabels.general;

  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-family:${FONT_SANS};font-size:22px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      You&rsquo;re subscribed to the Statutory Brief
    </h1>
    <p style="margin:0 0 18px;color:#475569;">
      Welcome to the <strong>ShiftRelay OS Workforce &amp; Statutory Brief</strong> by ${escapeHtml(COMPANY_LEGAL)}. Your monthly track (<strong>${escapeHtml(segLabel)}</strong>) is active under NDPA 2023 explicit consent.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 6px;">
      <tr><td style="padding:11px 0;font-size:13.5px;color:#334155;"><strong>1. Statutory Deadlines</strong> &mdash; NTA 2025 PAYE, PenCom PRA 2014 (8%/10% BHT), NHF &amp; NSITF filing alerts.</td></tr>
      <tr><td style="padding:11px 0;border-top:1px solid #f1f5f9;font-size:13.5px;color:#334155;"><strong>2. Frontline Benchmarks</strong> &mdash; Geofence verification, exception governance &amp; zero-smartphone Peer ID guides.</td></tr>
      <tr><td style="padding:11px 0;border-top:1px solid #f1f5f9;font-size:13.5px;color:#334155;"><strong>3. Payroll Templates</strong> &mdash; Ready-to-use bank CSV &amp; rollout checklists for multi-site operations.</td></tr>
    </table>
  `;

  return wrapEnterpriseEmail({
    title: 'Subscribed: ShiftRelay OS Workforce & Statutory Brief',
    preheader: `Your ${segLabel} briefing subscription on shiftrelayos.com is active`,
    recipientName: fullName || email,
    deliveryReason: `Explicit NDPA 2023 website newsletter opt-in for ${segLabel}.`,
    bodyHtml,
    primaryCtaText: 'Open PAYE & PenCom Calculator',
    primaryCtaUrl: `${marketingUrl}/calculator.html`,
    secondaryNote: 'Unsubscribe anytime in one click using the link in the footer (RFC 8058 compliant).',
    badgeLabel: 'SUBSCRIBED',
    badgeTone: 'emerald',
    securityMetadata: {
      'Track': segLabel,
      'Subscriber': email,
      'NDPA Basis': 'EXPLICIT_OPT_IN_CONSENT'
    },
    unsubUrl: unsubscribeUrl || `${marketingUrl}/unsubscribe`
  });
}

/**
 * 8. Monthly Nigeria Workforce & Statutory Compliance Newsletter
 */
export function renderMonthlyComplianceNewsletterEmail({
  recipientName = 'Operations Leader',
  roleSegment = 'general',
  monthLabel = 'November 2026',
  complianceHighlights = [
    {
      title: 'PenCom 7-Working-Day Remittance Window',
      desc: 'Employers must remit deducted 8% employee + 10% employer pension contributions to PFAs within 7 working days after salary payment to avoid PRA 2014 Section 11 penalties.'
    },
    {
      title: 'Zero Double-Deduction Exception Governance',
      desc: 'Pair configurable grace windows with automatic shift-start reminders and supervisor pardon controls before bank CSV disbursement.'
    },
    {
      title: 'NDPA 2023 Frontline Privacy Standard',
      desc: 'Ensure point-of-punch geolocation and peer ID scans run strictly on-site during clock events — never background tracking off-shift.'
    }
  ],
  operationalBenchmarks = {
    avgClockInLatency: '0.4s',
    exceptionResolutionSla: '< 2h',
    payrollVariance: '₦0.00'
  },
  calculatorUrl = `${getEmailMarketingBaseUrl()}/calculator.html`,
  unsubscribeUrl = `${getEmailMarketingBaseUrl()}/unsubscribe`
}) {
  const highlightsHtml = complianceHighlights.map((item, idx) => `
    <tr>
      <td style="padding:12px 0;border-top:${idx === 0 ? '1px solid #e2e8f0' : '1px solid #f1f5f9'};">
        <div style="font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(item.title)}</div>
        <div style="font-size:13px;color:#64748b;line-height:1.55;margin-top:3px;">${escapeHtml(item.desc)}</div>
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-family:${FONT_SANS};font-size:21px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      Nigeria Workforce &amp; Statutory Brief
    </h1>
    <p style="margin:0 0 20px;color:#475569;">
      <strong>${escapeHtml(monthLabel)}</strong> edition from ${escapeHtml(COMPANY_LEGAL)} &mdash; key payroll, PenCom, and NDPA updates.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px;">
      <tr>
        <td class="sr-stack-col" style="width:32%;padding:14px 10px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#059669;letter-spacing:-0.02em;">${escapeHtml(operationalBenchmarks.avgClockInLatency)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Avg Gate Scan</div>
        </td>
        <td class="sr-stack-gap" style="width:2%;">&nbsp;</td>
        <td class="sr-stack-col" style="width:32%;padding:14px 10px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#0369a1;letter-spacing:-0.02em;">${escapeHtml(operationalBenchmarks.exceptionResolutionSla)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Exception SLA</div>
        </td>
        <td class="sr-stack-gap" style="width:2%;">&nbsp;</td>
        <td class="sr-stack-col" style="width:32%;padding:14px 10px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(operationalBenchmarks.payrollVariance)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Remittance Drift</div>
        </td>
      </tr>
    </table>

    <div style="font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">
      Statutory Advisories
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #e2e8f0;">
      ${highlightsHtml}
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `Nigeria Workforce & Statutory Brief — ${monthLabel}`,
    preheader: `${monthLabel}: PenCom PRA 2014 reminders, Nigeria Tax Act (NTA) 2025 PAYE rules & benchmarks`,
    recipientName,
    deliveryReason: `Monthly ShiftRelay OS statutory brief (segment: ${roleSegment}).`,
    bodyHtml,
    primaryCtaText: 'Open PAYE & PenCom Calculator',
    primaryCtaUrl: calculatorUrl,
    secondaryNote: 'Instant one-click unsubscribe supported below (RFC 8058 compliant).',
    badgeLabel: 'STATUTORY BRIEF',
    badgeTone: 'sky',
    securityMetadata: {
      'Edition': monthLabel,
      'Segment': String(roleSegment).toUpperCase(),
      'Frameworks': 'NDPA 2023 / NTA 2025 / PRA 2014'
    },
    unsubUrl: unsubscribeUrl
  });
}

/**
 * 9. Employer Billing & Onboarding Secure Paystack Payment Link Email (Stripe / Paystack Invoice Standard)
 * Branded: ShiftRelay · Powered by Riffmax Technology Limited
 */
export function renderBillingPaymentLinkEmail({
  companyName,
  companyCode = '',
  recipientName = 'Executive Team',
  invoiceId,
  invoiceTypeLabel = 'One-Time Setup & Deployment',
  planLabel = 'Startup',
  cycleMonth = '',
  breakdownLines = [],
  totalAmountNgn = 0,
  checkoutUrl,
  isOnboarding = false,
  loginPortalUrl = ''
}) {
  const fmtNgn = (v) => `₦${Math.round(Number(v || 0)).toLocaleString('en-NG')}`;
  const items = Array.isArray(breakdownLines) && breakdownLines.length > 0
    ? breakdownLines
    : [{ label: invoiceTypeLabel, amountNgn: totalAmountNgn }];

  const rowsHtml = items.map((line) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-family:${FONT_SANS};font-size:13.5px;color:#0f172a;vertical-align:top;">
        <div style="font-weight:600;color:#0f172a;">${escapeHtml(line.label)}</div>
        ${line.note ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(line.note)}</div>` : ''}
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-family:${FONT_MONO};font-size:13.5px;font-weight:600;color:#0f172a;text-align:right;white-space:nowrap;vertical-align:top;">
        ${line.isCredit ? '&minus;' : ''}${fmtNgn(Math.abs(Number(line.amountNgn || 0)))}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <!-- Stripe / Paystack Hero Invoice Amount -->
    <div style="margin:0 0 24px;padding-bottom:22px;border-bottom:1px solid #f1f5f9;">
      <div style="font-family:${FONT_MONO};font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">
        Invoice from ShiftRelay &middot; ${escapeHtml(invoiceId)}
      </div>
      <div class="sr-hero-num" style="margin:8px 0 6px;font-family:${FONT_SANS};font-size:38px;font-weight:800;letter-spacing:-0.035em;color:#0f172a;line-height:1.08;font-variant-numeric:tabular-nums;">
        ${fmtNgn(totalAmountNgn)}
      </div>
      <div style="font-size:13px;color:#64748b;">
        ${escapeHtml(invoiceTypeLabel)} &middot; <strong style="color:#0f172a;">${escapeHtml(planLabel)}</strong>${cycleMonth ? ` &middot; ${escapeHtml(cycleMonth)}` : ''}
      </div>
    </div>

    <p style="margin:0 0 20px;color:#475569;">
      ${isOnboarding
        ? `Your dedicated workspace for <strong>${escapeHtml(companyName)}</strong>${companyCode ? ` (<span style="font-family:${FONT_MONO};color:#059669;font-weight:700;">${escapeHtml(companyCode)}</span>)` : ''} is configured and ready. Settle this invoice securely via <strong>Paystack</strong> (Bank Transfer, Card, or USSD) to immediately unlock staff roster onboarding.`
        : `Your itemized ShiftRelay billing statement for <strong>${escapeHtml(companyName)}</strong> is ready. 100% employer-paid &mdash; <strong>₦0 is ever deducted from staff salaries</strong>.`}
    </p>

    <!-- Clean Typographic Line-Item Ledger -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 8px;border-bottom:1px solid #e2e8f0;font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Item</th>
          <th align="right" style="padding:0 0 8px;border-bottom:1px solid #e2e8f0;font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr>
          <td style="padding:14px 0 0;font-family:${FONT_SANS};font-size:14.5px;font-weight:700;color:#0f172a;">Amount Due</td>
          <td align="right" style="padding:14px 0 0;font-family:${FONT_MONO};font-size:18px;font-weight:800;color:#059669;text-align:right;white-space:nowrap;">
            ${fmtNgn(totalAmountNgn)}
          </td>
        </tr>
      </tbody>
    </table>

    <p style="margin:0;font-size:12.5px;color:#64748b;line-height:1.55;">
      Your official <strong>ShiftRelay (Powered by ${escapeHtml(COMPANY_LEGAL)})</strong> payment receipt is issued automatically the moment Paystack confirms payment.${loginPortalUrl ? `<br>Portal link: <a href="${escapeHtml(loginPortalUrl)}" style="color:#059669;font-weight:600;">${escapeHtml(loginPortalUrl)}</a>` : ''}
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `[${invoiceId}] ShiftRelay ${invoiceTypeLabel} — ${fmtNgn(totalAmountNgn)}`,
    preheader: `${companyName}: Invoice ${invoiceId} for ${fmtNgn(totalAmountNgn)} — pay securely via Paystack`,
    recipientName,
    deliveryReason: `Official ShiftRelay billing invoice issued by ${COMPANY_LEGAL} for ${companyName}.`,
    bodyHtml,
    primaryCtaText: `Pay ${fmtNgn(totalAmountNgn)} Securely via Paystack`,
    primaryCtaUrl: checkoutUrl,
    secondaryNote: `Accepted on Paystack: Instant Nigerian Bank Transfer, Verve / Visa / Mastercard, and USSD.`,
    badgeLabel: 'PAYMENT DUE',
    badgeTone: 'amber',
    hideGreeting: true,
    securityMetadata: {
      'Invoice ID': invoiceId,
      'Client': companyName,
      'Company Code': companyCode || 'PENDING',
      'Plan Tier': planLabel,
      'Processor': 'Paystack Live (PCI-DSS Level 1)',
      'Issuer': `${BRAND_NAME} · ${COMPANY_LEGAL} (${COMPANY_RC})`
    }
  });
}

/**
 * 10. Official Automated Payment Receipt Email (Exact Stripe / Paystack / Wise Receipt Standard)
 * Branded: ShiftRelay · Powered by Riffmax Technology Limited
 */
export function renderOfficialPaymentReceiptEmail({
  companyName,
  companyCode = '',
  recipientName = 'Executive Team',
  receiptNumber,
  invoiceId,
  paystackReference,
  invoiceTypeLabel = 'One-Time Setup & Deployment',
  planLabel = 'Startup',
  cycleMonth = '',
  breakdownLines = [],
  totalPaidNgn = 0,
  paidAtIso = new Date().toISOString(),
  paymentChannel = 'Paystack Verified',
  loginPortalUrl = ''
}) {
  const fmtNgn = (v) => `₦${Math.round(Number(v || 0)).toLocaleString('en-NG')}`;
  const paidDateWat = new Date(paidAtIso || Date.now()).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short'
  }) + ' WAT';

  const items = Array.isArray(breakdownLines) && breakdownLines.length > 0
    ? breakdownLines
    : [{ label: invoiceTypeLabel, amountNgn: totalPaidNgn }];

  const rowsHtml = items.map((line) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-family:${FONT_SANS};font-size:13.5px;color:#0f172a;vertical-align:top;">
        <div style="font-weight:600;color:#0f172a;">${escapeHtml(line.label)}</div>
        ${line.note ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(line.note)}</div>` : ''}
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #f1f5f9;font-family:${FONT_MONO};font-size:13.5px;font-weight:600;color:#0f172a;text-align:right;white-space:nowrap;vertical-align:top;">
        ${line.isCredit ? '&minus;' : ''}${fmtNgn(Math.abs(Number(line.amountNgn || 0)))}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <!-- Stripe / Paystack Signature Centered Receipt Hero -->
    <div style="text-align:center;padding:4px 0 24px;border-bottom:1px solid #f1f5f9;margin:0 0 22px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 12px;">
        <tr>
          <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:999px;background-color:#ecfdf5;border:1.5px solid #a7f3d0;font-family:${FONT_SANS};font-size:20px;font-weight:800;color:#059669;line-height:44px;">
            &#10003;
          </td>
        </tr>
      </table>
      <div style="font-family:${FONT_MONO};font-size:11px;font-weight:700;color:#059669;letter-spacing:0.08em;text-transform:uppercase;">
        OFFICIAL PAYMENT RECEIPT &middot; PAID
      </div>
      <div class="sr-hero-num" style="margin:8px 0 6px;font-family:${FONT_SANS};font-size:40px;font-weight:800;letter-spacing:-0.035em;color:#0f172a;line-height:1.05;font-variant-numeric:tabular-nums;">
        ${fmtNgn(totalPaidNgn)}
      </div>
      <div style="font-size:13px;color:#64748b;">
        Paid on ${escapeHtml(paidDateWat)} &middot; Powered by ${escapeHtml(COMPANY_LEGAL)}
      </div>
    </div>

    <p style="margin:0 0 20px;color:#475569;">
      Thank you, <strong>${escapeHtml(recipientName)}</strong>. We have received your payment for <strong>${escapeHtml(companyName)}</strong>. Retain this email as your official corporate accounting receipt.
    </p>

    <!-- Clean Metadata Grid -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 22px;">
      ${renderKeyValueRows([
        { label: 'Receipt Number', value: receiptNumber, mono: true, color: '#059669' },
        { label: 'Invoice ID', value: invoiceId, mono: true },
        { label: 'Paystack Reference', value: paystackReference || invoiceId, mono: true, color: '#0369a1' },
        { label: 'Billed Organisation', value: `${companyName}${companyCode ? ` (${companyCode})` : ''}` },
        { label: 'Plan & Billing Type', value: `${planLabel} — ${invoiceTypeLabel}${cycleMonth ? ` (${cycleMonth})` : ''}`, bold: false },
        { label: 'Payment Channel', value: paymentChannel, bold: false }
      ])}
    </table>

    <!-- Itemized Paid Ledger -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;">
      <thead>
        <tr>
          <th align="left" style="padding:0 0 8px;border-bottom:1px solid #e2e8f0;font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Paid Item</th>
          <th align="right" style="padding:0 0 8px;border-bottom:1px solid #e2e8f0;font-family:${FONT_MONO};font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr>
          <td style="padding:14px 0 0;font-family:${FONT_SANS};font-size:14.5px;font-weight:700;color:#0f172a;">Amount Paid <span style="font-weight:500;color:#64748b;font-size:12.5px;">(Balance Due: ₦0)</span></td>
          <td align="right" style="padding:14px 0 0;font-family:${FONT_MONO};font-size:18px;font-weight:800;color:#059669;text-align:right;white-space:nowrap;">
            ${fmtNgn(totalPaidNgn)}
          </td>
        </tr>
      </tbody>
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `Official Receipt ${receiptNumber} — ShiftRelay (${fmtNgn(totalPaidNgn)} Paid)`,
    preheader: `Receipt ${receiptNumber}: ${fmtNgn(totalPaidNgn)} paid by ${companyName} · Powered by ${COMPANY_LEGAL}`,
    recipientName,
    deliveryReason: `Automated official payment receipt issued by ShiftRelay (Powered by ${COMPANY_LEGAL}) upon verified payment settlement.`,
    bodyHtml,
    primaryCtaText: loginPortalUrl && loginPortalUrl.includes('onboard.html') ? 'Submit Your Staff Roster Now' : 'Open ShiftRelay Workspace',
    primaryCtaUrl: loginPortalUrl || getEmailPlatformBaseUrl(),
    secondaryNote: `For corporate finance queries, contact ${LEGAL_ENTITY.financeEmail}. Issued electronically by ${BRAND_NAME}, powered by ${COMPANY_LEGAL} (${COMPANY_RC}).`,
    badgeLabel: 'OFFICIAL RECEIPT',
    badgeTone: 'emerald',
    hideGreeting: true,
    securityMetadata: {
      'Receipt Number': receiptNumber,
      'Paystack Reference': paystackReference || invoiceId,
      'Settlement Status': 'PAID_AND_RECONCILED',
      'Issuer': `ShiftRelay · Powered by ${COMPANY_LEGAL} (${COMPANY_RC})`
    }
  });
}

/**
 * 11. Company Onboarding Intake Form Invite Email (Stage 1 Link sent by Admin to Prospect)
 */
export function renderOnboardingIntakeInviteEmail({
  companyName = 'Your Organisation',
  recipientName = 'Executive Team',
  intakeUrl,
  note = ''
}) {
  const bodyHtml = `
    <h1 style="margin:0 0 10px;font-family:${FONT_SANS};font-size:22px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      Let&rsquo;s get ${escapeHtml(companyName)} live on ShiftRelay
    </h1>
    <p style="margin:0 0 20px;color:#475569;">
      Complete our 2-minute onboarding intake form with your basic company details and worker headcount so we assign the right scalable plan tier (<strong>Startup, Business, Enterprise, Corporate, or Mega</strong>) with your choice of <strong>Monthly</strong> or <strong>Annual (12-Month)</strong> billing.
    </p>
    ${note ? `<div style="border-left:3px solid #059669;padding:4px 0 4px 14px;margin:0 0 20px;font-size:13.5px;color:#334155;">${escapeHtml(note)}</div>` : ''}

    <!-- Clean 3-Step Numbered Timeline (Stripe / Mercury Onboarding Style) -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 6px;">
      <tr>
        <td width="34" valign="top" style="padding:13px 0;">
          <div style="width:24px;height:24px;border-radius:999px;background-color:#ecfdf5;border:1px solid #a7f3d0;color:#047857;font-family:${FONT_MONO};font-size:11.5px;font-weight:800;text-align:center;line-height:24px;">1</div>
        </td>
        <td valign="top" style="padding:13px 0;font-size:13.5px;color:#334155;">
          <strong style="color:#0f172a;">Submit Company Info &amp; Headcount</strong><br>
          <span style="color:#64748b;font-size:12.5px;">Takes 2 minutes &mdash; auto-matches your exact plan tier.</span>
        </td>
      </tr>
      <tr>
        <td width="34" valign="top" style="padding:13px 0;border-top:1px solid #f1f5f9;">
          <div style="width:24px;height:24px;border-radius:999px;background-color:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-family:${FONT_MONO};font-size:11.5px;font-weight:800;text-align:center;line-height:24px;">2</div>
        </td>
        <td valign="top" style="padding:13px 0;border-top:1px solid #f1f5f9;font-size:13.5px;color:#334155;">
          <strong style="color:#0f172a;">Settle Setup via Paystack</strong><br>
          <span style="color:#64748b;font-size:12.5px;">Pay by Bank Transfer, Card, or USSD and receive an instant official ShiftRelay receipt.</span>
        </td>
      </tr>
      <tr>
        <td width="34" valign="top" style="padding:13px 0;border-top:1px solid #f1f5f9;">
          <div style="width:24px;height:24px;border-radius:999px;background-color:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-family:${FONT_MONO};font-size:11.5px;font-weight:800;text-align:center;line-height:24px;">3</div>
        </td>
        <td valign="top" style="padding:13px 0;border-top:1px solid #f1f5f9;font-size:13.5px;color:#334155;">
          <strong style="color:#0f172a;">Upload Staff Roster &amp; Go Live</strong><br>
          <span style="color:#64748b;font-size:12.5px;">Unlocks automatically after payment along with Staff ID cards &amp; statutory payroll setup.</span>
        </td>
      </tr>
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `Complete Your ShiftRelay Company Onboarding Form — ${companyName}`,
    preheader: `2-minute company onboarding form for ${companyName} — Powered by ${COMPANY_LEGAL}`,
    recipientName,
    deliveryReason: `ShiftRelay onboarding invitation issued by ${COMPANY_LEGAL}.`,
    bodyHtml,
    primaryCtaText: 'Open Company Onboarding Form',
    primaryCtaUrl: intakeUrl,
    secondaryNote: 'No staff details or payment are needed on Step 1 — staff roster upload unlocks immediately after payment confirmation.',
    badgeLabel: 'ONBOARDING · STEP 1',
    badgeTone: 'emerald',
    securityMetadata: {
      'Stage': 'STAGE_1_COMPANY_INTAKE',
      'Issuer': `ShiftRelay · Powered by ${COMPANY_LEGAL} (${COMPANY_RC})`
    }
  });
}

/**
 * 12. Customer Care Support Ticket Confirmation, Reply & Resolution Email
 */
export function renderSupportTicketEmail({
  recipientName = 'Valued User',
  ticketId,
  category = 'General Support',
  status = 'OPEN',
  headline = 'Support Ticket Update',
  messageBody = '',
  agentName = 'ShiftRelay Customer Care',
  portalUrl = getEmailPlatformBaseUrl()
}) {
  const isResolved = String(status || '').toUpperCase() === 'RESOLVED';

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-family:${FONT_SANS};font-size:21px;font-weight:800;letter-spacing:-0.025em;color:#0f172a;line-height:1.25;">
      ${escapeHtml(headline)}
    </h1>
    <p style="margin:0 0 18px;color:#64748b;font-size:13.5px;">
      Ticket <strong style="font-family:${FONT_MONO};color:#0f172a;">${escapeHtml(ticketId)}</strong> &middot; ${escapeHtml(category)}
    </p>

    ${messageBody ? `
      <div style="border-left:3px solid #059669;padding:4px 0 4px 14px;margin:0 0 20px;font-size:14.5px;color:#1e293b;line-height:1.65;">
        ${escapeHtml(messageBody)}
      </div>
    ` : ''}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 6px;">
      ${renderKeyValueRows([
        { label: 'Ticket Reference', value: ticketId, mono: true },
        { label: 'Status', value: String(status).toUpperCase(), color: isResolved ? '#059669' : '#0369a1' },
        { label: 'Category', value: category, bold: false },
        { label: 'Handled By', value: agentName, bold: false }
      ])}
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `[${ticketId}] ${headline} — ShiftRelay Customer Care`,
    preheader: `${ticketId} (${status}): ${headline}`,
    recipientName,
    deliveryReason: `Automated ShiftRelay Customer Care notification for support ticket ${ticketId}.`,
    bodyHtml,
    primaryCtaText: 'Open ShiftRelay Support Desk',
    primaryCtaUrl: portalUrl,
    badgeLabel: isResolved ? 'TICKET RESOLVED' : 'CUSTOMER CARE',
    badgeTone: isResolved ? 'emerald' : 'sky',
    securityMetadata: {
      'Ticket ID': ticketId,
      'Status': String(status).toUpperCase(),
      'Category': category
    }
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
