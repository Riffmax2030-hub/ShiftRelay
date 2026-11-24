let teamEventStream;

function resolveRealtimeEventsUrl(userId) {
  const path = `/api/events?user=${encodeURIComponent(userId)}`;
  try {
    const bridge = window.ShiftRelayMobile;
    if (bridge && typeof bridge.isNative === 'function' && bridge.isNative() && typeof bridge.getBackendBase === 'function') {
      const base = String(bridge.getBackendBase() || '').replace(/\/+$/, '');
      if (base) return `${base}${path}`;
    }
  } catch {}
  return path;
}

function connectTeamRealtime() {
  if (!state.user || teamEventStream) return;
  const streamUrl = resolveRealtimeEventsUrl(state.user.id);
  const stream = new EventSource(streamUrl, { withCredentials: true });
  teamEventStream = stream;

  stream.onopen = () => {
    window.refreshShellNotifications?.();
  };

  stream.addEventListener('notification-added', () => {
    if (typeof refreshNotifications === 'function') refreshNotifications();
    window.refreshShellNotifications?.();
  });

  stream.addEventListener('shift-assigned', () => {
    window.refreshShellNotifications?.();
    if (typeof refreshNotifications === 'function') refreshNotifications();
    const activeView = window.Phase1Shell?.getActiveView?.();
    if (activeView === 'schedule') {
      window.Phase1Shell?.mount?.('schedule');
    }
  });

  stream.addEventListener('ewa-payout-requested', () => {
    window.refreshShellNotifications?.();
    if (typeof refreshNotifications === 'function') refreshNotifications();
  });

  stream.addEventListener('shift-reminder', (e) => {
    try {
      const payload = JSON.parse(e.data || '{}');
      const title = payload.title || payload.label || 'ShiftRelay Reminder';
      const body = payload.body || payload.message || 'Check your upcoming shift clock-in status.';
      const tag = 'sr-shift-reminder-' + (payload.scheduledShiftId || payload.stage || 'live');
      window.ShiftRelayPush?.showSystemNotification?.(title, { body, tag });
      if (window.ShiftRelayMobile?.isNative?.()) {
        window.ShiftRelayMobile.scheduleLocalReminder?.({
          id: `${payload.scheduledShiftId || 'shift'}-${payload.stage || 'live'}`,
          title,
          body,
          scheduleAt: new Date(Date.now() + 1200).toISOString()
        });
      }
      const isUrgent = payload.stage === 'missed_clock_in' || payload.stage === 'missed_clock_out' || payload.urgency === 'high';
      window.Phase1Shell?.showToast?.(body, isUrgent ? 'warning' : 'info');
      window.refreshShellNotifications?.();
    } catch {}
  });
  stream.addEventListener('missing-at-shift-start', (e) => {
    try {
      const payload = JSON.parse(e.data || '{}');
      const workerName = payload.workerName || 'A scheduled worker';
      const title = 'Missing Clock-In Alert';
      const body = `${workerName} has not clocked in past the grace period.`;
      window.ShiftRelayPush?.showSystemNotification?.(title, {
        body,
        tag: 'sr-missing-' + (payload.scheduledShiftId || payload.membershipId || 'live')
      });
      window.Phase1Shell?.showToast?.(body, 'warning');
      window.refreshShellNotifications?.();
    } catch {}
  });

  stream.addEventListener('team-message', () => {
    if ($('#page-title')?.textContent === 'Team') renderCommunity();
    refreshNotifications();
  });

  stream.addEventListener('private-message', () => {
    if ($('#page-title')?.textContent === 'Team') renderCommunity();
    refreshNotifications();
  });

  stream.addEventListener('handover-submitted', () => {
    if ($('#page-title')?.textContent === 'Dashboard') renderDashboard();
    refreshNotifications();
  });

  stream.addEventListener('handover-updated', () => {
    if ($('#page-title')?.textContent === 'Dashboard') renderDashboard();
  });

  stream.addEventListener('feed-post-added', () => {
    if (document.getElementById('lounge-feed-stream') && typeof loadFeedPosts === 'function') {
      loadFeedPosts(true);
    }
  });

  stream.addEventListener('feed-post-deleted', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data?.postId) document.getElementById(`post-${data.postId}`)?.remove();
    } catch {}
  });

  stream.addEventListener('schedule-updated', () => {
    if ($('#page-title')?.textContent === 'Calendar' && typeof renderCalendar === 'function') {
      renderCalendar();
    }
  });

  stream.addEventListener('emergency-broadcast', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof window.triggerEmergencyBroadcast === 'function') {
        window.triggerEmergencyBroadcast(data);
      }
    } catch {}
  });

  stream.onerror = () => {
    stream.close();
    teamEventStream = null;
    setTimeout(connectTeamRealtime, 8000);
  };
}

window.connectTeamRealtime = connectTeamRealtime;
document.addEventListener('DOMContentLoaded', connectTeamRealtime);
