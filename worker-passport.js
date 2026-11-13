/**
 * ShiftRelay Worker Passport Badges, Peer Endorsements & QR Gate Pass
 * Accentuates professional frontline credibility with verifiable skill badges,
 * peer competency endorsements, and cryptographic gate-pass QR codes.
 */

(function () {
  const DEFAULT_CREDENTIALS = [
    { title: 'Forklift Class 1–5', issuer: 'OSHA Safety Standards', icon: 'shield' },
    { title: 'ACLS Life Support', issuer: 'Resuscitation Council', icon: 'shield' },
    { title: 'HACCP Safety Lead', issuer: 'Food Standards Bureau', icon: 'award' },
    { title: 'Dangerous Goods (ADR)', issuer: 'Transport Compliance', icon: 'zap' }
  ];

  const DEFAULT_ENDORSEMENTS = [
    { id: 'end_turnover', name: 'Turnover Accuracy', count: 46 },
    { id: 'end_safety', name: 'Safety & Hazard Vigilance', count: 52 },
    { id: 'end_equip', name: 'Equipment Care & 5S Cleanliness', count: 39 },
    { id: 'end_punctual', name: 'Shift Punctuality & Handover Reliability', count: 61 }
  ];

  function renderCredentialsSection(credentials = DEFAULT_CREDENTIALS) {
    return `
      <section class="passport-credentials-section">
        <h3 style="font-size:16px;font-weight:800;margin:0 0 4px;color:var(--text-main);">
          ${window.Icons?.award ? window.Icons.award(16) : ''} Certified Accreditations
        </h3>
        <p style="font-size:12px;color:#64748b;margin:0 0 10px;">Verified digital certificates and equipment operating clearances.</p>
        <div class="passport-credentials-grid">
          ${credentials.map(c => `
            <div class="credential-badge-card">
              <div class="credential-icon-wrap">
                ${window.Icons?.[c.icon] ? window.Icons[c.icon](18) : (window.Icons?.award ? window.Icons.award(18) : '')}
              </div>
              <h4 class="credential-title">${escape(c.title)}</h4>
              <p class="credential-issuer">${escape(c.issuer)}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderPeerEndorsementsCard(endorsements = DEFAULT_ENDORSEMENTS) {
    return `
      <section class="peer-endorsements-card">
        <div class="endorsements-header">
          <h3>${window.Icons?.star ? window.Icons.star(16) : ''} Peer Competency Endorsements</h3>
          <span style="font-size:11px;color:#10b981;font-weight:700;">Verified Coworkers</span>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">Frontline teammates validate daily operational discipline.</p>
        <div class="endorsements-list" id="endorsements-list">
          ${endorsements.map(e => `
            <div class="endorsement-row" data-endorse-id="${e.id}">
              <span class="endorsement-skill-name">${escape(e.name)}</span>
              <button class="btn-endorse" type="button" data-endorse-btn="${e.id}">
                ${window.Icons?.like ? window.Icons.like(false) : '+'}
                <span class="endorse-count">${e.count}</span>
              </button>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderQRPassportButton() {
    return `
      <div style="margin-top:16px;">
        <button class="primary" id="btn-show-qr-passport" type="button" style="width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#0d524d 0%,#064e3b 100%);">
          ${window.Icons?.shield ? window.Icons.shield(16) : ''} View Official Staff ID Card (QR)
        </button>
      </div>
    `;
  }

  function openQRPassportModal() {
    document.getElementById('qr-modal-backdrop')?.remove();

    const user = window.state?.user || {};
    const name = user.name || 'Frontline Specialist';
    const role = user.title || user.role || 'Specialist';
    const org = user.organisation_name || 'ShiftRelay Network';
    const staffCode = user.staffId || user.employee_code || ('RIF-' + String(user.id || '0001').slice(-4).padStart(4, '0'));
    const orgCode = user.company_id || 'RIF-2026';
    const payload = `SHIFTRELAY:ID:${orgCode}:${staffCode}`;

    const backdrop = document.createElement('div');
    backdrop.id = 'qr-modal-backdrop';
    backdrop.className = 'safety-modal-backdrop';
    backdrop.innerHTML = `
      <div class="qr-passport-modal-card" role="dialog" aria-modal="true" aria-label="Official Staff ID Card">
        <h3 style="margin:0;font-size:18px;font-weight:800;color:#0d524d;">Official Staff ID Card</h3>
        <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Scan with a colleague&rsquo;s mobile phone once daily &middot; Auto clock-out active</p>

        <div class="qr-code-box" id="qr-passport-svg-wrap">
          ${typeof window.generateQrSvg === 'function' ? window.generateQrSvg(payload, 148) : ''}
        </div>

        <div style="background:#f8fafc;padding:10px 14px;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:14px;font-size:12px;">
          <strong style="display:block;font-size:14px;color:#0f172a;">${escape(name)}</strong>
          <span style="color:#64748b;">${escape(role)} · ${escape(org)}</span>
          <div style="font-family:monospace;font-size:11px;font-weight:700;color:#0d524d;margin-top:4px;">STAFF ID: ${escape(staffCode)}</div>
        </div>

        <button class="primary" id="btn-close-qr-modal" type="button" style="width:100%;">Done</button>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => {
      backdrop.style.opacity = '0';
      setTimeout(() => backdrop.remove(), 200);
    };

    document.getElementById('btn-close-qr-modal')?.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }

  function bindPassportEnhancements(container = document) {
    // Endorsement buttons
    container.querySelectorAll('[data-endorse-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isEndorsed = btn.classList.contains('endorsed');
        btn.classList.toggle('endorsed', !isEndorsed);
        const countSpan = btn.querySelector('.endorse-count');
        const current = parseInt(countSpan.textContent, 10) || 0;
        countSpan.textContent = isEndorsed ? current - 1 : current + 1;
        window.SoundEngine?.play(isEndorsed ? 'click' : 'like');
        toast(isEndorsed ? 'Endorsement removed.' : 'Endorsed teammate skill!');
      });
    });

    // QR Code Button
    document.getElementById('btn-show-qr-passport')?.addEventListener('click', () => {
      window.SoundEngine?.play('click');
      openQRPassportModal();
    });
  }

  window.renderCredentialsSection = renderCredentialsSection;
  window.renderPeerEndorsementsCard = renderPeerEndorsementsCard;
  window.renderQRPassportButton = renderQRPassportButton;
  window.bindPassportEnhancements = bindPassportEnhancements;
  window.openQRPassportModal = openQRPassportModal;
})();
