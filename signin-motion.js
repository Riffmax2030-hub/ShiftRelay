/**
 * ShiftRelay Option B — Biometric Pulse Lock Sign-In Transition Engine
 * Shared across both ShiftRelay Workspace App (index.html) and ShiftRelay Admin OS (admin.html).
 * Pure vector SVG + GPU-accelerated CSS (~4 KB, zero external media, retina-crisp on all screens).
 */
(function () {
  'use strict';

  const STYLE_ID = 'sr-signin-motion-styles';
  const OVERLAY_ID = 'sr-signin-motion-overlay';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes srBioSpinCw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes srBioSpinCcw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      @keyframes srBioLaserSweep {
        0% { transform: translateY(-40px); opacity: 0; }
        16% { opacity: 0.95; }
        84% { opacity: 0.95; }
        100% { transform: translateY(40px); opacity: 0; }
      }
      @keyframes srBioAmbientPulse {
        0%, 100% { transform: scale(0.96); opacity: 0.6; }
        50% { transform: scale(1.08); opacity: 0.95; }
      }
      @keyframes srBioRippleOut {
        0% { transform: scale(0.86); opacity: 0.85; }
        100% { transform: scale(1.9); opacity: 0; }
      }
      @keyframes srBioCheckPop {
        0% { transform: scale(0.55); opacity: 0; }
        65% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes srBioStatusFade {
        0% { opacity: 0.35; transform: translateY(4px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        opacity: 0;
        transform: scale(0.985);
        transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1), transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        pointer-events: auto;
        user-select: none;
        overflow: hidden;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      #${OVERLAY_ID}.is-app {
        background: radial-gradient(circle at 50% 42%, #0A3828 0%, #041B14 58%, #02100C 100%);
      }
      #${OVERLAY_ID}.is-admin {
        background: radial-gradient(circle at 50% 42%, #0D1926 0%, #070B12 60%, #04060A 100%);
      }
      #${OVERLAY_ID}.is-visible {
        opacity: 1;
        transform: scale(1);
      }
      #${OVERLAY_ID}.is-leaving {
        opacity: 0;
        transform: scale(1.035);
        pointer-events: none;
      }

      #${OVERLAY_ID} .sr-bm-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-size: 32px 32px;
        mask-image: radial-gradient(circle at 50% 48%, rgba(0, 0, 0, 0.9) 18%, transparent 72%);
        -webkit-mask-image: radial-gradient(circle at 50% 48%, rgba(0, 0, 0, 0.9) 18%, transparent 72%);
      }
      #${OVERLAY_ID}.is-app .sr-bm-grid {
        background-image:
          linear-gradient(to right, rgba(26, 208, 121, 0.065) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(26, 208, 121, 0.065) 1px, transparent 1px);
      }
      #${OVERLAY_ID}.is-admin .sr-bm-grid {
        background-image:
          linear-gradient(to right, rgba(56, 189, 248, 0.07) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(26, 208, 121, 0.055) 1px, transparent 1px);
      }

      #${OVERLAY_ID} .sr-bm-top-beam {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.06);
        overflow: hidden;
      }
      #${OVERLAY_ID} .sr-bm-top-beam-fill {
        height: 100%;
        width: 0%;
        transition: width 0.72s cubic-bezier(0.22, 1, 0.36, 1);
      }
      #${OVERLAY_ID}.is-app .sr-bm-top-beam-fill {
        background: linear-gradient(90deg, #059669 0%, #1AD079 65%, #A7F3D0 100%);
        box-shadow: 0 0 14px rgba(26, 208, 121, 0.7);
      }
      #${OVERLAY_ID}.is-admin .sr-bm-top-beam-fill {
        background: linear-gradient(90deg, #0284C7 0%, #38BDF8 55%, #1AD079 100%);
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.7);
      }

      #${OVERLAY_ID} .sr-bm-ambient {
        position: absolute;
        width: 340px;
        height: 340px;
        border-radius: 50%;
        pointer-events: none;
        animation: srBioAmbientPulse 3.8s ease-in-out infinite;
      }
      #${OVERLAY_ID}.is-app .sr-bm-ambient {
        background: radial-gradient(circle, rgba(26, 208, 121, 0.2) 0%, rgba(26, 208, 121, 0) 68%);
      }
      #${OVERLAY_ID}.is-admin .sr-bm-ambient {
        background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(26, 208, 121, 0) 68%);
      }

      #${OVERLAY_ID} .sr-bm-core {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        text-align: center;
        max-width: 340px;
      }

      #${OVERLAY_ID} .sr-bm-orb {
        position: relative;
        width: 146px;
        height: 146px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #${OVERLAY_ID} .sr-bm-ring-cw {
        position: absolute;
        inset: 0;
        animation: srBioSpinCw 4.8s linear infinite;
      }
      #${OVERLAY_ID} .sr-bm-ring-ccw {
        position: absolute;
        inset: 10px;
        animation: srBioSpinCcw 7.2s linear infinite;
      }
      #${OVERLAY_ID} .sr-bm-icon-frame {
        position: relative;
        width: 82px;
        height: 82px;
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 18px 46px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
      }
      #${OVERLAY_ID} .sr-bm-laser {
        position: absolute;
        left: 6px;
        right: 6px;
        top: 50%;
        height: 2px;
        border-radius: 99px;
        pointer-events: none;
        animation: srBioLaserSweep 2.2s ease-in-out infinite;
      }
      #${OVERLAY_ID}.is-app .sr-bm-laser {
        background: #1AD079;
        box-shadow: 0 0 12px #1AD079, 0 0 4px #ECFDF5;
      }
      #${OVERLAY_ID}.is-admin .sr-bm-laser {
        background: #38BDF8;
        box-shadow: 0 0 12px #38BDF8, 0 0 4px #E0F2FE;
      }
      #${OVERLAY_ID}.is-verified .sr-bm-laser {
        opacity: 0 !important;
        animation: none !important;
      }

      #${OVERLAY_ID} .sr-bm-ripple {
        position: absolute;
        inset: 14px;
        border-radius: 50%;
        pointer-events: none;
        animation: srBioRippleOut 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      #${OVERLAY_ID} .sr-bm-kicker {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      #${OVERLAY_ID}.is-app .sr-bm-kicker { color: #34D399; }
      #${OVERLAY_ID}.is-admin .sr-bm-kicker { color: #38BDF8; }

      #${OVERLAY_ID} .sr-bm-status {
        margin: 6px 0 0;
        font-size: 15.5px;
        font-weight: 700;
        color: #F8FAFC;
        letter-spacing: -0.015em;
        min-height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        animation: srBioStatusFade 0.28s ease both;
      }
      #${OVERLAY_ID} .sr-bm-sub {
        margin: 5px 0 0;
        font-size: 12.5px;
        color: rgba(203, 213, 225, 0.72);
        line-height: 1.45;
        min-height: 18px;
      }

      #${OVERLAY_ID} .sr-bm-steps-dots {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-top: 2px;
      }
      #${OVERLAY_ID} .sr-bm-dot {
        width: 6px;
        height: 6px;
        border-radius: 99px;
        background: rgba(255, 255, 255, 0.16);
        transition: width 0.32s ease, background 0.32s ease;
      }
      #${OVERLAY_ID}.is-app .sr-bm-dot.is-active {
        width: 22px;
        background: #1AD079;
      }
      #${OVERLAY_ID}.is-admin .sr-bm-dot.is-active {
        width: 22px;
        background: #38BDF8;
      }
      #${OVERLAY_ID} .sr-bm-dot.is-done {
        background: #34D399;
      }

      #${OVERLAY_ID} .sr-bm-check {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(26, 208, 121, 0.18);
        border: 1px solid rgba(26, 208, 121, 0.55);
        color: #34D399;
        animation: srBioCheckPop 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @media (prefers-reduced-motion: reduce) {
        #${OVERLAY_ID} .sr-bm-ring-cw,
        #${OVERLAY_ID} .sr-bm-ring-ccw,
        #${OVERLAY_ID} .sr-bm-laser,
        #${OVERLAY_ID} .sr-bm-ambient {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildFingerprintSvg(isAdmin) {
    const accent = isAdmin ? '#38BDF8' : '#1AD079';
    const bg0 = isAdmin ? '#0E1C2D' : '#07291E';
    const bg1 = isAdmin ? '#060B12' : '#02100C';
    return `
      <svg viewBox="0 0 320 320" width="82" height="82" style="display:block;" aria-hidden="true">
        <defs>
          <linearGradient id="srBmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bg0}"/>
            <stop offset="100%" stop-color="${bg1}"/>
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="308" height="308" rx="64" fill="url(#srBmGrad)" stroke="${accent}" stroke-opacity="0.45" stroke-width="4"/>
        <g transform="translate(156, 126)" fill="none" stroke="#ECFDF5" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
          <path d="M -46 -42 C -32 -78, 32 -78, 48 -38 C 54 -22, 54 -4, 52 14"/>
          <path d="M -54 -14 C -52 -42, -34 -62, -6 -64 C 24 -66, 40 -44, 40 -14 C 40 4, 38 18, 48 28"/>
          <path d="M -54 4 C -36 2, -24 -12, -20 -32 C -16 -48, 0 -52, 14 -46 C 26 -40, 28 -22, 26 -2 C 24 16, 28 30, 46 38"/>
          <path d="M -52 22 C -30 18, -14 2, -8 -22 C -4 -36, 12 -34, 14 -18 C 16 2, 12 22, 24 38"/>
          <path d="M -46 38 C -24 32, -6 16, 0 -10"/>
          <path d="M -18 28 C -6 22, 6 22, 18 32"/>
          <path d="M -2 10 L 4 23"/>
          <path d="M -44 52 C -26 38, -2 36, 12 46"/>
          <path d="M -38 68 C -22 54, -4 54, 8 64"/>
          <path d="M -26 82 C -14 72, -2 72, 6 80"/>
          <path d="M -14 92 C -8 87, -2 87, 3 91"/>
          <g transform="translate(38, 64)" stroke="none">
            <circle cx="0" cy="0" r="32" fill="${accent}"/>
            <circle cx="0" cy="-6" r="9" fill="#041B14"/>
            <path d="M -5 -1 L 5 -1 L 9 16 L -9 16 Z" fill="#041B14"/>
          </g>
        </g>
      </svg>
    `;
  }

  let activeRun = null;

  function clearRunTimers(run) {
    if (!run) return;
    run.timers.forEach((id) => clearTimeout(id));
    run.timers = [];
  }

  function start(options = {}) {
    injectStyles();
    if (activeRun) abort();

    const mode = options.mode === 'admin' ? 'admin' : 'app';
    const isAdmin = mode === 'admin';
    const accent = isAdmin ? '#38BDF8' : '#1AD079';
    const secondaryAccent = '#1AD079';
    const contextLabel = String(options.contextLabel || (isAdmin ? 'Sovereign Control OS' : 'Verified Shift Workspace'));

    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    const steps = isAdmin
      ? [
          { title: 'Signing you in…', sub: 'Authenticating corporate credentials', pct: 24 },
          { title: 'Verifying clearance…', sub: contextLabel, pct: 58 },
          { title: 'Loading Admin OS…', sub: 'Establishing encrypted HttpOnly session', pct: 86 }
        ]
      : [
          { title: 'Signing you in…', sub: 'Authenticating your workspace credentials', pct: 24 },
          { title: 'Verifying workspace…', sub: contextLabel, pct: 58 },
          { title: 'Preparing ShiftRelay…', sub: 'Syncing roster, timecards & payroll ledger', pct: 86 }
        ];

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = isAdmin ? 'is-admin' : 'is-app';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Signing you in to ShiftRelay');

    overlay.innerHTML = `
      <div class="sr-bm-grid" aria-hidden="true"></div>
      <div class="sr-bm-top-beam" aria-hidden="true">
        <div class="sr-bm-top-beam-fill" id="sr-bm-beam-fill"></div>
      </div>
      <div class="sr-bm-ambient" aria-hidden="true"></div>

      <div class="sr-bm-core">
        <div class="sr-bm-orb" id="sr-bm-orb">
          <svg class="sr-bm-ring-cw" viewBox="0 0 146 146" width="146" height="146" aria-hidden="true">
            <circle cx="73" cy="73" r="69" fill="none" stroke="${accent}" stroke-opacity="0.2" stroke-width="1.5"/>
            <path d="M 73 4 A 69 69 0 0 1 142 73" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 73 142 A 69 69 0 0 1 18 114" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <svg class="sr-bm-ring-ccw" viewBox="0 0 126 126" width="126" height="126" aria-hidden="true">
            <circle cx="63" cy="63" r="59" fill="none" stroke="${secondaryAccent}" stroke-opacity="0.34" stroke-width="1.5" stroke-dasharray="5 8" stroke-linecap="round"/>
          </svg>
          <div class="sr-bm-icon-frame">
            ${buildFingerprintSvg(isAdmin)}
            <div class="sr-bm-laser"></div>
          </div>
        </div>

        <div>
          <div class="sr-bm-kicker">${isAdmin ? 'SHIFTRELAY ADMIN OS' : 'SHIFTRELAY WORKSPACE'}</div>
          <div class="sr-bm-status" id="sr-bm-status">${steps[0].title}</div>
          <div class="sr-bm-sub" id="sr-bm-sub">${steps[0].sub}</div>
        </div>

        <div class="sr-bm-steps-dots" aria-hidden="true">
          <span class="sr-bm-dot is-active" data-bm-dot="0"></span>
          <span class="sr-bm-dot" data-bm-dot="1"></span>
          <span class="sr-bm-dot" data-bm-dot="2"></span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const run = {
      overlay,
      mode,
      accent,
      startedAt: Date.now(),
      minHoldMs: typeof options.minHoldMs === 'number' ? options.minHoldMs : 2350,
      timers: [],
      aborted: false
    };

    requestAnimationFrame(() => {
      if (run.aborted || !document.body.contains(overlay)) return;
      overlay.classList.add('is-visible');
      const beam = overlay.querySelector('#sr-bm-beam-fill');
      if (beam) beam.style.width = `${steps[0].pct}%`;
    });

    const advanceTo = (idx) => {
      if (run.aborted || !document.body.contains(overlay)) return;
      const step = steps[idx];
      if (!step) return;
      const st = overlay.querySelector('#sr-bm-status');
      const sb = overlay.querySelector('#sr-bm-sub');
      const bm = overlay.querySelector('#sr-bm-beam-fill');
      if (st) {
        st.style.animation = 'none';
        void st.offsetWidth;
        st.style.animation = '';
        st.textContent = step.title;
      }
      if (sb) sb.textContent = step.sub;
      if (bm) bm.style.width = `${step.pct}%`;
      overlay.querySelectorAll('[data-bm-dot]').forEach((dot, i) => {
        dot.classList.toggle('is-done', i < idx);
        dot.classList.toggle('is-active', i === idx);
      });
    };

    run.timers.push(setTimeout(() => advanceTo(1), 820));
    run.timers.push(setTimeout(() => advanceTo(2), 1650));

    activeRun = run;
    return run;
  }

  function finishSuccess(doneLabel) {
    const run = activeRun;
    if (!run || run.aborted) return Promise.resolve();
    const { overlay, mode, accent, startedAt, minHoldMs } = run;
    const finalText = doneLabel || (mode === 'admin' ? 'Clearance Verified' : 'Workspace Ready');
    const finalSub = mode === 'admin' ? 'Entering ShiftRelay Admin Console' : 'Welcome back to ShiftRelay';
    const elapsed = Date.now() - startedAt;
    const waitMs = Math.max(0, minHoldMs - elapsed);

    return new Promise((resolve) => {
      const t1 = setTimeout(() => {
        if (run.aborted || !document.body.contains(overlay)) {
          resolve();
          return;
        }
        clearRunTimers(run);
        overlay.classList.add('is-verified');

        const bm = overlay.querySelector('#sr-bm-beam-fill');
        const st = overlay.querySelector('#sr-bm-status');
        const sb = overlay.querySelector('#sr-bm-sub');
        const orb = overlay.querySelector('#sr-bm-orb');

        if (bm) bm.style.width = '100%';
        overlay.querySelectorAll('[data-bm-dot]').forEach((dot) => {
          dot.classList.remove('is-active');
          dot.classList.add('is-done');
        });
        if (st) {
          st.innerHTML = `<span class="sr-bm-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span>${finalText}</span>`;
        }
        if (sb) sb.textContent = finalSub;

        if (orb) {
          const r1 = document.createElement('div');
          r1.className = 'sr-bm-ripple';
          r1.style.border = `2px solid ${accent}`;
          orb.appendChild(r1);
          const r2 = document.createElement('div');
          r2.className = 'sr-bm-ripple';
          r2.style.border = '1.5px solid #1AD079';
          r2.style.animationDelay = '0.16s';
          orb.appendChild(r2);
        }

        const t2 = setTimeout(() => {
          overlay.classList.add('is-leaving');
          const t3 = setTimeout(() => {
            overlay.remove();
            if (activeRun === run) activeRun = null;
            resolve();
          }, 420);
          run.timers.push(t3);
        }, 620);
        run.timers.push(t2);
      }, waitMs);
      run.timers.push(t1);
    });
  }

  function abort() {
    const run = activeRun;
    if (!run) return;
    run.aborted = true;
    clearRunTimers(run);
    const { overlay } = run;
    activeRun = null;
    if (overlay && document.body.contains(overlay)) {
      overlay.classList.add('is-leaving');
      setTimeout(() => overlay.remove(), 220);
    }
  }

  window.ShiftRelaySignInMotion = {
    start,
    finishSuccess,
    abort
  };
})();
