/**
 * ShiftRelay Interactive Facility Zone Map & Station Checklist
 * Maps operational tasks to physical floor zones (loading bays, cleanrooms,
 * packaging lines, and triage wards) for spatial frontline context.
 */

(function () {
  const DEFAULT_ZONES = [
    { id: 'zone_a', name: 'Zone A · Operations Desk', type: 'Core Shift Desk', tasks: ['Shift queue verification', 'Access & security sign-off'], hasFlag: false },
    { id: 'zone_b', name: 'Zone B · Service & Delivery', type: 'Team Operations', tasks: ['Priority ticket & SLA review', 'Cross-team handoff confirmation'], hasFlag: false },
    { id: 'zone_c', name: 'Zone C · Support & Utilities', type: 'Infrastructure & Readiness', tasks: ['Systems uptime & comms check', 'Compliance log verification'], hasFlag: false }
  ];

  function getActiveZones() {
    const profileZones = window._srActiveUser?.industryProfile?.zones;
    return Array.isArray(profileZones) && profileZones.length ? profileZones : DEFAULT_ZONES;
  }

  let selectedZoneId = 'zone_a';

  function renderFacilityZonesCard() {
    const zones = getActiveZones();
    const activeZone = zones.find(z => z.id === selectedZoneId) || zones[0];
    const profileLabel = window._srActiveUser?.industryProfile?.shortLabel || 'Operations';

    return `
      <section class="facility-zones-card" id="facility-zones-section">
        <div class="zones-header">
          <h3>${window.Icons?.location ? window.Icons.location() : ''} ${escape(profileLabel)} Stations &amp; Operational Zones</h3>
          <span style="font-size:11px;font-weight:700;color:#10b981;">${zones.length} Active Zones</span>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">Select an operational zone to review station tasks and readiness flags.</p>

        <!-- Zone Grid -->
        <div class="zones-layout-grid">
          ${zones.map(z => `
            <div class="zone-tile ${z.id === activeZone.id ? 'active' : ''} ${z.hasFlag ? 'has-flag' : ''}" data-zone-id="${escape(z.id)}">
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
          ${(activeZone.tasks || []).map(t => `
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
        const zones = getActiveZones();
        const activeZone = zones.find(z => z.id === selectedZoneId) || zones[0];
        const tasksWrap = document.getElementById('station-tasks-wrap');
        if (tasksWrap && activeZone) {
          tasksWrap.innerHTML = `
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;margin-bottom:6px;">
              ${escape(activeZone.name)} — Checklist Items
            </div>
            ${(activeZone.tasks || []).map(t => `
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
