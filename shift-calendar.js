/**
 * ShiftRelay Obsidian-Style Calendar Engine (inspired by liamcain/obsidian-calendar-plugin)
 * - Full 6-row month grid with adjacent-month leading/trailing days
 * - Dedicated ISO Week Number column (W44..W52) with clickable weekly summary
 * - Multi-dot shift/activity indicators (solid emerald dots + hollow pending dot, max 5)
 * - Future dates: 1-tap "Apply for Leave on [Date]" action pre-filling the Leave Request form
 * - Past dates: displays historical shift info & logged handovers for that exact date
 * - Touch/pointer horizontal swipe left/right + prev/next/Today controls + .ics export
 */

(function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const now0 = new Date();
  let viewYear = now0.getFullYear();
  let viewMonth = now0.getMonth();
  let selectedDateKey = toDateKey(now0);
  let selectedWeekSummary = null;
  let cachedApiShifts = [];
  let cachedHandovers = [];

  function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function escapeCalHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getIsoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getDayData(d) {
    const today = new Date();
    const todayKey = toDateKey(today);
    const key = toDateKey(d);
    const isToday = key === todayKey;
    const isFuture = key > todayKey;
    const isPast = key < todayKey;
    const isAdjacent = d.getMonth() !== viewMonth || d.getFullYear() !== viewYear;
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;

    const matchingShifts = cachedApiShifts.filter(s => String(s.date || s.starts_at || s.startsAt || '').slice(0, 10) === key);
    const matchingHandovers = cachedHandovers.filter(h => String(h.created_at || h.createdAt || h.shift_date || '').slice(0, 10) === key);
    const hasShift = matchingShifts.length > 0 || !isWeekend;
    const dotCount = matchingShifts.length > 0 ? Math.min(5, matchingShifts.length) : (isWeekend ? 0 : 1);
    const hasPending = matchingShifts.some(s => String(s.status || '').toLowerCase() === 'pending');

    return {
      date: d,
      key,
      dayNum: d.getDate(),
      isToday,
      isFuture,
      isPast,
      isAdjacent,
      hasShift,
      dotCount,
      hasPending,
      matchingShifts,
      matchingHandovers,
      shiftTitle: matchingShifts[0]?.rotation || matchingShifts[0]?.title || (isWeekend ? 'Rest Day' : 'Day Rotation (Turnover Relay)'),
      shiftHours: matchingShifts[0]
        ? `${String(matchingShifts[0].start_time || String(matchingShifts[0].starts_at || matchingShifts[0].startsAt || '').slice(11, 16) || '07:00')} – ${String(matchingShifts[0].end_time || String(matchingShifts[0].ends_at || matchingShifts[0].endsAt || '').slice(11, 16) || '15:30')}`
        : (isWeekend ? 'Off Duty' : '07:00 – 15:30 (8.5 hrs)')
    };
  }

  function buildObsidianRows(year, month) {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(year, month, 1 - startOffset);

    const rows = [];
    for (let r = 0; r < 6; r++) {
      const weekStart = new Date(gridStart);
      weekStart.setDate(gridStart.getDate() + r * 7);
      const weekNum = getIsoWeekNumber(weekStart);
      const days = [];
      for (let c = 0; c < 7; c++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + c);
        days.push(getDayData(d));
      }
      rows.push({ weekNum, days });
    }
    return rows;
  }

  function repaintCalendar() {
    const section = document.getElementById('shift-calendar-section');
    const host = section?.parentElement;
    if (section && host) {
      section.outerHTML = renderShiftCalendarCard();
      bindShiftCalendarEvents(host);
    }
  }

  function shiftMonth(delta) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    viewYear = next.getFullYear();
    viewMonth = next.getMonth();
    selectedWeekSummary = null;
    repaintCalendar();
  }

  function renderDots(dotCount, hasPending, isSel, hasHandover) {
    if (!dotCount && !hasPending && !hasHandover) return '<span style="height:6px;display:block;"></span>';
    const dots = [];
    for (let i = 0; i < Math.min(4, dotCount); i++) {
      dots.push(`<span style="width:4.5px;height:4.5px;border-radius:50%;background:${isSel ? '#ffffff' : '#10b981'};display:inline-block;"></span>`);
    }
    if (hasHandover && dots.length < 5) {
      dots.push(`<span style="width:4.5px;height:4.5px;border-radius:50%;background:${isSel ? '#fde68a' : '#0284c7'};display:inline-block;"></span>`);
    }
    if (hasPending && dots.length < 5) {
      dots.push(`<span style="width:4.5px;height:4.5px;border-radius:50%;border:1.2px solid ${isSel ? '#ffffff' : '#f59e0b'};display:inline-block;"></span>`);
    }
    return `<span style="display:inline-flex;align-items:center;justify-content:center;gap:2.5px;height:6px;">${dots.join('')}</span>`;
  }

  function renderDayDetailContent(selectedObj) {
    if (selectedWeekSummary) {
      return `
        <div>
          <h4 class="day-shift-title" id="day-detail-title">${escapeCalHtml(selectedWeekSummary.title)}</h4>
          <p class="day-shift-subtitle" id="day-detail-hours">${escapeCalHtml(selectedWeekSummary.subtitle)}</p>
        </div>
        <span class="badge" id="day-detail-badge" style="background:#0284c7;color:#fff;font-weight:700;font-size:11px;">WEEKLY</span>
      `;
    }

    // Future date: show shift + 1-tap Apply for Leave button
    if (selectedObj.isFuture) {
      return `
        <div style="flex:1;min-width:0;">
          <h4 class="day-shift-title" id="day-detail-title">${escapeCalHtml(selectedObj.shiftTitle)}</h4>
          <p class="day-shift-subtitle" id="day-detail-hours">${escapeCalHtml(selectedObj.key)} &middot; ${escapeCalHtml(selectedObj.shiftHours)} &middot; Upcoming</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button type="button" id="sr-cal-apply-leave-btn" data-leave-date="${escapeCalHtml(selectedObj.key)}" class="sr-btn sr-btn-primary" style="min-height:32px;padding:5px 12px;font-size:11.5px;font-weight:700;white-space:nowrap;">
            Apply for Leave
          </button>
        </div>
      `;
    }

    // Past date: show historical shift info & handovers for that exact day
    if (selectedObj.isPast) {
      const hoHtml = selectedObj.matchingHandovers.length > 0
        ? selectedObj.matchingHandovers.slice(0, 2).map(h => `
            <div style="margin-top:6px;padding:7px 10px;border-radius:8px;background:var(--sr-bg-card);border:1px solid var(--sr-border-subtle);font-size:11.5px;color:var(--sr-text-main);">
              <strong>Handover (${escapeCalHtml(h.author_name || h.authorName || 'Team')}):</strong> ${escapeCalHtml(String(h.summary || h.notes || 'Shift handover recorded').slice(0, 120))}
            </div>
          `).join('')
        : `<div style="margin-top:6px;font-size:11.5px;color:var(--sr-text-muted);">No handover logs recorded on ${escapeCalHtml(selectedObj.key)}.</div>`;

      return `
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <h4 class="day-shift-title" id="day-detail-title" style="margin:0;">${escapeCalHtml(selectedObj.shiftTitle)}</h4>
            <span class="badge" style="background:#475569;color:#fff;font-weight:700;font-size:10.5px;">PAST LOG</span>
          </div>
          <p class="day-shift-subtitle" id="day-detail-hours" style="margin:3px 0 0;">${escapeCalHtml(selectedObj.key)} &middot; ${escapeCalHtml(selectedObj.shiftHours)}</p>
          ${hoHtml}
        </div>
      `;
    }

    // Today
    return `
      <div style="flex:1;min-width:0;">
        <h4 class="day-shift-title" id="day-detail-title">${escapeCalHtml(selectedObj.shiftTitle)}</h4>
        <p class="day-shift-subtitle" id="day-detail-hours">${escapeCalHtml(selectedObj.key)} &middot; ${escapeCalHtml(selectedObj.shiftHours)} &middot; Today</p>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span class="badge" id="day-detail-badge" style="background:${selectedObj.hasShift ? '#10b981' : '#64748b'};color:#fff;font-weight:700;font-size:11px;">
          ${selectedObj.hasShift ? 'TODAY' : 'REST'}
        </span>
      </div>
    `;
  }

  function renderShiftCalendarCard() {
    const rows = buildObsidianRows(viewYear, viewMonth);
    const [sy, sm, sd] = selectedDateKey.split('-').map(Number);
    const selectedObj = getDayData(new Date(sy || viewYear, sm ? sm - 1 : viewMonth, sd || 1));

    return `
      <section class="shift-calendar-card" id="shift-calendar-section" style="touch-action:pan-y;user-select:none;">
        <!-- Obsidian Calendar Header -->
        <div class="shift-calendar-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <div style="display:flex;align-items:baseline;gap:6px;">
            <h3 style="margin:0;font-size:16.5px;font-weight:800;color:var(--sr-text-main);">${MONTHS[viewMonth]}</h3>
            <span style="font-size:15px;font-weight:600;color:var(--sr-text-muted);">${viewYear}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" id="sr-cal-prev-month" class="sr-btn sr-btn-secondary" aria-label="Previous month" style="min-height:30px;padding:3px 10px;font-size:14px;font-weight:800;">&lsaquo;</button>
            <button type="button" id="sr-cal-today-btn" class="sr-btn sr-btn-secondary" style="min-height:30px;padding:3px 10px;font-size:11.5px;font-weight:700;">Today</button>
            <button type="button" id="sr-cal-next-month" class="sr-btn sr-btn-secondary" aria-label="Next month" style="min-height:30px;padding:3px 10px;font-size:14px;font-weight:800;">&rsaquo;</button>
            <button class="btn-ics-export" id="btn-export-ics" type="button" title="Sync shifts to phone calendar" style="margin-left:4px;">
              ${window.Icons?.download ? window.Icons.download(13) : ''} .ics
            </button>
          </div>
        </div>

        <!-- Obsidian Weekday + ISO Week Header -->
        <div style="display:grid;grid-template-columns:34px repeat(7,1fr);gap:4px;margin-bottom:6px;text-align:center;">
          <div style="font-size:10px;font-weight:800;color:var(--sr-text-muted,#64748b);padding:4px 0;">W</div>
          ${WEEKDAYS.map(w => `<div style="font-size:10.5px;font-weight:800;color:var(--sr-text-muted,#64748b);text-transform:uppercase;padding:4px 0;">${w}</div>`).join('')}
        </div>

        <!-- 6-Row Obsidian Grid -->
        <div id="sr-month-grid" style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;">
          ${rows.map(row => `
            <div style="display:grid;grid-template-columns:34px repeat(7,1fr);gap:4px;align-items:center;">
              <button type="button" class="sr-obs-week-btn" data-week-num="${row.weekNum}" title="View Week ${row.weekNum} Summary"
                style="height:44px;border-radius:8px;border:1px solid transparent;background:var(--sr-bg-subtle,rgba(148,163,184,0.08));color:var(--sr-text-muted,#64748b);font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;cursor:pointer;">
                W${String(row.weekNum).padStart(2, '0')}
              </button>
              ${row.days.map(c => {
                const isSel = c.key === selectedDateKey;
                const bg = isSel ? '#059669' : (c.isToday ? 'rgba(16,185,129,0.14)' : 'transparent');
                const fg = isSel ? '#ffffff' : (c.isAdjacent ? 'var(--sr-text-muted,#94a3b8)' : 'var(--sr-text-main,#0f172a)');
                const opacity = (!isSel && c.isAdjacent) ? '0.48' : '1';
                const border = isSel ? '1.5px solid #059669' : (c.isToday ? '1.5px solid #10b981' : '1px solid var(--sr-border-subtle,rgba(148,163,184,0.16))');
                return `
                  <button type="button" class="sr-month-day-btn ${isSel ? 'active' : ''}" data-date-key="${c.key}" data-adj="${c.isAdjacent ? '1' : '0'}"
                    style="height:44px;border-radius:10px;border:${border};background:${bg};color:${fg};opacity:${opacity};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;font-weight:${c.isToday || isSel ? '800' : '600'};font-size:12.5px;transition:all .12s;">
                    <span>${c.dayNum}</span>
                    ${renderDots(c.dotCount, c.hasPending, isSel, c.matchingHandovers.length > 0)}
                  </button>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>

        <div style="font-size:11px;color:var(--sr-text-muted);text-align:center;margin-bottom:10px;">Tap past dates for shift &amp; handover history &middot; Tap future dates to apply for leave &middot; Swipe to switch months</div>

        <!-- Selected Day or Week Detail Banner -->
        <div class="active-day-shift-detail" id="active-day-detail" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          ${renderDayDetailContent(selectedObj)}
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
      selectedWeekSummary = null;
      repaintCalendar();
    });

    // Future date: 1-tap Apply for Leave pre-filling Leave form
    document.getElementById('sr-cal-apply-leave-btn')?.addEventListener('click', (e) => {
      const targetDate = e.currentTarget.dataset.leaveDate || selectedDateKey;
      const leaveTabBtn = document.getElementById('sr-sched-tab-leave');
      if (leaveTabBtn) {
        leaveTabBtn.click();
        setTimeout(() => {
          const sEl = document.getElementById('sr-leave-start');
          const eEl = document.getElementById('sr-leave-end');
          if (sEl) sEl.value = targetDate;
          if (eEl) eEl.value = targetDate;
          sEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 280);
      }
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

    container.querySelectorAll('.sr-obs-week-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wNum = Number(btn.dataset.weekNum);
        const rows = buildObsidianRows(viewYear, viewMonth);
        const row = rows.find(r => r.weekNum === wNum);
        const workDays = row ? row.days.filter(d => d.hasShift).length : 5;
        selectedWeekSummary = {
          title: `ISO Week ${String(wNum).padStart(2, '0')} Summary`,
          subtitle: `${workDays} scheduled shift day(s) · ~${(workDays * 8.5).toFixed(1)} hrs planned`
        };
        repaintCalendar();
      });
    });

    container.querySelectorAll('.sr-month-day-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedWeekSummary = null;
        selectedDateKey = btn.dataset.dateKey;
        const [y, m] = selectedDateKey.split('-').map(Number);
        if (btn.dataset.adj === '1' && y && m) {
          viewYear = y;
          viewMonth = m - 1;
        }
        repaintCalendar();
      });
    });

    document.getElementById('btn-export-ics')?.addEventListener('click', () => exportScheduleToICS());

    // Hydrate real shifts & past handovers in background (works offline via window.api cache)
    if (typeof window.api === 'function' && !section?.dataset.hydrated) {
      if (section) section.dataset.hydrated = '1';
      Promise.all([
        window.api('/api/calendar/shifts').catch(() => null),
        window.api('/api/handovers').catch(() => null)
      ]).then(([shiftRes, hoRes]) => {
        let changed = false;
        if (Array.isArray(shiftRes?.shifts)) { cachedApiShifts = shiftRes.shifts; changed = true; }
        if (Array.isArray(hoRes?.handovers)) { cachedHandovers = hoRes.handovers; changed = true; }
        else if (Array.isArray(hoRes)) { cachedHandovers = hoRes; changed = true; }
        if (changed) repaintCalendar();
      });
    }
  }

  function exportScheduleToICS() {
    window.SoundEngine?.play('confirm');
    const rows = buildObsidianRows(viewYear, viewMonth);
    const days = rows.flatMap(r => r.days).filter(d => !d.isAdjacent && d.hasShift);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ShiftRelay Frontline OS//Shift Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ShiftRelay Work Schedule'
    ];
    days.forEach((item, i) => {
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
