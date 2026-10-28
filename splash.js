/**
 * ShiftRelay Splash + Entry Screen Controller
 *
 * Flow:
 *  1. Immediately show #sr-splash
 *  2. After 1.8s, check for existing session via /api/auth/session
 *     - Session found  -> fade splash, call login(user) directly (skip landing + entry)
 *     - No session     -> fade splash, show #sr-entry (the minimal Get Started screen)
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
    setTimeout(() => splashEl.remove(), 600);
  }

  function showEntry() {
    if (!entryEl) return;
    entryEl.classList.remove('hidden-out');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entryEl.classList.add('visible');
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
    openModal('demo-request');
  });

  document.getElementById('entry-btn-signin')?.addEventListener('click', () => {
    openModal('signin');
  });

  // -- Close button in modal ---------------------------------------------------
  document.getElementById('sr-modal-close')?.addEventListener('click', closeModal);

  // -- Sign-in form in sheet (Tri-Factor) --------------------------------------
  document.getElementById('sr-sheet-signin-form')?.addEventListener('submit', async (e) => {
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
      return `
        <button class="sr-demo-role-btn" data-sr-demo-login="${u.id}" type="button">
          <span class="sr-demo-avatar" style="${avatarStyle}">${u.avatar_data_url ? '' : initial}</span>
          <span>
            <strong>${u.name || 'Unknown'}</strong>
            <small>${u.title || u.role || ''}</small>
          </span>
        </button>
      `;
    }).join('');
    bindDemoRoles();
  }

  // ── Main init ────────────────────────────────────────────────────────────────
  async function initSplash() {
    // Deterministic readiness: resolve immediately if splash element is dismissed or absent
    if (document.getElementById('sr-splash')) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

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

  // Start
  initSplash();
})();
