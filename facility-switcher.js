/**
 * ShiftRelay Multi-Facility & Ward Switcher
 * Allows frontline workers and multi-site leads to switch
 * operational facility context with zero reload and instant state update.
 * Zero emojis - 100% clean SVG vector icons.
 */

(function () {
  const FACILITIES = [
    {
      id: 'fac-main',
      name: 'Main Campus — Zone A/B',
      location: 'Central Distribution Hub',
      shiftsActive: 14,
      status: 'Optimal Relay'
    },
    {
      id: 'fac-north',
      name: 'North Depot — Cold Chain',
      location: 'Refrigerated Storage 04',
      shiftsActive: 6,
      status: 'Relay in Progress'
    },
    {
      id: 'fac-east',
      name: 'East Wing — Triage Unit',
      location: 'Medical Emergency Station',
      shiftsActive: 9,
      status: 'Full Coverage'
    }
  ];

  function getActiveFacility() {
    const savedId = localStorage.getItem('sr_active_facility') || 'fac-main';
    return FACILITIES.find(f => f.id === savedId) || FACILITIES[0];
  }

  function renderFacilityPill() {
    const existing = document.getElementById('facility-switcher-pill');
    if (existing) existing.remove();

    const titleRow = document.querySelector('.header-row > div:first-child');
    if (!titleRow) return;

    const current = getActiveFacility();
    const pill = document.createElement('button');
    pill.id = 'facility-switcher-pill';
    pill.className = 'facility-pill-btn';
    pill.type = 'button';
    pill.innerHTML = `
      <span class="facility-pill-dot"></span>
      <span class="facility-pill-name">${escape(current.name.split('—')[0].trim())}</span>
      ${Icons.arrowRight(12)}
    `;

    pill.addEventListener('click', openFacilityModal);
    titleRow.appendChild(pill);
  }

  function openFacilityModal() {
    document.getElementById('sr-facility-modal-backdrop')?.remove();

    const current = getActiveFacility();
    const backdrop = document.createElement('div');
    backdrop.id = 'sr-facility-modal-backdrop';
    backdrop.className = 'facility-modal-backdrop';
    backdrop.innerHTML = `
      <div class="facility-sheet" role="dialog" aria-modal="true" aria-label="Switch Facility">
        <div class="facility-sheet-handle"></div>
        <div class="facility-sheet-head">
          <div>
            <h3>Switch Facility Context</h3>
            <p>Select your active worksite or department</p>
          </div>
          <button type="button" class="facility-close-btn" id="btn-close-facility">${Icons.close(16)}</button>
        </div>

        <div class="facility-list">
          ${FACILITIES.map(fac => {
            const isSelected = fac.id === current.id;
            return `
              <div class="facility-item-card ${isSelected ? 'selected' : ''}" data-facility-id="${fac.id}">
                <div class="facility-item-icon">${Icons.building(18)}</div>
                <div class="facility-item-info">
                  <strong>${escape(fac.name)}</strong>
                  <span>${escape(fac.location)}</span>
                  <small class="facility-item-stat">${Icons.clock(12)} ${fac.shiftsActive} active shifts · ${fac.status}</small>
                </div>
                ${isSelected ? `<span class="facility-check-icon">${Icons.check(16)}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeModal = () => {
      backdrop.style.opacity = '0';
      setTimeout(() => backdrop.remove(), 200);
    };

    document.getElementById('btn-close-facility')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    backdrop.querySelectorAll('.facility-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.facilityId;
        localStorage.setItem('sr_active_facility', id);
        closeModal();
        renderFacilityPill();
        const selected = FACILITIES.find(f => f.id === id);
        toast(`Active facility switched to ${selected?.name}`);
      });
    });
  }

  window.initFacilitySwitcher = renderFacilityPill;
  window.openFacilityModal = openFacilityModal;

  window.addEventListener('load', () => {
    setTimeout(renderFacilityPill, 1200);
  });
})();
