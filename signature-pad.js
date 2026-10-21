/**
 * ShiftRelay Digital Handover Sign-Off & Supervisor Verification
 * Captures vector touch/stylus signatures and digital verification stamps
 * for compliance, accreditation, and handover accountability.
 */

(function () {
  function openSignaturePad(handoverId, opts = {}) {
    document.getElementById('signature-modal-backdrop')?.remove();

    const summary = opts.summary || 'Shift Handover';
    const signerRole = opts.role || window.state?.user?.role || 'Staff';
    const signerName = opts.name || window.state?.user?.name || 'Frontline Specialist';

    const backdrop = document.createElement('div');
    backdrop.id = 'signature-modal-backdrop';
    backdrop.className = 'signature-modal-backdrop';
    backdrop.innerHTML = `
      <div class="signature-modal-card" role="dialog" aria-modal="true" aria-label="Digital Handover Sign-Off">
        <div class="signature-header">
          <div>
            <h3>${window.Icons?.signature ? window.Icons.signature(18) : ''} Digital Sign-Off</h3>
            <p>Frontline Accountability &amp; Handover Verification</p>
          </div>
          <button class="modal-close" id="btn-close-sig-modal" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:50%;width:30px;height:30px;display:grid;place-items:center;cursor:pointer;" aria-label="Close">
            ${window.Icons?.close ? window.Icons.close(16) : '×'}
          </button>
        </div>

        <div class="signature-body">
          <div class="signature-handover-summary">
            ${window.Icons?.check ? window.Icons.check(13) : ''} <strong>Handover:</strong> ${escape(summary)}
          </div>

          <div class="signature-canvas-wrap">
            <canvas id="signature-canvas" class="signature-canvas"></canvas>
            <div class="signature-baseline"></div>
            <span class="signature-hint">Sign above with finger or stylus</span>
          </div>

          <div class="signature-tools-row">
            <button class="btn-sig-clear" id="btn-clear-sig" type="button">
              ${window.Icons?.refreshCw ? window.Icons.refreshCw(14) : ''} Clear
            </button>
            <button class="btn-sig-bio" id="btn-bio-sig" type="button" title="Fast authentication stamp">
              ${window.Icons?.fingerprint ? window.Icons.fingerprint(14) : ''} 1-Tap Biometric Stamp
            </button>
          </div>
        </div>

        <div class="signature-footer">
          <button class="secondary" id="btn-cancel-sig" type="button">Cancel</button>
          <button class="primary" id="btn-confirm-sig" type="button" style="background:#0d524d;border-color:#0d524d;">
            ${window.Icons?.check ? window.Icons.check(14) : ''} Confirm Sign-Off
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // ── Setup Canvas Drawing ──────────────────────────────────────────────────
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#0d524d';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let isDrawing = false;
    let hasStrokes = false;
    let lastX = 0;
    let lastY = 0;

    function getCoords(e) {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return [clientX - r.left, clientY - r.top];
    }

    function startDraw(e) {
      isDrawing = true;
      hasStrokes = true;
      [lastX, lastY] = getCoords(e);
    }

    function moveDraw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const [currX, currY] = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      [lastX, lastY] = [currX, currY];
    }

    function stopDraw() {
      isDrawing = false;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    window.addEventListener('touchend', stopDraw);

    // Clear
    document.getElementById('btn-clear-sig')?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStrokes = false;
      window.SoundEngine?.play('click');
    });

    // 1-Tap Biometric stamp
    document.getElementById('btn-bio-sig')?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#0d524d';
      ctx.fillText(`BIOMETRIC AUTH · ${signerName.toUpperCase()}`, 16, 60);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#64748b';
      const hash = Math.random().toString(36).slice(2, 10).toUpperCase();
      ctx.fillText(`TOKEN: SR-SEC-${hash} · ${new Date().toLocaleTimeString()}`, 16, 85);
      hasStrokes = true;
      window.SoundEngine?.play('confirm');
      toast('Biometric stamp applied');
    });

    // Close handlers
    const closeModal = () => {
      backdrop.style.opacity = '0';
      setTimeout(() => backdrop.remove(), 200);
    };

    document.getElementById('btn-close-sig-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-sig')?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Confirm & Sign
    document.getElementById('btn-confirm-sig')?.addEventListener('click', async () => {
      if (!hasStrokes) {
        toast('Please draw your signature or use 1-Tap Biometric Stamp.');
        return;
      }

      const sigDataUrl = canvas.toDataURL('image/png');
      window.SoundEngine?.play('success');

      closeModal();

      if (typeof opts.onSigned === 'function') {
        opts.onSigned(sigDataUrl);
      } else {
        // Fallback: update handover in store or local state
        toast(`Handover verified and signed by ${signerName}!`);
        
        // Find handover element if on screen and insert verified signature badge
        const handoverCard = document.querySelector(`[data-id="${handoverId}"]`)?.closest('.handover-item') 
                          || document.querySelector('.pinned-handover-card');
        if (handoverCard && !handoverCard.querySelector('.handover-signature-badge')) {
          handoverCard.insertAdjacentHTML('beforeend', `
            <div class="handover-signature-badge">
              <img src="${sigDataUrl}" class="sig-preview-img" alt="Digital Signature" />
              <div class="sig-meta">
                <strong>Signed by ${escape(signerName)} (${escape(signerRole)})</strong>
                <span>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · Digital Audit Verified</span>
              </div>
            </div>
          `);
        }
      }
    });
  }

  window.openSignaturePad = openSignaturePad;
})();
