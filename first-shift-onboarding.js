/**
 * ShiftRelay First-Shift Worker Onboarding Carousel
 * Clean, lightweight 3-card mobile guide.
 * Zero emojis - 100% SVG vector indicators.
 */

(function () {
  function getSlidesForUser() {
    const policy = window.state?.user?.attendancePolicy || {};
    const grace = Number(policy.graceMinutes ?? 10);
    const missInLabel = policy.missedClockInAction === 'pro_rata_deduct'
      ? 'Pro-rata unpaid unless pardoned/adjusted by your supervisor'
      : (policy.missedClockInAction === 'pardon_with_flag'
          ? 'Flagged for supervisor audit (no automatic deduction)'
          : 'Supervisor exception review before any deduction');
    const missOutLabel = policy.missedClockOutAction === 'auto_cap_shift_end'
      ? 'Auto-capped at scheduled shift end pending confirmation'
      : 'Supervisor review of actual departure time';

    return [
      {
        kicker: 'CONTINUITY PROTOCOL',
        title: 'Digital Handover Briefs',
        desc: 'Never walk into a shift blind. Review critical tasks, equipment states, and safety alerts left by the outgoing crew with clear vector verification.',
        icon: (size = 36) => Icons.layers(size)
      },
      {
        kicker: 'SCHEDULE FLEXIBILITY',
        title: 'Instant Shift Swaps & Reminders',
        desc: 'Receive automated clock-in reminders before your shift starts so you never lose a punch, and trade shifts with teammates with supervisor sign-off.',
        icon: (size = 36) => Icons.repost(size)
      },
      {
        kicker: 'TRANSPARENT NGN PAY POLICY',
        title: 'Employer Attendance & Pay Rules',
        isPolicySlide: true,
        policyVersion: policy.policyVersion || 'v1',
        desc: 'Zero hidden deductions. Every late arrival or missed punch follows your employer\'s written ShiftRelay policy:',
        bullets: [
          `Grace Period: ${grace} minutes at shift start (within grace = zero pay deduction).`,
          `Missed Clock-In: ${missInLabel}.`,
          `Missed Clock-Out: ${missOutLabel}.`,
          'Pardoned / Excused exceptions by your supervisor restore 100% of pay immediately (no double deductions).'
        ],
        icon: (size = 36) => Icons.badgeCheck(size)
      }
    ];
  }

  let currentSlide = 0;

  function renderModal() {
    document.getElementById('sr-onboarding-modal-root')?.remove();
    const slides = getSlidesForUser();

    const root = document.createElement('div');
    root.id = 'sr-onboarding-modal-root';
    root.className = 'onboarding-overlay';
    root.innerHTML = `
      <div class="onboarding-card" role="dialog" aria-modal="true" aria-label="First Shift & Policy Guide">
        <div class="onboarding-top-bar">
          <span class="onboarding-step-counter" id="onboarding-step-indicator">1 of ${slides.length}</span>
          <button type="button" class="onboarding-skip-btn" id="btn-skip-onboarding">Skip</button>
        </div>

        <div class="onboarding-body" id="onboarding-slide-body"></div>

        <div class="onboarding-footer">
          <div class="onboarding-dots" id="onboarding-dots-container">
            ${slides.map((_, idx) => `<span class="onboarding-dot ${idx === 0 ? 'active' : ''}"></span>`).join('')}
          </div>
          <button type="button" class="primary onboarding-next-btn" id="btn-next-onboarding">
            <span>Next</span>
            ${Icons.arrowRight(16)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    document.getElementById('btn-skip-onboarding')?.addEventListener('click', closeTour);
    document.getElementById('btn-next-onboarding')?.addEventListener('click', handleNext);

    updateSlide();
  }

  function updateSlide() {
    const slides = getSlidesForUser();
    const slide = slides[currentSlide] || slides[0];
    const bodyEl = document.getElementById('onboarding-slide-body');
    const counterEl = document.getElementById('onboarding-step-indicator');
    const nextBtn = document.getElementById('btn-next-onboarding');
    const dots = document.querySelectorAll('.onboarding-dot');

    if (!bodyEl) return;

    if (counterEl) counterEl.textContent = `${currentSlide + 1} of ${slides.length}`;

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });

    const bulletsHtml = Array.isArray(slide.bullets)
      ? `<ul style="text-align:left;font-size:12.5px;line-height:1.5;color:#334155;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px 12px 26px;margin:12px 0 0;">
          ${slide.bullets.map(b => `<li style="margin-bottom:5px;">${b}</li>`).join('')}
         </ul>`
      : '';

    bodyEl.innerHTML = `
      <div class="onboarding-icon-ring">
        ${slide.icon(42)}
      </div>
      <span class="onboarding-slide-kicker">${slide.kicker}</span>
      <h3 class="onboarding-slide-title">${slide.title}</h3>
      <p class="onboarding-slide-desc">${slide.desc}</p>
      ${bulletsHtml}
    `;

    if (nextBtn) {
      if (currentSlide === slides.length - 1) {
        nextBtn.innerHTML = `<span>Accept Policy &amp; Start</span> ${Icons.check(16)}`;
      } else {
        nextBtn.innerHTML = `<span>Next</span> ${Icons.arrowRight(16)}`;
      }
    }
  }

  async function handleNext() {
    const slides = getSlidesForUser();
    if (currentSlide < slides.length - 1) {
      currentSlide++;
      updateSlide();
    } else {
      const policyVersion = window.state?.user?.attendancePolicy?.policyVersion || 'v1';
      try {
        await fetch('/api/auth/acknowledge-policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ policyVersion })
        });
        if (window.state?.user) {
          window.state.user.policyRequiresAck = false;
          window.state.user.policyAcknowledgedVersion = policyVersion;
        }
      } catch (_) {}
      closeTour();
      window.toast?.('Attendance policy accepted. Ready for shift turnover.');
    }
  }

  function closeTour() {
    localStorage.setItem('sr_first_shift_onboarding_done', '1');
    const root = document.getElementById('sr-onboarding-modal-root');
    if (root) {
      root.style.opacity = '0';
      setTimeout(() => root.remove(), 250);
    }
  }

  function checkFirstVisit() {
    const isDone = localStorage.getItem('sr_first_shift_onboarding_done') === '1';
    const needsPolicyAck = Boolean(window.state?.user?.policyRequiresAck);
    if ((!isDone || needsPolicyAck) && window.state?.user) {
      setTimeout(() => {
        currentSlide = needsPolicyAck && isDone ? 2 : 0;
        renderModal();
      }, 1200);
    }
  }

  function openFirstShiftTour() {
    currentSlide = 0;
    renderModal();
  }

  window.openFirstShiftTour = openFirstShiftTour;
  window.checkFirstShiftOnboarding = checkFirstVisit;

  // Listen for login event
  window.addEventListener('load', () => {
    setTimeout(checkFirstVisit, 2000);
  });
})();
