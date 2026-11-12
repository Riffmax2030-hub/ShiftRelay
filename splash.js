/**
 * ShiftRelay Splash + Direct 3-Step Sign-In Controller
 *
 * Flow:
 *  1. Immediately show #sr-splash brand logo reveal
 *  2. Check existing session via /api/auth/session
 *     - Session found -> fade splash and mount user session directly
 *     - No session    -> fade splash and show clean 3-step login card:
 *                        Step 1: Company Unique ID -> Continue
 *                        Step 2: Work Email -> Continue
 *                        Step 3: Password -> Login
 */

(function () {
  const splashEl = document.getElementById('sr-splash');
  const modalEl = document.getElementById('sr-login-modal');
  const signinForm = document.getElementById('sr-sheet-signin-form');

  const stepEls = {
    1: document.getElementById('sr-step-1'),
    2: document.getElementById('sr-step-2'),
    3: document.getElementById('sr-step-3')
  };

  const companyInput = document.getElementById('sr-step-company-id');
  const emailInput = document.getElementById('sr-step-email');
  const passwordInput = document.getElementById('sr-step-password');
  const msgEl = document.getElementById('sr-sheet-msg');
  const stepLabelEl = document.getElementById('sr-auth-step-label');
  const progSegments = document.querySelectorAll('.sr-auth-progress-seg');

  const step1Btn = document.getElementById('sr-step1-continue');
  const step2Btn = document.getElementById('sr-step2-continue');
  const step3Btn = document.getElementById('sr-step3-login');
  const togglePwBtn = document.getElementById('sr-toggle-password');

  let currentStep = 1;
  let verifiedCompany = null;
  let splashDismissed = false;

  const EYE_OPEN_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>';

  function setMsg(text, isError) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.style.color = isError ? '#ef4444' : '#059669';
  }

  function hideSplash() {
    if (!splashEl || splashDismissed) return;
    splashDismissed = true;
    splashEl.classList.add('fade-out');
    setTimeout(() => splashEl.remove(), 320);
  }

  function setStep(step) {
    currentStep = step;
    setMsg('', false);

    [1, 2, 3].forEach((n) => {
      if (stepEls[n]) {
        stepEls[n].style.display = n === step ? '' : 'none';
      }
    });

    if (stepLabelEl) {
      stepLabelEl.textContent = `Step ${step} of 3`;
    }

    progSegments.forEach((seg) => {
      const n = Number(seg.dataset.prog || 0);
      seg.classList.toggle('active', n <= step);
    });

    setTimeout(() => {
      if (step === 1) companyInput?.focus();
      else if (step === 2) emailInput?.focus();
      else if (step === 3) passwordInput?.focus();
    }, 60);
  }

  function openLoginScreen(resetStep = true) {
    if (!modalEl) return;
    if (resetStep) setStep(1);
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLoginScreen() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.openShiftRelaySignIn = function () {
    if (passwordInput) passwordInput.value = '';
    setMsg('', false);
    openLoginScreen(true);
  };

  async function handleStep1Continue() {
    const rawCode = String(companyInput?.value || '').trim();
    if (!rawCode) {
      setMsg('Please enter your company Unique ID.', true);
      companyInput?.focus();
      return;
    }

    setMsg('', false);
    if (step1Btn) {
      step1Btn.disabled = true;
      step1Btn.querySelector('span').textContent = 'Checking...';
    }

    try {
      const res = await fetch(`/api/auth/company-lookup?code=${encodeURIComponent(rawCode)}`);
      const data = await res.json();
      if (!res.ok || !data.found || !data.company) {
        throw new Error(data.message || data.error || 'Unique ID not recognized. Please check your company ID.');
      }

      verifiedCompany = data.company;
      const orgDisplay = verifiedCompany.tradingName || verifiedCompany.legalName || 'Verified Organisation';
      const compNameEl = document.getElementById('sr-verified-company-name');
      const summaryCompEl = document.getElementById('sr-summary-company');
      if (compNameEl) compNameEl.textContent = `${orgDisplay} (${rawCode.toUpperCase()})`;
      if (summaryCompEl) summaryCompEl.textContent = `${orgDisplay} · ${rawCode.toUpperCase()}`;

      setStep(2);
    } catch (err) {
      setMsg(err.message || 'Unable to verify Unique ID.', true);
      companyInput?.focus();
    } finally {
      if (step1Btn) {
        step1Btn.disabled = false;
        step1Btn.querySelector('span').textContent = 'Continue';
      }
    }
  }

  function handleStep2Continue() {
    const email = String(emailInput?.value || '').trim();
    if (!email || !email.includes('@')) {
      setMsg('Please enter a valid work email address.', true);
      emailInput?.focus();
      return;
    }
    const summaryEmailEl = document.getElementById('sr-summary-email');
    if (summaryEmailEl) summaryEmailEl.textContent = email.toLowerCase();
    setStep(3);
  }

  async function handleLoginSubmit() {
    const companyId = String(companyInput?.value || '').trim();
    const email = String(emailInput?.value || '').trim().toLowerCase();
    const password = String(passwordInput?.value || '');

    if (!companyId) {
      setStep(1);
      setMsg('Please enter your company Unique ID.', true);
      return;
    }
    if (!email) {
      setStep(2);
      setMsg('Please enter your work email address.', true);
      return;
    }
    if (!password) {
      setMsg('Please enter your password.', true);
      passwordInput?.focus();
      return;
    }

    setMsg('', false);
    if (step3Btn) {
      step3Btn.disabled = true;
      step3Btn.querySelector('span').textContent = 'Logging in...';
    }

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      closeLoginScreen();
      if (passwordInput) passwordInput.value = '';
      if (typeof window._srLoginCallback === 'function') {
        window._srLoginCallback(data.user);
      }
    } catch (err) {
      setMsg(err.message || 'Sign in failed. Please check your credentials.', true);
      passwordInput?.focus();
    } finally {
      if (step3Btn) {
        step3Btn.disabled = false;
        step3Btn.querySelector('span').textContent = 'Login';
      }
    }
  }

  step1Btn?.addEventListener('click', handleStep1Continue);
  step2Btn?.addEventListener('click', handleStep2Continue);

  document.getElementById('sr-step2-change-company')?.addEventListener('click', () => setStep(1));
  document.getElementById('sr-step2-back')?.addEventListener('click', () => setStep(1));
  document.getElementById('sr-step3-change-email')?.addEventListener('click', () => setStep(2));
  document.getElementById('sr-step3-back')?.addEventListener('click', () => setStep(2));

  togglePwBtn?.addEventListener('click', () => {
    if (!passwordInput) return;
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePwBtn.innerHTML = isPassword ? EYE_OFF_SVG : EYE_OPEN_SVG;
    togglePwBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  signinForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentStep === 1) {
      handleStep1Continue();
    } else if (currentStep === 2) {
      handleStep2Continue();
    } else {
      handleLoginSubmit();
    }
  });

  async function initSplash() {
    document.getElementById('sr-splash-skip-btn')?.addEventListener('click', () => {
      hideSplash();
      openLoginScreen(true);
    });

    try {
      const [sessionRes, usersRes, configRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch('/api/users'),
        fetch('/api/config')
      ]);

      const session = sessionRes.ok ? await sessionRes.json() : null;
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const config = configRes.ok ? await configRes.json() : {};

      window._srState = window._srState || {};
      window._srState.users = usersData.users || [];
      window._srState.config = config;

      const currentUser = session?.user || null;

      if (currentUser) {
        hideSplash();
        if (typeof window._srLoginCallback === 'function' && !window._srState?.user) {
          window._srLoginCallback(currentUser);
        }
      } else {
        hideSplash();
        openLoginScreen(true);
      }
    } catch (_) {
      hideSplash();
      openLoginScreen(true);
    } finally {
      window._srReady = true;
      window.dispatchEvent(new CustomEvent('sr:ready'));
    }
  }

  initSplash();
})();
