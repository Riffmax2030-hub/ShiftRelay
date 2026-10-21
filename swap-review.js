/**
 * ShiftRelay Shift Swap Review Panel
 * Renders pending swap requests for supervisors/owners.
 * Called from renderDashboard() when user.role is supervisor or owner.
 */

async function renderSwapReviewPanel() {
  const user = state.user || {};
  if (!['supervisor', 'owner'].includes(user.role)) return;

  // Find the dashboard container (injected after the command deck)
  const dash = document.getElementById('dashboard');
  if (!dash) return;

  // Don't double-inject
  if (document.getElementById('swap-review-panel')) return;

  try {
    const swaps = await api('/api/shift-swaps').catch(() => []);
    const pending = Array.isArray(swaps) ? swaps.filter(s => s.status === 'pending') : [];

    if (!pending.length) return; // Nothing to show

    const panel = document.createElement('section');
    panel.id = 'swap-review-panel';
    panel.className = 'swap-review-panel';
    panel.innerHTML = `
      <div class="swap-review-header">
        ${Icons.repost(16)}
        <strong>Swap Requests</strong>
        <span class="swap-count-pill">${pending.length}</span>
      </div>
      <div id="swap-review-list">
        ${pending.map(s => renderSwapCard(s)).join('')}
      </div>
    `;

    // Insert after the today command glass card if it exists, else prepend
    const commandDeck = dash.querySelector('.today-command-glass');
    if (commandDeck) {
      commandDeck.insertAdjacentElement('afterend', panel);
    } else {
      dash.insertAdjacentElement('afterbegin', panel);
    }

    // Bind approve/reject buttons
    panel.querySelectorAll('[data-swap-action]').forEach(btn => {
      btn.addEventListener('click', () => handleSwapAction(btn.dataset.swapId, btn.dataset.swapAction, btn));
    });

  } catch (err) {
    console.warn('Swap review panel unavailable:', err.message);
  }
}

function renderSwapCard(swap) {
  const isUrgent = swap.type === 'cover';
  return `
    <div class="swap-review-card" id="swap-card-${swap.id}">
      <div class="swap-card-head">
        <div class="swap-card-avatar">${(swap.requestedByName || 'W').slice(0, 1).toUpperCase()}</div>
        <div class="swap-card-info">
          <strong>${escape(swap.requestedByName || 'Worker')}</strong>
          <span>${escape(swap.swapType === 'cover' ? 'Cover request' : swap.swapType === 'trade' ? 'Shift trade' : 'Partial cover')}</span>
        </div>
        ${isUrgent ? `<span class="swap-urgent-pill">Urgent</span>` : ''}
      </div>
      ${swap.shiftDate ? `<p class="swap-card-shift">${Icons.clock(13)} ${escape(swap.shiftDate)}</p>` : ''}
      ${swap.reason ? `<p class="swap-card-reason">${escape(swap.reason)}</p>` : ''}
      <div class="swap-card-actions">
        <button class="secondary swap-reject-btn" data-swap-id="${swap.id}" data-swap-action="reject">
          ${Icons.close(14)} Decline
        </button>
        <button class="primary swap-approve-btn" data-swap-id="${swap.id}" data-swap-action="approve">
          ${Icons.check()} Approve
        </button>
      </div>
    </div>
  `;
}

async function handleSwapAction(swapId, action, btn) {
  btn.disabled = true;
  const card = document.getElementById(`swap-card-${swapId}`);

  try {
    await api('/api/shift-swaps/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swapId, action })
    });

    // Animate card out
    if (card) {
      card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => {
        card.remove();
        // If no more cards, remove panel
        const list = document.getElementById('swap-review-list');
        if (list && !list.children.length) {
          document.getElementById('swap-review-panel')?.remove();
        }
        // Update badge
        const remaining = document.querySelectorAll('.swap-review-card').length;
        const pill = document.querySelector('.swap-count-pill');
        if (pill) pill.textContent = remaining;
      }, 280);
    }

    toast(action === 'approve' ? 'Swap approved. Worker notified.' : 'Swap declined.');
    window.refreshDockBadges?.();

  } catch (err) {
    btn.disabled = false;
    toast('Could not process swap: ' + err.message);
  }
}

window.renderSwapReviewPanel = renderSwapReviewPanel;
