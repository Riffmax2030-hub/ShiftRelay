/**
 * ShiftRelay Interactive Investor & Team Walkthrough Tour
 * 5-scene guided tour highlighting the core operating engine differentiators.
 */

const tourSlides = [
  {
    step: '01 / 05',
    kicker: 'CONTINUITY & ACCOUNTABILITY',
    title: 'The Digital Handover Feed',
    description: 'Outgoing workers log shift updates, equipment readings, and safety events in seconds. Shift status is tagged Normal, Attention Needed, or Critical Alert with SVG vector status indicators. Server-side AI distills updates into prioritized actions pinned directly to the incoming team’s dashboard in strict 2/2 task completion format.',
    metricLabel: 'Context Loss Prevented',
    metricValue: '100%',
    view: 'handover',
    btnLabel: 'Try Handover Creator →'
  },
  {
    step: '02 / 05',
    kicker: 'SUPERVISOR REVIEW QUEUE',
    title: 'Verified Approvals Before Relay',
    description: 'Work does not move forward blindly. Supervisors inspect handovers and verify evidence. Once approved, the incoming team receives an instant push and acknowledges receipt with an immutable audit trail.',
    metricLabel: 'Handover Relay Speed',
    metricValue: '< 60s',
    view: 'dashboard',
    btnLabel: 'View Dashboard Queue →'
  },
  {
    step: '03 / 05',
    kicker: 'COMMUNITY & VIDEO STREAMING',
    title: 'Frontline Shift Lounge',
    description: 'The global professional network for 2.7 billion frontline workers. Staff share prep setups, safety wins, and shift milestones with direct MP4 video streaming. Strict Workplace Confidentiality filters prevent proprietary data leaks. Zero emoji controls — 100% clean SVG vectors.',
    metricLabel: 'Frontline Worker Reach',
    metricValue: '2.7 Billion',
    view: 'lounge',
    btnLabel: 'Explore Shift Lounge →'
  },
  {
    step: '04 / 05',
    kicker: 'PORTABLE REPUTATION',
    title: 'Worker Passport & Proof-of-Work',
    description: 'Frontline workers build verifiable professional credentials that travel with them. Attendance streaks, reliability scores, peer skill endorsements, and verified employer badges prove real-world work ethic to future employers.',
    metricLabel: 'Reputation Verification',
    metricValue: 'Proof-of-Work',
    view: 'passport',
    btnLabel: 'View Worker Passport →'
  },
  {
    step: '05 / 05',
    kicker: 'MULTI-TENANCY & COVERAGE',
    title: 'Coverage Marketplace & 6-Digit Isolation',
    description: 'Workers claim open shifts with a single tap to cover unexpected absences. Multi-tenant architecture locks companies into isolated portals via unique 6-digit codes with full data isolation and role-based permissions.',
    metricLabel: 'Tenant Isolation',
    metricValue: 'Enterprise Grade',
    view: 'calendar',
    btnLabel: 'Browse Open Shifts →'
  }
];

let currentTourSlide = 0;

function openInvestorTourModal() {
  currentTourSlide = 0;
  const existing = document.getElementById('tour-modal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="tour-modal">
      <div class="modal-card tour-modal-card">
        <div class="modal-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0d524d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text-main);">ShiftRelay Engine Tour · Frontline Platform Overview</h3>
          </div>
          <button class="modal-close" id="btn-close-tour" aria-label="Close walkthrough">${Icons.close(16)}</button>
        </div>
        <div class="modal-body tour-modal-body" id="tour-slide-container"></div>
        <div class="tour-modal-footer">
          <div class="tour-dots" id="tour-dots"></div>
          <div style="display:flex; gap:8px;">
            <button class="secondary" id="btn-tour-prev" style="min-height:40px; padding:0 16px;">Back</button>
            <button class="primary" id="btn-tour-next" style="min-height:40px; padding:0 18px;">Next</button>
          </div>
        </div>
      </div>
    </div>
  `);

  renderTourSlide();

  document.getElementById('btn-close-tour')?.addEventListener('click', () => {
    document.getElementById('tour-modal')?.remove();
  });

  document.getElementById('btn-tour-prev')?.addEventListener('click', () => {
    if (currentTourSlide > 0) {
      currentTourSlide--;
      renderTourSlide();
    }
  });

  document.getElementById('btn-tour-next')?.addEventListener('click', () => {
    if (currentTourSlide < tourSlides.length - 1) {
      currentTourSlide++;
      renderTourSlide();
    } else {
      document.getElementById('tour-modal')?.remove();
    }
  });
}

function renderTourSlide() {
  const slide = tourSlides[currentTourSlide];
  const container = document.getElementById('tour-slide-container');
  const dotsContainer = document.getElementById('tour-dots');
  const nextBtn = document.getElementById('btn-tour-next');
  const prevBtn = document.getElementById('btn-tour-prev');

  if (!container) return;

  if (prevBtn) prevBtn.disabled = currentTourSlide === 0;
  if (nextBtn) nextBtn.textContent = currentTourSlide === tourSlides.length - 1 ? 'Finish Tour ✓' : 'Next →';

  container.innerHTML = `
    <div class="tour-slide-content">
      <div class="tour-slide-meta">
        <span class="tour-step-badge">${slide.step}</span>
        <span class="tour-kicker">${slide.kicker}</span>
      </div>
      <h2 class="tour-title">${slide.title}</h2>
      <p class="tour-desc">${slide.description}</p>
      
      <div class="tour-metric-card">
        <div>
          <span>${slide.metricLabel}</span>
          <strong>${slide.metricValue}</strong>
        </div>
        <button class="primary tour-try-btn" id="btn-tour-action" data-tour-view="${slide.view}">
          ${slide.btnLabel}
        </button>
      </div>
    </div>
  `;

  if (dotsContainer) {
    dotsContainer.innerHTML = tourSlides.map((_, i) => `
      <span class="tour-dot ${i === currentTourSlide ? 'active' : ''}"></span>
    `).join('');
  }

  document.getElementById('btn-tour-action')?.addEventListener('click', (e) => {
    const view = e.currentTarget.dataset.tourView;
    document.getElementById('tour-modal')?.remove();
    if (state.user && typeof go === 'function') {
      go(view);
    } else {
      // If on landing page, click role preview or scroll to relevant section
      const firstRole = document.querySelector('[data-login]');
      if (firstRole) {
        firstRole.click();
        setTimeout(() => { if (typeof go === 'function') go(view); }, 300);
      }
    }
  });
}

// Global click handlers for tour triggers
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-landing-tour') || e.target.closest('#btn-header-tour') || e.target.closest('.tour-trigger-btn')) {
    e.preventDefault();
    openInvestorTourModal();
  }
});

window.openInvestorTourModal = openInvestorTourModal;
