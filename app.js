/* ==========================================================
   41 MECOS — App Logic
   localStorage-powered anonymous forum
   ========================================================== */

(function () {
  'use strict';

  // ───────── DOM References ─────────
  const postForm    = document.getElementById('postForm');
  const postText    = document.getElementById('postText');
  const postBtn     = document.getElementById('postBtn');
  const charCount   = document.getElementById('charCount');
  const feed        = document.getElementById('feed');
  const emptyState  = document.getElementById('emptyState');
  const toast       = document.getElementById('toast');

  const STORAGE_KEY = '41mecos_posts';
  const MAX_CHARS   = 1000;

  // ───────── Data Layer (localStorage) ─────────

  function loadPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function savePosts(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  // ───────── Utilities ─────────

  function generateId() {
    if (crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
    return Math.random().toString(36).substring(2, 10);
  }

  function timeAgo(dateStr) {
    const now  = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);

    if (seconds < 60)  return 'ahora';
    if (minutes < 60)  return `hace ${minutes} min`;
    if (hours < 24)    return `hace ${hours} h`;
    if (days < 7)      return `hace ${days} d`;
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short'
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast--show');
    setTimeout(() => toast.classList.remove('toast--show'), 2200);
  }

  // ───────── Render ─────────

  function renderFeed() {
    const posts = loadPosts();

    // Empty state
    if (posts.length === 0) {
      feed.innerHTML = '';
      emptyState.classList.add('empty-state--visible');
      return;
    }

    emptyState.classList.remove('empty-state--visible');

    // Sort newest first
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    feed.innerHTML = posts.map((post, index) => {
      const commentsHtml = (post.comments || []).map(c => `
        <div class="comment">
          <div class="comment__body">
            <p class="comment__text">${escapeHtml(c.text)}</p>
            <div class="comment__meta">
              <span class="comment__anon">anon</span>
              <span class="comment__time">${timeAgo(c.date)}</span>
            </div>
          </div>
        </div>
      `).join('');

      const commentCount = (post.comments || []).length;

      return `
        <article class="post" style="animation-delay: ${index * 0.05}s" data-id="${post.id}">
          <div class="post__header">
            <span class="post__anon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
              Anónimo
            </span>
            <span class="post__id">#${post.id}</span>
            <span class="post__time">${timeAgo(post.date)}</span>
          </div>
          <p class="post__body">${escapeHtml(post.text)}</p>
          <div class="post__actions">
            <button class="post__action-btn" onclick="app.toggleComments('${post.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="post__comment-count">${commentCount}</span> Comentar${commentCount !== 1 ? '' : ''}
            </button>
          </div>
          <div class="comments" id="comments-${post.id}">
            <div class="comments__list">
              ${commentsHtml}
            </div>
            <form class="comments__form" onsubmit="app.addComment(event, '${post.id}')">
              <input
                class="comments__input"
                type="text"
                placeholder="Escribe un comentario..."
                maxlength="500"
                required
              />
              <button type="submit" class="comments__submit" aria-label="Enviar comentario">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </div>
        </article>
      `;
    }).join('');
  }

  // ───────── Actions ─────────

  function addPost(e) {
    e.preventDefault();
    const text = postText.value.trim();
    if (!text) return;

    const posts = loadPosts();
    posts.push({
      id: generateId(),
      text: text,
      date: new Date().toISOString(),
      comments: []
    });
    savePosts(posts);

    postText.value = '';
    updateCharCount();
    renderFeed();
    showToast('🔥 ¡Publicación enviada!');

    // Scroll to top of feed after a brief delay for animation
    setTimeout(() => {
      const firstPost = feed.querySelector('.post');
      if (firstPost) {
        firstPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  function addComment(e, postId) {
    e.preventDefault();
    const input = e.target.querySelector('.comments__input');
    const text  = input.value.trim();
    if (!text) return;

    const posts = loadPosts();
    const post  = posts.find(p => p.id === postId);
    if (!post) return;

    if (!post.comments) post.comments = [];
    post.comments.push({
      id: generateId(),
      text: text,
      date: new Date().toISOString()
    });
    savePosts(posts);

    // Re-render keeping comments open
    renderFeed();

    // Re-open the comments section
    const section = document.getElementById(`comments-${postId}`);
    if (section) section.classList.add('comments--open');

    showToast('💬 Comentario agregado');
  }

  function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (!section) return;
    section.classList.toggle('comments--open');

    // Focus the input when opening
    if (section.classList.contains('comments--open')) {
      const input = section.querySelector('.comments__input');
      if (input) setTimeout(() => input.focus(), 150);
    }
  }

  // ───────── Character Counter ─────────

  function updateCharCount() {
    const len = postText.value.length;
    charCount.textContent = `${len} / ${MAX_CHARS}`;
    postBtn.disabled = len === 0;

    if (len > MAX_CHARS * 0.9) {
      charCount.style.color = 'var(--accent2)';
    } else {
      charCount.style.color = '';
    }
  }

  // ───────── Event Listeners ─────────

  postForm.addEventListener('submit', addPost);
  postText.addEventListener('input', updateCharCount);

  // Auto-resize textarea
  postText.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
  });

  // ───────── Init ─────────
  updateCharCount();
  renderFeed();

  // Refresh relative times every 30s
  setInterval(renderFeed, 30000);

  // ───────── Public API (for inline event handlers) ─────────
  window.app = {
    toggleComments,
    addComment
  };

})();
