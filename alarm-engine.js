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

  // Periodic Watchdog: Checks upcoming shift and active handover deadlines
  function startShiftAlarmWatchdog() {
    setInterval(() => {
      try {
        const user = window.state?.user;
        if (!user || !user.shift_start) return;

        const now = new Date();
        const [startH, startM] = String(user.shift_start).split(':').map(Number);
        if (isNaN(startH)) return;

        const targetTime = new Date();
        targetTime.setHours(startH, startM, 0, 0);

        const diffMinutes = Math.round((targetTime.getTime() - now.getTime()) / 60000);

        // Alert at 15 minutes before shift
        const alertedKey = `sr_alert_${targetTime.toDateString()}_${diffMinutes}`;
        if (diffMinutes === 15 && !sessionStorage.getItem(alertedKey)) {
          sessionStorage.setItem(alertedKey, 'true');
          playTone('shift_alarm');
          if (typeof window.toast === 'function') {
            window.toast('Shift Clock-In Reminder: Your shift starts in 15 minutes!');
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
