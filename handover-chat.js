/**
 * ShiftRelay WhatsApp-Style Persistent Shift Handover Chat Engine
 * - Chronological persistent thread backed 100% by PostgreSQL / server API (/api/handovers)
 * - '+' Attachment menu: Camera Photo (auto-compressed), Photo Gallery, Document/File
 * - Live Voice Note recorder (MediaRecorder with iOS Safari mp4 + Chrome/Android webm support)
 * - Inline Voice Note player, Photo lightbox, Safari/Android-safe File downloads
 * - Supervisor Relay & Incoming Takeover badges right inside the conversation stream
 */
(function () {
  'use strict';

  const STYLE_ID = 'sr-handover-chat-styles';

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDuration(sec) {
    const s = Math.max(0, Math.round(Number(sec || 0)));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function formatDateGroup(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return 'Recent';
    const now = new Date();
    const todayKey = now.toDateString();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (d.toDateString() === todayKey) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatTime(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide floating global support FAB while inside Handover Chat so Mic & Send buttons are never overlapped */
      body:has(#sr-ho-chat-shell) #sr-btn-floating-ai,
      body:has(#sr-ho-chat-shell) .sr-floating-ai-beacon,
      body:has(#sr-ho-chat-shell) #sr-chat-fab,
      body:has(#sr-ho-chat-shell) .sr-chat-fab {
        display: none !important;
      }

      .sr-ho-chat-shell {
        display: flex;
        flex-direction: column;
        border-radius: 18px;
        border: 1px solid var(--sr-border-subtle, #e2e8f0);
        background: var(--sr-bg-card, #ffffff);
        overflow: hidden;
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
        min-height: 440px;
        max-height: calc(100vh - 210px);
      }
      [data-theme="dark"] .sr-ho-chat-shell {
        background: #0b141c;
        border-color: rgba(148, 163, 184, 0.16);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      }
      @media (max-width: 767px) {
        .sr-ho-chat-shell {
          min-height: 360px;
          max-height: calc(100dvh - 255px);
          border-radius: 16px;
        }
      }

      .sr-ho-chat-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--sr-border-subtle, #e2e8f0);
        background: var(--sr-bg-card, #ffffff);
        flex-shrink: 0;
      }
      [data-theme="dark"] .sr-ho-chat-topbar {
        background: #0f1b24;
        border-bottom-color: rgba(148, 163, 184, 0.14);
      }
      .sr-ho-chat-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .sr-ho-channel-avatar {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sr-ho-chat-title-meta {
        min-width: 0;
      }
      .sr-ho-chat-title-meta h3 {
        margin: 0;
        font-size: 14.5px;
        font-weight: 800;
        color: var(--sr-text-main, #0f172a);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sr-ho-chat-title-meta p {
        margin: 1px 0 0;
        font-size: 11.5px;
        color: var(--sr-text-muted, #64748b);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sr-ho-live-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        margin-right: 4px;
        vertical-align: middle;
      }

      .sr-ho-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background:
          radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.045), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(2, 132, 199, 0.04), transparent 55%),
          var(--sr-bg-subtle, #f1f5f9);
        scroll-behavior: smooth;
      }
      [data-theme="dark"] .sr-ho-messages {
        background:
          radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.06), transparent 50%),
          #081017;
      }

      .sr-ho-date-divider {
        align-self: center;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.07);
        color: var(--sr-text-muted, #475569);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        margin: 4px 0;
      }
      [data-theme="dark"] .sr-ho-date-divider {
        background: rgba(148, 163, 184, 0.14);
        color: #cbd5e1;
      }

      .sr-ho-row {
        display: flex;
        flex-direction: column;
        max-width: 84%;
      }
      @media (max-width: 480px) {
        .sr-ho-row { max-width: 90%; }
      }
      .sr-ho-row.is-me {
        align-self: flex-end;
        align-items: flex-end;
      }
      .sr-ho-row.is-other {
        align-self: flex-start;
        align-items: flex-start;
      }

      .sr-ho-bubble {
        position: relative;
        padding: 10px 12px 8px;
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        word-break: break-word;
        overflow-wrap: break-word;
        width: 100%;
        box-sizing: border-box;
      }
      .sr-ho-row.is-me .sr-ho-bubble {
        background: #dcfce7;
        border: 1px solid rgba(5, 150, 105, 0.22);
        border-bottom-right-radius: 4px;
        color: #064e3b;
      }
      [data-theme="dark"] .sr-ho-row.is-me .sr-ho-bubble {
        background: #0b3b2e;
        border-color: rgba(26, 208, 121, 0.28);
        color: #ecfdf5;
      }
      .sr-ho-row.is-other .sr-ho-bubble {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 4px;
        color: #0f172a;
      }
      [data-theme="dark"] .sr-ho-row.is-other .sr-ho-bubble {
        background: #13202c;
        border-color: rgba(148, 163, 184, 0.18);
        color: #f1f5f9;
      }

      .sr-ho-bubble-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 5px;
      }
      .sr-ho-sender {
        font-size: 12px;
        font-weight: 800;
        color: #047857;
      }
      [data-theme="dark"] .sr-ho-sender { color: #34d399; }
      .sr-ho-row.is-other .sr-ho-sender { color: #0369a1; }
      [data-theme="dark"] .sr-ho-row.is-other .sr-ho-sender { color: #38bdf8; }

      .sr-ho-cond-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 7px;
        border-radius: 99px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .sr-ho-cond-chip.is-normal {
        background: rgba(16, 185, 129, 0.14);
        color: #047857;
      }
      [data-theme="dark"] .sr-ho-cond-chip.is-normal { color: #6ee7b7; }
      .sr-ho-cond-chip.is-flag {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }
      [data-theme="dark"] .sr-ho-cond-chip.is-flag { color: #fcd34d; }
      .sr-ho-cond-chip.is-blocker {
        background: rgba(239, 68, 68, 0.16);
        color: #b91c1c;
      }
      [data-theme="dark"] .sr-ho-cond-chip.is-blocker { color: #fca5a5; }

      .sr-ho-text {
        font-size: 13.5px;
        line-height: 1.5;
        white-space: pre-wrap;
        margin: 0;
      }

      .sr-ho-attachments {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-top: 7px;
      }
      .sr-ho-img-thumb {
        width: 100%;
        max-width: 240px;
        max-height: 165px;
        object-fit: cover;
        border-radius: 12px;
        display: block;
        cursor: zoom-in;
        border: 1px solid rgba(15, 23, 42, 0.12);
      }
      .sr-ho-file-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 11px;
        background: rgba(15, 23, 42, 0.055);
        border: 1px solid rgba(15, 23, 42, 0.09);
        text-decoration: none;
        color: inherit;
        cursor: pointer;
      }
      [data-theme="dark"] .sr-ho-file-card {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .sr-ho-file-icon {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: rgba(5, 150, 105, 0.14);
        color: #059669;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      [data-theme="dark"] .sr-ho-file-icon { color: #34d399; }
      .sr-ho-file-meta {
        flex: 1;
        min-width: 0;
      }
      .sr-ho-file-name {
        font-size: 12.5px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .sr-ho-file-size {
        font-size: 10.5px;
        opacity: 0.72;
      }

      .sr-ho-voice-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.06);
        border: 1px solid rgba(15, 23, 42, 0.09);
        min-width: 210px;
        max-width: 280px;
      }
      [data-theme="dark"] .sr-ho-voice-card {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.12);
      }
      .sr-ho-voice-play {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: none;
        background: #059669;
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .sr-ho-voice-track-wrap {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sr-ho-voice-bar {
        width: 100%;
        height: 5px;
        border-radius: 99px;
        background: rgba(100, 116, 139, 0.28);
        overflow: hidden;
        cursor: pointer;
      }
      .sr-ho-voice-fill {
        height: 100%;
        width: 0%;
        background: #10b981;
        border-radius: 99px;
        transition: width 0.1s linear;
      }
      .sr-ho-voice-meta {
        display: flex;
        justify-content: space-between;
        font-size: 10.5px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        opacity: 0.78;
      }

      .sr-ho-bubble-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 6px;
        flex-wrap: wrap;
      }
      .sr-ho-time-status {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10.5px;
        opacity: 0.75;
      }
      .sr-ho-inline-action {
        padding: 4px 9px;
        border-radius: 8px;
        border: 1px solid rgba(5, 150, 105, 0.35);
        background: rgba(16, 185, 129, 0.14);
        color: #047857;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
      [data-theme="dark"] .sr-ho-inline-action {
        color: #34d399;
        border-color: rgba(52, 211, 153, 0.35);
      }

      /* Composer Area */
      .sr-ho-composer-wrap {
        position: relative;
        border-top: 1px solid var(--sr-border-subtle, #e2e8f0);
        background: var(--sr-bg-card, #ffffff);
        padding: 8px 10px 10px;
        flex-shrink: 0;
      }
      [data-theme="dark"] .sr-ho-composer-wrap {
        background: #0f1b24;
        border-top-color: rgba(148, 163, 184, 0.14);
      }

      .sr-ho-cond-strip {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .sr-ho-cond-strip::-webkit-scrollbar { display: none; }
      .sr-ho-cond-pill {
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid var(--sr-border-subtle, #cbd5e1);
        background: transparent;
        color: var(--sr-text-muted, #475569);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .sr-ho-cond-pill.is-active {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.14);
        color: #047857;
      }
      [data-theme="dark"] .sr-ho-cond-pill.is-active { color: #34d399; }

      .sr-ho-staging {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .sr-ho-stage-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 10px;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        font-size: 11.5px;
        font-weight: 600;
        color: var(--sr-text-main, #0f172a);
        max-width: 220px;
      }
      .sr-ho-stage-chip img {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        object-fit: cover;
      }
      .sr-ho-stage-chip span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sr-ho-stage-rm {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-weight: 800;
        padding: 0 2px;
        font-size: 14px;
        line-height: 1;
      }

      .sr-ho-bar {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      .sr-ho-plus-btn,
      .sr-ho-voice-trigger {
        background: rgba(100, 116, 139, 0.14);
        color: var(--sr-text-main, #0f172a);
        box-shadow: none;
      }
      [data-theme="dark"] .sr-ho-voice-trigger {
        background: rgba(148, 163, 184, 0.16);
        color: #f1f5f9;
      }
      .sr-ho-action-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: transform 0.14s ease, background 0.15s ease;
      }
      .sr-ho-plus-btn {
        background: rgba(100, 116, 139, 0.14);
        color: var(--sr-text-main, #0f172a);
      }
      [data-theme="dark"] .sr-ho-plus-btn {
        background: rgba(148, 163, 184, 0.16);
        color: #f1f5f9;
      }
      .sr-ho-plus-btn.is-open {
        transform: rotate(45deg);
        background: rgba(16, 185, 129, 0.18);
        color: #059669;
      }
      .sr-ho-voice-trigger {
        background: rgba(100, 116, 139, 0.14);
        color: var(--sr-text-main, #0f172a);
        box-shadow: none;
      }
      [data-theme="dark"] .sr-ho-voice-trigger {
        background: rgba(148, 163, 184, 0.16);
        color: #f1f5f9;
      }
      .sr-ho-action-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.28);
      }
      .sr-ho-action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .sr-ho-input {
        flex: 1;
        min-width: 0;
        min-height: 40px;
        max-height: 112px;
        padding: 9px 14px;
        border-radius: 20px;
        border: 1.5px solid var(--sr-border-subtle, #cbd5e1);
        background: var(--sr-bg-subtle, #f8fafc);
        color: var(--sr-text-main, #0f172a);
        font-size: 13.5px;
        font-family: inherit;
        line-height: 1.38;
        resize: none;
        outline: none;
        box-sizing: border-box;
      }
      .sr-ho-input:focus { border-color: #10b981; }
      [data-theme="dark"] .sr-ho-input {
        background: #081017;
        border-color: rgba(148, 163, 184, 0.22);
        color: #f8fafc;
      }

      /* '+' Popover Menu */
      .sr-ho-plus-menu {
        position: absolute;
        left: 10px;
        bottom: 62px;
        z-index: 30;
        min-width: 196px;
        padding: 6px;
        border-radius: 14px;
        background: var(--sr-bg-card, #ffffff);
        border: 1px solid var(--sr-border-subtle, #e2e8f0);
        box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18);
        display: none;
        flex-direction: column;
        gap: 2px;
      }
      [data-theme="dark"] .sr-ho-plus-menu {
        background: #13202c;
        border-color: rgba(148, 163, 184, 0.22);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      }
      .sr-ho-plus-menu.is-open { display: flex; }
      .sr-ho-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: var(--sr-text-main, #0f172a);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-align: left;
      }
      .sr-ho-menu-item:hover { background: rgba(16, 185, 129, 0.1); }
      .sr-ho-menu-ico {
        width: 30px;
        height: 30px;
        border-radius: 9px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* Recording Bar */
      @keyframes srRecBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
      }
      .sr-ho-rec-bar {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 6px 10px;
        border-radius: 20px;
        background: rgba(239, 68, 68, 0.1);
        border: 1.5px solid rgba(239, 68, 68, 0.35);
      }
      .sr-ho-rec-bar.is-active { display: flex; }
      .sr-ho-rec-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ef4444;
        animation: srRecBlink 1s infinite;
      }
      .sr-ho-rec-timer {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        font-weight: 800;
        color: #ef4444;
      }

      /* Lightbox */
      .sr-ho-lightbox {
        position: fixed;
        inset: 0;
        z-index: 2147482000;
        background: rgba(2, 6, 23, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        gap: 14px;
      }
      .sr-ho-lightbox img {
        max-width: 94vw;
        max-height: 78vh;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      }
    `;
    document.head.appendChild(style);
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read selected image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve({ dataUrl: reader.result, mimeType: file.type || 'image/jpeg' });
        img.onload = () => {
          const maxDim = 1440;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.max(1, Math.round(w * ratio));
            h = Math.max(1, Math.round(h * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', 0.82);
          resolve({ dataUrl: out, mimeType: 'image/jpeg' });
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
  }

  async function uploadHandoverMedia({ type, name, mimeType, dataUrl, durationSec = 0 }) {
    const res = await fetch('/api/handovers/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type, name, mimeType, dataUrl, durationSec })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.attachment) {
      throw new Error(data.error || 'Could not upload attachment.');
    }
    return data.attachment;
  }

  function openLightbox(url, name) {
    const lb = document.createElement('div');
    lb.className = 'sr-ho-lightbox';
    lb.innerHTML = `
      <img src="${esc(url)}" alt="${esc(name || 'Handover Photo')}" />
      <div style="display:flex;gap:10px;align-items:center;">
        <a href="${esc(url)}" download="${esc(name || 'handover-photo.jpg')}" class="sr-btn sr-btn-primary" style="text-decoration:none;min-height:36px;padding:0 16px;">Download</a>
        <button type="button" class="sr-btn sr-btn-secondary" id="sr-ho-lb-close" style="min-height:36px;padding:0 16px;">Close</button>
      </div>
    `;
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.id === 'sr-ho-lb-close') lb.remove();
    });
    document.body.appendChild(lb);
  }

  function normalizeHandoverItem(raw, currentUser) {
    const ho = raw.handover && typeof raw.handover === 'object' ? raw.handover : {};
    const attachments = Array.isArray(raw.attachments) && raw.attachments.length
      ? raw.attachments
      : (Array.isArray(ho.attachments) ? ho.attachments : []);
    const createdBy = raw.createdBy || raw.created_by_membership_id || '';
    const authorName = raw.authorName || ho.author || raw.creatorName || (createdBy === currentUser.id ? currentUser.name : 'Shift Specialist');
    const isMe = Boolean(
      (createdBy && currentUser.id && createdBy === currentUser.id) ||
      (!createdBy && authorName === currentUser.name)
    );
    const condition = ho.condition || (ho.shiftStatus === 'red' ? 'Blocker / Escalation' : ho.shiftStatus === 'amber' ? 'Operational Flag' : 'All Systems Normal');
    return {
      id: raw.id,
      createdBy,
      isMe,
      authorName,
      authorRole: raw.authorRole || ho.authorRole || 'Shift Specialist',
      station: ho.station || raw.department || currentUser.department || 'Operations',
      summary: String(ho.summary || raw.notes || '').trim(),
      condition,
      shiftStatus: ho.shiftStatus || (condition.toLowerCase().includes('blocker') ? 'red' : condition === 'All Systems Normal' ? 'green' : 'amber'),
      status: raw.status || 'awaiting_review',
      attachments,
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString()
    };
  }

  function renderAttachmentHtml(att) {
    if (!att || !att.url) return '';
    if (att.type === 'image') {
      return `<img src="${esc(att.url)}" alt="${esc(att.name || 'Photo')}" class="sr-ho-img-thumb" data-ho-lightbox-url="${esc(att.url)}" data-ho-lightbox-name="${esc(att.name || 'handover-photo.jpg')}" loading="lazy" />`;
    }
    if (att.type === 'voice') {
      const uid = 'vo_' + String(att.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      return `
        <div class="sr-ho-voice-card" data-voice-card="${uid}">
          <button type="button" class="sr-ho-voice-play" data-voice-play="${uid}" aria-label="Play voice note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </button>
          <div class="sr-ho-voice-track-wrap">
            <div class="sr-ho-voice-bar" data-voice-bar="${uid}">
              <div class="sr-ho-voice-fill" data-voice-fill="${uid}"></div>
            </div>
            <div class="sr-ho-voice-meta">
              <span>Voice Note</span>
              <span data-voice-time="${uid}">${formatDuration(att.durationSec || 0)}</span>
            </div>
          </div>
          <audio preload="metadata" src="${esc(att.url)}" data-voice-audio="${uid}" style="display:none;"></audio>
        </div>
      `;
    }
    return `
      <a class="sr-ho-file-card" href="${esc(att.url)}" download="${esc(att.name || 'document')}" target="_blank" rel="noopener noreferrer">
        <span class="sr-ho-file-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </span>
        <span class="sr-ho-file-meta">
          <span class="sr-ho-file-name">${esc(att.name || 'Attachment')}</span>
          <span class="sr-ho-file-size">${formatBytes(att.sizeBytes)} &middot; Tap to download</span>
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
      </a>
    `;
  }

  function renderBubbleHtml(item, user, isSupervisorView) {
    const condClass = item.shiftStatus === 'red' ? 'is-blocker' : item.shiftStatus === 'amber' ? 'is-flag' : 'is-normal';
    const condShort = item.condition === 'All Systems Normal' ? 'Normal' : item.condition;
    const isSupervisorUser = isSupervisorView || ['supervisor', 'manager', 'owner'].includes(String(user.role || '').toLowerCase());

    const statusIcon = item.status === 'acknowledged'
      ? '<span title="Acknowledged" style="color:#0284c7;font-weight:800;">&#10003;&#10003; Acknowledged</span>'
      : item.status === 'relayed'
        ? '<span title="Relayed" style="color:#059669;font-weight:700;">&#10003;&#10003; Relayed</span>'
        : '<span title="Sent">&#10003; Sent</span>';

    let actionBtn = '';
    if (isSupervisorUser && item.status === 'awaiting_review' && !item.isMe) {
      actionBtn = `<button type="button" class="sr-ho-inline-action" data-ho-action="relay" data-ho-id="${esc(item.id)}">Approve &amp; Relay</button>`;
    } else if (!item.isMe && item.status !== 'acknowledged') {
      actionBtn = `<button type="button" class="sr-ho-inline-action" data-ho-action="acknowledge" data-ho-id="${esc(item.id)}">Accept Takeover</button>`;
    }

    const attHtml = item.attachments.length
      ? `<div class="sr-ho-attachments">${item.attachments.map(renderAttachmentHtml).join('')}</div>`
      : '';

    return `
      <div class="sr-ho-row ${item.isMe ? 'is-me' : 'is-other'}" data-ho-msg-id="${esc(item.id)}">
        <div class="sr-ho-bubble">
          <div class="sr-ho-bubble-head">
            <span class="sr-ho-sender">${item.isMe ? 'You' : esc(item.authorName)} &middot; <span style="font-weight:600;opacity:0.78;">${esc(item.station)}</span></span>
            <span class="sr-ho-cond-chip ${condClass}">${esc(condShort)}</span>
          </div>
          ${item.summary ? `<p class="sr-ho-text">${esc(item.summary)}</p>` : ''}
          ${attHtml}
          <div class="sr-ho-bubble-foot">
            ${actionBtn}
            <span class="sr-ho-time-status">
              <span>${esc(formatTime(item.createdAt))}</span>
              <span>&middot;</span>
              ${statusIcon}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  async function mount(container, { user, profile, mode = 'worker', headerActionsHtml = '', onHeaderBind = null } = {}) {
    if (!container || !user) return;
    injectStyles();

    const isSup = mode === 'supervisor';
    const secondCondLabel = profile?.key === 'tech' ? 'Service / Build Flag' : 'Operational Flag';
    const thirdCondLabel = profile?.key === 'tech' ? 'Access / Blocker Note' : 'Resource / Supply Blocker';

    let handovers = [];
    try {
      const res = await fetch('/api/handovers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        handovers = Array.isArray(data.handovers) ? data.handovers.map((h) => normalizeHandoverItem(h, user)) : [];
      }
    } catch (_) {}

    // Sort oldest -> newest like WhatsApp so latest sits right above composer
    handovers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const pendingCount = handovers.filter((h) => h.status !== 'acknowledged' && !h.isMe).length;

    container.innerHTML = `
      <div class="sr-v2-page-head" style="margin-bottom:12px;">
        <div class="sr-v2-page-title-wrap">
          <h2 class="sr-v2-page-title">
            <span>${isSup ? 'Handovers' : 'Handover'}</span>
            ${pendingCount > 0 ? `<span class="sr-v2-tab-badge">${pendingCount} Active</span>` : ''}
          </h2>
          <p class="sr-v2-page-sub">${esc(user.department || profile?.departments?.[0] || 'Operations')} &middot; Persistent Shift Handover Stream</p>
        </div>
        <div class="sr-v2-page-actions">
          ${headerActionsHtml || `<span class="sr-v2-pill-meta" id="sr-ho-total-count">${handovers.length} Saved in DB</span>`}
        </div>
      </div>

      <div class="sr-ho-chat-shell" id="sr-ho-chat-shell">
        <div class="sr-ho-chat-topbar">
          <div class="sr-ho-chat-title-row">
            <span class="sr-ho-channel-avatar" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </span>
            <div class="sr-ho-chat-title-meta">
              <h3>${esc(user.organisation_name || 'ShiftRelay Team')} &bull; Shift Relay</h3>
              <p><span class="sr-ho-live-dot"></span>Persistent database log &middot; Photos, files &amp; voice notes</p>
            </div>
          </div>
          <button type="button" id="sr-ho-refresh-btn" class="sr-btn sr-btn-secondary" style="min-height:32px;height:32px;padding:0 10px;font-size:11.5px;" title="Sync latest handovers">Sync</button>
        </div>

        <div class="sr-ho-messages" id="sr-ho-messages" aria-live="polite"></div>

        <div class="sr-ho-composer-wrap">
          <!-- '+' Popover Menu -->
          <div class="sr-ho-plus-menu" id="sr-ho-plus-menu" role="menu">
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-camera" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(16,185,129,0.14);color:#059669;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              </span>
              <span>Camera Photo</span>
            </button>
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-gallery" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(2,132,199,0.14);color:#0284c7;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </span>
              <span>Photo Gallery</span>
            </button>
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-file" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(245,158,11,0.16);color:#d97706;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </span>
              <span>Attach Document</span>
            </button>
          </div>

          <input type="file" id="sr-ho-input-camera" accept="image/*" capture="environment" style="display:none;" />
          <input type="file" id="sr-ho-input-gallery" accept="image/*" style="display:none;" />
          <input type="file" id="sr-ho-input-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,text/plain,text/csv" style="display:none;" />

          <!-- Status Selector Pills -->
          <div class="sr-ho-cond-strip" id="sr-ho-cond-strip">
            <button type="button" class="sr-ho-cond-pill is-active" data-cond="All Systems Normal" data-level="green">Normal</button>
            <button type="button" class="sr-ho-cond-pill" data-cond="${esc(secondCondLabel)}" data-level="amber">${esc(secondCondLabel)}</button>
            <button type="button" class="sr-ho-cond-pill" data-cond="${esc(thirdCondLabel)}" data-level="red">${esc(thirdCondLabel)}</button>
          </div>

          <!-- Staged Attachments Preview -->
          <div class="sr-ho-staging" id="sr-ho-staging" style="display:none;"></div>

          <!-- Live Voice Recording Strip -->
          <div class="sr-ho-rec-bar" id="sr-ho-rec-bar">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="sr-ho-rec-dot"></span>
              <span class="sr-ho-rec-timer" id="sr-ho-rec-timer">00:00</span>
              <span style="font-size:12px;color:var(--sr-text-muted);">Recording voice note…</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" id="sr-ho-rec-cancel" class="sr-btn sr-btn-secondary" style="min-height:32px;height:32px;padding:0 10px;font-size:11.5px;">Cancel</button>
              <button type="button" id="sr-ho-rec-send" class="sr-btn sr-btn-primary" style="min-height:32px;height:32px;padding:0 12px;font-size:11.5px;">Send Voice</button>
            </div>
          </div>

          <!-- Standard Input Bar -->
          <div class="sr-ho-bar" id="sr-ho-bar">
            <button type="button" class="sr-ho-plus-btn" id="sr-ho-plus-btn" aria-label="Attach camera photo or file" title="Camera, photo, or file">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <textarea id="sr-ho-text-input" class="sr-ho-input" rows="1" placeholder="Write a handover update for the next shift…"></textarea>
            <button type="button" class="sr-ho-action-btn sr-ho-voice-trigger" id="sr-ho-voice-btn" aria-label="Record voice note" title="Record voice note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <button type="button" class="sr-ho-action-btn" id="sr-ho-send-btn" aria-label="Send handover" title="Send handover">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    if (typeof onHeaderBind === 'function') {
      onHeaderBind(handovers);
    }

    const msgBox = document.getElementById('sr-ho-messages');
    const textInput = document.getElementById('sr-ho-text-input');
    const plusBtn = document.getElementById('sr-ho-plus-btn');
    const plusMenu = document.getElementById('sr-ho-plus-menu');
    const stagingEl = document.getElementById('sr-ho-staging');
    const sendBtn = document.getElementById('sr-ho-send-btn');
    const voiceBtn = document.getElementById('sr-ho-voice-btn');
    const barEl = document.getElementById('sr-ho-bar');
    const recBar = document.getElementById('sr-ho-rec-bar');
    const recTimerEl = document.getElementById('sr-ho-rec-timer');

    let selectedCond = 'All Systems Normal';
    let selectedLevel = 'green';
    let stagedAttachments = [];
    let mediaRecorder = null;
    let recStream = null;
    let recChunks = [];
    let recInterval = null;
    let recStartedAt = 0;
    let recCancelFlag = false;

    function bindVoicePlayers() {
      msgBox.querySelectorAll('[data-voice-card]').forEach((card) => {
        const uid = card.getAttribute('data-voice-card');
        const audio = card.querySelector(`[data-voice-audio="${uid}"]`);
        const playBtn = card.querySelector(`[data-voice-play="${uid}"]`);
        const fill = card.querySelector(`[data-voice-fill="${uid}"]`);
        const bar = card.querySelector(`[data-voice-bar="${uid}"]`);
        const timeEl = card.querySelector(`[data-voice-time="${uid}"]`);
        if (!audio || !playBtn) return;

        const PLAY_ICO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
        const PAUSE_ICO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

        playBtn.addEventListener('click', () => {
          if (audio.paused) {
            msgBox.querySelectorAll('audio').forEach((other) => {
              if (other !== audio && !other.paused) other.pause();
            });
            audio.play().catch(() => {});
          } else {
            audio.pause();
          }
        });
        audio.addEventListener('play', () => { playBtn.innerHTML = PAUSE_ICO; });
        audio.addEventListener('pause', () => { playBtn.innerHTML = PLAY_ICO; });
        audio.addEventListener('ended', () => {
          playBtn.innerHTML = PLAY_ICO;
          if (fill) fill.style.width = '0%';
        });
        audio.addEventListener('timeupdate', () => {
          const dur = audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0;
          if (dur > 0 && fill) fill.style.width = `${Math.min(100, (audio.currentTime / dur) * 100)}%`;
          if (timeEl && dur > 0) timeEl.textContent = formatDuration(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', () => {
          if (timeEl && audio.duration && Number.isFinite(audio.duration)) {
            timeEl.textContent = formatDuration(audio.duration);
          }
        });
        bar?.addEventListener('click', (e) => {
          if (!audio.duration || !Number.isFinite(audio.duration)) return;
          const rect = bar.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          audio.currentTime = pct * audio.duration;
        });
      });
    }

    function renderThread(scrollToBottom = true) {
      if (!handovers.length) {
        msgBox.innerHTML = `
          <div style="margin:auto;text-align:center;max-width:290px;padding:24px 12px;color:var(--sr-text-muted);">
            <div style="width:46px;height:46px;border-radius:14px;background:rgba(16,185,129,0.12);color:#059669;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style="font-size:14px;font-weight:800;color:var(--sr-text-main);margin-bottom:4px;">Your Shift Handover Thread</div>
            <div style="font-size:12.5px;line-height:1.5;">Send notes, camera photos, documents, or voice notes below. Everything stays permanently saved in your team's handover history.</div>
          </div>
        `;
        return;
      }

      let lastGroup = '';
      const chunks = [];
      for (const item of handovers) {
        const g = formatDateGroup(item.createdAt);
        if (g !== lastGroup) {
          chunks.push(`<div class="sr-ho-date-divider">${esc(g)}</div>`);
          lastGroup = g;
        }
        chunks.push(renderBubbleHtml(item, user, isSup));
      }
      msgBox.innerHTML = chunks.join('');

      msgBox.querySelectorAll('[data-ho-lightbox-url]').forEach((img) => {
        img.addEventListener('click', () => openLightbox(img.dataset.hoLightboxUrl, img.dataset.hoLightboxName));
      });

      msgBox.querySelectorAll('[data-ho-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.hoId;
          const act = btn.dataset.hoAction;
          btn.disabled = true;
          try {
            const r = await fetch(`/api/handovers/${encodeURIComponent(id)}/${act}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': `idem_ho_${act}_${id}_${Date.now()}`
              },
              credentials: 'include'
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || 'Could not update handover.');
            const idx = handovers.findIndex((x) => x.id === id);
            if (idx >= 0 && d.handover) handovers[idx] = normalizeHandoverItem(d.handover, user);
            else if (idx >= 0) handovers[idx].status = act === 'relay' ? 'relayed' : 'acknowledged';
            renderThread(false);
            if (typeof window.toast === 'function') {
              window.toast(act === 'relay' ? 'Handover approved and relayed to incoming shift.' : 'Handover takeover acknowledged.');
            }
          } catch (err) {
            btn.disabled = false;
            if (typeof window.toast === 'function') window.toast(err.message);
          }
        });
      });

      bindVoicePlayers();
      const countEl = document.getElementById('sr-ho-total-count');
      if (countEl) countEl.textContent = `${handovers.length} Saved in DB`;
      if (scrollToBottom) {
        requestAnimationFrame(() => { msgBox.scrollTop = msgBox.scrollHeight; });
      }
    }

    function renderStaging() {
      if (!stagedAttachments.length) {
        stagingEl.style.display = 'none';
        stagingEl.innerHTML = '';
        return;
      }
      stagingEl.style.display = 'flex';
      stagingEl.innerHTML = stagedAttachments.map((att, idx) => `
        <div class="sr-ho-stage-chip">
          ${att.type === 'image' ? `<img src="${esc(att.url)}" alt="" />` : ''}
          <span>${esc(att.name)}</span>
          <button type="button" class="sr-ho-stage-rm" data-stage-rm="${idx}" aria-label="Remove attachment">&times;</button>
        </div>
      `).join('');
      stagingEl.querySelectorAll('[data-stage-rm]').forEach((b) => {
        b.addEventListener('click', () => {
          stagedAttachments.splice(Number(b.dataset.stageRm), 1);
          renderStaging();
        });
      });
    }

    async function sendHandoverMessage(extraAttachments = []) {
      const text = String(textInput?.value || '').trim();
      const allAtts = [...stagedAttachments, ...extraAttachments];
      if (!text && allAtts.length === 0) {
        textInput?.focus();
        return;
      }
      sendBtn.disabled = true;
      try {
        const res = await fetch('/api/handovers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `idem_ho_chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
          },
          credentials: 'include',
          body: JSON.stringify({
            notes: text,
            assignedTo: 'team',
            shiftStatus: selectedLevel,
            attachments: allAtts,
            handover: {
              author: user.name || 'Shift Specialist',
              authorRole: user.title || user.role || 'Shift Specialist',
              station: user.department || profile?.zones?.[0]?.name || 'Operations Desk',
              condition: selectedCond,
              summary: text,
              attachments: allAtts
            }
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not save handover.');
        if (data.handover) {
          const item = normalizeHandoverItem(data.handover, user);
          if (!handovers.some((h) => h.id === item.id)) handovers.push(item);
        }
        if (textInput) {
          textInput.value = '';
          textInput.style.height = 'auto';
        }
        stagedAttachments = [];
        renderStaging();
        renderThread(true);
        if (typeof window.SRAudio?.playClockIn === 'function') window.SRAudio.playClockIn();
      } catch (err) {
        if (typeof window.toast === 'function') window.toast(err.message || 'Handover failed to send.');
      } finally {
        sendBtn.disabled = false;
      }
    }

    // Condition pill switching
    container.querySelectorAll('.sr-ho-cond-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.sr-ho-cond-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        selectedCond = pill.dataset.cond || 'All Systems Normal';
        selectedLevel = pill.dataset.level || 'green';
      });
    });

    // '+' Menu toggle
    function togglePlusMenu(force) {
      const next = typeof force === 'boolean' ? force : !plusMenu.classList.contains('is-open');
      plusMenu.classList.toggle('is-open', next);
      plusBtn.classList.toggle('is-open', next);
    }
    plusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlusMenu();
    });
    document.addEventListener('click', (e) => {
      if (plusMenu.classList.contains('is-open') && !plusMenu.contains(e.target) && e.target !== plusBtn) {
        togglePlusMenu(false);
      }
    });

    const camInput = document.getElementById('sr-ho-input-camera');
    const galInput = document.getElementById('sr-ho-input-gallery');
    const fileInput = document.getElementById('sr-ho-input-file');

    document.getElementById('sr-ho-pick-camera')?.addEventListener('click', () => { togglePlusMenu(false); camInput?.click(); });
    document.getElementById('sr-ho-pick-gallery')?.addEventListener('click', () => { togglePlusMenu(false); galInput?.click(); });
    document.getElementById('sr-ho-pick-file')?.addEventListener('click', () => { togglePlusMenu(false); fileInput?.click(); });

    async function handleSelectedFile(file, kind) {
      if (!file) return;
      if (typeof window.toast === 'function') window.toast(`Uploading ${file.name}…`);
      try {
        let dataUrl, mimeType;
        if (kind === 'image') {
          const compressed = await compressImageFile(file);
          dataUrl = compressed.dataUrl;
          mimeType = compressed.mimeType;
        } else {
          if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5 MB.');
          dataUrl = await readFileAsDataUrl(file);
          mimeType = file.type || 'application/octet-stream';
        }
        const att = await uploadHandoverMedia({
          type: kind,
          name: file.name || (kind === 'image' ? 'camera-photo.jpg' : 'document'),
          mimeType,
          dataUrl
        });
        stagedAttachments.push(att);
        renderStaging();
        if (typeof window.toast === 'function') window.toast(`${att.name} ready to send.`);
      } catch (err) {
        if (typeof window.toast === 'function') window.toast(err.message || 'Upload failed.');
      }
    }

    camInput?.addEventListener('change', async (e) => { await handleSelectedFile(e.target.files?.[0], 'image'); camInput.value = ''; });
    galInput?.addEventListener('change', async (e) => { await handleSelectedFile(e.target.files?.[0], 'image'); galInput.value = ''; });
    fileInput?.addEventListener('change', async (e) => { await handleSelectedFile(e.target.files?.[0], 'file'); fileInput.value = ''; });

    // Voice Note Recording (iOS Safari + Android Chrome)
    function stopRecordingTracks() {
      if (recInterval) { clearInterval(recInterval); recInterval = null; }
      if (recStream) {
        recStream.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
        recStream = null;
      }
      recBar.classList.remove('is-active');
      barEl.style.display = 'flex';
    }

    voiceBtn?.addEventListener('click', async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        if (typeof window.toast === 'function') window.toast('Voice note recording is not supported in this browser.');
        return;
      }
      try {
        recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeCandidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
        const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
        mediaRecorder = chosenMime ? new MediaRecorder(recStream, { mimeType: chosenMime }) : new MediaRecorder(recStream);
        recChunks = [];
        recCancelFlag = false;
        recStartedAt = Date.now();

        mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) recChunks.push(ev.data);
        };
        mediaRecorder.onstop = async () => {
          const durationSec = Math.max(1, Math.round((Date.now() - recStartedAt) / 1000));
          const mime = (mediaRecorder?.mimeType || chosenMime || 'audio/webm').split(';')[0];
          const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
          stopRecordingTracks();
          if (recCancelFlag || !recChunks.length) return;
          const blob = new Blob(recChunks, { type: mime });
          try {
            if (typeof window.toast === 'function') window.toast('Saving voice note…');
            const dataUrl = await readFileAsDataUrl(blob);
            const att = await uploadHandoverMedia({
              type: 'voice',
              name: `voice-handover-${Date.now()}.${ext}`,
              mimeType: mime,
              dataUrl,
              durationSec
            });
            await sendHandoverMessage([att]);
          } catch (err) {
            if (typeof window.toast === 'function') window.toast(err.message || 'Could not save voice note.');
          }
        };

        barEl.style.display = 'none';
        recBar.classList.add('is-active');
        recTimerEl.textContent = '00:00';
        recInterval = setInterval(() => {
          const s = Math.floor((Date.now() - recStartedAt) / 1000);
          recTimerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
          if (s >= 180 && mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, 300);
        mediaRecorder.start();
      } catch (err) {
        stopRecordingTracks();
        if (typeof window.toast === 'function') window.toast('Microphone permission is required to record a voice note.');
      }
    });

    document.getElementById('sr-ho-rec-cancel')?.addEventListener('click', () => {
      recCancelFlag = true;
      if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
      else stopRecordingTracks();
    });
    document.getElementById('sr-ho-rec-send')?.addEventListener('click', () => {
      recCancelFlag = false;
      if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    });

    textInput?.addEventListener('input', () => {
      textInput.style.height = 'auto';
      textInput.style.height = Math.min(112, textInput.scrollHeight) + 'px';
    });
    textInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
        e.preventDefault();
        sendHandoverMessage();
      }
    });
    sendBtn?.addEventListener('click', () => sendHandoverMessage());

    document.getElementById('sr-ho-refresh-btn')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/handovers', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          handovers = (data.handovers || []).map((h) => normalizeHandoverItem(h, user));
          handovers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          renderThread(true);
          if (typeof window.toast === 'function') window.toast('Handover history synced.');
        }
      } catch (_) {}
    });

    renderThread(true);
  }

  window.ShiftRelayHandoverChat = { mount };
})();
