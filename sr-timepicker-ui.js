/**
 * ShiftRelay Material-3 Circular Timepicker UI (inspired by pglejzer/timepicker-ui)
 * Pure JavaScript, zero external dependencies, touch & mouse friendly.
 */
(function () {
  function parse24(val) {
    const m = String(val || '06:00').match(/^(\d{1,2}):(\d{2})/);
    let h24 = m ? Math.max(0, Math.min(23, parseInt(m[1], 10))) : 6;
    let min = m ? Math.max(0, Math.min(59, parseInt(m[2], 10))) : 0;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h12, min, ampm };
  }

  function to24(h12, min, ampm) {
    let h = h12 % 12;
    if (ampm === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  function openTimepicker(initialValue, onConfirm, title = 'Select shift time') {
    document.getElementById('sr-tp-backdrop')?.remove();
    const state = { ...parse24(initialValue), mode: 'hour' }; // 'hour' | 'minute'

    const backdrop = document.createElement('div');
    backdrop.id = 'sr-tp-backdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:100005;background:rgba(2,6,23,0.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;';

    function render() {
      const hourStr = String(state.h12).padStart(2, '0');
      const minStr = String(state.min).padStart(2, '0');
      const dialRadius = 96;
      const items = state.mode === 'hour'
        ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      const activeVal = state.mode === 'hour' ? state.h12 : state.min;
      const angleDeg = state.mode === 'hour'
        ? ((state.h12 % 12) * 30) - 90
        : (state.min * 6) - 90;

      const dialMarks = items.map((val, idx) => {
        const deg = idx * 30 - 90;
        const rad = (deg * Math.PI) / 180;
        const x = 128 + dialRadius * Math.cos(rad);
        const y = 128 + dialRadius * Math.sin(rad);
        const isActive = state.mode === 'hour' ? (val === activeVal) : (Math.abs(val - activeVal) < 3 || (val === 0 && activeVal >= 58));
        const label = state.mode === 'minute' ? String(val).padStart(2, '0') : String(val);
        return `
          <button type="button" data-tp-val="${val}"
            style="position:absolute;left:${(x - 18).toFixed(1)}px;top:${(y - 18).toFixed(1)}px;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;font-size:13.5px;font-weight:${isActive ? '800' : '600'};background:${isActive ? '#10b981' : 'transparent'};color:${isActive ? '#022c22' : '#e2e8f0'};transition:background .14s;">
            ${label}
          </button>`;
      }).join('');

      backdrop.innerHTML = `
        <div role="dialog" aria-modal="true" aria-label="${title}"
          style="width:328px;max-width:100%;border-radius:24px;background:linear-gradient(155deg,#111827,#0b1120);border:1px solid rgba(16,185,129,0.32);box-shadow:0 28px 64px rgba(0,0,0,0.55);padding:20px;color:#f8fafc;font-family:Inter,system-ui,sans-serif;">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#94a3b8;margin-bottom:14px;">${title}</div>

          <!-- Digital Readout + Stacked AM/PM -->
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:18px;">
            <button type="button" id="sr-tp-hour-box"
              style="width:86px;height:66px;border-radius:14px;border:1.5px solid ${state.mode === 'hour' ? '#10b981' : 'rgba(148,163,184,0.22)'};background:${state.mode === 'hour' ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,0.75)'};color:${state.mode === 'hour' ? '#34d399' : '#e2e8f0'};font-size:38px;font-weight:800;font-family:'JetBrains Mono',monospace;cursor:pointer;line-height:1;">
              ${hourStr}
            </button>
            <span style="font-size:34px;font-weight:800;color:#64748b;line-height:1;">:</span>
            <button type="button" id="sr-tp-min-box"
              style="width:86px;height:66px;border-radius:14px;border:1.5px solid ${state.mode === 'minute' ? '#10b981' : 'rgba(148,163,184,0.22)'};background:${state.mode === 'minute' ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,0.75)'};color:${state.mode === 'minute' ? '#34d399' : '#e2e8f0'};font-size:38px;font-weight:800;font-family:'JetBrains Mono',monospace;cursor:pointer;line-height:1;">
              ${minStr}
            </button>
            <div style="display:flex;flex-direction:column;gap:4px;margin-left:4px;">
              <button type="button" data-tp-ampm="AM"
                style="width:52px;height:31px;border-radius:8px;border:1px solid ${state.ampm === 'AM' ? '#10b981' : 'rgba(148,163,184,0.22)'};background:${state.ampm === 'AM' ? 'rgba(16,185,129,0.25)' : 'rgba(30,41,59,0.6)'};color:${state.ampm === 'AM' ? '#34d399' : '#94a3b8'};font-size:12px;font-weight:800;cursor:pointer;">AM</button>
              <button type="button" data-tp-ampm="PM"
                style="width:52px;height:31px;border-radius:8px;border:1px solid ${state.ampm === 'PM' ? '#10b981' : 'rgba(148,163,184,0.22)'};background:${state.ampm === 'PM' ? 'rgba(16,185,129,0.25)' : 'rgba(30,41,59,0.6)'};color:${state.ampm === 'PM' ? '#34d399' : '#94a3b8'};font-size:12px;font-weight:800;cursor:pointer;">PM</button>
            </div>
          </div>

          <!-- 256px Circular Analog Dial -->
          <div id="sr-tp-dial" style="position:relative;width:256px;height:256px;border-radius:50%;background:rgba(30,41,59,0.85);border:1px solid rgba(148,163,184,0.16);margin:0 auto 18px;user-select:none;touch-action:none;">
            <div style="position:absolute;left:128px;top:128px;width:${dialRadius}px;height:2px;background:#10b981;transform-origin:0 50%;transform:rotate(${angleDeg}deg);pointer-events:none;transition:transform .14s ease;"></div>
            <div style="position:absolute;left:124px;top:124px;width:8px;height:8px;border-radius:50%;background:#10b981;pointer-events:none;"></div>
            ${dialMarks}
          </div>

          <!-- Footer Actions -->
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace;">24h: ${to24(state.h12, state.min, state.ampm)}</span>
            <div style="display:flex;gap:8px;">
              <button type="button" id="sr-tp-cancel" style="padding:8px 14px;border-radius:10px;border:none;background:transparent;color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer;">Cancel</button>
              <button type="button" id="sr-tp-ok" style="padding:8px 18px;border-radius:10px;border:none;background:#10b981;color:#022c22;font-size:13px;font-weight:800;cursor:pointer;">OK</button>
            </div>
          </div>
        </div>
      `;

      backdrop.querySelector('#sr-tp-hour-box')?.addEventListener('click', () => { state.mode = 'hour'; render(); });
      backdrop.querySelector('#sr-tp-min-box')?.addEventListener('click', () => { state.mode = 'minute'; render(); });
      backdrop.querySelectorAll('[data-tp-ampm]').forEach(b => b.addEventListener('click', () => {
        state.ampm = b.dataset.tpAmpm;
        render();
      }));
      backdrop.querySelectorAll('[data-tp-val]').forEach(b => b.addEventListener('click', () => {
        const v = parseInt(b.dataset.tpVal, 10);
        if (state.mode === 'hour') {
          state.h12 = v;
          state.mode = 'minute';
        } else {
          state.min = v;
        }
        render();
      }));
      backdrop.querySelector('#sr-tp-cancel')?.addEventListener('click', () => backdrop.remove());
      backdrop.querySelector('#sr-tp-ok')?.addEventListener('click', () => {
        const result24 = to24(state.h12, state.min, state.ampm);
        backdrop.remove();
        if (typeof onConfirm === 'function') onConfirm(result24);
      });
    }

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    render();
  }

  function attach(inputEl, title) {
    if (!inputEl || inputEl.dataset.srTpBound) return;
    inputEl.dataset.srTpBound = '1';
    inputEl.style.cursor = 'pointer';
    inputEl.addEventListener('click', (e) => {
      e.preventDefault();
      openTimepicker(inputEl.value || '06:00', (val24) => {
        inputEl.value = val24;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      }, title || 'Select time');
    });
  }

  window.ShiftRelayTimepicker = { open: openTimepicker, attach };
})();
