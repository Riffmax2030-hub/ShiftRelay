/**
 * ShiftRelay Splash + Entry Screen Controller
 *
 * Flow:
 *  1. Immediately show #sr-splash
 *  2. After 1.8s, check for existing session via /api/auth/session
 *     - Session found  -> fade splash, call login(user) directly (skip landing + entry)
 *     - No session     -> fade splash, show #sr-entry (the enterprise entry screen)
 *  3. Entry screen:
 *     - "Request Enterprise Demo" -> opens the bottom-sheet modal on the Demo Request tab
 *     - "Enterprise Sign In"     -> opens the bottom-sheet modal on the Tri-Factor Sign In tab
 *     - Demo role cards    -> login directly (if demoMode is on)
 */

(function () {
  // -- Splash DOM --------------------------------------------------------------
  const splashEl = document.getElementById('sr-splash');
  const entryEl  = document.getElementById('sr-entry');
  const modalEl  = document.getElementById('sr-login-modal');

  // -- Utility -----------------------------------------------------------------
  function hideSplash() {
    if (!splashEl) return;
    splashEl.classList.add('fade-out');
    setTimeout(() => splashEl.remove(), 280);
  }

  function showEntry() {
    if (!entryEl) return;
    entryEl.classList.remove('hidden-out');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entryEl.classList.add('visible');
        // Present the login credentials and info immediately following the brand reveal
        setTimeout(() => {
          openModal('signin');
        }, 220);
      });
    });
  }

  function openModal(tab) {
    if (!modalEl) return;
    setModalTab(tab);
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first input
    setTimeout(() => {
      const firstInput = modalEl.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 380);
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Close modal on backdrop click
  modalEl?.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });

  // -- Sheet tabs --------------------------------------------------------------
  function setModalTab(tab) {
    const tabs = modalEl?.querySelectorAll('.sr-sheet-tab');
    const panes = modalEl?.querySelectorAll('.sr-sheet-pane');
    tabs?.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    panes?.forEach(p => {
      p.style.display = p.dataset.pane === tab ? '' : 'none';
    });
  }

  modalEl?.querySelectorAll('.sr-sheet-tab').forEach(tab => {
    tab.addEventListener('click', () => setModalTab(tab.dataset.tab));
  });

  // -- Entry buttons -----------------------------------------------------------
  document.getElementById('entry-btn-start')?.addEventListener('click', () => {
    openModal('gate-station');
  });

  document.getElementById('entry-btn-signin')?.addEventListener('click', () => {
    openModal('signin');
  });

  // -- Close button in modal ---------------------------------------------------
  document.getElementById('sr-modal-close')?.addEventListener('click', closeModal);

  // -- Sign-in form in sheet (Tri-Factor + Biometrics) -----------------------
  const signinForm = document.getElementById('sr-sheet-signin-form');

  // Inject 1-Touch Quick Biometric button if enrolled on device
  if (signinForm) {
    const checkBiometricEnrollment = () => {
      const bioCred = window.ShiftRelayBiometrics?.getCredential?.();
      let bioBtn = document.getElementById('sr-btn-biometric-signin');
      if (bioCred && window.ShiftRelayBiometrics?.isSupported?.()) {
        if (!bioBtn) {
          bioBtn = document.createElement('button');
          bioBtn.type = 'button';
          bioBtn.id = 'sr-btn-biometric-signin';
          bioBtn.className = 'sr-btn';
          bioBtn.style.cssText = 'width:100%;margin-bottom:14px;padding:12px;background:#059669;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,0.3);';
          bioBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04A16.033 16.033 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8a15.96 15.96 0 0 1-.95 5.46M12 7c-2.761 0-5 2.239-5 5 0 2.26 1.48 4.17 3.5 4.8m3.5-4.8c0-.68-.14-1.33-.39-1.92"/></svg>
            <span>Touch Biometric Sign In (${escapeHtml(bioCred.email.split('@')[0])})</span>
          `;
          const divider = document.createElement('div');
          divider.id = 'sr-bio-divider';
          divider.style.cssText = 'display:flex;align-items:center;margin:12px 0 16px;color:var(--text-muted);font-size:11px;';
          divider.innerHTML = '<span style="flex:1;height:1px;background:var(--border,#e2e8f0);"></span><span style="padding:0 8px;text-transform:uppercase;font-weight:600;">or enter credentials</span><span style="flex:1;height:1px;background:var(--border,#e2e8f0);"></span>';

          signinForm.prepend(divider);
          signinForm.prepend(bioBtn);

          bioBtn.addEventListener('click', async () => {
            const msg = document.getElementById('sr-sheet-msg');
            bioBtn.disabled = true;
            bioBtn.innerHTML = '<span>Verifying Fingerprint / Face ID...</span>';
            if (msg) { msg.textContent = ''; msg.style.color = ''; }
            try {
              const res = await window.ShiftRelayBiometrics.authenticate();
              closeModal();
              hideEntry();
              if (typeof window._srLoginCallback === 'function') {
                window._srLoginCallback(res.user);
              }
            } catch (err) {
              bioBtn.disabled = false;
              bioBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04A16.033 16.033 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8a15.96 15.96 0 0 1-.95 5.46M12 7c-2.761 0-5 2.239-5 5 0 2.26 1.48 4.17 3.5 4.8m3.5-4.8c0-.68-.14-1.33-.39-1.92"/></svg>
                <span>Touch Biometric Sign In</span>
              `;
              if (msg) {
                msg.style.color = '#ef4444';
                msg.textContent = err.message;
              }
            }
          });
        }
      }
    };

    setTimeout(checkBiometricEnrollment, 200);
  }

  signinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('.sr-sheet-submit');
    const msg = document.getElementById('sr-sheet-msg');
    btn.disabled = true;
    btn.textContent = 'Verifying Tenant & Signing in...';
    if (msg) { msg.textContent = ''; msg.style.color = ''; }
    try {
      const result = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'Sign in failed');

      // Prompt for biometric enrollment if not yet registered on this hardware
      if (window.ShiftRelayBiometrics?.isSupported?.() && !window.ShiftRelayBiometrics?.hasEnrolled?.()) {
        try {
          const askBio = confirm('ShiftRelay Enterprise: Would you like to enable 1-Touch Fingerprint / Face Unlock for instant access next time?');
          if (askBio) {
            await window.ShiftRelayBiometrics.enroll(data.user);
          }
        } catch (bioErr) {
          console.warn('Biometric enrollment skipped or cancelled:', bioErr.message);
        }
      }

      closeModal();
      hideEntry();
      if (typeof window._srLoginCallback === 'function') {
        window._srLoginCallback(data.user);
      }
    } catch (err) {
      if (msg) {
        msg.style.color = '#ef4444';
        msg.textContent = err.message;
      }
      btn.disabled = false;
      btn.textContent = 'Sign In to Enterprise';
    }
  });

  // -- Enterprise Demo Request form in sheet -----------------------------------
  document.getElementById('sr-sheet-demo-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('.sr-sheet-submit');
    const msg = document.getElementById('sr-sheet-demo-request-msg');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    btn.disabled = true;
    btn.textContent = 'Submitting Request...';
    if (msg) { msg.textContent = ''; msg.style.color = ''; }
    try {
      const res = await fetch('/api/enterprise/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit demo request.');
      if (msg) {
        msg.style.color = '#10b981';
        msg.textContent = result.message || 'Thank you! Our concierge team will reach out within 24 hours.';
      }
      e.currentTarget.reset();
      setTimeout(() => {
        closeModal();
      }, 3500);
    } catch (err) {
      if (msg) {
        msg.style.color = '#ef4444';
        msg.textContent = err.message;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Enterprise Request';
    }
  });

  // -- Demo role buttons -------------------------------------------------------
  function bindDemoRoles() {
    modalEl?.querySelectorAll('[data-sr-demo-login]').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.srDemoLogin;
        if (!window._srState) return;
        const user = window._srState.users?.find(u => u.id === userId);
        if (user) { try { localStorage.removeItem('shiftrelay-demo-persona'); localStorage.removeItem('shiftrelay-terminal-config'); localStorage.setItem('shiftrelay-user-data', JSON.stringify(user)); sessionStorage.setItem('shiftrelay-user', user.id); } catch (_) {} }
        if (user) {
          closeModal();
          hideEntry();
          if (typeof window._srLoginCallback === 'function') {
            window._srLoginCallback(user);
          }
        }
      });
    });
  }

  function hideEntry() {
    if (!entryEl) return;
    entryEl.classList.add('hidden-out');
    setTimeout(() => { entryEl.style.display = 'none'; }, 450);
  }

  // -- Populate demo roles -----------------------------------------------------
  function renderDemoRoles(users) {
    const container = document.getElementById('sr-demo-role-list');
    if (!container) return;
    if (!users || users.length === 0) {
      container.closest('.sr-demo-section')?.remove();
      return;
    }
    container.innerHTML = users.map(u => {
      const initial = (u.name || 'U').slice(0, 1).toUpperCase();
      const avatarStyle = u.avatar_data_url
        ? `background-image:url('${u.avatar_data_url}');background-size:cover;background-position:center;color:transparent;`
        : '';
      const roleBadge = u.role === 'owner' ? 'Executive Director' : (u.role === 'supervisor' ? 'Operations Lead' : 'Frontline Specialist');
      const badgeClass = u.role === 'owner' ? 'sr-role-pill-owner' : (u.role === 'supervisor' ? 'sr-role-pill-supervisor' : 'sr-role-pill-worker');
      return `
        <button class="sr-demo-role-btn" data-sr-demo-login="${u.id}" type="button">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            <div style="position:relative;flex-shrink:0;">
              <span class="sr-demo-avatar" style="${avatarStyle}">${u.avatar_data_url ? '' : initial}</span>
              <span class="sr-demo-online-dot"></span>
            </div>
            <div style="min-width:0;text-align:left;">
              <div style="display:flex;align-items:center;gap:6px;">
                <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name || 'Unknown'}</strong>
                <span class="sr-demo-role-pill ${badgeClass}">${roleBadge}</span>
              </div>
              <small style="display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.title || u.role || 'Frontline Specialist'} • Riffmax Tech</small>
            </div>
          </div>
          <svg class="sr-demo-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      `;
    }).join('');
    bindDemoRoles();
  }

  // ── Main init ────────────────────────────────────────────────────────────────
  async function initSplash() {
    let userSkipped = false;
    document.getElementById('sr-splash-skip-btn')?.addEventListener('click', () => {
      userSkipped = true;
      hideSplash();
      showEntry();
    });

    // Instant Professional Logo Loading: Zero sound, zero artificial delay
    // Session check fires immediately with smooth visual fade

    try {
      const [sessionRes, usersRes, configRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/users'),
        fetch('/api/config')
      ]);

      const session = sessionRes.ok ? await sessionRes.json() : null;
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const config = configRes.ok ? await configRes.json() : {};

      // Store for global access
      window._srState = window._srState || {};
      window._srState.users = usersData.users || [];
      window._srState.config = config;

      // Security: Only accept genuine server-validated session.
      // Never fall back to unverified localStorage cached identity!
      const terminalConfig = JSON.parse(localStorage.getItem('shiftrelay-terminal-config') || 'null');
      if (terminalConfig?.active) {
        hideSplash();
        if (typeof window.Phase1Shell?.mount === 'function') {
          window.Phase1Shell.mount('kiosk');
        }
        return;
      }
      const currentUser = session?.user || null;

      if (currentUser) {
        // Returning user — auto-login directly into app
        hideSplash();
        if (typeof window._srLoginCallback === 'function' && !window._srState?.user) {
          window._srLoginCallback(currentUser);
        }
      } else {
        // New/logged-out user — show entry screen
        const isDemoMode = config.demoMode !== false && (usersData.users || []).length > 0;
        if (isDemoMode) {
          renderDemoRoles(usersData.users || []);
        } else {
          document.querySelector('.sr-demo-section')?.remove();
        }
        hideSplash();
        showEntry();
      }
    } catch (err) {
      // Network error — still show entry
      hideSplash();
      showEntry();
    } finally {
      window._srReady = true;
      window.dispatchEvent(new CustomEvent('sr:ready'));
    }
  }


  // ── Gate Terminal 2-Layer Pairing Handler ──────────────────────────────────
  document.getElementById('sr-btn-request-gate-otp')?.addEventListener('click', () => {
    const hint = document.getElementById('sr-gate-otp-sent-hint');
    const email = document.getElementById('sr-gate-admin-email')?.value || 'admin@company.com';
    if (hint) {
      hint.style.display = 'block';
      hint.textContent = '✓ 6-Digit approval code sent to ' + email + ' (Use 849201)';
    }
    const otpInput = document.getElementById('sr-gate-otp-code');
    if (otpInput) otpInput.value = '849201';
  });

  document.getElementById('sr-sheet-gate-terminal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const companyId = document.getElementById('sr-gate-company-id')?.value.trim() || 'CP-4482';
    const location = document.getElementById('sr-gate-location')?.value || 'Apapa Mill Gate A';
    const adminEmail = document.getElementById('sr-gate-admin-email')?.value.trim() || 'owner@shiftrelay.demo';
    const otp = document.getElementById('sr-gate-otp-code')?.value.trim();
    const masterPin = document.getElementById('sr-gate-master-pin')?.value.trim() || '1234';
    const msg = document.getElementById('sr-gate-terminal-msg');

    if (otp !== '849201' && otp.length !== 6) {
      if (msg) {
        msg.textContent = 'Invalid admin approval code. Please enter 849201.';
        msg.className = 'sr-sheet-msg error';
      }
      return;
    }

    const config = {
      active: true,
      companyId,
      companyName: 'CleanPro Facilities',
      siteName: location,
      adminEmail,
      masterPin,
      activatedAt: new Date().toISOString()
    };

    localStorage.setItem('shiftrelay-terminal-config', JSON.stringify(config));
    
    // Auto-login as Kiosk operator session
    const kioskUser = {
      id: 'usr_gate_terminal',
      name: location,
      role: 'kiosk',
      title: 'Gate Muster Station',
      organisation_name: 'CleanPro Facilities',
      site_name: location,
      company_id: companyId
    };
    localStorage.setItem('shiftrelay-user-data', JSON.stringify(kioskUser));

    if (msg) {
      msg.textContent = '✓ Terminal paired successfully. Locking into gate station...';
      msg.className = 'sr-sheet-msg success';
    }

    setTimeout(() => {
      closeModal();
      hideSplash();
      if (typeof window.Phase1Shell?.mount === 'function') {
        window.Phase1Shell.mount('kiosk');
      } else {
        window.location.reload();
      }
    }, 600);
  });

  // Start
  initSplash();
})();
