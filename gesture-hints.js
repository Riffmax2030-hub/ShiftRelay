/**
 * ShiftRelay Gesture Hints & Pre-Learned Micro-Interactions
 * Enables intuitive double-tap liking, subtle story ring cues,
 * and zero-text interaction feedback across the application.
 */

(function () {
  const HINT_SEEN_KEY = 'shiftrelay_hints_seen';
  let hintsSeen = {};

  try {
    hintsSeen = JSON.parse(localStorage.getItem(HINT_SEEN_KEY) || '{}');
  } catch (_) {}

  function markHintSeen(hintName) {
    hintsSeen[hintName] = true;
    try {
      localStorage.setItem(HINT_SEEN_KEY, JSON.stringify(hintsSeen));
    } catch (_) {}
  }

  // ── Double-Tap to Like on Feed Post Cards ────────────────────────────────────
  function bindDoubleTapLikes(root = document) {
    root.querySelectorAll('.lounge-post-card').forEach((card) => {
      if (card.dataset.doubleTapBound) return;
      card.dataset.doubleTapBound = 'true';

      let lastTap = 0;
      card.addEventListener('touchend', (e) => {
        // Ignore if clicking interactive controls inside card
        if (e.target.closest('button, a, input, select, textarea, video')) return;

        const currentTime = Date.now();
        const tapLength = currentTime - lastTap;
        if (tapLength < 320 && tapLength > 0) {
          triggerDoubleTapLike(card);
          e.preventDefault();
        }
        lastTap = currentTime;
      });

      card.addEventListener('dblclick', (e) => {
        if (e.target.closest('button, a, input, select, textarea, video')) return;
        triggerDoubleTapLike(card);
      });
    });
  }

  function triggerDoubleTapLike(card) {
    const likeBtn = card.querySelector('[data-post-action="like"]');
    if (!likeBtn) return;

    // Trigger visual pop burst
    const burst = document.createElement('div');
    burst.className = 'double-tap-heart';
    burst.innerHTML = window.Icons?.like ? window.Icons.like(true) : '';
    card.appendChild(burst);
    setTimeout(() => burst.remove(), 800);

    // Audio & Haptic
    window.SoundEngine?.play('like');

    // Trigger like action if not already liked
    if (!likeBtn.classList.contains('active-like')) {
      likeBtn.click();
    }
  }

  // ── Story Ring Subtle First-Time Cue ─────────────────────────────────────────
  function initStoryCues() {
    if (hintsSeen.story_ring) return;

    const firstRing = document.querySelector('.story-ring:not(.story-plus-ring) .story-avatar-ring');
    if (firstRing) {
      firstRing.classList.add('hint-pulse');
      firstRing.closest('.story-ring')?.addEventListener('click', () => {
        firstRing.classList.remove('hint-pulse');
        markHintSeen('story_ring');
      }, { once: true });
    }
  }

  // ── Story Viewer Micro-Hint ─────────────────────────────────────────────────
  function checkStoryViewerHint() {
    if (hintsSeen.story_viewer) return;

    const modal = document.querySelector('.story-modal-card');
    if (modal && !modal.querySelector('.story-micro-hint')) {
      const hint = document.createElement('div');
      hint.className = 'story-micro-hint';
      hint.textContent = 'Hold to pause · Tap edges to skip';
      modal.appendChild(hint);
      markHintSeen('story_viewer');
    }
  }

  // ── Global Observer for Dynamic Cards ───────────────────────────────────────
  const observer = new MutationObserver(() => {
    bindDoubleTapLikes();
    initStoryCues();
    checkStoryViewerHint();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindDoubleTapLikes();
      initStoryCues();
    });
  } else {
    bindDoubleTapLikes();
    initStoryCues();
  }
})();
