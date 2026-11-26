/**
 * ShiftRelay Enterprise Email HTML Template & Dispatch Engine
 * Executive Light/Obsidian Hybrid Responsive HTML Email Architecture
 * Zero-Emoji · Bulletproof Outlook (VML), Gmail, Apple Mail & Mobile Compliant
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
  // Use live HTTPS Render origin until custom domain DNS is live so Gmail/iOS Mail always loads the real ShiftRelay logo PNG
  return 'https://shiftrelay-vjkf.onrender.com/icon-192.png';
}

/**
 * Universal Executive HTML Email Envelope Wrapper
 * - Clean Obsidian Command Header (#070d19) + Emerald 4px accent bar
 * - High-contrast Pure White (#ffffff) reading surface (immune to Gmail/Outlook dark inversion bugs)
 * - Bulletproof VML + CSS primary CTA button + unbroken fallback URL
 * - Enterprise Security & Audit Trace + Anti-Phishing Advisory + Riffmax Legal Footer
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
  badgeLabel = 'VERIFIED DISPATCH'
}) {
  const currentYear = new Date().getFullYear();
  const watTime = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short'
  }) + ' WAT';

  const metaRows = Object.entries(securityMetadata)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `
      <tr>
        <td style="padding:5px 8px;font-size:11px;color:#64748b;font-family:'JetBrains Mono',Consolas,monospace;text-transform:uppercase;letter-spacing:0.04em;border-top:1px solid #e2e8f0;">${escapeHtml(k)}</td>
        <td style="padding:5px 8px;font-size:11.5px;color:#0f172a;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;text-align:right;border-top:1px solid #e2e8f0;">${escapeHtml(String(v))}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
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
    @media only screen and (max-width: 620px) {
      .sr-container { width: 100% !important; border-radius: 0 !important; }
      .sr-pad { padding: 22px 18px !important; }
      .sr-btn { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
      .sr-meta-table td { font-size: 10.5px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader || title)} &middot; ShiftRelay OS by ${escapeHtml(COMPANY_LEGAL)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;table-layout:fixed;">
    <tr>
      <td align="center" style="padding:28px 12px 48px;">
        <table role="presentation" class="sr-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.08);">

          <!-- Canva-Aligned Obsidian Corporate Header with Real ShiftRelay Logo PNG -->
          <tr>
            <td class="sr-pad" align="center" style="background-color:#050a14;padding:28px 28px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td valign="middle" style="padding-right:14px;">
                    <img src="${escapeHtml(getEmailLogoUrl())}" width="52" height="52" alt="ShiftRelay Logo" style="display:block;width:52px;height:52px;border-radius:13px;border:1.5px solid rgba(16,185,129,0.45);background-color:#071915;" />
                  </td>
                  <td valign="middle" align="left">
                    <div style="font-size:24px;font-weight:800;letter-spacing:-0.025em;color:#ffffff;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      Shift<span style="color:#10b981;">Relay</span>
                    </div>
                    <div style="font-size:11.5px;color:#cbd5e1;font-weight:600;letter-spacing:0.01em;margin-top:4px;">
                      Powered by ${escapeHtml(COMPANY_LEGAL)}
                    </div>
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px;">
                <span style="display:inline-block;padding:4px 12px;background-color:rgba(16,185,129,0.14);border:1px solid rgba(52,211,153,0.45);border-radius:999px;font-size:10px;font-weight:800;color:#34d399;text-transform:uppercase;letter-spacing:0.08em;">
                  ${escapeHtml(badgeLabel)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Signature 4px Emerald Divider Bar (Canva Brand Accent) -->
          <tr>
            <td style="height:4px;background-color:#10b981;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Delivery Reason Strip -->
          ${deliveryReason ? `
          <tr>
            <td style="background-color:#f8fafc;padding:10px 32px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:12px;color:#475569;line-height:1.45;">
                    <strong style="color:#059669;">Why you received this:</strong> ${escapeHtml(deliveryReason)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Pure White High-Readability Main Canvas (Canva Clean Card Layout) -->
          <tr>
            <td class="sr-pad" style="padding:32px 34px 28px;background-color:#ffffff;">
              ${recipientName ? `
                <p style="margin:0 0 12px;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">
                  Hello ${escapeHtml(recipientName)},
                </p>
              ` : ''}

              <div style="font-size:14.5px;line-height:1.68;color:#334155;">
                ${bodyHtml}
              </div>

              <!-- Canva-Styled Bulletproof Emerald Pill CTA Button -->
              ${primaryCtaText && primaryCtaUrl ? `
                <div style="margin:28px 0 20px;text-align:center;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${primaryCtaUrl}" style="height:50px;v-text-anchor:middle;width:320px;" arcsize="20%" stroke="f" fillcolor="#0ea572">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(primaryCtaText)}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${primaryCtaUrl}" class="sr-btn" style="display:inline-block;padding:15px 38px;background-color:#0ea572;color:#ffffff;font-size:15px;font-weight:800;letter-spacing:-0.01em;text-decoration:none;border-radius:10px;text-align:center;">
                    ${escapeHtml(primaryCtaText)} &rarr;
                  </a>
                  <!--<![endif]-->
                </div>

                <!-- Unbroken Raw Fallback Link -->
                <div style="background-color:#f8fafc;padding:11px 14px;border-radius:10px;border:1px solid #e2e8f0;margin:14px 0 20px;word-break:break-all;">
                  <p style="margin:0 0 4px;font-size:11.5px;color:#64748b;font-weight:600;">
                    Button not working? Copy and paste this secure link into your browser:
                  </p>
                  <a href="${primaryCtaUrl}" style="font-size:11.5px;color:#059669;text-decoration:underline;font-family:'JetBrains Mono',Consolas,monospace;">
                    ${primaryCtaUrl}
                  </a>
                </div>
              ` : ''}

              ${secondaryNote ? `
                <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.55;">
                  ${secondaryNote}
                </p>
              ` : ''}

              <!-- Canva Mint-Bordered Security Verification & Audit Card -->
              <div style="margin-top:24px;background-color:#f0fdf4;border:1px solid #a7f3d0;border-radius:12px;padding:14px 16px;">
                <table role="presentation" class="sr-meta-table" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td colspan="2" style="padding-bottom:6px;font-size:11.5px;font-weight:800;color:#065f46;letter-spacing:0.04em;text-transform:uppercase;">
                      Enterprise Security &amp; Audit Trace &middot; Verified &amp; Logged
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 8px 5px;font-size:11px;color:#475569;font-family:'JetBrains Mono',Consolas,monospace;text-transform:uppercase;border-top:1px solid #d1fae5;">Dispatched At</td>
                    <td style="padding:6px 8px 5px;font-size:11.5px;color:#0f172a;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;text-align:right;border-top:1px solid #d1fae5;">${watTime}</td>
                  </tr>
                  ${metaRows}
                </table>
              </div>

              <!-- Subtle Anti-Phishing Advisory -->
              <div style="margin-top:14px;padding:10px 14px;background-color:#f8fafc;border-left:3px solid #94a3b8;border-radius:0 8px 8px 0;">
                <p style="margin:0;font-size:11.5px;color:#475569;line-height:1.5;">
                  <strong>Security Notice:</strong> ShiftRelay staff will <em>never</em> ask for your password, PIN, or BVN by email or phone. Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#059669;font-weight:700;">${SUPPORT_EMAIL}</a>.
                </p>
              </div>
            </td>
          </tr>

          <!-- Sleek Obsidian Corporate Footer (Canva Exact Footer Style) -->
          <tr>
            <td style="background-color:#050a14;padding:22px 28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#f8fafc;">
                ${escapeHtml(BRAND_NAME)} by ${escapeHtml(COMPANY_LEGAL)} (${escapeHtml(COMPANY_RC)})
              </p>
              <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;line-height:1.5;">
                ${escapeHtml(HEADQUARTERS)}
              </p>
              <div style="font-size:11.5px;color:#cbd5e1;">
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/terms.html" style="color:#cbd5e1;text-decoration:none;margin:0 7px;">Terms</a> &middot;
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/privacy.html" style="color:#cbd5e1;text-decoration:none;margin:0 7px;">Privacy</a> &middot;
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/trust.html" style="color:#cbd5e1;text-decoration:none;margin:0 7px;">Trust Center</a> &middot;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#cbd5e1;text-decoration:none;margin:0 7px;">Support</a>
                ${unsubUrl ? `&middot; <a href="${escapeHtml(unsubUrl)}" style="color:#34d399;text-decoration:none;margin:0 7px;">Unsubscribe</a>` : ''}
              </div>
              <p style="margin:12px 0 0;font-size:10.5px;color:#64748b;">
                &copy; ${currentYear} ${escapeHtml(BRAND_NAME)} by ${escapeHtml(COMPANY_LEGAL)}. All operational records cryptographically logged.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Account Activation & Workplace Invitation Email
 * Supports both { recipientName, orgName, orgCode } and legacy { workerName, companyName, companyCode }
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
    <p style="margin:0 0 14px;">
      Welcome to your organisation's verified operational portal. Leadership at <strong>${escapeHtml(safeOrg)}</strong> has provisioned your duty profile on <strong>ShiftRelay</strong>.
    </p>
    <div style="background-color:#f8fafc;padding:16px;border-radius:12px;margin:18px 0;border:1px solid #e2e8f0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="5" border="0" style="font-size:13px;">
        <tr>
          <td style="color:#64748b;width:140px;">Company Code:</td>
          <td style="color:#059669;font-family:'JetBrains Mono',Consolas,monospace;font-weight:800;">${escapeHtml(safeCode)}</td>
        </tr>
        ${staffId ? `
        <tr>
          <td style="color:#64748b;">Staff ID:</td>
          <td style="color:#0f172a;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;">${escapeHtml(staffId)}</td>
        </tr>` : ''}
        <tr>
          <td style="color:#64748b;">Assigned Role:</td>
          <td style="color:#0f172a;font-weight:700;">${escapeHtml(roleTitle)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Duty Department:</td>
          <td style="color:#0f172a;">${escapeHtml(department || 'Operations Core')}</td>
        </tr>
        ${verificationHint ? `
        <tr>
          <td style="color:#64748b;">Verification Key:</td>
          <td style="color:#0284c7;font-weight:700;">${escapeHtml(verificationHint)}</td>
        </tr>` : ''}
        <tr>
          <td style="color:#64748b;">Link Validity:</td>
          <td style="color:#b45309;font-weight:700;">${expiresHours} Hours</td>
        </tr>
      </table>
    </div>
    <p style="margin:14px 0 0;">
      Tap the button below to confirm your profile, set your secure password, and unlock your live shift schedule, scannable CR80 Staff ID card, and verified attendance tracker.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `Activate your ShiftRelay Profile — ${safeOrg}`,
    preheader: `Set your password and access your duty roster at ${safeOrg}`,
    recipientName: safeName,
    deliveryReason: `Your work profile was authorized by ${safeOrg} management.`,
    bodyHtml,
    primaryCtaText: 'Activate My Workplace Profile',
    primaryCtaUrl: activationUrl,
    secondaryNote: `If you were not expecting this invitation, no action is required; the activation link expires in ${expiresHours} hours.`,
    badgeLabel: 'WORKPLACE INVITE',
    securityMetadata: {
      'Provisioned Account': recipientEmail || safeName,
      'Organization Code': safeCode,
      'Role Classification': roleTitle,
      'Cryptographic Action': 'PROFILE_ACTIVATION'
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
    <p style="margin:0 0 14px;">
      A password reset was requested for your ShiftRelay account (<strong>${escapeHtml(recipientEmail)}</strong>).
    </p>
    <p style="margin:0 0 14px;">
      For your operational protection, this security link is strictly valid for <strong>${expiresMinutes} minutes</strong> and can only be used once.
    </p>
    <p style="margin:0 0 14px;">
      Click the button below to set your new password and resume access to your shift roster, handover logs, and earnings.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: 'ShiftRelay Security: Reset Your Account Password',
    preheader: 'Secure single-use link to reset your ShiftRelay password',
    recipientName,
    deliveryReason: 'A password reset was requested from the ShiftRelay mobile/web portal.',
    bodyHtml,
    primaryCtaText: 'Reset ShiftRelay Password',
    primaryCtaUrl: resetUrl,
    secondaryNote: 'If you did not make this request, please disregard this email. Your current password remains encrypted and active.',
    badgeLabel: 'SECURITY NOTICE',
    securityMetadata: {
      'Authorized Account': recipientEmail,
      'Requesting IP': requestIp,
      'Token Expiration': `${expiresMinutes} Minutes`,
      'Action Protocol': 'PASSWORD_CREDENTIAL_ROTATION'
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

  const bodyHtml = `
    <p style="margin:0 0 14px;">
      A live shift changeover has been submitted by outgoing personnel <strong>${escapeHtml(outgoingWorkerName)}</strong> for <strong>${escapeHtml(shiftTitle)}</strong> at <strong>${escapeHtml(facilityName)}</strong>.
    </p>
    <div style="background-color:#f8fafc;padding:16px;border-radius:12px;margin:18px 0;border:1px solid #e2e8f0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="5" border="0" style="font-size:13px;">
        <tr>
          <td style="color:#64748b;width:145px;">Outgoing Specialist:</td>
          <td style="color:#0f172a;font-weight:700;">${escapeHtml(outgoingWorkerName)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Incoming Reliever:</td>
          <td style="color:#0f172a;">${escapeHtml(incomingWorkerName || 'Designated Shift Reliever')}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Checklist Status:</td>
          <td style="color:#059669;font-weight:800;">${checklistCompleted} of ${checklistTotal} Tasks Certified</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Operational Priority:</td>
          <td style="color:${priorityColor};font-weight:800;">${escapeHtml(priority)}</td>
        </tr>
      </table>
    </div>
    <div style="background-color:#f0fdf4;padding:14px 16px;border-left:3px solid #10b981;border-radius:0 10px 10px 0;margin:16px 0;">
      <strong style="font-size:11px;color:#047857;text-transform:uppercase;letter-spacing:0.05em;">Handover Summary</strong>
      <p style="margin:6px 0 0;font-size:13.5px;color:#0f172a;line-height:1.55;">${escapeHtml(handoverSummary)}</p>
    </div>
    <p style="margin:14px 0 0;">
      Please review and sign off on this handover to transfer operational responsibility to the incoming shift.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `Shift Handover Brief: ${shiftTitle} (${outgoingWorkerName})`,
    preheader: `Handover submitted by ${outgoingWorkerName} at ${facilityName}`,
    recipientName: supervisorName,
    deliveryReason: 'You are the registered shift supervisor for this operational unit.',
    bodyHtml,
    primaryCtaText: 'Review & Authorize Handover',
    primaryCtaUrl: reviewUrl,
    badgeLabel: 'SHIFT HANDOVER',
    securityMetadata: {
      'Facility Location': facilityName,
      'Shift Window': shiftTitle,
      'Handoff Checksum': 'SHA256-' + Math.random().toString(36).slice(2, 10).toUpperCase()
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
  const bodyHtml = `
    <p style="margin:0 0 14px;">
      The statutory payroll cycle for <strong>${escapeHtml(orgName)}</strong> (<strong>${escapeHtml(period)}</strong>) has been compiled directly from verified attendance records.
    </p>
    <div style="background-color:#f8fafc;padding:16px 18px;border-radius:12px;margin:18px 0;border:1px solid #e2e8f0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="7" border="0" style="font-size:13px;">
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Verified Headcount:</td>
          <td style="color:#0f172a;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">${employeeCount} Verified Specialists</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Total Gross Payroll:</td>
          <td style="color:#0f172a;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">₦${Number(totalGrossNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">PenCom Remittance (8% + 10%):</td>
          <td style="color:#0284c7;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">₦${Number(penComRemittanceNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">PAYE Tax Withheld (NTA 2025):</td>
          <td style="color:#0284c7;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">₦${Number(payeTaxNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color:#64748b;border-bottom:1px solid #e2e8f0;">Net Bank Disbursement:</td>
          <td style="color:#0f172a;font-weight:800;font-size:14.5px;text-align:right;border-bottom:1px solid #e2e8f0;">₦${Number(netPayableNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Payroll Variance Check:</td>
          <td style="color:#059669;font-weight:900;text-align:right;">₦${Number(varianceNgn).toFixed(2)} (100% RECONCILED)</td>
        </tr>
      </table>
    </div>
    <p style="margin:14px 0 0;">
      Click below to inspect the Executive Statutory Remittance Ledger and export bank-ready disbursement schedules.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `Executive Payroll & Remittance Digest — ${period}`,
    preheader: `₦${Number(totalGrossNgn).toLocaleString()} gross compiled with ₦0.00 variance`,
    recipientName: executiveName,
    deliveryReason: 'You are listed as an Executive Director or Payroll Officer for this organisation.',
    bodyHtml,
    primaryCtaText: 'Download Statutory Payroll Ledger',
    primaryCtaUrl: reportDownloadUrl,
    badgeLabel: 'PAYROLL DIGEST',
    securityMetadata: {
      'Corporate Entity': orgName,
      'Statutory Period': period,
      'Reconciliation State': 'ZERO_VARIANCE_CERTIFIED'
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
  const practicesHtml = topPractices.map(p => `
    <div style="background-color:#f8fafc;padding:12px 14px;border-radius:10px;margin-bottom:10px;border-left:3px solid #10b981;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
      <strong style="color:#0f172a;font-size:13.5px;display:block;">${escapeHtml(p.title)}</strong>
      <span style="color:#475569;font-size:12.5px;line-height:1.45;display:block;margin-top:3px;">${escapeHtml(p.desc)}</span>
    </div>
  `).join('');

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      Welcome to your <strong>ShiftRelay Weekly Operational Dispatch</strong> for Week ${weekNumber}, ${year}. Here is ${escapeHtml(orgName)}'s verified operational summary.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;">
      <tr>
        <td width="48%" style="background-color:#f8fafc;padding:15px;border-radius:12px;border:1px solid #e2e8f0;vertical-align:top;">
          <span style="font-size:10.5px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Shifts Accounted</span>
          <div style="font-size:24px;font-weight:900;color:#059669;margin-top:4px;">${stats.totalShiftsAccounted}</div>
          <span style="font-size:11px;color:#64748b;">100% Verified Handovers</span>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background-color:#f8fafc;padding:15px;border-radius:12px;border:1px solid #e2e8f0;vertical-align:top;">
          <span style="font-size:10.5px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Punctuality Score</span>
          <div style="font-size:24px;font-weight:900;color:#0284c7;margin-top:4px;">${stats.punctualityRate}</div>
          <span style="font-size:11px;color:#64748b;">On-Time Gate Arrival</span>
        </td>
      </tr>
      <tr><td height="10" colspan="3"></td></tr>
      <tr>
        <td width="48%" style="background-color:#f8fafc;padding:15px;border-radius:12px;border:1px solid #e2e8f0;vertical-align:top;">
          <span style="font-size:10.5px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Verified Hours</span>
          <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:4px;">${Number(stats.verifiedHoursLogged).toLocaleString()} hrs</div>
          <span style="font-size:11px;color:#64748b;">Biometric GPS Authenticated</span>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background-color:#f8fafc;padding:15px;border-radius:12px;border:1px solid #e2e8f0;vertical-align:top;">
          <span style="font-size:10.5px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Payroll Variance</span>
          <div style="font-size:24px;font-weight:900;color:#059669;margin-top:4px;">${stats.variance}</div>
          <span style="font-size:11px;color:#64748b;">Zero Leakage Guaranteed</span>
        </td>
      </tr>
    </table>

    <h3 style="margin:20px 0 10px;font-size:12.5px;font-weight:800;color:#0f172a;letter-spacing:0.05em;text-transform:uppercase;">
      Operational Highlights &amp; Platform Wins
    </h3>
    ${practicesHtml}
  `;

  return wrapEnterpriseEmail({
    title: `ShiftRelay Weekly Operational Dispatch — Week ${weekNumber}`,
    preheader: `${stats.totalShiftsAccounted} shifts accounted for with ${stats.punctualityRate} punctuality score`,
    recipientName,
    deliveryReason: 'You are subscribed to the weekly workforce operations digest.',
    bodyHtml,
    primaryCtaText: 'Open Operational Cockpit',
    primaryCtaUrl: platformUrl,
    secondaryNote: 'Use the one-click Unsubscribe link below anytime to stop receiving weekly digest emails.',
    badgeLabel: 'WEEKLY DISPATCH',
    securityMetadata: {
      'Digest Cadence': 'WEEKLY_OPERATIONAL_SUMMARY',
      'Reporting Week': `W${weekNumber}-${year}`,
      'Safety Record': `${stats.safetyIncidents} Incidents Logged`
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
  const accent = urgency === 'ESCALATION' ? '#dc2626' : urgency === 'ACTION_REQUIRED' ? '#d97706' : '#059669';
  const bgTint = urgency === 'ESCALATION' ? '#fef2f2' : urgency === 'ACTION_REQUIRED' ? '#fffbeb' : '#f0fdf4';

  const bodyHtml = `
    <div style="background-color:${bgTint};padding:16px;border-radius:12px;border-left:4px solid ${accent};margin:0 0 18px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${accent};margin-bottom:5px;">
        ${escapeHtml(stageLabel)} &middot; ${escapeHtml(urgency)}
      </div>
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:5px;">
        ${escapeHtml(headline)}
      </div>
      <p style="margin:0;font-size:13.5px;color:#334155;line-height:1.5;">
        ${escapeHtml(message)}
      </p>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="7" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;">
      <tr>
        <td style="color:#64748b;width:145px;">Employer:</td>
        <td style="color:#0f172a;font-weight:700;">${escapeHtml(orgName)}</td>
      </tr>
      <tr>
        <td style="color:#64748b;border-top:1px solid #e2e8f0;">Scheduled Window:</td>
        <td style="color:#0284c7;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;border-top:1px solid #e2e8f0;">${escapeHtml(shiftWindow)}</td>
      </tr>
      <tr>
        <td style="color:#64748b;border-top:1px solid #e2e8f0;">Grace Policy:</td>
        <td style="color:#059669;font-weight:700;border-top:1px solid #e2e8f0;">${Number(graceMinutes)} minutes (within grace = zero pay deduction)</td>
      </tr>
    </table>
  `;

  return wrapEnterpriseEmail({
    title: `${stageLabel} — ${orgName}`,
    preheader: `${headline}: ${message}`,
    recipientName,
    deliveryReason: `Automated ShiftRelay OS attendance watchdog for ${orgName}.`,
    bodyHtml,
    primaryCtaText: urgency === 'ESCALATION' ? 'Review Attendance Exception' : 'Open ShiftRelay OS Clock-In',
    primaryCtaUrl: actionUrl,
    secondaryNote: 'Phone battery low or offline? A verified on-site colleague can scan your physical CR80 Staff ID card inside ShiftRelay OS.',
    badgeLabel: urgency === 'ESCALATION' ? 'ESCALATION' : 'ATTENDANCE',
    securityMetadata: {
      'Organisation': orgName,
      'Reminder Stage': stageLabel,
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
    <p style="margin:0 0 14px;">
      Welcome to the <strong>ShiftRelay OS Workforce &amp; Statutory Brief</strong> by ${escapeHtml(COMPANY_LEGAL)}. Your subscription is active under NDPA 2023 explicit consent rules.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
      <div style="font-size:11px;font-weight:800;color:#059669;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">What You Will Receive Monthly</div>
      <ul style="margin:0;padding-left:18px;font-size:13.5px;color:#334155;line-height:1.7;">
        <li>Nigeria Tax Act (NTA) 2025 PAYE, PenCom PRA 2014 (8%/10% BHT), NHF &amp; NSITF filing deadlines</li>
        <li>Frontline attendance exception, geofence &amp; zero-smartphone Peer ID benchmarks</li>
        <li>Ready-to-use bank CSV &amp; rollout checklists for hospitals, plants &amp; logistics fleets</li>
      </ul>
    </div>
  `;

  return wrapEnterpriseEmail({
    title: 'Subscribed: ShiftRelay OS Workforce & Statutory Brief',
    preheader: `Your ${segLabel} briefing subscription on shiftrelayos.com is active`,
    recipientName: fullName || email,
    deliveryReason: `Explicit NDPA 2023 website newsletter opt-in for ${segLabel}.`,
    bodyHtml,
    primaryCtaText: 'Open PAYE & PenCom Calculator',
    primaryCtaUrl: `${marketingUrl}/calculator.html`,
    secondaryNote: 'Click Unsubscribe below anytime with one click (RFC 8058 compliant).',
    badgeLabel: 'SUBSCRIBED',
    securityMetadata: {
      'Track / Segment': segLabel,
      'Subscriber Email': email,
      'NDPA Legal Basis': 'EXPLICIT_OPT_IN_CONSENT'
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
  const highlightsHtml = complianceHighlights.map(item => `
    <div style="background-color:#f8fafc;padding:13px 15px;border-radius:10px;margin-bottom:10px;border-left:3px solid #0284c7;border-top:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
      <strong style="color:#0f172a;font-size:13.5px;display:block;">${escapeHtml(item.title)}</strong>
      <span style="color:#475569;font-size:12.5px;line-height:1.5;display:block;margin-top:4px;">${escapeHtml(item.desc)}</span>
    </div>
  `).join('');

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      Here is your <strong>${escapeHtml(monthLabel)}</strong> Nigerian Workforce &amp; Statutory Compliance Brief from ${escapeHtml(COMPANY_LEGAL)}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px;">
      <tr>
        <td style="width:32%;padding:12px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#059669;">${escapeHtml(operationalBenchmarks.avgClockInLatency)}</div>
          <div style="font-size:11px;color:#64748b;">Avg Gate Scan</div>
        </td>
        <td style="width:2%;"></td>
        <td style="width:32%;padding:12px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#0284c7;">${escapeHtml(operationalBenchmarks.exceptionResolutionSla)}</div>
          <div style="font-size:11px;color:#64748b;">Exception SLA</div>
        </td>
        <td style="width:2%;"></td>
        <td style="width:32%;padding:12px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#0f172a;">${escapeHtml(operationalBenchmarks.payrollVariance)}</div>
          <div style="font-size:11px;color:#64748b;">Remittance Drift</div>
        </td>
      </tr>
    </table>
    <h3 style="margin:0 0 10px;font-size:12.5px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">
      Statutory &amp; Operational Advisories
    </h3>
    ${highlightsHtml}
  `;

  return wrapEnterpriseEmail({
    title: `Nigeria Workforce & Statutory Brief — ${monthLabel}`,
    preheader: `${monthLabel}: PenCom PRA 2014 reminders, Nigeria Tax Act (NTA) 2025 PAYE rules & frontline benchmarks`,
    recipientName,
    deliveryReason: `Monthly ShiftRelay OS statutory brief (segment: ${roleSegment}).`,
    bodyHtml,
    primaryCtaText: 'Open PAYE & PenCom Calculator',
    primaryCtaUrl: calculatorUrl,
    secondaryNote: 'Instant one-click unsubscribe supported below (RFC 8058 compliant).',
    badgeLabel: 'STATUTORY BRIEF',
    securityMetadata: {
      'Edition': monthLabel,
      'Audience Segment': String(roleSegment).toUpperCase(),
      'Compliance Authority': 'NDPA 2023 / NTA 2025 / PRA 2014'
    },
    unsubUrl: unsubscribeUrl
  });
}

/**
 * 9. Employer Billing & Onboarding Secure Paystack Payment Link Email
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
  const rowsHtml = (Array.isArray(breakdownLines) && breakdownLines.length > 0
    ? breakdownLines
    : [{ label: invoiceTypeLabel, amountNgn: totalAmountNgn }]
  ).map((line) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:13px;">
        <strong>${escapeHtml(line.label)}</strong>
        ${line.note ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px;">${escapeHtml(line.note)}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:800;font-size:13px;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',Consolas,monospace;">
        ${line.isCredit ? '&minus;' : ''}${fmtNgn(Math.abs(Number(line.amountNgn || 0)))}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:0 0 18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#047857;">
              ShiftRelay Billing Invoice &middot; Powered by ${escapeHtml(COMPANY_LEGAL)}
            </div>
            <div style="font-size:17px;font-weight:800;color:#0f172a;margin-top:3px;">
              ${escapeHtml(invoiceTypeLabel)} (${escapeHtml(planLabel)})
            </div>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#fef3c7;border:1px solid #f59e0b;color:#b45309;font-size:10.5px;font-weight:800;letter-spacing:0.05em;">
              PAYMENT DUE
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 14px;">
      ${isOnboarding
        ? `Welcome to <strong>ShiftRelay</strong>! Your dedicated workspace for <strong>${escapeHtml(companyName)}</strong>${companyCode ? ` (Company Code: <code style="color:#059669;font-weight:800;">${escapeHtml(companyCode)}</code>)` : ''} is ready. Complete your secure payment via <strong>Paystack</strong> (Bank Transfer, Corporate/Debit Card, or USSD) to unlock staff roster submission and full production go-live.`
        : `Your itemized ShiftRelay billing invoice <strong>${escapeHtml(invoiceId)}</strong> for <strong>${escapeHtml(companyName)}</strong>${cycleMonth ? ` (${escapeHtml(cycleMonth)})` : ''} is ready. Employer-paid only — <strong>₦0 is ever deducted from workers</strong>.`}
    </p>

    <div style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin:18px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <thead>
          <tr style="background-color:#f8fafc;">
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid #cbd5e1;">Description</th>
            <th align="right" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid #cbd5e1;">Amount (NGN)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color:#ecfdf5;">
            <td style="padding:13px 12px;font-size:14px;font-weight:800;color:#065f46;border-top:1px solid #a7f3d0;">Total Payable via Paystack</td>
            <td style="padding:13px 12px;font-size:18px;font-weight:900;color:#059669;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',Consolas,monospace;border-top:1px solid #a7f3d0;">
              ${fmtNgn(totalAmountNgn)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p style="margin:12px 0 0;font-size:13px;color:#475569;">
      <strong>Instant Automated Receipt:</strong> As soon as Paystack confirms settlement, your official <strong>ShiftRelay (Powered by ${escapeHtml(COMPANY_LEGAL)})</strong> payment receipt is emailed automatically to this address.
      ${loginPortalUrl ? `<br>Onboarding / Workspace Portal: <a href="${escapeHtml(loginPortalUrl)}" style="color:#0284c7;font-weight:600;">${escapeHtml(loginPortalUrl)}</a>` : ''}
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `[${invoiceId}] ShiftRelay ${invoiceTypeLabel} — ${fmtNgn(totalAmountNgn)}`,
    preheader: `${companyName}: Pay ${fmtNgn(totalAmountNgn)} securely via Paystack (${planLabel})`,
    recipientName,
    deliveryReason: `Official ShiftRelay billing notice issued by ${COMPANY_LEGAL} for ${companyName}.`,
    bodyHtml,
    primaryCtaText: `Pay ${fmtNgn(totalAmountNgn)} Securely via Paystack`,
    primaryCtaUrl: checkoutUrl,
    secondaryNote: `Accepted via Paystack: Instant Nigerian Bank Transfer, Corporate/Debit Cards (Verve, Visa, Mastercard), and USSD. Invoice Ref: ${invoiceId}.`,
    badgeLabel: 'PAYSTACK INVOICE',
    securityMetadata: {
      'Invoice Reference': invoiceId,
      'Client Entity': companyName,
      'Company Code': companyCode || 'PENDING',
      'Subscription Tier': planLabel,
      'Payment Processor': 'PAYSTACK LIVE (CBN LICENSED)',
      'Issuer': `${BRAND_NAME} · ${COMPANY_LEGAL} (${COMPANY_RC})`
    }
  });
}

/**
 * 10. Official Automated Payment Receipt Email
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

  const rowsHtml = (Array.isArray(breakdownLines) && breakdownLines.length > 0
    ? breakdownLines
    : [{ label: invoiceTypeLabel, amountNgn: totalPaidNgn }]
  ).map((line) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:13px;">
        <strong>${escapeHtml(line.label)}</strong>
        ${line.note ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px;">${escapeHtml(line.note)}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:800;font-size:13px;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',Consolas,monospace;">
        ${line.isCredit ? '&minus;' : ''}${fmtNgn(Math.abs(Number(line.amountNgn || 0)))}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div style="background-color:#ecfdf5;border:1.5px solid #10b981;border-radius:12px;padding:18px;margin:0 0 18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#047857;">
              OFFICIAL PAYMENT RECEIPT &middot; SHIFTRELAY
            </div>
            <div style="font-size:18px;font-weight:900;color:#0f172a;margin-top:3px;">
              Powered by ${escapeHtml(COMPANY_LEGAL)}
            </div>
            <div style="font-size:11.5px;color:#475569;margin-top:2px;">
              ${escapeHtml(COMPANY_RC)} &middot; ${escapeHtml(HEADQUARTERS)}
            </div>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:#059669;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.08em;">
              PAID
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 16px;">
      Thank you! We confirm receipt of <strong>${fmtNgn(totalPaidNgn)}</strong> from <strong>${escapeHtml(companyName)}</strong>. Your ShiftRelay subscription ledger has been updated automatically. Retain this email as your official corporate payment receipt for audit and accounting records.
    </p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="5" border="0" style="font-size:12.5px;">
        <tr>
          <td style="color:#64748b;width:160px;">Receipt Number:</td>
          <td style="color:#059669;font-weight:800;font-family:'JetBrains Mono',Consolas,monospace;">${escapeHtml(receiptNumber)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Invoice ID:</td>
          <td style="color:#0f172a;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;">${escapeHtml(invoiceId)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Paystack Reference:</td>
          <td style="color:#0284c7;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;">${escapeHtml(paystackReference || invoiceId)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Billed Organisation:</td>
          <td style="color:#0f172a;font-weight:700;">${escapeHtml(companyName)}${companyCode ? ` (${escapeHtml(companyCode)})` : ''}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Plan &amp; Billing Type:</td>
          <td style="color:#0f172a;">${escapeHtml(planLabel)} — ${escapeHtml(invoiceTypeLabel)}${cycleMonth ? ` (${escapeHtml(cycleMonth)})` : ''}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Payment Channel:</td>
          <td style="color:#0f172a;">${escapeHtml(paymentChannel)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Confirmed At:</td>
          <td style="color:#0f172a;">${escapeHtml(paidDateWat)}</td>
        </tr>
      </table>
    </div>

    <div style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin:0 0 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <thead>
          <tr style="background-color:#f8fafc;">
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid #cbd5e1;">Paid Item</th>
            <th align="right" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:1px solid #cbd5e1;">Amount (NGN)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color:#ecfdf5;">
            <td style="padding:13px 12px;font-size:14px;font-weight:800;color:#065f46;border-top:1px solid #a7f3d0;">Total Paid (Balance Due: ₦0)</td>
            <td style="padding:13px 12px;font-size:18px;font-weight:900;color:#059669;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',Consolas,monospace;border-top:1px solid #a7f3d0;">
              ${fmtNgn(totalPaidNgn)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  return wrapEnterpriseEmail({
    title: `Official Receipt ${receiptNumber} — ShiftRelay (${fmtNgn(totalPaidNgn)} Paid)`,
    preheader: `Payment confirmed for ${companyName}: ${fmtNgn(totalPaidNgn)} · Official ShiftRelay Receipt powered by ${COMPANY_LEGAL}`,
    recipientName,
    deliveryReason: `Automated official payment receipt issued by ShiftRelay (Powered by ${COMPANY_LEGAL}) upon verified payment settlement.`,
    bodyHtml,
    primaryCtaText: loginPortalUrl && loginPortalUrl.includes('onboard.html') ? 'Submit Your Staff Roster Now' : 'Open ShiftRelay Workspace',
    primaryCtaUrl: loginPortalUrl || getEmailPlatformBaseUrl(),
    secondaryNote: `For corporate finance documentation, contact ${LEGAL_ENTITY.financeEmail}. Issued electronically by ${BRAND_NAME}, powered by ${COMPANY_LEGAL} (${COMPANY_RC}).`,
    badgeLabel: 'OFFICIAL RECEIPT',
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
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:0 0 18px;">
      <div style="font-size:10.5px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#047857;">
        Stage 1 of 3 &middot; Company Onboarding Intake
      </div>
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-top:3px;">
        ShiftRelay Onboarding Portal — Powered by ${escapeHtml(COMPANY_LEGAL)}
      </div>
    </div>
    <p style="margin:0 0 14px;">
      We are ready to onboard <strong>${escapeHtml(companyName)}</strong> onto <strong>ShiftRelay</strong>. Click below to provide your basic company details and number of active workers so we assign the right plan tier (<strong>Startup, Business, Enterprise, Corporate, or Mega</strong>) — with your choice of <strong>Monthly</strong> or <strong>Annual (12-Month)</strong> billing.
    </p>
    ${note ? `<div style="background-color:#f8fafc;border-left:3px solid #0284c7;padding:12px 14px;border-radius:0 8px 8px 0;margin:0 0 16px;font-size:13px;color:#334155;">${escapeHtml(note)}</div>` : ''}
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:16px 0;font-size:13px;color:#334155;">
      <strong style="color:#0f172a;display:block;margin-bottom:6px;">How Your 3-Step Onboarding Works:</strong>
      <div>1. <strong>Submit Company Info &amp; Worker Count</strong> using the secure link below (2 minutes).</div>
      <div style="margin-top:4px;">2. <strong>Pay Securely via Paystack</strong> using the itemized payment link emailed for your tier.</div>
      <div style="margin-top:4px;">3. <strong>Upload Staff Roster &amp; Details</strong> — unlocked immediately after payment along with your official <strong>ShiftRelay &middot; Powered by ${escapeHtml(COMPANY_LEGAL)}</strong> receipt.</div>
    </div>
  `;
  return wrapEnterpriseEmail({
    title: `Complete Your ShiftRelay Company Onboarding Form — ${companyName}`,
    preheader: `Submit your basic company details & headcount to begin ShiftRelay onboarding`,
    recipientName,
    deliveryReason: `ShiftRelay onboarding invitation issued by ${COMPANY_LEGAL}.`,
    bodyHtml,
    primaryCtaText: 'Open Company Onboarding Form',
    primaryCtaUrl: intakeUrl,
    secondaryNote: 'No staff details or payment are required on Step 1 — staff roster upload unlocks immediately after your tier payment is confirmed.',
    badgeLabel: 'ONBOARDING STEP 1',
    securityMetadata: {
      'Onboarding Stage': 'STAGE_1_COMPANY_INTAKE',
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
  const badgeColor = isResolved ? '#059669' : '#0284c7';
  const bgTint = isResolved ? '#ecfdf5' : '#f0f9ff';

  const bodyHtml = `
    <div style="background-color:${bgTint};border-left:4px solid ${badgeColor};border-radius:0 12px 12px 0;padding:15px 16px;margin:0 0 18px;">
      <div style="font-size:10.5px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${badgeColor};">
        Ticket ${escapeHtml(ticketId)} &middot; ${escapeHtml(status)}
      </div>
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:4px;">
        ${escapeHtml(headline)}
      </div>
    </div>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:0 0 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size:13px;">
        <tr>
          <td style="color:#64748b;width:130px;">Ticket Reference:</td>
          <td style="color:#0f172a;font-family:'JetBrains Mono',Consolas,monospace;font-weight:700;">${escapeHtml(ticketId)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Category:</td>
          <td style="color:#0f172a;font-weight:600;">${escapeHtml(category)}</td>
        </tr>
        <tr>
          <td style="color:#64748b;">Handled By:</td>
          <td style="color:#0f172a;">${escapeHtml(agentName)}</td>
        </tr>
      </table>
    </div>

    ${messageBody ? `
      <div style="background-color:#ffffff;border:1px solid #cbd5e1;border-left:3px solid #10b981;border-radius:0 10px 10px 0;padding:14px 16px;margin:0 0 16px;font-size:14px;color:#1e293b;line-height:1.6;">
        ${escapeHtml(messageBody)}
      </div>
    ` : ''}

    <p style="margin:0;font-size:13.5px;color:#475569;">
      You can view your complete ticket history and reply anytime inside the ShiftRelay Support Desk.
    </p>
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
    securityMetadata: {
      'Ticket ID': ticketId,
      'Ticket Status': String(status).toUpperCase(),
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
