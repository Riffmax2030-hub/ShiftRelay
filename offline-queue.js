/**
 * ShiftRelay Smart Offline Queue (Basement & Cold-Storage Resilience)
 * Automatically buffers handovers, comments, shift swaps and reactions
 * when frontline workers enter offline areas (walk-in freezers, elevators, basements)
 * and safely synchronizes all records once connectivity returns.
 *
 * Hardened for Shared Devices (Batch 3):
 * - Binds all queued records strictly to the active user ID and organisation ID.
 * - Prevents cross-identity replay (never replays an item under another account).
 * - Safe warning/resolution flow upon logout without silently discarding unsent work.
 */

(function () {
  const QUEUE_STORAGE_PREFIX = 'shiftrelay_offline_queue';
  let isOnline = navigator.onLine;

  function getActiveUserScope() {
    const user = window._srState?.user || window.state?.user || (function() {
      try { return JSON.parse(localStorage.getItem('shiftrelay-user-data') || '{}'); } catch (_) { return null; }
    })();
    const userId = user?.id || user?.user_id || 'anon';
    const orgId = user?.organisation_id || user?.organisationId || 'anon';
    return { userId, orgId, key: `${QUEUE_STORAGE_PREFIX}_${userId}_${orgId}` };
  }

  function loadQueue() {
    const { key } = getActiveUserScope();
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function saveQueue(items) {
    const { key } = getActiveUserScope();
    try {
      if (!items || items.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(items));
      }
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

    const currentQueue = loadQueue();
    const countBadge = currentQueue.length > 0 ? `<span class="pill-queue-count">${currentQueue.length}</span>` : '';

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
    const { userId, orgId } = getActiveUserScope();
    const currentQueue = loadQueue();
    const item = {
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
      timestamp: new Date().toISOString(),
      userId,
      organisationId: orgId
    };
    currentQueue.push(item);
    saveQueue(currentQueue);
    updatePill(`Offline Mode · ${currentQueue.length} update${currentQueue.length > 1 ? 's' : ''} queued`, 'offline');
    window.SoundEngine?.play?.('pop');
    return item;
  }

  async function flushQueue() {
    const { userId, orgId } = getActiveUserScope();
    if (userId === 'anon') return; // Cannot flush unauthenticated queue

    let currentQueue = loadQueue();
    if (!currentQueue.length || !isOnline) return;

    // Filter items to ensure strict identity binding: never replay under another user or org!
    const eligibleItems = currentQueue.filter(item => item.userId === userId && item.organisationId === orgId);
    if (!eligibleItems.length) return;

    updatePill(`Reconnected · Syncing ${eligibleItems.length} update${eligibleItems.length > 1 ? 's' : ''}…`, 'syncing');

    let successfulCount = 0;
    for (const item of eligibleItems) {
      // Re-verify active user did not change mid-flight
      const currentScope = getActiveUserScope();
      if (currentScope.userId !== userId || currentScope.orgId !== orgId) {
        console.warn('User or company context switched during queue flush, aborting replay.');
        break;
      }

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });

        if (response.ok) {
          currentQueue = currentQueue.filter(q => q.id !== item.id);
          saveQueue(currentQueue);
          successfulCount++;
        } else if (response.status === 409 || response.status === 400 || response.status === 403 || response.status === 422) {
          const errPayload = await response.json().catch(() => ({}));
          item.conflict = {
            status: response.status,
            message: errPayload.error || 'Server rejected this queued action (policy or location check failed).',
            detectedAt: new Date().toISOString()
          };
          saveQueue(currentQueue);
        }
      } catch (err) {
        console.warn('Queue flush retry failed for item', item.id, err);
        break; // Stop and retry later if network failed again
      }
    }

    if (successfulCount > 0) {
      window.SoundEngine?.play?.('success');
      updatePill(`Sync complete · ${successfulCount} record${successfulCount > 1 ? 's' : ''} synchronized`, 'success');
      setTimeout(() => {
        if (loadQueue().length === 0) updatePill(null);
      }, 3000);
    } else if (loadQueue().length === 0) {
      updatePill(null);
    }
  }

  // ── Shared Device Safe Warning & Resolution Dialog on Logout ──────────────────
  function promptLogoutWarning(onProceedLogout) {
    const { userId, orgId } = getActiveUserScope();
    const currentQueue = loadQueue();
    const pendingItems = currentQueue.filter(item => item.userId === userId && item.organisationId === orgId);
    const pendingCount = pendingItems.length;

    if (pendingCount === 0) {
      onProceedLogout();
      return;
    }

    document.getElementById('sr-unsent-work-dialog')?.remove();

    const dialog = document.createElement('div');
    dialog.id = 'sr-unsent-work-dialog';
    dialog.className = 'modal-backdrop';
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;';
    dialog.innerHTML = `<div style="background:#ffffff;border-radius:18px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,0.3);text-align:left;font-family:sans-serif;" role="alertdialog" aria-modal="true" aria-labelledby="unsent-title">
        <h3 id="unsent-title" style="margin:0 0 10px;font-size:18px;font-weight:800;color:#0f172a;">Unsent Offline Updates</h3>
        <p style="margin:0 0 16px;font-size:13.5px;color:#475569;line-height:1.5;">
          You have <strong> ${pendingCount} unsent update(s)</strong> saved locally while offline.</p>
        <p style="margin:0 0 20px;font-size:12.5px;color:#64748b;line-height:1.45;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
          <strong>Shared Device Protection:</strong> To prevent data exposure to subsequent workers on this shared device, offline updates cannot remain stored locally in browser storage across sign-out. Choose to sync now, cancel to stay signed in, or discard unsent work before signing out.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button id="sr-btn-sync-logout" style="padding:12px;border-radius:10px;background:#0d524d;color:#fff;border:none;font-weight:700;font-size:14px;cursor:pointer;">
            Sync Now &amp; Sign Out
          </button>
          <button id="sr-btn-cancel-logout" style="padding:12px;border-radius:10px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-weight:600;font-size:13.5px;cursor:pointer;">
            Cancel (Stay Signed In)
          </button>
          <button id="sr-btn-discard-logout" style="padding:10px;border-radius:10px;background:transparent;color:#ef4444;border:none;font-size:12px;cursor:pointer;font-weight:600;">
            Discard Unsent Work &amp; Sign Out
          </button>
        </div>
      </div>`; document.body.appendChild(dialog);

    document.getElementById('sr-btn-sync-logout')?.addEventListener('click', async () => {
      const btn = document.getElementById('sr-btn-sync-logout');
      if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
      await flushQueue();
      const remainingCount = loadQueue().filter(item => item.userId === userId && item.organisationId === orgId).length;
      if (remainingCount === 0) {
        dialog.remove();
        onProceedLogout();
      } else {
        if (btn) { btn.disabled = false; btn.textContent = 'Sync Now & Sign Out'; }
        alert('Could not synchronize all updates (network unavailable or request failed). Please stay signed in or discard before logging out.');
      }
    });

    document.getElementById('sr-btn-cancel-logout')?.addEventListener('click', () => {
      dialog.remove();
    });

    document.getElementById('sr-btn-discard-logout')?.addEventListener('click', () => {
      const remaining = currentQueue.filter(item => item.userId !== userId || item.organisationId !== orgId);
      saveQueue(remaining);
      dialog.remove();
      onProceedLogout();
    });
  }

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
        const currentQueue = loadQueue();
        if (currentQueue.length > 0) {
          updatePill(`Offline Mode · ${currentQueue.length} queued`, 'offline');
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

  function getItems() {
    const { userId, orgId } = getActiveUserScope();
    const currentQueue = loadQueue();
    return currentQueue.filter(item => item.userId === userId && item.organisationId === orgId);
  }

  function removeItem(itemId) {
    const currentQueue = loadQueue();
    const filtered = currentQueue.filter(item => item.id !== itemId);
    saveQueue(filtered);
    const count = getItems().length;
    if (count === 0) updatePill(null);
    else updatePill(`Offline Mode · ${count} update${count > 1 ? 's' : ''} queued`, 'offline');
  }

  function resolveConflict(itemId, resolution) {
    // resolution: 'keep_server' | 'force_overwrite'
    const currentQueue = loadQueue();
    const item = currentQueue.find(i => i.id === itemId);
    if (!item) return;

    if (resolution === 'keep_server') {
      removeItem(itemId);
    } else if (resolution === 'force_overwrite') {
      if (item.headers && item.headers['Idempotency-Key']) {
        item.headers['Idempotency-Key'] = 'idem_force_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      }
      delete item.conflict;
      saveQueue(currentQueue);
      flushQueue();
    }
  }

  installOfflineInterceptor();

  window.OfflineQueue = {
    isOnline: () => isOnline,
    enqueue,
    flushQueue,
    getItems,
    removeItem,
    resolveConflict,
    getPendingCount: () => getItems().length,
    clearCurrentQueue: () => {
      const { userId, orgId } = getActiveUserScope();
      const currentQueue = loadQueue();
      const remaining = currentQueue.filter(item => item.userId !== userId || item.organisationId !== orgId);
      saveQueue(remaining);
      updatePill(null);
    },
    promptLogoutWarning
  };

  // If there are leftover queued items on boot, attempt sync
  if (navigator.onLine) {
    setTimeout(flushQueue, 2000);
  }
})();


