/**
 * ShiftRelay Native Audio & Alarm Engine
 * Generates reliable web-audio tones and haptics without external file dependencies.
 * Zero-breakage guarantee for critical shift reminders.
 */

(function () {
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Check user sound preferences (defaults to 'gentle')
  function getSoundPref() {
    try {
      return localStorage.getItem('sr_sound_mode') || 'gentle'; // 'mute' | 'gentle' | 'loud'
    } catch {
      return 'gentle';
    }
  }

  function setSoundPref(mode) {
    try {
      localStorage.setItem('sr_sound_mode', mode);
    } catch {}
  }

  // Trigger mobile haptic vibration if available (Capacitor or navigator.vibrate)
  function triggerHaptic(type = 'light') {
    try {
      if (window.Capacitor?.Plugins?.Haptics) {
        if (type === 'heavy') window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
        else if (type === 'medium') window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
        else window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
        return;
      }
      if (navigator.vibrate) {
        if (type === 'heavy') navigator.vibrate([200, 100, 200]);
        else if (type === 'medium') navigator.vibrate(120);
        else navigator.vibrate(40);
      }
    } catch {}
  }

  /**
   * Play high-fidelity synthesized sounds
   */
  function playTone(type) {
    const pref = getSoundPref();
    if (pref === 'mute') return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const isLoud = pref === 'loud';

    if (type === 'click' || type === 'tap') {
      triggerHaptic('light');
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'like' || type === 'pop') {
      // Soft gentle bubble pop
      triggerHaptic('light');
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'save' || type === 'confirm') {
      // Warm double-chime
      triggerHaptic('medium');
      [0, 0.09].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(i === 0 ? 523.25 : 659.25, now + delay); // C5 -> E5
        gain.gain.setValueAtTime(0.09, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
    } else if (type === 'handover_due' || type === 'task_alert') {
      // Urgent triple chime for impending tasks
      triggerHaptic('heavy');
      const volume = isLoud ? 0.35 : 0.15;
      [0, 0.12, 0.24].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 2 ? 880 : 587.33, now + delay); // D5 -> A5
        gain.gain.setValueAtTime(volume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    } else if (type === 'shift_alarm') {
      // Major attention chime: rising triad
      triggerHaptic('heavy');
      const volume = isLoud ? 0.45 : 0.22;
      [0, 0.15, 0.3, 0.45].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isLoud ? 'sawtooth' : 'triangle';
        const freqs = [440, 554.37, 659.25, 880]; // A4 -> C#5 -> E5 -> A5
        osc.frequency.setValueAtTime(freqs[idx], now + delay);
        gain.gain.setValueAtTime(volume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.3);
      });
    }
  }

  // Policy-Driven Periodic Watchdog: Checks upcoming shift, grace window & overdue clock-out
  function startShiftAlarmWatchdog() {
    setInterval(() => {
      try {
        const user = window.state?.user;
        if (!user || !user.shift_start) return;

        const policy = user.attendancePolicy || {};
        const graceMinutes = Number(policy.graceMinutes ?? 10);
        const scheduleMins = Array.isArray(policy.reminderScheduleMinutes) && policy.reminderScheduleMinutes.length
          ? policy.reminderScheduleMinutes
          : [30, 15, 0, -(graceMinutes + 5)];

        const now = new Date();
        const [startH, startM] = String(user.shift_start).split(':').map(Number);
        if (isNaN(startH)) return;

        const startTarget = new Date();
        startTarget.setHours(startH, startM, 0, 0);
        const diffStartMin = Math.round((startTarget.getTime() - now.getTime()) / 60000);
        const isClockedIn = Boolean(window.state?.time?.activeEntry && !window.state.time.activeEntry.clocked_out_at);

        if (!isClockedIn && scheduleMins.includes(diffStartMin)) {
          const alertedKey = `sr_alert_${startTarget.toDateString()}_start_${diffStartMin}`;
          if (!sessionStorage.getItem(alertedKey)) {
            sessionStorage.setItem(alertedKey, 'true');
            const isEscalation = diffStartMin < 0;
            playTone(isEscalation ? 'handover_due' : 'shift_alarm');
            const msg = diffStartMin > 0
              ? `Shift Clock-In Reminder: Your shift starts in ${diffStartMin} minutes.`
              : (diffStartMin === 0
                  ? 'Shift Starting Now: Tap GPS Clock-In or scan Staff ID badge.'
                  : `Missed Clock-In Escalation: Past ${graceMinutes}m grace window. Clock in or explain immediately.`);
            if (typeof window.toast === 'function') window.toast(msg);
            window.ShiftRelayPush?.showSystemNotification?.('ShiftRelay OS Shift Reminder', { body: msg });
            window.ShiftRelayMobile?.scheduleLocalReminder?.({
              id: Math.abs(diffStartMin) + 100,
              title: 'ShiftRelay OS Shift Reminder',
              body: msg
            });
          }
        }

        // Overdue clock-out check
        if (isClockedIn && user.shift_end) {
          const [endH, endM] = String(user.shift_end).split(':').map(Number);
          if (!isNaN(endH)) {
            const endTarget = new Date();
            endTarget.setHours(endH, endM, 0, 0);
            if (endTarget <= startTarget) endTarget.setDate(endTarget.getDate() + 1);
            const diffEndMin = Math.round((endTarget.getTime() - now.getTime()) / 60000);
            if (diffEndMin === 10 || diffEndMin === -15) {
              const outKey = `sr_alert_${endTarget.toDateString()}_out_${diffEndMin}`;
              if (!sessionStorage.getItem(outKey)) {
                sessionStorage.setItem(outKey, 'true');
                playTone('task_alert');
                const outMsg = diffEndMin > 0
                  ? `Shift ends in ${diffEndMin} minutes — prepare handover & clock-out punch.`
                  : 'Overdue Clock-Out: Shift ended 15+ minutes ago. Submit clock-out punch or handover now.';
                if (typeof window.toast === 'function') window.toast(outMsg);
                window.ShiftRelayPush?.showSystemNotification?.('ShiftRelay OS Clock-Out Alert', { body: outMsg });
              }
            }
          }
        }
      } catch {}
    }, 30000); // Check every 30s
  }

  // Auto-init on first user gesture to unlock AudioContext
  ['click', 'touchstart'].forEach((evt) => {
    window.addEventListener(evt, () => getAudioContext(), { once: true, passive: true });
  });

  window.addEventListener('DOMContentLoaded', startShiftAlarmWatchdog);

  window.SoundEngine = {
    play: playTone,
    triggerHaptic,
    getSoundPref,
    setSoundPref
  };
})();
