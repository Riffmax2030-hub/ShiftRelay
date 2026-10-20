/**
 * ShiftRelay Dual-Theme Manager (Light / Dark Skin)
 * High-performance, zero-flicker theme management with persistent state.
 */

(function () {
  function getStoredTheme() {
    try {
      const stored = localStorage.getItem('shiftrelay-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (_) {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function applyTheme(theme, showFeedback = false) {
    const active = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = active;
    if (document.body) {
      document.body.dataset.theme = active;
    }
    try {
      localStorage.setItem('shiftrelay-theme', active);
    } catch (_) {}

    // Update meta theme-color for mobile browsers & status bar
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = active === 'dark' ? '#090d16' : '#126e68';
    }

    updateThemeButtons(active);

    window.dispatchEvent(new CustomEvent('shiftrelay-theme-changed', { detail: { theme: active } }));

    if (showFeedback && typeof window.toast === 'function') {
      window.toast(active === 'dark' ? 'Dark skin activated' : 'Light skin activated');
    }
  }

  function updateThemeButtons(theme) {
    const isDark = theme === 'dark';
    const iconHtml = (typeof window.Icons !== 'undefined' && window.Icons)
      ? (isDark ? window.Icons.sun(20) : window.Icons.moon(20))
      : (isDark
          ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
          : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>');

    document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
      btn.innerHTML = iconHtml;
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });

    const accountMenuThemeLabel = document.getElementById('account-menu-theme-label');
    if (accountMenuThemeLabel) {
      accountMenuThemeLabel.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  }

  // Early initialization before DOM paint
  const initialTheme = getStoredTheme();
  document.documentElement.dataset.theme = initialTheme;

  // DOM ready bindings
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(initialTheme, false);

    // Global click delegate for theme toggle buttons
    document.addEventListener('click', (event) => {
      const btn = event.target.closest('.theme-toggle-btn, [data-action="toggle-theme"]');
      if (btn) {
        event.preventDefault();
        toggleTheme();
      }
    });

    // Auto-update buttons on any dynamic view re-render
    const observer = new MutationObserver(() => {
      const current = document.documentElement.dataset.theme || 'light';
      updateThemeButtons(current);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Watch OS color scheme changes if user hasn't explicitly set a preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const stored = localStorage.getItem('shiftrelay-theme');
        if (!stored) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  });

  window.toggleTheme = toggleTheme;
  window.applyTheme = applyTheme;
  window.getTheme = () => document.documentElement.dataset.theme || 'light';
})();
