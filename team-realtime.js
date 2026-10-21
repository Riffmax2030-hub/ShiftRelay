let teamEventStream;

function connectTeamRealtime() {
  if (!state.user || teamEventStream) return;
  const stream = new EventSource(`/api/events?user=${encodeURIComponent(state.user.id)}`);
  teamEventStream = stream;

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
