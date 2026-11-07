const fs = require('fs');
const path = require('path');

const phase1Path = path.join(__dirname, '..', 'phase1-shell.js');
let code = fs.readFileSync(phase1Path, 'utf8');

const targetBlock = `                  \${m.id === user.id ? \`
                    <span style="font-size: 11.5px; color: var(--p-teal); font-weight: 600;">Active Account (You)</span>
                    <span class="sr-badge sr-badge-info" style="font-size: 11px;">Sole Primary Owner</span>
                  \` : isRevoked ? \`
                    <span style="font-size: 11.5px; color: var(--p-text-3);">Access Revoked</span>
                    <span class="sr-badge sr-badge-neutral" style="font-size: 11px;">Deactivated</span>
                  \` : \`
                    <span style="font-size: 11.5px; color: var(--p-text-3);">Frontline Access</span>
                    <button type="button" class="sr-btn sr-btn-danger sr-btn-revoke-member" data-id="\${m.id}" data-name="\${escapeHtml(m.name)}" data-title="\${escapeHtml(m.title || roleLabel)}" style="min-height: 28px; padding: 0 10px; font-size: 11.5px; background: transparent; color: var(--p-red); border: 1px solid var(--p-red-border);">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      Revoke
                    </button>
                  \`}`;

const replacementBlock = `                  \${m.id === user.id ? \`
                    <span style="font-size: 11.5px; color: var(--p-teal); font-weight: 600;">Active Account (You)</span>
                    <span class="sr-badge sr-badge-info" style="font-size: 11px;">Sole Primary Owner</span>
                  \` : isRevoked ? \`
                    <span style="font-size: 11.5px; color: var(--p-text-3);">Access Revoked</span>
                    <span class="sr-badge sr-badge-neutral" style="font-size: 11px;">Deactivated</span>
                  \` : \`
                    <div style="display:flex;align-items:center;gap:6px;width:100%;justify-content:space-between;">
                      <button type="button" class="sr-btn sr-btn-primary sr-btn-send-invite" data-id="\${m.id}" data-name="\${escapeHtml(m.name)}" data-email="\${escapeHtml(m.email || '')}" style="min-height: 28px; padding: 0 10px; font-size: 11.5px; background: var(--p-teal); color: #fff; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span>Enable &amp; Invite</span>
                      </button>
                      <button type="button" class="sr-btn sr-btn-danger sr-btn-revoke-member" data-id="\${m.id}" data-name="\${escapeHtml(m.name)}" data-title="\${escapeHtml(m.title || roleLabel)}" style="min-height: 28px; padding: 0 8px; font-size: 11.5px; background: transparent; color: var(--p-red); border: 1px solid var(--p-red-border); border-radius: 6px; cursor: pointer;">
                        Revoke
                      </button>
                    </div>
                  \`}`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, replacementBlock);
  console.log('✓ Injected Enable & Invite button into team cards in phase1-shell.js');
} else {
  console.error('⚠ Could not match targetBlock in phase1-shell.js');
}

// Now bind the click event for sr-btn-send-invite
const bindMarker = `        // Bind revoke buttons
        listContainer.querySelectorAll('.sr-btn-revoke-member').forEach(btn => {`;

const bindReplacement = `        // Bind Enable & Send Invite buttons
        listContainer.querySelectorAll('.sr-btn-send-invite').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const memberId = btn.dataset.id;
            const memberName = btn.dataset.name;
            const memberEmail = btn.dataset.email;
            btn.disabled = true;
            btn.innerHTML = '<span>Inviting…</span>';

            try {
              const res = await fetch('/api/executive/invite-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Failed to dispatch invite');

              btn.style.background = '#059669';
              btn.innerHTML = '<span>✓ Invite Sent</span>';
              showToast(\`Invitation dispatched to \${memberEmail}! Link active.\`);

              // Show shareable modal dialog
              const shareModal = document.createElement('div');
              shareModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:grid;place-items:center;z-index:99999;padding:20px;';
              shareModal.innerHTML = \`
                <div style="background:#0f172a;border:1.5px solid #334155;border-radius:18px;max-width:480px;width:100%;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);color:#f8fafc;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <span style="font-size:20px;">✉</span>
                    <h3 style="margin:0;font-size:17px;font-weight:800;color:#34d399;">Activation Invite Dispatched!</h3>
                  </div>
                  <p style="font-size:13.5px;color:#94a3b8;line-height:1.5;margin-bottom:16px;">
                    An official activation link has been delivered to <strong>\${memberEmail}</strong> via the ShiftRelay Email Engine.
                  </p>
                  <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px;margin-bottom:16px;">
                    <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;font-weight:700;">Direct Activation URL:</div>
                    <code id="modal-act-url" style="font-family:monospace;font-size:12px;color:#38bdf8;word-break:break-all;display:block;">\${data.member?.activationUrl || (window.location.origin + '/activate?token=' + data.member?.activationToken)}</code>
                  </div>
                  <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button type="button" id="btn-copy-act-url" style="padding:8px 16px;background:#10b981;color:#022c22;border:none;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;">
                      Copy Link
                    </button>
                    <button type="button" id="btn-close-act-modal" style="padding:8px 16px;background:#334155;color:#f8fafc;border:none;border-radius:8px;font-weight:600;font-size:12.5px;cursor:pointer;">
                      Done
                    </button>
                  </div>
                </div>
              \`;
              document.body.appendChild(shareModal);
              shareModal.querySelector('#btn-copy-act-url').addEventListener('click', () => {
                const urlText = shareModal.querySelector('#modal-act-url').textContent;
                navigator.clipboard?.writeText(urlText);
                showToast('Copied activation link to clipboard!');
              });
              shareModal.querySelector('#btn-close-act-modal').addEventListener('click', () => {
                shareModal.remove();
              });
            } catch (err) {
              btn.disabled = false;
              btn.innerHTML = '<span>Enable &amp; Invite</span>';
              showToast('Error: ' + err.message);
            }
          });
        });

        // Bind revoke buttons
        listContainer.querySelectorAll('.sr-btn-revoke-member').forEach(btn => {`;

if (code.includes(bindMarker)) {
  code = code.replace(bindMarker, bindReplacement);
  console.log('✓ Bound Enable & Send Invite click handlers in phase1-shell.js');
} else {
  console.error('⚠ Could not match bindMarker in phase1-shell.js');
}

fs.writeFileSync(phase1Path, code, 'utf8');
console.log('✓ Finished updating phase1-shell.js');
