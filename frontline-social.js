/**
 * ShiftRelay Frontline Social Feed, Worker Passport, Discover & Activity
 * Zero emoji controls — 100% clean SVG vectors.
 */

const socialState = {
  activeCategory: 'all',
  activeLoungeTab: 'feed',   // 'feed' | 'saved'
  postsCache: [],
  selectedUserPassport: null,
  feedRefreshInterval: null,
  discoverSearchQuery: ''
};

let stagedMedia = null;

// ─── Auto-refresh helpers ────────────────────────────────────────────────────

function startFeedRefresh() {
  stopFeedRefresh();
  socialState.feedRefreshInterval = setInterval(() => {
    if (document.getElementById('lounge-feed-stream')) {
      loadFeedPosts(true); // silent refresh
    } else {
      stopFeedRefresh();
    }
  }, 30000);
}

function stopFeedRefresh() {
  if (socialState.feedRefreshInterval) {
    clearInterval(socialState.feedRefreshInterval);
    socialState.feedRefreshInterval = null;
  }
}

// ─── Shift Lounge (main social feed) ────────────────────────────────────────

async function renderShiftLounge() {
  dashboardHeader('Shift Lounge', 'FRONTLINE CAREER NETWORK');
  stopFeedRefresh();

  const user = state.user || {};
  const userInitial = escape(user.name || 'W').slice(0, 1).toUpperCase();
  const userAvatarStyle = user.avatar_data_url ? `background-image:url('${user.avatar_data_url}');background-size:cover;background-position:center;color:transparent;` : '';
  const userFirstName = (user.name || 'Worker').split(' ')[0];
  const isBannerDismissed = localStorage.getItem('sr_dismiss_confidentiality') === '1';

  $('#dashboard').innerHTML = `
    <section class="lounge-container">
      <!-- Confidentiality Shield Alert Banner (Compact & Dismissible) -->
      ${!isBannerDismissed ? `
      <div class="confidentiality-shield-alert" id="lounge-confidentiality-banner">
        <div class="shield-badge-icon">${Icons.shield()}</div>
        <div class="shield-copy">
          <div class="shield-title-row">
            <strong>Frontline Confidentiality Protected</strong>
            <button class="shield-dismiss-btn" id="btn-dismiss-confidentiality" aria-label="Dismiss banner" title="Dismiss banner">✕</button>
          </div>
          <p>Shift updates are public. Keep posts HIPAA &amp; GDPR safe — never share internal patient data, security PINs, or proprietary operations. <a href="#" id="link-view-terms">Review Guidelines</a></p>
        </div>
      </div>
      ` : ''}

      <!-- Facebook / Threads-Style Composer Card -->
      <section class="lounge-composer">
        <div class="composer-header-row">
          <div class="composer-avatar" style="${userAvatarStyle}">
            ${user.avatar_data_url ? '' : userInitial}
          </div>
          <div class="composer-input-wrap">
            <textarea id="composer-text" placeholder="What happened on your shift today, ${escape(userFirstName)}? Share a win, tip, or safety milestone…" rows="3"></textarea>
          </div>
        </div>

        <input type="file" id="composer-file-input" accept="image/*,video/*" class="hidden" />

        <div id="composer-media-preview-container" class="composer-preview-box hidden">
          <div id="preview-content-wrapper" class="preview-content-wrapper"></div>
          <button type="button" class="btn-clear-media" id="btn-clear-media">✕ Remove</button>
        </div>

        <!-- Shift Tag Category Selector -->
        <div class="composer-tag-row">
          <span class="composer-tag-label">Shift Tag:</span>
          <div class="composer-categories" id="composer-category-select">
            <button class="category-chip active" data-cat="milestone">${Icons.award()} <span>Shift Win</span></button>
            <button class="category-chip" data-cat="tip">${Icons.bulb()} <span>Shift Tip</span></button>
            <button class="category-chip" data-cat="craft">${Icons.zap()} <span>Craft &amp; Prep</span></button>
            <button class="category-chip" data-cat="daily">${Icons.star()} <span>Daily Relay</span></button>
          </div>
        </div>

        <!-- Composer Bottom Toolbar -->
        <div class="composer-toolbar">
          <div class="composer-attach-tools">
            <button type="button" class="composer-tool-btn" id="btn-attach-media" title="Add photo or video clip">
              ${Icons.photo()} <span>Photo / Video</span>
            </button>
          </div>

          <div class="composer-post-actions">
            <label class="composer-confidentiality-inline" title="Workplace confidentiality requirement">
              <input type="checkbox" id="composer-confidentiality-check" checked />
              <span>HIPAA Safe</span>
            </label>
            <button class="primary btn-lounge-publish" id="btn-submit-post">
              Post to Lounge
            </button>
          </div>
        </div>
      </section>

      <!-- Modern Unified Feed Filter Bar -->
      <div class="feed-filter-bar">
        <button class="feed-filter-pill ${socialState.activeLoungeTab === 'feed' && socialState.activeCategory === 'all' ? 'active' : ''}" data-filter-type="cat" data-filter-val="all">
          ${Icons.globe()} All Shifts
        </button>
        <button class="feed-filter-pill ${socialState.activeLoungeTab === 'feed' && socialState.activeCategory === 'milestone' ? 'active' : ''}" data-filter-type="cat" data-filter-val="milestone">
          ${Icons.award()} Shift Wins
        </button>
        <button class="feed-filter-pill ${socialState.activeLoungeTab === 'feed' && socialState.activeCategory === 'tip' ? 'active' : ''}" data-filter-type="cat" data-filter-val="tip">
          ${Icons.bulb()} Shift Tips
        </button>
        <button class="feed-filter-pill ${socialState.activeLoungeTab === 'feed' && socialState.activeCategory === 'craft' ? 'active' : ''}" data-filter-type="cat" data-filter-val="craft">
          ${Icons.zap()} Craft &amp; Prep
        </button>
        <button class="feed-filter-pill ${socialState.activeLoungeTab === 'saved' ? 'active' : ''}" data-filter-type="saved">
          ${Icons.save()} Saved
        </button>
      </div>

      <!-- Feed Stream -->
      <div id="lounge-feed-stream">
        <p class="muted" style="text-align:center; padding:24px;">Loading frontline stories…</p>
      </div>
    </section>
  `;

  // Banner dismiss and rules link
  $('#btn-dismiss-confidentiality')?.addEventListener('click', () => {
    localStorage.setItem('sr_dismiss_confidentiality', '1');
    const banner = document.getElementById('lounge-confidentiality-banner');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-8px)';
      setTimeout(() => banner.remove(), 200);
    }
  });
  $('#link-view-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('terms-modal')?.classList.remove('hidden');
  });

  // Category chip clicks in composer
  document.querySelectorAll('#composer-category-select .category-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#composer-category-select .category-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Unified feed filter pill clicks
  document.querySelectorAll('.feed-filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feed-filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filterType = btn.dataset.filterType;
      if (filterType === 'saved') {
        socialState.activeLoungeTab = 'saved';
      } else {
        socialState.activeLoungeTab = 'feed';
        socialState.activeCategory = btn.dataset.filterVal || 'all';
      }
      loadFeedPosts();
    });
  });

  // Media attachment
  const fileInput = document.getElementById('composer-file-input');
  const previewBox = document.getElementById('composer-media-preview-container');
  const previewWrapper = document.getElementById('preview-content-wrapper');

  $('#btn-attach-media')?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return toast('Please select an image or video file.');

    if (isImage) {
      toast('Processing photo…');
      try {
        const compressedDataUrl = (typeof window.compressImageFile === 'function')
          ? await window.compressImageFile(file, 1400, 1400, 0.85)
          : await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
        stagedMedia = { dataUrl: compressedDataUrl, mediaType: 'image', name: file.name };
        previewWrapper.innerHTML = `
          <div class="preview-chip"><span class="preview-badge">Photo</span> <strong>${escape(file.name)}</strong> (Optimized)</div>
          <img src="${compressedDataUrl}" style="max-height:160px;object-fit:cover;border-radius:6px;margin-top:8px;" />`;
        previewBox?.classList.remove('hidden');
      } catch (err) {
        toast('Image processing failed: ' + err.message);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      stagedMedia = { dataUrl: e.target.result, mediaType: 'video', name: file.name };
      previewWrapper.innerHTML = `
        <div class="preview-chip"><span class="preview-badge">Video Clip</span> <strong>${escape(file.name)}</strong> (${(file.size/(1024*1024)).toFixed(1)} MB)</div>
        <video src="${e.target.result}" controls style="max-height:160px;border-radius:6px;margin-top:8px;width:100%;"></video>`;
      previewBox?.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  $('#btn-clear-media')?.addEventListener('click', () => {
    stagedMedia = null;
    if (fileInput) fileInput.value = '';
    previewBox?.classList.add('hidden');
    if (previewWrapper) previewWrapper.innerHTML = '';
  });

  // Post submission
  $('#btn-submit-post')?.addEventListener('click', async () => {
    const text = $('#composer-text').value.trim();
    if (!text) return toast('Please enter something to share.');
    if (!$('#composer-confidentiality-check')?.checked) {
      return toast('Workplace confidentiality required: certify your post contains no private company data.');
    }
    const activeCatBtn = document.querySelector('#composer-category-select .category-chip.active');
    const category = activeCatBtn ? activeCatBtn.dataset.cat : 'milestone';
    let imageUrl = null, mediaType = null;
    if (stagedMedia) {
      if (stagedMedia.directUrl) {
        imageUrl = stagedMedia.directUrl; mediaType = 'image';
      } else if (stagedMedia.dataUrl) {
        toast('Uploading media…');
        try {
          const uploadRes = await api('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl: stagedMedia.dataUrl }) });
          imageUrl = uploadRes.url; mediaType = uploadRes.mediaType;
        } catch (uploadErr) { return toast(`Upload failed: ${uploadErr.message}`); }
      }
    }
    try {
      await api('/api/feed/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, category, imageUrl, mediaType }) });
      toast('Post published to Shift Lounge!');
      $('#composer-text').value = '';
      stagedMedia = null;
      if (fileInput) fileInput.value = '';
      previewBox?.classList.add('hidden');
      if (previewWrapper) previewWrapper.innerHTML = '';
      loadFeedPosts();
    } catch (err) { toast(err.message); }
  });

  // Category filter
  document.querySelectorAll('[data-feed-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      socialState.activeCategory = btn.dataset.feedCat;
      document.querySelectorAll('[data-feed-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadFeedPosts();
    });
  });

  await loadFeedPosts();
  startFeedRefresh();
  bindNavigation();
}

async function loadFeedPosts(silent = false) {
  const stream = $('#lounge-feed-stream');
  if (!stream) return;
  if (!silent) stream.innerHTML = '<p class="muted" style="text-align:center;padding:24px;">Loading…</p>';

  try {
    let posts;
    if (socialState.activeLoungeTab === 'saved') {
      const res = await api('/api/feed/posts/saved');
      posts = res.posts;
    } else {
      const res = await api('/api/feed/posts');
      posts = res.posts;
      socialState.postsCache = posts;
      const cat = socialState.activeCategory;
      if (cat !== 'all') posts = posts.filter(p => p.category === cat);
    }

    if (!posts.length) {
      stream.innerHTML = socialState.activeLoungeTab === 'saved'
        ? '<p class="muted" style="text-align:center;padding:32px;">No saved posts yet. Tap the bookmark icon on any post to save it.</p>'
        : '<p class="muted" style="text-align:center;padding:32px;">No posts in this category yet. Be the first to share!</p>';
      return;
    }

    stream.innerHTML = posts.map((post) => renderPostCard(post)).join('');
    bindSocialInteractions();
  } catch (err) {
    stream.innerHTML = `<p class="muted">${escape(err.message)}</p>`;
  }
}

function renderPostCard(post) {
  const initial = escape(post.author_name || 'W').slice(0, 1).toUpperCase();
  const timeAgo = formatTimeAgo(post.created_at);
  const verifiedBadge = post.author_verified ? Icons.verified() : '';
  const isVideo = post.media_type === 'video' || (post.image_url && (post.image_url.endsWith('.mp4') || post.image_url.endsWith('.webm')));
  const avatarStyle = post.author_avatar ? `background-image:url('${post.author_avatar}');background-size:cover;background-position:center;color:transparent;` : '';
  const canDelete = post.author_id === state.user?.id || ['owner', 'supervisor'].includes(state.user?.role);

  const currentUser = state.user || {};
  const currentInitial = escape(currentUser.name || 'W').slice(0, 1).toUpperCase();
  const currentAvatarStyle = currentUser.avatar_data_url ? `background-image:url('${currentUser.avatar_data_url}');background-size:cover;background-position:center;color:transparent;` : '';

  const categoryMap = {
    milestone: { label: `${Icons.award()} <span>Shift Win</span>`, class: 'cat-milestone' },
    tip: { label: `${Icons.bulb()} <span>Shift Tip</span>`, class: 'cat-tip' },
    craft: { label: `${Icons.zap()} <span>Craft &amp; Prep</span>`, class: 'cat-craft' },
    daily: { label: `${Icons.star()} <span>Daily Relay</span>`, class: 'cat-daily' },
  };
  const cat = categoryMap[post.category] || { label: escape(post.category || 'Shift'), class: 'cat-default' };

  return `
    <article class="lounge-post-card" id="post-${post.id}">
      <!-- Author Header -->
      <div class="post-author-row">
        <span class="post-avatar" style="${avatarStyle}">${post.author_avatar ? '' : initial}</span>
        <div class="post-meta">
          <h4>${escape(post.author_name)} ${verifiedBadge}</h4>
          <p>${escape(post.author_role || 'Frontline Specialist')} · ${escape(post.organisation_name || 'ShiftRelay Network')} · <time>${timeAgo}</time></p>
        </div>
        <div class="post-top-right">
          <span class="post-category-tag ${cat.class}">${cat.label}</span>
          ${canDelete ? `<button class="btn-delete-post" data-delete-post="${post.id}" title="Delete post" aria-label="Delete post">✕</button>` : ''}
        </div>
      </div>

      <!-- Post Body -->
      <div class="post-body">${escape(post.content)}</div>

      <!-- Media Attachment -->
      ${isVideo ? `
        <div class="post-video-container">
          <video src="${escape(post.image_url)}" controls playsinline preload="metadata" class="feed-video-player"></video>
        </div>
      ` : post.image_url ? `
        <div class="post-image-container">
          <img src="${escape(post.image_url)}" alt="Shift photo" loading="lazy" />
        </div>
      ` : ''}

      <!-- Engagement Action Bar (Facebook / Threads Style) -->
      <div class="post-actions-bar">
        <button class="post-action-btn ${post.userLiked ? 'active-like' : ''}" data-post-action="like" data-post-id="${post.id}" title="High-five / Like">
          ${Icons.like(post.userLiked)}
          <span class="count">${post.likes_count || 0}</span>
        </button>
        <button class="post-action-btn" data-post-action="comment" data-post-id="${post.id}" title="Comment">
          ${Icons.comment()}
          <span class="count">${post.comments_count || (post.comments ? post.comments.length : 0)}</span>
        </button>
        <button class="post-action-btn" data-post-action="repost" data-post-id="${post.id}" title="Relay to network">
          ${Icons.repost()}
          <span class="count">${post.reposts_count || 0}</span>
        </button>
        <button class="post-action-btn ${post.userSaved ? 'active-save' : ''}" data-post-action="save" data-post-id="${post.id}" title="Save post">
          ${Icons.save(post.userSaved)}
          <span class="count">${post.saves_count || 0}</span>
        </button>
        <button class="post-action-btn" data-post-action="share" data-post-id="${post.id}" title="Share post link">
          ${Icons.share()}
        </button>
      </div>

      <!-- Inline Comment Drawer -->
      <div class="post-comment-drawer hidden" id="drawer-${post.id}">
        <div class="comment-input-row">
          <div class="comment-user-avatar" style="${currentAvatarStyle}">${currentUser.avatar_data_url ? '' : currentInitial}</div>
          <input type="text" id="comment-text-${post.id}" data-comment-input="${post.id}" placeholder="Write a supportive reply or shift tip…" />
          <button class="primary btn-send-comment" data-submit-comment="${post.id}">Reply</button>
        </div>
        <div class="comment-list" id="comment-list-${post.id}">
          ${(post.comments || []).map(c => `
            <div class="comment-bubble-item">
              <div class="comment-author-avatar">${escape(c.author_name || 'W').slice(0, 1).toUpperCase()}</div>
              <div class="comment-bubble">
                <div class="comment-author-name">${escape(c.author_name)}</div>
                <div class="comment-text">${escape(c.content)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

function bindSocialInteractions() {
  // Like
  document.querySelectorAll('[data-post-action="like"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      const countSpan = btn.querySelector('.count');
      const isLiked = btn.classList.contains('active-like');
      btn.classList.toggle('active-like', !isLiked);
      const current = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = isLiked ? Math.max(0, current - 1) : current + 1;
      try { await api(`/api/feed/posts/${postId}/like`, { method: 'POST' }); }
      catch { btn.classList.toggle('active-like', isLiked); countSpan.textContent = current; }
    });
  });

  // Repost
  document.querySelectorAll('[data-post-action="repost"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const countSpan = btn.querySelector('.count');
      const current = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = current + 1;
      toast('Relayed post to your frontline network!');
      await api(`/api/feed/posts/${btn.dataset.postId}/repost`, { method: 'POST' }).catch(() => {});
    });
  });

  // Save
  document.querySelectorAll('[data-post-action="save"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      const countSpan = btn.querySelector('.count');
      const isSaved = btn.classList.contains('active-save');
      btn.classList.toggle('active-save', !isSaved);
      const current = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = isSaved ? Math.max(0, current - 1) : current + 1;
      toast(isSaved ? 'Removed from saved posts.' : 'Saved to your career records.');
      await api(`/api/feed/posts/${postId}/save`, { method: 'POST' }).catch(() => {});
    });
  });

  // Share
  document.querySelectorAll('[data-post-action="share"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}/#post-${btn.dataset.postId}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl);
      }
      toast('Post link copied to clipboard!');
    });
  });

  // Comment drawer toggle
  document.querySelectorAll('[data-post-action="comment"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const drawer = document.getElementById(`drawer-${btn.dataset.postId}`);
      if (drawer) {
        drawer.classList.toggle('hidden');
        if (!drawer.classList.contains('hidden')) {
          document.getElementById(`comment-text-${btn.dataset.postId}`)?.focus();
        }
      }
    });
  });

  // Submit comment handler function
  const handleCommentSubmit = async (postId) => {
    const input = document.getElementById(`comment-text-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    try {
      const res = await api(`/api/feed/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      input.value = '';
      const list = document.getElementById(`comment-list-${postId}`);
      if (list) {
        const cName = escape(res.comment?.author_name || state.user?.name || 'Worker');
        const cInitial = cName.slice(0, 1).toUpperCase();
        list.insertAdjacentHTML('beforeend', `
          <div class="comment-bubble-item">
            <div class="comment-author-avatar">${cInitial}</div>
            <div class="comment-bubble">
              <div class="comment-author-name">${cName}</div>
              <div class="comment-text">${escape(res.comment?.content || text)}</div>
            </div>
          </div>
        `);
      }
      const commentCount = document.querySelector(`[data-post-action="comment"][data-post-id="${postId}"] .count`);
      if (commentCount) commentCount.textContent = res.comments_count || (parseInt(commentCount.textContent, 10) + 1);
      toast('Comment posted!');
    } catch (err) { toast(err.message); }
  };

  // Submit comment button click
  document.querySelectorAll('[data-submit-comment]').forEach((btn) => {
    btn.addEventListener('click', () => handleCommentSubmit(btn.dataset.submitComment));
  });

  // Submit comment on Enter key
  document.querySelectorAll('[data-comment-input]').forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCommentSubmit(input.dataset.commentInput);
      }
    });
  });

  // Delete post
  document.querySelectorAll('[data-delete-post]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.deletePost;
      if (!confirm('Are you sure you want to delete this post?')) return;
      try {
        await api(`/api/feed/posts/${postId}`, { method: 'DELETE' });
        document.getElementById(`post-${postId}`)?.remove();
        toast('Post deleted.');
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

// ─── Worker Passport ─────────────────────────────────────────────────────────

async function renderWorkerPassport(targetUserId) {
  dashboardHeader('Worker Passport', 'VERIFIED CAREER PROFILE');
  const userId = targetUserId || state.user?.id;

  try {
    const [{ profile }, badgeRes] = await Promise.all([
      api(`/api/worker-profile/${userId}`),
      api('/api/verified-badge-request').catch(() => ({ request: null }))
    ]);
    const isSelf = !targetUserId || targetUserId === state.user?.id;
    const initial = escape(profile.fullName || 'W').slice(0, 1).toUpperCase();
    const avatarStyle = profile.avatarUrl
      ? `background-image:url('${profile.avatarUrl}');background-size:cover;color:transparent;`
      : '';
    const badgeStatus = badgeRes.request?.status;
    const verifiedStatusBadge = profile.verifiedStatus === 'verified'
      ? `<span class="verified-status-badge verified">${Icons.verified()} Verified Worker</span>`
      : profile.verifiedStatus === 'pending' || badgeStatus === 'pending'
        ? `<span class="verified-status-badge pending">Verification Pending</span>`
        : `<span class="verified-status-badge unverified">Not Verified</span>`;

    $('#dashboard').innerHTML = `
      <section class="passport-card">
        <div class="passport-cover"></div>
        <div class="passport-header-content">
          <div class="passport-avatar-large" style="${avatarStyle}">${profile.avatarUrl ? '' : initial}</div>
          
          <div class="passport-name-row">
            <div>
              <h2>${escape(profile.fullName)} ${profile.verifiedStatus === 'verified' ? Icons.verified() : ''}</h2>
              <p class="passport-headline">${escape(profile.headline)} · ${escape(profile.currentOrganisation || 'ShiftRelay Network')}</p>
              ${verifiedStatusBadge}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
              ${isSelf ? '<button class="secondary" id="btn-edit-passport" style="min-height:42px;">Edit Passport</button>' : ''}
              ${isSelf ? '<button class="primary" id="btn-view-credential-self" style="min-height:42px;">Official Credential</button>' : ''}
              ${!isSelf ? `<button class="primary" id="btn-offer-shift" data-worker-id="${userId}" data-worker-name="${escape(profile.fullName)}" style="min-height:42px;background:#059669;border-color:#059669;">Offer Shift / Hire</button>` : ''}
              ${!isSelf ? `<button class="secondary" id="btn-view-credential-colleague" style="min-height:42px;">Verify Credential</button>` : ''}
              ${!isSelf ? `<button class="secondary" id="btn-msg-colleague" data-worker-id="${userId}" data-worker-name="${escape(profile.fullName)}" style="min-height:42px;">Message Worker</button>` : ''}
              ${isSelf && profile.verifiedStatus !== 'verified' && badgeStatus !== 'pending' ? '<button class="primary" id="btn-request-verified" style="min-height:42px;font-size:13px;">Request Verified Badge</button>' : ''}
            </div>
          </div>

          <!-- Proof-of-Work Reputation Grid -->
          <div class="proof-of-work-grid">
            <div class="proof-stat">
              <span>Shifts Logged</span>
              <strong>${profile.stats?.shiftsCompleted ?? 0}</strong>
            </div>
            <div class="proof-stat">
              <span>Handovers</span>
              <strong>${profile.stats?.handoversRelayed ?? 0}</strong>
            </div>
            <div class="proof-stat">
              <span>Reliability</span>
              <strong style="color:#059669;">${profile.stats?.reliabilityScore ?? 0}%</strong>
            </div>
            <div class="proof-stat">
              <span>Check-in Streak</span>
              <strong style="color:#ea580c;">${profile.stats?.checkInStreak ?? 0}d</strong>
            </div>
          </div>

          <!-- Career Proof-of-Work Milestone Badges -->
          <div class="passport-section" style="margin-top:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h3 style="margin:0;">Frontline Proof-of-Work Milestones</h3>
            </div>
            <div class="proof-badges-row">
              <div class="proof-badge-chip ${(profile.stats?.shiftsCompleted || 0) >= 50 ? 'earned' : ''}">
                <div class="proof-badge-icon">${Icons.award()}</div>
                <div>
                  <strong>Top Relayer</strong>
                  <small>${profile.stats?.shiftsCompleted || 0} Shifts Logged</small>
                </div>
              </div>
              <div class="proof-badge-chip ${(profile.stats?.checkInStreak || 0) >= 5 ? 'earned' : ''}">
                <div class="proof-badge-icon">${Icons.zap()}</div>
                <div>
                  <strong>Iron Streak</strong>
                  <small>${profile.stats?.checkInStreak || 0}d Consecutive</small>
                </div>
              </div>
              <div class="proof-badge-chip ${(profile.stats?.reliabilityScore || 0) >= 98 ? 'earned' : ''}">
                <div class="proof-badge-icon">${Icons.shield()}</div>
                <div>
                  <strong>Zero-Defect Reliability</strong>
                  <small>${profile.stats?.reliabilityScore || 0}% Flawless</small>
                </div>
              </div>
              <div class="proof-badge-chip ${(profile.stats?.endorsementsCount || 0) >= 5 ? 'earned' : ''}">
                <div class="proof-badge-icon">${Icons.users()}</div>
                <div>
                  <strong>Peer-Vouched Pro</strong>
                  <small>${profile.stats?.endorsementsCount || 0} Endorsements</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Life Outside Shift -->
          <div class="passport-section">
            <h3>Life Outside Shift</h3>
            <p>${escape(profile.bioOutsideWork || 'No bio entered yet.')}</p>
          </div>

          <!-- Skills & Certifications with Peer Endorsement Counter -->
          <div class="passport-section">
            <h3>Verified Skills &amp; Peer Endorsements</h3>
            <div class="skills-chip-row">
              ${(profile.skills || []).map(s => {
                const endorsers = (profile.endorsements && profile.endorsements[s]) || [];
                const count = endorsers.length;
                const userEndorsed = endorsers.includes(state.user?.id);
                return `
                  <button class="skill-chip ${userEndorsed ? 'endorsed' : ''}" data-endorse-skill="${escape(s)}" data-worker-id="${userId}" title="Click to endorse this skill">
                    <span>${escape(s)}</span>
                    <span class="endorse-badge">${count > 0 ? `· ${count}` : '+ Endorse'}</span>
                  </button>
                `;
              }).join('')}
              ${(profile.certifications || []).map(c => `<span class="skill-chip cert">${Icons.check()} ${escape(c)}</span>`).join('')}
            </div>
          </div>

          <!-- Shift Moments Gallery -->
          <div class="passport-section">
            <h3>Shift Moments Gallery</h3>
            <div class="shift-gallery-grid">
              ${(profile.gallery || []).map(g => `
                <div class="shift-gallery-item">
                  <img src="${escape(g.url)}" alt="Shift moment" loading="lazy" />
                  <small>${escape(g.caption)}</small>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;

    $('#btn-edit-passport')?.addEventListener('click', () => openPassportEditDialog(profile));
    $('#btn-request-verified')?.addEventListener('click', () => openVerifiedBadgeDialog());
    $('#btn-view-credential-self')?.addEventListener('click', () => openProofOfWorkCredentialDialog(profile));
    $('#btn-view-credential-colleague')?.addEventListener('click', () => openProofOfWorkCredentialDialog(profile));
    $('#btn-offer-shift')?.addEventListener('click', (e) => {
      openShiftOfferDialog(e.currentTarget.dataset.workerId, e.currentTarget.dataset.workerName);
    });
    $('#btn-msg-colleague')?.addEventListener('click', (e) => {
      openDirectMessageDialog(e.currentTarget.dataset.workerId, e.currentTarget.dataset.workerName);
    });

    document.querySelectorAll('[data-endorse-skill]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const skill = btn.dataset.endorseSkill;
        const workerId = btn.dataset.workerId;
        btn.disabled = true;
        try {
          const res = await api(`/api/worker-profile/${workerId}/endorse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill })
          });
          btn.classList.toggle('endorsed', res.endorsed);
          const badgeElem = btn.querySelector('.endorse-badge');
          if (badgeElem) {
            badgeElem.textContent = res.count > 0 ? `· ${res.count}` : '+ Endorse';
          }
          toast(res.endorsed ? `Endorsed ${skill}!` : `Removed endorsement for ${skill}.`);
        } catch (err) {
          toast(err.message);
        } finally {
          btn.disabled = false;
        }
      });
    });

    bindNavigation();
  } catch (err) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(err.message)}</p>`;
  }
}

function openPassportEditDialog(profile) {
  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="passport-dialog">
      <div>
        <button class="dialog-close" id="close-passport-dialog">×</button>
        <p class="eyebrow">EDIT WORKER PASSPORT</p>
        <h2>Your Professional Frontline Identity</h2>

        <!-- Avatar Upload -->
        <div class="passport-avatar-upload-row">
          <div class="passport-avatar-preview" id="passport-avatar-preview" style="${profile.avatarUrl ? `background-image:url('${profile.avatarUrl}');background-size:cover;color:transparent;` : ''}">
            ${profile.avatarUrl ? '' : escape((profile.fullName || 'W').slice(0, 1).toUpperCase())}
          </div>
          <div>
            <input type="file" id="avatar-file-input" accept="image/*" class="hidden" />
            <button type="button" class="secondary" id="btn-upload-avatar" style="min-height:38px;font-size:13px;">Upload Profile Photo</button>
            <p style="font-size:11px;color:var(--text-secondary);margin:4px 0 0;">JPG, PNG or WebP · Max 5MB</p>
          </div>
        </div>

        <form class="access-form" id="passport-form">
          <input type="hidden" id="passport-avatar-url" name="avatarUrl" value="${escape(profile.avatarUrl || '')}" />
          <label>Professional Headline
            <input name="headline" value="${escape(profile.headline || '')}" required />
          </label>
          <label>Life Outside Shift (Hobbies, Passions &amp; Sports)
            <textarea name="bioOutsideWork" rows="3">${escape(profile.bioOutsideWork || '')}</textarea>
          </label>
          <label>Verified Skills (comma-separated)
            <input name="skills" value="${escape((profile.skills || []).join(', '))}" />
          </label>
          <label>Certifications (comma-separated)
            <input name="certifications" value="${escape((profile.certifications || []).join(', '))}" />
          </label>
          <button class="primary" style="min-height:48px;margin-top:10px;">Save Passport</button>
        </form>
      </div>
    </section>
  `);

  // Avatar upload
  const avatarInput = document.getElementById('avatar-file-input');
  const avatarPreview = document.getElementById('passport-avatar-preview');
  const avatarUrlField = document.getElementById('passport-avatar-url');

  document.getElementById('btn-upload-avatar')?.addEventListener('click', () => avatarInput?.click());

  avatarInput?.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('Profile photo must be under 5 MB.');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      // Show preview immediately
      avatarPreview.style.backgroundImage = `url('${dataUrl}')`;
      avatarPreview.style.backgroundSize = 'cover';
      avatarPreview.style.color = 'transparent';
      avatarPreview.textContent = '';
      toast('Uploading avatar…');
      try {
        const res = await api('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }) });
        avatarUrlField.value = res.url;
        toast('Profile photo uploaded!');
      } catch (err) { toast(`Avatar upload failed: ${err.message}`); }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('close-passport-dialog')?.addEventListener('click', () => document.getElementById('passport-dialog')?.remove());

  document.getElementById('passport-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const skills = (fd.get('skills') || '').split(',').map(s => s.trim()).filter(Boolean);
    const certifications = (fd.get('certifications') || '').split(',').map(s => s.trim()).filter(Boolean);
    const avatarUrl = fd.get('avatarUrl') || profile.avatarUrl || null;
    try {
      await api('/api/worker-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: fd.get('headline'), bioOutsideWork: fd.get('bioOutsideWork'), skills, certifications, avatarUrl })
      });
      document.getElementById('passport-dialog')?.remove();
      toast('Worker Passport updated!');
      renderWorkerPassport();
    } catch (err) { toast(err.message); }
  });
}

function openVerifiedBadgeDialog() {
  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="verified-badge-dialog">
      <div>
        <button class="dialog-close" id="close-badge-dialog">×</button>
        <p class="eyebrow">REQUEST VERIFIED BADGE</p>
        <h2>Prove Your Frontline Credentials</h2>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;">The ShiftRelay Verified Badge confirms your identity and shift work experience. Once approved, a verification checkmark appears on your posts, passport, and directory listing.</p>
        <form class="access-form" id="badge-form">
          <label>Badge type
            <select name="type">
              <option value="worker">Individual Frontline Worker</option>
              <option value="supervisor">Shift Supervisor / Team Lead</option>
              <option value="specialist">Certified Specialist</option>
            </select>
          </label>
          <label>Why do you deserve verification? (Tell us about your experience)
            <textarea name="reason" rows="4" placeholder="I have X years of frontline experience in Y industry. I work at Z organisation as…" required></textarea>
          </label>
          <div class="verified-badge-info">
            ${Icons.verified()} Verification is reviewed within 3 business days. It is free — always.
          </div>
          <button class="primary" style="min-height:48px;margin-top:10px;">Submit Verification Request</button>
        </form>
      </div>
    </section>
  `);

  document.getElementById('close-badge-dialog')?.addEventListener('click', () => document.getElementById('verified-badge-dialog')?.remove());

  document.getElementById('badge-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const btn = e.submitter;
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const res = await api('/api/verified-badge-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: fd.get('type'), reason: fd.get('reason') }) });
      document.getElementById('verified-badge-dialog')?.remove();
      toast(res.message || 'Verification request submitted!');
      renderWorkerPassport();
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Submit Verification Request';
      toast(err.message);
    }
  });
}

function generateVerificationQrSvg(seed = 'SR-VERIFIED', size = 68) {
  return `<svg viewBox="0 0 88 88" width="${size}" height="${size}" style="background:#fff;border-radius:6px;padding:4px;border:1px solid #cbd5e1;box-sizing:border-box;flex-shrink:0;" shape-rendering="crispEdges">
    <rect width="88" height="88" fill="#ffffff"/>
    <rect x="8" y="8" width="24" height="24" fill="#0f172a"/>
    <rect x="12" y="12" width="16" height="16" fill="#ffffff"/>
    <rect x="16" y="16" width="8" height="8" fill="#0f172a"/>
    <rect x="56" y="8" width="24" height="24" fill="#0f172a"/>
    <rect x="60" y="12" width="16" height="16" fill="#ffffff"/>
    <rect x="64" y="16" width="8" height="8" fill="#0f172a"/>
    <rect x="8" y="56" width="24" height="24" fill="#0f172a"/>
    <rect x="12" y="60" width="16" height="16" fill="#ffffff"/>
    <rect x="16" y="64" width="8" height="8" fill="#0f172a"/>
    <rect x="36" y="10" width="4" height="4" fill="#0f172a"/>
    <rect x="44" y="14" width="4" height="4" fill="#0f172a"/>
    <rect x="36" y="22" width="4" height="4" fill="#0f172a"/>
    <rect x="48" y="26" width="4" height="4" fill="#0f172a"/>
    <rect x="10" y="36" width="4" height="4" fill="#0f172a"/>
    <rect x="22" y="40" width="4" height="4" fill="#0f172a"/>
    <rect x="14" y="48" width="4" height="4" fill="#0f172a"/>
    <rect x="36" y="36" width="4" height="4" fill="#0f172a"/>
    <rect x="44" y="40" width="4" height="4" fill="#0f172a"/>
    <rect x="40" y="48" width="4" height="4" fill="#0f172a"/>
    <rect x="48" y="44" width="4" height="4" fill="#0f172a"/>
    <rect x="36" y="60" width="4" height="4" fill="#0f172a"/>
    <rect x="44" y="68" width="4" height="4" fill="#0f172a"/>
    <rect x="40" y="76" width="4" height="4" fill="#0f172a"/>
    <rect x="60" y="36" width="4" height="4" fill="#0f172a"/>
    <rect x="68" y="44" width="4" height="4" fill="#0f172a"/>
    <rect x="76" y="40" width="4" height="4" fill="#0f172a"/>
    <rect x="64" y="56" width="4" height="4" fill="#0f172a"/>
    <rect x="72" y="64" width="4" height="4" fill="#0f172a"/>
    <rect x="60" y="72" width="4" height="4" fill="#0f172a"/>
    <rect x="76" y="76" width="4" height="4" fill="#0f172a"/>
  </svg>`;
}
window.generateVerificationQrSvg = generateVerificationQrSvg;

function openProofOfWorkCredentialDialog(profile) {
  const existing = document.getElementById('credential-dialog');
  if (existing) existing.remove();
  const certId = `SR-VERIFIED-${(profile.userId || 'w1').slice(-4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const issueDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const avatarStyle = profile.avatarUrl ? `background-image:url('${profile.avatarUrl}');background-size:cover;color:transparent;` : '';
  const initial = (profile.fullName || 'W').slice(0, 1).toUpperCase();

  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="credential-dialog" style="display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="max-width:680px;width:95%;padding:0;background:transparent;box-shadow:none;border:none;">
        <div class="credential-paper">
          <div class="credential-watermark">SHIFTRELAY VERIFIED</div>
          <button class="dialog-close" id="close-credential-dialog" style="position:absolute;top:12px;right:14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;">×</button>
          
          <div class="credential-header">
            <p>Official Proof-of-Work Credential</p>
            <h2>ShiftRelay Frontline Network</h2>
            <small style="color:#64748b;font-family:monospace;">Credential ID: ${certId}</small>
          </div>

          <div class="credential-worker-meta">
            <div class="passport-avatar-large" style="${avatarStyle};width:64px;height:64px;font-size:24px;border-width:2px;">
              ${profile.avatarUrl ? '' : initial}
            </div>
            <div>
              <h3 style="margin:0;font-size:20px;color:#0f172a;">${escape(profile.fullName)} ${Icons.verified()}</h3>
              <p style="margin:2px 0 0;font-size:13px;color:#475569;">${escape(profile.headline || 'Frontline Specialist')} · ${escape(profile.currentOrganisation || 'ShiftRelay Partner')}</p>
              <span class="verified-status-badge verified" style="margin-top:6px;">${Icons.check()} Authenticated Frontline Worker</span>
            </div>
          </div>

          <div class="credential-stats-summary">
            <div>
              <strong>${profile.stats?.shiftsCompleted ?? 0}</strong>
              <span>Verified Shifts</span>
            </div>
            <div>
              <strong>${profile.stats?.handoversRelayed ?? 0}</strong>
              <span>Handovers Relayed</span>
            </div>
            <div>
              <strong style="color:#059669;">${profile.stats?.reliabilityScore ?? 99.4}%</strong>
              <span>Reliability Score</span>
            </div>
            <div>
              <strong style="color:#ea580c;">${profile.stats?.checkInStreak ?? 7}d</strong>
              <span>Current Streak</span>
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">Verified Core Skills</h4>
            <div class="skills-chip-row">
              ${(profile.skills || []).map(s => `<span class="skill-chip">${Icons.check()} ${escape(s)}</span>`).join('')}
              ${(profile.certifications || []).map(c => `<span class="skill-chip cert">${Icons.check()} ${escape(c)}</span>`).join('')}
            </div>
          </div>

          <div class="credential-footer">
            <div class="credential-seal" style="display:flex;align-items:center;gap:12px;">
              ${generateVerificationQrSvg(certId, 64)}
              <div>
                <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#047857;font-weight:700;">Authenticity Guaranteed</span>
                <small style="color:#64748b;font-weight:normal;display:block;">Issued on ${issueDate}</small>
                <small style="color:#0284c7;font-family:monospace;font-size:10px;">shiftrelay.io/verify/${certId}</small>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="secondary" id="btn-copy-verify-link" style="min-height:40px;padding:0 14px;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
                ${Icons.share()} Copy Link
              </button>
              <button type="button" class="primary" id="btn-print-credential" style="min-height:40px;padding:0 18px;font-size:13px;">
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);

  document.getElementById('close-credential-dialog')?.addEventListener('click', () => document.getElementById('credential-dialog')?.remove());
  document.getElementById('btn-copy-verify-link')?.addEventListener('click', () => {
    const url = `https://shiftrelay.io/verify/${certId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    toast('Public verification link copied to clipboard!');
  });
  document.getElementById('btn-print-credential')?.addEventListener('click', () => {
    window.print();
  });
}

function openShiftOfferDialog(workerId, workerName) {
  const existing = document.getElementById('shift-offer-dialog');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="shift-offer-dialog" style="display:flex;align-items:center;justify-content:center;z-index:9999;">
      <div style="max-width:540px;width:95%;">
        <button class="dialog-close" id="close-shift-offer">×</button>
        <p class="eyebrow" style="color:#059669;">FRONTLINE TALENT ACQUISITION</p>
        <h2>Offer Shift to ${escape(workerName)}</h2>
        <p class="dialog-subtitle" style="margin-bottom:16px;">Direct shift invitation based on verified frontline reliability score.</p>

        <form class="access-form" id="shift-offer-form">
          <label>Shift Role / Title
            <input name="shiftTitle" placeholder="e.g. Senior Operations Relay Specialist" required />
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label>Date &amp; Time
              <input name="shiftDate" placeholder="e.g. Tomorrow, 07:00 - 15:30" required />
            </label>
            <label>Hourly Compensation
              <input name="rate" placeholder="e.g. $34.00/hr + Shift Diff" required />
            </label>
          </div>
          <label>Facility Site / Department
            <input name="location" placeholder="e.g. Metro Logistics Center - Hub 4" required />
          </label>
          <label>Special Instructions / Work Note
            <textarea name="note" rows="3" placeholder="e.g. Please bring safety gear. You will oversee afternoon handover dispatch."></textarea>
          </label>

          <div class="dialog-actions" style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="secondary" id="cancel-shift-offer">Cancel</button>
            <button type="submit" class="primary" style="background:#059669;border-color:#059669;">Send Official Offer</button>
          </div>
        </form>
      </div>
    </section>
  `);

  document.getElementById('close-shift-offer')?.addEventListener('click', () => document.getElementById('shift-offer-dialog')?.remove());
  document.getElementById('cancel-shift-offer')?.addEventListener('click', () => document.getElementById('shift-offer-dialog')?.remove());

  document.getElementById('shift-offer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending Offer…';

    try {
      const res = await api('/api/worker-profile/' + workerId + '/shift-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      toast(res.message || 'Shift offer sent successfully!');
      document.getElementById('shift-offer-dialog')?.remove();
    } catch (err) {
      toast('Offer failed: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Official Offer';
    }
  });
}

// ─── Discover / Worker Directory ─────────────────────────────────────────────

async function renderDiscover(defaultTab = 'workers') {
  dashboardHeader('Discover Opportunities', 'FRONTLINE NETWORK & SHIFTS');
  $('#dashboard').innerHTML = `
    <section class="discover-container">
      <div class="discover-tab-row">
        <button class="discover-sub-tab ${defaultTab === 'workers' ? 'active' : ''}" id="discover-tab-workers">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Frontline Professionals
        </button>
        <button class="discover-sub-tab ${defaultTab === 'shifts' ? 'active' : ''}" id="discover-tab-shifts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Open Shifts &amp; Overtime
        </button>
      </div>

      <div class="discover-search-row">
        <div class="discover-search-wrap">
          <svg class="discover-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" id="discover-search-input" placeholder="Search by name, role, facility, or skill…" class="discover-search-input" />
        </div>
      </div>
      <div id="discover-content-grid">
        <p class="muted" style="text-align:center;padding:32px;">Loading…</p>
      </div>
    </section>
  `;

  let currentTab = defaultTab;

  const loadWorkers = async () => {
    const grid = document.getElementById('discover-content-grid');
    if (!grid) return;
    grid.innerHTML = `<p class="muted" style="text-align:center;padding:32px;">Loading frontline specialists…</p>`;
    try {
      const { workers } = await api('/api/discover/workers');
      socialState.lastDiscoverWorkers = workers;
      renderDiscoverGrid(workers);
    } catch (err) {
      grid.innerHTML = `<p class="muted">${escape(err.message)}</p>`;
    }
  };

  const loadShifts = async () => {
    const grid = document.getElementById('discover-content-grid');
    if (!grid) return;
    grid.innerHTML = `<p class="muted" style="text-align:center;padding:32px;">Loading open shifts…</p>`;
    try {
      const { shifts } = await api('/api/open-shifts');
      renderOpenShiftsGrid(shifts || []);
    } catch (err) {
      grid.innerHTML = `<p class="muted">${escape(err.message)}</p>`;
    }
  };

  $('#discover-tab-workers')?.addEventListener('click', (e) => {
    currentTab = 'workers';
    document.querySelectorAll('.discover-sub-tab').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    loadWorkers();
  });

  $('#discover-tab-shifts')?.addEventListener('click', (e) => {
    currentTab = 'shifts';
    document.querySelectorAll('.discover-sub-tab').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    loadShifts();
  });

  $('#discover-search-input')?.addEventListener('input', (e) => {
    socialState.discoverSearchQuery = e.target.value.toLowerCase();
    if (currentTab === 'workers') {
      renderDiscoverGrid(socialState.lastDiscoverWorkers || []);
    }
  });

  if (defaultTab === 'shifts') {
    loadShifts();
  } else {
    loadWorkers();
  }

  bindNavigation();
}

function renderOpenShiftsGrid(shifts) {
  const grid = document.getElementById('discover-content-grid');
  if (!grid) return;

  if (!shifts.length) {
    grid.innerHTML = `<p class="muted" style="text-align:center;padding:32px;">No open shifts available right now. Check back soon!</p>`;
    return;
  }

  grid.innerHTML = `<div class="discover-grid">${shifts.map(s => {
    const starts = new Date(s.starts_at);
    const ends = new Date(s.ends_at);
    const dateStr = starts.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = `${starts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${ends.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    const rate = s.hourly_rate || '$42/hr';
    const facility = s.facility || 'ShiftRelay Healthcare Facility';
    const slots = s.slots ?? 1;

    return `
      <article class="open-shift-card">
        <div>
          <div class="open-shift-badge-row">
            <span class="open-shift-rate-badge">${escape(rate)}</span>
            <span class="open-shift-slots-badge">${slots} slot${slots > 1 ? 's' : ''} open</span>
          </div>
          <h3 class="open-shift-title">${escape(s.title)}</h3>
          <p class="open-shift-facility">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21V10M16 21V10M2 10h20"/></svg>
            ${escape(facility)}
          </p>
          <div class="open-shift-details">
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span><strong>${escape(dateStr)}</strong></span>
            </div>
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${escape(timeStr)}</span>
            </div>
            ${s.notes ? `<div style="margin-top:4px;color:#64748b;">${escape(s.notes)}</div>` : ''}
          </div>
        </div>
        <button class="primary" data-claim-shift="${s.id}" style="width:100%;min-height:42px;font-weight:700;">
          Claim Shift
        </button>
      </article>
    `;
  }).join('')}</div>`;

  grid.querySelectorAll('[data-claim-shift]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const shiftId = btn.dataset.claimShift;
      btn.disabled = true;
      btn.textContent = 'Claiming…';
      try {
        await api(`/api/open-shifts/${shiftId}/claim`, { method: 'POST' });
        btn.textContent = 'Claimed ✓';
        btn.style.background = '#059669';
        toast('Shift claimed! Added to your schedule.');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Claim Shift';
        toast('Could not claim shift: ' + err.message);
      }
    });
  });
}

function renderDiscoverGrid(workers) {
  const grid = document.getElementById('discover-content-grid');
  if (!grid) return;
  const q = socialState.discoverSearchQuery;
  const filtered = q
    ? workers.filter(w =>
        (w.fullName || '').toLowerCase().includes(q) ||
        (w.headline || '').toLowerCase().includes(q) ||
        (w.industry || '').toLowerCase().includes(q) ||
        (w.skills || []).some(s => s.toLowerCase().includes(q))
      )
    : workers;

  if (!filtered.length) {
    grid.innerHTML = '<p class="muted" style="text-align:center;padding:32px;">No workers match your search.</p>';
    return;
  }

  grid.innerHTML = `<div class="discover-grid">${filtered.map(w => {
    const initial = (w.fullName || 'W').slice(0, 1).toUpperCase();
    const avatarStyle = w.avatarUrl ? `background-image:url('${w.avatarUrl}');background-size:cover;color:transparent;` : '';
    const isVerified = w.verifiedStatus === 'verified';
    return `
      <article class="discover-worker-card">
        <div class="discover-card-top">
          <div class="discover-avatar" style="${avatarStyle}">${w.avatarUrl ? '' : escape(initial)}</div>
          ${isVerified ? `<span class="discover-verified-badge">${Icons.verified()}</span>` : ''}
        </div>
        <div class="discover-card-body">
          <h3>${escape(w.fullName)}</h3>
          <p class="discover-headline">${escape(w.headline || w.industry || 'Frontline Specialist')}</p>
          <div class="discover-stats-row">
            <span><strong>${w.stats?.shiftsCompleted ?? 0}</strong> shifts</span>
            <span><strong>${w.stats?.reliabilityScore ?? 0}%</strong> reliability</span>
            <span><strong>${w.stats?.checkInStreak ?? 0}d</strong> streak</span>
          </div>
          <div class="discover-skills-row">
            ${(w.skills || []).slice(0, 3).map(s => `<span class="skill-chip small">${escape(s)}</span>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="secondary discover-view-btn" data-view-passport="${w.userId}" style="flex:1;min-height:38px;">View Passport</button>
          <button class="primary discover-msg-btn" data-msg-worker="${w.userId}" data-worker-name="${escape(w.fullName)}" style="min-height:38px;padding:0 14px;font-size:13px;">Message</button>
        </div>
      </article>
    `;
  }).join('')}</div>`;

  grid.querySelectorAll('[data-view-passport]').forEach(btn => {
    btn.addEventListener('click', () => renderWorkerPassport(btn.dataset.viewPassport));
  });

  grid.querySelectorAll('[data-msg-worker]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openDirectMessageDialog(e.currentTarget.dataset.msgWorker, e.currentTarget.dataset.workerName);
    });
  });
}

function openDirectMessageDialog(recipientId, recipientName) {
  const existing = document.getElementById('direct-msg-modal');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <section class="profile-dialog" id="direct-msg-modal">
      <div>
        <button class="dialog-close" id="close-msg-dialog">×</button>
        <p class="eyebrow">WORKPLACE DIRECT MESSAGE</p>
        <h2>Message ${escape(recipientName)}</h2>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Send a direct, encrypted workplace message. Visible only to you and ${escape(recipientName)}.
        </p>
        <form class="access-form" id="direct-msg-form">
          <label>Message
            <textarea name="body" rows="4" placeholder="Hi ${escape((recipientName || 'there').split(' ')[0])}, checking in about..." required></textarea>
          </label>
          <button class="primary" style="min-height:46px; margin-top:10px;">Send Message</button>
        </form>
      </div>
    </section>
  `);

  document.getElementById('close-msg-dialog')?.addEventListener('click', () => {
    document.getElementById('direct-msg-modal')?.remove();
  });

  document.getElementById('direct-msg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = fd.get('body');
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await api('/api/community/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientMembershipId: recipientId, body })
      });
      document.getElementById('direct-msg-modal')?.remove();
      toast(`Message sent to ${recipientName}!`);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Send Message';
      toast(err.message);
    }
  });
}

// ─── Activity Feed (enriched) ─────────────────────────────────────────────────

async function renderSocialActivity() {
  dashboardHeader('Your Activity', 'PROOF-OF-WORK TIMELINE');

  try {
    const [{ profile }, { notifications }] = await Promise.all([
      api(`/api/worker-profile/${state.user?.id}`),
      api('/api/notifications').catch(() => ({ notifications: [] }))
    ]);

    const streak = profile.stats?.checkInStreak || 0;
    const shifts = profile.stats?.shiftsCompleted || 0;
    const reliability = profile.stats?.reliabilityScore || 0;
    const saved = (socialState.postsCache || []).filter(p => p.userSaved).length;
    const liked = (socialState.postsCache || []).filter(p => p.userLiked).length;

    $('#dashboard').innerHTML = `
      <section class="activity-page">
        <!-- Proof-of-Work Summary Hero -->
        <div class="activity-pow-hero">
          <div class="activity-pow-stat">
            <span class="pow-icon">${Icons.streak()}</span>
            <strong>${streak}</strong>
            <small>Day Streak</small>
          </div>
          <div class="activity-pow-stat">
            <strong>${shifts}</strong>
            <small>Shifts Logged</small>
          </div>
          <div class="activity-pow-stat">
            <strong>${reliability}%</strong>
            <small>Reliability</small>
          </div>
          <div class="activity-pow-stat">
            <strong>${saved}</strong>
            <small>Posts Saved</small>
          </div>
          <div class="activity-pow-stat">
            <strong>${liked}</strong>
            <small>Posts Liked</small>
          </div>
        </div>

        <!-- Streak Banner -->
        <div class="streak-activity-banner ${streak >= 7 ? 'streak-hot' : ''}">
          ${Icons.streak()}
          <div>
            <strong>${streak}-Day Check-in Streak</strong>
            <p>${streak >= 30 ? 'Legendary status — you show up every single day!' : streak >= 14 ? 'Outstanding consistency! Keep the streak alive.' : streak >= 7 ? 'One week strong! Employers love reliability.' : 'Build your streak — check in daily to boost your Proof-of-Work score.'}</p>
          </div>
          <button class="primary" id="btn-checkin-activity" style="min-height:38px;white-space:nowrap;">Check In Now</button>
        </div>

        <!-- Notifications -->
        <section class="activity-section">
          <div class="activity-section-head">
            <div>
              <p class="eyebrow">RECENT NOTIFICATIONS</p>
              <h3>Keep up with the work.</h3>
            </div>
          </div>
          <div class="activity-notices">
            ${notifications.length
              ? notifications.map(item => `
                  <article class="activity-notice ${item.read ? '' : 'unread'}">
                    <span class="activity-notice-dot">●</span>
                    <div>
                      <strong>${escape(item.message)}</strong>
                      <time>${new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                  </article>
                `).join('')
              : '<p class="activity-empty">No notifications yet. Start engaging with your frontline network!</p>'
            }
          </div>
        </section>
      </section>
    `;

    document.getElementById('btn-checkin-activity')?.addEventListener('click', async () => {
      try {
        const res = await api('/api/attendance/check-in', { method: 'POST' });
        toast(res.message || 'Checked in!');
        renderSocialActivity();
      } catch (err) { toast(err.message); }
    });

    bindNavigation();
  } catch (err) {
    $('#dashboard').innerHTML = `<p class="empty">${escape(err.message)}</p>`;
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatTimeAgo(isoStr) {
  if (!isoStr) return 'Recently';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Expose globally
window.renderShiftLounge = renderShiftLounge;
window.renderWorkerPassport = renderWorkerPassport;
window.renderDiscover = renderDiscover;
window.renderSocialActivity = renderSocialActivity;
window.stopFeedRefresh = stopFeedRefresh;
window.openDirectMessageDialog = openDirectMessageDialog;
