/**
 * ShiftRelay Interactive Facility Zone Map & Station Checklist
 * Maps operational tasks to physical floor zones (loading bays, cleanrooms,
 * packaging lines, and triage wards) for spatial frontline context.
 */

(function () {
  const ZONES = [
    { id: 'zone_a', name: 'Zone A · Receiving Dock', type: 'Logistics / Intake', tasks: ['Forklift pre-check', 'Cold-chain dock temp check'], hasFlag: false },
    { id: 'zone_b', name: 'Zone B · Production Floor', type: 'Manufacturing / Assembly', tasks: ['Line 2 hydraulic sensor review', 'Conveyor belt speed sync'], hasFlag: true },
    { id: 'zone_c', name: 'Zone C · Cold Storage Bay', type: 'Inventory / Staging', tasks: ['Freezer latch inspection', 'FIFO rotation sign-off'], hasFlag: false },
    { id: 'zone_d', name: 'Zone D · Mechanical Plant', type: 'HVAC & Utilities', tasks: ['Cleanroom pressure differential', 'Generator fuel log'], hasFlag: false }
  ];

  let selectedZoneId = 'zone_a';

  function renderFacilityZonesCard() {
    const activeZone = ZONES.find(z => z.id === selectedZoneId) || ZONES[0];

    return `
      <section class="facility-zones-card" id="facility-zones-section">
        <div class="zones-header">
          <h3>${window.Icons?.location ? window.Icons.location() : ''} Facility Stations &amp; Spatial Zones</h3>
          <span style="font-size:11px;font-weight:700;color:#10b981;">4 Active Zones</span>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">Select an operational zone to review station tasks and equipment flags.</p>

        <!-- 2x2 Zone Grid -->
        <div class="zones-layout-grid">
          ${ZONES.map(z => `
            <div class="zone-tile ${z.id === selectedZoneId ? 'active' : ''} ${z.hasFlag ? 'has-flag' : ''}" data-zone-id="${z.id}">
              <span class="zone-status-badge"></span>
              <h4 class="zone-tile-name">${escape(z.name)}</h4>
              <p class="zone-tile-type">${escape(z.type)}</p>
            </div>
          `).join('')}
        </div>

        <!-- Filtered Tasks for Active Zone -->
        <div class="station-tasks-wrap" id="station-tasks-wrap">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:6px;">
            ${escape(activeZone.name)} — Checklist Items
          </div>
          ${activeZone.tasks.map(t => `
            <div class="station-task-item">
              <span>${window.Icons?.check ? window.Icons.check(12) : '•'} ${escape(t)}</span>
              <span class="badge" style="font-size:10.5px;padding:2px 8px;background:#e2e8f0;color:#334155;font-weight:700;">Verified</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function bindFacilityZonesEvents(container = document) {
    container.querySelectorAll('.zone-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        window.SoundEngine?.play('click');
        container.querySelectorAll('.zone-tile').forEach(t => t.classList.remove('active'));
        tile.classList.add('active');

        selectedZoneId = tile.dataset.zoneId;
        const activeZone = ZONES.find(z => z.id === selectedZoneId);
        const tasksWrap = document.getElementById('station-tasks-wrap');
        if (tasksWrap && activeZone) {
          tasksWrap.innerHTML = `
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:6px;">
              ${escape(activeZone.name)} — Checklist Items
            </div>
            ${activeZone.tasks.map(t => `
              <div class="station-task-item">
                <span>${window.Icons?.check ? window.Icons.check(12) : '•'} ${escape(t)}</span>
                <span class="badge" style="font-size:10.5px;padding:2px 8px;background:#e2e8f0;color:#334155;font-weight:700;">Verified</span>
              </div>
            `).join('')}
          `;
        }
      });
    });
  }

  window.renderFacilityZonesCard = renderFacilityZonesCard;
  window.bindFacilityZonesEvents = bindFacilityZonesEvents;
})();
