const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'phase1-shell.js');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// 1. Conditional tile in metric grid
const tileIdx = lines.findIndex(l => l.includes('<span>Payroll Batch</span>'));
if (tileIdx !== -1) {
  // Find start and end of that tile
  const tileStart = lines.lastIndexOf('          <div class="sr-metric-tile">', tileIdx);
  const tileEnd = lines.indexOf('          </div>', tileIdx);
  if (tileStart !== -1 && tileEnd !== -1) {
    const newTileLines = [
      "          ${user.role === 'owner' ? `",
      '            <div class="sr-metric-tile">',
      '              <span>Payroll Batch</span>',
      '              <strong style="color:#10b981;">₦1,065,000</strong>',
      '              <small style="color:var(--sr-text-muted);font-size:11.5px;">Verified Ready</small>',
      '            </div>',
      '          ` : `',
      '            <div class="sr-metric-tile">',
      '              <span>Exceptions</span>',
      '              <strong style="color:#f59e0b;">1 Flagged</strong>',
      '              <small style="color:var(--sr-text-muted);font-size:11.5px;">Auxiliary Gate</small>',
      '            </div>',
      '          `}'
    ];
    lines.splice(tileStart, (tileEnd + 1) - tileStart, ...newTileLines);
    console.log('Updated supervisor metric tile.');
  }
}

// 2. Conditional Section 2: Verified Shift Payroll vs Shift Relay Handover
const sec2Idx = lines.findIndex(l => l.includes('<!-- 2. 1-Click Batch Payroll Disbursement Cockpit -->'));
const sec3Idx = lines.findIndex(l => l.includes('<!-- 3. Enterprise Shift Audit & Client Billing Kit -->'));

if (sec2Idx !== -1 && sec3Idx !== -1) {
  const newSec2Lines = [
    "        ${user.role === 'owner' ? `",
    '          <!-- 2. 1-Click Batch Payroll Disbursement Cockpit (Executive Only) -->',
    '          <section class="sr-card" aria-label="Shift Payroll Disbursement" style="border-top: 3px solid #10b981; background: linear-gradient(135deg, var(--sr-bg-card) 0%, rgba(16,185,129,0.03) 100%);">',
    '            <div class="sr-card-title-row" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">',
    '              <div>',
    '                <h3 style="margin:0;font-size:16px;">Verified Shift Payroll</h3>',
    '                <p style="margin:2px 0 0;font-size:12.5px;color:var(--sr-text-muted);">Biometric &amp; geofence-verified shifts ready for batch payout</p>',
    '              </div>',
    '              <span class="sr-badge-certified" id="sr-payroll-batch-badge">5 Verified</span>',
    '            </div>',
    '',
    '            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;margin:16px 0;">',
    '              <div style="padding:10px 14px;background:var(--sr-bg-card-subtle);border-radius:8px;border:1px solid var(--sr-border-subtle);">',
    '                <span style="font-size:11px;font-weight:700;color:var(--sr-text-muted);text-transform:uppercase;">Eligible Staff</span>',
    '                <div style="font-size:20px;font-weight:800;color:var(--sr-text-main);margin-top:2px;">5 Workers</div>',
    '              </div>',
    '              <div style="padding:10px 14px;background:var(--sr-bg-card-subtle);border-radius:8px;border:1px solid var(--sr-border-subtle);">',
    '                <span style="font-size:11px;font-weight:700;color:var(--sr-text-muted);text-transform:uppercase;">Verified Hours</span>',
    '                <div style="font-size:20px;font-weight:800;color:var(--sr-text-main);margin-top:2px;">172.5 hrs</div>',
    '              </div>',
    '              <div style="padding:10px 14px;background:var(--sr-bg-card-subtle);border-radius:8px;border:1px solid var(--sr-border-subtle);">',
    '                <span style="font-size:11px;font-weight:700;color:var(--sr-text-muted);text-transform:uppercase;">Net Batch Total</span>',
    '                <div style="font-size:20px;font-weight:800;color:var(--sr-primary);margin-top:2px;">₦1,065,000.00</div>',
    '              </div>',
    '            </div>',
    '',
    '            <div style="display:flex;justify-content:flex-end;">',
    '              <button type="button" class="sr-btn sr-btn-primary" id="sr-btn-batch-payroll" style="min-height:42px;padding:0 22px;font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:8px;background:var(--sr-primary);border-color:var(--sr-primary);">',
    '                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    '                <span>1-Click Batch Authorize &amp; Disburse</span>',
    '              </button>',
    '            </div>',
    '          </section>',
    '        ` : `',
    '          <!-- 2. Shift Relay & Handover Briefings (Supervisor Floor Focus) -->',
    '          <section class="sr-card" aria-label="Shift Handover Briefings" style="border-top: 3px solid #10b981;">',
    '            <div class="sr-card-title-row" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">',
    '              <div>',
    '                <h3 style="margin:0;font-size:16px;">Shift Relay &amp; Handover Briefings</h3>',
    '                <p style="margin:2px 0 0;font-size:12.5px;color:var(--sr-text-muted);">Incoming &amp; outgoing equipment turnover, critical safety sign-offs</p>',
    '              </div>',
    '              <span class="sr-badge-certified" style="background:rgba(16,185,129,0.1);color:#10b981;border-color:rgba(16,185,129,0.3);">',
    '                ${handoversAwaitingRelay.length} Pending Relay',
    '              </span>',
    '            </div>',
    '',
    '            <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">',
    '              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--sr-bg-card-subtle);border-radius:10px;border:1px solid var(--sr-border-subtle);flex-wrap:wrap;gap:8px;">',
    '                <div style="display:flex;align-items:center;gap:10px;">',
    '                  <span style="width:34px;height:34px;border-radius:8px;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;font-weight:700;">H1</span>',
    '                  <div>',
    '                    <strong style="font-size:13.5px;color:var(--sr-text-main);">Morning Shift to Afternoon Shift Handover</strong>',
    '                    <div style="font-size:11.5px;color:var(--sr-text-muted);">Forklift battery at 92% &middot; Gate 3 dock cleared &middot; Amara Okafor</div>',
    '                  </div>',
    '                </div>',
    '                <button type="button" class="sr-btn sr-btn-secondary" id="sr-btn-view-handovers-shortcut" style="padding:4px 12px;font-size:12px;min-height:30px;color:var(--sr-primary);border-color:var(--sr-primary);">',
    '                  Review Briefing',
    '                </button>',
    '              </div>',
    '            </div>',
    '          </section>',
    '        `}'
  ];
  lines.splice(sec2Idx, sec3Idx - sec2Idx, ...newSec2Lines);
  console.log('Updated Section 2 with role conditional.');
}

// Bind button listener for sr-btn-view-handovers-shortcut
const listenerAnchor = lines.findIndex(l => l.includes("document.getElementById('sr-btn-batch-payroll')"));
if (listenerAnchor !== -1) {
  const shortcutListener = [
    "    document.getElementById('sr-btn-view-handovers-shortcut')?.addEventListener('click', () => {",
    "      navigate('handovers');",
    '    });'
  ];
  lines.splice(listenerAnchor, 0, ...shortcutListener);
  console.log('Bound handover shortcut button.');
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done! Updated phase1-shell.js with supervisor-specific overview!');
