const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'admin.html');
let code = fs.readFileSync(adminPath, 'utf8');

// 1. Update renderTenantsTable to include Edit button and handle proper tenant object keys
const oldRenderTenants = `    function renderTenantsTable() {
      const tbody = document.getElementById('adm-tenants-tbody');
      const sel = document.getElementById('csv-tenant-select');
      document.getElementById('nav-badge-tenants').textContent = cachedTenants.length;
      if (sel) sel.innerHTML = cachedTenants.map(t => \`<option value="\${t.id}">\${t.name} (\${t.id})</option>\`).join('');
      if (!tbody) return;
      tbody.innerHTML = cachedTenants.map((t, i) => {
        const gateCode = 'SR-GATE-' + String(1040 + i * 117);
        const site = (t.sites && t.sites[0]) ? t.sites[0] : { name: 'Main Facility Gate', radiusMeters: 250 };
        return \`
          <tr>
            <td><strong>\${t.name}</strong><div style="font-size:11.5px; color:var(--text-slate);">\${t.industry || 'Enterprise Operations'}</div></td>
            <td><code style="color:var(--emerald); font-weight:700;">\${gateCode}</code></td>
            <td>\${t.adminEmail || 'owner@company.com'}</td>
            <td>\${site.name} (\${site.radiusMeters || 250}m)</td>
            <td><span class="chip emerald">\${t.workerCount || 0} Staff</span></td>
            <td>
              <button type="button" class="btn-ghost" style="padding:5px 10px; font-size:11.5px;" onclick="window.printGatePoster('\${t.name.replace(/'/g, '')}', '\${gateCode}', '\${site.name.replace(/'/g, '')}')">
                🖨 Gate QR &amp; NFC Poster
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }`;

const newRenderTenants = `    function renderTenantsTable() {
      const tbody = document.getElementById('adm-tenants-tbody');
      const sel = document.getElementById('csv-tenant-select');
      document.getElementById('nav-badge-tenants').textContent = cachedTenants.length;
      if (sel) sel.innerHTML = cachedTenants.map(t => \`<option value="\${t.id}">\${t.tradingName || t.legalName || t.name} (\${t.companyId || t.id})</option>\`).join('');
      if (!tbody) return;
      tbody.innerHTML = cachedTenants.map((t, i) => {
        const companyName = t.tradingName || t.legalName || t.name || 'Enterprise Client';
        const companyCode = t.companyId || t.organisation_code || 'RIF-2026';
        const adminEmail = t.masterAdminEmail || t.adminEmail || t.work_email || 'sherif@riffmax.tech';
        const siteName = t.hubName || t.siteName || 'Riffmax Engineering Hub (Victoria Island)';
        const radius = t.hubRadius || t.hub_perimeter || 120;
        const staffCount = t.employeeCount || t.workerCount || 12;

        return \`
          <tr>
            <td>
              <strong>\${escapeHtml(companyName)}</strong>
              <div style="font-size:11.5px; color:var(--text-slate);">\${escapeHtml(t.legalName || companyName)} · \${escapeHtml(t.industry || 'Enterprise SaaS & HCM')}</div>
            </td>
            <td><code style="color:var(--emerald); font-weight:800; font-family:'JetBrains Mono',monospace;">\${escapeHtml(companyCode)}</code></td>
            <td><a href="mailto:\${escapeHtml(adminEmail)}" style="color:#38bdf8; text-decoration:none;">\${escapeHtml(adminEmail)}</a></td>
            <td>\${escapeHtml(siteName)} (\${radius}m)</td>
            <td><span class="chip emerald">\${staffCount} Staff</span></td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn-emerald" style="padding:4px 9px; font-size:11px;" onclick="window.openEditTenantModal('\${t.id}')">
                  ✏ Edit Tenant
                </button>
                <button type="button" class="btn-ghost" style="padding:4px 9px; font-size:11px;" onclick="window.printGatePoster('\${companyName.replace(/'/g, '')}', '\${companyCode}', '\${siteName.replace(/'/g, '')}')">
                  🖨 Gate Poster
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }`;

if (code.includes(oldRenderTenants)) {
  code = code.replace(oldRenderTenants, newRenderTenants);
  console.log('✓ Updated renderTenantsTable with edit capability');
} else {
  console.log('⚠ Could not match exact oldRenderTenants');
}

// 2. Add openEditTenantModal and saveTenantChanges functions
const modalCode = `
    // ── Live Database Editing: Tenant Editor Modal ────────────────────────────
    window.openEditTenantModal = function (tenantId) {
      const tenant = cachedTenants.find(t => t.id === tenantId) || cachedTenants[0];
      if (!tenant) return showToast('Tenant not found');

      const existingModal = document.getElementById('adm-edit-tenant-modal');
      if (existingModal) existingModal.remove();

      const modal = document.createElement('div');
      modal.id = 'adm-edit-tenant-modal';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); display:grid; place-items:center; z-index:99999; padding:20px; overflow-y:auto;';
      modal.innerHTML = \`
        <div style="background:#0f172a; border:1.5px solid #334155; border-radius:20px; max-width:540px; width:100%; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.8); color:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">🏢</span>
              <h3 style="margin:0; font-size:18px; font-weight:800; color:#34d399;">Edit Tenant Database Records</h3>
            </div>
            <button type="button" onclick="document.getElementById('adm-edit-tenant-modal').remove()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
          </div>
          
          <form id="adm-edit-tenant-form" style="display:flex; flex-direction:column; gap:12px;">
            <input type="hidden" id="edit-t-id" value="\${tenant.id}">
            <div>
              <label style="display:block; font-size:11.5px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Legal Company Name</label>
              <input type="text" id="edit-t-legal" class="input-field" value="\${escapeHtml(tenant.legalName || tenant.name || 'Riffmax Technology Limited')}" required style="width:100%; padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
            </div>
            <div>
              <label style="display:block; font-size:11.5px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Trading Name</label>
              <input type="text" id="edit-t-trading" class="input-field" value="\${escapeHtml(tenant.tradingName || tenant.name || 'Riffmax Technology')}" required style="width:100%; padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:11.5px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Company Unique Code</label>
                <input type="text" id="edit-t-code" class="input-field" value="\${escapeHtml(tenant.companyId || 'RIF-2026')}" required style="width:100%; padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#34d399; font-weight:700; font-family:'JetBrains Mono',monospace;">
              </div>
              <div>
                <label style="display:block; font-size:11.5px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Corporate Work Email</label>
                <input type="email" id="edit-t-email" class="input-field" value="\${escapeHtml(tenant.masterAdminEmail || 'sherif@riffmax.tech')}" required style="width:100%; padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
              </div>
            </div>
            <div>
              <label style="display:block; font-size:11.5px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Engineering Hub / Site Name</label>
              <input type="text" id="edit-t-hub" class="input-field" value="\${escapeHtml(tenant.hubName || 'Riffmax Software Engineering Hub')}" required style="width:100%; padding:8px 12px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
              <div>
                <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Latitude</label>
                <input type="number" step="0.0001" id="edit-t-lat" class="input-field" value="\${tenant.hubLat || 6.4312}" style="width:100%; padding:8px 10px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
              </div>
              <div>
                <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Longitude</label>
                <input type="number" step="0.0001" id="edit-t-lng" class="input-field" value="\${tenant.hubLng || 3.4244}" style="width:100%; padding:8px 10px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
              </div>
              <div>
                <label style="display:block; font-size:11px; color:#94a3b8; margin-bottom:4px; font-weight:600;">Perimeter (m)</label>
                <input type="number" id="edit-t-radius" class="input-field" value="\${tenant.hubRadius || 120}" style="width:100%; padding:8px 10px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#fff;">
              </div>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
              <button type="button" onclick="document.getElementById('adm-edit-tenant-modal').remove()" class="btn-ghost" style="padding:9px 16px;">Cancel</button>
              <button type="submit" id="btn-save-t-changes" class="btn-emerald" style="padding:9px 20px; font-weight:700;">Save Changes to Database</button>
            </div>
          </form>
        </div>
      \`;
      document.body.appendChild(modal);

      document.getElementById('adm-edit-tenant-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-t-changes');
        btn.disabled = true;
        btn.textContent = 'Saving Changes…';

        const payload = {
          legalName: document.getElementById('edit-t-legal').value.trim(),
          tradingName: document.getElementById('edit-t-trading').value.trim(),
          organisationCode: document.getElementById('edit-t-code').value.trim().toUpperCase(),
          workEmail: document.getElementById('edit-t-email').value.trim().toLowerCase(),
          hubName: document.getElementById('edit-t-hub').value.trim(),
          hubLat: Number(document.getElementById('edit-t-lat').value),
          hubLng: Number(document.getElementById('edit-t-lng').value),
          hubPerimeter: Number(document.getElementById('edit-t-radius').value)
        };

        try {
          const res = await fetch(\`/api/admin/tenants/\${encodeURIComponent(tenantId)}\`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + adminToken
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to update tenant');

          showToast('Tenant records updated in database!');
          modal.remove();
          await refreshAdminData();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Save Changes to Database';
          showToast('Error: ' + err.message);
        }
      });
    };
`;

if (!code.includes('window.openEditTenantModal')) {
  code = code.replace('function renderTenantsTable() {', modalCode + '\n    function renderTenantsTable() {');
  console.log('✓ Injected openEditTenantModal');
}

// 3. Update renderEmailStationTable to fetch live server outbox
const oldRenderEmailStation = `    function renderEmailStationTable() {
      const logs = getEmailStationLogs();
      document.getElementById('nav-badge-emails').textContent = logs.length;
      const kpiEl = document.getElementById('kpi-total-emails');
      if (kpiEl) kpiEl.textContent = logs.length;
      const tbody = document.getElementById('email-station-tbody');
      if (!tbody) return;
      tbody.innerHTML = logs.map(l => \`
        <tr>
          <td style="font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--text-slate);">\${l.time}</td>
          <td><code style="color:var(--emerald);">\${l.from}</code></td>
          <td><strong>\${l.to}</strong></td>
          <td>\${l.subject}</td>
          <td><span class="chip cyan">\${l.source}</span></td>
          <td><span class="chip emerald">\${l.status}</span></td>
        </tr>
      \`).join('');
    }`;

const newRenderEmailStation = `    async function renderEmailStationTable() {
      let logs = getEmailStationLogs();
      try {
        const res = await fetch('/api/admin/emails', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.emails) && data.emails.length > 0) {
            logs = [...data.emails, ...logs.filter(l => !data.emails.some(e => e.id === l.id))];
          }
        }
      } catch (_) {}

      document.getElementById('nav-badge-emails').textContent = logs.length;
      const kpiEl = document.getElementById('kpi-total-emails');
      if (kpiEl) kpiEl.textContent = logs.length;
      const tbody = document.getElementById('email-station-tbody');
      if (!tbody) return;
      tbody.innerHTML = logs.map(l => {
        const urlMatch = (l.html || l.text || '').match(/https?:\\/\\/[^\\s"'>]+/);
        const linkHtml = urlMatch ? \`<br><a href="\${urlMatch[0]}" target="_blank" style="font-size:11px; color:#38bdf8; text-decoration:underline;">Open Activation Link ↗</a>\` : '';
        return \`
          <tr>
            <td style="font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--text-slate);">\${l.time || 'Just now'}</td>
            <td><code style="color:var(--emerald);">\${l.from || 'engine@shiftrelay.tech'}</code></td>
            <td><strong>\${l.to}</strong></td>
            <td>\${l.subject}\${linkHtml}</td>
            <td><span class="chip cyan">\${l.source || 'Email Engine'}</span></td>
            <td><span class="chip emerald">\${l.status || 'DELIVERED'}</span></td>
          </tr>
        \`;
      }).join('');
    }`;

if (code.includes(oldRenderEmailStation)) {
  code = code.replace(oldRenderEmailStation, newRenderEmailStation);
  console.log('✓ Updated renderEmailStationTable with live server outbox');
} else {
  console.log('⚠ Could not match exact oldRenderEmailStation');
}

fs.writeFileSync(adminPath, code, 'utf8');
console.log('✓ Finished updating admin.html');
