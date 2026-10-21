/**
 * ShiftRelay Rapid Incident & Near-Miss Safety Logger
 * Enables under-15-second hazard reporting with severity tiers,
 * camera photo evidence, and immediate handover alert escalation.
 */

(function () {
  let selectedSeverity = 'medium';

  function openIncidentModal(opts = {}) {
    document.getElementById('safety-modal-backdrop')?.remove();

    const zones = ['General Facility', 'Zone A Receiving', 'ICU Ward 4', 'Fabrication Floor', 'Cold Storage Bay', 'Assembly Line 2', 'Mechanical Basement'];
    const categories = ['Safety Hazard', 'Machinery Malfunction', 'Chemical / Spill', 'Near-Miss', 'PPE Non-Compliance', 'Service Disruption'];

    const backdrop = document.createElement('div');
    backdrop.id = 'safety-modal-backdrop';
    backdrop.className = 'safety-modal-backdrop';
    backdrop.innerHTML = `
      <div class="safety-modal-card" role="dialog" aria-modal="true" aria-label="Rapid Safety Incident Report">
        <div class="safety-modal-header">
          <div>
            <h3>${window.Icons?.shield ? window.Icons.shield(18) : ''} Report Hazard / Incident</h3>
            <p>Immediate Frontline Safety &amp; Handover Escalation</p>
          </div>
          <button class="modal-close" id="btn-close-safety" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;display:grid;place-items:center;cursor:pointer;" aria-label="Close">
            ${window.Icons?.close ? window.Icons.close(16) : '×'}
          </button>
        </div>

        <div class="safety-modal-body">
          <!-- Severity Tier -->
          <div class="safety-field-group">
            <label>Severity Tier</label>
            <div class="severity-selector-grid">
              <button type="button" class="severity-pill-btn sev-low" data-sev="low">Low</button>
              <button type="button" class="severity-pill-btn sev-medium active" data-sev="medium">Medium</button>
              <button type="button" class="severity-pill-btn sev-high" data-sev="high">High</button>
              <button type="button" class="severity-pill-btn sev-critical" data-sev="critical">Critical</button>
            </div>
          </div>

          <!-- Category -->
          <div class="safety-field-group">
            <label>Incident Category</label>
            <select id="incident-category">
              ${categories.map(c => `<option value="${escape(c)}">${escape(c)}</option>`).join('')}
            </select>
          </div>

          <!-- Zone / Location -->
          <div class="safety-field-group">
            <label>Facility Zone / Station</label>
            <select id="incident-zone">
              ${zones.map(z => `<option value="${escape(z)}">${escape(z)}</option>`).join('')}
            </select>
          </div>

          <!-- Description -->
          <div class="safety-field-group">
            <label>What happened? (Quick summary)</label>
            <textarea id="incident-desc" placeholder="Briefly describe the hazard, affected machinery, or immediate safety precautions taken…"></textarea>
          </div>

          <!-- Photo Evidence -->
          <div class="safety-field-group">
            <label>Photo Evidence (Optional)</label>
            <button type="button" class="secondary" id="btn-snap-incident-photo" style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;min-height:38px;">
              ${window.Icons?.camera ? window.Icons.camera(16) : ''} Snap Hazard Photo
            </button>
            <input type="file" id="incident-photo-input" accept="image/*" capture="environment" class="hidden" />
            <div id="incident-photo-preview" class="hidden" style="margin-top:8px;"></div>
          </div>
        </div>

        <div class="safety-modal-actions">
          <button class="secondary" id="btn-cancel-safety" type="button">Cancel</button>
          <button class="primary" id="btn-submit-incident" type="button" style="background:#b91c1c;border-color:#b91c1c;">
            ${window.Icons?.shield ? window.Icons.shield(14) : ''} Submit &amp; Alert Team
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Severity selection
    backdrop.querySelectorAll('.severity-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.severity-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSeverity = btn.dataset.sev;
        window.SoundEngine?.play('click');
      });
    });

    // Photo Capture
    const fileInput = document.getElementById('incident-photo-input');
    const photoBtn = document.getElementById('btn-snap-incident-photo');
    const photoPreview = document.getElementById('incident-photo-preview');
    let attachedPhotoUrl = null;

    photoBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        attachedPhotoUrl = e.target.result;
        if (photoPreview) {
          photoPreview.innerHTML = `
            <img src="${attachedPhotoUrl}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;" alt="Hazard Photo" />
          `;
          photoPreview.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    });

    // Close
    const closeModal = () => {
      backdrop.style.opacity = '0';
      setTimeout(() => backdrop.remove(), 200);
    };

    document.getElementById('btn-close-safety')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-safety')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Submit
    document.getElementById('btn-submit-incident')?.addEventListener('click', async () => {
      const category = document.getElementById('incident-category')?.value;
      const zone = document.getElementById('incident-zone')?.value;
      const desc = document.getElementById('incident-desc')?.value.trim();

      if (!desc) {
        toast('Please enter a brief summary of the incident.');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-incident');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Alerting…';

      try {
        await window.api('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            severity: selectedSeverity,
            description: `[${zone}] ${desc}`,
            zone,
            imageUrl: attachedPhotoUrl
          })
        });

        window.SoundEngine?.play('alarm');
        closeModal();
        toast('Safety alert broadcasted to supervisor and incoming shift!');

        // Render alert banner in dashboard if available
        renderActiveIncidentBanner({
          category,
          severity: selectedSeverity,
          zone,
          description: desc
        });
      } catch (err) {
        toast('Error reporting incident: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit & Alert Team';
      }
    });
  }

  function renderActiveIncidentBanner(incident) {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;
    document.getElementById('live-incident-alert')?.remove();

    const banner = document.createElement('div');
    banner.id = 'live-incident-alert';
    banner.className = 'incident-alert-banner';
    banner.innerHTML = `
      <div>
        <h4 class="incident-alert-title">
          ${window.Icons?.shield ? window.Icons.shield(16) : ''}
          ${incident.severity.toUpperCase()} INCIDENT: ${escape(incident.category)}
        </h4>
        <p class="incident-alert-desc">Station: ${escape(incident.zone)} · ${escape(incident.description)}</p>
      </div>
      <button class="secondary" id="btn-ack-incident" style="background:rgba(255,255,255,0.2);border-color:transparent;color:#fff;font-size:11.5px;padding:6px 12px;border-radius:8px;font-weight:700;">
        Acknowledge
      </button>
    `;

    dashboard.insertBefore(banner, dashboard.firstChild);
    document.getElementById('btn-ack-incident')?.addEventListener('click', () => {
      banner.remove();
      toast('Hazard acknowledged for this shift turnover.');
    });
  }

  window.openIncidentModal = openIncidentModal;
  window.renderActiveIncidentBanner = renderActiveIncidentBanner;
})();
