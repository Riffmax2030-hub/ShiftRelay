const fs = require('fs');
let s = fs.readFileSync('server.mjs', 'utf8');

const target = `  // Optional: If RESEND_API_KEY is configured in .env, dispatch live transactional email`;

const replacement = `  // ── Live SMTP Delivery via Nodemailer (Gmail / Custom SMTP) ─────────────
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer');
      const isSecure = process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465;
      const transporter = (nodemailer.default || nodemailer).createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\\s+/g, '')
        }
      });
      const senderFrom = process.env.FROM_EMAIL || \`"ShiftRelay" <\${process.env.SMTP_USER}>\`;
      const mailRes = await transporter.sendMail({
        from: senderFrom,
        to,
        subject,
        text,
        html
      });
      console.log('✓ Dispatched live email to ' + to + ' via SMTP (MsgId: ' + mailRes.messageId + ')');
      emailRecord.status = 'SENT_LIVE';
      emailRecord.messageId = mailRes.messageId;
    } catch (e) {
      console.warn('⚠ Live SMTP dispatch failed (captured in outbox):', e.message);
    }
  }

  // Optional: If RESEND_API_KEY is configured in .env, dispatch live transactional email`;

if (s.includes(target)) {
  s = s.replace(target, replacement);
  fs.writeFileSync('server.mjs', s, 'utf8');
  console.log('✓ Injected nodemailer live SMTP into sendShiftRelayEmail');
} else {
  console.error('⚠ Could not find target in server.mjs');
}
