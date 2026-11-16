/**
 * ShiftRelay OS — Attendance Policy, Exception Queue, Pay Impact & Reminder Engine
 * Transparent, single-source calculation for Nigerian & international enterprise workforces.
 */

export const DEFAULT_ATTENDANCE_POLICY = Object.freeze({
  graceMinutes: 10,
  missedClockInAction: 'exception_review',      // 'exception_review' | 'pro_rata_deduct' | 'pardon_with_flag'
  missedClockOutAction: 'auto_cap_shift_end',   // 'exception_review' | 'auto_cap_shift_end' | 'pro_rata_deduct'
  earlyDepartureAction: 'exception_review',     // 'exception_review' | 'pro_rata_deduct' | 'pardon_with_flag'
  lateArrivalDeductionMode: 'none_within_grace', // 'none_within_grace' | 'pro_rata_minutes' | 'shift_score_only'
  reminderScheduleMinutes: [30, 15, 0],
  missedClockInEscalationOffsetMinutes: 5,
  preClockOutReminderMinutes: 10,
  policyVersion: '2026.11-NG-v1'
});

const VALID_MISSED_IN = new Set(['exception_review', 'pro_rata_deduct', 'pardon_with_flag']);
const VALID_MISSED_OUT = new Set(['exception_review', 'auto_cap_shift_end', 'pro_rata_deduct']);
const VALID_EARLY_OUT = new Set(['exception_review', 'pro_rata_deduct', 'pardon_with_flag']);
const VALID_LATE_MODE = new Set(['none_within_grace', 'pro_rata_minutes', 'shift_score_only']);

export function normalizeAttendancePolicy(input = {}, existing = {}) {
  const base = { ...DEFAULT_ATTENDANCE_POLICY, ...(existing || {}) };
  const rawGrace = input.graceMinutes !== undefined ? Number(input.graceMinutes) : Number(base.graceMinutes);
  const graceMinutes = Number.isFinite(rawGrace) ? Math.max(0, Math.min(60, Math.round(rawGrace))) : DEFAULT_ATTENDANCE_POLICY.graceMinutes;

  const missedClockInAction = VALID_MISSED_IN.has(input.missedClockInAction)
    ? input.missedClockInAction
    : (VALID_MISSED_IN.has(base.missedClockInAction) ? base.missedClockInAction : DEFAULT_ATTENDANCE_POLICY.missedClockInAction);

  const missedClockOutAction = VALID_MISSED_OUT.has(input.missedClockOutAction)
    ? input.missedClockOutAction
    : (VALID_MISSED_OUT.has(base.missedClockOutAction) ? base.missedClockOutAction : DEFAULT_ATTENDANCE_POLICY.missedClockOutAction);

  const earlyDepartureAction = VALID_EARLY_OUT.has(input.earlyDepartureAction)
    ? input.earlyDepartureAction
    : (VALID_EARLY_OUT.has(base.earlyDepartureAction) ? base.earlyDepartureAction : DEFAULT_ATTENDANCE_POLICY.earlyDepartureAction);

  const lateArrivalDeductionMode = VALID_LATE_MODE.has(input.lateArrivalDeductionMode)
    ? input.lateArrivalDeductionMode
    : (VALID_LATE_MODE.has(base.lateArrivalDeductionMode) ? base.lateArrivalDeductionMode : DEFAULT_ATTENDANCE_POLICY.lateArrivalDeductionMode);

  let rawReminders = input.reminderScheduleMinutes !== undefined
    ? input.reminderScheduleMinutes
    : base.reminderScheduleMinutes;
  if (typeof rawReminders === 'string') {
    rawReminders = rawReminders.split(',').map(v => Number(v.trim()));
  }
  const reminderScheduleMinutes = Array.isArray(rawReminders)
    ? Array.from(new Set(rawReminders.map(n => Math.round(Number(n))).filter(n => Number.isFinite(n) && n >= 0 && n <= 240))).sort((a, b) => b - a)
    : [...DEFAULT_ATTENDANCE_POLICY.reminderScheduleMinutes];
  if (reminderScheduleMinutes.length === 0) reminderScheduleMinutes.push(30, 15, 0);

  const rawEsc = input.missedClockInEscalationOffsetMinutes !== undefined
    ? Number(input.missedClockInEscalationOffsetMinutes)
    : Number(base.missedClockInEscalationOffsetMinutes);
  const missedClockInEscalationOffsetMinutes = Number.isFinite(rawEsc)
    ? Math.max(1, Math.min(60, Math.round(rawEsc)))
    : DEFAULT_ATTENDANCE_POLICY.missedClockInEscalationOffsetMinutes;

  const rawPreOut = input.preClockOutReminderMinutes !== undefined
    ? Number(input.preClockOutReminderMinutes)
    : Number(base.preClockOutReminderMinutes);
  const preClockOutReminderMinutes = Number.isFinite(rawPreOut)
    ? Math.max(0, Math.min(60, Math.round(rawPreOut)))
    : DEFAULT_ATTENDANCE_POLICY.preClockOutReminderMinutes;

  const policyVersion = String(input.policyVersion || base.policyVersion || DEFAULT_ATTENDANCE_POLICY.policyVersion).trim().slice(0, 64);

  return {
    graceMinutes,
    missedClockInAction,
    missedClockOutAction,
    earlyDepartureAction,
    lateArrivalDeductionMode,
    reminderScheduleMinutes,
    missedClockInEscalationOffsetMinutes,
    preClockOutReminderMinutes,
    policyVersion,
    updatedAt: input.updatedAt || base.updatedAt || new Date().toISOString()
  };
}

export function getEffectiveAttendancePolicy(org) {
  const raw = org?.settings?.attendancePolicy || org?.attendancePolicy || {};
  return normalizeAttendancePolicy(raw, DEFAULT_ATTENDANCE_POLICY);
}

/**
 * Format YYYY-MM payroll metadata dynamically (no hardcoded month).
 */
export function formatMonthMeta(monthParam = null, timeZone = 'Africa/Lagos') {
  const safeTz = validateTimeZone(timeZone);
  let month = typeof monthParam === 'string' && /^\d{4}-\d{2}$/.test(monthParam.trim())
    ? monthParam.trim()
    : '';
  if (!month) {
    month = getDateKeyInZone(new Date(), safeTz).slice(0, 7);
  }
  const [yrStr, moStr] = month.split('-');
  const year = Number(yrStr);
  const monthIdx = Math.max(0, Math.min(11, Number(moStr) - 1));
  const refDate = new Date(Date.UTC(year, monthIdx, 15, 12, 0, 0));
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(refDate);

  // Pay date: 25th of the payroll month (adjusted from Sat/Sun to Friday)
  const payCandidate = new Date(Date.UTC(year, monthIdx, 25, 12, 0, 0));
  const dow = payCandidate.getUTCDay();
  if (dow === 6) payCandidate.setUTCDate(24);
  if (dow === 0) payCandidate.setUTCDate(23);
  const payDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(payCandidate);

  const monthCompact = month.replace('-', '');
  const shortMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(refDate);
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();

  return {
    month,
    monthCompact,
    period: `${monthLabel} Monthly Payroll Cycle`,
    periodShort: `${shortMonth} 1 — ${shortMonth} ${lastDay}, ${year}`,
    payDate
  };
}

export function validateTimeZone(tz) {
  const candidate = String(tz || 'Africa/Lagos').trim() || 'Africa/Lagos';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return 'Africa/Lagos';
  }
}

export function getDateKeyInZone(dateInput, timeZone = 'Africa/Lagos') {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: validateTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Compute UTC timestamp in milliseconds for a local YYYY-MM-DD + HH:MM in timeZone.
 */
export function zonedDateTimeToUtcIso(dateKey, timeStr, timeZone = 'Africa/Lagos') {
  const match = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = Number(match[3] || 0);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  const [y, m, d] = dateKey.split('-').map(Number);
  const desiredUtcWallMs = Date.UTC(y, m - 1, d, hh, mm, ss, 0);
  const safeTz = validateTimeZone(timeZone);

  // Two-pass Intl offset convergence (handles DST & fixed offsets cleanly with zero external deps)
  let guessMs = desiredUtcWallMs;
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(new Date(guessMs));
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    const hVal = Number(map.hour) === 24 ? 0 : Number(map.hour);
    const renderedMs = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      hVal,
      Number(map.minute),
      Number(map.second),
      0
    );
    guessMs += (desiredUtcWallMs - renderedMs);
  }
  return new Date(guessMs).toISOString();
}

/**
 * Parse a worker-submitted or supervisor-submitted clock-out string onto the shift's actual date.
 * If departure time is earlier than clockedInAt (overnight shift), rolls onto next local day.
 */
export function parseClockTimeOnDate(baseIso, timeInput, timeZone = 'Africa/Lagos', minAfterIso = null) {
  const raw = String(timeInput || '').trim();
  if (!raw) return null;

  // Full ISO datetime accepted directly if valid and >= clockedIn
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return null;
    if (minAfterIso && dt.getTime() <= new Date(minAfterIso).getTime()) return null;
    return dt.toISOString();
  }

  const timeOnlyMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeOnlyMatch) return null;

  const safeTz = validateTimeZone(timeZone);
  const baseDate = new Date(baseIso || Date.now());
  const dateKey = getDateKeyInZone(baseDate, safeTz);
  if (!dateKey) return null;

  let candidateIso = zonedDateTimeToUtcIso(dateKey, raw, safeTz);
  if (!candidateIso) return null;

  const minMs = minAfterIso ? new Date(minAfterIso).getTime() : baseDate.getTime();
  if (new Date(candidateIso).getTime() <= minMs) {
    // Overnight shift wrap (+1 day)
    const [y, m, d] = dateKey.split('-').map(Number);
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
    const nextKey = nextDay.toISOString().slice(0, 10);
    const nextIso = zonedDateTimeToUtcIso(nextKey, raw, safeTz);
    if (nextIso) candidateIso = nextIso;
  }

  return candidateIso;
}

function getMemberShiftScheduleWindow(member) {
  const startStr = String(member?.shift_start || member?.shiftStart || '06:00').slice(0, 5);
  const endStr = String(member?.shift_end || member?.shiftEnd || '14:00').slice(0, 5);
  return { startStr, endStr };
}

function calculateHourlyRateFromContract(contract) {
  if (!contract) return 0;
  if (String(contract.compensation_type || '').includes('hourly') && Number(contract.hourly_rate) > 0) {
    return Number(contract.hourly_rate);
  }
  const monthly = Number(contract.monthly_rate ?? contract.monthly_salary ?? 0);
  if (monthly > 0) return monthly / (22 * 8);
  return Number(contract.hourly_rate || 0);
}

/**
 * Derive & merge unified Attendance Exceptions for a single organisation and month.
 * Non-mutating when persistedDecisions already contains resolved statuses (pardoned/adjusted/unexcused).
 */
export function computeAttendanceExceptionsForOrg({
  org,
  members = [],
  contracts = [],
  timeEntries = [],
  scheduledShifts = [],
  leaveRequests = [],
  punchCorrections = [],
  persistedExceptions = [],
  month = null,
  now = new Date()
}) {
  const orgId = org?.id;
  if (!orgId) {
    return {
      policy: DEFAULT_ATTENDANCE_POLICY,
      month: formatMonthMeta(month).month,
      exceptions: [],
      missingAtShiftStart: [],
      summary: { total: 0, pendingReview: 0, pardoned: 0, adjusted: 0, unexcused: 0, pardonedHours: 0, unexcusedDeductedHours: 0 }
    };
  }

  const timeZone = validateTimeZone(org.time_zone || 'Africa/Lagos');
  const policy = getEffectiveAttendancePolicy(org);
  const monthMeta = formatMonthMeta(month, timeZone);
  const targetMonth = monthMeta.month;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  const existingByKey = new Map();
  for (const ex of persistedExceptions) {
    if (!ex || (ex.organisationId && ex.organisationId !== orgId && ex.organisation_id !== orgId)) continue;
    const key = ex.exceptionKey || ex.exception_key || ex.id;
    if (key) existingByKey.set(key, ex);
  }

  const contractsByMember = new Map();
  for (const c of contracts) {
    if ((c.tenant_id || c.organisation_id) !== orgId && (c.tenant_id || c.organisation_id)) continue;
    if (c.userId) contractsByMember.set(c.userId, c);
    if (c.membershipId) contractsByMember.set(c.membershipId, c);
  }

  const membersById = new Map();
  for (const m of members) {
    if (m.organisation_id && m.organisation_id !== orgId) continue;
    const mid = m.id || m.membership_id || m.user_id;
    if (mid) membersById.set(mid, m);
    if (m.user_id) membersById.set(m.user_id, m);
  }

  const approvedLeave = (leaveRequests || []).filter(l =>
    (!l.organisation_id || l.organisation_id === orgId) &&
    String(l.status || '').toLowerCase() === 'approved'
  );

  const hasApprovedLeaveOn = (memberId, dateKey) => approvedLeave.some(l => {
    const mid = l.membership_id || l.membershipId;
    if (mid !== memberId) return false;
    const s = String(l.starts_on || l.startsOn || '').slice(0, 10);
    const e = String(l.ends_on || l.endsOn || s).slice(0, 10);
    return s && dateKey >= s && dateKey <= e;
  });

  const correctionsByEntryId = new Map();
  for (const pc of (punchCorrections || [])) {
    const eid = pc.entryId || pc.entry_id;
    if (eid) correctionsByEntryId.set(eid, pc);
  }

  const orgEntries = (timeEntries || []).filter(e =>
    (!e.organisationId || e.organisationId === orgId) &&
    String(e.clockedInAt || '').startsWith(targetMonth)
  );

  const derived = new Map();

  const registerException = ({
    exceptionKey,
    memberId,
    timeEntryId = null,
    scheduledShiftId = null,
    type,
    shiftDate,
    scheduledStart = null,
    scheduledEnd = null,
    actualTime = null,
    varianceMinutes = 0,
    defaultHours = 0,
    autoResolveStatus = null,
    autoReason = null
  }) => {
    const member = membersById.get(memberId) || {};
    const contract = contractsByMember.get(memberId) || contractsByMember.get(member.user_id);
    const hourlyRate = calculateHourlyRateFromContract(contract);
    const prev = existingByKey.get(exceptionKey);

    let status = prev?.status || autoResolveStatus || 'pending_review';
    let resolutionNote = prev?.resolutionNote || prev?.resolution_note || autoReason || null;
    const resolvedBy = prev?.resolvedByName || prev?.resolved_by_name || null;
    const resolvedAt = prev?.resolvedAt || prev?.resolved_at || null;
    const workerExplanation = prev?.workerExplanation || prev?.worker_explanation || null;
    const requestedTime = prev?.requestedTime || prev?.requested_time || null;

    // Respect policy overrides for initial automatic classification when still pending
    if (!prev) {
      if (type === 'LATE_ARRIVAL' && policy.lateArrivalDeductionMode === 'shift_score_only') {
        status = 'pardoned';
        resolutionNote = 'Shift score only policy — zero NGN wage deduction.';
      } else if (type === 'MISSED_CLOCK_IN' && policy.missedClockInAction === 'pardon_with_flag') {
        status = 'pardoned';
        resolutionNote = 'Org policy: Pardon missed clock-in with audit flag.';
      } else if (type === 'EARLY_DEPARTURE' && policy.earlyDepartureAction === 'pardon_with_flag') {
        status = 'pardoned';
        resolutionNote = 'Org policy: Pardon early departure with audit flag.';
      }
    }

    const impactedHoursRaw = Math.max(0, Math.round(defaultHours * 100) / 100);
    const isUnpaid = status === 'pending_review' || status === 'unexcused';
    const payImpactHours = isUnpaid ? impactedHoursRaw : 0;
    const pardonedHours = status === 'pardoned' || status === 'adjusted' ? impactedHoursRaw : 0;
    const payImpactAmount = Math.round(payImpactHours * hourlyRate);

    derived.set(exceptionKey, {
      id: prev?.id || exceptionKey,
      exceptionKey,
      organisationId: orgId,
      membershipId: memberId,
      userId: member.user_id || memberId,
      staffId: member.staff_code || member.staffId || contract?.staffId || '',
      workerName: member.full_name || member.name || contract?.userName || 'Frontline Staff',
      department: member.department || contract?.department || 'Operations',
      timeEntryId,
      scheduledShiftId,
      type,
      shiftDate,
      scheduledStart,
      scheduledEnd,
      actualTime,
      varianceMinutes: Math.max(0, Math.round(varianceMinutes)),
      status,
      rawImpactHours: impactedHoursRaw,
      payImpactHours,
      pardonedHours,
      payImpactAmount,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      workerExplanation,
      requestedTime,
      resolutionNote,
      resolvedBy,
      resolvedAt
    });
  };

  // 1. Scheduled shifts vs Time entries -> MISSED_CLOCK_IN & LATE_ARRIVAL
  const missingAtShiftStart = [];
  const orgShifts = (scheduledShifts || []).filter(s =>
    (!s.organisation_id && !s.organisationId) || s.organisation_id === orgId || s.organisationId === orgId
  );

  for (const shift of orgShifts) {
    const memberId = shift.membership_id || shift.membershipId;
    if (!memberId || !shift.starts_at) continue;
    const startMs = new Date(shift.starts_at).getTime();
    if (isNaN(startMs)) continue;
    const dateKey = getDateKeyInZone(startMs, timeZone);
    if (!dateKey.startsWith(targetMonth)) continue;
    if (hasApprovedLeaveOn(memberId, dateKey)) continue;

    const endMs = shift.ends_at ? new Date(shift.ends_at).getTime() : startMs + 8 * 3600000;
    const shiftHours = Math.max(1, Math.min(16, (endMs - startMs) / 3600000));
    const graceMs = policy.graceMinutes * 60000;

    // Match closest entry on same worker within +/- 4 hours of shift start
    const matchEntry = orgEntries.find(e =>
      (e.membershipId === memberId || e.userId === memberId) &&
      Math.abs(new Date(e.clockedInAt).getTime() - startMs) <= 4 * 3600000
    );

    if (!matchEntry) {
      if (nowMs > startMs + graceMs) {
        const member = membersById.get(memberId) || {};
        const exceptionKey = `MISSED_CLOCK_IN:${orgId}:${memberId}:${dateKey}:${shift.id || startMs}`;
        registerException({
          exceptionKey,
          memberId,
          scheduledShiftId: shift.id || null,
          type: 'MISSED_CLOCK_IN',
          shiftDate: dateKey,
          scheduledStart: shift.starts_at,
          scheduledEnd: shift.ends_at || new Date(endMs).toISOString(),
          actualTime: null,
          varianceMinutes: (nowMs - startMs) / 60000,
          defaultHours: shiftHours
        });
        if (nowMs <= endMs + 2 * 3600000) {
          const ex = derived.get(exceptionKey);
          if (ex && ex.status === 'pending_review') {
            missingAtShiftStart.push({
              exceptionId: ex.id,
              membershipId: memberId,
              staffId: ex.staffId,
              workerName: member.full_name || member.name || ex.workerName,
              department: ex.department,
              scheduledStart: shift.starts_at,
              minutesLate: Math.round((nowMs - startMs) / 60000)
            });
          }
        }
      }
    } else {
      const clockInMs = new Date(matchEntry.clockedInAt).getTime();
      const lateMin = (clockInMs - startMs) / 60000;
      if (lateMin > policy.graceMinutes) {
        const exceptionKey = `LATE_ARRIVAL:${matchEntry.id}`;
        const deductedHours = policy.lateArrivalDeductionMode === 'pro_rata_minutes'
          ? Math.min(shiftHours, (lateMin - policy.graceMinutes) / 60)
          : 0;
        registerException({
          exceptionKey,
          memberId,
          timeEntryId: matchEntry.id,
          scheduledShiftId: shift.id || null,
          type: 'LATE_ARRIVAL',
          shiftDate: dateKey,
          scheduledStart: shift.starts_at,
          scheduledEnd: shift.ends_at || new Date(endMs).toISOString(),
          actualTime: matchEntry.clockedInAt,
          varianceMinutes: lateMin,
          defaultHours: deductedHours
        });
      }
    }
  }

  // 2. Time entries -> MISSED_CLOCK_OUT, EARLY_DEPARTURE, UNVERIFIED_GEOFENCE
  for (const entry of orgEntries) {
    const memberId = entry.membershipId || entry.userId;
    if (!memberId) continue;
    const member = membersById.get(memberId) || {};
    const dateKey = getDateKeyInZone(entry.clockedInAt, timeZone);
    const inMs = new Date(entry.clockedInAt).getTime();
    const corr = correctionsByEntryId.get(entry.id);
    const windowCfg = getMemberShiftScheduleWindow(member);

    const matchedShift = orgShifts.find(s =>
      (s.membership_id || s.membershipId) === memberId &&
      Math.abs(new Date(s.starts_at).getTime() - inMs) <= 4 * 3600000
    );

    const expectedEndIso = matchedShift?.ends_at || parseClockTimeOnDate(entry.clockedInAt, windowCfg.endStr, timeZone, entry.clockedInAt);
    const expectedEndMs = expectedEndIso ? new Date(expectedEndIso).getTime() : inMs + 8 * 3600000;
    const expectedShiftHours = Math.max(1, Math.min(16, (expectedEndMs - inMs) / 3600000));

    // 2a. Open punch overdue or Auto Clock-Out awaiting presence review
    const isAutoUnconfirmed = entry.clockOutVerificationMode === 'auto_shift_end' && entry.presenceVerificationStatus === 'pending_supervisor_review';
    const isOverdueOpenPunch = !entry.clockedOutAt && nowMs > (expectedEndMs + policy.graceMinutes * 60000);

    if (isAutoUnconfirmed || isOverdueOpenPunch) {
      const exceptionKey = `MISSED_CLOCK_OUT:${entry.id}`;
      let autoResolveStatus = null;
      let autoReason = null;
      if (corr && corr.status === 'authorized') {
        autoResolveStatus = 'adjusted';
        autoReason = `Supervisor approved punch correction (${corr.requestedDepartureTime || corr.requestedClockOut || 'adjusted'})`;
      } else if (corr && corr.status === 'denied') {
        autoResolveStatus = 'unexcused';
        autoReason = 'Punch correction request denied by supervisor.';
      } else if (isOverdueOpenPunch && policy.missedClockOutAction === 'auto_cap_shift_end' && !isAutoUnconfirmed) {
        autoResolveStatus = 'pending_review';
      }
      registerException({
        exceptionKey,
        memberId,
        timeEntryId: entry.id,
        type: 'MISSED_CLOCK_OUT',
        shiftDate: dateKey,
        scheduledStart: matchedShift?.starts_at || entry.clockedInAt,
        scheduledEnd: expectedEndIso,
        actualTime: entry.clockedOutAt || null,
        varianceMinutes: Math.max(0, (nowMs - expectedEndMs) / 60000),
        defaultHours: isAutoUnconfirmed ? 8 : Math.min(8, expectedShiftHours),
        autoResolveStatus,
        autoReason
      });
    } else if (entry.clockedOutAt && entry.clockOutVerificationMode !== 'auto_shift_end') {
      const outMs = new Date(entry.clockedOutAt).getTime();
      const earlyMin = (expectedEndMs - outMs) / 60000;
      if (earlyMin > policy.graceMinutes && expectedEndMs - inMs >= 3600000) {
        const exceptionKey = `EARLY_DEPARTURE:${entry.id}`;
        registerException({
          exceptionKey,
          memberId,
          timeEntryId: entry.id,
          type: 'EARLY_DEPARTURE',
          shiftDate: dateKey,
          scheduledStart: matchedShift?.starts_at || entry.clockedInAt,
          scheduledEnd: expectedEndIso,
          actualTime: entry.clockedOutAt,
          varianceMinutes: earlyMin,
          defaultHours: policy.earlyDepartureAction === 'pro_rata_deduct' ? earlyMin / 60 : 0
        });
      }
    }

    // 2b. Unverified Geofence
    const geo = String(entry.geofenceStatus || '').toLowerCase();
    if (geo === 'out_of_perimeter' || geo === 'unverified_geofence' || entry.outsideGeofence === true) {
      registerException({
        exceptionKey: `UNVERIFIED_GEOFENCE:${entry.id}`,
        memberId,
        timeEntryId: entry.id,
        type: 'UNVERIFIED_GEOFENCE',
        shiftDate: dateKey,
        scheduledStart: matchedShift?.starts_at || entry.clockedInAt,
        scheduledEnd: expectedEndIso,
        actualTime: entry.clockedInAt,
        varianceMinutes: Number(entry.distanceMeters || 0),
        defaultHours: 0
      });
    }
  }

  // 3. Include any manually stored exceptions that aren't regenerated dynamically
  for (const prev of persistedExceptions) {
    if (!prev || (prev.organisationId && prev.organisationId !== orgId && prev.organisation_id !== orgId)) continue;
    const key = prev.exceptionKey || prev.exception_key || prev.id;
    const shiftDate = String(prev.shiftDate || prev.shift_date || '');
    if (shiftDate && !shiftDate.startsWith(targetMonth)) continue;
    if (key && !derived.has(key)) {
      derived.set(key, {
        ...prev,
        exceptionKey: key,
        organisationId: orgId
      });
    }
  }

  const exceptions = Array.from(derived.values()).sort((a, b) =>
    String(b.shiftDate || '').localeCompare(String(a.shiftDate || '')) ||
    String(b.actualTime || b.scheduledStart || '').localeCompare(String(a.actualTime || a.scheduledStart || ''))
  );

  const summary = {
    total: exceptions.length,
    pendingReview: exceptions.filter(e => e.status === 'pending_review').length,
    pardoned: exceptions.filter(e => e.status === 'pardoned').length,
    adjusted: exceptions.filter(e => e.status === 'adjusted').length,
    unexcused: exceptions.filter(e => e.status === 'unexcused').length,
    pardonedHours: Math.round(exceptions.reduce((acc, e) => acc + (e.pardonedHours || 0), 0) * 100) / 100,
    unexcusedDeductedHours: Math.round(exceptions.reduce((acc, e) => acc + (e.payImpactHours || 0), 0) * 100) / 100,
    totalDeductionNgn: Math.round(exceptions.reduce((acc, e) => acc + (e.payImpactAmount || 0), 0))
  };

  return {
    policy,
    month: targetMonth,
    exceptions,
    missingAtShiftStart,
    summary
  };
}

/**
 * Evaluate due Clock-In / Escalation / Clock-Out reminders for an organisation.
 * Pure & deterministic — caller handles idempotent dedupe via dedupeKey and dispatches notifications/SSE/emails.
 */
export function evaluateReminderStagesForOrg({
  org,
  members = [],
  scheduledShifts = [],
  timeEntries = [],
  leaveRequests = [],
  now = new Date()
}) {
  const orgId = org?.id;
  if (!orgId) return [];
  const timeZone = validateTimeZone(org.time_zone || 'Africa/Lagos');
  const policy = getEffectiveAttendancePolicy(org);
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  const membersById = new Map();
  const supervisors = [];
  for (const m of members) {
    if (m.organisation_id && m.organisation_id !== orgId) continue;
    const status = String(m.status || 'active').toLowerCase();
    if (status !== 'active') continue;
    const mid = m.id || m.membership_id;
    if (mid) membersById.set(mid, m);
    if (m.user_id) membersById.set(m.user_id, m);
    if (['supervisor', 'manager', 'owner', 'workforce_admin'].includes(m.role)) {
      supervisors.push(m);
    }
  }

  const orgEntries = (timeEntries || []).filter(e => !e.organisationId || e.organisationId === orgId);
  const orgLeave = (leaveRequests || []).filter(l =>
    (!l.organisation_id || l.organisation_id === orgId) &&
    String(l.status || '').toLowerCase() === 'approved'
  );

  const due = [];

  for (const shift of (scheduledShifts || [])) {
    if ((shift.organisation_id && shift.organisation_id !== orgId) || (shift.organisationId && shift.organisationId !== orgId)) continue;
    const memberId = shift.membership_id || shift.membershipId;
    if (!memberId || !shift.starts_at) continue;
    const member = membersById.get(memberId);
    if (!member) continue;

    const startMs = new Date(shift.starts_at).getTime();
    if (isNaN(startMs)) continue;
    const dateKey = getDateKeyInZone(startMs, timeZone);

    // Skip if worker has approved leave covering shift date
    const onLeave = orgLeave.some(l => {
      if ((l.membership_id || l.membershipId) !== memberId) return false;
      const s = String(l.starts_on || l.startsOn || '').slice(0, 10);
      const e = String(l.ends_on || l.endsOn || s).slice(0, 10);
      return s && dateKey >= s && dateKey <= e;
    });
    if (onLeave) continue;

    // Check if worker has already clocked in for this shift (+/- 4 hours)
    const entry = orgEntries.find(e =>
      (e.membershipId === memberId || e.userId === memberId) &&
      Math.abs(new Date(e.clockedInAt).getTime() - startMs) <= 4 * 3600000
    );

    const minsToStart = (startMs - nowMs) / 60000;
    const minsSinceStart = (nowMs - startMs) / 60000;

    if (!entry) {
      // Pre-shift & shift-start reminders (window +/- 4 minutes around target mark so 60s tick catches cleanly without firing stale past-day shifts)
      for (const offsetMin of policy.reminderScheduleMinutes) {
        if (minsToStart <= offsetMin && minsToStart >= offsetMin - 5) {
          const stage = offsetMin === 0 ? 'shift_start_0' : `pre_shift_${offsetMin}`;
          due.push({
            dedupeKey: `${shift.id || `${memberId}:${shift.starts_at}`}:${stage}`,
            organisationId: orgId,
            membershipId: memberId,
            userId: member.user_id || memberId,
            workerName: member.full_name || member.name || 'Team Member',
            workerEmail: member.email || null,
            scheduledShiftId: shift.id || null,
            shiftStartsAt: shift.starts_at,
            stage,
            audience: 'worker',
            urgency: offsetMin === 0 ? 'high' : 'normal',
            title: offsetMin === 0 ? 'Shift starting now — Clock In' : `Shift starts in ${offsetMin} minutes`,
            message: offsetMin === 0
              ? `Your shift has started (${org.hub_name || 'Main Hub'}). Please clock in now inside ShiftRelay OS.`
              : `Reminder: Your scheduled shift starts in ${offsetMin} minutes at ${org.hub_name || 'Main Hub'}.`,
            supervisors
          });
        }
      }

      // Post-grace Missed Clock-In Escalation (fires between grace+offset and end of shift window)
      const escMin = policy.graceMinutes + (policy.missedClockInEscalationOffsetMinutes || 5);
      const endMs = shift.ends_at ? new Date(shift.ends_at).getTime() : startMs + 8 * 3600000;
      if (minsSinceStart >= escMin && nowMs <= endMs) {
        due.push({
          dedupeKey: `${shift.id || `${memberId}:${shift.starts_at}`}:missed_clock_in_escalation`,
          organisationId: orgId,
          membershipId: memberId,
          userId: member.user_id || memberId,
          workerName: member.full_name || member.name || 'Team Member',
          workerEmail: member.email || null,
          scheduledShiftId: shift.id || null,
          shiftStartsAt: shift.starts_at,
          stage: 'missed_clock_in_escalation',
          audience: 'worker_and_supervisors',
          urgency: 'critical',
          title: 'Missed Clock-In Alert',
          message: `You are ${Math.round(minsSinceStart)}m past shift start (grace: ${policy.graceMinutes}m) and have not clocked in yet.`,
          supervisorMessage: `Attendance Alert: ${member.full_name || member.name || 'Worker'} has not clocked in (${Math.round(minsSinceStart)}m past start, grace ${policy.graceMinutes}m).`,
          supervisors
        });
      }
    }
  }

  // Open entries approaching or past scheduled shift end -> Clock-Out Reminder
  for (const entry of orgEntries) {
    if (entry.clockedOutAt) continue;
    const memberId = entry.membershipId || entry.userId;
    const member = membersById.get(memberId);
    if (!member) continue;
    const { endStr } = getMemberShiftScheduleWindow(member);
    const endIso = parseClockTimeOnDate(entry.clockedInAt, endStr, timeZone, entry.clockedInAt);
    if (!endIso) continue;
    const endMs = new Date(endIso).getTime();
    const minsToEnd = (endMs - nowMs) / 60000;
    const preOut = policy.preClockOutReminderMinutes ?? 10;
    if (minsToEnd <= preOut && minsToEnd >= -15) {
      const stage = minsToEnd >= 0 ? 'pre_clock_out' : 'overdue_clock_out';
      due.push({
        dedupeKey: `${entry.id}:${stage}`,
        organisationId: orgId,
        membershipId: memberId,
        userId: member.user_id || memberId,
        workerName: member.full_name || member.name || 'Team Member',
        workerEmail: member.email || null,
        scheduledShiftId: null,
        timeEntryId: entry.id,
        stage,
        audience: 'worker',
        urgency: stage === 'overdue_clock_out' ? 'high' : 'normal',
        title: stage === 'overdue_clock_out' ? 'Overdue Clock-Out Reminder' : 'Shift Ending Soon — Remember to Clock Out',
        message: stage === 'overdue_clock_out'
          ? 'Your shift window has ended. Please clock out now or complete your handover so your timesheet closes accurately.'
          : `Your shift ends in ${Math.max(1, Math.round(minsToEnd))} minutes. Complete checklists & clock out cleanly at shift end.`,
        supervisors
      });
    }
  }

  return due;
}
