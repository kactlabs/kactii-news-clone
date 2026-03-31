'use strict';

let posts       = [];
let currentSort = 'newest';
let searchQuery = '';

// --- Utilities ---
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function timeAgo(ts) {
  if (!ts) return 'some time ago';
  const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins} minute${mins  !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours  !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const safe  = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safe})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

// --- Sort & Filter ---
function sortPosts(arr) {
  if (currentSort === 'newest') {
    arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    arr.sort((a, b) => (b.points || 0) - (a.points || 0));
  }
}

function filterPosts() {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return [...posts];
  return posts.filter(p =>
    (p.title  || '').toLowerCase().includes(q) ||
    (p.author || '').toLowerCase().includes(q) ||
    (p.domain || '').toLowerCase().includes(q)
  );
}

// --- Render ---
function renderPostHTML(post, rank) {
  const titleHtml  = highlight(post.title  || '', searchQuery);
  const authorHtml = highlight(post.author || '', searchQuery);
  const href       = post.url && post.url !== '#' ? escapeHtml(post.url) : '#';
  const points     = post.points || 0;
  const comments   = post.comments || 0;
  const id         = post._id || post.id || '';

  return `
    <li class="post-item" data-id="${escapeHtml(id)}" role="listitem">
      <span class="post-rank" aria-label="Rank ${rank}">${rank}.</span>
      <div class="post-body">
        <div class="post-title-line">
          <a class="post-title"
            href="${href}"
            target="${href !== '#' ? '_blank' : '_self'}"
            rel="noopener noreferrer"
          >${titleHtml}</a>
          ${post.domain ? `<span class="post-domain">(${highlight(post.domain, searchQuery)})</span>` : ''}
        </div>
        <div class="post-meta">
          <button class="vote-btn" data-id="${escapeHtml(id)}" aria-label="Upvote">▲</button>
          <span class="post-points">${points} point${points !== 1 ? 's' : ''}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <span>by <a href="#" class="author-link" data-author="${escapeHtml(post.author || '')}">${authorHtml}</a></span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <time datetime="${post.createdAt || ''}">${timeAgo(post.createdAt)}</time>
          <span class="meta-sep" aria-hidden="true">·</span>
          <a href="#" class="post-comments">${comments} comment${comments !== 1 ? 's' : ''}</a>
        </div>
      </div>
    </li>`;
}

function renderPosts() {
  const listEl     = document.getElementById('post-list');
  const sortBar    = document.getElementById('sort-bar');
  const emptyState = document.getElementById('empty-state');
  const noResults  = document.getElementById('no-results');
  const countEl    = document.getElementById('post-count');

  const filtered = filterPosts();
  sortPosts(filtered);

  if (posts.length === 0) {
    listEl.hidden     = true;
    sortBar.hidden    = true;
    emptyState.hidden = false;
    noResults.hidden  = true;
    return;
  }

  if (filtered.length === 0) {
    listEl.hidden       = true;
    sortBar.hidden      = false;
    emptyState.hidden   = true;
    noResults.hidden    = false;
    countEl.textContent = '0 posts';
    return;
  }

  emptyState.hidden   = true;
  noResults.hidden    = true;
  sortBar.hidden      = false;
  listEl.hidden       = false;
  countEl.textContent = `${filtered.length} post${filtered.length !== 1 ? 's' : ''}`;
  listEl.innerHTML    = filtered.map((p, i) => renderPostHTML(p, i + 1)).join('');
}

// --- Vote ---
async function handleVote(id) {
  try {
    const res  = await fetch('/api/vote', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!data.error) {
      const post = posts.find(p => (p._id || p.id) === id);
      if (post) { post.points = (post.points || 0) + 1; renderPosts(); }
    }
  } catch { /* ignore */ }
}

// --- Sort ---
function setSort(mode) {
  currentSort = mode;
  document.querySelectorAll('.sort-btn').forEach(btn => {
    const active = btn.dataset.sort === mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

// --- Search toggle ---
function initSearchToggle() {
  const toggleBtn   = document.getElementById('search-toggle');
  const searchInput = document.getElementById('search-input');

  toggleBtn.addEventListener('click', () => {
    const isOpen = searchInput.classList.contains('visible');
    if (isOpen) {
      searchInput.classList.remove('visible');
      searchInput.hidden = true;
      searchInput.value  = '';
      searchQuery        = '';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('active');
      renderPosts();
    } else {
      searchInput.hidden = false;
      searchInput.getBoundingClientRect();
      searchInput.classList.add('visible');
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('active');
      searchInput.focus();
    }
  });

  searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    renderPosts();
  }, 280));

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleBtn.click();
  });
}

// --- Event delegation ---
function handlePostListClick(e) {
  // Vote button
  const voteBtn = e.target.closest('.vote-btn');
  if (voteBtn) {
    e.preventDefault();
    handleVote(voteBtn.dataset.id);
    return;
  }

  // Author link — filter by author
  const authorLink = e.target.closest('.author-link');
  if (authorLink) {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    const toggleBtn   = document.getElementById('search-toggle');
    const author      = authorLink.dataset.author;
    if (!searchInput.classList.contains('visible')) {
      searchInput.hidden = false;
      searchInput.getBoundingClientRect();
      searchInput.classList.add('visible');
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('active');
    }
    searchInput.value = author;
    searchQuery       = author;
    renderPosts();
    searchInput.focus();
  }
}

function handleListKeydown(e) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const titles = Array.from(document.querySelectorAll('.post-title'));
  if (!titles.length) return;
  e.preventDefault();
  const idx = titles.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') (titles[idx + 1] || titles[0]).focus();
  else (titles[idx - 1] || titles[titles.length - 1]).focus();
}

// --- Init ---
async function init() {
  const loading = document.getElementById('loading');
  loading.hidden = false;

  try {
    const res = await fetch('/api/getStories');
    posts = await res.json();
  } catch {
    posts = [];
  }

  loading.hidden = true;
  renderPosts();

  initSearchToggle();

  document.getElementById('sort-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    setSort(btn.dataset.sort);
    renderPosts();
  });

  const listEl = document.getElementById('post-list');
  listEl.addEventListener('click', handlePostListClick);
  listEl.addEventListener('keydown', handleListKeydown);
}

document.addEventListener('DOMContentLoaded', init);
