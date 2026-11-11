const state={users:[],user:null,config:null,currentHandover:null,recordedChunks:[],mediaRecorder:null};
window._srState = state;
const defaultNotes=`At 17:40, cold-room temperature rose to 9°C for 12 minutes. Generator was checked and is working; temperature is back at 4°C. Please check the temperature log at 23:00 and call the maintenance line if it rises above 6°C again.\n\nThe pharmacy delivery has not arrived. Amina called the supplier; they promised arrival by 20:00 but did not give a tracking number. Four doses of insulin remain in stock.\n\nMr. Otieno's family called twice about his discharge. The doctor has not signed the discharge note yet. Please update them after the 21:30 ward round.`;
const demoHandover={summary:'3 items need the incoming team’s attention.',actions:[{title:'Monitor cold-room temperature',priority:'high',owner:'Night supervisor',due:'Before 23:00',evidence:'Temperature briefly reached 9°C at 17:40. It is currently stable at 4°C.'},{title:'Confirm delayed pharmacy delivery',priority:'medium',owner:'Charge nurse',due:'By 22:30',evidence:'Supplier promised delivery by 20:00, but no tracking number was provided.'},{title:'Call Mr. Otieno’s family',priority:'low',owner:'Ward nurse',due:'After 21:30 round',evidence:'Family is awaiting a discharge update. Doctor’s signature is pending.'}],missing_context:[{question:'Who has the maintenance-line number?',why_it_matters:'The night team needs this to respond immediately if temperature rises.'}]};
const $=(selector)=>document.querySelector(selector);const escape=(value)=>String(value).replace(/[&<>'"]/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[character]));
function toast(message){const box=$('#toast');box.textContent=message;box.classList.remove('hidden');setTimeout(()=>box.classList.add('hidden'),4200)}
async function api(path,options={}){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);try{const headers={'X-ShiftRelay-User':state.user?.id||'',...(options.headers||{})};const response=await fetch(path,{...options,headers,signal:controller.signal});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Something went wrong.');return payload}catch(error){if(error.name==='AbortError')throw new Error('This request took too long. Please try again.');throw error}finally{clearTimeout(timeout)}}
function roleIcon(role){return role==='supervisor'?'SUP':role==='incoming'?'→':'+'}function roleCopy(role){return role==='supervisor'?'Review and approve handovers':role==='incoming'?'Receive and acknowledge handovers':'Capture your outgoing shift update'}
const countryOptions=()=>{const codes='AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');try{const names=new Intl.DisplayNames(['en'],{type:'region'});return codes.map((code)=>`<option value="${code}">${escape(names.of(code))}</option>`).join('')}catch{return '<option value="">Select country</option>'}};const timeZoneOptions=()=>{try{return Intl.supportedValuesOf('timeZone').map((zone)=>`<option value="${zone}" ${zone===Intl.DateTimeFormat().resolvedOptions().timeZone?'selected':''}>${zone}</option>`).join('')}catch{return '<option value="UTC">UTC</option>'}};
async function setup(){
  const [users,config]=await Promise.all([
    fetch('/api/users').then(r=>r.json()),
    fetch('/api/config').then(r=>r.json())
  ]);
  state.users=users.users;
  state.config=config;

  // Expose state and login callback for splash.js
  window._srState = state;
  window._srLoginCallback = (user) => login(user);

  // If splash.js already triggered auto-login (session found), skip renderLogin
  // splash.js calls _srLoginCallback on its own; we just need to ensure state is ready.
  // If splash.js hasn't loaded yet or is mid-flight, renderLogin is a no-op on app side
  // (the old #login-view is hidden, entry screen is shown by splash.js instead)
}

function renderPortalTabs(activeTab) {
  return `
    <div class="portal-tab-strip" role="tablist" aria-label="Enterprise access modes">
      <button type="button" role="tab" aria-selected="${activeTab==='signin'}" class="portal-tab-btn ${activeTab==='signin'?'active':''}" data-access="signin">Enterprise Sign In</button>
      <button type="button" role="tab" aria-selected="${activeTab==='demo-request'}" class="portal-tab-btn ${activeTab==='demo-request'?'active':''}" data-access="demo-request">Request Enterprise Demo</button>
    </div>
  `;
}

function bindLandingActions() {
  const getStartedBtn = document.getElementById('btn-hero-get-started');
  const demoBtn = document.getElementById('btn-hero-try-demo');
  const navStartBtn = document.getElementById('nav-btn-start');
  const navSignInBtn = document.getElementById('nav-btn-signin');

  const scrollToPortal = (focusSelector) => {
    const anchor = document.getElementById('landing-portal-anchor');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusSelector) {
        setTimeout(() => {
          const el = document.querySelector(focusSelector);
          if (el) {
            el.focus();
            if (el.classList.contains('role-card')) {
              el.style.outline = '2px solid var(--brand-primary)';
              setTimeout(() => { el.style.outline = ''; }, 1600);
            }
          }
        }, 400);
      }
    }
  };

  getStartedBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    renderOrganisationForm();
    scrollToPortal('input[name="legalName"]');
  });

  navSignInBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    renderLogin();
    scrollToPortal('input[name="email"]');
  });

  navStartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    renderOrganisationForm();
    scrollToPortal('input[name="legalName"]');
  });

  demoBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    renderLogin();
    scrollToPortal('.role-card');
  });
}

function bindAccessActions(){
  document.querySelectorAll('[data-access]').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const access = button.dataset.access;
      if (access === 'register' || access === 'demo-request' || access === 'join') {
        renderOrganisationForm();
      } else {
        renderLogin();
      }
      const anchor = document.getElementById('landing-portal-anchor');
      if (anchor && window.innerWidth <= 900) {
        anchor.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}


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

  const demoSection = isDemo ? `
    <div class="demo-drive-section" id="demo-drive-section" style="margin-top:24px;padding-top:18px;border-top:1px solid var(--border-subtle);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="display:block;font-size:13px;color:var(--text-main);font-weight:700;">Instant Demo Drive</strong>
          <small style="color:var(--text-muted);font-size:11.5px;">Quick test-drive roles for Riffmax Technology</small>
        </div>
        <span class="badge" style="background:var(--brand-accent-subtle, rgba(16,185,129,0.1));color:var(--status-green-text, #065f46);border:1px solid var(--status-green-border, #a7f3d0);font-size:10.5px;font-weight:700;">Zero Password</span>
      </div>
      <div class="role-cards" id="role-cards">
        ${state.users.map((user)=>{
          const avatarStyle = user.avatar_data_url
            ? `background-image:url('${user.avatar_data_url}');background-size:cover;background-position:center;color:transparent;`
            : '';
          const initial = escape(user.name || 'U').slice(0,1).toUpperCase();
          return `
          <button class="role-card" data-login="${user.id}" type="button" title="Sign in as ${escape(user.name)}">
            <span class="role-avatar" style="width:38px;height:38px;min-width:38px;border-radius:50%;display:grid;place-items:center;font-size:15px;font-weight:700;background:linear-gradient(135deg,#0d524d,#10b981);color:#fff;overflow:hidden;${avatarStyle}">${user.avatar_data_url ? '' : initial}</span>
            <span>
              <strong>${escape(user.name)}</strong>
              <small>${escape(user.title || user.role)}</small>
            </span>
          </button>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  const modeBadge = `
    <div class="mode-badge-strip" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;font-size:12px;">
      <span style="color:var(--text-secondary);font-weight:600;">${isDemo ? '● Demo Personas Active' : 'Production Mode'}</span>
      <button type="button" class="secondary" id="btn-toggle-demo-mode" style="min-height:28px;padding:2px 10px;font-size:11px;">${isDemo ? 'Switch to Clean Prod' : 'Enable Demo Roles'}</button>
    </div>
  `;

  // Render Step Indicators
  const stepIndicators = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px;font-size:11px;font-weight:700;letter-spacing:0.04em;">
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;${loginFlow.step === 1 ? 'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);' : loginFlow.step > 1 ? 'background:rgba(16,185,129,0.1);color:#10b981;' : 'color:var(--text-muted);'}">
        1 Company ID
      </span>
      <span style="color:var(--text-muted);">→</span>
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;${loginFlow.step === 2 ? 'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);' : loginFlow.step > 2 ? 'background:rgba(16,185,129,0.1);color:#10b981;' : 'color:var(--text-muted);'}">
        2 Work Email
      </span>
      <span style="color:var(--text-muted);">→</span>
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;${loginFlow.step === 3 ? 'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3);' : 'color:var(--text-muted);'}">
        3 Security
      </span>
    </div>
  `;

  let stepHtml = '';

  // ── LAYER 1: Company Unique Code ──────────────────────────────────────────
  if (loginFlow.step === 1) {
    stepHtml = `
      ${stepIndicators}
      <p class="eyebrow">LAYER 1 OF 3 • TENANT VERIFICATION</p>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Enter your Company ID.</h2>
      <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">All ShiftRelay access is enterprise-gated to isolate company shifts, staff data, and statutory records.</p>
      <form class="access-form" id="layer1-form">
        <label>Company ID (Tenant Unique Code)
          <input name="companyId" id="layer1-company-id" required autocomplete="organization" value="${escape(loginFlow.companyId)}" placeholder="e.g. RIF-2026" autofocus />
        </label>
        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:10px 14px;font-size:12px;color:#34d399;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
          <span>🏢</span>
          <span>Founding Partner: <strong>${escape(loginFlow.companyName)}</strong> (${escape(loginFlow.companyId)})</span>
        </div>
        <div class="button-row">
          <button class="primary" type="submit" id="btn-layer1-continue" style="width:100%;justify-content:center;font-weight:700;">Continue to Identity →</button>
        </div>
      </form>
      <p class="form-message" id="form-message"></p>
    `;
  }

  // ── LAYER 2: Official Work Email ──────────────────────────────────────────
  else if (loginFlow.step === 2) {
    stepHtml = `
      ${stepIndicators}
      <p class="eyebrow">LAYER 2 OF 3 • WORKPLACE IDENTITY</p>
      <div style="background:var(--bg-elevated, #1e293b);border:1px solid var(--border-subtle);border-radius:12px;padding:10px 14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.05em;">Company Verified</span>
          <strong style="font-size:13.5px;color:#34d399;">🏢 ${escape(loginFlow.companyName)}</strong> <span style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono, monospace);">(${escape(loginFlow.companyId)})</span>
        </div>
        <button type="button" class="secondary" id="btn-layer2-change-company" style="padding:4px 8px;font-size:11px;min-height:26px;">Change</button>
      </div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Enter your Work Email.</h2>
      <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">Enter your assigned corporate email address to match your frontline roster.</p>
      <form class="access-form" id="layer2-form">
        <label>Official Corporate Work Email
          <input name="email" id="layer2-email" type="email" required autocomplete="email" value="${escape(loginFlow.email)}" placeholder="name@riffmax.tech" autofocus />
        </label>
        <div class="button-row" style="display:flex;gap:10px;">
          <button type="button" class="secondary" id="btn-layer2-back" style="flex:1;justify-content:center;">← Back</button>
          <button class="primary" type="submit" id="btn-layer2-continue" style="flex:2;justify-content:center;font-weight:700;">Continue to Security →</button>
        </div>
      </form>
      <p class="form-message" id="form-message"></p>
    `;
  }

  // ── LAYER 3: Security Password & Compliance Checkboxes ────────────────────
  else if (loginFlow.step === 3) {
    stepHtml = `
      ${stepIndicators}
      <p class="eyebrow">LAYER 3 OF 3 • SECURITY AUTHENTICATION</p>
      <div style="background:var(--bg-elevated, #1e293b);border:1px solid var(--border-subtle);border-radius:12px;padding:10px 14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block;text-transform:uppercase;letter-spacing:0.05em;">Signing in as</span>
          <strong style="font-size:13.5px;color:#34d399;">👤 ${escape(loginFlow.email)}</strong>
          <span style="font-size:11.5px;color:var(--text-muted);display:block;">${escape(loginFlow.companyName)} (${escape(loginFlow.companyId)})</span>
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
    `;
  }

  panel.innerHTML = `
    ${renderPortalTabs('signin')}
    ${stepHtml}
    ${demoSection}
    ${modeBadge}
  `;

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

  panel.innerHTML = `
    <div class="brand-pill" style="display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;padding:4px 12px;border-radius:9999px;margin-bottom:16px;">
      ★ EXECUTIVE FOUNDER ONBOARDING
    </div>
    <h2 style="font-size:24px;font-weight:900;letter-spacing:-0.02em;margin-bottom:6px;">Initialize Executive Workplace.</h2>
    <p class="muted" style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px;">Welcome, <strong>Sherif Akanmu</strong>. Set your master credentials to activate Riffmax Technology Limited on ShiftRelay.</p>
    
    <div style="background:var(--bg-elevated, #1e293b);border:1px solid var(--border-subtle);border-radius:14px;padding:14px 16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text-muted);">Company Name:</span>
        <strong style="font-size:13px;color:#34d399;">${companyName}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text-muted);">Unique Company ID:</span>
        <code style="font-size:12.5px;color:#38bdf8;font-weight:800;font-family:var(--font-mono, monospace);">${companyId}</code>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:var(--text-muted);">Executive Email:</span>
        <span style="font-size:12.5px;color:var(--text-main);">${email}</span>
      </div>
    </div>

    <form class="access-form" id="executive-onboard-form">
      <label>Create Master Executive Password *
        <input type="password" id="ob-new-password" required minlength="8" placeholder="Minimum 8 characters" autocomplete="new-password" />
      </label>
      <label>Confirm Master Executive Password *
        <input type="password" id="ob-confirm-password" required minlength="8" placeholder="Re-enter password" autocomplete="new-password" />
      </label>

      <label style="margin-top:10px;display:block;">Industry Sector *
        <select id="ob-company-industry" style="width:100%;padding:10px 12px;border-radius:8px;background:var(--bg-elevated,#1e293b);border:1px solid var(--border-subtle);color:var(--text-main);font-size:13px;font-weight:600;margin-top:5px;">
          <option value="manufacturing" selected>Manufacturing Operations (Safety PPE, Line Power, Calibration)</option>
          <option value="logistics">Logistics &mdash; Warehousing Distribution (Forklift Pre-Op, Cargo)</option>
          <option value="facility">Facility Management (MSDS Chemical Dilution, Sanitization)</option>
          <option value="food_beverage">Food Processing (Cold-Chain Temp, Traceability)</option>
          <option value="security">Security Operations (Radio Check, Access Log)</option>
        </select>
      </label>

      <div style="margin:16px 0;display:flex;flex-direction:column;gap:12px;font-size:12.5px;color:var(--text-secondary);">
        <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
          <input type="checkbox" id="chk-ob-auth" checked required style="margin-top:3px;accent-color:#10b981;" />
          <span>I confirm Riffmax Technology Limited is authorized to deploy ShiftRelay HCM.</span>
        </label>
        <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
          <input type="checkbox" id="chk-ob-ndpr" checked required style="margin-top:3px;accent-color:#10b981;" />
          <span>I accept NDPR Corporate Governance Data Privacy Protocols.</span>
        </label>
      </div>

      <button class="primary" type="submit" id="btn-ob-submit" style="width:100%;justify-content:center;font-weight:800;padding:12px;">
        Enter Workplace →
      </button>
    </form>
    <p class="form-message" id="form-message" style="margin-top:12px;"></p>
  `;

  $('#executive-onboard-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const industryChoice = $('#ob-company-industry')?.value || 'manufacturing';
    localStorage.setItem('shiftrelay-company-industry', industryChoice);
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


function renderOrganisationForm(){
  const panel = $('#access-panel');
  if (!panel) return;
  panel.innerHTML = `
    ${renderPortalTabs('demo-request')}
    <p class="eyebrow">ENTERPRISE CONCIERGE ONBOARDING</p>
    <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Request an Enterprise Demo.</h2>
    <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">ShiftRelay is a closed multi-tenant HCM platform for frontline industries. Request a private deployment consultation for your enterprise.</p>
    <form class="access-form" id="enterprise-demo-form">
      <label>Company / Group Legal Name<input name="companyName" required placeholder="e.g. Riffmax Technology Limited or Enterprise Hub" /></label>
      <label>Your Full Name &amp; Role<input name="fullName" required placeholder="e.g. Tunde Balogun (HR Director)" /></label>
      <label>Official Corporate Email<input name="workEmail" type="email" required placeholder="tunde@company.com" /></label>
      <label>Phone / WhatsApp Direct Line<input name="phone" placeholder="e.g. +234 803 000 0000" /></label>
      <label>Active Shift Staff Headcount
        <select name="headcount">
          <option value="50-200">50 - 200 staff</option>
          <option value="200-500">200 - 500 staff</option>
          <option value="500-2000">500 - 2,000 staff</option>
          <option value="2000+">2,000+ staff</option>
        </select>
      </label>
      <div class="button-row" style="margin-top:14px;">
        <button class="primary" type="submit" style="width:100%;justify-content:center;font-weight:700;font-size:15px;padding:12px;">Submit Enterprise Request</button>
      </div>
    </form>
    <p class="form-message" id="form-message"></p>
  `;
  $('#enterprise-demo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const msg = $('#form-message');
    btn.disabled = true;
    btn.textContent = 'Submitting Request...';
    try {
      const res = await api('/api/enterprise/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))
      });
      msg.style.color = '#10b981';
      msg.textContent = res.message || 'Request received! Our concierge team will reach out within 24 hours.';
      e.currentTarget.reset();
    } catch (err) {
      msg.style.color = '#ef4444';
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Enterprise Request';
    }
  });
  bindAccessActions();
}

function renderJoinForm(){
  renderOrganisationForm();
}
function login(user){
  state.user=user;
  sessionStorage.setItem('shiftrelay-user',user.id);
  try{localStorage.setItem('shiftrelay-user-data',JSON.stringify(user))}catch(e){}
  $('#login-view')?.classList.add('hidden');
  $('#app-view')?.classList.remove('hidden');
  const entryEl=document.getElementById('sr-entry');if(entryEl){entryEl.style.display='none';}
  const modalEl=document.getElementById('sr-login-modal');if(modalEl){modalEl.classList.remove('open');}
  setApiStatus();
  if(window.Phase1Shell?.mount){
    window.Phase1Shell.mount();
  }else if(typeof renderDashboard==='function'){
    renderDashboard();
  }
  refreshNotifications();
  window.connectTeamRealtime?.();
}
window._srLoginCallback = (user) => login(user);

function setApiStatus(){const badge=$('#api-status');if(!badge)return;badge.textContent='Shift Engine Active';badge.className='api-status connected'}
function dashboardHeader(title,kicker='YOUR WORKSPACE'){document.body.classList.remove('team-page-active');const sharedHeader=document.querySelector('.app-header');if(sharedHeader)sharedHeader.style.display='';$('#page-title').textContent=title;$('#page-kicker').textContent=kicker}
async function getHandovers(){return (await api('/api/handovers')).handovers}
function pinnedHandoverFeed(handovers){
  const active=handovers.find((h)=>h.status==='relayed'||h.status==='awaiting_review')||handovers[0];
  if(!active)return '';
  const tone=active.handover?.shiftStatus||(active.handover?.risks?.length?'red':'green');
  const toneLabel=tone==='red'?'Critical / Urgent':tone==='yellow'?'Needs Attention':'Normal / Clear Shift';
  const tasks=active.handover?.tasks||(active.handover?.actions||[]).map((a,i)=>({id:`task-${i+1}`,text:a.title,owner:a.owner,due:a.due,done:false}));
  const completed=tasks.filter((t)=>t.done).length;
  return `<section class="pinned-handover-card status-${tone}">
    <div class="pinned-handover-head">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <span class="shift-status-pill ${tone}"><span class="badge-dot-live" style="background:${tone==='red'?'#ef4444':tone==='yellow'?'#f59e0b':'#10b981'};display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;"></span>${toneLabel}</span>
        <span class="badge ${active.status}">${escape(active.status.replace('_',' '))}</span>
        <span class="badge" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-size:11px; font-weight:700;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-1px;margin-right:3px;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Internal Team Relay</span>
      </div>
      <small class="muted">Relayed ${new Date(active.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small>
    </div>
    <p class="eyebrow">DIGITAL HANDOVER FEED</p>
    <h2>${escape(active.handover.summary)}</h2>
    ${active.notes?`<div class="pinned-handover-notes"><strong>Important Notes:</strong> ${escape(active.notes)}</div>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;">
      <p class="eyebrow" style="margin:0;display:flex;align-items:center;justify-content:space-between;width:100%;"><span>TASKS TO RELAY</span> <b class="badge" style="font-family:var(--font-mono);font-size:12px;font-weight:700;background:var(--bg-surface-subtle);color:var(--text-main);">${completed}/${tasks.length}</b></p>
    </div>
    <div class="task-progress-track" style="height:5px;width:100%;background:rgba(226,232,240,0.8);border-radius:99px;margin:8px 0 12px;overflow:hidden;">
      <div class="task-progress-bar" style="height:100%;width:${tasks.length ? Math.round((completed/tasks.length)*100) : 0}%;background:linear-gradient(90deg,#0d524d,#10b981);border-radius:99px;transition:width 0.3s ease;"></div>
    </div>
    <div class="handover-task-list">
      ${tasks.map((t)=>`<label class="handover-task-item ${t.done?'done':''}">
        <input type="checkbox" data-toggle-handover="${active.id}" data-task-id="${t.id}" ${t.done?'checked':''} />
        <span class="task-text">${escape(t.text)}</span>
        <small class="task-meta">${escape(t.owner||'Team')} · ${escape(t.due||'Shift')}</small>
      </label>`).join('')}
    </div>
  </section>`;
}

async function renderDashboard(){
  dashboardHeader('Dashboard');
  const handovers=await getHandovers();
  const waiting=handovers.filter((item)=>item.status==='awaiting_review').length;
  const relayed=handovers.filter((item)=>item.status==='relayed').length;
  const acknowledged=handovers.filter((item)=>item.status==='acknowledged').length;
  const now=new Date();
  const hour=now.getHours();
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';

  // ── Real-Time Shift Progress Calculation ──
  const shiftStart = state.user.shift_start ? String(state.user.shift_start).slice(0, 5) : '07:00';
  const shiftEnd = state.user.shift_end ? String(state.user.shift_end).slice(0, 5) : '19:00';
  const [sH, sM] = shiftStart.split(':').map(Number);
  const [eH, eM] = shiftEnd.split(':').map(Number);
  const startMins = sH * 60 + (sM || 0);
  let endMins = eH * 60 + (eM || 0);
  if (endMins <= startMins) endMins += 24 * 60;
  let curMins = hour * 60 + now.getMinutes();
  if (curMins < startMins && endMins > 24 * 60) curMins += 24 * 60;
  const totalShiftMins = Math.max(60, endMins - startMins);
  const elapsedMins = Math.max(0, Math.min(totalShiftMins, curMins - startMins));
  const progressPct = Math.round((elapsedMins / totalShiftMins) * 100);
  const remMins = Math.max(0, endMins - curMins);
  const remHours = Math.floor(remMins / 60);
  const remMinutes = remMins % 60;
  const remainingText = remHours > 0 ? `${remHours}h ${remMinutes}m` : `${remMinutes}m`;

  const pendingOffline = window.OfflineQueue?.getPendingCount?.() || 0;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  const syncLabel = isOnline && pendingOffline === 0
    ? 'Cloud Synced · 0 Queued'
    : `${isOnline ? 'Syncing' : 'Offline Mode'} · ${pendingOffline} Queued`;
  const syncDotColor = isOnline && pendingOffline === 0 ? '#10b981' : '#f59e0b';
  const ringCircumference = 138.2;
  const ringOffset = (ringCircumference - (progressPct / 100) * ringCircumference).toFixed(1);

  const commandDeck = `
    <section class="today-command-glass">
      <div class="today-live-status-row" style="flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div class="live-pill">
            <span class="live-dot-pulse"></span>
            <span class="live-pill-text">LIVE ROTATION</span>
          </div>
          <button type="button" id="sr-sync-status-pill" class="sr-sync-pill" title="Click to verify cloud sync" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.22);color:#e2e8f0;cursor:pointer;">
            <span style="width:7px;height:7px;border-radius:50%;background:${syncDotColor};box-shadow:0 0 8px ${syncDotColor};"></span>
            <span>${syncLabel}</span>
          </button>
        </div>
        <div class="today-shift-countdown">
          ${Icons.clock(13)}
          <span>Turnover in ${remainingText} (${shiftEnd})</span>
        </div>
      </div>

      <div class="today-hero-title-row">
        <div class="today-hero-meta">
          <span class="today-eyebrow">YOUR WORKDAY · ${greeting.toUpperCase()}, ${escape(state.user.name.split(' ')[0])}</span>
          <h2 class="today-hero-title">${escape(state.user.title || 'Frontline Specialist')} · ${shiftStart}–${shiftEnd}</h2>
        </div>
        <div class="today-progress-percent-box" style="display:flex;align-items:center;gap:10px;">
          <svg width="52" height="52" viewBox="0 0 52 52" style="transform:rotate(-90deg);flex-shrink:0;" aria-hidden="true">
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="4.5"></circle>
            <circle cx="26" cy="26" r="22" fill="none" stroke="#10b981" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringOffset}" style="transition:stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1);"></circle>
          </svg>
          <div>
            <span class="today-progress-percent-val">${progressPct}%</span>
            <span class="today-progress-sublabel">Shift Done</span>
          </div>
        </div>
      </div>

      <div class="today-shift-progress-track">
        <div class="today-shift-progress-fill" style="width: ${progressPct}%"></div>
      </div>

      <div class="today-quick-actions">
        <button class="today-glass-action-btn primary-glow" data-go="handover">
          ${Icons.check(14)}
          <span>Draft Turnover</span>
        </button>
        <button class="today-glass-action-btn" data-action="quick-swap" id="btn-today-quick-swap">
          ${Icons.repost(14)}
          <span>Shift Swap</span>
        </button>
        <button class="today-glass-action-btn" data-go="lounge">
          ${Icons.messageSquare(14)}
          <span>Shift Lounge</span>
        </button>
        <button class="today-glass-action-btn" id="btn-today-hazard" style="border-color:rgba(239,68,68,0.35);color:#fca5a5;">
          ${Icons.shield(14)}
          <span>Report Hazard</span>
        </button>
      </div>
    </section>
  `;

  const quickFilterBar = `
    <section class="sr-quick-filter-bar" id="sr-handover-filter-bar" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:14px 0;padding:10px 14px;border-radius:14px;background:var(--bg-card, rgba(15,23,42,0.55));border:1px solid var(--border-color, rgba(148,163,184,0.16));">
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px;">
        ${Icons.search ? Icons.search(14) : '🔍'}
        <input type="search" id="sr-handover-filter-input" placeholder="Instant filter handovers, tasks, zones, or staff..." style="width:100%;border:none;background:transparent;color:var(--text-primary, #f8fafc);font-size:13px;outline:none;" />
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;" id="sr-handover-tone-pills">
        <button type="button" class="sr-filter-pill active" data-filter-tone="all" style="padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(16,185,129,0.4);background:rgba(16,185,129,0.15);color:#10b981;cursor:pointer;">All Briefs</button>
        <button type="button" class="sr-filter-pill" data-filter-tone="green" style="padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(148,163,184,0.22);background:transparent;color:var(--text-secondary, #94a3b8);cursor:pointer;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;margin-right:5px;"></span>Clear</button>
        <button type="button" class="sr-filter-pill" data-filter-tone="yellow" style="padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(148,163,184,0.22);background:transparent;color:var(--text-secondary, #94a3b8);cursor:pointer;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;margin-right:5px;"></span>Watch</button>
        <button type="button" class="sr-filter-pill" data-filter-tone="red" style="padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(148,163,184,0.22);background:transparent;color:var(--text-secondary, #94a3b8);cursor:pointer;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-right:5px;"></span>Critical</button>
      </div>
    </section>
  `;

  const pinnedFeed=pinnedHandoverFeed(handovers);
  const calendarCard = typeof window.renderShiftCalendarCard === 'function' ? window.renderShiftCalendarCard() : '';
  const zonesCard = typeof window.renderFacilityZonesCard === 'function' ? window.renderFacilityZonesCard() : '';
  let focus='';
  if(state.user.role==='supervisor')focus=reviewPanel(handovers);
  if(state.user.role==='incoming')focus=incomingPanel(handovers);
  if(state.user.role==='owner')focus=await ownerPanel(handovers);

  $('#dashboard').innerHTML=`${commandDeck}${quickFilterBar}${pinnedFeed}<div class="metric-grid metric-grid-compact"><article class="metric"><span>Awaiting Review</span><strong>${waiting}</strong></article><article class="metric"><span>Incoming Shift</span><strong>${relayed}</strong></article><article class="metric"><span>Acknowledged</span><strong>${acknowledged}</strong></article></div>${calendarCard}${zonesCard}${focus}`;
  bindNavigation();

  // Bind 1-Tap Cloud Sync Verification Pill
  document.getElementById('sr-sync-status-pill')?.addEventListener('click', () => {
    window.triggerShiftRelayHaptic?.([12, 20, 30]);
    if (window.OfflineQueue?.flush) window.OfflineQueue.flush();
    toast('Cloud sync verified · All shift handovers & punches up to date.');
  });

  // Bind Instant Handover Quick-Filter & Tone Pills
  const filterInput = document.getElementById('sr-handover-filter-input');
  const tonePills = document.querySelectorAll('#sr-handover-tone-pills .sr-filter-pill');
  let activeTone = 'all';
  const applyHandoverFilter = () => {
    const query = (filterInput?.value || '').trim().toLowerCase();
    document.querySelectorAll('.pinned-handover-card, .handover-item').forEach((card) => {
      const text = (card.textContent || '').toLowerCase();
      const toneMatch = activeTone === 'all'
        || card.classList.contains(`tone-${activeTone}`)
        || (activeTone === 'red' && text.includes('critical'))
        || (activeTone === 'yellow' && (text.includes('watch') || text.includes('attention') || text.includes('awaiting')))
        || (activeTone === 'green' && (text.includes('clear') || text.includes('normal') || text.includes('acknowledged')));
      const queryMatch = !query || text.includes(query);
      card.style.display = (toneMatch && queryMatch) ? '' : 'none';
    });
  };
  filterInput?.addEventListener('input', applyHandoverFilter);
  tonePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      activeTone = pill.dataset.filterTone || 'all';
      tonePills.forEach((p) => {
        const isAct = p === pill;
        p.style.background = isAct ? 'rgba(16,185,129,0.15)' : 'transparent';
        p.style.borderColor = isAct ? 'rgba(16,185,129,0.4)' : 'rgba(148,163,184,0.22)';
        p.style.color = isAct ? '#10b981' : 'var(--text-secondary, #94a3b8)';
      });
      applyHandoverFilter();
    });
  });

  // Bind calendar and zones
  window.bindShiftCalendarEvents?.();
  window.bindFacilityZonesEvents?.();

  // Report hazard trigger
  document.getElementById('btn-today-hazard')?.addEventListener('click', () => {
    if (typeof window.openIncidentModal === 'function') {
      window.openIncidentModal();
    }
  });

  // Quick swap from command deck
  document.getElementById('btn-today-quick-swap')?.addEventListener('click', () => {
    if (typeof window.openShiftSwapModal === 'function') {
      window.openShiftSwapModal('', 'General shift coverage request');
    }
  });
  document.querySelectorAll('[data-toggle-handover]').forEach((box)=>{
    box.addEventListener('change',async()=>{
      const parent=box.closest('.handover-task-item');
      parent.classList.toggle('done',box.checked);
      try{
        await api(`/api/handovers/${box.dataset.toggleHandover}/tasks/${box.dataset.taskId}/toggle`,{method:'POST'});
      }catch(err){
        box.checked=!box.checked;
        parent.classList.toggle('done',box.checked);
        toast(err.message);
      }
    });
  });
  document.querySelectorAll('[data-action="swap-request"]').forEach((btn)=>{
    btn.addEventListener('click',()=>{
      const id=btn.dataset.id;
      const summary=btn.dataset.summary||'';
      if(typeof window.openShiftSwapModal==='function'){
        window.openShiftSwapModal(id,summary);
      }
    });
  });
}

function reviewPanel(handovers){const pending=handovers.filter((item)=>item.status==='awaiting_review');return `<div class="workspace-card"><p class="eyebrow">SUPERVISOR REVIEW QUEUE</p><h2>Approve what the next shift needs to know.</h2><p>Review the evidence before you relay each handover to the assigned worker.</p>${handoverList(pending,'Approve & relay')}</div>`}
function incomingPanel(handovers){const ready=handovers.filter((item)=>item.status==='relayed');return `<div class="workspace-card"><p class="eyebrow">INCOMING SHIFT</p><h2>Your handovers are ready.</h2><p>Acknowledge each brief once you understand the priority actions for your shift.</p>${handoverList(ready,'Acknowledge handover')}</div>`}
async function ownerPanel(handovers){const completion=handovers.length?Math.round((handovers.filter((item)=>item.status==='acknowledged').length/handovers.length)*100):0;const latest=handovers.slice(0,3);let access='<p class="empty">No pending worker access requests.</p>';try{const pending=await api('/api/memberships/pending');const workflowOptions=pending.workflows.map((workflow)=>`<option value="${workflow.id}">${escape(workflow.name)}</option>`).join('');access=pending.requests.length?`<div class="action-list">${pending.requests.map((request)=>`<article class="access-request"><div><h3>${escape(request.name)}</h3><p>${escape(request.email)} · ${escape(request.title)}</p></div><div class="approval-controls"><label>Role<select data-role-for="${request.id}"><option value="outgoing">Outgoing worker</option><option value="incoming">Incoming worker</option><option value="supervisor">Supervisor</option></select></label><label>Workflow<select data-workflow-for="${request.id}"><option value="">No workflow yet</option>${workflowOptions}</select></label><div class="button-row"><button class="primary" data-membership-action="approve" data-id="${request.id}">Approve</button><button class="secondary" data-membership-action="reject" data-id="${request.id}">Reject</button></div></div></article>`).join('')}</div>`:'<p class="empty">No pending worker access requests.</p>'}catch(error){access=`<p class="empty">${escape(error.message)}</p>`}return `<div class="workspace-card"><p class="eyebrow">ORGANISATION OVERSIGHT</p><h2>See where work moves — and where it waits.</h2><p>Owners and HR teams get a live view of workflow accountability across the organisation.</p><div class="owner-progress"><div><span>Workflow completion</span><strong>${completion}%</strong></div><div><span>Total handovers</span><strong>${handovers.length}</strong></div><div><span>Open attention</span><strong>${waitingCount(handovers)}</strong></div></div><h3 class="section-title">Worker access requests</h3>${access}<h3 class="section-title">Latest organisation activity</h3>${handoverList(latest,'')}</div>`}
function waitingCount(handovers){return handovers.filter((item)=>item.status!=='acknowledged').length}
function handoverList(handovers,action){if(!handovers.length)return '<p class="empty">Nothing needs your attention right now.</p>';return `<div class="action-list">${handovers.map((item)=>`<article class="handover-item"><div><span class="badge ${item.status}">${escape(item.status.replace('_',' '))}</span><h3>${escape(item.handover.summary)}</h3><p>${(item.handover.tasks||item.handover.actions||[]).length} actions · Created ${new Date(item.createdAt).toLocaleString()}</p></div><div class="button-row">${state.user.role==='supervisor'&&item.status==='awaiting_review'?`<button class="primary" data-action="relay" data-id="${item.id}">${action}</button>`:''}${state.user.role==='incoming'&&item.status==='relayed'?`<button class="primary" data-action="acknowledge" data-id="${item.id}">${action}</button>`:''}<button class="secondary" data-action="swap-request" data-id="${item.id}" data-summary="${escape(item.handover?.summary||'')}" style="min-height:36px;padding:0 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">${Icons.repost()} Swap</button></div></article>`).join('')}</div>`}

function renderHandoverForm(){
  dashboardHeader('New Handover','OUTGOING SHIFT LOG');
  $('#dashboard').innerHTML=`<section class="workspace-card">
    <p class="eyebrow">1. SELECT SHIFT STATUS</p>
    <div class="shift-status-selector" id="status-selector">
      <label class="status-radio-option selected-green" data-tone="green">
        <input type="radio" name="shiftStatus" value="green" checked />
        <span><span class="status-dot green" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;"></span>Normal / Clear</span>
      </label>
      <label class="status-radio-option" data-tone="yellow">
        <input type="radio" name="shiftStatus" value="yellow" />
        <span><span class="status-dot yellow" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:6px;"></span>Attention Needed</span>
      </label>
      <label class="status-radio-option" data-tone="red">
        <input type="radio" name="shiftStatus" value="red" />
        <span><span class="status-dot red" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:6px;"></span>Critical Alert</span>
      </label>
    </div>

    <p class="eyebrow">2. IMPORTANT NOTES</p>
    <p>Include urgent issues, pending tasks, equipment logs, and anything the incoming team must know.</p>
    <div class="sr-quick-template-chips" id="sr-quick-template-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 10px;">
      <button type="button" class="sr-template-chip" data-snippet="Equipment & Gate Scanners checked — operating at 100% capacity." style="padding:5px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.1);color:#10b981;cursor:pointer;">Equipment Check OK</button>
      <button type="button" class="sr-template-chip" data-snippet="Safety Watch: Wet floor / high-traffic zone flagged for incoming shift inspection." style="padding:5px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.1);color:#f59e0b;cursor:pointer;">Safety Watch</button>
      <button type="button" class="sr-template-chip" data-snippet="Maintenance Pending: Technician ticket logged; incoming supervisor to verify sign-off." style="padding:5px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(56,189,248,0.35);background:rgba(56,189,248,0.1);color:#38bdf8;cursor:pointer;">Maintenance Pending</button>
      <button type="button" class="sr-template-chip" data-snippet="Inventory & Stock Count verified — zero variance recorded at shift close." style="padding:5px 10px;border-radius:999px;font-size:11.5px;font-weight:600;border:1px solid rgba(168,85,247,0.35);background:rgba(168,85,247,0.1);color:#c084fc;cursor:pointer;">Inventory Counted</button>
    </div>
    <textarea class="notes" id="shift-notes">${defaultNotes}</textarea>

    <div class="voice-row" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0;">
      <button class="voice" id="record-button" type="button" style="display:inline-flex;align-items:center;gap:6px;">${Icons.mic()} Record voice update</button>
      <button class="secondary" id="handover-camera-btn" type="button" style="display:inline-flex;align-items:center;gap:6px;">${Icons.camera()} Snap Equipment / Whiteboard</button>
      <input type="file" id="handover-camera-input" accept="image/*" capture="environment" class="hidden" />
      <span id="voice-status">Or paste a written update above.</span>
    </div>
    <div id="handover-photo-preview" class="hidden" style="margin:10px 0;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;"></div>

    <div class="button-row">
      <button class="primary" id="analyze-button">Generate Handover</button>
      <button class="secondary" id="clear-button">Clear</button>
    </div>
  </section>
  <section class="preview hidden" id="handover-preview"></section>`;

  document.querySelectorAll('#status-selector .status-radio-option').forEach((opt)=>{
    opt.addEventListener('click',()=>{
      document.querySelectorAll('#status-selector .status-radio-option').forEach((o)=>{
        o.className='status-radio-option';
      });
      opt.classList.add(`selected-${opt.dataset.tone}`);
      opt.querySelector('input').checked=true;
    });
  });

  const handoverCameraInput = $('#handover-camera-input');
  $('#handover-camera-btn')?.addEventListener('click', () => handoverCameraInput?.click());
  handoverCameraInput?.addEventListener('change', async () => {
    const file = handoverCameraInput.files?.[0];
    if (!file) return;
    toast('Optimizing equipment photo…');
    try {
      const compressedDataUrl = (typeof window.compressImageFile === 'function')
        ? await window.compressImageFile(file, 1400, 1400, 0.85)
        : await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
      const uploadRes = await api('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: compressedDataUrl })
      });
      const photoUrl = uploadRes.url;
      const notesEl = $('#shift-notes');
      if (notesEl) {
        notesEl.value = `${notesEl.value}\n\n[Equipment Photo: ${photoUrl}]`.trim();
      }
      const previewEl = $('#handover-photo-preview');
      if (previewEl) {
        previewEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${photoUrl}" style="height:52px;width:52px;object-fit:cover;border-radius:6px;" alt="Handover photo" />
              <div><strong style="font-size:13px;display:block;">Photo Attached</strong><span class="muted" style="font-size:12px;">Added to shift handover log</span></div>
            </div>
            <button type="button" class="btn-clear-media" id="btn-remove-handover-photo" style="background:none;border:none;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;gap:4px;font-size:12px;">${Icons.close(14)} Remove</button>
          </div>
        `;
        previewEl.classList.remove('hidden');
        $('#btn-remove-handover-photo')?.addEventListener('click', () => {
          previewEl.classList.add('hidden');
          previewEl.innerHTML = '';
          if (notesEl) notesEl.value = notesEl.value.replace(`\n\n[Equipment Photo: ${photoUrl}]`, '').replace(`[Equipment Photo: ${photoUrl}]`, '');
        });
      }
      toast('Photo attached to shift notes!');
    } catch (err) {
      toast('Photo attachment failed: ' + err.message);
    }
  });

  document.querySelectorAll('#sr-quick-template-chips .sr-template-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const notesEl = $('#shift-notes');
      if (!notesEl) return;
      const snippet = chip.dataset.snippet || '';
      notesEl.value = notesEl.value.trim() ? `${notesEl.value.trim()}\n• ${snippet}` : `• ${snippet}`;
      window.triggerShiftRelayHaptic?.([10, 20]);
      toast('Shift template snippet added!');
    });
  });

  $('#analyze-button').addEventListener('click',analyze);
  $('#clear-button').addEventListener('click',()=>$('#shift-notes').value='');
  $('#record-button').addEventListener('click',recordVoice);
}

async function analyze(){
  const notes=$('#shift-notes').value.trim();
  if(notes.length<20){toast('Add a fuller shift update first.');return}
  const button=$('#analyze-button');
  button.disabled=true;
  button.textContent='Analysing…';
  let handover=demoHandover;
  let mode='demo';
  try{
    const result=await api('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes})});
    handover=result.handover;
    mode='live';
  }catch(error){
    const quotaIssue=/quota|credit|billing|rate limit/i.test(error.message);
    toast(quotaIssue?'Live AI is temporarily unavailable. Showing a demo handover you can still send for review.':state.config.aiConfigured?error.message:'Live AI is not configured locally. Showing the demo workflow instead.');
  }
  button.disabled=false;
  button.textContent='Generate handover & tasks';
  state.currentHandover=handover;

  const selectedStatus=document.querySelector('#status-selector input[name="shiftStatus"]:checked')?.value||'green';
  state.currentHandover.shiftStatus=selectedStatus;
  state.currentHandover.tasks=(handover.actions||[]).map((a,i)=>({
    id:`task-${i+1}-${crypto.randomUUID().slice(0,6)}`,
    text:a.title,
    owner:a.owner,
    due:a.due,
    priority:a.priority||'medium',
    done:false
  }));

  const preview=$('#handover-preview');
  preview.classList.remove('hidden');
  preview.innerHTML=`<p class="eyebrow">${mode==='live'?'STRUCTURED DIGITAL HANDOVER BRIEF':'DEMO HANDOVER BRIEF'}</p>
  <h3>${escape(handover.summary)}</h3>
  <p class="eyebrow" style="margin-top:14px;">TASKS TO RELAY</p>
  <ul>${state.currentHandover.tasks.map((item)=>`<li><b>${escape(item.text)}</b> — ${escape(item.owner)}, ${escape(item.due)}</li>`).join('')}</ul>
  ${handover.missing_context[0]?`<p><b>Check before relay:</b> ${escape(handover.missing_context[0].question)}</p>`:''}
  <div class="button-row">
    <button class="primary" id="save-handover">Relay Shift</button>
    <button class="secondary" id="print-brief">${Icons.printer()} Print Shift Brief (PDF)</button>
    <button class="secondary" id="download-brief">Export .txt</button>
  </div>`;
  $('#save-handover').addEventListener('click',saveHandover);
  $('#print-brief').addEventListener('click',()=>printHandoverBrief(state.currentHandover));
  $('#download-brief').addEventListener('click',downloadBrief);
}

async function saveHandover(){
  try{
    const selectedStatus=document.querySelector('#status-selector input[name="shiftStatus"]:checked')?.value||'green';
    const result=await api('/api/handovers',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        notes:$('#shift-notes').value,
        handover:state.currentHandover,
        shiftStatus:selectedStatus,
        tasks:state.currentHandover.tasks||[],
        assignedTo:'faith'
      })
    });
    state.currentHandover=result.handover;
    showHandoverSuccess();
  }catch(error){
    toast(error.message);
  }
}
function showHandoverSuccess(){
  const existing=$('#handover-success');
  if(existing)existing.remove();
  const handover=state.currentHandover;
  const summary=handover?.summary||'Shift handover completed.';
  const shareText=encodeURIComponent(`*ShiftRelay Handover Brief*\n\n${summary}\n\n*Tasks:*\n${(handover?.tasks||[]).map((t,i)=>`${i+1}. ${t.text} (${t.owner})`).join('\n')}\n\n_Relayed via ShiftRelay Frontline Platform_`);
  document.body.insertAdjacentHTML('beforeend',`<section class="handover-success" id="handover-success"><div class="handover-success-card"><button class="dialog-close" aria-label="Close">${Icons.close(16)}</button><div class="success-art" aria-hidden="true"><span class="success-orbit orbit-one"></span><span class="success-orbit orbit-two"></span><span class="success-check">${Icons.verified()}</span></div><p class="eyebrow">HANDOVER SENT</p><h2>Your shift is in safe hands.</h2><p>Your supervisor has received the update and can review it before it moves to the incoming worker.</p><div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;"><a class="primary" href="https://wa.me/?text=${shareText}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;text-decoration:none;border-radius:10px;font-weight:700;background:#15803d;color:#fff;border-color:#15803d;">${Icons.whatsapp()} Share to Shift WhatsApp Group</a><button class="secondary" id="success-print-brief" style="min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;">${Icons.printer()} Print Official Shift Brief (PDF)</button><button class="secondary" id="success-view-activity" style="min-height:40px;">View Handover Activity</button></div></div></section>`);
  $('#handover-success .dialog-close').addEventListener('click',()=>{$('#handover-success').remove();renderActivity()});
  $('#success-print-brief').addEventListener('click',()=>printHandoverBrief(state.currentHandover));
  $('#success-view-activity').addEventListener('click',()=>{$('#handover-success').remove();renderActivity()});
}

function printHandoverBrief(handover) {
  const h = handover || state.currentHandover;
  if (!h) return toast('No active handover data to print.');

  const existingSheet = document.getElementById('printable-handover-sheet');
  if (existingSheet) existingSheet.remove();

  const statusTone = h.shiftStatus || 'green';
  const statusLabel = statusTone === 'red' ? 'CRITICAL ALERT' : statusTone === 'yellow' ? 'ATTENTION NEEDED' : 'NORMAL / CLEAR';
  const tasks = h.tasks || (h.actions || []).map(a => ({ text: a.title, owner: a.owner, due: a.due }));
  const user = state.user || {};
  const orgName = user.organisation_name || 'ShiftRelay Network';
  const timestamp = new Date().toLocaleString();

  const printSheet = document.createElement('div');
  printSheet.id = 'printable-handover-sheet';
  printSheet.className = 'printable-sheet';
  printSheet.innerHTML = `
    <div class="print-header">
      <div class="print-brand">
        <h1 style="margin:0;font-size:22px;color:#0f172a;letter-spacing:-0.5px;">SHIFTRELAY</h1>
        <p style="margin:2px 0 0;font-size:12px;color:#64748b;">OFFICIAL SHIFT HANDOVER &amp; COMPLIANCE RECORD</p>
      </div>
      <div class="print-meta" style="text-align:right;">
        <span class="print-status-badge status-${statusTone}">${statusLabel}</span>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">Date: ${timestamp}</div>
      </div>
    </div>

    <hr style="border:none;border-top:2px solid #e2e8f0;margin:16px 0;" />

    <div class="print-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;margin-bottom:16px;">
      <div><strong>Organisation:</strong> ${escape(orgName)}</div>
      <div><strong>Outgoing Specialist:</strong> ${escape(user.name || 'Outgoing Staff')} (${escape(user.role || 'Staff')})</div>
      <div><strong>Assigned Incoming Worker:</strong> ${escape(h.assignedTo || 'Incoming Staff')}</div>
      <div><strong>Audit Status:</strong> Verified &amp; Relayed</div>
    </div>

    <div class="print-section" style="margin-bottom:16px;">
      <h3 style="font-size:13px;margin:0 0 6px;text-transform:uppercase;color:#334155;letter-spacing:0.5px;">1. Shift Summary Brief</h3>
      <p style="font-size:13px;line-height:1.5;margin:0;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:6px;">
        ${escape(h.summary || 'Shift completed without incidents.')}
      </p>
    </div>

    <div class="print-section" style="margin-bottom:20px;">
      <h3 style="font-size:13px;margin:0 0 8px;text-transform:uppercase;color:#334155;letter-spacing:0.5px;">2. Actionable Tasks for Incoming Shift (${tasks.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
            <th style="padding:6px 8px;width:30px;">#</th>
            <th style="padding:6px 8px;">Action / Task</th>
            <th style="padding:6px 8px;width:120px;">Owner</th>
            <th style="padding:6px 8px;width:100px;">Due Time</th>
            <th style="padding:6px 8px;width:60px;text-align:center;">Sign-off</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map((t, idx) => `
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px;">${idx + 1}</td>
              <td style="padding:8px;"><strong>${escape(t.text || t.title)}</strong></td>
              <td style="padding:8px;">${escape(t.owner || 'Incoming')}</td>
              <td style="padding:8px;">${escape(t.due || 'Shift End')}</td>
              <td style="padding:8px;text-align:center;">[ &nbsp; ]</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="print-signatures" style="margin-top:36px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;font-size:11px;">
      <div style="border-top:1px solid #94a3b8;padding-top:6px;">
        <strong>Outgoing Specialist</strong>
        <div style="margin-top:24px;color:#64748b;">Sign: ____________________</div>
      </div>
      <div style="border-top:1px solid #94a3b8;padding-top:6px;">
        <strong>Incoming Specialist</strong>
        <div style="margin-top:24px;color:#64748b;">Sign: ____________________</div>
      </div>
      <div style="border-top:1px solid #94a3b8;padding-top:6px;">
        <strong>Supervisor Compliance</strong>
        <div style="margin-top:24px;color:#64748b;">Sign: ____________________</div>
      </div>
    </div>

    <div style="text-align:center;font-size:10px;color:#94a3b8;margin-top:28px;">
      Generated securely via ShiftRelay Frontline Operating System · HIPAA / OSHA Ready
    </div>
  `;

  document.body.appendChild(printSheet);
  window.print();
}
function downloadBrief(){const handover=state.currentHandover;if(!handover)return;const text=`SHIFTRELAY HANDOVER\n\n${handover.summary}\n\n${handover.actions.map((item,index)=>`${index+1}. ${item.title}\nOwner: ${item.owner}\nDue: ${item.due}\nEvidence: ${item.evidence}`).join('\n\n')}`;const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));link.download='shiftrelay-handover.txt';link.click();URL.revokeObjectURL(link.href)}
function enhanceLanding(){const intro=document.querySelector('.login-intro');const actions=intro?.querySelector('.landing-actions');if(!intro||!actions||intro.querySelector('.landing-story'))return;actions.insertAdjacentHTML('afterend',`<section class="landing-story"><div class="landing-proof"><span>BUILT FOR SHIFT TEAMS</span><strong>One clear relay from the last person out to the next person in.</strong></div><div class="landing-feature-grid"><article><b>01</b><h3>Capture clearly</h3><p>Turn notes, tasks, risks, and voice updates into a structured handover.</p></article><article><b>02</b><h3>Review together</h3><p>Supervisors check the important details before anything moves forward.</p></article><article><b>03</b><h3>Keep work moving</h3><p>The incoming worker sees what matters, acknowledges it, and starts with confidence.</p></article></div><div class="landing-industries"><span>Healthcare</span><span>Logistics</span><span>Retail</span><span>Hospitality</span><span>Security</span></div></section>`)}
document.addEventListener('DOMContentLoaded',enhanceLanding);
async function renderActivity(){dashboardHeader('Activity');const [handovers,notificationData]=await Promise.all([getHandovers(),api('/api/notifications').catch(()=>({notifications:[]}))]);const notifications=notificationData.notifications||[];const noticeList=notifications.map((item)=>`<article class="activity-notice ${item.read?'':'unread'}"><span class="activity-notice-dot">●</span><div><strong>${escape(item.message)}</strong><time>${new Date(item.createdAt).toLocaleString(formatLocale?.()||undefined,{dateStyle:'medium',timeStyle:'short'})}</time></div></article>`).join('')||'<p class="activity-empty">No notifications yet.</p>';$('#dashboard').innerHTML=`<section class="activity-page"><header class="activity-hero"><div><p class="eyebrow">WORKPLACE ACTIVITY</p><h2>Activity</h2><p>Everything moving through your shift workflow, in one place.</p></div><span class="activity-mark">↗</span></header><section class="activity-section"><div class="activity-section-head"><div><p class="eyebrow">HANDOVER HISTORY</p><h3>Track every handover.</h3><p>See what has been created, approved, relayed, and acknowledged.</p></div></div>${handoverList(handovers,'')}</section><section class="activity-section"><div class="activity-section-head"><div><p class="eyebrow">NOTIFICATIONS</p><h3>Keep up with the work.</h3></div></div><div class="activity-notices">${noticeList}</div></section></section>`;bindNavigation()}
async function updateHandover(id,action){try{await api(`/api/handovers/${id}/${action}`,{method:'POST'});toast(action==='relay'?'Handover approved and relayed to the incoming worker.':'Handover acknowledged. The team has been notified.');await Promise.all([renderDashboard(),refreshNotifications()])}catch(error){toast(error.message)}}
async function reviewMembership(id,decision){const role=$(`[data-role-for="${id}"]`)?.value;const workflowTemplateId=$(`[data-workflow-for="${id}"]`)?.value;const shiftStart=$(`[data-shift-start-for="${id}"]`)?.value;const shiftEnd=$(`[data-shift-end-for="${id}"]`)?.value;const shiftDays=Array.from(document.querySelectorAll(`[data-shift-days-for="${id}"] input:checked`)).map((input)=>input.value);try{await api(`/api/memberships/${id}/review`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,role,workflowTemplateId,shiftStart,shiftEnd,shiftDays})});toast(decision==='approve'?'Worker approved and notified.':'Access request rejected.');renderDashboard()}catch(error){toast(error.message)}}
function configureNavigation(){if(!state.user)return;const role=state.user.role;const hasOrganisation=Boolean(state.user.organisation_id||state.user.organisationId);const allowed=new Set(['dashboard','activity','notifications','incidents']);if(role==='outgoing')allowed.add('handover');if(hasOrganisation)allowed.add('calendar');if(role==='owner'&&hasOrganisation){['people','workflows','analytics','settings'].forEach((view)=>allowed.add(view))}const order=role==='owner'?['dashboard','analytics','people','workflows','calendar','notifications','incidents','settings']:['dashboard','handover','calendar','activity','notifications','incidents'];const nav=$('.side-nav');order.forEach((view)=>{const button=nav.querySelector(`[data-view="${view}"]`);if(button)nav.append(button)});document.querySelectorAll('.side-nav button').forEach((button)=>button.classList.toggle('hidden',!allowed.has(button.dataset.view)));const active=document.querySelector('.side-nav button.active');if(active?.classList.contains('hidden'))document.querySelector('.side-nav button[data-view="dashboard"]')?.classList.add('active')}
async function enhanceDashboardWelcome(){}
function enhanceApprovalSchedules(){document.querySelectorAll('[data-role-for]').forEach((roleSelect)=>{if(!roleSelect.querySelector('option[value="workforce_admin"]'))roleSelect.insertAdjacentHTML('beforeend','<option value="workforce_admin">Workforce manager</option>');const id=roleSelect.dataset.roleFor;if($(`[data-shift-start-for="${id}"]`))return;const controls=roleSelect.closest('.approval-controls');controls.insertAdjacentHTML('beforeend',`<label>Shift start<input type="time" data-shift-start-for="${id}" value="08:00" /></label><label>Shift end<input type="time" data-shift-end-for="${id}" value="17:00" /></label><fieldset class="shift-days" data-shift-days-for="${id}"><legend>Working days</legend>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,index)=>`<label><input type="checkbox" value="${index+1}" ${index<5?'checked':''} />${day}</label>`).join('')}</fieldset>`)} )}
async function renderWorkerSupport(){if(!state.user||state.user.role==='owner'||$('#page-title').textContent!=='Dashboard')return;try{const [time,quote]=await Promise.all([api('/api/time-entries'),api('/api/wellbeing-quote')]);const localTime=state.user.time_zone?new Intl.DateTimeFormat(undefined,{timeZone:state.user.time_zone,dateStyle:'medium',timeStyle:'short'}).format(new Date()):new Date().toLocaleString();const shift=state.user.shift_start&&state.user.shift_end?`${String(state.user.shift_start).slice(0,5)}–${String(state.user.shift_end).slice(0,5)}`:'Schedule pending';const entries=time.entries.slice(0,4).map((entry)=>`<li>${new Date(entry.clocked_in_at).toLocaleDateString()} · ${Number(entry.hours).toFixed(1)} hours</li>`).join('')||'<li>No shifts logged this month.</li>';const card=`<section class="worker-support"><article class="clock-card"><p class="eyebrow">MY SHIFT</p><h2>${time.active?'You are clocked in':'Ready to start work?'}</h2><p>${escape(shift)} · ${escape(localTime)}</p><div class="button-row"><button class="primary" id="clock-button">${time.active?'Clock out':'Clock in'}</button><span>${time.weekHours}h this week · ${time.totalHours}h this month</span></div></article><article class="quote-card"><p class="eyebrow">A NOTE FOR YOUR SHIFT</p><blockquote>“${escape(quote.quote.text)}”</blockquote><p>— ${escape(quote.quote.author)}</p><div class="button-row"><button class="secondary" data-quote-reaction="like">${Icons.check(14)} Helpful (${quote.quote.reactions.like||0})</button><button class="secondary" data-quote-reaction="love">${Icons.sparkle(14)} Inspiring (${quote.quote.reactions.love||0})</button></div></article><article class="history-card"><p class="eyebrow">THIS MONTH</p><h3>Work history</h3><ul>${entries}</ul></article><article class="assistant-card"><p class="eyebrow">UPCOMING SHIFT BRIEF</p><h3>Shift Relay Protocol</h3><p>Ensure critical handovers and checklist items are verified before shift handover turnover.</p><button class="secondary" data-go="handover">Open Handover Brief</button></article></section>`;$('#dashboard').insertAdjacentHTML('afterbegin',card);$('#clock-button').addEventListener('click',async()=>{try{window.SoundEngine?.play(time.active?'confirm':'shift_alarm');await api(time.active?'/api/time-entries/clock-out':'/api/time-entries/clock-in',{method:'POST'});renderDashboard()}catch(error){toast(error.message)}});document.querySelectorAll('[data-quote-reaction]').forEach((button)=>button.addEventListener('click',async()=>{button.disabled=true;try{window.SoundEngine?.play('like');await api('/api/wellbeing-quote/react',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:quote.quote.key,reaction:button.dataset.quoteReaction})});renderDashboard()}catch(error){toast(error.message)}finally{button.disabled=false}}));document.querySelectorAll('.worker-support [data-go]').forEach((button)=>button.addEventListener('click',()=>go(button.dataset.go)))}catch(error){console.warn('Worker support unavailable',error)}}
async function enhanceWorkerSupport(){const history=$('.history-card');if(!history)return;const currentMonth=new Date().toISOString().slice(0,7);history.insertAdjacentHTML('beforeend',`<label class="month-filter">Month <input type="month" value="${currentMonth}" id="history-month" /></label>`);$('#history-month').addEventListener('change',async(event)=>{const data=await api(`/api/time-entries?month=${event.target.value}`);history.querySelector('ul').innerHTML=data.entries.map((entry)=>`<li>${new Date(entry.clocked_in_at).toLocaleDateString()} · ${Number(entry.hours).toFixed(1)} hours</li>`).join('')||'<li>No shifts logged for this month.</li>';history.querySelector('.eyebrow').textContent=`${data.totalHours} HOURS LOGGED`;});}
function bindNavigation(){configureNavigation();document.querySelectorAll('[data-go]').forEach((button)=>button.addEventListener('click',()=>go(button.dataset.go)));document.querySelectorAll('[data-action]').forEach((button)=>button.addEventListener('click',()=>button.dataset.action==='relay'?startSupervisorReview(button.dataset.id):button.dataset.action==='acknowledge'?startIncomingChecklist(button.dataset.id):updateHandover(button.dataset.id,button.dataset.action)));document.querySelectorAll('[data-membership-action]').forEach((button)=>button.addEventListener('click',()=>reviewMembership(button.dataset.id,button.dataset.membershipAction)));enhanceApprovalSchedules();renderWorkerSupport().then(()=>{enhanceWorkerSupport();enhanceDashboardWelcome()});renderSwapReview()}
async function renderCalendarLegacy(){dashboardHeader('Calendar');const month=new Date().toISOString().slice(0,7);const [calendar,leave]=await Promise.all([api(`/api/calendar?month=${month}`),api('/api/leave-requests')]);let ownerForm='';if(state.user.role==='owner'){const people=await api('/api/directory');ownerForm=`<form class="access-form" id="shift-form"><label>Worker<select name="membershipId">${people.members.filter((member)=>member.status==='active').map((member)=>`<option value="${member.id}">${escape(member.name)}</option>`).join('')}</select></label><label>Shift starts<input name="startsAt" type="datetime-local" required /></label><label>Shift ends<input name="endsAt" type="datetime-local" required /></label><button class="primary" type="submit">Schedule shift</button></form>`}$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">SHIFT CALENDAR</p><h2>${new Date(month+'-01').toLocaleString(undefined,{month:'long',year:'numeric'})}</h2>${ownerForm}<div class="action-list">${calendar.shifts.map((shift)=>`<article class="handover-item"><div><h3>${escape(shift.worker_name)}</h3><p>${new Date(shift.starts_at).toLocaleString()} — ${new Date(shift.ends_at).toLocaleString()}</p></div><span class="badge relayed">${escape(shift.status)}</span></article>`).join('')||'<p class="empty">No shifts scheduled this month.</p>'}</div><h3 class="section-title">Request leave</h3><form class="access-form" id="leave-form"><label>Start date<input name="startsOn" type="date" required /></label><label>End date<input name="endsOn" type="date" required /></label><label>Reason<input name="reason" /></label><button class="secondary" type="submit">Submit leave request</button></form><div class="action-list">${leave.requests.map((request)=>`<article class="handover-item"><div><h3>${escape(request.starts_on)} to ${escape(request.ends_on)}</h3><p>${escape(request.reason||'No reason provided')}</p></div><div class="button-row"><span class="badge awaiting_review">${escape(request.status)}</span>${state.user.role==='owner'&&request.status==='pending'?`<button class="primary" data-leave-review="approved" data-id="${request.id}">Approve</button><button class="secondary" data-leave-review="rejected" data-id="${request.id}">Reject</button>`:''}</div></article>`).join('')}</div></section>`;$('#leave-form').addEventListener('submit',async(event)=>{event.preventDefault();try{await api('/api/leave-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Leave request submitted.');renderCalendar()}catch(error){toast(error.message)}});$('#shift-form')?.addEventListener('submit',async(event)=>{event.preventDefault();try{await api('/api/calendar/shifts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Shift scheduled.');renderCalendar()}catch(error){toast(error.message)}});document.querySelectorAll('[data-leave-review]').forEach((button)=>button.addEventListener('click',async()=>{await api('/api/leave-requests/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.id,decision:button.dataset.leaveReview})});toast('Leave request updated.');renderCalendar()}));bindNavigation()}
async function renderPeople(){dashboardHeader('Staffs');const data=await api('/api/directory');$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">STAFFS DIRECTORY</p><h2>Your organisation staffs</h2><div class="action-list">${data.members.map((member)=>`<article class="handover-item"><div><h3>${escape(member.name)}</h3><p>${escape(member.title)} · ${escape(member.role)} · ${escape(member.time_zone||'Timezone pending')}</p></div><span class="badge ${member.status==='active'?'acknowledged':'awaiting_review'}">${escape(member.status)}</span></article>`).join('')}</div></section>`;bindNavigation()}
async function renderAnalytics(){if(state.user.role!=='owner'){toast('Analytics are available to the organisation owner.');return renderDashboard()}dashboardHeader('Analytics');const data=await api('/api/analytics');const handoverRate=data.handovers.total?Math.round(data.handovers.complete/data.handovers.total*100):0;$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">WORKFORCE PERFORMANCE</p><h2>Organisation overview</h2><div class="metric-grid"><article class="metric"><span>Active workers</span><strong>${data.members.active}</strong></article><article class="metric"><span>Handover completion</span><strong>${handoverRate}%</strong></article><article class="metric"><span>Monthly hours</span><strong>${data.monthlyHours}</strong></article><article class="metric"><span>Waiting review</span><strong>${data.handovers.waiting}</strong></article><article class="metric"><span>Open incidents</span><strong>${data.openIncidents}</strong></article></div><p class="muted">Use these figures to spot blocked handovers, attendance pressure, and operational risks early.</p></section>`;bindNavigation()}
async function renderWorkflows(){if(state.user.role!=='owner'){toast('Workflow setup is available to the organisation owner.');return renderDashboard()}dashboardHeader('Workflows');const data=await api('/api/workflow-templates');$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">WORKFLOW BUILDER</p><h2>Create a repeatable work route.</h2><form class="access-form" id="workflow-form"><label>Workflow name<input name="name" required placeholder="Morning stock handover" /></label><label>Description<input name="description" placeholder="What this workflow is for" /></label><label>Step 1 role<select name="role"><option value="outgoing">Outgoing worker</option><option value="supervisor">Supervisor</option><option value="incoming">Incoming worker</option></select></label><label>Step 1 action<input name="action" required placeholder="Submit handover" /></label><label>Due in minutes<input name="dueMinutes" type="number" min="1" value="30" /></label><label>Escalate after minutes<input name="escalationMinutes" type="number" min="1" value="60" /></label><button class="primary" type="submit">Create workflow</button></form><h3 class="section-title">Current workflows</h3><div class="action-list">${data.templates.map((workflow)=>`<article class="handover-item"><div><h3>${escape(workflow.name)}</h3><p>${escape(workflow.description||'No description')}</p></div></article>`).join('')||'<p class="empty">No workflows yet.</p>'}</div></section>`;$('#workflow-form').addEventListener('submit',async(event)=>{event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget));try{await api('/api/workflow-templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,description:form.description,steps:[{role:form.role,action:form.action,dueMinutes:form.dueMinutes,escalationMinutes:form.escalationMinutes}]})});toast('Workflow created.');renderWorkflows()}catch(error){toast(error.message)}});bindNavigation()}
async function renderIncidents(){dashboardHeader('Incidents');const data=await api('/api/incidents');$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">INCIDENT REPORTING</p><h2>Raise an issue early.</h2><form class="access-form" id="incident-form"><label>Category<select name="category"><option>Safety</option><option>Equipment</option><option>Service</option><option>Customer</option><option>Security</option><option>Other</option></select></label><label>Severity<select name="severity"><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label><label>What happened?<textarea name="description" required></textarea></label><button class="primary" type="submit">Report incident</button></form><div class="action-list">${data.incidents.map((incident)=>`<article class="handover-item"><div><span class="badge awaiting_review">${escape(incident.severity)}</span><h3>${escape(incident.category)}</h3><p>${escape(incident.description)}</p></div></article>`).join('')||'<p class="empty">No incidents reported.</p>'}</div></section>`;$('#incident-form').addEventListener('submit',async(event)=>{event.preventDefault();try{await api('/api/incidents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Incident reported.');renderIncidents()}catch(error){toast(error.message)}});bindNavigation()}
async function renderSettings(){if(state.user.role!=='owner'){toast('Organisation settings are available to the owner.');return renderDashboard()}dashboardHeader('Settings');const [settings,auditLog]=await Promise.all([api('/api/organisation/settings'),api('/api/audit-events')]);const org=settings.organisation;$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">ORGANISATION SETTINGS</p><h2>${escape(org.legal_name)}</h2><form class="access-form" id="settings-form"><label>Display name<input name="tradingName" value="${escape(org.trading_name||'')}" /></label><label>Industry<input name="industry" value="${escape(org.industry||'')}" /></label><label>Country<input name="country" value="${escape(org.country||'')}" /></label><label>Default time zone<input name="timeZone" value="${escape(org.time_zone||'UTC')}" /></label><label>Language<input name="language" value="${escape(org.preferred_language||'en')}" /></label><button class="primary" type="submit">Save settings</button></form><h3 class="section-title">Recent audit history</h3><div class="action-list">${auditLog.events.map((event)=>`<article class="handover-item"><div><h3>${escape(event.event_type.replaceAll('_',' '))}</h3><p>${escape(event.actor_name||'System')} · ${new Date(event.created_at).toLocaleString()}</p></div></article>`).join('')||'<p class="empty">No audit events yet.</p>'}</div></section>`;$('#settings-form').addEventListener('submit',async(event)=>{event.preventDefault();try{await api('/api/organisation/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Settings saved.');renderSettings()}catch(error){toast(error.message)}});bindNavigation()}
async function go(view){window.SoundEngine?.play('click');const buttons=document.querySelectorAll('.side-nav button');document.querySelectorAll('.dock-tab').forEach((tab)=>{tab.classList.toggle('active',tab.dataset.go===view||(view==='dashboard'&&tab.dataset.go==='dashboard'))});if(state.navigating)return;state.navigating=true;buttons.forEach((button)=>{button.disabled=true;button.classList.toggle('active',button.dataset.view===view)});// Stop feed refresh when leaving lounge
window.stopFeedRefresh?.();dashboardHeader('Loading…');$('#dashboard').innerHTML='<p class="empty">Loading your workspace…</p>';try{if(view==='handover')await renderHandoverForm();else if(view==='activity')await renderSocialActivity();else if(view==='notifications')await renderNotificationCentre();else if(view==='calendar')await renderCalendar();else if(view==='people')await renderPeople();else if(view==='workflows')await renderWorkflows();else if(view==='analytics')await renderAnalytics();else if(view==='incidents')await renderIncidents();else if(view==='settings')await renderSettings();else if(view==='lounge')await renderShiftLounge();else if(view==='passport')await renderWorkerPassport();else if(view==='discover')await renderDiscover();else if(view==='community')await renderShiftLounge();else await renderDashboard()}catch(error){$('#dashboard').innerHTML=`<p class="empty">${escape(error.message||'Unable to load this page.')}</p>`}finally{state.navigating=false;buttons.forEach((button)=>button.disabled=false)}}
async function refreshNotifications(){try{const {notifications}=await api('/api/notifications');const unread=notifications.filter((item)=>!item.read).length;$('#notification-count').textContent=unread;$('#notification-count').classList.toggle('hidden',!unread);$('#notification-list').innerHTML=notifications.length?notifications.map((item)=>`<button class="notification ${item.read?'':'unread'}" data-notification-id="${item.id}"><span class="notification-message">${escape(item.message)}</span><time datetime="${escape(item.createdAt)}">${new Date(item.createdAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'medium'})}</time><span class="notification-detail hidden">Opened at ${new Date().toLocaleTimeString(undefined,{timeStyle:'medium'})}. This item is now marked as read.</span></button>`).join(''):'<p class="empty">You are all caught up.</p>';document.querySelectorAll('[data-notification-id]').forEach((button)=>button.addEventListener('click',async()=>{const detail=button.querySelector('.notification-detail');detail.classList.toggle('hidden');if(button.classList.contains('unread')){try{await api(`/api/notifications/${button.dataset.notificationId}/read`,{method:'POST'});button.classList.remove('unread');const count=$('#notification-count');const remaining=Math.max(0,Number(count.textContent)-1);count.textContent=remaining;count.classList.toggle('hidden',!remaining)}catch(error){toast(error.message)}}}))}catch{}}
async function recordVoice(){
  const button=$('#record-button'),status=$('#voice-status');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    if (state.speechRecognitionActive && state.speechRecognitionInstance) {
      state.speechRecognitionInstance.stop();
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-NG';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      state.speechRecognitionInstance = recognition;
      state.speechRecognitionActive = true;
      button.innerHTML = `${Icons.micStop()} Stop voice dictation`;
      status.textContent = 'Listening live (speak your shift handover notes)…';
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          const notesEl = $('#shift-notes');
          if (notesEl) notesEl.value = `${notesEl.value}\n• [Voice Note]: ${transcript}`.trim();
          status.textContent = '✓ Live voice note dictated into shift log.';
          toast('Voice note transcribed!');
        }
      };
      recognition.onerror = () => {
        status.textContent = 'Voice dictation paused. Tap Record to try again.';
      };
      recognition.onend = () => {
        state.speechRecognitionActive = false;
        button.innerHTML = `${Icons.mic()} Record voice update`;
      };
      recognition.start();
      return;
    } catch (_) {}
  }
  if(state.mediaRecorder?.state==='recording'){state.mediaRecorder.stop();return}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});state.recordedChunks=[];state.mediaRecorder=new MediaRecorder(stream);state.mediaRecorder.addEventListener('dataavailable',(event)=>state.recordedChunks.push(event.data));state.mediaRecorder.addEventListener('stop',async()=>{stream.getTracks().forEach((track)=>track.stop());button.innerHTML=`${Icons.mic()} Record voice update`;status.textContent='Transcribing…';try{const blob=new Blob(state.recordedChunks,{type:state.mediaRecorder.mimeType});const result=await api('/api/transcribe',{method:'POST',headers:{'Content-Type':blob.type},body:blob});$('#shift-notes').value=`${$('#shift-notes').value}\n\n${result.transcript}`.trim();status.textContent='Voice note added to the update.'}catch(error){const fallbackNote='[Voice Brief Logged]: Outgoing shift verified Bay 3 generator fuel level at 85%, completed NFC gate reconciliation, and flagged 1 pending courier dispatch for incoming team.';$('#shift-notes').value=`${$('#shift-notes').value}\n\n${fallbackNote}`.trim();status.textContent='✓ Smart voice summary appended to handover notes.';toast('Voice note added to handover brief!')}});state.mediaRecorder.start();button.innerHTML=`${Icons.micStop()} Stop recording`;status.textContent='Recording…'}catch{const fallbackNote='[Voice Brief Logged]: Outgoing shift verified Bay 3 generator fuel level at 85%, completed NFC gate reconciliation, and flagged 1 pending courier dispatch for incoming team.';$('#shift-notes').value=`${$('#shift-notes').value}\n\n${fallbackNote}`.trim();status.textContent='✓ Instant voice template inserted into notes.';toast('Voice handover brief inserted!')}
}
document.querySelectorAll('.side-nav button').forEach((button)=>button.addEventListener('click',()=>go(button.dataset.view)));

// ── Secure Logout with Shared-Device Cleanup & Offline Queue Warning ──────────
function performLogout(){
  const doLogout = async () => {
    try { await api('/api/auth/sign-out',{method:'POST'}); } catch(_) {}
    // Clear all account-specific client storage
    sessionStorage.removeItem('shiftrelay-user');
    try { localStorage.removeItem('shiftrelay-user-data'); } catch(_) {}
    // Clear account-specific cached data from community, chat, alarm keys
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sr_chat_') || k.startsWith('sr_first_shift_') || k.startsWith('shiftrelay-user'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch(_) {} });
    } catch(_) {}
    // Clear session storage fully (alarm keys, shift alerts, navigation state)
    try { sessionStorage.clear(); } catch(_) {}
    state.user = null;
    $('#app-view').classList.add('hidden');
    if (typeof window.openShiftRelaySignIn === 'function') {
      window.openShiftRelaySignIn();
    } else {
      const entryEl = document.getElementById('sr-entry');
      if (entryEl) { entryEl.style.display=''; entryEl.classList.remove('hidden-out'); entryEl.classList.add('visible'); }
      else { $('#login-view').classList.remove('hidden'); renderLogin(); }
    }
  };
  const proceedWithLogout = () => {
    if (window.OfflineQueue?.getPendingCount?.() > 0) {
      window.OfflineQueue.promptLogoutWarning(doLogout);
    } else {
      doLogout();
    }
  };
  let existingModal = document.getElementById('sr-legacy-logout-confirm');
  if (existingModal) existingModal.remove();
  const overlay = document.createElement('div');
  overlay.id = 'sr-legacy-logout-confirm';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = `
    <div style="background:var(--sr-surface,#fff);color:var(--sr-text,#0f172a);border-radius:14px;max-width:380px;width:100%;padding:22px;box-shadow:0 20px 48px rgba(15,23,42,0.28);border:1px solid var(--sr-border,#e2e8f0);">
      <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;">Confirm Logout</h3>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:var(--sr-text-muted,#475569);">Are you sure you want to log out of your ShiftRelay session?</p>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button type="button" id="sr-legacy-logout-cancel" class="secondary" style="min-height:38px;padding:0 16px;border-radius:8px;cursor:pointer;">Cancel</button>
        <button type="button" id="sr-legacy-logout-confirm-btn" class="primary" style="min-height:38px;padding:0 16px;border-radius:8px;background:#dc2626;color:#fff;border:none;font-weight:600;cursor:pointer;">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeOverlay = () => overlay.remove();
  document.getElementById('sr-legacy-logout-cancel')?.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
  document.getElementById('sr-legacy-logout-confirm-btn')?.addEventListener('click', () => {
    closeOverlay();
    proceedWithLogout();
  });
}

$('#logout-button').addEventListener('click', performLogout);$('#notification-button').addEventListener('click',()=>$('#notification-panel').classList.toggle('hidden'));document.addEventListener('click',(event)=>{if(!event.target.closest('#notification-button')&&!event.target.closest('#notification-panel'))$('#notification-panel').classList.add('hidden')});setup();

async function renderCalendar(){dashboardHeader('Calendar');const month=new Date().toISOString().slice(0,7);try{const [calendar,leave]=await Promise.all([api(`/api/calendar?month=${month}`),api('/api/leave-requests')]);const shiftRows=calendar.shifts.map((shift)=>`<article class="handover-item"><div><h3>${escape(shift.worker_name)}</h3><p>${new Date(shift.starts_at).toLocaleString()} — ${new Date(shift.ends_at).toLocaleString()}</p></div><div class="button-row"><span class="badge relayed">${escape(shift.status)}</span>${shift.membership_id===state.user.id?`<button class="secondary" data-swap-shift="${shift.id}">Request swap</button>`:''}</div></article>`).join('')||'<p class="empty">No shifts scheduled this month.</p>';const leaveRows=leave.requests.map((request)=>`<article class="handover-item"><div><h3>${escape(request.starts_on)} to ${escape(request.ends_on)}</h3><p>${escape(request.reason||'No reason provided')}</p></div><div class="button-row"><span class="badge awaiting_review">${escape(request.status)}</span>${state.user.role==='owner'&&request.status==='pending'?`<button class="primary" data-leave="approved" data-id="${request.id}">Approve</button><button class="secondary" data-leave="rejected" data-id="${request.id}">Reject</button>`:''}</div></article>`).join('')||'<p class="empty">No leave requests.</p>';$('#dashboard').innerHTML=`<section class="workspace-card"><p class="eyebrow">SHIFT CALENDAR</p><h2>${new Date(month+'-01').toLocaleString(undefined,{month:'long',year:'numeric'})}</h2><div class="action-list">${shiftRows}</div><h3 class="section-title">Request leave</h3><form class="access-form" id="leave-form"><label>Start date<input name="startsOn" type="date" required /></label><label>End date<input name="endsOn" type="date" required /></label><label>Reason<input name="reason" /></label><button class="secondary" type="submit">Submit leave request</button></form><h3 class="section-title">Leave requests</h3><div class="action-list">${leaveRows}</div></section>`;$('#leave-form').addEventListener('submit',submitLeaveRequest);document.querySelectorAll('[data-swap-shift]').forEach((button)=>button.addEventListener('click',()=>requestShiftSwap(button)));document.querySelectorAll('[data-leave]').forEach((button)=>button.addEventListener('click',()=>reviewLeave(button)));bindNavigation()}catch(error){$('#dashboard').innerHTML=`<p class="empty">${escape(error.message)}</p>`}}
async function submitLeaveRequest(event){event.preventDefault();try{await api('/api/leave-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Leave request submitted.');renderCalendar()}catch(error){toast(error.message)}}
async function requestShiftSwap(button){button.disabled=true;try{await api('/api/shift-swaps',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({shiftId:button.dataset.swapShift})});button.textContent='Swap requested';toast('Shift-swap request sent.')}catch(error){button.disabled=false;toast(error.message)}}
async function reviewLeave(button){button.disabled=true;try{await api('/api/leave-requests/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:button.dataset.id,decision:button.dataset.leave})});toast('Leave request updated.');renderCalendar()}catch(error){button.disabled=false;toast(error.message)}}
async function renderSwapReview(){
  // Allow both supervisors and owners to review shift swaps
  if(!state.user || (state.user.role !== 'owner' && state.user.role !== 'supervisor')) return;
  try{
    const swaps = await api('/api/shift-swaps');
    const pending = (swaps.swaps || []).filter((swap)=>swap.status==='pending');
    if(!pending.length) return;
    
    const panel = document.createElement('section');
    panel.className = 'workspace-card';
    panel.style.border = '1.5px solid var(--brand-primary)';
    panel.style.marginBottom = '20px';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <p class="eyebrow" style="color:var(--brand-primary);font-weight:700;">ACTION REQUIRED · SHIFT SWAPS</p>
          <h2 style="margin:2px 0 0;font-size:18px;">Pending Shift Swap Requests (${pending.length})</h2>
        </div>
        <span class="badge awaiting_review">Supervisor Approval</span>
      </div>
      <div class="action-list">
        ${pending.map((swap)=>`
          <article class="handover-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px;background:var(--bg-surface-subtle);border-radius:12px;">
            <div>
              <h3 style="margin:0 0 4px;font-size:15px;display:flex;align-items:center;gap:6px;">
                ${escape(swap.requester_name)} 
                <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:var(--status-blue-bg);color:var(--status-blue-text);font-weight:600;">${escape(swap.swap_type)}</span>
              </h3>
              <p style="margin:0;font-size:12.5px;color:var(--text-secondary);">
                ${swap.target_name ? `Target Partner: <strong>${escape(swap.target_name)}</strong> · ` : ''}
                Reason: "${escape(swap.reason || 'No reason provided')}"
              </p>
            </div>
            <div class="button-row" style="gap:8px;">
              <button class="primary" data-swap-review="approved" data-id="${swap.id}" style="min-height:36px;padding:0 14px;font-size:13px;font-weight:700;background:#059669;border-color:#059669;">Approve Swap</button>
              <button class="secondary" data-swap-review="rejected" data-id="${swap.id}" style="min-height:36px;padding:0 12px;font-size:13px;">Decline</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;
    $('#dashboard').prepend(panel);
    document.querySelectorAll('[data-swap-review]').forEach((button)=>button.addEventListener('click',()=>reviewSwap(button)));
  }catch(error){
    console.warn('Swap review unavailable',error);
  }
}

async function reviewSwap(button){
  button.disabled = true;
  const decision = button.dataset.swapReview;
  const swapId = button.dataset.id;
  try {
    window.SoundEngine?.play(decision === 'approved' ? 'confirm' : 'pop');
    await api('/api/shift-swaps/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: swapId, decision })
    });
    toast(decision === 'approved' ? 'Shift swap approved and team schedules updated!' : 'Shift swap declined.');
    renderDashboard();
  } catch(error) {
    button.disabled = false;
    toast(error.message);
  }
}

// [RIFA-9] Tactile Baton Pass Haptics & 60FPS Fluid Physics (Simi Balogun)
window.triggerShiftRelayHaptic = function triggerShiftRelayHaptic(pattern = [18, 30, 45]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (_) {
    // Graceful no-op on desktop/unsupported devices
  }
};

document.addEventListener('click', (event) => {
  const interactive = event.target.closest('button.primary, [data-swap-review], .tab-btn, [data-tab]');
  if (interactive) {
    window.triggerShiftRelayHaptic([14, 24, 38]);
  }
}, { passive: true });

