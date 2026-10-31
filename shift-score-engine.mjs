/**
 * ShiftRelay — Explainable Shift Score Engine
 * ============================================
 * Calculates a transparent 0–100 shift quality score for each completed
 * time entry, with a named breakdown so workers always know exactly why
 * their score is what it is. Scores are used by payroll to apply performance
 * bonuses or attendance deductions where the employer has enabled them.
 *
 * Score dimensions (weights):
 *   Punctuality       30 pts  — clocked in within grace period of shift start
 *   Full Duration     25 pts  — clocked out at or after expected shift end
 *   Geofence/Gate     25 pts  — verified on-site (QR gate scan or GPS within perimeter)
 *   No Open Punch     10 pts  — clock-out recorded (no missed punch)
 *   Clean Record       10 pts  — no pending correction request on this entry
 *
 * @module shift-score-engine
 */

const GRACE_MINUTES = 5;          // late within 5 min → full punctuality score
const LATE_PENALTY_PER_MIN = 1;   // lose 1pt per extra minute late (floor 0)
const STANDARD_SHIFT_HOURS = 8;   // expected shift duration for full-duration score

/**
 * Calculate shift score for a single completed time entry.
 *
 * @param {object} entry          - time entry record from store.timeEntries
 * @param {object} [shift]        - scheduled shift { starts_at, ends_at } — optional
 * @param {object[]} [corrections]- punch corrections for this entry
 * @returns {{ score: number, grade: string, breakdown: object, explanation: string[] }}
 */
export function calculateShiftScore(entry, shift = null, corrections = []) {
  const breakdown = {};
  const explanation = [];

  // ── 1. Punctuality (30 pts) ─────────────────────────────────────────────────
  let punctuality = 30;
  if (shift && shift.starts_at) {
    const scheduledStart = new Date(shift.starts_at);
    const actualStart   = new Date(entry.clockedInAt);
    const lateMinutes   = Math.max(0, Math.floor((actualStart - scheduledStart) / 60000));
    if (lateMinutes <= GRACE_MINUTES) {
      explanation.push(`✅ Clocked in on time (${lateMinutes} min — within ${GRACE_MINUTES}-min grace)`);
    } else {
      const penalty = Math.min(30, lateMinutes * LATE_PENALTY_PER_MIN);
      punctuality = Math.max(0, 30 - penalty);
      explanation.push(`⚠️ Clocked in ${lateMinutes} min late — punctuality reduced by ${penalty} pts`);
    }
  } else {
    // No scheduled shift to compare against → award full punctuality
    explanation.push('✅ No scheduled start time — punctuality not penalised');
  }
  breakdown.punctuality = { score: punctuality, max: 30, label: 'Punctuality' };

  // ── 2. Full Duration (25 pts) ───────────────────────────────────────────────
  let duration = 25;
  const clockIn  = new Date(entry.clockedInAt);
  const clockOut = entry.clockedOutAt ? new Date(entry.clockedOutAt) : null;
  if (clockOut) {
    const hoursWorked = (clockOut - clockIn) / 3600000;
    const expectedHours = shift
      ? Math.max(1, (new Date(shift.ends_at) - new Date(shift.starts_at)) / 3600000)
      : STANDARD_SHIFT_HOURS;
    const shortfall = Math.max(0, expectedHours - hoursWorked);
    if (shortfall <= 0.25) {
      explanation.push(`✅ Full shift completed (${hoursWorked.toFixed(1)}h)`);
    } else {
      const penalty = Math.min(25, Math.round((shortfall / expectedHours) * 25));
      duration = Math.max(0, 25 - penalty);
      explanation.push(`⚠️ Left ${shortfall.toFixed(1)}h early — duration score reduced by ${penalty} pts`);
    }
  } else {
    // No clock-out → leave duration at 0 (handled by open-punch deduction too)
    duration = 0;
    explanation.push('❌ No clock-out recorded — duration score 0');
  }
  breakdown.duration = { score: duration, max: 25, label: 'Full Duration' };

  // ── 3. Geofence / Gate Verification (25 pts) ────────────────────────────────
  let geofence = 0;
  const geo = entry.geofenceStatus || 'unknown';
  if (geo === 'verified_on_site' || geo === 'within_geofence') {
    geofence = 25;
    const method = entry.verificationMode === 'gate_qr' ? 'Gate QR barcode scan' : 'GPS on-site';
    explanation.push(`✅ Verified on-site via ${method}`);
  } else if (geo === 'outside_geofence_flagged') {
    geofence = 10;
    explanation.push(`⚠️ Clock-in flagged outside approved perimeter — partial geofence score`);
  } else if (geo === 'unverified_gate') {
    geofence = 15;
    explanation.push(`⚠️ Gate QR scanned but company code mismatch — partial score`);
  } else {
    geofence = 18; // Standard workplace punch — trusted but not gate-verified
    explanation.push(`ℹ️ Standard workplace punch — not gate-verified (−7 pts vs QR scan)`);
  }
  breakdown.geofence = { score: geofence, max: 25, label: 'Gate / Geofence Verification' };

  // ── 4. No Open Punch (10 pts) ────────────────────────────────────────────────
  const openPunch = entry.clockedOutAt ? 10 : 0;
  if (!entry.clockedOutAt) explanation.push('❌ Open punch — no clock-out on record (−10 pts)');
  else explanation.push('✅ Clock-out recorded');
  breakdown.openPunch = { score: openPunch, max: 10, label: 'Clock-Out Recorded' };

  // ── 5. Clean Record (10 pts) ─────────────────────────────────────────────────
  const hasPendingCorrection = corrections.some(c => c.timeEntryId === entry.id && c.status === 'pending');
  const hasDeniedCorrection  = corrections.some(c => c.timeEntryId === entry.id && c.status === 'denied');
  let cleanRecord = 10;
  if (hasPendingCorrection) {
    cleanRecord = 5;
    explanation.push('⚠️ Punch correction request pending — partial clean-record score');
  } else if (hasDeniedCorrection) {
    cleanRecord = 0;
    explanation.push('❌ Punch correction denied — no clean-record score');
  } else {
    explanation.push('✅ No correction requests on this shift');
  }
  breakdown.cleanRecord = { score: cleanRecord, max: 10, label: 'Clean Record (No Corrections)' };

  // ── Final Score ──────────────────────────────────────────────────────────────
  const score = Math.min(100, punctuality + duration + geofence + openPunch + cleanRecord);
  const grade =
    score >= 90 ? 'A' :
    score >= 75 ? 'B' :
    score >= 60 ? 'C' :
    score >= 45 ? 'D' : 'F';

  return { score, grade, breakdown, explanation };
}

/**
 * Score all completed time entries for a given userId / membershipId.
 * Returns entries sorted newest first with their scores.
 *
 * @param {string} memberId
 * @param {object[]} timeEntries
 * @param {object[]} scheduledShifts
 * @param {object[]} punchCorrections
 * @returns {object[]}
 */
export function scoreWorkerEntries(memberId, timeEntries, scheduledShifts = [], punchCorrections = []) {
  const entries = (timeEntries || [])
    .filter(e => e.membershipId === memberId && e.clockedOutAt)
    .sort((a, b) => new Date(b.clockedInAt) - new Date(a.clockedInAt));

  return entries.map(entry => {
    // Match to closest scheduled shift that started within 2h of actual clock-in
    const clockIn = new Date(entry.clockedInAt);
    const shift = (scheduledShifts || []).find(s =>
      s.membershipId === memberId &&
      Math.abs(new Date(s.starts_at) - clockIn) < 7200000
    ) || null;
    const result = calculateShiftScore(entry, shift, punchCorrections);
    return {
      entryId: entry.id,
      membershipId: memberId,
      clockedInAt: entry.clockedInAt,
      clockedOutAt: entry.clockedOutAt,
      hoursWorked: entry.clockedOutAt
        ? Math.round(((new Date(entry.clockedOutAt) - new Date(entry.clockedInAt)) / 3600000) * 100) / 100
        : null,
      verificationMode: entry.verificationMode || 'standard',
      geofenceStatus:   entry.geofenceStatus || 'unknown',
      siteName:         entry.siteName || 'On-Site',
      ...result
    };
  });
}

/**
 * Calculate a monthly shift score summary for payroll integration.
 * Returns { avgScore, grade, totalShifts, attendedShifts, missedPunches,
 *           performanceBonus, attendanceDeduction }.
 *
 * @param {string} memberId
 * @param {object} store
 * @param {string} [month]  - ISO month prefix e.g. '2026-10'
 * @returns {object}
 */
export function monthlyScoreSummary(memberId, store, month) {
  const prefix = month || new Date().toISOString().slice(0, 7);
  const monthEntries = (store.timeEntries || []).filter(e =>
    e.membershipId === memberId &&
    e.clockedInAt.startsWith(prefix)
  );

  const scored = scoreWorkerEntries(
    memberId,
    monthEntries,
    store.scheduledShifts || [],
    store.punchCorrections || []
  );

  const missedPunches = (store.timeEntries || []).filter(e =>
    e.membershipId === memberId &&
    e.clockedInAt.startsWith(prefix) &&
    !e.clockedOutAt
  ).length;

  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, e) => s + e.score, 0) / scored.length)
    : 0;

  const grade =
    avgScore >= 90 ? 'A' :
    avgScore >= 75 ? 'B' :
    avgScore >= 60 ? 'C' :
    avgScore >= 45 ? 'D' : 'F';

  // Performance bonus: score >= 90 → +3% gross; score >= 75 → +1.5%
  const performanceBonusPct = avgScore >= 90 ? 0.03 : avgScore >= 75 ? 0.015 : 0;
  // Attendance deduction: each unresolved missed punch = 1 day deduction (÷22 working days)
  const attendanceDeductionDays = missedPunches;

  return {
    memberId,
    month: prefix,
    avgScore,
    grade,
    totalShifts: monthEntries.length,
    attendedShifts: scored.length,
    missedPunches,
    performanceBonusPct,
    attendanceDeductionDays,
    scoredShifts: scored
  };
}
