/**
 * ShiftRelay Smart Offline Queue (Basement & Cold-Storage Resilience)
 * Automatically buffers handovers, comments, shift swaps and reactions
 * when frontline workers enter offline areas (walk-in freezers, elevators, basements)
 * and safely synchronizes all records once connectivity returns.
 */

(function () {
  const QUEUE_STORAGE_KEY = 'shiftrelay_offline_queue';
  let isOnline = navigator.onLine;
  let queue = loadQueue();

  function loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Could not persist offline queue:', err);
    }
  }

  // ── Render Top Offline Indicator Pill ─────────────────────────────────────────
  function ensureIndicator() {
    let indicator = document.getElementById('sr-offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'sr-offline-indicator';
      indicator.className = 'sr-offline-pill hidden';
      document.body.appendChild(indicator);
    }
    return indicator;
  }

  function updatePill(statusText, type = 'offline') {
    const indicator = ensureIndicator();
    if (!statusText) {
      indicator.classList.add('hidden');
      return;
    }

    indicator.className = `sr-offline-pill pill-${type}`;
    const icon = type === 'offline' 
      ? (window.Icons?.wifiOff ? window.Icons.wifiOff(14) : '') 
      : (window.Icons?.check ? window.Icons.check(14) : '');

    const countBadge = queue.length > 0 ? `<span class="pill-queue-count">${queue.length}</span>` : '';

    indicator.innerHTML = `
      <div class="pill-inner">
        <span class="pill-icon">${icon}</span>
        <span class="pill-text">${statusText}</span>
        ${countBadge}
      </div>
    `;
    indicator.classList.remove('hidden');
  }

  // ── Queue Management ──────────────────────────────────────────────────────────
  function enqueue(url, options = {}) {
    const item = {
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
      timestamp: new Date().toISOString()
    };
    queue.push(item);
    saveQueue();
    updatePill(`Offline Mode · ${queue.length} update${queue.length > 1 ? 's' : ''} queued`, 'offline');
    window.SoundEngine?.play('pop');
    return item;
  }

  async function flushQueue() {
    if (!queue.length || !isOnline) return;
    updatePill(`Reconnected · Syncing ${queue.length} update${queue.length > 1 ? 's' : ''}…`, 'syncing');

    const itemsToProcess = [...queue];
    let successfulCount = 0;

    for (const item of itemsToProcess) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });

        if (response.ok || response.status === 409) {
          queue = queue.filter(q => q.id !== item.id);
          saveQueue();
          successfulCount++;
        }
      } catch (err) {
        console.warn('Queue flush retry failed for item', item.id, err);
        break; // Stop and retry later if network failed again
      }
    }

    if (successfulCount > 0) {
      window.SoundEngine?.play('success');
      updatePill(`Sync complete · ${successfulCount} record${successfulCount > 1 ? 's' : ''} synchronized`, 'success');
      setTimeout(() => {
        if (queue.length === 0) updatePill(null);
      }, 3000);
    } else if (queue.length === 0) {
      updatePill(null);
    }
  }

  // ── Network Listeners ─────────────────────────────────────────────────────────
  window.addEventListener('online', () => {
    isOnline = true;
    flushQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    updatePill(`Offline Mode (Basement / Cold-Storage)`, 'offline');
  });

  // Periodic network heartbeat check
  setInterval(async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/config', { method: 'GET', signal: controller.signal });
      clearTimeout(id);
      if (res.ok && !isOnline) {
        isOnline = true;
        flushQueue();
      }
    } catch {
      if (isOnline) {
        isOnline = false;
        if (queue.length > 0) {
          updatePill(`Offline Mode · ${queue.length} queued`, 'offline');
        }
      }
    }
  }, 25000);

  // ── Monkeypatch Global api() with Offline Fallback ────────────────────────────
  function installOfflineInterceptor() {
    const originalApi = window.api;
    if (typeof originalApi !== 'function') {
      setTimeout(installOfflineInterceptor, 150);
      return;
    }

    window.api = async function (path, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      if (!isOnline && method !== 'GET') {
        enqueue(path, options);
        // Optimistic simulated response for common actions
        if (path.includes('/like')) {
          return { success: true, queued: true };
        } else if (path.includes('/comment')) {
          const parsed = options.body ? JSON.parse(options.body) : {};
          return {
            queued: true,
            comment: {
              content: parsed.content || '',
              author_name: window.state?.user?.name || 'You (Offline)',
              created_at: new Date().toISOString()
            }
          };
        } else if (path.includes('/handovers')) {
          return { success: true, queued: true, message: 'Saved to local queue. Will sync when back online.' };
        }
        return { success: true, queued: true };
      }

      try {
        return await originalApi(path, options);
      } catch (err) {
        // If network failed and it's a mutating action, queue it!
        if (method !== 'GET' && (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || !navigator.onLine)) {
          isOnline = false;
          enqueue(path, options);
          return { success: true, queued: true };
        }
        throw err;
      }
    };
  }

  installOfflineInterceptor();

  window.OfflineQueue = {
    isOnline: () => isOnline,
    enqueue,
    flushQueue,
    getPendingCount: () => queue.length
  };

  // If there are leftover queued items on boot, attempt sync
  if (queue.length > 0 && navigator.onLine) {
    setTimeout(flushQueue, 2000);
  }
})();
