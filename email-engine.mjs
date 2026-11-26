/**
 * ShiftRelay Enterprise Email & Automated Newsletter Engine
 * High-Tech, Responsive, Bulletproof HTML Email Architecture
 * Compliant with NDPA 2023, Gmail, Apple Mail, Outlook (VML), and Mobile Clients.
 */

import { readFileSync } from 'node:fs';
import { LEGAL_ENTITY } from './legal-config.mjs';

const BRAND_NAME = LEGAL_ENTITY.brandName;
const COMPANY_LEGAL = LEGAL_ENTITY.companyLegalName;
const COMPANY_RC = LEGAL_ENTITY.rcNumber;
const HEADQUARTERS = LEGAL_ENTITY.headquarters;
const SUPPORT_EMAIL = LEGAL_ENTITY.supportEmail;

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

/**
 * Universal High-Tech Email Envelope Wrapper
 * Features:
 * - Branded Dark/Navy High-Tech Aesthetic (600px max width)
 * - Clear explanation of why the message arrived
 * - High-contrast bulletproof CTA button
 * - Unbroken fallback URL
 * - Enterprise Security Audit Card (IP, Timestamp WAT, Security Nonce)
 * - Anti-phishing advisory & statutory footer
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
  unsubUrl
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
        <td style="padding:4px 8px;font-size:11px;color:#94a3b8;font-family:'JetBrains Mono',monospace,sans-serif;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(k)}</td>
        <td style="padding:4px 8px;font-size:11.5px;color:#f1f5f9;font-family:'JetBrains Mono',monospace,sans-serif;font-weight:600;text-align:right;">${escapeHtml(String(v))}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
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
      .sr-container { width: 100% !important; padding: 16px !important; }
      .sr-btn { display: block !important; width: 100% !important; text-align: center !important; }
      .sr-meta-table td { font-size: 10.5px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050a14;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader text (hidden in body, visible in inbox snippet) -->
  <div style="display:none;font-size:1px;color:#050a14;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader || title)} · ShiftRelay Frontline OS
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#050a14;table-layout:fixed;">
    <tr>
      <td align="center" style="padding:24px 12px 48px;">
        <!-- Email Card Container -->
        <table role="presentation" class="sr-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#090f1d;border:1px solid #1e293b;border-radius:14px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #0b1528 0%, #050a14 100%);padding:28px 32px 24px;border-bottom:1px solid #1e293b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <div style="display:inline-block;vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width:36px;height:36px;background:linear-gradient(135deg, #00f5a0 0%, #00d287 100%);border-radius:8px;text-align:center;vertical-align:middle;box-shadow:0 4px 14px rgba(0,245,160,0.3);">
                            <span style="font-family:'Outfit',sans-serif;font-size:22px;font-weight:900;color:#03180f;line-height:36px;display:block;">⚡</span>
                          </td>
                          <td style="padding-left:12px;vertical-align:middle;">
                            <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;display:block;font-family:-apple-system,sans-serif;">ShiftRelay</span>
                            <span style="font-size:10.5px;color:#00f5a0;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;display:block;">Enterprise Frontline OS</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:4px 10px;background:rgba(0,245,160,0.1);border:1px solid rgba(0,245,160,0.3);border-radius:999px;font-size:10.5px;font-weight:700;color:#00f5a0;text-transform:uppercase;letter-spacing:0.04em;">
                      Verified Dispatch
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Reason Notice -->
          ${deliveryReason ? `
          <tr>
            <td style="background-color:#0d182b;padding:12px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:12px;color:#94a3b8;line-height:1.5;">
                    <strong style="color:#38bdf8;">Why you received this:</strong> ${escapeHtml(deliveryReason)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Main Content Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${recipientName ? `
                <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;">
                  Hello ${escapeHtml(recipientName)},
                </p>
              ` : ''}

              <div style="font-size:14.5px;line-height:1.65;color:#cbd5e1;">
                ${bodyHtml}
              </div>

              <!-- Primary Call To Action Button -->
              ${primaryCtaText && primaryCtaUrl ? `
                <div style="margin:32px 0 24px;text-align:center;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${primaryCtaUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="16%" stroke="f" fillcolor="#00f5a0">
                    <w:anchorlock/>
                    <center style="color:#03180f;font-family:sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(primaryCtaText)}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${primaryCtaUrl}" class="sr-btn" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg, #00f5a0 0%, #00d287 100%);color:#03180f;font-size:15px;font-weight:800;letter-spacing:-0.01em;text-decoration:none;border-radius:10px;box-shadow:0 8px 24px rgba(0,245,160,0.35);text-align:center;">
                    ${escapeHtml(primaryCtaText)} →
                  </a>
                  <!--<![endif]-->
                </div>

                <!-- Unbroken Raw Link for Security & Reliability -->
                <div style="background-color:#050a14;padding:14px;border-radius:8px;border:1px solid #1e293b;margin:20px 0;word-break:break-all;">
                  <p style="margin:0 0 6px;font-size:11.5px;color:#94a3b8;font-weight:600;">
                    Button not working? Copy and paste this exact link into your browser:
                  </p>
                  <a href="${primaryCtaUrl}" style="font-size:11.5px;color:#38bdf8;text-decoration:underline;font-family:'JetBrains Mono',monospace,sans-serif;">
                    ${primaryCtaUrl}
                  </a>
                </div>
              ` : ''}

              ${secondaryNote ? `
                <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                  ${secondaryNote}
                </p>
              ` : ''}

              <!-- Security Metadata Card -->
              <div style="margin-top:32px;background-color:#060c18;border:1px solid #1e293b;border-radius:10px;padding:16px;">
                <table role="presentation" class="sr-meta-table" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td colspan="2" style="padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:11px;font-weight:700;color:#00f5a0;letter-spacing:0.06em;text-transform:uppercase;">
                      🔒 Enterprise Security &amp; Audit Trace
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 8px 4px;font-size:11px;color:#94a3b8;font-family:'JetBrains Mono',monospace,sans-serif;text-transform:uppercase;">Dispatched At</td>
                    <td style="padding:8px 8px 4px;font-size:11.5px;color:#f1f5f9;font-family:'JetBrains Mono',monospace,sans-serif;font-weight:600;text-align:right;">${watTime}</td>
                  </tr>
                  ${metaRows}
                </table>
              </div>

              <!-- Anti-Phishing Security Advisory -->
              <div style="margin-top:20px;padding:12px 14px;background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;border-radius:0 6px 6px 0;">
                <p style="margin:0;font-size:11.5px;color:#fca5a5;line-height:1.5;">
                  <strong>Security Advisory:</strong> ShiftRelay personnel will <em>never</em> ask for your password, PIN, or BVN over email or telephone. If you did not initiate this action, please alert your shift supervisor or contact security immediately.
                </p>
              </div>

            </td>
          </tr>

          <!-- Corporate Legal Footer -->
          <tr>
            <td style="background-color:#050a14;padding:24px 32px;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#e2e8f0;">
                ${escapeHtml(BRAND_NAME)} by ${escapeHtml(COMPANY_LEGAL)} (${escapeHtml(COMPANY_RC)})
              </p>
              <p style="margin:0 0 12px;font-size:11px;color:#64748b;line-height:1.5;">
                ${escapeHtml(HEADQUARTERS)}<br>
                Licensed Frontline Operational System · Zero-Lending Boundary Enforced
              </p>
              <div style="font-size:11.5px;color:#94a3b8;">
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/terms.html" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Terms of Service</a> ·
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/privacy.html" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Privacy Policy</a> ·
                <a href="${escapeHtml(getEmailMarketingBaseUrl())}/trust.html" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Trust Center</a> ·
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Support Desk</a>
                ${unsubUrl ? `· <a href="${escapeHtml(unsubUrl)}" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Unsubscribe</a>` : ''}
              </div>
              <p style="margin:16px 0 0;font-size:10.5px;color:#475569;">
                &copy; ${currentYear} ${escapeHtml(BRAND_NAME)} by ${escapeHtml(COMPANY_LEGAL)}. All operational handovers encrypted with 256-bit SHA-2.
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
 */
export function renderAccountActivationEmail({
  recipientName,
  recipientEmail,
  orgName,
  orgCode,
  roleTitle,
  department,
  activationUrl,
  expiresHours = 48
}) {
  const bodyHtml = `
    <p style="margin:0 0 14px;">
      Welcome to your organization's verified operational portal. Executive leadership at <strong>${escapeHtml(orgName)}</strong> has provisioned your duty profile on ShiftRelay.
    </p>
    <div style="background-color:#0d182b;padding:16px;border-radius:10px;margin:20px 0;border:1px solid #1e293b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size:13px;">
        <tr>
          <td style="color:#94a3b8;width:130px;">Company Code:</td>
          <td style="color:#00f5a0;font-family:'JetBrains Mono',monospace,sans-serif;font-weight:700;">${escapeHtml(orgCode)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Assigned Role:</td>
          <td style="color:#ffffff;font-weight:600;">${escapeHtml(roleTitle)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Duty Department:</td>
          <td style="color:#ffffff;">${escapeHtml(department || 'Operations Core')}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Link Validity:</td>
          <td style="color:#fbbf24;font-weight:600;">${expiresHours} Hours</td>
        </tr>
      </table>
    </div>
    <p style="margin:14px 0 0;">
      Tap the button below to confirm your profile, establish your secure password, and unlock your live shift roster, scannable digital badge, and certified attendance tracker.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `Activate your ShiftRelay Profile — ${orgName}`,
    preheader: `Set your password and access your duty roster at ${orgName}`,
    recipientName,
    deliveryReason: `Your work profile was authorized by ${orgName} management.`,
    bodyHtml,
    primaryCtaText: 'Activate My Workplace Profile',
    primaryCtaUrl: activationUrl,
    secondaryNote: `If you were not expecting this invitation, no action is required; the activation link will expire in ${expiresHours} hours.`,
    securityMetadata: {
      'Provisioned Account': recipientEmail,
      'Organization Code': orgCode,
      'Role Classification': roleTitle,
      'Cryptographic Action': 'PROFILE_ACTIVATION'
    }
  });
}

/**
 * 2. Security Password Reset & Magic Access Link Email
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
      A password reset or single-use verification access was requested for your ShiftRelay account (<strong>${escapeHtml(recipientEmail)}</strong>).
    </p>
    <p style="margin:0 0 14px;">
      For your operational protection, this security link is strictly limited to <strong>${expiresMinutes} minutes</strong> and can only be used once.
    </p>
    <p style="margin:0 0 14px;">
      Click the button below to securely set your new password and regain access to your shift handover logs and earnings.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: 'ShiftRelay Security: Reset Your Account Password',
    preheader: 'Secure link to reset your ShiftRelay password',
    recipientName,
    deliveryReason: 'A password reset was requested from the ShiftRelay mobile/web portal.',
    bodyHtml,
    primaryCtaText: 'Reset ShiftRelay Password',
    primaryCtaUrl: resetUrl,
    secondaryNote: 'If you did not make this request, please disregard this email. Your current password remains fully encrypted and active.',
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
  const priorityColor = priority === 'CRITICAL' ? '#ef4444' : priority === 'HIGH' ? '#f59e0b' : '#10b981';

  const bodyHtml = `
    <p style="margin:0 0 14px;">
      A live shift changeover has been submitted by outgoing personnel <strong>${escapeHtml(outgoingWorkerName)}</strong> for the <strong>${escapeHtml(shiftTitle)}</strong> at <strong>${escapeHtml(facilityName)}</strong>.
    </p>
    <div style="background-color:#0d182b;padding:16px;border-radius:10px;margin:20px 0;border:1px solid #1e293b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size:13px;">
        <tr>
          <td style="color:#94a3b8;width:140px;">Outgoing Specialist:</td>
          <td style="color:#ffffff;font-weight:600;">${escapeHtml(outgoingWorkerName)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Incoming Reliever:</td>
          <td style="color:#ffffff;">${escapeHtml(incomingWorkerName || 'Designated Shift Reliever')}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Checklist Status:</td>
          <td style="color:#00f5a0;font-weight:700;">${checklistCompleted} of ${checklistTotal} Tasks Certified</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Operational Priority:</td>
          <td style="color:${priorityColor};font-weight:700;">${escapeHtml(priority)}</td>
        </tr>
      </table>
    </div>
    <div style="background-color:#050a14;padding:14px;border-left:3px solid #00f5a0;border-radius:0 8px 8px 0;margin:16px 0;">
      <strong style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">Handover Summary:</strong>
      <p style="margin:6px 0 0;font-size:13.5px;color:#e2e8f0;line-height:1.5;">${escapeHtml(handoverSummary)}</p>
    </div>
    <p style="margin:14px 0 0;">
      Please review and sign off on this handover to transfer the operational baton to the incoming shift.
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
      The statutory payroll cycle for <strong>${escapeHtml(orgName)}</strong> (${escapeHtml(period)}) has been compiled directly from certified gate muster records.
    </p>
    <div style="background-color:#0d182b;padding:18px;border-radius:10px;margin:20px 0;border:1px solid #1e293b;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="font-size:13px;">
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="color:#94a3b8;">Verified Headcount:</td>
          <td style="color:#ffffff;font-weight:700;text-align:right;">${employeeCount} Verified Specialists</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="color:#94a3b8;">Total Gross Payroll:</td>
          <td style="color:#ffffff;font-weight:700;text-align:right;">₦${Number(totalGrossNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="color:#94a3b8;">PenCom Remittance (8% + 10%):</td>
          <td style="color:#38bdf8;font-weight:700;text-align:right;">₦${Number(penComRemittanceNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="color:#94a3b8;">PAYE Tax Withheld (Finance Act):</td>
          <td style="color:#38bdf8;font-weight:700;text-align:right;">₦${Number(payeTaxNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="color:#94a3b8;">Net Commercial Bank Disbursement:</td>
          <td style="color:#ffffff;font-weight:800;font-size:14px;text-align:right;">₦${Number(netPayableNgn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Payroll Variance Check:</td>
          <td style="color:#00f5a0;font-weight:900;text-align:right;">₦${Number(varianceNgn).toFixed(2)} (100% RECONCILED)</td>
        </tr>
      </table>
    </div>
    <p style="margin:14px 0 0;">
      Click below to open the complete Executive Statutory Remittance Ledger and export bank-ready NIBSS disbursement schedules.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `Executive Payroll & Remittance Digest — ${period}`,
    preheader: `₦${Number(totalGrossNgn).toLocaleString()} gross compiled with ₦0.00 variance`,
    recipientName: executiveName,
    deliveryReason: 'You are listed as an Executive Director or Payroll Officer for this organization.',
    bodyHtml,
    primaryCtaText: 'Download Statutory Payroll Ledger',
    primaryCtaUrl: reportDownloadUrl,
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
    { title: 'Sub-Second Muster Scans', desc: 'Average gate check-in dropped to 0.4 seconds across all terminal lanes.' },
    { title: 'Zero Overtime Disputes', desc: 'Supervisor real-time shift authorization prevented 100% of retroactive claim delays.' },
    { title: 'Digital ID Modernization', desc: 'Workers can now present ISO 18004 2D QR and Code-128 barcodes directly from their profiles.' }
  ],
  platformUrl = getEmailPlatformBaseUrl(),
  unsubUrl = `${getEmailMarketingBaseUrl()}/unsubscribe`
}) {
  const practicesHtml = topPractices.map(p => `
    <div style="background-color:#0d182b;padding:14px;border-radius:8px;margin-bottom:10px;border-left:3px solid #00f5a0;">
      <strong style="color:#ffffff;font-size:13.5px;display:block;">${escapeHtml(p.title)}</strong>
      <span style="color:#94a3b8;font-size:12.5px;line-height:1.4;display:block;margin-top:2px;">${escapeHtml(p.desc)}</span>
    </div>
  `).join('');

  const bodyHtml = `
    <p style="margin:0 0 14px;">
      Welcome to your <strong>ShiftRelay Weekly Operational Dispatch</strong> for Week ${weekNumber}, ${year}. Here is your organization's verified operational progress report.
    </p>

    <!-- Key Metrics Grid -->
    <div style="margin:24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="48%" style="background-color:#0d182b;padding:16px;border-radius:10px;border:1px solid #1e293b;vertical-align:top;">
            <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Shifts Accounted</span>
            <div style="font-size:26px;font-weight:900;color:#00f5a0;margin-top:4px;">${stats.totalShiftsAccounted}</div>
            <span style="font-size:11px;color:#64748b;">100% Verified Handovers</span>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background-color:#0d182b;padding:16px;border-radius:10px;border:1px solid #1e293b;vertical-align:top;">
            <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Punctuality Score</span>
            <div style="font-size:26px;font-weight:900;color:#38bdf8;margin-top:4px;">${stats.punctualityRate}</div>
            <span style="font-size:11px;color:#64748b;">On-Time Gate Arrival</span>
          </td>
        </tr>
        <tr><td height="12" colspan="3"></td></tr>
        <tr>
          <td width="48%" style="background-color:#0d182b;padding:16px;border-radius:10px;border:1px solid #1e293b;vertical-align:top;">
            <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Verified Hours</span>
            <div style="font-size:26px;font-weight:900;color:#f8fafc;margin-top:4px;">${Number(stats.verifiedHoursLogged).toLocaleString()} hrs</div>
            <span style="font-size:11px;color:#64748b;">Biometric GPS Authenticated</span>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background-color:#0d182b;padding:16px;border-radius:10px;border:1px solid #1e293b;vertical-align:top;">
            <span style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Payroll Variance</span>
            <div style="font-size:26px;font-weight:900;color:#00f5a0;margin-top:4px;">${stats.variance}</div>
            <span style="font-size:11px;color:#64748b;">Zero Leakage Guaranteed</span>
          </td>
        </tr>
      </table>
    </div>

    <h3 style="margin:24px 0 12px;font-size:14px;color:#f1f5f9;letter-spacing:-0.01em;text-transform:uppercase;">
      ✨ Operational Highlights &amp; Platform Wins
    </h3>
    ${practicesHtml}

    <p style="margin:20px 0 0;font-size:13.5px;color:#cbd5e1;">
      Log in to your workspace cockpit to review upcoming shift allocations, manage timecards, and inspect live floor activity.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `ShiftRelay Weekly Operational Dispatch — Week ${weekNumber}`,
    preheader: `${stats.totalShiftsAccounted} shifts accounted for with ${stats.punctualityRate} punctuality score`,
    recipientName,
    deliveryReason: 'You are subscribed to the weekly workforce operations digest.',
    bodyHtml,
    primaryCtaText: 'Open Operational Cockpit',
    primaryCtaUrl: platformUrl,
    secondaryNote: 'Want to stop receiving weekly digest emails? Use the instant one-click Unsubscribe link below (no login required).',
    securityMetadata: {
      'Digest Cadence': 'WEEKLY_OPERATIONAL_SUMMARY',
      'Reporting Week': `W${weekNumber}-${year}`,
      'Safety Record': `${stats.safetyIncidents} Incidents Logged`
    },
    unsubUrl
  });
}

/**
 * 6. Automated Attendance Reminder & Missed Clock-In Escalation Email (Dayforce Grade)
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
  const badgeColor = urgency === 'ESCALATION' ? '#ef4444' : urgency === 'ACTION_REQUIRED' ? '#f59e0b' : '#00f5a0';
  const bodyHtml = `
    <div style="background-color:#0d182b;padding:16px;border-radius:10px;border-left:4px solid ${badgeColor};margin:0 0 18px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${badgeColor};margin-bottom:6px;">
        ${escapeHtml(stageLabel)} · ${escapeHtml(urgency)}
      </div>
      <div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:6px;">
        ${escapeHtml(headline)}
      </div>
      <p style="margin:0;font-size:13.5px;color:#cbd5e1;line-height:1.5;">
        ${escapeHtml(message)}
      </p>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0" style="background-color:#060c18;border:1px solid #1e293b;border-radius:8px;font-size:13px;">
      <tr>
        <td style="color:#94a3b8;width:140px;">Employer:</td>
        <td style="color:#ffffff;font-weight:600;">${escapeHtml(orgName)}</td>
      </tr>
      <tr>
        <td style="color:#94a3b8;">Scheduled Window:</td>
        <td style="color:#38bdf8;font-family:'JetBrains Mono',monospace,sans-serif;font-weight:700;">${escapeHtml(shiftWindow)}</td>
      </tr>
      <tr>
        <td style="color:#94a3b8;">Grace Policy:</td>
        <td style="color:#00f5a0;font-weight:600;">${Number(graceMinutes)} minutes (within grace = zero pay deduction)</td>
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
    secondaryNote: 'Phone dead or offline? A verified on-site colleague can scan your physical Staff ID card inside ShiftRelay OS.',
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
    <p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;">
      Welcome to the <strong>ShiftRelay OS Workforce &amp; Statutory Brief</strong> by ${escapeHtml(COMPANY_LEGAL)}.
      Your subscription is active under NDPA 2023 explicit consent rules.
    </p>
    <div style="background-color:#0d182b;border:1px solid #1e293b;border-radius:10px;padding:16px;margin:18px 0;">
      <div style="font-size:11px;font-weight:800;color:#00f5a0;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">What You Will Receive Monthly</div>
      <ul style="margin:0;padding-left:18px;font-size:13.5px;color:#cbd5e1;line-height:1.7;">
        <li>Nigeria Tax Act (NTA) 2025 PAYE, PenCom PRA 2014 (8%/10% BHT), NHF &amp; NSITF filing deadlines</li>
        <li>Frontline attendance exception, geofence &amp; zero-smart-phone Peer ID benchmarks</li>
        <li>Ready-to-use bank CSV &amp; rollout checklist templates for hospitals, plants &amp; logistics fleets</li>
      </ul>
    </div>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      You can immediately run sample salary &amp; PenCom calculations using our free Nigerian Statutory Payroll Calculator.
    </p>
  `;

  return wrapEnterpriseEmail({
    title: 'Subscribed: ShiftRelay OS Workforce & Statutory Brief',
    preheader: `Your ${segLabel} briefing subscription on shiftrelayos.com is active`,
    recipientName: fullName || email,
    deliveryReason: `Explicit NDPA 2023 website newsletter opt-in for ${segLabel}.`,
    bodyHtml,
    primaryCtaText: 'Open PAYE & PenCom Calculator',
    primaryCtaUrl: `${marketingUrl}/calculator.html`,
    secondaryNote: 'Subscribed by mistake or prefer not to receive monthly compliance briefs? Click Unsubscribe below with one click.',
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
      desc: 'Pair configurable Dayforce-style late grace windows with automatic shift-start reminders and single-source supervisor pardon controls before bank CSV disbursement.'
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
    <div style="background-color:#0d182b;padding:14px;border-radius:8px;margin-bottom:10px;border-left:3px solid #38bdf8;">
      <strong style="color:#ffffff;font-size:13.5px;display:block;">${escapeHtml(item.title)}</strong>
      <span style="color:#94a3b8;font-size:12.5px;line-height:1.5;display:block;margin-top:4px;">${escapeHtml(item.desc)}</span>
    </div>
  `).join('');

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:15px;color:#cbd5e1;">
      Here is your <strong>${escapeHtml(monthLabel)}</strong> Nigerian Workforce &amp; Statutory Compliance Brief from ${escapeHtml(COMPANY_LEGAL)}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
      <tr>
        <td style="width:33%;padding:12px;background-color:#0d182b;border:1px solid #1e293b;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#00f5a0;">${escapeHtml(operationalBenchmarks.avgClockInLatency)}</div>
          <div style="font-size:11px;color:#94a3b8;">Avg Gate Scan</div>
        </td>
        <td style="width:8px;"></td>
        <td style="width:33%;padding:12px;background-color:#0d182b;border:1px solid #1e293b;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#38bdf8;">${escapeHtml(operationalBenchmarks.exceptionResolutionSla)}</div>
          <div style="font-size:11px;color:#94a3b8;">Exception SLA</div>
        </td>
        <td style="width:8px;"></td>
        <td style="width:33%;padding:12px;background-color:#0d182b;border:1px solid #1e293b;border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#ffffff;">${escapeHtml(operationalBenchmarks.payrollVariance)}</div>
          <div style="font-size:11px;color:#94a3b8;">Remittance Drift</div>
        </td>
      </tr>
    </table>
    <h3 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:0.06em;">
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
      <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.06);color:#cbd5e1;font-size:13px;">
        ${escapeHtml(line.label)}
        ${line.note ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${escapeHtml(line.note)}</div>` : ''}
      </td>
      <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.06);color:#ffffff;font-weight:700;font-size:13px;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',monospace,sans-serif;">
        ${line.isCredit ? '&minus;' : ''}${fmtNgn(Math.abs(Number(line.amountNgn || 0)))}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div style="background:linear-gradient(135deg, rgba(0,245,160,0.09) 0%, rgba(56,189,248,0.06) 100%);border:1px solid rgba(0,245,160,0.28);border-radius:12px;padding:16px 18px;margin:0 0 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#00f5a0;">
              ShiftRelay Billing Invoice · Powered by ${escapeHtml(COMPANY_LEGAL)}
            </div>
            <div style="font-size:17px;font-weight:800;color:#ffffff;margin-top:4px;">
              ${escapeHtml(invoiceTypeLabel)} (${escapeHtml(planLabel)} Plan)
            </div>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(245,158,11,0.16);border:1px solid rgba(245,158,11,0.4);color:#fbbf24;font-size:10.5px;font-weight:800;letter-spacing:0.06em;">
              PAYMENT DUE
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 14px;">
      ${isOnboarding
        ? `Welcome to <strong>ShiftRelay</strong>! Your dedicated workspace for <strong>${escapeHtml(companyName)}</strong>${companyCode ? ` (Company Code: <code style="color:#00f5a0;font-weight:700;">${escapeHtml(companyCode)}</code>)` : ''} is provisioned. Complete your secure payment below via <strong>Paystack</strong> (Bank Transfer, Debit/Corporate Card, or USSD) to activate full production deployment.`
        : `Your itemized ShiftRelay billing invoice <strong>${escapeHtml(invoiceId)}</strong> for <strong>${escapeHtml(companyName)}</strong>${cycleMonth ? ` (${escapeHtml(cycleMonth)})` : ''} is ready. Employer-paid only — <strong>₦0 is ever deducted from workers</strong>.`}
    </p>

    <div style="background-color:#0d182b;border:1px solid #1e293b;border-radius:12px;overflow:hidden;margin:18px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <thead>
          <tr style="background-color:#060c18;">
            <th align="left" style="padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Description</th>
            <th align="right" style="padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Amount (NGN)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color:#060c18;">
            <td style="padding:12px 10px;font-size:14px;font-weight:800;color:#ffffff;">Total Payable</td>
            <td style="padding:12px 10px;font-size:18px;font-weight:900;color:#00f5a0;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',monospace,sans-serif;">
              ${fmtNgn(totalAmountNgn)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">
      <strong>Instant Automated Receipt:</strong> As soon as Paystack confirms your payment, your tenant subscription updates automatically and an official <strong>ShiftRelay (Powered by ${escapeHtml(COMPANY_LEGAL)})</strong> payment receipt is emailed straight to this address.
      ${loginPortalUrl ? `<br>Workspace Portal: <a href="${escapeHtml(loginPortalUrl)}" style="color:#38bdf8;">${escapeHtml(loginPortalUrl)}</a>` : ''}
    </p>
  `;

  return wrapEnterpriseEmail({
    title: `[${invoiceId}] ShiftRelay ${invoiceTypeLabel} — ${fmtNgn(totalAmountNgn)}`,
    preheader: `${companyName}: Pay ${fmtNgn(totalAmountNgn)} securely via Paystack (${planLabel} Tier)`,
    recipientName,
    deliveryReason: `Official ShiftRelay billing notice issued by ${COMPANY_LEGAL} for ${companyName}.`,
    bodyHtml,
    primaryCtaText: `Pay ${fmtNgn(totalAmountNgn)} Securely via Paystack`,
    primaryCtaUrl: checkoutUrl,
    secondaryNote: `Accepted via Paystack: Nigerian Bank Transfer (instant NIP), Corporate/Debit Cards (Verve, Visa, Mastercard), and USSD. Reference: ${invoiceId}.`,
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
 * 10. Official Automated Payment Receipt Email (Triggered on Paystack Webhook / Payment Confirmation)
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
      <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.06);color:#cbd5e1;font-size:13px;">
        ${escapeHtml(line.label)}
        ${line.note ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${escapeHtml(line.note)}</div>` : ''}
      </td>
      <td style="padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.06);color:#ffffff;font-weight:700;font-size:13px;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',monospace,sans-serif;">
        ${line.isCredit ? '&minus;' : ''}${fmtNgn(Math.abs(Number(line.amountNgn || 0)))}
      </td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div style="background:linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(5,150,105,0.08) 100%);border:1px solid rgba(16,185,129,0.45);border-radius:12px;padding:18px;margin:0 0 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#34d399;">
              OFFICIAL PAYMENT RECEIPT · SHIFTRELAY
            </div>
            <div style="font-size:18px;font-weight:900;color:#ffffff;margin-top:4px;">
              Powered by ${escapeHtml(COMPANY_LEGAL)}
            </div>
            <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;">
              ${escapeHtml(COMPANY_RC)} · ${escapeHtml(HEADQUARTERS)}
            </div>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#10b981;color:#03180f;font-size:11px;font-weight:900;letter-spacing:0.08em;">
              PAID ✓
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 16px;">
      Thank you! We confirm receipt of <strong>${fmtNgn(totalPaidNgn)}</strong> from <strong>${escapeHtml(companyName)}</strong>. Your ShiftRelay subscription ledger has been updated automatically. Please retain this email as your official corporate payment receipt for audit and accounting records.
    </p>

    <div style="background-color:#060c18;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin:0 0 18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size:12.5px;">
        <tr>
          <td style="color:#94a3b8;width:165px;">Receipt Number:</td>
          <td style="color:#00f5a0;font-weight:800;font-family:'JetBrains Mono',monospace,sans-serif;">${escapeHtml(receiptNumber)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Invoice ID:</td>
          <td style="color:#ffffff;font-family:'JetBrains Mono',monospace,sans-serif;">${escapeHtml(invoiceId)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Paystack Reference:</td>
          <td style="color:#38bdf8;font-family:'JetBrains Mono',monospace,sans-serif;">${escapeHtml(paystackReference || invoiceId)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Billed Organisation:</td>
          <td style="color:#ffffff;font-weight:700;">${escapeHtml(companyName)}${companyCode ? ` (${escapeHtml(companyCode)})` : ''}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Plan &amp; Billing Type:</td>
          <td style="color:#ffffff;">${escapeHtml(planLabel)} — ${escapeHtml(invoiceTypeLabel)}${cycleMonth ? ` (${escapeHtml(cycleMonth)})` : ''}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Payment Channel:</td>
          <td style="color:#ffffff;">${escapeHtml(paymentChannel)}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;">Payment Confirmed:</td>
          <td style="color:#ffffff;">${escapeHtml(paidDateWat)}</td>
        </tr>
      </table>
    </div>

    <div style="background-color:#0d182b;border:1px solid #1e293b;border-radius:12px;overflow:hidden;margin:0 0 18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <thead>
          <tr style="background-color:#060c18;">
            <th align="left" style="padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Paid Item</th>
            <th align="right" style="padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;">Amount (NGN)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="background-color:#060c18;">
            <td style="padding:12px 10px;font-size:14px;font-weight:800;color:#ffffff;">Total Paid (Balance Due: ₦0)</td>
            <td style="padding:12px 10px;font-size:18px;font-weight:900;color:#34d399;text-align:right;white-space:nowrap;font-family:'JetBrains Mono',monospace,sans-serif;">
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
    primaryCtaText: loginPortalUrl ? 'Open ShiftRelay Workspace' : 'Visit ShiftRelay Platform',
    primaryCtaUrl: loginPortalUrl || getEmailPlatformBaseUrl(),
    secondaryNote: `For billing inquiries or corporate finance documentation, reply or email ${LEGAL_ENTITY.financeEmail}. Issued electronically by ${BRAND_NAME}, powered by ${COMPANY_LEGAL} (${COMPANY_RC}).`,
    securityMetadata: {
      'Receipt Number': receiptNumber,
      'Paystack Reference': paystackReference || invoiceId,
      'Settlement Status': 'PAID_AND_RECONCILED',
      'Issuer': `ShiftRelay · Powered by ${COMPANY_LEGAL} (${COMPANY_RC})`
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
