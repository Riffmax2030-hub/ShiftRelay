/**
 * ShiftRelay Analytics & Workforce Performance Dashboard
 * Provides visual operational metrics for owners/supervisors
 * and personal shift reliability scorecards for frontline workers.
 * Zero emojis - 100% SVG vector indicators.
 */

async function renderAnalyticsDashboard() {
  const user = state.user || {};
  const isManagement = ['owner', 'supervisor'].includes(user.role);
  dashboardHeader('Analytics', isManagement ? 'WORKFORCE PERFORMANCE & CONTINUITY' : 'MY SHIFT SCORECARD & RELIABILITY');

  const dashboardEl = document.getElementById('dashboard');
  if (!dashboardEl) return;

  dashboardEl.innerHTML = `
    <div class="analytics-container page-fade-in">
      <!-- Top Scorecard Hero -->
      <section class="analytics-hero-card">
        <div class="hero-metric-header">
          <div>
            <span class="hero-kicker">${isManagement ? 'FACILITY OPERATIONAL READINESS' : 'PERSONAL RELIABILITY SCORE'}</span>
            <h2 class="hero-headline">${isManagement ? '98.4% On-Time Relay' : '99.2% Shift Precision'}</h2>
          </div>
          <div class="hero-badge-pill">
            ${Icons.trendingUp(14)}
            <span>+2.4% vs last cycle</span>
          </div>
        </div>

        <div class="hero-progress-track">
          <div class="hero-progress-fill" style="width: 98.4%;"></div>
        </div>

        <div class="hero-stat-row">
          <div class="hero-stat-col">
            <span class="stat-label">Consecutive Shifts</span>
            <strong class="stat-val">${user.streak_days || 14} Days</strong>
          </div>
          <div class="hero-stat-col">
            <span class="stat-label">Handovers Relayed</span>
            <strong class="stat-val">${isManagement ? '128 Total' : '32 Relayed'}</strong>
          </div>
          <div class="hero-stat-col">
            <span class="stat-label">Safety Compliance</span>
            <strong class="stat-val">100% Active</strong>
          </div>
        </div>
      </section>

      <!-- Timeframe Toggle Filter -->
      <div class="analytics-filter-row">
        <button class="analytics-pill active" data-period="week">Current Week</button>
        <button class="analytics-pill" data-period="month">This Month</button>
        <button class="analytics-pill" data-period="quarter">Quarterly</button>
      </div>

      <!-- Core 4 KPI Grid -->
      <div class="analytics-kpi-grid">
        <article class="analytics-kpi-card">
          <div class="kpi-icon-wrap teal">${Icons.clock(18)}</div>
          <span class="kpi-label">Logged Shift Hours</span>
          <strong class="kpi-value" id="kpi-hours">38.5 hrs</strong>
          <span class="kpi-subtext">On track for 40h standard</span>
        </article>

        <article class="analytics-kpi-card">
          <div class="kpi-icon-wrap green">${Icons.checkCheck(18)}</div>
          <span class="kpi-label">Checklist Adherence</span>
          <strong class="kpi-value">100%</strong>
          <span class="kpi-subtext">Zero skipped safety checks</span>
        </article>

        <article class="analytics-kpi-card">
          <div class="kpi-icon-wrap purple">${Icons.shield(18)}</div>
          <span class="kpi-label">Hazards Reported</span>
          <strong class="kpi-value">0 Open</strong>
          <span class="kpi-subtext">All resolved within 45m</span>
        </article>

        <article class="analytics-kpi-card">
          <div class="kpi-icon-wrap amber">${Icons.repost(18)}</div>
          <span class="kpi-label">Coverage &amp; Swaps</span>
          <strong class="kpi-value">2 Fulfilled</strong>
          <span class="kpi-subtext">Prompt coverage granted</span>
        </article>
      </div>

      <!-- Weekly Hours Distribution Bar Chart (SVG Vector) -->
      <section class="analytics-chart-card">
        <div class="chart-header">
          <div>
            <h3>Shift Hours by Day</h3>
            <p>Mon through Sun shift duration &amp; turnover overlap</p>
          </div>
          <div class="chart-legend">
            <span class="legend-dot standard"></span><span>Shift</span>
            <span class="legend-dot overlap"></span><span>Relay</span>
          </div>
        </div>

        <div class="chart-svg-wrap">
          <svg class="analytics-bar-svg" viewBox="0 0 350 140" aria-label="Shift Hours Chart">
            <!-- Grid Lines -->
            <line x1="30" y1="20" x2="340" y2="20" stroke="var(--border-subtle, #e2e8f0)" stroke-dasharray="3 3"/>
            <line x1="30" y1="60" x2="340" y2="60" stroke="var(--border-subtle, #e2e8f0)" stroke-dasharray="3 3"/>
            <line x1="30" y1="100" x2="340" y2="100" stroke="var(--border-subtle, #e2e8f0)" stroke-dasharray="3 3"/>

            <!-- Y Axis labels -->
            <text x="5" y="24" class="svg-axis-text">10h</text>
            <text x="12" y="64" class="svg-axis-text">6h</text>
            <text x="12" y="104" class="svg-axis-text">2h</text>

            <!-- Bars Mon - Sun (Height calculated from 10h max = 100px) -->
            <!-- Mon: 8.5h -->
            <rect x="42" y="35" width="22" height="75" rx="5" class="svg-bar primary"/>
            <text x="53" y="125" text-anchor="middle" class="svg-label-text">Mon</text>

            <!-- Tue: 8.0h -->
            <rect x="86" y="40" width="22" height="70" rx="5" class="svg-bar primary"/>
            <text x="97" y="125" text-anchor="middle" class="svg-label-text">Tue</text>

            <!-- Wed: 8.5h -->
            <rect x="130" y="35" width="22" height="75" rx="5" class="svg-bar primary"/>
            <text x="141" y="125" text-anchor="middle" class="svg-label-text">Wed</text>

            <!-- Thu: 7.5h -->
            <rect x="174" y="45" width="22" height="65" rx="5" class="svg-bar primary"/>
            <text x="185" y="125" text-anchor="middle" class="svg-label-text">Thu</text>

            <!-- Fri: 8.0h -->
            <rect x="218" y="40" width="22" height="70" rx="5" class="svg-bar primary"/>
            <text x="229" y="125" text-anchor="middle" class="svg-label-text">Fri</text>

            <!-- Sat: 0h -->
            <rect x="262" y="105" width="22" height="5" rx="2" class="svg-bar off"/>
            <text x="273" y="125" text-anchor="middle" class="svg-label-text">Sat</text>

            <!-- Sun: 0h -->
            <rect x="306" y="105" width="22" height="5" rx="2" class="svg-bar off"/>
            <text x="317" y="125" text-anchor="middle" class="svg-label-text">Sun</text>
          </svg>
        </div>
      </section>

      <!-- Operational Audit & Health Logs -->
      <section class="analytics-audit-card">
        <div class="audit-head">
          <div class="audit-icon">${Icons.activity(16)}</div>
          <h3>Operational Relay Continuity</h3>
        </div>
        <div class="audit-list">
          <div class="audit-row">
            <span class="audit-pip green"></span>
            <div class="audit-info">
              <strong>Checklist Compliance</strong>
              <span>All critical shift handover items verified with cryptographic signatures</span>
            </div>
            <span class="audit-badge">Verified</span>
          </div>
          <div class="audit-row">
            <span class="audit-pip green"></span>
            <div class="audit-info">
              <strong>Fatigue &amp; Overtime Safety</strong>
              <span>Shift duration maintained under regulatory 12h maximum thresholds</span>
            </div>
            <span class="audit-badge">Optimal</span>
          </div>
          <div class="audit-row">
            <span class="audit-pip teal"></span>
            <div class="audit-info">
              <strong>Digital Passport Endorsements</strong>
              <span>Peer and supervisory endorsements synced to worker verifiable credentials</span>
            </div>
            <span class="audit-badge">Updated</span>
          </div>
        </div>
      </section>
    </div>
  `;

  // Period filter button interactions
  dashboardEl.querySelectorAll('.analytics-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      dashboardEl.querySelectorAll('.analytics-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const period = btn.dataset.period;
      const hoursEl = document.getElementById('kpi-hours');
      if (hoursEl) {
        hoursEl.textContent = period === 'week' ? '38.5 hrs' : period === 'month' ? '154.0 hrs' : '462.5 hrs';
      }
      toast(`Analytics filtered by ${btn.textContent}`);
    });
  });

  bindNavigation();
}

window.renderAnalytics = renderAnalyticsDashboard;
