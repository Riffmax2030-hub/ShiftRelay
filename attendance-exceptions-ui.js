/**
 * ShiftRelay OS — Dayforce-Grade Attendance Exceptions, Policy Acceptance & Resolution UI
 * Shared helper module consumed across Worker, Supervisor, and Executive dashboards.
 */
(function () {
  'use strict';

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtNaira(val) {
    return '₦' + Number(val || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showMsg(msg, kind) {
    if (typeof window.Phase1Shell?.showToast === 'function') {
      window.Phase1Shell.showToast(msg, kind || 'info');
    } else if (typeof window.showToast === 'function') {
      window.showToast(msg, kind || 'info');
    }
  }

  function policySummaryLabels(policy) {
    const p = policy && typeof policy === 'object' ? policy : {};
    const grace = Number(p.graceMinutes ?? 10);
    const lateMap = {
      none_within_grace: `Within ${grace}m grace = ₦0 deduction (pardoned); beyond grace requires review`,
      pro_rata_minutes: 'Pro-rata hourly/minute deduction after grace expires',
      shift_score_only: 'Shift Score notice only (no direct salary deduction)'
    };
    const inMap = {
      exception_review: 'Escalate to Supervisor Exception Queue',
      pro_rata_deduct: 'Auto pro-rata deduction unless pardoned',
      pardon_with_flag: 'Auto-pardon with audit flag'
    };
    const outMap = {
      exception_review: 'Hold for Supervisor Exception Review',
      auto_cap_shift_end: 'Auto-cap at scheduled shift end (requires presence check)',
      pro_rata_deduct: 'Pro-rata deduction until corrected'
    };
    return {
      grace,
      lateText: lateMap[p.lateArrivalDeductionMode] || lateMap.none_within_grace,
      missedInText: inMap[p.missedClockInAction] || inMap.exception_review,
      missedOutText: outMap[p.missedClockOutAction] || outMap.exception_review,
      version: p.policyVersion || 'v1',
      reminders: Array.isArray(p.reminderScheduleMinutes) ? p.reminderScheduleMinutes : [30, 15, 0]
    };
  }

  async function fetchExceptions(month) {
    try {
      const qs = month ? `?month=${encodeURIComponent(month)}` : '';
      const res = await fetch('/api/attendance/exceptions' + qs);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  function renderPolicyAckBannerHtml(user) {
    if (!user || !user.policyRequiresAck) return '';
    const info = policySummaryLabels(user.attendancePolicy);
    return `
      <section class="sr-card" id="sr-policy-ack-banner" aria-label="Attendance Policy" style="margin-bottom:14px;padding:12px 16px;border-radius:12px;border:1px solid rgba(13,148,136,0.35);background:rgba(13,148,136,0.06);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:200px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.3" style="flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <div style="font-size:12.5px;color:var(--sr-text-main);">
              <strong>Attendance Policy (${info.grace}m Grace)</strong> &middot; <span style="color:var(--sr-text-secondary);">Arrivals within ${info.grace} minutes are excused automatically.</span>
            </div>
          </div>
          <button type="button" class="sr-btn sr-btn-primary" id="sr-btn-ack-attendance-policy" data-policy-version="${esc(info.version)}" style="min-height:34px;padding:0 14px;font-size:12px;font-weight:700;">
            Acknowledge
          </button>
        </div>
      </section>
    `;
  }

  function syncClientPolicyAckState(user, ackVersion, ackAt) {
    const patchObj = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      obj.policyRequiresAck = false;
      obj.policyAcknowledgedVersion = ackVersion;
      obj.policyAcknowledgedAt = ackAt;
      return obj;
    };
    patchObj(user);
    patchObj(window._srState?.user);
    patchObj(window.state?.user);
    patchObj(window._srActiveUser);
    for (const key of ['shiftrelay-user-data', 'shiftrelay-demo-persona', 'shiftrelay_user']) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        patchObj(parsed);
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch (_) {}
    }
  }

  function bindPolicyAckHandlers(rootEl, user, onAccepted) {
    const btn = (rootEl || document).querySelector('#sr-btn-ack-attendance-policy');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const version = String(btn.getAttribute('data-policy-version') || 'v1');
      try {
        const res = await fetch('/api/auth/acknowledge-policy', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policyVersion: version })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not acknowledge policy');
        syncClientPolicyAckState(
          user,
          data.policyAcknowledgedVersion || version,
          data.acknowledgedAt || new Date().toISOString()
        );
        document.getElementById('sr-policy-ack-banner')?.remove();
        showMsg('Attendance & Pay Policy acknowledged.', 'success');
        if (typeof onAccepted === 'function') onAccepted(data);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Acknowledge Policy';
        showMsg(err.message, 'error');
      }
    });
  }

  function typeLabel(t) {
    const map = {
      MISSED_CLOCK_IN: 'Missed Clock-In',
      LATE_ARRIVAL: 'Late Arrival',
      EARLY_DEPARTURE: 'Early Departure',
      MISSED_CLOCK_OUT: 'Missed Clock-Out',
      UNVERIFIED_GEOFENCE: 'Off-Site / Unverified Scan'
    };
    return map[t] || String(t || 'Exception').replace(/_/g, ' ');
  }

  function statusBadgeHtml(status) {
    const s = String(status || 'pending_review').toLowerCase();
    if (s === 'pardoned' || s === 'adjusted') {
      const label = s === 'pardoned' ? 'Pardoned / Excused' : 'Time Adjusted';
      return `<span style="display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(16,185,129,0.12);color:#059669;border:1px solid rgba(16,185,129,0.28);">${label}</span>`;
    }
    if (s === 'unexcused') {
      return '<span style="display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(239,68,68,0.12);color:#dc2626;border:1px solid rgba(239,68,68,0.28);">Unexcused (Deducted)</span>';
    }
    return '<span style="display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(245,158,11,0.14);color:#b45309;border:1px solid rgba(245,158,11,0.35);">Pending Review</span>';
  }

  function renderWorkerExceptionsHtml(excData) {
    if (!excData || !Array.isArray(excData.exceptions)) return '';
    const exceptions = excData.exceptions;
    const unresolved = exceptions.filter(e => e.status === 'pending_review').length;
    const rows = exceptions.length > 0 ? exceptions.map(ex => {
      const canExplain = ex.status === 'pending_review';
      const impactHrs = Number(ex.payImpactHours || ex.rawImpactHours || 0);
      return `
        <div class="sr-exc-row" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;background:var(--sr-bg-card-subtle);border:1px solid var(--sr-border-subtle);flex-wrap:wrap;" data-exc-id="${esc(ex.id)}">
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <strong style="font-size:13.5px;color:var(--sr-text-main);">${esc(typeLabel(ex.type))}</strong>
              ${statusBadgeHtml(ex.status)}
              <span style="font-size:11.5px;color:var(--sr-text-muted);">${esc(ex.shiftDate || '')}</span>
            </div>
            <div style="font-size:12px;color:var(--sr-text-secondary);line-height:1.45;">
              ${ex.varianceMinutes ? `Variance: <strong>${ex.varianceMinutes} min</strong> (${impactHrs}h)` : `Impact: <strong>${impactHrs}h</strong>`}
              ${ex.status === 'pardoned' ? ` &bull; <span style="color:#059669;font-weight:700;">Pardoned (${Number(ex.pardonedHours || 0)}h, ₦0 deduction)</span>` : ''}
              ${ex.status === 'unexcused' && ex.payImpactAmount ? ` &bull; <span style="color:#dc2626;font-weight:700;">-${fmtNaira(ex.payImpactAmount)}</span>` : ''}
            </div>
            ${ex.workerExplanation ? `<div style="margin-top:6px;padding:6px 10px;border-radius:7px;background:var(--sr-bg-card);border-left:3px solid #0d9488;font-size:11.5px;color:var(--sr-text-muted);">Your note: ${esc(ex.workerExplanation)}</div>` : ''}
            ${ex.resolutionNote ? `<div style="margin-top:5px;font-size:11.5px;color:var(--sr-text-muted);">Supervisor note: <strong>${esc(ex.resolutionNote)}</strong></div>` : ''}
          </div>
          <div>
            ${canExplain
              ? `<button type="button" class="sr-btn sr-btn-secondary sr-btn-worker-explain" data-exc-id="${esc(ex.id)}" data-exc-label="${esc(typeLabel(ex.type))} (${esc(ex.shiftDate || '')})" style="min-height:34px;padding:0 12px;font-size:12px;">Explain</button>`
              : ''}
          </div>
        </div>
      `;
    }).join('') : `
      <div style="padding:18px;text-align:center;color:var(--sr-text-muted);font-size:13px;">
        No attendance exceptions flagged. On-time attendance is 100% clear for payroll.
      </div>
    `;

    return `
      <div class="sr-cv-section" style="margin-bottom:16px;">
        <div class="sr-cv-section-header">
          <h3 class="sr-cv-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Attendance Exceptions
          </h3>
          <span style="font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:999px;${unresolved > 0 ? 'background:rgba(245,158,11,0.14);color:#b45309;' : 'background:rgba(16,185,129,0.12);color:#059669;'}">
            ${unresolved > 0 ? `${unresolved} Open` : 'All Clear'}
          </span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:12px 16px;">${rows}</div>
      </div>
    `;
  }

  function bindWorkerExceptionHandlers(rootEl, onUpdated) {
    (rootEl || document).querySelectorAll('.sr-btn-worker-explain').forEach(btn => {
      btn.addEventListener('click', () => {
        openWorkerExplainModal(btn.dataset.excId, btn.dataset.excLabel, onUpdated);
      });
    });
  }

  function openWorkerExplainModal(excId, label, onUpdated) {
    document.getElementById('sr-exc-explain-backdrop')?.remove();
    const el = document.createElement('div');
    el.id = 'sr-exc-explain-backdrop';
    el.className = 'sr-modal-backdrop';
    el.innerHTML = `
      <div class="sr-modal" style="max-width:440px;" role="dialog" aria-modal="true" aria-labelledby="sr-exc-explain-title">
        <div class="sr-modal-header">
          <h3 id="sr-exc-explain-title" style="margin:0;font-size:16px;font-weight:700;">Explain Attendance Exception</h3>
          <button type="button" class="sr-btn-close" id="sr-exc-explain-close">&times;</button>
        </div>
        <form id="sr-exc-explain-form" class="sr-modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:12.5px;color:var(--sr-text-muted);">${esc(label || 'Attendance exception')}</div>
          <div class="sr-form-group">
            <label class="sr-form-label" for="sr-exc-explain-time">Actual Arrival / Departure Time (optional)</label>
            <input type="time" id="sr-exc-explain-time" class="sr-form-input" />
          </div>
          <div class="sr-form-group">
            <label class="sr-form-label" for="sr-exc-explain-note">Reason / Context for Supervisor</label>
            <textarea id="sr-exc-explain-note" class="sr-form-input" rows="3" required placeholder="e.g. Gate traffic holdup, power outage, or relief colleague arrived late"></textarea>
          </div>
          <div id="sr-exc-explain-err" style="display:none;color:#ef4444;font-size:12.5px;"></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="sr-btn sr-btn-secondary" id="sr-exc-explain-cancel">Cancel</button>
            <button type="submit" class="sr-btn sr-btn-primary" id="sr-exc-explain-submit">Submit Explanation</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#sr-exc-explain-close')?.addEventListener('click', () => el.remove());
    el.querySelector('#sr-exc-explain-cancel')?.addEventListener('click', () => el.remove());
    el.querySelector('#sr-exc-explain-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const explanation = document.getElementById('sr-exc-explain-note')?.value?.trim() || '';
      const requestedTime = document.getElementById('sr-exc-explain-time')?.value || undefined;
      const errEl = document.getElementById('sr-exc-explain-err');
      const submitBtn = document.getElementById('sr-exc-explain-submit');
      if (!explanation) {
        if (errEl) { errEl.textContent = 'Please provide an explanation.'; errEl.style.display = 'block'; }
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      try {
        const res = await fetch(`/api/attendance/exceptions/${encodeURIComponent(excId)}/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ explanation, requestedTime })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        el.remove();
        showMsg('Explanation sent to your supervisor.', 'success');
        if (typeof onUpdated === 'function') await onUpdated();
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Explanation'; }
      }
    });
  }

  function fmtShortClock(iso) {
    if (!iso) return '--:--';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderSupervisorMissingHtml(excData) {
    if (!excData) return '';
    const missing = Array.isArray(excData.missingAtShiftStart) ? excData.missingAtShiftStart : [];
    const summary = excData.summary || {};
    const graceMin = Number(excData.policy?.graceMinutes ?? 10);
    const openExceptions = (excData.exceptions || []).filter(e => e.status === 'pending_review');
    return `
      <section class="sr-card" id="sr-sup-missing-muster-card" aria-label="Missing at Shift Start and Attendance Exceptions" style="border-top: 3px solid ${missing.length > 0 || openExceptions.length > 0 ? '#f59e0b' : '#10b981'};margin-bottom:14px;">
        <div class="sr-card-title-row" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin:0;font-size:15.5px;">Attendance Watch</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--sr-text-muted);">${graceMin}m grace window</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="sr-badge-certified" style="${openExceptions.length > 0 ? 'background:rgba(245,158,11,0.14);color:#b45309;border-color:rgba(245,158,11,0.35);' : ''}">
              ${openExceptions.length} Open
            </span>
            <button type="button" class="sr-btn sr-btn-secondary" id="sr-btn-run-reminder-watchdog" style="padding:4px 10px;min-height:28px;font-size:11.5px;">Send Reminders</button>
          </div>
        </div>
        ${missing.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
            ${missing.map(m => `
              <div class="sr-review-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(245,158,11,0.06);border-radius:10px;border:1px solid rgba(245,158,11,0.28);flex-wrap:wrap;gap:10px;">
                <div>
                  <strong style="font-size:13px;color:var(--sr-text-main);">${esc(m.workerName)} (${esc(m.staffId || '')})</strong>
                  <div style="font-size:11.5px;color:#b45309;font-weight:600;">Missing at Shift Start &bull; Scheduled ${esc(fmtShortClock(m.scheduledStart))} (${m.minutesLate || 0}m overdue)</div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                  ${m.whatsappNudgeUrl ? `
                    <a href="${esc(m.whatsappNudgeUrl)}" target="_blank" rel="noopener noreferrer" class="sr-btn sr-btn-secondary" style="padding:4px 10px;min-height:30px;font-size:11.5px;text-decoration:none;border-color:rgba(16,185,129,0.4);color:#059669;display:inline-flex;align-items:center;gap:5px;">Nudge Worker on WhatsApp</a>
                  ` : ''}
                  ${m.exceptionId ? `
                    <button type="button" class="sr-btn sr-btn-primary sr-btn-resolve-exc" data-exc-id="${esc(m.exceptionId)}" data-exc-action="pardon" data-exc-name="${esc(m.workerName)}" style="padding:4px 10px;min-height:30px;font-size:11.5px;">Pardon</button>
                    <button type="button" class="sr-btn sr-btn-secondary sr-btn-resolve-exc" data-exc-id="${esc(m.exceptionId)}" data-exc-action="adjust" data-exc-name="${esc(m.workerName)}" style="padding:4px 10px;min-height:30px;font-size:11.5px;">Adjust</button>
                    <button type="button" class="sr-btn sr-btn-secondary sr-btn-resolve-exc" data-exc-id="${esc(m.exceptionId)}" data-exc-action="unexcused" data-exc-name="${esc(m.workerName)}" style="padding:4px 10px;min-height:30px;font-size:11.5px;color:#dc2626;border-color:rgba(239,68,68,0.35);">Unexcused</button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="margin-top:10px;padding:10px 14px;border-radius:8px;background:rgba(16,185,129,0.08);font-size:12px;color:#059669;font-weight:600;">
            Zero missing workers past shift grace window right now.
          </div>
        `}
      </section>
    `;
  }

  function renderManagerExceptionsHtml(excData) {
    if (!excData || !Array.isArray(excData.exceptions)) return '';
    const exceptions = excData.exceptions;
    const openCount = exceptions.filter(e => e.status === 'pending_review').length;
    const listHtml = exceptions.length > 0 ? exceptions.map(ex => `
      <div style="padding:14px 0;border-bottom:1px solid var(--sr-border-subtle);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;" data-mgr-exc-id="${esc(ex.id)}">
        <div style="flex:1;min-width:220px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <strong style="font-size:14px;color:var(--sr-text-main);">${esc(ex.workerName || ex.staffId || 'Worker')}</strong>
            <span style="font-size:12px;color:var(--sr-text-muted);">${esc(ex.staffId || '')}</span>
            ${statusBadgeHtml(ex.status)}
          </div>
          <div style="font-size:12.5px;color:var(--sr-text-secondary);">
            <strong>${esc(typeLabel(ex.type))}</strong> &middot; ${esc(ex.shiftDate || '')}
            ${ex.varianceMinutes ? ` &middot; ${ex.varianceMinutes}m (${ex.rawImpactHours || ex.payImpactHours || 0}h)` : ''}
          </div>
          ${ex.workerExplanation ? `<div style="margin-top:6px;padding:6px 10px;border-radius:7px;background:var(--sr-bg-elevated);border-left:3px solid var(--sr-primary);font-size:12px;color:var(--sr-text-muted);">Worker explanation: ${esc(ex.workerExplanation)}${ex.requestedTime ? ` (Requested: ${esc(ex.requestedTime)})` : ''}</div>` : ''}
          ${ex.resolutionNote ? `<div style="margin-top:5px;font-size:12px;color:var(--sr-text-muted);">Resolution: <strong>${esc(ex.resolutionNote)}</strong>${(ex.resolvedByName || ex.resolvedBy) ? ` (${esc(ex.resolvedByName || ex.resolvedBy)})` : ''}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          ${ex.status === 'pending_review' && ex.whatsappNudgeUrl ? `
            <a href="${esc(ex.whatsappNudgeUrl)}" target="_blank" rel="noopener noreferrer" class="sr-btn sr-btn-secondary" style="padding:6px 10px;font-size:12px;text-decoration:none;border-color:rgba(16,185,129,0.4);color:#059669;">WhatsApp Nudge</a>
          ` : ''}
          ${ex.status === 'pending_review' ? `
            <button type="button" class="sr-btn sr-btn-primary sr-btn-resolve-exc" data-exc-id="${esc(ex.id)}" data-exc-action="pardon" data-exc-name="${esc(ex.workerName || '')}" style="padding:6px 12px;font-size:12px;">Pardon</button>
            <button type="button" class="sr-btn sr-btn-secondary sr-btn-resolve-exc" data-exc-id="${esc(ex.id)}" data-exc-action="adjust" data-exc-name="${esc(ex.workerName || '')}" style="padding:6px 12px;font-size:12px;">Adjust Time</button>
            <button type="button" class="sr-btn sr-btn-danger sr-btn-resolve-exc" data-exc-id="${esc(ex.id)}" data-exc-action="unexcused" data-exc-name="${esc(ex.workerName || '')}" style="padding:6px 12px;font-size:12px;">Unexcused</button>
          ` : ''}
        </div>
      </div>
    `).join('') : '<p style="text-align:center;color:var(--sr-text-muted);font-size:13.5px;padding:24px 0;">No attendance exceptions in queue.</p>';

    return `
      <div class="sr-cv-section" style="margin-bottom:18px;">
        <div class="sr-cv-section-header">
          <h3 class="sr-cv-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Attendance Exceptions Queue
          </h3>
          <span style="padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:700;${openCount > 0 ? 'background:rgba(245,158,11,0.14);color:#b45309;' : 'background:rgba(16,185,129,0.12);color:#059669;'}">${openCount} Open</span>
        </div>
        <div style="padding:0 16px;">${listHtml}</div>
      </div>
    `;
  }

  function openSupervisorResolveModal(excId, decision, workerName, onUpdated) {
    document.getElementById('sr-exc-resolve-backdrop')?.remove();
    const titleMap = {
      pardon: 'Pardon / Excuse Exception',
      adjust: 'Adjust Verified Punch Time',
      unexcused: 'Confirm Unexcused Absence / Deduction'
    };
    const isAdjust = decision === 'adjust';
    const el = document.createElement('div');
    el.id = 'sr-exc-resolve-backdrop';
    el.className = 'sr-modal-backdrop';
    el.innerHTML = `
      <div class="sr-modal" style="max-width:440px;" role="dialog" aria-modal="true" aria-labelledby="sr-exc-resolve-title">
        <div class="sr-modal-header">
          <h3 id="sr-exc-resolve-title" style="margin:0;font-size:16px;font-weight:700;">${esc(titleMap[decision] || 'Resolve Exception')}</h3>
          <button type="button" class="sr-btn-close" id="sr-exc-res-close">&times;</button>
        </div>
        <form id="sr-exc-res-form" class="sr-modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:13px;color:var(--sr-text-muted);">Staff: <strong style="color:var(--sr-text-main);">${esc(workerName || 'Employee')}</strong></div>
          ${isAdjust ? `
            <div class="sr-form-group">
              <label class="sr-form-label" for="sr-exc-res-time">Verified Punch Time (24h)</label>
              <input type="time" id="sr-exc-res-time" class="sr-form-input" required />
            </div>
          ` : ''}
          <div class="sr-form-group">
            <label class="sr-form-label" for="sr-exc-res-reason">Reason</label>
            <textarea id="sr-exc-res-reason" class="sr-form-input" rows="3" required placeholder="Brief note (e.g. Approved gate delay)"></textarea>
          </div>
          <div id="sr-exc-res-err" style="display:none;color:#ef4444;font-size:12.5px;"></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="sr-btn sr-btn-secondary" id="sr-exc-res-cancel">Cancel</button>
            <button type="submit" class="sr-btn ${decision === 'unexcused' ? 'sr-btn-danger' : 'sr-btn-primary'}" id="sr-exc-res-submit">Confirm Decision</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#sr-exc-res-close')?.addEventListener('click', () => el.remove());
    el.querySelector('#sr-exc-res-cancel')?.addEventListener('click', () => el.remove());
    el.querySelector('#sr-exc-res-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reason = document.getElementById('sr-exc-res-reason')?.value?.trim() || '';
      const adjustedTime = isAdjust ? (document.getElementById('sr-exc-res-time')?.value || '') : undefined;
      const errEl = document.getElementById('sr-exc-res-err');
      const submitBtn = document.getElementById('sr-exc-res-submit');
      if (!reason) {
        if (errEl) { errEl.textContent = 'Mandatory audit reason is required.'; errEl.style.display = 'block'; }
        return;
      }
      if (isAdjust && !adjustedTime) {
        if (errEl) { errEl.textContent = 'Please select a verified punch time.'; errEl.style.display = 'block'; }
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }
      try {
        const res = await fetch(`/api/attendance/exceptions/${encodeURIComponent(excId)}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, reason, adjustedTime })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        el.remove();
        showMsg(`Exception marked as ${decision}. Audit trail recorded.`, 'success');
        if (typeof onUpdated === 'function') await onUpdated();
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm Decision'; }
      }
    });
  }

  function bindSupervisorExceptionHandlers(rootEl, onUpdated) {
    const scope = rootEl || document;
    scope.querySelectorAll('.sr-btn-resolve-exc').forEach(btn => {
      btn.addEventListener('click', () => {
        openSupervisorResolveModal(btn.dataset.excId, btn.dataset.excAction, btn.dataset.excName, onUpdated);
      });
    });
    const watchdogBtn = scope.querySelector('#sr-btn-run-reminder-watchdog');
    if (watchdogBtn) {
      watchdogBtn.addEventListener('click', async () => {
        watchdogBtn.disabled = true;
        watchdogBtn.textContent = 'Running...';
        try {
          const res = await fetch('/api/reminders/run-watchdog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Reminder watchdog failed');
          const sentCount = Number(data.dispatchedCount ?? data.count ?? (Array.isArray(data.dispatched) ? data.dispatched.length : 0));
          showMsg(`Shift reminder check completed (${sentCount} dispatched).`, 'success');
          if (typeof onUpdated === 'function') await onUpdated();
        } catch (err) {
          showMsg(err.message, 'error');
          watchdogBtn.disabled = false;
          watchdogBtn.textContent = 'Run Muster Reminders';
        }
      });
    }
  }

  function openPunchCorrectionModal(entryId, onUpdated) {
    document.getElementById('sr-punch-modal-backdrop')?.remove();
    const modalEl = document.createElement('div');
    modalEl.id = 'sr-punch-modal-backdrop';
    modalEl.className = 'sr-modal-backdrop';
    modalEl.innerHTML = `
      <div class="sr-modal" style="max-width:440px;" role="dialog" aria-modal="true" aria-labelledby="sr-punch-modal-title">
        <div class="sr-modal-header">
          <h3 id="sr-punch-modal-title" style="margin:0;font-size:16px;font-weight:700;">Resolve Missed Clock-Out</h3>
          <button type="button" class="sr-btn-close" id="sr-punch-close">&times;</button>
        </div>
        <form id="sr-punch-form" class="sr-modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <p style="font-size:13px;color:var(--sr-text-muted);margin:0;line-height:1.5;">
            Enter your actual departure time. Your supervisor will review and authorize the correction.
          </p>
          <div class="sr-form-group">
            <label class="sr-form-label" for="sr-punch-time">Actual Departure Time</label>
            <input type="time" id="sr-punch-time" class="sr-form-input" required />
          </div>
          <div class="sr-form-group">
            <label class="sr-form-label" for="sr-punch-reason">Brief Reason</label>
            <textarea id="sr-punch-reason" class="sr-form-input" rows="3" placeholder="e.g. Forgot to clock out at end of shift" style="resize:vertical;"></textarea>
          </div>
          <div id="sr-punch-err" style="display:none;color:#ef4444;font-size:13px;"></div>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="sr-btn sr-btn-secondary" id="sr-punch-cancel">Cancel</button>
            <button type="submit" class="sr-btn sr-btn-primary" id="sr-punch-submit">Submit Correction</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modalEl);
    modalEl.querySelector('#sr-punch-close')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#sr-punch-cancel')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#sr-punch-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const timeVal = document.getElementById('sr-punch-time')?.value;
      const reason = document.getElementById('sr-punch-reason')?.value?.trim() || '';
      const errEl = document.getElementById('sr-punch-err');
      const submitBtn = document.getElementById('sr-punch-submit');
      if (!timeVal) {
        if (errEl) { errEl.textContent = 'Please enter a departure time.'; errEl.style.display = 'block'; }
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      try {
        const res = await fetch('/api/timesheets/punch-correction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeEntryId: entryId, requestedClockOut: timeVal, reason })
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || `Error ${res.status}`);
        modalEl.remove();
        showMsg('Correction submitted. Your supervisor will review it.', 'success');
        if (typeof onUpdated === 'function') await onUpdated();
      } catch (err) {
        if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Correction'; }
      }
    });
  }

  window.ShiftRelayAttendanceUI = {
    fetchExceptions,
    policySummaryLabels,
    renderPolicyAckBannerHtml,
    bindPolicyAckHandlers,
    renderWorkerExceptionsHtml,
    bindWorkerExceptionHandlers,
    renderSupervisorMissingHtml,
    renderManagerExceptionsHtml,
    bindSupervisorExceptionHandlers,
    openPunchCorrectionModal
  };
})();
