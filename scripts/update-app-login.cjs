const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'app.js');
let code = fs.readFileSync(appPath, 'utf8');

const targetRegex = /function renderLogin\(\)\{[\s\S]*?async function signIn\(event\)\{[\s\S]*?\}\}/;

const replacement = `
// ── ShiftRelay 3-Layer Enterprise Login State ─────────────────────────────
const loginFlow = {
  step: 1, // 1: Company Code -> 2: Email -> 3: Password + Compliance Checkboxes
  companyId: localStorage.getItem('shiftrelay_company_code') || 'RIF-2026',
  companyName: 'Riffmax Technology Limited',
  email: '',
  password: '',
  rememberDevice: true,
  complianceAccepted: true
};

function renderLogin() {
  const panel = $('#access-panel');
  if (!panel) return;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'onboard' || urlParams.get('onboard') === 'true') {
    renderExecutiveOnboarding(panel, urlParams);
    return;
  }

  const isDemo = state.config?.demoMode !== false && Array.isArray(state.users) && state.users.length > 0;

  const demoSection = isDemo ? \`
    <div class="demo-drive-section" id="demo-drive-section" style="margin-top:24px;padding-top:18px;border-top:1px solid var(--border-subtle);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="display:block;font-size:13px;color:var(--text-main);font-weight:700;">Instant Demo Drive</strong>
          <small style="color:var(--text-muted);font-size:11.5px;">Quick test-drive roles for Riffmax Technology</small>
        </div>
        <span class="badge" style="background:var(--brand-accent-subtle, rgba(16,185,129,0.1));color:var(--status-green-text, #065f46);border:1px solid var(--status-green-border, #a7f3d0);font-size:10.5px;font-weight:700;">Zero Password</span>
      </div>
      <div class="role-cards" id="role-cards">
        \${state.users.map((user)=>{
          const avatarStyle = user.avatar_data_url
            ? \`background-image:url('\${user.avatar_data_url}');background-size:cover;background-position:center;color:transparent;\`
            : '';
          const initial = escape(user.name || 'U').slice(0,1).toUpperCase();
          return \`
          <button class="role-card" data-login="\${user.id}" type="button" title="Sign in as \${escape(user.name)}">
            <span class="role-avatar" style="width:38px;height:38px;min-width:38px;border-radius:50%;display:grid;place-items:center;font-size:15px;font-weight:700;background:linear-gradient(135deg,#0d524d,#10b981);color:#fff;overflow:hidden;\${avatarStyle}">\${user.avatar_data_url ? '' : initial}</span>
            <span>
              <strong>\${escape(user.name)}</strong>
              <small>\${escape(user.title || user.role)}</small>
            </span>
          </button>\`;
        }).join('')}
      </div>
    </div>
  \` : '';

  const modeBadge = \`
    <div class="mode-badge-strip" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;font-size:12px;">
      <span style="color:var(--text-secondary);font-weight:600;">\${isDemo ? '● Demo Personas Active' : 'Production Mode'}</span>
      <button type="button" class="secondary" id="btn-toggle-demo-mode" style="min-height:28px;padding:2px 10px;font-size:11px;">\${isDemo ? 'Switch to Clean Prod' : 'Enable Demo Roles'}</button>
    </div>
  \`;

  // Render Step Indicators
  const stepIndicators = \`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px;font-size:11px;font-weight:700;letter-spacing:0.04em;">
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;\${loginFlow.step === 1 ? 'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);' : loginFlow.step > 1 ? 'background:rgba(16,185,129,0.1);color:#10b981;' : 'color:var(--text-muted);'}">
        \${loginFlow.step > 1 ? '✓' : '1'} Company ID
      </span>
      <span style="color:var(--text-muted);">→</span>
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;\${loginFlow.step === 2 ? 'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);' : loginFlow.step > 2 ? 'background:rgba(16,185,129,0.1);color:#10b981;' : 'color:var(--text-muted);'}">
        \${loginFlow.step > 2 ? '✓' : '2'} Work Email
      </span>
      <span style="color:var(--text-muted);">→</span>
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;\${loginFlow.step === 3 ? 'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);' : 'color:var(--text-muted);'}">
        3 Security
      </span>
    </div>
  \`;

  let stepHtml = '';

  // ── LAYER 1: Company Unique Code ──────────────────────────────────────────
  if (loginFlow.step === 1) {
    stepHtml = \`
      \${stepIndicators}
      <p class="eyebrow">LAYER 1 OF 3 • TENANT VERIFICATION</p>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Enter your Company ID.</h2>
      <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">All ShiftRelay access is enterprise-gated to isolate company shifts, staff data, and statutory records.</p>
      <form class="access-form" id="layer1-form">
        <label>Company ID (Tenant Unique Code)
          <input name="companyId" id="layer1-company-id" required autocomplete="organization" value="\${escape(loginFlow.companyId)}" placeholder="e.g. RIF-2026" autofocus />
        </label>
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:10px 14px;font-size:12px;color:#34d399;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
          <span>🏢</span>
          <span>Founding Partner: <strong>\${escape(loginFlow.companyName)}</strong> (\${escape(loginFlow.companyId)})</span>
        </div>
        <div class="button-row">
          <button class="primary" type="submit" id="btn-layer1-continue" style="width:100%;justify-content:center;font-weight:700;">Continue to Identity →</button>
        </div>
      </form>
      <p class="form-message" id="form-message"></p>
    \`;
  }

  // ── LAYER 2: Official Work Email ──────────────────────────────────────────
  else if (loginFlow.step === 2) {
    stepHtml = \`
      \${stepIndicators}
      <p class="eyebrow">LAYER 2 OF 3 • WORKPLACE IDENTITY</p>
      <div style="background:var(--bg-elevated, #1e293b);border:1px solid var(--border-subtle);border-radius:12px;padding:10px 14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.05em;">Company Verified</span>
          <strong style="font-size:13.5px;color:#34d399;">🏢 \${escape(loginFlow.companyName)}</strong> <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono, monospace);">(\${escape(loginFlow.companyId)})</span>
        </div>
        <button type="button" class="secondary" id="btn-layer2-change-company" style="padding:4px 8px;font-size:11px;min-height:26px;">Change</button>
      </div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Enter your Work Email.</h2>
      <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">Enter your assigned corporate email address to match your frontline roster.</p>
      <form class="access-form" id="layer2-form">
        <label>Official Corporate Work Email
          <input name="email" id="layer2-email" type="email" required autocomplete="email" value="\${escape(loginFlow.email)}" placeholder="name@riffmax.tech" autofocus />
        </label>
        <div class="button-row" style="display:flex;gap:10px;">
          <button type="button" class="secondary" id="btn-layer2-back" style="flex:1;justify-content:center;">← Back</button>
          <button class="primary" type="submit" id="btn-layer2-continue" style="flex:2;justify-content:center;font-weight:700;">Continue to Security →</button>
        </div>
      </form>
      <p class="form-message" id="form-message"></p>
    \`;
  }

  // ── LAYER 3: Security Password & Compliance Checkboxes ────────────────────
  else if (loginFlow.step === 3) {
    stepHtml = \`
      \${stepIndicators}
      <p class="eyebrow">LAYER 3 OF 3 • SECURITY AUTHENTICATION</p>
      <div style="background:var(--bg-elevated, #1e293b);border:1px solid var(--border-subtle);border-radius:12px;padding:10px 14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.05em;">Signing in as</span>
          <strong style="font-size:13.5px;color:#34d399;">👤 \${escape(loginFlow.email)}</strong>
          <span style="font-size:11.5px;color:var(--text-muted);display:block;">\${escape(loginFlow.companyName)} (\${escape(loginFlow.companyId)})</span>
        </div>
        <button type="button" class="secondary" id="btn-layer3-change-email" style="padding:4px 8px;font-size:11px;min-height:26px;">Change</button>
      </div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Enter your Password.</h2>
      <p class="muted" style="margin:0 0 16px;font-size:13px;color:var(--text-secondary);">Enter your workplace credentials to decrypt and access your assigned cockpit.</p>
      <form class="access-form" id="layer3-form">
        <label>Master Password
          <div style="position:relative;">
            <input name="password" id="layer3-password" type="password" required autocomplete="current-password" placeholder="••••••••" style="padding-right:40px;" autofocus />
            <button type="button" id="btn-toggle-pw" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px;">👁</button>
          </div>
        </label>
        
        <div style="margin:14px 0;display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:var(--text-secondary);">
          <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-weight:normal;">
            <input type="checkbox" id="chk-remember-device" checked style="margin-top:3px;accent-color:#10b981;" />
            <span>Remember this device for 30 days (Session persistence)</span>
          </label>
          <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-weight:normal;">
            <input type="checkbox" id="chk-compliance-rules" checked required style="margin-top:3px;accent-color:#10b981;" />
            <span>I confirm attendance integrity & accept ShiftRelay Security Protocols</span>
          </label>
        </div>

        <div class="button-row" style="display:flex;gap:10px;margin-top:14px;">
          <button type="button" class="secondary" id="btn-layer3-back" style="flex:1;justify-content:center;">← Back</button>
          <button class="primary" type="submit" id="btn-layer3-submit" style="flex:2;justify-content:center;font-weight:700;">Sign in to Workplace →</button>
        </div>
      </form>
      <div style="margin-top:14px;text-align:center;">
        <button type="button" class="secondary" id="btn-layer3-biometrics" style="width:100%;font-size:12px;padding:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          <span>⚡ Instant Biometric Sign-in (FaceID / Fingerprint)</span>
        </button>
      </div>
      <p class="form-message" id="form-message"></p>
    \`;
  }

  panel.innerHTML = \`
    \${renderPortalTabs('signin')}
    \${stepHtml}
    \${demoSection}
    \${modeBadge}
  \`;

  // Bind Layer 1 Actions
  if (loginFlow.step === 1) {
    const l1Form = $('#layer1-form');
    l1Form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = $('#layer1-company-id');
      const codeVal = (codeInput?.value || '').trim();
      if (!codeVal) return;

      const btn = $('#btn-layer1-continue');
      btn.disabled = true;
      btn.textContent = 'Verifying Company ID…';

      try {
        const res = await api('/api/auth/company-lookup?code=' + encodeURIComponent(codeVal));
        if (res.ok && res.found) {
          loginFlow.companyId = res.company.companyId;
          loginFlow.companyName = res.company.tradingName || res.company.legalName;
          localStorage.setItem('shiftrelay_company_code', loginFlow.companyId);
          loginFlow.step = 2;
          renderLogin();
        } else {
          // If fallback accepts code
          loginFlow.companyId = codeVal.toUpperCase();
          loginFlow.companyName = codeVal.toUpperCase().includes('RIF') ? 'Riffmax Technology Limited' : 'Enterprise Tenant';
          localStorage.setItem('shiftrelay_company_code', loginFlow.companyId);
          loginFlow.step = 2;
          renderLogin();
        }
      } catch (err) {
        $('#form-message').textContent = err.message || 'Could not verify company ID.';
        btn.disabled = false;
        btn.textContent = 'Continue to Identity →';
      }
    });
  }

  // Bind Layer 2 Actions
  else if (loginFlow.step === 2) {
    $('#btn-layer2-change-company')?.addEventListener('click', () => {
      loginFlow.step = 1;
      renderLogin();
    });
    $('#btn-layer2-back')?.addEventListener('click', () => {
      loginFlow.step = 1;
      renderLogin();
    });
    const l2Form = $('#layer2-form');
    l2Form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = $('#layer2-email');
      const emailVal = (emailInput?.value || '').trim();
      if (!emailVal) return;
      loginFlow.email = emailVal;
      loginFlow.step = 3;
      renderLogin();
    });
  }

  // Bind Layer 3 Actions
  else if (loginFlow.step === 3) {
    $('#btn-layer3-change-email')?.addEventListener('click', () => {
      loginFlow.step = 2;
      renderLogin();
    });
    $('#btn-layer3-back')?.addEventListener('click', () => {
      loginFlow.step = 2;
      renderLogin();
    });
    $('#btn-toggle-pw')?.addEventListener('click', () => {
      const pwInput = $('#layer3-password');
      if (pwInput) {
        pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
      }
    });

    const l3Form = $('#layer3-form');
    l3Form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#btn-layer3-submit');
      const pwInput = $('#layer3-password');
      const password = pwInput?.value || '';
      const remember = $('#chk-remember-device')?.checked !== false;

      btn.disabled = true;
      btn.textContent = 'Signing in…';

      try {
        const result = await api('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: loginFlow.companyId,
            email: loginFlow.email,
            password
          })
        });
        if (remember) {
          localStorage.setItem('shiftrelay_company_code', loginFlow.companyId);
        }
        login(result.user);
      } catch (error) {
        $('#form-message').textContent = error.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign in to Workplace →';
      }
    });

    // Biometric Trigger
    $('#btn-layer3-biometrics')?.addEventListener('click', async () => {
      const msg = $('#form-message');
      msg.textContent = 'Initiating biometric verification…';
      try {
        const optRes = await api('/api/auth/webauthn/login-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginFlow.email, companyId: loginFlow.companyId })
        });
        const verifyRes = await api('/api/auth/webauthn/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginFlow.email, companyId: loginFlow.companyId })
        });
        if (verifyRes.ok && verifyRes.user) {
          login(verifyRes.user);
        }
      } catch (err) {
        msg.textContent = err.message || 'Biometric authentication unavailable. Use password.';
      }
    });
  }

  // Demo cards & mode toggle
  if (isDemo) {
    document.querySelectorAll('[data-login]').forEach((button) => {
      button.addEventListener('click', () => {
        const u = state.users.find((user) => user.id === button.dataset.login);
        if (u) login(u);
      });
    });
  }

  $('#btn-toggle-demo-mode')?.addEventListener('click', async () => {
    try {
      const res = await api('/api/config/demo-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoMode: !isDemo })
      });
      state.config.demoMode = res.demoMode;
      const uRes = await api('/api/users');
      state.users = uRes.users;
      renderLogin();
      toast(res.demoMode ? 'Investor Demo Mode active (roles enabled).' : 'Clean Production Mode active (all test logins removed).');
    } catch (err) {
      toast(err.message);
    }
  });

  bindAccessActions();
}

// ── Executive Onboarding Flow ─────────────────────────────────────────────
function renderExecutiveOnboarding(panel, urlParams) {
  const companyId = urlParams.get('companyId') || 'RIF-2026';
  const email = urlParams.get('email') || 'sherif@riffmax.tech';
  const companyName = 'Riffmax Technology Limited';

  panel.innerHTML = \`
    <div class="brand-pill" style="display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;padding:4px 12px;border-radius:9999px;margin-bottom:16px;">
      ★ EXECUTIVE FOUNDER ONBOARDING
    </div>
    <h2 style="font-size:24px;font-weight:900;letter-spacing:-0.02em;margin-bottom:6px;">Initialize Executive Workplace.</h2>
    <p class="muted" style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px;">Welcome, <strong>Sherif Akanmu</strong>. Set your master credentials to activate Riffmax Technology Limited on ShiftRelay.</p>
    
    <div style="background:var(--bg-elevated, #1e293b);border:1px solid var(--border-subtle);border-radius:14px;padding:14px 16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text-muted);">Company Name:</span>
        <strong style="font-size:13px;color:#34d399;">\${companyName}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text-muted);">Unique Company ID:</span>
        <code style="font-size:12.5px;color:#38bdf8;font-weight:800;font-family:var(--font-mono, monospace);">\${companyId}</code>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:var(--text-muted);">Executive Email:</span>
        <span style="font-size:12.5px;color:var(--text-main);">\${email}</span>
      </div>
    </div>

    <form class="access-form" id="executive-onboard-form">
      <label>Create Master Executive Password *
        <input type="password" id="ob-new-password" required minlength="8" placeholder="Minimum 8 characters" autocomplete="new-password" />
      </label>
      <label>Confirm Master Executive Password *
        <input type="password" id="ob-confirm-password" required minlength="8" placeholder="Re-enter password" autocomplete="new-password" />
      </label>

      <div style="margin:16px 0;display:flex;flex-direction:column;gap:12px;font-size:12.5px;color:var(--text-secondary);">
        <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
          <input type="checkbox" id="chk-ob-auth" checked required style="margin-top:3px;accent-color:#10b981;" />
          <span>I confirm Riffmax Technology Limited is authorized to deploy ShiftRelay HCM.</span>
        </label>
        <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
          <input type="checkbox" id="chk-ob-ndpr" checked required style="margin-top:3px;accent-color:#10b981;" />
          <span>I accept NDPR & Corporate Governance Data Privacy Protocols.</span>
        </label>
      </div>

      <button class="primary" type="submit" id="btn-ob-submit" style="width:100%;justify-content:center;font-weight:800;padding:12px;">
        Complete Onboarding & Enter Workplace →
      </button>
    </form>
    <p class="form-message" id="form-message" style="margin-top:12px;"></p>
  \`;

  $('#executive-onboard-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#ob-new-password')?.value || '';
    const confirmPw = $('#ob-confirm-password')?.value || '';
    const msg = $('#form-message');
    msg.textContent = '';

    if (pw !== confirmPw) {
      msg.textContent = 'Passwords do not match.';
      return;
    }
    if (pw.length < 8) {
      msg.textContent = 'Password must be at least 8 characters.';
      return;
    }

    const btn = $('#btn-ob-submit');
    btn.disabled = true;
    btn.textContent = 'Activating Executive Profile…';

    try {
      const res = await api('/api/auth/executive-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          email,
          password: pw,
          confirmPassword: confirmPw,
          governanceAccepted: true
        })
      });

      localStorage.setItem('shiftrelay_company_code', companyId);
      toast('Executive Onboarding Complete! Welcome, Sherif.');
      login(res.user);
    } catch (err) {
      msg.textContent = err.message || 'Onboarding failed.';
      btn.disabled = false;
      btn.textContent = 'Complete Onboarding & Enter Workplace →';
    }
  });
}
`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync(appPath, code, 'utf8');
  console.log('✓ Successfully injected 3-layer login and executive onboarding into app.js');
} else {
  console.error('⚠ Could not match targetRegex in app.js');
}
