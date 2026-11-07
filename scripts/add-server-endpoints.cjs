const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.mjs');
let code = fs.readFileSync(serverPath, 'utf8');

const marker = `  if (url.pathname === '/api/auth/sign-in' && request.method === 'POST') {`;

if (!code.includes(marker)) {
  console.error('Could not find sign-in marker in server.mjs');
  process.exit(1);
}

const newEndpoints = `
  // ── Company Lookup for 3-Layer Login (Layer 1 Validation) ──────────────────
  if (url.pathname === '/api/auth/company-lookup' && request.method === 'GET') {
    const rawCode = String(url.searchParams.get('code') || '').trim();
    const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleanCode) return sendJson(response, 400, { error: 'Company code is required.' });

    const store = await getStore();
    let org = (store.organisations || []).find(o => {
      const c = String(o.organisation_code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const aliases = (o.aliases || []).map(a => String(a).replace(/[^A-Za-z0-9]/g, '').toUpperCase());
      return c === cleanCode || aliases.includes(cleanCode);
    });

    if (!org && cleanCode === 'RIF2026') {
      org = store.organisations?.[0];
    }

    if (!org) {
      return sendJson(response, 200, { ok: true, found: false, message: 'Tenant company code not recognized.' });
    }

    return sendJson(response, 200, {
      ok: true,
      found: true,
      company: {
        companyId: org.organisation_code || 'RIF-2026',
        legalName: org.legal_name || 'Riffmax Technology Limited',
        tradingName: org.trading_name || 'Riffmax Technology',
        industry: org.industry || 'Enterprise SaaS & Workforce DeepTech',
        country: org.country || 'Nigeria',
        state: org.state || 'Lagos',
        hubName: org.hub_name || 'Riffmax Software Engineering Hub',
        hubLat: org.hub_lat || 6.4312,
        hubLng: org.hub_lng || 3.4244,
        hubRadius: org.hub_perimeter || 120
      }
    });
  }

  // ── Executive Onboarding Submission ────────────────────────────────────────
  if (url.pathname === '/api/auth/executive-onboard' && request.method === 'POST') {
    const body = await readJson(request);
    const companyCode = String(body.companyId || body.companyCode || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const confirmPassword = String(body.confirmPassword || '').trim();

    if (!companyCode || !email || !password) {
      return sendJson(response, 400, { error: 'Company code, executive email, and master password are required.' });
    }
    if (password.length < 8) {
      return sendJson(response, 400, { error: 'Master password must be at least 8 characters with high entropy.' });
    }
    if (password !== confirmPassword) {
      return sendJson(response, 400, { error: 'Password confirmation does not match.' });
    }

    const store = await getStore();
    const org = (store.organisations || []).find(o => {
      const c = String(o.organisation_code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const codeClean = companyCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return c === codeClean || (o.aliases || []).map(a => String(a).replace(/[^A-Za-z0-9]/g, '').toUpperCase()).includes(codeClean);
    }) || store.organisations?.[0];

    let userObj = (store.portalUsers || []).find(u => u.email.toLowerCase() === email);
    if (!userObj) {
      // Create executive portal user if first time
      userObj = {
        id: '00000000-0000-4000-8000-000000000001',
        full_name: body.fullName || 'Sherif Akanmu',
        email,
        phone: body.phone || '+234 803 000 0001',
        tenant_id: org.id,
        organisation_id: org.id,
        status: 'active',
        created_at: new Date().toISOString()
      };
      if (!Array.isArray(store.portalUsers)) store.portalUsers = [];
      store.portalUsers.push(userObj);
    }

    userObj.password_hash = await hashPassword(password);
    userObj.status = 'active';

    let member = (store.memberships || []).find(m => m.user_id === userObj.id || m.id === userObj.id);
    if (!member) {
      member = {
        id: userObj.id,
        organisation_id: org.id,
        user_id: userObj.id,
        role: 'owner',
        title: 'Managing Director & CEO',
        department: 'Executive Operations',
        status: 'active'
      };
      if (!Array.isArray(store.memberships)) store.memberships = [];
      store.memberships.push(member);
    }
    member.status = 'active';

    await saveStore(store);

    // Dispatch Executive Welcome Email via ShiftRelay Email Engine
    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const host = request.headers.host || 'localhost:4000';
    const loginUrl = \`\${protocol}://\${host}/?companyId=\${org.organisation_code}\`;

    await sendShiftRelayEmail({
      to: email,
      subject: \`Official Tenant Onboarding Confirmed: \${org.legal_name || 'Riffmax Technology Limited'}\`,
      html: \`
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#090d16;color:#f8fafc;border-radius:16px;">
          <h2 style="color:#10b981;margin-bottom:8px;">ShiftRelay Sovereign Workplace Verified</h2>
          <p style="color:#94a3b8;font-size:14px;">Executive onboarding completed for <strong>\${userObj.full_name}</strong> at <strong>\${org.legal_name}</strong>.</p>
          <div style="background:#1e293b;padding:16px;border-radius:12px;margin:20px 0;">
            <p style="margin:4px 0;"><strong>Company ID:</strong> <code style="color:#34d399;font-weight:700;">\${org.organisation_code}</code></p>
            <p style="margin:4px 0;"><strong>Work Email:</strong> \${email}</p>
            <p style="margin:4px 0;"><strong>Security Standing:</strong> NDPR & Sovereign Biometric Enforced</p>
          </div>
          <a href="\${loginUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#022c22;text-decoration:none;font-weight:700;border-radius:8px;">Open Executive Dashboard</a>
        </div>
      \`,
      source: 'Executive Onboarding Wizard'
    });

    const sessionIdValue = await createSession(userObj.id, member.id);
    response.setHeader('Set-Cookie', sessionCookie(sessionIdValue));

    return sendJson(response, 200, {
      ok: true,
      message: 'Executive profile configured. Welcome to ShiftRelay Workplace.',
      user: {
        id: member.id,
        name: userObj.full_name,
        email: userObj.email,
        role: member.role,
        title: member.title,
        department: member.department,
        organisation_id: org.id,
        organisation_name: org.trading_name || org.legal_name,
        company_id: org.organisation_code
      }
    });
  }

  // ── Executive 1-Click Employee Invite & Enablement ─────────────────────────
  if (url.pathname === '/api/executive/invite-member' && request.method === 'POST') {
    const authUser = await getUser(request);
    if (!authUser || !['owner', 'supervisor', 'manager'].includes(authUser.role)) {
      return sendJson(response, 403, { error: 'Executive or Supervisor authorization required to invite personnel.' });
    }

    const body = await readJson(request);
    const memberId = body.memberId || body.userId;
    if (!memberId) return sendJson(response, 400, { error: 'Member ID is required.' });

    const store = await getStore();
    const member = (store.memberships || []).find(m => m.id === memberId || m.user_id === memberId);
    if (!member) return sendJson(response, 404, { error: 'Member not found in organization roster.' });

    const userRecord = (store.portalUsers || []).find(u => u.id === (member.user_id || member.id));
    if (!userRecord) return sendJson(response, 404, { error: 'User record for member not found.' });

    const org = (store.organisations || []).find(o => o.id === member.organisation_id) || store.organisations?.[0];
    const activationToken = 'act-' + randomBytes(20).toString('hex');

    userRecord.activation_token = activationToken;
    userRecord.status = 'pending_activation';
    member.status = 'pending_activation';
    await saveStore(store);

    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const host = request.headers.host || 'localhost:4000';
    const activationUrl = \`\${protocol}://\${host}/activate?token=\${activationToken}\`;

    await sendShiftRelayEmail({
      to: userRecord.email,
      subject: \`Invitation: Activate your ShiftRelay Profile for \${org?.trading_name || 'Riffmax Technology'}\`,
      html: \`
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#090d16;color:#f8fafc;border-radius:16px;">
          <h2 style="color:#10b981;margin-bottom:8px;">Welcome to \${org?.trading_name || 'Riffmax Technology'} Workplace</h2>
          <p style="color:#94a3b8;font-size:14px;">Hello <strong>\${userRecord.full_name}</strong>,</p>
          <p style="color:#cbd5e1;font-size:14px;line-height:1.6;">You have been provisioned by executive leadership as <strong>\${member.title || member.role}</strong> on ShiftRelay. Please click the button below to set your password and complete your workplace onboarding.</p>
          <div style="background:#1e293b;padding:16px;border-radius:12px;margin:20px 0;">
            <p style="margin:4px 0;"><strong>Company ID:</strong> <code style="color:#34d399;font-weight:700;">\${org?.organisation_code || 'RIF-2026'}</code></p>
            <p style="margin:4px 0;"><strong>Work Email:</strong> \${userRecord.email}</p>
            <p style="margin:4px 0;"><strong>Assigned Role:</strong> \${member.title || member.role}</p>
            <p style="margin:4px 0;"><strong>Department:</strong> \${member.department || 'Engineering Core'}</p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="\${activationUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#022c22;text-decoration:none;font-weight:800;font-size:15px;border-radius:10px;box-shadow:0 10px 15px -3px rgba(16,185,129,0.3);">Activate My Workplace Profile</a>
          </div>
          <p style="font-size:12px;color:#64748b;margin-top:24px;">Direct Activation Link: <br><a href="\${activationUrl}" style="color:#38bdf8;">\${activationUrl}</a></p>
        </div>
      \`,
      source: 'Executive Workforce Console'
    });

    return sendJson(response, 200, {
      ok: true,
      message: \`Activation invitation dispatched to \${userRecord.email}\`,
      member: {
        id: member.id,
        name: userRecord.full_name,
        email: userRecord.email,
        role: member.role,
        status: 'pending_activation',
        activationUrl,
        activationToken
      }
    });
  }

  // ── ShiftRelay Email Outbox Dispatcher (Inspection & Verification) ─────────
  if ((url.pathname === '/api/dev/outbox' || url.pathname === '/api/admin/emails') && request.method === 'GET') {
    const store = await getStore();
    return sendJson(response, 200, {
      ok: true,
      total: (store.emailStation || []).length,
      emails: store.emailStation || []
    });
  }

  // ── Admin Live Database Updates: Tenant Editor ─────────────────────────────
  if (url.pathname.startsWith('/api/admin/tenants/') && request.method === 'PUT') {
    const store = await getStore();
    if (!checkAdminAuth(request, store)) return sendJson(response, 401, { error: 'Admin authorization required.' });
    const targetTenantId = url.pathname.split('/')[4];
    const orgIndex = (store.organisations || []).findIndex(o => o.id === targetTenantId || o.organisation_code === targetTenantId);
    if (orgIndex === -1) return sendJson(response, 404, { error: 'Tenant organisation not found.' });

    const body = await readJson(request);
    const org = store.organisations[orgIndex];

    if (body.legalName) org.legal_name = body.legalName.trim();
    if (body.tradingName) org.trading_name = body.tradingName.trim();
    if (body.organisationCode) org.organisation_code = body.organisationCode.trim().toUpperCase();
    if (body.workEmail) org.work_email = body.workEmail.trim().toLowerCase();
    if (body.industry) org.industry = body.industry.trim();
    if (body.address) org.address = body.address.trim();
    if (body.hubName) org.hub_name = body.hubName.trim();
    if (body.hubLat !== undefined) org.hub_lat = Number(body.hubLat);
    if (body.hubLng !== undefined) org.hub_lng = Number(body.hubLng);
    if (body.hubPerimeter !== undefined) org.hub_perimeter = Number(body.hubPerimeter);
    if (body.subscriptionTier) org.subscription_tier = body.subscriptionTier;

    await saveStore(store);
    return sendJson(response, 200, { ok: true, message: 'Tenant records updated successfully.', tenant: org });
  }

  // ── Admin Live Database Updates: Employee Editor ───────────────────────────
  if (url.pathname.startsWith('/api/admin/employees/') && request.method === 'PUT') {
    const store = await getStore();
    if (!checkAdminAuth(request, store)) return sendJson(response, 401, { error: 'Admin authorization required.' });
    const targetUserId = url.pathname.split('/')[4];
    const userIndex = (store.portalUsers || []).findIndex(u => u.id === targetUserId);
    if (userIndex === -1) return sendJson(response, 404, { error: 'Employee not found.' });

    const body = await readJson(request);
    const userObj = store.portalUsers[userIndex];
    if (body.fullName) userObj.full_name = body.fullName.trim();
    if (body.email) userObj.email = body.email.trim().toLowerCase();
    if (body.phone !== undefined) userObj.phone = (body.phone || '').trim();
    if (body.status) userObj.status = body.status;

    const member = (store.memberships || []).find(m => m.user_id === targetUserId || m.id === targetUserId);
    if (member) {
      if (body.role) member.role = body.role;
      if (body.title) member.title = body.title;
      if (body.department) member.department = body.department;
      if (body.status) member.status = body.status;
    }

    const contract = (store.contracts || []).find(c => c.userId === targetUserId);
    if (contract) {
      if (body.fullName) contract.userName = body.fullName.trim();
      if (body.role) contract.role = body.role;
      if (body.department) contract.department = body.department;
      if (body.monthlyRate !== undefined) {
        contract.monthly_rate = Number(body.monthlyRate);
        contract.hourly_rate = Math.round(Number(body.monthlyRate) / 160);
      }
    }

    await saveStore(store);
    return sendJson(response, 200, { ok: true, message: 'Employee record updated in database.', user: userObj, member });
  }
`;

code = code.replace(marker, newEndpoints + '\n' + marker);
fs.writeFileSync(serverPath, code, 'utf8');
console.log('✓ Successfully injected 3-layer login, executive onboard, invite, and admin edit routes into server.mjs');
