const nodemailer = require('nodemailer');
const fs = require('fs');

// Load .env
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

console.log('Testing SMTP connection with:');
console.log('Host:', env.SMTP_HOST);
console.log('Port:', env.SMTP_PORT);
console.log('User:', env.SMTP_USER);
console.log('Pass length:', env.SMTP_PASS ? env.SMTP_PASS.replace(/\s+/g, '').length : 0);

async function testEmail() {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: env.SMTP_USER,
      pass: (env.SMTP_PASS || '').replace(/\s+/g, '')
    }
  });

  console.log('Verifying transporter credentials...');
  await transporter.verify();
  console.log('✓ Transporter verified successfully!');

  console.log('Sending test email to ' + env.SMTP_USER + '...');
  const info = await transporter.sendMail({
    from: `"ShiftRelay Cloud" <${env.SMTP_USER}>`,
    to: env.SMTP_USER,
    subject: 'ShiftRelay Engine: Live Email Delivery Confirmed!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#090d16;color:#f8fafc;border-radius:16px;">
        <h2 style="color:#10b981;margin-bottom:8px;">ShiftRelay Email Engine Active</h2>
        <p style="color:#94a3b8;font-size:14px;">Hello Sherif,</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;">
          Your Gmail App Password has been successfully integrated into the ShiftRelay Engine!
          All executive onboarding notices, worker invitations, and shift alarm relays will now be delivered live.
        </p>
        <div style="background:#1e293b;padding:16px;border-radius:12px;margin:20px 0;">
          <p style="margin:4px 0;"><strong>Company:</strong> Riffmax Technology Limited</p>
          <p style="margin:4px 0;"><strong>Tenant Code:</strong> RIF-2026</p>
          <p style="margin:4px 0;"><strong>Status:</strong> Live SMTP Relay Verified</p>
        </div>
        <p style="color:#64748b;font-size:12px;">Sent via ShiftRelay DeepTech Engine</p>
      </div>
    `,
    text: 'ShiftRelay Email Engine Active. Live SMTP relay successfully verified for Riffmax Technology (RIF-2026).'
  });

  console.log('✓ Email delivered successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);
}

testEmail().catch(err => {
  console.error('SMTP Error:', err);
  process.exit(1);
});
