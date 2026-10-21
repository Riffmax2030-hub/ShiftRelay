const state={users:[],user:null,config:null,currentHandover:null,recordedChunks:[],mediaRecorder:null};
const defaultNotes=`At 17:40, cold-room temperature rose to 9°C for 12 minutes. Generator was checked and is working; temperature is back at 4°C. Please check the temperature log at 23:00 and call the maintenance line if it rises above 6°C again.\n\nThe pharmacy delivery has not arrived. Amina called the supplier; they promised arrival by 20:00 but did not give a tracking number. Four doses of insulin remain in stock.\n\nMr. Otieno's family called twice about his discharge. The doctor has not signed the discharge note yet. Please update them after the 21:30 ward round.`;
const demoHandover={summary:'3 items need the incoming team’s attention.',actions:[{title:'Monitor cold-room temperature',priority:'high',owner:'Night supervisor',due:'Before 23:00',evidence:'Temperature briefly reached 9°C at 17:40. It is currently stable at 4°C.'},{title:'Confirm delayed pharmacy delivery',priority:'medium',owner:'Charge nurse',due:'By 22:30',evidence:'Supplier promised delivery by 20:00, but no tracking number was provided.'},{title:'Call Mr. Otieno’s family',priority:'low',owner:'Ward nurse',due:'After 21:30 round',evidence:'Family is awaiting a discharge update. Doctor’s signature is pending.'}],missing_context:[{question:'Who has the maintenance-line number?',why_it_matters:'The night team needs this to respond immediately if temperature rises.'}]};
const $=(selector)=>document.querySelector(selector);const escape=(value)=>String(value).replace(/[&<>'"]/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[character]));
function toast(message){const box=$('#toast');box.textContent=message;box.classList.remove('hidden');setTimeout(()=>box.classList.add('hidden'),4200)}
async function api(path,options={}){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);try{const headers={'X-ShiftRelay-User':state.user?.id||'',...(options.headers||{})};const response=await fetch(path,{...options,headers,signal:controller.signal});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Something went wrong.');return payload}catch(error){if(error.name==='AbortError')throw new Error('This request took too long. Please try again.');throw error}finally{clearTimeout(timeout)}}
function roleIcon(role){return role==='supervisor'?'✓':role==='incoming'?'→':'+'}function roleCopy(role){return role==='supervisor'?'Review and approve handovers':role==='incoming'?'Receive and acknowledge handovers':'Capture your outgoing shift update'}
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
    <div class="portal-tab-strip" role="tablist" aria-label="Workplace access modes">
      <button type="button" role="tab" aria-selected="${activeTab==='signin'}" class="portal-tab-btn ${activeTab==='signin'?'active':''}" data-access="signin">Sign In</button>
      <button type="button" role="tab" aria-selected="${activeTab==='register'}" class="portal-tab-btn ${activeTab==='register'?'active':''}" data-access="register">Register Company / Admin</button>
      <button type="button" role="tab" aria-selected="${activeTab==='join'}" class="portal-tab-btn ${activeTab==='join'?'active':''}" data-access="join">Join with Org ID</button>
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
      if (access === 'register') {
        renderOrganisationForm();
      } else if (access === 'join') {
        renderJoinForm();
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

function renderLogin(){
  const panel = $('#access-panel');
  if (!panel) return;
  const isDemo = state.config?.demoMode !== false && Array.isArray(state.users) && state.users.length > 0;
  
  const demoSection = isDemo ? `
    <div class="demo-drive-section" id="demo-drive-section" style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border-subtle);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="display:block;font-size:13.5px;color:var(--text-main);font-weight:700;">Instant Demo Drive</strong>
          <small style="color:var(--text-muted);font-size:12px;">Test drive the full ShiftRelay experience instantly as any specialist role</small>
        </div>
        <span class="badge" style="background:var(--brand-accent-subtle, rgba(16,185,129,0.1));color:var(--status-green-text, #065f46);border:1px solid var(--status-green-border, #a7f3d0);font-size:11px;font-weight:700;">Zero Password Needed</span>
      </div>
      <div class="role-cards" id="role-cards">
        ${state.users.map((user)=>{
          const avatarStyle = user.avatar_data_url
            ? `background-image:url('${user.avatar_data_url}');background-size:cover;background-position:center;color:transparent;`
            : '';
          const initial = escape(user.name || 'U').slice(0,1).toUpperCase();
          return `
          <button class="role-card" data-login="${user.id}" type="button" title="Sign in as ${escape(user.name)}">
            <span class="role-avatar" style="width:42px;height:42px;min-width:42px;border-radius:50%;display:grid;place-items:center;font-size:16px;font-weight:700;background:linear-gradient(135deg,#0d524d,#10b981);color:#fff;overflow:hidden;${avatarStyle}">${user.avatar_data_url ? '' : initial}</span>
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
      <span style="color:var(--text-secondary);font-weight:600;">${isDemo ? '● Demo Roles Active' : 'Production Mode'}</span>
      <button type="button" class="secondary" id="btn-toggle-demo-mode" style="min-height:30px;padding:2px 10px;font-size:11px;">${isDemo ? 'Switch to Clean Prod' : 'Enable Demo Roles'}</button>
    </div>
  `;

  panel.innerHTML = `
    ${renderPortalTabs('signin')}
    <p class="eyebrow">SECURE WORKPLACE ACCESS</p>
    <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Sign in to your portal.</h2>
    <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">Use your verified work account to see only the work assigned to you.</p>
    <form class="access-form" id="sign-in-form">
      <label>Work email
        <input name="email" type="email" required autocomplete="email" placeholder="name@workplace.com" />
      </label>
      <label>Password
        <input name="password" type="password" required autocomplete="current-password" placeholder="••••••••" />
      </label>
      <div class="button-row" style="margin-top:10px;">
        <button class="primary" type="submit" style="width:100%;justify-content:center;font-weight:700;">Sign in</button>
      </div>
    </form>
    <p class="form-message" id="form-message"></p>
    ${demoSection}
    ${modeBadge}
  `;

  $('#sign-in-form')?.addEventListener('submit', signIn);

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

async function signIn(event){event.preventDefault();const button=event.submitter;button.disabled=true;button.textContent='Signing in…';try{const result=await api('/api/auth/sign-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});login(result.user)}catch(error){$('#form-message').textContent=error.message}finally{button.disabled=false;button.textContent='Sign in'}}

function renderOrganisationForm(){
  const panel = $('#access-panel');
  if (!panel) return;
  panel.innerHTML = `
    ${renderPortalTabs('register')}
    <p class="eyebrow">COMPANY &amp; SHIFT ADMIN REGISTRATION</p>
    <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Register your organisation.</h2>
    <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">Set up your workplace as Company Owner, Shift Supervisor, or Operations Manager. You'll receive a unique Company ID for your team.</p>
    <form class="access-form" id="organisation-form">
      <div style="margin-bottom:14px;">
        <label style="display:block;margin-bottom:8px;font-weight:700;">Your Administrative Role</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;">
          <label style="display:flex;align-items:center;gap:6px;padding:10px;border:1px solid var(--border-medium);border-radius:8px;cursor:pointer;background:var(--bg-surface-subtle);font-size:13px;">
            <input type="radio" name="adminRole" value="owner" checked /> Company Owner
          </label>
          <label style="display:flex;align-items:center;gap:6px;padding:10px;border:1px solid var(--border-medium);border-radius:8px;cursor:pointer;background:var(--bg-surface-subtle);font-size:13px;">
            <input type="radio" name="adminRole" value="supervisor" /> Shift Supervisor
          </label>
          <label style="display:flex;align-items:center;gap:6px;padding:10px;border:1px solid var(--border-medium);border-radius:8px;cursor:pointer;background:var(--bg-surface-subtle);font-size:13px;">
            <input type="radio" name="adminRole" value="manager" /> Operations Lead
          </label>
        </div>
      </div>
      <label>Company / Hospital / Facility name<input name="legalName" required placeholder="e.g. Metro General Hospital or Peak Logistics Ltd" /></label>
      <label>Industry sector<select name="industry"><option value="Healthcare">Healthcare &amp; Clinical</option><option value="Logistics">Logistics &amp; Warehousing</option><option value="Manufacturing">Manufacturing &amp; Engineering</option><option value="Hospitality">Hospitality &amp; Culinary</option><option value="Retail">Retail &amp; Customer Ops</option><option value="Other">Other Frontline Service</option></select></label>
      <label>Country<select name="countryCode" required><option value="">Select country</option>${countryOptions()}</select></label>
      <label>Local time zone<select name="timeZone" required>${timeZoneOptions()}</select></label>
      <label>Your full name<input name="ownerName" required placeholder="e.g. Sarah Jenkins" /></label>
      <label>Your professional work email<input name="workEmail" type="email" required placeholder="s.jenkins@company.com" /></label>
      <label>Create password<input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters" /></label>
      <label>Confirm password<input name="confirmPassword" type="password" minlength="8" required autocomplete="new-password" placeholder="Re-enter password" /></label>
      <label class="checkbox"><input name="termsAccepted" type="checkbox" required /> I confirm this organisation and agree to ShiftRelay <a href="terms.html" class="terms-link-trigger" style="text-decoration: underline; color: inherit; font-weight: 700;">Terms &amp; Workplace Security Policy</a>.</label>
      <div class="button-row" style="margin-top:14px;">
        <button class="primary" type="submit" style="width:100%;justify-content:center;font-weight:700;font-size:15px;padding:12px;">Create Workplace &amp; Generate ID</button>
      </div>
    </form>
    <p class="form-message" id="form-message"></p>
  `;
  $('#organisation-form')?.addEventListener('submit', submitOrganisation);
  bindAccessActions();
}

function renderJoinForm(){
  const panel = $('#access-panel');
  if (!panel) return;
  panel.innerHTML = `
    ${renderPortalTabs('join')}
    <p class="eyebrow">JOIN EXISTING WORKPLACE</p>
    <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;">Enter your Company ID.</h2>
    <p class="muted" style="margin:0 0 20px;font-size:13.5px;color:var(--text-secondary);">Provided by your shift supervisor or operations manager.</p>
    <form class="access-form" id="join-form">
      <label>Company / Organisation ID<input name="organisationCode" required placeholder="e.g. 246701" /></label>
      <label>Your full name<input name="fullName" required placeholder="e.g. Alex Morgan" /></label>
      <label>Work or personal email<input name="email" type="email" required placeholder="alex@workplace.com" /></label>
      <label>Staff reference or badge ID<input name="employeeReference" required placeholder="e.g. EMP-9921" /></label>
      <label>Position / Shift title<input name="position" required placeholder="e.g. ICU Night Specialist or Line Lead" /></label>
      <label>Create password<input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters" /></label>
      <label>Confirm password<input name="confirmPassword" type="password" minlength="8" required autocomplete="new-password" placeholder="Re-enter password" /></label>
      <label class="checkbox"><input name="termsAccepted" type="checkbox" required /> I agree to ShiftRelay <a href="terms.html" class="terms-link-trigger" style="text-decoration: underline; color: inherit; font-weight: 700;">Terms &amp; Workplace Security Policy</a>.</label>
      <div class="button-row" style="margin-top:14px;">
        <button class="primary" type="submit" style="width:100%;justify-content:center;font-weight:700;font-size:15px;padding:12px;">Request Access to Workplace</button>
      </div>
    </form>
    <p class="form-message" id="form-message"></p>
  `;
  $('#join-form')?.addEventListener('submit', submitJoin);
  bindAccessActions();
}
async function submitOrganisation(event){event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget));if(form.password!==form.confirmPassword){$('#form-message').textContent='Passwords do not match.';return}delete form.confirmPassword;const button=event.submitter;button.disabled=true;button.textContent='Creating…';try{const result=await api('/api/organisations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});toast(`Organisation created. Your ID is ${result.organisation.organisationCode}.`);login(result.user)}catch(error){$('#form-message').textContent=error.message}finally{button.disabled=false;button.textContent='Create organisation'}}
async function submitJoin(event){event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget));if(form.password!==form.confirmPassword){$('#form-message').textContent='Passwords do not match.';return}delete form.confirmPassword;const button=event.submitter;button.disabled=true;button.textContent='Sending…';try{await api('/api/organisation-memberships',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});$('#form-message').textContent='Access request sent. Your owner or supervisor must approve it before you can enter the workplace.';event.currentTarget.reset()}catch(error){$('#form-message').textContent=error.message}finally{button.disabled=false;button.textContent='Request access'}}
function login(user){state.user=user;sessionStorage.setItem('shiftrelay-user',user.id);try{localStorage.setItem('shiftrelay-user-data',JSON.stringify(user))}catch(e){}$('#login-view').classList.add('hidden');$('#app-view').classList.remove('hidden');$('#app-view').dataset.role=user.role;$('#app-view').dataset.workerName=user.name;$('#app-view').dataset.workerTitle=user.title||'Workplace member';const entryEl=document.getElementById('sr-entry');if(entryEl){entryEl.style.display='none';}const modalEl=document.getElementById('sr-login-modal');if(modalEl){modalEl.classList.remove('open');}const initials=user.name.split(' ').map((n)=>n[0]).join('');$('#sidebar-avatar').textContent=initials;$('#sidebar-name').textContent=user.name;$('#sidebar-role').textContent=user.title;const ha=$('#header-avatar');if(ha){if(user.avatar_data_url){ha.textContent='';ha.style.backgroundImage=`url('${user.avatar_data_url}')`;ha.style.backgroundSize='cover';ha.style.backgroundPosition='center';ha.style.color='transparent';}else{ha.textContent=initials;ha.style.backgroundImage='';ha.style.color='';}}const hn=$('#header-name');if(hn){hn.textContent=user.name}const hr=$('#header-role');if(hr){hr.textContent=user.title||user.role}setApiStatus();renderDashboard();refreshNotifications();window.connectTeamRealtime?.()}

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

  const commandDeck = `
    <section class="today-command-glass">
      <div class="today-live-status-row">
        <div class="live-pill">
          <span class="live-dot-pulse"></span>
          <span class="live-pill-text">LIVE ROTATION</span>
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
        <div class="today-progress-percent-box">
          <span class="today-progress-percent-val">${progressPct}%</span>
          <span class="today-progress-sublabel">Shift Done</span>
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

  const pinnedFeed=pinnedHandoverFeed(handovers);
  const calendarCard = typeof window.renderShiftCalendarCard === 'function' ? window.renderShiftCalendarCard() : '';
  const zonesCard = typeof window.renderFacilityZonesCard === 'function' ? window.renderFacilityZonesCard() : '';
  let focus='';
  if(state.user.role==='supervisor')focus=reviewPanel(handovers);
  if(state.user.role==='incoming')focus=incomingPanel(handovers);
  if(state.user.role==='owner')focus=await ownerPanel(handovers);

  $('#dashboard').innerHTML=`${commandDeck}${pinnedFeed}<div class="metric-grid metric-grid-compact"><article class="metric"><span>Awaiting Review</span><strong>${waiting}</strong></article><article class="metric"><span>Incoming Shift</span><strong>${relayed}</strong></article><article class="metric"><span>Acknowledged</span><strong>${acknowledged}</strong></article></div>${calendarCard}${zonesCard}${focus}`;
  bindNavigation();

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

    <p class="eyebrow">2. IMPORTANT NOTES & EVENTS</p>
    <p>Include urgent issues, pending tasks, equipment logs, and anything the incoming team must know.</p>
    <textarea class="notes" id="shift-notes">${defaultNotes}</textarea>

    <div class="voice-row" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0;">
      <button class="voice" id="record-button" type="button" style="display:inline-flex;align-items:center;gap:6px;">${Icons.mic()} Record voice update</button>
      <button class="secondary" id="handover-camera-btn" type="button" style="display:inline-flex;align-items:center;gap:6px;">${Icons.camera()} Snap Equipment / Whiteboard</button>
      <input type="file" id="handover-camera-input" accept="image/*" capture="environment" class="hidden" />
      <span id="voice-status">Or paste a written update above.</span>
    </div>
    <div id="handover-photo-preview" class="hidden" style="margin:10px 0;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;"></div>

    <div class="button-row">
      <button class="primary" id="analyze-button">Generate handover & tasks</button>
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
    <button class="primary" id="save-handover">Submit & Relay to Next Shift</button>
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
async function recordVoice(){const button=$('#record-button'),status=$('#voice-status');if(state.mediaRecorder?.state==='recording'){state.mediaRecorder.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});state.recordedChunks=[];state.mediaRecorder=new MediaRecorder(stream);state.mediaRecorder.addEventListener('dataavailable',(event)=>state.recordedChunks.push(event.data));state.mediaRecorder.addEventListener('stop',async()=>{stream.getTracks().forEach((track)=>track.stop());button.innerHTML=`${Icons.mic()} Record voice update`;status.textContent='Transcribing…';try{const blob=new Blob(state.recordedChunks,{type:state.mediaRecorder.mimeType});const result=await api('/api/transcribe',{method:'POST',headers:{'Content-Type':blob.type},body:blob});$('#shift-notes').value=`${$('#shift-notes').value}\n\n${result.transcript}`.trim();status.textContent='Voice note added to the update.'}catch(error){status.textContent=error.message==='TRANSCRIPTION_NOT_CONFIGURED'?'Transcription is not configured locally yet.':'Voice transcription failed. Please try again.'}});state.mediaRecorder.start();button.innerHTML=`${Icons.micStop()} Stop recording`;status.textContent='Recording…'}catch{status.textContent='Microphone access was not granted.'}}
document.querySelectorAll('.side-nav button').forEach((button)=>button.addEventListener('click',()=>go(button.dataset.view)));$('#logout-button').addEventListener('click',async()=>{await api('/api/auth/sign-out',{method:'POST'});sessionStorage.removeItem('shiftrelay-user');try{localStorage.removeItem('shiftrelay-user-data')}catch(e){};state.user=null;$('#app-view').classList.add('hidden');const entryEl=document.getElementById('sr-entry');if(entryEl){entryEl.style.display='';entryEl.classList.remove('hidden-out');entryEl.classList.add('visible')}else{$('#login-view').classList.remove('hidden');renderLogin()}});$('#notification-button').addEventListener('click',()=>$('#notification-panel').classList.toggle('hidden'));document.addEventListener('click',(event)=>{if(!event.target.closest('#notification-button')&&!event.target.closest('#notification-panel'))$('#notification-panel').classList.add('hidden')});setup();

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
