/**
 * ShiftRelay 2026 Flagship Shift Handover Chat Engine
 * - Chronological persistent thread backed 100% by PostgreSQL / server API (/api/handovers)
 * - 2026 Spatial Liquid-Glass UI: unified header, quick filter pills, sender avatars,
 *   precision Lucide SVG checkmarks, floating pill composer, frosted 2x2 '+' attachment sheet
 * - 26-bar interactive acoustic waveform Voice Note player with 1x / 1.5x / 2x playback speed
 * - Live animated equalizer Voice Note recorder (iOS Safari audio/mp4 + Chrome/Android audio/webm)
 * - Supervisor Relay & Incoming Takeover actions inline inside the conversation stream
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

  function getInitials(name) {
    const parts = String(name || 'SR').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'SR';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatarHue(name) {
    let h = 0;
    const s = String(name || 'ShiftRelay');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    const palettes = [
      'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
      'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)'
    ];
    return palettes[h % palettes.length];
  }

  function generateWaveformBars(seedStr, count = 26) {
    let seed = 2166136261;
    const s = String(seedStr || 'voice');
    for (let i = 0; i < s.length; i++) {
      seed ^= s.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    const bars = [];
    for (let i = 0; i < count; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const env = Math.sin(((i + 0.5) / count) * Math.PI); // gentle speech envelope
      const raw = (seed % 100) / 100;
      const heightPct = Math.round(24 + (0.35 + 0.65 * env) * (raw * 72));
      bars.push(Math.max(22, Math.min(98, heightPct)));
    }
    return bars;
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
    const prev = document.getElementById(STYLE_ID);
    if (prev) prev.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Hide floating support FAB inside Handover Chat so composer controls stay 100% unobstructed */
      body:has(#sr-ho-chat-shell) #sr-btn-floating-ai,
      body:has(#sr-ho-chat-shell) .sr-floating-ai-beacon,
      body:has(#sr-ho-chat-shell) #sr-chat-fab,
      body:has(#sr-ho-chat-shell) .sr-chat-fab {
        display: none !important;
      }

      @keyframes srHoMsgIn {
        from { opacity: 0; transform: translateY(8px) scale(0.985); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes srHoSheetPop {
        from { opacity: 0; transform: translateY(12px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes srHoSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes srHoPulseBeacon {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
        50%      { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
      }
      @keyframes srHoEqWave {
        0%, 100% { transform: scaleY(0.32); }
        50%      { transform: scaleY(1); }
      }
      @keyframes srRecBlink {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.25; }
      }

      /* ── Main 2026 Spatial Chat Shell ── */
      .sr-ho-chat-shell {
        position: relative;
        display: flex;
        flex-direction: column;
        border-radius: 24px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: #ffffff;
        overflow: hidden;
        box-shadow:
          0 16px 42px -12px rgba(15, 23, 42, 0.1),
          0 2px 6px rgba(15, 23, 42, 0.04);
        height: calc(100dvh - 152px);
        min-height: 460px;
        max-height: 760px;
      }
      [data-theme="dark"] .sr-ho-chat-shell {
        background: #0a121b;
        border-color: rgba(148, 163, 184, 0.14);
        box-shadow:
          0 22px 54px -14px rgba(0, 0, 0, 0.65),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }
      @media (max-width: 767px) {
        .sr-ho-chat-shell {
          height: calc(100dvh - 144px);
          min-height: 420px;
          max-height: none;
          border-radius: 22px;
        }
        /* Extra clearance when Supervisor dual-mode bar is visible */
        body:has(.sr-sup-mobile-mode-bar) .sr-ho-chat-shell {
          height: calc(100dvh - 196px);
          min-height: 390px;
        }
      }

      /* ── Unified Frosted Spatial Top Bar ── */
      .sr-ho-chat-topbar {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 12px 14px 10px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        flex-shrink: 0;
        z-index: 4;
      }
      [data-theme="dark"] .sr-ho-chat-topbar {
        background: rgba(13, 22, 33, 0.86);
        border-bottom-color: rgba(148, 163, 184, 0.12);
      }
      .sr-ho-topbar-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
      }
      .sr-ho-chat-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex: 1;
      }
      .sr-ho-channel-avatar {
        width: 38px;
        height: 38px;
        border-radius: 13px;
        background: linear-gradient(145deg, #10b981 0%, #059669 55%, #0d9488 100%);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 6px 16px -4px rgba(5, 150, 105, 0.45), inset 0 1px 0 rgba(255,255,255,0.28);
      }
      .sr-ho-chat-title-meta {
        min-width: 0;
        flex: 1;
      }
      .sr-ho-title-line {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .sr-ho-chat-title-meta h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--sr-text-main, #0f172a);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sr-ho-pending-pill {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.14);
        border: 1px solid rgba(245, 158, 11, 0.3);
        color: #b45309;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.01em;
        flex-shrink: 0;
      }
      [data-theme="dark"] .sr-ho-pending-pill {
        background: rgba(245, 158, 11, 0.18);
        color: #fcd34d;
      }
      .sr-ho-chat-title-meta p {
        margin: 2px 0 0;
        font-size: 11.5px;
        font-weight: 500;
        color: var(--sr-text-muted, #64748b);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .sr-ho-live-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        flex-shrink: 0;
        animation: srHoPulseBeacon 2.4s ease-in-out infinite;
      }

      .sr-ho-topbar-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .sr-ho-icon-pill {
        height: 34px;
        min-width: 34px;
        padding: 0 9px;
        border-radius: 11px;
        border: 1px solid rgba(15, 23, 42, 0.09);
        background: rgba(15, 23, 42, 0.035);
        color: var(--sr-text-main, #0f172a);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.16s ease, border-color 0.16s ease, transform 0.12s ease;
      }
      .sr-ho-icon-pill.is-icon-only { padding: 0; width: 34px; }
      .sr-ho-icon-pill:hover {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.35);
        color: #059669;
      }
      .sr-ho-icon-pill:active { transform: scale(0.93); }
      .sr-ho-icon-pill.is-spinning svg { animation: srHoSpin 0.7s linear infinite; }
      [data-theme="dark"] .sr-ho-icon-pill {
        background: rgba(255, 255, 255, 0.055);
        border-color: rgba(148, 163, 184, 0.16);
        color: #e2e8f0;
      }
      [data-theme="dark"] .sr-ho-icon-pill:hover {
        background: rgba(16, 185, 129, 0.16);
        border-color: rgba(52, 211, 153, 0.38);
        color: #34d399;
      }

      /* ── Filter Pills Strip inside Top Bar ── */
      .sr-ho-filter-row {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 1px;
      }
      .sr-ho-filter-row::-webkit-scrollbar { display: none; }
      .sr-ho-filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        background: rgba(15, 23, 42, 0.03);
        color: var(--sr-text-muted, #475569);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      [data-theme="dark"] .sr-ho-filter-chip {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(148, 163, 184, 0.14);
        color: #94a3b8;
      }
      .sr-ho-filter-chip.is-active {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
        box-shadow: 0 3px 10px rgba(15, 23, 42, 0.16);
      }
      [data-theme="dark"] .sr-ho-filter-chip.is-active {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(52, 211, 153, 0.45);
        color: #6ee7b7;
        box-shadow: 0 2px 10px rgba(16, 185, 129, 0.16);
      }
      .sr-ho-filter-count {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        opacity: 0.78;
      }

      /* ── Architectural Spatial Chat Canvas ── */
      .sr-ho-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 11px;
        background-color: #f4f7f9;
        background-image:
          radial-gradient(rgba(15, 23, 42, 0.055) 1px, transparent 1px),
          radial-gradient(circle at 12% 18%, rgba(16, 185, 129, 0.07), transparent 46%),
          radial-gradient(circle at 88% 82%, rgba(14, 165, 233, 0.06), transparent 50%);
        background-size: 20px 20px, 100% 100%, 100% 100%;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }
      [data-theme="dark"] .sr-ho-messages {
        background-color: #070e15;
        background-image:
          radial-gradient(rgba(148, 163, 184, 0.075) 1px, transparent 1px),
          radial-gradient(circle at 14% 16%, rgba(16, 185, 129, 0.08), transparent 48%),
          radial-gradient(circle at 86% 84%, rgba(56, 189, 248, 0.055), transparent 52%);
        background-size: 22px 22px, 100% 100%, 100% 100%;
      }

      /* Jump to Latest Floating Glass Pill */
      .sr-ho-jump-latest {
        position: absolute;
        right: 14px;
        bottom: 112px;
        z-index: 12;
        display: none;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(15, 23, 42, 0.1);
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: #0f172a;
        font-size: 11.5px;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .sr-ho-jump-latest.is-visible { display: inline-flex; }
      .sr-ho-jump-latest:active { transform: scale(0.95); }
      [data-theme="dark"] .sr-ho-jump-latest {
        background: rgba(15, 27, 39, 0.9);
        border-color: rgba(148, 163, 184, 0.22);
        color: #e2e8f0;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.48);
      }

      /* ── Frosted Date Divider Pill ── */
      .sr-ho-date-divider {
        align-self: center;
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(15, 23, 42, 0.07);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #475569;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        margin: 4px 0 2px;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      }
      [data-theme="dark"] .sr-ho-date-divider {
        background: rgba(22, 34, 48, 0.84);
        border-color: rgba(148, 163, 184, 0.16);
        color: #94a3b8;
      }

      /* ── Message Rows & Avatars ── */
      .sr-ho-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        max-width: 86%;
        animation: srHoMsgIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @media (max-width: 480px) {
        .sr-ho-row { max-width: 92%; }
      }
      .sr-ho-row.is-me {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      .sr-ho-row.is-other {
        align-self: flex-start;
      }
      .sr-ho-sender-avatar {
        width: 28px;
        height: 28px;
        border-radius: 10px;
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 3px 10px rgba(15, 23, 42, 0.16);
      }

      /* ── 2026 Tactile Message Bubbles ── */
      .sr-ho-bubble {
        position: relative;
        padding: 10px 12px 8px;
        border-radius: 19px;
        word-break: break-word;
        overflow-wrap: break-word;
        min-width: 0;
        flex: 1;
        box-sizing: border-box;
      }
      .sr-ho-row.is-me .sr-ho-bubble {
        background: linear-gradient(155deg, #ecfdf5 0%, #d7f8e8 100%);
        border: 1px solid rgba(5, 150, 105, 0.2);
        border-bottom-right-radius: 5px;
        color: #064e3b;
        box-shadow:
          0 4px 14px -4px rgba(5, 150, 105, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.72);
      }
      [data-theme="dark"] .sr-ho-row.is-me .sr-ho-bubble {
        background: linear-gradient(155deg, #064e3b 0%, #042f26 100%);
        border-color: rgba(52, 211, 153, 0.28);
        color: #ecfdf5;
        box-shadow:
          0 8px 22px -6px rgba(0, 0, 0, 0.45),
          inset 0 1px 0 rgba(52, 211, 153, 0.18);
      }
      .sr-ho-row.is-other .sr-ho-bubble {
        background: #ffffff;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-bottom-left-radius: 5px;
        color: #0f172a;
        box-shadow:
          0 4px 14px -4px rgba(15, 23, 42, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }
      [data-theme="dark"] .sr-ho-row.is-other .sr-ho-bubble {
        background: linear-gradient(155deg, #132130 0%, #0f1a26 100%);
        border-color: rgba(148, 163, 184, 0.16);
        color: #f1f5f9;
        box-shadow:
          0 8px 22px -6px rgba(0, 0, 0, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
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
        font-size: 11.5px;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: #047857;
      }
      [data-theme="dark"] .sr-ho-sender { color: #34d399; }
      .sr-ho-row.is-other .sr-ho-sender { color: #0284c7; }
      [data-theme="dark"] .sr-ho-row.is-other .sr-ho-sender { color: #38bdf8; }
      .sr-ho-station-tag {
        font-weight: 600;
        opacity: 0.72;
      }

      .sr-ho-cond-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.015em;
      }
      .sr-ho-cond-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
      }
      .sr-ho-cond-chip.is-normal {
        background: rgba(16, 185, 129, 0.14);
        color: #047857;
      }
      [data-theme="dark"] .sr-ho-cond-chip.is-normal { background: rgba(16, 185, 129, 0.18); color: #6ee7b7; }
      .sr-ho-cond-chip.is-flag {
        background: rgba(245, 158, 11, 0.16);
        color: #b45309;
      }
      [data-theme="dark"] .sr-ho-cond-chip.is-flag { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
      .sr-ho-cond-chip.is-blocker {
        background: rgba(239, 68, 68, 0.15);
        color: #b91c1c;
      }
      [data-theme="dark"] .sr-ho-cond-chip.is-blocker { background: rgba(239, 68, 68, 0.22); color: #fca5a5; }

      .sr-ho-text {
        font-size: 13.5px;
        line-height: 1.5;
        white-space: pre-wrap;
        margin: 0;
      }

      /* ── Attachments: Photos, Docs, 2026 Waveform Voice Notes ── */
      .sr-ho-attachments {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .sr-ho-img-wrap {
        position: relative;
        display: inline-block;
        max-width: 248px;
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid rgba(15, 23, 42, 0.12);
        cursor: zoom-in;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
      }
      .sr-ho-img-thumb {
        width: 100%;
        max-height: 172px;
        object-fit: cover;
        display: block;
        transition: transform 0.22s ease;
      }
      .sr-ho-img-wrap:hover .sr-ho-img-thumb { transform: scale(1.025); }

      .sr-ho-file-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 11px;
        border-radius: 13px;
        background: rgba(15, 23, 42, 0.048);
        border: 1px solid rgba(15, 23, 42, 0.08);
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.12s ease;
      }
      .sr-ho-file-card:hover { background: rgba(16, 185, 129, 0.1); }
      [data-theme="dark"] .sr-ho-file-card {
        background: rgba(255, 255, 255, 0.055);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .sr-ho-file-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(5, 150, 105, 0.14);
        color: #059669;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      [data-theme="dark"] .sr-ho-file-icon { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      .sr-ho-file-meta { flex: 1; min-width: 0; }
      .sr-ho-file-name {
        font-size: 12.5px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .sr-ho-file-size { font-size: 10.5px; opacity: 0.72; }

      /* 2026 Acoustic Waveform Voice Note Card */
      .sr-ho-voice-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 11px;
        border-radius: 15px;
        background: rgba(15, 23, 42, 0.05);
        border: 1px solid rgba(15, 23, 42, 0.08);
        min-width: 215px;
        max-width: 286px;
      }
      [data-theme="dark"] .sr-ho-voice-card {
        background: rgba(255, 255, 255, 0.065);
        border-color: rgba(255, 255, 255, 0.11);
      }
      .sr-ho-voice-play {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.34);
        transition: transform 0.14s ease, box-shadow 0.15s ease;
      }
      .sr-ho-voice-play:active { transform: scale(0.92); }
      .sr-ho-voice-track-wrap {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .sr-ho-waveform {
        display: flex;
        align-items: center;
        gap: 2.5px;
        height: 24px;
        cursor: pointer;
        user-select: none;
      }
      .sr-ho-wave-bar {
        flex: 1;
        min-width: 2px;
        border-radius: 999px;
        background: rgba(100, 116, 139, 0.32);
        transition: background 0.12s ease, transform 0.12s ease;
      }
      [data-theme="dark"] .sr-ho-wave-bar {
        background: rgba(148, 163, 184, 0.32);
      }
      .sr-ho-wave-bar.is-played {
        background: #10b981;
      }
      [data-theme="dark"] .sr-ho-wave-bar.is-played {
        background: #34d399;
      }
      .sr-ho-voice-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        font-size: 10.5px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        opacity: 0.82;
      }
      .sr-ho-speed-btn {
        height: 22px !important;
        min-height: 22px !important;
        min-width: 30px !important;
        padding: 0 7px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(100, 116, 139, 0.28);
        background: rgba(15, 23, 42, 0.055);
        color: inherit;
        font-size: 10px !important;
        font-weight: 800;
        line-height: 20px !important;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      [data-theme="dark"] .sr-ho-speed-btn {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.18);
      }

      /* ── Bubble Footer & Precision Status Checkmarks ── */
      .sr-ho-bubble-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 7px;
        flex-wrap: wrap;
      }
      .sr-ho-time-status {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 10.5px;
        font-weight: 600;
        opacity: 0.78;
      }
      .sr-ho-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-weight: 700;
      }
      .sr-ho-inline-action {
        height: 30px !important;
        min-height: 30px !important;
        padding: 0 12px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(5, 150, 105, 0.34);
        background: rgba(16, 185, 129, 0.13);
        color: #047857;
        font-size: 11px !important;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .sr-ho-inline-action:hover {
        background: #059669;
        color: #ffffff;
        border-color: #059669;
      }
      [data-theme="dark"] .sr-ho-inline-action {
        color: #34d399;
        border-color: rgba(52, 211, 153, 0.35);
      }
      [data-theme="dark"] .sr-ho-inline-action:hover {
        background: #10b981;
        color: #032219;
      }

      /* ── 2026 Floating Glass Pill Composer Area ── */
      .sr-ho-composer-wrap {
        position: relative;
        border-top: 1px solid rgba(15, 23, 42, 0.07);
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        padding: 8px 10px 10px;
        flex-shrink: 0;
        z-index: 6;
      }
      [data-theme="dark"] .sr-ho-composer-wrap {
        background: rgba(13, 22, 33, 0.92);
        border-top-color: rgba(148, 163, 184, 0.12);
      }

      /* Compact Segmented Condition Bar — fits 100% cleanly on 320px+ phones */
      .sr-ho-cond-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4px;
        padding: 3px;
        margin-bottom: 8px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.045);
        border: 1px solid rgba(15, 23, 42, 0.06);
      }
      [data-theme="dark"] .sr-ho-cond-strip {
        background: rgba(255, 255, 255, 0.045);
        border-color: rgba(148, 163, 184, 0.12);
      }
      .sr-ho-cond-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 5px 6px;
        border-radius: 9px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--sr-text-muted, #64748b);
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .sr-ho-cond-pill-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .sr-ho-cond-pill[data-level="green"] .sr-ho-cond-pill-dot { background: #10b981; }
      .sr-ho-cond-pill[data-level="amber"] .sr-ho-cond-pill-dot { background: #f59e0b; }
      .sr-ho-cond-pill[data-level="red"] .sr-ho-cond-pill-dot   { background: #ef4444; }
      .sr-ho-cond-pill.is-active {
        background: #ffffff;
        border-color: rgba(15, 23, 42, 0.08);
        color: #0f172a;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
      }
      [data-theme="dark"] .sr-ho-cond-pill.is-active {
        background: #172536;
        border-color: rgba(148, 163, 184, 0.22);
        color: #f8fafc;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      }

      /* Staged Attachments Chips */
      .sr-ho-staging {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .sr-ho-stage-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 9px;
        border-radius: 11px;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        font-size: 11.5px;
        font-weight: 700;
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
        font-size: 15px;
        line-height: 1;
      }

      /* Unified Floating Pill Input Bar */
      .sr-ho-bar {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        padding: 4px 5px;
        border-radius: 26px;
        border: 1.5px solid rgba(15, 23, 42, 0.1);
        background: #f8fafc;
        transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }
      .sr-ho-bar:focus-within {
        border-color: #10b981;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
      }
      [data-theme="dark"] .sr-ho-bar {
        background: #081018;
        border-color: rgba(148, 163, 184, 0.2);
      }
      [data-theme="dark"] .sr-ho-bar:focus-within {
        border-color: #34d399;
        background: #0a1520;
        box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.16);
      }

      /* Perfect Circular Tactile Controls (+, Mic, Send) */
      .sr-ho-plus-btn,
      .sr-ho-voice-trigger,
      .sr-ho-send-btn {
        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;
        min-height: 38px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
      }
      .sr-ho-plus-btn,
      .sr-ho-voice-trigger {
        background: rgba(15, 23, 42, 0.065);
        color: var(--sr-text-main, #0f172a);
      }
      .sr-ho-plus-btn:hover,
      .sr-ho-voice-trigger:hover {
        background: rgba(16, 185, 129, 0.14);
        color: #059669;
      }
      [data-theme="dark"] .sr-ho-plus-btn,
      [data-theme="dark"] .sr-ho-voice-trigger {
        background: rgba(148, 163, 184, 0.14);
        color: #e2e8f0;
      }
      [data-theme="dark"] .sr-ho-plus-btn:hover,
      [data-theme="dark"] .sr-ho-voice-trigger:hover {
        background: rgba(52, 211, 153, 0.18);
        color: #34d399;
      }
      .sr-ho-plus-btn.is-open {
        transform: rotate(45deg);
        background: rgba(16, 185, 129, 0.18);
        color: #059669;
      }
      [data-theme="dark"] .sr-ho-plus-btn.is-open { color: #34d399; }

      .sr-ho-send-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        box-shadow: 0 5px 14px -3px rgba(5, 150, 105, 0.45);
      }
      .sr-ho-send-btn:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 7px 18px -3px rgba(5, 150, 105, 0.55);
      }
      .sr-ho-send-btn:active:not(:disabled),
      .sr-ho-plus-btn:active,
      .sr-ho-voice-trigger:active {
        transform: scale(0.92);
      }
      .sr-ho-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      #sr-app-shell .sr-ho-input,
      .sr-ho-input {
        flex: 1;
        min-width: 0;
        min-height: 38px !important;
        max-height: 112px;
        padding: 8px 6px !important;
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
        color: var(--sr-text-main, #0f172a) !important;
        font-size: 15px !important;
        font-family: inherit;
        line-height: 1.38;
        resize: none;
        outline: none;
        box-sizing: border-box;
      }
      [data-theme="dark"] #sr-app-shell .sr-ho-input,
      [data-theme="dark"] .sr-ho-input {
        background: transparent !important;
        background-color: transparent !important;
        color: #f8fafc !important;
      }
      .sr-ho-input::placeholder { color: var(--sr-text-muted, #94a3b8); }

      /* ── Frosted Glass 2x2 '+' Attachment Sheet ── */
      .sr-ho-plus-menu {
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 66px;
        z-index: 30;
        max-width: 312px;
        padding: 10px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(22px) saturate(180%);
        -webkit-backdrop-filter: blur(22px) saturate(180%);
        border: 1px solid rgba(15, 23, 42, 0.09);
        box-shadow: 0 22px 48px -12px rgba(15, 23, 42, 0.24);
        display: none;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      [data-theme="dark"] .sr-ho-plus-menu {
        background: rgba(17, 29, 43, 0.94);
        border-color: rgba(148, 163, 184, 0.2);
        box-shadow: 0 24px 54px rgba(0, 0, 0, 0.6);
      }
      .sr-ho-plus-menu.is-open {
        display: grid;
        animation: srHoSheetPop 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .sr-ho-menu-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 7px;
        padding: 11px 11px;
        border-radius: 14px;
        border: 1px solid rgba(15, 23, 42, 0.06);
        background: rgba(15, 23, 42, 0.025);
        color: var(--sr-text-main, #0f172a);
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        text-align: left;
        transition: transform 0.14s ease, background 0.14s ease, border-color 0.14s ease;
      }
      .sr-ho-menu-item:hover {
        background: rgba(16, 185, 129, 0.09);
        border-color: rgba(16, 185, 129, 0.3);
        transform: translateY(-1px);
      }
      [data-theme="dark"] .sr-ho-menu-item {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(148, 163, 184, 0.12);
        color: #f1f5f9;
      }
      [data-theme="dark"] .sr-ho-menu-item:hover {
        background: rgba(52, 211, 153, 0.12);
        border-color: rgba(52, 211, 153, 0.35);
      }
      .sr-ho-menu-ico {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sr-ho-menu-sub {
        font-size: 10.5px;
        font-weight: 500;
        color: var(--sr-text-muted, #64748b);
        margin-top: -5px;
      }

      /* ── Live Animated Equalizer Recording Bar ── */
      .sr-ho-rec-bar {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 7px 10px;
        border-radius: 26px;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(244, 63, 94, 0.06) 100%);
        border: 1.5px solid rgba(239, 68, 68, 0.34);
      }
      .sr-ho-rec-bar.is-active { display: flex; }
      .sr-ho-rec-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ef4444;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.65);
        animation: srRecBlink 1s infinite;
        flex-shrink: 0;
      }
      .sr-ho-rec-timer {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        font-weight: 800;
        color: #ef4444;
        min-width: 42px;
      }
      .sr-ho-rec-eq {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        height: 18px;
      }
      .sr-ho-rec-eq i {
        display: block;
        width: 3px;
        height: 16px;
        border-radius: 99px;
        background: #ef4444;
        animation: srHoEqWave 0.72s ease-in-out infinite;
      }
      .sr-ho-rec-eq i:nth-child(2) { animation-delay: 0.1s; height: 12px; }
      .sr-ho-rec-eq i:nth-child(3) { animation-delay: 0.22s; height: 18px; }
      .sr-ho-rec-eq i:nth-child(4) { animation-delay: 0.34s; height: 10px; }
      .sr-ho-rec-eq i:nth-child(5) { animation-delay: 0.16s; height: 15px; }
      .sr-ho-rec-eq i:nth-child(6) { animation-delay: 0.28s; height: 13px; }

      /* ── 2026 Frosted Glass Lightbox ── */
      .sr-ho-lightbox {
        position: fixed;
        inset: 0;
        z-index: 2147482000;
        background: rgba(2, 6, 23, 0.86);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        gap: 16px;
        animation: srHoMsgIn 0.2s ease both;
      }
      .sr-ho-lightbox img {
        max-width: 92vw;
        max-height: 76vh;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
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
      <div style="color:#e2e8f0;font-size:13px;font-weight:700;letter-spacing:-0.01em;max-width:90vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(name || 'Handover Photo')}</div>
      <img src="${esc(url)}" alt="${esc(name || 'Handover Photo')}" />
      <div style="display:flex;gap:10px;align-items:center;">
        <a href="${esc(url)}" download="${esc(name || 'handover-photo.jpg')}" class="sr-btn sr-btn-primary" style="text-decoration:none;min-height:38px;padding:0 18px;border-radius:999px;">Download</a>
        <button type="button" class="sr-btn sr-btn-secondary" id="sr-ho-lb-close" style="min-height:38px;padding:0 18px;border-radius:999px;">Close</button>
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
      return `
        <div class="sr-ho-img-wrap" data-ho-lightbox-url="${esc(att.url)}" data-ho-lightbox-name="${esc(att.name || 'handover-photo.jpg')}">
          <img src="${esc(att.url)}" alt="${esc(att.name || 'Photo')}" class="sr-ho-img-thumb" loading="lazy" />
        </div>
      `;
    }
    if (att.type === 'voice') {
      const uid = 'vo_' + String(att.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      const bars = generateWaveformBars(att.id || att.url || uid, 26);
      const barsHtml = bars.map((h, i) => `<span class="sr-ho-wave-bar" data-wave-idx="${i}" style="height:${h}%;"></span>`).join('');
      return `
        <div class="sr-ho-voice-card" data-voice-card="${uid}">
          <button type="button" class="sr-ho-voice-play" data-voice-play="${uid}" aria-label="Play voice note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="7 4 20 12 7 20 7 4"/></svg>
          </button>
          <div class="sr-ho-voice-track-wrap">
            <div class="sr-ho-waveform" data-voice-bar="${uid}" role="slider" aria-label="Voice note waveform">
              ${barsHtml}
            </div>
            <div class="sr-ho-voice-meta">
              <span data-voice-time="${uid}">${formatDuration(att.durationSec || 0)}</span>
              <button type="button" class="sr-ho-speed-btn" data-voice-speed="${uid}" title="Playback speed">1x</button>
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
      </a>
    `;
  }

  function renderStatusCheckSvg(status) {
    if (status === 'acknowledged') {
      return `
        <span class="sr-ho-status-badge" style="color:#0284c7;" title="Acknowledged by incoming shift">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
          <span>Ack</span>
        </span>
      `;
    }
    if (status === 'relayed') {
      return `
        <span class="sr-ho-status-badge" style="color:#059669;" title="Approved &amp; relayed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
          <span>Relayed</span>
        </span>
      `;
    }
    return `
      <span class="sr-ho-status-badge" title="Saved to shift database">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Saved</span>
      </span>
    `;
  }

  function renderBubbleHtml(item, user, isSupervisorView) {
    const condClass = item.shiftStatus === 'red' ? 'is-blocker' : item.shiftStatus === 'amber' ? 'is-flag' : 'is-normal';
    const condShort = item.condition === 'All Systems Normal' ? 'Normal' : item.condition;
    const isSupervisorUser = isSupervisorView || ['supervisor', 'manager', 'owner'].includes(String(user.role || '').toLowerCase());

    let actionBtn = '';
    if (isSupervisorUser && item.status === 'awaiting_review' && !item.isMe) {
      actionBtn = `<button type="button" class="sr-ho-inline-action" data-ho-action="relay" data-ho-id="${esc(item.id)}">Approve &amp; Relay</button>`;
    } else if (!item.isMe && item.status !== 'acknowledged') {
      actionBtn = `<button type="button" class="sr-ho-inline-action" data-ho-action="acknowledge" data-ho-id="${esc(item.id)}">Accept Takeover</button>`;
    }

    const attHtml = item.attachments.length
      ? `<div class="sr-ho-attachments">${item.attachments.map(renderAttachmentHtml).join('')}</div>`
      : '';

    const avatarHtml = !item.isMe
      ? `<span class="sr-ho-sender-avatar" style="background:${avatarHue(item.authorName)};" aria-hidden="true">${esc(getInitials(item.authorName))}</span>`
      : '';

    return `
      <div class="sr-ho-row ${item.isMe ? 'is-me' : 'is-other'}" data-ho-msg-id="${esc(item.id)}">
        ${avatarHtml}
        <div class="sr-ho-bubble">
          <div class="sr-ho-bubble-head">
            <span class="sr-ho-sender">${item.isMe ? 'You' : esc(item.authorName)} <span class="sr-ho-station-tag">&middot; ${esc(item.station)}</span></span>
            <span class="sr-ho-cond-chip ${condClass}"><span class="sr-ho-cond-dot"></span>${esc(condShort)}</span>
          </div>
          ${item.summary ? `<p class="sr-ho-text">${esc(item.summary)}</p>` : ''}
          ${attHtml}
          <div class="sr-ho-bubble-foot">
            ${actionBtn}
            <span class="sr-ho-time-status">
              <span>${esc(formatTime(item.createdAt))}</span>
              ${renderStatusCheckSvg(item.status)}
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

    handovers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const pendingCount = handovers.filter((h) => h.status !== 'acknowledged' && !h.isMe).length;
    const deptName = user.department || profile?.departments?.[0] || 'Operations';

    // Compact supervisor Print/CSV action buttons integrated right into unified 2026 topbar
    const supToolbarHtml = isSup
      ? `
        <button type="button" id="sr-btn-print-turnover-mgr" class="sr-ho-icon-pill is-icon-only" title="Print shift turnover log" aria-label="Print shift turnover log">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        </button>
        <button type="button" id="sr-btn-export-all-mgr" class="sr-ho-icon-pill is-icon-only" title="Export handovers CSV" aria-label="Export handovers CSV">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </button>
      `
      : '';

    container.innerHTML = `
      <div class="sr-ho-chat-shell" id="sr-ho-chat-shell">
        <div class="sr-ho-chat-topbar">
          <div class="sr-ho-topbar-main">
            <div class="sr-ho-chat-title-row">
              <span class="sr-ho-channel-avatar" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              </span>
              <div class="sr-ho-chat-title-meta">
                <div class="sr-ho-title-line">
                  <h3>${isSup ? 'Handovers' : 'Handover'}</h3>
                  ${pendingCount > 0 ? `<span class="sr-ho-pending-pill" id="sr-ho-pending-pill">${pendingCount} Active</span>` : '<span class="sr-ho-pending-pill" id="sr-ho-pending-pill" style="display:none;"></span>'}
                </div>
                <p>
                  <span class="sr-ho-live-dot"></span>
                  <span id="sr-ho-sub-status">${esc(deptName)} &middot; <span id="sr-ho-total-count">${handovers.length} saved</span></span>
                </p>
              </div>
            </div>
            <div class="sr-ho-topbar-actions">
              ${supToolbarHtml}
              <button type="button" id="sr-ho-refresh-btn" class="sr-ho-icon-pill is-icon-only" title="Sync latest handovers" aria-label="Sync latest handovers">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              </button>
            </div>
          </div>

          <div class="sr-ho-filter-row" id="sr-ho-filter-row" role="tablist" aria-label="Filter handovers">
            <button type="button" class="sr-ho-filter-chip is-active" data-ho-filter="all">All <span class="sr-ho-filter-count" data-fc="all">${handovers.length}</span></button>
            <button type="button" class="sr-ho-filter-chip" data-ho-filter="flags">Flags <span class="sr-ho-filter-count" data-fc="flags">0</span></button>
            <button type="button" class="sr-ho-filter-chip" data-ho-filter="media">Photos &amp; Files <span class="sr-ho-filter-count" data-fc="media">0</span></button>
            <button type="button" class="sr-ho-filter-chip" data-ho-filter="voice">Voice <span class="sr-ho-filter-count" data-fc="voice">0</span></button>
          </div>
        </div>

        <div class="sr-ho-messages" id="sr-ho-messages" aria-live="polite"></div>

        <button type="button" class="sr-ho-jump-latest" id="sr-ho-jump-latest" aria-label="Jump to latest message">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          <span>Latest</span>
        </button>

        <div class="sr-ho-composer-wrap">
          <!-- Frosted Glass 2x2 '+' Attachment Sheet -->
          <div class="sr-ho-plus-menu" id="sr-ho-plus-menu" role="menu">
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-camera" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(16,185,129,0.16);color:#059669;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              </span>
              <span>Camera</span>
              <span class="sr-ho-menu-sub">Snap site photo</span>
            </button>
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-gallery" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(14,165,233,0.16);color:#0284c7;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </span>
              <span>Photos</span>
              <span class="sr-ho-menu-sub">From gallery</span>
            </button>
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-file" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(245,158,11,0.16);color:#d97706;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </span>
              <span>Document</span>
              <span class="sr-ho-menu-sub">PDF, CSV, XLSX</span>
            </button>
            <button type="button" class="sr-ho-menu-item" id="sr-ho-pick-voice" role="menuitem">
              <span class="sr-ho-menu-ico" style="background:rgba(239,68,68,0.14);color:#e11d48;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              </span>
              <span>Voice Note</span>
              <span class="sr-ho-menu-sub">Audio briefing</span>
            </button>
          </div>

          <input type="file" id="sr-ho-input-camera" accept="image/*" capture="environment" style="display:none;" />
          <input type="file" id="sr-ho-input-gallery" accept="image/*" style="display:none;" />
          <input type="file" id="sr-ho-input-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,text/plain,text/csv" style="display:none;" />

          <!-- Segmented 3-State Status Strip -->
          <div class="sr-ho-cond-strip" id="sr-ho-cond-strip">
            <button type="button" class="sr-ho-cond-pill is-active" data-cond="All Systems Normal" data-level="green">
              <span class="sr-ho-cond-pill-dot"></span><span>Normal</span>
            </button>
            <button type="button" class="sr-ho-cond-pill" data-cond="${esc(secondCondLabel)}" data-level="amber" title="${esc(secondCondLabel)}">
              <span class="sr-ho-cond-pill-dot"></span><span>Flag</span>
            </button>
            <button type="button" class="sr-ho-cond-pill" data-cond="${esc(thirdCondLabel)}" data-level="red" title="${esc(thirdCondLabel)}">
              <span class="sr-ho-cond-pill-dot"></span><span>Blocker</span>
            </button>
          </div>

          <!-- Staged Attachments Preview -->
          <div class="sr-ho-staging" id="sr-ho-staging" style="display:none;"></div>

          <!-- Live Animated Equalizer Recording Strip -->
          <div class="sr-ho-rec-bar" id="sr-ho-rec-bar">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <span class="sr-ho-rec-dot"></span>
              <span class="sr-ho-rec-timer" id="sr-ho-rec-timer">00:00</span>
              <span class="sr-ho-rec-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <button type="button" id="sr-ho-rec-cancel" class="sr-ho-icon-pill" style="height:32px;border-radius:999px;" title="Cancel recording">Cancel</button>
              <button type="button" id="sr-ho-rec-send" class="sr-btn sr-btn-primary" style="min-height:32px;height:32px;padding:0 13px;font-size:11.5px;border-radius:999px;">Send Voice</button>
            </div>
          </div>

          <!-- Floating 2026 Glass Pill Input Bar -->
          <div class="sr-ho-bar" id="sr-ho-bar">
            <button type="button" class="sr-ho-plus-btn" id="sr-ho-plus-btn" aria-label="Attach camera photo, file, or voice note" title="Camera, photo, or file">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <textarea id="sr-ho-text-input" class="sr-ho-input" rows="1" placeholder="Message next shift…"></textarea>
            <button type="button" class="sr-ho-voice-trigger" id="sr-ho-voice-btn" aria-label="Record voice note" title="Record voice note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
            <button type="button" class="sr-ho-send-btn" id="sr-ho-send-btn" aria-label="Send handover" title="Send handover">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
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
    const jumpLatestBtn = document.getElementById('sr-ho-jump-latest');
    const subStatusEl = document.getElementById('sr-ho-sub-status');
    const pendingPillEl = document.getElementById('sr-ho-pending-pill');
    const refreshBtn = document.getElementById('sr-ho-refresh-btn');

    let activeFilter = 'all';
    let selectedCond = 'All Systems Normal';
    let selectedLevel = 'green';
    let stagedAttachments = [];
    let mediaRecorder = null;
    let recStream = null;
    let recChunks = [];
    let recInterval = null;
    let recStartedAt = 0;
    let recCancelFlag = false;

    function updateFilterCounts() {
      const counts = {
        all: handovers.length,
        flags: handovers.filter((h) => h.shiftStatus === 'amber' || h.shiftStatus === 'red').length,
        media: handovers.filter((h) => h.attachments.some((a) => a.type === 'image' || a.type === 'file')).length,
        voice: handovers.filter((h) => h.attachments.some((a) => a.type === 'voice')).length
      };
      container.querySelectorAll('[data-fc]').forEach((el) => {
        const k = el.getAttribute('data-fc');
        el.textContent = String(counts[k] ?? 0);
      });
      const actCount = handovers.filter((h) => h.status !== 'acknowledged' && !h.isMe).length;
      if (pendingPillEl) {
        if (actCount > 0) {
          pendingPillEl.textContent = `${actCount} Active`;
          pendingPillEl.style.display = 'inline-flex';
        } else {
          pendingPillEl.style.display = 'none';
        }
      }
      const countEl = document.getElementById('sr-ho-total-count');
      if (countEl) countEl.textContent = `${handovers.length} saved`;
    }

    function getFilteredHandovers() {
      if (activeFilter === 'flags') return handovers.filter((h) => h.shiftStatus === 'amber' || h.shiftStatus === 'red');
      if (activeFilter === 'media') return handovers.filter((h) => h.attachments.some((a) => a.type === 'image' || a.type === 'file'));
      if (activeFilter === 'voice') return handovers.filter((h) => h.attachments.some((a) => a.type === 'voice'));
      return handovers;
    }

    function bindVoicePlayers() {
      msgBox.querySelectorAll('[data-voice-card]').forEach((card) => {
        const uid = card.getAttribute('data-voice-card');
        const audio = card.querySelector(`[data-voice-audio="${uid}"]`);
        const playBtn = card.querySelector(`[data-voice-play="${uid}"]`);
        const wave = card.querySelector(`[data-voice-bar="${uid}"]`);
        const bars = Array.from(wave?.querySelectorAll('.sr-ho-wave-bar') || []);
        const timeEl = card.querySelector(`[data-voice-time="${uid}"]`);
        const speedBtn = card.querySelector(`[data-voice-speed="${uid}"]`);
        if (!audio || !playBtn) return;

        const speeds = [1, 1.5, 2];
        let speedIdx = 0;

        const PLAY_ICO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="7 4 20 12 7 20 7 4"/></svg>';
        const PAUSE_ICO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

        function paintWave(pct) {
          const activeCount = Math.round(pct * bars.length);
          bars.forEach((b, idx) => b.classList.toggle('is-played', idx < activeCount));
        }

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
        speedBtn?.addEventListener('click', () => {
          speedIdx = (speedIdx + 1) % speeds.length;
          audio.playbackRate = speeds[speedIdx];
          speedBtn.textContent = `${speeds[speedIdx]}x`;
        });
        audio.addEventListener('play', () => { playBtn.innerHTML = PAUSE_ICO; });
        audio.addEventListener('pause', () => { playBtn.innerHTML = PLAY_ICO; });
        audio.addEventListener('ended', () => {
          playBtn.innerHTML = PLAY_ICO;
          paintWave(0);
          if (timeEl && audio.duration && Number.isFinite(audio.duration)) {
            timeEl.textContent = formatDuration(audio.duration);
          }
        });
        audio.addEventListener('timeupdate', () => {
          const dur = audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0;
          if (dur > 0) paintWave(Math.min(1, audio.currentTime / dur));
          if (timeEl && dur > 0) timeEl.textContent = formatDuration(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', () => {
          if (timeEl && audio.duration && Number.isFinite(audio.duration) && audio.duration >= 1) {
            timeEl.textContent = formatDuration(audio.duration);
          }
        });
        wave?.addEventListener('click', (e) => {
          if (!audio.duration || !Number.isFinite(audio.duration)) return;
          const rect = wave.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          audio.currentTime = pct * audio.duration;
          paintWave(pct);
        });
      });
    }

    function renderThread(scrollToBottom = true) {
      updateFilterCounts();
      const visible = getFilteredHandovers();
      if (!visible.length) {
        const emptyTitle = activeFilter === 'all' ? 'Your Shift Handover Thread' : `No ${activeFilter} messages yet`;
        const emptyCopy = activeFilter === 'all'
          ? 'Send notes, camera photos, documents, or voice notes below. Everything stays permanently saved in your team database.'
          : 'Switch back to All to view the complete persistent handover stream.';
        msgBox.innerHTML = `
          <div style="margin:auto;text-align:center;max-width:290px;padding:28px 14px;color:var(--sr-text-muted);">
            <div style="width:48px;height:48px;border-radius:16px;background:rgba(16,185,129,0.12);color:#059669;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div style="font-size:14px;font-weight:800;color:var(--sr-text-main);margin-bottom:4px;">${esc(emptyTitle)}</div>
            <div style="font-size:12.5px;line-height:1.5;">${esc(emptyCopy)}</div>
          </div>
        `;
        return;
      }

      let lastGroup = '';
      const chunks = [];
      for (const item of visible) {
        const g = formatDateGroup(item.createdAt);
        if (g !== lastGroup) {
          chunks.push(`<div class="sr-ho-date-divider">${esc(g)}</div>`);
          lastGroup = g;
        }
        chunks.push(renderBubbleHtml(item, user, isSup));
      }
      msgBox.innerHTML = chunks.join('');

      msgBox.querySelectorAll('[data-ho-lightbox-url]').forEach((el) => {
        el.addEventListener('click', () => openLightbox(el.dataset.hoLightboxUrl, el.dataset.hoLightboxName));
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
              window.toast(act === 'relay' ? 'Handover approved and relayed.' : 'Handover takeover acknowledged.');
            }
          } catch (err) {
            btn.disabled = false;
            if (typeof window.toast === 'function') window.toast(err.message);
          }
        });
      });

      bindVoicePlayers();
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
        activeFilter = 'all';
        container.querySelectorAll('.sr-ho-filter-chip').forEach((c) => c.classList.toggle('is-active', c.dataset.hoFilter === 'all'));
        renderThread(true);
        if (typeof window.SRAudio?.playClockIn === 'function') window.SRAudio.playClockIn();
      } catch (err) {
        if (typeof window.toast === 'function') window.toast(err.message || 'Handover failed to send.');
      } finally {
        sendBtn.disabled = false;
      }
    }

    // Scroll observer for floating "Jump to Latest" glass pill
    msgBox?.addEventListener('scroll', () => {
      const distFromBottom = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight;
      jumpLatestBtn?.classList.toggle('is-visible', distFromBottom > 140);
    });
    jumpLatestBtn?.addEventListener('click', () => {
      msgBox.scrollTo({ top: msgBox.scrollHeight, behavior: 'smooth' });
    });

    // Quick filter chips
    container.querySelectorAll('.sr-ho-filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.hoFilter || 'all';
        container.querySelectorAll('.sr-ho-filter-chip').forEach((c) => c.classList.toggle('is-active', c === chip));
        renderThread(true);
      });
    });

    // Condition segmented selector
    container.querySelectorAll('.sr-ho-cond-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.sr-ho-cond-pill').forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        selectedCond = pill.dataset.cond || 'All Systems Normal';
        selectedLevel = pill.dataset.level || 'green';
      });
    });

    // '+' Frosted Attachment Sheet toggle
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
    document.getElementById('sr-ho-pick-voice')?.addEventListener('click', () => { togglePlusMenu(false); voiceBtn?.click(); });

    async function handleSelectedFile(file, kind) {
      if (!file) return;
      if (subStatusEl) subStatusEl.textContent = `Uploading ${file.name}…`;
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
        if (subStatusEl) subStatusEl.innerHTML = `${esc(deptName)} &middot; <span id="sr-ho-total-count">${handovers.length} saved</span> &middot; Attachment ready`;
      } catch (err) {
        if (subStatusEl) subStatusEl.innerHTML = `${esc(deptName)} &middot; <span id="sr-ho-total-count">${handovers.length} saved</span> &middot; Live DB`;
        if (typeof window.toast === 'function') window.toast(err.message || 'Upload failed.');
      }
    }

    camInput?.addEventListener('change', async (e) => { await handleSelectedFile(e.target.files?.[0], 'image'); camInput.value = ''; });
    galInput?.addEventListener('change', async (e) => { await handleSelectedFile(e.target.files?.[0], 'image'); galInput.value = ''; });
    fileInput?.addEventListener('change', async (e) => { await handleSelectedFile(e.target.files?.[0], 'file'); fileInput.value = ''; });

    // Voice Note Recording (iOS Safari audio/mp4 + Chrome/Android audio/webm)
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
            if (subStatusEl) subStatusEl.textContent = 'Saving voice note…';
            const dataUrl = await readFileAsDataUrl(blob);
            const att = await uploadHandoverMedia({
              type: 'voice',
              name: `voice-handover-${Date.now()}.${ext}`,
              mimeType: mime,
              dataUrl,
              durationSec
            });
            await sendHandoverMessage([att]);
            if (subStatusEl) subStatusEl.innerHTML = `${esc(deptName)} &middot; <span id="sr-ho-total-count">${handovers.length} saved</span> &middot; Live DB`;
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

    // Silent inline sync animation (never blocks composer with bottom toast!)
    refreshBtn?.addEventListener('click', async () => {
      refreshBtn.classList.add('is-spinning');
      try {
        const res = await fetch('/api/handovers', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          handovers = (data.handovers || []).map((h) => normalizeHandoverItem(h, user));
          handovers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          renderThread(true);
          if (subStatusEl) {
            subStatusEl.innerHTML = `${esc(deptName)} &middot; <span id="sr-ho-total-count">${handovers.length} saved</span> &middot; Synced`;
          }
        }
      } catch (_) {
      } finally {
        setTimeout(() => refreshBtn.classList.remove('is-spinning'), 420);
      }
    });

    renderThread(true);
  }

  window.ShiftRelayHandoverChat = { mount };
})();
