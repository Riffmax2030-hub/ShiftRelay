/**
 * ShiftRelay Weekly Shift Calendar & 1-Tap .ICS Export Engine
 * Visualizes shift rotations, tracks overtime thresholds,
 * and allows instant syncing to Google, Apple, and Outlook calendars.
 */

(function () {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getWeekDays() {
    const today = new Date();
    const currDay = today.getDay(); // 0-6
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - currDay + 1); // Monday start

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      const isPast = d < today && !isToday;
      // Default shift schedule: Mon-Fri on duty, Sat-Sun off
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      week.push({
        date: d,
        dayName: DAYS[d.getDay()],
        dayNum: d.getDate(),
        isToday,
        isPast,
        hasShift: !isWeekend,
        shiftTitle: isWeekend ? 'Rest Day' : 'Day Rotation (Turnover Relay)',
        shiftHours: isWeekend ? 'Off Duty' : '07:00 – 15:30 (8.5 hrs)'
      });
    }
    return week;
  }

  function renderShiftCalendarCard() {
    const week = getWeekDays();
    const activeDayIdx = week.findIndex(w => w.isToday) >= 0 ? week.findIndex(w => w.isToday) : 0;
    const activeShift = week[activeDayIdx];

    return `
      <section class="shift-calendar-card" id="shift-calendar-section">
        <div class="shift-calendar-head">
          <h3>${window.Icons?.calendar ? window.Icons.calendar() : ''} Shift Rotation Schedule</h3>
          <button class="btn-ics-export" id="btn-export-ics" type="button" title="Sync shifts to phone calendar">
            ${window.Icons?.download ? window.Icons.download(13) : ''} Sync Calendar (.ics)
          </button>
        </div>

        <!-- 7-Day Carousel -->
        <div class="week-date-carousel" id="week-date-carousel">
          ${week.map((item, idx) => `
            <div class="date-card-pill ${idx === activeDayIdx ? 'active' : ''} ${item.hasShift ? 'has-shift' : ''}" data-day-idx="${idx}">
              <span class="date-card-day">${item.dayName}</span>
              <span class="date-card-num">${item.dayNum}</span>
              <span class="date-card-dot"></span>
            </div>
          `).join('')}
        </div>

        <!-- Selected Day Details Banner -->
        <div class="active-day-shift-detail" id="active-day-detail">
          <div>
            <h4 class="day-shift-title" id="day-detail-title">${activeShift.shiftTitle}</h4>
            <p class="day-shift-subtitle" id="day-detail-hours">${activeShift.shiftHours} · Station Verified</p>
          </div>
          <span class="badge" style="background:#10b981;color:#fff;font-weight:700;font-size:11px;">
            ${activeShift.hasShift ? 'SCHEDULED' : 'REST'}
          </span>
        </div>

        <!-- Overtime & Fatigue Tracker -->
        <div class="overtime-tracker">
          <div class="overtime-meta-row">
            <span class="overtime-label">Weekly Hours &amp; Fatigue Threshold</span>
            <span class="overtime-val">34.0 / 40.0 hrs</span>
          </div>
          <div class="overtime-progress-bar">
            <div class="overtime-progress-fill" style="width: 85%;"></div>
          </div>
        </div>
      </section>
    `;
  }

  function bindShiftCalendarEvents(container = document) {
    const week = getWeekDays();

    // Day card switching
    container.querySelectorAll('.date-card-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        window.SoundEngine?.play('click');
        container.querySelectorAll('.date-card-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const idx = parseInt(pill.dataset.dayIdx, 10);
        const selected = week[idx];
        if (selected) {
          const title = document.getElementById('day-detail-title');
          const hours = document.getElementById('day-detail-hours');
          if (title) title.textContent = selected.shiftTitle;
          if (hours) hours.textContent = `${selected.shiftHours} · Station Verified`;
        }
      });
    });

    // 1-Tap .ics Export
    document.getElementById('btn-export-ics')?.addEventListener('click', () => {
      exportScheduleToICS();
    });
  }

  function exportScheduleToICS() {
    window.SoundEngine?.play('confirm');
    const week = getWeekDays();
    const user = window.state?.user || {};
    const org = user.organisation_name || 'ShiftRelay Workplace';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ShiftRelay Frontline OS//Shift Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:ShiftRelay Work Schedule'
    ];

    week.filter(d => d.hasShift).forEach((item, i) => {
      const year = item.date.getFullYear();
      const month = String(item.date.getMonth() + 1).padStart(2, '0');
      const day = String(item.date.getDate()).padStart(2, '0');
      
      const startStamp = `${year}${month}${day}T070000Z`;
      const endStamp = `${year}${month}${day}T153000Z`;
      const uid = `shiftrelay_${year}${month}${day}_${i}@shiftrelay.app`;

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${startStamp}`,
        `DTSTART:${startStamp}`,
        `DTEND:${endStamp}`,
        `SUMMARY:ShiftRelay: Day Rotation at ${org}`,
        `DESCRIPTION:Official frontline shift turnover at ${org}. Ensure turnover log is verified in ShiftRelay before handoff.`,
        `LOCATION:${org}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT45M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Turnover Reminder: Handover brief preparation in 45 minutes',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ShiftRelay-Schedule.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast('Schedule downloaded! Open to sync with your phone calendar.');
  }

  window.renderShiftCalendarCard = renderShiftCalendarCard;
  window.bindShiftCalendarEvents = bindShiftCalendarEvents;
  window.exportScheduleToICS = exportScheduleToICS;
})();
