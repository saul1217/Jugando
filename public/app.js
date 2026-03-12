/* ==========================================================
   41 MECOS — App Logic
   Fetch API-powered forum (Vercel + Neon)
   ========================================================== */

(function () {
    'use strict';

    // ───────── DOM References ─────────
    const postForm = document.getElementById('postForm');
    const postText = document.getElementById('postText');
    const postBtn = document.getElementById('postBtn');
    const charCount = document.getElementById('charCount');
    const feed = document.getElementById('feed');
    const emptyState = document.getElementById('emptyState');
    const toast = document.getElementById('toast');

    // Modal
    const nameModal = document.getElementById('nameModal');
    const nameForm = document.getElementById('nameForm');
    const nameInput = document.getElementById('nameInput');
    const nameError = document.getElementById('nameError');
    const nameBtn = document.getElementById('nameBtn');
    const modalClose = document.getElementById('modalClose');
    const userBtn = document.getElementById('userBtn');
    const headerUserName = document.getElementById('headerUserName');

    // Image
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeImageBtn = document.getElementById('removeImage');

    const MAX_CHARS = 1000;
    let currentUserName = null;
    let selectedImageFile = null;

    // ───────── Identity (localStorage token) ─────────

    function getToken() {
        let token = localStorage.getItem('41mecos_token');
        if (!token) {
            token = crypto.randomUUID();
            localStorage.setItem('41mecos_token', token);
        }
        return token;
    }

    async function loadUserName() {
        const token = getToken();
        try {
            const res = await fetch(`/api/username?token=${encodeURIComponent(token)}`);
            if (res.ok) {
                const data = await res.json();
                currentUserName = data.name;
                headerUserName.textContent = currentUserName;
                return;
            }
        } catch (err) {
            console.error('Error loading username:', err);
        }
        // No name set yet — show modal
        currentUserName = null;
        headerUserName.textContent = 'Anónimo';
        showNameModal(true);
    }

    function showNameModal(isFirstTime) {
        nameModal.classList.add('modal-overlay--visible');
        nameError.textContent = '';
        nameInput.value = currentUserName || '';
        // Hide close button on first time (must choose a name)
        modalClose.style.display = isFirstTime ? 'none' : 'flex';
        setTimeout(() => nameInput.focus(), 200);
    }

    function hideNameModal() {
        nameModal.classList.remove('modal-overlay--visible');
    }

    async function saveName(e) {
        e.preventDefault();
        const name = nameInput.value.trim();

        if (!name) {
            nameError.textContent = 'Ingresa un nombre';
            return;
        }

        if (/\s/.test(name)) {
            nameError.textContent = 'Sin espacios';
            return;
        }

        if (name.length < 2 || name.length > 20) {
            nameError.textContent = 'Entre 2 y 20 caracteres';
            return;
        }

        nameBtn.disabled = true;
        nameBtn.textContent = 'Guardando...';
        nameError.textContent = '';

        try {
            const res = await fetch('/api/username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: getToken(), name })
            });

            const data = await res.json();

            if (!res.ok) {
                nameError.textContent = data.error || 'Error al guardar';
                return;
            }

            currentUserName = data.name;
            headerUserName.textContent = currentUserName;
            hideNameModal();
            showToast('✨ Nombre guardado: ' + currentUserName);
        } catch (err) {
            nameError.textContent = 'Error de conexión';
        } finally {
            nameBtn.disabled = false;
            nameBtn.textContent = 'Guardar';
        }
    }

    // ───────── Image Upload ─────────

    function handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('❌ Solo se permiten imágenes');
            imageInput.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('❌ La imagen no puede pesar más de 5MB');
            imageInput.value = '';
            return;
        }

        selectedImageFile = file;

        // Show preview
        const reader = new FileReader();
        reader.onload = function (ev) {
            previewImg.src = ev.target.result;
            imagePreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    function removeImage() {
        selectedImageFile = null;
        imageInput.value = '';
        previewImg.src = '';
        imagePreview.style.display = 'none';
    }

    async function uploadImage(file) {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file
        });

        if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error((data && data.error) || 'Error al subir imagen');
        }

        const data = await res.json();
        return data.url;
    }

    // ───────── Data Layer (Fetch API → Neon) ─────────

    async function loadPosts() {
        try {
            const res = await fetch('/api/posts');
            if (!res.ok) throw new Error('Error al cargar posts');
            return await res.json();
        } catch (err) {
            console.error(err);
            showToast('❌ Error al cargar publicaciones');
            return [];
        }
    }

    async function createPost(content, imageUrl) {
        const body = { content, author_name: currentUserName };
        if (imageUrl) body.image_url = imageUrl;

        const res = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        if (!res.ok) {
            const msg = data ? (data.detail || data.error || 'Error al publicar') : 'Error al publicar';
            throw new Error(msg);
        }
        return data;
    }

    async function createComment(postId, content) {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, content, author_name: currentUserName })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        if (!res.ok) {
            throw new Error((data && data.error) || 'Error al comentar');
        }
        return data;
    }

    // ───────── Utilities ─────────

    function timeAgo(dateStr) {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diff = Math.max(0, now - then);

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'ahora';
        if (minutes < 60) return `hace ${minutes} min`;
        if (hours < 24) return `hace ${hours} h`;
        if (days < 7) return `hace ${days} d`;
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

    function renderPosts(posts) {
        // Empty state
        if (posts.length === 0) {
            feed.innerHTML = '';
            emptyState.classList.add('empty-state--visible');
            return;
        }

        emptyState.classList.remove('empty-state--visible');

        feed.innerHTML = posts.map((post, index) => {
            const commentsHtml = (post.comments || []).map(c => `
        <div class="comment">
          <div class="comment__body">
            <p class="comment__text">${escapeHtml(c.content)}</p>
            <div class="comment__meta">
              <span class="comment__anon">${c.author_name ? escapeHtml(c.author_name) : 'anon'}</span>
              <span class="comment__time">${timeAgo(c.created_at)}</span>
            </div>
          </div>
        </div>
      `).join('');

            const commentCount = (post.comments || []).length;

            const imageHtml = post.image_url
                ? `<div class="post__image-container">
                     <img class="post__image" src="${escapeHtml(post.image_url)}" alt="Imagen de la publicación" loading="lazy" onclick="app.openImage('${escapeHtml(post.image_url)}')">
                   </div>`
                : '';

            const authorDisplay = post.author_name ? escapeHtml(post.author_name) : 'Anónimo';

            return `
        <article class="post" style="animation-delay: ${index * 0.05}s" data-id="${post.id}">
          <div class="post__header">
            <span class="post__anon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${authorDisplay}
            </span>
            <span class="post__id">#${post.id}</span>
            <span class="post__time">${timeAgo(post.created_at)}</span>
          </div>
          <p class="post__body">${escapeHtml(post.content)}</p>
          ${imageHtml}
          <div class="post__actions">
            <button class="post__action-btn" onclick="app.toggleComments('${post.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="post__comment-count">${commentCount}</span> Comentar
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

    async function addPost(e) {
        e.preventDefault();
        const text = postText.value.trim();
        if (!text) return;

        // Must have a name set
        if (!currentUserName) {
            showNameModal(true);
            return;
        }

        postBtn.disabled = true;
        postBtn.querySelector('.composer__btn-text') ?.textContent || (postBtn.textContent = '');

        try {
            let imageUrl = null;

            // Upload image first if selected
            if (selectedImageFile) {
                showToast('📤 Subiendo imagen...');
                imageUrl = await uploadImage(selectedImageFile);
            }

            await createPost(text, imageUrl);
            postText.value = '';
            postText.style.height = 'auto';
            removeImage();
            updateCharCount();
            showToast('🔥 ¡Publicación enviada!');
            await refreshFeed();

            setTimeout(() => {
                const firstPost = feed.querySelector('.post');
                if (firstPost) {
                    firstPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        } catch (err) {
            showToast('❌ ' + err.message);
        } finally {
            postBtn.disabled = postText.value.length === 0;
            postBtn.innerHTML = `
                <svg class="composer__btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Publicar
            `;
        }
    }

    async function addComment(e, postId) {
        e.preventDefault();
        const input = e.target.querySelector('.comments__input');
        const text = input.value.trim();
        if (!text) return;

        if (!currentUserName) {
            showNameModal(true);
            return;
        }

        const submitBtn = e.target.querySelector('.comments__submit');
        submitBtn.disabled = true;

        try {
            await createComment(postId, text);
            showToast('💬 Comentario agregado');
            await refreshFeed();

            // Re-open the comments section
            const section = document.getElementById(`comments-${postId}`);
            if (section) section.classList.add('comments--open');
        } catch (err) {
            showToast('❌ ' + err.message);
        } finally {
            submitBtn.disabled = false;
        }
    }

    function toggleComments(postId) {
        const section = document.getElementById(`comments-${postId}`);
        if (!section) return;
        section.classList.toggle('comments--open');

        if (section.classList.contains('comments--open')) {
            const input = section.querySelector('.comments__input');
            if (input) setTimeout(() => input.focus(), 150);
        }
    }

    function openImage(url) {
        window.open(url, '_blank');
    }

    async function refreshFeed() {
        const posts = await loadPosts();
        renderPosts(posts);
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

    // Image
    imageInput.addEventListener('change', handleImageSelect);
    removeImageBtn.addEventListener('click', removeImage);

    // Username modal
    userBtn.addEventListener('click', () => showNameModal(false));
    nameForm.addEventListener('submit', saveName);
    modalClose.addEventListener('click', hideNameModal);
    nameModal.addEventListener('click', (e) => {
        if (e.target === nameModal && currentUserName) hideNameModal();
    });

    // Prevent spaces in name input
    nameInput.addEventListener('input', () => {
        nameInput.value = nameInput.value.replace(/\s/g, '');
    });

    // ───────── Init ─────────
    updateCharCount();
    loadUserName().then(() => refreshFeed());

    // Refresh feed every 30s
    setInterval(refreshFeed, 30000);

    // ───────── Public API (for inline event handlers) ─────────
    window.app = {
        toggleComments,
        addComment,
        openImage
    };

})();
