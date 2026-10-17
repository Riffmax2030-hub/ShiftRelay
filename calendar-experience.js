/**
 * ShiftRelay Reactive Calendar & Workforce Planner
 * Clean, mobile-first calendar view with optimistic open-shift claiming.
 */

const calendarState = {
  month: new Date(),
  selected: new Date().toISOString().slice(0, 10),
  tab: 'agenda',
  claimedShiftIds: new Set(),
  shiftsCache: null,
  marketCache: null
};

const isoDate = (value) => new Date(value).toISOString().slice(0, 10);

const clock = (value) => {
  try {
    return new Intl.DateTimeFormat(typeof formatLocale === 'function' ? formatLocale() : undefined, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};

const formatDayLabel = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const isToday = dateStr === new Date().toISOString().slice(0, 10);
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return `${isToday ? 'Today · ' : ''}${d.toLocaleDateString(undefined, options)}`;
};

function buildCalendarGrid(shifts) {
  const year = calendarState.month.getFullYear();
  const month = calendarState.month.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = first.getDay();
  const today = new Date().toISOString().slice(0, 10);

  const cells = Array.from({ length: offset + days }, (_, index) => {
    if (index < offset) return '<span class="calendar-blank"></span>';
    const day = index - offset + 1;
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items = shifts.filter((shift) => isoDate(shift.starts_at) === date);
    const isSelected = date === calendarState.selected;
    const isTodayDay = date === today;

    return `
      <button class="calendar-day ${isSelected ? 'selected' : ''} ${isTodayDay ? 'today' : ''}" data-calendar-date="${date}">
        <b>${day}</b>
        <i>${items.slice(0, 3).map((_, i) => `<em class="dot dot-${i}"></em>`).join('')}</i>
      </button>
    `;
  }).join('');

  return `
    <div class="calendar-card">
      <div class="calendar-weekdays">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div class="calendar-grid">${cells}</div>
    </div>
  `;
}

function buildRosterSections(shifts) {
  const now = Date.now();
  
  // Who is currently clocked in: starts_at <= now <= ends_at
  const clockedIn = shifts.filter((s) => new Date(s.starts_at).getTime() <= now && new Date(s.ends_at).getTime() >= now);
  
  // Who is up next: starts within 4 hours
  const upNext = shifts.filter((s) => {
    const diff = new Date(s.starts_at).getTime() - now;
    return diff > 0 && diff <= 4 * 3600000;
  });

  // Scheduled for selected date
  const selectedDayShifts = shifts.filter((s) => isoDate(s.starts_at) === calendarState.selected);

  const renderWorkerRow = (shift, statusType) => {
    const name = shift.worker_name || 'Frontline Team';
    const initial = escape(name).slice(0, 1).toUpperCase();
    let badgeHtml = '';

    if (statusType === 'on') {
      badgeHtml = `<b class="roster-status on"><span class="pulse-dot"></span> Clocked In</b>`;
    } else if (statusType === 'soon') {
      badgeHtml = `<b class="roster-status soon">${Icons.clock()} Up Next</b>`;
    } else {
      badgeHtml = `<b class="roster-status later">${escape(shift.status || 'Scheduled')}</b>`;
    }

    return `
      <article class="roster-row">
        <span class="avatar-mini">${initial}</span>
        <div>
          <strong>${escape(name)}</strong>
          <p>${clock(shift.starts_at)} – ${clock(shift.ends_at)}</p>
        </div>
        ${badgeHtml}
      </article>
    `;
  };

  return `
    <!-- Currently Clocked In -->
    <div class="roster-group">
      <div class="roster-group-title">
        <span style="display:inline-flex;align-items:center;gap:6px;"><span class="pulse-dot"></span> Currently Clocked In</span>
        <span class="count-badge">${clockedIn.length} active</span>
      </div>
      ${clockedIn.length ? clockedIn.map((s) => renderWorkerRow(s, 'on')).join('') : '<p class="roster-empty">No staff currently clocked in.</p>'}
    </div>

    <!-- Up Next -->
    <div class="roster-group">
      <div class="roster-group-title">
        <span style="display:inline-flex;align-items:center;gap:6px;">${Icons.clock()} Up Next (Next 4 Hours)</span>
        <span class="count-badge">${upNext.length}</span>
      </div>
      ${upNext.length ? upNext.map((s) => renderWorkerRow(s, 'soon')).join('') : '<p class="roster-empty">No shifts starting in the next 4 hours.</p>'}
    </div>

    <!-- Selected Day Agenda -->
    <div class="roster-group">
      <div class="roster-group-title">
        <span style="display:inline-flex;align-items:center;gap:6px;">${Icons.calendar()} ${formatDayLabel(calendarState.selected)}</span>
        <span class="count-badge">${selectedDayShifts.length} scheduled</span>
      </div>
      ${selectedDayShifts.length ? selectedDayShifts.map((s) => renderWorkerRow(s, 'later')).join('') : '<p class="roster-empty">No scheduled shifts for this day.</p>'}
    </div>
  `;
}

function buildOpenShiftsMarket(marketShifts, canManage) {
  if (!marketShifts || !marketShifts.length) {
    return `
      <div class="open-shift-grid">
        <p class="roster-empty">No open shifts available for claiming right now.</p>
      </div>
    `;
  }

  return `
    <div class="open-shift-grid">
      ${marketShifts.map((shift) => {
        const isClaimed = calendarState.claimedShiftIds.has(shift.id) || shift.status === 'claimed';
        const shiftDate = new Date(shift.starts_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const rateDisplay = shift.rate || '$28.50/hr';
        const slotsCount = shift.slots ?? 1;
        return `
          <article class="open-shift-card ${isClaimed ? 'is-claimed' : ''}" id="shift-card-${shift.id}">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <p class="shift-meta" style="margin:0;">${shiftDate}</p>
                <span class="shift-rate-badge" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;background:#ecfdf5;color:#047857;padding:2px 8px;border-radius:12px;border:1px solid #a7f3d0;">
                  ${Icons.dollar()} ${rateDisplay}
                </span>
              </div>
              <h3 style="margin:0 0 4px;">${escape(shift.title || 'General Frontline Shift')}</h3>
              <p class="shift-time" style="display:inline-flex;align-items:center;gap:4px;margin:2px 0 6px;">
                ${Icons.clock()} ${clock(shift.starts_at)} – ${clock(shift.ends_at)}
              </p>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:11px;color:var(--text-secondary);display:inline-flex;align-items:center;gap:4px;">
                  ${Icons.location()} ${escape(shift.location || 'Main Site Facility')}
                </span>
                <span style="font-size:11px;color:#0284c7;background:#f0f9ff;padding:2px 6px;border-radius:4px;font-weight:600;">
                  ${slotsCount > 1 ? `${slotsCount} slots open` : '1 slot open'}
                </span>
              </div>
              ${shift.notes ? `<small class="shift-meta">Notes: ${escape(shift.notes)}</small>` : ''}
            </div>
            ${isClaimed 
              ? `<button class="btn-claim claimed" disabled style="display:inline-flex;align-items:center;gap:6px;">${Icons.check()} Claimed</button>`
              : `<button class="primary btn-claim" data-claim-shift="${shift.id}" data-shift-title="${escape(shift.title || 'Shift')}">Claim Shift</button>`
            }
          </article>
        `;
      }).join('')}
    </div>
  `;
}

async function renderCalendar() {
  dashboardHeader('Calendar', 'WORKFORCE PLANNER');
  const month = `${calendarState.month.getFullYear()}-${String(calendarState.month.getMonth() + 1).padStart(2, '0')}`;

  try {
    const [calendar, market] = await Promise.all([
      api(`/api/calendar?month=${month}`),
      api('/api/open-shifts')
    ]);

    calendarState.shiftsCache = calendar.shifts || [];
    calendarState.marketCache = market.shifts || [];

    const canManage = ['owner', 'workforce_admin'].includes(state.user?.role);
    const monthName = calendarState.month.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const openCount = calendarState.marketCache.filter(s => !calendarState.claimedShiftIds.has(s.id) && s.status !== 'claimed').length;

    $('#dashboard').innerHTML = `
      <section class="schedule-experience">
        <!-- Calendar Month Bar -->
        <div class="schedule-header">
          <div>
            <p class="eyebrow">WORKFORCE ROSTER</p>
            <h2>${monthName}</h2>
          </div>
          <div class="calendar-nav-buttons">
            <button class="calendar-arrow" id="calendar-prev" aria-label="Previous Month">‹</button>
            <button class="secondary" id="calendar-today" style="min-height: 44px; padding: 0 14px;">Today</button>
            <button class="calendar-arrow" id="calendar-next" aria-label="Next Month">›</button>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="schedule-tabs">
          <button class="${calendarState.tab === 'agenda' ? 'active' : ''}" data-schedule-tab="agenda">
            Daily Agenda & Roster
          </button>
          <button class="${calendarState.tab === 'market' ? 'active' : ''}" data-schedule-tab="market">
            Open Shifts <b>${openCount}</b>
          </button>
          <button class="${calendarState.tab === 'monthly' ? 'active' : ''}" data-schedule-tab="monthly">
            Monthly Grid
          </button>
        </div>

        <!-- Main Panel Content -->
        <section class="schedule-panel">
          ${calendarState.tab === 'agenda' ? `
            <div class="panel-title">
              <div>
                <p class="eyebrow">WHO IS WORKING</p>
                <h2>Daily Agenda & Live Staff Roster</h2>
              </div>
            </div>
            ${buildRosterSections(calendarState.shiftsCache)}
          ` : calendarState.tab === 'market' ? `
            <div class="panel-title">
              <div>
                <p class="eyebrow">COVERAGE MARKETPLACE</p>
                <h2>Claim Open Shifts</h2>
              </div>
              ${canManage ? '<button class="secondary" id="post-open-shift">Post open shift</button>' : ''}
            </div>
            ${buildOpenShiftsMarket(calendarState.marketCache, canManage)}
          ` : `
            <div class="panel-title">
              <div>
                <p class="eyebrow">MONTH VIEW</p>
                <h2>Select a day to view or schedule</h2>
              </div>
            </div>
            ${buildCalendarGrid(calendarState.shiftsCache)}
          `}
        </section>
      </section>
    `;

    // Tab Navigation
    document.querySelectorAll('[data-schedule-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calendarState.tab = btn.dataset.scheduleTab;
        renderCalendar();
      });
    });

    // Calendar Navigation
    $('#calendar-prev').addEventListener('click', () => {
      calendarState.month.setMonth(calendarState.month.getMonth() - 1);
      renderCalendar();
    });

    $('#calendar-next').addEventListener('click', () => {
      calendarState.month.setMonth(calendarState.month.getMonth() + 1);
      renderCalendar();
    });

    $('#calendar-today')?.addEventListener('click', () => {
      calendarState.month = new Date();
      calendarState.selected = new Date().toISOString().slice(0, 10);
      renderCalendar();
    });

    // Day selection on grid
    document.querySelectorAll('[data-calendar-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        calendarState.selected = btn.dataset.calendarDate;
        calendarState.tab = 'agenda';
        renderCalendar();
      });
    });

    // Post Open Shift Dialog
    $('#post-open-shift')?.addEventListener('click', () => openPostOpenShift());

    // Optimistic Shift Claiming
    document.querySelectorAll('[data-claim-shift]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const shiftId = btn.dataset.claimShift;
        const shiftTitle = btn.dataset.shiftTitle || 'Shift';

        // 1. OPTIMISTIC UI UPDATE: Reflect immediately on screen
        calendarState.claimedShiftIds.add(shiftId);
        btn.disabled = true;
        btn.className = 'btn-claim claimed';
        btn.innerHTML = `${Icons.check()} Claimed`;

        const card = document.getElementById(`shift-card-${shiftId}`);
        if (card) card.classList.add('is-claimed');

        toast(`Shift claimed! Added to your schedule.`);

        // Optimistically append to user's scheduled shifts cache
        const matchedShift = calendarState.marketCache.find(s => s.id === shiftId);
        if (matchedShift) {
          calendarState.shiftsCache.push({
            id: `claimed-${shiftId}`,
            worker_name: state.user?.name || 'You',
            starts_at: matchedShift.starts_at,
            ends_at: matchedShift.ends_at,
            status: 'claimed'
          });
        }

        // 2. BACKGROUND SERVER SYNC
        try {
          await api(`/api/open-shifts/${shiftId}/claim`, { method: 'POST' });
        } catch (error) {
          // Rollback on failure
          calendarState.claimedShiftIds.delete(shiftId);
          btn.disabled = false;
          btn.className = 'primary btn-claim';
          btn.textContent = 'Claim Shift';
          if (card) card.classList.remove('is-claimed');
          toast(`Failed to claim shift: ${error.message}`);
        }
      });
    });

    bindNavigation();
  } catch (error) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(error.message)}</p>`;
  }
}

function openPostOpenShift() {
  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="open-shift-dialog">
      <div>
        <button class="dialog-close" id="close-open-shift-dialog">×</button>
        <p class="eyebrow">OPEN SHIFT</p>
        <h2>Find coverage fast.</h2>
        <form class="access-form" id="open-shift-form">
          <label>Role or shift title
            <input name="title" required placeholder="Evening stock support" />
          </label>
          <label>Starts
            <input name="startsAt" type="datetime-local" required />
          </label>
          <label>Ends
            <input name="endsAt" type="datetime-local" required />
          </label>
          <label>Roles needed
            <input name="slots" type="number" min="1" value="1" />
          </label>
          <label>Notes
            <input name="notes" placeholder="Optional details for the worker" />
          </label>
          <button class="primary" style="min-height: 48px;">Post open shift</button>
        </form>
      </div>
    </section>
  `);

  $('#close-open-shift-dialog').addEventListener('click', () => $('#open-shift-dialog').remove());
  $('#open-shift-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/open-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
      });
      $('#open-shift-dialog').remove();
      toast('Open shift posted to eligible staff.');
      calendarState.tab = 'market';
      renderCalendar();
    } catch (err) {
      toast(err.message);
    }
  });
}

window.renderCalendar = renderCalendar;

