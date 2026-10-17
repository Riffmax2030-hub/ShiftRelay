/* ==========================================================================
   ShiftRelay WhatsApp-Style Real-Time Chat Experience
   Optimized for mobile web with channels, local caching, optimistic updates,
   and smooth auto-scroll.
   ========================================================================== */

let currentActiveChannelId = 'general';

function getChatCache(orgId, channelId) {
  try {
    const raw = localStorage.getItem(`sr_chat_${orgId}_${channelId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setChatCache(orgId, channelId, messages) {
  try {
    localStorage.setItem(`sr_chat_${orgId}_${channelId}`, JSON.stringify(messages.slice(-50)));
  } catch {}
}

function scrollChatToBottom(smooth = false) {
  const container = document.querySelector('.team-chat-list');
  if (container) {
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }
}

async function renderCommunity() {
  dashboardHeader('Team Messenger', 'WHATSAPP REAL-TIME CHAT');
  document.body.classList.add('team-page-active');
  const sharedHeader = document.querySelector('.app-header');
  if (sharedHeader) sharedHeader.style.display = 'none';

  const orgId = state.user?.organisation_id || 'default-org';
  const cachedMessages = getChatCache(orgId, currentActiveChannelId) || [];

  try {
    const [data, directory, direct] = await Promise.all([
      api(`/api/community?channelId=${encodeURIComponent(currentActiveChannelId)}`).catch(() => ({
        channels: [
          { id: 'general', name: 'General', description: 'All-team discussion' },
          { id: 'shift-handover', name: 'Shift Handover', description: 'Handovers & operational notes' },
          { id: 'kitchen-staff', name: 'Kitchen Staff', description: 'Kitchen and prep staff' },
          { id: 'night-shift', name: 'Night Shift', description: 'Night shift operations' }
        ],
        activeChannelId: currentActiveChannelId,
        messages: cachedMessages
      })),
      api('/api/directory').catch(() => ({ members: [] })),
      api('/api/community/direct-messages').catch(() => ({ messages: [] }))
    ]);

    const channels = data.channels || [
      { id: 'general', name: 'General', description: 'All-team discussion' },
      { id: 'shift-handover', name: 'Shift Handover', description: 'Handovers & operational notes' },
      { id: 'kitchen-staff', name: 'Kitchen Staff', description: 'Kitchen and prep staff' },
      { id: 'night-shift', name: 'Night Shift', description: 'Night shift operations' }
    ];

    const activeChannel = channels.find((c) => c.id === (data.activeChannelId || currentActiveChannelId)) || channels[0];
    currentActiveChannelId = activeChannel.id;

    const messages = data.messages && data.messages.length ? data.messages : cachedMessages;
    setChatCache(orgId, currentActiveChannelId, messages);

    const members = (directory.members || []).filter((m) => m.id !== state.user.id && m.status === 'active');
    const privateMessages = direct.messages || [];

    const formatTime = (value) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const avatar = (name) => `<span class="team-avatar">${escape((name || 'U').slice(0, 1).toUpperCase())}</span>`;

    const channelTabsMarkup = channels.map((ch) => `
      <button class="channel-pill ${ch.id === currentActiveChannelId ? 'active' : ''}" data-channel-id="${escape(ch.id)}">
        # ${escape(ch.name)}
      </button>
    `).join('');

    const messageMarkup = messages.map((item) => `
      <article class="team-message ${item.author_membership_id === state.user.id ? 'mine' : ''}" data-msg-id="${item.id}">
        ${item.author_membership_id !== state.user.id ? avatar(item.author_name) : ''}
        <div class="team-message-bubble">
          <div class="team-message-meta">
            <b>${escape(item.author_membership_id === state.user.id ? 'You' : item.author_name || 'Coworker')}</b>
            <time>${formatTime(item.created_at)}</time>
          </div>
          <p>${escape(item.body)}</p>
          <small class="message-status">${item.author_membership_id === state.user.id ? '✓ Sent' : 'Team message'}</small>
        </div>
      </article>
    `).join('') || `<p class="team-empty">No messages in #${escape(activeChannel.name)} yet. Say hello to your team!</p>`;

    const privateMarkup = privateMessages.map((item) => `
      <article class="private-message ${item.sender_membership_id === state.user.id ? 'mine' : ''}">
        ${avatar(item.sender_name)}
        <div>
          <div class="team-message-meta">
            <b>${escape(item.sender_membership_id === state.user.id ? 'You' : item.sender_name)}</b>
            <time>${formatTime(item.created_at)}</time>
          </div>
          <p>${escape(item.body)}</p>
        </div>
      </article>
    `).join('') || '<p class="team-empty">Select a coworker below to start a private chat.</p>';

    const announcements = (data.announcements || []).map((item) => `
      <article class="team-feed-item">
        ${avatar(item.author_name)}
        <div>
          <strong>${escape(item.title)}</strong>
          <p>${escape(item.body)}</p>
          <small>${escape(item.author_name)} · ${formatDate(item.created_at)} at ${formatTime(item.created_at)}</small>
        </div>
      </article>
    `).join('') || '<p class="team-empty">No announcements yet.</p>';

    $('#dashboard').innerHTML = `
      <section class="team-messenger whatsapp-team">
        <header class="team-messenger-head">
          <div class="team-brand-line">
            <span class="team-brand-icon">💬</span>
            <div>
              <p class="eyebrow">ORGANIZATION MESSENGER</p>
              <h2>${escape(activeChannel.name)}</h2>
            </div>
          </div>
          <span class="api-status connected">Live Connected</span>
        </header>

        <!-- Top WhatsApp Navigation Tabs -->
        <nav class="team-tabs whatsapp-tabs" aria-label="Team sections">
          <button class="active" data-team-tab="chat">💬 Channels (${channels.length})</button>
          <button data-team-tab="private">🔒 Private (${privateMessages.length})</button>
          <button data-team-tab="announcements">📢 Updates (${(data.announcements || []).length})</button>
        </nav>

        <!-- Channels Bar -->
        <div class="channel-pill-bar" id="channel-pill-bar">
          ${channelTabsMarkup}
        </div>

        <!-- Chat Panel -->
        <section class="team-panel active whatsapp-panel" data-team-panel="chat">
          <div class="team-panel-heading">
            <div>
              <h3># ${escape(activeChannel.name)}</h3>
              <small>${escape(activeChannel.description)}</small>
            </div>
          </div>

          <div class="team-chat-list" id="chat-messages-container">
            ${messageMarkup}
          </div>

          <form id="community-message-form" class="team-compose whatsapp-compose">
            <button class="compose-tool" id="team-attachment-button" type="button" aria-label="Add file or photo">📎</button>
            <input id="team-file-input" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" hidden>
            <button class="compose-tool" id="team-emoji-button" type="button" aria-label="Add emoji">☺</button>
            <input name="body" placeholder="Message #${escape(activeChannel.name)}…" autocomplete="off" required>
            <button class="send-message" type="submit" aria-label="Send message">➤</button>
          </form>

          <div class="team-emoji-picker" id="team-emoji-picker" hidden>
            <button type="button">👍</button>
            <button type="button">✅</button>
            <button type="button">🙏</button>
            <button type="button">❤️</button>
            <button type="button">🔥</button>
            <button type="button">😀</button>
          </div>
        </section>

        <!-- Direct Messages Panel -->
        <section class="team-panel whatsapp-panel" data-team-panel="private">
          <div class="team-panel-heading">
            <div>
              <h3>Private 1-on-1 Chats</h3>
              <small>Confidential coworker communication</small>
            </div>
          </div>
          <div class="private-chat-list">${privateMarkup}</div>
          <form id="direct-message-form" class="team-private-compose whatsapp-private-compose">
            <select name="recipientMembershipId" required>
              <option value="">Select a coworker…</option>
              ${members.map((m) => `<option value="${escape(m.id)}">${escape(m.name)} · ${escape(m.title || 'Staff')}</option>`).join('')}
            </select>
            <div class="private-compose-row">
              <input name="body" placeholder="Write a direct message…" required>
              <button class="send-message" aria-label="Send private message">➤</button>
            </div>
          </form>
        </section>

        <!-- Announcements Panel -->
        <section class="team-panel whatsapp-panel" data-team-panel="announcements">
          <div class="team-panel-heading">
            <div>
              <h3>Workplace Announcements</h3>
              <small>Official notices from leadership</small>
            </div>
            ${['owner', 'workforce_admin', 'supervisor'].includes(state.user.role) ? '<button class="secondary" id="new-announcement">Post update</button>' : ''}
          </div>
          <div class="team-feed">${announcements}</div>
        </section>
      </section>
    `;

    // Channel Switching
    document.querySelectorAll('[data-channel-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentActiveChannelId = btn.dataset.channelId;
        renderCommunity();
      });
    });

    // Tab Switching
    document.querySelectorAll('[data-team-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-team-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('[data-team-panel]').forEach((p) => p.classList.toggle('active', p.dataset.teamPanel === btn.dataset.teamTab));
        if (btn.dataset.teamTab === 'chat') scrollChatToBottom(false);
      });
    });

    // Optimistic Message Sending with Immediate UI Append
    $('#community-message-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = event.currentTarget.body;
      const body = input.value.trim();
      if (!body) return;

      const tempId = `temp-${Date.now()}`;
      input.value = '';

      // Optimistic append
      const chatContainer = $('#chat-messages-container');
      const emptyNotice = chatContainer.querySelector('.team-empty');
      if (emptyNotice) emptyNotice.remove();

      chatContainer.insertAdjacentHTML('beforeend', `
        <article class="team-message mine" data-msg-id="${tempId}">
          <div class="team-message-bubble">
            <div class="team-message-meta">
              <b>You</b>
              <time>${formatTime(new Date())}</time>
            </div>
            <p>${escape(body)}</p>
            <small class="message-status">Sending…</small>
          </div>
        </article>
      `);
      scrollChatToBottom(true);

      try {
        await api('/api/community/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: currentActiveChannelId, body })
        });
        const pendingEl = chatContainer.querySelector(`[data-msg-id="${tempId}"] .message-status`);
        if (pendingEl) pendingEl.textContent = '✓ Sent';
      } catch (err) {
        toast('Message failed to send. Please retry.');
        const pendingEl = chatContainer.querySelector(`[data-msg-id="${tempId}"] .message-status`);
        if (pendingEl) pendingEl.textContent = '⚠️ Failed';
      }
    });

    // Direct Messages Form
    $('#direct-message-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await api('/api/community/direct-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        form.reset();
        toast('Private message sent.');
        await renderCommunity();
        document.querySelector('[data-team-tab="private"]')?.click();
      } catch (err) {
        toast(err.message);
      } finally {
        btn.disabled = false;
      }
    });

    // Attachment & Emoji Handlers
    const messageInput = $('#community-message-form input[name="body"]');
    const fileInput = $('#team-file-input');
    $('#team-attachment-button')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        messageInput.value = `📎 ${file.name}`;
        messageInput.focus();
      }
    });

    $('#team-emoji-button')?.addEventListener('click', () => {
      const picker = $('#team-emoji-picker');
      picker.hidden = !picker.hidden;
    });

    document.querySelectorAll('#team-emoji-picker button').forEach((b) => {
      b.addEventListener('click', () => {
        messageInput.value += b.textContent;
        messageInput.focus();
        $('#team-emoji-picker').hidden = true;
      });
    });

    $('#new-announcement')?.addEventListener('click', () => openAnnouncementDialog());

    // Auto-scroll to bottom on load
    scrollChatToBottom(false);
    bindNavigation();
  } catch (error) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(error.message)}</p>`;
  }
}

function openAnnouncementDialog() {
  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="announcement-dialog">
      <div>
        <button class="dialog-close" aria-label="Close">×</button>
        <p class="eyebrow">NEW ANNOUNCEMENT</p>
        <h2>Broadcast to the team.</h2>
        <form class="access-form" id="announcement-form">
          <label>Title<input name="title" required placeholder="Important update for next shift…"></label>
          <label>Details<textarea name="body" required placeholder="Write the announcement message…"></textarea></label>
          <button class="primary" type="submit">Publish announcement</button>
        </form>
      </div>
    </section>
  `);

  $('.dialog-close').addEventListener('click', () => $('#announcement-dialog').remove());
  $('#announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/community/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))
      });
      $('#announcement-dialog').remove();
      toast('Announcement published to organisation.');
      renderCommunity();
    } catch (err) {
      toast(err.message);
    }
  });
}

// Add channel pill bar styling dynamically
const channelBarStyle = document.createElement('style');
channelBarStyle.textContent = `
  .channel-pill-bar {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    overflow-x: auto;
    background-color: var(--bg-surface-subtle);
    border-bottom: 1px solid var(--border-subtle);
  }
  .channel-pill {
    padding: 6px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-subtle);
    background-color: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .channel-pill:hover {
    border-color: var(--border-medium);
    color: var(--text-main);
  }
  .channel-pill.active {
    background-color: var(--brand-primary);
    color: #ffffff;
    border-color: var(--brand-primary);
    font-weight: 600;
  }
`;
document.head.appendChild(channelBarStyle);
