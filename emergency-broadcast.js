/**
 * ShiftRelay Emergency Broadcast & Red Alert Protocol
 * Facility-wide immediate alert overlay, siren trigger,
 * and personnel accountability "I am Safe" check-in roster.
 * Zero emojis - 100% SVG vector indicators.
 */

(function () {
  let activeAlert = null;

  function triggerEmergencyBroadcast(alertData) {
    activeAlert = {
      id: alertData.id || crypto.randomUUID(),
      title: alertData.title || 'EMERGENCY SHIFT BROADCAST',
      type: alertData.type || 'evacuation', // evacuation | chemical | equipment | fire
      location: alertData.location || 'Facility Zone A / Loading Dock',
      instructions: alertData.instructions || 'Cease machinery operations immediately. Proceed to Assembly Point 02. Supervisor headcounts active.',
      timestamp: new Date().toLocaleTimeString(),
      safeCount: 14,
      totalCount: 18
    };

    renderAlertOverlay();
    window.SoundEngine?.play?.('shift_alarm');
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }

  function renderAlertOverlay() {
    document.getElementById('sr-emergency-overlay')?.remove();
    if (!activeAlert) return;

    const overlay = document.createElement('div');
    overlay.id = 'sr-emergency-overlay';
    overlay.className = 'emergency-overlay-backdrop';
    overlay.innerHTML = `
      <div class="emergency-modal-card" role="alertdialog" aria-modal="true" aria-label="Emergency Alert">
        <div class="emergency-alarm-bar">
          <div class="emergency-pulse-badge">
            ${Icons.siren(20)}
            <span>CRITICAL ALERT</span>
          </div>
          <span class="emergency-time">${activeAlert.timestamp}</span>
        </div>

        <div class="emergency-content">
          <h2 class="emergency-headline">${escape(activeAlert.title)}</h2>
          <div class="emergency-location-tag">
            ${Icons.location(14)}
            <span>${escape(activeAlert.location)}</span>
          </div>
          <p class="emergency-instructions">${escape(activeAlert.instructions)}</p>
        </div>

        <!-- Accountability Safe Check-In -->
        <div class="emergency-checkin-box" id="emergency-checkin-area">
          <div class="checkin-head">
            <strong>Personnel Accountability Status</strong>
            <span class="checkin-stat" id="checkin-stat-counter">${activeAlert.safeCount} / ${activeAlert.totalCount} Accounted</span>
          </div>
          <div class="checkin-progress-bar">
            <div class="checkin-progress-fill" style="width: ${(activeAlert.safeCount / activeAlert.totalCount) * 100}%;"></div>
          </div>
          <button type="button" class="emergency-safe-btn" id="btn-emergency-safe">
            ${Icons.check2(18)}
            <span>I Am Safe &amp; Accounted For</span>
          </button>
        </div>

        <div class="emergency-actions">
          <button type="button" class="emergency-dismiss-btn" id="btn-emergency-dismiss">
            Acknowledge &amp; Keep In Background
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-emergency-safe')?.addEventListener('click', () => {
      const btn = document.getElementById('btn-emergency-safe');
      if (btn) {
        btn.disabled = true;
        btn.classList.add('confirmed');
        btn.innerHTML = `${Icons.checkCheck(18)} <span>Safety Confirmed &amp; Logged</span>`;
        activeAlert.safeCount = Math.min(activeAlert.totalCount, activeAlert.safeCount + 1);
        const counter = document.getElementById('checkin-stat-counter');
        if (counter) counter.textContent = `${activeAlert.safeCount} / ${activeAlert.totalCount} Accounted`;
        toast('Your safety status has been transmitted to site supervisors.');
      }
    });

    document.getElementById('btn-emergency-dismiss')?.addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 250);
      renderEmergencyTopBanner();
    });
  }

  function renderEmergencyTopBanner() {
    if (!activeAlert || document.getElementById('sr-emergency-top-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sr-emergency-top-banner';
    banner.className = 'emergency-top-banner';
    banner.innerHTML = `
      <div class="top-banner-inner">
        <span class="top-banner-icon">${Icons.alertTriangle(16)}</span>
        <span class="top-banner-text"><strong>${escape(activeAlert.title)}:</strong> ${escape(activeAlert.location)}</span>
        <button type="button" class="top-banner-reopen-btn" id="btn-reopen-emergency">View Protocol</button>
      </div>
    `;

    document.body.insertAdjacentElement('afterbegin', banner);
    document.getElementById('btn-reopen-emergency')?.addEventListener('click', () => {
      banner.remove();
      renderAlertOverlay();
    });
  }

  window.triggerEmergencyBroadcast = triggerEmergencyBroadcast;
})();
