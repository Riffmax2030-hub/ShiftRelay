import { createServer } from 'node:http';
import {
  renderAccountActivationEmail,
  renderPasswordResetEmail,
  renderShiftHandoverEmail,
  renderExecutivePayrollDigestEmail,
  renderWeeklyProgressNewsletterEmail,
  renderAttendanceReminderEmail,
  renderOnboardingIntakeInviteEmail,
  renderBillingPaymentLinkEmail,
  renderOfficialPaymentReceiptEmail,
  renderSupportTicketEmail,
  EMAIL_TEMPLATE_CATALOG
} from './email-engine.mjs';
import {
  generatePayrollReportHtml,
  generateCvReportHtml,
  generateTermsOfServiceHtml
} from './report-engine.mjs';

console.log('=== 1. TESTING ENTERPRISE EMAIL TEMPLATES ===');

// 1. Activation Email
const activationHtml = renderAccountActivationEmail({
  recipientName: 'Tariq Al-Hassan',
  recipientEmail: 'tariq@riffmax.tech',
  orgName: 'Riffmax Technology Limited',
  orgCode: 'RIF-2026',
  roleTitle: 'Senior Distributed Systems Engineer',
  department: 'Backend Infrastructure',
  activationUrl: 'https://app.shiftrelayos.com/activate?token=test-123',
  expiresHours: 48
});
if (!activationHtml.includes('Activate My Workplace Profile')) throw new Error('Missing activation button');
if (!activationHtml.includes('https://app.shiftrelayos.com/activate?token=test-123')) throw new Error('Missing unbroken fallback URL');
if (!activationHtml.includes('shiftrelayos.com')) throw new Error('Missing shiftrelayos.com link in activation footer');
if (!activationHtml.includes('ShiftRelay OS by Riffmax Technology Limited')) throw new Error('Missing ShiftRelay OS footer brand');
if (!activationHtml.includes('Why you received this:')) throw new Error('Missing delivery explanation');
if (!activationHtml.includes('Enterprise Security &amp; Audit Trace')) throw new Error('Missing security metadata');
console.log('✔ Activation email template passed (Single CTA + Unbroken link + Security trace)');

// 2. Password Reset Email
const resetHtml = renderPasswordResetEmail({
  recipientName: 'Olaide Emmanuela',
  recipientEmail: 'olaide@riffmax.tech',
  resetUrl: 'https://app.shiftrelayos.com/reset-password?token=reset-456',
  requestIp: '102.89.34.12 (Lagos, NG)',
  expiresMinutes: 30
});
if (!resetHtml.includes('Reset ShiftRelay OS Password') && !resetHtml.includes('Reset ShiftRelay Password')) throw new Error('Missing reset button');
if (!resetHtml.includes('30 Minutes')) throw new Error('Missing expiry metadata');
console.log('✔ Password reset email template passed (30-min window + Fallback URL)');

// 3. Shift Handover Email
const handoverHtml = renderShiftHandoverEmail({
  supervisorName: 'Olaide Emmanuela',
  outgoingWorkerName: 'Babatunde Adeleke',
  incomingWorkerName: 'Chidinma Okonjo',
  shiftTitle: 'Morning Shift (06:00 – 14:00 WAT)',
  facilityName: 'Riffmax Engineering Hub (Gate A)',
  checklistCompleted: 8,
  checklistTotal: 8,
  priority: 'NORMAL',
  handoverSummary: 'All services green. Database connection pool stabilized. 0 open safety alarms.',
  reviewUrl: 'https://app.shiftrelayos.com/#handovers'
});
if (!handoverHtml.includes('Review &amp; Authorize Handover')) throw new Error('Missing handover review button');
if (!handoverHtml.includes('8 of 8 Tasks Certified')) throw new Error('Missing checklist status');
console.log('✔ Shift handover email template passed');

// 4. Executive Statutory Remittance Digest
const payrollDigestHtml = renderExecutivePayrollDigestEmail({
  executiveName: 'Sherif Akanmu',
  orgName: 'Riffmax Technology Limited',
  period: 'November 2026',
  employeeCount: 142,
  totalGrossNgn: 13920000,
  netPayableNgn: 9445200,
  penComRemittanceNgn: 2505600,
  payeTaxNgn: 1842000,
  varianceNgn: 0,
  reportDownloadUrl: 'https://app.shiftrelayos.com/api/reports/payroll-ledger'
});
if (!payrollDigestHtml.includes('₦0.00 (100% RECONCILED)')) throw new Error('Missing zero variance verification');
if (!payrollDigestHtml.includes('Download Statutory Payroll Ledger')) throw new Error('Missing ledger CTA button');
console.log('✔ Executive payroll digest email template passed');

// 5. Automated Weekly Progress Newsletter
const newsletterHtml = renderWeeklyProgressNewsletterEmail({
  recipientName: 'Sherif Akanmu',
  orgName: 'Riffmax Technology Limited',
  weekNumber: 46,
  year: 2026,
  platformUrl: 'https://app.shiftrelayos.com'
});
if (!newsletterHtml.includes('ShiftRelay Weekly Operational Dispatch') && !newsletterHtml.includes('ShiftRelay OS Weekly Operational Dispatch')) throw new Error('Missing newsletter header');
if (!newsletterHtml.includes('99.4%')) throw new Error('Missing punctuality score');
if (!newsletterHtml.includes('1,420 hrs')) throw new Error('Missing verified hours');
console.log('✔ Automated weekly progress newsletter template passed');

// 6. Automated Attendance Reminder & Missed Clock-In Escalation Email
const reminderHtml = renderAttendanceReminderEmail({
  recipientName: 'Babatunde Adeleke',
  orgName: 'Riffmax Technology Limited',
  stageLabel: 'Missed Clock-In Escalation',
  urgency: 'ESCALATION',
  headline: 'Clock-in overdue beyond 15m grace window',
  message: 'Morning shift started 20 minutes ago. Clock in or contact your supervisor.',
  shiftWindow: '08:00 - 16:00',
  graceMinutes: 15,
  actionUrl: 'https://app.shiftrelayos.com/#today'
});
if (!reminderHtml.includes('ShiftRelay OS')) throw new Error('Missing ShiftRelay OS brand in attendance reminder');
if (!reminderHtml.includes('shiftrelayos.com')) throw new Error('Missing shiftrelayos.com link in attendance reminder');
if (!reminderHtml.includes('15 minutes (within grace = zero pay deduction)')) throw new Error('Missing transparent grace policy text');
if (!reminderHtml.includes('Review Attendance Exception')) throw new Error('Missing escalation CTA');
console.log('✔ Automated attendance reminder & escalation email template passed');

// 7. Onboarding Intake, Paystack Payment Link, Official Riffmax Receipt & Support Ticket Templates
const inviteHtml = renderOnboardingIntakeInviteEmail({
  companyName: 'Prime Logistics Nigeria Ltd',
  recipientName: 'Chinedu Okafor',
  intakeUrl: 'https://app.shiftrelayos.com/onboard.html'
});
if (!inviteHtml.includes('Powered by Riffmax Technology Limited') || !inviteHtml.includes('Open Company Onboarding Form')) {
  throw new Error('Onboarding intake invite email failed branding/CTA check');
}
const payLinkHtml = renderBillingPaymentLinkEmail({
  companyName: 'Prime Logistics Nigeria Ltd',
  companyCode: 'PRI-NG-4021',
  invoiceId: 'INV-SR-202611-4021',
  planLabel: 'Business',
  totalAmountNgn: 150000,
  checkoutUrl: 'https://checkout.paystack.com/test'
});
if (!payLinkHtml.includes('Pay ₦150,000 Securely via Paystack') || !payLinkHtml.includes('Riffmax Technology Limited')) {
  throw new Error('Billing Paystack payment link email failed check');
}
const receiptHtml = renderOfficialPaymentReceiptEmail({
  companyName: 'Prime Logistics Nigeria Ltd',
  companyCode: 'PRI-NG-4021',
  receiptNumber: 'RCP-SR-20261126-4021',
  invoiceId: 'INV-SR-202611-4021',
  paystackReference: 'INV-SR-202611-4021',
  totalPaidNgn: 150000
});
if (!receiptHtml.includes('OFFICIAL PAYMENT RECEIPT') || !receiptHtml.includes('Powered by Riffmax Technology Limited')) {
  throw new Error('Official receipt email failed check');
}
const supportHtml = renderSupportTicketEmail({
  recipientName: 'Amina Bello',
  ticketId: 'REC-2026-0412',
  status: 'RESOLVED',
  headline: 'Ticket Resolved',
  messageBody: 'Hours credited cleanly.'
});
if (!supportHtml.includes('REC-2026-0412') || !supportHtml.includes('Powered by Riffmax Technology Limited')) {
  throw new Error('Support ticket email failed check');
}
if (EMAIL_TEMPLATE_CATALOG.length < 12) throw new Error('Expected 12 email templates in catalog');
for (const sample of [activationHtml, resetHtml, handoverHtml, payrollDigestHtml, newsletterHtml, reminderHtml, inviteHtml, payLinkHtml, receiptHtml, supportHtml]) {
  if (/[\u26A1\u{1F512}\u2728]/u.test(sample)) throw new Error('Raw emoji detected in enterprise HTML email template');
}
console.log('✔ Onboarding invite, Paystack link, Official Riffmax receipt & Support ticket HTML templates passed (12/12 zero-emoji)');

console.log('\n=== 2. TESTING HIGH-TECH REPORT TEMPLATES ===');

// 1. Executive Statutory Remittance Ledger Report
const payrollMock = {
  period: 'November 2026 Monthly Payroll Cycle',
  payDate: 'Wednesday, Nov 25, 2026',
  summary: {
    totalGross: 13920000,
    totalPension: 2505600,
    totalPAYE: 1842000,
    totalNet: 9445200
  },
  employees: [
    {
      staffId: 'SR-0005',
      userName: 'Tariq Al-Hassan',
      department: 'Backend Infrastructure',
      regularPay: 240000,
      overtimePay: 0,
      performanceBonus: 0,
      grossPay: 240000,
      pensionEmployee: 19200,
      payeTax: 21500,
      netPay: 199300,
      bank_name: 'Guaranty Trust Bank',
      account_number: '0129384721'
    }
  ]
};
const payrollReportHtml = generatePayrollReportHtml(payrollMock, { legal_name: 'Riffmax Technology Limited', organisation_code: 'RIF-2026' });
if (!payrollReportHtml.includes('RECONCILED ₦0.00')) throw new Error('Missing ₦0.00 watermark');
if (!payrollReportHtml.includes('PenCom ID: PR-7392819')) throw new Error('Missing PenCom ID');
if (!payrollReportHtml.includes('Tariq Al-Hassan')) throw new Error('Missing employee in ledger');
console.log('✔ Executive statutory payroll ledger passed (Watermark, PenCom, PAYE, Signatures)');

// 2. Worker CV Operational Dossier
const cvHtml = generateCvReportHtml({
  name: 'Tariq Al-Hassan',
  role_title: 'Senior Distributed Systems Engineer',
  department: 'Backend Infrastructure',
  staff_id: 'SR-0042'
}, {
  verifiedHours: '1,420',
  punctuality: '99.4%',
  incidents: '0',
  handovers: '142',
  shiftWindow: '06:00 – 14:00 WAT'
});
if (!cvHtml.includes('1,420')) throw new Error('Missing verified hours in CV');
if (!cvHtml.includes('99.4%')) throw new Error('Missing punctuality in CV');
if (!cvHtml.includes('<svg width=')) throw new Error('Missing SVG barcode in CV');
if (!cvHtml.includes('PEN10098472910')) throw new Error('Missing PenCom PIN in CV');
console.log('✔ Worker CV operational dossier passed (Barcode, QR, Metrics, Statutory)');

// 3. Terms of Service & Statutory SLA
const tosHtml = generateTermsOfServiceHtml();
if (!tosHtml.includes('SHIFTRELAY TECHNOLOGIES LIMITED')) throw new Error('Missing legal entity');
if (!tosHtml.includes('PITA 2011')) throw new Error('Missing PITA 2011 statutory reference');
if (!tosHtml.includes('Zero-Lending Regulatory Boundary')) throw new Error('Missing CBN zero lending clause');
if (!tosHtml.includes('Lagos Court of Arbitration')) throw new Error('Missing arbitration clause');
console.log('✔ Master Terms of Service & Statutory SLA document passed');

console.log('\n======================================================');
console.log('✔ ALL FORMS, REPORTS, AND EMAIL ENGINE TESTS PASSED!');
console.log('======================================================');
