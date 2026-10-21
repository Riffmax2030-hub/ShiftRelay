/**
 * ShiftRelay First-Shift Worker Onboarding Carousel
 * Clean, lightweight 3-card mobile guide.
 * Zero emojis - 100% SVG vector indicators.
 */

(function () {
  const SLIDES = [
    {
      kicker: 'CONTINUITY PROTOCOL',
      title: 'Digital Handover Briefs',
      desc: 'Never walk into a shift blind. Review critical tasks, equipment states, and safety alerts left by the outgoing crew with clear vector verification.',
      icon: (size = 36) => Icons.layers(size)
    },
    {
      kicker: 'SCHEDULE FLEXIBILITY',
      title: 'Instant Shift Swaps',
      desc: 'Trade shifts or request teammate coverage with one tap. Supervisors review and approve with instant audit tracking.',
      icon: (size = 36) => Icons.repost(size)
    },
    {
      kicker: 'PORTABLE CAREER PROOF',
      title: 'Worker Passport Badges',
      desc: 'Your real-world punctuality, safety certifications, and peer endorsements travel with you as verified professional credentials.',
      icon: (size = 36) => Icons.badgeCheck(size)
    }
  ];

  let currentSlide = 0;

  function renderModal() {
    document.getElementById('sr-onboarding-modal-root')?.remove();

    const root = document.createElement('div');
    root.id = 'sr-onboarding-modal-root';
    root.className = 'onboarding-overlay';
    root.innerHTML = `
      <div class="onboarding-card" role="dialog" aria-modal="true" aria-label="First Shift Guide">
        <div class="onboarding-top-bar">
          <span class="onboarding-step-counter" id="onboarding-step-indicator">1 of 3</span>
          <button type="button" class="onboarding-skip-btn" id="btn-skip-onboarding">Skip</button>
        </div>

        <div class="onboarding-body" id="onboarding-slide-body">
          <!-- Populated by updateSlide -->
        </div>

        <div class="onboarding-footer">
          <div class="onboarding-dots" id="onboarding-dots-container">
            <span class="onboarding-dot active"></span>
            <span class="onboarding-dot"></span>
            <span class="onboarding-dot"></span>
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
    const slide = SLIDES[currentSlide];
    const bodyEl = document.getElementById('onboarding-slide-body');
    const counterEl = document.getElementById('onboarding-step-indicator');
    const nextBtn = document.getElementById('btn-next-onboarding');
    const dots = document.querySelectorAll('.onboarding-dot');

    if (!bodyEl) return;

    if (counterEl) counterEl.textContent = `${currentSlide + 1} of ${SLIDES.length}`;

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });

    bodyEl.innerHTML = `
      <div class="onboarding-icon-ring">
        ${slide.icon(42)}
      </div>
      <span class="onboarding-slide-kicker">${slide.kicker}</span>
      <h3 class="onboarding-slide-title">${slide.title}</h3>
      <p class="onboarding-slide-desc">${slide.desc}</p>
    `;

    if (nextBtn) {
      if (currentSlide === SLIDES.length - 1) {
        nextBtn.innerHTML = `<span>Start Shift</span> ${Icons.check(16)}`;
      } else {
        nextBtn.innerHTML = `<span>Next</span> ${Icons.arrowRight(16)}`;
      }
    }
  }

  function handleNext() {
    if (currentSlide < SLIDES.length - 1) {
      currentSlide++;
      updateSlide();
    } else {
      closeTour();
      toast('Ready for shift turnover.');
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
    if (!isDone && state.user) {
      // Delay slightly for smooth login entrance
      setTimeout(() => {
        openFirstShiftTour();
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
