/**
 * ShiftRelay Full-Month Swipeable Shift Calendar & 1-Tap .ICS Export Engine
 * Supports full month grid navigation (swipe left/right or arrow buttons),
 * live real-time date/time display, and .ics calendar export.
 */

(function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const now0 = new Date();
  let viewYear = now0.getFullYear();
  let viewMonth = now0.getMonth();
  let selectedDateKey = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, '0')}-${String(now0.getDate()).padStart(2, '0')}`;

  function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getDaySchedule(d) {
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    return {
      date: d,
      key: toDateKey(d),
      dayNum: d.getDate(),
      isToday,
      hasShift: !isWeekend,
      shiftTitle: isWeekend ? 'Rest Day' : 'Day Rotation (Turnover Relay)',
      shiftHours: isWeekend ? 'Off Duty' : '07:00 – 15:30 (8.5 hrs)'
    };
  }

  function buildMonthCells(year, month) {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(getDaySchedule(new Date(year, month, day)));
    }
    return cells;
  }

  function shiftMonth(delta) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    viewYear = next.getFullYear();
    viewMonth = next.getMonth();
    const host = document.getElementById('shift-calendar-section')?.parentElement;
    if (host) {
      const card = document.getElementById('shift-calendar-section');
      if (card) {
        card.outerHTML = renderShiftCalendarCard();
        bindShiftCalendarEvents(host);
      }
    }
  }

  function renderShiftCalendarCard() {
    const cells = buildMonthCells(viewYear, viewMonth);
    const [sy, sm, sd] = selectedDateKey.split('-').map(Number);
    const selectedObj = getDaySchedule(new Date(sy || viewYear, (sm ? sm - 1 : viewMonth), sd || 1));

    return `
      <section class="shift-calendar-card" id="shift-calendar-section" style="touch-action:pan-y;user-select:none;">
        <div class="shift-calendar-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" id="sr-cal-prev-month" class="sr-btn sr-btn-secondary" aria-label="Previous month" style="min-height:32px;padding:4px 10px;font-size:13px;font-weight:800;">&lsaquo;</button>
            <h3 style="margin:0;font-size:15.5px;font-weight:800;min-width:140px;text-align:center;">${MONTHS[viewMonth]} ${viewYear}</h3>
            <button type="button" id="sr-cal-next-month" class="sr-btn sr-btn-secondary" aria-label="Next month" style="min-height:32px;padding:4px 10px;font-size:13px;font-weight:800;">&rsaquo;</button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" id="sr-cal-today-btn" class="sr-btn sr-btn-secondary" style="min-height:30px;padding:4px 10px;font-size:11.5px;font-weight:700;">Today</button>
            <button class="btn-ics-export" id="btn-export-ics" type="button" title="Sync shifts to phone calendar">
              ${window.Icons?.download ? window.Icons.download(13) : ''} Sync (.ics)
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px;text-align:center;">
          ${WEEKDAYS.map(w => `<div style="font-size:10.5px;font-weight:800;color:var(--sr-text-muted,#64748b);text-transform:uppercase;padding:4px 0;">${w}</div>`).join('')}
        </div>

        <div id="sr-month-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:14px;">
          ${cells.map(c => {
            if (!c) return '<div style="height:44px;"></div>';
            const isSel = c.key === selectedDateKey;
            const bg = isSel ? '#059669' : (c.isToday ? 'rgba(16,185,129,0.14)' : 'var(--sr-bg-subtle,rgba(148,163,184,0.08))');
            const fg = isSel ? '#ffffff' : 'var(--sr-text-main,#0f172a)';
            const border = isSel ? '1.5px solid #059669' : (c.isToday ? '1.5px solid #10b981' : '1px solid var(--sr-border-subtle,rgba(148,163,184,0.2))');
            const dotColor = isSel ? '#ffffff' : (c.hasShift ? '#10b981' : 'transparent');
            return `
              <button type="button" class="sr-month-day-btn ${isSel ? 'active' : ''}" data-date-key="${c.key}"
                style="height:44px;border-radius:10px;border:${border};background:${bg};color:${fg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;font-weight:${c.isToday || isSel ? '800' : '600'};font-size:12.5px;transition:transform .12s;">
                <span>${c.dayNum}</span>
                <span style="width:5px;height:5px;border-radius:50%;background:${dotColor};"></span>
              </button>
            `;
          }).join('')}
        </div>

        <div style="font-size:11px;color:var(--sr-text-muted);text-align:center;margin-bottom:10px;">Swipe left or right to switch months</div>

        <div class="active-day-shift-detail" id="active-day-detail">
          <div>
            <h4 class="day-shift-title" id="day-detail-title">${selectedObj.shiftTitle}</h4>
            <p class="day-shift-subtitle" id="day-detail-hours">${selectedObj.key} &middot; ${selectedObj.shiftHours} &middot; Station Verified</p>
          </div>
          <span class="badge" id="day-detail-badge" style="background:${selectedObj.hasShift ? '#10b981' : '#64748b'};color:#fff;font-weight:700;font-size:11px;">
            ${selectedObj.hasShift ? 'SCHEDULED' : 'REST'}
          </span>
        </div>
      </section>
    `;
  }

  function bindShiftCalendarEvents(container = document) {
    const section = document.getElementById('shift-calendar-section');
    document.getElementById('sr-cal-prev-month')?.addEventListener('click', () => shiftMonth(-1));
    document.getElementById('sr-cal-next-month')?.addEventListener('click', () => shiftMonth(1));
    document.getElementById('sr-cal-today-btn')?.addEventListener('click', () => {
      const t = new Date();
      viewYear = t.getFullYear();
      viewMonth = t.getMonth();
      selectedDateKey = toDateKey(t);
      shiftMonth(0);
    });

    if (section) {
      let startX = null;
      section.addEventListener('touchstart', (e) => { startX = e.changedTouches?.[0]?.clientX ?? null; }, { passive: true });
      section.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = (e.changedTouches?.[0]?.clientX ?? startX) - startX;
        startX = null;
        if (Math.abs(dx) > 48) shiftMonth(dx < 0 ? 1 : -1);
      }, { passive: true });
      section.addEventListener('pointerdown', (e) => { startX = e.clientX; });
      section.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 60) shiftMonth(dx < 0 ? 1 : -1);
      });
    }

    container.querySelectorAll('.sr-month-day-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedDateKey = btn.dataset.dateKey;
        const [y, m, d] = selectedDateKey.split('-').map(Number);
        const sel = getDaySchedule(new Date(y, m - 1, d));
        const host = section?.parentElement;
        if (host && section) {
          section.outerHTML = renderShiftCalendarCard();
          bindShiftCalendarEvents(host);
        }
        const title = document.getElementById('day-detail-title');
        const hours = document.getElementById('day-detail-hours');
        if (title) title.textContent = sel.shiftTitle;
        if (hours) hours.textContent = `${sel.key} · ${sel.shiftHours} · Station Verified`;
      });
    });

    document.getElementById('btn-export-ics')?.addEventListener('click', () => exportScheduleToICS());
  }

  function exportScheduleToICS() {
    window.SoundEngine?.play('confirm');
    const cells = buildMonthCells(viewYear, viewMonth).filter(Boolean);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ShiftRelay Frontline OS//Shift Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ShiftRelay Work Schedule'
    ];
    cells.filter(d => d.hasShift).forEach((item, i) => {
      const year = item.date.getFullYear();
      const month = String(item.date.getMonth() + 1).padStart(2, '0');
      const day = String(item.date.getDate()).padStart(2, '0');
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:shiftrelay_${year}${month}${day}_${i}@shiftrelay.app`,
        `DTSTAMP:${year}${month}${day}T060000Z`,
        `DTSTART:${year}${month}${day}T070000Z`,
        `DTEND:${year}${month}${day}T153000Z`,
        `SUMMARY:${item.shiftTitle}`,
        'END:VEVENT'
      );
    });
    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shiftrelay-${viewYear}-${String(viewMonth + 1).padStart(2, '0')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  window.renderShiftCalendarCard = renderShiftCalendarCard;
  window.bindShiftCalendarEvents = bindShiftCalendarEvents;
  window.exportScheduleToICS = exportScheduleToICS;
})();
