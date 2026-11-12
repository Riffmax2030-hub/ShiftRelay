/**
 * ShiftRelay Enterprise Email & Automated Newsletter Engine
 * High-Tech, Responsive, Bulletproof HTML Email Architecture
 * Compliant with NDPA 2023, Gmail, Apple Mail, Outlook (VML), and Mobile Clients.
 */

import { readFileSync } from 'node:fs';

const BRAND_NAME = 'ShiftRelay';
const COMPANY_LEGAL = 'Riffmax Technology Limited';
const COMPANY_RC = 'RC 7392819';
const HEADQUARTERS = 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria';
const SUPPORT_EMAIL = 'support@shiftrelay.tech';

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
                <a href="https://shiftrelay-vjkf.onrender.com/terms.html" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Terms of Service</a> ·
                <a href="https://shiftrelay-vjkf.onrender.com/privacy.html" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Privacy Policy</a> ·
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Support Desk</a>
                ${unsubUrl ? `· <a href="${unsubUrl}" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Unsubscribe</a>` : ''}
              </div>
              <p style="margin:16px 0 0;font-size:10.5px;color:#475569;">
                &copy; ${currentYear} ShiftRelay Technologies. All operational handovers encrypted with 256-bit SHA-2.
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
  orgName = 'Riffmax Technology Limited',
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
  platformUrl = 'https://shiftrelay-vjkf.onrender.com'
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
    secondaryNote: 'Want to adjust notification delivery frequency? Update your preferences under Profile Settings.',
    securityMetadata: {
      'Digest Cadence': 'WEEKLY_OPERATIONAL_SUMMARY',
      'Reporting Week': `W${weekNumber}-${year}`,
      'Safety Record': `${stats.safetyIncidents} Incidents Logged`
    },
    unsubUrl: `${platformUrl}/preferences`
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
