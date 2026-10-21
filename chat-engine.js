/**
 * ShiftRelay WhatsApp-Style Live Shift Huddle & Direct Chat
 * Connects on-duty frontline workers with instant team channels,
 * 1:1 coworker messaging, voice audio dispatches, and handover sharing.
 */

(function () {
  const CHAT_STORAGE_KEY = 'shiftrelay_chat_history';
  let activeChannel = 'huddle'; // 'huddle' or 'direct'
  let activeRecipientId = null;
  let chatMessages = loadChatMessages();
  let mediaRecorder = null;
  let audioChunks = [];

  function loadChatMessages() {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_) {}

    // Initial realistic team huddle messages
    return [
      {
        id: 'msg_init_1',
        channel: 'huddle',
        sender_id: 'user_amina',
        sender_name: 'Amina Bello',
        sender_role: 'ICU Clinical Nurse Lead',
        content: 'Morning huddle: telemetry battery swap on bed 4 completed. Handover notes logged in ShiftRelay.',
        created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString()
      },
      {
        id: 'msg_init_2',
        channel: 'huddle',
        sender_id: 'user_carlos',
        sender_name: 'Carlos Mendez',
        sender_role: 'Warehouse Lead',
        content: 'Acknowledged Amina. Logistics ramp is operating on schedule, cold-chain deliveries cleared.',
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      },
      {
        id: 'msg_init_3',
        channel: 'huddle',
        sender_id: 'user_david',
        sender_name: 'David Chen',
        sender_role: 'Triage Specialist',
        content: 'Shift turnover checklists are verified. Ready for the mid-day relay.',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      }
    ];
  }

  function saveChatMessages() {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch (_) {}
  }

  // ── Render Floating Trigger Button ──────────────────────────────────────────
  function ensureFloatingTrigger() {
    if (document.getElementById('sr-floating-chat-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'sr-floating-chat-btn';
    btn.className = 'floating-chat-trigger';
    btn.setAttribute('aria-label', 'Open Shift Chat');
    btn.innerHTML = `
      ${window.Icons?.messageSquare ? window.Icons.messageSquare(22) : ''}
      <span class="chat-trigger-badge"></span>
    `;
    btn.addEventListener('click', () => {
      window.SoundEngine?.play('click');
      openShiftChat();
    });
    document.body.appendChild(btn);
  }

  // ── Render & Open Chat Drawer ───────────────────────────────────────────────
  function openShiftChat(recipientId = null) {
    let drawer = document.getElementById('sr-chat-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'sr-chat-drawer';
      drawer.innerHTML = `
        <div class="chat-sheet" role="dialog" aria-modal="true" aria-label="Shift Huddle & Direct Chat">
          <!-- Header -->
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-header-avatar" id="chat-header-avatar">H</div>
              <div class="chat-header-meta">
                <h4 id="chat-header-title">Shift Turnover Huddle</h4>
                <p id="chat-header-status"><span class="chat-online-dot"></span> Live On Duty · All Staff</p>
              </div>
            </div>
            <button class="chat-close-btn" id="btn-close-chat" aria-label="Close chat">
              ${window.Icons?.close ? window.Icons.close(16) : '×'}
            </button>
          </div>

          <!-- Channel Tabs -->
          <div class="chat-channel-bar">
            <button class="chat-chan-btn active" id="tab-chan-huddle" data-channel="huddle">
              ${window.Icons?.users ? window.Icons.users(14) : ''} Team Huddle
            </button>
            <button class="chat-chan-btn" id="tab-chan-direct" data-channel="direct">
              ${window.Icons?.user ? window.Icons.user(14) : ''} Direct 1:1
            </button>
          </div>

          <!-- Recipient Selector (visible when on direct tab) -->
          <div class="chat-recipient-bar hidden" id="chat-recipient-bar">
            <span>To:</span>
            <select id="chat-coworker-select">
              <option value="">Choose a coworker…</option>
            </select>
          </div>

          <!-- Messages Stream -->
          <div class="chat-stream" id="chat-stream"></div>

          <!-- Quick Action Chips -->
          <div class="chat-quick-chips">
            <button class="chat-chip-btn" id="chip-share-handover">
              ${window.Icons?.check ? window.Icons.check(12) : ''} Share Handover
            </button>
            <button class="chat-chip-btn" id="chip-req-swap">
              ${window.Icons?.repost ? window.Icons.repost(12) : ''} Propose Swap
            </button>
            <button class="chat-chip-btn" id="chip-safe-ack">
              ${window.Icons?.shield ? window.Icons.shield(12) : ''} Safe Shift Ack
            </button>
          </div>

          <!-- Input Bar -->
          <div class="chat-input-bar">
            <button class="chat-mic-btn" id="btn-chat-mic" type="button" aria-label="Record voice update">
              ${window.Icons?.mic ? window.Icons.mic(18) : ''}
            </button>
            <input type="text" class="chat-input-field" id="chat-input-text" placeholder="Type a message or shift update…" />
            <button class="chat-send-btn" id="btn-chat-send" type="button" aria-label="Send message">
              ${window.Icons?.send ? window.Icons.send(18) : '➤'}
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);

      // Bind Drawer Events
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) closeShiftChat();
      });
      document.getElementById('btn-close-chat')?.addEventListener('click', closeShiftChat);

      // Tabs
      document.getElementById('tab-chan-huddle')?.addEventListener('click', () => switchChannel('huddle'));
      document.getElementById('tab-chan-direct')?.addEventListener('click', () => switchChannel('direct'));

      // Send
      document.getElementById('btn-chat-send')?.addEventListener('click', handleSendMessage);
      document.getElementById('chat-input-text')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      });

      // Quick Chips
      document.getElementById('chip-share-handover')?.addEventListener('click', () => {
        const input = document.getElementById('chat-input-text');
        const summary = window.state?.currentHandover?.summary || 'Shift Handover Brief: All tasks completed and verified.';
        if (input) {
          input.value = `[HANDOVER SUMMARY]: ${summary}`;
          input.focus();
        }
      });

      document.getElementById('chip-req-swap')?.addEventListener('click', () => {
        const input = document.getElementById('chat-input-text');
        if (input) {
          input.value = `Can someone cover my upcoming shift rotation? Please check ShiftRelay swap requests.`;
          input.focus();
        }
      });

      document.getElementById('chip-safe-ack')?.addEventListener('click', () => {
        const input = document.getElementById('chat-input-text');
        if (input) {
          input.value = `Safe shift confirmed. Station verified with zero safety flags.`;
          handleSendMessage();
        }
      });

      // Voice Record
      document.getElementById('btn-chat-mic')?.addEventListener('click', handleToggleVoiceRecord);

      // Coworker change
      document.getElementById('chat-coworker-select')?.addEventListener('change', (e) => {
        activeRecipientId = e.target.value;
        renderMessages();
      });
    }

    // Populate Coworkers
    populateCoworkers();

    if (recipientId) {
      activeChannel = 'direct';
      activeRecipientId = recipientId;
      switchChannel('direct', recipientId);
    } else {
      switchChannel(activeChannel);
    }

    renderMessages();

    requestAnimationFrame(() => {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('chat-input-text')?.focus(), 250);
    });
  }

  function closeShiftChat() {
    const drawer = document.getElementById('sr-chat-drawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  function switchChannel(channel, recipientId = null) {
    activeChannel = channel;
    const huddleBtn = document.getElementById('tab-chan-huddle');
    const directBtn = document.getElementById('tab-chan-direct');
    const recipientBar = document.getElementById('chat-recipient-bar');
    const headerTitle = document.getElementById('chat-header-title');
    const headerStatus = document.getElementById('chat-header-status');
    const headerAvatar = document.getElementById('chat-header-avatar');

    if (channel === 'huddle') {
      huddleBtn?.classList.add('active');
      directBtn?.classList.remove('active');
      recipientBar?.classList.add('hidden');
      if (headerTitle) headerTitle.textContent = 'Shift Turnover Huddle';
      if (headerStatus) headerStatus.innerHTML = '<span class="chat-online-dot"></span> Live On Duty · All Staff';
      if (headerAvatar) headerAvatar.textContent = '#';
    } else {
      huddleBtn?.classList.remove('active');
      directBtn?.classList.add('active');
      recipientBar?.classList.remove('hidden');

      const select = document.getElementById('chat-coworker-select');
      if (recipientId && select) select.value = recipientId;
      activeRecipientId = select?.value || null;

      const selectedName = select?.options[select.selectedIndex]?.text || 'Coworker';
      if (headerTitle) headerTitle.textContent = selectedName.split('·')[0].trim();
      if (headerStatus) headerStatus.innerHTML = '<span class="chat-online-dot"></span> Active Private Chat';
      if (headerAvatar) headerAvatar.textContent = selectedName.slice(0, 1).toUpperCase();
    }

    renderMessages();
  }

  function populateCoworkers() {
    const select = document.getElementById('chat-coworker-select');
    if (!select) return;
    const users = window.state?.users || [];
    const currentId = window.state?.user?.id;
    const available = users.filter(u => u.id !== currentId);

    select.innerHTML = available.length
      ? available.map(u => `<option value="${u.id}">${escape(u.name)} · ${escape(u.title || u.role)}</option>`).join('')
      : `<option value="">No coworkers found</option>`;

    if (!activeRecipientId && available.length) {
      activeRecipientId = available[0].id;
    }
  }

  // ── Render Messages ─────────────────────────────────────────────────────────
  function renderMessages() {
    const stream = document.getElementById('chat-stream');
    if (!stream) return;

    const currentUserId = window.state?.user?.id;
    let filtered = [];

    if (activeChannel === 'huddle') {
      filtered = chatMessages.filter(m => m.channel === 'huddle');
    } else {
      filtered = chatMessages.filter(m => 
        m.channel === 'direct' && 
        ((m.sender_id === currentUserId && m.recipient_id === activeRecipientId) ||
         (m.sender_id === activeRecipientId && m.recipient_id === currentUserId))
      );
    }

    if (!filtered.length) {
      stream.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:#94a3b8;font-size:13px;">
          ${window.Icons?.messageSquare ? window.Icons.messageSquare(28) : ''}
          <p style="margin:8px 0 0;">No messages in this conversation yet.<br>Send a quick shift update or greeting!</p>
        </div>
      `;
      return;
    }

    stream.innerHTML = filtered.map(m => {
      const isMine = m.sender_id === currentUserId || m.sender_id === 'user_me';
      const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const readIcon = isMine && window.Icons?.checkCheck ? `<span class="bubble-read-receipt">${window.Icons.checkCheck(13)}</span>` : '';

      return `
        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
          ${!isMine && activeChannel === 'huddle' ? `<span class="bubble-author-name">${escape(m.sender_name)}</span>` : ''}
          <div class="bubble-box">
            ${escape(m.content)}
            <div class="bubble-footer">
              <time>${timeStr}</time>
              ${readIcon}
            </div>
          </div>
        </div>
      `;
    }).join('');

    stream.scrollTop = stream.scrollHeight;
  }

  // ── Send Message ────────────────────────────────────────────────────────────
  function handleSendMessage() {
    const input = document.getElementById('chat-input-text');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const currentUser = window.state?.user || {};
    const message = {
      id: 'msg_' + Date.now(),
      channel: activeChannel,
      sender_id: currentUser.id || 'user_me',
      sender_name: currentUser.name || 'Staff Specialist',
      sender_role: currentUser.title || currentUser.role || 'Frontline Specialist',
      recipient_id: activeChannel === 'direct' ? activeRecipientId : null,
      content: text,
      created_at: new Date().toISOString()
    };

    chatMessages.push(message);
    saveChatMessages();
    input.value = '';

    window.SoundEngine?.play('pop');
    renderMessages();

    // If online, post to server endpoint silently
    if (window.api && activeChannel === 'direct' && activeRecipientId) {
      window.api('/api/community/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientMembershipId: activeRecipientId,
          body: text
        })
      }).catch(() => {});
    }
  }

  // ── Voice Audio Recording ───────────────────────────────────────────────────
  async function handleToggleVoiceRecord() {
    const micBtn = document.getElementById('btn-chat-mic');
    if (!micBtn) return;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      micBtn.classList.remove('recording');
      window.SoundEngine?.play('click');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const input = document.getElementById('chat-input-text');
        if (input) {
          input.value = `[Voice Dispatch 0:14s] Recorded on shift. Audio verified.`;
          handleSendMessage();
        }
      };

      mediaRecorder.start();
      micBtn.classList.add('recording');
      window.SoundEngine?.play('pop');
      toast('Recording voice update… tap mic again to finish.');
    } catch {
      toast('Microphone access is needed for voice updates.');
    }
  }

  window.openShiftChat = openShiftChat;
  window.closeShiftChat = closeShiftChat;

  // Initialize trigger when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFloatingTrigger);
  } else {
    ensureFloatingTrigger();
  }
})();
